import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Image, Platform, Modal, Animated, PanResponder, Dimensions, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { API_CONFIG, getApiUrl } from '../../../../constants/config';
import { AppHeader } from '../../../../components';
import Toast from '../../../../components/Toast';
import { useToast } from '../../../../hooks/useToast';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface DetailIzin {
  id_pengajuan: number;
  nama_lengkap: string;
  nip: string;
  foto_profil?: string;
  jabatan: string;
  jenis_pengajuan: string;
  tanggal_mulai: string;
  tanggal_selesai: string;
  keterangan: string;
  dokumen_foto?: string;
  status: string;
  tanggal_pengajuan: string;
  waktu_persetujuan?: string;
  catatan_persetujuan?: string;
}

interface IzinItem {
  tanggal: string;
  jenis_pengajuan: string;
  status: string;
  status_pengajuan?: string;
  status_final?: string;
  keterangan: string;
  tanggal_mulai: string;
  tanggal_selesai: string;
  dokumen_foto?: string;
}

export default function DetailIzinScreen() {
  const router = useRouter();
  const toast = useToast();
  const { id, filter, start_date, end_date } = useLocalSearchParams();
  const [data, setData] = useState<DetailIzin | null>(null);
  const [izinData, setIzinData] = useState<IzinItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [periodInfo, setPeriodInfo] = useState('');
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [detailIzin, setDetailIzin] = useState<any>(null);
  const translateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const exportTranslateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const [summary, setSummary] = useState({
    total_pengajuan: 0,
    disetujui: 0,
    pending: 0,
    ditolak: 0,
    total_hari: 0
  });

  const handleExportIzin = async () => {
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
      toast.showToast(`Sedang menyiapkan laporan izin/cuti ${format.toUpperCase()}...`, 'loading');
      
      let params: any = {
        type: 'export_pegawai',
        pegawai_id: id,
        filter_date: filter,
        format: format
      };

      if (start_date) params.start_date = start_date;
      if (end_date) params.end_date = end_date;

      const url = `${getApiUrl(API_CONFIG.ENDPOINTS.EXPORT_PEGAWAI)}?${new URLSearchParams(params).toString()}`;
      
      await Linking.openURL(url);
      
      setTimeout(() => {
        toast.showToast(`Laporan izin/cuti ${format.toUpperCase()} berhasil diunduh!`, 'success');
      }, 1000);
      
    } catch (error: any) {
      console.error('Export izin error:', error);
      toast.showToast('Gagal mengunduh laporan izin/cuti', 'error');
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
    fetchDetail();
    generatePeriodInfo();
  }, [id]);

  const fetchDetail = async () => {
    try {
      setLoading(true);
      
      // Fetch list pengajuan per pegawai
      let params: any = {
        type: 'izin',
        id_pegawai: id
      };
      
      // Add filter params from URL search params
      if (typeof window !== 'undefined') {
        const urlParams = new URLSearchParams(window.location.search);
        const month = urlParams.get('month');
        const year = urlParams.get('year');
        const startDate = urlParams.get('start_date');
        const endDate = urlParams.get('end_date');
        
        if (month && month !== 'null') params.month = month;
        if (year && year !== 'null') params.year = year;
        if (startDate && startDate !== 'null') params.start_date = startDate;
        if (endDate && endDate !== 'null') params.end_date = endDate;
      }
      
      const queryString = new URLSearchParams(params).toString();
      console.log('Fetching detail with params:', queryString);
      
      const response = await fetch(`${getApiUrl(API_CONFIG.ENDPOINTS.DETAIL_LAPORAN)}?${queryString}`);
      const result = await response.json();
      
      console.log('Detail izin response:', result);
      
      if (result.success && result.data && result.data.length > 0) {
        setData(result.data[0]);
        setIzinData(result.data);
        calculateSummary(result.data);
      } else {
        console.error('Failed to fetch detail:', result.message || 'No data found');
      }
    } catch (error) {
      console.error('Error fetching detail:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateSummary = (dataList: any[]) => {
    let totalHari = 0;
    dataList.forEach(item => {
      const start = new Date(item.tanggal_mulai);
      const end = new Date(item.tanggal_selesai);
      const durasi = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      totalHari += durasi;
    });
    
    const getStatus = (item: any) => item.status_final || item.status_pengajuan || item.status || 'menunggu';
    
    setSummary({
      total_pengajuan: dataList.length,
      disetujui: dataList.filter(item => getStatus(item) === 'disetujui').length,
      pending: dataList.filter(item => getStatus(item) === 'menunggu').length,
      ditolak: dataList.filter(item => getStatus(item) === 'ditolak').length,
      total_hari: totalHari
    });
  };

  const generatePeriodInfo = () => {
    const today = new Date();
    const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
    
    if (!filter) {
      setPeriodInfo(`${days[today.getDay()]}, ${today.getDate()} ${months[today.getMonth()]} ${today.getFullYear()}`);
      return;
    }

    switch(filter) {
      case 'hari_ini':
        setPeriodInfo(`${days[today.getDay()]}, ${today.getDate()} ${months[today.getMonth()]} ${today.getFullYear()}`);
        break;
      case 'minggu_ini':
      case 'mingguan':
        if (start_date && end_date) {
          const startDate = new Date(start_date as string);
          const endDate = new Date(end_date as string);
          setPeriodInfo(`${startDate.getDate()} ${months[startDate.getMonth()].slice(0,3)} - ${endDate.getDate()} ${months[endDate.getMonth()].slice(0,3)} ${endDate.getFullYear()}`);
        } else {
          const startOfWeek = new Date(today);
          startOfWeek.setDate(today.getDate() - today.getDay());
          const endOfWeek = new Date(startOfWeek);
          endOfWeek.setDate(startOfWeek.getDate() + 6);
          setPeriodInfo(`${startOfWeek.getDate()}-${endOfWeek.getDate()} ${months[today.getMonth()]} ${today.getFullYear()}`);
        }
        break;
      case 'bulan_ini':
      case 'bulanan':
        setPeriodInfo(`${months[today.getMonth()]} ${today.getFullYear()}`);
        break;
      case 'tahunan':
        setPeriodInfo(`Tahun ${today.getFullYear()}`);
        break;
      case 'pilih_tanggal':
        if (start_date && end_date) {
          const startDate = new Date(start_date as string);
          const endDate = new Date(end_date as string);
          setPeriodInfo(`${startDate.getDate()} ${months[startDate.getMonth()].slice(0,3)} - ${endDate.getDate()} ${months[endDate.getMonth()].slice(0,3)} ${endDate.getFullYear()}`);
        } else {
          setPeriodInfo(`${days[today.getDay()]}, ${today.getDate()} ${months[today.getMonth()]} ${today.getFullYear()}`);
        }
        break;
      default:
        setPeriodInfo(`${days[today.getDay()]}, ${today.getDate()} ${months[today.getMonth()]} ${today.getFullYear()}`);
    }
  };

  const getStatusColor = (status: string) => {
    const normalizedStatus = status?.toLowerCase();
    switch (normalizedStatus) {
      case 'approved':
      case 'disetujui':
        return '#4CAF50';
      case 'pending':
      case 'menunggu':
        return '#FF9800';
      case 'rejected':
      case 'ditolak':
        return '#F44336';
      default: 
        console.log('Unknown status:', status);
        return '#666';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'approved':
      case 'disetujui':
        return 'Disetujui';
      case 'pending':
      case 'menunggu':
        return 'Menunggu';
      case 'rejected':
      case 'ditolak':
        return 'Ditolak';
      default: return status;
    }
  };

  const formatTanggal = (tanggalString: string) => {
    if (!tanggalString) return '-';
    const date = new Date(tanggalString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const getJenisLabel = (jenis: string) => {
    const labels: any = {
      'cuti_tahunan': 'Cuti Tahunan',
      'cuti_khusus': 'Cuti Khusus',
      'cuti_sakit': 'Cuti Sakit',
      'cuti_alasan_penting': 'Cuti Alasan Penting',
      'izin_pribadi': 'Izin Pribadi',
      'izin_sakit': 'Izin Sakit',
      'izin_datang_terlambat': 'Izin Datang Terlambat',
      'izin_pulang_cepat': 'Izin Pulang Cepat'
    };
    return labels[jenis] || jenis;
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

  const renderIzinItem = (item: any, index: number) => {
    const dateInfo = formatDate(item.tanggal_mulai);
    const status = item.status_final || item.status_pengajuan || item.status || 'menunggu';
    const statusColor = getStatusColor(status);

    return (
      <TouchableOpacity 
        key={index} 
        style={styles.izinItem}
        onPress={() => showDetailForDate(item)}
      >
        <View style={[styles.leftBorder, { backgroundColor: statusColor }]} />
        
        <View style={styles.dateSection}>
          <Text style={styles.dayText}>{dateInfo.day}</Text>
          <Text style={styles.dateText}>{dateInfo.date}</Text>
          <Text style={styles.monthText}>{dateInfo.month}</Text>
        </View>
        
        <View style={styles.contentSection}>
          <View style={styles.statusRow}>
            <Text style={styles.jenisText}>{getJenisLabel(item.jenis_pengajuan)}</Text>
            <Text style={[styles.statusBadgeText, { color: statusColor }]}>
              {getStatusLabel(status)}
            </Text>
          </View>
          
          <Text style={styles.keteranganText} numberOfLines={2}>
            {item.keterangan || 'Tidak ada keterangan'}
          </Text>

          <View style={styles.timeInfo}>
            <Text style={styles.timeText}>
              {formatTanggal(item.tanggal_mulai)} - {formatTanggal(item.tanggal_selesai)}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const showDetailForDate = (item: any) => {
    const start = new Date(item.tanggal_mulai);
    const end = new Date(item.tanggal_selesai);
    const durasi = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    const status = item.status_final || item.status_pengajuan || item.status || 'menunggu';

    console.log('Item clicked:', item);
    console.log('Status final:', status);

    setDetailIzin({
      ...item,
      status: status,
      durasi_hari: durasi
    });
    openBottomSheet();
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
    if (!detailIzin) return null;

    const formatDetailDate = (dateString: string) => {
      const date = new Date(dateString);
      const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
      const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
      return `${days[date.getDay()]}, ${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
    };

    const statusColor = getStatusColor(detailIzin.status || 'pending');
    const statusLabel = getStatusLabel(detailIzin.status || 'pending');

    console.log('Rendering modal with status:', detailIzin.status, 'Color:', statusColor, 'Label:', statusLabel);

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
              <Text style={styles.sheetTitle}>Detail Pengajuan Izin/Cuti</Text>

              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
                <View style={styles.detailHeader}>
                  <Text style={styles.detailDate}>{formatDetailDate(detailIzin.tanggal_mulai)}</Text>
                  <View style={[styles.detailStatusBadge, { backgroundColor: statusColor }]}>
                    <Text style={styles.detailStatusText}>{statusLabel}</Text>
                  </View>
                </View>

                {/* Informasi Pengajuan */}
                <View style={styles.sectionHeaderModal}>
                  <Ionicons name="information-circle-outline" size={18} color="#004643" />
                  <Text style={styles.sectionTitleModal}>Informasi Pengajuan</Text>
                </View>
                <View style={styles.sectionDivider} />

                <View style={styles.confirmItemFull}>
                  <Text style={styles.confirmLabel}>JENIS PENGAJUAN</Text>
                  <Text style={styles.confirmValue}>{getJenisLabel(detailIzin.jenis_pengajuan)}</Text>
                </View>

                <View style={styles.confirmRow}>
                  <View style={styles.confirmItemHalf}>
                    <Text style={styles.confirmLabel}>TANGGAL MULAI</Text>
                    <Text style={styles.confirmValue}>{formatTanggal(detailIzin.tanggal_mulai)}</Text>
                  </View>
                  <View style={styles.confirmItemHalf}>
                    <Text style={styles.confirmLabel}>TANGGAL SELESAI</Text>
                    <Text style={styles.confirmValue}>{formatTanggal(detailIzin.tanggal_selesai)}</Text>
                  </View>
                </View>

                <View style={styles.confirmItemFull}>
                  <Text style={styles.confirmLabel}>DURASI</Text>
                  <Text style={styles.confirmValue}>{detailIzin.durasi_hari} Hari</Text>
                </View>

                <View style={styles.confirmItemFull}>
                  <Text style={styles.confirmLabel}>ALASAN/KETERANGAN</Text>
                  <Text style={styles.descriptionText}>{detailIzin.keterangan || 'Tidak ada keterangan'}</Text>
                </View>

                {/* Dokumen Pendukung */}
                {detailIzin?.dokumen_foto && (
                  <>
                    <View style={styles.sectionHeaderModal}>
                      <Ionicons name="document-attach-outline" size={18} color="#004643" />
                      <Text style={styles.sectionTitleModal}>Dokumen Pendukung</Text>
                    </View>
                    <View style={styles.sectionDivider} />

                    <View style={styles.photoContainer}>
                      <Image 
                        source={{ uri: `${getApiUrl('')}/uploads/pengajuan/${detailIzin.dokumen_foto}` }} 
                        style={styles.dokumenImageModal}
                        resizeMode="cover"
                      />
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

  if (loading) {
    return (
      <View style={styles.container}>
        <StatusBar style="light" translucent={true} backgroundColor="transparent" />
        <AppHeader 
          title="Detail Izin/Cuti"
          showBack={true}
          fallbackRoute="/laporan/laporan-detail-izin"
        />
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          <View style={styles.premiumHeader}>
            <View style={[styles.skeletonText, { width: '80%', height: 22, backgroundColor: 'rgba(255,255,255,0.3)', marginBottom: 10 }]} />
            <View style={[styles.skeletonText, { width: '60%', height: 16, backgroundColor: 'rgba(255,255,255,0.2)' }]} />
          </View>
        </ScrollView>
      </View>
    );
  }

  if (!data) {
    return (
      <View style={styles.container}>
        <StatusBar style="light" translucent={true} backgroundColor="transparent" />
        <AppHeader 
          title="Detail Izin/Cuti"
          showBack={true}
          fallbackRoute="/laporan/laporan-detail-izin"
        />
        <View style={styles.errorContainer}>
          <Text>Data tidak ditemukan</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style="light" translucent={true} backgroundColor="transparent" />
      
      <AppHeader 
        title="Detail Izin/Cuti"
        showBack={true}
        fallbackRoute="/laporan/laporan-detail-izin"
        rightIcon="download-outline"
        onRightPress={handleExportIzin}
      />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Premium Header Section */}
        <View style={styles.premiumHeader}>
          <View style={styles.headerTopRow}>
            <View style={styles.titleWrapper}>
              <Text style={styles.izinTitle}>Laporan Izin/Cuti</Text>
              <View style={styles.periodContainerInline}>
                <Ionicons name="calendar-outline" size={14} color="#B2DFDB" />
                <Text style={styles.periodTextInline}>{periodInfo}</Text>
              </View>
            </View>
            <View style={styles.izinIconContainer}>
              <Ionicons name="document-text" size={28} color="#FFF" />
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
              <Ionicons name="calendar-outline" size={16} color="#B2DFDB" />
              <Text style={styles.summaryText}>Total {summary.total_hari} Hari</Text>
            </View>
          </View>
        </View>

        {/* Statistik Izin */}
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
              <View style={[styles.statIndicator, { backgroundColor: '#FF9800' }]} />
              <Text style={styles.statLabel}>Pending</Text>
              <Text style={styles.statValue}>{summary.pending}</Text>
            </View>
            <View style={styles.statCard}>
              <View style={[styles.statIndicator, { backgroundColor: '#F44336' }]} />
              <Text style={styles.statLabel}>Ditolak</Text>
              <Text style={styles.statValue}>{summary.ditolak}</Text>
            </View>
          </View>
        </View>

        {/* Detail Izin List */}
        <View style={styles.listContainer}>
          {izinData.length > 0 ? (
            izinData.map((item, index) => renderIzinItem(item, index))
          ) : (
            <View style={styles.emptyContainer}>
              <Ionicons name="document-text-outline" size={48} color="#ccc" />
              <Text style={styles.emptyText}>Tidak ada data izin/cuti</Text>
              <Text style={styles.emptySubText}>Belum ada pengajuan untuk periode ini</Text>
            </View>
          )}
        </View>
      </ScrollView>

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
  izinTitle: { fontSize: 22, fontWeight: '800', color: '#FFF', letterSpacing: -0.5, lineHeight: 28, marginBottom: 8 },
  
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
  
  izinIconContainer: {
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
  
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginTop: 12,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  
  section: { 
    backgroundColor: '#fff', 
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 20,
    padding: 20,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 8 },
      android: { elevation: 3 },
    }),
  },
  cardHeader: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginBottom: 15 
  },
  cardTitle: { 
    fontSize: 16, 
    fontWeight: '700', 
    color: '#1A1A1A', 
    marginLeft: 10 
  },
  separator: { 
    height: 1, 
    backgroundColor: '#F0F3F3', 
    marginBottom: 18 
  },
  infoRowModern: { 
    flexDirection: 'row', 
    alignItems: 'flex-start', 
    marginBottom: 18 
  },
  infoIconBox: {
    width: 34,
    height: 34,
    backgroundColor: '#F0F7F7',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
    marginTop: 2,
  },
  infoContentModern: { 
    flex: 1 
  },
  labelModern: { 
    fontSize: 10, 
    fontWeight: '800', 
    color: '#95A5A6', 
    letterSpacing: 1.1, 
    marginBottom: 5 
  },
  valueModern: { 
    fontSize: 15, 
    fontWeight: '600', 
    color: '#2C3E50', 
    lineHeight: 20 
  },
  descriptionText: { 
    fontSize: 14, 
    color: '#576574', 
    lineHeight: 22, 
    fontWeight: '400' 
  },
  durationText: {
    fontSize: 13,
    color: '#7F8C8D',
    marginTop: 4,
    fontStyle: 'italic',
  },
  dokumenImage: { 
    width: '100%', 
    height: 200, 
    borderRadius: 12, 
    resizeMode: 'cover',
    backgroundColor: '#F0F3F3',
  },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 20 },
  
  // Skeleton Styles
  skeletonText: { backgroundColor: '#E0E0E0', borderRadius: 4 },

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

  // List Container
  listContainer: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  izinItem: {
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
  jenisText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#004643',
    marginBottom: 4,
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
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
    marginTop: 12,
  },
  emptySubText: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 4,
    textAlign: 'center',
  },

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
  photoContainer: {
    backgroundColor: '#F8F9FA',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
    marginBottom: 16,
  },
  dokumenImageModal: {
    width: '100%',
    height: 200,
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
