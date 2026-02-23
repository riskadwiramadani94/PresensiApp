import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, FlatList, TextInput, Alert, ActivityIndicator, Modal, TextInput as RNTextInput, Image, TouchableWithoutFeedback, Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { getApiUrl, API_CONFIG } from '../constants/config';
import { AppHeader, SkeletonLoader } from '../components';

interface PengajuanData {
  id_pengajuan: number;
  id_user: number;
  nama_lengkap: string;
  nip: string;
  jenis_pengajuan: string;
  tanggal_mulai: string;
  tanggal_selesai?: string;
  jam_mulai?: string;
  jam_selesai?: string;
  alasan_text: string;
  lokasi_dinas?: string;
  dokumen_foto?: string;
  status: 'pending' | 'approved' | 'rejected';
  tanggal_pengajuan: string;
  is_retrospektif: boolean;
}

export default function ApprovalAdminScreen() {
  const router = useRouter();
  const [pengajuan, setPengajuan] = useState<PengajuanData[]>([]);
  const [filteredPengajuan, setFilteredPengajuan] = useState<PengajuanData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFilter, setSelectedFilter] = useState('pending');
  const [searchQuery, setSearchQuery] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedPengajuan, setSelectedPengajuan] = useState<PengajuanData | null>(null);
  const [approvalNote, setApprovalNote] = useState('');
  const [approvalAction, setApprovalAction] = useState<'approve' | 'reject'>('approve');

  useEffect(() => {
    fetchPengajuan();
  }, []);

  useEffect(() => {
    filterPengajuan();
  }, [selectedFilter, searchQuery, pengajuan]);

  const fetchPengajuan = async () => {
    try {
      const response = await fetch(getApiUrl(API_CONFIG.ENDPOINTS.APPROVAL));
      const result = await response.json();
      
      if (result.success) {
        setPengajuan(result.data);
        setFilteredPengajuan(result.data);
      } else {
        Alert.alert('Error', 'Gagal memuat data pengajuan');
      }
    } catch (error) {
      Alert.alert('Koneksi Error', 'Pastikan XAMPP Apache dan MySQL sudah berjalan.');
    } finally {
      setLoading(false);
    }
  };

  const filterPengajuan = () => {
    let filtered = pengajuan;
    
    // Filter by status
    if (selectedFilter) {
      filtered = filtered.filter(item => item.status === selectedFilter);
    }
    
    // Filter by search query
    if (searchQuery.trim()) {
      filtered = filtered.filter(item => 
        item.nama_lengkap.toLowerCase().includes(searchQuery.toLowerCase()) ||
        getJenisLabel(item.jenis_pengajuan).toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    setFilteredPengajuan(filtered);
  };

  const getJenisLabel = (jenis: string) => {
    const labels: { [key: string]: string } = {
      'cuti_sakit': 'Cuti Sakit',
      'cuti_tahunan': 'Cuti Tahunan',
      'izin_pribadi': 'Izin Pribadi',
      'pulang_cepat_terencana': 'Pulang Cepat',
      'pulang_cepat_mendadak': 'Pulang Cepat Mendadak',
      'koreksi_presensi': 'Koreksi Presensi'
    };
    return labels[jenis] || jenis;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return '#FF9800';
      case 'approved': return '#4CAF50';
      case 'rejected': return '#F44336';
      default: return '#666';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending': return 'Menunggu';
      case 'approved': return 'Disetujui';
      case 'rejected': return 'Ditolak';
      default: return status;
    }
  };

  const handleApproval = (pengajuan: PengajuanData, action: 'approve' | 'reject') => {
    setSelectedPengajuan(pengajuan);
    setApprovalAction(action);
    setApprovalNote('');
    setModalVisible(true);
  };

  const submitApproval = async () => {
    if (!selectedPengajuan) return;

    try {
      const response = await fetch(getApiUrl(API_CONFIG.ENDPOINTS.APPROVAL), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id_pengajuan: selectedPengajuan.id_pengajuan,
          action: approvalAction,
          catatan_approval: approvalNote
        })
      });

      const result = await response.json();
      if (result.success) {
        fetchPengajuan();
        setModalVisible(false);
        Alert.alert('Sukses', `Pengajuan berhasil ${approvalAction === 'approve' ? 'disetujui' : 'ditolak'}`);
      } else {
        Alert.alert('Error', result.message);
      }
    } catch (error) {
      Alert.alert('Error', 'Gagal memproses approval');
    }
  };


  const renderPengajuanCard = ({ item }: { item: PengajuanData }) => (
    <View style={styles.pengajuanCard}>
      <View style={styles.cardHeader}>
        <View style={styles.userInfo}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{item.nama_lengkap?.charAt(0) || 'P'}</Text>
          </View>
          <View style={styles.userDetails}>
            <Text style={styles.userName}>{item.nama_lengkap}</Text>
            <Text style={styles.userNip}>NIP: {item.nip}</Text>
          </View>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '20' }]}>
          <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
            {getStatusLabel(item.status)}
          </Text>
        </View>
      </View>

      <View style={styles.cardContent}>
        <View style={styles.pengajuanInfo}>
          <Text style={styles.jenisLabel}>{getJenisLabel(item.jenis_pengajuan)}</Text>
          {item.is_retrospektif && (
            <View style={styles.retrospektifBadge}>
              <Text style={styles.retrospektifText}>Retrospektif</Text>
            </View>
          )}
        </View>
        
        <Text style={styles.tanggalText}>
          {item.tanggal_mulai} {item.tanggal_selesai && item.tanggal_selesai !== item.tanggal_mulai ? `- ${item.tanggal_selesai}` : ''}
        </Text>
        
        {(item.jam_mulai || item.jam_selesai) && (
          <Text style={styles.jamText}>
            {item.jam_mulai} {item.jam_selesai ? `- ${item.jam_selesai}` : ''}
          </Text>
        )}

        {item.lokasi_dinas && (
          <Text style={styles.lokasiText}>📍 {item.lokasi_dinas}</Text>
        )}

        <Text style={styles.alasanText} numberOfLines={2}>
          {item.alasan_text}
        </Text>

        {item.dokumen_foto && (
          <View style={styles.dokumenInfo}>
            <Ionicons name="document-attach" size={16} color="#666" />
            <Text style={styles.dokumenText}>Dokumen terlampir</Text>
          </View>
        )}
      </View>

      {item.status === 'pending' && (
        <View style={styles.actionButtons}>
          <TouchableOpacity 
            style={styles.rejectBtn}
            onPress={() => handleApproval(item, 'reject')}
          >
            <Ionicons name="close" size={16} color="#F44336" />
            <Text style={styles.rejectBtnText}>Tolak</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.approveBtn}
            onPress={() => handleApproval(item, 'approve')}
          >
            <Ionicons name="checkmark" size={16} color="#fff" />
            <Text style={styles.approveBtnText}>Setujui</Text>
          </TouchableOpacity>
        </View>
      )}

      <Text style={styles.timestampText}>
        Diajukan: {new Date(item.tanggal_pengajuan).toLocaleDateString('id-ID', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })}
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar style="light" translucent={true} backgroundColor="transparent" />
      
      {/* HEADER */}
      <AppHeader 
        title="Persetujuan"
        showBack={true}
        showStats={true}
        statsText={`${filteredPengajuan.length} Pengajuan`}
        fallbackRoute="/admin/dashboard-admin"
      />
        
      {loading ? (
        <View style={styles.loadingContainer}>
          <SkeletonLoader type="stats" message="Memuat data pengajuan..." />
        </View>
      ) : (
        <View style={styles.contentContainer}>
          {/* Fixed Search and Sort */}
          <View style={styles.fixedControls}>
            {/* Search Container */}
            <View style={styles.searchContainer}>
              <View style={styles.searchInputWrapper}>
                <Ionicons name="search-outline" size={20} color="#666" style={styles.searchIcon} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Cari nama pegawai atau jenis pengajuan..."
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  placeholderTextColor="#999"
                />
                {searchQuery.length > 0 && (
                  <TouchableOpacity 
                    onPress={() => setSearchQuery('')}
                    style={styles.clearBtn}
                  >
                    <Ionicons name="close-circle" size={20} color="#999" />
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* Status Filter */}
            <View style={styles.filterCard}>
              <View style={styles.filterHeader}>
                <Ionicons name="funnel-outline" size={16} color="#004643" />
                <Text style={styles.filterTitle}>Filter</Text>
              </View>
              
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.filterScrollContent}
                style={styles.filterScrollContainer}
              >
                {[
                  { key: 'pending', label: 'Menunggu' },
                  { key: 'approved', label: 'Disetujui' },
                  { key: 'rejected', label: 'Ditolak' }
                ].map((filter) => (
                  <TouchableOpacity
                    key={filter.key}
                    style={[
                      styles.filterChip,
                      selectedFilter === filter.key && styles.filterChipActive,
                    ]}
                    onPress={() => setSelectedFilter(filter.key)}
                  >
                    <Text
                      style={[
                        styles.filterChipText,
                        selectedFilter === filter.key && styles.filterChipTextActive,
                      ]}
                    >
                      {filter.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>

          {/* Pengajuan List */}
          <FlatList
            data={filteredPengajuan}
            keyExtractor={(item) => item.id_pengajuan.toString()}
            renderItem={renderPengajuanCard}
            style={styles.flatList}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            refreshing={loading}
            onRefresh={() => fetchPengajuan()}
            ListEmptyComponent={() => (
              <View style={styles.emptyState}>
                <Ionicons name="document-text-outline" size={60} color="#ccc" />
                <Text style={styles.emptyText}>
                  {loading ? 'Memuat data...' : 'Tidak ada pengajuan ditemukan'}
                </Text>
              </View>
            )}
          />
        </View>
      )}

        {/* Approval Modal */}
        <Modal
          animationType="slide"
          transparent={true}
          visible={modalVisible}
          onRequestClose={() => setModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>
                  {approvalAction === 'approve' ? 'Setujui Pengajuan' : 'Tolak Pengajuan'}
                </Text>
                <TouchableOpacity onPress={() => setModalVisible(false)}>
                  <Ionicons name="close" size={24} color="#666" />
                </TouchableOpacity>
              </View>

              {selectedPengajuan && (
                <View style={styles.modalBody}>
                  <Text style={styles.modalPengajuanInfo}>
                    {selectedPengajuan.nama_lengkap} - {getJenisLabel(selectedPengajuan.jenis_pengajuan)}
                  </Text>
                  
                  <Text style={styles.modalLabel}>Catatan:</Text>
                  <TextInput
                    style={styles.modalTextInput}
                    placeholder="Tambahkan catatan (opsional)"
                    value={approvalNote}
                    onChangeText={setApprovalNote}
                    multiline
                    numberOfLines={3}
                  />
                </View>
              )}

              <View style={styles.modalActions}>
                <TouchableOpacity 
                  style={styles.modalCancelBtn}
                  onPress={() => setModalVisible(false)}
                >
                  <Text style={styles.modalCancelText}>Batal</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.modalConfirmBtn, { backgroundColor: approvalAction === 'approve' ? '#4CAF50' : '#F44336' }]}
                  onPress={submitApproval}
                >
                  <Text style={styles.modalConfirmText}>
                    {approvalAction === 'approve' ? 'Setujui' : 'Tolak'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  contentContainer: {
    flex: 1,
  },
  fixedControls: {
    paddingTop: 8,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    backgroundColor: '#fff',
  },
  flatList: {
    flex: 1,
  },
  
  searchContainer: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    backgroundColor: '#fff'
  },
  searchInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f4f3f3ff',
    borderRadius: 12,
    paddingHorizontal: 15,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  searchIcon: {
    marginRight: 10
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    paddingVertical: 12
  },
  clearBtn: {
    padding: 4
  },
  
  filterCard: {
    backgroundColor: '#fff',
    marginHorizontal: 15,
    marginVertical: 5,
    borderRadius: 12,
    padding: 15,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  filterHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12
  },
  filterTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#004643'
  },
  filterScrollContainer: {
    marginHorizontal: -4
  },
  filterScrollContent: {
    paddingHorizontal: 4,
    paddingRight: 20
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    borderRadius: 20,
    backgroundColor: '#F8F9FA',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    minWidth: 80,
    alignItems: 'center'
  },
  filterChipActive: {
    backgroundColor: '#004643',
    borderColor: '#004643'
  },
  filterChipText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500'
  },
  filterChipTextActive: {
    color: '#fff',
    fontWeight: '600'
  },
  
  listContent: {
    paddingHorizontal: 5,
    paddingTop: 10,
    paddingBottom: 20,
  },
  pengajuanCard: {
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
    marginBottom: 12,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E6F0EF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12
  },
  avatarText: {
    color: '#004643',
    fontWeight: 'bold',
    fontSize: 16
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontWeight: 'bold',
    fontSize: 14,
    color: '#333',
  },
  userNip: {
    fontSize: 12,
    color: '#666',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  cardContent: {
    marginBottom: 12,
  },
  pengajuanInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  jenisLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#004643',
    flex: 1,
  },
  retrospektifBadge: {
    backgroundColor: '#FFF3E0',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  retrospektifText: {
    fontSize: 10,
    color: '#F57C00',
    fontWeight: 'bold',
  },
  tanggalText: {
    fontSize: 14,
    color: '#333',
    marginBottom: 4,
  },
  jamText: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  lokasiText: {
    fontSize: 12,
    color: '#666',
    marginBottom: 8,
  },
  alasanText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
    marginBottom: 8,
  },
  dokumenInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  dokumenText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
  },
  actionButtons: {
    flexDirection: 'row',
    marginBottom: 8,
    gap: 8,
  },
  rejectBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#FFEBEE',
    borderWidth: 1,
    borderColor: '#F44336',
  },
  rejectBtnText: {
    color: '#F44336',
    fontWeight: 'bold',
    marginLeft: 4,
  },
  approveBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#4CAF50',
  },
  approveBtnText: {
    color: '#fff',
    fontWeight: 'bold',
    marginLeft: 4,
  },
  timestampText: {
    fontSize: 11,
    color: '#999',
    textAlign: 'right',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 14,
    color: '#999',
    marginTop: 10,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  loadingText: {
    marginTop: 10,
    color: '#666'
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    width: '90%',
    maxWidth: 400,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  modalBody: {
    marginBottom: 20,
  },
  modalPengajuanInfo: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  modalLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  modalTextInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    minHeight: 80,
    marginBottom: 16,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
  },
  modalCancelText: {
    color: '#666',
    fontWeight: 'bold',
  },
  modalConfirmBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalConfirmText: {
    color: '#fff',
    fontWeight: 'bold',
  },

  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
    marginTop: 10
  },
  pageBtn: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#F5F5F5'
  },
  pageBtnDisabled: {
    backgroundColor: '#F0F0F0'
  },
  pageNumbers: {
    flexDirection: 'row',
    marginHorizontal: 15
  },
  pageNumber: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginHorizontal: 2,
    borderRadius: 8,
    backgroundColor: '#F5F5F5'
  },
  pageNumberActive: {
    backgroundColor: '#004643'
  },
  pageNumberText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500'
  },
  pageNumberTextActive: {
    color: '#fff',
    fontWeight: 'bold'
  },
});
