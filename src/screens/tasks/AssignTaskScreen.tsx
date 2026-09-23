import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Colors, Shadows } from '../../constants/theme';
import { Header } from '../../components/common/Header';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { EmptyState } from '../../components/common/EmptyState';
import { supervisorApi } from '../../services/supervisorApi';
import { TechnicianDto, TechnicianSkillType } from '../../types';
import { MaterialIcons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList, Routes } from '../../constants/routes';

type Props = NativeStackScreenProps<RootStackParamList, typeof Routes.ASSIGN_TASK>;

export const AssignTaskScreen: React.FC<Props> = ({ navigation, route }) => {
  const { taskId } = route.params;
  const [technicians, setTechnicians] = useState<TechnicianDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTech, setSelectedTech] = useState<TechnicianDto | null>(null);
  const [isAssigning, setIsAssigning] = useState(false);

  useEffect(() => {
    loadTechnicians();
  }, []);

  const loadTechnicians = async () => {
    try {
      const data = await supervisorApi.getTechnicians(true); // active only
      setTechnicians(data);
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to load technicians');
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmAssignment = async () => {
    if (!selectedTech) return;

    Alert.alert(
      'Confirm Assignment',
      `Assign Order #${taskId} to technician ${selectedTech.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Assign',
          onPress: async () => {
            setIsAssigning(true);
            try {
              await supervisorApi.assignTask(taskId, selectedTech.id);
              Alert.alert('Assigned', `Task successfully assigned to ${selectedTech.name}!`, [
                { text: 'OK', onPress: () => navigation.goBack() },
              ]);
            } catch (e: any) {
              Alert.alert('Failed', e.message || 'Failed to assign task');
            } finally {
              setIsAssigning(false);
            }
          },
        },
      ]
    );
  };

  if (isLoading) {
    return <LoadingSpinner message="Loading technicians..." />;
  }

  const renderTechnicianItem = ({ item }: { item: TechnicianDto }) => {
    const isSelected = selectedTech?.id === item.id;

    const skillLabel =
      item.skillType === TechnicianSkillType.BOTH
        ? 'Repair & Replacement'
        : item.skillType === TechnicianSkillType.REPLACEMENT
        ? 'Replacement Specialist'
        : 'Repair Specialist';

    return (
      <TouchableOpacity
        activeOpacity={0.7}
        style={[styles.techCard, isSelected && styles.techCardSelected]}
        onPress={() => setSelectedTech(item)}
      >
        <View style={styles.techIconCircle}>
          <MaterialIcons name="engineering" size={24} color={Colors.primary} />
        </View>

        <View style={styles.techInfo}>
          <Text style={styles.techName}>{item.name}</Text>
          <Text style={styles.techPhone}>{item.phoneNumber}</Text>

          <View style={styles.skillBadge}>
            <Text style={styles.skillBadgeText}>{skillLabel}</Text>
          </View>
        </View>

        <View style={styles.selectionIndicator}>
          {isSelected ? (
            <MaterialIcons name="radio-button-checked" size={24} color={Colors.primary} />
          ) : (
            <MaterialIcons name="radio-button-unchecked" size={24} color={Colors.textMuted} />
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <Header
        title="Assign Task"
        subtitle={`Select technician for Order #${taskId}`}
        onBack={() => navigation.goBack()}
      />

      {technicians.length === 0 ? (
        <EmptyState
          icon="people-outline"
          title="No Technicians Found"
          message="No active technicians are currently registered."
        />
      ) : (
        <FlatList
          data={technicians}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderTechnicianItem}
          contentContainerStyle={styles.listContent}
        />
      )}

      {selectedTech ? (
        <View style={styles.bottomBar}>
          <TouchableOpacity
            style={[styles.assignButton, isAssigning && styles.disabledButton]}
            activeOpacity={0.8}
            onPress={handleConfirmAssignment}
            disabled={isAssigning}
          >
            {isAssigning ? (
              <ActivityIndicator color={Colors.textWhite} />
            ) : (
              <Text style={styles.assignButtonText}>
                Assign to {selectedTech.name}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      ) : null}
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
    paddingBottom: 100,
  },
  techCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: Colors.border,
    ...Shadows.sm,
  },
  techCardSelected: {
    borderColor: Colors.primary,
    backgroundColor: `${Colors.primary}05`,
  },
  techIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: `${Colors.primary}12`,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  techInfo: {
    flex: 1,
  },
  techName: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  techPhone: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  skillBadge: {
    backgroundColor: Colors.surfaceSecondary,
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginTop: 6,
  },
  skillBadgeText: {
    fontSize: 11,
    color: Colors.secondary,
    fontWeight: '600',
  },
  selectionIndicator: {
    marginLeft: 12,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.surface,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    ...Shadows.lg,
  },
  assignButton: {
    backgroundColor: Colors.primary,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  assignButtonText: {
    color: Colors.textWhite,
    fontSize: 16,
    fontWeight: '700',
  },
  disabledButton: {
    opacity: 0.6,
  },
});
