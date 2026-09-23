import { apiClient } from './apiClient';
import { CoordinatorDashboardMetrics, FieldOfficerDto, TaskDto } from '../types';
import { mapTaskDto } from './taskApi';

export const mapFieldOfficerDto = (raw: any): FieldOfficerDto => {
  const stats = raw.statistics || {};
  const byStatus = stats.by_status || {};
  const byType = stats.by_type || {};

  return {
    id: Number(raw.id),
    name: raw.name || '',
    phoneNumber: raw.phone_number || raw.phoneNumber || '',
    coordinatorUserId: raw.coordinator_user_id ? Number(raw.coordinator_user_id) : undefined,
    totalTasks: Number(raw.total_tasks ?? stats.total_tasks ?? 0),
    pendingTasks: Number(
      raw.pending_tasks ??
      stats.pending ??
      ((byStatus.collected || 0) + (byStatus.assigned || 0) + (byStatus.in_progress || 0))
    ),
    distributedTasks: Number(
      raw.distributed_tasks ??
      stats.completed ??
      byStatus.distributed ??
      0
    ),
    readyForDistribution: Number(
      raw.ready_for_distribution ??
      stats.ready_for_distribution ??
      ((byStatus.repair_completed || 0) + (byStatus.replacement_completed || 0))
    ),
    repairsCount: Number(raw.repair_tasks ?? byType.repair ?? 0),
    replacementsCount: Number(raw.replacement_tasks ?? byType.replacement ?? 0),
    profileImageUrl: raw.profile_image_url || undefined,
    isActive: raw.is_active !== undefined ? Boolean(Number(raw.is_active)) : true,
  };
};

