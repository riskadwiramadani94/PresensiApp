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
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update waktu setiap 1 menit untuk realtime
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // Update setiap 1 menit
    
    return () => clearInterval(timer);
  }, []);

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

      /* ========================================
         API ENDPOINTS CONFIGURATION
         Endpoint: /pegawai/inbox/api/notifications
         Method: GET
         Params: user_id
      ======================================== */
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

  /* ========================================
     SKELETON LOADING COMPONENT
     Komponen untuk menampilkan placeholder
     saat data sedang dimuat dari server
  ======================================== */
  const SkeletonBox = ({ width, height = 12, style }: any) => (
    <View style={[{ width, height, backgroundColor: '#E0E0E0', borderRadius: 4 }, style]} />
  );

  const renderSkeleton = () => (
    <View style={styles.listContent}>
      {[1, 2, 3, 4, 5].map((item) => (
        <View key={item} style={styles.notifCard}>
          <SkeletonBox width={48} height={48} style={{ borderRadius: 24, marginRight: 12 }} />
          <View style={{ flex: 1 }}>
            <SkeletonBox width="70%" height={15} style={{ marginBottom: 4 }} />
            <SkeletonBox width="90%" height={13} style={{ marginBottom: 2 }} />
            <SkeletonBox width="40%" height={12} style={{ marginTop: 4 }} />
          </View>
          <SkeletonBox width={20} height={20} style={{ borderRadius: 10 }} />
        </View>
      ))}
    </View>
  );

  const getRelativeTime = (timestamp: string) => {
    const now = currentTime.getTime();
    const time = new Date(timestamp).getTime();
    
    // Handle invalid date
    if (isNaN(time)) {
      return 'Baru saja';
    }
    
    const diff = Math.floor((now - time) / 1000); // dalam detik

    if (diff < 60) return 'Baru saja';
    if (diff < 3600) return `${Math.floor(diff / 60)} menit yang lalu`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} jam yang lalu`;
    if (diff < 604800) return `${Math.floor(diff / 86400)} hari yang lalu`;
    return `${Math.floor(diff / 604800)} minggu yang lalu`;
  };

  const renderNotifItem = ({ item }: { item: Notification }) => {
    const statusText = item.isCompleted ? 'Selesai' : '';
    const relativeTime = getRelativeTime(item.time);

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
            <Text style={styles.timeText}>{relativeTime}</Text>
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
        renderSkeleton()
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
