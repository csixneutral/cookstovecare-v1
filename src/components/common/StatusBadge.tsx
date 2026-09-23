import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { TaskStatus } from '../../types';
import { Colors } from '../../constants/theme';

interface StatusBadgeProps {
  status: TaskStatus | string;
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'md' }) => {
  const getBadgeStyle = () => {
    switch (status) {
      case TaskStatus.COLLECTED:
        return {
          bg: Colors.statusCollected,
          text: Colors.statusCollectedText,
          label: 'Collected',
        };
      case TaskStatus.ASSIGNED:
        return {
          bg: Colors.statusAssigned,
          text: Colors.statusAssignedText,
          label: 'Assigned',
        };
      case TaskStatus.IN_PROGRESS:
        return {
          bg: Colors.statusInProgress,
          text: Colors.statusInProgressText,
          label: 'In Progress',
        };
      case TaskStatus.REPAIR_COMPLETED:
        return {
          bg: Colors.statusRepairCompleted,
          text: Colors.statusRepairCompletedText,
          label: 'Repair Completed',
        };
      case TaskStatus.REPLACEMENT_COMPLETED:
        return {
          bg: Colors.statusReplacementCompleted,
          text: Colors.statusReplacementCompletedText,
          label: 'Replacement Completed',
        };
      case TaskStatus.DISTRIBUTED:
        return {
          bg: Colors.statusDistributed,
          text: Colors.statusDistributedText,
          label: 'Delivered',
        };
      default:
        return {
          bg: Colors.surfaceSecondary,
          text: Colors.textSecondary,
          label: status,
        };
    }
  };

  const badge = getBadgeStyle();
  const isSmall = size === 'sm';

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: badge.bg },
        isSmall && styles.containerSm,
      ]}
    >
      <Text
        style={[
          styles.text,
          { color: badge.text },
          isSmall && styles.textSm,
        ]}
        numberOfLines={1}
      >
        {badge.label}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 16,
    alignSelf: 'flex-start',
  },
  containerSm: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  text: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  textSm: {
    fontSize: 10,
    fontWeight: '600',
  },
});
