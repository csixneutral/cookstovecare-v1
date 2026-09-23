/**
 * CookstoveCare Data Types & Contracts
 */

export enum UserRole {
  FIELD_OFFICER = 'FIELD_OFFICER',
  SUPERVISOR = 'SUPERVISOR',
  TECHNICIAN = 'TECHNICIAN',
  FIELD_COORDINATOR = 'FIELD_COORDINATOR',
}

export enum TaskStatus {
  COLLECTED = 'COLLECTED',
  ASSIGNED = 'ASSIGNED',
  IN_PROGRESS = 'IN_PROGRESS',
  REPAIR_COMPLETED = 'REPAIR_COMPLETED',
  REPLACEMENT_COMPLETED = 'REPLACEMENT_COMPLETED',
  DISTRIBUTED = 'DISTRIBUTED',
}

export enum ProcessType {
  REPAIRING = 'REPAIRING',
  REPLACEMENT = 'REPLACEMENT',
}

export enum TechnicianSkillType {
  REPAIR = 'REPAIR',
  REPLACEMENT = 'REPLACEMENT',
  BOTH = 'BOTH',
}

export interface UserSession {
  userId: number;
  phoneNumber: string;
  name?: string;
  role: UserRole;
  profileImageUrl?: string;
  technicianId?: number;
  centerName?: string;
}

export interface TaskDto {
  id: number;
  cookstoveNumber: string;
  customerName?: string | null;
  customerPhone?: string | null;
  deliveryAddress?: string | null;
  village?: string | null;
  panchayat?: string | null;
  block?: string | null;
  district?: string | null;
  pin?: string | null;
  typeOfProcess?: 'REPAIRING' | 'REPLACEMENT' | string | null;
  status: TaskStatus | string;
  collectionDate: number;
  receivedProductImageUrl?: string | null;
  temporaryCookstoveNumber?: string | null;
  createdByFieldOfficerId?: number | null;
  fieldOfficerName?: string | null;
  fieldOfficerPhone?: string | null;
  assignedToTechnicianId?: number | null;
  technicianName?: string | null;
  assignedAt?: string | null;
  workStartedAt?: string | null;
  completedAt?: string | null;
  distributionDate?: number | null;
  distributionImageUrl?: string | null;
  distributionComment?: string | null;
  customerSignatureUrl?: string | null;
  customerReview?: string | null;
  newStoveNumber?: string | null;
  newStoveImageUrl?: string | null;
  interimCookstoveUsed?: string | null;
  interimDaysUsed?: number | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface TechnicianDto {
  id: number;
  name: string;
  phoneNumber: string;
  skillType: TechnicianSkillType | string;
  isActive: boolean;
  activeTasksCount?: number;
  completedTasksCount?: number;
  profileImageUrl?: string;
}

export interface CookstoveLookupData {
  barcode: string;
  aadhar?: string;
  customerName?: string;
  customerPhone?: string;
  deliveryAddress?: string;
  village?: string;
  panchayat?: string;
  block?: string;
  district?: string;
  pin?: string;
  latitude?: number;
  longitude?: number;
  distributed?: string;
  allocationDate?: string;
  fieldOfficerName?: string;
}

export interface RepairDataDto {
  id?: number;
  taskId: number;
  technicianId: number;
  repairDate?: number;
  partsReplaced?: string;
  laborHours?: number;
  repairNotes?: string;
  repairImageUrl?: string;
  typesOfRepair?: string[];
  createdAt?: string;
}

export interface ReplacementDataDto {
  id?: number;
  taskId: number;
  technicianId: number;
  oldCookstoveNumber?: string;
  oldCookstoveImageUrl?: string;
  newCookstoveNumber?: string;
  newCookstoveImageUrl?: string;
  replacementReason?: string;
  replacementDate?: number;
  createdAt?: string;
}

export interface FieldOfficerDto {
  id: number;
  name: string;
  phoneNumber: string;
  coordinatorUserId?: number;
  totalTasks?: number;
  pendingTasks?: number;
  distributedTasks?: number;
  readyForDistribution?: number;
  repairsCount?: number;
  replacementsCount?: number;
  profileImageUrl?: string;
  isActive?: boolean;
}

export interface SupervisorDashboardMetrics {
  totalTasks: number;
  unassignedTasks: number;
  assignedTasks: number;
  inProgressTasks: number;
  completedTasks: number;
  distributedTasks: number;
  totalTechnicians: number;
  activeTechnicians: number;
}

export interface TechnicianDashboardMetrics {
  newTasksCount: number;
  activeTasksCount: number;
  completedTasksCount: number;
  totalTasksCount: number;
}

export interface CoordinatorDashboardMetrics {
  totalOfficers: number;
  totalTasks: number;
  pendingDistribution: number;
  distributedTasks: number;
}
