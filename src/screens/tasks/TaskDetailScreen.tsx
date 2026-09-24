import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Modal,
  TextInput,
} from 'react-native';
import { Colors, Shadows } from '../../constants/theme';
import { Header } from '../../components/common/Header';
import { StatusBadge } from '../../components/common/StatusBadge';
import { ImagePickerCard } from '../../components/common/ImagePickerCard';
import SignatureCanvas from 'react-native-signature-canvas';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { taskApi } from '../../services/taskApi';
import { technicianApi } from '../../services/technicianApi';
import { uploadApi } from '../../services/uploadApi';
import { useAuth } from '../../context/AuthContext';
import { TaskDto, TaskStatus, UserRole, RepairDataDto } from '../../types';
import { MaterialIcons } from '@expo/vector-icons';
import {
  isInstantRepairTask,
  applyInstantTaskOverride,
  saveInstantTaskOverride,
} from '../../utils/taskUtils';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList, Routes } from '../../constants/routes';

type Props = NativeStackScreenProps<RootStackParamList, typeof Routes.TASK_DETAIL>;

export const TaskDetailScreen: React.FC<Props> = ({ navigation, route }) => {
  const { taskId } = route.params;
  const { session } = useAuth();
  const signatureRef = useRef<any>(null);

  const [task, setTask] = useState<TaskDto | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);

  // Distribution closure modal state
  const [showDistributeModal, setShowDistributeModal] = useState(false);
  const [distImageUri, setDistImageUri] = useState<string | null>(null);
  const [distComment, setDistComment] = useState('');
  const [newStoveNumber, setNewStoveNumber] = useState('');
  const [newStoveImageUri, setNewStoveImageUri] = useState<string | null>(null);
  const [returnedTempNumber, setReturnedTempNumber] = useState('');
  const [customerReview, setCustomerReview] = useState('');
  const [signatureBase64, setSignatureBase64] = useState<string | null>(null);
  const [showSignaturePad, setShowSignaturePad] = useState(false);
  const [isDistributing, setIsDistributing] = useState(false);
  const [repairData, setRepairData] = useState<RepairDataDto | null>(null);

  const isInstant = isInstantRepairTask(task);
  const isReplacement = task?.typeOfProcess === 'REPLACEMENT';
  const role = session?.role;

  const loadTask = useCallback(async () => {
    try {
      const data = await taskApi.getTaskById(taskId);
      const effectiveData = applyInstantTaskOverride(data);
      setTask(effectiveData);
      const isInstantTask = isInstantRepairTask(effectiveData);
      if (
        effectiveData.temporaryCookstoveNumber &&
        effectiveData.temporaryCookstoveNumber !== 'INSTANT_REPAIR' &&
        effectiveData.temporaryCookstoveNumber !== 'ON_FIELD_REPAIR' &&
        !isInstantTask
      ) {
        setReturnedTempNumber(effectiveData.temporaryCookstoveNumber);
      } else {
        setReturnedTempNumber('');
      }

      try {
        const repair = await technicianApi.getRepairByTaskId(taskId);
        setRepairData(repair);
      } catch {
        setRepairData(null);
      }
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to load task details');
    } finally {
      setIsLoading(false);
    }
  }, [taskId]);

  useEffect(() => {
    loadTask();
  }, [loadTask]);

  // Refresh when returning to this screen
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadTask();
    });
    return unsubscribe;
  }, [navigation, loadTask]);

  // Technician: Start Work
  const handleStartWork = async () => {
    if (!session?.technicianId) {
      Alert.alert('Error', 'No technician profile linked to this account.');
      return;
    }
    setIsActionLoading(true);
    try {
      await technicianApi.startTask(taskId, session.technicianId);
      Alert.alert('Success', 'Work started on this order!');
      await loadTask();
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to start work');
    } finally {
      setIsActionLoading(false);
    }
  };

  // Field Officer: Submit Distribution
  const handleCompleteDistribution = async () => {
    if (!distImageUri) {
      Alert.alert('Required', 'Please capture or upload the delivery proof photo');
      return;
    }

    if (task?.typeOfProcess === 'REPLACEMENT' && !newStoveNumber.trim()) {
      Alert.alert('Required', 'Please enter the new cookstove serial number');
      return;
    }

    setIsDistributing(true);
    try {
      // 1. Upload distribution image
      const distUrl = await uploadApi.uploadImage(
        distImageUri,
        'distribution',
        taskId,
        session?.userId
      );

      // 2. Upload new stove image if replacement
      let newStoveUrl: string | undefined = undefined;
      if (newStoveImageUri) {
        newStoveUrl = await uploadApi.uploadImage(
          newStoveImageUri,
          'new_cookstove',
          taskId,
          session?.userId
        );
      }

      // 3. Upload signature image if present
      let signatureUrl: string | undefined = undefined;
      if (signatureBase64) {
        signatureUrl = await uploadApi.uploadImage(
          signatureBase64,
          'signature',
          taskId,
          session?.userId
        );
      }

      // 4. Call distribute API
      await taskApi.distributeTask({
        taskId,
        fieldOfficerId: session?.userId,
        distributionImageUrl: distUrl,
        distributionComment: distComment.trim() || undefined,
        newStoveNumber: newStoveNumber.trim() || undefined,
        newStoveImageUrl: newStoveUrl,
        customerReview: customerReview.trim() || undefined,
        returnedTempCookstoveNumber:
          task?.temporaryCookstoveNumber &&
          task.temporaryCookstoveNumber !== 'INSTANT_REPAIR' &&
          task.temporaryCookstoveNumber !== 'ON_FIELD_REPAIR' &&
          !isInstant
            ? returnedTempNumber.trim() || undefined
            : undefined,
        customerSignatureUrl: signatureUrl,
        deliverySignatureUrl: signatureUrl,
      });

      if (isInstant) {
        await saveInstantTaskOverride(taskId, {
          status: TaskStatus.DISTRIBUTED,
          deliveredAt: Date.now(),
          deliveryImageUrl: distUrl,
          customerSignatureUrl: signatureUrl,
          deliverySignatureUrl: signatureUrl,
          customerReview: customerReview.trim() || undefined,
        });
      }

      setShowDistributeModal(false);
      Alert.alert('Delivered!', 'Order marked as delivered and closed.');
      await loadTask();
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to complete distribution');
    } finally {
      setIsDistributing(false);
    }
  };

  if (isLoading || !task) {
    return <LoadingSpinner message="Loading task details..." />;
  }

  const cleanAddress = task.deliveryAddress
    ? task.deliveryAddress.replace(/\s*\[INSTANT_REPAIR\]/g, '').trim()
    : '';

  return (
    <View style={styles.container}>
      <Header
        title={`Order #${task.id}`}
        subtitle={task.cookstoveNumber}
        onBack={() => navigation.goBack()}
      />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Top Product Image Banner */}
        <View style={styles.bannerContainer}>
          {task.receivedProductImageUrl ? (
            <TouchableOpacity
              activeOpacity={0.9}
              style={styles.bannerTouchable}
              onPress={() => setPreviewImageUrl(task.receivedProductImageUrl || null)}
            >
              <Image
                source={{ uri: task.receivedProductImageUrl }}
                style={styles.bannerImage}
                resizeMode="cover"
              />
              <View style={styles.expandHintBadge}>
                <MaterialIcons name="zoom-in" size={15} color={Colors.textWhite} />
                <Text style={styles.expandHintText}>Tap to open</Text>
              </View>
            </TouchableOpacity>
          ) : (
            <View style={styles.bannerPlaceholder}>
              <MaterialIcons name="local-fire-department" size={48} color={Colors.primary} />
              <Text style={styles.bannerPlaceholderText}>No Image Available</Text>
            </View>
          )}

          <View style={styles.bannerStatusOverlay} pointerEvents="box-none">
            {isInstant && (
              <View style={styles.instantDetailBadge}>
                <MaterialIcons name="bolt" size={13} color={Colors.textWhite} />
                <Text style={styles.instantDetailBadgeText}>Instant Repair</Text>
              </View>
            )}
            <StatusBadge status={task.status} />
          </View>
        </View>

        {/* Cookstove Info Card */}
        <View style={styles.card}>
          <View style={styles.rowBetween}>
            <View>
              <Text style={styles.cookstoveTitle}>{task.cookstoveNumber}</Text>
              <Text style={styles.processTypeText}>
                Process Type: {isInstant ? 'Instant On-Field Repair' : isReplacement ? 'Replacement' : 'Repairing'}
              </Text>
            </View>
            <View style={[styles.processIconPill, isInstant && styles.processIconPillInstant]}>
              <MaterialIcons
                name={isInstant ? 'bolt' : isReplacement ? 'swap-horiz' : 'build'}
                size={22}
                color={isInstant ? '#D97706' : Colors.primary}
              />
            </View>
          </View>

          {isInstant ? (
            <View style={styles.instantOnFieldNotice}>
              <MaterialIcons name="verified" size={16} color={Colors.success} />
              <Text style={styles.instantOnFieldNoticeText}>
                Repaired and serviced on-site by Field Officer. No workshop repair needed.
              </Text>
            </View>
          ) : task.temporaryCookstoveNumber && task.temporaryCookstoveNumber !== 'INSTANT_REPAIR' ? (
            <View style={styles.tempStoveBanner}>
              <MaterialIcons name="info" size={16} color="#0284C7" />
              <Text style={styles.tempStoveText}>
                Temp Stove: {task.temporaryCookstoveNumber}
              </Text>
            </View>
          ) : null}
        </View>

        {/* Dates & Timeline Card */}
        <View style={styles.card}>
          <Text style={styles.cardHeaderTitle}>Timeline</Text>
          <View style={styles.timelineRow}>
            <View style={styles.timelineDot} />
            <Text style={styles.timelineLabel}>Collected Date:</Text>
            <Text style={styles.timelineValue}>
              {new Date(task.collectionDate).toLocaleDateString()}
            </Text>
          </View>
          {task.workStartedAt ? (
            <View style={styles.timelineRow}>
              <View style={styles.timelineDot} />
              <Text style={styles.timelineLabel}>Work Started:</Text>
              <Text style={styles.timelineValue}>
                {new Date(task.workStartedAt).toLocaleDateString()}
              </Text>
            </View>
          ) : null}
          {task.completedAt ? (
            <View style={styles.timelineRow}>
              <View style={styles.timelineDot} />
              <Text style={styles.timelineLabel}>Work Completed:</Text>
              <Text style={styles.timelineValue}>
                {new Date(task.completedAt).toLocaleDateString()}
              </Text>
            </View>
          ) : null}
          {task.distributionDate ? (
            <View style={styles.timelineRow}>
              <View style={[styles.timelineDot, { backgroundColor: Colors.success }]} />
              <Text style={styles.timelineLabel}>Delivered Date:</Text>
              <Text style={[styles.timelineValue, { color: Colors.success, fontWeight: '700' }]}>
                {new Date(task.distributionDate).toLocaleDateString()}
              </Text>
            </View>
          ) : null}
        </View>

        {/* Customer Information Card */}
        <View style={styles.card}>
          <Text style={styles.cardHeaderTitle}>Customer Details</Text>
          <View style={styles.detailRow}>
            <MaterialIcons name="person" size={18} color={Colors.textSecondary} />
            <Text style={styles.detailText}>
              {task.customerName || 'No customer name recorded'}
            </Text>
          </View>
          {task.customerPhone ? (
            <View style={styles.detailRow}>
              <MaterialIcons name="phone" size={18} color={Colors.textSecondary} />
              <Text style={styles.detailText}>{task.customerPhone}</Text>
            </View>
          ) : null}
          {cleanAddress ? (
            <View style={styles.detailRow}>
              <MaterialIcons name="location-on" size={18} color={Colors.textSecondary} />
              <Text style={styles.detailText}>{cleanAddress}</Text>
            </View>
          ) : null}
        </View>

        {/* Assignment & Technician Card */}
        <View style={styles.card}>
          <Text style={styles.cardHeaderTitle}>Team Ownership</Text>
          <View style={styles.detailRow}>
            <MaterialIcons name="badge" size={18} color={Colors.textSecondary} />
            <Text style={styles.detailText}>
              Field Officer: {task.fieldOfficerName || task.fieldOfficerPhone || 'Unassigned'}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <MaterialIcons
              name="engineering"
              size={18}
              color={isInstant ? Colors.success : Colors.primary}
            />
            <Text style={[styles.detailText, { fontWeight: '600' }]}>
              Technician: {isInstant ? `${task.fieldOfficerName || 'Field Officer'} (On-Field)` : (task.technicianName || 'Not yet assigned')}
            </Text>
          </View>
        </View>

        {/* Repair Completion Details Card (if available) */}
        {repairData ? (
          <View style={styles.card}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <Text style={styles.cardHeaderTitle}>Repair Completion Details</Text>
              <View style={{ backgroundColor: `${Colors.primary}15`, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 }}>
                <Text style={{ fontSize: 12, fontWeight: '700', color: Colors.primary }}>Serviced</Text>
              </View>
            </View>

            {repairData.typesOfRepair && repairData.typesOfRepair.length > 0 ? (
              <View style={{ marginVertical: 6 }}>
                <Text style={styles.sublabel}>Components Repaired:</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
                  {repairData.typesOfRepair.map((typeKey: string, idx: number) => {
                    const label = typeKey.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c: string) => c.toUpperCase());
                    return (
                      <View
                        key={idx}
                        style={{
                          backgroundColor: `${Colors.primary}12`,
                          paddingHorizontal: 8,
                          paddingVertical: 3,
                          borderRadius: 6,
                        }}
                      >
                        <Text style={{ fontSize: 12, fontWeight: '600', color: Colors.primary }}>
                          {label}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              </View>
            ) : null}

            {repairData.partsReplaced ? (
              <View style={styles.detailRow}>
                <MaterialIcons name="build" size={18} color={Colors.textSecondary} />
                <Text style={styles.detailText}>Parts Replaced: {repairData.partsReplaced}</Text>
              </View>
            ) : null}

            {repairData.laborHours ? (
              <View style={styles.detailRow}>
                <MaterialIcons name="schedule" size={18} color={Colors.textSecondary} />
                <Text style={styles.detailText}>Labor Hours: {repairData.laborHours} hr(s)</Text>
              </View>
            ) : null}

            {repairData.repairNotes ? (
              <View style={styles.reviewBox}>
                <Text style={styles.sublabel}>Repair Notes:</Text>
                <Text style={styles.reviewText}>{repairData.repairNotes}</Text>
              </View>
            ) : null}

            {repairData.repairImageUrl ? (
              <TouchableOpacity
                activeOpacity={0.88}
                onPress={() => setPreviewImageUrl(repairData.repairImageUrl || null)}
                style={{ marginTop: 8 }}
              >
                <View style={styles.proofHeaderRow}>
                  <Text style={styles.sublabel}>Repaired Cookstove Photo:</Text>
                  <Text style={styles.tapToOpenText}>Tap to open</Text>
                </View>
                <Image
                  source={{ uri: repairData.repairImageUrl }}
                  style={styles.deliveryProofImage}
                  resizeMode="cover"
                />
              </TouchableOpacity>
            ) : null}
          </View>
        ) : null}

        {/* Collection & Pickup Proof Card */}
        {(task.receivedProductImageUrl || task.collectionSignatureUrl || (task.customerSignatureUrl && task.status !== TaskStatus.DISTRIBUTED)) ? (
          <View style={styles.card}>
            <Text style={styles.cardHeaderTitle}>Collection & Pickup Verification</Text>
            {task.receivedProductImageUrl ? (
              <TouchableOpacity
                activeOpacity={0.88}
                onPress={() => setPreviewImageUrl(task.receivedProductImageUrl || null)}
                style={{ marginVertical: 8 }}
              >
                <View style={styles.proofHeaderRow}>
                  <Text style={styles.sublabel}>Received Cookstove Photo:</Text>
                  <Text style={styles.tapToOpenText}>Tap to open</Text>
                </View>
                <Image
                  source={{ uri: task.receivedProductImageUrl }}
                  style={styles.deliveryProofImage}
                  resizeMode="cover"
                />
              </TouchableOpacity>
            ) : null}

            {(task.collectionSignatureUrl || (task.customerSignatureUrl && task.status !== TaskStatus.DISTRIBUTED)) ? (
              <TouchableOpacity
                activeOpacity={0.88}
                onPress={() => setPreviewImageUrl(task.collectionSignatureUrl || task.customerSignatureUrl || null)}
                style={{ marginTop: 8 }}
              >
                <View style={styles.proofHeaderRow}>
                  <Text style={styles.sublabel}>Beneficiary Collection Signature:</Text>
                  <Text style={styles.tapToOpenText}>Tap to open</Text>
                </View>
                <Image
                  source={{ uri: (task.collectionSignatureUrl || task.customerSignatureUrl)! }}
                  style={styles.signatureImage}
                  resizeMode="contain"
                />
              </TouchableOpacity>
            ) : null}
          </View>
        ) : null}

        {/* Delivery Proof Card (if DISTRIBUTED) */}
        {task.status === TaskStatus.DISTRIBUTED ? (
          <View style={styles.card}>
            <Text style={styles.cardHeaderTitle}>Delivery & Closure Proof</Text>
            {task.distributionImageUrl ? (
              <TouchableOpacity
                activeOpacity={0.88}
                onPress={() => setPreviewImageUrl(task.distributionImageUrl || null)}
                style={{ marginVertical: 8 }}
              >
                <View style={styles.proofHeaderRow}>
                  <Text style={styles.sublabel}>Delivery Photo:</Text>
                  <Text style={styles.tapToOpenText}>Tap to open</Text>
                </View>
                <Image
                  source={{ uri: task.distributionImageUrl }}
                  style={styles.deliveryProofImage}
                  resizeMode="cover"
                />
              </TouchableOpacity>
            ) : null}

            {task.newStoveNumber ? (
              <View style={styles.detailRow}>
                <MaterialIcons name="check-circle" size={18} color={Colors.success} />
                <Text style={styles.detailText}>
                  New Cookstove: {task.newStoveNumber}
                </Text>
              </View>
            ) : null}

            {task.customerReview ? (
              <View style={styles.reviewBox}>
                <Text style={styles.sublabel}>Customer Review:</Text>
                <Text style={styles.reviewText}>"{task.customerReview}"</Text>
              </View>
            ) : null}

            {(task.deliverySignatureUrl || task.customerSignatureUrl) ? (
              <TouchableOpacity
                activeOpacity={0.88}
                onPress={() => setPreviewImageUrl(task.deliverySignatureUrl || task.customerSignatureUrl || null)}
                style={{ marginTop: 8 }}
              >
                <View style={styles.proofHeaderRow}>
                  <Text style={styles.sublabel}>Beneficiary Delivery Signature:</Text>
                  <Text style={styles.tapToOpenText}>Tap to open</Text>
                </View>
                <Image
                  source={{ uri: (task.deliverySignatureUrl || task.customerSignatureUrl)! }}
                  style={styles.signatureImage}
                  resizeMode="contain"
                />
              </TouchableOpacity>
            ) : null}
          </View>
        ) : null}

        {/* Dynamic Action Buttons Based on Role & Status */}
        <View style={styles.actionButtonsContainer}>
          {/* INSTANT REPAIR - State 1: COLLECTED -> Complete On-Field Repair */}
          {isInstant &&
          task.status === TaskStatus.COLLECTED &&
          (role === UserRole.FIELD_OFFICER || role === UserRole.FIELD_COORDINATOR) ? (
            <TouchableOpacity
              style={[styles.primaryActionButton, { backgroundColor: '#F59E0B' }]}
              onPress={() => navigation.navigate(Routes.REPAIR_FORM, { taskId: task.id })}
            >
              <MaterialIcons name="build" size={20} color={Colors.textWhite} />
              <Text style={styles.primaryActionText}>Complete On-Field Repair</Text>
            </TouchableOpacity>
          ) : null}

          {/* INSTANT REPAIR - State 2: REPAIR_COMPLETED -> Complete Customer Delivery */}
          {isInstant &&
          task.status === TaskStatus.REPAIR_COMPLETED &&
          (role === UserRole.FIELD_OFFICER || role === UserRole.FIELD_COORDINATOR) ? (
            <TouchableOpacity
              style={[styles.primaryActionButton, { backgroundColor: Colors.success }]}
              onPress={() => setShowDistributeModal(true)}
            >
              <MaterialIcons name="local-shipping" size={22} color={Colors.textWhite} />
              <Text style={styles.primaryActionText}>Complete Customer Delivery</Text>
            </TouchableOpacity>
          ) : null}

          {/* INSTANT REPAIR - State 3: DISTRIBUTED -> Finished Notice */}
          {isInstant && task.status === TaskStatus.DISTRIBUTED ? (
            <View style={styles.instantDoneCard}>
              <MaterialIcons name="check-circle" size={26} color={Colors.success} />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.instantDoneTitle}>On-Field Repair & Delivery Completed</Text>
                <Text style={styles.instantDoneSub}>
                  This cookstove was serviced and delivered on-site by {task.fieldOfficerName || 'Field Officer'}.
                </Text>
              </View>
            </View>
          ) : null}

          {/* STANDARD WORKSHOP REPAIR - Supervisor Action */}
          {!isInstant &&
          role === UserRole.SUPERVISOR &&
          (task.status === TaskStatus.COLLECTED || task.status === TaskStatus.ASSIGNED) ? (
            <TouchableOpacity
              style={styles.primaryActionButton}
              onPress={() => navigation.navigate(Routes.ASSIGN_TASK, { taskId: task.id })}
            >
              <MaterialIcons name="person-add" size={20} color={Colors.textWhite} />
              <Text style={styles.primaryActionText}>
                {task.status === TaskStatus.COLLECTED ? 'Assign to Technician' : 'Reassign Technician'}
              </Text>
            </TouchableOpacity>
          ) : null}

          {/* STANDARD WORKSHOP REPAIR - Technician Actions */}
          {!isInstant && role === UserRole.TECHNICIAN ? (
            <>
              {task.status === TaskStatus.ASSIGNED ? (
                <TouchableOpacity
                  style={[styles.primaryActionButton, isActionLoading && styles.disabledButton]}
                  onPress={handleStartWork}
                  disabled={isActionLoading}
                >
                  {isActionLoading ? (
                    <ActivityIndicator color={Colors.textWhite} />
                  ) : (
                    <>
                      <MaterialIcons name="play-arrow" size={22} color={Colors.textWhite} />
                      <Text style={styles.primaryActionText}>Start Work</Text>
                    </>
                  )}
                </TouchableOpacity>
              ) : null}

              {task.status === TaskStatus.IN_PROGRESS ? (
                <TouchableOpacity
                  style={styles.primaryActionButton}
                  onPress={() => {
                    if (isReplacement) {
                      navigation.navigate(Routes.REPLACEMENT_FORM, { taskId: task.id });
                    } else {
                      navigation.navigate(Routes.REPAIR_FORM, { taskId: task.id });
                    }
                  }}
                >
                  <MaterialIcons name="done-all" size={20} color={Colors.textWhite} />
                  <Text style={styles.primaryActionText}>
                    {isReplacement ? 'Complete Replacement Form' : 'Complete Repair Form'}
                  </Text>
                </TouchableOpacity>
              ) : null}
            </>
          ) : null}

          {/* STANDARD WORKSHOP REPAIR - Field Officer: Complete Distribution */}
          {!isInstant &&
          role === UserRole.FIELD_OFFICER &&
          (task.status === TaskStatus.REPAIR_COMPLETED ||
            task.status === TaskStatus.REPLACEMENT_COMPLETED) ? (
            <TouchableOpacity
              style={[styles.primaryActionButton, { backgroundColor: Colors.success }]}
              onPress={() => setShowDistributeModal(true)}
            >
              <MaterialIcons name="local-shipping" size={22} color={Colors.textWhite} />
              <Text style={styles.primaryActionText}>Complete Customer Delivery</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </ScrollView>



      {/* Complete Order Distribution Modal */}
      <Modal visible={showDistributeModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          {showSignaturePad ? (
            <View style={styles.signaturePadContainer}>
              <View style={styles.signaturePadHeader}>
                <View>
                  <Text style={styles.signaturePadTitle}>Customer Signature</Text>
                  <Text style={styles.signaturePadSubtitle}>
                    Sign in the box below to confirm delivery
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => setShowSignaturePad(false)}
                  style={{ padding: 6 }}
                >
                  <MaterialIcons name="close" size={24} color={Colors.textSecondary} />
                </TouchableOpacity>
              </View>

              <View style={styles.signatureCanvasWrapper}>
                <SignatureCanvas
                  ref={signatureRef}
                  onOK={(sig) => {
                    setSignatureBase64(sig);
                    setShowSignaturePad(false);
                  }}
                  onEmpty={() => {
                    Alert.alert('Required', 'Please sign inside the box before confirming.');
                  }}
                  autoClear={false}
                  imageType="image/png"
                  penColor="#000000"
                  backgroundColor="#FFFFFF"
                  webStyle={`
                    .m-signature-pad {
                      box-shadow: none;
                      border: 2px dashed #94A3B8;
                      border-radius: 14px;
                      margin: 0;
                      padding: 0;
                      height: 100%;
                      background-color: #FFFFFF;
                    }
                    .m-signature-pad--body {
                      border: none;
                      border-radius: 14px;
                      background-color: #FFFFFF;
                    }
                    .m-signature-pad--footer {
                      display: none;
                    }
                    body, html {
                      background-color: #FFFFFF;
                      margin: 0;
                      padding: 0;
                      height: 100%;
                    }
                  `}
                />
              </View>

              <View style={styles.signaturePadActions}>
                <TouchableOpacity
                  style={[styles.sigBtn, styles.sigClearBtn]}
                  onPress={() => signatureRef.current?.clearSignature()}
                >
                  <MaterialIcons name="refresh" size={20} color={Colors.textSecondary} />
                  <Text style={styles.sigClearText}>Clear</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.sigBtn, styles.sigConfirmBtn]}
                  onPress={() => signatureRef.current?.readSignature()}
                >
                  <MaterialIcons name="check" size={20} color={Colors.textWhite} />
                  <Text style={styles.sigConfirmText}>Confirm Signature</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Complete Order Delivery</Text>
                <TouchableOpacity
                  onPress={() => setShowDistributeModal(false)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <MaterialIcons name="close" size={24} color={Colors.textSecondary} />
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false}>
                {/* Delivery Photo */}
                <ImagePickerCard
                  label="Delivery Handover Photo"
                  helperText="Take or select photo of customer receiving the cookstove"
                  imageUri={distImageUri}
                  onImageSelected={setDistImageUri}
                  onImageRemoved={() => setDistImageUri(null)}
                  required
                />

                {/* If Replacement: New Cookstove Serial & Photo */}
                {isReplacement ? (
                  <>
                    <Text style={styles.modalInputLabel}>New Cookstove Serial Number *</Text>
                    <TextInput
                      style={styles.modalTextInput}
                      placeholder="Enter new barcode / serial"
                      placeholderTextColor={Colors.textMuted}
                      value={newStoveNumber}
                      onChangeText={setNewStoveNumber}
                    />

                    <ImagePickerCard
                      label="New Cookstove Photo"
                      helperText="Photo of the new replacement stove"
                      imageUri={newStoveImageUri}
                      onImageSelected={setNewStoveImageUri}
                      onImageRemoved={() => setNewStoveImageUri(null)}
                    />
                  </>
                ) : null}

                {/* Return of temporary cookstove (visible only if a temporary cookstove was provided) */}
                {task.temporaryCookstoveNumber &&
                task.temporaryCookstoveNumber !== 'INSTANT_REPAIR' &&
                task.temporaryCookstoveNumber !== 'ON_FIELD_REPAIR' &&
                !isInstant ? (
                  <>
                    <Text style={styles.modalInputLabel}>
                      Returned Temporary Cookstove Number
                    </Text>
                    <TextInput
                      style={styles.modalTextInput}
                      placeholder="Verify returned temp stove number"
                      placeholderTextColor={Colors.textMuted}
                      value={returnedTempNumber}
                      onChangeText={setReturnedTempNumber}
                    />
                  </>
                ) : null}

                {/* Customer Review */}
                <Text style={styles.modalInputLabel}>Customer Review / Feedback</Text>
                <TextInput
                  style={[styles.modalTextInput, { height: 70, textAlignVertical: 'top' }]}
                  placeholder="Beneficiary feedback or rating notes"
                  placeholderTextColor={Colors.textMuted}
                  multiline
                  numberOfLines={3}
                  value={customerReview}
                  onChangeText={setCustomerReview}
                />

                {/* Delivery Notes */}
                <Text style={styles.modalInputLabel}>Delivery Comment</Text>
                <TextInput
                  style={styles.modalTextInput}
                  placeholder="Optional delivery notes"
                  placeholderTextColor={Colors.textMuted}
                  value={distComment}
                  onChangeText={setDistComment}
                />

                {/* Customer Signature Card */}
                <View style={styles.signatureCard}>
                  <Text style={styles.modalInputLabel}>Customer Signature</Text>
                  {signatureBase64 ? (
                    <View style={styles.signaturePreviewBox}>
                      <Image
                        source={{ uri: signatureBase64 }}
                        style={styles.signaturePreviewImage}
                        resizeMode="contain"
                      />
                      <TouchableOpacity
                        style={styles.recaptureSignatureButton}
                        onPress={() => setShowSignaturePad(true)}
                      >
                        <Text style={styles.recaptureSignatureText}>Recapture Signature</Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <TouchableOpacity
                      style={styles.captureSignatureButton}
                      onPress={() => setShowSignaturePad(true)}
                    >
                      <MaterialIcons name="edit" size={20} color={Colors.primary} />
                      <Text style={styles.captureSignatureText}>Capture Signature</Text>
                    </TouchableOpacity>
                  )}
                </View>

                {/* Submit Delivery Button */}
                <TouchableOpacity
                  style={[styles.confirmDeliveryButton, isDistributing && styles.disabledButton]}
                  activeOpacity={0.8}
                  onPress={handleCompleteDistribution}
                  disabled={isDistributing}
                >
                  {isDistributing ? (
                    <ActivityIndicator color={Colors.textWhite} />
                  ) : (
                    <Text style={styles.confirmDeliveryButtonText}>Submit Final Delivery</Text>
                  )}
                </TouchableOpacity>
              </ScrollView>
            </View>
          )}
        </View>
      </Modal>

      {/* Full-Screen Image Preview Modal */}
      <Modal
        visible={!!previewImageUrl}
        transparent
        animationType="fade"
        onRequestClose={() => setPreviewImageUrl(null)}
      >
        <View style={styles.imageViewerOverlay}>
          {/* Top Bar with Title and Close Button */}
          <View style={styles.imageViewerHeader}>
            <View style={styles.imageViewerTitleGroup}>
              <Text style={styles.imageViewerTitle}>
                {task ? `Order #${task.id}` : 'Image Preview'}
              </Text>
              {task?.cookstoveNumber ? (
                <Text style={styles.imageViewerSubtitle}>{task.cookstoveNumber}</Text>
              ) : null}
            </View>
            <TouchableOpacity
              style={styles.imageViewerCloseBtn}
              onPress={() => setPreviewImageUrl(null)}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <MaterialIcons name="close" size={24} color={Colors.textWhite} />
            </TouchableOpacity>
          </View>

          {/* Full Screen Image with tap to dismiss */}
          <TouchableOpacity
            style={styles.imageViewerContent}
            activeOpacity={1}
            onPress={() => setPreviewImageUrl(null)}
          >
            {previewImageUrl ? (
              <Image
                source={{ uri: previewImageUrl }}
                style={styles.fullScreenImage}
                resizeMode="contain"
              />
            ) : null}
          </TouchableOpacity>
        </View>
      </Modal>
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
  bannerContainer: {
    height: 190,
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: Colors.surfaceSecondary,
    marginBottom: 14,
    position: 'relative',
    ...Shadows.sm,
  },
  bannerTouchable: {
    width: '100%',
    height: '100%',
  },
  bannerImage: {
    width: '100%',
    height: '100%',
  },
  expandHintBadge: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
  },
  expandHintText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textWhite,
  },
  bannerPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerPlaceholderText: {
    marginTop: 8,
    fontSize: 13,
    color: Colors.textMuted,
    fontWeight: '500',
  },
  bannerStatusOverlay: {
    position: 'absolute',
    top: 12,
    right: 12,
  },
  instantDetailBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#059669',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    gap: 4,
  },
  instantDetailBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textWhite,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadows.sm,
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cookstoveTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  processTypeText: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
    fontWeight: '500',
  },
  processIconPill: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: `${Colors.primary}12`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  processIconPillInstant: {
    backgroundColor: '#FEF3C7',
  },
  instantOnFieldNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    padding: 10,
    borderRadius: 10,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#A7F3D0',
    gap: 8,
  },
  instantOnFieldNoticeText: {
    fontSize: 12,
    color: '#047857',
    fontWeight: '600',
    flex: 1,
  },
  instantDoneCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    borderWidth: 1.5,
    borderColor: '#86EFAC',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
  },
  instantDoneTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#15803D',
  },
  instantDoneSub: {
    fontSize: 12,
    color: '#166534',
    marginTop: 2,
    lineHeight: 17,
  },
  tempStoveBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F9FF',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginTop: 10,
  },
  tempStoveText: {
    fontSize: 12,
    color: '#0284C7',
    fontWeight: '600',
    marginLeft: 6,
  },
  cardHeaderTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 10,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 4,
  },
  detailText: {
    fontSize: 13,
    color: Colors.textPrimary,
    marginLeft: 8,
    flex: 1,
  },
  timelineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 4,
  },
  timelineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primary,
    marginRight: 8,
  },
  timelineLabel: {
    fontSize: 13,
    color: Colors.textSecondary,
    width: 120,
  },
  timelineValue: {
    fontSize: 13,
    color: Colors.textPrimary,
    fontWeight: '500',
  },
  sublabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  deliveryProofImage: {
    width: '100%',
    height: 160,
    borderRadius: 12,
  },
  reviewBox: {
    backgroundColor: Colors.surfaceSecondary,
    padding: 10,
    borderRadius: 10,
    marginVertical: 6,
  },
  reviewText: {
    fontSize: 13,
    color: Colors.textPrimary,
    fontStyle: 'italic',
  },
  signatureImage: {
    width: '100%',
    height: 80,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  actionButtonsContainer: {
    marginTop: 10,
    gap: 10,
  },
  primaryActionButton: {
    backgroundColor: Colors.primary,
    height: 52,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.md,
  },
  primaryActionText: {
    color: Colors.textWhite,
    fontSize: 15,
    fontWeight: '700',
    marginLeft: 8,
  },
  disabledButton: {
    opacity: 0.6,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  modalInputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginTop: 10,
    marginBottom: 4,
  },
  modalTextInput: {
    height: 46,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    fontSize: 14,
    backgroundColor: Colors.surfaceSecondary,
    color: Colors.textPrimary,
  },
  signatureCard: {
    marginTop: 10,
  },
  captureSignatureButton: {
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: Colors.primary,
    borderRadius: 12,
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: `${Colors.primary}08`,
  },
  captureSignatureText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primary,
    marginLeft: 6,
  },
  signaturePreviewBox: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    padding: 10,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
  },
  signaturePreviewImage: {
    width: '100%',
    height: 70,
  },
  recaptureSignatureButton: {
    marginTop: 6,
  },
  recaptureSignatureText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.primary,
  },
  confirmDeliveryButton: {
    backgroundColor: Colors.success,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    marginBottom: 16,
    ...Shadows.md,
  },
  confirmDeliveryButtonText: {
    color: Colors.textWhite,
    fontSize: 16,
    fontWeight: '700',
  },
  // In-modal Signature Pad styles
  signaturePadContainer: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    height: 480,
    width: '100%',
  },
  signaturePadHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  signaturePadTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  signaturePadSubtitle: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  signatureCanvasWrapper: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: Colors.border,
    overflow: 'hidden',
    minHeight: 280,
  },
  signaturePadActions: {
    flexDirection: 'row',
    marginTop: 14,
    gap: 12,
  },
  sigBtn: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sigClearBtn: {
    backgroundColor: Colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  sigClearText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginLeft: 6,
  },
  sigConfirmBtn: {
    backgroundColor: Colors.primary,
    ...Shadows.sm,
  },
  sigConfirmText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textWhite,
    marginLeft: 6,
  },
  proofHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  tapToOpenText: {
    fontSize: 11,
    color: Colors.primary,
    fontWeight: '600',
  },
  imageViewerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    justifyContent: 'center',
  },
  imageViewerHeader: {
    position: 'absolute',
    top: 52,
    left: 20,
    right: 20,
    zIndex: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  imageViewerTitleGroup: {
    flex: 1,
  },
  imageViewerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textWhite,
  },
  imageViewerSubtitle: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
    fontWeight: '500',
  },
  imageViewerCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageViewerContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
  },
  fullScreenImage: {
    width: '100%',
    height: '80%',
  },
  modalButtonsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 18,
  },
  modalCancelButton: {
    flex: 1,
    height: 46,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  modalConfirmButton: {
    flex: 1.5,
    height: 46,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalConfirmButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textWhite,
  },
});
