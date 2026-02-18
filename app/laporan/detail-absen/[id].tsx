import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Modal, Image, ScrollView } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { AppHeader, SkeletonLoader } from '../../../components';

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

import { API_CONFIG, getApiUrl } from '../../../constants/config';


export default function DetailAbsenPegawai() {
  const router = useRouter();
  const { id, filter, start_date, end_date } = useLocalSearchParams();
  const [pegawai, setPegawai] = useState({ nama: '', nip: '', user_id: '' });
  const [pegawaiData, setPegawaiData] = useState<any>(null);
  const [absenData, setAbsenData] = useState<AbsenDetail[]>([]);
  const [hariLibur, setHariLibur] = useState<{tanggal: string, nama_libur: string}[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [detailAbsen, setDetailAbsen] = useState<any>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [periodInfo, setPeriodInfo] = useState('');

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
      case 'hari_ini':
        setPeriodInfo(`${days[today.getDay()]}, ${today.getDate()} ${months[today.getMonth()]} ${today.getFullYear()}`);
        break;
      case 'minggu_ini':
        const startOfWeek = new Date(today);
        startOfWeek.setDate(today.getDate() - today.getDay());
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);
        setPeriodInfo(`Minggu, ${startOfWeek.getDate()}-${endOfWeek.getDate()} ${months[today.getMonth()]} ${today.getFullYear()}`);
        break;
      case 'bulan_ini':
        setPeriodInfo(`${months[today.getMonth()]} ${today.getFullYear()}`);
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
        case 'hari_ini':
          startDate = endDate = today.toISOString().split('T')[0];
          break;
        case 'minggu_ini':
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
          break;
        case 'bulan_ini':
          startDate = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
          endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0];
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
      
      console.log('=== ABSEN DATA DEBUG ===');
      console.log('Response:', JSON.stringify(data, null, 2));
      console.log('Is Array:', Array.isArray(data.data));
      if (Array.isArray(data.data) && data.data.length > 0) {
        console.log('First item:', JSON.stringify(data.data[0], null, 2));
      }
      
      if (data.success && data.data && Array.isArray(data.data) && data.data.length > 0) {
        // Ada data dari backend - transform
        const transformedData = transformPresensiData(data.data, startDate, endDate);
        console.log('Transformed data:', JSON.stringify(transformedData.slice(0, 2), null, 2));
        setAbsenData(transformedData);
      } else {
        // Tidak ada data sama sekali
        console.log('No data, generating empty');
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
    const startDate = new Date(startDateStr);
    const endDate = new Date(endDateStr);
    const absenData = [];
    
    // Buat map dari data presensi untuk lookup cepat
    const presensiMap = new Map();
    presensiData.forEach((p: any) => {
      const dateKey = p.tanggal.includes('T') ? p.tanggal.split('T')[0] : p.tanggal;
      presensiMap.set(dateKey, p);
    });
    
    console.log('PresensiMap keys:', Array.from(presensiMap.keys()));
    console.log('Date range:', startDateStr, 'to', endDateStr);
    
    // Loop through each day in the date range
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      const dateString = d.toISOString().split('T')[0];
      const presensi = presensiMap.get(dateString);
      
      if (presensi) {
        console.log(`✓ Date ${dateString}: FOUND - status=${presensi.status}`);
      } else {
        console.log(`✗ Date ${dateString}: NOT FOUND`);
      }
      
      if (presensi) {
        // ADA DATA PRESENSI - gunakan status dari database
        absenData.push({
          tanggal: dateString,
          status: presensi.status,
          jam_masuk: presensi.jam_masuk,
          jam_keluar: presensi.jam_keluar,
          keterangan: presensi.keterangan || presensi.status
        });
      } else {
        // Tidak ada data presensi - gunakan status dari backend atau fallback
        const today = new Date();
        const currentTime = new Date();
        const itemDate = new Date(dateString);
        itemDate.setHours(0, 0, 0, 0);
        today.setHours(0, 0, 0, 0);
        
        let status = 'Tidak Hadir';
        let keterangan = 'Belum absen';
        
        // Hari yang akan datang
        if (itemDate > today) {
          status = 'Belum Waktunya';
          keterangan = 'Belum waktunya absen';
        }
        // Hari ini - cek jam kerja
        else if (itemDate.getTime() === today.getTime()) {
          const [batasJam, batasMenit] = [8, 30];
          const [pulangJam, pulangMenit] = [17, 0];
          
          const batasAbsen = new Date();
          batasAbsen.setHours(batasJam, batasMenit, 0, 0);
          
          const jamPulang = new Date();
          jamPulang.setHours(pulangJam, pulangMenit, 0, 0);
          
          if (currentTime > jamPulang) {
            status = 'Tidak Hadir';
            keterangan = 'Tidak hadir';
          } else if (currentTime > batasAbsen) {
            status = 'Tidak Hadir';
            keterangan = 'Tidak hadir';
          } else {
            status = 'Belum Absen';
            keterangan = 'Belum melakukan absensi';
          }
        }
        // Hari yang sudah lewat
        else if (itemDate < today) {
          status = 'Tidak Hadir';
          keterangan = 'Tidak hadir';
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
    const startDate = new Date(startDateStr);
    const endDate = new Date(endDateStr);
    const absenData = [];
    
    // Loop through each day in the date range
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      const dateString = d.toISOString().split('T')[0];
      const today = new Date();
      const currentTime = new Date();
      const itemDate = new Date(dateString);
      itemDate.setHours(0, 0, 0, 0);
      today.setHours(0, 0, 0, 0);
      
      let status = 'Tidak Hadir';
      let keterangan = 'Belum absen';
      
      // Hari yang akan datang
      if (itemDate > today) {
        status = 'Belum Waktunya';
        keterangan = 'Belum waktunya absen';
      }
      // Hari ini
      else if (itemDate.getTime() === today.getTime()) {
        const [batasJam, batasMenit] = [8, 30];
        const [pulangJam, pulangMenit] = [17, 0];
        
        const batasAbsen = new Date();
        batasAbsen.setHours(batasJam, batasMenit, 0, 0);
        
        const jamPulang = new Date();
        jamPulang.setHours(pulangJam, pulangMenit, 0, 0);
        
        if (currentTime > jamPulang) {
          status = 'Tidak Hadir';
          keterangan = 'Tidak hadir';
        } else if (currentTime > batasAbsen) {
          status = 'Tidak Hadir';
          keterangan = 'Tidak hadir';
        } else {
          status = 'Belum Absen';
          keterangan = 'Belum melakukan absensi';
        }
      }
      // Hari yang sudah lewat
      else if (itemDate < today) {
        status = 'Tidak Hadir';
        keterangan = 'Tidak hadir';
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
      setShowDetailModal(true);
    } else if (item.jam_masuk) {
      fetchDetailAbsenHarian(item.tanggal, pegawai.user_id);
    } else {
      // Tentukan status berdasarkan waktu untuk yang belum absen
      const today = new Date();
      const currentTime = new Date();
      const itemDate = new Date(item.tanggal);
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
      setShowDetailModal(true);
    }
  };

  const fetchDetailAbsenHarian = async (tanggal: string, user_id: string) => {
    try {
      const response = await fetch(`${getApiUrl(API_CONFIG.ENDPOINTS.DETAIL_ABSEN)}?date=${tanggal}&user_id=${user_id}`);
      const data = await response.json();
      
      if (data.success) {
        setDetailAbsen(data.data);
        setShowDetailModal(true);
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
        setShowDetailModal(true);
      }
    } catch (error) {
      // Silent error handling
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
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
    const itemDate = new Date(item.tanggal);
    itemDate.setHours(0, 0, 0, 0);
    const isFutureDate = itemDate > today;
    const isDinas = item.status === 'Dinas';
    const isLibur = item.status === 'Libur';
    const isDisabled = isFutureDate || isDinas;
    
    let displayStatus = item.status;
    let displayKeterangan = item.keterangan;
    
    console.log(`Render ${item.tanggal}: status=${item.status}, jam_masuk=${item.jam_masuk}`);
    
    // Prioritas: Jika ada hari libur merah
    if (liburInfo) {
      displayStatus = 'Libur';
      displayKeterangan = liburInfo.nama_libur;
    }
    // JIKA ADA JAM MASUK, GUNAKAN STATUS DARI DATABASE TANPA PERUBAHAN
    
    console.log(`Display ${item.tanggal}: displayStatus=${displayStatus}`);
    
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
      const date = new Date(dateString);
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
        onRequestClose={() => setShowDetailModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.detailModalContainer}>
            <View style={styles.detailModalHeader}>
              <Text style={styles.detailModalTitle}>Detail Absensi</Text>
              <TouchableOpacity onPress={() => setShowDetailModal(false)}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.detailContent} showsVerticalScrollIndicator={false}>
              <Text style={styles.detailDate}>{formatDetailDate(detailAbsen.tanggal)}</Text>
              
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Status:</Text>
                <View style={[
                  styles.detailStatusBadge, 
                  { backgroundColor: statusConfig[detailAbsen.status as keyof typeof statusConfig]?.color || '#9E9E9E' }
                ]}>
                  <Text style={styles.detailStatusText}>{detailAbsen.status}</Text>
                </View>
              </View>
              
              {detailAbsen.isLibur ? (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Keterangan:</Text>
                  <Text style={styles.detailValue}>{detailAbsen.keterangan}</Text>
                </View>
              ) : (
                <>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Jam Masuk:</Text>
                    <Text style={styles.detailValue}>{detailAbsen.jam_masuk || '-'}</Text>
                  </View>
                  
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Jam Pulang:</Text>
                    <Text style={styles.detailValue}>{detailAbsen.jam_pulang || '-'}</Text>
                  </View>

                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Durasi Kerja:</Text>
                    <Text style={styles.detailValue}>
                      {detailAbsen.jam_masuk && detailAbsen.jam_pulang ? calculateWorkDuration(detailAbsen.jam_masuk, detailAbsen.jam_pulang) : '-'}
                    </Text>
                  </View>
                  
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Lokasi Masuk:</Text>
                    <Text style={styles.detailValue}>{detailAbsen.lokasi_masuk || '-'}</Text>
                  </View>
                  
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Lokasi Pulang:</Text>
                    <Text style={styles.detailValue}>{detailAbsen.lokasi_pulang || '-'}</Text>
                  </View>

                  {/* Koordinat GPS */}
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Koordinat Masuk:</Text>
                    <Text style={styles.detailValue}>
                      {detailAbsen.lat_masuk && detailAbsen.long_masuk ? 
                        `${parseFloat(detailAbsen.lat_masuk).toFixed(6)}, ${parseFloat(detailAbsen.long_masuk).toFixed(6)}` : '-'}
                    </Text>
                  </View>

                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Koordinat Pulang:</Text>
                    <Text style={styles.detailValue}>
                      {detailAbsen.lat_pulang && detailAbsen.long_pulang ? 
                        `${parseFloat(detailAbsen.lat_pulang).toFixed(6)}, ${parseFloat(detailAbsen.long_pulang).toFixed(6)}` : '-'}
                    </Text>
                  </View>

                  {/* Jarak dari Kantor */}
                  {detailAbsen.jarak_masuk && (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Jarak Masuk:</Text>
                      <Text style={styles.detailValue}>{Math.round(detailAbsen.jarak_masuk)} meter</Text>
                    </View>
                  )}

                  {detailAbsen.jarak_pulang && (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Jarak Pulang:</Text>
                      <Text style={styles.detailValue}>{Math.round(detailAbsen.jarak_pulang)} meter</Text>
                    </View>
                  )}

                  {/* Status Keterlambatan */}
                  {detailAbsen.menit_terlambat && detailAbsen.menit_terlambat > 0 && (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Keterlambatan:</Text>
                      <Text style={[styles.detailValue, { color: '#F44336' }]}>
                        {detailAbsen.menit_terlambat} menit
                      </Text>
                    </View>
                  )}
                  
                  {detailAbsen.alasan_terlambat && (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Alasan Terlambat:</Text>
                      <Text style={styles.detailValue}>{detailAbsen.alasan_terlambat}</Text>
                    </View>
                  )}
                  
                  {detailAbsen.alasan_pulang_cepat && (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Alasan Pulang Cepat:</Text>
                      <Text style={styles.detailValue}>{detailAbsen.alasan_pulang_cepat}</Text>
                    </View>
                  )}
                  
                  {/* Foto Presensi */}
                  {(detailAbsen.foto_masuk || detailAbsen.foto_pulang) && (
                    <View style={styles.photoRow}>
                      {detailAbsen.foto_masuk && (
                        <View style={styles.photoColumn}>
                          <View style={styles.photoHeader}>
                            <Ionicons name="camera" size={16} color="#4CAF50" />
                            <Text style={styles.photoLabel}>Foto Masuk</Text>
                          </View>
                          <View style={styles.photoContainer}>
                            <Image 
                              source={{ uri: detailAbsen.foto_masuk }} 
                              style={styles.photoPresensi}
                            />
                          </View>
                        </View>
                      )}
                      
                      {detailAbsen.foto_pulang && (
                        <View style={styles.photoColumn}>
                          <View style={styles.photoHeader}>
                            <Ionicons name="camera" size={16} color="#FF5722" />
                            <Text style={styles.photoLabel}>Foto Pulang</Text>
                          </View>
                          <View style={styles.photoContainer}>
                            <Image 
                              source={{ uri: detailAbsen.foto_pulang }} 
                              style={styles.photoPresensi}
                            />
                          </View>
                        </View>
                      )}
                    </View>
                  )}

                  {/* Device Info */}
                  {detailAbsen.device_info && (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Perangkat:</Text>
                      <Text style={styles.detailValue}>{detailAbsen.device_info}</Text>
                    </View>
                  )}

                  {/* Keterangan Tambahan */}
                  {detailAbsen.keterangan && !detailAbsen.isLibur && (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Keterangan:</Text>
                      <Text style={styles.detailValue}>{detailAbsen.keterangan}</Text>
                    </View>
                  )}
                </>
              )}
            </ScrollView>
          </View>
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
              source={{ uri: `${API_CONFIG.BASE_URL}${pegawaiData.foto_profil}` }} 
              style={styles.avatarImage}
              onError={() => console.log('Error loading image')}
            />
          ) : (
            <View style={styles.avatarContainer}>
              <Ionicons name="person-circle" size={40} color="#004643" />
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
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailModalContainer: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    width: '85%',
    maxHeight: '90%',
  },
  detailModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  detailModalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  detailContent: {
    maxHeight: 400,
    paddingBottom: 10
  },
  detailDate: {
    fontSize: 16,
    fontWeight: '600',
    color: '#004643',
    textAlign: 'center',
    marginBottom: 8,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  detailLabel: {
    fontSize: 14,
    color: '#666',
    flex: 1,
  },
  detailValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
    flex: 2,
    textAlign: 'right',
  },
  detailStatusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 6,
  },
  detailStatusText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  photoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 12,
    gap: 12,
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
  photoSection: {
    marginVertical: 12,
  },
  photoLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  photoContainer: {
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    padding: 8,
  },
  photoPresensi: {
    width: 100,
    height: 100,
    borderRadius: 8,
    backgroundColor: '#E0E0E0',
  },
});