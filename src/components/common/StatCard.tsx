import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Colors, Shadows } from '../../constants/theme';
import { MaterialIcons } from '@expo/vector-icons';

interface StatCardProps {
  title: string;
  count: number | string;
  icon: keyof typeof MaterialIcons.glyphMap;
  color?: string;
  backgroundColor?: string;
  onPress?: () => void;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  count,
  icon,
  color = Colors.primary,
  backgroundColor = Colors.surface,
  onPress,
}) => {
  const content = (
    <View style={[styles.card, { backgroundColor }]}>
      <View style={[styles.iconContainer, { backgroundColor: `${color}15` }]}>
        <MaterialIcons name={icon} size={22} color={color} />
      </View>
      <View style={styles.textContainer}>
        <Text style={styles.count}>{count}</Text>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
      </View>
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity activeOpacity={0.7} onPress={onPress} style={styles.wrapper}>
        {content}
      </TouchableOpacity>
    );
  }

  return <View style={styles.wrapper}>{content}</View>;
};

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    minWidth: '46%',
    margin: 4,
  },
  card: {
    borderRadius: 16,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadows.sm,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  count: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  title: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.textSecondary,
    marginTop: 2,
  },
});
