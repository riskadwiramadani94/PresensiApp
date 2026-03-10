import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, Modal, Image, Dimensions, Animated, PanResponder } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import { AppHeader, CustomAlert } from '../../../components';
import { useCustomAlert } from '../../../hooks/useCustomAlert';
import { getApiUrl } from '../../../constants/config';

const { width, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface DateItem {
  date: Date;
  day: number;
  month: string;
  fullDate: string;
  dayName: string;
}

export default function DetailLemburScreen() {
  const alert = useCustomAlert();
  const router = useRouter();
  const params = useLocalSearchParams();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lembur, setLembur] = useState<any>(null);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [absenData, setAbsenData] = useState<any>(null);
  const [userLocation, setUserLocation] = useState<any>(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [photoUri, setPhotoUri] = useState('');
  const [selectedAbsen, setSelectedAbsen] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [detailAbsenData, setDetailAbsenData] = useState<any>(null);

  // Update waktu setiap 30 detik untuk realtime
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 30000); // 30 detik

    return () => clearInterval(interval);
  }, []);
  const [userId, setUserId] = useState<string>('');
  
  const calendarRef = useRef<ScrollView>(null);
  const photoTranslateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;

  useEffect(() => {
    if (params.id) {
      loadUserId();
      getCurrentLocation();
    }
  }, [params.id]);

  useEffect(() => {
    if (userId) {
      fetchDetailLembur();
    }
  }, [userId]);

  useEffect(() => {
    if (lembur && selectedDate) {
      fetchAbsenData();
    }
  }, [selectedDate, lembur]);

  const loadUserId = async () => {
    try {
      const userData = await AsyncStorage.getItem('userData');
      if (userData) {
        const user = JSON.parse(userData);
        setUserId(user.id_user || user.id);
      }
    } catch (error) {
      console.error('Error loading user ID:', error);
    }
  };

  const getCurrentLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      setUserLocation(location.coords);
    } catch (error) {
      console.error('Error getting location:', error);
    }
  };

  const getTodayDateString = () => {
    const now = new Date();
    const jakartaTime = new Date(now.toLocaleString("sv-SE", {timeZone: "Asia/Jakarta"}));
    return jakartaTime.toISOString().split('T')[0];
  };

  const fetchDetailLembur = async () => {
    try {
      setLoading(true);
      console.log('Fetching detail lembur for ID:', params.id, 'User:', userId);
      
      // Coba beberapa endpoint yang mungkin ada
      let response, result;
      
      // Endpoint 1: detail dengan ID pengajuan
      try {
        response = await fetch(getApiUrl(`/pegawai/lembur/api/detail?id_pengajuan=${params.id}&user_id=${userId}`));
        result = await response.json();
        console.log('Endpoint detail (id_pengajuan):', result);
        
      if (result.success && result.data) {
        setLembur(result.data);
        setSelectedDate(getTodayDateString());
        console.log('Detail found, setting selected date to:', getTodayDateString());
      }
      } catch (e) {
        console.log('Endpoint detail (id_pengajuan) failed:', e);
      }
      
      // Endpoint 2: cari dari riwayat berdasarkan ID
      try {
        response = await fetch(getApiUrl(`/pegawai/lembur/api/riwayat?user_id=${userId}`));
        result = await response.json();
        console.log('Searching in riwayat for ID:', params.id);
        
        if (result.success && result.data) {
          const foundItem = result.data.find((item: any) => 
            item.id_pengajuan == params.id || 
            item.id == params.id || 
            item.id_absen_lembur == params.id
          );
          
          if (foundItem) {
            setLembur(foundItem);
            setSelectedDate(getTodayDateString());
            console.log('Detail found from riwayat:', foundItem);
            return;
          }
        }
      } catch (e) {
        console.log('Riwayat search failed:', e);
      }
      
      // Endpoint 3: cari dari pengajuan hari ini
      try {
        response = await fetch(getApiUrl(`/pegawai/lembur/api/pengajuan-hari-ini?user_id=${userId}`));
        result = await response.json();
        console.log('Searching in pengajuan-hari-ini for ID:', params.id);
        
        if (result.success && result.data) {
          const foundItem = result.data.find((item: any) => 
            item.id_pengajuan == params.id || 
            item.id == params.id
          );
          
          if (foundItem) {
            setLembur(foundItem);
            setSelectedDate(getTodayDateString());
            console.log('Detail found from pengajuan-hari-ini:', foundItem);
            return;
          }
        }
      } catch (e) {
        console.log('Pengajuan-hari-ini search failed:', e);
      }
      
      console.log('No lembur detail found for ID:', params.id);
      alert.showAlert({ type: 'error', message: 'Data lembur tidak ditemukan' });
      
    } catch (error) {
      console.error('Error fetching detail:', error);
      alert.showAlert({ type: 'error', message: 'Gagal memuat detail lembur' });
    } finally {
      setLoading(false);
    }
  };

  const fetchAbsenData = async () => {
    try {
      const response = await fetch(getApiUrl(`/pegawai/lembur/api/absen-tanggal?id=${params.id}&user_id=${userId}&tanggal=${selectedDate}`));
      const result = await response.json();
      
      if (result.success) {
        setAbsenData(result.data);
      }
    } catch (error) {
      console.error('Error fetching absen data:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await getCurrentLocation();
    await fetchDetailLembur();
    setRefreshing(false);
  };

  const generateDates = (startDate: string, endDate: string): DateItem[] => {
    const dates: DateItem[] = [];
    const start = new Date(startDate);
    const end = new Date(endDate);
    while (start <= end) {
      dates.push({
        date: new Date(start),
        day: start.getDate(),
        month: start.toLocaleDateString('id-ID', { month: 'short' }),
        fullDate: start.getFullYear() + '-' + String(start.getMonth() + 1).padStart(2, '0') + '-' + String(start.getDate()).padStart(2, '0'),
        dayName: start.toLocaleDateString('id-ID', { weekday: 'short' })
      });
      start.setDate(start.getDate() + 1);
    }
    return dates;
  };

  const handleDateClick = (date: string) => {
    setSelectedDate(date);
  };

  const getStatusInfo = () => {
    if (!lembur) return { label: '', color: '', icon: '' };
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const mulai = new Date(lembur.tanggal_mulai);
    const selesai = new Date(lembur.tanggal_selesai);
    mulai.setHours(0, 0, 0, 0);
    selesai.setHours(23, 59, 59, 999);

    if (today >= mulai && today <= selesai) {
      return { label: 'Berlangsung', color: '#4CAF50', icon: 'radio-button-on' };
    } else if (mulai > today) {
      return { label: 'Akan Datang', color: '#FF9800', icon: 'time' };
    } else {
      return { label: 'Selesai', color: '#2196F3', icon: 'checkmark-circle' };
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371e3;
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const checkSchedule = (jamMulai: string, jamSelesai: string) => {
    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();
    
    const [startHour, startMin] = jamMulai.split(':').map(Number);
    const [endHour, endMin] = jamSelesai.split(':').map(Number);
    
    const startTime = startHour * 60 + startMin;
    const endTime = endHour * 60 + endMin;
    
    return currentTime >= startTime && currentTime <= endTime;
  };

  const openCamera = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        alert.showAlert({ type: 'error', message: 'Izin kamera diperlukan' });
        return;
      }
      
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 0.6,
      });
      
      if (!result.canceled) {
        setPhotoUri(result.assets[0].uri);
        setShowPreviewModal(true);
        
        Animated.spring(photoTranslateY, {
          toValue: 0,
          useNativeDriver: true,
          tension: 65,
          friction: 11
        }).start();
      }
    } catch (error) {
      console.error('Error opening camera:', error);
      alert.showAlert({ type: 'error', message: 'Gagal membuka kamera' });
    }
  };

  const closePhotoModal = () => {
    Animated.timing(photoTranslateY, {
      toValue: SCREEN_HEIGHT,
      duration: 250,
      useNativeDriver: true
    }).start(() => {
      setShowPreviewModal(false);
      setPhotoUri('');
    });
  };

  const handleRetake = () => {
    closePhotoModal();
    setTimeout(() => openCamera(), 300);
  };

  const handleSubmit = async () => {
    if (!selectedAbsen || !photoUri || !userLocation) return;
    
    setIsProcessing(true);
    closePhotoModal();
    
    try {
      const formData = new FormData();
      
      if (selectedAbsen.jenis === 'masuk') {
        formData.append('id_pengajuan', params.id.toString());
        formData.append('user_id', userId);
        formData.append('tanggal', selectedDate);
      } else {
        formData.append('id_absen_lembur', selectedAbsen.id_absen_lembur.toString());
      }
      
      formData.append('latitude', userLocation.latitude.toString());
      formData.append('longitude', userLocation.longitude.toString());
      
      const filename = photoUri.split('/').pop();
      const match = /\.(\\w+)$/.exec(filename || '');
      const fileType = match ? `image/${match[1]}` : 'image/jpeg';
      
      formData.append('foto', {
        uri: photoUri,
        name: filename || `lembur_${selectedAbsen.jenis}_${Date.now()}.jpg`,
        type: fileType,
      } as any);
      
      const endpoint = selectedAbsen.jenis === 'masuk' 
        ? '/pegawai/lembur/api/absen-masuk'
        : '/pegawai/lembur/api/absen-pulang';
      
      const response = await fetch(getApiUrl(endpoint), {
        method: 'POST',
        body: formData,
      });
      
      const result = await response.json();
      
      if (result.success) {
        alert.showAlert({ type: 'success', message: result.message });
        await fetchAbsenData();
      } else {
        alert.showAlert({ type: 'error', message: result.message });
      }
    } catch (error) {
      console.error('Error submitting:', error);
      alert.showAlert({ type: 'error', message: 'Terjadi kesalahan saat mengirim data' });
    } finally {
      setIsProcessing(false);
      setSelectedAbsen(null);
    }
  };

  const canAbsenMasuk = () => {
    if (!lembur || selectedDate !== getTodayDateString()) return false;
    return checkSchedule(lembur.jam_mulai, lembur.jam_selesai);
  };

  const canAbsenPulang = () => {
    if (!lembur || selectedDate !== getTodayDateString()) return false;
    return checkSchedule(lembur.jam_mulai, lembur.jam_selesai);
  };

  const getAbsenInfo = (jenis: 'masuk' | 'pulang') => {
    if (!lembur) return { canAbsen: false, message: '' };
    
    const now = new Date();
    const currentTime = now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0');
    const today = getTodayDateString();
    const selectedDateObj = new Date(selectedDate);
    const todayObj = new Date(today);
    
    // Jika tanggal yang dipilih adalah masa depan
    if (selectedDateObj > todayObj) {
      return { canAbsen: false, message: `Absen akan tersedia pada ${formatDate(selectedDate)} pukul ${lembur.jam_mulai}` };
    }
    
    // Jika tanggal yang dipilih adalah masa lalu
    if (selectedDateObj < todayObj) {
      if (jenis === 'masuk') {
        return { canAbsen: false, message: absenData?.jam_masuk ? `Sudah absen masuk pada ${absenData.jam_masuk}` : 'Waktu absen sudah terlewat' };
      } else {
        return { canAbsen: false, message: absenData?.jam_pulang ? `Sudah absen pulang pada ${absenData.jam_pulang}` : 'Waktu absen sudah terlewat' };
      }
    }
    
    // Jika hari ini
    if (jenis === 'masuk') {
      if (absenData?.jam_masuk) {
        return { canAbsen: false, message: `Sudah absen masuk pada ${absenData.jam_masuk}` };
      }
      
      if (!canAbsenMasuk()) {
        return { 
          canAbsen: false, 
          message: `Tidak dapat melakukan absen pada pukul ${currentTime}. Waktu absen: ${lembur.jam_mulai} - ${lembur.jam_selesai}` 
        };
      }
      
      return { canAbsen: true, message: 'Silahkan lakukan absen masuk sekarang' };
    } else {
      if (!absenData?.jam_masuk) {
        return { canAbsen: false, message: 'Harus absen masuk terlebih dahulu' };
      }
      
      if (absenData?.jam_pulang) {
        return { canAbsen: false, message: `Sudah absen pulang pada ${absenData.jam_pulang}` };
      }
      
      if (!canAbsenPulang()) {
        return { 
          canAbsen: false, 
          message: `Tidak dapat melakukan absen pada pukul ${currentTime}. Waktu absen: ${lembur.jam_mulai} - ${lembur.jam_selesai}` 
        };
      }
      
      return { canAbsen: true, message: 'Silahkan lakukan absen pulang sekarang' };
    }
  };

  const calculateTotalJam = () => {
    if (!lembur) return '0.00';
    
    // Jika sudah absen pulang, tampilkan total jam dari database
    if (absenData?.total_jam && absenData?.jam_pulang) {
      return parseFloat(absenData.total_jam).toFixed(2);
    }
    
    // Jika sudah absen masuk tapi belum pulang, hitung realtime
    if (absenData?.jam_masuk && !absenData?.jam_pulang) {
      const jamMasukAbsen = absenData.jam_masuk;
      const [masukHour, masukMin] = jamMasukAbsen.split(':').map(Number);
      
      const now = currentTime;
      const currentHour = now.getHours();
      const currentMin = now.getMinutes();
      
      const masukMinutes = masukHour * 60 + masukMin;
      const currentMinutes = currentHour * 60 + currentMin;
      
      let diffMinutes = currentMinutes - masukMinutes;
      
      // Jika melewati tengah malam
      if (diffMinutes < 0) {
        diffMinutes += 24 * 60;
      }
      
      const totalHours = diffMinutes / 60;
      return totalHours.toFixed(2);
    }
    
    // Jika belum absen masuk, return 0
    return '0.00';
  };

  const handleAbsen = (jenis: 'masuk' | 'pulang') => {
    if (!lembur || !userLocation) return;

    // Validasi waktu
    if (jenis === 'masuk' && !canAbsenMasuk()) {
      alert.showAlert({ type: 'warning', message: 'Belum waktunya absen masuk lembur' });
      return;
    }
    
    if (jenis === 'pulang' && !canAbsenPulang()) {
      alert.showAlert({ type: 'warning', message: 'Belum waktunya absen pulang lembur' });
      return;
    }

    // Validasi lokasi
    if (lembur.lokasi && lembur.lokasi.length > 0) {
      const lokasi = lembur.lokasi[0];
      const distance = calculateDistance(
        userLocation.latitude,
        userLocation.longitude,
        lokasi.latitude,
        lokasi.longitude
      );
      
      if (distance > lokasi.radius) {
        alert.showAlert({ type: 'warning', message: `Anda berada ${Math.round(distance)}m dari lokasi (radius: ${lokasi.radius}m)` });
        return;
      }
    }
    
    setSelectedAbsen({ jenis, id_absen_lembur: absenData?.id_absen_lembur });
    openCamera();
  };

  const handleDetailAbsen = (jenis: 'masuk' | 'pulang') => {
    if (!absenData) return;
    
    const detailData = {
      jenis,
      jam: jenis === 'masuk' ? absenData.jam_masuk : absenData.jam_pulang,
      foto: jenis === 'masuk' ? absenData.foto_masuk : absenData.foto_pulang,
      lintang: jenis === 'masuk' ? absenData.lintang_masuk : absenData.lintang_pulang,
      bujur: jenis === 'masuk' ? absenData.bujur_masuk : absenData.bujur_pulang,
      face_confidence: absenData.face_confidence,
      tanggal: selectedDate
    };
    
    setDetailAbsenData(detailData);
    setShowDetailModal(true);
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <StatusBar style="light" translucent={true} backgroundColor="transparent" />
        <AppHeader title="Detail Lembur" showBack={true} />
        
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          {/* Premium Header Skeleton */}
          <View style={styles.premiumHeader}>
            <View style={styles.headerTopRow}>
              <View style={styles.titleWrapper}>
                <View style={[styles.skeletonText, { width: '80%', height: 22, backgroundColor: 'rgba(255,255,255,0.3)', marginBottom: 10, borderRadius: 4 }]} />
                <View style={styles.sptContainer}>
                  <View style={[styles.skeletonText, { width: 14, height: 14, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 2 }]} />
                  <View style={[styles.skeletonText, { width: '60%', height: 13, backgroundColor: 'rgba(255,255,255,0.2)', marginLeft: 6, borderRadius: 3 }]} />
                </View>
              </View>
              <View style={[styles.skeletonText, { width: 80, height: 28, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 20 }]} />
            </View>
          </View>

          {/* Info Card Skeleton */}
          <View style={styles.elegantCard}>
            <View style={styles.cardHeader}>
              <View style={[styles.skeletonText, { width: 20, height: 20, backgroundColor: '#F0F3F3', borderRadius: 4 }]} />
              <View style={[styles.skeletonText, { width: '40%', height: 16, backgroundColor: '#F0F3F3', marginLeft: 10, borderRadius: 3 }]} />
            </View>
            <View style={styles.separator} />
            <View style={styles.infoRowModern}>
              <View style={styles.infoIconBox}>
                <View style={[styles.skeletonText, { width: 16, height: 16, backgroundColor: '#E0E7E7', borderRadius: 3 }]} />
              </View>
              <View style={styles.infoContentModern}>
                <View style={[styles.skeletonText, { width: '50%', height: 10, backgroundColor: '#F0F3F3', marginBottom: 5, borderRadius: 2 }]} />
                <View style={[styles.skeletonText, { width: '80%', height: 15, backgroundColor: '#E0E7E7', borderRadius: 3 }]} />
              </View>
            </View>
            <View style={[styles.infoRowModern, { marginBottom: 0 }]}>
              <View style={styles.infoIconBox}>
                <View style={[styles.skeletonText, { width: 16, height: 16, backgroundColor: '#E0E7E7', borderRadius: 3 }]} />
              </View>
              <View style={styles.infoContentModern}>
                <View style={[styles.skeletonText, { width: '40%', height: 10, backgroundColor: '#F0F3F3', marginBottom: 5, borderRadius: 2 }]} />
                <View style={[styles.skeletonText, { width: '60%', height: 15, backgroundColor: '#E0E7E7', borderRadius: 3 }]} />
              </View>
            </View>
          </View>

          {/* Section Header Skeleton */}
          <View style={styles.sectionHeader}>
            <View style={[styles.skeletonText, { width: '30%', height: 17, backgroundColor: '#E0E7E7', borderRadius: 4 }]} />
            <View style={[styles.skeletonText, { width: 40, height: 4, backgroundColor: '#E0E7E7', borderRadius: 2 }]} />
          </View>

          {/* Calendar Skeleton */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.calendarContainer}>
            {[1,2,3,4,5].map((i) => (
              <View key={i} style={[styles.dateCard, { borderColor: '#E0E0E0' }]}>
                <View style={[styles.skeletonText, { width: 20, height: 10, backgroundColor: '#F0F3F3', marginBottom: 4, borderRadius: 2 }]} />
                <View style={[styles.skeletonText, { width: 24, height: 24, backgroundColor: '#E0E7E7', borderRadius: 3 }]} />
                <View style={[styles.skeletonText, { width: 16, height: 10, backgroundColor: '#F0F3F3', marginTop: 4, borderRadius: 2 }]} />
              </View>
            ))}
          </ScrollView>

          {/* Absen Card Skeleton */}
          <View style={styles.sectionHeader}>
            <View style={[styles.skeletonText, { width: '25%', height: 17, backgroundColor: '#E0E7E7', borderRadius: 4 }]} />
            <View style={[styles.skeletonText, { width: 60, height: 20, backgroundColor: '#F0F3F3', borderRadius: 20 }]} />
          </View>
          
          <View style={styles.absenCard}>
            <View style={styles.absenRow}>
              <View style={styles.absenInfo}>
                <View style={[styles.skeletonText, { width: '40%', height: 12, backgroundColor: '#F0F3F3', marginBottom: 4, borderRadius: 2 }]} />
                <View style={[styles.skeletonText, { width: '30%', height: 16, backgroundColor: '#E0E7E7', borderRadius: 3 }]} />
              </View>
              <View style={styles.absenActions}>
                <View style={[styles.skeletonText, { width: 44, height: 44, backgroundColor: '#F1F5F9', borderRadius: 12 }]} />
                <View style={[styles.skeletonText, { width: 44, height: 44, backgroundColor: '#F1F5F9', borderRadius: 12 }]} />
              </View>
            </View>
            <View style={styles.absenRow}>
              <View style={styles.absenInfo}>
                <View style={[styles.skeletonText, { width: '40%', height: 12, backgroundColor: '#F0F3F3', marginBottom: 4, borderRadius: 2 }]} />
                <View style={[styles.skeletonText, { width: '30%', height: 16, backgroundColor: '#E0E7E7', borderRadius: 3 }]} />
              </View>
              <View style={styles.absenActions}>
                <View style={[styles.skeletonText, { width: 44, height: 44, backgroundColor: '#F1F5F9', borderRadius: 12 }]} />
                <View style={[styles.skeletonText, { width: 44, height: 44, backgroundColor: '#F1F5F9', borderRadius: 12 }]} />
              </View>
            </View>
          </View>
        </ScrollView>
      </View>
    );
  }

  if (!lembur) {
    return (
      <View style={styles.container}>
        <StatusBar style="light" translucent={true} backgroundColor="transparent" />
        <AppHeader title="Detail Lembur" showBack={true} />
        <View style={styles.emptyContainer}>
          <Ionicons name="alert-circle-outline" size={64} color="#E0E0E0" />
          <Text style={styles.emptyText}>Data lembur tidak ditemukan</Text>
        </View>
      </View>
    );
  }

  const status = getStatusInfo();
  const dates = generateDates(lembur.tanggal_mulai, lembur.tanggal_selesai);

  return (
    <View style={styles.container}>
      <StatusBar style="light" translucent={true} backgroundColor="transparent" />
      <AppHeader title="Detail Lembur" showBack={true} />

      <ScrollView 
        showsVerticalScrollIndicator={false} 
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Premium Header Section */}
        <View style={styles.premiumHeader}>
          <View style={styles.headerTopRow}>
            <View style={styles.titleWrapper}>
              <Text style={styles.lemburTitle} numberOfLines={2}>Lembur - {lembur.alasan_text}</Text>
              <View style={styles.sptContainer}>
                <Ionicons name="documents-outline" size={14} color="#B2DFDB" />
                <Text style={styles.sptText}>No. Pengajuan: {lembur.id_pengajuan || lembur.id || params.id || '-'}</Text>
              </View>
            </View>
            <View style={[styles.statusTag, { backgroundColor: status.color + '20' }]}>
              <View style={[styles.statusDot, { backgroundColor: status.color }]} />
              <Text style={[styles.statusTagText, { color: status.color }]}>{status.label}</Text>
            </View>
          </View>
        </View>

        {/* Info Utama Card */}
        <View style={styles.elegantCard}>
          <View style={styles.cardHeader}>
            <MaterialCommunityIcons name="briefcase-clock-outline" size={20} color="#004643" />
            <Text style={styles.cardTitle}>Informasi Lembur</Text>
          </View>

          <View style={styles.separator} />

          <View style={styles.infoRowModern}>
            <View style={styles.infoIconBox}>
              <Ionicons name="calendar-outline" size={16} color="#00695C" />
            </View>
            <View style={styles.infoContentModern}>
              <Text style={styles.labelModern}>PERIODE LEMBUR</Text>
              <Text style={styles.valueModern}>{formatDate(lembur.tanggal_mulai)} - {formatDate(lembur.tanggal_selesai)}</Text>
            </View>
          </View>

          <View style={[styles.infoRowModern, { marginBottom: 0 }]}>
            <View style={styles.infoIconBox}>
              <Ionicons name="time-outline" size={16} color="#00695C" />
            </View>
            <View style={styles.infoContentModern}>
              <Text style={styles.labelModern}>JAM KERJA</Text>
              <Text style={styles.valueModern}>{lembur.jam_mulai} - {lembur.jam_selesai}</Text>
            </View>
          </View>
        </View>

        {/* Calendar Section */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Pilih Tanggal</Text>
          <View style={styles.activeIndicator} />
        </View>

        <ScrollView 
          horizontal 
          ref={calendarRef}
          showsHorizontalScrollIndicator={false} 
          contentContainerStyle={styles.calendarContainer}
        >
          {dates.map((d) => {
            const isSelected = selectedDate === d.fullDate;
            const isToday = d.fullDate === getTodayDateString();
            return (
              <TouchableOpacity 
                key={d.fullDate} 
                onPress={() => handleDateClick(d.fullDate)}
                style={[
                  styles.dateCard, 
                  isSelected && styles.dateCardSelected,
                  isToday && !isSelected && styles.dateCardToday
                ]}
              >
                <Text style={[styles.dateDay, isSelected && styles.textWhite]}>{d.dayName}</Text>
                <Text style={[styles.dateNum, isSelected && styles.textWhite]}>{d.day}</Text>
                <Text style={[styles.dateMonth, isSelected && styles.textWhite]}>{d.month}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Absen Section */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Status Absen</Text>
          <Text style={styles.dateLabel}>{selectedDate}</Text>
        </View>

        <View style={styles.absenCard}>
          <View style={styles.absenRow}>
            <View style={styles.absenInfo}>
              <Text style={styles.absenLabel}>Absen Masuk</Text>
              <Text style={styles.absenTime}>{absenData?.jam_masuk || '-'}</Text>
              <Text style={styles.absenInfoText}>{getAbsenInfo('masuk').message}</Text>
            </View>
            <View style={styles.absenActions}>
              <TouchableOpacity 
                style={[styles.absenBtn, (!absenData?.jam_masuk && canAbsenMasuk() && styles.absenBtnActive)]}
                onPress={() => handleAbsen('masuk')}
                disabled={!!absenData?.jam_masuk || !canAbsenMasuk() || isProcessing}
              >
                <Ionicons name="camera" size={18} color={(absenData?.jam_masuk || !canAbsenMasuk()) ? '#999' : '#fff'} />
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.detailBtn, absenData?.jam_masuk && styles.detailBtnActive]}
                onPress={() => handleDetailAbsen('masuk')}
                disabled={!absenData?.jam_masuk}
              >
                <Ionicons name="information-circle-outline" size={18} color={absenData?.jam_masuk ? '#004643' : '#999'} />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.absenRow}>
            <View style={styles.absenInfo}>
              <Text style={styles.absenLabel}>Absen Pulang</Text>
              <Text style={styles.absenTime}>{absenData?.jam_pulang || '-'}</Text>
              <Text style={styles.absenInfoText}>{getAbsenInfo('pulang').message}</Text>
            </View>
            <View style={styles.absenActions}>
              <TouchableOpacity 
                style={[styles.absenBtn, (absenData?.jam_masuk && !absenData?.jam_pulang && canAbsenPulang() && styles.absenBtnActive)]}
                onPress={() => handleAbsen('pulang')}
                disabled={!absenData?.jam_masuk || !!absenData?.jam_pulang || !canAbsenPulang() || isProcessing}
              >
                <Ionicons name="camera" size={18} color={(absenData?.jam_masuk && !absenData?.jam_pulang && canAbsenPulang()) ? '#fff' : '#999'} />
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.detailBtn, absenData?.jam_pulang && styles.detailBtnActive]}
                onPress={() => handleDetailAbsen('pulang')}
                disabled={!absenData?.jam_pulang}
              >
                <Ionicons name="information-circle-outline" size={18} color={absenData?.jam_pulang ? '#004643' : '#999'} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Total Jam Lembur - Hanya tampil jika sudah absen masuk */}
          {(absenData && absenData.jam_masuk && !absenData.jam_pulang) && (
            <View style={styles.totalJamContainer}>
              <View style={styles.totalJamRow}>
                <Ionicons name="time" size={16} color="#004643" />
                <Text style={styles.totalJamLabel}>Jam Berjalan</Text>
              </View>
              <Text style={styles.totalJamValue}>{calculateTotalJam()} Jam</Text>
              <Text style={styles.realtimeIndicator}>• Realtime</Text>
            </View>
          )}
          
          {/* Total Jam Final - Hanya tampil jika sudah absen pulang */}
          {(absenData && absenData.jam_masuk && absenData.jam_pulang) && (
            <View style={styles.totalJamContainer}>
              <View style={styles.totalJamRow}>
                <Ionicons name="time" size={16} color="#004643" />
                <Text style={styles.totalJamLabel}>Total Jam Lembur</Text>
              </View>
              <Text style={styles.totalJamValue}>{calculateTotalJam()} Jam</Text>
            </View>
          )}
        </View>

        {/* Lokasi Lembur */}
        {lembur.lokasi && lembur.lokasi.length > 0 && (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Lokasi Lembur</Text>
            </View>
            
            {lembur.lokasi.map((lokasi: any, index: number) => (
              <View key={index} style={styles.lokasiCard}>
                <View style={styles.lokasiHeader}>
                  <View style={styles.lokasiIconBox}>
                    <Ionicons name="location" size={20} color="#004643" />
                  </View>
                  <Text style={styles.lokasiName}>{lokasi.nama_lokasi}</Text>
                </View>
                
                {lokasi.alamat && (
                  <Text style={styles.lokasiAddress}>{lokasi.alamat}</Text>
                )}
              </View>
            ))}
          </>
        )}
      </ScrollView>

      {/* Photo Modal */}
      <Modal visible={showPreviewModal} transparent animationType="none" statusBarTranslucent onRequestClose={closePhotoModal}>
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={closePhotoModal} />
          <Animated.View style={[styles.photoBottomSheet, { transform: [{ translateY: photoTranslateY }] }]}>
            <View style={styles.handleContainer}>
              <View style={styles.handleBar} />
            </View>
            
            <View style={styles.photoSheetContent}>
              <Text style={styles.photoSheetTitle}>Preview Foto Absen</Text>
              
              <View style={styles.photoImageContainer}>
                {photoUri && (
                  <Image source={{ uri: photoUri }} style={styles.photoImage} resizeMode="cover" />
                )}
              </View>

              <View style={styles.modalButtons}>
                <TouchableOpacity style={styles.modalButton} onPress={handleRetake}>
                  <Ionicons name="refresh" size={20} color="#666" />
                  <Text style={styles.modalButtonText}>Ulangi</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.modalButton, styles.modalButtonPrimary]} onPress={handleSubmit}>
                  <Ionicons name="checkmark" size={20} color="#fff" />
                  <Text style={[styles.modalButtonText, { color: '#fff' }]}>Kirim</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Animated.View>
        </View>
      </Modal>
      
      {/* Detail Absen Modal */}
      <Modal visible={showDetailModal} transparent animationType="fade" statusBarTranslucent onRequestClose={() => setShowDetailModal(false)}>
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setShowDetailModal(false)} />
          <View style={styles.detailModalContainer}>
            <View style={styles.detailModalHeader}>
              <Text style={styles.detailModalTitle}>Detail Absen {detailAbsenData?.jenis === 'masuk' ? 'Masuk' : 'Pulang'}</Text>
              <TouchableOpacity onPress={() => setShowDetailModal(false)} style={styles.closeButton}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.detailModalContent}>
              {/* Foto Absen */}
              {detailAbsenData?.foto && (
                <View style={styles.detailSection}>
                  <Text style={styles.detailSectionTitle}>Foto Absen</Text>
                  <View style={styles.fotoContainer}>
                    <Image 
                      source={{ uri: `${getApiUrl('')}/uploads/lembur/${detailAbsenData.foto}` }} 
                      style={styles.fotoAbsen} 
                      resizeMode="cover" 
                    />
                  </View>
                </View>
              )}
              
              {/* Info Waktu */}
              <View style={styles.detailSection}>
                <Text style={styles.detailSectionTitle}>Informasi Waktu</Text>
                <View style={styles.detailInfoCard}>
                  <View style={styles.detailInfoRow}>
                    <Ionicons name="calendar-outline" size={16} color="#004643" />
                    <Text style={styles.detailInfoLabel}>Tanggal</Text>
                    <Text style={styles.detailInfoValue}>{formatDate(detailAbsenData?.tanggal || '')}</Text>
                  </View>
                  <View style={styles.detailInfoRow}>
                    <Ionicons name="time-outline" size={16} color="#004643" />
                    <Text style={styles.detailInfoLabel}>Waktu</Text>
                    <Text style={styles.detailInfoValue}>{detailAbsenData?.jam || '-'}</Text>
                  </View>
                </View>
              </View>
              
              {/* Info Lokasi */}
              {(detailAbsenData?.lintang && detailAbsenData?.bujur) && (
                <View style={styles.detailSection}>
                  <Text style={styles.detailSectionTitle}>Lokasi Absen</Text>
                  <View style={styles.detailInfoCard}>
                    <View style={styles.detailInfoRow}>
                      <Ionicons name="location-outline" size={16} color="#004643" />
                      <Text style={styles.detailInfoLabel}>Koordinat</Text>
                      <Text style={styles.detailInfoValue}>{detailAbsenData.lintang.toFixed(6)}, {detailAbsenData.bujur.toFixed(6)}</Text>
                    </View>
                  </View>
                </View>
              )}
              
              {/* Face Confidence */}
              {detailAbsenData?.face_confidence && (
                <View style={styles.detailSection}>
                  <Text style={styles.detailSectionTitle}>Verifikasi Wajah</Text>
                  <View style={styles.detailInfoCard}>
                    <View style={styles.detailInfoRow}>
                      <Ionicons name="person-outline" size={16} color="#004643" />
                      <Text style={styles.detailInfoLabel}>Tingkat Kemiripan</Text>
                      <Text style={styles.detailInfoValue}>{detailAbsenData.face_confidence}%</Text>
                    </View>
                  </View>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
      
      <CustomAlert
        visible={alert.visible}
        type={alert.config.type}
        title={alert.config.title}
        message={alert.config.message}
        onClose={alert.hideAlert}
        onConfirm={alert.config.onConfirm ? alert.handleConfirm : undefined}
        confirmText={alert.config.confirmText}
        cancelText={alert.config.cancelText}
      />
    </View>
  );
}
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F7F7' },
  scrollContent: { paddingBottom: 40 },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  emptyText: { fontSize: 14, color: '#666' },

  // Premium Header Style
  premiumHeader: {
    backgroundColor: '#004643',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 30,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  headerTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  titleWrapper: { flex: 1, marginRight: 15 },
  lemburTitle: { fontSize: 22, fontWeight: '800', color: '#FFF', letterSpacing: -0.5, lineHeight: 28 },
  sptContainer: { flexDirection: 'row', alignItems: 'center', marginTop: 10 },
  sptText: { fontSize: 13, color: '#B2DFDB', fontWeight: '500', marginLeft: 6 },
  
  statusTag: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  statusDot: { width: 7, height: 7, borderRadius: 4, marginRight: 7 },
  statusTagText: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },

  // Elegant Card General Styles
  elegantCard: {
    backgroundColor: '#FFF',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 3,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#1A1A1A', marginLeft: 10 },
  separator: { height: 1, backgroundColor: '#F0F3F3', marginBottom: 18 },
  
  // Modern Info Rows
  infoRowModern: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 18 },
  infoIconBox: { 
    width: 34, height: 34, backgroundColor: '#F0F7F7',
    borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 15, marginTop: 2 
  },
  infoContentModern: { flex: 1 },
  labelModern: { fontSize: 10, fontWeight: '800', color: '#95A5A6', letterSpacing: 1.1, marginBottom: 5 },
  valueModern: { fontSize: 15, fontWeight: '600', color: '#2C3E50', lineHeight: 20 },

  // Section Header
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginHorizontal: 20, marginBottom: 15, marginTop: 5 },
  sectionTitle: { fontSize: 17, fontWeight: '800', color: '#1A1A1A', letterSpacing: -0.3 },
  activeIndicator: { width: 40, height: 4, backgroundColor: '#004643', borderRadius: 2 },
  dateLabel: { fontSize: 12, fontWeight: '700', color: '#64748B', backgroundColor: '#F1F5F9', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20 },

  // Calendar
  calendarContainer: { paddingHorizontal: 16, paddingBottom: 10 },
  dateCard: { width: 68, height: 95, backgroundColor: '#FFF', borderRadius: 12, marginRight: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#E0E0E0' },
  dateCardSelected: { backgroundColor: '#004643', borderColor: '#004643' },
  dateCardToday: { borderStyle: 'dashed', borderColor: '#004643', borderWidth: 1.5 },
  dateDay: { fontSize: 10, fontWeight: '700', color: '#94A3B8', marginBottom: 4 },
  dateNum: { fontSize: 24, fontWeight: '800', color: '#0F172A' },
  dateMonth: { fontSize: 10, fontWeight: '700', color: '#64748B' },
  textWhite: { color: '#FFF' },

  // Absen Card
  absenCard: {
    backgroundColor: '#FFF',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 3,
  },
  absenRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  absenInfo: { flex: 1 },
  absenLabel: { fontSize: 12, fontWeight: '700', color: '#64748B', marginBottom: 4 },
  absenTime: { fontSize: 16, fontWeight: '700', color: '#1A1A1A' },
  absenInfoText: { fontSize: 11, color: '#666', marginTop: 4, fontStyle: 'italic' },
  absenActions: { flexDirection: 'row', gap: 8 },
  absenBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  absenBtnActive: { backgroundColor: '#004643' },
  detailBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailBtnActive: {
    backgroundColor: '#F0F7F7',
  },

  // Location Card
  lokasiCard: {
    backgroundColor: '#FFF',
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 18,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.02,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 1 }
  },
  lokasiHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  lokasiIconBox: {
    width: 40, height: 40, backgroundColor: '#F0F7F7',
    borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 12
  },
  lokasiName: { fontSize: 15, fontWeight: '700', color: '#1A1A1A', flex: 1 },
  lokasiAddress: { fontSize: 13, color: '#64748B', marginLeft: 52, lineHeight: 18 },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalBackdrop: { flex: 1 },
  photoBottomSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 34,
    maxHeight: SCREEN_HEIGHT * 0.85,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 20,
  },
  handleContainer: { paddingVertical: 12, alignItems: 'center' },
  handleBar: { width: 40, height: 4, backgroundColor: '#DDD', borderRadius: 2 },
  photoSheetContent: { paddingHorizontal: 20, paddingBottom: 16 },
  photoSheetTitle: { fontSize: 18, fontWeight: '700', color: '#0F172A', textAlign: 'center', marginBottom: 16 },
  photoImageContainer: { alignItems: 'center', justifyContent: 'center', minHeight: 300, borderRadius: 16, padding: 8, overflow: 'hidden' },
  photoImage: { width: '100%', height: 300, borderRadius: 12 },
  modalButtons: { flexDirection: 'row', gap: 10, marginTop: 16 },
  modalButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: 12, gap: 6, backgroundColor: '#F5F5F5' },
  modalButtonPrimary: { backgroundColor: '#004643' },
  modalButtonText: { fontSize: 13, fontWeight: '600', color: '#666' },

  // Total Jam Container
  totalJamContainer: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  totalJamRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  totalJamLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
    marginLeft: 8,
  },
  totalJamValue: {
    fontSize: 20,
    fontWeight: '800',
    color: '#004643',
    textAlign: 'center',
  },
  realtimeIndicator: {
    fontSize: 10,
    color: '#FF9800',
    textAlign: 'center',
    fontWeight: '600',
    marginTop: 4,
  },

  // Skeleton Styles
  skeletonText: { backgroundColor: '#E0E0E0', borderRadius: 4 },

  // Detail Modal Styles
  detailModalContainer: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginVertical: 60,
    borderRadius: 20,
    maxHeight: SCREEN_HEIGHT * 0.8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 20,
  },
  detailModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  detailModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailModalContent: {
    padding: 20,
  },
  detailSection: {
    marginBottom: 20,
  },
  detailSectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 12,
  },
  fotoContainer: {
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 12,
  },
  fotoAbsen: {
    width: '100%',
    height: 200,
    borderRadius: 8,
  },
  detailInfoCard: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
  },
  detailInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  detailInfoLabel: {
    fontSize: 13,
    color: '#64748B',
    marginLeft: 8,
    flex: 1,
  },
  detailInfoValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1A1A1A',
  },
});