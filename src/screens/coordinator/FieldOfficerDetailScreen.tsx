import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Alert,
} from 'react-native';
import { Colors, Shadows } from '../../constants/theme';
import { Header } from '../../components/common/Header';
import { TaskCard } from '../../components/common/TaskCard';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { EmptyState } from '../../components/common/EmptyState';
import { coordinatorApi } from '../../services/coordinatorApi';
import { FieldOfficerDto, TaskDto } from '../../types';
import { MaterialIcons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList, Routes } from '../../constants/routes';

type Props = NativeStackScreenProps<RootStackParamList, typeof Routes.FIELD_OFFICER_DETAIL>;

export const FieldOfficerDetailScreen: React.FC<Props> = ({ navigation, route }) => {
  const { officerPhone } = route.params;

  const [officer, setOfficer] = useState<FieldOfficerDto | null>(null);
  const [tasks, setTasks] = useState<TaskDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      const data = await coordinatorApi.getFieldOfficerByPhone(officerPhone);
      setOfficer(data.fieldOfficer);
      if (data.tasks) setTasks(data.tasks);
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to load officer details');
    } finally {
      setIsLoading(false);
    }
  }, [officerPhone]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (isLoading || !officer) {
    return <LoadingSpinner message="Loading officer profile..." />;
  }

  return (
    <View style={styles.container}>
      <Header
        title={officer.name || 'Field Officer'}
        subtitle={officer.phoneNumber}
        onBack={() => navigation.goBack()}
      />

      <FlatList
        data={tasks}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => (
          <TaskCard
            task={item}
            showFieldOfficer
            onPress={() => navigation.navigate(Routes.TASK_DETAIL, { taskId: item.id })}
          />
        )}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <View style={styles.headerArea}>
            <View style={styles.profileCard}>
              <View style={styles.avatarCircle}>
                <MaterialIcons name="person" size={36} color={Colors.primary} />
              </View>
              <Text style={styles.officerName}>{officer.name}</Text>
              <Text style={styles.officerPhone}>{officer.phoneNumber}</Text>

              <View style={styles.statsGrid}>
                <View style={styles.statBox}>
                  <Text style={styles.statVal}>{tasks.length}</Text>
                  <Text style={styles.statSub}>Total Orders</Text>
                </View>
                <View style={[styles.statBox, { backgroundColor: '#EFF6FF' }]}>
                  <Text style={[styles.statVal, { color: '#1D4ED8' }]}>
                    {tasks.filter((t) => String(t.typeOfProcess || '').toUpperCase().includes('REPAIR')).length}
                  </Text>
                  <Text style={[styles.statSub, { color: '#1D4ED8' }]}>Repairs</Text>
                </View>
                <View style={[styles.statBox, { backgroundColor: '#F5F3FF' }]}>
                  <Text style={[styles.statVal, { color: '#6D28D9' }]}>
                    {tasks.filter((t) => String(t.typeOfProcess || '').toUpperCase().includes('REPLACE')).length}
                  </Text>
                  <Text style={[styles.statSub, { color: '#6D28D9' }]}>Replacements</Text>
                </View>
                <View style={[styles.statBox, { backgroundColor: '#FEF3C7' }]}>
                  <Text style={[styles.statVal, { color: '#B45309' }]}>
                    {tasks.filter((t) =>
                      ['COLLECTED', 'ASSIGNED', 'IN_PROGRESS'].includes(String(t.status || '').toUpperCase())
                    ).length}
                  </Text>
                  <Text style={[styles.statSub, { color: '#B45309' }]}>Pending</Text>
                </View>
                <View style={[styles.statBox, { backgroundColor: '#EDE9FE' }]}>
                  <Text style={[styles.statVal, { color: '#7C3AED' }]}>
                    {tasks.filter((t) =>
                      ['REPAIR_COMPLETED', 'REPLACEMENT_COMPLETED'].includes(String(t.status || '').toUpperCase())
                    ).length}
                  </Text>
                  <Text style={[styles.statSub, { color: '#7C3AED' }]}>Ready</Text>
                </View>
                <View style={[styles.statBox, { backgroundColor: '#DCFCE7' }]}>
                  <Text style={[styles.statVal, { color: '#15803D' }]}>
                    {tasks.filter((t) => String(t.status || '').toUpperCase() === 'DISTRIBUTED').length}
                  </Text>
                  <Text style={[styles.statSub, { color: '#15803D' }]}>Delivered</Text>
                </View>
              </View>
            </View>

            <Text style={styles.sectionHeading}>Handled Orders ({tasks.length})</Text>
          </View>
        }
        ListEmptyComponent={
          <EmptyState
            icon="assignment"
            title="No Tasks Found"
            message="This officer has not created or handled any orders yet."
          />
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  listContent: {
    paddingBottom: 40,
  },
  headerArea: {
    padding: 16,
    paddingBottom: 8,
  },
  profileCard: {
    backgroundColor: Colors.surface,
    borderRadius: 18,
    padding: 18,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadows.sm,
  },
  avatarCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: `${Colors.primary}12`,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  officerName: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  officerPhone: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    width: '100%',
    marginTop: 16,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  statBox: {
    flexBasis: '30%',
    flexGrow: 1,
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statVal: {
    fontSize: 17,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  statSub: {
    fontSize: 11,
    fontWeight: '500',
    color: Colors.textSecondary,
    marginTop: 2,
  },
  sectionHeading: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginTop: 16,
    marginBottom: 4,
  },
});
