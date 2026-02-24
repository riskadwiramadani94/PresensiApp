import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, TextInput, ScrollView, Modal, Image, Platform, Animated, PanResponder } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as NavigationBar from 'expo-navigation-bar';
import { API_CONFIG, getApiUrl } from '../../constants/config';
import { AppHeader } from '../../components';

interface IzinData {
  id: number;
  nama_lengkap: string;
  nip: string;
  jenis_pengajuan: string;
  tanggal_mulai: string;
  tanggal_selesai: string;
  alasan_text: string;
  status: string;
  jabatan: string;
  foto_profil?: string;
}

export default function LaporanDetailIzinScreen() {
  const router = useRouter();
  const [data, setData] = useState<IzinData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDateFilter, setSelectedDateFilter] = useState('bulan_ini');
  const [showFilterModal, setShowFilterModal] = useState(false);
  const filterTranslateY = useRef(new Animated.Value(300)).current;

  const openFilterModal = () => {
    setShowFilterModal(true);
    if (Platform.OS === 'android') {
      NavigationBar.setVisibilityAsync('hidden');
    }
    Animated.timing(filterTranslateY, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  const closeFilterModal = () => {
    Animated.timing(filterTranslateY, {
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

  const filterPanResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: (_, gestureState) => {
      return gestureState.dy > 5;
    },
    onPanResponderMove: (_, gestureState) => {
      if (gestureState.dy > 0) {
        filterTranslateY.setValue(gestureState.dy);
      }
    },
    onPanResponderRelease: (_, gestureState) => {
      if (gestureState.dy > 100) {
        closeFilterModal();
      } else {
        Animated.spring(filterTranslateY, {
          toValue: 0,
          useNativeDriver: true,
        }).start();
      }
    },
  });

  useEffect(() => {
    fetchData();
  }, [selectedDateFilter, searchQuery]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        type: 'izin',
        filter_date: selectedDateFilter,
        search: searchQuery
      });
      
      const response = await fetch(`${getApiUrl(API_CONFIG.ENDPOINTS.LAPORAN)}?${params.toString()}`);
      const result = await response.json();
      
      if (result.success && Array.isArray(result.data)) {
        const sortedData = result.data.sort((a: IzinData, b: IzinData) => 
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

  const getJenisLabel = (jenis: string) => {
    const labels: any = {
      'cuti_tahunan': 'Cuti Tahunan',
      'cuti_khusus': 'Cuti Khusus',
      'izin_pribadi': 'Izin Pribadi',
      'izin_sakit': 'Izin Sakit'
    };
    return labels[jenis] || jenis;
  };

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

  const renderItem = ({ item }: { item: IzinData }) => (
    <TouchableOpacity 
      style={styles.dataCard}
      onPress={() => {
        // Pass filter parameters to detail page
        const params = new URLSearchParams({
          filter: selectedDateFilter,
          start_date: selectedDateFilter === 'pilih_tanggal' ? dateRange.start : '',
          end_date: selectedDateFilter === 'pilih_tanggal' ? dateRange.end : ''
        });
        router.push(`/laporan/detail-izin/${item.id}?${params.toString()}` as any);
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
          <Text style={styles.employeeJob}>{item.jabatan}</Text>
        </View>
        <TouchableOpacity style={styles.detailBtn}>
          <Ionicons name="chevron-forward" size={16} color="#666" />
        </TouchableOpacity>
      </View>
      
      <View style={styles.cardContent}>
        <View style={styles.infoRow}>
          <Ionicons name="document-text-outline" size={16} color="#666" />
          <Text style={styles.infoText}>Jenis: {getJenisLabel(item.jenis_pengajuan)}</Text>
        </View>
        <View style={styles.infoRow}>
          <Ionicons name="calendar-outline" size={16} color="#666" />
          <Text style={styles.infoText}>Periode: {item.tanggal_mulai} - {item.tanggal_selesai}</Text>
        </View>
        <View style={styles.infoRow}>
          <Ionicons name="information-circle-outline" size={16} color="#666" />
          <Text style={styles.infoText}>Alasan: {item.alasan_text}</Text>
        </View>
        
        <View style={styles.statusContainer}>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '20' }]}>
            <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
              {getStatusLabel(item.status)}
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
        title="Laporan Izin/Cuti"
        showBack={true}
        fallbackRoute="/admin/dashboard-admin"
      />

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#004643" />
          <Text style={styles.loadingText}>Memuat data izin/cuti...</Text>
        </View>
      ) : (
        <View style={styles.contentWrapper}>
          {/* Search Container with Filter Icon */}
          <View style={styles.searchContainer}>
            <View style={styles.searchInputWrapper}>
              <Ionicons name="search-outline" size={20} color="#666" />
              <TextInput
                style={styles.searchInput}
                placeholder="Cari nama pegawai atau jenis izin..."
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
            <TouchableOpacity 
              style={styles.filterIconBtn}
              onPress={openFilterModal}
            >
              <Ionicons name="options" size={20} color="#004643" />
            </TouchableOpacity>
          </View>
          
          <FlatList
            data={data || []}
            keyExtractor={(item, index) => item?.id?.toString() || index.toString()}
            renderItem={renderItem}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={() => (
              <View style={styles.emptyState}>
                <Ionicons name="document-outline" size={60} color="#ccc" />
                <Text style={styles.emptyText}>Tidak ada data izin/cuti ditemukan</Text>
              </View>
            )}
          />
        </View>
      )}
      
      {/* Filter Modal - Bottom Sheet */}
      <Modal
        visible={showFilterModal}
        transparent={true}
        animationType="none"
        statusBarTranslucent={true}
        onRequestClose={closeFilterModal}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity 
            style={styles.modalBackdrop} 
            activeOpacity={1}
            onPress={closeFilterModal}
          />
          <Animated.View style={[styles.filterBottomSheetModal, {
            transform: [{ translateY: filterTranslateY }]
          }]}>
            <View {...filterPanResponder.panHandlers} style={styles.handleContainer}>
              <View style={styles.handleBar} />
            </View>
            
            <View style={styles.bottomSheetContent}>
              <Text style={styles.modalTitle}>Filter Periode</Text>
              
              <View style={styles.filterGrid}>
                {[
                  { value: 'minggu_ini', label: 'Minggu Ini', icon: 'calendar' },
                  { value: 'bulan_ini', label: 'Bulan Ini', icon: 'calendar-outline' },
                  { value: 'semua', label: 'Semua', icon: 'apps' }
                ].map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.filterChip,
                      selectedDateFilter === option.value && styles.filterChipActive
                    ]}
                    onPress={() => {
                      setSelectedDateFilter(option.value);
                      closeFilterModal();
                    }}
                  >
                    <Ionicons 
                      name={option.icon as any} 
                      size={18} 
                      color={selectedDateFilter === option.value ? '#fff' : '#666'} 
                    />
                    <Text style={[
                      styles.filterChipText,
                      selectedDateFilter === option.value && styles.filterChipTextActive
                    ]}>
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </Animated.View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: "#fff",
  },

  contentWrapper: {
    flex: 1,
    backgroundColor: "#ffffff",
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 15,
    backgroundColor: '#ffffff',
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6'
  },
  searchInputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 15,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    gap: 12
  },
  filterIconBtn: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    paddingVertical: 12
  },
  filterBottomSheetModal: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    paddingTop: 8,
  },
  bottomSheetContent: {
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  handleContainer: {
    paddingVertical: 12,
    alignItems: 'center',
    width: '100%',
  },
  handleBar: {
    width: 40,
    height: 4,
    backgroundColor: '#DDD',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 8,
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
  },
  filterGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  filterChip: {
    width: '48%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#E0E0E0',
  },
  filterChipActive: {
    backgroundColor: '#004643',
    borderColor: '#004643'
  },
  filterChipText: {
    fontSize: 13,
    color: '#666',
    fontWeight: '600',
  },
  filterChipTextActive: {
    color: '#fff',
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
    backgroundColor: '#FFF3E0',
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
    color: '#FF9800',
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
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingTop: Platform.OS === 'android' ? 0 : 50,
  },
  modalBackdrop: {
    flex: 1,
  },
});