export const coordinatorApi = {
  getDashboardMetrics: async (coordinatorUserId?: number): Promise<CoordinatorDashboardMetrics> => {
    const url = coordinatorUserId
      ? `/coordinator/dashboard.php?coordinator_user_id=${encodeURIComponent(coordinatorUserId)}`
      : '/coordinator/dashboard.php';
    const response = await apiClient.get<any>(url);
    const data = response.data;
    if (!data.success) {
      throw new Error(data.error || 'Failed to fetch coordinator metrics');
    }
    const metrics = data.metrics || data.data || data.dashboard || {};
    return {
      totalOfficers: Number(metrics.total_officers || metrics.total_field_officers || 0),
      totalTasks: Number(metrics.total_tasks || 0),
      pendingDistribution: Number(metrics.pending_distribution || metrics.ready_for_distribution || 0),
      distributedTasks: Number(metrics.distributed_tasks || 0),
    };
  },

  getFieldOfficers: async (coordinatorUserId?: number): Promise<FieldOfficerDto[]> => {
    try {
      const url = coordinatorUserId
        ? `/field-officers/list.php?coordinator_user_id=${encodeURIComponent(coordinatorUserId)}&include_stats=1`
        : '/field-officers/list.php?include_stats=1';

      const [officersRes, tasksRes] = await Promise.all([
        apiClient.get<any>(url),
        apiClient.get<any>('/tasks/list.php?limit=100').catch(() => null),
      ]);

      if (officersRes.data.success && Array.isArray(officersRes.data.field_officers)) {
        let rawOfficers = officersRes.data.field_officers;

        // Client-side safeguard to ensure only officers belonging to this coordinator are returned
        if (coordinatorUserId) {
          rawOfficers = rawOfficers.filter(
            (raw: any) =>
              raw.coordinator_user_id &&
              Number(raw.coordinator_user_id) === Number(coordinatorUserId)
          );
        }

        const allTasks: any[] = tasksRes?.data?.success && Array.isArray(tasksRes.data.tasks) ? tasksRes.data.tasks : [];

        return rawOfficers.map((raw: any) => {
          const officer = mapFieldOfficerDto(raw);

          // Find tasks created by or linked to this field officer
          const officerTasks = allTasks.filter(
            (t) =>
              (t.created_by_field_officer_id && Number(t.created_by_field_officer_id) === officer.id) ||
              (t.field_officer_phone && String(t.field_officer_phone).trim() === officer.phoneNumber.trim())
          );

          if (officerTasks.length > 0) {
            const repairs = officerTasks.filter((t) =>
              String(t.type_of_process || '').toUpperCase().includes('REPAIR')
            ).length;
            const replacements = officerTasks.filter((t) =>
              String(t.type_of_process || '').toUpperCase().includes('REPLACE')
            ).length;
            const distributed = officerTasks.filter(
              (t) => String(t.status || '').toUpperCase() === 'DISTRIBUTED'
            ).length;
            const ready = officerTasks.filter((t) =>
              ['REPAIR_COMPLETED', 'REPLACEMENT_COMPLETED'].includes(String(t.status || '').toUpperCase())
            ).length;
            const pending = officerTasks.filter((t) =>
              ['COLLECTED', 'ASSIGNED', 'IN_PROGRESS'].includes(String(t.status || '').toUpperCase())
            ).length;

            return {
              ...officer,
              totalTasks: Math.max(officer.totalTasks || 0, officerTasks.length),
              distributedTasks: Math.max(officer.distributedTasks || 0, distributed),
              readyForDistribution: Math.max(officer.readyForDistribution || 0, ready),
              pendingTasks: Math.max(officer.pendingTasks || 0, pending),
              repairsCount: repairs,
              replacementsCount: replacements,
            };
          }

          return officer;
        });
      }
      return [];
    } catch (e) {
      console.warn('Failed to getFieldOfficers', e);
      return [];
    }
  },

  getFieldOfficerByPhone: async (
    phone: string
  ): Promise<{ fieldOfficer: FieldOfficerDto; tasks?: TaskDto[] }> => {
    const response = await apiClient.get<any>(
      `/field-officers/get.php?phone=${encodeURIComponent(phone)}`
    );
    if (!response.data.success || !response.data.field_officer) {
      throw new Error(response.data.error || 'Field officer not found');
    }
    const officer = mapFieldOfficerDto(response.data.field_officer);

    // Fetch this officer's tasks directly and reliably
    let tasks: TaskDto[] = [];
    try {
      const taskListRes = await apiClient.get<any>(
        `/tasks/list.php?field_officer_id=${officer.id}&limit=100`
      );
      if (taskListRes.data.success && Array.isArray(taskListRes.data.tasks)) {
        tasks = taskListRes.data.tasks.map(mapTaskDto);
      }
    } catch (e) {
      console.warn('Failed to load tasks for field officer', e);
    }

    if (tasks.length > 0) {
      const repairs = tasks.filter((t) =>
        String(t.typeOfProcess || '').toUpperCase().includes('REPAIR')
      ).length;
      const replacements = tasks.filter((t) =>
        String(t.typeOfProcess || '').toUpperCase().includes('REPLACE')
      ).length;
      const distributed = tasks.filter((t) => t.status === 'DISTRIBUTED').length;
      const ready = tasks.filter((t) =>
        ['REPAIR_COMPLETED', 'REPLACEMENT_COMPLETED'].includes(t.status as string)
      ).length;
      const pending = tasks.filter((t) =>
        ['COLLECTED', 'ASSIGNED', 'IN_PROGRESS'].includes(t.status as string)
      ).length;

      officer.totalTasks = tasks.length;
      officer.repairsCount = repairs;
      officer.replacementsCount = replacements;
      officer.distributedTasks = distributed;
      officer.readyForDistribution = ready;
      officer.pendingTasks = pending;
    }

    return { fieldOfficer: officer, tasks };
  },

  getCoordinatorTasks: async (
    status?: string,
    coordinatorUserId?: number
  ): Promise<TaskDto[]> => {
    let url = '/coordinator/tasks.php';
    const queryParts: string[] = [];
    if (status) {
      queryParts.push(`status=${encodeURIComponent(status)}`);
    }
    if (coordinatorUserId) {
      queryParts.push(`coordinator_user_id=${encodeURIComponent(coordinatorUserId)}`);
    }
    if (queryParts.length > 0) {
      url += `?${queryParts.join('&')}`;
    }
    const response = await apiClient.get<any>(url);
    if (response.data.success && Array.isArray(response.data.tasks)) {
      return response.data.tasks.map(mapTaskDto);
    }
    return [];
  },
};
