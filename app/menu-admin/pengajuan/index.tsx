import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { 
  View, Text, StyleSheet, TouchableOpacity, FlatList, 
  ActivityIndicator, Modal, Image, ScrollView, TextInput, Platform, RefreshControl, Animated, PanResponder 
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect, useLocalSearchParams } from 'expo-router';
import * as NavigationBar from 'expo-navigation-bar';
import { AppHeader } from "../../../components";
import { PusatValidasiAPI, KelolaDinasAPI } from '../../../constants/config';
import { CustomAlert } from '../../../components/CustomAlert';
import { useCustomAlert } from '../../../hooks/useCustomAlert';



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
  status: string;
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

export default function PengajuanScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [activeTab, setActiveTab] = useState('absen_dinas');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { visible, config, showAlert, hideAlert, handleConfirm } = useCustomAlert();
  
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
  const [searchQuery, setSearchQuery] = useState('');
  
  // Bottom sheet animation
  const translateY = useRef(new Animated.Value(300)).current;

  useFocusEffect(
    useCallback(() => {
      // Set initial tab dari params jika ada, default ke 'pengajuan' untuk notifikasi pengajuan
      if (params.initialTab) {
        setActiveTab(params.initialTab as string);
      } else {
        setActiveTab('absen_dinas');
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
        showAlert({ type: 'success', title: 'Berhasil', message: 'Item berhasil disetujui' });
        await fetchAllData();
      } else {
        showAlert({ type: 'error', title: 'Error', message: result.message });
      }
    } catch (error) {
      showAlert({ type: 'error', title: 'Error', message: 'Gagal menyetujui item' });
    } finally {
      setActionLoading(false);
      setShowActionModal(false);
    }
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) {
      showAlert({ type: 'error', title: 'Error', message: 'Catatan penolakan wajib diisi' });
      return;
    }

    setActionLoading(true);
    try {
      const id = selectedType === 'absen_dinas' ? selectedItem.id : selectedItem.id_pengajuan;
      
      const result = await PusatValidasiAPI.tolak(selectedType, id, rejectReason);
      
      if (result.success) {
        showAlert({ type: 'success', title: 'Berhasil', message: 'Item berhasil ditolak' });
        await fetchAllData();
        setRejectReason('');
      } else {
        showAlert({ type: 'error', title: 'Error', message: result.message });
      }
    } catch (error) {
      showAlert({ type: 'error', title: 'Error', message: 'Gagal menolak item' });
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
      'izin_datang_terlambat': 'Izin Datang Terlambat',
      'pulang_cepat_terencana': 'Pulang Cepat Terencana',
      'pulang_cepat_mendadak': 'Pulang Cepat Mendadak',
      'koreksi_presensi': 'Koreksi Presensi',
      'lembur_hari_kerja': 'Lembur Hari Kerja',
      'lembur_akhir_pekan': 'Lembur Akhir Pekan',
      'lembur_hari_libur': 'Lembur Hari Libur',
      'dinas_lokal': 'Dinas Lokal',
      'dinas_luar_kota': 'Dinas Luar Kota',
      'dinas_luar_negeri': 'Dinas Luar Negeri'
    };
    return jenisMap[jenis] || jenis.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };



  const handleOpenAbsenDinas = (dinasId: number) => {
    router.push(`/menu-admin/pengajuan/absen-dinas/?dinasId=${dinasId}` as any);
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
            <View style={styles.dinasInfoRow}>
              <View style={styles.dinasInfoIconBox}>
                <Ionicons name="document-text-outline" size={14} color="#00695C" />
              </View>
              <View style={styles.dinasInfoContent}>
                <Text style={styles.dinasInfoLabel}>NO. SPT</Text>
                <Text style={styles.dinasInfoValue}>{item.nomorSpt}</Text>
              </View>
            </View>
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
          {/* Layout 2 Kolom untuk Info */}
          <View style={styles.dinasInfoGrid}>
            {/* Kolom Kiri */}
            <View style={styles.dinasInfoColumn}>
              {item.jenisDinas && (
                <View style={styles.dinasInfoRow}>
                  <View style={styles.dinasInfoIconBox}>
                    <Ionicons name="business-outline" size={14} color="#00695C" />
                  </View>
                  <View style={styles.dinasInfoContent}>
                    <Text style={styles.dinasInfoLabel}>JENIS DINAS</Text>
                    <Text style={styles.dinasInfoValue}>
                      {item.jenisDinas === 'lokal' ? 'Dinas Lokal' : 
                       item.jenisDinas === 'luar_kota' ? 'Dinas Luar Kota' : 
                       item.jenisDinas === 'luar_negeri' ? 'Dinas Luar Negeri' : item.jenisDinas}
                    </Text>
                  </View>
                </View>
              )}
              <View style={styles.dinasInfoRow}>
                <View style={styles.dinasInfoIconBox}>
                  <Ionicons name="time-outline" size={14} color="#00695C" />
                </View>
                <View style={styles.dinasInfoContent}>
                  <Text style={styles.dinasInfoLabel}>JAM KERJA</Text>
                  <Text style={styles.dinasInfoValue}>{item.jamKerja}</Text>
                </View>
              </View>
              <View style={[styles.dinasInfoRow, { marginBottom: 0 }]}>
                <View style={styles.dinasInfoIconBox}>
                  <Ionicons name="people-outline" size={14} color="#00695C" />
                </View>
                <View style={styles.dinasInfoContent}>
                  <Text style={styles.dinasInfoLabel}>PERSONEL</Text>
                  <Text style={styles.dinasInfoValue}>{totalPegawai} orang bertugas</Text>
                </View>
              </View>
            </View>
            
            {/* Kolom Kanan */}
            <View style={styles.dinasInfoColumn}>
              <View style={styles.dinasInfoRow}>
                <View style={styles.dinasInfoIconBox}>
                  <Ionicons name="location-outline" size={14} color="#00695C" />
                </View>
                <View style={styles.dinasInfoContent}>
                  <Text style={styles.dinasInfoLabel}>LOKASI</Text>
                  <Text style={styles.dinasInfoValue}>{item.lokasi}</Text>
                </View>
              </View>
              <View style={[styles.dinasInfoRow, { marginBottom: 0 }]}>
                <View style={styles.dinasInfoIconBox}>
                  <Ionicons name="calendar-outline" size={14} color="#00695C" />
                </View>
                <View style={styles.dinasInfoContent}>
                  <Text style={styles.dinasInfoLabel}>PERIODE</Text>
                  <Text style={styles.dinasInfoValue}>
                    {formatDate(item.tanggal_mulai)} - {formatDate(item.tanggal_selesai)}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderPengajuanItem = ({ item }: { item: PengajuanItem }) => {
    const getStatusColor = (status: string) => {
      switch (status) {
        case 'menunggu': return '#FF9800';
        case 'disetujui': return '#4CAF50';
        case 'ditolak': return '#F44336';
        default: return '#666';
      }
    };

    const getStatusLabel = (status: string) => {
      switch (status) {
        case 'menunggu': return 'Menunggu';
        case 'disetujui': return 'Disetujui';
        case 'ditolak': return 'Ditolak';
        default: return status;
      }
    };

    const statusColor = getStatusColor(item.status);
    const statusLabel = getStatusLabel(item.status);

    return (
      <TouchableOpacity 
        style={styles.pengajuanCard}
        onPress={() => openActionModal('pengajuan', item)}
        activeOpacity={0.7}
      >
        <View style={styles.cardMainContent}>
          <View style={styles.cardHeader}>
            <View style={styles.titleContainer}>
              <Text style={styles.pengajuanTitle} numberOfLines={1}>{formatJenisPengajuan(item.jenis_pengajuan)}</Text>
              <View style={styles.employeeBadge}>
                <Text style={styles.employeeName}>{item.nama_lengkap}</Text>
              </View>
            </View>
            <View style={styles.headerRight}>
              <View style={[styles.statusTag, { backgroundColor: statusColor + '15' }]}>
                <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
                <Text style={[styles.statusTagText, { color: statusColor }]}>{statusLabel}</Text>
              </View>
            </View>
          </View>

          <View style={styles.cardDivider} />

          <View style={styles.infoGrid}>
            <View style={styles.infoItem}>
              <View style={styles.iconCircle}><Ionicons name="person" size={14} color="#004643" /></View>
              <Text style={styles.infoText} numberOfLines={1}>NIP: {item.nip} • {item.jabatan}</Text>
            </View>
            <View style={styles.infoItem}>
              <View style={styles.iconCircle}><Ionicons name="calendar" size={14} color="#004643" /></View>
              <Text style={styles.infoText}>
                {formatDate(item.tanggal_mulai)}
                {item.tanggal_selesai && item.tanggal_selesai !== item.tanggal_mulai && 
                  ` - ${formatDate(item.tanggal_selesai)}`}
              </Text>
            </View>
            {(item.jam_mulai || item.jam_selesai) && (
              <View style={styles.infoItem}>
                <View style={styles.iconCircle}><Ionicons name="time" size={14} color="#004643" /></View>
                <Text style={styles.infoText}>
                  {item.jam_mulai} {item.jam_selesai && `- ${item.jam_selesai}`}
                </Text>
              </View>
            )}
          </View>

          <View style={styles.cardFooter}>
            <View style={styles.reasonContainer}>
              <Ionicons name="document-text" size={16} color="#64748B" />
              <Text style={styles.reasonText} numberOfLines={2}>{item.alasan_text}</Text>
            </View>
            <View style={styles.actionButtons}>
              <TouchableOpacity 
                style={styles.approveBtn}
                onPress={() => handleApprove('pengajuan', item)}
                disabled={actionLoading}
              >
                <Text style={styles.approveBtnText}>✓</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.rejectBtn}
                onPress={() => openActionModal('pengajuan', item)}
              >
                <Text style={styles.rejectBtnText}>✗</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

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

    // Filter berdasarkan search query
    if (searchQuery.trim() !== '') {
      data = data.filter((item: any) => {
        if (activeTab === 'absen_dinas') {
          return (
            item.namaKegiatan?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            item.nomorSpt?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            item.lokasi?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            item.pegawai?.some((p: any) => 
              p.nama?.toLowerCase().includes(searchQuery.toLowerCase()) ||
              p.nip?.includes(searchQuery)
            )
          );
        } else if (activeTab === 'pengajuan') {
          return (
            item.nama_lengkap?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            item.nip?.includes(searchQuery) ||
            item.jabatan?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            item.alasan_text?.toLowerCase().includes(searchQuery.toLowerCase())
          );
        }
        return true;
      });
    }

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
  }, [absenDinasData, pengajuanData, activeTab, filterPeriod, filterJenis, searchQuery]);

  const renderCurrentTab = () => {
    const data = getCurrentData();
    
    if (loading) {
      return (
        <View style={styles.listContent}>
          {/* ========================================
               SKELETON LOADING STATE - TAB ABSEN DINAS
          ======================================== */}
          
          {activeTab === 'absen_dinas' ? (
            /* Skeleton - Absen Dinas Cards */
            [1, 2, 3].map((item) => (
              <View key={item} style={styles.dinasCard}>
                {/* Skeleton Header - Nama Kegiatan & Badges */}
                <View style={styles.dinasCardHeader}>
                  <View style={styles.dinasCardTitle}>
                    {/* Skeleton Nama Kegiatan */}
                    <View style={styles.skeletonDinasName} />
                    {/* Skeleton Nomor SPT */}
                    <View style={styles.skeletonDinasSpt} />
                  </View>
                  {/* Skeleton Status Badges */}
                  <View style={styles.badgeContainer}>
                    <View style={styles.skeletonBadge} />
                    <View style={styles.skeletonBadge} />
                    <View style={styles.skeletonBadge} />
                  </View>
                </View>
                
                {/* Skeleton Info Section - 2 Kolom */}
                <View style={styles.dinasCardInfo}>
                  <View style={styles.dinasInfoGrid}>
                    {/* Skeleton Kolom Kiri */}
                    <View style={styles.dinasInfoColumn}>
                      {/* Skeleton Jenis Dinas */}
                      <View style={styles.dinasInfoRow}>
                        <View style={styles.skeletonInfoIconBox} />
                        <View style={styles.dinasInfoContent}>
                          <View style={styles.skeletonInfoLabel} />
                          <View style={[styles.skeletonInfoValue, { width: '70%' }]} />
                        </View>
                      </View>
                      {/* Skeleton Jam Kerja */}
                      <View style={styles.dinasInfoRow}>
                        <View style={styles.skeletonInfoIconBox} />
                        <View style={styles.dinasInfoContent}>
                          <View style={styles.skeletonInfoLabel} />
                          <View style={[styles.skeletonInfoValue, { width: '60%' }]} />
                        </View>
                      </View>
                      {/* Skeleton Personel */}
                      <View style={[styles.dinasInfoRow, { marginBottom: 0 }]}>
                        <View style={styles.skeletonInfoIconBox} />
                        <View style={styles.dinasInfoContent}>
                          <View style={styles.skeletonInfoLabel} />
                          <View style={[styles.skeletonInfoValue, { width: '65%' }]} />
                        </View>
                      </View>
                    </View>
                    
                    {/* Skeleton Kolom Kanan */}
                    <View style={styles.dinasInfoColumn}>
                      {/* Skeleton Lokasi */}
                      <View style={styles.dinasInfoRow}>
                        <View style={styles.skeletonInfoIconBox} />
                        <View style={styles.dinasInfoContent}>
                          <View style={styles.skeletonInfoLabel} />
                          <View style={[styles.skeletonInfoValue, { width: '80%' }]} />
                        </View>
                      </View>
                      {/* Skeleton Periode */}
                      <View style={[styles.dinasInfoRow, { marginBottom: 0 }]}>
                        <View style={styles.skeletonInfoIconBox} />
                        <View style={styles.dinasInfoContent}>
                          <View style={styles.skeletonInfoLabel} />
                          <View style={[styles.skeletonInfoValue, { width: '75%' }]} />
                        </View>
                      </View>
                    </View>
                  </View>
                </View>
              </View>
            ))
          ) : (
            /* ========================================
                 SKELETON LOADING STATE - TAB PENGAJUAN
            ======================================== */
            [1, 2, 3, 4].map((item) => (
              <View key={item} style={styles.itemCard}>
                {/* Skeleton Header */}
                <View style={styles.statusRow}>
                  <View>
                    <View style={styles.skeletonUserName} />
                    <View style={styles.skeletonPengajuanBadge} />
                  </View>
                  <View style={styles.skeletonStatusBadge} />
                </View>
                
                {/* Skeleton Info dengan Icon */}
                <View style={styles.skeletonInfoRow}>
                  <View style={styles.skeletonIconCircle} />
                  <View style={styles.skeletonInfoText} />
                </View>
                <View style={styles.skeletonInfoRow}>
                  <View style={styles.skeletonIconCircle} />
                  <View style={styles.skeletonInfoText} />
                </View>
                <View style={styles.skeletonInfoRow}>
                  <View style={styles.skeletonIconCircle} />
                  <View style={styles.skeletonInfoText} />
                </View>
                
                {/* Skeleton Footer */}
                <View style={styles.skeletonFooter}>
                  <View style={styles.skeletonReason} />
                  <View style={styles.skeletonActionButtons}>
                    <View style={styles.skeletonActionBtn} />
                    <View style={styles.skeletonActionBtn} />
                  </View>
                </View>
              </View>
            ))
          )}
        </View>
      );
    }

    /* ========================================
         ACTUAL DATA LIST
    ======================================== */
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
        title="Pengajuan"
        showBack={true}
        showHistoryButton={true}
        onHistoryPress={() => showAlert({ type: 'info', title: 'History', message: 'Fitur history akan segera hadir' })}
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
                placeholder="Cari Pegawai..."
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholderTextColor="#999"
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery("")}>
                  <Ionicons name="close-circle" size={20} color="#999" />
                </TouchableOpacity>
              )}
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

      <CustomAlert
        visible={visible}
        type={config.type}
        title={config.title}
        message={config.message}
        onClose={hideAlert}
        onConfirm={config.onConfirm ? handleConfirm : undefined}
        confirmText={config.confirmText}
        cancelText={config.cancelText}
      />

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
    paddingTop: 0,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    backgroundColor: '#FAFBFC',
  },
  
  // Search and Filter Section
  searchContainer: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
    backgroundColor: '#FAFBFC',
  },
  searchInputWrapper: {
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
  
  // Pengajuan Card (sama seperti Absen Dinas)
  pengajuanCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E8F0EF',
    shadowColor: '#004643',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  cardMainContent: { flex: 1 },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F8F9FA',
  },
  titleContainer: { flex: 1, marginRight: 8 },
  pengajuanTitle: { fontSize: 15, fontWeight: '700', color: '#1E293B', marginBottom: 5 },
  employeeBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  employeeName: { fontSize: 11, color: '#64748B', fontWeight: '600', letterSpacing: 0.5 },
  headerRight: { alignItems: 'flex-end' },
  statusTag: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, marginBottom: 8 },
  statusDot: { width: 6, height: 6, borderRadius: 3, marginRight: 6 },
  statusTagText: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase' },
  cardDivider: { height: 1, backgroundColor: '#F1F5F9', marginBottom: 10 },
  infoGrid: { gap: 6, marginBottom: 10 },
  infoItem: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  iconCircle: { width: 26, height: 26, borderRadius: 13, backgroundColor: '#F0FDF4', justifyContent: 'center', alignItems: 'center' },
  infoText: { fontSize: 12, color: '#475569', flex: 1 },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'transparent',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F8F9FA',
  },
  reasonContainer: { flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1, marginRight: 12 },
  reasonText: { fontSize: 12, color: '#64748B', flex: 1 },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  approveBtn: {
    width: 32,
    height: 32,
    backgroundColor: '#4CAF50',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  approveBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  rejectBtn: {
    width: 32,
    height: 32,
    backgroundColor: '#F44336',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rejectBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  
  // Loading & Empty States
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 50,
    paddingBottom: 50,
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
    paddingTop: 50,
    paddingBottom: 50,
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
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E8F0EF',
    shadowColor: '#004643',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  dinasCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F8F9FA',
  },
  dinasCardTitle: { 
    flex: 1, 
    marginRight: 16,
  },
  dinasKegiatanName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 8,
    letterSpacing: -0.2,
    lineHeight: 20,
  },
  dinasCardInfo: { 
    marginBottom: 0,
  },
  
  // Dinas Info Grid - 2 Kolom Layout
  dinasInfoGrid: {
    flexDirection: 'row',
    gap: 20,
  },
  dinasInfoColumn: {
    flex: 1,
  },
  dinasInfoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  dinasInfoIconBox: {
    width: 24,
    height: 24,
    backgroundColor: '#F0F7F7',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    marginTop: 1,
  },
  dinasInfoContent: {
    flex: 1,
  },
  dinasInfoLabel: {
    fontSize: 8,
    fontWeight: '800',
    color: '#95A5A6',
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  dinasInfoValue: {
    color: '#576574',
    fontSize: 12,
    fontWeight: '500',
    lineHeight: 15,
  },
  
  // Badge Container
  badgeContainer: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    marginTop: 4,
  },
  statusBadgeSmall: {
    minWidth: 26,
    height: 26,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
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

  /* ========================================
     SKELETON STYLES - TAB ABSEN DINAS
  ======================================== */
  // Skeleton untuk Card Header
  skeletonDinasName: {
    width: '70%',
    height: 16,
    backgroundColor: '#E0E0E0',
    borderRadius: 4,
    marginBottom: 8,
  },
  skeletonDinasSpt: {
    width: '45%',
    height: 12,
    backgroundColor: '#F0F0F0',
    borderRadius: 4,
  },
  // Skeleton untuk Status Badges
  skeletonBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#E0E0E0',
  },
  // Skeleton untuk Info Icon Box
  skeletonInfoIconBox: {
    width: 24,
    height: 24,
    borderRadius: 8,
    backgroundColor: '#F0F4F3',
    marginRight: 10,
    marginTop: 1,
  },
  // Skeleton untuk Label
  skeletonInfoLabel: {
    width: '40%',
    height: 8,
    backgroundColor: '#F0F4F3',
    borderRadius: 4,
    marginBottom: 2,
  },
  // Skeleton untuk Value Text
  skeletonInfoValue: {
    height: 12,
    backgroundColor: '#F0F4F3',
    borderRadius: 4,
  },
  
  /* ========================================
     SKELETON STYLES - TAB PENGAJUAN
  ======================================== */
  // Skeleton untuk Card
  itemCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E8F0EF',
  },
  itemContent: {
    flex: 1,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F8F9FA',
  },
  // Skeleton untuk Title & Badge
  skeletonUserName: {
    width: '60%',
    height: 15,
    backgroundColor: '#E0E0E0',
    borderRadius: 4,
    marginBottom: 5,
  },
  skeletonPengajuanBadge: {
    width: 70,
    height: 18,
    backgroundColor: '#F0F0F0',
    borderRadius: 6,
  },
  skeletonStatusBadge: {
    width: 80,
    height: 22,
    backgroundColor: '#E0E0E0',
    borderRadius: 20,
  },
  // Skeleton untuk Info dengan Icon
  skeletonInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  skeletonIconCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#F0F4F3',
    marginRight: 10,
  },
  skeletonInfoText: {
    flex: 1,
    height: 12,
    backgroundColor: '#F0F0F0',
    borderRadius: 4,
  },
  // Skeleton untuk Footer
  skeletonFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F8F9FA',
  },
  skeletonReason: {
    flex: 1,
    height: 12,
    backgroundColor: '#F0F0F0',
    borderRadius: 4,
    marginRight: 12,
  },
  // Skeleton untuk Action Buttons
  skeletonActionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  skeletonActionBtn: {
    width: 32,
    height: 32,
    backgroundColor: '#E0E0E0',
    borderRadius: 16,
  },

});