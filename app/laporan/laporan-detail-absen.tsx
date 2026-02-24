import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, ActivityIndicator, TextInput, ScrollView, Modal, Image, Platform, Animated, PanResponder } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as NavigationBar from 'expo-navigation-bar';
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
    'Dinas': number;
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
  'Dinas': { color: '#00BCD4', icon: 'briefcase' },
  'Belum Absen': { color: '#FF9800', icon: 'time-outline' },
};

import { API_CONFIG, getApiUrl } from '../../constants/config';

export default function LaporanDetailAbsenScreen() {
  const router = useRouter();
  const [data, setData] = useState<PegawaiAbsen[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDateFilter, setSelectedDateFilter] = useState('hari_ini');
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
        type: 'absen',
        filter_date: selectedDateFilter,
        search: searchQuery
      });
      
      console.log('Fetching with filter:', selectedDateFilter);
      const response = await fetch(`${getApiUrl(API_CONFIG.ENDPOINTS.LAPORAN)}?${params.toString()}`);
      const result = await response.json();
      
      if (result.success) {
        const sortedData = result.data.sort((a: PegawaiAbsen, b: PegawaiAbsen) => 
          a.nama_lengkap.localeCompare(b.nama_lengkap)
        );
        console.log('Filtered data count:', sortedData.length);
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
    
    // Untuk status Dinas, tampilkan tanpa angka
    if (status === 'Dinas') {
      return (
        <View key={status} style={[styles.statusBadge, { backgroundColor: config.color + '15' }]}>
          <Text style={[styles.statusText, { color: config.color }]}>
            Dinas
          </Text>
        </View>
      );
    }
    
    return (
      <View key={status} style={[styles.statusBadge, { backgroundColor: config.color + '15' }]}>
        <Text style={[styles.statusText, { color: config.color }]}>
          {status.replace('Dinas Luar/ Perjalanan Dinas', 'Dinas')} ({count})
        </Text>
      </View>
    );
  };

  const renderAbsentStatus = (item: PegawaiAbsen) => {
    let expectedWorkingDays = 1;
    const today = new Date();
    
    if (selectedDateFilter === 'minggu_ini') {
      const startOfWeek = new Date(today);
      startOfWeek.setDate(today.getDate() - today.getDay() + 1);
      expectedWorkingDays = 0;
      for (let i = 0; i < 7; i++) {
        const checkDate = new Date(startOfWeek);
        checkDate.setDate(startOfWeek.getDate() + i);
        if (checkDate <= today) {
          expectedWorkingDays++;
        }
      }
    } else if (selectedDateFilter === 'bulan_ini') {
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      expectedWorkingDays = 0;
      for (let d = new Date(startOfMonth); d <= today; d.setDate(d.getDate() + 1)) {
        expectedWorkingDays++;
      }
    }
    
    const totalAttendance = item.summary['Hadir'] + 
                           item.summary['Terlambat'] + 
                           item.summary['Izin'] + 
                           item.summary['Sakit'] + 
                           item.summary['Cuti'] + 
                           item.summary['Pulang Cepat'] + 
                           item.summary['Dinas Luar/ Perjalanan Dinas'] +
                           (item.summary['Dinas'] || 0);
    
    const absentDays = expectedWorkingDays - totalAttendance;
    
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
        const params = new URLSearchParams({
          filter: selectedDateFilter
        });
        router.push(`/laporan/detail-absen/${item.id_pegawai}?${params.toString()}` as any);
      }}
    >
      <View style={styles.cardHeader}>
        {item.foto_profil ? (
          <Image 
            source={{ uri: `${API_CONFIG.BASE_URL}${item.foto_profil.replace('/uploads/pegawai/uploads/pegawai/', '/uploads/pegawai/')}` }} 
            style={styles.avatarImage}
          />
        ) : (
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{item.nama_lengkap.charAt(0).toUpperCase()}</Text>
          </View>
        )}
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
      <StatusBar style="light" translucent={true} backgroundColor="transparent" />
      
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
          {/* Search Container with Filter Icon */}
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
            <TouchableOpacity 
              style={styles.filterIconBtn}
              onPress={openFilterModal}
            >
              <Ionicons name="options" size={20} color="#004643" />
            </TouchableOpacity>
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
                  { value: 'hari_ini', label: 'Hari Ini', icon: 'today' },
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
  container: { flex: 1, backgroundColor: '#ffffff' },
  contentContainer: {
    flex: 1,
  },

  content: { flex: 1 },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#fff',
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6'
  },
  searchInputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    paddingHorizontal: 15,
    borderWidth: 1,
    borderColor: '#E0E0E0',
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
    marginRight: 12,
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
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingTop: Platform.OS === 'android' ? 0 : 50,
  },
  modalBackdrop: {
    flex: 1,
  },
});
