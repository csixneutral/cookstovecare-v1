import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
} from 'react-native';
import { Colors, Shadows } from '../../constants/theme';
import { TaskDto } from '../../types';
import { StatusBadge } from './StatusBadge';
import { MaterialIcons } from '@expo/vector-icons';
import { isInstantRepairTask, applyInstantTaskOverride } from '../../utils/taskUtils';

interface TaskCardProps {
  task: TaskDto;
  onPress: () => void;
  onDelete?: (task: TaskDto) => void;
  isDeleteActive?: boolean;
  onShowDelete?: () => void;
  onHideDelete?: () => void;
  showTechnician?: boolean;
  showFieldOfficer?: boolean;
  showAddress?: boolean;
  showProcessType?: boolean;
  showDate?: boolean;
}

export const TaskCard: React.FC<TaskCardProps> = ({
  task,
  onPress,
  onDelete,
  isDeleteActive = false,
  onShowDelete,
  onHideDelete,
  showTechnician = false,
  showFieldOfficer = false,
  showAddress = false,
  showProcessType = true,
  showDate = true,
}) => {
  const displayTask = applyInstantTaskOverride(task);
  const isInstant = isInstantRepairTask(displayTask);
  const dateValue = task.collectionDate || task.createdAt;
  let formattedDate = '';
  if (dateValue) {
    const num = Number(dateValue);
    const ms = !isNaN(num) && num > 0 ? (num < 10000000000 ? num * 1000 : num) : dateValue;
    const d = new Date(ms);
    if (!isNaN(d.getTime())) {
      formattedDate = d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    }
  }

  const isReplacement = String(task.typeOfProcess || '').toUpperCase().includes('REPLACE');
  const cleanAddress = task.deliveryAddress
    ? task.deliveryAddress.replace(/\s*\[INSTANT_REPAIR\]/g, '').trim()
    : '';

  const handlePress = () => {
    if (isDeleteActive) {
      onHideDelete?.();
    } else {
      onPress();
    }
  };

  const handleLongPress = () => {
    if (onDelete) {
      if (isDeleteActive) {
        onHideDelete?.();
      } else {
        onShowDelete?.();
      }
    }
  };

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={handlePress}
      onLongPress={handleLongPress}
      delayLongPress={350}
      style={[
        styles.card,
        isInstant && styles.cardInstant,
        isDeleteActive && styles.cardActiveDelete,
      ]}
    >
      <View style={styles.headerRow}>
        <View style={styles.headerLeftGroup}>
          <View style={styles.stoveNumberBadge}>
            <MaterialIcons
              name="qr-code"
              size={16}
              color={Colors.primary}
              style={styles.stoveIcon}
            />
            <Text style={styles.stoveNumberText} numberOfLines={1}>
              {task.cookstoveNumber}
            </Text>
          </View>
          {isInstant && (
            <View style={styles.instantBadge}>
              <MaterialIcons name="bolt" size={13} color="#D97706" />
              <Text style={styles.instantBadgeText}>Instant Repair</Text>
            </View>
          )}
        </View>

        <StatusBadge status={displayTask.status} size="sm" />
      </View>

      <View style={styles.bodyRow}>
        {task.receivedProductImageUrl ? (
          <Image
            source={{ uri: task.receivedProductImageUrl }}
            style={styles.thumbnail}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.placeholderThumbnail}>
            <MaterialIcons name="image" size={24} color={Colors.textMuted} />
          </View>
        )}

        <View style={styles.detailsContainer}>
          {task.customerName ? (
            <View style={styles.customerNameRow}>
              <MaterialIcons name="person" size={16} color={Colors.primary} />
              <Text style={styles.customerName} numberOfLines={1}>
                {task.customerName}
              </Text>
            </View>
          ) : null}

          {showFieldOfficer && (task.fieldOfficerName || task.fieldOfficerPhone) ? (
            <View style={styles.infoRow}>
              <MaterialIcons name="badge" size={14} color={Colors.primary} />
              <Text style={styles.officerText} numberOfLines={1}>
                Officer: {task.fieldOfficerName || task.fieldOfficerPhone}
              </Text>
            </View>
          ) : null}

          {showTechnician && task.technicianName ? (
            <View style={styles.infoRow}>
              <MaterialIcons name="engineering" size={14} color={Colors.textSecondary} />
              <Text style={styles.technicianText} numberOfLines={1}>
                Tech: {task.technicianName}
              </Text>
            </View>
          ) : null}

          {showAddress && cleanAddress ? (
            <View style={styles.infoRow}>
              <MaterialIcons name="location-on" size={14} color={Colors.textSecondary} />
              <Text style={styles.addressText} numberOfLines={1}>
                {cleanAddress}
              </Text>
            </View>
          ) : null}

          {(showProcessType || showDate) && (
            <View style={styles.bottomMetaRow}>
              {showProcessType && (
                <View style={[styles.processContainer, isInstant && styles.processContainerInstant]}>
                  <MaterialIcons
                    name={isInstant ? 'bolt' : isReplacement ? 'autorenew' : 'build'}
                    size={12}
                    color={isInstant ? '#D97706' : Colors.textMuted}
                  />
                  <Text style={[styles.processText, isInstant && styles.processTextInstant]}>
                    {isInstant ? 'Instant / On-Field' : isReplacement ? 'Replacement' : 'Repairing'}
                  </Text>
                </View>
              )}

              {showDate && (
                <View style={styles.dateContainer}>
                  <MaterialIcons name="calendar-today" size={12} color={Colors.textMuted} />
                  <Text style={styles.dateText}>{formattedDate}</Text>
                </View>
              )}
            </View>
          )}
        </View>

        <MaterialIcons
          name="chevron-right"
          size={22}
          color={Colors.textMuted}
          style={styles.chevron}
        />
      </View>

      {/* Action bar shown when card is held */}
      {isDeleteActive && onDelete && (
        <View style={styles.holdDeleteBar}>
          <View style={styles.holdDeleteLabelGroup}>
            <MaterialIcons name="delete-outline" size={18} color="#DC2626" />
            <Text style={styles.holdDeletePrompt}>Delete this order?</Text>
          </View>
          <View style={styles.holdDeleteBtnGroup}>
            <TouchableOpacity
              style={styles.holdCancelBtn}
              activeOpacity={0.7}
              onPress={(e) => {
                e.stopPropagation();
                onHideDelete?.();
              }}
            >
              <Text style={styles.holdCancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.holdDeleteBtn}
              activeOpacity={0.8}
              onPress={(e) => {
                e.stopPropagation();
                onDelete(task);
              }}
            >
              <MaterialIcons name="delete-forever" size={16} color={Colors.textWhite} />
              <Text style={styles.holdDeleteBtnText}>Delete</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 14,
    marginVertical: 6,
    marginHorizontal: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadows.sm,
  },
  cardActiveDelete: {
    borderColor: '#EF4444',
    borderWidth: 1.5,
    backgroundColor: '#FEF2F2',
  },
  holdDeleteBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 10,
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#FECACA',
  },
  holdDeleteLabelGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  holdDeletePrompt: {
    fontSize: 13,
    fontWeight: '700',
    color: '#DC2626',
  },
  holdDeleteBtnGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  holdCancelBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: Colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  holdCancelBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  holdDeleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#EF4444',
    ...Shadows.sm,
  },
  holdDeleteBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textWhite,
  },
  cardInSwipe: {
    marginVertical: 0,
    marginHorizontal: 0,
  },
  cardInstant: {
    borderLeftWidth: 3.5,
    borderLeftColor: '#F59E0B',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  headerLeftGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 1,
    gap: 6,
  },
  instantBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE68A',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 3,
  },
  instantBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#B45309',
  },
  instantStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    gap: 4,
  },
  instantStatusBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.success,
  },
  processContainerInstant: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 5,
  },
  processTextInstant: {
    color: '#B45309',
    fontWeight: '600',
  },
  stoveNumberBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${Colors.primary}12`,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    flexShrink: 1,
  },
  stoveIcon: {
    marginRight: 4,
  },
  stoveNumberText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.primary,
  },
  bodyRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  thumbnail: {
    width: 60,
    height: 60,
    borderRadius: 10,
    backgroundColor: Colors.surfaceSecondary,
  },
  placeholderThumbnail: {
    width: 60,
    height: 60,
    borderRadius: 10,
    backgroundColor: Colors.surfaceSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailsContainer: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'center',
  },
  customerNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 3,
  },
  customerName: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginLeft: 6,
    flex: 1,
  },
  addressText: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginLeft: 4,
    flex: 1,
  },
  officerText: {
    fontSize: 12,
    color: Colors.primary,
    fontWeight: '600',
    marginLeft: 4,
    flex: 1,
  },
  technicianText: {
    fontSize: 12,
    color: Colors.primary,
    fontWeight: '600',
    marginLeft: 4,
    flex: 1,
  },
  bottomMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  processContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  processText: {
    fontSize: 11,
    fontWeight: '500',
    color: Colors.textMuted,
    marginLeft: 4,
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateText: {
    fontSize: 11,
    color: Colors.textMuted,
    marginLeft: 4,
  },
  chevron: {
    marginLeft: 6,
  },
});
