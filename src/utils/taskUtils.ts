import AsyncStorage from '@react-native-async-storage/async-storage';
import { TaskDto, TaskStatus } from '../types';

const STORAGE_KEY_PREFIX = '@instant_task_status_';

export interface InstantTaskOverride {
  status: TaskStatus | string;
  repairedAt?: number;
  repairNotes?: string;
  deliveredAt?: number;
  deliveryImageUrl?: string;
  customerSignatureUrl?: string;
  collectionSignatureUrl?: string;
  deliverySignatureUrl?: string;
  customerReview?: string;
}

// In-memory cache for immediate synchronous rendering
const memoryCache: Record<number, InstantTaskOverride> = {};

/**
 * Checks whether a task is an Instant / On-Field repair task.
 * These tasks are serviced immediately on-site by Field Officers / Field Coordinators,
 * requiring no technician assignment and no temporary cookstove.
 */
export const isInstantRepairTask = (task?: TaskDto | null): boolean => {
  if (!task) return false;
  return Boolean(
    task.temporaryCookstoveNumber === 'INSTANT_REPAIR' ||
    task.temporaryCookstoveNumber === 'ON_FIELD_REPAIR' ||
    task.interimCookstoveUsed === 'INSTANT_REPAIR' ||
    task.distributionComment?.toLowerCase().includes('instant') ||
    task.distributionComment?.toLowerCase().includes('on-field') ||
    task.deliveryAddress?.includes('[INSTANT_REPAIR]') ||
    task.deliveryAddress?.toLowerCase().includes('instant repair')
  );
};

export const getInstantTaskOverride = async (
  taskId: number
): Promise<InstantTaskOverride | null> => {
  if (memoryCache[taskId]) return memoryCache[taskId];
  try {
    const raw = await AsyncStorage.getItem(`${STORAGE_KEY_PREFIX}${taskId}`);
    if (raw) {
      const data = JSON.parse(raw);
      memoryCache[taskId] = data;
      return data;
    }
  } catch {}
  return null;
};

export const saveInstantTaskOverride = async (
  taskId: number,
  override: Partial<InstantTaskOverride>
): Promise<void> => {
  try {
    const existing = (await getInstantTaskOverride(taskId)) || {
      status: TaskStatus.COLLECTED,
    };
    const merged = { ...existing, ...override };
    memoryCache[taskId] = merged;
    await AsyncStorage.setItem(
      `${STORAGE_KEY_PREFIX}${taskId}`,
      JSON.stringify(merged)
    );
  } catch (e) {
    console.warn('Failed to save instant task override', e);
  }
};

export const applyInstantTaskOverride = (task: TaskDto): TaskDto => {
  if (!isInstantRepairTask(task)) return task;
  const cached = memoryCache[task.id];

  const collectionDateStr = task.collectionDate
    ? (typeof task.collectionDate === 'number' ? new Date(task.collectionDate > 2000000000 ? task.collectionDate : task.collectionDate * 1000).toISOString() : String(task.collectionDate))
    : undefined;

  const baseTask: TaskDto = {
    ...task,
    assignedAt: task.assignedAt || collectionDateStr,
    workStartedAt: task.workStartedAt || collectionDateStr,
  };

  if (!cached) return baseTask;

  return {
    ...baseTask,
    status: (cached.status as TaskStatus) || task.status,
    completedAt: cached.repairedAt
      ? new Date(cached.repairedAt).toISOString()
      : task.completedAt,
    distributionDate: cached.deliveredAt || task.distributionDate,
    distributionImageUrl: cached.deliveryImageUrl || task.distributionImageUrl,
    customerSignatureUrl:
      cached.customerSignatureUrl || task.customerSignatureUrl,
    collectionSignatureUrl:
      cached.collectionSignatureUrl || task.collectionSignatureUrl || task.customerSignatureUrl,
    deliverySignatureUrl:
      cached.deliverySignatureUrl || task.deliverySignatureUrl || cached.customerSignatureUrl,
    customerReview: cached.customerReview || task.customerReview,
  };
};

export const preloadInstantTaskOverrides = async (
  tasks?: TaskDto[]
): Promise<TaskDto[]> => {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const taskKeys = keys.filter((k) => k.startsWith(STORAGE_KEY_PREFIX));
    if (taskKeys.length > 0) {
      const pairs = await AsyncStorage.multiGet(taskKeys);
      for (const [k, v] of pairs) {
        if (v) {
          const taskId = Number(k.replace(STORAGE_KEY_PREFIX, ''));
          if (!isNaN(taskId)) {
            memoryCache[taskId] = JSON.parse(v);
          }
        }
      }
    }
  } catch {}

  if (tasks && Array.isArray(tasks)) {
    return tasks.map(applyInstantTaskOverride);
  }
  return [];
};
