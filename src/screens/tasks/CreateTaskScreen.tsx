import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
  Switch,
  Modal,
  Image,
} from 'react-native';
import { Colors, Shadows } from '../../constants/theme';
import { Header } from '../../components/common/Header';
import { ImagePickerCard } from '../../components/common/ImagePickerCard';
import { SignaturePadModal } from '../../components/common/SignaturePadModal';
import { taskApi } from '../../services/taskApi';
import { uploadApi } from '../../services/uploadApi';
import { coordinatorApi } from '../../services/coordinatorApi';
import { useAuth } from '../../context/AuthContext';
import { FieldOfficerDto, UserRole, CookstoveLookupData } from '../../types';
import { MaterialIcons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList, Routes } from '../../constants/routes';

type Props = NativeStackScreenProps<RootStackParamList, typeof Routes.CREATE_TASK>;

export const CreateTaskScreen: React.FC<Props> = ({ navigation, route }) => {
  const { session } = useAuth();
  const prefillFieldOfficerId = route.params?.prefillFieldOfficerId;

  const [cookstoveNumber, setCookstoveNumber] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [village, setVillage] = useState('');
  const [district, setDistrict] = useState('');
  const [autoFilledFields, setAutoFilledFields] = useState<{
    customerName?: boolean;
    customerPhone?: boolean;
    deliveryAddress?: boolean;
    village?: boolean;
    district?: boolean;
  }>({});
  const [typeOfProcess, setTypeOfProcess] = useState<'REPAIRING' | 'REPLACEMENT'>('REPAIRING');
  const [isInstantRepair, setIsInstantRepair] = useState(false);
  const [receivedImageUri, setReceivedImageUri] = useState<string | null>(null);

  // Temporary stove toggle
  const [assignTempStove, setAssignTempStove] = useState(false);
  const [tempStoveNumber, setTempStoveNumber] = useState('');

  // Acknowledgement & Customer Signature
  const [isAcknowledged, setIsAcknowledged] = useState(false);
  const [customerSignatureUri, setCustomerSignatureUri] = useState<string | null>(null);
  const [showSignatureModal, setShowSignatureModal] = useState(false);

  // Coordinator specific: Field officer picker
  const isCoordinator = session?.role === UserRole.FIELD_COORDINATOR;
  const [fieldOfficers, setFieldOfficers] = useState<FieldOfficerDto[]>([]);
  const [selectedOfficerId, setSelectedOfficerId] = useState<number | undefined>(
    prefillFieldOfficerId
  );
  const [isOfficerDropdownOpen, setIsOfficerDropdownOpen] = useState(false);

  const selectedOfficer = selectedOfficerId
    ? fieldOfficers.find((fo) => fo.id === selectedOfficerId)
    : null;

  const [isLookingUp, setIsLookingUp] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Barcode Check Modal state
  const [lookupModal, setLookupModal] = useState<{
    visible: boolean;
    type: 'FOUND' | 'NOT_FOUND' | 'ERROR';
    data?: CookstoveLookupData | null;
    barcode?: string;
    errorMessage?: string;
  }>({
    visible: false,
    type: 'FOUND',
  });

  useEffect(() => {
    if (isCoordinator) {
      loadFieldOfficers();
    }
  }, [isCoordinator, session?.userId]);

  const loadFieldOfficers = async () => {
    try {
      const officers = await coordinatorApi.getFieldOfficers(session?.userId);
      setFieldOfficers(officers);
      if (prefillFieldOfficerId && officers.some((fo) => fo.id === prefillFieldOfficerId)) {
        setSelectedOfficerId(prefillFieldOfficerId);
      }
    } catch (e) {
      console.warn('Failed to load field officers', e);
    }
  };

  const handleBarcodeLookup = async () => {
    const code = cookstoveNumber.trim();
    if (!code) {
      Alert.alert('Required', 'Please enter a barcode/stove number first');
      return;
    }

    setIsLookingUp(true);
    try {
      const result = await taskApi.lookupCookstove(code);
      if (
        result &&
        (result.customerName ||
          result.customerPhone ||
          result.deliveryAddress ||
          result.village ||
          result.district)
      ) {
        if (result.customerName) setCustomerName(result.customerName);
        if (result.customerPhone) setCustomerPhone(result.customerPhone);
        if (result.deliveryAddress) setDeliveryAddress(result.deliveryAddress);
        if (result.village) setVillage(result.village);
        if (result.district) setDistrict(result.district);

        setAutoFilledFields({
          customerName: !!result.customerName,
          customerPhone: !!result.customerPhone,
          deliveryAddress: !!result.deliveryAddress,
          village: !!result.village,
          district: !!result.district,
        });

        setLookupModal({
          visible: true,
          type: 'FOUND',
          data: result,
          barcode: code,
        });
      } else {
        setAutoFilledFields({});
        setLookupModal({
          visible: true,
          type: 'NOT_FOUND',
          barcode: code,
        });
      }
    } catch (err: any) {
      setLookupModal({
        visible: true,
        type: 'ERROR',
        barcode: code,
        errorMessage:
          err?.message || 'Unable to complete barcode check. Please enter details manually.',
      });
    } finally {
      setIsLookingUp(false);
    }
  };

  const handleSubmit = async () => {
    if (!cookstoveNumber.trim()) {
      Alert.alert('Required', 'Please enter the cookstove barcode number');
      return;
    }

    if (isCoordinator && !selectedOfficerId) {
      Alert.alert('Required', 'Please select a field officer to assign this order to');
      return;
    }

    if (!isInstantRepair && assignTempStove && !tempStoveNumber.trim()) {
      Alert.alert('Required', 'Please enter the temporary cookstove number');
      return;
    }

    setIsSubmitting(true);
    try {
      let uploadedImageUrl: string | undefined = undefined;
      if (receivedImageUri) {
        uploadedImageUrl = await uploadApi.uploadImage(
          receivedImageUri,
          'received',
          undefined,
          session?.userId
        );
      }

      let uploadedSignatureUrl: string | undefined = undefined;
      if (customerSignatureUri) {
        uploadedSignatureUrl = await uploadApi.uploadImage(
          customerSignatureUri,
          'signature',
          undefined,
          session?.userId
        );
      }

      const assignedOfficer = isCoordinator
        ? fieldOfficers.find((o) => o.id === selectedOfficerId)
        : null;
      const officerId = isCoordinator
        ? (assignedOfficer?.id ? Number(assignedOfficer.id) : undefined)
        : session?.userId;
      const officerName = isCoordinator
        ? (assignedOfficer?.name || undefined)
        : (session?.name || 'Field Officer');
      const officerPhone = isCoordinator
        ? (assignedOfficer?.phoneNumber || undefined)
        : session?.phoneNumber;

      const isInstant = isInstantRepair;
      const fullAddress = [deliveryAddress, village, district].filter(Boolean).join(', ');
      const addressWithTag = isInstant
        ? (fullAddress ? `${fullAddress} [INSTANT_REPAIR]` : '[INSTANT_REPAIR]')
        : (fullAddress || undefined);

      await taskApi.createTask({
        cookstoveNumber: cookstoveNumber.trim(),
        customerName: customerName.trim() || undefined,
        customerPhone: customerPhone.trim() || undefined,
        deliveryAddress: addressWithTag,
        typeOfProcess: typeOfProcess,
        collectionDate: Date.now(),
        receivedProductImageUrl: uploadedImageUrl,
        temporaryCookstoveNumber: isInstant
          ? 'INSTANT_REPAIR'
          : (!isInstantRepair && assignTempStove ? tempStoveNumber.trim() : undefined),
        customerSignatureUrl: uploadedSignatureUrl,
        collectionSignatureUrl: uploadedSignatureUrl,
        isInstantRepair: isInstant,
        createdByFieldOfficerId: officerId,
        fieldOfficerName: officerName,
        fieldOfficerPhone: officerPhone,
      });

      Alert.alert('Success', 'Order created successfully!', [
        {
          text: 'OK',
          onPress: () => navigation.goBack(),
        },
      ]);
    } catch (error: any) {
      Alert.alert('Failed', error.message || 'Unable to create order. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}
    >
      <Header title="Create New Order" onBack={() => navigation.goBack()} isModal />

      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {/* Process Type Selector */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Type of Process</Text>
          <View style={styles.processTypeRow}>
            <TouchableOpacity
              style={[
                styles.processTypeButton,
                typeOfProcess === 'REPAIRING' && styles.processTypeButtonActive,
              ]}
              onPress={() => setTypeOfProcess('REPAIRING')}
            >
              <MaterialIcons
                name="build"
                size={20}
                color={typeOfProcess === 'REPAIRING' ? Colors.textWhite : Colors.textSecondary}
              />
              <Text
                style={[
                  styles.processTypeText,
                  typeOfProcess === 'REPAIRING' && styles.processTypeTextActive,
                ]}
              >
                Repairing
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.processTypeButton,
                typeOfProcess === 'REPLACEMENT' && styles.processTypeButtonActive,
              ]}
              onPress={() => {
                setTypeOfProcess('REPLACEMENT');
                setIsInstantRepair(false);
              }}
            >
              <MaterialIcons
                name="swap-horiz"
                size={22}
                color={typeOfProcess === 'REPLACEMENT' ? Colors.textWhite : Colors.textSecondary}
              />
              <Text
                style={[
                  styles.processTypeText,
                  typeOfProcess === 'REPLACEMENT' && styles.processTypeTextActive,
                ]}
              >
                Replacement
              </Text>
            </TouchableOpacity>
          </View>

          {/* Instant / On-Field Repair Checkbox Option */}
          {typeOfProcess === 'REPAIRING' && (
            <TouchableOpacity
              style={[
                styles.instantRepairOption,
                isInstantRepair && styles.instantRepairOptionActive,
              ]}
              activeOpacity={0.7}
              onPress={() => {
                const nextState = !isInstantRepair;
                setIsInstantRepair(nextState);
                if (nextState) {
                  setAssignTempStove(false);
                  setTempStoveNumber('');
                }
              }}
            >
              <View style={[styles.checkbox, isInstantRepair && styles.checkboxChecked]}>
                {isInstantRepair && (
                  <MaterialIcons name="check" size={16} color={Colors.textWhite} />
                )}
              </View>
              <View style={{ flex: 1 }}>
                <View style={styles.instantRepairHeader}>
                  <Text
                    style={[
                      styles.instantRepairTitle,
                      isInstantRepair && styles.instantRepairTitleActive,
                    ]}
                  >
                    Instant / On-Field Repair
                  </Text>
                  <View
                    style={[
                      styles.instantRepairBadge,
                      isInstantRepair && styles.instantRepairBadgeActive,
                    ]}
                  >
                    <MaterialIcons
                      name="bolt"
                      size={14}
                      color={isInstantRepair ? Colors.primary : Colors.textSecondary}
                    />
                    <Text
                      style={[
                        styles.instantRepairBadgeText,
                        isInstantRepair && styles.instantRepairBadgeTextActive,
                      ]}
                    >
                      On-Site
                    </Text>
                  </View>
                </View>
                <Text style={styles.instantRepairSubtitle}>
                  Cookstove is repaired directly on the spot. No temporary replacement needed.
                </Text>
              </View>
            </TouchableOpacity>
          )}
        </View>

        {/* Cookstove Barcode & Lookup */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Cookstove Barcode *</Text>
          <View style={styles.lookupRow}>
            <TextInput
              style={styles.barcodeInput}
              placeholder="Scan or enter barcode"
              placeholderTextColor={Colors.textMuted}
              value={cookstoveNumber}
              onChangeText={(text) => {
                setCookstoveNumber(text);
                if (Object.values(autoFilledFields).some(Boolean)) {
                  setAutoFilledFields({});
                }
              }}
              autoCapitalize="characters"
            />
            <TouchableOpacity
              style={[styles.lookupButton, isLookingUp && styles.disabledButton]}
              onPress={handleBarcodeLookup}
              disabled={isLookingUp}
            >
              {isLookingUp ? (
                <ActivityIndicator size="small" color={Colors.textWhite} />
              ) : (
                <View style={styles.checkButtonContent}>
                  <MaterialIcons name="search" size={16} color={Colors.textWhite} style={{ marginRight: 4 }} />
                  <Text style={styles.lookupButtonText}>Check</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>

          {/* Customer Details */}
          <Text style={[styles.inputLabel, { marginTop: 14 }]}>Customer Name</Text>
          <TextInput
            style={[
              styles.textInput,
              autoFilledFields.customerName && styles.textInputLocked,
            ]}
            placeholder="Beneficiary name"
            placeholderTextColor={Colors.textMuted}
            value={customerName}
            onChangeText={setCustomerName}
            editable={!autoFilledFields.customerName}
          />

          <Text style={styles.inputLabel}>Customer Phone Number</Text>
          <TextInput
            style={[
              styles.textInput,
              autoFilledFields.customerPhone && styles.textInputLocked,
            ]}
            placeholder="10-digit phone number"
            placeholderTextColor={Colors.textMuted}
            keyboardType="phone-pad"
            value={customerPhone}
            onChangeText={setCustomerPhone}
            editable={!autoFilledFields.customerPhone}
          />

          <Text style={styles.inputLabel}>Delivery Address / Village</Text>
          <TextInput
            style={[
              styles.textInput,
              autoFilledFields.deliveryAddress && styles.textInputLocked,
            ]}
            placeholder="Street address or locality"
            placeholderTextColor={Colors.textMuted}
            value={deliveryAddress}
            onChangeText={setDeliveryAddress}
            editable={!autoFilledFields.deliveryAddress}
          />

          <View style={styles.rowInputs}>
            <View style={{ flex: 1, marginRight: 8 }}>
              <Text style={styles.inputLabel}>Village</Text>
              <TextInput
                style={[
                  styles.textInput,
                  autoFilledFields.village && styles.textInputLocked,
                ]}
                placeholder="Village"
                placeholderTextColor={Colors.textMuted}
                value={village}
                onChangeText={setVillage}
                editable={!autoFilledFields.village}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.inputLabel}>District</Text>
              <TextInput
                style={[
                  styles.textInput,
                  autoFilledFields.district && styles.textInputLocked,
                ]}
                placeholder="District"
                placeholderTextColor={Colors.textMuted}
                value={district}
                onChangeText={setDistrict}
                editable={!autoFilledFields.district}
              />
            </View>
          </View>
        </View>

        {/* Coordinator: Assign to Field Officer */}
        {isCoordinator && (
          <View style={styles.card}>
            <View style={styles.sectionHeaderBetween}>
              <Text style={[styles.sectionTitle, { marginBottom: 0 }]}>Assign to Field Officer *</Text>
              <View style={styles.officerCountBadge}>
                <Text style={styles.officerCountText}>
                  {fieldOfficers.length} {fieldOfficers.length === 1 ? 'Officer' : 'Officers'}
                </Text>
              </View>
            </View>

            <View style={styles.dropdownWrapper}>
              <TouchableOpacity
                style={[
                  styles.dropdownSelector,
                  isOfficerDropdownOpen && styles.dropdownSelectorOpen,
                ]}
                activeOpacity={0.7}
                onPress={() => setIsOfficerDropdownOpen((prev) => !prev)}
              >
                <View style={styles.dropdownLeft}>
                  <View
                    style={[
                      styles.officerAvatarMini,
                      selectedOfficer && styles.officerAvatarMiniActive,
                    ]}
                  >
                    <MaterialIcons
                      name="person"
                      size={18}
                      color={selectedOfficer ? Colors.primary : Colors.textSecondary}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={[
                        styles.dropdownSelectedName,
                        !selectedOfficer && { color: Colors.textSecondary, fontWeight: 'normal' },
                      ]}
                      numberOfLines={1}
                    >
                      {selectedOfficer ? selectedOfficer.name : 'Select a Field Officer'}
                    </Text>
                    <Text style={styles.dropdownSelectedPhone}>
                      {selectedOfficer
                        ? `${selectedOfficer.phoneNumber || 'No phone'} • Field Officer`
                        : 'Tap to assign a field officer'}
                    </Text>
                  </View>
                </View>
                <MaterialIcons
                  name={isOfficerDropdownOpen ? 'keyboard-arrow-up' : 'keyboard-arrow-down'}
                  size={22}
                  color={isOfficerDropdownOpen ? Colors.primary : Colors.textSecondary}
                />
              </TouchableOpacity>

              {isOfficerDropdownOpen && (
                <View style={styles.dropdownMenu}>
                  <View style={styles.dropdownMenuHeader}>
                    <Text style={styles.dropdownMenuHeaderText}>ASSIGN ORDER TO</Text>
                  </View>
                  <ScrollView
                    nestedScrollEnabled
                    style={{ maxHeight: 240 }}
                    showsVerticalScrollIndicator={true}
                    keyboardShouldPersistTaps="handled"
                  >
                    {fieldOfficers.length === 0 ? (
                      <View style={{ padding: 16, alignItems: 'center' }}>
                        <Text style={{ fontSize: 13, color: Colors.textSecondary }}>
                          No field officers available under your account.
                        </Text>
                      </View>
                    ) : (
                      fieldOfficers.map((officer, index) => {
                        const isSelected = selectedOfficerId === officer.id;
                        const initial =
                          officer.name?.trim()?.charAt(0)?.toUpperCase() || 'O';
                        const isLast = index === fieldOfficers.length - 1;
                        return (
                          <TouchableOpacity
                            key={officer.id}
                            style={[
                              styles.dropdownMenuItem,
                              isSelected && styles.dropdownMenuItemActive,
                              isLast && { borderBottomWidth: 0 },
                            ]}
                            activeOpacity={0.65}
                            onPress={() => {
                              setSelectedOfficerId(officer.id);
                              setIsOfficerDropdownOpen(false);
                            }}
                          >
                            <View style={styles.dropdownItemLeft}>
                              <View
                                style={[
                                  styles.officerAvatarCircle,
                                  isSelected && styles.officerAvatarCircleActive,
                                ]}
                              >
                                <Text
                                  style={[
                                    styles.officerAvatarText,
                                    isSelected && styles.officerAvatarTextActive,
                                  ]}
                                >
                                  {initial}
                                </Text>
                              </View>
                              <View style={{ flex: 1 }}>
                                <Text
                                  style={[
                                    styles.dropdownItemText,
                                    isSelected && styles.dropdownItemTextActive,
                                  ]}
                                  numberOfLines={1}
                                >
                                  {officer.name || `Officer #${officer.id}`}
                                </Text>
                                {officer.phoneNumber ? (
                                  <Text style={styles.dropdownItemSubtext}>
                                    {officer.phoneNumber} • Field Officer
                                  </Text>
                                ) : null}
                              </View>
                            </View>

                            {isSelected ? (
                              <MaterialIcons name="check-circle" size={20} color={Colors.primary} />
                            ) : (
                              <View style={styles.radioEmpty} />
                            )}
                          </TouchableOpacity>
                        );
                      })
                    )}
                  </ScrollView>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Temporary Cookstove Option (Hidden when Instant / On-Field Repair is selected) */}
        {!isInstantRepair && (
          <View style={styles.card}>
            <View style={styles.switchRow}>
              <View style={{ flex: 1, paddingRight: 12 }}>
                <Text style={styles.switchTitle}>Assign Temporary Cookstove</Text>
                <Text style={styles.switchSubtitle}>
                  Provide a temporary replacement stove to the customer while repair is underway
                </Text>
              </View>
              <Switch
                value={assignTempStove}
                onValueChange={setAssignTempStove}
                trackColor={{ false: Colors.border, true: Colors.primaryLight }}
                thumbColor={assignTempStove ? Colors.primary : '#f4f3f4'}
              />
            </View>

            {assignTempStove && (
              <View style={{ marginTop: 14 }}>
                <Text style={styles.inputLabel}>Temporary Cookstove Barcode *</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Enter temporary stove barcode"
                  placeholderTextColor={Colors.textMuted}
                  value={tempStoveNumber}
                  onChangeText={setTempStoveNumber}
                  autoCapitalize="characters"
                />
              </View>
            )}
          </View>
        )}

        {/* Received Cookstove Image */}
        <View style={styles.card}>
          <ImagePickerCard
            label="Received Cookstove Photo"
            helperText="Capture or upload photo of the collected cookstove"
            imageUri={receivedImageUri}
            onImageSelected={setReceivedImageUri}
            onImageRemoved={() => setReceivedImageUri(null)}
          />
        </View>

        {/* Acknowledgement & Customer Signature */}
        <View style={styles.card}>
          <View style={styles.sectionHeaderBetween}>
            <Text style={[styles.sectionTitle, { marginBottom: 0, flex: 1 }]} numberOfLines={1}>
              Acknowledgement
            </Text>
            {isInstantRepair && (
              <View style={styles.onFieldBadge}>
                <MaterialIcons name="verified" size={13} color={Colors.success} />
                <Text style={styles.onFieldBadgeText}>On-Field Repair</Text>
              </View>
            )}
          </View>

          {/* Acknowledgement Checkbox */}
          <TouchableOpacity
            style={styles.acknowledgementRow}
            activeOpacity={0.7}
            onPress={() => setIsAcknowledged((prev) => !prev)}
          >
            <View style={[styles.checkbox, isAcknowledged && styles.checkboxChecked]}>
              {isAcknowledged && (
                <MaterialIcons name="check" size={16} color={Colors.textWhite} />
              )}
            </View>
            <Text style={styles.acknowledgementText}>
              {isInstantRepair
                ? 'I hereby confirm that my cookstove has been inspected and repaired on-field / on-site and returned to me in proper working condition, with no temporary cookstove required.'
                : 'I hereby confirm that I have received a temporary cookstove provided as a replacement for my previous cookstove, which will remain in use until the original cookstove is repaired or replaced.'}
            </Text>
          </TouchableOpacity>

          <View style={styles.cardDivider} />

          {/* Customer Signature Header */}
          <View style={styles.signatureHeaderRow}>
            <Text style={styles.subSectionTitle}>Customer Signature</Text>
            {customerSignatureUri && (
              <TouchableOpacity
                onPress={() => setCustomerSignatureUri(null)}
                style={styles.signatureClearBtn}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <MaterialIcons name="delete-outline" size={15} color={Colors.error} />
                <Text style={styles.signatureClearText}>Clear</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Customer Signature Box */}
          {customerSignatureUri ? (
            <TouchableOpacity
              style={styles.signaturePreviewBox}
              activeOpacity={0.8}
              onPress={() => setShowSignatureModal(true)}
            >
              <Image
                source={{ uri: customerSignatureUri }}
                style={styles.signaturePreviewImage}
                resizeMode="contain"
              />
              <View style={styles.signatureBadge}>
                <MaterialIcons name="edit" size={12} color={Colors.primary} />
                <Text style={styles.signatureBadgeText}>Tap to re-sign</Text>
              </View>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.signaturePlaceholderBox}
              activeOpacity={0.7}
              onPress={() => setShowSignatureModal(true)}
            >
              <MaterialIcons name="draw" size={28} color={Colors.textMuted} />
              <Text style={styles.signaturePlaceholderText}>Sign here</Text>
              <Text style={styles.signaturePlaceholderSubtext}>Tap to open signature pad</Text>
            </TouchableOpacity>
          )}
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
              <MaterialIcons name="check" size={20} color={Colors.textWhite} />
              <Text style={styles.submitButtonText}>Create Service Order</Text>
            </View>
          )}
        </TouchableOpacity>
      </ScrollView>

      {/* Barcode Lookup Result Modal */}
      <Modal
        visible={lookupModal.visible}
        transparent
        animationType="fade"
        onRequestClose={() => setLookupModal((prev) => ({ ...prev, visible: false }))}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            {lookupModal.type === 'FOUND' && (
              <>
                <View style={[styles.modalIconCircle, { backgroundColor: '#DCFCE7' }]}>
                  <MaterialIcons name="check-circle" size={44} color={Colors.success} />
                </View>
                <Text style={styles.modalTitle}>Beneficiary Found!</Text>
                <Text style={styles.modalSubtitle}>
                  Details retrieved for stove{' '}
                  <Text style={{ fontWeight: '700', color: Colors.primary }}>
                    #{lookupModal.barcode}
                  </Text>
                </Text>

                <View style={styles.modalDetailsCard}>
                  {lookupModal.data?.customerName ? (
                    <View style={styles.detailRow}>
                      <MaterialIcons name="person" size={16} color={Colors.textSecondary} />
                      <Text style={styles.detailLabel}>Name:</Text>
                      <Text style={styles.detailValue} numberOfLines={1}>
                        {lookupModal.data.customerName}
                      </Text>
                    </View>
                  ) : null}

                  {lookupModal.data?.customerPhone ? (
                    <View style={styles.detailRow}>
                      <MaterialIcons name="phone" size={16} color={Colors.textSecondary} />
                      <Text style={styles.detailLabel}>Phone:</Text>
                      <Text style={styles.detailValue}>{lookupModal.data.customerPhone}</Text>
                    </View>
                  ) : null}

                  {lookupModal.data?.deliveryAddress ||
                  lookupModal.data?.village ||
                  lookupModal.data?.district ? (
                    <View style={styles.detailRow}>
                      <MaterialIcons name="location-on" size={16} color={Colors.textSecondary} />
                      <Text style={styles.detailLabel}>Address:</Text>
                      <Text style={styles.detailValue} numberOfLines={2}>
                        {[
                          lookupModal.data.deliveryAddress,
                          lookupModal.data.village,
                          lookupModal.data.district,
                        ]
                          .filter(Boolean)
                          .join(', ')}
                      </Text>
                    </View>
                  ) : null}
                </View>

                <Text style={styles.modalHelperText}>
                  Form fields have been auto-inserted and locked from editing.
                </Text>

                <TouchableOpacity
                  style={[styles.modalActionButton, { backgroundColor: Colors.primary }]}
                  activeOpacity={0.8}
                  onPress={() => setLookupModal((prev) => ({ ...prev, visible: false }))}
                >
                  <Text style={styles.modalActionButtonText}>Continue</Text>
                </TouchableOpacity>
              </>
            )}

            {lookupModal.type === 'NOT_FOUND' && (
              <>
                <View style={[styles.modalIconCircle, { backgroundColor: '#FEF3C7' }]}>
                  <MaterialIcons name="search-off" size={44} color={Colors.warning} />
                </View>
                <Text style={styles.modalTitle}>Not Found</Text>
                <Text style={styles.modalSubtitle}>
                  No beneficiary record was found for barcode{' '}
                  <Text style={{ fontWeight: '700', color: Colors.textPrimary }}>
                    #{lookupModal.barcode}
                  </Text>
                  .
                </Text>
                <Text style={[styles.modalHelperText, { marginTop: 14, marginBottom: 20 }]}>
                  You can proceed by entering the customer and location details manually.
                </Text>

                <TouchableOpacity
                  style={[styles.modalActionButton, { backgroundColor: Colors.primary }]}
                  activeOpacity={0.8}
                  onPress={() => setLookupModal((prev) => ({ ...prev, visible: false }))}
                >
                  <Text style={styles.modalActionButtonText}>Enter Manually</Text>
                </TouchableOpacity>
              </>
            )}

            {lookupModal.type === 'ERROR' && (
              <>
                <View style={[styles.modalIconCircle, { backgroundColor: '#FEE2E2' }]}>
                  <MaterialIcons name="error-outline" size={44} color={Colors.error} />
                </View>
                <Text style={styles.modalTitle}>Check Failed</Text>
                <Text style={styles.modalSubtitle}>
                  {lookupModal.errorMessage || 'Unable to complete barcode check at this time.'}
                </Text>
                <Text style={[styles.modalHelperText, { marginTop: 14, marginBottom: 20 }]}>
                  Please check your connection or enter details manually.
                </Text>

                <TouchableOpacity
                  style={[styles.modalActionButton, { backgroundColor: Colors.secondary }]}
                  activeOpacity={0.8}
                  onPress={() => setLookupModal((prev) => ({ ...prev, visible: false }))}
                >
                  <Text style={styles.modalActionButtonText}>Close</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Customer Signature Pad Modal */}
      <SignaturePadModal
        visible={showSignatureModal}
        onSave={(sig) => {
          setCustomerSignatureUri(sig);
          setShowSignatureModal(false);
        }}
        onClose={() => setShowSignatureModal(false)}
      />
    </KeyboardAvoidingView>
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
  processTypeRow: {
    flexDirection: 'row',
    gap: 12,
  },
  processTypeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: Colors.surfaceSecondary,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  processTypeButtonActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  processTypeText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginLeft: 8,
  },
  processTypeTextActive: {
    color: Colors.textWhite,
  },
  instantRepairOption: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 12,
    padding: 12,
    borderRadius: 12,
    backgroundColor: Colors.surfaceSecondary,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  instantRepairOptionActive: {
    backgroundColor: `${Colors.primary}0B`,
    borderColor: Colors.primary,
  },
  instantRepairHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  instantRepairTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  instantRepairTitleActive: {
    color: Colors.primary,
  },
  instantRepairBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  instantRepairBadgeActive: {
    backgroundColor: `${Colors.primary}15`,
  },
  instantRepairBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  instantRepairBadgeTextActive: {
    color: Colors.primary,
  },
  instantRepairSubtitle: {
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 16,
    marginTop: 3,
  },
  onFieldBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    flexShrink: 0,
  },
  onFieldBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.successDark,
  },
  lookupRow: {
    flexDirection: 'row',
    gap: 8,
  },
  barcodeInput: {
    flex: 1,
    height: 48,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    fontSize: 14,
    backgroundColor: Colors.surfaceSecondary,
    color: Colors.textPrimary,
  },
  lookupButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 84,
  },
  checkButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  lookupButtonText: {
    color: Colors.textWhite,
    fontSize: 14,
    fontWeight: '700',
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginTop: 10,
    marginBottom: 6,
  },
  inputLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
    marginBottom: 6,
  },
  inputLabelInRow: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  lockedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  lockedBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#2563EB',
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
  textInputLocked: {
    backgroundColor: '#F1F5F9',
    borderColor: '#CBD5E1',
    color: '#334155',
    fontWeight: '500',
  },
  autofillBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginTop: 12,
    gap: 10,
  },
  autofillBannerIcon: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#DBEAFE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  autofillBannerTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1E40AF',
  },
  autofillBannerSub: {
    fontSize: 11,
    color: '#3B82F6',
    marginTop: 1,
  },
  rowInputs: {
    flexDirection: 'row',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  switchTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  switchSubtitle: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  sectionHeaderBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  officerCountBadge: {
    backgroundColor: `${Colors.primary}12`,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  officerCountText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.primary,
  },
  dropdownWrapper: {
    marginTop: 4,
  },
  dropdownSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  dropdownSelectorOpen: {
    borderColor: Colors.primary,
    backgroundColor: '#FFFFFF',
  },
  dropdownLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  officerAvatarMini: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  officerAvatarMiniActive: {
    backgroundColor: `${Colors.primary}12`,
    borderColor: `${Colors.primary}30`,
  },
  dropdownSelectedName: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  dropdownSelectedPhone: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 1,
  },
  dropdownPlaceholderText: {
    fontSize: 14,
    color: Colors.textMuted,
    fontWeight: '500',
  },
  dropdownMenu: {
    marginTop: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
    ...Shadows.md,
  },
  dropdownMenuHeader: {
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    backgroundColor: '#F8FAFC',
  },
  dropdownMenuHeaderText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textMuted,
    letterSpacing: 0.6,
  },
  dropdownMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  dropdownMenuItemActive: {
    backgroundColor: `${Colors.primary}0D`,
  },
  dropdownItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },
  officerAvatarCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  officerAvatarCircleActive: {
    backgroundColor: Colors.primary,
  },
  officerAvatarText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  officerAvatarTextActive: {
    color: '#FFFFFF',
  },
  dropdownItemText: {
    fontSize: 14,
    color: Colors.textPrimary,
    fontWeight: '600',
  },
  dropdownItemTextActive: {
    color: Colors.primary,
    fontWeight: '700',
  },
  dropdownItemSubtext: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  radioEmpty: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  officerLoadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 8,
  },
  officerLoadingText: {
    fontSize: 13,
    color: Colors.textMuted,
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
  // Barcode Check Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContainer: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: Colors.surface,
    borderRadius: 22,
    padding: 24,
    alignItems: 'center',
    ...Shadows.lg,
  },
  modalIconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 6,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 4,
  },
  modalDetailsCard: {
    width: '100%',
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: 14,
    padding: 14,
    marginTop: 16,
    gap: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  detailLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginLeft: 6,
    marginRight: 6,
    minWidth: 54,
  },
  detailValue: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  modalHelperText: {
    fontSize: 12,
    color: Colors.textMuted,
    textAlign: 'center',
    marginTop: 12,
    marginBottom: 18,
  },
  modalActionButton: {
    width: '100%',
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalActionButtonText: {
    color: Colors.textWhite,
    fontSize: 15,
    fontWeight: '700',
  },

  // Acknowledgement & Signature Styles
  acknowledgementRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 4,
    marginBottom: 6,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.8,
    borderColor: Colors.border,
    backgroundColor: Colors.surfaceSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    marginTop: 2,
  },
  checkboxChecked: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  acknowledgementText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
    color: Colors.textSecondary,
    fontWeight: '400',
  },
  cardDivider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: 14,
  },
  signatureHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  subSectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  signatureClearBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: '#FEE2E2',
  },
  signatureClearText: {
    fontSize: 11,
    color: Colors.error,
    fontWeight: '600',
  },
  signaturePlaceholderBox: {
    height: 140,
    borderRadius: 14,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: Colors.border,
    backgroundColor: Colors.surfaceSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  signaturePlaceholderText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textMuted,
    marginTop: 6,
  },
  signaturePlaceholderSubtext: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 2,
  },
  signaturePreviewBox: {
    height: 140,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.primaryLight,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
    position: 'relative',
    overflow: 'hidden',
  },
  signaturePreviewImage: {
    width: '100%',
    height: '100%',
  },
  signatureBadge: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: `${Colors.primary}18`,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  signatureBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.primary,
  },
});
