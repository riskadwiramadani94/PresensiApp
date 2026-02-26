import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Modal, Image, ScrollView, Animated, PanResponder, Dimensions, Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { AppHeader, SkeletonLoader } from '../../../../components';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface AbsenDetail {
  tanggal: string;
  status: string;
  jam_masuk: string | null;
  jam_keluar: string | null;
  keterangan: string;
}

const statusConfig = {
  'Hadir': { color: '#4CAF50', icon: 'checkmark-circle' },
  'Tidak Hadir': { color: '#a52b06ff', icon: 'close-circle' },
  'Belum Waktunya': { color: '#9E9E9E', icon: 'time-outline' },
  'Belum Absen': { color: '#FF6F00', icon: 'alert-circle' },
  'Terlambat': { color: '#FF9800', icon: 'time' },
  'Izin': { color: '#2196F3', icon: 'information-circle' },
  'Sakit': { color: '#E91E63', icon: 'medical' },
  'Cuti': { color: '#9C27B0', icon: 'calendar' },
  'Pulang Cepat': { color: '#795548', icon: 'exit' },
  'Dinas': { color: '#00BCD4', icon: 'briefcase' },
  'Libur': { color: '#F44336', icon: 'calendar' }
};

import { API_CONFIG, getApiUrl } from '../../../../constants/config';


