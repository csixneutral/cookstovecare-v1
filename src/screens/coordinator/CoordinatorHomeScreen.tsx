import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Modal,
  Pressable,
  Alert,
} from 'react-native';
import { Colors, Shadows } from '../../constants/theme';
import { Header } from '../../components/common/Header';
import { SearchBar } from '../../components/common/SearchBar';
import { TaskCard } from '../../components/common/TaskCard';
import { EmptyState } from '../../components/common/EmptyState';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { coordinatorApi } from '../../services/coordinatorApi';
import { taskApi } from '../../services/taskApi';
import { useAuth } from '../../context/AuthContext';
import { CoordinatorDashboardMetrics, FieldOfficerDto, TaskDto, TaskStatus } from '../../types';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList, Routes } from '../../constants/routes';
import { preloadInstantTaskOverrides } from '../../utils/taskUtils';

type StatusFilter = 'ALL' | 'IN_PROGRESS' | 'READY' | 'DELIVERED' | 'COLLECTED' | 'ASSIGNED';
type ProcessFilter = 'ALL' | 'REPAIRING' | 'REPLACEMENT';
type DateFilterType = 'ALL' | 'CUSTOM';

const STATUS_FILTERS: { id: StatusFilter; label: string; icon: keyof typeof MaterialIcons.glyphMap }[] = [
  { id: 'ALL', label: 'All Orders', icon: 'apps' },
  { id: 'IN_PROGRESS', label: 'In Progress', icon: 'build' },
  { id: 'READY', label: 'Ready to Deliver', icon: 'local-shipping' },
  { id: 'DELIVERED', label: 'Delivered', icon: 'check-circle' },
  { id: 'COLLECTED', label: 'Collected', icon: 'inventory' },
  { id: 'ASSIGNED', label: 'Assigned', icon: 'person' },
];

const PROCESS_FILTERS: { id: ProcessFilter; label: string }[] = [
  { id: 'ALL', label: 'All Processes' },
  { id: 'REPAIRING', label: 'Repairs Only' },
  { id: 'REPLACEMENT', label: 'Replacements Only' },
];

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

const formatDisplayDate = (iso: string | null): string => {
  if (!iso) return 'Select Date';
  try {
    const [y, m, d] = iso.split('-').map(Number);
    const dateObj = new Date(y, m - 1, d);
    const now = new Date();
    const isToday =
      dateObj.getFullYear() === now.getFullYear() &&
      dateObj.getMonth() === now.getMonth() &&
      dateObj.getDate() === now.getDate();

    const formatted = dateObj.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
    return isToday ? `Today (${formatted})` : formatted;
  } catch {
    return iso;
  }
};

const getTaskDateObj = (t: TaskDto): Date | null => {
  if (t.collectionDate) {
    const num = Number(t.collectionDate);
    if (!isNaN(num) && num > 0) {
      const ms = num < 10000000000 ? num * 1000 : num;
      const d = new Date(ms);
      if (!isNaN(d.getTime())) return d;
    }
  }
  if (t.createdAt) {
    const d = new Date(t.createdAt);
    if (!isNaN(d.getTime())) return d;
  }
  return null;
};

