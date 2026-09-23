import React, { useState, useEffect } from 'react';
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
import { taskApi } from '../../services/taskApi';
import { uploadApi } from '../../services/uploadApi';
import { useAuth } from '../../context/AuthContext';
import { MaterialIcons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList, Routes } from '../../constants/routes';
import { UserRole } from '../../types';

type Props = NativeStackScreenProps<RootStackParamList, typeof Routes.REPLACEMENT_FORM>;

export const ReplacementFormScreen: React.FC<Props> = ({ navigation, route }) => {
  const { taskId } = route.params;
  const { session } = useAuth();

  const [oldStoveNumber, setOldStoveNumber] = useState('');
  const [oldStoveImageUri, setOldStoveImageUri] = useState<string | null>(null);
  const [newStoveNumber, setNewStoveNumber] = useState('');
  const [newStoveImageUri, setNewStoveImageUri] = useState<string | null>(null);
  const [replacementReason, setReplacementReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    // Pre-fill old cookstove number from task
    taskApi.getTaskById(taskId).then((t) => {
      if (t) {
        setOldStoveNumber(t.cookstoveNumber);
        if (t.receivedProductImageUrl) {
          setOldStoveImageUri(t.receivedProductImageUrl);
        }
      }
    });
  }, [taskId]);

  const handleSubmit = async () => {
    if (!newStoveNumber.trim()) {
      Alert.alert('Required', 'Please enter the new replacement cookstove serial number');
      return;
    }

    const isTechnician = Boolean(session?.technicianId);
    const isFieldStaff =
      session?.role === UserRole.FIELD_OFFICER ||
      session?.role === UserRole.FIELD_COORDINATOR;

    if (!isTechnician && !isFieldStaff && session?.role !== UserRole.SUPERVISOR) {
      Alert.alert('Error', 'You are not authorized to submit replacement completion.');
      return;
    }

    setIsSubmitting(true);
    try {
      let uploadedOldUrl: string | undefined = undefined;
      if (oldStoveImageUri) {
        uploadedOldUrl = await uploadApi.uploadImage(
          oldStoveImageUri,
          'replacement_old',
          taskId,
          session?.userId
        );
      }

      let uploadedNewUrl: string | undefined = undefined;
      if (newStoveImageUri) {
        uploadedNewUrl = await uploadApi.uploadImage(
          newStoveImageUri,
          'replacement_new',
          taskId,
          session?.userId
        );
      }

      await technicianApi.saveReplacement({
        taskId,
        technicianId: session?.technicianId ? Number(session.technicianId) : null,
        userId: session?.userId,
        oldCookstoveNumber: oldStoveNumber.trim() || undefined,
        oldCookstoveImageUrl: uploadedOldUrl,
        newCookstoveNumber: newStoveNumber.trim(),
        newCookstoveImageUrl: uploadedNewUrl,
        replacementReason: replacementReason.trim() || undefined,
        replacementDate: Date.now(),
      });

      Alert.alert(
        'Success',
        'Replacement recorded successfully! Order marked as Replacement Completed.',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to save replacement');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <Header
        title="Replacement Form"
        subtitle={`Order #${taskId}`}
        onBack={() => navigation.goBack()}
      />

      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {/* Old Cookstove Card */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Original Cookstove Details</Text>

          <Text style={styles.inputLabel}>Old Cookstove Number</Text>
          <TextInput
            style={styles.textInput}
            value={oldStoveNumber}
            onChangeText={setOldStoveNumber}
            editable={false}
          />

          <ImagePickerCard
            label="Old Cookstove Photo"
            helperText="Photo of damaged or returned stove"
            imageUri={oldStoveImageUri}
            onImageSelected={setOldStoveImageUri}
            onImageRemoved={() => setOldStoveImageUri(null)}
          />
        </View>

        {/* New Replacement Cookstove Card */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>New Replacement Cookstove *</Text>

          <Text style={styles.inputLabel}>New Cookstove Serial Number *</Text>
          <TextInput
            style={styles.textInput}
            placeholder="Scan or enter new stove serial number"
            placeholderTextColor={Colors.textMuted}
            value={newStoveNumber}
            onChangeText={setNewStoveNumber}
            autoCapitalize="characters"
          />

          <ImagePickerCard
            label="New Replacement Cookstove Photo"
            helperText="Photo of the new cookstove to be issued"
            imageUri={newStoveImageUri}
            onImageSelected={setNewStoveImageUri}
            onImageRemoved={() => setNewStoveImageUri(null)}
          />

          <Text style={styles.inputLabel}>Reason for Replacement</Text>
          <TextInput
            style={[styles.textInput, { height: 70, textAlignVertical: 'top' }]}
            placeholder="e.g. Body cracked beyond welding repair"
            placeholderTextColor={Colors.textMuted}
            multiline
            numberOfLines={3}
            value={replacementReason}
            onChangeText={setReplacementReason}
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
              <MaterialIcons name="swap-horiz" size={22} color={Colors.textWhite} />
              <Text style={styles.submitButtonText}>Submit Replacement</Text>
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
    marginBottom: 10,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginTop: 8,
    marginBottom: 6,
  },
  textInput: {
    height: 46,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    fontSize: 14,
    backgroundColor: Colors.surfaceSecondary,
    color: Colors.textPrimary,
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
