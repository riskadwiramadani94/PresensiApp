import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Platform, FlatList, Modal, Animated, PanResponder, Dimensions, Image, Linking } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { AppHeader, CustomAlert } from '../../../../components';
import { useCustomAlert } from '../../../../hooks/useCustomAlert';
import { API_CONFIG, getApiUrl } from '../../../../constants/config';
import Toast from '../../../../components/Toast';
import { useToast } from '../../../../hooks/useToast';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface LemburDetail {
  tanggal: string;
  status_pengajuan: string;
  status_final: string;
  jam_rencana_mulai: string | null;
  jam_rencana_selesai: string | null;
  jam_actual_masuk: string | null;
  jam_actual_pulang: string | null;
  keterangan: string;
  has_pengajuan: boolean;
  has_absen: boolean;
  foto_masuk?: string;
  foto_pulang?: string;
  lintang_masuk?: number;
  bujur_masuk?: number;
  lintang_pulang?: number;
  bujur_pulang?: number;
  jam_actual_total?: number;
  total_jam?: number;
  face_confidence?: number;
  id_lokasi_kantor?: number;
  status_absen?: string;
}

interface PegawaiData {
  id_pegawai: number;
  nama_lengkap: string;
  nip: string;
  foto_profil?: string;
  jabatan?: string;
  divisi?: string;
}

/**
 * Detail Lembur Pegawai Screen
 * 
 * Modal detail hanya menampilkan data absensi lembur aktual dari tabel absen_lembur:
 * - Jam masuk & jam pulang aktual
 * - Total jam lembur
 * - Foto masuk & foto pulang
 * - Koordinat GPS (lintang/bujur)
 * - Face confidence (jika ada)
 * - Status absen
 * 
 * Data pengajuan lembur TIDAK ditampilkan di modal karena sudah ada di card list
 */
