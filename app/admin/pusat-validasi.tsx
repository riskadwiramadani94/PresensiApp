import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { 
  View, Text, StyleSheet, TouchableOpacity, FlatList, 
  Alert, ActivityIndicator, Modal, Image, ScrollView, TextInput, Platform, RefreshControl, Animated, PanResponder 
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect, useLocalSearchParams } from 'expo-router';
import * as NavigationBar from 'expo-navigation-bar';
import { AppHeader } from "../../components";
import { PusatValidasiAPI, KelolaDinasAPI } from '../../constants/config';



interface DinasItem {
  id: number;
  namaKegiatan: string;
  nomorSpt: string;
  jenisDinas?: string;
  tanggal_mulai: string;
  tanggal_selesai: string;
  jamKerja: string;
  lokasi: string;
  radius: number;
  pegawai: Array<{
    nama: string;
    nip?: string;
    status: string;
    jamAbsen: string | null;
  }>;
}

interface AbsenDinasItem extends DinasItem {}

interface PengajuanItem {
  id_pengajuan: number;
  id_user: number;
  jenis_pengajuan: string;
  tanggal_mulai: string;
  tanggal_selesai: string;
  jam_mulai: string;
  jam_selesai: string;
  alasan_text: string;
  dokumen_foto: string;
  is_retrospektif: boolean;
  tanggal_pengajuan: string;
  nama_lengkap: string;
  nip: string;
  jabatan: string;
  divisi: string;
}

interface Statistics {
  absen_dinas: {
    perlu_validasi: number;
    sudah_divalidasi: number;
    ditolak: number;
    tidak_hadir: number;
    total: number;
  };
  pengajuan: {
    menunggu: number;
    disetujui: number;
    ditolak: number;
    total: number;
  };
}

