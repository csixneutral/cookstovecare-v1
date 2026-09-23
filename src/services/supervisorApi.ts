import { apiClient } from './apiClient';
import { SupervisorDashboardMetrics, TechnicianDto, TechnicianSkillType } from '../types';

export interface TechniciansListResponse {
  success: boolean;
  technicians?: any[];
  error?: string;
}

export const mapTechnicianDto = (raw: any): TechnicianDto => {
  return {
    id: Number(raw.id),
    name: raw.name || '',
    phoneNumber: raw.phone_number || raw.phoneNumber || '',
    skillType: (raw.skill_type || raw.skillType || 'BOTH') as TechnicianSkillType,
    isActive: raw.is_active !== undefined ? Boolean(Number(raw.is_active)) : true,
    activeTasksCount: raw.active_tasks_count ? Number(raw.active_tasks_count) : 0,
    completedTasksCount: raw.completed_tasks_count ? Number(raw.completed_tasks_count) : 0,
    profileImageUrl: raw.profile_image_url || undefined,
  };
};

export const supervisorApi = {
  getDashboardMetrics: async (): Promise<SupervisorDashboardMetrics> => {
    const response = await apiClient.get<any>('/supervisor/dashboard.php');
    const data = response.data;
    if (!data.success) {
      throw new Error(data.error || 'Failed to fetch supervisor metrics');
    }
    const metrics = data.metrics || data.data || {};
    return {
      totalTasks: Number(metrics.total_tasks || 0),
      unassignedTasks: Number(metrics.unassigned_tasks || 0),
      assignedTasks: Number(metrics.assigned_tasks || 0),
      inProgressTasks: Number(metrics.in_progress_tasks || 0),
      completedTasks: Number(metrics.completed_tasks || 0),
      distributedTasks: Number(metrics.distributed_tasks || 0),
      totalTechnicians: Number(metrics.total_technicians || 0),
      activeTechnicians: Number(metrics.active_technicians || 0),
    };
  },

  getTechnicians: async (activeOnly: boolean = false): Promise<TechnicianDto[]> => {
    const queryString = activeOnly ? '?active_only=true' : '';
    const response = await apiClient.get<TechniciansListResponse>(`/technicians/list.php${queryString}`);
    if (response.data.success && Array.isArray(response.data.technicians)) {
      return response.data.technicians.map(mapTechnicianDto);
    }
    return [];
  },

  getTechnicianById: async (id: number): Promise<TechnicianDto> => {
    const response = await apiClient.get<any>(`/technicians/get.php?id=${id}`);
    if (!response.data.success || !response.data.technician) {
      throw new Error(response.data.error || 'Technician not found');
    }
    return mapTechnicianDto(response.data.technician);
  },

  assignTask: async (taskId: number, technicianId: number): Promise<boolean> => {
    const response = await apiClient.post<any>('/tasks/assign.php', {
      task_id: taskId,
      technician_id: technicianId,
    });
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to assign task');
    }
    return true;
  },

  createTechnician: async (payload: {
    name: string;
    phoneNumber: string;
    skillType: string;
  }): Promise<TechnicianDto> => {
    const response = await apiClient.post<any>('/technicians/create.php', {
      name: payload.name,
      phone_number: payload.phoneNumber,
      skill_type: payload.skillType,
    });
    if (!response.data.success || !response.data.technician) {
      throw new Error(response.data.error || 'Failed to create technician');
    }
    return mapTechnicianDto(response.data.technician);
  },

  updateTechnician: async (payload: {
    id: number;
    name?: string;
    phoneNumber?: string;
    skillType?: string;
    isActive?: boolean;
  }): Promise<TechnicianDto> => {
    const response = await apiClient.post<any>('/technicians/update.php', {
      id: payload.id,
      name: payload.name,
      phone_number: payload.phoneNumber,
      skill_type: payload.skillType,
      is_active: payload.isActive !== undefined ? (payload.isActive ? 1 : 0) : undefined,
    });
    if (!response.data.success || !response.data.technician) {
      throw new Error(response.data.error || 'Failed to update technician');
    }
    return mapTechnicianDto(response.data.technician);
  },
};
