/**
 * Type-safe Navigation Route Names
 */

export const Routes = {
  // Public / Auth
  WELCOME: 'Welcome',
  LOGIN: 'Login',

  // Role Tab Navigators
  FIELD_OFFICER_TABS: 'FieldOfficerTabs',
  SUPERVISOR_TABS: 'SupervisorTabs',
  TECHNICIAN_TABS: 'TechnicianTabs',
  COORDINATOR_TABS: 'CoordinatorTabs',

  // Dashboards / Main Screens
  FIELD_OFFICER_DASHBOARD: 'FieldOfficerDashboard',
  SUPERVISOR_DASHBOARD: 'SupervisorDashboard',
  TECHNICIAN_DASHBOARD: 'TechnicianDashboard',
  COORDINATOR_DASHBOARD: 'CoordinatorDashboard',

  // Task Flow Screens
  TASK_DETAIL: 'TaskDetail',
  CREATE_TASK: 'CreateTask',
  ASSIGN_TASK: 'AssignTask',
  REPAIR_FORM: 'RepairForm',
  REPLACEMENT_FORM: 'ReplacementForm',

  // Supervisor Management Screens
  TECHNICIANS_LIST: 'TechniciansList',
  TECHNICIAN_DETAIL: 'TechnicianDetail',
  CREATE_TECHNICIAN: 'CreateTechnician',
  EDIT_TECHNICIAN: 'EditTechnician',

  // Coordinator Screens
  FIELD_OFFICER_DETAIL: 'FieldOfficerDetail',

  // Profile Screens
  PROFILE: 'Profile',
  EDIT_PROFILE: 'EditProfile',
} as const;

export type RootStackParamList = {
  [Routes.WELCOME]: undefined;
  [Routes.LOGIN]: undefined;
  [Routes.FIELD_OFFICER_TABS]: undefined;
  [Routes.SUPERVISOR_TABS]: undefined;
  [Routes.TECHNICIAN_TABS]: undefined;
  [Routes.COORDINATOR_TABS]: undefined;
  [Routes.TASK_DETAIL]: { taskId: number };
  [Routes.CREATE_TASK]: { prefillFieldOfficerId?: number } | undefined;
  [Routes.ASSIGN_TASK]: { taskId: number };
  [Routes.REPAIR_FORM]: { taskId: number };
  [Routes.REPLACEMENT_FORM]: { taskId: number };
  [Routes.TECHNICIANS_LIST]: undefined;
  [Routes.TECHNICIAN_DETAIL]: { technicianId: number };
  [Routes.CREATE_TECHNICIAN]: undefined;
  [Routes.EDIT_TECHNICIAN]: { technicianId: number };
  [Routes.FIELD_OFFICER_DETAIL]: { officerPhone: string };
  [Routes.EDIT_PROFILE]: undefined;
};
