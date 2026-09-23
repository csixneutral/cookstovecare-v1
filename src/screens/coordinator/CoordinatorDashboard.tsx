import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { Colors, Shadows } from '../../constants/theme';
import { Header } from '../../components/common/Header';
import { StatCard } from '../../components/common/StatCard';
import { TaskCard } from '../../components/common/TaskCard';
import { EmptyState } from '../../components/common/EmptyState';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { coordinatorApi } from '../../services/coordinatorApi';
import { taskApi } from '../../services/taskApi';
import { useAuth } from '../../context/AuthContext';
import { CoordinatorDashboardMetrics, FieldOfficerDto, TaskDto } from '../../types';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList, Routes } from '../../constants/routes';

export const CoordinatorDashboard: React.FC = () => {
  const { session } = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const [metrics, setMetrics] = useState<CoordinatorDashboardMetrics | null>(null);
  const [officers, setOfficers] = useState<FieldOfficerDto[]>([]);
  const [recentTasks, setRecentTasks] = useState<TaskDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeDeleteTaskId, setActiveDeleteTaskId] = useState<number | null>(null);

  const loadData = useCallback(async () => {
    try {
      const coordinatorUserId = session?.userId;
      const coordinatorPhone = session?.phoneNumber?.trim();

      const [metricsData, officersData, tasksData] = await Promise.all([
        coordinatorApi.getDashboardMetrics(coordinatorUserId).catch(() => null),
        coordinatorApi.getFieldOfficers(coordinatorUserId).catch(() => []),
        coordinatorApi.getCoordinatorTasks(undefined, coordinatorUserId).catch(() => []),
      ]);

      setOfficers(officersData);

      // Collect IDs and phone numbers of all field officers working under this coordinator
      const myOfficerIds = new Set(officersData.map((o) => o.id));
      const myOfficerPhones = new Set(
        officersData.map((o) => o.phoneNumber?.trim()).filter(Boolean)
      );

      // Scope tasks to ONLY this coordinator's group
      const scopedTasks = tasksData.filter((t) => {
        // Created by this coordinator
        if (coordinatorUserId && t.createdByFieldOfficerId === coordinatorUserId) return true;
        if (coordinatorPhone && t.fieldOfficerPhone?.trim() === coordinatorPhone) return true;

        // Created by or assigned to an officer under this coordinator
        if (t.createdByFieldOfficerId && myOfficerIds.has(t.createdByFieldOfficerId)) return true;
        if (t.fieldOfficerPhone && myOfficerPhones.has(t.fieldOfficerPhone.trim())) return true;

        return false;
      });

      if (metricsData) {
        setMetrics({
          ...metricsData,
          totalOfficers: officersData.length,
          totalTasks: scopedTasks.length,
        });
      }

      setRecentTasks(scopedTasks);
    } catch (e) {
      console.warn('Failed to load coordinator data', e);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [session?.userId, session?.phoneNumber]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadData();
    });
    return unsubscribe;
  }, [navigation, loadData]);

  const onRefresh = () => {
    setIsRefreshing(true);
    loadData();
  };

  const handleDeleteOrder = (taskToDelete: TaskDto) => {
    Alert.alert(
      'Delete Order',
      `Are you sure you want to delete Order #${taskToDelete.id} (${taskToDelete.cookstoveNumber})?\n\nThis will permanently remove the created order.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setRecentTasks((prev) => prev.filter((t) => t.id !== taskToDelete.id));
              const success = await taskApi.deleteTask(taskToDelete.id);
              if (success) {
                Alert.alert('Success', `Order #${taskToDelete.id} deleted successfully.`);
              } else {
                loadData();
                Alert.alert('Error', 'Failed to delete order on server.');
              }
            } catch (err: any) {
              loadData();
              Alert.alert('Error', err.message || 'Failed to delete order.');
            }
          },
        },
      ]
    );
  };

  if (isLoading) {
    return <LoadingSpinner message="Loading coordinator operations..." />;
  }

  return (
    <View style={styles.container}>
      <Header
        title="Field Coordinator"
        subtitle={`Welcome, ${session?.name || 'Coordinator'}`}
        rightAction={{
          icon: 'refresh',
          onPress: onRefresh,
          color: Colors.primary,
        }}
      />

      <FlatList
        data={recentTasks.slice(0, 20)}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => (
          <TaskCard
            task={item}
            showFieldOfficer
            onPress={() => navigation.navigate(Routes.TASK_DETAIL, { taskId: item.id })}
            onDelete={handleDeleteOrder}
            isDeleteActive={activeDeleteTaskId === item.id}
            onShowDelete={() => setActiveDeleteTaskId(item.id)}
            onHideDelete={() => setActiveDeleteTaskId((prev) => (prev === item.id ? null : prev))}
          />
        )}
        onScrollBeginDrag={() => setActiveDeleteTaskId(null)}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            colors={[Colors.primary]}
          />
        }
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <View>
            {/* Overview Metrics Cards */}
            <View style={styles.metricsGrid}>
              <View style={styles.metricsRow}>
                <StatCard
                  title="Field Officers"
                  count={metrics?.totalOfficers ?? officers.length}
                  icon="people"
                  color={Colors.primary}
                />
                <StatCard
                  title="Total Tasks"
                  count={metrics?.totalTasks ?? recentTasks.length}
                  icon="assignment"
                  color={Colors.info}
                />
              </View>
              <View style={styles.metricsRow}>
                <StatCard
                  title="Pending Delivery"
                  count={metrics?.pendingDistribution ?? 0}
                  icon="local-shipping"
                  color={Colors.warning}
                />
                <StatCard
                  title="Delivered"
                  count={metrics?.distributedTasks ?? 0}
                  icon="check-circle"
                  color={Colors.success}
                />
              </View>
            </View>

            {/* Field Officers Quick Carousel */}
            <View style={styles.sectionContainer}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionTitle}>Field Officers ({officers.length})</Text>
              </View>

              <FlatList
                horizontal
                showsHorizontalScrollIndicator={false}
                data={officers}
                keyExtractor={(item) => String(item.id)}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.officerCard}
                    activeOpacity={0.75}
                    onPress={() =>
                      navigation.navigate(Routes.FIELD_OFFICER_DETAIL, {
                        officerPhone: item.phoneNumber,
                      })
                    }
                  >
                    <View style={styles.officerAvatar}>
                      <MaterialIcons name="person" size={24} color={Colors.primary} />
                    </View>
                    <Text style={styles.officerName} numberOfLines={1}>
                      {item.name || 'Officer'}
                    </Text>
                    <Text style={styles.officerPhone}>{item.phoneNumber}</Text>
                    <View style={styles.officerTaskBadge}>
                      <Text style={styles.officerTaskBadgeText}>
                        Tasks: {item.totalTasks ?? 0}
                      </Text>
                    </View>
                  </TouchableOpacity>
                )}
                contentContainerStyle={styles.officersListContent}
              />
            </View>

            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>Recent Tasks Movement</Text>
            </View>
          </View>
        }
        ListEmptyComponent={
          <EmptyState
            icon="assignment"
            title="No Tasks Found"
            message="No active orders found in coordinator scope."
          />
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  listContent: {
    paddingBottom: 90,
  },
  metricsGrid: {
    paddingHorizontal: 12,
    paddingTop: 12,
  },
  metricsRow: {
    flexDirection: 'row',
  },
  sectionContainer: {
    marginVertical: 10,
  },
  sectionHeaderRow: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  officersListContent: {
    paddingHorizontal: 16,
    gap: 12,
  },
  officerCard: {
    width: 140,
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadows.sm,
  },
  officerAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: `${Colors.primary}12`,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  officerName: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  officerPhone: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 2,
    textAlign: 'center',
  },
  officerTaskBadge: {
    backgroundColor: Colors.surfaceSecondary,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    marginTop: 8,
  },
  officerTaskBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.secondary,
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.lg,
  },
});
