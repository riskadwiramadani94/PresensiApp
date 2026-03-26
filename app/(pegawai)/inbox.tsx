import React, { useState, useEffect, useCallback } from 'react';
import { StyleSheet, View, Text, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import AppHeader from '@/components/AppHeader';
import { InboxAPI, fetchWithRetry, getApiUrl, API_CONFIG } from '@/constants/config';
import { AuthStorage } from '@/utils/AuthStorage';

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  time: string;
  reference_type: string;
  reference_id: string | number;
  icon: string;
  priority: 'urgent' | 'high' | 'medium' | 'low';
  is_read: boolean;
  created_at: string;
}

export default function InboxScreen() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
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

      // Menggunakan endpoint pegawai inbox yang benar
      const response = await fetchWithRetry(`${getApiUrl(API_CONFIG.ENDPOINTS.PEGAWAI_INBOX)}?user_id=${user.id_user || user.id}`);
      const data = await response.json();

      if (data.success && data.data) {
        setNotifications(data.data);
        setUnreadCount(data.unread_count || 0);
      } else {
        setNotifications([]);
        setUnreadCount(0);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
      setNotifications([]);
      setUnreadCount(0);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchNotifications();
    setRefreshing(false);
  };

  const markAsRead = async (id: string) => {
    try {
      const user = await AuthStorage.getUser();
      if (!user) return;
      await fetch(`${getApiUrl(API_CONFIG.ENDPOINTS.PEGAWAI_INBOX)}/mark-read`.replace('/notifications', '/mark-read'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notification_id: id, user_id: user.id_user || user.id }),
      });
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true, isRead: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch {}
  };

  const handleNotifPress = (notif: any) => {
    // Navigate berdasarkan reference_type
    if (notif.reference_type === 'pengajuan') {
      router.push('/(pegawai)/pengajuan');
    } else if (notif.reference_type === 'presensi') {
      router.push('/(pegawai)/presensi');
    } else if (notif.reference_type === 'dinas') {
      router.push('/(pegawai)/kegiatan');
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return '#FF4444';
      case 'high': return '#FF8800';
      case 'medium': return '#2196F3';
      case 'low': return '#4CAF50';
      default: return '#6B7280';
    }
  };

  const getPriorityIcon = (type: string, icon: string) => {
    // Map icon names to Ionicons
    const iconMap: { [key: string]: string } = {
      'checkmark-circle': 'checkmark-circle',
      'close-circle': 'close-circle',
      'airplane': 'airplane',
      'time': 'time',
      'document-text': 'document-text',
      'warning': 'warning',
      'people': 'people',
      'stats-chart': 'stats-chart'
    };
    return iconMap[icon] || 'notifications';
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

  const renderNotifItem = ({ item }: { item: any }) => {
    const priorityColor = getPriorityColor(item.priority || 'medium');
    const iconName = getPriorityIcon(item.type, item.icon);
    const relativeTime = getRelativeTime(item.time);
    const isUrgent = item.priority === 'urgent';
    const message = item.desc || item.message || '';
    const isRead = item.isRead || item.is_read || item.isCompleted || false;

    return (
      <TouchableOpacity
        style={[styles.notifCard, isRead && styles.readCard]}
        onPress={() => {
          const isRead = item.isRead || item.is_read || item.isCompleted || false;
          if (!isRead) markAsRead(item.id);
          if (item.type?.includes('dinas')) {
            router.push('/(pegawai)/kegiatan');
          } else if (item.type?.includes('absen')) {
            router.push('/(pegawai)/presensi');
          }
        }}
        activeOpacity={0.7}
      >
        <View style={[
          styles.iconWrapper,
          { backgroundColor: (item.color || priorityColor) + '20' },
          isRead && styles.iconRead
        ]}>
          <Ionicons name={iconName as any} size={24} color={item.color || priorityColor} />
        </View>

        <View style={styles.notifContent}>
          <View style={styles.titleRow}>
            <Text style={[styles.notifTitle, isUrgent && styles.urgentTitle]}>
              {item.title}
            </Text>
            {isUrgent && (
              <View style={styles.urgentBadge}>
                <Text style={styles.urgentText}>URGENT</Text>
              </View>
            )}
          </View>
          <Text style={styles.notifDesc} numberOfLines={2}>
            {message}
          </Text>
          <View style={styles.timeRow}>
            <Ionicons name="time-outline" size={14} color="#9CA3AF" />
            <Text style={styles.timeText}>{relativeTime}</Text>
            <Text style={[styles.priorityText, { color: item.color || priorityColor }]}>
              • {(item.priority || 'medium').toUpperCase()}
            </Text>
          </View>
        </View>

        {!isRead && <View style={[styles.dotIndicator, { backgroundColor: item.color || priorityColor }]} />}
        <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <AppHeader 
        title={unreadCount > 0 ? `Kotak Masuk (${unreadCount})` : 'Kotak Masuk'}
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
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    marginHorizontal: 2,
    borderWidth: 1,
    borderColor: '#F0F3F3',
    shadowColor: '#004643',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
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
  readCard: {
    backgroundColor: '#F9FAFB',
    opacity: 0.8,
  },
  iconRead: {
    opacity: 0.6,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  urgentTitle: {
    color: '#FF4444',
    fontWeight: '700',
  },
  urgentBadge: {
    backgroundColor: '#FF4444',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  urgentText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '700',
  },
  priorityText: {
    fontSize: 11,
    fontWeight: '600',
    marginLeft: 8,
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
