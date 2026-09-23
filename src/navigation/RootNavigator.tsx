import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { RootStackParamList, Routes } from '../constants/routes';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types';
import { LoadingSpinner } from '../components/common/LoadingSpinner';

// Auth screens
import { WelcomeScreen } from '../screens/auth/WelcomeScreen';
import { LoginScreen } from '../screens/auth/LoginScreen';

// Role Tab Navigators
import { FieldOfficerTabs } from './FieldOfficerTabs';
import { SupervisorTabs } from './SupervisorTabs';
import { TechnicianTabs } from './TechnicianTabs';
import { CoordinatorTabs } from './CoordinatorTabs';

// Detail & Action Screens
import { TaskDetailScreen } from '../screens/tasks/TaskDetailScreen';
import { CreateTaskScreen } from '../screens/tasks/CreateTaskScreen';
import { AssignTaskScreen } from '../screens/tasks/AssignTaskScreen';
import { RepairFormScreen } from '../screens/tasks/RepairFormScreen';
import { ReplacementFormScreen } from '../screens/tasks/ReplacementFormScreen';
import { TechnicianDetailScreen } from '../screens/supervisor/TechnicianDetailScreen';
import { CreateTechnicianScreen } from '../screens/supervisor/CreateTechnicianScreen';
import { EditTechnicianScreen } from '../screens/supervisor/EditTechnicianScreen';
import { FieldOfficerDetailScreen } from '../screens/coordinator/FieldOfficerDetailScreen';
import { EditProfileScreen } from '../screens/profile/EditProfileScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

export const RootNavigator: React.FC = () => {
  const { session, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingSpinner message="Starting CookstoveCare..." />;
  }

  const role = session?.role;

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!session ? (
          // Unauthenticated Stack
          <>
            <Stack.Screen name={Routes.WELCOME} component={WelcomeScreen} />
            <Stack.Screen name={Routes.LOGIN} component={LoginScreen} />
          </>
        ) : (
          // Authenticated Role-Based Stacks
          <>
            {role === UserRole.SUPERVISOR ? (
              <Stack.Screen name={Routes.SUPERVISOR_TABS} component={SupervisorTabs} />
            ) : role === UserRole.TECHNICIAN ? (
              <Stack.Screen name={Routes.TECHNICIAN_TABS} component={TechnicianTabs} />
            ) : role === UserRole.FIELD_COORDINATOR ? (
              <Stack.Screen name={Routes.COORDINATOR_TABS} component={CoordinatorTabs} />
            ) : (
              <Stack.Screen name={Routes.FIELD_OFFICER_TABS} component={FieldOfficerTabs} />
            )}

            {/* Common Task & Detail Screens */}
            <Stack.Screen
              name={Routes.TASK_DETAIL}
              component={TaskDetailScreen}
              options={{ presentation: 'card' }}
            />
            <Stack.Screen
              name={Routes.CREATE_TASK}
              component={CreateTaskScreen}
              options={{ presentation: 'modal' }}
            />
            <Stack.Screen
              name={Routes.ASSIGN_TASK}
              component={AssignTaskScreen}
              options={{ presentation: 'card' }}
            />
            <Stack.Screen
              name={Routes.REPAIR_FORM}
              component={RepairFormScreen}
              options={{ presentation: 'card' }}
            />
            <Stack.Screen
              name={Routes.REPLACEMENT_FORM}
              component={ReplacementFormScreen}
              options={{ presentation: 'card' }}
            />
            <Stack.Screen
              name={Routes.TECHNICIAN_DETAIL}
              component={TechnicianDetailScreen}
              options={{ presentation: 'card' }}
            />
            <Stack.Screen
              name={Routes.CREATE_TECHNICIAN}
              component={CreateTechnicianScreen}
              options={{ presentation: 'modal' }}
            />
            <Stack.Screen
              name={Routes.EDIT_TECHNICIAN}
              component={EditTechnicianScreen}
              options={{ presentation: 'card' }}
            />
            <Stack.Screen
              name={Routes.FIELD_OFFICER_DETAIL}
              component={FieldOfficerDetailScreen}
              options={{ presentation: 'card' }}
            />
            <Stack.Screen
              name={Routes.EDIT_PROFILE}
              component={EditProfileScreen}
              options={{ presentation: 'card' }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};
