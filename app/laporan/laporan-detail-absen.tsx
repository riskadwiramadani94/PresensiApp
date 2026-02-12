import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, ActivityIndicator, TextInput, ScrollView, Modal, Image } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Calendar } from 'react-native-calendars';
import { AppHeader } from '../../components';
import CustomCalendar from '../../components/CustomCalendar';

interface PegawaiAbsen {
  id_pegawai: number;
  nama_lengkap: string;
  nip: string;
  foto_profil?: string;
  today_status?: string;
  summary: {
    'Hadir': number;
    'Tidak Hadir': number;
    'Terlambat': number;
    'Izin': number;
    'Sakit': number;
    'Cuti': number;
    'Pulang Cepat': number;
    'Dinas Luar/ Perjalanan Dinas': number;
  };
}

const statusConfig = {
  'Hadir': { color: '#4CAF50', icon: 'checkmark-circle' },
  'Tidak Hadir': { color: '#F44336', icon: 'close-circle' },
  'Terlambat': { color: '#FF9800', icon: 'time' },
  'Izin': { color: '#2196F3', icon: 'information-circle' },
  'Sakit': { color: '#E91E63', icon: 'medical' },
  'Cuti': { color: '#9C27B0', icon: 'calendar' },
  'Pulang Cepat': { color: '#795548', icon: 'exit' },
  'Dinas Luar/ Perjalanan Dinas': { color: '#607D8B', icon: 'airplane' },
  'Belum Absen': { color: '#FF9800', icon: 'time-outline' },
};

import { API_CONFIG, getApiUrl } from '../../constants/config';

