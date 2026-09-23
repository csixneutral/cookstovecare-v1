import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Switch,
} from 'react-native';
import { Colors, Shadows } from '../../constants/theme';
import { Header } from '../../components/common/Header';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { TaskCard } from '../../components/common/TaskCard';
import { supervisorApi } from '../../services/supervisorApi';
import { technicianApi } from '../../services/technicianApi';
import { TaskDto, TechnicianDto, TechnicianSkillType } from '../../types';
import { MaterialIcons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList, Routes } from '../../constants/routes';

type Props = NativeStackScreenProps<RootStackParamList, typeof Routes.TECHNICIAN_DETAIL>;

export const TechnicianDetailScreen: React.FC<Props> = ({ navigation, route }) => {
  const { technicianId } = route.params;

  const [tech, setTech] = useState<TechnicianDto | null>(null);
  const [tasks, setTasks] = useState<TaskDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [techData, tasksData] = await Promise.all([
        supervisorApi.getTechnicianById(technicianId),
        technicianApi.getTasks(technicianId),
      ]);
      setTech(techData);
      setTasks(tasksData);
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to load technician details');
    } finally {
      setIsLoading(false);
    }
  }, [technicianId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleToggleActive = async (newValue: boolean) => {
    if (!tech) return;
    setIsUpdatingStatus(true);
    try {
      await supervisorApi.updateTechnician({
        id: tech.id,
        isActive: newValue,
      });
      setTech({ ...tech, isActive: newValue });
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to update technician status');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  if (isLoading || !tech) {
    return <LoadingSpinner message="Loading technician details..." />;
  }

  const skillLabel =
    tech.skillType === TechnicianSkillType.BOTH
      ? 'Repair & Replacement'
      : tech.skillType === TechnicianSkillType.REPLACEMENT
      ? 'Replacement Specialist'
      : 'Repair Specialist';

  return (
    <View style={styles.container}>
      <Header
        title={tech.name}
        subtitle="Technician Profile"
        onBack={() => navigation.goBack()}
        rightAction={{
          icon: 'edit',
          onPress: () => navigation.navigate(Routes.EDIT_TECHNICIAN, { technicianId: tech.id }),
        }}
      />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.avatarCircle}>
            <MaterialIcons name="engineering" size={38} color={Colors.primary} />
          </View>

          <Text style={styles.name}>{tech.name}</Text>
          <Text style={styles.phone}>{tech.phoneNumber}</Text>

          <View style={styles.skillBadge}>
            <Text style={styles.skillBadgeText}>{skillLabel}</Text>
          </View>

          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>Active Status</Text>
            <Switch
              value={tech.isActive}
              onValueChange={handleToggleActive}
              disabled={isUpdatingStatus}
              trackColor={{ false: Colors.border, true: Colors.primaryLight }}
              thumbColor={tech.isActive ? Colors.primary : '#f4f3f4'}
            />
          </View>
        </View>

        {/* Workload Stats */}
        <View style={styles.statsCard}>
          <View style={styles.statCol}>
            <Text style={styles.statNumber}>{tasks.length}</Text>
            <Text style={styles.statLabel}>Total Assigned</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statCol}>
            <Text style={[styles.statNumber, { color: Colors.info }]}>
              {tasks.filter((t) => t.status === 'IN_PROGRESS' || t.status === 'ASSIGNED').length}
            </Text>
            <Text style={styles.statLabel}>Active Work</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statCol}>
            <Text style={[styles.statNumber, { color: Colors.success }]}>
              {
                tasks.filter(
                  (t) =>
                    t.status === 'REPAIR_COMPLETED' ||
                    t.status === 'REPLACEMENT_COMPLETED' ||
                    t.status === 'DISTRIBUTED'
                ).length
              }
            </Text>
            <Text style={styles.statLabel}>Completed</Text>
          </View>
        </View>

        {/* Assigned Tasks List */}
        <View style={styles.tasksSection}>
          <Text style={styles.sectionHeading}>Assigned Tasks ({tasks.length})</Text>

          {tasks.length === 0 ? (
            <View style={styles.emptyTasksBox}>
              <Text style={styles.emptyTasksText}>No tasks assigned to this technician yet.</Text>
            </View>
          ) : (
            tasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                onPress={() => navigation.navigate(Routes.TASK_DETAIL, { taskId: task.id })}
              />
            ))
          )}
        </View>
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
  profileCard: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadows.sm,
  },
  avatarCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: `${Colors.primary}12`,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  name: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  phone: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  skillBadge: {
    backgroundColor: Colors.surfaceSecondary,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 8,
  },
  skillBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.secondary,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 16,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  statusLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  statsCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadows.sm,
  },
  statCol: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  statLabel: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: Colors.border,
  },
  tasksSection: {
    marginTop: 6,
  },
  sectionHeading: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 10,
    marginHorizontal: 4,
  },
  emptyTasksBox: {
    padding: 24,
    backgroundColor: Colors.surface,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  emptyTasksText: {
    fontSize: 13,
    color: Colors.textMuted,
  },
});
