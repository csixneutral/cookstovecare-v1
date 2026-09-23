import { apiClient } from './apiClient';
import { RepairDataDto, ReplacementDataDto, TaskDto, TechnicianDashboardMetrics } from '../types';
import { mapTaskDto } from './taskApi';

export const technicianApi = {
  getDashboardMetrics: async (technicianId: number): Promise<TechnicianDashboardMetrics> => {
    const response = await apiClient.get<any>(`/technician/dashboard.php?technician_id=${technicianId}`);
    const data = response.data;
    if (!data.success) {
      throw new Error(data.error || 'Failed to fetch technician metrics');
    }
    const metrics = data.metrics || data.data || {};
    return {
      newTasksCount: Number(metrics.new_tasks_count || metrics.assigned_count || 0),
      activeTasksCount: Number(metrics.active_tasks_count || metrics.in_progress_count || 0),
      completedTasksCount: Number(metrics.completed_tasks_count || metrics.completed_count || 0),
      totalTasksCount: Number(metrics.total_tasks_count || metrics.total_count || 0),
    };
  },

  getTasks: async (technicianId: number, status?: string): Promise<TaskDto[]> => {
    let url = `/technician/tasks.php?technician_id=${technicianId}`;
    if (status) {
      url += `&status=${encodeURIComponent(status)}`;
    }
    const response = await apiClient.get<any>(url);
    if (response.data.success && Array.isArray(response.data.tasks)) {
      return response.data.tasks.map(mapTaskDto);
    }
    return [];
  },

  startTask: async (taskId: number, technicianId: number): Promise<boolean> => {
    const response = await apiClient.post<any>('/tasks/start.php', {
      task_id: taskId,
      technician_id: technicianId,
    });
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to start task');
    }
    return true;
  },

  saveRepair: async (payload: {
    taskId: number;
    technicianId?: number | null;
    userId?: number;
    typesOfRepair: string[];
    partsReplaced?: string;
    laborHours?: number;
    repairNotes?: string;
    repairImageUrl?: string;
    beforeRepairImageUrl?: string;
    repairCompletionDate?: number;
  }): Promise<boolean> => {
    const response = await apiClient.post<any>('/repair/save.php', {
      task_id: payload.taskId,
      technician_id: payload.technicianId && payload.technicianId > 0 ? payload.technicianId : null,
      user_id: payload.userId,
      types_of_repair: payload.typesOfRepair,
      parts_replaced: payload.partsReplaced || null,
      labor_hours: payload.laborHours,
      repair_notes: payload.repairNotes || null,
      repair_completion_date: payload.repairCompletionDate || Date.now(),
      after_repair_image_url: payload.repairImageUrl || '',
      repair_image_url: payload.repairImageUrl || '',
      before_repair_image_url: payload.beforeRepairImageUrl || null,
    });
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to save repair');
    }
    return true;
  },

  saveReplacement: async (payload: {
    taskId: number;
    technicianId?: number | null;
    userId?: number;
    oldCookstoveNumber?: string;
    oldCookstoveImageUrl?: string;
    newCookstoveNumber?: string;
    newCookstoveImageUrl?: string;
    replacementReason?: string;
    replacementDate?: number;
  }): Promise<boolean> => {
    const response = await apiClient.post<any>('/replacement/save.php', {
      task_id: payload.taskId,
      technician_id: payload.technicianId && payload.technicianId > 0 ? payload.technicianId : 0,
      user_id: payload.userId,
      old_cookstove_number: payload.oldCookstoveNumber,
      old_cookstove_image_url: payload.oldCookstoveImageUrl,
      new_cookstove_number: payload.newCookstoveNumber,
      new_cookstove_image_url: payload.newCookstoveImageUrl,
      replacement_reason: payload.replacementReason,
      replacement_date: payload.replacementDate || Date.now(),
    });
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to save replacement');
    }
    return true;
  },

  getRepairByTaskId: async (taskId: number): Promise<RepairDataDto | null> => {
    try {
      const response = await apiClient.get<any>(`/repair/get.php?task_id=${taskId}`);
      if (response.data.success && response.data.repair) {
        const r = response.data.repair;
        let types: string[] = [];
        if (Array.isArray(r.types_of_repair)) {
          types = r.types_of_repair;
        } else if (typeof r.types_of_repair === 'string') {
          try {
            types = JSON.parse(r.types_of_repair);
          } catch {
            types = r.types_of_repair.split(',');
          }
        }
        return {
          id: r.id,
          taskId: r.task_id,
          technicianId: r.technician_id,
          laborHours: r.labor_hours ? Number(r.labor_hours) : undefined,
          partsReplaced: r.parts_replaced,
          repairNotes: r.repair_notes,
          repairImageUrl: r.repair_image_url,
          typesOfRepair: types,
          createdAt: r.created_at,
        };
      }
      return null;
    } catch {
      return null;
    }
  },

  getReplacementByTaskId: async (taskId: number): Promise<ReplacementDataDto | null> => {
    try {
      const response = await apiClient.get<any>(`/replacement/get.php?task_id=${taskId}`);
      if (response.data.success && response.data.replacement) {
        const rep = response.data.replacement;
        return {
          id: rep.id,
          taskId: rep.task_id,
          technicianId: rep.technician_id,
          oldCookstoveNumber: rep.old_cookstove_number,
          oldCookstoveImageUrl: rep.old_cookstove_image_url,
          newCookstoveNumber: rep.new_stove_number || rep.new_cookstove_number,
          newCookstoveImageUrl: rep.new_stove_image_url || rep.new_cookstove_image_url,
          replacementReason: rep.replacement_reason,
          replacementDate: rep.replacement_date,
          createdAt: rep.created_at,
        };
      }
      return null;
    } catch {
      return null;
    }
  },
};