const getTaskDateIso = (t: TaskDto): string | null => {
  const d = getTaskDateObj(t);
  if (!d) return null;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export const CoordinatorHomeScreen: React.FC = () => {
  const { session } = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const [metrics, setMetrics] = useState<CoordinatorDashboardMetrics | null>(null);
  const [officers, setOfficers] = useState<FieldOfficerDto[]>([]);
  const [tasks, setTasks] = useState<TaskDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeDeleteTaskId, setActiveDeleteTaskId] = useState<number | null>(null);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [processFilter, setProcessFilter] = useState<ProcessFilter>('ALL');
  const [customDate, setCustomDate] = useState<string | null>(null);

  // Filter Modal state
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [tempStatusFilter, setTempStatusFilter] = useState<StatusFilter>('ALL');
  const [tempProcessFilter, setTempProcessFilter] = useState<ProcessFilter>('ALL');
  const [tempCustomDate, setTempCustomDate] = useState<string | null>(null);

  // Dropdown expansion states inside Modal
  const [isStatusDropdownOpen, setIsStatusDropdownOpen] = useState(false);
  const [isProcessDropdownOpen, setIsProcessDropdownOpen] = useState(false);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  // Calendar month state
  const [calendarMonth, setCalendarMonth] = useState(() => new Date());

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

      // Scope tasks to ONLY this coordinator's group:
      // 1. Created directly by this coordinator
      // 2. Or created by / assigned to an officer in this coordinator's group
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

      const resolvedTasks = await preloadInstantTaskOverrides(scopedTasks);
      setTasks(resolvedTasks);
    } catch (e) {
      console.warn('Failed to load coordinator home data', e);
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
              setTasks((prev) => prev.filter((t) => t.id !== taskToDelete.id));
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

  // Open modal with current active filters
  const openFilterModal = () => {
    setTempStatusFilter(statusFilter);
    setTempProcessFilter(processFilter);
    setTempCustomDate(customDate);
    setIsStatusDropdownOpen(false);
    setIsProcessDropdownOpen(false);
    setIsCalendarOpen(false);
    if (customDate) {
      const [y, m] = customDate.split('-').map(Number);
      setCalendarMonth(new Date(y, m - 1, 1));
    } else {
      setCalendarMonth(new Date());
    }
    setIsFilterModalOpen(true);
  };

  // Map of YYYY-MM-DD -> order count
  const orderDates = useMemo(() => {
    const map: { [iso: string]: number } = {};
    tasks.forEach((t) => {
      const iso = getTaskDateIso(t);
      if (iso) {
        map[iso] = (map[iso] || 0) + 1;
      }
    });
    return map;
  }, [tasks]);

  // Counts by status
  const statusCounts = useMemo(() => {
    return {
      ALL: tasks.length,
      IN_PROGRESS: tasks.filter((t) => t.status === TaskStatus.IN_PROGRESS).length,
      READY: tasks.filter(
        (t) =>
          t.status === TaskStatus.REPAIR_COMPLETED ||
          t.status === TaskStatus.REPLACEMENT_COMPLETED
      ).length,
      DELIVERED: tasks.filter((t) => t.status === TaskStatus.DISTRIBUTED).length,
      COLLECTED: tasks.filter((t) => t.status === TaskStatus.COLLECTED).length,
      ASSIGNED: tasks.filter((t) => t.status === TaskStatus.ASSIGNED).length,
    };
  }, [tasks]);

  const repairCount = useMemo(() => {
    return tasks.filter((t) =>
      String(t.typeOfProcess || '').toUpperCase().includes('REPAIR')
    ).length;
  }, [tasks]);

  const replaceCount = useMemo(() => {
    return tasks.filter((t) =>
      String(t.typeOfProcess || '').toUpperCase().includes('REPLACE')
    ).length;
  }, [tasks]);

  // Calendar grid calculation
  const calendarGrid = useMemo(() => {
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();
    const firstDayIndex = new Date(year, month, 1).getDay(); // 0 = Sunday
    const totalDays = new Date(year, month + 1, 0).getDate();

    const cells: (Date | null)[] = [];
    for (let i = 0; i < firstDayIndex; i++) {
      cells.push(null);
    }
    for (let d = 1; d <= totalDays; d++) {
      cells.push(new Date(year, month, d));
    }
    return cells;
  }, [calendarMonth]);

  const calendarMonthLabel = useMemo(() => {
    return calendarMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  }, [calendarMonth]);

  const todayIso = useMemo(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  }, []);

  // Active filter count
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (statusFilter !== 'ALL') count++;
    if (processFilter !== 'ALL') count++;
    if (customDate) count++;
    return count;
  }, [statusFilter, processFilter, customDate]);

  const isFilterActive = activeFilterCount > 0;

  // Filter and search computation
  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      // Status filtering
      if (statusFilter === 'COLLECTED' && t.status !== TaskStatus.COLLECTED) return false;
      if (statusFilter === 'ASSIGNED' && t.status !== TaskStatus.ASSIGNED) return false;
      if (statusFilter === 'IN_PROGRESS' && t.status !== TaskStatus.IN_PROGRESS) return false;
      if (
        statusFilter === 'READY' &&
        t.status !== TaskStatus.REPAIR_COMPLETED &&
        t.status !== TaskStatus.REPLACEMENT_COMPLETED
      ) {
        return false;
      }
      if (statusFilter === 'DELIVERED' && t.status !== TaskStatus.DISTRIBUTED) return false;

      // Process type filtering
      if (
        processFilter === 'REPAIRING' &&
        !String(t.typeOfProcess || '').toUpperCase().includes('REPAIR')
      ) {
        return false;
      }
      if (
        processFilter === 'REPLACEMENT' &&
        !String(t.typeOfProcess || '').toUpperCase().includes('REPLACE')
      ) {
        return false;
      }

      // Date filtering
      if (customDate) {
        const taskIso = getTaskDateIso(t);
        if (taskIso !== customDate) return false;
      }

      // Search query filtering
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesStove = t.cookstoveNumber.toLowerCase().includes(q);
        const matchesCustomer = t.customerName?.toLowerCase().includes(q) || false;
        const matchesPhone = t.customerPhone?.toLowerCase().includes(q) || false;
        const matchesOfficer =
          t.fieldOfficerName?.toLowerCase().includes(q) ||
          t.fieldOfficerPhone?.toLowerCase().includes(q) ||
          false;
        const matchesTech = t.technicianName?.toLowerCase().includes(q) || false;
        const matchesAddress = t.deliveryAddress?.toLowerCase().includes(q) || false;
        return matchesStove || matchesCustomer || matchesPhone || matchesOfficer || matchesTech || matchesAddress;
      }

      return true;
    });
  }, [tasks, statusFilter, processFilter, customDate, searchQuery]);

  const isFiltered = searchQuery.trim() !== '' || isFilterActive;

  const resetFilters = () => {
    setSearchQuery('');
    setStatusFilter('ALL');
    setProcessFilter('ALL');
    setCustomDate(null);
  };

  if (isLoading) {
    return <LoadingSpinner message="Loading coordinator overview..." />;
  }

  // Active filter labels
  const activeStatusLabel = STATUS_FILTERS.find((f) => f.id === statusFilter)?.label;
  const activeProcessLabel = PROCESS_FILTERS.find((p) => p.id === processFilter)?.label;

  // Selected dropdown labels & counts inside modal
  const selectedStatusObj = STATUS_FILTERS.find((f) => f.id === tempStatusFilter);
  const selectedStatusCount = statusCounts[tempStatusFilter] ?? 0;
  const selectedProcessObj = PROCESS_FILTERS.find((p) => p.id === tempProcessFilter);
  const selectedProcessCount =
    tempProcessFilter === 'ALL'
      ? tasks.length
      : tempProcessFilter === 'REPAIRING'
      ? repairCount
      : replaceCount;

  return (
    <View style={styles.container}>
      <Header
        title="Coordinator Dashboard"
        subtitle={`Welcome, ${session?.name || 'Coordinator'}`}
        rightAction={{
          icon: 'refresh',
          onPress: onRefresh,
          color: Colors.primary,
        }}
      />

      {/* Top Search Bar + Filter Button in a Single Row */}
      <View style={styles.searchRow}>
        <SearchBar
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search by stove #, customer, phone..."
          style={styles.searchBarOverride}
        />
        <TouchableOpacity
          style={[styles.filterBtn, isFilterActive && styles.filterBtnActive]}
          activeOpacity={0.75}
          onPress={openFilterModal}
        >
          <MaterialIcons
            name="tune"
            size={22}
            color={isFilterActive ? Colors.textWhite : Colors.textPrimary}
          />
          {activeFilterCount > 0 && (
            <View style={styles.filterBadge}>
              <Text style={styles.filterBadgeText}>{activeFilterCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Orders List with Overview in Header */}
      <FlatList
        data={filteredTasks}
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
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            colors={[Colors.primary]}
          />
        }
        ListHeaderComponent={
          <View>
            {/* Section Header with Active Filter Tags */}
            <View style={styles.sectionHeaderRow}>
              <View style={styles.titleWithCount}>
                <Text style={styles.sectionTitle}>Orders</Text>
                <View style={styles.countBadge}>
                  <Text style={styles.countBadgeText}>{filteredTasks.length}</Text>
                </View>
              </View>

              {isFiltered && (
                <TouchableOpacity onPress={resetFilters} style={styles.clearFiltersBtn}>
                  <MaterialIcons name="filter-alt-off" size={14} color={Colors.primary} />
                  <Text style={styles.clearFiltersText}>Reset Filters</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Quick Active Filter Pill Tags */}
            {isFilterActive && (
              <View style={styles.activeFilterTagsRow}>
                {statusFilter !== 'ALL' && (
                  <View style={styles.activeTag}>
                    <Text style={styles.activeTagText}>{activeStatusLabel}</Text>
                    <TouchableOpacity
                      onPress={() => setStatusFilter('ALL')}
                      hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                    >
                      <MaterialIcons name="close" size={14} color={Colors.primary} />
                    </TouchableOpacity>
                  </View>
                )}
                {processFilter !== 'ALL' && (
                  <View style={styles.activeTag}>
                    <Text style={styles.activeTagText}>{activeProcessLabel}</Text>
                    <TouchableOpacity
                      onPress={() => setProcessFilter('ALL')}
                      hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                    >
                      <MaterialIcons name="close" size={14} color={Colors.primary} />
                    </TouchableOpacity>
                  </View>
                )}
                {customDate && (
                  <View style={styles.activeTag}>
                    <MaterialIcons name="event" size={13} color={Colors.primary} style={{ marginRight: 4 }} />
                    <Text style={styles.activeTagText}>
                      {formatDisplayDate(customDate)}
                    </Text>
                    <TouchableOpacity
                      onPress={() => setCustomDate(null)}
                      hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                    >
                      <MaterialIcons name="close" size={14} color={Colors.primary} />
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            )}
          </View>
        }
        ListEmptyComponent={
          <EmptyState
            icon="assignment"
            title="No Orders Found"
            message={
              isFiltered
                ? 'No orders match your search or filter criteria. Try resetting filters.'
                : 'No orders available in your coordinator scope.'
            }
          />
        }
      />

      {/* Filter Options Modal with Dropdowns */}
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
                <Text style={styles.modalTitle}>Filter Orders</Text>
              </View>
              <TouchableOpacity onPress={() => setIsFilterModalOpen(false)} style={styles.modalCloseBtn}>
                <MaterialIcons name="close" size={20} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} nestedScrollEnabled showsVerticalScrollIndicator={false}>
              {/* 1. Order Status Select Dropdown */}
              <Text style={styles.dropdownLabel}>Order Status</Text>
              <TouchableOpacity
                style={[styles.dropdownSelector, isStatusDropdownOpen && styles.dropdownSelectorOpen]}
                activeOpacity={0.8}
                onPress={() => {
                  setIsStatusDropdownOpen((prev) => !prev);
                  setIsProcessDropdownOpen(false);
                  setIsCalendarOpen(false);
                }}
              >
                <View style={styles.dropdownLeft}>
                  <MaterialIcons
                    name={selectedStatusObj?.icon || 'apps'}
                    size={18}
                    color={Colors.primary}
                    style={{ marginRight: 8 }}
                  />
                  <Text style={styles.dropdownSelectedText}>
                    {selectedStatusObj?.label} ({selectedStatusCount})
                  </Text>
                </View>
                <MaterialIcons
                  name={isStatusDropdownOpen ? 'keyboard-arrow-up' : 'keyboard-arrow-down'}
                  size={22}
                  color={Colors.textSecondary}
                />
              </TouchableOpacity>

              {isStatusDropdownOpen && (
                <View style={styles.dropdownMenu}>
                  {STATUS_FILTERS.map((f) => {
                    const count = statusCounts[f.id] ?? 0;
                    const isSelected = tempStatusFilter === f.id;
                    return (
                      <TouchableOpacity
                        key={f.id}
                        style={[styles.dropdownMenuItem, isSelected && styles.dropdownMenuItemActive]}
                        activeOpacity={0.7}
                        onPress={() => {
                          setTempStatusFilter(f.id);
                          setIsStatusDropdownOpen(false);
                        }}
                      >
                        <View style={styles.dropdownItemLeft}>
                          <MaterialIcons
                            name={f.icon}
                            size={18}
                            color={isSelected ? Colors.primary : Colors.textSecondary}
                            style={{ marginRight: 8 }}
                          />
                          <Text
                            style={[
                              styles.dropdownItemText,
                              isSelected && styles.dropdownItemTextActive,
                            ]}
                          >
                            {f.label} ({count})
                          </Text>
                        </View>
                        {isSelected && (
                           <MaterialIcons name="check" size={18} color={Colors.primary} />
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}

              {/* 2. Process Type Select Dropdown */}
              <Text style={[styles.dropdownLabel, { marginTop: 16 }]}>Process Type</Text>
              <TouchableOpacity
                style={[styles.dropdownSelector, isProcessDropdownOpen && styles.dropdownSelectorOpen]}
                activeOpacity={0.8}
                onPress={() => {
                  setIsProcessDropdownOpen((prev) => !prev);
                  setIsStatusDropdownOpen(false);
                  setIsCalendarOpen(false);
                }}
              >
                <View style={styles.dropdownLeft}>
                  <MaterialIcons
                    name={
                      tempProcessFilter === 'REPAIRING'
                        ? 'build'
                        : tempProcessFilter === 'REPLACEMENT'
                        ? 'autorenew'
                        : 'dashboard'
                    }
                    size={18}
                    color={Colors.primary}
                    style={{ marginRight: 8 }}
                  />
                  <Text style={styles.dropdownSelectedText}>
                    {selectedProcessObj?.label} ({selectedProcessCount})
                  </Text>
                </View>
                <MaterialIcons
                  name={isProcessDropdownOpen ? 'keyboard-arrow-up' : 'keyboard-arrow-down'}
                  size={22}
                  color={Colors.textSecondary}
                />
              </TouchableOpacity>

              {isProcessDropdownOpen && (
                <View style={styles.dropdownMenu}>
                  {PROCESS_FILTERS.map((p) => {
                    const count =
                      p.id === 'ALL'
                        ? tasks.length
                        : p.id === 'REPAIRING'
                        ? repairCount
                        : replaceCount;
                    const isSelected = tempProcessFilter === p.id;
                    const icon =
                      p.id === 'REPAIRING'
                        ? 'build'
                        : p.id === 'REPLACEMENT'
                        ? 'autorenew'
                        : 'dashboard';
                    return (
                      <TouchableOpacity
                        key={p.id}
                        style={[styles.dropdownMenuItem, isSelected && styles.dropdownMenuItemActive]}
                        activeOpacity={0.7}
                        onPress={() => {
                          setTempProcessFilter(p.id);
                          setIsProcessDropdownOpen(false);
                        }}
                      >
                        <View style={styles.dropdownItemLeft}>
                          <MaterialIcons
                            name={icon}
                            size={18}
                            color={isSelected ? Colors.primary : Colors.textSecondary}
                            style={{ marginRight: 8 }}
                          />
                          <Text
                            style={[
                              styles.dropdownItemText,
                              isSelected && styles.dropdownItemTextActive,
                            ]}
                          >
                            {p.label} ({count})
                          </Text>
                        </View>
                        {isSelected && (
                          <MaterialIcons name="check" size={18} color={Colors.primary} />
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}

              {/* 3. Order Date Select - Clicking opens Calendar directly */}
              <Text style={[styles.dropdownLabel, { marginTop: 16 }]}>Order Date</Text>
              <TouchableOpacity
                style={[
                  styles.dropdownSelector,
                  isCalendarOpen && styles.dropdownSelectorOpen,
                  !!tempCustomDate && styles.dropdownSelectorSelected,
                ]}
                activeOpacity={0.8}
                onPress={() => {
                  setIsCalendarOpen((prev) => !prev);
                  setIsStatusDropdownOpen(false);
                  setIsProcessDropdownOpen(false);
                }}
              >
                <View style={styles.dropdownLeft}>
                  <MaterialIcons
                    name="event"
                    size={18}
                    color={tempCustomDate ? Colors.primary : Colors.textSecondary}
                    style={{ marginRight: 8 }}
                  />
                  <Text
                    style={[
                      styles.dropdownSelectedText,
                      !tempCustomDate && { color: Colors.textMuted },
                    ]}
                  >
                    {tempCustomDate ? formatDisplayDate(tempCustomDate) : 'Select Date (All Dates)'}
                  </Text>
                </View>

                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  {tempCustomDate && (
                    <TouchableOpacity
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      onPress={(e) => {
                        e.stopPropagation();
                        setTempCustomDate(null);
                      }}
                    >
                      <MaterialIcons name="cancel" size={18} color={Colors.textMuted} />
                    </TouchableOpacity>
                  )}
                  <MaterialIcons
                    name={isCalendarOpen ? 'keyboard-arrow-up' : 'calendar-month'}
                    size={20}
                    color={isCalendarOpen ? Colors.primary : Colors.textSecondary}
                  />
                </View>
              </TouchableOpacity>

              {/* Inline Interactive Calendar displayed when Date option is clicked */}
              {isCalendarOpen && (
                <View style={styles.calendarContainer}>
                  {/* Month Navigation */}
                  <View style={styles.calendarHeader}>
                    <TouchableOpacity
                      style={styles.calendarNavBtn}
                      onPress={() =>
                        setCalendarMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))
                      }
                    >
                      <MaterialIcons name="chevron-left" size={22} color={Colors.textPrimary} />
                    </TouchableOpacity>

                    <Text style={styles.calendarMonthTitle}>{calendarMonthLabel}</Text>

                    <TouchableOpacity
                      style={styles.calendarNavBtn}
                      onPress={() =>
                        setCalendarMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))
                      }
                    >
                      <MaterialIcons name="chevron-right" size={22} color={Colors.textPrimary} />
                    </TouchableOpacity>
                  </View>

                  {/* Quick Shortcuts: Today & Clear */}
                  <View style={styles.calendarShortcutsRow}>
                    <TouchableOpacity
                      style={[
                        styles.calendarShortcutChip,
                        tempCustomDate === todayIso && styles.calendarShortcutChipActive,
                      ]}
                      onPress={() => {
                        setTempCustomDate(todayIso);
                        const now = new Date();
                        setCalendarMonth(new Date(now.getFullYear(), now.getMonth(), 1));
                      }}
                    >
                      <MaterialIcons
                        name="today"
                        size={14}
                        color={tempCustomDate === todayIso ? Colors.primary : Colors.textSecondary}
                        style={{ marginRight: 4 }}
                      />
                      <Text
                        style={[
                          styles.calendarShortcutText,
                          tempCustomDate === todayIso && styles.calendarShortcutTextActive,
                        ]}
                      >
                        Today
                      </Text>
                    </TouchableOpacity>

                    {tempCustomDate && (
                      <TouchableOpacity
                        style={styles.calendarShortcutChip}
                        onPress={() => {
                          setTempCustomDate(null);
                        }}
                      >
                        <MaterialIcons name="close" size={14} color={Colors.error} style={{ marginRight: 4 }} />
                        <Text style={[styles.calendarShortcutText, { color: Colors.error }]}>Clear Date</Text>
                      </TouchableOpacity>
                    )}
                  </View>

                  {/* Weekday Labels */}
                  <View style={styles.calendarWeekRow}>
                    {WEEKDAYS.map((w) => (
                      <Text key={w} style={styles.calendarWeekText}>
                        {w}
                      </Text>
                    ))}
                  </View>

                  {/* Day Cells Grid */}
                  <View style={styles.calendarGrid}>
                    {calendarGrid.map((dateObj, idx) => {
                      if (!dateObj) {
                        return <View key={`empty-${idx}`} style={styles.calendarDayCell} />;
                      }

                      const iso = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(dateObj.getDate()).padStart(2, '0')}`;
                      const isSelected = tempCustomDate === iso;
                      const isToday = iso === todayIso;
                      const hasOrders = (orderDates[iso] || 0) > 0;

                      return (
                        <TouchableOpacity
                          key={iso}
                          style={styles.calendarDayCell}
                          activeOpacity={0.7}
                          onPress={() => {
                            setTempCustomDate(iso);
                          }}
                        >
                          <View
                            style={[
                              styles.calendarDayInner,
                              isToday && !isSelected && styles.calendarDayInnerToday,
                              isSelected && styles.calendarDayInnerSelected,
                            ]}
                          >
                            <Text
                              style={[
                                styles.calendarDayText,
                                isToday && !isSelected && styles.calendarDayTextToday,
                                isSelected && styles.calendarDayTextSelected,
                              ]}
                            >
                              {dateObj.getDate()}
                            </Text>
                            {hasOrders && (
                              <View
                                style={[
                                  styles.calendarOrderDot,
                                  isSelected && styles.calendarOrderDotSelected,
                                ]}
                              />
                            )}
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              )}
            </ScrollView>

            {/* Modal Actions */}
            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.modalResetBtn}
                onPress={() => {
                  setTempStatusFilter('ALL');
                  setTempProcessFilter('ALL');
                  setTempCustomDate(null);
                  setIsStatusDropdownOpen(false);
                  setIsProcessDropdownOpen(false);
                  setIsCalendarOpen(false);
                }}
              >
                <Text style={styles.modalResetText}>Reset</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalApplyBtn}
                onPress={() => {
                  setStatusFilter(tempStatusFilter);
                  setProcessFilter(tempProcessFilter);
                  setCustomDate(tempCustomDate);
                  setIsStatusDropdownOpen(false);
                  setIsProcessDropdownOpen(false);
                  setIsCalendarOpen(false);
                  setIsFilterModalOpen(false);
                }}
              >
                <Text style={styles.modalApplyText}>Apply Filters</Text>
              </TouchableOpacity>
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
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 8,
    backgroundColor: Colors.surface,
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  searchBarOverride: {
    marginHorizontal: 0,
    marginVertical: 0,
    flex: 1,
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
  listContent: {
    paddingBottom: 90,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 8,
  },
  titleWithCount: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  countBadge: {
    backgroundColor: `${Colors.primary}18`,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  countBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.primary,
  },
  clearFiltersBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: `${Colors.primary}10`,
  },
  clearFiltersText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.primary,
  },
  activeFilterTagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  activeTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${Colors.primary}14`,
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 4,
    gap: 6,
  },
  activeTagText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.primary,
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

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 36,
    maxHeight: '85%',
    ...Shadows.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 14,
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
    padding: 4,
  },
  modalBody: {
    paddingVertical: 14,
  },
  dropdownLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 8,
  },
  dropdownSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  dropdownSelectorOpen: {
    borderColor: Colors.primary,
    borderBottomLeftRadius: 4,
    borderBottomRightRadius: 4,
    backgroundColor: `${Colors.primary}06`,
  },
  dropdownSelectorSelected: {
    borderColor: Colors.primary,
    backgroundColor: `${Colors.primary}08`,
  },
  dropdownLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  dropdownSelectedText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  dropdownMenu: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderTopWidth: 0,
    borderColor: Colors.border,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    overflow: 'hidden',
    marginTop: -1,
    marginBottom: 6,
    ...Shadows.sm,
  },
  dropdownMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  dropdownMenuItemActive: {
    backgroundColor: `${Colors.primary}0F`,
  },
  dropdownItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dropdownItemText: {
    fontSize: 14,
    color: Colors.textPrimary,
    fontWeight: '500',
  },
  dropdownItemTextActive: {
    color: Colors.primary,
    fontWeight: '700',
  },

  // Calendar Styles
  calendarContainer: {
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: 12,
    padding: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  calendarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  calendarMonthTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  calendarNavBtn: {
    padding: 4,
    borderRadius: 8,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  calendarShortcutsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 8,
    marginBottom: 8,
  },
  calendarShortcutChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  calendarShortcutChipActive: {
    backgroundColor: `${Colors.primary}12`,
    borderColor: Colors.primary,
  },
  calendarShortcutText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  calendarShortcutTextActive: {
    color: Colors.primary,
  },
  calendarWeekRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 4,
  },
  calendarWeekText: {
    width: 32,
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textMuted,
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  calendarDayCell: {
    width: '14.28%',
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
  calendarDayInner: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  calendarDayInnerToday: {
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  calendarDayInnerSelected: {
    backgroundColor: Colors.primary,
  },
  calendarDayText: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.textPrimary,
  },
  calendarDayTextToday: {
    color: Colors.primary,
    fontWeight: '700',
  },
  calendarDayTextSelected: {
    color: Colors.textWhite,
    fontWeight: '700',
  },
  calendarOrderDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.primary,
    position: 'absolute',
    bottom: 1,
  },
  calendarOrderDotSelected: {
    backgroundColor: Colors.textWhite,
  },

  // Footer Actions
  modalFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  modalResetBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surfaceSecondary,
  },
  modalResetText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  modalApplyBtn: {
    flex: 2,
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
  },
  modalApplyText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textWhite,
  },
});
