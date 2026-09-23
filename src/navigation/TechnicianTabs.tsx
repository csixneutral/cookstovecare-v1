import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { TechnicianDashboard } from '../screens/technician/TechnicianDashboard';
import { ProfileScreen } from '../screens/profile/ProfileScreen';
import { Colors } from '../constants/theme';
import { MaterialIcons } from '@expo/vector-icons';

const Tab = createBottomTabNavigator();

export const TechnicianTabs: React.FC = () => {
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
        name="TechnicianWorkspace"
        component={TechnicianDashboard}
        options={{
          tabBarLabel: 'My Tasks',
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="build" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="TechnicianProfile"
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
