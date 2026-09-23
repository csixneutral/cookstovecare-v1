import React, { useState, useEffect, useCallback } from 'react';
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
import { EmptyState } from '../../components/common/EmptyState';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { SearchBar } from '../../components/common/SearchBar';
import { supervisorApi } from '../../services/supervisorApi';
import { TechnicianDto, TechnicianSkillType } from '../../types';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList, Routes } from '../../constants/routes';

export const TechniciansListScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const [technicians, setTechnicians] = useState<TechnicianDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const loadTechnicians = useCallback(async () => {
    try {
      const data = await supervisorApi.getTechnicians(false); // all
      setTechnicians(data);
    } catch (e) {
      console.warn('Failed to load technicians', e);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadTechnicians();
  }, [loadTechnicians]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadTechnicians();
    });
    return unsubscribe;
  }, [navigation, loadTechnicians]);

  const onRefresh = () => {
    setIsRefreshing(true);
    loadTechnicians();
  };

  const filteredTechs = technicians.filter((t) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return t.name.toLowerCase().includes(q) || t.phoneNumber.includes(q);
  });

  if (isLoading) {
    return <LoadingSpinner message="Loading technicians..." />;
  }

  const renderTechnicianItem = ({ item }: { item: TechnicianDto }) => {
    const skillLabel =
      item.skillType === TechnicianSkillType.BOTH
        ? 'Repair & Replacement'
        : item.skillType === TechnicianSkillType.REPLACEMENT
        ? 'Replacement Specialist'
        : 'Repair Specialist';

    return (
      <TouchableOpacity
        activeOpacity={0.75}
        style={styles.techCard}
        onPress={() => navigation.navigate(Routes.TECHNICIAN_DETAIL, { technicianId: item.id })}
      >
        <View style={styles.techAvatar}>
          <MaterialIcons name="engineering" size={26} color={Colors.primary} />
        </View>

        <View style={styles.techDetails}>
          <View style={styles.nameRow}>
            <Text style={styles.techName}>{item.name}</Text>
            <View
              style={[
                styles.statusDot,
                { backgroundColor: item.isActive ? Colors.success : Colors.textMuted },
              ]}
            />
          </View>

          <Text style={styles.techPhone}>{item.phoneNumber}</Text>

          <View style={styles.metaRow}>
            <View style={styles.skillPill}>
              <Text style={styles.skillText}>{skillLabel}</Text>
            </View>

            {item.activeTasksCount !== undefined ? (
              <Text style={styles.workloadText}>
                Active: <Text style={{ fontWeight: '700' }}>{item.activeTasksCount}</Text>
              </Text>
            ) : null}
          </View>
        </View>

        <MaterialIcons name="chevron-right" size={22} color={Colors.textMuted} />
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <Header
        title="Technicians"
        subtitle={`${technicians.length} registered technicians`}
        rightAction={{
          icon: 'refresh',
          onPress: onRefresh,
          color: Colors.primary,
        }}
      />

      <SearchBar
        value={searchQuery}
        onChangeText={setSearchQuery}
        placeholder="Search technician name or phone..."
      />

      <FlatList
        data={filteredTechs}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderTechnicianItem}
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
            icon="people-outline"
            title="No Technicians Found"
            message="Tap the + button below to add a new technician."
          />
        }
      />

      {/* Floating Action Button to Create Technician */}
      <TouchableOpacity
        style={styles.fab}
        activeOpacity={0.85}
        onPress={() => navigation.navigate(Routes.CREATE_TECHNICIAN)}
      >
        <MaterialIcons name="person-add" size={26} color={Colors.textWhite} />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  listContent: {
    padding: 16,
    paddingBottom: 90,
  },
  techCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadows.sm,
  },
  techAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: `${Colors.primary}12`,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  techDetails: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  techName: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginLeft: 8,
  },
  techPhone: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  skillPill: {
    backgroundColor: Colors.surfaceSecondary,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  skillText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.secondary,
  },
  workloadText: {
    fontSize: 12,
    color: Colors.textSecondary,
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