export default function PusatValidasiScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [activeTab, setActiveTab] = useState('absen_dinas');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // State untuk last update time
  const [lastUpdateTime, setLastUpdateTime] = useState<Date>(new Date());
  
  // Get current date
  const getCurrentDate = () => {
    const today = new Date();
    return today.toLocaleDateString('id-ID', {
      weekday: 'long',
      day: 'numeric', 
      month: 'long',
      year: 'numeric'
    });
  };
  
  // Format last update time
  const getLastUpdateText = () => {
    const now = new Date();
    const diffMs = now.getTime() - lastUpdateTime.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Baru saja';
    if (diffMins < 60) return `${diffMins}m lalu`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}j lalu`;
    
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}h lalu`;
  };
  
  // Data states
  const [absenDinasData, setAbsenDinasData] = useState<AbsenDinasItem[]>([]);
  const [pengajuanData, setPengajuanData] = useState<PengajuanItem[]>([]);
  const [statistics, setStatistics] = useState<Statistics>({
    absen_dinas: {
      perlu_validasi: 0,
      sudah_divalidasi: 0,
      ditolak: 0,
      tidak_hadir: 0,
      total: 0
    },
    pengajuan: {
      menunggu: 0,
      disetujui: 0,
      ditolak: 0,
      total: 0
    }
  });
  
  // Modal states
  const [showActionModal, setShowActionModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [selectedType, setSelectedType] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  
  // Filter states
  const [filterPeriod, setFilterPeriod] = useState('semua');
  const [filterJenis, setFilterJenis] = useState('semua');
  
  // Bottom sheet animation
  const translateY = useRef(new Animated.Value(300)).current;

  useFocusEffect(
    useCallback(() => {
      // Set initial tab dari params jika ada
      if (params.initialTab) {
        setActiveTab(params.initialTab as string);
      }
      fetchAllData();
      // Set navigation bar translucent
      if (Platform.OS === 'android') {
        NavigationBar.setBackgroundColorAsync('transparent');
      }
    }, [params.initialTab])
  );

  const fetchAllData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchAbsenDinas(),
        fetchPengajuan(),
        fetchStatistics()
      ]);
      // Update last update time setelah fetch berhasil
      setLastUpdateTime(new Date());
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };



  const fetchAbsenDinas = async () => {
    try {
      const result = await KelolaDinasAPI.getDinasAktif();
      if (result.success) {
        // Filter hanya dinas yang sedang berlangsung
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const dinasAktif = result.data.filter((dinas: DinasItem) => {
          const mulai = new Date(dinas.tanggal_mulai);
          const selesai = new Date(dinas.tanggal_selesai);
          
          mulai.setHours(0, 0, 0, 0);
          selesai.setHours(23, 59, 59, 999);
          
          // Hanya ambil yang sedang berlangsung
          return today >= mulai && today <= selesai;
        });
        
        setAbsenDinasData(dinasAktif);
      }
    } catch (error) {
      console.error('Error fetching absen dinas:', error);
    }
  };

  const fetchPengajuan = async () => {
    try {
      const result = await PusatValidasiAPI.getPengajuan();
      if (result.success) {
        setPengajuanData(result.data || []);
      } else {
        console.error('Failed to fetch pengajuan:', result.message);
        setPengajuanData([]);
      }
    } catch (error) {
      console.error('Error fetching pengajuan:', error);
      setPengajuanData([]);
    }
  };

  const fetchStatistics = async () => {
    try {
      const result = await PusatValidasiAPI.getStatistik();
      if (result.success) {
        setStatistics(result.data);
      }
    } catch (error) {
      console.error('Error fetching statistics:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchAllData();
    setRefreshing(false);
  };

  const handleApprove = async (type: string, item: any) => {
    setActionLoading(true);
    try {
      const id = type === 'absen_dinas' ? item.id : item.id_pengajuan;
      
      const result = await PusatValidasiAPI.setujui(type, id);
      
      if (result.success) {
        Alert.alert('Berhasil', 'Item berhasil disetujui');
        await fetchAllData();
      } else {
        Alert.alert('Error', result.message);
      }
    } catch (error) {
      Alert.alert('Error', 'Gagal menyetujui item');
    } finally {
      setActionLoading(false);
      setShowActionModal(false);
    }
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) {
      Alert.alert('Error', 'Catatan penolakan wajib diisi');
      return;
    }

    setActionLoading(true);
    try {
      const id = selectedType === 'absen_dinas' ? selectedItem.id : selectedItem.id_pengajuan;
      
      const result = await PusatValidasiAPI.tolak(selectedType, id, rejectReason);
      
      if (result.success) {
        Alert.alert('Berhasil', 'Item berhasil ditolak');
        await fetchAllData();
        setRejectReason('');
      } else {
        Alert.alert('Error', result.message);
      }
    } catch (error) {
      Alert.alert('Error', 'Gagal menolak item');
    } finally {
      setActionLoading(false);
      setShowRejectModal(false);
    }
  };

  const openActionModal = (type: string, item: any) => {
    setSelectedType(type);
    setSelectedItem(item);
    setShowActionModal(true);
  };

  const openFilterModal = () => {
    setShowFilterModal(true);
    if (Platform.OS === 'android') {
      NavigationBar.setVisibilityAsync('hidden');
    }
    Animated.timing(translateY, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  const closeFilterModal = () => {
    Animated.timing(translateY, {
      toValue: 300,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setShowFilterModal(false);
      if (Platform.OS === 'android') {
        NavigationBar.setVisibilityAsync('visible');
      }
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

  const openRejectModal = () => {
    setShowActionModal(false);
    setShowRejectModal(true);
  };
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  const formatJenisPengajuan = (jenis: string) => {
    const jenisMap: { [key: string]: string } = {
      'cuti_sakit': 'Cuti Sakit',
      'cuti_tahunan': 'Cuti Tahunan',
      'izin_pribadi': 'Izin Pribadi',
      'pulang_cepat_terencana': 'Pulang Cepat',
      'pulang_cepat_mendadak': 'Pulang Cepat',
      'koreksi_presensi': 'Koreksi Presensi',
      'lembur_hari_kerja': 'Lembur Hari Kerja',
      'lembur_akhir_pekan': 'Lembur Akhir Pekan',
      'lembur_hari_libur': 'Lembur Hari Libur',
      'dinas_lokal': 'Dinas Lokal',
      'dinas_luar_kota': 'Dinas Luar Kota',
      'dinas_luar_negeri': 'Dinas Luar Negeri'
    };
    return jenisMap[jenis] || jenis;
  };



  const handleOpenAbsenDinas = (dinasId: number) => {
    router.push(`/pusat-validasi/absen-dinas/?dinasId=${dinasId}` as any);
  };



  const renderAbsenDinasItem = ({ item }: { item: AbsenDinasItem }) => {
    const totalPegawai = item.pegawai?.length || 0;
    
    // Parse jam kerja untuk mendapatkan batas waktu absen
    // Format jam kerja: "08:00 - 17:00"
    const jamKerjaParts = item.jamKerja?.split('-') || [];
    const batasAbsen = jamKerjaParts[0]?.trim() || '08:00'; // Ambil jam mulai sebagai batas
    
    // Get current time
    const now = new Date();
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    
    // Hitung badge status
    const sudahValidasi = item.pegawai?.filter((p: any) => p.isValidated === true).length || 0;
    const perluValidasi = item.pegawai?.filter((p: any) => p.status === 'hadir' && !p.isValidated).length || 0;
    
    // Tidak hadir: belum absen DAN sudah lewat batas waktu absen
    const tidakHadir = item.pegawai?.filter((p: any) => {
      const belumAbsen = p.status !== 'hadir';
      const lewatBatas = currentTime > batasAbsen;
      return belumAbsen && lewatBatas;
    }).length || 0;

    return (
      <TouchableOpacity 
        style={styles.dinasCard}
        onPress={() => handleOpenAbsenDinas(item.id)}
        activeOpacity={0.7}
      >
        <View style={styles.dinasCardHeader}>
          <View style={styles.dinasCardTitle}>
            <Text style={styles.dinasKegiatanName}>{item.namaKegiatan}</Text>
            <Text style={styles.dinasSptNumber}>{item.nomorSpt}</Text>
          </View>
          
          {/* Badge Status di Pojok Kanan Atas - Hanya tampilkan jika ada */}
          <View style={styles.badgeContainer}>
            {sudahValidasi > 0 && (
              <View style={[styles.statusBadgeSmall, styles.statusBadgeGreen]}>
                <Text style={styles.statusBadgeText}>{sudahValidasi}</Text>
              </View>
            )}
            {perluValidasi > 0 && (
              <View style={[styles.statusBadgeSmall, styles.statusBadgeYellow]}>
                <Text style={styles.statusBadgeText}>{perluValidasi}</Text>
              </View>
            )}
            {tidakHadir > 0 && (
              <View style={[styles.statusBadgeSmall, styles.statusBadgeRed]}>
                <Text style={styles.statusBadgeText}>{tidakHadir}</Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.dinasCardInfo}>
          {item.jenisDinas && (
            <View style={styles.dinasInfoRow}>
              <Ionicons name="business-outline" size={14} color="#666" />
              <Text style={styles.dinasInfoText}>
                {item.jenisDinas === 'lokal' ? 'Dinas Lokal' : 
                 item.jenisDinas === 'luar_kota' ? 'Dinas Luar Kota' : 
                 item.jenisDinas === 'luar_negeri' ? 'Dinas Luar Negeri' : item.jenisDinas}
              </Text>
            </View>
          )}
          <View style={styles.dinasInfoRow}>
            <Ionicons name="location-outline" size={14} color="#666" />
            <Text style={styles.dinasInfoText}>{item.lokasi}</Text>
          </View>
          <View style={styles.dinasInfoRow}>
            <Ionicons name="time-outline" size={14} color="#666" />
            <Text style={styles.dinasInfoText}>{item.jamKerja}</Text>
          </View>
          <View style={styles.dinasInfoRow}>
            <Ionicons name="calendar-outline" size={14} color="#666" />
            <Text style={styles.dinasInfoText}>
              {formatDate(item.tanggal_mulai)} - {formatDate(item.tanggal_selesai)}
            </Text>
          </View>
          <View style={styles.dinasInfoRow}>
            <Ionicons name="people-outline" size={14} color="#666" />
            <Text style={styles.dinasInfoText}>{totalPegawai} orang bertugas</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderPengajuanItem = ({ item }: { item: PengajuanItem }) => (
    <View style={styles.itemCard}>
      <View style={styles.cardAccent} />
      
      <View style={styles.itemContent}>
        <View style={styles.statusRow}>
          <Text style={styles.userName}>{item.nama_lengkap}</Text>
          <View style={styles.pengajuanBadge}>
            <Text style={styles.pengajuanBadgeText}>{formatJenisPengajuan(item.jenis_pengajuan)}</Text>
          </View>
        </View>
        
        <Text style={styles.userDetail}>NIP: {item.nip} • {item.jabatan}</Text>
        
        <Text style={styles.infoText}>
          {formatDate(item.tanggal_mulai)}
          {item.tanggal_selesai && item.tanggal_selesai !== item.tanggal_mulai && 
            ` - ${formatDate(item.tanggal_selesai)}`}
        </Text>
        
        {(item.jam_mulai || item.jam_selesai) && (
          <Text style={styles.infoText}>
            {item.jam_mulai} {item.jam_selesai && `- ${item.jam_selesai}`}
          </Text>
        )}
        
        <Text style={styles.reasonText} numberOfLines={2}>{item.alasan_text}</Text>
        
        {item.dokumen_foto && (
          <TouchableOpacity style={styles.documentBtn}>
            <Ionicons name="document-attach-outline" size={14} color="#004643" />
            <Text style={styles.documentBtnText}>Lihat Dokumen</Text>
          </TouchableOpacity>
        )}
      </View>
      
      <View style={styles.actionButtons}>
        <TouchableOpacity 
          style={styles.approveBtn}
          onPress={() => handleApprove('pengajuan', item)}
          disabled={actionLoading}
        >
          <Text style={styles.approveBtnText}>✓ Setuju</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.rejectBtn}
          onPress={() => openActionModal('pengajuan', item)}
        >
          <Text style={styles.rejectBtnText}>✗ Tolak</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const getCurrentData = () => {
    switch (activeTab) {
      case 'absen_dinas': return absenDinasData;
      case 'pengajuan': return pengajuanData;
      default: return [];
    }
  };

  // Filter data dengan useMemo
  const filteredData = useMemo(() => {
    let data: any[] = getCurrentData();

    // Filter berdasarkan Periode
    if (filterPeriod !== 'semua') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      data = data.filter((item: any) => {
        const tanggalMulai = new Date(item.tanggal_mulai || item.tanggal_pengajuan);
        const tanggalSelesai = item.tanggal_selesai ? new Date(item.tanggal_selesai) : tanggalMulai;
        
        tanggalMulai.setHours(0, 0, 0, 0);
        tanggalSelesai.setHours(23, 59, 59, 999);

        if (filterPeriod === 'hari_ini') {
          return today >= tanggalMulai && today <= tanggalSelesai;
        } else if (filterPeriod === '3_hari') {
          const threeDaysAgo = new Date(today);
          threeDaysAgo.setDate(today.getDate() - 3);
          return tanggalMulai >= threeDaysAgo;
        } else if (filterPeriod === 'minggu_ini') {
          const startOfWeek = new Date(today);
          startOfWeek.setDate(today.getDate() - today.getDay());
          const endOfWeek = new Date(startOfWeek);
          endOfWeek.setDate(startOfWeek.getDate() + 6);
          return tanggalMulai <= endOfWeek && tanggalSelesai >= startOfWeek;
        } else if (filterPeriod === 'bulan_ini') {
          return tanggalMulai.getMonth() === today.getMonth() && tanggalMulai.getFullYear() === today.getFullYear();
        }
        return true;
      });
    }

    // Filter berdasarkan Jenis
    if (filterJenis !== 'semua') {
      data = data.filter((item: any) => {
        if (activeTab === 'absen_dinas') {
          return item.jenisDinas === filterJenis;
        } else if (activeTab === 'pengajuan') {
          return item.jenis_pengajuan === filterJenis;
        }
        return true;
      });
    }

    return data;
  }, [absenDinasData, pengajuanData, activeTab, filterPeriod, filterJenis]);

  const renderCurrentTab = () => {
    const data = getCurrentData();
    
    if (loading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#004643" />
          <Text style={styles.loadingText}>Memuat data...</Text>
        </View>
      );
    }

    if (data.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <Ionicons name="checkmark-circle-outline" size={80} color="#ccc" />
          <Text style={styles.emptyText}>Tidak ada item yang perlu divalidasi</Text>
        </View>
      );
    }

    return (
      <FlatList
        data={filteredData}
        keyExtractor={(item: any) => {
          if (activeTab === 'absen_dinas') return item.id.toString();
          return item.id_pengajuan.toString();
        }}
        renderItem={({ item }) => {
          if (activeTab === 'absen_dinas') return renderAbsenDinasItem({ item });
          return renderPengajuanItem({ item });
        }}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshing={refreshing}
        onRefresh={onRefresh}
      />
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" translucent={true} backgroundColor="transparent" />
      
      {/* HEADER */}
      <AppHeader 
        title="Pusat Validasi"
        showBack={false}
        showHistoryButton={true}
        onHistoryPress={() => Alert.alert('History', 'Fitur history akan segera hadir')}
      />

      <View style={styles.contentWrapper}>
        {/* Fixed Controls - Tab Navigation */}
        <View style={styles.fixedControls}>
          {/* Search Bar */}
          <View style={styles.searchContainer}>
            <View style={styles.searchInputWrapper}>
              <Ionicons name="search-outline" size={20} color="#666" />
              <TextInput
                style={styles.searchInput}
                placeholder="Cari pegawai..."
                placeholderTextColor="#999"
              />
            </View>
          </View>
          
          {/* Tab Navigation */}
          <View style={styles.tabContainer}>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'absen_dinas' && styles.activeTab]}
              onPress={() => setActiveTab('absen_dinas')}
            >
              <Text style={[styles.tabText, activeTab === 'absen_dinas' && styles.activeTabText]}>
                Absen Dinas
              </Text>
              {statistics.absen_dinas.perlu_validasi > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{statistics.absen_dinas.perlu_validasi}</Text>
                </View>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tab, activeTab === 'pengajuan' && styles.activeTab]}
              onPress={() => setActiveTab('pengajuan')}
            >
              <Text style={[styles.tabText, activeTab === 'pengajuan' && styles.activeTabText]}>
                Pengajuan
              </Text>
              {statistics.pengajuan.menunggu > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{statistics.pengajuan.menunggu}</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Content */}
        <View style={styles.content}>
          {renderCurrentTab()}
        </View>
      </View>

      {/* Filter Modal - Bottom Sheet */}
      <Modal
        visible={showFilterModal}
        transparent={true}
        animationType="none"
        statusBarTranslucent={true}
        onRequestClose={closeFilterModal}
      >
        <View style={styles.filterModalOverlay}>
          <TouchableOpacity 
            style={styles.filterModalBackdrop} 
            activeOpacity={1}
            onPress={closeFilterModal}
          />
          <Animated.View style={[styles.filterBottomSheetModal, {
            transform: [{ translateY }]
          }]}>
            {/* Handle Bar with Pan Gesture */}
            <View {...panResponder.panHandlers} style={styles.filterHandleContainer}>
              <View style={styles.filterHandleBar} />
            </View>
            
            {/* Header */}
            <View style={styles.filterBottomSheetHeader}>
              <View style={styles.filterLeft}>
                <Ionicons name="funnel-outline" size={20} color="#004643" />
                <Text style={styles.filterModalTitle}>Filter</Text>
              </View>
              <View style={styles.filterRight}>
                <TouchableOpacity 
                  style={styles.filterResetBtn}
                  onPress={() => {
                    setFilterPeriod('semua');
                    setFilterJenis('semua');
                  }}
                >
                  <Ionicons name="refresh-outline" size={16} color="#666" />
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.filterApplyBtn}
                  onPress={() => {
                    // Apply filter logic here
                    closeFilterModal();
                  }}
                >
                  <Ionicons name="checkmark-outline" size={16} color="#fff" />
                </TouchableOpacity>
              </View>
            </View>
            
            <ScrollView showsVerticalScrollIndicator={false} style={styles.filterScrollContent}>
              {/* Periode */}
              <View style={styles.filterSection}>
                <Text style={styles.filterSectionTitle}>Periode</Text>
                <View style={styles.filterChipsContainer}>
                  {['hari_ini', '3_hari', 'minggu_ini', 'bulan_ini'].map((period) => (
                    <TouchableOpacity
                      key={period}
                      style={[styles.filterChipLarge, filterPeriod === period && styles.filterChipActive]}
                      onPress={() => setFilterPeriod(period)}
                    >
                      <Text style={[styles.filterChipTextLarge, filterPeriod === period && styles.filterChipTextActive]}>
                        {period === 'hari_ini' ? 'Hari ini' :
                         period === '3_hari' ? '3 Hari' :
                         period === 'minggu_ini' ? 'Minggu ini' : 'Bulan ini'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
              
              {/* Conditional Sections based on activeTab */}
              {activeTab === 'absen_dinas' && (
                <View style={styles.filterSection}>
                  <Text style={styles.filterSectionTitle}>Jenis Dinas</Text>
                  <View style={styles.filterChipsContainer}>
                    {['semua', 'lokal', 'luar_kota', 'luar_negeri'].map((jenis) => (
                      <TouchableOpacity
                        key={jenis}
                        style={[styles.filterChipLarge, filterJenis === jenis && styles.filterChipActive]}
                        onPress={() => setFilterJenis(jenis)}
                      >
                        <Text style={[styles.filterChipTextLarge, filterJenis === jenis && styles.filterChipTextActive]}>
                          {jenis === 'semua' ? 'Semua' :
                           jenis === 'lokal' ? 'Lokal' :
                           jenis === 'luar_kota' ? 'Luar Kota' : 'Luar Negeri'}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}
              
              {activeTab === 'pengajuan' && (
                <View style={styles.filterSection}>
                  <Text style={styles.filterSectionTitle}>Jenis Pengajuan</Text>
                  <View style={styles.filterChipsContainer}>
                    {['semua', 'cuti_sakit', 'cuti_tahunan', 'izin_pribadi', 'pulang_cepat', 'koreksi_presensi', 'lembur_hari_kerja', 'lembur_akhir_pekan', 'lembur_hari_libur', 'dinas_lokal', 'dinas_luar_kota', 'dinas_luar_negeri'].map((jenis) => (
                      <TouchableOpacity
                        key={jenis}
                        style={[styles.filterChipLarge, filterJenis === jenis && styles.filterChipActive]}
                        onPress={() => setFilterJenis(jenis)}
                      >
                        <Text style={[styles.filterChipTextLarge, filterJenis === jenis && styles.filterChipTextActive]}>
                          {jenis === 'semua' ? 'Semua' :
                           jenis === 'cuti_sakit' ? 'Cuti Sakit' :
                           jenis === 'cuti_tahunan' ? 'Cuti Tahunan' :
                           jenis === 'izin_pribadi' ? 'Izin Pribadi' :
                           jenis === 'pulang_cepat' ? 'Pulang Cepat' :
                           jenis === 'koreksi_presensi' ? 'Koreksi Presensi' :
                           jenis === 'lembur_hari_kerja' ? 'Lembur Hari Kerja' :
                           jenis === 'lembur_akhir_pekan' ? 'Lembur Akhir Pekan' :
                           jenis === 'lembur_hari_libur' ? 'Lembur Hari Libur' :
                           jenis === 'dinas_lokal' ? 'Dinas Lokal' :
                           jenis === 'dinas_luar_kota' ? 'Dinas Luar Kota' : 'Dinas Luar Negeri'}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}
            </ScrollView>
          </Animated.View>
        </View>
      </Modal>

      {/* Action Modal */}
      <Modal
        visible={showActionModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowActionModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.actionModalContainer}>
            <Text style={styles.actionModalTitle}>Konfirmasi Aksi</Text>
            <Text style={styles.actionModalText}>
              Pilih aksi untuk item dari {selectedItem?.nama_lengkap}
            </Text>
            
            <View style={styles.actionModalButtons}>
              <TouchableOpacity
                style={styles.modalApproveBtn}
                onPress={() => handleApprove(selectedType, selectedItem)}
                disabled={actionLoading}
              >
                <Text style={styles.modalApproveBtnText}>
                  {actionLoading ? 'Memproses...' : '✓ Setujui'}
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.modalRejectBtn}
                onPress={openRejectModal}
              >
                <Text style={styles.modalRejectBtnText}>✗ Tolak</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setShowActionModal(false)}
              >
                <Text style={styles.modalCancelBtnText}>Batal</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Reject Modal */}
      <Modal
        visible={showRejectModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowRejectModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.rejectModalContainer}>
            <Text style={styles.rejectModalTitle}>Alasan Penolakan</Text>
            <Text style={styles.rejectModalText}>
              Berikan alasan penolakan untuk {selectedItem?.nama_lengkap}
            </Text>
            
            <TextInput
              style={styles.rejectInput}
              placeholder="Masukkan alasan penolakan..."
              value={rejectReason}
              onChangeText={setRejectReason}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
            
            <View style={styles.rejectModalButtons}>
              <TouchableOpacity
                style={styles.rejectConfirmBtn}
                onPress={handleReject}
                disabled={actionLoading || !rejectReason.trim()}
              >
                <Text style={styles.rejectConfirmBtnText}>
                  {actionLoading ? 'Memproses...' : 'Tolak'}
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.rejectCancelBtn}
                onPress={() => {
                  setShowRejectModal(false);
                  setRejectReason('');
                }}
              >
                <Text style={styles.rejectCancelBtnText}>Batal</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>


    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#fff',
  },

  contentWrapper: {
    flex: 1,
    backgroundColor: '#fff',
  },
  fixedControls: {
    paddingTop: 8,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    backgroundColor: '#fff',
  },
  
  // Search and Filter Section
  searchContainer: {
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#fff'
  },
  searchInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    paddingHorizontal: 15,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    gap: 12
  },
  searchIcon: {
    marginRight: 0,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    paddingVertical: 12
  },

  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    padding: 4,
    marginHorizontal: 20,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 6,
    marginHorizontal: 2,
  },
  activeTab: {
    backgroundColor: '#004643',
  },
  tabText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#666',
    textAlign: 'center',
  },
  activeTabText: {
    color: '#fff',
    fontWeight: '600',
  },
  badge: {
    backgroundColor: '#FF9800',
    borderRadius: 12,
    minWidth: 22,
    height: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
    elevation: 2,
    shadowColor: '#FF9800',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
  },
  badgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  
  content: { 
    flex: 1,
    backgroundColor: '#fff',
  },
  listContent: { 
    padding: 20,
    paddingBottom: 30,
  },
  
  // Item Card
  itemCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    borderWidth: 0.5,
    borderColor: 'rgba(0, 0, 0, 0.05)',
    position: 'relative',
    overflow: 'hidden',
  },
  cardAccent: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 4,
    height: '100%',
    backgroundColor: '#004643',
    borderTopLeftRadius: 12,
    borderBottomLeftRadius: 12,
  },
  itemContent: { 
    marginBottom: 12,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  userName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
    flex: 1,
    marginRight: 8,
  },
  userDetail: {
    fontSize: 12,
    color: '#999',
    marginBottom: 6,
  },
  pengajuanBadge: {
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(25, 118, 210, 0.2)',
  },
  pengajuanBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#1976D2',
  },
  infoText: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
    fontWeight: '500',
  },
  reasonText: {
    fontSize: 12,
    color: '#999',
    lineHeight: 16,
    marginTop: 4,
    marginBottom: 8,
  },
  documentBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    gap: 4,
    alignSelf: 'flex-start',
    marginTop: 4,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  documentBtnText: {
    fontSize: 11,
    color: '#666',
    fontWeight: '600',
  },
  
  // Action Buttons
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F5F5F5',
  },
  approveBtn: {
    flex: 1,
    backgroundColor: '#4CAF50',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  approveBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  rejectBtn: {
    flex: 1,
    backgroundColor: '#F44336',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  rejectBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  
  // Loading & Empty States
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#666',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
  },
  
  // Modals
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  actionModalContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 320,
  },
  actionModalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
    marginBottom: 8,
  },
  actionModalText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  actionModalButtons: {
    gap: 12,
  },
  modalApproveBtn: {
    backgroundColor: '#4CAF50',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalApproveBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  modalRejectBtn: {
    backgroundColor: '#F44336',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalRejectBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  modalCancelBtn: {
    backgroundColor: '#F5F5F5',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalCancelBtnText: {
    color: '#666',
    fontSize: 14,
    fontWeight: '500',
  },
  
  // Reject Modal
  rejectModalContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 360,
  },
  rejectModalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
    marginBottom: 8,
  },
  rejectModalText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  rejectInput: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#333',
    minHeight: 100,
    marginBottom: 20,
  },
  rejectModalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  rejectConfirmBtn: {
    flex: 1,
    backgroundColor: '#F44336',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  rejectConfirmBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  rejectCancelBtn: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  rejectCancelBtnText: {
    color: '#666',
    fontSize: 14,
    fontWeight: '500',
  },
  
  // Filter Modal Styles - Bottom Sheet
  filterModalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingTop: Platform.OS === 'android' ? 0 : 50,
  },
  filterModalBackdrop: {
    flex: 1,
  },
  filterBottomSheetModal: {
    backgroundColor: '#F8F9FA',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: Platform.OS === 'ios' ? 60 : 20,
    paddingTop: 8,
  },
  filterHandleContainer: {
    paddingVertical: 12,
    alignItems: 'center',
    width: '100%',
  },
  filterHandleBar: {
    width: 40,
    height: 4,
    backgroundColor: '#DDD',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 8,
    marginBottom: 16,
  },
  filterBottomSheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  filterLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  filterRight: {
    flexDirection: 'row',
    gap: 8,
  },
  filterModalTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  filterScrollContent: {
    maxHeight: 400,
  },
  filterSection: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  filterSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
  },
  filterChipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterChipLarge: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#F8F9FA',
    borderWidth: 1,
    borderColor: '#E9ECEF',
  },
  filterChipActive: {
    backgroundColor: '#004643',
    borderColor: '#004643',
  },
  filterChipTextLarge: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  filterChipTextActive: {
    color: '#fff',
    fontWeight: '600',
  },

  filterResetBtn: {
    padding: 8,
    borderRadius: 6,
    backgroundColor: '#F8F9FA',
    borderWidth: 1,
    borderColor: '#E9ECEF',
  },
  filterApplyBtn: {
    padding: 8,
    borderRadius: 6,
    backgroundColor: '#004643',
  },

  // Dinas Card
  dinasCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  dinasCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  dinasCardTitle: { 
    flex: 1, 
    marginRight: 10 
  },
  dinasKegiatanName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  dinasSptNumber: {
    fontSize: 12,
    color: '#666',
  },
  dinasCardInfo: { 
    marginBottom: 0,
  },
  dinasInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  dinasInfoText: {
    fontSize: 13,
    color: '#666',
    marginLeft: 6,
  },
  
  // Badge Container
  badgeContainer: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
  },
  statusBadgeSmall: {
    minWidth: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  statusBadgeGreen: {
    backgroundColor: '#4CAF50',
  },
  statusBadgeYellow: {
    backgroundColor: '#FF9800',
  },
  statusBadgeRed: {
    backgroundColor: '#F44336',
  },
  statusBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },

});