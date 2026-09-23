import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Colors, Shadows } from '../../constants/theme';
import { Header } from '../../components/common/Header';
import { ImagePickerCard } from '../../components/common/ImagePickerCard';
import { technicianApi } from '../../services/technicianApi';
import { uploadApi } from '../../services/uploadApi';
import { useAuth } from '../../context/AuthContext';
import { MaterialIcons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList, Routes } from '../../constants/routes';

import { UserRole } from '../../types';
import { saveInstantTaskOverride } from '../../utils/taskUtils';

type Props = NativeStackScreenProps<RootStackParamList, typeof Routes.REPAIR_FORM>;

interface RepairTypeOption {
  key: string;
  label: string;
  isCustom?: boolean;
}

const INITIAL_REPAIR_TYPES: RepairTypeOption[] = [
  { key: 'TOP_REPAIR', label: 'Top Repair' },
  { key: 'TOP_ROUND', label: 'Top Round' },
  { key: 'DOOR_REPAIR', label: 'Door Repair' },
  { key: 'BOTTOM_REPAIR', label: 'Bottom Repair' },
  { key: 'LEG_REPAIR', label: 'Leg Repair' },
];

export const RepairFormScreen: React.FC<Props> = ({ navigation, route }) => {
  const { taskId } = route.params;
  const { session } = useAuth();

  const [repairTypes, setRepairTypes] = useState<RepairTypeOption[]>(INITIAL_REPAIR_TYPES);
  const [showAddTypeInput, setShowAddTypeInput] = useState(false);
  const [newTypeName, setNewTypeName] = useState('');

  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [repairImageUri, setRepairImageUri] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const toggleType = (key: string) => {
    if (selectedTypes.includes(key)) {
      setSelectedTypes(selectedTypes.filter((t) => t !== key));
    } else {
      setSelectedTypes([...selectedTypes, key]);
    }
  };

  const handleAddCustomType = () => {
    const trimmed = newTypeName.trim();
    if (!trimmed) {
      Alert.alert('Required', 'Please enter a name for the repair type');
      return;
    }

    const key = trimmed.toUpperCase().replace(/[^A-Z0-9]+/g, '_');
    if (
      repairTypes.some(
        (t) => t.key === key || t.label.toLowerCase() === trimmed.toLowerCase()
      )
    ) {
      Alert.alert('Duplicate', 'This repair type already exists in the list');
      return;
    }

    const newOption: RepairTypeOption = { key, label: trimmed, isCustom: true };
    setRepairTypes((prev) => [...prev, newOption]);
    setSelectedTypes((prev) => [...prev, key]);
    setNewTypeName('');
    setShowAddTypeInput(false);
  };

  const handleRemoveCustomType = (keyToRemove: string) => {
    setRepairTypes((prev) => prev.filter((t) => t.key !== keyToRemove));
    setSelectedTypes((prev) => prev.filter((k) => k !== keyToRemove));
  };

  const handleSubmit = async () => {
    if (selectedTypes.length === 0) {
      Alert.alert('Required', 'Please select at least one type of repair');
      return;
    }

    const isTechnician = Boolean(session?.technicianId);
    const isFieldStaff =
      session?.role === UserRole.FIELD_OFFICER ||
      session?.role === UserRole.FIELD_COORDINATOR;

    if (!isTechnician && !isFieldStaff && session?.role !== UserRole.SUPERVISOR) {
      Alert.alert('Error', 'You are not authorized to submit repair completion.');
      return;
    }

    setIsSubmitting(true);
    try {
      let uploadedPhotoUrl: string | undefined = undefined;
      if (repairImageUri) {
        uploadedPhotoUrl = await uploadApi.uploadImage(
          repairImageUri,
          'repair',
          taskId,
          session?.userId
        );
      }

      await technicianApi.saveRepair({
        taskId,
        technicianId: session?.technicianId ? Number(session.technicianId) : null,
        userId: session?.userId,
        typesOfRepair: selectedTypes,
        repairImageUrl: uploadedPhotoUrl,
        repairCompletionDate: Date.now(),
      });

      // Synchronize instant task override cache for on-field repair
      try {
        await saveInstantTaskOverride(taskId, {
          status: 'REPAIR_COMPLETED',
          repairNotes: selectedTypes.join(', ') || 'On-field repair completed',
          repairedAt: Date.now(),
        });
      } catch {}

      Alert.alert('Success', 'Repair details saved successfully! Order marked as Repair Completed.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to save repair completion');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <Header
        title="Repair Completion Form"
        subtitle={`Order #${taskId}`}
        onBack={() => navigation.goBack()}
      />

      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {/* Type of Repair Checkboxes */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Type of Repair *</Text>
          <Text style={styles.sectionSubtitle}>
            Select all components serviced or repaired
          </Text>

          <View style={styles.checkboxList}>
            {repairTypes.map((type) => {
              const isChecked = selectedTypes.includes(type.key);
              return (
                <TouchableOpacity
                  key={type.key}
                  style={[
                    styles.checkboxRow,
                    isChecked && styles.checkboxRowChecked,
                  ]}
                  activeOpacity={0.7}
                  onPress={() => toggleType(type.key)}
                >
                  <View style={[styles.checkboxBox, isChecked && styles.checkboxBoxChecked]}>
                    {isChecked ? (
                      <MaterialIcons name="check" size={16} color={Colors.textWhite} />
                    ) : null}
                  </View>
                  <Text
                    style={[
                      styles.checkboxLabel,
                      isChecked && styles.checkboxLabelChecked,
                      { flex: 1 },
                    ]}
                  >
                    {type.label}
                  </Text>
                  {type.isCustom ? (
                    <TouchableOpacity
                      onPress={(e) => {
                        e.stopPropagation();
                        handleRemoveCustomType(type.key);
                      }}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      style={styles.removeCustomBtn}
                    >
                      <MaterialIcons name="close" size={16} color={Colors.textMuted} />
                    </TouchableOpacity>
                  ) : null}
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Add Exceptional / Custom Repair Type Button */}
          {showAddTypeInput ? (
            <View style={styles.addTypeContainer}>
              <View style={styles.addTypeHeaderRow}>
                <MaterialIcons name="build-circle" size={18} color={Colors.primary} />
                <Text style={styles.addTypeHeaderTitle}>ADD EXCEPTIONAL REPAIR TYPE</Text>
              </View>
              <TextInput
                style={styles.addTypeInput}
                placeholder="Enter exceptional repair type (e.g. Chimney Pipe)"
                placeholderTextColor={Colors.textMuted}
                value={newTypeName}
                onChangeText={setNewTypeName}
                autoFocus
                returnKeyType="done"
                onSubmitEditing={handleAddCustomType}
              />
              <View style={styles.addTypeButtonsRow}>
                <TouchableOpacity
                  style={styles.addTypeCancelBtn}
                  onPress={() => {
                    setNewTypeName('');
                    setShowAddTypeInput(false);
                  }}
                >
                  <Text style={styles.addTypeCancelBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.addTypeConfirmBtn}
                  onPress={handleAddCustomType}
                >
                  <MaterialIcons name="add" size={18} color={Colors.textWhite} />
                  <Text style={styles.addTypeConfirmBtnText}>Add Type</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.addTypeButton}
              activeOpacity={0.7}
              onPress={() => setShowAddTypeInput(true)}
            >
              <View style={styles.addTypeIconCircle}>
                <MaterialIcons name="add" size={18} color={Colors.textWhite} />
              </View>
              <Text style={styles.addTypeButtonText}>+ Add Exceptional Repair Type</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Repair Photo */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Repaired Cookstove Photo</Text>
          <Text style={styles.sectionSubtitle}>
            Upload photo showing the finished repair condition
          </Text>

          <ImagePickerCard
            imageUri={repairImageUri}
            onImageSelected={setRepairImageUri}
            onImageRemoved={() => setRepairImageUri(null)}
          />
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          style={[styles.submitButton, isSubmitting && styles.disabledButton]}
          activeOpacity={0.8}
          onPress={handleSubmit}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator color={Colors.textWhite} />
          ) : (
            <View style={styles.submitRow}>
              <MaterialIcons name="check-circle" size={20} color={Colors.textWhite} />
              <Text style={styles.submitButtonText}>Submit Repair Completion</Text>
            </View>
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
    paddingBottom: 40,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadows.sm,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
    marginBottom: 12,
  },
  checkboxList: {
    gap: 8,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    backgroundColor: Colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  checkboxRowChecked: {
    backgroundColor: `${Colors.primary}08`,
    borderColor: Colors.primary,
  },
  checkboxBox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: Colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surface,
  },
  checkboxBoxChecked: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  checkboxLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.textPrimary,
    marginLeft: 10,
  },
  checkboxLabelChecked: {
    fontWeight: '700',
    color: Colors.primary,
  },
  removeCustomBtn: {
    padding: 4,
    borderRadius: 12,
    backgroundColor: `${Colors.textMuted}18`,
    marginLeft: 8,
  },
  addTypeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 14,
    paddingVertical: 13,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: Colors.primary,
    backgroundColor: `${Colors.primary}0D`,
  },
  addTypeIconCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  addTypeButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.primary,
  },
  addTypeContainer: {
    marginTop: 14,
    padding: 14,
    borderRadius: 14,
    backgroundColor: Colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  addTypeHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  addTypeHeaderTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  addTypeInput: {
    height: 44,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 14,
    backgroundColor: Colors.surface,
    color: Colors.textPrimary,
  },
  addTypeButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
  },
  addTypeCancelBtn: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
  },
  addTypeCancelBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  addTypeConfirmBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
    backgroundColor: Colors.primary,
  },
  addTypeConfirmBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textWhite,
  },
  submitButton: {
    backgroundColor: Colors.primary,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    ...Shadows.md,
  },
  disabledButton: {
    opacity: 0.6,
  },
  submitRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  submitButtonText: {
    color: Colors.textWhite,
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 8,
  },
});
