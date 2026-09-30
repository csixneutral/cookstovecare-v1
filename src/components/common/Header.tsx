import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Colors } from '../../constants/theme';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface HeaderProps {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  rightAction?: {
    icon: keyof typeof MaterialIcons.glyphMap;
    onPress: () => void;
    color?: string;
  };
  rightActions?: Array<{
    icon: keyof typeof MaterialIcons.glyphMap;
    onPress: () => void;
    color?: string;
  }>;
  isModal?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  title,
  subtitle,
  onBack,
  rightAction,
  rightActions,
  isModal = false,
}) => {
  const insets = useSafeAreaInsets();
  const topPadding = isModal && Platform.OS === 'ios' ? 12 : Math.max(insets.top, 12);

  return (
    <View style={[styles.container, { paddingTop: topPadding }]}>
      <View style={styles.contentRow}>
        {onBack ? (
          <TouchableOpacity
            style={styles.backButton}
            onPress={onBack}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <MaterialIcons name="arrow-back" size={24} color={Colors.textPrimary} />
          </TouchableOpacity>
        ) : null}

        <View style={styles.titleContainer}>
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
          {subtitle ? (
            <Text style={styles.subtitle} numberOfLines={1}>
              {subtitle}
            </Text>
          ) : null}
        </View>

        {rightActions && rightActions.length > 0 ? (
          <View style={styles.rightActionsRow}>
            {rightActions.map((action, idx) => (
              <TouchableOpacity
                key={idx}
                style={styles.rightButton}
                onPress={action.onPress}
                hitSlop={{ top: 10, bottom: 10, left: 6, right: 6 }}
              >
                <MaterialIcons
                  name={action.icon}
                  size={24}
                  color={action.color || Colors.primary}
                />
              </TouchableOpacity>
            ))}
          </View>
        ) : rightAction ? (
          <TouchableOpacity
            style={styles.rightButton}
            onPress={rightAction.onPress}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <MaterialIcons
              name={rightAction.icon}
              size={24}
              color={rightAction.color || Colors.primary}
            />
          </TouchableOpacity>
        ) : onBack ? (
          <View style={styles.backButtonPlaceholder} />
        ) : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    paddingBottom: 12,
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    height: 44,
  },
  backButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  backButtonPlaceholder: {
    width: 36,
  },
  titleContainer: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  subtitle: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 1,
  },
  rightButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  rightActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
});
