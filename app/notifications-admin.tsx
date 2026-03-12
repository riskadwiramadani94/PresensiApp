import React, { useState, useEffect, useCallback } from 'react';
import { StyleSheet, View, Text, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import AppHeader from '@/components/AppHeader';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface PushNotification {
  id: string;
  type: string;
  title: string;
  message: string;
  time: string;
  reference_type: string;
  reference_id: number;
  icon: string;
}

export default function AdminNotificationScreen() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<PushNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      fetchNotifications();
    }, [])
  );

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      
      const token = await AsyncStorage.getItem('token');
      const userId = await AsyncStorage.getItem('userId');
      const API_URL = await AsyncStorage.getItem('API_URL') || 'http://192.168.1.100:3000';
      
      if (!token || !userId) {
        console.log('No auth data');
        return;
      }

      console.log('[ADMIN NOTIF] Fetching notifications for admin:', userId);

      const response = await fetch(
        `${API_URL}/api/inbox/notifications?user_id=${userId}&role=admin`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );
      
      const data = await response.json();
      console.log('[ADMIN NOTIF] Response:', data);

      if (data.success && data.data) {
        setNotifications(data.data);
      } else {
        setNotifications([]);
        console.log('[ADMIN NOTIF] No notifications or error:', data.message);
      }
    } catch (error) {
      console.error('[ADMIN NOTIF] Error fetching notifications:', error);
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchNotifications();
    setRefreshing(false);
  };

  const handleNotificationPress = (notification: PushNotification) => {
    console.log('[ADMIN NOTIF] Notification pressed:', notification);
    
    const { type, reference_type, reference_id } = notification;
    
    // Route berdasarkan type notifikasi untuk admin
    switch (type) {
      case 'pengajuan_baru':
        // Admin ke halaman pengajuan
        router.push('/menu-admin/pengajuan');
        break;
      
      case 'presensi_validasi':
        // Admin ke halaman tracking pegawai
        router.push('/admin/tracking-pegawai');
        break;
      
      case 'lembur_baru':
        // Admin ke halaman pengajuan
        router.push('/menu-admin/pengajuan');
        break;
      
      // === FALLBACK ===
      default:
        console.log('[ADMIN NOTIF] Unknown notification type:', type);
        // Fallback berdasarkan reference_type
        if (reference_type === 'pengajuan') {
          router.push('/menu-admin/pengajuan');
        } else if (reference_type === 'dinas') {
          router.push('/menu-admin/kelola-dinas');
        } else if (reference_type === 'presensi') {
          router.push('/admin/tracking-pegawai');
        }
        break;
    }
  };

  const getRelativeTime = (timestamp: string) => {
    const now = new Date().getTime();
    const time = new Date(timestamp).getTime();
    
    if (isNaN(time)) {
      return 'Baru saja';
    }
    
    const diff = Math.floor((now - time) / 1000);

    if (diff < 60) return 'Baru saja';
    if (diff < 3600) return `${Math.floor(diff / 60)} menit yang lalu`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} jam yang lalu`;
    if (diff < 604800) return `${Math.floor(diff / 86400)} hari yang lalu`;
    return `${Math.floor(diff / 604800)} minggu yang lalu`;
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'pengajuan_baru':
      case 'lembur_baru':
        return '#2196F3'; // Blue
      case 'presensi_validasi':
        return '#FF9800'; // Orange
      default:
        return '#607D8B'; // Blue Grey
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'pengajuan_baru':
      case 'lembur_baru':
        return 'document-text';
      case 'presensi_validasi':
        return 'time';
      default:
        return 'notifications';
    }
  };

  const renderSkeleton = () => (
    <View style={styles.listContent}>
      {[1, 2, 3, 4, 5].map((item) => (
        <View key={item} style={styles.notifCard}>
          <View style={[styles.iconWrapper, { backgroundColor: '#E0E0E0' }]} />
          <View style={{ flex: 1 }}>
            <View style={[styles.skeletonBox, { width: '70%', height: 16, marginBottom: 8 }]} />
            <View style={[styles.skeletonBox, { width: '90%', height: 14, marginBottom: 4 }]} />
            <View style={[styles.skeletonBox, { width: '40%', height: 12 }]} />
          </View>
          <View style={[styles.skeletonBox, { width: 20, height: 20, borderRadius: 10 }]} />
        </View>
      ))}
    </View>
  );

  const renderNotifItem = ({ item }: { item: PushNotification }) => {
    const color = getNotificationColor(item.type);
    const iconName = getNotificationIcon(item.type);
    const relativeTime = getRelativeTime(item.time);

    return (
      <TouchableOpacity
        style={styles.notifCard}
        onPress={() => handleNotificationPress(item)}
        activeOpacity={0.7}
      >
        <View style={[styles.iconWrapper, { backgroundColor: color + '20' }]}>
          <Ionicons name={iconName as any} size={24} color={color} />
        </View>

        <View style={styles.notifContent}>
          <Text style={styles.notifTitle}>{item.title}</Text>
          <Text style={styles.notifMessage} numberOfLines={2}>
            {item.message}
          </Text>
          <View style={styles.timeRow}>
            <Ionicons name="time-outline" size={14} color="#9CA3AF" />
            <Text style={styles.timeText}>{relativeTime}</Text>
          </View>
        </View>

        <View style={styles.urgentBadge}>
          <View style={styles.dotIndicator} />
        </View>

        <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <AppHeader 
        title="Notifikasi Admin"
        showBack={true}
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
              <Ionicons name="notifications-off-outline" size={80} color="#E0E0E0" />
              <Text style={styles.emptyText}>Belum Ada Notifikasi</Text>
              <Text style={styles.emptySubtext}>
                Notifikasi pengajuan dan validasi akan muncul di sini
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
    padding: 16,
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
  notifContent: {
    flex: 1,
  },
  notifTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  notifMessage: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 8,
    lineHeight: 20,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  timeText: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  urgentBadge: {
    marginRight: 8,
  },
  dotIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#F44336',
  },
  skeletonBox: {
    backgroundColor: '#E0E0E0',
    borderRadius: 4,
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