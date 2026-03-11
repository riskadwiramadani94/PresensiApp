import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Modal, Image, ScrollView, Animated, PanResponder, Dimensions, Platform, Linking } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { AppHeader } from '../../../../components';
import { useCustomAlert } from '../../../../hooks/useCustomAlert';
import { CustomAlert } from '../../../../components';
import Toast from '../../../../components/Toast';
import { useToast } from '../../../../hooks/useToast';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface AbsenDetail {
  tanggal: string;
  status: string;
  jam_masuk: string | null;
  jam_keluar: string | null;
  keterangan: string;
  isDinas?: boolean;
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
  'Libur': { color: '#F44336', icon: 'calendar' },
  // Warna khusus untuk status dinas
  'Dinas-Hadir': { color: '#4A90E2', icon: 'checkmark-circle' },
  'Dinas-Terlambat': { color: '#7B68EE', icon: 'time' },
  'Dinas-Tidak Hadir': { color: '#6A5ACD', icon: 'close-circle' },
  'Dinas-Belum Absen': { color: '#9370DB', icon: 'alert-circle' },
};

import { API_CONFIG, getApiUrl } from '../../../../constants/config';


export default function DetailAbsenPegawai() {
  const alert = useCustomAlert();
  const toast = useToast();
  const router = useRouter();
  const { id, filter, start_date, end_date, month, year } = useLocalSearchParams();
  
  // Log parameters untuk debugging
  console.log('🔍 DetailAbsenPegawai params:', {
    id,
    filter,
    start_date,
    end_date,
    month,
    year
  });
  
  const [pegawai, setPegawai] = useState({ nama: '', nip: '', user_id: '' });
  const [pegawaiData, setPegawaiData] = useState<any>(null);
  const [absenData, setAbsenData] = useState<AbsenDetail[]>([]);
  const [hariLibur, setHariLibur] = useState<{tanggal: string, nama_libur: string}[]>([]);
  const [dinasAktif, setDinasAktif] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [detailAbsen, setDetailAbsen] = useState<any>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [periodInfo, setPeriodInfo] = useState('');
  
  const translateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const exportTranslateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;

  const handleExportPegawai = async () => {
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
      toast.showToast(`Sedang menyiapkan laporan ${format.toUpperCase()}...`, 'loading');
      
      // Build export parameters
      let params: any = {
        type: 'export_pegawai',
        pegawai_id: id,
        filter_date: filter,
        format: format
      };

      if (start_date) params.start_date = start_date;
      if (end_date) params.end_date = end_date;
      if (month) params.month = month;
      if (year) params.year = year;

      const url = `${getApiUrl(API_CONFIG.ENDPOINTS.EXPORT_PEGAWAI)}?${new URLSearchParams(params).toString()}`;
      
      console.log('Export URL:', url);
      
      // Buka URL langsung untuk trigger download browser
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
        
        // Generate filename untuk notifikasi
        const fileExtension = format === 'excel' ? 'xlsx' : 'pdf';
        const fileName = `Laporan_Pegawai_${pegawai.nama.replace(/\s+/g, '_')}_${filter}.${fileExtension}`;
        
        // Tampilkan notifikasi download
        setTimeout(() => {
          toast.showToast(`📥 ${fileName} berhasil diunduh`, 'success');
        }, 1000);
      } else {
        toast.showToast('Tidak dapat membuka URL download', 'error');
      }
      
    } catch (error: any) {
      console.error('Export pegawai error:', error);
      toast.showToast('Gagal mengunduh laporan pegawai', 'error');
    }
  };

  useEffect(() => {
    fetchDetailAbsen();
    fetchHariLibur();
    fetchDinasAktif();
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

  const getStatusColor = (status: string) => {
    // Deteksi prefix "Dinas-" dan ambil warna yang sesuai
    const isDinas = status.startsWith('Dinas-');
    const baseStatus = isDinas ? status.replace('Dinas-', '') : status;
    
    if (isDinas) {
      // Warna khusus untuk status dinas (biru/ungu)
      switch (baseStatus.toLowerCase()) {
        case 'hadir': return '#4A90E2';
        case 'terlambat': return '#7B68EE';
        case 'tidak hadir': return '#6A5ACD';
        case 'belum absen': return '#9370DB';
        default: return '#6A5ACD';
      }
    } else {
      // Warna normal untuk status biasa
      switch (status.toLowerCase()) {
        case 'hadir': return '#4CAF50';
        case 'terlambat': return '#FF9800';
        case 'tidak hadir': return '#F44336';
        case 'dinas': return '#2196F3';
        case 'izin': return '#9C27B0';
        case 'sakit': return '#F44336';
        case 'libur': return '#F44336';
        case 'belum waktunya': return '#9E9E9E';
        case 'belum absen': return '#FF6F00';
        default: return '#999';
      }
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

  const fetchDinasAktif = async () => {
    try {
      const response = await fetch(getApiUrl(API_CONFIG.ENDPOINTS.DINAS_AKTIF));
      const data = await response.json();
      console.log('Dinas aktif API response:', JSON.stringify(data));
      if (data.success && data.data) {
        setDinasAktif(data.data);
        console.log('Setting dinas data:', data.data.length, 'items');
      }
    } catch (error) {
      console.error('Error fetching dinas aktif:', error);
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
          console.log('❌ User ID tidak ditemukan:', pegawaiData.data);
          setAbsenData([]);
        }
      } else {
        console.log('❌ Pegawai data tidak valid:', pegawaiData);
        setPegawai({ nama: 'Data pegawai tidak ditemukan', nip: '-', user_id: '' });
        setAbsenData([]);
      }
      
    } catch (error) {
      console.error('❌ Fetch error:', error);
      setPegawai({ nama: 'Error memuat data', nip: '-', user_id: '' });
      setAbsenData([]);
    } finally {
      setLoading(false);
    }
  };
  
  const fetchAbsenData = async (userId: string) => {
    try {
      console.log('🔍 Fetching absen data for user:', userId);
      
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
            const dayOfWeek = today.getDay();
            const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
            startOfWeek.setDate(today.getDate() + diff);
            const endOfWeek = new Date(startOfWeek);
            endOfWeek.setDate(startOfWeek.getDate() + 6);
            startDate = startOfWeek.toISOString().split('T')[0];
            endDate = endOfWeek.toISOString().split('T')[0];
          }
          break;
        case 'bulan_ini':
        case 'bulanan':
          const targetYear = year ? parseInt(year as string) : today.getFullYear();
          const targetMonth = month ? parseInt(month as string) - 1 : today.getMonth();
          const firstDay = new Date(Date.UTC(targetYear, targetMonth, 1));
          const lastDay = new Date(Date.UTC(targetYear, targetMonth + 1, 0));
          startDate = firstDay.toISOString().split('T')[0];
          endDate = lastDay.toISOString().split('T')[0];
          break;
        case 'tahunan':
          let yearValue = today.getFullYear();
          if (year && typeof year === 'string' && year.trim() !== '') {
            const parsedYear = parseInt(year.trim());
            if (!isNaN(parsedYear) && parsedYear >= 1900 && parsedYear <= 2100) {
              yearValue = parsedYear;
            }
          }
          startDate = `${yearValue}-01-01`;
          endDate = `${yearValue}-12-31`;
          break;
        case 'pilih_tanggal':
          startDate = start_date as string;
          endDate = end_date as string;
          break;
        default:
          startDate = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
          endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0];
      }
      
      console.log('📅 Date range:', { startDate, endDate, filter });
      
      const response = await fetch(`${getApiUrl(API_CONFIG.ENDPOINTS.PEGAWAI_PRESENSI)}?user_id=${userId}&start_date=${startDate}&end_date=${endDate}`);
      const data = await response.json();
      
      console.log('📊 Presensi API Response:', {
        success: data.success,
        dataLength: data.data?.length || 0,
        firstItem: data.data?.[0],
        url: `${getApiUrl(API_CONFIG.ENDPOINTS.PEGAWAI_PRESENSI)}?user_id=${userId}&start_date=${startDate}&end_date=${endDate}`
      });
      
      if (data.success && data.data && Array.isArray(data.data) && data.data.length > 0) {
        const transformedData = transformPresensiData(data.data, startDate, endDate);
        console.log('✅ Transformed data:', transformedData.length, 'items');
        setAbsenData(transformedData);
      } else {
        console.log('⚠️ No presensi data, trying DETAIL_ABSEN_PEGAWAI endpoint');
        // Coba endpoint alternatif untuk detail absen pegawai
        await fetchAbsenDataAlternative(userId, startDate, endDate);
      }
    } catch (error) {
      console.error('❌ Error fetching absen data:', error);
      const today = new Date();
      const startDate = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
      const endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0];
      const emptyData = generateEmptyAbsenData(startDate, endDate);
      setAbsenData(emptyData);
    }
  };
  
  const transformPresensiData = (presensiData: any, startDateStr: string, endDateStr: string) => {
    console.log('🔄 Transforming presensi data:', presensiData.length, 'items');
    console.log('📋 Pegawai data for dinas check:', { id_user: pegawaiData?.id_user, id_pegawai: pegawaiData?.id_pegawai });
    
    const absenData = [];
    
    const presensiMap = new Map();
    presensiData.forEach((p: any) => {
      const dateKey = p.tanggal.includes('T') ? p.tanggal.split('T')[0] : p.tanggal;
      presensiMap.set(dateKey, p);
      console.log('📝 Presensi item:', { 
        dateKey, 
        status: p.status, 
        jam_masuk: p.jam_masuk, 
        jenis_presensi: p.jenis_presensi,
        dinas_id: p.dinas_id 
      });
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
        // Cek apakah ini presensi dinas berdasarkan:
        // 1. jenis_presensi = 'dinas' 
        // 2. dinas_id ada
        // 3. status sudah ada prefix 'Dinas-'
        const isDinas = presensi.jenis_presensi === 'dinas' || 
                       presensi.dinas_id || 
                       presensi.status.startsWith('Dinas-');
        
        let finalStatus = presensi.status;
        
        // Jika sudah ada prefix Dinas- di status, pertahankan
        if (presensi.status.startsWith('Dinas-')) {
          finalStatus = presensi.status;
          console.log('✅ Status already has Dinas prefix for', dateString, '- Status:', finalStatus);
        } else if (isDinas && !presensi.status.startsWith('Dinas-')) {
          // Tambahkan prefix Dinas- jika ini adalah presensi dinas
          finalStatus = `Dinas-${presensi.status}`;
          console.log('✅ Adding Dinas prefix for', dateString, '- Status:', finalStatus);
        }
        
        console.log('✅ Found presensi for', dateString, ':', { 
          originalStatus: presensi.status, 
          finalStatus, 
          isDinas, 
          jenis_presensi: presensi.jenis_presensi,
          dinas_id: presensi.dinas_id
        });
        
        absenData.push({
          tanggal: dateString,
          status: finalStatus,
          jam_masuk: presensi.jam_masuk,
          jam_keluar: presensi.jam_keluar,
          keterangan: presensi.keterangan || presensi.status,
          isDinas: isDinas
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
        
        // Cek apakah tanggal ini dalam rentang dinas aktif
        const isDinasDate = checkIfPegawaiInDinas(dateString, pegawaiData?.id_user || pegawaiData?.id_pegawai);
        if (isDinasDate && !status.startsWith('Dinas-')) {
          status = `Dinas-${status}`;
          console.log('📋 Adding Dinas prefix for date in dinas range:', dateString, '- Status:', status);
        }
        
        absenData.push({
          tanggal: dateString,
          status,
          jam_masuk: null,
          jam_keluar: null,
          keterangan,
          isDinas: isDinasDate
        });
      }
    }
    
    console.log('🎯 Final transformed data:', absenData.length, 'items');
    return absenData;
  };

  const checkIfPegawaiInDinas = (tanggal: string, pegawaiId: string | number) => {
    if (!pegawaiId || dinasAktif.length === 0) {
      console.log('🚫 No pegawaiId or no dinas aktif:', { pegawaiId, dinasCount: dinasAktif.length });
      return false;
    }
    
    const targetDate = new Date(tanggal);
    console.log('🔍 Checking dinas for pegawai:', pegawaiId, 'on date:', tanggal);
    
    const result = dinasAktif.some(dinas => {
      // Cek apakah tanggal dalam rentang dinas
      const startDate = new Date(dinas.tanggal_mulai);
      const endDate = new Date(dinas.tanggal_selesai);
      
      const isInDateRange = targetDate >= startDate && targetDate <= endDate;
      console.log('📅 Date range check:', {
        targetDate: tanggal,
        startDate: dinas.tanggal_mulai,
        endDate: dinas.tanggal_selesai,
        isInDateRange,
        dinasId: dinas.id
      });
      
      if (!isInDateRange) return false;
      
      // Cek apakah pegawai terdaftar dalam dinas ini
      // Berdasarkan data dinas aktif yang berhasil diambil
      if (dinas.pegawai && Array.isArray(dinas.pegawai)) {
        console.log('👥 Checking pegawai list:', dinas.pegawai.length, 'pegawai in dinas', dinas.id);
        
        // Cek berdasarkan nama pegawai (karena struktur data dari backend)
        const pegawaiName = pegawai.nama; // Gunakan nama dari state pegawai
        const isInDinas = dinas.pegawai.some((p: any) => {
          console.log('🔍 Comparing pegawai names:', {
            dinasP: p.nama,
            targetName: pegawaiName,
            matches: p.nama === pegawaiName
          });
          return p.nama === pegawaiName;
        });
        
        console.log('🎯 Pegawai in dinas result:', isInDinas);
        return isInDinas;
      }
      
      console.log('⚠️ No pegawai array in dinas');
      return false;
    });
    
    console.log('🎯 Final dinas check result for', pegawaiId, 'on', tanggal, ':', result);
    return result;
  };
  
  const fetchAbsenDataAlternative = async (userId: string, startDate: string, endDate: string) => {
    try {
      console.log('🔄 Trying alternative endpoint DETAIL_ABSEN_PEGAWAI');
      
      const response = await fetch(`${getApiUrl(API_CONFIG.ENDPOINTS.DETAIL_ABSEN_PEGAWAI)}?pegawai_id=${userId}&start_date=${startDate}&end_date=${endDate}`);
      const data = await response.json();
      
      console.log('📊 Alternative API Response:', {
        success: data.success,
        dataLength: data.data?.length || 0,
        url: `${getApiUrl(API_CONFIG.ENDPOINTS.DETAIL_ABSEN_PEGAWAI)}?pegawai_id=${userId}&start_date=${startDate}&end_date=${endDate}`
      });
      
      if (data.success && data.data && Array.isArray(data.data) && data.data.length > 0) {
        const transformedData = transformPresensiData(data.data, startDate, endDate);
        console.log('✅ Alternative transformed data:', transformedData.length, 'items');
        setAbsenData(transformedData);
      } else {
        console.log('⚠️ Alternative endpoint also returned no data, generating empty data');
        const emptyData = generateEmptyAbsenData(startDate, endDate);
        setAbsenData(emptyData);
      }
    } catch (error) {
      console.error('❌ Alternative endpoint error:', error);
      const emptyData = generateEmptyAbsenData(startDate, endDate);
      setAbsenData(emptyData);
    }
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
        keterangan,
        isDinas: false
      });
    }
    
    return absenData;
  };

  const showDetailForDate = (item: AbsenDetail) => {
    console.log('🔍 Showing detail for date:', item.tanggal, 'Status:', item.status);
    
    const liburInfo = hariLibur.find(h => h.tanggal === item.tanggal);
    
    // Jika status Libur, tampilkan modal libur sederhana
    if (item.status === 'Libur' || liburInfo) {
      const mockLiburData = {
        tanggal: item.tanggal,
        status: 'Libur',
        keterangan: liburInfo ? liburInfo.nama_libur : item.keterangan,
        isLibur: true
      };
      console.log('📅 Showing libur modal:', mockLiburData);
      setDetailAbsen(mockLiburData);
      openBottomSheet();
    } else if (item.jam_masuk) {
      // Untuk semua item yang ada jam_masuk, ambil detail dari API
      console.log('⏰ Has jam_masuk, fetching detail from API');
      fetchDetailAbsenHarian(item.tanggal, pegawai.user_id, item.status);
    } else {
      // Untuk yang belum absen atau tidak hadir
      console.log('❌ No jam_masuk, showing mock data');
      
      const today = new Date();
      const currentTime = new Date();
      const [year, month, day] = item.tanggal.split('-').map(Number);
      const itemDate = new Date(year, month - 1, day);
      itemDate.setHours(0, 0, 0, 0);
      today.setHours(0, 0, 0, 0);
      
      let detailStatus = item.status || 'Tidak Hadir';
      let detailKeterangan = item.keterangan || 'Tidak hadir';
      
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
      
      console.log('📋 Setting mock data:', mockTidakHadirData);
      setDetailAbsen(mockTidakHadirData);
      openBottomSheet();
    }
  };

  const openBottomSheet = () => {
    console.log('🚀 Opening bottom sheet');
    setShowDetailModal(true);
    Animated.spring(translateY, {
      toValue: 0,
      useNativeDriver: true,
      tension: 65,
      friction: 11
    }).start(() => {
      console.log('✅ Bottom sheet animation completed');
    });
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
          useNativeDriver: true
        }).start();
      }
    }
  });

  const fetchDetailAbsenHarian = async (tanggal: string, user_id: string, cardStatus?: string) => {
    try {
      console.log('🔍 Fetching detail absen for:', { tanggal, user_id, cardStatus });
      
      if (!user_id) {
        console.log('❌ User ID is empty, using mock data');
        const mockData = {
          tanggal: tanggal,
          status: cardStatus || 'Tidak Hadir',
          jam_masuk: '-',
          jam_pulang: '-',
          lokasi_masuk: '-',
          lokasi_pulang: '-',
          lintang_masuk: null,
          bujur_masuk: null,
          lintang_pulang: null,
          bujur_pulang: null,
          alasan_pulang_cepat: null,
          foto_masuk: null,
          foto_pulang: null,
          keterangan: 'Data tidak tersedia'
        };
        setDetailAbsen(mockData);
        openBottomSheet();
        return;
      }
      
      const url = `${getApiUrl(API_CONFIG.ENDPOINTS.DETAIL_ABSEN)}?date=${tanggal}&user_id=${user_id}`;
      console.log('🌐 API URL:', url);
      
      const response = await fetch(url);
      const data = await response.json();
      
      console.log('📊 Detail Absen Response:', {
        success: data.success,
        hasData: !!data.data,
        status: data.data?.status,
        jam_masuk: data.data?.jam_masuk,
        foto_masuk: data.data?.foto_masuk,
        coordinates: {
          lat_masuk: data.data?.lat_masuk,
          long_masuk: data.data?.long_masuk,
          lintang_masuk: data.data?.lintang_masuk,
          bujur_masuk: data.data?.bujur_masuk
        },
        rawData: data.data
      });
      
      // Tambahan: Cek apakah ada data presensi lain dengan koordinat/foto
      console.log('🔍 Checking if there are other presensi records with coordinates/photos for user:', user_id);
      
      if (data.success && data.data) {
        // Format foto path - coba beberapa kemungkinan path
        const formatFotoPath = (fotoName: string) => {
          if (!fotoName) return null;
          // Coba beberapa format path yang mungkin
          const possiblePaths = [
            `${API_CONFIG.BASE_URL}/uploads/presensi/${fotoName}`,
            `${API_CONFIG.BASE_URL}/uploads/dinas/${fotoName}`,
            `${API_CONFIG.BASE_URL}/uploads/${fotoName}`,
            `${API_CONFIG.BASE_URL}${fotoName}`
          ];
          return possiblePaths[0]; // Gunakan yang pertama sebagai default
        };
        
        const fixedData = {
          ...data.data,
          foto_masuk: formatFotoPath(data.data.foto_masuk),
          foto_pulang: formatFotoPath(data.data.foto_pulang),
          // Normalisasi koordinat - backend bisa pakai lat/long atau lintang/bujur
          lintang_masuk: data.data.lintang_masuk || data.data.lat_masuk,
          bujur_masuk: data.data.bujur_masuk || data.data.long_masuk,
          lintang_pulang: data.data.lintang_pulang || data.data.lat_pulang,
          bujur_pulang: data.data.bujur_pulang || data.data.long_pulang
        };
        
        // Gunakan status dari card jika ada
        if (cardStatus) {
          fixedData.status = cardStatus;
        }
        
        // Jika data dari API tidak lengkap (terutama untuk dinas), gunakan data presensi
        const presensiItem = absenData.find(item => item.tanggal === tanggal);
        if (presensiItem) {
          // Update jam masuk/pulang jika kosong dari API
          if (!fixedData.jam_masuk || fixedData.jam_masuk === null) {
            fixedData.jam_masuk = presensiItem.jam_masuk;
            console.log('🔄 Using presensi jam_masuk:', presensiItem.jam_masuk);
          }
          if (!fixedData.jam_pulang || fixedData.jam_pulang === null) {
            fixedData.jam_pulang = presensiItem.jam_keluar;
            console.log('🔄 Using presensi jam_pulang:', presensiItem.jam_keluar);
          }
          
          // Update lokasi jika kosong atau '-'
          if ((!fixedData.lokasi_masuk || fixedData.lokasi_masuk === '-') && presensiItem.keterangan) {
            // Extract lokasi dari keterangan jika ada format "Kegiatan - Lokasi"
            if (presensiItem.keterangan.includes(' - ')) {
              const lokasi = presensiItem.keterangan.split(' - ')[1]?.trim();
              if (lokasi) {
                fixedData.lokasi_masuk = lokasi;
                fixedData.lokasi_pulang = lokasi; // Sama untuk pulang
                console.log('🔄 Using presensi lokasi:', lokasi);
              }
            }
          }
        }
        
        console.log('✅ Setting detail absen data:', fixedData);
        setDetailAbsen(fixedData);
        openBottomSheet();
      } else {
        console.log('⚠️ API returned no data, using fallback with presensi data');
        
        // Cari data dari presensi yang sudah di-transform
        const presensiItem = absenData.find(item => item.tanggal === tanggal);
        console.log('🔍 Found presensi item:', presensiItem);
        
        // Untuk dinas, coba ambil lokasi dari keterangan
        let lokasi_masuk = '-';
        let lokasi_pulang = '-';
        if (presensiItem?.keterangan && presensiItem.keterangan.includes(' - ')) {
          const lokasi = presensiItem.keterangan.split(' - ')[1]?.trim();
          if (lokasi) {
            lokasi_masuk = lokasi;
            lokasi_pulang = lokasi;
          }
        }
        
        const fallbackData = {
          tanggal: tanggal,
          status: cardStatus || 'Tidak Hadir',
          jam_masuk: presensiItem?.jam_masuk || '-',
          jam_pulang: presensiItem?.jam_keluar || '-',
          lokasi_masuk: lokasi_masuk,
          lokasi_pulang: lokasi_pulang,
          lintang_masuk: null,
          bujur_masuk: null,
          lintang_pulang: null,
          bujur_pulang: null,
          alasan_pulang_cepat: null,
          foto_masuk: null,
          foto_pulang: null,
          keterangan: presensiItem?.keterangan || 'Tidak ada data detail absensi'
        };
        
        console.log('📋 Setting fallback data:', fallbackData);
        setDetailAbsen(fallbackData);
        openBottomSheet();
      }
    } catch (error) {
      console.error('❌ Fetch detail absen error:', error);
      
      // Cari data dari presensi yang sudah di-transform
      const presensiItem = absenData.find(item => item.tanggal === tanggal);
      console.log('🔍 Error fallback - Found presensi item:', presensiItem);
      
      // Untuk dinas, coba ambil lokasi dari keterangan
      let lokasi_masuk = '-';
      let lokasi_pulang = '-';
      if (presensiItem?.keterangan && presensiItem.keterangan.includes(' - ')) {
        const lokasi = presensiItem.keterangan.split(' - ')[1]?.trim();
        if (lokasi) {
          lokasi_masuk = lokasi;
          lokasi_pulang = lokasi;
        }
      }
      
      const errorData = {
        tanggal: tanggal,
        status: cardStatus || 'Error',
        jam_masuk: presensiItem?.jam_masuk || '-',
        jam_pulang: presensiItem?.jam_keluar || '-',
        lokasi_masuk: lokasi_masuk,
        lokasi_pulang: lokasi_pulang,
        lintang_masuk: null,
        bujur_masuk: null,
        lintang_pulang: null,
        bujur_pulang: null,
        alasan_pulang_cepat: null,
        foto_masuk: null,
        foto_pulang: null,
        keterangan: presensiItem?.keterangan || 'Error memuat data'
      };
      
      console.log('📋 Setting error data:', errorData);
      setDetailAbsen(errorData);
      openBottomSheet();
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
    const [year, month, day] = item.tanggal.split('-').map(Number);
    const itemDate = new Date(year, month - 1, day);
    const isFutureDate = itemDate > today;
    const isLibur = item.status === 'Libur';
    const isDisabled = isFutureDate; // Hanya disable untuk tanggal masa depan
    
    console.log('📅 Render item:', {
      tanggal: item.tanggal,
      status: item.status,
      isFutureDate,
      isLibur,
      isDisabled,
      hasJamMasuk: !!item.jam_masuk
    });
    
    let displayStatus = item.status;
    let displayKeterangan = item.keterangan;
    
    if (liburInfo) {
      displayStatus = 'Libur';
      displayKeterangan = liburInfo.nama_libur;
    }
    
    // Normalize status untuk memastikan case yang benar
    if (displayStatus.toLowerCase() === 'terlambat') {
      displayStatus = 'Terlambat';
    } else if (displayStatus.toLowerCase() === 'hadir') {
      displayStatus = 'Hadir';
    } else if (displayStatus.toLowerCase() === 'tidak hadir') {
      displayStatus = 'Tidak Hadir';
    }
    
    // Deteksi prefix "Dinas-" dan ambil konfigurasi warna yang sesuai
    let config = statusConfig[displayStatus.trim() as keyof typeof statusConfig];
    if (!config) {
      // Jika tidak ada config langsung, coba deteksi prefix dinas
      const isDinas = displayStatus.startsWith('Dinas-');
      if (isDinas) {
        const baseStatus = displayStatus.replace('Dinas-', '');
        const dinasColors = {
          'Hadir': { color: '#4A90E2', icon: 'checkmark-circle' },
          'Terlambat': { color: '#7B68EE', icon: 'time' },
          'Tidak Hadir': { color: '#6A5ACD', icon: 'close-circle' },
          'Belum Absen': { color: '#9370DB', icon: 'alert-circle' }
        };
        config = dinasColors[baseStatus as keyof typeof dinasColors] || statusConfig['Tidak Hadir'];
      } else {
        config = statusConfig['Tidak Hadir'];
      }
    }
    
    return (
      <TouchableOpacity 
        style={[styles.absenItem, isDisabled && styles.absenItemDisabled]} 
        onPress={() => {
          console.log('💆 Item pressed:', { tanggal: item.tanggal, status: item.status, isDisabled });
          if (!isDisabled) {
            showDetailForDate(item);
          } else {
            console.log('⚠️ Item is disabled, not showing detail');
          }
        }}
        activeOpacity={isDisabled ? 1 : 0.7}
        disabled={isDisabled}
      >
        <View style={[styles.leftBorder, { backgroundColor: config.color }]} />
        
        <View style={styles.dateSection}>
          <Text style={styles.dayText}>{dateInfo.day}</Text>
          <Text style={styles.dateText}>{dateInfo.date}</Text>
          <Text style={styles.monthTextSmall}>{dateInfo.month}</Text>
        </View>
        
        <View style={styles.contentSection}>
          <View style={styles.statusRow}>
            <Text style={styles.dayFull}>{dateInfo.day}</Text>
            <Text style={[styles.statusBadgeText, { color: config.color }]}>
              {displayStatus}
            </Text>
          </View>
          
          <Text style={styles.locationText}>
            {displayKeterangan || '-'}
          </Text>
          
          {item.jam_masuk && (
            <Text style={styles.timeText}>
              {item.jam_masuk} - {item.jam_keluar || '...'}
            </Text>
          )}
        </View>
      </TouchableOpacity>
    );
  };



  const renderDetailModal = () => {
    console.log('🔍 Rendering detail modal:', {
      showDetailModal,
      hasDetailAbsen: !!detailAbsen,
      detailAbsenStatus: detailAbsen?.status
    });
    
    if (!detailAbsen) {
      console.log('❌ No detailAbsen data, not rendering modal');
      return null;
    }
    
    const formatDetailDate = (dateString: string) => {
      // Handle ISO format dari backend
      let date;
      if (dateString.includes('T')) {
        // Format ISO: 2026-03-05T17:00:00.000Z
        date = new Date(dateString);
      } else {
        // Format YYYY-MM-DD
        const [year, month, day] = dateString.split('-').map(Number);
        date = new Date(year, month - 1, day);
      }
      
      const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
      const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
      
      return `${days[date.getDay()]}, ${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
    };

    const calculateWorkDuration = (jamMasuk: string, jamPulang: string) => {
      if (!jamMasuk || !jamPulang || jamMasuk === '-' || jamPulang === '-') return '-';
      
      try {
        const masuk = new Date(`2000-01-01 ${jamMasuk}`);
        const pulang = new Date(`2000-01-01 ${jamPulang}`);
        
        if (isNaN(masuk.getTime()) || isNaN(pulang.getTime())) return '-';
        
        const diff = pulang.getTime() - masuk.getTime();
        if (diff <= 0) return '-';
        
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        return `${hours} jam ${minutes} menit`;
      } catch (error) {
        return '-';
      }
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
                <Text style={[
                  styles.detailStatusText, 
                  { color: getStatusColor(detailAbsen.status) }
                ]}>
                  {detailAbsen.status}
                </Text>
              </View>
              
              {(detailAbsen.isLibur && !detailAbsen.status.startsWith('Dinas-')) ? (
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

                  {detailAbsen.jam_masuk && detailAbsen.jam_masuk !== '-' && (
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
                      <Text style={styles.confirmValue}>
                        {detailAbsen.lokasi_masuk && detailAbsen.lokasi_masuk !== '-' ? 
                          detailAbsen.lokasi_masuk : 
                          (detailAbsen.keterangan && detailAbsen.keterangan.includes('-') ? 
                            detailAbsen.keterangan.split('-')[1]?.trim() || '-' : '-')}
                      </Text>
                    </View>
                    <View style={styles.confirmItemHalf}>
                      <Text style={styles.confirmLabel}>Lokasi Pulang</Text>
                      <Text style={styles.confirmValue}>
                        {detailAbsen.lokasi_pulang && detailAbsen.lokasi_pulang !== '-' ? 
                          detailAbsen.lokasi_pulang : 
                          (detailAbsen.keterangan && detailAbsen.keterangan.includes('-') ? 
                            detailAbsen.keterangan.split('-')[1]?.trim() || '-' : '-')}
                      </Text>
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
                        {(() => {
                          console.log('🔍 Debug koordinat masuk:', {
                            lintang_masuk: detailAbsen.lintang_masuk,
                            bujur_masuk: detailAbsen.bujur_masuk,
                            lat_masuk: detailAbsen.lat_masuk,
                            long_masuk: detailAbsen.long_masuk
                          });
                          // Untuk dinas, koordinat 0 mungkin valid, jadi cek apakah ada nilai
                          const hasCoordinates = (detailAbsen.lintang_masuk !== null && detailAbsen.bujur_masuk !== null) || 
                                                (detailAbsen.lat_masuk !== null && detailAbsen.long_masuk !== null);
                          
                          if (hasCoordinates) {
                            const lat = detailAbsen.lintang_masuk || detailAbsen.lat_masuk;
                            const lng = detailAbsen.bujur_masuk || detailAbsen.long_masuk;
                            return `${parseFloat(lat).toFixed(6)}, ${parseFloat(lng).toFixed(6)}`;
                          }
                          return 'Tidak tersedia';
                        })()}
                      </Text>
                    </View>
                    <View style={styles.confirmItemHalf}>
                      <Text style={styles.confirmLabel}>Koordinat Pulang</Text>
                      <Text style={[styles.confirmValue, styles.smallText]}>
                        {(() => {
                          const hasCoordinates = (detailAbsen.lintang_pulang !== null && detailAbsen.bujur_pulang !== null) || 
                                                (detailAbsen.lat_pulang !== null && detailAbsen.long_pulang !== null);
                          
                          if (hasCoordinates) {
                            const lat = detailAbsen.lintang_pulang || detailAbsen.lat_pulang;
                            const lng = detailAbsen.bujur_pulang || detailAbsen.long_pulang;
                            return `${parseFloat(lat).toFixed(6)}, ${parseFloat(lng).toFixed(6)}`;
                          }
                          return 'Tidak tersedia';
                        })()}
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

                      {detailAbsen.keterangan && (
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
                        {(() => {
                          console.log('🔍 Debug foto masuk:', {
                            foto_masuk: detailAbsen.foto_masuk,
                            foto_masuk_exists: !!detailAbsen.foto_masuk
                          });
                          return detailAbsen.foto_masuk;
                        })() ? (
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
      <View style={styles.containerLoading}>
        <StatusBar style="light" translucent={true} backgroundColor="transparent" />
        
        <AppHeader 
          title="Detail Absensi"
          showBack={true}
          fallbackRoute="/laporan/laporan-detail-absen"
        />
        
        {/* ========================================
             SKELETON LOADING STATE - DETAIL ABSEN PEGAWAI
        ======================================== */}
        <ScrollView 
          showsVerticalScrollIndicator={false} 
          contentContainerStyle={styles.scrollContent}
          bounces={false}
          overScrollMode="never"
        >
          {/* Skeleton Premium Header */}
          <View style={styles.skeletonHeader}>
            <View style={styles.headerTopRow}>
              <View style={styles.titleWrapper}>
                <View style={styles.skeletonTitle} />
                <View style={styles.nipContainer}>
                  <View style={styles.skeletonNipIcon} />
                  <View style={styles.skeletonNipText} />
                </View>
              </View>
              <View style={styles.skeletonAvatarHeader} />
            </View>
            <View style={styles.skeletonPeriodHeader} />
          </View>

          {/* Skeleton Absen List */}
          <View style={styles.listContainer}>
            {[1, 2, 3, 4, 5].map((item) => (
              <View key={item} style={styles.absenItem}>
                <View style={styles.skeletonLeftBorder} />
                <View style={styles.dateSection}>
                  <View style={styles.skeletonDayText} />
                  <View style={styles.skeletonDateText} />
                  <View style={styles.skeletonMonthText} />
                </View>
                <View style={styles.contentSection}>
                  <View style={styles.skeletonStatusRow} />
                  <View style={styles.skeletonKeterangan} />
                  <View style={styles.skeletonTimeInfo} />
                </View>
                <View style={styles.skeletonChevron} />
              </View>
            ))}
          </View>
        </ScrollView>
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
        rightIcon="download-outline"
        onRightPress={handleExportPegawai}
      />

      <ScrollView 
        showsVerticalScrollIndicator={false} 
        contentContainerStyle={styles.scrollContent}
        bounces={false}
        overScrollMode="never"
      >
        {/* ============================================================
            PREMIUM HEADER SECTION - PEGAWAI INFO
           ============================================================ */}
        <View style={styles.premiumHeader}>
          <View style={styles.headerTopRow}>
            <View style={styles.titleWrapper}>
              <Text style={styles.pegawaiTitle} numberOfLines={2}>{pegawai.nama}</Text>
              <View style={styles.nipContainer}>
                <Ionicons name="card-outline" size={14} color="#B2DFDB" />
                <Text style={styles.nipText}>NIP: {pegawai.nip || 'Belum diisi'}</Text>
              </View>
            </View>
            {pegawaiData?.foto_profil ? (
              <Image 
                source={{ uri: `${API_CONFIG.BASE_URL}${pegawaiData.foto_profil.replace('/uploads/pegawai/uploads/pegawai/', '/uploads/pegawai/')}` }} 
                style={styles.avatarImageHeader}
              />
            ) : (
              <View style={styles.avatarContainerHeader}>
                <Text style={styles.avatarTextHeader}>{pegawai.nama.charAt(0).toUpperCase()}</Text>
              </View>
            )}
          </View>
          
          {/* Periode Info dalam Header */}
          <View style={styles.periodContainerHeader}>
            <Ionicons name="calendar-outline" size={16} color="#B2DFDB" />
            <Text style={styles.periodTextHeader}>{periodInfo}</Text>
          </View>
        </View>

        {/* Absen List */}
        <View style={styles.listContainer}>
          {absenData.length > 0 ? (
            absenData.map((item, index) => {
              console.log('📋 Rendering absen item:', index, item.tanggal, item.status);
              return (
                <View key={`${item.tanggal}-${index}`}>
                  {renderAbsenItem({ item })}
                </View>
              );
            })
          ) : (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>Tidak ada data absensi</Text>
            </View>
          )}
        </View>
      </ScrollView>
      {renderDetailModal()}
      
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

      {/* Modal Export Format */}
      <Modal
        visible={showExportModal}
        transparent={true}
        animationType="none"
        statusBarTranslucent
        onRequestClose={closeExportModal}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={closeExportModal} />
          <Animated.View style={[styles.bottomSheet, { transform: [{ translateY: exportTranslateY }] }]}>
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
  container: { flex: 1, backgroundColor: '#004643' },
  containerLoading: { flex: 1, backgroundColor: '#004643' },
  scrollContent: { paddingBottom: 40, backgroundColor: '#F4F7F7', flexGrow: 1 },
  
  // ==========================================
  // PREMIUM HEADER STYLE
  // ==========================================
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
  skeletonHeader: {
    backgroundColor: '#004643',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 30,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    marginBottom: 15,
  },
  headerTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  titleWrapper: { flex: 1, marginRight: 15 },
  pegawaiTitle: { fontSize: 22, fontWeight: '800', color: '#FFF', letterSpacing: -0.5, lineHeight: 28 },
  nipContainer: { flexDirection: 'row', alignItems: 'center', marginTop: 10 },
  nipText: { fontSize: 13, color: '#B2DFDB', fontWeight: '500', marginLeft: 6 },
  
  avatarContainerHeader: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  avatarTextHeader: {
    color: '#FFF',
    fontWeight: '800',
    fontSize: 24,
  },
  avatarImageHeader: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  
  periodContainerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 15,
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  periodTextHeader: {
    fontSize: 14,
    color: '#B2DFDB',
    fontWeight: '600',
    marginLeft: 8,
  },
  
  listContainer: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  absenItem: {
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
  absenItemDisabled: {
    backgroundColor: '#fff',
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
    backgroundColor: '#FAFAFA',
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
  monthTextSmall: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  statusSection: {
    flex: 1,
    padding: 12,
    justifyContent: 'center',
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
  detailStatusText: {
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'right',
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

  /* ========================================
     SKELETON STYLES - DETAIL ABSEN PEGAWAI
  ======================================== */
  // Skeleton untuk Left Border
  skeletonLeftBorder: {
    width: 4,
    height: '100%',
    backgroundColor: '#E0E0E0',
  },
  // Skeleton untuk Premium Header
  skeletonTitle: {
    width: '80%',
    height: 22,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 4,
    marginBottom: 10,
  },
  skeletonNipIcon: {
    width: 14,
    height: 14,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 2,
  },
  skeletonNipText: {
    width: '60%',
    height: 13,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 4,
    marginLeft: 6,
  },
  skeletonAvatarHeader: {
    width: 56,
    height: 56,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 28,
  },
  skeletonPeriodHeader: {
    width: '50%',
    height: 32,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    marginTop: 15,
  },
  // Skeleton untuk Absen Item
  skeletonDayText: {
    width: 40,
    height: 12,
    backgroundColor: '#F0F0F0',
    borderRadius: 4,
    marginBottom: 4,
  },
  skeletonDateText: {
    width: 30,
    height: 20,
    backgroundColor: '#E0E0E0',
    borderRadius: 4,
    marginBottom: 4,
  },
  skeletonMonthText: {
    width: 35,
    height: 12,
    backgroundColor: '#F0F0F0',
    borderRadius: 4,
  },
  skeletonStatusRow: {
    width: '100%',
    height: 14,
    backgroundColor: '#E0E0E0',
    borderRadius: 4,
    marginBottom: 6,
  },
  skeletonKeterangan: {
    width: '90%',
    height: 12,
    backgroundColor: '#F0F0F0',
    borderRadius: 4,
    marginBottom: 6,
  },
  skeletonTimeInfo: {
    width: '70%',
    height: 11,
    backgroundColor: '#F0F0F0',
    borderRadius: 4,
  },
  skeletonChevron: {
    width: 18,
    height: 18,
    backgroundColor: '#F1F5F9',
    borderRadius: 4,
  },
  
  // Bottom Sheet Styles (sama seperti laporan-detail-absen.tsx)
  bottomSheetHeader: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  bottomSheetTitle: { 
    fontSize: 18, 
    fontWeight: '600', 
    color: '#333' 
  },
  bottomSheetContent: { 
    maxHeight: 400 
  },
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
  
  // Empty state styles
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
});