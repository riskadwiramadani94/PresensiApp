import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, Modal, Animated, PanResponder, Platform, TextInput, Alert } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppHeader, CustomAlert } from '../../../components';
import { PegawaiAPI, API_CONFIG, getApiUrl } from '../../../constants/config';
import { useCustomAlert } from '../../../hooks/useCustomAlert';

type StatusType = 'semua' | 'menunggu' | 'disetujui' | 'ditolak';

interface PengajuanData {
  id_pengajuan: number;
  jenis_pengajuan: string;
  tanggal_mulai: string;
  tanggal_selesai?: string;
  jam_mulai?: string;
  jam_selesai?: string;
  alasan_text: string;
  status: 'menunggu' | 'disetujui' | 'ditolak';
  tanggal_pengajuan: string;
  waktu_persetujuan?: string;
  catatan_persetujuan?: string;
  is_retrospektif?: number;
  disetujui_oleh?: number;
  nama_approver?: string;
}

export default function PengajuanScreen() {
  const router = useRouter();
  const alert = useCustomAlert();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<StatusType>('semua');
  const [pengajuanList, setPengajuanList] = useState<PengajuanData[]>([]);
  const [filteredPengajuan, setFilteredPengajuan] = useState<PengajuanData[]>([]);
  const [userId, setUserId] = useState<string>('');
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedPengajuan, setSelectedPengajuan] = useState<PengajuanData | null>(null);
  const translateY = useRef(new Animated.Value(500)).current;
  const detailTranslateY = useRef(new Animated.Value(1000)).current;
  const detailPanResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: (_, gestureState) => gestureState.dy > 5,
    onPanResponderMove: (_, gestureState) => {
      if (gestureState.dy > 0) {
        detailTranslateY.setValue(gestureState.dy);
      }
    },
    onPanResponderRelease: (_, gestureState) => {
      if (gestureState.dy > 100) {
        closeDetailModal();
      } else {
        Animated.spring(detailTranslateY, {
          toValue: 0,
          useNativeDriver: true,
        }).start();
      }
    },
  });

  useEffect(() => {
    loadUserId();
  }, []);

  useEffect(() => {
    if (userId) {
      fetchPengajuan();
    }
  }, [userId]);

  useEffect(() => {
    filterPengajuan();
  }, [activeTab, pengajuanList, searchQuery]);

  const loadUserId = async () => {
    try {
      const userData = await AsyncStorage.getItem('userData');
      if (userData) {
        const user = JSON.parse(userData);
        const id = user.id_user || user.id;
        setUserId(id.toString());
      } else {
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
  const fetchPengajuan = async () => {
    try {
      setLoading(true);
      const response = await PegawaiAPI.getPengajuan(userId);
      
      if (response.success && response.data) {
        setPengajuanList(response.data);
      } else {
        setPengajuanList([]);
      }
    } catch (error) {
      console.error('Error fetching pengajuan:', error);
      setPengajuanList([]);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchPengajuan();
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

  const openDetailModal = (item: PengajuanData) => {
    setSelectedPengajuan(item);
    setShowDetailModal(true);
    Animated.spring(detailTranslateY, {
      toValue: 0,
      useNativeDriver: true,
      tension: 65,
      friction: 11
    }).start();
  };

  const closeDetailModal = () => {
    Animated.timing(detailTranslateY, {
      toValue: 1000,
      duration: 250,
      useNativeDriver: true,
    }).start(() => {
      setShowDetailModal(false);
      setSelectedPengajuan(null);
    });
  };

  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: (_, gestureState) => gestureState.dy > 5,
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

  const filterPengajuan = () => {
    let filtered = pengajuanList;
    if (activeTab !== 'semua') {
      filtered = filtered.filter((item) => item.status === activeTab);
    }
    
    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((item) => 
        getJenisPengajuanLabel(item.jenis_pengajuan).toLowerCase().includes(query) ||
        item.alasan_text.toLowerCase().includes(query) ||
        formatDate(item.tanggal_mulai).includes(query)
      );
    }
    
    setFilteredPengajuan(filtered);
  };

  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'menunggu':
        return { label: 'Menunggu', color: '#FF9800', icon: 'time' };
      case 'disetujui':
        return { label: 'Disetujui', color: '#4CAF50', icon: 'checkmark-circle' };
      case 'ditolak':
        return { label: 'Ditolak', color: '#F44336', icon: 'close-circle' };
      default:
        return { label: status, color: '#999', icon: 'help-circle' };
    }
  };

  const getJenisPengajuanLabel = (jenis: string) => {
    const labels: { [key: string]: string } = {
      'izin_datang_terlambat': 'Izin Datang Terlambat',
      'izin_pulang_cepat': 'Izin Pulang Cepat',
      'cuti_sakit': 'Cuti Sakit',
      'cuti_alasan_penting': 'Cuti Alasan Penting',
      'cuti_tahunan': 'Cuti Tahunan',
      'lembur': 'Lembur'
    };
    return labels[jenis] || jenis;
  };

  const getJenisIcon = (jenis: string) => {
    const icons: { [key: string]: string } = {
      'izin_datang_terlambat': 'time-outline',
      'izin_pulang_cepat': 'exit-outline',
      'cuti_sakit': 'medical-outline',
      'cuti_alasan_penting': 'calendar-outline',
      'cuti_tahunan': 'calendar-outline',
      'lembur': 'moon-outline'
    };
    return icons[jenis] || 'document-text-outline';
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const formatDateTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${day}/${month}/${year} ${hours}:${minutes}`;
  };

  const formatTime = (timeStr: string) => {
    if (!timeStr) return '';
    return timeStr.substring(0, 5);
  };

  const handleDeletePengajuan = async (id: number) => {
    setShowDeleteModal(false);
    try {
      const response = await fetch(`${API_CONFIG.BASE_URL}/pegawai/pengajuan/api/pengajuan/${id}`, {
        method: 'DELETE'
      });
      
      const result = await response.json();
      
      if (result.success) {
        alert.showAlert({ 
          type: 'success', 
          message: 'Pengajuan berhasil dihapus',
          autoClose: true,
          onConfirm: () => fetchPengajuan()
        });
      } else {
        alert.showAlert({ type: 'error', message: result.message || 'Gagal menghapus pengajuan' });
      }
    } catch (error) {
      console.error('Error deleting pengajuan:', error);
      alert.showAlert({ type: 'error', message: 'Terjadi kesalahan saat menghapus pengajuan' });
    }
  };

  const renderPengajuanCard = (item: PengajuanData) => {
    const status = getStatusInfo(item.status);
    const jenisLabel = getJenisPengajuanLabel(item.jenis_pengajuan);
    const jenisIcon = getJenisIcon(item.jenis_pengajuan);
    
    return (
      <TouchableOpacity 
        key={item.id_pengajuan} 
        style={styles.card}
        onPress={() => openDetailModal(item)}
        activeOpacity={0.7}
      >
        <View style={styles.cardHeader}>
          <View style={styles.iconContainer}>
            <Ionicons name={jenisIcon as any} size={24} color="#004643" />
          </View>
          <View style={styles.cardContent}>
            <Text style={styles.cardTitle}>{jenisLabel}</Text>
            <View style={styles.dateRow}>
              <Ionicons name="calendar-outline" size={14} color="#666" />
              <Text style={styles.cardDate}>
                {formatDate(item.tanggal_mulai)}
                {item.tanggal_selesai && ` - ${formatDate(item.tanggal_selesai)}`}
              </Text>
            </View>
            {(item.jam_mulai || item.jam_selesai) && (
              <View style={styles.dateRow}>
                <Ionicons name="time-outline" size={14} color="#666" />
                <Text style={styles.cardDate}>
                  {formatTime(item.jam_mulai || '')} - {formatTime(item.jam_selesai || '')}
                </Text>
              </View>
            )}
            <Text style={styles.cardAlasan} numberOfLines={2}>
              {item.alasan_text}
            </Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: status.color + '20' }]}>
            <Ionicons name={status.icon as any} size={12} color={status.color} />
            <Text style={[styles.statusText, { color: status.color }]}>
              {status.label}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" translucent={true} backgroundColor="transparent" />
      
      <AppHeader 
        title="Pengajuan" 
        showBack={true}
        showHistoryButton={true}
        onHistoryPress={() => router.push('/menu-pegawai/pengajuan/form' as any)}
        historyIcon="add"
      />

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={20} color="#9CA3AF" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Cari pengajuan..."
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
        <View style={styles.content}>
          {[1, 2, 3, 4, 5].map((item) => (
            <View key={item} style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={[styles.iconContainer, styles.skeleton]} />
                <View style={styles.cardContent}>
                  <View style={[styles.skeletonText, { width: '70%', height: 16, marginBottom: 8 }]} />
                  <View style={[styles.skeletonText, { width: '50%', height: 12, marginBottom: 6 }]} />
                  <View style={[styles.skeletonText, { width: '60%', height: 12, marginBottom: 6 }]} />
                  <View style={[styles.skeletonText, { width: '80%', height: 12 }]} />
                </View>
                <View style={[styles.statusBadge, styles.skeleton, { width: 80 }]} />
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
          {filteredPengajuan.length > 0 ? (
            filteredPengajuan.map((item) => renderPengajuanCard(item))
          ) : (
            <View style={styles.emptyContainer}>
              <Ionicons name="document-text-outline" size={64} color="#E0E0E0" />
              <Text style={styles.emptyTitle}>Belum Ada Riwayat</Text>
              <Text style={styles.emptySubtitle}>
                {activeTab === 'semua'
                  ? 'Anda belum memiliki riwayat pengajuan'
                  : `Tidak ada pengajuan dengan status "${getStatusInfo(activeTab).label}"`}
              </Text>
            </View>
          )}
        </ScrollView>
      )}

      {/* Filter Modal */}
      <Modal visible={showFilterModal} transparent animationType="none" statusBarTranslucent onRequestClose={closeFilterModal}>
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
                  { value: 'menunggu', label: 'Menunggu', icon: 'time' },
                  { value: 'disetujui', label: 'Disetujui', icon: 'checkmark-circle' },
                  { value: 'ditolak', label: 'Ditolak', icon: 'close-circle' }
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

      {/* Detail Modal - Bottom Sheet */}
      <Modal visible={showDetailModal} transparent animationType="none" statusBarTranslucent onRequestClose={closeDetailModal}>
        <View style={styles.detailModalOverlay}>
          <TouchableOpacity 
            style={styles.detailModalBackdrop} 
            activeOpacity={1}
            onPress={closeDetailModal}
          />
          <Animated.View style={[styles.detailBottomSheet, { transform: [{ translateY: detailTranslateY }] }]}>
            <View {...detailPanResponder.panHandlers} style={styles.handleContainer}>
              <View style={styles.handleBar} />
            </View>
            
            <View style={styles.detailSheetContent}>
              <Text style={styles.detailSheetTitle}>
                {selectedPengajuan && getJenisPengajuanLabel(selectedPengajuan.jenis_pengajuan)}
              </Text>

              <ScrollView style={styles.detailBody} showsVerticalScrollIndicator={false}>
                {selectedPengajuan && (
                  <>
                    {/* Info Section */}
                    <View style={styles.infoSection}>
                      <View style={styles.infoItem}>
                        <Ionicons name="calendar" size={22} color="#004643" />
                        <View style={styles.infoText}>
                          <Text style={styles.infoLabel}>Tanggal</Text>
                          <Text style={styles.infoValue}>
                            {formatDate(selectedPengajuan.tanggal_mulai)}
                            {selectedPengajuan.tanggal_selesai && `\n${formatDate(selectedPengajuan.tanggal_selesai)}`}
                          </Text>
                        </View>
                      </View>

                      {(selectedPengajuan.jam_mulai || selectedPengajuan.jam_selesai) && (
                        <View style={[styles.infoItem, { borderLeftWidth: 1, borderLeftColor: '#E5E7EB' }]}>
                          <Ionicons name="time" size={22} color="#004643" />
                          <View style={styles.infoText}>
                            <Text style={styles.infoLabel}>
                              {selectedPengajuan.jenis_pengajuan === 'izin_datang_terlambat' ? 'Datang' :
                               selectedPengajuan.jenis_pengajuan === 'izin_pulang_cepat' ? 'Pulang' :
                               selectedPengajuan.jenis_pengajuan === 'lembur' ? 'Lembur' : 'Waktu'}
                            </Text>
                            <Text style={styles.infoValue}>
                              {selectedPengajuan.jam_mulai && formatTime(selectedPengajuan.jam_mulai)}
                              {selectedPengajuan.jam_selesai && `\n${formatTime(selectedPengajuan.jam_selesai)}`}
                            </Text>
                          </View>
                        </View>
                      )}
                    </View>

                    {/* Alasan */}
                    <View style={styles.section}>
                      <Text style={styles.sectionTitle}>Alasan</Text>
                      <Text style={styles.sectionContent}>{selectedPengajuan.alasan_text}</Text>
                    </View>

                    {/* Status & Info */}
                    <View style={styles.section}>
                      <Text style={styles.sectionTitle}>Status</Text>
                      <View style={styles.statusRow}>
                        <View style={[styles.statusBadgeLarge, { 
                          backgroundColor: getStatusInfo(selectedPengajuan.status).color + '15',
                          borderColor: getStatusInfo(selectedPengajuan.status).color
                        }]}>
                          <Ionicons name={getStatusInfo(selectedPengajuan.status).icon as any} size={18} color={getStatusInfo(selectedPengajuan.status).color} />
                          <Text style={[styles.statusTextLarge, { color: getStatusInfo(selectedPengajuan.status).color }]}>
                            {getStatusInfo(selectedPengajuan.status).label}
                          </Text>
                        </View>
                        {selectedPengajuan.disetujui_oleh && (
                          <>
                            <View style={styles.divider} />
                            <View style={styles.approverInline}>
                              <Ionicons name="person-circle-outline" size={16} color="#6B7280" />
                              <Text style={styles.approverInlineText}>
                                {selectedPengajuan.nama_approver || `Admin`}
                              </Text>
                            </View>
                          </>
                        )}
                      </View>
                      {selectedPengajuan.is_retrospektif === 1 && (
                        <View style={styles.retrospektifBadge}>
                          <Ionicons name="alert-circle" size={16} color="#92400E" />
                          <Text style={styles.retrospektifText}>Telat Ngajuin</Text>
                        </View>
                      )}
                    </View>

                    {/* Catatan */}
                    <View style={styles.section}>
                      <Text style={styles.sectionTitle}>Catatan Admin</Text>
                      <Text style={styles.sectionContent}>
                        {selectedPengajuan.catatan_persetujuan || 'Belum ada catatan'}
                      </Text>
                    </View>

                    {/* Timeline */}
                    <View style={styles.section}>
                      <Text style={styles.sectionTitle}>Timeline</Text>
                      <View style={styles.timelineItem}>
                        <View style={styles.timelineDot} />
                        <View style={styles.timelineContent}>
                          <Text style={styles.timelineLabel}>Diajukan</Text>
                          <Text style={styles.timelineValue}>{formatDateTime(selectedPengajuan.tanggal_pengajuan)}</Text>
                        </View>
                      </View>
                      <View style={styles.timelineItem}>
                        <View style={[styles.timelineDot, { 
                          backgroundColor: selectedPengajuan.waktu_persetujuan ? getStatusInfo(selectedPengajuan.status).color : '#D1D5DB' 
                        }]} />
                        <View style={styles.timelineContent}>
                          <Text style={styles.timelineLabel}>Diproses</Text>
                          <Text style={styles.timelineValue}>
                            {selectedPengajuan.waktu_persetujuan ? formatDateTime(selectedPengajuan.waktu_persetujuan) : 'Belum diproses'}
                          </Text>
                        </View>
                      </View>
                    </View>
                  </>
                )}
              </ScrollView>

              {/* Tombol Hapus - Hanya tampil jika status menunggu */}
              {selectedPengajuan && selectedPengajuan.status === 'menunggu' && (
                <TouchableOpacity 
                  style={styles.deleteButton}
                  onPress={() => {
                    closeDetailModal();
                    setTimeout(() => setShowDeleteModal(true), 300);
                  }}
                >
                  <Ionicons name="trash-outline" size={20} color="#fff" />
                  <Text style={styles.deleteButtonText}>Hapus Pengajuan</Text>
                </TouchableOpacity>
              )}
            </View>
          </Animated.View>
        </View>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        visible={showDeleteModal}
        transparent={true}
        animationType="fade"
        statusBarTranslucent={true}
        onRequestClose={() => setShowDeleteModal(false)}
      >
        <View style={styles.deleteModalOverlay}>
          <View style={styles.deleteModalContainer}>
            <View style={styles.deleteIconContainer}>
              <Ionicons name="trash-outline" size={48} color="#fff" />
            </View>
            <Text style={styles.deleteModalMessage}>Hapus pengajuan ini?</Text>
            <View style={styles.deleteModalButtons}>
              <TouchableOpacity
                style={styles.deleteCancelButton}
                onPress={() => setShowDeleteModal(false)}
              >
                <Text style={styles.deleteCancelButtonText}>Batal</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.deleteConfirmButton}
                onPress={() => {
                  setShowDeleteModal(false);
                  if (selectedPengajuan) {
                    handleDeletePengajuan(selectedPengajuan.id_pengajuan);
                  }
                }}
              >
                <Text style={styles.deleteConfirmButtonText}>Hapus</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <CustomAlert
        visible={alert.visible}
        type={alert.config.type}
        title={alert.config.title}
        message={alert.config.message}
        onClose={alert.hideAlert}
        onConfirm={alert.handleConfirm}
        confirmText={alert.config.confirmText}
        cancelText={alert.config.cancelText}
        autoClose={alert.config.type === 'success'}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff' },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 8,
    backgroundColor: '#fff',
    gap: 10,
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 15,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    gap: 12,
  },
  searchIcon: {
    marginRight: 0,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    paddingVertical: 12,
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
    gap: 12,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E6F0EF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardContent: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 6,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  cardDate: {
    fontSize: 13,
    color: '#666',
  },
  cardAlasan: {
    fontSize: 13,
    color: '#888',
    marginTop: 4,
    lineHeight: 18,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
    height: 28,
  },
  statusText: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
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
  },
  modalBackdrop: {
    flex: 1,
  },
  bottomSheetModal: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
  },
  handleContainer: {
    paddingVertical: 8,
    alignItems: 'center',
    width: '100%',
  },
  handleBar: {
    width: 40,
    height: 4,
    backgroundColor: '#DDD',
    borderRadius: 2,
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
  detailModalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  detailModalBackdrop: {
    flex: 1,
  },
  detailBottomSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    maxHeight: '85%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 20,
  },
  detailSheetContent: {
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  detailSheetTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginBottom: 16,
    textAlign: 'center',
  },
  detailBody: {
    flexGrow: 1,
  },
  infoSection: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  infoItem: {
    flex: 1,
    alignItems: 'center',
    gap: 8,
  },
  infoText: {
    alignItems: 'center',
  },
  infoLabel: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  infoValue: {
    fontSize: 15,
    color: '#111827',
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 2,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6B7280',
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sectionContent: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 22,
    backgroundColor: '#F9FAFB',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexWrap: 'wrap',
  },
  statusBadgeLarge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  statusTextLarge: {
    fontSize: 13,
    fontWeight: '700',
  },
  retrospektifBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#FEF3C7',
    borderWidth: 1.5,
    borderColor: '#FCD34D',
    marginTop: 10,
    alignSelf: 'flex-start',
  },
  retrospektifText: {
    fontSize: 12,
    color: '#92400E',
    fontWeight: '700',
  },
  timelineItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
    paddingVertical: 8,
    paddingLeft: 4,
  },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#004643',
    marginTop: 5,
    borderWidth: 3,
    borderColor: '#E6F0EF',
  },
  timelineContent: {
    flex: 1,
  },
  timelineLabel: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '600',
    marginBottom: 3,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  timelineValue: {
    fontSize: 14,
    color: '#111827',
    fontWeight: '600',
  },
  divider: {
    width: 1,
    height: 24,
    backgroundColor: '#D1D5DB',
  },
  approverInline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  approverInlineText: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F44336',
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 16,
    gap: 8,
  },
  deleteButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },

  deleteModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30,
  },
  deleteModalContainer: {
    backgroundColor: '#004643',
    borderRadius: 20,
    padding: 32,
    width: '100%',
    maxWidth: 300,
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  deleteIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  deleteModalMessage: {
    fontSize: 18,
    color: '#fff',
    textAlign: 'center',
    marginBottom: 28,
    fontWeight: '600',
  },
  deleteModalButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  deleteCancelButton: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  deleteCancelButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
  deleteConfirmButton: {
    flex: 1,
    backgroundColor: '#F44336',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  deleteConfirmButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
});
