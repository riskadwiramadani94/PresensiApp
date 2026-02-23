import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, TextInput, ScrollView, Modal, Image } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Calendar } from 'react-native-calendars';
import { API_CONFIG, getApiUrl } from '../../constants/config';
import { AppHeader } from '../../components';

interface DinasData {
  id: number;
  nama_lengkap: string;
  nip: string;
  nama_kegiatan: string;
  tanggal_mulai: string;
  tanggal_selesai: string;
  lokasi_dinas: string;
  status_dinas: string;
  status?: string;
  status_konfirmasi: string;
  jabatan: string;
  foto_profil?: string;
  total_absen?: number;
  absen_lengkap?: number;
}

export default function LaporanDetailDinasScreen() {
  const router = useRouter();
  const [data, setData] = useState<DinasData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDateFilter, setSelectedDateFilter] = useState('bulan_ini');
  const [showDateRangePicker, setShowDateRangePicker] = useState(false);
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showCalendar, setShowCalendar] = useState(false);

  useEffect(() => {
    fetchData();
  }, [selectedDateFilter, searchQuery, dateRange]);

  const fetchData = async () => {
    setLoading(true);
    try {
      let url = `${getApiUrl(API_CONFIG.ENDPOINTS.LAPORAN)}?type=dinas`;
      
      if (selectedDateFilter === 'hari_ini') {
        const today = new Date().toISOString().split('T')[0];
        url += `&date=${today}`;
      } else if (selectedDateFilter === 'tanggal_tertentu') {
        const dateStr = selectedDate.toISOString().split('T')[0];
        url += `&date=${dateStr}`;
      }
      // Untuk bulan_ini dan minggu_ini, tidak perlu filter tanggal (tampilkan semua)
      
      if (searchQuery) {
        url += `&search=${encodeURIComponent(searchQuery)}`;
      }
      
      const response = await fetch(url);
      const result = await response.json();
      
      if (result.success && Array.isArray(result.data)) {
        const sortedData = result.data.sort((a: DinasData, b: DinasData) => 
          a.nama_lengkap.localeCompare(b.nama_lengkap)
        );
        setData(sortedData);
      } else {
        setData([]);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  const renderCalendarModal = () => (
    <Modal visible={showCalendar} transparent>
      <View style={styles.modalOverlay}>
        <View style={styles.calendarModal}>
          <View style={styles.calendarHeader}>
            <Text style={styles.calendarTitle}>Pilih Tanggal</Text>
            <TouchableOpacity onPress={() => setShowCalendar(false)}>
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>
          <Calendar
            onDayPress={(day) => {
              setSelectedDate(new Date(day.dateString));
              setSelectedDateFilter('tanggal_tertentu');
              setShowCalendar(false);
            }}
            markedDates={{
              [selectedDate.toISOString().split('T')[0]]: {
                selected: true,
                selectedColor: '#004643'
              }
            }}
            maxDate={new Date().toISOString().split('T')[0]}
            theme={{
              backgroundColor: '#ffffff',
              calendarBackground: '#ffffff',
              textSectionTitleColor: '#004643',
              selectedDayBackgroundColor: '#004643',
              selectedDayTextColor: '#ffffff',
              todayTextColor: '#004643',
              dayTextColor: '#2d4150',
              textDisabledColor: '#d9e1e8',
              dotColor: '#004643',
              selectedDotColor: '#ffffff',
              arrowColor: '#004643',
              disabledArrowColor: '#d9e1e8',
              monthTextColor: '#004643',
              indicatorColor: '#004643',
              textDayFontFamily: 'System',
              textMonthFontFamily: 'System',
              textDayHeaderFontFamily: 'System',
              textDayFontWeight: '400',
              textMonthFontWeight: 'bold',
              textDayHeaderFontWeight: '600',
              textDayFontSize: 16,
              textMonthFontSize: 18,
              textDayHeaderFontSize: 14
            }}
          />
        </View>
      </View>
    </Modal>
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return '#4CAF50';
      case 'pending': return '#FF9800';
      case 'rejected': return '#F44336';
      default: return '#666';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'approved': return 'Disetujui';
      case 'pending': return 'Menunggu';
      case 'rejected': return 'Ditolak';
      default: return status;
    }
  };

  const renderItem = ({ item }: { item: DinasData }) => (
    <TouchableOpacity 
      style={styles.dataCard}
      onPress={() => {
        // Pass filter parameters to detail page
        const params = new URLSearchParams({
          filter: selectedDateFilter,
          start_date: selectedDateFilter === 'pilih_tanggal' ? dateRange.start : '',
          end_date: selectedDateFilter === 'pilih_tanggal' ? dateRange.end : ''
        });
        router.push(`/laporan/detail-dinas/${item.id}?${params.toString()}` as any);
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
          <Text style={styles.employeeName}>{item.nama_lengkap || ''}</Text>
          <Text style={styles.employeeNip}>NIP: {item.nip || '-'}</Text>
          <Text style={styles.employeeJob}>{item.jabatan || '-'}</Text>
        </View>
        <TouchableOpacity style={styles.detailBtn}>
          <Ionicons name="chevron-forward" size={16} color="#666" />
        </TouchableOpacity>
      </View>
      
      <View style={styles.cardContent}>
        <View style={styles.infoRow}>
          <Ionicons name="briefcase-outline" size={16} color="#666" />
          <Text style={styles.infoText}>Kegiatan: {item.nama_kegiatan || '-'}</Text>
        </View>
        <View style={styles.infoRow}>
          <Ionicons name="calendar-outline" size={16} color="#666" />
          <Text style={styles.infoText}>
            Periode: {item.tanggal_mulai ? new Date(item.tanggal_mulai).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'} - {item.tanggal_selesai ? new Date(item.tanggal_selesai).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'}
          </Text>
        </View>
        <View style={styles.infoRow}>
          <Ionicons name="location-outline" size={16} color="#666" />
          <Text style={styles.infoText}>Lokasi: {item.lokasi_dinas || '-'}</Text>
        </View>
        
        <View style={styles.statusContainer}>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status_dinas || item.status || 'pending') + '20' }]}>
            <Text style={[styles.statusText, { color: getStatusColor(item.status_dinas || item.status || 'pending') }]}>
              {getStatusLabel(item.status_dinas || item.status || 'pending')}
            </Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <StatusBar style="light" translucent={true} backgroundColor="transparent" />
      
      <AppHeader 
        title="Laporan Dinas"
        showBack={true}
        fallbackRoute="/laporan/laporan-admin"
      />

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#004643" />
          <Text style={styles.loadingText}>Memuat data dinas...</Text>
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
                placeholder="Cari nama pegawai atau jenis dinas..."
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
                      setShowDateRangePicker(true);
                    } else {
                      setSelectedDateFilter(filter.key);
                      setDateRange({ start: '', end: '' }); // Reset date range when switching to other filters
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
                Menampilkan {data.length} data dinas
              </Text>
            </View>
          </View>
          
          <FlatList
            data={data || []}
            keyExtractor={(item, index) => `${item?.id}-${item?.nip}-${index}`}
            renderItem={renderItem}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={() => (
              <View style={styles.emptyState}>
                <Ionicons name="airplane-outline" size={60} color="#ccc" />
                <Text style={styles.emptyText}>Tidak ada data dinas ditemukan</Text>
              </View>
            )}
          />
          </View>
        </View>
      )}
      
      {/* Date Range Modals */}
      <Modal visible={showDateRangePicker} transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.dateRangeModal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Pilih Periode Tanggal</Text>
              <TouchableOpacity onPress={() => setShowDateRangePicker(false)}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.dateInputs}>
              <View style={styles.dateInputGroup}>
                <Text style={styles.dateLabel}>Tanggal Mulai</Text>
                <TouchableOpacity 
                  style={styles.dateInput}
                  onPress={() => setShowStartDatePicker(true)}
                >
                  <Text style={styles.dateInputText}>
                    {dateRange.start ? new Date(dateRange.start).toLocaleDateString('id-ID') : 'Pilih tanggal mulai'}
                  </Text>
                  <Ionicons name="calendar-outline" size={20} color="#004643" />
                </TouchableOpacity>
              </View>
              
              <View style={styles.dateInputGroup}>
                <Text style={styles.dateLabel}>Tanggal Selesai</Text>
                <TouchableOpacity 
                  style={styles.dateInput}
                  onPress={() => setShowEndDatePicker(true)}
                >
                  <Text style={styles.dateInputText}>
                    {dateRange.end ? new Date(dateRange.end).toLocaleDateString('id-ID') : 'Pilih tanggal selesai'}
                  </Text>
                  <Ionicons name="calendar-outline" size={20} color="#004643" />
                </TouchableOpacity>
              </View>
            </View>
            
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={styles.cancelBtn}
                onPress={() => setShowDateRangePicker(false)}
              >
                <Text style={styles.cancelBtnText}>Batal</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.confirmBtn}
                onPress={() => {
                  if (dateRange.start && dateRange.end) {
                    setSelectedDateFilter('pilih_tanggal');
                    setShowDateRangePicker(false);
                  }
                }}
              >
                <Text style={styles.confirmBtnText}>Terapkan</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      
      {showStartDatePicker && (
        <Modal visible={showStartDatePicker} transparent animationType="none" statusBarTranslucent={true}>
          <View style={styles.modalOverlay}>
            <TouchableOpacity 
              style={styles.modalBackdrop} 
              activeOpacity={1}
              onPress={() => setShowStartDatePicker(false)}
            />
            <View style={styles.calendarModal}>
              <View style={styles.calendarHeader}>
                <Text style={styles.calendarTitle}>Pilih Tanggal Mulai</Text>
                <TouchableOpacity onPress={() => setShowStartDatePicker(false)}>
                  <Ionicons name="close" size={24} color="#666" />
                </TouchableOpacity>
              </View>
              <Calendar
                onDayPress={(day) => {
                  setDateRange({...dateRange, start: day.dateString});
                  setShowStartDatePicker(false);
                }}
                maxDate={new Date().toISOString().split('T')[0]}
                theme={{
                  backgroundColor: '#ffffff',
                  calendarBackground: '#ffffff',
                  textSectionTitleColor: '#004643',
                  selectedDayBackgroundColor: '#004643',
                  selectedDayTextColor: '#ffffff',
                  todayTextColor: '#004643',
                  dayTextColor: '#2d4150',
                  textDisabledColor: '#d9e1e8',
                  arrowColor: '#004643',
                  monthTextColor: '#004643'
                }}
              />
            </View>
          </View>
        </Modal>
      )}
      
      {showEndDatePicker && (
        <Modal visible={showEndDatePicker} transparent animationType="none" statusBarTranslucent={true}>
          <View style={styles.modalOverlay}>
            <TouchableOpacity 
              style={styles.modalBackdrop} 
              activeOpacity={1}
              onPress={() => setShowEndDatePicker(false)}
            />
            <View style={styles.calendarModal}>
              <View style={styles.calendarHeader}>
                <Text style={styles.calendarTitle}>Pilih Tanggal Selesai</Text>
                <TouchableOpacity onPress={() => setShowEndDatePicker(false)}>
                  <Ionicons name="close" size={24} color="#666" />
                </TouchableOpacity>
              </View>
              <Calendar
                onDayPress={(day) => {
                  setDateRange({...dateRange, end: day.dateString});
                  setShowEndDatePicker(false);
                }}
                minDate={dateRange.start || undefined}
                maxDate={new Date().toISOString().split('T')[0]}
                theme={{
                  backgroundColor: '#ffffff',
                  calendarBackground: '#ffffff',
                  textSectionTitleColor: '#004643',
                  selectedDayBackgroundColor: '#004643',
                  selectedDayTextColor: '#ffffff',
                  todayTextColor: '#004643',
                  dayTextColor: '#2d4150',
                  textDisabledColor: '#d9e1e8',
                  arrowColor: '#004643',
                  monthTextColor: '#004643'
                }}
              />
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff' },
  contentContainer: {
    flex: 1,
  },
  content: { flex: 1 },
  searchContainer: {
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#ffffff'
  },
  searchInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
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
    backgroundColor: '#ffffff',
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
    backgroundColor: '#ffffff',
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
    color: '#ffffff'
  },
  selectedDateInfo: {
    backgroundColor: '#ffffff',
    padding: 8,
    borderRadius: 8,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E0E0E0'
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
  summaryCard: {
    backgroundColor: '#2196F3',
    padding: 20,
    borderRadius: 20,
    marginBottom: 20,
  },
  summaryTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  summaryDesc: {
    color: '#E3F2FD',
    fontSize: 12,
  },
  listContent: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 20 },
  dataCard: {
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
    backgroundColor: '#E3F2FD',
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
    color: '#1976D2',
    fontWeight: 'bold',
    fontSize: 16,
  },
  detailBtn: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#F5F5F5',
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
    marginBottom: 2,
  },
  employeeJob: {
    fontSize: 12,
    color: '#888',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusContainer: {
    marginTop: 8,
    alignItems: 'flex-start'
  },
  statusText: { fontSize: 12, fontWeight: 'bold' },
  cardContent: { gap: 8 },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 4,
  },
  infoText: {
    fontSize: 12,
    color: '#666',
    flex: 1,
    flexWrap: 'wrap',
  },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 10, color: '#666' },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40
  },
  emptyText: {
    fontSize: 14,
    color: '#999',
    marginTop: 10
  },
  
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
  dateRangeModal: {
    backgroundColor: '#fff',
    borderRadius: 15,
    width: '90%',
    maxWidth: 400,
    padding: 20
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#004643'
  },
  dateInputs: {
    marginBottom: 20
  },
  dateInputGroup: {
    marginBottom: 15
  },
  dateLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8
  },
  dateInput: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0'
  },
  dateInputText: {
    fontSize: 14,
    color: '#333'
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 10
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#F5F5F5',
    alignItems: 'center'
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666'
  },
  confirmBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#004643',
    alignItems: 'center'
  },
  confirmBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff'
  },
});
