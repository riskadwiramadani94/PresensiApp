import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Alert, Modal, Animated, PanResponder, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_CONFIG } from '../../../constants/config';
import AppHeader from '../../../components/AppHeader';
import CustomCalendar from '../../../components/CustomCalendar';

interface RiwayatItem {
  tanggal: string;
  jam_masuk: string | null;
  jam_keluar: string | null;
  status: string;
  jenis_presensi?: string;
  status_validasi?: string;
  lokasi?: string;
  kegiatan_dinas?: string;
}

interface Stats {
  hadir: number;
  terlambat: string;
  jamKerja: string;
  izin: number;
  sakit: number;
  cuti: number;
  pulangCepat: string;
  libur: number;
}

export default function RiwayatScreen() {
  const [loading, setLoading] = useState(true);
  const [riwayatData, setRiwayatData] = useState<RiwayatItem[]>([]);
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [stats, setStats] = useState<Stats>({
    hadir: 0,
    terlambat: '0x',
    jamKerja: '0j 0m',
    izin: 0,
    sakit: 0,
    cuti: 0,
    pulangCepat: '0x',
    libur: 0
  });
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedStartDate, setSelectedStartDate] = useState(() => {
    const start = new Date();
    start.setDate(start.getDate() - start.getDay() + 1);
    return start;
  });
  const [selectedEndDate, setSelectedEndDate] = useState(() => {
    const end = new Date();
    end.setDate(end.getDate() - end.getDay() + 7);
    return end;
  });
  const [jenisLaporan, setJenisLaporan] = useState('bulanan');
  const [showJenisModal, setShowJenisModal] = useState(false);
  const [showPeriodeModal, setShowPeriodeModal] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [datePickerMode, setDatePickerMode] = useState<'single' | 'start' | 'end'>('single');
  const [selectedPeriode, setSelectedPeriode] = useState(() => {
    const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
    const today = new Date();
    return `${months[today.getMonth()]} ${today.getFullYear()}`;
  });
  const jenisTranslateY = useRef(new Animated.Value(500)).current;
  const periodeTranslateY = useRef(new Animated.Value(500)).current;
  const calendarTranslateY = useRef(new Animated.Value(500)).current;

  const jenisLaporanOptions = [
    { value: 'harian', label: 'Laporan Harian', icon: 'calendar' },
    { value: 'mingguan', label: 'Laporan Mingguan', icon: 'calendar-outline' },
    { value: 'bulanan', label: 'Laporan Bulanan', icon: 'calendar-number' },
    { value: 'tahunan', label: 'Laporan Tahunan', icon: 'calendar-sharp' },
  ];

  useEffect(() => {
    fetchRiwayat();
  }, [sortOrder, jenisLaporan, selectedPeriode]);

  const getJenisLabel = () => {
    const jenis = jenisLaporanOptions.find(j => j.value === jenisLaporan);
    return jenis?.label || 'Laporan Bulanan';
  };

  const generateMonthList = () => {
    const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
    const list = [];
    for (let year = 2020; year <= 2030; year++) {
      for (let month = 0; month < 12; month++) {
        list.push(`${months[month]} ${year}`);
      }
    }
    return list;
  };

  const generateYearList = () => {
    const list = [];
    for (let year = 2020; year <= 2030; year++) {
      list.push(year.toString());
    }
    return list;
  };

  const openJenisModal = () => {
    setShowJenisModal(true);
    Animated.timing(jenisTranslateY, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  const closeJenisModal = () => {
    Animated.timing(jenisTranslateY, {
      toValue: 500,
      duration: 200,
      useNativeDriver: true,
    }).start(() => setShowJenisModal(false));
  };

  const openPeriodeModal = () => {
    setShowPeriodeModal(true);
    Animated.timing(periodeTranslateY, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  const closePeriodeModal = () => {
    Animated.timing(periodeTranslateY, {
      toValue: 500,
      duration: 200,
      useNativeDriver: true,
    }).start(() => setShowPeriodeModal(false));
  };

  const showCalendarModal = () => {
    setShowCalendar(true);
    Animated.spring(calendarTranslateY, {
      toValue: 0,
      useNativeDriver: true,
      tension: 65,
      friction: 11
    }).start();
  };

  const closeCalendarModal = () => {
    Animated.timing(calendarTranslateY, {
      toValue: 500,
      duration: 250,
      useNativeDriver: true
    }).start(() => setShowCalendar(false));
  };

  const formatDate = (date: Date) => {
    const day = date.getDate();
    const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
    const month = months[date.getMonth()];
    const year = date.getFullYear();
    return `${day} ${month} ${year}`;
  };

  const formatDateRange = (start: Date, end: Date) => {
    const startDay = start.getDate();
    const endDay = end.getDate();
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
    const month = months[start.getMonth()];
    const year = start.getFullYear();
    return `${startDay}-${endDay} ${month} ${year}`;
  };

  const jenisPanResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: (_, gestureState) => gestureState.dy > 5,
    onPanResponderMove: (_, gestureState) => {
      if (gestureState.dy > 0) jenisTranslateY.setValue(gestureState.dy);
    },
    onPanResponderRelease: (_, gestureState) => {
      if (gestureState.dy > 100) {
        closeJenisModal();
      } else {
        Animated.spring(jenisTranslateY, { toValue: 0, useNativeDriver: true }).start();
      }
    },
  });

  const periodePanResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: (_, gestureState) => gestureState.dy > 5,
    onPanResponderMove: (_, gestureState) => {
      if (gestureState.dy > 0) periodeTranslateY.setValue(gestureState.dy);
    },
    onPanResponderRelease: (_, gestureState) => {
      if (gestureState.dy > 100) {
        closePeriodeModal();
      } else {
        Animated.spring(periodeTranslateY, { toValue: 0, useNativeDriver: true }).start();
      }
    },
  });

  const calendarPanResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: (_, gestureState) => gestureState.dy > 5,
    onPanResponderMove: (_, gestureState) => {
      if (gestureState.dy > 0) calendarTranslateY.setValue(gestureState.dy);
    },
    onPanResponderRelease: (_, gestureState) => {
      if (gestureState.dy > 100) {
        closeCalendarModal();
      } else {
        Animated.spring(calendarTranslateY, { toValue: 0, useNativeDriver: true }).start();
      }
    },
  });

  const formatDateForAPI = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const fetchRiwayat = async () => {
    try {
      const userData = await AsyncStorage.getItem('userData');
      if (!userData) return;
      
      const user = JSON.parse(userData);
      const userId = user.id_user || user.id;
      
      let startDate = '';
      let endDate = '';
      
      if (jenisLaporan === 'harian') {
        startDate = formatDateForAPI(selectedDate);
        endDate = startDate;
      } else if (jenisLaporan === 'mingguan') {
        startDate = formatDateForAPI(selectedStartDate);
        endDate = formatDateForAPI(selectedEndDate);
      } else if (jenisLaporan === 'bulanan') {
        const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
        const [monthName, yearStr] = selectedPeriode.split(' ');
        const monthIndex = months.indexOf(monthName);
        const year = parseInt(yearStr);
        const firstDay = new Date(year, monthIndex, 1);
        const lastDay = new Date(year, monthIndex + 1, 0);
        startDate = firstDay.toISOString().split('T')[0];
        endDate = lastDay.toISOString().split('T')[0];
      } else if (jenisLaporan === 'tahunan') {
        const year = parseInt(selectedPeriode);
        const firstDay = new Date(year, 0, 1);
        const lastDay = new Date(year, 11, 31);
        startDate = firstDay.toISOString().split('T')[0];
        endDate = lastDay.toISOString().split('T')[0];
      }
      
      const response = await fetch(
        `${API_CONFIG.BASE_URL}/pegawai/presensi/api/riwayat-gabungan?user_id=${userId}&start_date=${startDate}&end_date=${endDate}`
      );
      const data = await response.json();
      
      console.log('API Response:', data);
      console.log('Filter params:', { jenisLaporan, startDate, endDate });
      
      if (data.success) {
        let riwayat = data.data || [];
        console.log('Riwayat data before filter:', riwayat.length);
        
        // Hapus duplikat berdasarkan tanggal - ambil yang terbaru per tanggal
        const uniqueRiwayat = riwayat.reduce((acc: RiwayatItem[], current: RiwayatItem) => {
          const currentDate = current.tanggal.split('T')[0];
          const existing = acc.find(item => item.tanggal.split('T')[0] === currentDate);
          
          if (!existing) {
            acc.push(current);
          } else {
            // Jika ada duplikat, prioritaskan yang ada jam_masuk
            if (current.jam_masuk && !existing.jam_masuk) {
              const index = acc.findIndex(item => item.tanggal.split('T')[0] === currentDate);
              acc[index] = current;
            }
          }
          return acc;
        }, []);
        
        console.log('Riwayat after removing duplicates:', uniqueRiwayat.length);
        
        const sortedRiwayat = [...uniqueRiwayat].sort((a, b) => {
          const dateA = new Date(a.tanggal).getTime();
          const dateB = new Date(b.tanggal).getTime();
          return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
        });
        setRiwayatData(sortedRiwayat);
        calculateStats(riwayat);
      }
    } catch (error) {
      console.error('Error fetching riwayat:', error);
      Alert.alert('Error', 'Gagal memuat riwayat presensi');
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (data: RiwayatItem[]) => {
    console.log('Calculate stats, total items:', data.length);
    
    let hadirCount = 0;
    let terlambatCount = 0;
    let totalJamKerja = 0;
    let izinCount = 0;
    let sakitCount = 0;
    let cutiCount = 0;
    let pulangCepatCount = 0;
    let liburCount = 0;

    data.forEach((item, idx) => {
      console.log(`Item ${idx}:`, item.status, item.jam_masuk, item.jam_keluar);
      
      const status = (item.status || '').toLowerCase();
      
      if (status === 'hadir' || status === 'terlambat') {
        hadirCount++;
        if (status === 'terlambat') {
          terlambatCount++;
        }
      } else if (status === 'izin') {
        izinCount++;
      } else if (status === 'sakit') {
        sakitCount++;
      } else if (status === 'cuti') {
        cutiCount++;
      } else if (status === 'pulang cepat') {
        pulangCepatCount++;
      } else if (status === 'libur') {
        liburCount++;
      }
      
      if (item.jam_masuk && item.jam_keluar) {
        try {
          const [mH, mM] = item.jam_masuk.split(':').map(Number);
          const [kH, kM] = item.jam_keluar.split(':').map(Number);
          const jamKerja = (kH * 60 + kM) - (mH * 60 + mM);
          if (jamKerja > 0) {
            totalJamKerja += jamKerja;
          }
        } catch (e) {
          console.log('Error parsing time:', e);
        }
      }
    });

    const jamKerjaHours = Math.floor(totalJamKerja / 60);
    const jamKerjaMinutes = totalJamKerja % 60;

    console.log('Final stats:', { hadirCount, terlambatCount, totalJamKerja });

    setStats({
      hadir: hadirCount,
      terlambat: terlambatCount > 0 ? `${terlambatCount}x` : '0x',
      jamKerja: `${jamKerjaHours}j ${jamKerjaMinutes}m`,
      izin: izinCount,
      sakit: sakitCount,
      cuti: cutiCount,
      pulangCepat: pulangCepatCount > 0 ? `${pulangCepatCount}x` : '0x',
      libur: liburCount
    });
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'hadir': return '#4CAF50';
      case 'terlambat': return '#FF9800';
      case 'dinas': return '#2196F3';
      case 'izin': return '#9C27B0';
      case 'sakit': return '#F44336';
      case 'libur': return '#757575';
      default: return '#999';
    }
  };

  const getStatusIcon = (status: string, jenis?: string) => {
    if (jenis === 'dinas') return 'airplane';
    switch (status.toLowerCase()) {
      case 'hadir': return 'checkmark-circle';
      case 'terlambat': return 'time';
      case 'izin': return 'document-text';
      case 'sakit': return 'medkit';
      case 'libur': return 'calendar';
      default: return 'help-circle';
    }
  };

  const toggleSortOrder = () => {
    setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc');
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#004643" />
          <Text style={styles.loadingText}>Memuat riwayat...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <AppHeader title="Riwayat Presensi" showBack={true} />
      <ScrollView showsVerticalScrollIndicator={false}>
        
        {/* HEADER LAPORAN */}
        <View style={styles.header}>
          <View style={styles.filterRow}>
            <TouchableOpacity style={styles.filterBtn} onPress={openJenisModal}>
              <Text style={styles.filterText}>{getJenisLabel()}</Text>
              <Ionicons name="chevron-down" size={16} color="#666" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.filterBtn} onPress={openPeriodeModal}>
              <Text style={styles.filterText}>{selectedPeriode}</Text>
              <Ionicons name="chevron-down" size={16} color="#666" />
            </TouchableOpacity>
          </View>
        </View>

        {/* RINGKASAN STATISTIK */}
        <View style={styles.statsContainer}>
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <View style={[styles.statIndicator, { backgroundColor: '#4CAF50' }]} />
              <Text style={styles.statLabel}>Hadir</Text>
              <Text style={styles.statValue}>{stats.hadir} hari</Text>
            </View>
            
            <View style={styles.statCard}>
              <View style={[styles.statIndicator, { backgroundColor: '#FF9800' }]} />
              <Text style={styles.statLabel}>Total Terlambat</Text>
              <Text style={styles.statValue}>{stats.terlambat}</Text>
            </View>
            
            <View style={styles.statCard}>
              <View style={[styles.statIndicator, { backgroundColor: '#2196F3' }]} />
              <Text style={styles.statLabel}>Total Jam Kerja</Text>
              <Text style={styles.statValue}>{stats.jamKerja}</Text>
            </View>
          </View>
        </View>

        {/* LIST RIWAYAT HARIAN */}
        <View style={styles.listSection}>
          <TouchableOpacity style={styles.sectionHeader} onPress={toggleSortOrder}>
            <Ionicons name="list" size={20} color="#004643" />
            <Text style={styles.sectionTitle}>
              {sortOrder === 'desc' ? 'Terlama-terbaru' : 'Terbaru-terlama'}
            </Text>
            <Ionicons name="swap-vertical" size={18} color="#004643" />
          </TouchableOpacity>
          
          {riwayatData.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="calendar-outline" size={48} color="#ccc" />
              <Text style={styles.emptyText}>Belum ada riwayat presensi</Text>
            </View>
          ) : (
            riwayatData.map((item, index) => {
              const date = new Date(item.tanggal);
              const day = date.getDate();
              const dayName = date.toLocaleDateString('id-ID', { weekday: 'short' }).toUpperCase();
              const color = getStatusColor(item.status);
              const isDinas = item.jenis_presensi === 'dinas';
              
              return (
                <View key={index} style={styles.logCard}>
                  <View style={[styles.leftBorder, { backgroundColor: color }]} />
                  
                  <View style={styles.dateSection}>
                    <Text style={styles.dayName}>{dayName}</Text>
                    <Text style={styles.dateNumber}>{day}</Text>
                  </View>
                  
                  <View style={styles.contentSection}>
                    <View style={styles.statusRow}>
                      <Text style={styles.dayFull}>
                        {date.toLocaleDateString('id-ID', { weekday: 'long' })}
                      </Text>
                      <Text style={[styles.statusBadge, { color }]}>{item.status}</Text>
                    </View>
                    
                    <Text style={styles.locationText}>
                      {isDinas && item.kegiatan_dinas ? item.kegiatan_dinas : item.lokasi || 'Kantor'}
                    </Text>
                    
                    {item.jam_masuk && (
                      <Text style={styles.timeText}>
                        {item.jam_masuk} - {item.jam_keluar || '...'}
                      </Text>
                    )}
                  </View>
                </View>
              );
            })
          )}
        </View>

      </ScrollView>

      {/* Modal Jenis Laporan */}
      <Modal visible={showJenisModal} transparent animationType="none" statusBarTranslucent onRequestClose={closeJenisModal}>
        <View style={styles.bottomSheetOverlay}>
          <TouchableOpacity style={styles.bottomSheetBackdrop} activeOpacity={1} onPress={closeJenisModal} />
          <Animated.View style={[styles.bottomSheet, { transform: [{ translateY: jenisTranslateY }] }]}>
            <View {...jenisPanResponder.panHandlers} style={styles.handleContainer}>
              <View style={styles.handleBar} />
            </View>
            <View style={styles.bottomSheetHeader}>
              <Text style={styles.bottomSheetTitle}>Pilih Jenis Laporan</Text>
            </View>
            <ScrollView style={styles.bottomSheetContent} showsVerticalScrollIndicator={false}>
              {jenisLaporanOptions.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[styles.bottomSheetItem, jenisLaporan === option.value && styles.bottomSheetItemActive]}
                  onPress={() => {
                    setJenisLaporan(option.value);
                    closeJenisModal();
                  }}
                >
                  <View style={styles.bottomSheetItemLeft}>
                    <View style={[styles.bottomSheetIcon, jenisLaporan === option.value && styles.bottomSheetIconActive]}>
                      <Ionicons name={option.icon as any} size={20} color={jenisLaporan === option.value ? '#fff' : '#004643'} />
                    </View>
                    <Text style={[styles.bottomSheetItemText, jenisLaporan === option.value && styles.bottomSheetItemTextActive]}>
                      {option.label}
                    </Text>
                  </View>
                  {jenisLaporan === option.value && <Ionicons name="checkmark-circle" size={24} color="#004643" />}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </Animated.View>
        </View>
      </Modal>

      {/* Modal Periode */}
      <Modal visible={showPeriodeModal} transparent animationType="none" statusBarTranslucent onRequestClose={closePeriodeModal}>
        <View style={styles.bottomSheetOverlay}>
          <TouchableOpacity style={styles.bottomSheetBackdrop} activeOpacity={1} onPress={closePeriodeModal} />
          <Animated.View style={[styles.bottomSheet, { transform: [{ translateY: periodeTranslateY }] }]}>
            <View {...periodePanResponder.panHandlers} style={styles.handleContainer}>
              <View style={styles.handleBar} />
            </View>
            <View style={styles.bottomSheetHeader}>
              <Text style={styles.bottomSheetTitle}>Pilih Periode</Text>
            </View>
            <ScrollView style={styles.bottomSheetContent} showsVerticalScrollIndicator={false}>
              {jenisLaporan === 'harian' && (
                <View style={styles.calendarContainer}>
                  <Text style={styles.calendarLabel}>Pilih Tanggal:</Text>
                  <TouchableOpacity 
                    style={styles.calendarButton}
                    onPress={() => {
                      setDatePickerMode('single');
                      showCalendarModal();
                    }}
                  >
                    <Ionicons name="calendar-outline" size={20} color="#004643" />
                    <Text style={styles.calendarButtonText}>{formatDate(selectedDate)}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={styles.confirmButton}
                    onPress={() => {
                      setSelectedPeriode(formatDate(selectedDate));
                      closePeriodeModal();
                    }}
                  >
                    <Text style={styles.confirmButtonText}>Terapkan</Text>
                  </TouchableOpacity>
                </View>
              )}

              {jenisLaporan === 'mingguan' && (
                <View style={styles.calendarContainer}>
                  <Text style={styles.calendarLabel}>Pilih Periode Minggu:</Text>
                  <View style={styles.dateRangeRow}>
                    <TouchableOpacity 
                      style={styles.calendarButtonSmall}
                      onPress={() => {
                        setDatePickerMode('start');
                        showCalendarModal();
                      }}
                    >
                      <Text style={styles.calendarLabelSmall}>Dari:</Text>
                      <Text style={styles.calendarButtonText}>{formatDate(selectedStartDate)}</Text>
                    </TouchableOpacity>
                    <Text style={styles.dateSeparator}>s/d</Text>
                    <TouchableOpacity 
                      style={styles.calendarButtonSmall}
                      onPress={() => {
                        setDatePickerMode('end');
                        showCalendarModal();
                      }}
                    >
                      <Text style={styles.calendarLabelSmall}>Sampai:</Text>
                      <Text style={styles.calendarButtonText}>{formatDate(selectedEndDate)}</Text>
                    </TouchableOpacity>
                  </View>
                  <TouchableOpacity 
                    style={styles.confirmButton}
                    onPress={() => {
                      setSelectedPeriode(formatDateRange(selectedStartDate, selectedEndDate));
                      closePeriodeModal();
                    }}
                  >
                    <Text style={styles.confirmButtonText}>Terapkan</Text>
                  </TouchableOpacity>
                </View>
              )}

              {jenisLaporan === 'bulanan' && generateMonthList().map((bulan, index) => (
                <TouchableOpacity
                  key={index}
                  style={[styles.bottomSheetItem, selectedPeriode === bulan && styles.bottomSheetItemActive]}
                  onPress={() => {
                    setSelectedPeriode(bulan);
                    closePeriodeModal();
                  }}
                >
                  <Text style={[styles.bottomSheetItemText, selectedPeriode === bulan && styles.bottomSheetItemTextActive]}>
                    {bulan}
                  </Text>
                  {selectedPeriode === bulan && <Ionicons name="checkmark-circle" size={24} color="#004643" />}
                </TouchableOpacity>
              ))}
              {jenisLaporan === 'tahunan' && generateYearList().map((tahun) => (
                <TouchableOpacity
                  key={tahun}
                  style={[styles.bottomSheetItem, selectedPeriode === tahun && styles.bottomSheetItemActive]}
                  onPress={() => {
                    setSelectedPeriode(tahun);
                    closePeriodeModal();
                  }}
                >
                  <Text style={[styles.bottomSheetItemText, selectedPeriode === tahun && styles.bottomSheetItemTextActive]}>
                    {tahun}
                  </Text>
                  {selectedPeriode === tahun && <Ionicons name="checkmark-circle" size={24} color="#004643" />}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </Animated.View>
        </View>
      </Modal>

      {/* Custom Calendar Modal */}
      <Modal visible={showCalendar} transparent animationType="none" statusBarTranslucent onRequestClose={closeCalendarModal}>
        <View style={styles.bottomSheetOverlay}>
          <TouchableOpacity style={styles.bottomSheetBackdrop} activeOpacity={1} onPress={closeCalendarModal} />
          <Animated.View style={[styles.calendarBottomSheet, { transform: [{ translateY: calendarTranslateY }] }]}>
            <View {...calendarPanResponder.panHandlers} style={styles.handleContainer}>
              <View style={styles.handleBar} />
            </View>
            <View style={styles.calendarSheetContent}>
              <Text style={styles.calendarSheetTitle}>
                {datePickerMode === 'single' ? 'Pilih Tanggal' : datePickerMode === 'start' ? 'Pilih Tanggal Mulai' : 'Pilih Tanggal Selesai'}
              </Text>
              <CustomCalendar
                onDatePress={(date: Date) => {
                  // Konversi ke tanggal lokal untuk menghindari timezone issue
                  const localDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
                  
                  if (datePickerMode === 'single') {
                    setSelectedDate(localDate);
                    closeCalendarModal();
                  } else if (datePickerMode === 'start') {
                    setSelectedStartDate(localDate);
                    closeCalendarModal();
                  } else if (datePickerMode === 'end') {
                    const daysDiff = Math.ceil((localDate.getTime() - selectedStartDate.getTime()) / (1000 * 60 * 60 * 24));
                    if (daysDiff > 6) {
                      Alert.alert('Peringatan', 'Periode mingguan maksimal 7 hari');
                      return;
                    }
                    if (localDate < selectedStartDate) {
                      Alert.alert('Peringatan', 'Tanggal selesai harus setelah tanggal mulai');
                      return;
                    }
                    setSelectedEndDate(localDate);
                    closeCalendarModal();
                  }
                }}
                weekendDays={[]}
                showWeekends={false}
              />
            </View>
          </Animated.View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
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
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    marginTop: 12,
    fontSize: 14,
    color: '#999',
  },
  header: { padding: 20, backgroundColor: '#fff', paddingTop: 15 },
  filterRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 10 },
  filterBtn: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#F5F5F5', 
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    flex: 1,
    justifyContent: 'space-between'
  },
  filterText: {
    fontSize: 13,
    color: '#333',
    fontWeight: '500'
  },
  statsContainer: {
    marginHorizontal: 20,
    marginTop: 16,
    marginBottom: 20,
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
  listSection: { paddingHorizontal: 20, paddingBottom: 20 },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
    backgroundColor: '#F0F8F7',
    padding: 10,
    borderRadius: 8,
  },
  sectionTitle: { 
    fontSize: 14, 
    color: '#004643',
    fontWeight: '600',
  },
  logCard: { 
    flexDirection: 'row',
    backgroundColor: '#fff', 
    marginBottom: 10,
    borderRadius: 12, 
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    overflow: 'hidden',
  },
  leftBorder: {
    width: 4,
  },
  dateSection: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FAFAFA',
  },
  dayName: {
    fontSize: 10,
    color: '#999',
    fontWeight: '600',
    marginBottom: 4,
  },
  dateNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1a1a1a',
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
  statusBadge: {
    fontSize: 12,
    fontWeight: '600',
  },
  locationText: {
    fontSize: 12,
    color: '#999',
    marginBottom: 4,
  },
  timeText: {
    fontSize: 13,
    color: '#666',
    fontWeight: '500',
  },
  bottomSheetOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0, 0, 0, 0.5)' },
  bottomSheetBackdrop: { flex: 1 },
  bottomSheet: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingBottom: Platform.OS === 'ios' ? 34 : 20, maxHeight: '70%' },
  handleContainer: { paddingVertical: 12, alignItems: 'center', width: '100%' },
  handleBar: { width: 40, height: 4, backgroundColor: '#DDD', borderRadius: 2, alignSelf: 'center', marginTop: 8, marginBottom: 16 },
  bottomSheetHeader: { paddingHorizontal: 20, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  bottomSheetTitle: { fontSize: 18, fontWeight: '600', color: '#333' },
  bottomSheetContent: { maxHeight: 400 },
  bottomSheetItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#F5F5F5' },
  bottomSheetItemActive: { backgroundColor: '#E6F0EF' },
  bottomSheetItemLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  bottomSheetIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#E6F0EF', justifyContent: 'center', alignItems: 'center' },
  bottomSheetIconActive: { backgroundColor: '#004643' },
  bottomSheetItemText: { fontSize: 15, color: '#333', fontWeight: '500', flex: 1 },
  bottomSheetItemTextActive: { color: '#004643', fontWeight: '600' },
  calendarContainer: { padding: 20 },
  calendarLabel: { fontSize: 14, fontWeight: '600', color: '#333', marginBottom: 12 },
  calendarButton: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#F5F5F5', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#E0E0E0', marginBottom: 16 },
  calendarButtonText: { fontSize: 14, color: '#333', fontWeight: '500' },
  dateRangeRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
  calendarButtonSmall: { flex: 1, backgroundColor: '#F5F5F5', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#E0E0E0' },
  calendarLabelSmall: { fontSize: 11, color: '#666', marginBottom: 4 },
  dateSeparator: { fontSize: 14, color: '#666', fontWeight: '500' },
  confirmButton: { backgroundColor: '#004643', padding: 14, borderRadius: 12, alignItems: 'center' },
  confirmButtonText: { fontSize: 15, fontWeight: '600', color: '#fff' },
  calendarBottomSheet: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingBottom: Platform.OS === 'ios' ? 34 : 20, maxHeight: '70%', shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.15, shadowRadius: 12, elevation: 20 },
  calendarSheetContent: { paddingHorizontal: 20, paddingBottom: 16 },
  calendarSheetTitle: { fontSize: 18, fontWeight: '700', color: '#333', marginBottom: 16, textAlign: 'center' },
});
