import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, ScrollView, SafeAreaView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_CONFIG } from '../../constants/config';
import AppHeader from '../../components/AppHeader';

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

  useEffect(() => {
    fetchRiwayat();
  }, [selectedMonth, sortOrder]);

  const formatMonthYear = () => {
    const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
    return `${months[selectedMonth.getMonth()]} ${selectedMonth.getFullYear()}`;
  };

  const fetchRiwayat = async () => {
    try {
      const userData = await AsyncStorage.getItem('userData');
      if (!userData) return;
      
      const user = JSON.parse(userData);
      const userId = user.id_user || user.id;
      
      const firstDay = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth(), 1);
      const lastDay = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1, 0);
      
      const startDate = firstDay.toISOString().split('T')[0];
      const endDate = lastDay.toISOString().split('T')[0];
      
      const response = await fetch(
        `${API_CONFIG.BASE_URL}/pegawai/presensi/api/riwayat-gabungan?user_id=${userId}&start_date=${startDate}&end_date=${endDate}`
      );
      const data = await response.json();
      
      console.log('API Response:', data);
      
      if (data.success) {
        const riwayat = data.data || [];
        console.log('Riwayat data:', riwayat);
        const sortedRiwayat = [...riwayat].sort((a, b) => {
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
      <AppHeader title="Riwayat Presensi" showBack={false} />
      <ScrollView showsVerticalScrollIndicator={false}>
        
        {/* HEADER LAPORAN */}
        <View style={styles.header}>
          <View style={styles.filterRow}>
            <TouchableOpacity style={styles.filterBtn}>
              <Text style={styles.filterText}>Laporan Bulanan</Text>
              <Ionicons name="chevron-down" size={16} color="#666" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.filterBtn}>
              <Text style={styles.filterText}>{formatMonthYear()}</Text>
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', paddingBottom: 100 },
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
});