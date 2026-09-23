import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
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
import { taskApi } from '../../services/taskApi';
import { supervisorApi } from '../../services/supervisorApi';
import { useAuth } from '../../context/AuthContext';
import { SupervisorDashboardMetrics, TaskDto, TaskStatus } from '../../types';
import { isInstantRepairTask } from '../../utils/taskUtils';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList, Routes } from '../../constants/routes';

type FilterType = 'ALL' | 'UNASSIGNED' | 'ASSIGNED' | 'IN_PROGRESS' | 'COMPLETED' | 'DISTRIBUTED';

export const SupervisorDashboard: React.FC = () => {
  const { session } = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const [metrics, setMetrics] = useState<SupervisorDashboardMetrics | null>(null);
  const [tasks, setTasks] = useState<TaskDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterType>('ALL');

  const loadData = useCallback(async () => {
    try {
      const [metricsData, tasksData] = await Promise.all([
        supervisorApi.getDashboardMetrics().catch(() => null),
        taskApi.getTasks(),
      ]);
      if (metricsData) setMetrics(metricsData);
      setTasks(tasksData);
    } catch (e) {
      console.warn('Failed to load supervisor data', e);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

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

  const supervisorTasks = useMemo(() => {
    return tasks.filter((t) => !isInstantRepairTask(t));
  }, [tasks]);

  const filteredTasks = useMemo(() => {
    return supervisorTasks.filter((t) => {
      if (activeFilter === 'UNASSIGNED' && t.status !== TaskStatus.COLLECTED) return false;
      if (activeFilter === 'ASSIGNED' && t.status !== TaskStatus.ASSIGNED) return false;
      if (activeFilter === 'IN_PROGRESS' && t.status !== TaskStatus.IN_PROGRESS) return false;
      if (
        activeFilter === 'COMPLETED' &&
        t.status !== TaskStatus.REPAIR_COMPLETED &&
        t.status !== TaskStatus.REPLACEMENT_COMPLETED
      ) {
        return false;
      }
      if (activeFilter === 'DISTRIBUTED' && t.status !== TaskStatus.DISTRIBUTED) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesStove = t.cookstoveNumber.toLowerCase().includes(q);
        const matchesCustomer = t.customerName?.toLowerCase().includes(q) || false;
        const matchesTech = t.technicianName?.toLowerCase().includes(q) || false;
        return matchesStove || matchesCustomer || matchesTech;
      }

      return true;
    });
  }, [supervisorTasks, activeFilter, searchQuery]);

  if (isLoading) {
    return <LoadingSpinner message="Loading supervisor dashboard..." />;
  }

  const unassignedCount = supervisorTasks.filter((t) => t.status === TaskStatus.COLLECTED).length;

  return (
    <View style={styles.container}>
      <Header
        title="Supervisor Overview"
        subtitle={`Welcome, ${session?.name || 'Supervisor'}`}
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
            showTechnician
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
            {/* Operational Metrics Cards */}
            <View style={styles.metricsGrid}>
              <View style={styles.metricsRow}>
                <StatCard
                  title="Total Tasks"
                  count={metrics?.totalTasks ?? tasks.length}
                  icon="assignment"
                  color={Colors.primary}
                />
                <StatCard
                  title="Unassigned"
                  count={metrics?.unassignedTasks ?? unassignedCount}
                  icon="error-outline"
                  color={Colors.warning}
                />
              </View>

              <View style={styles.metricsRow}>
                <StatCard
                  title="In Progress"
                  count={
                    metrics?.inProgressTasks ??
                    tasks.filter((t) => t.status === TaskStatus.IN_PROGRESS).length
                  }
                  icon="build"
                  color={Colors.info}
                />
                <StatCard
                  title="Completed"
                  count={
                    metrics?.completedTasks ??
                    tasks.filter(
                      (t) =>
                        t.status === TaskStatus.REPAIR_COMPLETED ||
                        t.status === TaskStatus.REPLACEMENT_COMPLETED
                    ).length
                  }
                  icon="check-circle"
                  color={Colors.success}
                />
              </View>
            </View>

            {/* Search Input */}
            <SearchBar
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search by stove, customer, or tech..."
            />

            {/* Filter Chips Bar */}
            <View style={styles.filtersWrapper}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterListContent}>
                <FilterChip
                  label="All"
                  count={tasks.length}
                  isSelected={activeFilter === 'ALL'}
                  onPress={() => setActiveFilter('ALL')}
                />
                <FilterChip
                  label="Unassigned"
                  count={unassignedCount}
                  isSelected={activeFilter === 'UNASSIGNED'}
                  onPress={() => setActiveFilter('UNASSIGNED')}
                />
                <FilterChip
                  label="Assigned"
                  count={tasks.filter((t) => t.status === TaskStatus.ASSIGNED).length}
                  isSelected={activeFilter === 'ASSIGNED'}
                  onPress={() => setActiveFilter('ASSIGNED')}
                />
                <FilterChip
                  label="In Progress"
                  count={tasks.filter((t) => t.status === TaskStatus.IN_PROGRESS).length}
                  isSelected={activeFilter === 'IN_PROGRESS'}
                  onPress={() => setActiveFilter('IN_PROGRESS')}
                />
                <FilterChip
                  label="Completed"
                  count={
                    tasks.filter(
                      (t) =>
                        t.status === TaskStatus.REPAIR_COMPLETED ||
                        t.status === TaskStatus.REPLACEMENT_COMPLETED
                    ).length
                  }
                  isSelected={activeFilter === 'COMPLETED'}
                  onPress={() => setActiveFilter('COMPLETED')}
                />
                <FilterChip
                  label="Delivered"
                  count={tasks.filter((t) => t.status === TaskStatus.DISTRIBUTED).length}
                  isSelected={activeFilter === 'DISTRIBUTED'}
                  onPress={() => setActiveFilter('DISTRIBUTED')}
                />
              </ScrollView>
            </View>

            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionHeading}>
                Tasks ({filteredTasks.length})
              </Text>
            </View>
          </View>
        }
        ListEmptyComponent={
          <EmptyState
            icon="assignment"
            title="No Tasks Found"
            message="No service tasks match the current filter."
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
  sectionHeaderRow: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
  },
  sectionHeading: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
});
