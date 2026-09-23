import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Colors, Shadows } from '../../constants/theme';
import { Header } from '../../components/common/Header';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { supervisorApi } from '../../services/supervisorApi';
import { TechnicianSkillType } from '../../types';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList, Routes } from '../../constants/routes';

type Props = NativeStackScreenProps<RootStackParamList, typeof Routes.EDIT_TECHNICIAN>;

const SKILL_OPTIONS = [
  { value: TechnicianSkillType.BOTH, label: 'Both (Repair & Replacement)' },
  { value: TechnicianSkillType.REPAIR, label: 'Repair Only' },
  { value: TechnicianSkillType.REPLACEMENT, label: 'Replacement Only' },
];

export const EditTechnicianScreen: React.FC<Props> = ({ navigation, route }) => {
  const { technicianId } = route.params;

  const [name, setName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [skillType, setSkillType] = useState<TechnicianSkillType>(TechnicianSkillType.BOTH);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadTechnician();
  }, [technicianId]);

  const loadTechnician = async () => {
    try {
      const data = await supervisorApi.getTechnicianById(technicianId);
      setName(data.name);
      setPhoneNumber(data.phoneNumber);
      setSkillType(data.skillType as TechnicianSkillType);
    } catch {
      Alert.alert('Error', 'Failed to load technician');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      Alert.alert('Required', 'Please enter technician full name');
      return;
    }

    setIsSubmitting(true);
    try {
      await supervisorApi.updateTechnician({
        id: technicianId,
        name: name.trim(),
        phoneNumber: phoneNumber.trim(),
        skillType: skillType,
      });

      Alert.alert('Success', 'Technician updated successfully!', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (e: any) {
      Alert.alert('Failed', e.message || 'Could not update technician');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return <LoadingSpinner message="Loading technician..." />;
  }

  return (
    <View style={styles.container}>
      <Header title="Edit Technician" onBack={() => navigation.goBack()} />

      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          <Text style={styles.inputLabel}>Technician Name *</Text>
          <TextInput
            style={styles.textInput}
            value={name}
            onChangeText={setName}
          />

          <Text style={styles.inputLabel}>Phone Number *</Text>
          <TextInput
            style={styles.textInput}
            keyboardType="phone-pad"
            value={phoneNumber}
            onChangeText={setPhoneNumber}
          />

          <Text style={[styles.inputLabel, { marginTop: 14 }]}>Specialization / Skill *</Text>
          <View style={styles.skillList}>
            {SKILL_OPTIONS.map((opt) => {
              const isSelected = skillType === opt.value;
              return (
                <TouchableOpacity
                  key={opt.value}
                  style={[styles.skillRow, isSelected && styles.skillRowSelected]}
                  onPress={() => setSkillType(opt.value)}
                >
                  <View style={[styles.radioCircle, isSelected && styles.radioCircleSelected]}>
                    {isSelected ? <View style={styles.radioDot} /> : null}
                  </View>
                  <Text style={[styles.skillLabel, isSelected && styles.skillLabelSelected]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <TouchableOpacity
          style={[styles.submitButton, isSubmitting && styles.disabledButton]}
          activeOpacity={0.8}
          onPress={handleSubmit}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator color={Colors.textWhite} />
          ) : (
            <Text style={styles.submitButtonText}>Save Changes</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    padding: 16,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadows.sm,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginTop: 8,
    marginBottom: 6,
  },
  textInput: {
    height: 48,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    fontSize: 14,
    backgroundColor: Colors.surfaceSecondary,
    color: Colors.textPrimary,
  },
  skillList: {
    gap: 8,
    marginTop: 4,
  },
  skillRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    backgroundColor: Colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  skillRowSelected: {
    borderColor: Colors.primary,
    backgroundColor: `${Colors.primary}08`,
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: Colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  radioCircleSelected: {
    borderColor: Colors.primary,
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.primary,
  },
  skillLabel: {
    fontSize: 14,
    color: Colors.textPrimary,
    fontWeight: '500',
  },
  skillLabelSelected: {
    color: Colors.primary,
    fontWeight: '700',
  },
  submitButton: {
    backgroundColor: Colors.primary,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.md,
  },
  disabledButton: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: Colors.textWhite,
    fontSize: 16,
    fontWeight: '700',
  },
});
