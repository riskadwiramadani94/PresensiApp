import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, Linking, Platform, TextInput, Modal, Animated, PanResponder } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppHeader } from '../../../components';
import { PegawaiAPI } from '../../../constants/config';

type StatusType = 'semua' | 'akan_datang' | 'berlangsung' | 'selesai' | 'dibatalkan';

export default function KegiatanScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<StatusType>('semua');
  const [kegiatanList, setKegiatanList] = useState<any[]>([]);
  const [filteredKegiatan, setFilteredKegiatan] = useState<any[]>([]);
  const [userId, setUserId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilterModal, setShowFilterModal] = useState(false);
  const translateY = useRef(new Animated.Value(500)).current;

  useEffect(() => {
    loadUserId();
  }, []);

  useEffect(() => {
    if (userId) {
      fetchKegiatan();
    }
  }, [userId]);

  useEffect(() => {
    filterKegiatan();
  }, [activeTab, kegiatanList, searchQuery]);

  const loadUserId = async () => {
    try {
      const userData = await AsyncStorage.getItem('userData');
      if (userData) {
        const user = JSON.parse(userData);
        const id = user.id_user || user.id;
        console.log('User ID loaded:', id);
        setUserId(id.toString());
      } else {
        console.error('User data not found in AsyncStorage');
        setLoading(false);
      }
    } catch (error) {
      console.error('Error loading user ID:', error);
      setLoading(false);
    }
  };

  /* ========================================
     API ENDPOINTS CONFIGURATION
  ======================================== */
  const fetchKegiatan = async () => {
    try {
      setLoading(true);
      console.log('Fetching kegiatan for user:', userId);
      const response = await PegawaiAPI.getKegiatan(userId);
      console.log('Kegiatan response:', response);
      
      if (response.success && response.data) {
        setKegiatanList(response.data);
        console.log('Kegiatan loaded:', response.data.length, 'items');
      } else {
        console.log('No kegiatan data or failed:', response.message);
        // Fallback: tampilkan empty state
        setKegiatanList([]);
      }
    } catch (error) {
      console.error('Error fetching kegiatan:', error);
      // Fallback: tampilkan empty state
      setKegiatanList([]);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchKegiatan();
    setRefreshing(false);
  };

  const openFilterModal = () => {
    setShowFilterModal(true);
    Animated.timing(translateY, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  const closeFilterModal = () => {
    Animated.timing(translateY, {
      toValue: 500,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setShowFilterModal(false);
    });
  };

  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: (_, gestureState) => {
      return gestureState.dy > 5;
    },
    onPanResponderMove: (_, gestureState) => {
      if (gestureState.dy > 0) {
        translateY.setValue(gestureState.dy);
      }
    },
    onPanResponderRelease: (_, gestureState) => {
      if (gestureState.dy > 100) {
        closeFilterModal();
      } else {
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: true,
        }).start();
      }
    },
  });

  const handleFilterSelect = (filter: StatusType) => {
    setActiveTab(filter);
    closeFilterModal();
  };

  const filterKegiatan = () => {
    let filtered = kegiatanList;

    // Filter by status
    if (activeTab !== 'semua') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      filtered = filtered.filter((item) => {
        // Cek status dari database terlebih dahulu
        if (item.status === 'dibatalkan') {
          return activeTab === 'dibatalkan';
        }
        if (item.status === 'selesai') {
          return activeTab === 'selesai';
        }
        
        // Jika status aktif, filter berdasarkan tanggal
        const mulai = new Date(item.tanggal_mulai);
        const selesai = new Date(item.tanggal_selesai);
        mulai.setHours(0, 0, 0, 0);
        selesai.setHours(23, 59, 59, 999);

        if (activeTab === 'akan_datang') {
          return mulai > today;
        } else if (activeTab === 'berlangsung') {
          return today >= mulai && today <= selesai;
        } else if (activeTab === 'selesai') {
          return selesai < today;
        }
        return true;
      });
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((item) => 
        item.nama_kegiatan.toLowerCase().includes(query) ||
        item.nomor_spt.toLowerCase().includes(query) ||
        getJenisDinasLabel(item.jenis_dinas).toLowerCase().includes(query)
      );
    }

    setFilteredKegiatan(filtered);
  };

  const getStatusInfo = (item: any) => {
    // Cek status dari database terlebih dahulu
    if (item.status === 'dibatalkan') {
      return { label: 'Dibatalkan', color: '#F44336', icon: 'close-circle' };
    }
    if (item.status === 'selesai') {
      return { label: 'Selesai', color: '#2196F3', icon: 'checkmark-circle' };
    }
    
    // Jika status aktif, hitung berdasarkan tanggal
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const mulai = new Date(item.tanggal_mulai);
    const selesai = new Date(item.tanggal_selesai);
    mulai.setHours(0, 0, 0, 0);
    selesai.setHours(23, 59, 59, 999);

    if (today >= mulai && today <= selesai) {
      return { label: 'Berlangsung', color: '#4CAF50', icon: 'radio-button-on' };
    } else if (mulai > today) {
      return { label: 'Akan Datang', color: '#FF9800', icon: 'time' };
    } else {
      return { label: 'Selesai', color: '#2196F3', icon: 'checkmark-circle' };
    }
  };

  const getJenisDinasLabel = (jenis: string) => {
    switch (jenis) {
      case 'lokal': return 'Dinas Lokal';
      case 'luar_kota': return 'Dinas Luar Kota';
      case 'luar_negeri': return 'Dinas Luar Negeri';
      default: return jenis;
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const handleDetailPress = (item: any) => {
    router.push({
      pathname: '/menu-pegawai/kegiatan/detail',
      params: { id: item.id }
    });
  };

  const renderKegiatanCard = (item: any) => {
    const status = getStatusInfo(item);
    
    return (
      <TouchableOpacity
        key={item.id}
        style={styles.card}
        onPress={() => handleDetailPress(item)}
        activeOpacity={0.7}
      >
        <View style={styles.cardHeader}>
          <View style={styles.cardTitle}>
            <Text style={styles.kegiatanName}>{item.nama_kegiatan}</Text>
            <Text style={styles.sptNumber}>{item.nomor_spt}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: status.color + '20' }]}>
            <Text style={[styles.statusText, { color: status.color }]}>
              {status.label}
            </Text>
          </View>
        </View>

        <View style={styles.cardInfo}>
          <View style={styles.infoRow}>
            <View style={styles.infoIconBox}>
              <Ionicons name="calendar-outline" size={16} color="#00695C" />
            </View>
            <Text style={styles.infoText}>
              {formatDate(item.tanggal_mulai)} - {formatDate(item.tanggal_selesai)}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <View style={styles.infoIconBox}>
              <Ionicons name="business-outline" size={16} color="#00695C" />
            </View>
            <Text style={styles.infoText}>
              {getJenisDinasLabel(item.jenis_dinas)}
            </Text>
          </View>
        </View>

        <View style={styles.cardFooter}>
          <View style={styles.footerLeft}>
            <Ionicons name="briefcase-outline" size={20} color="#64748B" />
            <Text style={styles.footerText}>Kegiatan Dinas</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#CBD5E1" />
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" translucent={true} backgroundColor="transparent" />
      
      <AppHeader title="Kegiatan Dinas" showBack={true} />

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputWrapper}>
          <Ionicons name="search-outline" size={20} color="#666" />
          <TextInput
            style={styles.searchInput}
            placeholder="Cari Kegiatan..."
            placeholderTextColor="#999"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery("")}>
              <Ionicons name="close-circle" size={20} color="#999" />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity style={styles.filterButton} onPress={openFilterModal}>
          <Ionicons name="options" size={20} color="#004643" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.content}>
          {[1, 2, 3, 4, 5].map((item) => (
            <View key={item} style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.cardTitle}>
                  <View style={[styles.skeletonText, { width: '70%', height: 16, marginBottom: 6 }]} />
                  <View style={[styles.skeletonText, { width: '40%', height: 11 }]} />
                </View>
                <View style={[styles.skeletonText, { width: 70, height: 24, borderRadius: 8 }]} />
              </View>
              <View style={styles.cardInfo}>
                <View style={styles.infoRow}>
                  <View style={[styles.skeletonText, { width: 28, height: 28, borderRadius: 10, marginRight: 10 }]} />
                  <View style={[styles.skeletonText, { flex: 1, height: 13 }]} />
                </View>
                <View style={styles.infoRow}>
                  <View style={[styles.skeletonText, { width: 28, height: 28, borderRadius: 10, marginRight: 10 }]} />
                  <View style={[styles.skeletonText, { flex: 1, height: 13 }]} />
                </View>
              </View>
              <View style={styles.cardFooter}>
                <View style={[styles.skeletonText, { width: '50%', height: 12 }]} />
              </View>
            </View>
          ))}
        </View>
      ) : (
        <ScrollView
          style={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#004643']} />
          }
        >
          {filteredKegiatan.length > 0 ? (
            filteredKegiatan.map((item) => renderKegiatanCard(item))
          ) : (
            <View style={styles.emptyContainer}>
              <Ionicons name="document-text-outline" size={64} color="#E0E0E0" />
              <Text style={styles.emptyTitle}>Belum Ada Kegiatan Dinas</Text>
              <Text style={styles.emptySubtitle}>
                {activeTab === 'semua'
                  ? 'Anda belum memiliki jadwal kegiatan dinas'
                  : activeTab === 'dibatalkan'
                    ? 'Tidak ada kegiatan yang dibatalkan'
                    : `Tidak ada kegiatan dengan status "${activeTab.replace('_', ' ')}"`}
              </Text>
            </View>
          )}
        </ScrollView>
      )}

      {/* Filter Modal */}
      <Modal visible={showFilterModal} transparent animationType="none" statusBarTranslucent={true} onRequestClose={closeFilterModal}>
        <View style={styles.modalOverlay}>
          <TouchableOpacity 
            style={styles.modalBackdrop} 
            activeOpacity={1}
            onPress={closeFilterModal}
          />
          <Animated.View style={[styles.bottomSheetModal, { transform: [{ translateY }] }]}>
            <View {...panResponder.panHandlers} style={styles.handleContainer}>
              <View style={styles.handleBar} />
            </View>
            
            <View style={styles.bottomSheetContent}>
              <Text style={styles.modalTitle}>Pilih Status</Text>
              
              <View style={styles.filterList}>
                {[
                  { value: 'semua', label: 'Semua Status', icon: 'apps' },
                  { value: 'akan_datang', label: 'Akan Datang', icon: 'time' },
                  { value: 'berlangsung', label: 'Sedang Berlangsung', icon: 'play-circle' },
                  { value: 'selesai', label: 'Selesai', icon: 'checkmark-circle' },
                  { value: 'dibatalkan', label: 'Dibatalkan', icon: 'close-circle' }
                ].map((option, index, array) => (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.filterOption,
                      index === array.length - 1 && styles.filterOptionLast,
                    ]}
                    onPress={() => handleFilterSelect(option.value as StatusType)}
                  >
                    <View style={styles.filterOptionLeft}>
                      <Ionicons
                        name={option.icon as any}
                        size={20}
                        color={activeTab === option.value ? "#004643" : "#999"}
                      />
                      <Text
                        style={[
                          styles.filterOptionText,
                          activeTab === option.value && styles.filterOptionTextActive,
                        ]}
                      >
                        {option.label}
                      </Text>
                    </View>
                    {activeTab === option.value && (
                      <View style={styles.filterCheck}>
                        <Ionicons name="checkmark" size={18} color="#004643" />
                      </View>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </Animated.View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  searchContainer: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
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
    fontWeight: '400',
  },
  filterButton: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    paddingTop: 10,
    backgroundColor: '#fff',
  },
  skeleton: {
    backgroundColor: '#E0E0E0',
    overflow: 'hidden',
  },
  skeletonText: {
    backgroundColor: '#E0E0E0',
    borderRadius: 4,
  },
  card: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    marginHorizontal: 20,
    marginTop: 2,
    borderWidth: 1,
    borderColor: '#F0F3F3',
    shadowColor: '#004643',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  cardTitle: { flex: 1, marginRight: 10 },
  kegiatanName: { fontSize: 16, fontWeight: '700', color: '#1E293B', marginBottom: 6 },
  sptNumber: { fontSize: 11, color: '#64748B', fontWeight: '600', letterSpacing: 0.5 },
  cardInfo: { marginBottom: 0 },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  infoIconBox: {
    width: 28,
    height: 28,
    backgroundColor: '#F0F7F7',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  infoText: {
    fontSize: 13,
    color: '#475569',
    flex: 1,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    marginHorizontal: -14,
    marginBottom: -14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginTop: 12,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
  },
  footerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  footerText: {
    fontSize: 12,
    color: '#64748B',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#999',
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingTop: Platform.OS === 'android' ? 0 : 50,
  },
  modalBackdrop: {
    flex: 1,
  },
  bottomSheetModal: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    paddingTop: 8,
  },
  handleContainer: {
    paddingVertical: 12,
    alignItems: 'center',
    width: '100%',
  },
  handleBar: {
    width: 40,
    height: 4,
    backgroundColor: '#DDD',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 8,
    marginBottom: 16,
  },
  bottomSheetContent: {
    paddingHorizontal: 0,
    paddingBottom: 16,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 16,
    paddingHorizontal: 20,
  },
  filterList: {
    backgroundColor: '#fff',
  },
  filterOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 0.5,
    borderBottomColor: '#E5E5E5',
  },
  filterOptionLast: {
    borderBottomWidth: 0,
  },
  filterOptionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  filterOptionText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '400',
  },
  filterOptionTextActive: {
    color: '#004643',
    fontWeight: '500',
  },
  filterCheck: {
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
