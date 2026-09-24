import { apiClient } from './apiClient';
import { CookstoveLookupData, TaskDto } from '../types';

export interface TasksListParams {
  fieldOfficerId?: number;
  fieldOfficerPhone?: string;
  technicianId?: number;
  status?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

export interface TasksApiResponse {
  success: boolean;
  error?: string;
  task?: any;
  tasks?: any[];
}

export interface CookstoveLookupApiResponse {
  success: boolean;
  found: boolean;
  error?: string;
  cookstove?: any;
}

// Maps backend snake_case task representation to frontend TaskDto
export const mapTaskDto = (raw: any): TaskDto => {
  return {
    id: Number(raw.id),
    cookstoveNumber: raw.cookstove_number || raw.cookstoveNumber || '',
    customerName: raw.customer_name || raw.customerName || null,
    customerPhone: raw.customer_phone || raw.customerPhone || null,
    deliveryAddress: raw.delivery_address || raw.deliveryAddress || null,
    village: raw.village || null,
    panchayat: raw.panchayat || null,
    block: raw.block || null,
    district: raw.district || null,
    pin: raw.pin || null,
    typeOfProcess: raw.type_of_process || raw.typeOfProcess || 'REPAIRING',
    status: raw.status || 'COLLECTED',
    collectionDate: typeof raw.collection_date === 'number'
      ? raw.collection_date
      : raw.collection_date
      ? new Date(raw.collection_date).getTime()
      : Date.now(),
    receivedProductImageUrl: raw.received_product_image_url || raw.receivedProductImageUrl || null,
    temporaryCookstoveNumber: raw.temporary_cookstove_number || raw.temporaryCookstoveNumber || null,
    createdByFieldOfficerId: raw.created_by_field_officer_id || raw.createdByFieldOfficerId || null,
    fieldOfficerName: raw.field_officer_name || raw.fieldOfficerName || null,
    fieldOfficerPhone: raw.field_officer_phone || raw.fieldOfficerPhone || null,
    assignedToTechnicianId: raw.assigned_to_technician_id || raw.assignedToTechnicianId || null,
    technicianName: raw.technician_name || raw.technicianName || null,
    assignedAt: raw.assigned_at || raw.assignedAt || null,
    workStartedAt: raw.work_started_at || raw.workStartedAt || null,
    completedAt: raw.completed_at || raw.completedAt || null,
    distributionDate: raw.distribution_date ? Number(raw.distribution_date) : null,
    distributionImageUrl: raw.distribution_image_url || raw.distributionImageUrl || null,
    distributionComment: raw.distribution_comment || raw.distributionComment || null,
    customerSignatureUrl: raw.customer_signature_url || raw.customerSignatureUrl || null,
    collectionSignatureUrl: raw.collection_signature_url || raw.collectionSignatureUrl || raw.customer_signature_url || raw.customerSignatureUrl || null,
    deliverySignatureUrl: raw.delivery_signature_url || raw.deliverySignatureUrl || null,
    customerReview: raw.customer_review || raw.customerReview || null,
    newStoveNumber: raw.new_stove_number || raw.newStoveNumber || null,
    newStoveImageUrl: raw.new_stove_image_url || raw.newStoveImageUrl || null,
    interimCookstoveUsed: raw.interim_cookstove_used || raw.interimCookstoveUsed || null,
    interimDaysUsed: raw.interim_days_used ? Number(raw.interim_days_used) : null,
    createdAt: raw.created_at || raw.createdAt || null,
    updatedAt: raw.updated_at || raw.updatedAt || null,
  };
};

export const taskApi = {
  lookupCookstove: async (barcode: string): Promise<CookstoveLookupData | null> => {
    try {
      const response = await apiClient.get<CookstoveLookupApiResponse>(
        `/cookstove/lookup.php?barcode=${encodeURIComponent(barcode)}`
      );
      if (response.data.success && response.data.found && response.data.cookstove) {
        const c = response.data.cookstove;
        return {
          barcode: c.barcode || barcode,
          aadhar: c.aadhar,
          customerName: c.customer_name || c.name,
          customerPhone: c.customer_phone || c.phone,
          deliveryAddress: c.delivery_address || c.address,
          village: c.village,
          panchayat: c.panchayat,
          block: c.block,
          district: c.district,
          pin: c.pin,
          latitude: c.latitude ? Number(c.latitude) : undefined,
          longitude: c.longitude ? Number(c.longitude) : undefined,
          distributed: c.distributed,
          allocationDate: c.allocation_date,
          fieldOfficerName: c.field_officer_name,
        };
      }
      return null;
    } catch {
      return null;
    }
  },

  createTask: async (payload: {
    cookstoveNumber: string;
    customerName?: string;
    customerPhone?: string;
    deliveryAddress?: string;
    typeOfProcess: 'REPAIRING' | 'REPLACEMENT';
    collectionDate: number;
    receivedProductImageUrl?: string;
    temporaryCookstoveNumber?: string;
    customerSignatureUrl?: string;
    collectionSignatureUrl?: string;
    isInstantRepair?: boolean;
    createdByFieldOfficerId?: number;
    fieldOfficerName?: string;
    fieldOfficerPhone?: string;
  }): Promise<TaskDto> => {
    const signatureUrl = payload.collectionSignatureUrl || payload.customerSignatureUrl;
    const body = {
      cookstove_number: payload.cookstoveNumber,
      customer_name: payload.customerName,
      customer_phone: payload.customerPhone,
      delivery_address: payload.deliveryAddress,
      type_of_process: payload.typeOfProcess,
      collection_date: payload.collectionDate,
      received_product_image_url: payload.receivedProductImageUrl,
      temporary_cookstove_number: payload.temporaryCookstoveNumber,
      customer_signature_url: signatureUrl,
      collection_signature_url: signatureUrl,
      is_instant_repair: payload.isInstantRepair ? 1 : 0,
      field_officer_id: payload.createdByFieldOfficerId,
      created_by_field_officer_id: payload.createdByFieldOfficerId,
      field_officer_name: payload.fieldOfficerName,
      field_officer_phone: payload.fieldOfficerPhone,
    };

    const response = await apiClient.post<TasksApiResponse>('/tasks/create.php', body);
    if (!response.data.success || !response.data.task) {
      throw new Error(response.data.error || 'Failed to create task');
    }
    return mapTaskDto(response.data.task);
  },

  getTasks: async (params: TasksListParams = {}): Promise<TaskDto[]> => {
    const queryParts: string[] = [];
    if (params.fieldOfficerId) queryParts.push(`field_officer_id=${params.fieldOfficerId}`);
    if (params.fieldOfficerPhone) queryParts.push(`field_officer_phone=${encodeURIComponent(params.fieldOfficerPhone)}`);
    if (params.technicianId) queryParts.push(`technician_id=${params.technicianId}`);
    if (params.status) queryParts.push(`status=${encodeURIComponent(params.status)}`);
    if (params.limit) queryParts.push(`limit=${params.limit}`);
    if (params.offset) queryParts.push(`offset=${params.offset}`);

    const queryString = queryParts.length > 0 ? `?${queryParts.join('&')}` : '';
    const response = await apiClient.get<TasksApiResponse>(`/tasks/list.php${queryString}`);
    
    if (response.data.success && Array.isArray(response.data.tasks)) {
      return response.data.tasks.map(mapTaskDto);
    }
    return [];
  },

  getTaskById: async (taskId: number): Promise<TaskDto> => {
    const response = await apiClient.get<TasksApiResponse>(`/tasks/get.php?id=${taskId}`);
    if (!response.data.success || !response.data.task) {
      throw new Error(response.data.error || 'Task not found');
    }
    return mapTaskDto(response.data.task);
  },

  distributeTask: async (payload: {
    taskId: number;
    fieldOfficerId?: number;
    distributionImageUrl?: string;
    distributionComment?: string;
    newStoveNumber?: string;
    newStoveImageUrl?: string;
    customerReview?: string;
    returnedTempCookstoveNumber?: string;
    interimCookstoveUsed?: string;
    interimDaysUsed?: number;
    customerSignatureUrl?: string;
    deliverySignatureUrl?: string;
  }): Promise<TaskDto> => {
    const signatureUrl = payload.deliverySignatureUrl || payload.customerSignatureUrl;
    const body = {
      task_id: payload.taskId,
      field_officer_id: payload.fieldOfficerId,
      distribution_image_url: payload.distributionImageUrl,
      distribution_comment: payload.distributionComment,
      new_stove_number: payload.newStoveNumber,
      new_stove_image_url: payload.newStoveImageUrl,
      customer_review: payload.customerReview,
      returned_temp_cookstove_number: payload.returnedTempCookstoveNumber,
      interim_cookstove_used: payload.interimCookstoveUsed,
      interim_days_used: payload.interimDaysUsed,
      customer_signature_url: signatureUrl,
      delivery_signature_url: signatureUrl,
    };

    const response = await apiClient.post<TasksApiResponse>('/tasks/distribute.php', body);
    if (!response.data.success || !response.data.task) {
      throw new Error(response.data.error || 'Failed to complete distribution');
    }
    return mapTaskDto(response.data.task);
  },

  updateTask: async (taskId: number, updates: Partial<TaskDto>): Promise<TaskDto> => {
    const body = {
      id: taskId,
      ...updates,
    };
    const response = await apiClient.post<TasksApiResponse>('/tasks/update.php', body);
    if (!response.data.success || !response.data.task) {
      throw new Error(response.data.error || 'Failed to update task');
    }
    return mapTaskDto(response.data.task);
  },

  deleteTask: async (taskId: number): Promise<boolean> => {
    const response = await apiClient.post<TasksApiResponse>('/tasks/delete.php', {
      task_id: taskId,
      id: taskId,
    });
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to delete order');
    }
    return true;
  },

  getTempCookstove: async (taskId: number): Promise<{ tempCookstoveNumber?: string } | null> => {
    try {
      const response = await apiClient.get<any>(`/temp-cookstove/get.php?task_id=${taskId}`);
      if (response.data.success && response.data.tempCookstove) {
        return {
          tempCookstoveNumber: response.data.tempCookstove.temporary_cookstove_number,
        };
      }
      return null;
    } catch {
      return null;
    }
  },
};