export default function DetailAbsenPegawai() {
  const router = useRouter();
  const { id, filter, start_date, end_date, month, year } = useLocalSearchParams();
  const [pegawai, setPegawai] = useState({ nama: '', nip: '', user_id: '' });
  const [pegawaiData, setPegawaiData] = useState<any>(null);
  const [absenData, setAbsenData] = useState<AbsenDetail[]>([]);
  const [hariLibur, setHariLibur] = useState<{tanggal: string, nama_libur: string}[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [detailAbsen, setDetailAbsen] = useState<any>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [periodInfo, setPeriodInfo] = useState('');
  
  const translateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;

  useEffect(() => {
    fetchDetailAbsen();
    fetchHariLibur();
    generatePeriodInfo();
  }, []);

  const generatePeriodInfo = () => {
    const today = new Date();
    const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
    
    switch(filter) {
      case 'harian':
      case 'hari_ini':
        if (start_date) {
          const date = new Date(start_date as string);
          setPeriodInfo(`${days[date.getDay()]}, ${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`);
        } else {
          setPeriodInfo(`${days[today.getDay()]}, ${today.getDate()} ${months[today.getMonth()]} ${today.getFullYear()}`);
        }
        break;
      case 'mingguan':
      case 'minggu_ini':
        if (start_date && end_date) {
          const startDate = new Date(start_date as string);
          const endDate = new Date(end_date as string);
          setPeriodInfo(`${startDate.getDate()} ${months[startDate.getMonth()].slice(0,3)} - ${endDate.getDate()} ${months[endDate.getMonth()].slice(0,3)} ${endDate.getFullYear()}`);
        } else {
          const startOfWeek = new Date(today);
          startOfWeek.setDate(today.getDate() - today.getDay());
          const endOfWeek = new Date(startOfWeek);
          endOfWeek.setDate(startOfWeek.getDate() + 6);
          setPeriodInfo(`Minggu, ${startOfWeek.getDate()}-${endOfWeek.getDate()} ${months[today.getMonth()]} ${today.getFullYear()}`);
        }
        break;
      case 'bulanan':
      case 'bulan_ini':
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
      case 'pilih_tanggal':
        if (start_date && end_date) {
          const startDate = new Date(start_date as string);
          const endDate = new Date(end_date as string);
          setPeriodInfo(`${startDate.getDate()} ${months[startDate.getMonth()].slice(0,3)} - ${endDate.getDate()} ${months[endDate.getMonth()].slice(0,3)} ${endDate.getFullYear()}`);
        }
        break;
      default:
        setPeriodInfo('Periode tidak diketahui');
    }
  };

  const fetchHariLibur = async () => {
    try {
      const response = await fetch(getApiUrl(API_CONFIG.ENDPOINTS.HARI_LIBUR));
      const data = await response.json();
      if (data.success) {
        setHariLibur(data.data.map((item: any) => ({ tanggal: item.tanggal, nama_libur: item.nama_libur })));
      }
    } catch (error) {
      // Silent error handling
    }
  };

  const fetchDetailAbsen = async () => {
    setLoading(true);
    
    try {
      // Coba endpoint detail pegawai dulu untuk mendapatkan info pegawai
      const pegawaiResponse = await fetch(`${getApiUrl(API_CONFIG.ENDPOINTS.DETAIL_PEGAWAI)}/${id}`);
      const pegawaiData = await pegawaiResponse.json();
      
      console.log('Pegawai response:', pegawaiData);
      
      if (pegawaiData.success && pegawaiData.data) {
        setPegawaiData(pegawaiData.data);
        setPegawai({ 
          nama: pegawaiData.data.nama_lengkap || 'Nama tidak ditemukan', 
          nip: pegawaiData.data.nip || '-',
          user_id: pegawaiData.data.id_user || pegawaiData.data.id_pegawai || '' 
        });
        
        // Coba ambil data absen dari endpoint presensi pegawai
        const userId = pegawaiData.data.id_user || pegawaiData.data.id_pegawai;
        if (userId) {
          await fetchAbsenData(userId);
        } else {
          setAbsenData([]);
        }
      } else {
        setPegawai({ nama: 'Data pegawai tidak ditemukan', nip: '-', user_id: '' });
        setAbsenData([]);
      }
      
    } catch (error) {
      console.error('Fetch error:', error);
      setPegawai({ nama: 'Error memuat data', nip: '-', user_id: '' });
      setAbsenData([]);
    } finally {
      setLoading(false);
    }
  };
  
  const fetchAbsenData = async (userId: string) => {
    try {
      // Determine date range based on filter
      let startDate, endDate;
      const today = new Date();
      
      switch(filter) {
        case 'harian':
        case 'hari_ini':
          startDate = endDate = start_date ? (start_date as string) : today.toISOString().split('T')[0];
          break;
        case 'mingguan':
        case 'minggu_ini':
          if (start_date && end_date) {
            startDate = start_date as string;
            endDate = end_date as string;
          } else {
            const startOfWeek = new Date(today);
            // Senin sebagai hari pertama (getDay: 0=Minggu, 1=Senin)
            const dayOfWeek = today.getDay();
            const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // Jika Minggu, mundur 6 hari
            startOfWeek.setDate(today.getDate() + diff);
            const endOfWeek = new Date(startOfWeek);
            endOfWeek.setDate(startOfWeek.getDate() + 6);
            startDate = startOfWeek.toISOString().split('T')[0];
            endDate = endOfWeek.toISOString().split('T')[0];
            console.log('Minggu ini:', startDate, 'to', endDate);
          }
          break;
        case 'bulan_ini':
        case 'bulanan':
          // Gunakan month dan year dari parameter jika ada
          const targetYear = year ? parseInt(year as string) : today.getFullYear();
          const targetMonth = month ? parseInt(month as string) - 1 : today.getMonth();
          const firstDay = new Date(Date.UTC(targetYear, targetMonth, 1));
          const lastDay = new Date(Date.UTC(targetYear, targetMonth + 1, 0));
          startDate = firstDay.toISOString().split('T')[0];
          endDate = lastDay.toISOString().split('T')[0];
          console.log('Bulanan - month:', month, 'year:', year, 'startDate:', startDate, 'endDate:', endDate);
          break;
        case 'tahunan':
          const yearValue = year ? parseInt(year as string) : today.getFullYear();
          startDate = new Date(yearValue, 0, 1).toISOString().split('T')[0];
          endDate = new Date(yearValue, 11, 31).toISOString().split('T')[0];
          break;
        case 'pilih_tanggal':
          startDate = start_date as string;
          endDate = end_date as string;
          break;
        default:
          startDate = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
          endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0];
      }
      
      const response = await fetch(`${getApiUrl(API_CONFIG.ENDPOINTS.PEGAWAI_PRESENSI)}?user_id=${userId}&start_date=${startDate}&end_date=${endDate}`);
      const data = await response.json();
      
      console.log('Filter:', filter, '| Date range:', startDate, 'to', endDate);
      
      if (data.success && data.data && Array.isArray(data.data) && data.data.length > 0) {
        const transformedData = transformPresensiData(data.data, startDate, endDate);
        setAbsenData(transformedData);
      } else {
        const emptyData = generateEmptyAbsenData(startDate, endDate);
        setAbsenData(emptyData);
      }
    } catch (error) {
      console.error('Error fetching absen data:', error);
      const today = new Date();
      const startDate = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
      const endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0];
      const emptyData = generateEmptyAbsenData(startDate, endDate);
      setAbsenData(emptyData);
    }
  };
  
  const transformPresensiData = (presensiData: any, startDateStr: string, endDateStr: string) => {
    const absenData = [];
    
    const presensiMap = new Map();
    presensiData.forEach((p: any) => {
      const dateKey = p.tanggal.includes('T') ? p.tanggal.split('T')[0] : p.tanggal;
      presensiMap.set(dateKey, p);
    });
    
    // Parse dates properly to avoid timezone issues
    const [startYear, startMonth, startDay] = startDateStr.split('-').map(Number);
    const [endYear, endMonth, endDay] = endDateStr.split('-').map(Number);
    const startDate = new Date(startYear, startMonth - 1, startDay);
    const endDate = new Date(endYear, endMonth - 1, endDay);
    
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const dateString = `${year}-${month}-${day}`;
      const presensi = presensiMap.get(dateString);
      
      if (presensi) {
        absenData.push({
          tanggal: dateString,
          status: presensi.status,
          jam_masuk: presensi.jam_masuk,
          jam_keluar: presensi.jam_keluar,
          keterangan: presensi.keterangan || presensi.status
        });
      } else {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const itemDate = new Date(d);
        
        let status = 'Tidak Hadir';
        let keterangan = 'Tidak hadir';
        
        if (itemDate > today) {
          status = 'Belum Waktunya';
          keterangan = 'Belum waktunya absen';
        } else if (itemDate.getTime() === today.getTime()) {
          const currentTime = new Date();
          const jamPulang = new Date();
          jamPulang.setHours(17, 0, 0, 0);
          
          if (currentTime < jamPulang) {
            status = 'Belum Absen';
            keterangan = 'Belum melakukan absensi';
          }
        }
        
        absenData.push({
          tanggal: dateString,
          status,
          jam_masuk: null,
          jam_keluar: null,
          keterangan
        });
      }
    }
    
    return absenData;
  };
  
  const generateEmptyAbsenData = (startDateStr: string, endDateStr: string) => {
    const absenData = [];
    
    // Parse dates properly to avoid timezone issues
    const [startYear, startMonth, startDay] = startDateStr.split('-').map(Number);
    const [endYear, endMonth, endDay] = endDateStr.split('-').map(Number);
    const startDate = new Date(startYear, startMonth - 1, startDay);
    const endDate = new Date(endYear, endMonth - 1, endDay);
    
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const dateString = `${year}-${month}-${day}`;
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const itemDate = new Date(d);
      
      let status = 'Tidak Hadir';
      let keterangan = 'Tidak hadir';
      
      if (itemDate > today) {
        status = 'Belum Waktunya';
        keterangan = 'Belum waktunya absen';
      } else if (itemDate.getTime() === today.getTime()) {
        const currentTime = new Date();
        const jamPulang = new Date();
        jamPulang.setHours(17, 0, 0, 0);
        
        if (currentTime < jamPulang) {
          status = 'Belum Absen';
          keterangan = 'Belum melakukan absensi';
        }
      }
      
      absenData.push({
        tanggal: dateString,
        status,
        jam_masuk: null,
        jam_keluar: null,
        keterangan
      });
    }
    
    return absenData;
  };

  const showDetailForDate = (item: AbsenDetail) => {
    const liburInfo = hariLibur.find(h => h.tanggal === item.tanggal);
    
    // Jika status Libur, tampilkan modal libur sederhana
    if (item.status === 'Libur' || liburInfo) {
      const mockLiburData = {
        tanggal: item.tanggal,
        status: 'Libur',
        keterangan: liburInfo ? liburInfo.nama_libur : item.keterangan,
        isLibur: true
      };
      setDetailAbsen(mockLiburData);
      openBottomSheet();
    } else if (item.jam_masuk) {
      setShowDetailModal(true);
      fetchDetailAbsenHarian(item.tanggal, pegawai.user_id);
    } else {
      // Tentukan status berdasarkan waktu untuk yang belum absen
      const today = new Date();
      const currentTime = new Date();
      // Parse item date properly
      const [year, month, day] = item.tanggal.split('-').map(Number);
      const itemDate = new Date(year, month - 1, day);
      itemDate.setHours(0, 0, 0, 0);
      today.setHours(0, 0, 0, 0);
      
      let detailStatus = 'Tidak Hadir';
      let detailKeterangan = 'Tidak hadir';
      
      // Hari ini - cek jam kerja
      if (itemDate.getTime() === today.getTime()) {
        const [batasJam, batasMenit] = [8, 30];
        const [pulangJam, pulangMenit] = [17, 0];
        
        const batasAbsen = new Date();
        batasAbsen.setHours(batasJam, batasMenit, 0, 0);
        
        const jamPulang = new Date();
        jamPulang.setHours(pulangJam, pulangMenit, 0, 0);
        
        if (currentTime > jamPulang) {
          detailStatus = 'Tidak Hadir';
          detailKeterangan = 'Tidak hadir';
        } else if (currentTime > batasAbsen) {
          detailStatus = 'Tidak Hadir';
          detailKeterangan = 'Tidak hadir';
        } else {
          detailStatus = 'Belum Absen';
          detailKeterangan = 'Belum melakukan absensi';
        }
      }
      // Hari yang akan datang
      else if (itemDate > today) {
        detailStatus = 'Belum Waktunya';
        detailKeterangan = 'Belum waktunya absen';
      }
      // Hari yang sudah lewat
      else {
        detailStatus = 'Tidak Hadir';
        detailKeterangan = 'Tidak hadir';
      }
      
      const mockTidakHadirData = {
        tanggal: item.tanggal,
        status: detailStatus,
        jam_masuk: '-',
        jam_pulang: '-',
        lokasi_masuk: '-',
        lokasi_pulang: '-',
        lat_masuk: '-',
        long_masuk: null,
        lat_pulang: null,
        long_pulang: null,
        alasan_pulang_cepat: null,
        foto_masuk: null,
        foto_pulang: null,
        keterangan: detailKeterangan
      };
      setDetailAbsen(mockTidakHadirData);
      openBottomSheet();
    }
  };

  const openBottomSheet = () => {
    setShowDetailModal(true);
    Animated.spring(translateY, {
      toValue: 0,
      useNativeDriver: true,
      tension: 65,
      friction: 11
    }).start();
  };

  const closeBottomSheet = () => {
    Animated.timing(translateY, {
      toValue: SCREEN_HEIGHT,
      duration: 250,
      useNativeDriver: true
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
          useNativeDriver: true
        }).start();
      }
    }
  });

  const fetchDetailAbsenHarian = async (tanggal: string, user_id: string) => {
    try {
      const response = await fetch(`${getApiUrl(API_CONFIG.ENDPOINTS.DETAIL_ABSEN)}?date=${tanggal}&user_id=${user_id}`);
      const data = await response.json();
      
      console.log('📸 Detail Absen Response:', data);
      console.log('📸 Foto Masuk (raw):', data.data?.foto_masuk);
      console.log('📸 Foto Pulang (raw):', data.data?.foto_pulang);
      
      if (data.success) {
        // Format foto path seperti foto profil pegawai
        const fixedData = {
          ...data.data,
          foto_masuk: data.data.foto_masuk ? `${API_CONFIG.BASE_URL}/uploads/presensi/${data.data.foto_masuk}` : null,
          foto_pulang: data.data.foto_pulang ? `${API_CONFIG.BASE_URL}/uploads/presensi/${data.data.foto_pulang}` : null
        };
        console.log('✅ Fixed Foto Masuk:', fixedData.foto_masuk);
        console.log('✅ Fixed Foto Pulang:', fixedData.foto_pulang);
        setDetailAbsen(fixedData);
        openBottomSheet();
      } else {
        const fallbackData = {
          tanggal: tanggal,
          status: 'Tidak Hadir',
          jam_masuk: '-',
          jam_pulang: '-',
          lokasi_masuk: '-',
          lokasi_pulang: '-',
          lat_masuk: null,
          long_masuk: null,
          lat_pulang: null,
          long_pulang: null,
          alasan_pulang_cepat: null,
          foto_masuk: null,
          foto_pulang: null,
          keterangan: 'Tidak ada data absensi'
        };
        setDetailAbsen(fallbackData);
        openBottomSheet();
      }
    } catch (error) {
      console.error('❌ Fetch detail absen error:', error);
    }
  };

  const formatDate = (dateString: string) => {
    // Parse date properly to avoid timezone issues
    const [year, month, day] = dateString.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Ags', 'Sep', 'Okt', 'Nov', 'Des'];
    
    return {
      day: days[date.getDay()],
      date: date.getDate(),
      month: months[date.getMonth()]
    };
  };



  const renderAbsenItem = ({ item }: { item: AbsenDetail }) => {
    const dateInfo = formatDate(item.tanggal);
    const liburInfo = hariLibur.find(h => h.tanggal === item.tanggal);
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    // Parse item date properly
    const [year, month, day] = item.tanggal.split('-').map(Number);
    const itemDate = new Date(year, month - 1, day);
    const isFutureDate = itemDate > today;
    const isDinas = item.status === 'Dinas';
    const isLibur = item.status === 'Libur';
    const isDisabled = isFutureDate || isDinas;
    
    let displayStatus = item.status;
    let displayKeterangan = item.keterangan;
    
    if (liburInfo) {
      displayStatus = 'Libur';
      displayKeterangan = liburInfo.nama_libur;
    }
    
    const config = statusConfig[displayStatus as keyof typeof statusConfig] || statusConfig['Tidak Hadir'];
    
    return (
      <TouchableOpacity 
        style={[styles.absenItem, (isDisabled || isLibur) && styles.absenItemDisabled]} 
        onPress={() => !isDisabled && !isLibur && showDetailForDate(item)}
        activeOpacity={(isDisabled || isLibur) ? 1 : 0.7}
        disabled={isDisabled || isLibur}
      >
        <View style={styles.dateSection}>
          <Text style={styles.dayText}>{dateInfo.day}</Text>
          <Text style={styles.dateText}>{dateInfo.date}</Text>
          <Text style={styles.monthTextSmall}>{dateInfo.month}</Text>
        </View>
        
        <View style={styles.statusSection}>
          <View style={styles.statusHeader}>
            <View style={[styles.statusBadge, { backgroundColor: config.color }]}>
              <Ionicons name={config.icon as any} size={16} color="white" />
              <Text style={styles.statusText}>{displayStatus}</Text>
            </View>
          </View>
          
          <Text style={styles.keteranganText}>
            {displayKeterangan || '-'}
          </Text>
          
          {item.jam_masuk && (
            <View style={styles.timeInfo}>
              <Text style={styles.timeText}>
                Masuk: {item.jam_masuk} | Keluar: {item.jam_keluar || 'Belum'}
              </Text>
            </View>
          )}
        </View>
        
        {!isDisabled && !isLibur && <Ionicons name="chevron-forward" size={20} color="#666" />}
      </TouchableOpacity>
    );
  };



  const renderDetailModal = () => {
    if (!detailAbsen) return null;
    
    const formatDetailDate = (dateString: string) => {
      // Parse date properly to avoid timezone issues
      const [year, month, day] = dateString.split('-').map(Number);
      const date = new Date(year, month - 1, day);
      const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
      const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
      
      return `${days[date.getDay()]}, ${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
    };

    const calculateWorkDuration = (jamMasuk: string, jamPulang: string) => {
      if (!jamMasuk || !jamPulang) return '-';
      const masuk = new Date(`2000-01-01 ${jamMasuk}`);
      const pulang = new Date(`2000-01-01 ${jamPulang}`);
      const diff = pulang.getTime() - masuk.getTime();
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      return `${hours} jam ${minutes} menit`;
    };
    
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
              <Text style={styles.sheetTitle}>Detail Absensi</Text>
            
            <ScrollView style={styles.detailScrollView} showsVerticalScrollIndicator={false}>
              {/* Header: Tanggal (kiri) & Status (kanan) */}
              <View style={styles.detailHeader}>
                <Text style={styles.detailDate}>{formatDetailDate(detailAbsen.tanggal)}</Text>
                <View style={[
                  styles.detailStatusBadge, 
                  { backgroundColor: statusConfig[detailAbsen.status as keyof typeof statusConfig]?.color || '#9E9E9E' }
                ]}>
                  <Ionicons name={statusConfig[detailAbsen.status as keyof typeof statusConfig]?.icon as any || 'information-circle'} size={16} color="white" />
                  <Text style={styles.detailStatusText}>{detailAbsen.status}</Text>
                </View>
              </View>
              
              {detailAbsen.isLibur ? (
                <View style={styles.confirmItemFull}>
                  <Text style={styles.confirmLabel}>Keterangan</Text>
                  <Text style={styles.confirmValue}>{detailAbsen.keterangan}</Text>
                </View>
              ) : (
                <>
                  {/* Waktu Absensi */}
                  <View style={styles.sectionHeaderConfirm}>
                    <Ionicons name="time-outline" size={18} color="#004643" />
                    <Text style={styles.sectionTitleConfirm}>Waktu Absensi</Text>
                  </View>
                  <View style={styles.sectionDivider} />

                  <View style={styles.confirmRow}>
                    <View style={styles.confirmItemHalf}>
                      <Text style={styles.confirmLabel}>Jam Masuk</Text>
                      <Text style={styles.confirmValue}>{detailAbsen.jam_masuk || '-'}</Text>
                    </View>
                    <View style={styles.confirmItemHalf}>
                      <Text style={styles.confirmLabel}>Jam Pulang</Text>
                      <Text style={styles.confirmValue}>{detailAbsen.jam_pulang || '-'}</Text>
                    </View>
                  </View>

                  {(detailAbsen.jam_masuk && detailAbsen.jam_pulang) && (
                    <View style={styles.confirmItemFull}>
                      <Text style={styles.confirmLabel}>Durasi Kerja</Text>
                      <Text style={styles.confirmValue}>
                        {calculateWorkDuration(detailAbsen.jam_masuk, detailAbsen.jam_pulang)}
                      </Text>
                    </View>
                  )}
                  
                  {/* Lokasi Absensi */}
                  <View style={styles.sectionHeaderConfirm}>
                    <Ionicons name="location-outline" size={18} color="#004643" />
                    <Text style={styles.sectionTitleConfirm}>Lokasi Absensi</Text>
                  </View>
                  <View style={styles.sectionDivider} />

                  <View style={styles.confirmRow}>
                    <View style={styles.confirmItemHalf}>
                      <Text style={styles.confirmLabel}>Lokasi Masuk</Text>
                      <Text style={styles.confirmValue}>{detailAbsen.lokasi_masuk || '-'}</Text>
                    </View>
                    <View style={styles.confirmItemHalf}>
                      <Text style={styles.confirmLabel}>Lokasi Pulang</Text>
                      <Text style={styles.confirmValue}>{detailAbsen.lokasi_pulang || '-'}</Text>
                    </View>
                  </View>

                  {/* Koordinat GPS - Selalu tampil */}
                  <View style={styles.sectionHeaderConfirm}>
                    <Ionicons name="navigate-outline" size={18} color="#004643" />
                    <Text style={styles.sectionTitleConfirm}>Koordinat GPS</Text>
                  </View>
                  <View style={styles.sectionDivider} />

                  <View style={styles.confirmRow}>
                    <View style={styles.confirmItemHalf}>
                      <Text style={styles.confirmLabel}>Koordinat Masuk</Text>
                      <Text style={[styles.confirmValue, styles.smallText]}>
                        {detailAbsen.lat_masuk && detailAbsen.long_masuk ? 
                          `${parseFloat(detailAbsen.lat_masuk).toFixed(6)}, ${parseFloat(detailAbsen.long_masuk).toFixed(6)}` : '-'}
                      </Text>
                    </View>
                    <View style={styles.confirmItemHalf}>
                      <Text style={styles.confirmLabel}>Koordinat Pulang</Text>
                      <Text style={[styles.confirmValue, styles.smallText]}>
                        {detailAbsen.lat_pulang && detailAbsen.long_pulang ? 
                          `${parseFloat(detailAbsen.lat_pulang).toFixed(6)}, ${parseFloat(detailAbsen.long_pulang).toFixed(6)}` : '-'}
                      </Text>
                    </View>
                  </View>

                  {(detailAbsen.jarak_masuk || detailAbsen.jarak_pulang) && (
                    <View style={styles.confirmRow}>
                      {detailAbsen.jarak_masuk && (
                        <View style={styles.confirmItemHalf}>
                          <Text style={styles.confirmLabel}>Jarak Masuk</Text>
                          <Text style={styles.confirmValue}>{Math.round(detailAbsen.jarak_masuk)} meter</Text>
                        </View>
                      )}
                      {detailAbsen.jarak_pulang && (
                        <View style={styles.confirmItemHalf}>
                          <Text style={styles.confirmLabel}>Jarak Pulang</Text>
                          <Text style={styles.confirmValue}>{Math.round(detailAbsen.jarak_pulang)} meter</Text>
                        </View>
                      )}
                    </View>
                  )}

                  {/* Informasi Tambahan */}
                  {(detailAbsen.menit_terlambat || detailAbsen.alasan_terlambat || detailAbsen.alasan_pulang_cepat || detailAbsen.keterangan) && (
                    <>
                      <View style={styles.sectionHeaderConfirm}>
                        <Ionicons name="information-circle-outline" size={18} color="#004643" />
                        <Text style={styles.sectionTitleConfirm}>Informasi Tambahan</Text>
                      </View>
                      <View style={styles.sectionDivider} />

                      {detailAbsen.menit_terlambat && detailAbsen.menit_terlambat > 0 && (
                        <View style={styles.confirmItemFull}>
                          <Text style={styles.confirmLabel}>Keterlambatan</Text>
                          <Text style={[styles.confirmValue, { color: '#F44336' }]}>
                            {detailAbsen.menit_terlambat} menit
                          </Text>
                        </View>
                      )}
                      
                      {detailAbsen.alasan_terlambat && (
                        <View style={styles.confirmItemFull}>
                          <Text style={styles.confirmLabel}>Alasan Terlambat</Text>
                          <Text style={styles.confirmValue}>{detailAbsen.alasan_terlambat}</Text>
                        </View>
                      )}
                      
                      {detailAbsen.alasan_pulang_cepat && (
                        <View style={styles.confirmItemFull}>
                          <Text style={styles.confirmLabel}>Alasan Pulang Cepat</Text>
                          <Text style={styles.confirmValue}>{detailAbsen.alasan_pulang_cepat}</Text>
                        </View>
                      )}

                      {detailAbsen.keterangan && !detailAbsen.isLibur && (
                        <View style={styles.confirmItemFull}>
                          <Text style={styles.confirmLabel}>Keterangan</Text>
                          <Text style={styles.confirmValue}>{detailAbsen.keterangan}</Text>
                        </View>
                      )}

                      {detailAbsen.device_info && (
                        <View style={styles.confirmItemFull}>
                          <Text style={styles.confirmLabel}>Perangkat</Text>
                          <Text style={styles.confirmValue}>{detailAbsen.device_info}</Text>
                        </View>
                      )}
                    </>
                  )}
                  
                  {/* Foto Presensi - Selalu tampil */}
                  <View style={styles.sectionHeaderConfirm}>
                    <Ionicons name="camera-outline" size={18} color="#004643" />
                    <Text style={styles.sectionTitleConfirm}>Foto Presensi</Text>
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
                        {detailAbsen.foto_masuk ? (
                          <Image 
                            source={{ uri: detailAbsen.foto_masuk }} 
                            style={styles.photoPresensi}
                            resizeMode="cover"
                            onError={(e) => console.log('❌ Error loading foto masuk:', e.nativeEvent.error)}
                            onLoad={() => console.log('✅ Foto masuk loaded:', detailAbsen.foto_masuk)}
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
                        {detailAbsen.foto_pulang ? (
                          <Image 
                            source={{ uri: detailAbsen.foto_pulang }} 
                            style={styles.photoPresensi}
                            resizeMode="cover"
                            onError={(e) => console.log('❌ Error loading foto pulang:', e.nativeEvent.error)}
                            onLoad={() => console.log('✅ Foto pulang loaded:', detailAbsen.foto_pulang)}
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
          title="Detail Absensi"
          showBack={true}
          fallbackRoute="/laporan/laporan-detail-absen"
        />
        
        <SkeletonLoader type="list" count={5} message="Memuat data absensi..." />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style="light" translucent={true} backgroundColor="transparent" />
      
      <AppHeader 
        title="Detail Absensi"
        showBack={true}
        fallbackRoute="/laporan/laporan-detail-absen"
      />

      <View style={styles.pegawaiInfo}>
        <View style={styles.pegawaiHeader}>
          {pegawaiData?.foto_profil ? (
            <Image 
              source={{ uri: `${API_CONFIG.BASE_URL}${pegawaiData.foto_profil.replace('/uploads/pegawai/uploads/pegawai/', '/uploads/pegawai/')}` }} 
              style={styles.avatarImage}
            />
          ) : (
            <View style={styles.avatarContainer}>
              <Text style={styles.avatarText}>{pegawai.nama.charAt(0).toUpperCase()}</Text>
            </View>
          )}
          <View style={styles.pegawaiDetails}>
            <Text style={styles.pegawaiNama}>{pegawai.nama}</Text>
            <Text style={styles.pegawaiNip}>NIP: {pegawai.nip || 'Belum diisi'}</Text>
          </View>
        </View>
      </View>



      <View style={styles.periodInfo}>
        <View style={styles.periodHeader}>
          <Ionicons name="calendar-outline" size={20} color="#004643" />
          <Text style={styles.periodTitle}>Periode Laporan</Text>
        </View>
        <Text style={styles.periodText}>
          {periodInfo}
        </Text>
      </View>

      <FlatList
        data={absenData}
        keyExtractor={(item, index) => `${item.tanggal}-${index}`}
        renderItem={renderAbsenItem}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
      />
      {renderDetailModal()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFB',
  },
  pegawaiInfo: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginTop: 12,
    marginBottom: 16,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  pegawaiHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E6F0EF',
    overflow: 'hidden',
  },
  avatarText: {
    color: '#004643',
    fontWeight: 'bold',
    fontSize: 16,
  },
  avatarImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 16,
  },
  pegawaiDetails: {
    flex: 1,
  },
  pegawaiNama: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  pegawaiNip: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  periodInfo: {
    backgroundColor: '#F0F8F7',
    marginHorizontal: 20,
    marginBottom: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0F2F1',
  },
  periodHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  periodTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#004643',
    marginLeft: 8,
  },
  periodText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#004643',
    textAlign: 'left',
  },
  listContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  absenItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    marginBottom: 12,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  absenItemDisabled: {
    backgroundColor: '#fff',
  },
  dateSection: {
    alignItems: 'center',
    marginRight: 16,
    minWidth: 60,
  },
  dayText: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  dateText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  monthTextSmall: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  statusSection: {
    flex: 1,
    marginRight: 8,
  },
  statusHeader: {
    marginBottom: 4,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  statusText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  keteranganText: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  timeInfo: {
    marginTop: 4,
  },
  timeText: {
    fontSize: 11,
    color: '#888',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 8,
    fontSize: 14,
    color: '#666',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalBackdrop: {
    flex: 1,
  },
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
  handleContainer: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  handleBar: {
    width: 40,
    height: 4,
    backgroundColor: '#DDD',
    borderRadius: 2,
  },
  sheetContent: {
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginBottom: 16,
    textAlign: 'center',
  },
  detailScrollView: {
    maxHeight: SCREEN_HEIGHT * 0.65,
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
  detailDate: {
    fontSize: 15,
    fontWeight: '600',
    color: '#004643',
    flex: 1,
  },
  detailStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  detailStatusText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  sectionHeaderConfirm: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
    marginBottom: 8,
  },
  sectionTitleConfirm: {
    fontSize: 15,
    fontWeight: '700',
    color: '#004643',
  },
  sectionDivider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginBottom: 12,
  },
  confirmRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
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
  smallText: {
    fontSize: 12,
  },
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
});