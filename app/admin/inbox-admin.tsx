/* ========================================
   KOTAK MASUK ADMIN
   • Item yang memerlukan validasi/approval
   • Absen Dinas (menunggu validasi)
   • Pengajuan (menunggu persetujuan)
======================================== */

import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { AppHeader } from '../../components';
import { InboxAPI } from '../../constants/config';
import { AuthStorage } from '../../utils/AuthStorage';

/* ========================================
   TYPES & INTERFACES
======================================== */
interface InboxItem {
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

/* ========================================
   MAIN COMPONENT
======================================== */
export default function InboxAdmin() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [inboxData, setInboxData] = useState<InboxItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  /* ========================================
     DATA FETCHING
  ======================================== */
  useFocusEffect(
    useCallback(() => {
      fetchInboxData();
    }, [])
  );

  const fetchInboxData = async () => {
    try {
      setLoading(true);
      const user = await AuthStorage.getUser();
      
      if (!user) return;

      // Menggunakan InboxAPI yang baru
      const data = await InboxAPI.getNotifications(user.id_user || user.id, 'admin');

      if (data.success && data.data) {
        setInboxData(data.data);
        setUnreadCount(data.unread_count || 0);
      } else {
        setInboxData([]);
        setUnreadCount(0);
      }
    } catch (error) {
      console.error('Error fetching inbox:', error);
      setInboxData([]);
      setUnreadCount(0);
    } finally {
      setLoading(false);
    }
  };

  /* ========================================
     UTILITY FUNCTIONS
  ======================================== */
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
     EVENT HANDLERS
  ======================================== */
  const onRefresh = async () => {
    setRefreshing(true);
    await fetchInboxData();
    setRefreshing(false);
  };

  const handleItemPress = (item: InboxItem) => {
    // Navigate berdasarkan reference_type
    if (item.reference_type === 'pengajuan') {
      router.push('/menu-admin/pengajuan?initialTab=pengajuan' as any);
    } else if (item.reference_type === 'presensi') {
      router.push('/admin/tracking-pegawai' as any);
    } else if (item.reference_type === 'dinas') {
      router.push('/menu-admin/kelola-dinas' as any);
    }
  };

  /* ========================================
     RENDER FUNCTIONS
  ======================================== */
  const renderInboxItem = ({ item }: { item: InboxItem }) => {
    const priorityColor = getPriorityColor(item.priority);
    const iconName = getPriorityIcon(item.type, item.icon);
    const isUrgent = item.priority === 'urgent';

    return (
      <TouchableOpacity
        style={[styles.inboxCard, item.is_read && styles.readCard]}
        onPress={() => handleItemPress(item)}
        activeOpacity={0.7}
      >
        <View style={[
          styles.iconCircle,
          { backgroundColor: priorityColor },
          item.is_read && styles.iconRead
        ]}>
          <Ionicons 
            name={iconName as any} 
            size={24} 
            color="#fff" 
          />
        </View>

        <View style={styles.content}>
          <View style={styles.titleRow}>
            <Text style={[styles.title, isUrgent && styles.urgentTitle]}>
              {item.title}
            </Text>
            {isUrgent && (
              <View style={styles.urgentBadge}>
                <Text style={styles.urgentText}>URGENT</Text>
              </View>
            )}
          </View>
          <Text style={styles.subtitle} numberOfLines={2}>
            {item.message}
          </Text>
          <View style={styles.timeRow}>
            <Ionicons name="time-outline" size={14} color="#9CA3AF" />
            <Text style={styles.timeText}>
              {new Date(item.time).toLocaleString('id-ID', {
                day: 'numeric',
                month: 'short',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </Text>
            <Text style={[styles.priorityText, { color: priorityColor }]}>
              • {item.priority.toUpperCase()}
            </Text>
          </View>
        </View>

        {!item.is_read && <View style={[styles.dotIndicator, { backgroundColor: priorityColor }]} />}
        <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
      </TouchableOpacity>
    );
  };

  /* ========================================
     MAIN RENDER
  ======================================== */
  return (
    <View style={styles.container}>
      <StatusBar style="light" translucent={true} backgroundColor="transparent" />
      
      <AppHeader 
        title={unreadCount > 0 ? `Kotak Masuk (${unreadCount})` : 'Kotak Masuk'}
        showBack={false}
      />
      
      {loading ? (
        <View style={styles.listContent}>
          {/* ========================================
               SKELETON LOADING STATE - KOTAK MASUK
          ======================================== */}
          {[1, 2, 3, 4, 5].map((item) => (
            <View key={item} style={styles.skeletonCard}>
              <View style={styles.skeletonIcon} />
              <View style={styles.skeletonContent}>
                <View style={styles.skeletonTitle} />
                <View style={styles.skeletonSubtitle} />
                <View style={styles.skeletonTime} />
              </View>
              <View style={styles.skeletonChevron} />
            </View>
          ))}
        </View>
      ) : (
        <FlatList
          data={inboxData}
          keyExtractor={(item) => item.id}
          renderItem={renderInboxItem}
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
                Semua validasi dan pengajuan sudah ditindaklanjuti
              </Text>
            </View>
          )}
        />
      )}
    </View>
  );
}

/* ========================================
   STYLES
======================================== */
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
  inboxCard: {
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
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },

  iconProcessed: {
    opacity: 0.6,
  },
  processedCard: {
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
  },
  dotIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  subtitle: {
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

  /* ========================================
     SKELETON STYLES - KOTAK MASUK
  ======================================== */
  skeletonCard: {
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
  skeletonIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E5E7EB',
    marginRight: 12,
  },
  skeletonContent: {
    flex: 1,
  },
  skeletonTitle: {
    width: '70%',
    height: 15,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    marginBottom: 4,
  },
  skeletonSubtitle: {
    width: '50%',
    height: 13,
    backgroundColor: '#F3F4F6',
    borderRadius: 4,
    marginBottom: 2,
  },
  skeletonTime: {
    width: '40%',
    height: 12,
    backgroundColor: '#F3F4F6',
    borderRadius: 4,
    marginTop: 4,
  },
  skeletonChevron: {
    width: 20,
    height: 20,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
  },
});
