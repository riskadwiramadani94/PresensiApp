/* ========================================
   KOTAK MASUK ADMIN
   • Item yang memerlukan validasi/approval
   • Absen Dinas (menunggu validasi)
   • Pengajuan (menunggu persetujuan)
======================================== */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl, TextInput, Animated, PanResponder, Modal, Dimensions } from 'react-native';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
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
  const unreadCount = inboxData.filter(n => !n.is_read).length;
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('semua');
  const [showFilterModal, setShowFilterModal] = useState(false);
  const filterTranslateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;

  const filterPanResponder = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: (_, g) => g.dy > 5,
    onPanResponderMove: (_, g) => { if (g.dy > 0) filterTranslateY.setValue(g.dy); },
    onPanResponderRelease: (_, g) => {
      if (g.dy > 100) closeFilterModal();
      else Animated.spring(filterTranslateY, { toValue: 0, useNativeDriver: true }).start();
    },
  })).current;

  const openFilterModal = () => {
    setShowFilterModal(true);
    Animated.spring(filterTranslateY, { toValue: 0, useNativeDriver: true, tension: 65, friction: 11 }).start();
  };

  const closeFilterModal = () => {
    Animated.timing(filterTranslateY, { toValue: SCREEN_HEIGHT, duration: 250, useNativeDriver: true })
      .start(() => setShowFilterModal(false));
  };

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

      const data = await InboxAPI.getNotifications(user.id_user || user.id, 'admin');

      if (data.success && data.data) {
        setInboxData(prev => {
          const localReadIds = new Set(prev.filter(n => n.is_read).map(n => n.id));
          return data.data.map((n: InboxItem) => ({
            ...n,
            is_read: n.is_read || localReadIds.has(n.id),
          }));
        });
      } else {
        setInboxData([]);
      }
    } catch (error) {
      console.error('Error fetching inbox:', error);
      setInboxData([]);
    } finally {
      setLoading(false);
    }
  };

  const FILTER_OPTIONS = [
    { value: 'semua', label: 'Semua', icon: 'apps' },
    { value: 'belum_dibaca', label: 'Belum Dibaca', icon: 'ellipse' },
    { value: 'absen', label: 'Absen', icon: 'log-in' },
    { value: 'pengajuan', label: 'Pengajuan', icon: 'document-text' },
    { value: 'dinas', label: 'Dinas', icon: 'briefcase' },
  ];

  const getFilteredData = () => {
    let data = [...inboxData];
    if (activeFilter === 'belum_dibaca') data = data.filter(i => !i.is_read);
    else if (activeFilter === 'absen') data = data.filter(i => ['absen_masuk','absen_pulang','absen_dinas_masuk','absen_dinas_pulang'].includes(i.type));
    else if (activeFilter === 'pengajuan') data = data.filter(i => ['pengajuan_baru','pengajuan_approved','pengajuan_rejected'].includes(i.type));
    else if (activeFilter === 'dinas') data = data.filter(i => ['dinas_assigned','dinas_cancelled','validasi_absen_dinas_approved','validasi_absen_dinas_rejected'].includes(i.type));
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      data = data.filter(i => i.title.toLowerCase().includes(q) || i.message.toLowerCase().includes(q));
    }
    return data;
  };

  const activeFilterCount = activeFilter !== 'semua' ? 1 : 0;

  /* ========================================
     UTILITY FUNCTIONS
  ======================================== */
  const getTypeColor = (type: string) => {
    switch (type) {
      case 'absen_masuk':
      case 'absen_pulang':                      return '#2196F3'; // biru - aktivitas absen
      case 'absen_dinas_masuk':
      case 'absen_dinas_pulang':                return '#00BCD4'; // cyan - dinas
      case 'pengajuan_baru':                    return '#FF9800'; // oranye - butuh tindakan
      case 'pengajuan_approved':
      case 'validasi_absen_dinas_approved':     return '#4CAF50'; // hijau - disetujui
      case 'pengajuan_rejected':
      case 'validasi_absen_dinas_rejected':     return '#F44336'; // merah - ditolak
      case 'dinas_assigned':                    return '#9C27B0'; // ungu - penugasan baru
      case 'dinas_cancelled':                   return '#9E9E9E'; // abu - dibatalkan
      default:                                  return '#6B7280';
    }
  };

  const getTypeIcon = (type: string, icon: string) => {
    const typeIconMap: { [key: string]: string } = {
      'absen_masuk':                      'log-in',
      'absen_pulang':                     'log-out',
      'absen_dinas_masuk':                'airplane',
      'absen_dinas_pulang':               'airplane',
      'pengajuan_baru':                   'document-text',
      'pengajuan_approved':               'checkmark-circle',
      'pengajuan_rejected':               'close-circle',
      'dinas_assigned':                   'briefcase',
      'dinas_cancelled':                  'close-circle',
      'validasi_absen_dinas_approved':    'checkmark-circle',
      'validasi_absen_dinas_rejected':    'close-circle',
    };
    return typeIconMap[type] || icon || 'notifications';
  };

  /* ========================================
     EVENT HANDLERS
  ======================================== */
  const onRefresh = async () => {
    setRefreshing(true);
    await fetchInboxData();
    setRefreshing(false);
  };

  const markAllAsRead = async () => {
    try {
      const user = await AuthStorage.getUser();
      if (!user) return;
      await InboxAPI.markAllAsRead(user.id_user || user.id);
      setInboxData(prev => prev.map(n => ({ ...n, is_read: true })));
    } catch {}
  };

  const handleItemPress = (item: InboxItem) => {
    // Mark as read - fire and forget
    AuthStorage.getUser().then(user => {
      if (user) {
        const notifId = item.id.replace('notif-', '');
        InboxAPI.markAsRead(notifId, user.id_user || user.id).catch(() => {});
        setInboxData(prev => prev.map(n => n.id === item.id ? { ...n, is_read: true } : n));
      }
    });

    const type = item.type;

    if (type === 'absen_masuk' || type === 'absen_pulang' ||
        type === 'absen_dinas_masuk' || type === 'absen_dinas_pulang') {
      router.push('/admin/tracking-pegawai' as any);
    } else if (type === 'pengajuan_baru' || type === 'pengajuan_approved' || type === 'pengajuan_rejected' || type === 'pengajuan' || type === 'approval') {
      router.push('/menu-admin/pengajuan' as any);
    } else if (type === 'dinas_assigned' || type === 'dinas_cancelled') {
      router.push('/menu-admin/kelola-dinas' as any);
    } else if (type === 'validasi_absen_dinas_approved' || type === 'validasi_absen_dinas_rejected') {
      router.push('/admin/tracking-pegawai' as any);
    } else if (item.reference_type === 'pengajuan') {
      router.push('/menu-admin/pengajuan' as any);
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
    const priorityColor = getTypeColor(item.type);
    const iconName = getTypeIcon(item.type, item.icon);
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

      {/* Search & Filter */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputWrapper}>
          <Ionicons name="search-outline" size={20} color="#666" />
          <TextInput
            style={styles.searchInput}
            placeholder="Cari notifikasi..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#999"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color="#999" />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity style={styles.filterIconBtn} onPress={openFilterModal}>
          <Ionicons name="options" size={20} color="#004643" />
          {activeFilterCount > 0 && (
            <View style={styles.filterBadge}>
              <Text style={styles.filterBadgeText}>{activeFilterCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Baca Semua */}
      <TouchableOpacity style={styles.readAllBtn} onPress={unreadCount > 0 ? markAllAsRead : undefined}>
        <Ionicons name="checkmark-done" size={16} color={unreadCount > 0 ? '#004643' : '#999'} />
        <Text style={[styles.readAllText, unreadCount === 0 && { color: '#999' }]}>Baca Semua ({unreadCount})</Text>
      </TouchableOpacity>

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
          data={getFilteredData()}
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

      {/* Filter Modal */}
      <Modal visible={showFilterModal} transparent animationType="none" statusBarTranslucent onRequestClose={closeFilterModal}>
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={closeFilterModal} />
          <Animated.View style={[styles.filterSheet, { transform: [{ translateY: filterTranslateY }] }]}>
            <View {...filterPanResponder.panHandlers} style={styles.handleContainer}>
              <View style={styles.handleBar} />
            </View>
            <View style={styles.filterHeader}>
              <Text style={styles.filterTitle}>Filter</Text>
              <TouchableOpacity onPress={() => setActiveFilter('semua')}>
                <Text style={styles.resetText}>Reset</Text>
              </TouchableOpacity>
            </View>
            {FILTER_OPTIONS.map((opt, i, arr) => (
              <TouchableOpacity
                key={opt.value}
                style={[styles.filterOption, i === arr.length - 1 && { borderBottomWidth: 0 }]}
                onPress={() => { setActiveFilter(opt.value); closeFilterModal(); }}
              >
                <View style={styles.filterOptionLeft}>
                  <Ionicons name={opt.icon as any} size={20} color={activeFilter === opt.value ? '#004643' : '#999'} />
                  <Text style={[styles.filterOptionText, activeFilter === opt.value && styles.filterOptionTextActive]}>{opt.label}</Text>
                </View>
                {activeFilter === opt.value && <Ionicons name="checkmark" size={18} color="#004643" />}
              </TouchableOpacity>
            ))}
          </Animated.View>
        </View>
      </Modal>
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    backgroundColor: '#F8FAFC',
    gap: 10,
  },
  searchInputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 14,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#E8F0EF',
    gap: 12,
    shadowColor: '#004643',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#333',
    paddingVertical: 14,
  },
  filterIconBtn: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#004643',
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterBadgeText: { color: '#fff', fontSize: 9, fontWeight: '700' },
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
  modalBackdrop: { flex: 1 },
  filterSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 30,
  },
  handleContainer: { paddingVertical: 12, alignItems: 'center' },
  handleBar: { width: 40, height: 4, backgroundColor: '#DDD', borderRadius: 2 },
  filterHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginBottom: 8 },
  filterTitle: { fontSize: 16, fontWeight: '600', color: '#1a1a1a' },
  resetText: { fontSize: 14, color: '#F44336', fontWeight: '500' },
  filterOption: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, paddingHorizontal: 20, borderBottomWidth: 0.5, borderBottomColor: '#E5E5E5' },
  filterOptionLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  filterOptionText: { fontSize: 15, color: '#333' },
  filterOptionTextActive: { color: '#004643', fontWeight: '500' },
  readAllBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 16, paddingVertical: 8,
    alignSelf: 'flex-end', marginRight: 16, marginBottom: 4,
  },
  readAllText: { fontSize: 13, color: '#004643', fontWeight: '600' },
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
