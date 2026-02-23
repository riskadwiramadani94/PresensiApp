import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator, Linking, Platform, TextInput, Modal, Animated, PanResponder } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppHeader } from '../../../components';
import { PegawaiAPI } from '../../../constants/config';

type StatusType = 'semua' | 'akan_datang' | 'berlangsung' | 'selesai';

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
          <View style={styles.cardLeft}>
            <Text style={styles.cardTitle}>{item.nama_kegiatan}</Text>
            <Text style={styles.cardSubtitle}>{item.nomor_spt}</Text>
            <Text style={styles.cardDate}>
              {formatDate(item.tanggal_mulai)} - {formatDate(item.tanggal_selesai)}
            </Text>
          </View>
          <View style={styles.cardRight}>
            <View style={[styles.statusBadge, { backgroundColor: status.color + '20' }]}>
              <Ionicons name={status.icon as any} size={12} color={status.color} />
              <Text style={[styles.statusText, { color: status.color }]}>
                {status.label}
              </Text>
            </View>
          </View>
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
        <View style={styles.searchBox}>
          <Ionicons name="search" size={20} color="#9CA3AF" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Cari kegiatan, nomor SPT..."
            placeholderTextColor="#9CA3AF"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
        <TouchableOpacity style={styles.filterButton} onPress={openFilterModal}>
          <Ionicons name="options" size={20} color="#004643" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#004643" />
          <Text style={styles.loadingText}>Memuat kegiatan...</Text>
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
              <Text style={styles.modalTitle}>Filter Status Kegiatan</Text>
              
              <View style={styles.filterGrid}>
                {[
                  { value: 'semua', label: 'Semua', icon: 'apps' },
                  { value: 'akan_datang', label: 'Akan Datang', icon: 'time' },
                  { value: 'berlangsung', label: 'Berlangsung', icon: 'radio-button-on' },
                  { value: 'selesai', label: 'Selesai', icon: 'checkmark-circle' }
                ].map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.filterChip,
                      activeTab === option.value && styles.filterChipActive
                    ]}
                    onPress={() => handleFilterSelect(option.value as StatusType)}
                  >
                    <Ionicons 
                      name={option.icon as any} 
                      size={18} 
                      color={activeTab === option.value ? '#fff' : '#666'} 
                    />
                    <Text style={[
                      styles.filterChipText,
                      activeTab === option.value && styles.filterChipTextActive
                    ]}>
                      {option.label}
                    </Text>
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
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    gap: 8,
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 40,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#1F2937',
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
    paddingTop: 15,
    paddingBottom: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: '#666',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    marginBottom: 12,
    marginHorizontal: 15,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardLeft: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 13,
    color: '#666',
    marginBottom: 4,
  },
  cardDate: {
    fontSize: 13,
    color: '#666',
  },
  cardRight: {
    alignItems: 'flex-end',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  statusText: {
    fontSize: 10,
    fontWeight: 'bold',
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
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
  },
  filterGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  filterChip: {
    width: '48%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#E0E0E0',
  },
  filterChipActive: {
    backgroundColor: '#004643',
    borderColor: '#004643',
  },
  filterChipText: {
    fontSize: 13,
    color: '#666',
    fontWeight: '600',
  },
  filterChipTextActive: {
    color: '#fff',
  },
});
