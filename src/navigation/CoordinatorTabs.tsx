import React from 'react';
import { StyleSheet, Platform } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { CoordinatorHomeScreen } from '../screens/coordinator/CoordinatorHomeScreen';
import { CoordinatorOfficersScreen } from '../screens/coordinator/CoordinatorOfficersScreen';
import { CoordinatorDashboard } from '../screens/coordinator/CoordinatorDashboard';
import { ProfileScreen } from '../screens/profile/ProfileScreen';
import { CenterFabButton } from '../components/navigation/CenterFabButton';
import { Colors } from '../constants/theme';
import { MaterialIcons } from '@expo/vector-icons';
import { RootStackParamList, Routes } from '../constants/routes';

const Tab = createBottomTabNavigator();
const DummyCenterScreen = () => null;

export const CoordinatorTabs: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: '#64748B',
        tabBarStyle: styles.tabBar,
        tabBarItemStyle: styles.tabBarItem,
        tabBarLabelStyle: styles.tabBarLabel,
      }}
    >
      {/* 1. Home Tab */}
      <Tab.Screen
        name="CoordinatorHome"
        component={CoordinatorHomeScreen}
        options={{
          tabBarLabel: 'Home',
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="home" size={26} color={color} />
          ),
        }}
      />

      {/* 2. Field Officers Tab */}
      <Tab.Screen
        name="CoordinatorOfficers"
        component={CoordinatorOfficersScreen}
        options={{
          tabBarLabel: 'Officers',
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="people" size={26} color={color} />
          ),
        }}
      />

      {/* 3. Center FAB: Create New Order (Style #06) */}
      <Tab.Screen
        name="CoordinatorCreateOrder"
        component={DummyCenterScreen}
        options={{
          tabBarLabel: () => null,
          tabBarButton: () => (
            <CenterFabButton
              onPress={() => navigation.navigate(Routes.CREATE_TASK)}
              accessibilityLabel="Create Order"
            />
          ),
        }}
        listeners={{
          tabPress: (e) => {
            e.preventDefault();
            navigation.navigate(Routes.CREATE_TASK);
          },
        }}
      />

      {/* 4. Overview / Dashboard Tab */}
      <Tab.Screen
        name="CoordinatorOverview"
        component={CoordinatorDashboard}
        options={{
          tabBarLabel: 'Overview',
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="dashboard" size={25} color={color} />
          ),
        }}
      />

      {/* 5. Profile Tab */}
      <Tab.Screen
        name="CoordinatorProfile"
        component={ProfileScreen}
        options={{
          tabBarLabel: 'Profile',
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="person" size={26} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
};

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: '#FFFFFF',
    borderTopColor: '#F1F5F9',
    borderTopWidth: 1,
    height: Platform.OS === 'ios' ? 88 : 70,
    paddingBottom: Platform.OS === 'ios' ? 26 : 10,
    paddingTop: 8,
    elevation: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
  },
  tabBarItem: {
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabBarLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
});