export default function LaporanDetailAbsenScreen() {
  const router = useRouter();
  const [data, setData] = useState<PegawaiAbsen[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDateFilter, setSelectedDateFilter] = useState('hari_ini');
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [jamKerja, setJamKerja] = useState({ jam_masuk: '08:30', jam_pulang: '17:00' });

  useEffect(() => {
    fetchJamKerja();
    fetchData();
    
    // Auto-refresh every 60 seconds to update dynamic status
    const interval = setInterval(() => {
      fetchData();
    }, 60000);
    
    return () => clearInterval(interval);
  }, [selectedDateFilter, searchQuery, dateRange]);

  const fetchJamKerja = async () => {
    try {
      const response = await fetch(getApiUrl(API_CONFIG.ENDPOINTS.JAM_KERJA));
      const result = await response.json();
      if (result.success && result.data && result.data.length > 0) {
        const jamKerjaData = result.data[0]; // Ambil data pertama
        setJamKerja({
          jam_masuk: (jamKerjaData.batas_absen || jamKerjaData.jam_masuk || '08:30').substring(0, 5),
          jam_pulang: (jamKerjaData.jam_pulang || '17:00').substring(0, 5)
        });
      }
    } catch (error) {
      console.error('Error fetching jam kerja:', error);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    
    try {
      const params = new URLSearchParams({
        type: 'absen',
        filter_date: selectedDateFilter,
        start_date: selectedDateFilter === 'pilih_tanggal' ? dateRange.start : '',
        end_date: selectedDateFilter === 'pilih_tanggal' ? dateRange.end : '',
        search: searchQuery
      });
      
      const response = await fetch(`${getApiUrl(API_CONFIG.ENDPOINTS.LAPORAN)}?${params.toString()}`);
      const result = await response.json();
      
      if (result.success) {
        const sortedData = result.data.sort((a: PegawaiAbsen, b: PegawaiAbsen) => 
          a.nama_lengkap.localeCompare(b.nama_lengkap)
        );
        console.log('API Response:', result.data[0]); // Debug log
        setData(sortedData);
      } else {
        console.error('Error:', result.message);
      }
    } catch (error) {
      console.error('Network error:', error);
      Alert.alert('Error', 'Gagal memuat data absen');
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  const renderStatusBadge = (status: string, count: number) => {
    if (count === 0) return null;
    const config = statusConfig[status as keyof typeof statusConfig];
    if (!config) return null;
    
    return (
      <View key={status} style={[styles.statusBadge, { backgroundColor: config.color + '15' }]}>
        <Text style={[styles.statusText, { color: config.color }]}>
          {status.replace('Dinas Luar/ Perjalanan Dinas', 'Dinas')} ({count})
        </Text>
      </View>
    );
  };

  const renderAbsentStatus = (item: PegawaiAbsen) => {
    // Calculate total working days based on filter period
    let expectedWorkingDays = 1;
    const today = new Date();
    
    // Calculate expected working days for each filter
    if (selectedDateFilter === 'minggu_ini') {
      // Count weekdays in current week
      const startOfWeek = new Date(today);
      startOfWeek.setDate(today.getDate() - today.getDay() + 1); // Monday
      expectedWorkingDays = 0;
      for (let i = 0; i < 5; i++) { // Mon-Fri
        const checkDate = new Date(startOfWeek);
        checkDate.setDate(startOfWeek.getDate() + i);
        if (checkDate <= today) expectedWorkingDays++;
      }
    } else if (selectedDateFilter === 'bulan_ini') {
      // Count weekdays in current month up to today
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      expectedWorkingDays = 0;
      for (let d = new Date(startOfMonth); d <= today; d.setDate(d.getDate() + 1)) {
        const dayOfWeek = d.getDay();
        if (dayOfWeek !== 0 && dayOfWeek !== 6) expectedWorkingDays++; // Not weekend
      }
    } else if (selectedDateFilter === 'pilih_tanggal' && dateRange.start && dateRange.end) {
      // Count weekdays in selected range
      const start = new Date(dateRange.start);
      const end = new Date(dateRange.end);
      expectedWorkingDays = 0;
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const dayOfWeek = d.getDay();
        if (dayOfWeek !== 0 && dayOfWeek !== 6) expectedWorkingDays++; // Not weekend
      }
    }
    
    // Calculate actual attendance
    const totalAttendance = item.summary['Hadir'] + 
                           item.summary['Terlambat'] + 
                           item.summary['Izin'] + 
                           item.summary['Sakit'] + 
                           item.summary['Cuti'] + 
                           item.summary['Pulang Cepat'] + 
                           item.summary['Dinas Luar/ Perjalanan Dinas'];
    
    const absentDays = expectedWorkingDays - totalAttendance;
    
    // For today filter, check against jam kerja setting
    if (selectedDateFilter === 'hari_ini' && absentDays > 0) {
      const now = new Date();
      const [jamMasukHour, jamMasukMinute] = jamKerja.jam_masuk.split(':').map(Number);
      const [jamPulangHour, jamPulangMinute] = jamKerja.jam_pulang.split(':').map(Number);
      
      const batasAbsen = new Date();
      batasAbsen.setHours(jamMasukHour, jamMasukMinute, 0, 0);
      
      const jamPulang = new Date();
      jamPulang.setHours(jamPulangHour, jamPulangMinute, 0, 0);
      
      // If current time is before batas absen, show "Belum Absen"
      if (now < batasAbsen) {
        return (
          <View key="belum-absen" style={[styles.statusBadge, { backgroundColor: statusConfig['Belum Absen'].color + '15' }]}>
            <Text style={[styles.statusText, { color: statusConfig['Belum Absen'].color }]}>
              Belum Absen ({absentDays})
            </Text>
          </View>
        );
      }
      // If current time is after batas absen but before jam pulang, show "Tidak Hadir"
      else if (now >= batasAbsen && now < jamPulang) {
        return (
          <View key="tidak-hadir" style={[styles.statusBadge, { backgroundColor: statusConfig['Tidak Hadir'].color + '15' }]}>
            <Text style={[styles.statusText, { color: statusConfig['Tidak Hadir'].color }]}>
              Tidak Hadir ({absentDays})
            </Text>
          </View>
        );
      }
      // If after jam pulang, definitely "Tidak Hadir"
      else {
        return (
          <View key="tidak-hadir" style={[styles.statusBadge, { backgroundColor: statusConfig['Tidak Hadir'].color + '15' }]}>
            <Text style={[styles.statusText, { color: statusConfig['Tidak Hadir'].color }]}>
              Tidak Hadir ({absentDays})
            </Text>
          </View>
        );
      }
    }
    
    // For all other periods, show "Tidak Hadir" if there are absent days
    if (absentDays > 0) {
      return (
        <View key="tidak-hadir" style={[styles.statusBadge, { backgroundColor: statusConfig['Tidak Hadir'].color + '15' }]}>
          <Text style={[styles.statusText, { color: statusConfig['Tidak Hadir'].color }]}>
            Tidak Hadir ({absentDays})
          </Text>
        </View>
      );
    }
    
    return null;
  };

  const renderItem = ({ item }: { item: PegawaiAbsen }) => (
    <TouchableOpacity 
      style={styles.pegawaiCard}
      onPress={() => {
        // Pass filter parameters to detail page
        const params = new URLSearchParams({
          filter: selectedDateFilter,
          start_date: selectedDateFilter === 'pilih_tanggal' ? dateRange.start : '',
          end_date: selectedDateFilter === 'pilih_tanggal' ? dateRange.end : ''
        });
        router.push(`/laporan/detail-absen/${item.id_pegawai}?${params.toString()}` as any);
      }}
    >
      <View style={styles.cardHeader}>
        <View style={styles.avatar}>
          {item.foto_profil ? (
            <Image 
              source={{ uri: item.foto_profil }} 
              style={styles.avatarImage}
              onError={() => {}}
            />
          ) : (
            <Text style={styles.avatarText}>{item.nama_lengkap.charAt(0).toUpperCase()}</Text>
          )}
        </View>
        <View style={styles.employeeInfo}>
          <Text style={styles.employeeName}>{item.nama_lengkap}</Text>
          <Text style={styles.employeeNip}>NIP: {item.nip}</Text>
        </View>
        <TouchableOpacity style={styles.detailBtn}>
          <Ionicons name="chevron-forward" size={16} color="#666" />
        </TouchableOpacity>
      </View>
      
      <View style={styles.statusContainer}>
        {renderAbsentStatus(item)}
        {Object.entries(item.summary)
          .filter(([status, count]) => count > 0 && status !== 'Tidak Hadir') // Exclude 'Tidak Hadir' to avoid duplication
          .map(([status, count]) => renderStatusBadge(status, count))
        }
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <StatusBar style="dark" translucent={true} backgroundColor="transparent" />
      
      <AppHeader 
        title="Laporan Absen"
        showBack={true}
        fallbackRoute="/laporan/laporan-admin"
      />

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#004643" />
          <Text style={styles.loadingText}>Memuat data absen...</Text>
        </View>
      ) : (
        <View style={styles.contentContainer}>
          <View style={styles.content}>
          {/* Search Bar */}
          <View style={styles.searchContainer}>
            <View style={styles.searchInputWrapper}>
              <Ionicons name="search-outline" size={20} color="#666" />
              <TextInput
                style={styles.searchInput}
                placeholder="Cari pegawai..."
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholderTextColor="#999"
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <Ionicons name="close-circle" size={20} color="#999" />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Date Filter */}
          <View style={styles.filterCard}>
            <View style={styles.filterHeader}>
              <Ionicons name="calendar-outline" size={20} color="#004643" />
              <Text style={styles.filterTitle}>Filter Periode</Text>
            </View>
            
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterChips}>
              {[
                { key: 'hari_ini', label: 'Hari Ini' },
                { key: 'minggu_ini', label: 'Minggu Ini' },
                { key: 'bulan_ini', label: 'Bulan Ini' },
                { key: 'pilih_tanggal', label: 'Pilih Tanggal' }
              ].map((filter) => (
                <TouchableOpacity
                  key={filter.key}
                  style={[
                    styles.filterChip,
                    selectedDateFilter === filter.key && styles.filterChipActive
                  ]}
                  onPress={() => {
                    if (filter.key === 'pilih_tanggal') {
                      setShowStartDatePicker(true);
                    } else {
                      setSelectedDateFilter(filter.key);
                      setDateRange({ start: '', end: '' });
                    }
                  }}
                >
                  <Text style={[
                    styles.filterChipText,
                    selectedDateFilter === filter.key && styles.filterChipTextActive
                  ]}>
                    {filter.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {selectedDateFilter === 'pilih_tanggal' && dateRange.start && dateRange.end && (
              <View style={styles.selectedDateInfo}>
                <Text style={styles.selectedDateText}>
                  Periode: {new Date(dateRange.start).toLocaleDateString('id-ID')} - {new Date(dateRange.end).toLocaleDateString('id-ID')}
                </Text>
              </View>
            )}

            <View style={styles.resultSummary}>
              <Text style={styles.resultText}>
                Menampilkan {data.length} pegawai
              </Text>
            </View>
          </View>
          
          <FlatList
            data={data}
            keyExtractor={(item) => item.id_pegawai.toString()}
            renderItem={renderItem}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContent}
          />
          </View>
        </View>
      )}
      
      <Modal 
        visible={showStartDatePicker || showEndDatePicker} 
        transparent 
        animationType="none" 
        statusBarTranslucent={true}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity 
            style={styles.modalBackdrop} 
            activeOpacity={1}
            onPress={() => {
              setShowStartDatePicker(false);
              setShowEndDatePicker(false);
            }}
          />
          <View style={styles.calendarModal}>
            <View style={styles.calendarHeader}>
              <Text style={styles.calendarTitle}>
                {showStartDatePicker ? 'Pilih Tanggal Mulai' : 'Pilih Tanggal Selesai'}
              </Text>
              <TouchableOpacity onPress={() => {
                setShowStartDatePicker(false);
                setShowEndDatePicker(false);
              }}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            <CustomCalendar
              showWeekends={false}
              weekendDays={[]}
              onDatePress={(date) => {
                const dateString = date.toISOString().split('T')[0];
                if (showStartDatePicker) {
                  setDateRange({...dateRange, start: dateString});
                  setShowStartDatePicker(false);
                  setShowEndDatePicker(true);
                } else {
                  setDateRange({...dateRange, end: dateString});
                  setSelectedDateFilter('pilih_tanggal');
                  setShowEndDatePicker(false);
                }
              }}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFB' },
  contentContainer: {
    flex: 1,
  },

  content: { flex: 1 },
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
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    paddingVertical: 12
  },
  filterCard: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginVertical: 5,
    borderRadius: 16,
    padding: 15,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4
  },
  filterHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12
  },
  filterTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginLeft: 8
  },
  filterChips: {
    marginBottom: 10
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    borderRadius: 20,
    backgroundColor: '#F5F5F5',
    borderWidth: 1,
    borderColor: '#E0E0E0'
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
    color: '#fff'
  },
  selectedDateInfo: {
    backgroundColor: '#F0F8F7',
    padding: 8,
    borderRadius: 8,
    marginBottom: 10
  },
  selectedDateText: {
    fontSize: 12,
    color: '#004643',
    fontWeight: '500'
  },
  resultSummary: {
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0'
  },
  resultText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500'
  },

  listContent: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 20 },
  pegawaiCard: {
    backgroundColor: '#fff',
    marginBottom: 12,
    borderRadius: 12,
    padding: 16,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E6F0EF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    overflow: 'hidden',
  },
  avatarImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  avatarText: {
    color: '#004643',
    fontWeight: 'bold',
    fontSize: 16,
  },
  employeeInfo: { flex: 1 },
  employeeName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 2,
  },
  employeeNip: {
    fontSize: 12,
    color: '#666',
  },
  detailBtn: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#F5F5F5',
  },
  statusContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
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
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 10, color: '#666' },
  
  // Calendar Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  modalBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  calendarModal: {
    backgroundColor: '#fff',
    borderRadius: 15,
    width: '90%',
    maxWidth: 400
  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0'
  },
  calendarTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#004643'
  },
});