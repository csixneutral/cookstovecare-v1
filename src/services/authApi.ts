import { apiClient } from './apiClient';
import { UserRole, UserSession } from '../types';

export interface LoginApiResponse {
  success: boolean;
  error?: string;
  user?: {
    id: number;
    phone_number: string;
    name?: string;
    role: string;
    profile_image_url?: string;
    technician_id?: number;
  };
}

export const authApi = {
  login: async (phoneNumber: string, password: string): Promise<UserSession> => {
    const response = await apiClient.post<LoginApiResponse>('/login.php', {
      phone_number: phoneNumber,
      password: password,
    });

    const data = response.data;
    if (!data.success || !data.user) {
      throw new Error(data.error || 'Login failed');
    }

    const rawRole = (data.user.role || '').toUpperCase();
    let role: UserRole = UserRole.FIELD_OFFICER;
    if (rawRole.includes('SUPERVISOR')) {
      role = UserRole.SUPERVISOR;
    } else if (rawRole.includes('TECHNICIAN')) {
      role = UserRole.TECHNICIAN;
    } else if (rawRole.includes('COORDINATOR')) {
      role = UserRole.FIELD_COORDINATOR;
    }

    return {
      userId: data.user.id,
      phoneNumber: data.user.phone_number,
      name: data.user.name && data.user.name !== 'null' ? data.user.name : undefined,
      role: role,
      profileImageUrl:
        data.user.profile_image_url && data.user.profile_image_url !== 'null'
          ? data.user.profile_image_url
          : undefined,
      technicianId: data.user.technician_id ? Number(data.user.technician_id) : undefined,
    };
  },
};