export default function DetailLemburPegawaiScreen() {
  const alert = useCustomAlert();
  const toast = useToast();
  const router = useRouter();
  const params = useLocalSearchParams();
  const [loading, setLoading] = useState(true);
  const [pegawai, setPegawai] = useState<PegawaiData | null>(null);
  const [lemburData, setLemburData] = useState<LemburDetail[]>([]);
  const [periodInfo, setPeriodInfo] = useState('');
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [detailLembur, setDetailLembur] = useState<any>(null);
  const translateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const exportTranslateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const [summary, setSummary] = useState({
    total_pengajuan: 0,
    disetujui: 0,
    pending: 0,
    ditolak: 0,
    total_jam: 0,
    total_hari: 0,
    total_hadir: 0
  });

  const handleExportLembur = async () => {
    setShowExportModal(true);
    Animated.timing(exportTranslateY, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  const closeExportModal = () => {
    Animated.timing(exportTranslateY, {
      toValue: SCREEN_HEIGHT,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setShowExportModal(false);
    });
  };

  const handleExportFormat = async (format: 'excel' | 'pdf') => {
    closeExportModal();
    
    try {
      toast.showToast(`Sedang menyiapkan laporan lembur ${format.toUpperCase()}...`, 'loading');
      
      let params: any = {
        type: 'export_pegawai',
        pegawai_id: params.id,
        filter_date: params.filter,
        format: format
      };

      if (params.start_date) params.start_date = params.start_date;
      if (params.end_date) params.end_date = params.end_date;
      if (params.month) params.month = params.month;
      if (params.year) params.year = params.year;

      const url = `${getApiUrl(API_CONFIG.ENDPOINTS.EXPORT_PEGAWAI)}?${new URLSearchParams(params).toString()}`;
      
      await Linking.openURL(url);
      
      setTimeout(() => {
        toast.showToast(`Laporan lembur ${format.toUpperCase()} berhasil diunduh!`, 'success');
      }, 1000);
      
    } catch (error: any) {
      console.error('Export lembur error:', error);
      toast.showToast('Gagal mengunduh laporan lembur', 'error');
    }
  };

  const exportPanResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: (_, gestureState) => gestureState.dy > 5,
    onPanResponderMove: (_, gestureState) => {
      if (gestureState.dy > 0) {
        exportTranslateY.setValue(gestureState.dy);
      }
    },
    onPanResponderRelease: (_, gestureState) => {
      if (gestureState.dy > 100) {
        closeExportModal();
      } else {
        Animated.spring(exportTranslateY, {
          toValue: 0,
          useNativeDriver: true,
        }).start();
      }
    },
  });

  useEffect(() => {
    if (params.id) {
      fetchDetailData();
      generatePeriodInfo();
    }
  }, [params.id]);

  const generatePeriodInfo = () => {
    const { filter, start_date, end_date, month, year } = params;
    const today = new Date();
    const months = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];

    switch (filter) {
      case 'mingguan':
        if (start_date && end_date) {
          const startDate = new Date(start_date as string);
          const endDate = new Date(end_date as string);
          setPeriodInfo(`${startDate.getDate()} ${months[startDate.getMonth()].slice(0, 3)} - ${endDate.getDate()} ${months[endDate.getMonth()].slice(0, 3)} ${endDate.getFullYear()}`);
        }
        break;
      case 'bulanan':
        if (month && year) {
          const targetMonth = parseInt(month as string) - 1;
          const targetYear = parseInt(year as string);
          setPeriodInfo(`${months[targetMonth]} ${targetYear}`);
        } else {
          setPeriodInfo(`${months[today.getMonth()]} ${today.getFullYear()}`);
        }
        break;
      case 'tahunan':
        if (year) {
          setPeriodInfo(`Tahun ${year}`);
        } else {
          setPeriodInfo(`Tahun ${today.getFullYear()}`);
        }
        break;
      default:
        setPeriodInfo('Periode tidak diketahui');
    }
  };

  const fetchDetailData = async () => {
    try {
      setLoading(true);
      
      // Fetch pegawai data
      const pegawaiResponse = await fetch(`${getApiUrl(API_CONFIG.ENDPOINTS.DETAIL_PEGAWAI)}/${params.id}`);
      const pegawaiResult = await pegawaiResponse.json();

      if (pegawaiResult.success && pegawaiResult.data) {
        setPegawai(pegawaiResult.data);
        await fetchLemburData();
      }
    } catch (error) {
      console.error('Error fetching detail:', error);
      alert.showAlert({ type: 'error', message: 'Gagal memuat detail pegawai' });
    } finally {
      setLoading(false);
    }
  };

  const fetchLemburData = async () => {
    try {
      const { filter, start_date, end_date, month, year } = params;
      let queryParams: any = {
        id_pegawai: params.id,
        type: 'lembur'
      };

      if (filter === 'mingguan' && start_date && end_date) {
        queryParams.start_date = start_date;
        queryParams.end_date = end_date;
      } else if (filter === 'bulanan' && month && year) {
        queryParams.month = month;
        queryParams.year = year;
      } else if (filter === 'tahunan' && year) {
        queryParams.year = year;
      }

      const response = await fetch(`${getApiUrl(API_CONFIG.ENDPOINTS.DETAIL_LAPORAN)}?${new URLSearchParams(queryParams).toString()}`);
      const result = await response.json();

      if (result.success && result.data) {
        if (Array.isArray(result.data)) {
          setLemburData(result.data);
          calculateSummary(result.data);
        }
      }
    } catch (error) {
      console.error('Error fetching lembur data:', error);
      setLemburData([]);
    }
  };

  const calculateSummary = (data: LemburDetail[]) => {
    const summary = {
      total_pengajuan: data.length,
      disetujui: data.filter(item => item.status_pengajuan === 'disetujui').length,
      pending: data.filter(item => item.status_pengajuan === 'menunggu').length,
      ditolak: data.filter(item => item.status_pengajuan === 'ditolak').length,
      total_jam: 0,
      total_hari: data.filter(item => item.status_pengajuan === 'disetujui').length,
      total_hadir: data.filter(item => item.jam_actual_masuk !== null).length
    };

    // Calculate total hours from actual absen lembur
    data.forEach(item => {
      if (item.jam_actual_total) {
        summary.total_jam += item.jam_actual_total;
      } else if (item.jam_actual_masuk && item.jam_actual_pulang) {
        const start = new Date(`2000-01-01 ${item.jam_actual_masuk}`);
        const end = new Date(`2000-01-01 ${item.jam_actual_pulang}`);
        const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
        summary.total_jam += hours;
      }
    });

    setSummary(summary);
  };

  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'Sudah Absen Lengkap':
      case 'selesai':
        return { label: 'Sudah Absen Lengkap', color: '#4CAF50', icon: 'checkmark-circle' };
      case 'Sudah Absen Masuk':
      case 'masuk':
        return { label: 'Sudah Absen Masuk', color: '#2196F3', icon: 'log-in' };
      case 'Belum Absen':
        return { label: 'Belum Absen', color: '#FF9800', icon: 'time' };
      case 'disetujui':
        return { label: 'Disetujui', color: '#4CAF50', icon: 'checkmark-circle' };
      case 'menunggu':
        return { label: 'Menunggu', color: '#FF9800', icon: 'time' };
      case 'ditolak':
        return { label: 'Ditolak', color: '#F44336', icon: 'close-circle' };
      default:
        return { label: status, color: '#9E9E9E', icon: 'help-circle' };
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Ags', 'Sep', 'Okt', 'Nov', 'Des'];
    
    return {
      day: days[date.getDay()],
      date: date.getDate(),
      month: months[date.getMonth()],
      fullDate: `${days[date.getDay()]}, ${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`
    };
  };

  const renderLemburItem = ({ item }: { item: LemburDetail }) => {
    const dateInfo = formatDate(item.tanggal);
    const statusInfo = getStatusInfo(item.status_final);

    return (
      <TouchableOpacity 
        style={styles.lemburItem}
        onPress={() => showDetailForDate(item)}
      >
        <View style={[styles.leftBorder, { backgroundColor: statusInfo.color }]} />
        
        <View style={styles.dateSection}>
          <Text style={styles.dayText}>{dateInfo.day}</Text>
          <Text style={styles.dateText}>{dateInfo.date}</Text>
          <Text style={styles.monthText}>{dateInfo.month}</Text>
        </View>
        
        <View style={styles.contentSection}>
          <View style={styles.statusRow}>
            <Text style={styles.keteranganText} numberOfLines={2}>
              {item.keterangan || 'Tidak ada keterangan'}
            </Text>
            <Text style={[styles.statusBadgeText, { color: statusInfo.color }]}>
              {statusInfo.label}
            </Text>
          </View>

          <View style={styles.timeInfo}>
            {item.jam_rencana_mulai && (
              <Text style={styles.timeText}>
                Rencana: {item.jam_rencana_mulai} - {item.jam_rencana_selesai || '-'}
              </Text>
            )}
            {item.jam_actual_masuk && (
              <Text style={styles.timeTextActual}>
                Actual: {item.jam_actual_masuk} - {item.jam_actual_pulang || '...'}
              </Text>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <StatusBar style="light" translucent={true} backgroundColor="transparent" />
        <AppHeader title="Detail Lembur Pegawai" showBack={true} />
        
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          {/* Skeleton Loading */}
          <View style={styles.premiumHeader}>
            <View style={[styles.skeletonText, { width: '80%', height: 22, backgroundColor: 'rgba(255,255,255,0.3)', marginBottom: 10 }]} />
            <View style={[styles.skeletonText, { width: '60%', height: 16, backgroundColor: 'rgba(255,255,255,0.2)' }]} />
          </View>

          <View style={styles.listContainer}>
            {[1, 2, 3, 4, 5].map((item) => (
              <View key={item} style={styles.lemburItem}>
                <View style={[styles.skeletonText, { width: 4, height: '100%', backgroundColor: '#E0E0E0' }]} />
                <View style={styles.dateSection}>
                  <View style={[styles.skeletonText, { width: 40, height: 12, backgroundColor: '#F0F0F0', marginBottom: 4 }]} />
                  <View style={[styles.skeletonText, { width: 30, height: 20, backgroundColor: '#E0E0E0', marginBottom: 4 }]} />
                  <View style={[styles.skeletonText, { width: 35, height: 12, backgroundColor: '#F0F0F0' }]} />
                </View>
                <View style={styles.contentSection}>
                  <View style={[styles.skeletonText, { width: '100%', height: 14, backgroundColor: '#E0E0E0', marginBottom: 6 }]} />
                  <View style={[styles.skeletonText, { width: '90%', height: 12, backgroundColor: '#F0F0F0', marginBottom: 6 }]} />
                  <View style={[styles.skeletonText, { width: '70%', height: 11, backgroundColor: '#F0F0F0' }]} />
                </View>
              </View>
            ))}
          </View>
        </ScrollView>
      </View>
    );
  }

  if (!pegawai) {
    return (
      <View style={styles.container}>
        <StatusBar style="light" translucent={true} backgroundColor="transparent" />
        <AppHeader title="Detail Lembur Pegawai" showBack={true} />
        <View style={styles.emptyContainer}>
          <Ionicons name="alert-circle-outline" size={64} color="#E0E0E0" />
          <Text style={styles.emptyText}>Data pegawai tidak ditemukan</Text>
        </View>
      </View>
    );
  }

  const showDetailForDate = (item: LemburDetail) => {
    setDetailLembur({
      tanggal: item.tanggal,
      status_final: item.status_final,
      absen: item.jam_actual_masuk ? {
        jam_masuk: item.jam_actual_masuk,
        jam_pulang: item.jam_actual_pulang,
        foto_masuk: item.foto_masuk,
        foto_pulang: item.foto_pulang,
        lintang_masuk: item.lintang_masuk,
        bujur_masuk: item.bujur_masuk,
        lintang_pulang: item.lintang_pulang,
        bujur_pulang: item.bujur_pulang,
        total_jam: item.total_jam || item.jam_actual_total || (item.jam_actual_masuk && item.jam_actual_pulang ? 
          calculateDuration(item.jam_actual_masuk, item.jam_actual_pulang) : '-'),
        face_confidence: item.face_confidence,
        status_absen: item.status_absen,
        lokasi_masuk: 'Kantor',
        lokasi_pulang: 'Kantor'
      } : null
    });
    openBottomSheet();
  };

  const calculateDuration = (start: string, end: string) => {
    if (!start || !end) return '-';
    try {
      const startTime = new Date(`2000-01-01 ${start}`);
      const endTime = new Date(`2000-01-01 ${end}`);
      const diff = endTime.getTime() - startTime.getTime();
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      return `${hours} jam ${minutes} menit`;
    } catch {
      return '-';
    }
  };

  const openBottomSheet = () => {
    setShowDetailModal(true);
    Animated.spring(translateY, {
      toValue: 0,
      useNativeDriver: true,
      tension: 65,
      friction: 11,
    }).start();
  };

  const closeBottomSheet = () => {
    Animated.timing(translateY, {
      toValue: SCREEN_HEIGHT,
      duration: 250,
      useNativeDriver: true,
    }).start(() => {
      setShowDetailModal(false);
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
        closeBottomSheet();
      } else {
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: true,
        }).start();
      }
    },
  });

  const renderDetailModal = () => {
    if (!detailLembur) return null;

    const formatDetailDate = (dateString: string) => {
      const date = new Date(dateString);
      const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
      const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
      return `${days[date.getDay()]}, ${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
    };

    const statusInfo = getStatusInfo(detailLembur.status_final);

    return (
      <Modal
        visible={showDetailModal}
        transparent={true}
        animationType="none"
        statusBarTranslucent
        onRequestClose={closeBottomSheet}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={closeBottomSheet} />
          <Animated.View style={[styles.bottomSheet, { transform: [{ translateY }] }]}>
            <View {...panResponder.panHandlers} style={styles.handleContainer}>
              <View style={styles.handleBar} />
            </View>

            <View style={styles.sheetContent}>
              <Text style={styles.sheetTitle}>Detail Absensi Lembur</Text>

              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
                <View style={styles.detailHeader}>
                  <Text style={styles.detailDate}>{formatDetailDate(detailLembur.tanggal)}</Text>
                  <View style={[styles.detailStatusBadge, { backgroundColor: statusInfo.color }]}>
                    <Ionicons name={statusInfo.icon as any} size={16} color="white" />
                    <Text style={styles.detailStatusText}>{statusInfo.label}</Text>
                  </View>
                </View>

                {detailLembur.absen ? (
                  <>
                    {/* Waktu Absensi Lembur */}
                    <View style={styles.sectionHeaderModal}>
                      <Ionicons name="time-outline" size={18} color="#004643" />
                      <Text style={styles.sectionTitleModal}>Waktu Absensi Lembur</Text>
                    </View>
                    <View style={styles.sectionDivider} />

                    <View style={styles.confirmRow}>
                      <View style={styles.confirmItemHalf}>
                        <Text style={styles.confirmLabel}>Jam Masuk</Text>
                        <Text style={styles.confirmValue}>{detailLembur.absen.jam_masuk}</Text>
                      </View>
                      <View style={styles.confirmItemHalf}>
                        <Text style={styles.confirmLabel}>Jam Pulang</Text>
                        <Text style={styles.confirmValue}>{detailLembur.absen.jam_pulang || '-'}</Text>
                      </View>
                    </View>

                    <View style={styles.confirmItemFull}>
                      <Text style={styles.confirmLabel}>Total Jam Lembur</Text>
                      <Text style={styles.confirmValue}>{detailLembur.absen.total_jam}</Text>
                    </View>

                    {/* Lokasi Absensi */}
                    <View style={styles.sectionHeaderModal}>
                      <Ionicons name="location-outline" size={18} color="#004643" />
                      <Text style={styles.sectionTitleModal}>Lokasi Absensi</Text>
                    </View>
                    <View style={styles.sectionDivider} />

                    <View style={styles.confirmRow}>
                      <View style={styles.confirmItemHalf}>
                        <Text style={styles.confirmLabel}>Lokasi Masuk</Text>
                        <Text style={styles.confirmValue}>{detailLembur.absen.lokasi_masuk || '-'}</Text>
                      </View>
                      <View style={styles.confirmItemHalf}>
                        <Text style={styles.confirmLabel}>Lokasi Pulang</Text>
                        <Text style={styles.confirmValue}>{detailLembur.absen.lokasi_pulang || '-'}</Text>
                      </View>
                    </View>

                    {/* Koordinat GPS */}
                    <View style={styles.sectionHeaderModal}>
                      <Ionicons name="navigate-outline" size={18} color="#004643" />
                      <Text style={styles.sectionTitleModal}>Koordinat GPS</Text>
                    </View>
                    <View style={styles.sectionDivider} />

                    <View style={styles.confirmRow}>
                      <View style={styles.confirmItemHalf}>
                        <Text style={styles.confirmLabel}>Koordinat Masuk</Text>
                        <Text style={[styles.confirmValue, styles.smallText]}>
                          {detailLembur.absen.lintang_masuk && detailLembur.absen.bujur_masuk ? 
                            `${parseFloat(detailLembur.absen.lintang_masuk).toFixed(6)}, ${parseFloat(detailLembur.absen.bujur_masuk).toFixed(6)}` : 
                            'Tidak tersedia'}
                        </Text>
                      </View>
                      <View style={styles.confirmItemHalf}>
                        <Text style={styles.confirmLabel}>Koordinat Pulang</Text>
                        <Text style={[styles.confirmValue, styles.smallText]}>
                          {detailLembur.absen.lintang_pulang && detailLembur.absen.bujur_pulang ? 
                            `${parseFloat(detailLembur.absen.lintang_pulang).toFixed(6)}, ${parseFloat(detailLembur.absen.bujur_pulang).toFixed(6)}` : 
                            'Tidak tersedia'}
                        </Text>
                      </View>
                    </View>

                    {/* Informasi Tambahan */}
                    {(detailLembur.absen.face_confidence || detailLembur.absen.status_absen) && (
                      <>
                        <View style={styles.sectionHeaderModal}>
                          <Ionicons name="information-circle-outline" size={18} color="#004643" />
                          <Text style={styles.sectionTitleModal}>Informasi Tambahan</Text>
                        </View>
                        <View style={styles.sectionDivider} />

                        {detailLembur.absen.face_confidence && (
                          <View style={styles.confirmItemFull}>
                            <Text style={styles.confirmLabel}>Tingkat Kemiripan Wajah</Text>
                            <Text style={styles.confirmValue}>{detailLembur.absen.face_confidence}%</Text>
                          </View>
                        )}

                        {detailLembur.absen.status_absen && (
                          <View style={styles.confirmItemFull}>
                            <Text style={styles.confirmLabel}>Status Absen</Text>
                            <Text style={styles.confirmValue}>{detailLembur.absen.status_absen}</Text>
                          </View>
                        )}
                      </>
                    )}

                    {/* Foto Presensi Lembur */}
                    <View style={styles.sectionHeaderModal}>
                      <Ionicons name="camera-outline" size={18} color="#004643" />
                      <Text style={styles.sectionTitleModal}>Foto Presensi Lembur</Text>
                    </View>
                    <View style={styles.sectionDivider} />

                    <View style={styles.photoRow}>
                      {/* Foto Masuk */}
                      <View style={styles.photoColumn}>
                        <View style={styles.photoHeader}>
                          <Ionicons name="camera" size={16} color="#4CAF50" />
                          <Text style={styles.photoLabel}>Foto Masuk</Text>
                        </View>
                        <View style={styles.photoContainer}>
                          {detailLembur.absen.foto_masuk ? (
                            <Image 
                              source={{ uri: detailLembur.absen.foto_masuk }} 
                              style={styles.photoPresensi}
                              resizeMode="cover"
                            />
                          ) : (
                            <View style={styles.photoPlaceholder}>
                              <Ionicons name="image-outline" size={40} color="#CCC" />
                              <Text style={styles.photoPlaceholderText}>Tidak ada foto</Text>
                            </View>
                          )}
                        </View>
                      </View>
                      
                      {/* Foto Pulang */}
                      <View style={styles.photoColumn}>
                        <View style={styles.photoHeader}>
                          <Ionicons name="camera" size={16} color="#FF5722" />
                          <Text style={styles.photoLabel}>Foto Pulang</Text>
                        </View>
                        <View style={styles.photoContainer}>
                          {detailLembur.absen.foto_pulang ? (
                            <Image 
                              source={{ uri: detailLembur.absen.foto_pulang }} 
                              style={styles.photoPresensi}
                              resizeMode="cover"
                            />
                          ) : (
                            <View style={styles.photoPlaceholder}>
                              <Ionicons name="image-outline" size={40} color="#CCC" />
                              <Text style={styles.photoPlaceholderText}>Tidak ada foto</Text>
                            </View>
                          )}
                        </View>
                      </View>
                    </View>
                  </>
                ) : (
                  <>
                    {/* Waktu Absensi Lembur - Tetap tampil meski kosong */}
                    <View style={styles.sectionHeaderModal}>
                      <Ionicons name="time-outline" size={18} color="#004643" />
                      <Text style={styles.sectionTitleModal}>Waktu Absensi Lembur</Text>
                    </View>
                    <View style={styles.sectionDivider} />

                    <View style={styles.confirmRow}>
                      <View style={styles.confirmItemHalf}>
                        <Text style={styles.confirmLabel}>Jam Masuk</Text>
                        <Text style={styles.confirmValue}>-</Text>
                      </View>
                      <View style={styles.confirmItemHalf}>
                        <Text style={styles.confirmLabel}>Jam Pulang</Text>
                        <Text style={styles.confirmValue}>-</Text>
                      </View>
                    </View>

                    <View style={styles.confirmItemFull}>
                      <Text style={styles.confirmLabel}>Total Jam Lembur</Text>
                      <Text style={styles.confirmValue}>-</Text>
                    </View>

                    {/* Lokasi Absensi - Tetap tampil meski kosong */}
                    <View style={styles.sectionHeaderModal}>
                      <Ionicons name="location-outline" size={18} color="#004643" />
                      <Text style={styles.sectionTitleModal}>Lokasi Absensi</Text>
                    </View>
                    <View style={styles.sectionDivider} />

                    <View style={styles.confirmRow}>
                      <View style={styles.confirmItemHalf}>
                        <Text style={styles.confirmLabel}>Lokasi Masuk</Text>
                        <Text style={styles.confirmValue}>-</Text>
                      </View>
                      <View style={styles.confirmItemHalf}>
                        <Text style={styles.confirmLabel}>Lokasi Pulang</Text>
                        <Text style={styles.confirmValue}>-</Text>
                      </View>
                    </View>

                    {/* Koordinat GPS - Tetap tampil meski kosong */}
                    <View style={styles.sectionHeaderModal}>
                      <Ionicons name="navigate-outline" size={18} color="#004643" />
                      <Text style={styles.sectionTitleModal}>Koordinat GPS</Text>
                    </View>
                    <View style={styles.sectionDivider} />

                    <View style={styles.confirmRow}>
                      <View style={styles.confirmItemHalf}>
                        <Text style={styles.confirmLabel}>Koordinat Masuk</Text>
                        <Text style={[styles.confirmValue, styles.smallText]}>Tidak tersedia</Text>
                      </View>
                      <View style={styles.confirmItemHalf}>
                        <Text style={styles.confirmLabel}>Koordinat Pulang</Text>
                        <Text style={[styles.confirmValue, styles.smallText]}>Tidak tersedia</Text>
                      </View>
                    </View>

                    {/* Foto Presensi Lembur - Tetap tampil meski kosong */}
                    <View style={styles.sectionHeaderModal}>
                      <Ionicons name="camera-outline" size={18} color="#004643" />
                      <Text style={styles.sectionTitleModal}>Foto Presensi Lembur</Text>
                    </View>
                    <View style={styles.sectionDivider} />

                    <View style={styles.photoRow}>
                      {/* Foto Masuk */}
                      <View style={styles.photoColumn}>
                        <View style={styles.photoHeader}>
                          <Ionicons name="camera" size={16} color="#4CAF50" />
                          <Text style={styles.photoLabel}>Foto Masuk</Text>
                        </View>
                        <View style={styles.photoContainer}>
                          <View style={styles.photoPlaceholder}>
                            <Ionicons name="image-outline" size={40} color="#CCC" />
                            <Text style={styles.photoPlaceholderText}>Tidak ada foto</Text>
                          </View>
                        </View>
                      </View>
                      
                      {/* Foto Pulang */}
                      <View style={styles.photoColumn}>
                        <View style={styles.photoHeader}>
                          <Ionicons name="camera" size={16} color="#FF5722" />
                          <Text style={styles.photoLabel}>Foto Pulang</Text>
                        </View>
                        <View style={styles.photoContainer}>
                          <View style={styles.photoPlaceholder}>
                            <Ionicons name="image-outline" size={40} color="#CCC" />
                            <Text style={styles.photoPlaceholderText}>Tidak ada foto</Text>
                          </View>
                        </View>
                      </View>
                    </View>
                  </>
                )}
              </ScrollView>
            </View>
          </Animated.View>
        </View>
      </Modal>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" translucent={true} backgroundColor="transparent" />
      <AppHeader 
        title="Detail Lembur Pegawai" 
        showBack={true}
        rightIcon="download-outline"
        onRightPress={handleExportLembur}
      />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Premium Header Section - Ringkasan Lembur */}
        <View style={styles.premiumHeader}>
          <View style={styles.headerTopRow}>
            <View style={styles.titleWrapper}>
              <Text style={styles.lemburTitle}>Laporan Lembur</Text>
              <View style={styles.periodContainerInline}>
                <Ionicons name="calendar-outline" size={14} color="#B2DFDB" />
                <Text style={styles.periodTextInline}>{periodInfo}</Text>
              </View>
            </View>
            <View style={styles.lemburIconContainer}>
              <Ionicons name="moon" size={28} color="#FFF" />
            </View>
          </View>
          
          {/* Ringkasan Info */}
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Ionicons name="document-text-outline" size={16} color="#B2DFDB" />
              <Text style={styles.summaryText}>{summary.total_pengajuan} Pengajuan</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Ionicons name="time-outline" size={16} color="#B2DFDB" />
              <Text style={styles.summaryText}>Total {Math.round(summary.total_jam)} Jam</Text>
            </View>
          </View>
        </View>

        {/* Statistik Lembur */}
        <View style={styles.statsContainer}>
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <View style={[styles.statIndicator, { backgroundColor: '#2196F3' }]} />
              <Text style={styles.statLabel}>Total Pengajuan</Text>
              <Text style={styles.statValue}>{summary.total_pengajuan}</Text>
            </View>
            <View style={styles.statCard}>
              <View style={[styles.statIndicator, { backgroundColor: '#4CAF50' }]} />
              <Text style={styles.statLabel}>Disetujui</Text>
              <Text style={styles.statValue}>{summary.disetujui}</Text>
            </View>
            <View style={styles.statCard}>
              <View style={[styles.statIndicator, { backgroundColor: '#9C27B0' }]} />
              <Text style={styles.statLabel}>Hadir</Text>
              <Text style={styles.statValue}>{summary.total_hadir}</Text>
            </View>
            <View style={styles.statCard}>
              <View style={[styles.statIndicator, { backgroundColor: '#FF9800' }]} />
              <Text style={styles.statLabel}>Total Jam</Text>
              <Text style={styles.statValue}>{Math.round(summary.total_jam)}</Text>
            </View>
          </View>
        </View>

        {/* Detail Lembur List */}
        <View style={styles.listContainer}>
          {lemburData.length > 0 ? (
            lemburData.map((item, index) => (
              <View key={`${item.tanggal}-${index}`}>
                {renderLemburItem({ item })}
              </View>
            ))
          ) : (
            <View style={styles.emptyContainer}>
              <Ionicons name="moon-outline" size={48} color="#ccc" />
              <Text style={styles.emptyText}>Tidak ada data lembur</Text>
              <Text style={styles.emptySubText}>Belum ada pengajuan lembur untuk periode ini</Text>
            </View>
          )}
        </View>
      </ScrollView>

      <CustomAlert
        visible={alert.visible}
        type={alert.config.type}
        title={alert.config.title}
        message={alert.config.message}
        onClose={alert.hideAlert}
        onConfirm={alert.handleConfirm}
        confirmText={alert.config.confirmText}
        cancelText={alert.config.cancelText}
      />

      {/* Detail Modal */}
      {renderDetailModal()}

      {/* Modal Export Format */}
      <Modal
        visible={showExportModal}
        transparent
        animationType="none"
        statusBarTranslucent
        onRequestClose={closeExportModal}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={closeExportModal} />
          <Animated.View style={[styles.bottomSheetExport, { transform: [{ translateY: exportTranslateY }] }]}>
            <View {...exportPanResponder.panHandlers} style={styles.handleContainer}>
              <View style={styles.handleBar} />
            </View>
            
            <View style={styles.bottomSheetHeader}>
              <Text style={styles.bottomSheetTitle}>Pilih Format Export</Text>
            </View>
            
            <View style={styles.bottomSheetContent}>
              <TouchableOpacity
                style={styles.bottomSheetItem}
                onPress={() => handleExportFormat('excel')}
              >
                <View style={styles.bottomSheetItemLeft}>
                  <View style={styles.bottomSheetIcon}>
                    <Ionicons name="document-outline" size={20} color="#004643" />
                  </View>
                  <Text style={styles.bottomSheetItemText}>Export Excel (.xlsx)</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#666" />
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.bottomSheetItem}
                onPress={() => handleExportFormat('pdf')}
              >
                <View style={styles.bottomSheetItemLeft}>
                  <View style={styles.bottomSheetIcon}>
                    <Ionicons name="document-text-outline" size={20} color="#004643" />
                  </View>
                  <Text style={styles.bottomSheetItemText}>Export PDF (.pdf)</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#666" />
              </TouchableOpacity>
            </View>
          </Animated.View>
        </View>
      </Modal>

      <Toast
        visible={toast.visible}
        message={toast.config.message}
        type={toast.config.type}
        onHide={toast.hideToast}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F7F7' },
  scrollContent: { paddingBottom: 40 },
  
  // Premium Header Style
  premiumHeader: {
    backgroundColor: '#004643',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 30,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    marginBottom: 15,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.15, shadowRadius: 12 },
      android: { elevation: 8 },
    }),
  },
  headerTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 15 },
  titleWrapper: { flex: 1, marginRight: 15 },
  lemburTitle: { fontSize: 22, fontWeight: '800', color: '#FFF', letterSpacing: -0.5, lineHeight: 28, marginBottom: 8 },
  
  periodContainerInline: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  periodTextInline: {
    fontSize: 14,
    color: '#B2DFDB',
    fontWeight: '600',
    marginLeft: 6,
  },
  
  lemburIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
  },
  summaryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  summaryText: {
    fontSize: 13,
    color: '#FFF',
    fontWeight: '600',
  },
  summaryDivider: {
    width: 1,
    height: 20,
    backgroundColor: 'rgba(255,255,255,0.3)',
    marginHorizontal: 12,
  },
  
  listContainer: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  
  // Stats Container
  statsContainer: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  statIndicator: {
    width: 30,
    height: 3,
    borderRadius: 2,
    marginBottom: 8,
  },
  statLabel: {
    fontSize: 10,
    color: '#999',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  lemburItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    marginBottom: 12,
    marginHorizontal: 2,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F0F3F3',
    shadowColor: '#004643',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
    overflow: 'hidden',
  },
  leftBorder: {
    width: 4,
    height: '100%',
  },
  dateSection: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    minWidth: 70,
  },
  dayText: {
    fontSize: 10,
    color: '#999',
    fontWeight: '600',
    marginBottom: 4,
  },
  dateText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  monthText: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  contentSection: {
    flex: 1,
    padding: 12,
    justifyContent: 'center',
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  dayFull: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  keteranganText: {
    fontSize: 12,
    color: '#999',
    marginBottom: 4,
  },
  timeInfo: {
    marginTop: 4,
  },
  timeText: {
    fontSize: 11,
    color: '#888',
    marginBottom: 2,
  },
  timeTextActual: {
    fontSize: 11,
    color: '#4CAF50',
    fontWeight: '500',
  },

  // Empty States
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  emptyState: { alignItems: 'center', paddingVertical: 40 },
  emptyText: { fontSize: 14, fontWeight: '600', color: '#64748B', marginTop: 12 },
  emptySubText: { fontSize: 12, color: '#94A3B8', marginTop: 4, textAlign: 'center' },

  // Skeleton Styles
  skeletonText: { backgroundColor: '#E0E0E0', borderRadius: 4 },

  // Time Row Styles
  timeItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  timeLabel: { fontSize: 11, color: '#64748B', fontWeight: '500' },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalBackdrop: { flex: 1 },
  bottomSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    maxHeight: SCREEN_HEIGHT * 0.85,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 20,
  },
  handleContainer: { paddingVertical: 12, alignItems: 'center' },
  handleBar: { width: 40, height: 4, backgroundColor: '#DDD', borderRadius: 2 },
  sheetContent: { paddingHorizontal: 20, paddingBottom: 16 },
  sheetTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginBottom: 16,
    textAlign: 'center',
  },
  detailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  detailDate: { fontSize: 15, fontWeight: '600', color: '#004643', flex: 1 },
  detailStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 6,
  },
  detailStatusText: { color: 'white', fontSize: 12, fontWeight: '600' },
  sectionHeaderModal: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 16,
    marginBottom: 8,
  },
  sectionTitleModal: { fontSize: 15, fontWeight: '700', color: '#004643' },
  sectionDivider: { height: 1, backgroundColor: '#E5E7EB', marginBottom: 12 },
  confirmRow: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  confirmItemHalf: {
    flex: 1,
    backgroundColor: '#F8F9FA',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  confirmItemFull: {
    backgroundColor: '#F8F9FA',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 12,
  },
  confirmLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  confirmValue: {
    fontSize: 14,
    color: '#1F2937',
    fontWeight: '600',
    lineHeight: 18,
  },
  smallText: { fontSize: 12 },
  photoRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  photoColumn: {
    flex: 1,
  },
  photoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 6,
  },
  photoLabel: {
    fontSize: 12,
    color: '#666',
    fontWeight: '600',
  },
  photoContainer: {
    backgroundColor: '#F8F9FA',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
    aspectRatio: 1,
  },
  photoPresensi: {
    width: '100%',
    height: '100%',
  },
  photoPlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
  },
  photoPlaceholderText: {
    fontSize: 11,
    color: '#999',
    marginTop: 8,
    fontWeight: '500',
  },
  
  // Export Modal Styles
  bottomSheetExport: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    maxHeight: '40%',
  },
  bottomSheetHeader: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  bottomSheetTitle: { fontSize: 18, fontWeight: '600', color: '#333' },
  bottomSheetContent: { maxHeight: 400 },
  bottomSheetItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  bottomSheetItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  bottomSheetIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E6F0EF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bottomSheetItemText: {
    fontSize: 15,
    color: '#333',
    fontWeight: '500',
    flex: 1,
  },
});