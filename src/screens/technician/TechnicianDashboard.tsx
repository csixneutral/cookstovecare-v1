import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Modal,
  Pressable,
} from 'react-native';
import { Colors, Shadows } from '../../constants/theme';
import { Header } from '../../components/common/Header';
import { TaskCard } from '../../components/common/TaskCard';
import { SearchBar } from '../../components/common/SearchBar';
import { EmptyState } from '../../components/common/EmptyState';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { technicianApi } from '../../services/technicianApi';
import { useAuth } from '../../context/AuthContext';
import { TaskDto, TaskStatus } from '../../types';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList, Routes } from '../../constants/routes';

type FilterType = 'ALL' | 'NEW' | 'ACTIVE' | 'COMPLETED';

const FILTER_OPTIONS: {
  id: FilterType;
  label: string;
  icon: keyof typeof MaterialIcons.glyphMap;
  color: string;
}[] = [
  { id: 'ALL', label: 'All Tasks', icon: 'apps', color: Colors.primary },
  { id: 'NEW', label: 'New Assigned', icon: 'assignment', color: Colors.warning },
  { id: 'ACTIVE', label: 'In Progress', icon: 'build', color: Colors.info },
  { id: 'COMPLETED', label: 'Completed', icon: 'check-circle', color: Colors.success },
];

export const TechnicianDashboard: React.FC = () => {
  const { session } = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const [tasks, setTasks] = useState<TaskDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterType>('ALL');
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);

  const techId = session?.technicianId;

  const loadData = useCallback(async () => {
    if (!techId) {
      setIsLoading(false);
      return;
    }
    try {
      const tasksData = await technicianApi.getTasks(techId);
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

  const activeOption = useMemo(() => {
    return FILTER_OPTIONS.find((opt) => opt.id === activeFilter);
  }, [activeFilter]);

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

      <View style={styles.searchRow}>
        <SearchBar
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search by cookstove or customer..."
          style={styles.searchBarOverride}
        />
        <TouchableOpacity
          style={[styles.filterBtn, activeFilter !== 'ALL' && styles.filterBtnActive]}
          activeOpacity={0.75}
          onPress={() => setIsFilterModalOpen(true)}
        >
          <MaterialIcons
            name="tune"
            size={22}
            color={activeFilter !== 'ALL' ? Colors.textWhite : Colors.textPrimary}
          />
          {activeFilter !== 'ALL' && (
            <View style={styles.filterBadge}>
              <Text style={styles.filterBadgeText}>1</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionHeading}>Tasks ({filteredTasks.length})</Text>
        {activeFilter !== 'ALL' && (
          <View style={styles.activeFilterPill}>
            <Text style={styles.activeFilterPillText}>{activeOption?.label || activeFilter}</Text>
            <TouchableOpacity
              onPress={() => setActiveFilter('ALL')}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            >
              <MaterialIcons name="close" size={14} color={Colors.primary} />
            </TouchableOpacity>
          </View>
        )}
      </View>

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
        ListEmptyComponent={
          <EmptyState
            icon="build"
            title="No Tasks Found"
            message="No cookstove tasks currently match your filter."
          />
        }
      />

      <Modal
        visible={isFilterModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsFilterModalOpen(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setIsFilterModalOpen(false)}>
          <Pressable style={styles.modalCard} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalHeader}>
              <View style={styles.modalTitleRow}>
                <MaterialIcons name="tune" size={20} color={Colors.primary} />
                <Text style={styles.modalTitle}>Filter Tasks</Text>
              </View>
              <TouchableOpacity
                onPress={() => setIsFilterModalOpen(false)}
                style={styles.modalCloseBtn}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <MaterialIcons name="close" size={20} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalList}>
              {FILTER_OPTIONS.map((opt) => {
                const isSelected = activeFilter === opt.id;
                return (
                  <TouchableOpacity
                    key={opt.id}
                    style={[styles.filterOptionRow, isSelected && styles.filterOptionRowActive]}
                    activeOpacity={0.7}
                    onPress={() => {
                      setActiveFilter(opt.id);
                      setIsFilterModalOpen(false);
                    }}
                  >
                    <View style={styles.filterOptionLeft}>
                      <View
                        style={[
                          styles.filterOptionIconCircle,
                          { backgroundColor: `${opt.color}15` },
                        ]}
                      >
                        <MaterialIcons name={opt.icon} size={18} color={opt.color} />
                      </View>
                      <Text
                        style={[
                          styles.filterOptionLabel,
                          isSelected && styles.filterOptionLabelActive,
                        ]}
                      >
                        {opt.label}
                      </Text>
                    </View>

                    {isSelected ? (
                      <MaterialIcons name="check" size={18} color={Colors.primary} />
                    ) : (
                      <View style={{ width: 18 }} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </Pressable>
        </Pressable>
      </Modal>
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
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 10,
  },
  searchBarOverride: {
    flex: 1,
    marginHorizontal: 0,
    marginVertical: 0,
  },
  filterBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: Colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  filterBtnActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  filterBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: Colors.error,
    borderRadius: 9,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
    borderWidth: 1.5,
    borderColor: Colors.surface,
  },
  filterBadgeText: {
    color: Colors.textWhite,
    fontSize: 10,
    fontWeight: '800',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 4,
  },
  sectionHeading: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  activeFilterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: `${Colors.primary}12`,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: `${Colors.primary}30`,
  },
  activeFilterPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.primary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 16,
    paddingBottom: 36,
    maxHeight: '80%',
    ...Shadows.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  modalTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surfaceSecondary,
  },
  modalList: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  filterOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    marginVertical: 4,
    backgroundColor: Colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  filterOptionRowActive: {
    backgroundColor: `${Colors.primary}0D`,
    borderColor: Colors.primary,
  },
  filterOptionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  filterOptionIconCircle: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterOptionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  filterOptionLabelActive: {
    color: Colors.primary,
    fontWeight: '700',
  },
});
