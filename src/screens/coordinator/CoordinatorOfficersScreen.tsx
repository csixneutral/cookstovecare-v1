import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
import { SearchBar } from '../../components/common/SearchBar';
import { EmptyState } from '../../components/common/EmptyState';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { coordinatorApi } from '../../services/coordinatorApi';
import { FieldOfficerDto } from '../../types';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList, Routes } from '../../constants/routes';
import { useAuth } from '../../context/AuthContext';

export const CoordinatorOfficersScreen: React.FC = () => {
  const { session } = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const [officers, setOfficers] = useState<FieldOfficerDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const loadOfficers = useCallback(async () => {
    try {
      const data = await coordinatorApi.getFieldOfficers(session?.userId);
      setOfficers(data);
    } catch (e) {
      console.warn('Failed to load field officers', e);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [session?.userId]);

  useEffect(() => {
    loadOfficers();
  }, [loadOfficers]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadOfficers();
    });
    return unsubscribe;
  }, [navigation, loadOfficers]);

  const onRefresh = () => {
    setIsRefreshing(true);
    loadOfficers();
  };

  const filteredOfficers = useMemo(() => {
    if (!searchQuery.trim()) return officers;
    const q = searchQuery.toLowerCase();
    return officers.filter(
      (o) =>
        o.name.toLowerCase().includes(q) ||
        o.phoneNumber.includes(q)
    );
  }, [officers, searchQuery]);

  if (isLoading) {
    return <LoadingSpinner message="Loading field officers..." />;
  }

  const renderOfficerItem = ({ item }: { item: FieldOfficerDto }) => {
    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.75}
        onPress={() =>
          navigation.navigate(Routes.FIELD_OFFICER_DETAIL, {
            officerPhone: item.phoneNumber,
          })
        }
      >
        <View style={styles.avatar}>
          <MaterialIcons name="person" size={26} color={Colors.primary} />
        </View>

        <View style={styles.infoContainer}>
          <Text style={styles.officerName}>{item.name || 'Field Officer'}</Text>
          <Text style={styles.officerPhone}>{item.phoneNumber}</Text>
        </View>

        <MaterialIcons name="chevron-right" size={22} color={Colors.textMuted} />
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <Header
        title="Field Officers"
        subtitle={`${officers.length} registered officers`}
        rightAction={{
          icon: 'refresh',
          onPress: onRefresh,
          color: Colors.primary,
        }}
      />

      <SearchBar
        value={searchQuery}
        onChangeText={setSearchQuery}
        placeholder="Search officer by name or phone..."
      />

      <FlatList
        data={filteredOfficers}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderOfficerItem}
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
            icon="people"
            title="No Field Officers Found"
            message="No officers match your search term."
          />
        }
      />

      {/* FAB to create order on behalf of field officers */}
      <TouchableOpacity
        style={styles.fab}
        activeOpacity={0.85}
        onPress={() => navigation.navigate(Routes.CREATE_TASK)}
      >
        <MaterialIcons name="add" size={28} color={Colors.textWhite} />
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
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadows.sm,
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: `${Colors.primary}12`,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  infoContainer: {
    flex: 1,
  },
  officerName: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  officerPhone: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
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
