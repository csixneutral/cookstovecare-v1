import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { Colors, Shadows } from '../../constants/theme';
import { Header } from '../../components/common/Header';
import { useAuth } from '../../context/AuthContext';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList, Routes } from '../../constants/routes';

export const ProfileScreen: React.FC = () => {
  const { session, logout, clearCache } = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out of CookstoveCare?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          await logout();
        },
      },
    ]);
  };

  const handleClearCache = async () => {
    Alert.alert('Clear Cache', 'Do you want to clear locally cached data?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear',
        onPress: async () => {
          await clearCache();
          Alert.alert('Success', 'Local cache cleared successfully');
        },
      },
    ]);
  };

  const roleDisplay = session?.role?.replace('_', ' ') || 'USER';

  return (
    <View style={styles.container}>
      <Header title="My Profile" />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Profile Card */}
        <View style={styles.profileHeaderCard}>
          <View style={styles.avatarCircle}>
            <MaterialIcons name="person" size={44} color={Colors.primary} />
          </View>

          <Text style={styles.userName}>{session?.name || 'CookstoveCare User'}</Text>
          <Text style={styles.userPhone}>{session?.phoneNumber}</Text>

          <View style={styles.roleBadge}>
            <MaterialIcons name="verified-user" size={14} color={Colors.primary} />
            <Text style={styles.roleBadgeText}>{roleDisplay}</Text>
          </View>
        </View>

        {/* Account Details */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Account Details</Text>

          <View style={styles.itemRow}>
            <View style={styles.itemIconContainer}>
              <MaterialIcons name="phone" size={20} color={Colors.primary} />
            </View>
            <View style={styles.itemTextContainer}>
              <Text style={styles.itemLabel}>Phone Number</Text>
              <Text style={styles.itemValue}>{session?.phoneNumber}</Text>
            </View>
          </View>

          {session?.centerName ? (
            <View style={styles.itemRow}>
              <View style={styles.itemIconContainer}>
                <MaterialIcons name="store" size={20} color={Colors.primary} />
              </View>
              <View style={styles.itemTextContainer}>
                <Text style={styles.itemLabel}>Center / Location</Text>
                <Text style={styles.itemValue}>{session.centerName}</Text>
              </View>
            </View>
          ) : null}

          {session?.technicianId ? (
            <View style={styles.itemRow}>
              <View style={styles.itemIconContainer}>
                <MaterialIcons name="engineering" size={20} color={Colors.primary} />
              </View>
              <View style={styles.itemTextContainer}>
                <Text style={styles.itemLabel}>Technician ID</Text>
                <Text style={styles.itemValue}>#{session.technicianId}</Text>
              </View>
            </View>
          ) : null}
        </View>

        {/* Quick Settings & Actions */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Preferences & Cache</Text>

          <TouchableOpacity
            style={styles.actionRow}
            activeOpacity={0.7}
            onPress={() => navigation.navigate(Routes.EDIT_PROFILE)}
          >
            <View style={styles.itemIconContainer}>
              <MaterialIcons name="edit" size={20} color={Colors.primary} />
            </View>
            <Text style={styles.actionRowText}>Edit Name & Center</Text>
            <MaterialIcons name="chevron-right" size={22} color={Colors.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionRow}
            activeOpacity={0.7}
            onPress={handleClearCache}
          >
            <View style={styles.itemIconContainer}>
              <MaterialIcons name="cached" size={20} color={Colors.primary} />
            </View>
            <Text style={styles.actionRowText}>Clear Local Cache</Text>
            <MaterialIcons name="chevron-right" size={22} color={Colors.textMuted} />
          </TouchableOpacity>
        </View>

        {/* Logout Button */}
        <TouchableOpacity
          style={styles.logoutButton}
          activeOpacity={0.8}
          onPress={handleLogout}
        >
          <MaterialIcons name="logout" size={20} color={Colors.error} />
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>

        <Text style={styles.versionText}>CookstoveCare Mobile v1.0.0</Text>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  profileHeaderCard: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    marginBottom: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadows.sm,
  },
  avatarCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: `${Colors.primary}15`,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  userName: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  userPhone: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${Colors.primary}12`,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 16,
    marginTop: 10,
  },
  roleBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.primary,
    marginLeft: 6,
  },
  sectionCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadows.sm,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 12,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  itemIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: `${Colors.primary}10`,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  itemTextContainer: {
    flex: 1,
  },
  itemLabel: {
    fontSize: 11,
    color: Colors.textSecondary,
  },
  itemValue: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginTop: 1,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  actionRowText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: Colors.textPrimary,
  },
  logoutButton: {
    backgroundColor: `${Colors.error}10`,
    borderRadius: 16,
    height: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
    borderWidth: 1,
    borderColor: `${Colors.error}30`,
  },
  logoutText: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.error,
    marginLeft: 8,
  },
  versionText: {
    textAlign: 'center',
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 20,
  },
});
