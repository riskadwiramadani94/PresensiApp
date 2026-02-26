import React, { useState, useEffect, useCallback } from 'react';
import { StyleSheet, View, Text, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import AppHeader from '@/components/AppHeader';
import { getApiUrl, API_CONFIG } from '@/constants/config';
import { AuthStorage } from '@/utils/AuthStorage';

interface Notification {
  id: string;
  type: 'lupa_absen_pulang' | 'reminder_absen_masuk' | 'reminder_absen_pulang' | 'terlambat_absen_masuk';
  title: string;
  desc: string;
  time: string;
  isCompleted: boolean;
  icon: string;
  color: string;
  tanggal?: string;
}

export default function InboxScreen() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [uncompletedCount, setUncompletedCount] = useState(0);

  useFocusEffect(
    useCallback(() => {
      fetchNotifications();
    }, [])
  );

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const user = await AuthStorage.getUser();
      
      if (!user) return;

      const response = await fetch(
        `${getApiUrl(API_CONFIG.ENDPOINTS.PEGAWAI_INBOX)}?user_id=${user.id_user || user.id}`
      );
      const data = await response.json();

      if (data.success && data.data) {
        setNotifications(data.data);
        setUncompletedCount(data.data.filter((n: Notification) => !n.isCompleted).length);
      } else {
        setNotifications([]);
        setUncompletedCount(0);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
      setNotifications([]);
      setUncompletedCount(0);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchNotifications();
    setRefreshing(false);
  };

  const handleNotifPress = (notif: Notification) => {
    if (notif.type === 'reminder_absen_masuk' || 
        notif.type === 'terlambat_absen_masuk' || 
        notif.type === 'reminder_absen_pulang') {
      router.push('/(pegawai)/presensi');
    } else if (notif.type === 'lupa_absen_pulang') {
      router.push('/(pegawai)/bantuan');
    }
  };

  const renderNotifItem = ({ item }: { item: Notification }) => {
    const statusText = item.isCompleted ? 'Selesai' : '';

    return (
      <TouchableOpacity
        style={[styles.notifCard, item.isCompleted && styles.completedCard]}
        onPress={() => handleNotifPress(item)}
        activeOpacity={0.7}
      >
        <View style={[
          styles.iconWrapper,
          { backgroundColor: item.color + '20' },
          item.isCompleted && styles.iconCompleted
        ]}>
          <Ionicons name={item.icon as any} size={24} color={item.color} />
        </View>

        <View style={styles.notifContent}>
          <Text style={styles.notifTitle}>{item.title}</Text>
          <Text style={styles.notifDesc} numberOfLines={2}>
            {item.desc}
          </Text>
          <View style={styles.timeRow}>
            <Ionicons name="time-outline" size={14} color="#9CA3AF" />
            <Text style={styles.timeText}>{item.time}</Text>
          </View>
          {item.isCompleted && (
            <View style={styles.statusBadge}>
              <Ionicons name="checkmark-circle" size={14} color="#4CAF50" />
              <Text style={styles.statusText}>{statusText}</Text>
            </View>
          )}
        </View>

        {!item.isCompleted && <View style={styles.dotIndicator} />}
        <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <AppHeader 
        title={uncompletedCount > 0 ? `Kotak Masuk (${uncompletedCount})` : 'Kotak Masuk'}
        showBack={false}
      />

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#004643" />
          <Text style={styles.loadingText}>Memuat kotak masuk...</Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id}
          renderItem={renderNotifItem}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl 
              refreshing={refreshing} 
              onRefresh={onRefresh}
              colors={['#004643']}
              tintColor="#004643"
            />
          }
          ListEmptyComponent={() => (
            <View style={styles.emptyContainer}>
              <Ionicons name="checkmark-done-circle-outline" size={80} color="#E0E0E0" />
              <Text style={styles.emptyText}>Tidak Ada Item</Text>
              <Text style={styles.emptySubtext}>
                Semua absensi Anda sudah lengkap
              </Text>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#F8FAFC' 
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#666',
  },
  listContent: {
    padding: 16,
    paddingBottom: 100,
  },
  notifCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  iconWrapper: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  iconCompleted: {
    opacity: 0.6,
  },
  completedCard: {
    backgroundColor: '#F9FAFB',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4CAF50',
  },
  dotIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#004643',
    marginRight: 8,
  },
  notifContent: {
    flex: 1,
  },
  notifTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  notifDesc: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 2,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  timeText: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 18,
    fontWeight: '600',
    color: '#9CA3AF',
  },
  emptySubtext: {
    marginTop: 8,
    fontSize: 14,
    color: '#D1D5DB',
    textAlign: 'center',
    paddingHorizontal: 40,
  },
});
