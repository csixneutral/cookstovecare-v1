import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  RefreshControl,
  ScrollView,
} from 'react-native';
import { Colors } from '../../constants/theme';
import { Header } from '../../components/common/Header';
import { StatCard } from '../../components/common/StatCard';
import { TaskCard } from '../../components/common/TaskCard';
import { SearchBar } from '../../components/common/SearchBar';
import { FilterChip } from '../../components/common/FilterChip';
import { EmptyState } from '../../components/common/EmptyState';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { technicianApi } from '../../services/technicianApi';
import { useAuth } from '../../context/AuthContext';
import { TaskDto, TaskStatus, TechnicianDashboardMetrics } from '../../types';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList, Routes } from '../../constants/routes';

type FilterType = 'ALL' | 'NEW' | 'ACTIVE' | 'COMPLETED';

export const TechnicianDashboard: React.FC = () => {
  const { session } = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const [metrics, setMetrics] = useState<TechnicianDashboardMetrics | null>(null);
  const [tasks, setTasks] = useState<TaskDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterType>('ALL');

  const techId = session?.technicianId;

  const loadData = useCallback(async () => {
    if (!techId) {
      setIsLoading(false);
      return;
    }
    try {
      const [metricsData, tasksData] = await Promise.all([
        technicianApi.getDashboardMetrics(techId).catch(() => null),
        technicianApi.getTasks(techId),
      ]);
      if (metricsData) setMetrics(metricsData);
      setTasks(tasksData);
    } catch (e) {
      console.warn('Failed to load technician tasks', e);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [techId]);

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

  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      if (activeFilter === 'NEW' && t.status !== TaskStatus.ASSIGNED) return false;
      if (activeFilter === 'ACTIVE' && t.status !== TaskStatus.IN_PROGRESS) return false;
      if (
        activeFilter === 'COMPLETED' &&
        t.status !== TaskStatus.REPAIR_COMPLETED &&
        t.status !== TaskStatus.REPLACEMENT_COMPLETED &&
        t.status !== TaskStatus.DISTRIBUTED
      ) {
        return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesStove = t.cookstoveNumber.toLowerCase().includes(q);
        const matchesCustomer = t.customerName?.toLowerCase().includes(q) || false;
        return matchesStove || matchesCustomer;
      }

      return true;
    });
  }, [tasks, activeFilter, searchQuery]);

  const newCount = tasks.filter((t) => t.status === TaskStatus.ASSIGNED).length;
  const activeCount = tasks.filter((t) => t.status === TaskStatus.IN_PROGRESS).length;
  const completedCount = tasks.filter(
    (t) =>
      t.status === TaskStatus.REPAIR_COMPLETED ||
      t.status === TaskStatus.REPLACEMENT_COMPLETED ||
      t.status === TaskStatus.DISTRIBUTED
  ).length;

  if (isLoading) {
    return <LoadingSpinner message="Loading assigned tasks..." />;
  }

  return (
    <View style={styles.container}>
      <Header
        title="Technician Workspace"
        subtitle={`Welcome, ${session?.name || 'Technician'}`}
        rightAction={{
          icon: 'refresh',
          onPress: onRefresh,
          color: Colors.primary,
        }}
      />

      <FlatList
        data={filteredTasks}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => (
          <TaskCard
            task={item}
            onPress={() => navigation.navigate(Routes.TASK_DETAIL, { taskId: item.id })}
          />
        )}
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
            {/* Technician Stats */}
            <View style={styles.metricsGrid}>
              <View style={styles.metricsRow}>
                <StatCard
                  title="New Assigned"
                  count={metrics?.newTasksCount ?? newCount}
                  icon="assignment"
                  color={Colors.warning}
                />
                <StatCard
                  title="In Progress"
                  count={metrics?.activeTasksCount ?? activeCount}
                  icon="build"
                  color={Colors.info}
                />
              </View>
              <View style={styles.metricsRow}>
                <StatCard
                  title="Completed"
                  count={metrics?.completedTasksCount ?? completedCount}
                  icon="check-circle"
                  color={Colors.success}
                />
                <StatCard
                  title="Total Assigned"
                  count={metrics?.totalTasksCount ?? tasks.length}
                  icon="dashboard"
                  color={Colors.primary}
                />
              </View>
            </View>

            {/* Search Input */}
            <SearchBar
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search by cookstove or customer..."
            />

            {/* Filter Chips Bar */}
            <View style={styles.filtersWrapper}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterListContent}>
                <FilterChip
                  label="All Tasks"
                  count={tasks.length}
                  isSelected={activeFilter === 'ALL'}
                  onPress={() => setActiveFilter('ALL')}
                />
                <FilterChip
                  label="New Assigned"
                  count={newCount}
                  isSelected={activeFilter === 'NEW'}
                  onPress={() => setActiveFilter('NEW')}
                />
                <FilterChip
                  label="In Progress"
                  count={activeCount}
                  isSelected={activeFilter === 'ACTIVE'}
                  onPress={() => setActiveFilter('ACTIVE')}
                />
                <FilterChip
                  label="Completed"
                  count={completedCount}
                  isSelected={activeFilter === 'COMPLETED'}
                  onPress={() => setActiveFilter('COMPLETED')}
                />
              </ScrollView>
            </View>
          </View>
        }
        ListEmptyComponent={
          <EmptyState
            icon="build"
            title="No Tasks Found"
            message="No cookstove tasks currently match your filter."
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
    paddingBottom: 40,
  },
  metricsGrid: {
    paddingHorizontal: 12,
    paddingTop: 12,
  },
  metricsRow: {
    flexDirection: 'row',
  },
  filtersWrapper: {
    paddingVertical: 4,
  },
  filterListContent: {
    paddingHorizontal: 16,
  },
});
