import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Shadows } from '../../constants/theme';

interface DateScrollPickerProps {
  selectedDate: string | null; // ISO string 'YYYY-MM-DD' or null for All Dates
  onSelectDate: (dateIso: string | null) => void;
  orderDates?: { [isoDate: string]: number }; // ISO date string -> task count
}

export const DateScrollPicker: React.FC<DateScrollPickerProps> = ({
  selectedDate,
  onSelectDate,
  orderDates = {},
}) => {
  const today = useMemo(() => new Date(), []);
  const todayIso = useMemo(() => {
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  }, [today]);

  // Generate 5 days: Past 4 days + Today
  const fiveDays = useMemo(() => {
    const list: Date[] = [];
    for (let i = -4; i <= 0; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      list.push(d);
    }
    return list;
  }, [today]);

  const fiveDaysIso = useMemo(() => {
    return fiveDays.map((d) => {
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    });
  }, [fiveDays]);

  // Check if selected date is outside the 5 fixed slots
  const isCustomDateSelected = useMemo(() => {
    if (!selectedDate) return false;
    return !fiveDaysIso.includes(selectedDate);
  }, [selectedDate, fiveDaysIso]);

  // Calendar Modal state
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [calendarViewDate, setCalendarViewDate] = useState(() => {
    if (selectedDate) {
      const [y, m] = selectedDate.split('-').map(Number);
      return new Date(y, m - 1, 1);
    }
    return new Date(today.getFullYear(), today.getMonth(), 1);
  });

  // Display Month & Year for the header
  const monthYearLabel = useMemo(() => {
    let dateObj = today;
    if (selectedDate) {
      const [y, m, d] = selectedDate.split('-').map(Number);
      dateObj = new Date(y, m - 1, d);
    }
    return new Intl.DateTimeFormat('en-US', {
      month: 'long',
      year: 'numeric',
    }).format(dateObj);
  }, [selectedDate, today]);

  // Open modal
  const openCalendarModal = () => {
    if (selectedDate) {
      const [y, m] = selectedDate.split('-').map(Number);
      setCalendarViewDate(new Date(y, m - 1, 1));
    } else {
      setCalendarViewDate(new Date(today.getFullYear(), today.getMonth(), 1));
    }
    setIsModalVisible(true);
  };

  const goToPrevMonth = () => {
    setCalendarViewDate((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    setCalendarViewDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  // Calendar Grid for Modal
  const calendarGrid = useMemo(() => {
    const year = calendarViewDate.getFullYear();
    const month = calendarViewDate.getMonth();
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
  }, [calendarViewDate]);

  const handleSelectSlotDate = (iso: string) => {
    if (selectedDate === iso) {
      // Toggle off to All Dates
      onSelectDate(null);
    } else {
      onSelectDate(iso);
    }
  };

  const handleSelectModalDate = (d: Date) => {
    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    onSelectDate(iso);
    setIsModalVisible(false);
  };

  const handleSelectAllDates = () => {
    onSelectDate(null);
    setIsModalVisible(false);
  };

  return (
    <View style={styles.container}>
      {/* Header: Dot + Month Year + Clear/All Orders Action */}
      <View style={styles.headerRow}>
        <View style={styles.headerTitleContainer}>
          <View style={styles.headerDot} />
          <Text style={styles.headerTitle}>{monthYearLabel}</Text>
        </View>

        {selectedDate !== null ? (
          <TouchableOpacity
            style={styles.allDatesBtn}
            onPress={() => onSelectDate(null)}
            activeOpacity={0.7}
          >
            <Ionicons name="apps-outline" size={13} color={Colors.primary} />
            <Text style={styles.allDatesBtnText}>All Orders</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={styles.allDatesBtnActive}
            onPress={() => onSelectDate(null)}
            activeOpacity={0.7}
          >
            <Ionicons name="checkmark-circle" size={13} color={Colors.textWhite} />
            <Text style={styles.allDatesBtnTextActive}>All Dates</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* 6-Slot Calendar Row (Slot 1: CAL + Slots 2-6: 5 Days) */}
      <View style={styles.slotsRow}>
        {/* Slot 1: CAL / PICK button */}
        <TouchableOpacity
          onPress={openCalendarModal}
          activeOpacity={0.8}
          style={[
            styles.slotCard,
            isCustomDateSelected && styles.slotCardSelected,
          ]}
        >
          <Text
            style={[
              styles.slotWeekdayText,
              isCustomDateSelected && styles.slotWeekdayTextSelected,
            ]}
          >
            {isCustomDateSelected ? 'PICK' : 'CAL'}
          </Text>

          <Ionicons
            name={isCustomDateSelected ? 'calendar' : 'calendar-outline'}
            size={22}
            color={isCustomDateSelected ? Colors.textWhite : Colors.primary}
          />

          <View
            style={[
              styles.slotDot,
              isCustomDateSelected
                ? styles.slotDotSelected
                : { backgroundColor: `${Colors.primary}60` },
            ]}
          />
        </TouchableOpacity>

        {/* Slots 2-6: Past 4 Days + Today */}
        {fiveDays.map((d, index) => {
          const iso = fiveDaysIso[index];
          const isSelected = selectedDate === iso;
          const isTodayDate = iso === todayIso;
          const dayNum = d.getDate();
          const weekday = d
            .toLocaleDateString('en-US', { weekday: 'short' })
            .toUpperCase();
          const count = orderDates[iso] || 0;

          return (
            <TouchableOpacity
              key={iso}
              onPress={() => handleSelectSlotDate(iso)}
              activeOpacity={0.8}
              style={[
                styles.slotCard,
                isSelected && styles.slotCardSelected,
                isTodayDate && !isSelected && styles.slotCardToday,
              ]}
            >
              <Text
                style={[
                  styles.slotWeekdayText,
                  isSelected && styles.slotWeekdayTextSelected,
                  isTodayDate && !isSelected && styles.slotWeekdayTextToday,
                ]}
              >
                {weekday}
              </Text>

              <Text
                style={[
                  styles.slotDateText,
                  isSelected && styles.slotDateTextSelected,
                  isTodayDate && !isSelected && styles.slotDateTextToday,
                ]}
              >
                {dayNum}
              </Text>

              {/* Bottom Dot Indicator */}
              <View
                style={[
                  styles.slotDot,
                  isSelected
                    ? styles.slotDotSelected
                    : count > 0
                    ? styles.slotDotHasOrders
                    : isTodayDate
                    ? styles.slotDotToday
                    : styles.slotDotEmpty,
                ]}
              />
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Interactive Calendar Date Picker Modal */}
      <Modal
        visible={isModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsModalVisible(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setIsModalVisible(false)}
        >
          <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Select Order Date</Text>
                <Text style={styles.modalSubtitle}>Filter orders by specific date</Text>
              </View>
              <TouchableOpacity
                onPress={() => setIsModalVisible(false)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="close" size={22} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Month Navigation */}
            <View style={styles.modalMonthNav}>
              <TouchableOpacity
                onPress={goToPrevMonth}
                style={styles.modalArrowBtn}
                activeOpacity={0.7}
              >
                <Ionicons name="chevron-back" size={18} color={Colors.textPrimary} />
              </TouchableOpacity>

              <Text style={styles.modalMonthTitle}>
                {new Intl.DateTimeFormat('en-US', {
                  month: 'long',
                  year: 'numeric',
                }).format(calendarViewDate)}
              </Text>

              <TouchableOpacity
                onPress={goToNextMonth}
                style={styles.modalArrowBtn}
                activeOpacity={0.7}
              >
                <Ionicons name="chevron-forward" size={18} color={Colors.textPrimary} />
              </TouchableOpacity>
            </View>

            {/* Weekday headers */}
            <View style={styles.modalWeekdayRow}>
              {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((w) => (
                <Text key={w} style={styles.modalWeekdayText}>
                  {w}
                </Text>
              ))}
            </View>

            {/* Days Grid */}
            <View style={styles.modalDaysGrid}>
              {calendarGrid.map((dateObj, idx) => {
                if (!dateObj) {
                  return <View key={`empty-${idx}`} style={styles.modalDayCell} />;
                }

                const iso = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(dateObj.getDate()).padStart(2, '0')}`;
                const isSelected = selectedDate === iso;
                const isTodayDate = iso === todayIso;
                const hasOrders = Boolean(orderDates[iso]);

                return (
                  <TouchableOpacity
                    key={iso}
                    onPress={() => handleSelectModalDate(dateObj)}
                    style={[
                      styles.modalDayCell,
                      isSelected && styles.modalDayCellSelected,
                      !isSelected && hasOrders && styles.modalDayCellHasOrders,
                      !isSelected && isTodayDate && !hasOrders && styles.modalDayCellToday,
                    ]}
                  >
                    <Text
                      style={[
                        styles.modalDayText,
                        isSelected && styles.modalDayTextSelected,
                        !isSelected && hasOrders && styles.modalDayTextHasOrders,
                        !isSelected && isTodayDate && styles.modalDayTextToday,
                      ]}
                    >
                      {dateObj.getDate()}
                    </Text>
                    {hasOrders && !isSelected && <View style={styles.modalOrderDot} />}
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Modal Footer: View All Orders Button */}
            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.modalAllDatesBtn}
                onPress={handleSelectAllDates}
                activeOpacity={0.8}
              >
                <Ionicons name="apps" size={16} color={Colors.primary} />
                <Text style={styles.modalAllDatesText}>View All Orders (No Date Filter)</Text>
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
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 4,
    backgroundColor: Colors.background,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    paddingHorizontal: 2,
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primary,
    marginRight: 8,
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.textPrimary,
    letterSpacing: -0.2,
  },
  allDatesBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 14,
    backgroundColor: `${Colors.primary}12`,
    borderWidth: 1,
    borderColor: `${Colors.primary}30`,
  },
  allDatesBtnActive: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 14,
    backgroundColor: Colors.primary,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  allDatesBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.primary,
    marginLeft: 4,
  },
  allDatesBtnTextActive: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textWhite,
    marginLeft: 4,
  },
  slotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
  },
  slotCard: {
    flex: 1,
    height: 82,
    borderRadius: 22,
    backgroundColor: Colors.surface,
    borderWidth: 1.2,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 9,
    paddingHorizontal: 1,
    ...Shadows.sm,
  },
  slotCardSelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
    ...Shadows.md,
  },
  slotCardToday: {
    borderColor: `${Colors.primary}60`,
    backgroundColor: `${Colors.primary}08`,
  },
  slotWeekdayText: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.textSecondary,
    letterSpacing: 0.5,
  },
  slotWeekdayTextSelected: {
    color: Colors.textWhite,
  },
  slotWeekdayTextToday: {
    color: Colors.primary,
  },
  slotDateText: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.textPrimary,
    letterSpacing: -0.5,
  },
  slotDateTextSelected: {
    color: Colors.textWhite,
  },
  slotDateTextToday: {
    color: Colors.primary,
  },
  slotDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  slotDotSelected: {
    backgroundColor: Colors.textWhite,
  },
  slotDotHasOrders: {
    backgroundColor: Colors.primary,
  },
  slotDotToday: {
    backgroundColor: `${Colors.primary}70`,
  },
  slotDotEmpty: {
    backgroundColor: 'transparent',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: Colors.surface,
    borderRadius: 24,
    padding: 20,
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
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  modalSubtitle: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  modalMonthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
  },
  modalArrowBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: `${Colors.primary}12`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalMonthTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  modalWeekdayRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  modalWeekdayText: {
    width: 36,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  modalDaysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  modalDayCell: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 3,
  },
  modalDayCellSelected: {
    backgroundColor: Colors.primary,
  },
  modalDayCellHasOrders: {
    backgroundColor: `${Colors.primary}15`,
    borderWidth: 1,
    borderColor: `${Colors.primary}40`,
  },
  modalDayCellToday: {
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  modalDayText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  modalDayTextSelected: {
    color: Colors.textWhite,
    fontWeight: '800',
  },
  modalDayTextHasOrders: {
    color: Colors.primary,
    fontWeight: '700',
  },
  modalDayTextToday: {
    color: Colors.primary,
    fontWeight: '700',
  },
  modalOrderDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.primary,
    position: 'absolute',
    bottom: 3,
  },
  modalFooter: {
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  modalAllDatesBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: `${Colors.primary}10`,
    borderWidth: 1,
    borderColor: `${Colors.primary}30`,
  },
  modalAllDatesText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.primary,
    marginLeft: 6,
  },
});
