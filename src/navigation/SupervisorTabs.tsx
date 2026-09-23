import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SupervisorDashboard } from '../screens/supervisor/SupervisorDashboard';
import { TechniciansListScreen } from '../screens/supervisor/TechniciansListScreen';
import { ProfileScreen } from '../screens/profile/ProfileScreen';
import { Colors } from '../constants/theme';
import { MaterialIcons } from '@expo/vector-icons';

const Tab = createBottomTabNavigator();

export const SupervisorTabs: React.FC = () => {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textSecondary,
        tabBarStyle: {
          backgroundColor: Colors.surface,
          borderTopColor: Colors.border,
          height: 60,
          paddingBottom: 8,
          paddingTop: 6,
        },
      }}
    >
      <Tab.Screen
        name="SupervisorOverview"
        component={SupervisorDashboard}
        options={{
          tabBarLabel: 'Tasks',
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="assignment" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="SupervisorTechnicians"
        component={TechniciansListScreen}
        options={{
          tabBarLabel: 'Technicians',
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="engineering" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="SupervisorProfile"
        component={ProfileScreen}
        options={{
          tabBarLabel: 'Profile',
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="person" size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
};
