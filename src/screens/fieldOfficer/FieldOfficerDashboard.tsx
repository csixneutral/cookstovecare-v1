import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { Colors, Shadows } from '../../constants/theme';
import { Header } from '../../components/common/Header';
import { TaskCard } from '../../components/common/TaskCard';
import { SearchBar } from '../../components/common/SearchBar';
import { FilterChip } from '../../components/common/FilterChip';
import { EmptyState } from '../../components/common/EmptyState';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { taskApi } from '../../services/taskApi';
import { useAuth } from '../../context/AuthContext';
import { TaskDto, TaskStatus } from '../../types';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList, Routes } from '../../constants/routes';

import { preloadInstantTaskOverrides } from '../../utils/taskUtils';

export type FilterType = 'ALL' | 'PENDING' | 'IN_PROGRESS' | 'READY' | 'DELIVERED';

export interface FieldOfficerDashboardProps {
  initialFilter?: FilterType;
}

export const FieldOfficerDashboard: React.FC<FieldOfficerDashboardProps> = ({
  initialFilter = 'ALL',
}) => {
  const { session } = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const [tasks, setTasks] = useState<TaskDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterType>(initialFilter);

  const loadTasks = useCallback(async () => {
    try {
      const data = await taskApi.getTasks({
        fieldOfficerId: session?.userId,
        fieldOfficerPhone: session?.phoneNumber,
      });
      const resolved = await preloadInstantTaskOverrides(data);
      setTasks(resolved);
    } catch (e) {
      console.warn('Failed to load field officer tasks', e);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [session]);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadTasks();
    });
    return unsubscribe;
  }, [navigation, loadTasks]);

  const onRefresh = () => {
    setIsRefreshing(true);
    loadTasks();
  };

  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      // 1. Status Filter
      if (activeFilter === 'PENDING') {
        if (t.status !== TaskStatus.COLLECTED) return false;
      } else if (activeFilter === 'IN_PROGRESS') {
        if (t.status !== TaskStatus.ASSIGNED && t.status !== TaskStatus.IN_PROGRESS) return false;
      } else if (activeFilter === 'READY') {
        if (
          t.status !== TaskStatus.REPAIR_COMPLETED &&
          t.status !== TaskStatus.REPLACEMENT_COMPLETED
        ) {
          return false;
        }
      } else if (activeFilter === 'DELIVERED') {
        if (t.status !== TaskStatus.DISTRIBUTED) return false;
      }

      // 2. Search Filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesStove = t.cookstoveNumber.toLowerCase().includes(q);
        const matchesCustomer = t.customerName?.toLowerCase().includes(q) || false;
        const matchesAddress = t.deliveryAddress?.toLowerCase().includes(q) || false;
        return matchesStove || matchesCustomer || matchesAddress;
      }

      return true;
    });
  }, [tasks, activeFilter, searchQuery]);

  const counts = useMemo(() => {
    return {
      all: tasks.length,
      pending: tasks.filter((t) => t.status === TaskStatus.COLLECTED).length,
      inProgress: tasks.filter(
        (t) => t.status === TaskStatus.ASSIGNED || t.status === TaskStatus.IN_PROGRESS
      ).length,
      ready: tasks.filter(
        (t) =>
          t.status === TaskStatus.REPAIR_COMPLETED ||
          t.status === TaskStatus.REPLACEMENT_COMPLETED
      ).length,
      delivered: tasks.filter((t) => t.status === TaskStatus.DISTRIBUTED).length,
    };
  }, [tasks]);

  if (isLoading) {
    return <LoadingSpinner message="Loading your orders..." />;
  }

  return (
    <View style={styles.container}>
      <Header
        title="Field Operations"
        subtitle={`Welcome, ${session?.name || 'Field Officer'}`}
        rightAction={{
          icon: 'refresh',
          onPress: onRefresh,
          color: Colors.primary,
        }}
      />

      {/* Search Input */}
      <SearchBar
        value={searchQuery}
        onChangeText={setSearchQuery}
        placeholder="Search barcode, customer, village..."
      />

      {/* Filter Chips Bar */}
      <View style={styles.filtersWrapper}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={[
            { key: 'ALL', label: 'All', count: counts.all },
            { key: 'PENDING', label: 'Pending', count: counts.pending },
            { key: 'IN_PROGRESS', label: 'In Progress', count: counts.inProgress },
            { key: 'READY', label: 'Ready to Deliver', count: counts.ready },
            { key: 'DELIVERED', label: 'Delivered', count: counts.delivered },
          ]}
          keyExtractor={(item) => item.key}
          renderItem={({ item }) => (
            <FilterChip
              label={item.label}
              count={item.count}
              isSelected={activeFilter === item.key}
              onPress={() => setActiveFilter(item.key as FilterType)}
            />
          )}
          contentContainerStyle={styles.filterListContent}
        />
      </View>

      {/* Tasks List */}
      <FlatList
        data={filteredTasks}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => (
          <TaskCard
            task={item}
            showFieldOfficer
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
        ListEmptyComponent={
          <EmptyState
            icon="assignment"
            title="No Orders Found"
            message={
              searchQuery
                ? 'No orders match your search term.'
                : 'Tap the + button below to create your first cookstove service order.'
            }
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
  filtersWrapper: {
    paddingVertical: 4,
  },
  filterListContent: {
    paddingHorizontal: 16,
  },
  listContent: {
    paddingBottom: 90,
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
