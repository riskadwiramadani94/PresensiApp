import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, Modal, Image, Dimensions, Animated, PanResponder, Platform } from 'react-native';
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
  const [selectedAbsen, setSelectedAbsen] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [detailAbsenData, setDetailAbsenData] = useState<any>(null);
  const [nearestLocation, setNearestLocation] = useState<any>(null);
  const [distanceToLocation, setDistanceToLocation] = useState<number>(0);

  const [userId, setUserId] = useState<string>('');
  const detailTranslateY = useRef(new Animated.Value(1000)).current;
  // Update lokasi dan radius setiap 10 detik
  useEffect(() => {
    const interval = setInterval(() => {
      if (userLocation) {
        findNearestLocation(userLocation);
      }
    }, 10000); // 10 detik

    return () => clearInterval(interval);
  }, [userLocation]);

  // Update waktu setiap 30 detik untuk realtime
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 30000); // 30 detik

    return () => clearInterval(interval);
  }, []);

  const calendarRef = useRef<ScrollView>(null);

  const detailPanResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: (_, gestureState) => gestureState.dy > 5,
    onPanResponderMove: (_, gestureState) => {
      if (gestureState.dy > 0) {
        detailTranslateY.setValue(gestureState.dy);
      }
    },
    onPanResponderRelease: (_, gestureState) => {
      if (gestureState.dy > 100) {
        closeDetailModal();
      } else {
        Animated.spring(detailTranslateY, {
          toValue: 0,
          useNativeDriver: true,
        }).start();
      }
    },
  });

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
    if (selectedDate) {
      fetchAbsenData();
    }
  }, [selectedDate]);

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
      
      // Cari lokasi terdekat dan hitung jarak
      await findNearestLocation(location.coords);
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
      
      // Gunakan endpoint detail yang baru
      const response = await fetch(getApiUrl(`/pegawai/lembur/api/detail?id_pengajuan=${params.id}&user_id=${userId}`));
      const result = await response.json();
      console.log('Detail lembur response:', result);
      
      if (result.success && result.data) {
        setLembur(result.data);
        // Langsung set hari ini tanpa perlu klik
        const today = getTodayDateString();
        setSelectedDate(today);
        console.log('Detail found, auto-selected today:', today);
      } else {
        // Fallback ke endpoint lama jika tidak ditemukan
        console.log('Trying fallback endpoints...');
        
        // Endpoint fallback: cari dari riwayat berdasarkan ID
        try {
          const riwayatResponse = await fetch(getApiUrl(`/pegawai/lembur/api/riwayat?user_id=${userId}`));
          const riwayatResult = await riwayatResponse.json();
          console.log('Searching in riwayat for ID:', params.id);
          
          if (riwayatResult.success && riwayatResult.data) {
            const foundItem = riwayatResult.data.find((item: any) => 
              item.id_pengajuan == params.id || 
              item.id == params.id || 
              item.id_absen_lembur == params.id
            );
            
            if (foundItem) {
              setLembur(foundItem);
              const today = getTodayDateString();
              setSelectedDate(today);
              console.log('Detail found from riwayat, auto-selected today:', today);
              return;
            }
          }
        } catch (e) {
          console.log('Riwayat search failed:', e);
        }
        
        // Endpoint fallback: cari dari pengajuan hari ini
        try {
          const pengajuanResponse = await fetch(getApiUrl(`/pegawai/lembur/api/pengajuan-hari-ini?user_id=${userId}`));
          const pengajuanResult = await pengajuanResponse.json();
          console.log('Searching in pengajuan-hari-ini for ID:', params.id);
          
          if (pengajuanResult.success && pengajuanResult.data) {
            const foundItem = pengajuanResult.data.find((item: any) => 
              item.id_pengajuan == params.id || 
              item.id == params.id
            );
            
            if (foundItem) {
              setLembur(foundItem);
              const today = getTodayDateString();
              setSelectedDate(today);
              console.log('Detail found from pengajuan-hari-ini, auto-selected today:', today);
              return;
            }
          }
        } catch (e) {
          console.log('Pengajuan-hari-ini search failed:', e);
        }
        
        console.log('No lembur detail found for ID:', params.id);
        alert.showAlert({ type: 'error', message: 'Data lembur tidak ditemukan' });
      }
      
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
    if (!lembur || !selectedDate) return { label: '', color: '', icon: '' };
    
    const now = new Date();
    const selectedDateObj = new Date(selectedDate + 'T00:00:00');
    
    const mulai = new Date(lembur.tanggal_mulai + 'T00:00:00');
    const selesai = new Date(lembur.tanggal_selesai + 'T00:00:00');

    console.log('=== STATUS DEBUG ===');
    console.log('Selected date:', selectedDate);
    console.log('Lembur mulai:', lembur.tanggal_mulai);
    console.log('Lembur selesai:', lembur.tanggal_selesai);
    console.log('Jam lembur:', lembur.jam_mulai, '-', lembur.jam_selesai);
    console.log('Waktu sekarang:', now.getHours() + ':' + now.getMinutes());
    console.log('selectedDateObj >= mulai?', selectedDateObj >= mulai);
    console.log('selectedDateObj <= selesai?', selectedDateObj <= selesai);

    // Jika tanggal yang dipilih dalam periode lembur, cek jam kerja
    if (selectedDateObj >= mulai && selectedDateObj <= selesai) {
      const currentTime = now.getHours() * 60 + now.getMinutes();
      const [startHour, startMin] = lembur.jam_mulai.split(':').map(Number);
      const [endHour, endMin] = lembur.jam_selesai.split(':').map(Number);
      
      const startTime = startHour * 60 + startMin;
      const endTime = endHour * 60 + endMin;
      
      console.log('Current time (minutes):', currentTime);
      console.log('Start time (minutes):', startTime);
      console.log('End time (minutes):', endTime);
      
      // Jika tanggal yang dipilih adalah hari ini, cek jam
      const today = new Date().toISOString().split('T')[0];
      if (selectedDate === today) {
        if (currentTime < startTime) {
          console.log('STATUS: Akan Datang');
          return { label: 'Akan Datang', color: '#FF9800', icon: 'time' };
        } else if (currentTime >= startTime && currentTime <= endTime) {
          console.log('STATUS: Berlangsung');
          return { label: 'Berlangsung', color: '#4CAF50', icon: 'radio-button-on' };
        } else {
          console.log('STATUS: Selesai Hari Ini');
          return { label: 'Selesai', color: '#2196F3', icon: 'checkmark-circle' };
        }
      } else {
        // Jika tanggal masa lalu dalam periode lembur
        console.log('STATUS: Selesai');
        return { label: 'Selesai', color: '#2196F3', icon: 'checkmark-circle' };
      }
    } else if (mulai > selectedDateObj) {
      console.log('STATUS: Akan Datang');
      return { label: 'Akan Datang', color: '#FF9800', icon: 'time' };
    } else {
      console.log('STATUS: Selesai');
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

  const findNearestLocation = async (coords: any) => {
    try {
      const response = await fetch(getApiUrl('/pegawai/lembur/api/lokasi-terdekat'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          latitude: coords.latitude,
          longitude: coords.longitude
        })
      });
      
      const result = await response.json();
      if (result.success && result.data) {
        setNearestLocation(result.data);
        const distance = calculateDistance(
          coords.latitude,
          coords.longitude,
          result.data.latitude,
          result.data.longitude
        );
        setDistanceToLocation(distance);
      }
    } catch (error) {
      console.error('Error finding nearest location:', error);
    }
  };

  const isWithinRadius = () => {
    if (!nearestLocation || !distanceToLocation) return false;
    return distanceToLocation <= nearestLocation.radius;
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

  const takePhotoAndSubmit = async (jenis: 'masuk' | 'pulang') => {
    try {
      console.log('=== TAKE PHOTO START ===');
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      console.log('Camera permission:', status);
      
      if (status !== 'granted') {
        alert.showAlert({ type: 'error', message: 'Izin kamera diperlukan' });
        return;
      }

      console.log('Launching camera...');
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 0.6,
      });

      console.log('Camera result:', { canceled: result.canceled, hasAssets: !!result.assets });

      if (!result.canceled) {
        console.log('Photo taken, submitting...');
        await submitAbsenLembur(jenis, result.assets[0].uri);
      } else {
        console.log('Photo cancelled');
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      alert.showAlert({ type: 'error', message: 'Gagal mengambil foto' });
    }
  };

  const submitAbsenLembur = async (jenis: 'masuk' | 'pulang', photoUri: string) => {
    setIsProcessing(true);
    console.log('=== SUBMIT ABSEN LEMBUR ===');
    console.log('Jenis:', jenis);
    console.log('Photo URI:', photoUri);
    
    try {
      const formData = new FormData();
      
      if (jenis === 'masuk') {
        formData.append('id_pengajuan', params.id.toString());
        formData.append('user_id', userId);
        formData.append('tanggal', selectedDate);
        console.log('Absen Masuk Data:', { id_pengajuan: params.id, user_id: userId, tanggal: selectedDate });
      } else {
        if (!absenData?.id_absen_lembur) {
          alert.showAlert({ type: 'error', message: 'Data absen masuk tidak ditemukan' });
          setIsProcessing(false);
          return;
        }
        formData.append('id_absen_lembur', absenData.id_absen_lembur.toString());
        console.log('Absen Pulang Data:', { id_absen_lembur: absenData.id_absen_lembur });
      }
      
      formData.append('latitude', userLocation.latitude.toString());
      formData.append('longitude', userLocation.longitude.toString());
      
      const filename = photoUri.split('/').pop();
      const match = /\.(\w+)$/.exec(filename || '');
      const fileType = match ? `image/${match[1]}` : 'image/jpeg';
      
      formData.append('foto', {
        uri: photoUri,
        name: filename || `lembur_${jenis}_${Date.now()}.jpg`,
        type: fileType,
      } as any);
      
      const endpoint = jenis === 'masuk' 
        ? '/pegawai/lembur/api/absen-masuk'
        : '/pegawai/lembur/api/absen-pulang';
      
      console.log('Submitting to:', getApiUrl(endpoint));
      console.log('Location:', { lat: userLocation.latitude, lng: userLocation.longitude });
      
      const response = await fetch(getApiUrl(endpoint), {
        method: 'POST',
        body: formData,
        headers: {
          'Accept': 'application/json',
        },
      });
      
      console.log('Response status:', response.status);
      const result = await response.json();
      console.log('Response data:', result);
      
      if (result.success) {
        console.log('SUCCESS: Absen berhasil');
        alert.showAlert({ type: 'success', message: result.message || 'Absen berhasil disimpan' });
        await fetchAbsenData();
        await fetchDetailLembur();
      } else {
        console.log('FAILED:', result.message);
        alert.showAlert({ type: 'error', message: result.message || 'Gagal menyimpan absen' });
      }
    } catch (error) {
      console.error('Error submitting:', error);
      alert.showAlert({ type: 'error', message: 'Terjadi kesalahan saat mengirim data' });
    } finally {
      console.log('=== SUBMIT END ===');
      setIsProcessing(false);
    }
  };


  const canAbsenMasuk = () => {
    if (!lembur) return false;
    // Hapus validasi waktu ketat - lembur bisa kapan saja dalam periode
    const today = getTodayDateString();
    const lemburStart = new Date(lembur.tanggal_mulai);
    const lemburEnd = new Date(lembur.tanggal_selesai);
    const selectedDateObj = new Date(selectedDate);
    
    // Cek apakah tanggal yang dipilih dalam periode lembur
    return selectedDateObj >= lemburStart && selectedDateObj <= lemburEnd;
  };

  const canAbsenPulang = () => {
    if (!lembur) return false;
    // Hapus validasi waktu ketat - lembur bisa kapan saja dalam periode
    const today = getTodayDateString();
    const lemburStart = new Date(lembur.tanggal_mulai);
    const lemburEnd = new Date(lembur.tanggal_selesai);
    const selectedDateObj = new Date(selectedDate);
    
    // Cek apakah tanggal yang dipilih dalam periode lembur
    return selectedDateObj >= lemburStart && selectedDateObj <= lemburEnd;
  };

  const getAbsenInfo = (jenis: 'masuk' | 'pulang') => {
    if (!lembur) return { canAbsen: false, message: '', radiusInfo: null };
    
    const today = getTodayDateString();
    const selectedDateObj = new Date(selectedDate + 'T00:00:00');
    const todayObj = new Date(today + 'T00:00:00');
    const lemburStart = new Date(lembur.tanggal_mulai + 'T00:00:00');
    const lemburEnd = new Date(lembur.tanggal_selesai + 'T00:00:00');
    
    // Info radius untuk ditampilkan
    const radiusInfo = nearestLocation ? {
      distance: Math.round(distanceToLocation),
      radius: nearestLocation.radius,
      isWithin: isWithinRadius(),
      locationName: nearestLocation.nama_lokasi
    } : null;
    
    // Jika tanggal yang dipilih di luar periode lembur
    if (selectedDateObj < lemburStart || selectedDateObj > lemburEnd) {
      return { canAbsen: false, message: `Tanggal di luar periode lembur (${formatDate(lembur.tanggal_mulai)} - ${formatDate(lembur.tanggal_selesai)})`, radiusInfo };
    }
    
    // Jika tanggal yang dipilih adalah masa depan
    if (selectedDateObj > todayObj) {
      return { canAbsen: false, message: `Absen akan tersedia pada ${formatDate(selectedDate)}`, radiusInfo };
    }
    
    // Validasi jam kerja lembur untuk hari ini
    if (selectedDate === today) {
      const now = new Date();
      const currentTime = now.getHours() * 60 + now.getMinutes();
      const [startHour, startMin] = lembur.jam_mulai.split(':').map(Number);
      const [endHour, endMin] = lembur.jam_selesai.split(':').map(Number);
      
      const startTime = startHour * 60 + startMin;
      const endTime = endHour * 60 + endMin;
      
      // Jika belum waktunya lembur
      if (currentTime < startTime) {
        return { canAbsen: false, message: `Lembur dimulai pada ${lembur.jam_mulai}`, radiusInfo };
      }
      
      // Jika sudah lewat waktu lembur
      if (currentTime > endTime && jenis === 'masuk') {
        return { canAbsen: false, message: `Waktu lembur sudah berakhir (${lembur.jam_selesai})`, radiusInfo };
      }
    }
    
    // Jika hari ini atau masa lalu dalam periode lembur
    if (jenis === 'masuk') {
      if (absenData?.jam_masuk) {
        return { canAbsen: false, message: `Sudah absen masuk pada ${absenData.jam_masuk}`, radiusInfo };
      }
      return { canAbsen: isWithinRadius(), message: isWithinRadius() ? 'Silahkan lakukan absen masuk lembur' : 'Anda berada di luar radius lokasi', radiusInfo };
    } else {
      if (!absenData?.jam_masuk) {
        return { canAbsen: false, message: 'Harus absen masuk terlebih dahulu', radiusInfo };
      }
      
      if (absenData?.jam_pulang) {
        return { canAbsen: false, message: `Sudah absen pulang pada ${absenData.jam_pulang}`, radiusInfo };
      }
      
      // Validasi waktu minimal lembur untuk hari ini
      if (selectedDate === today) {
        const now = new Date();
        const currentTime = now.getHours() * 60 + now.getMinutes();
        const [endHour, endMin] = lembur.jam_selesai.split(':').map(Number);
        const endTime = endHour * 60 + endMin;
        
        // Belum sampai jam selesai lembur
        if (currentTime < endTime) {
          const remainingMinutes = endTime - currentTime;
          const remainingHours = Math.floor(remainingMinutes / 60);
          const remainingMins = remainingMinutes % 60;
          
          let timeRemaining = '';
          if (remainingHours > 0) {
            timeRemaining = `${remainingHours} jam ${remainingMins} menit`;
          } else {
            timeRemaining = `${remainingMins} menit`;
          }
          
          return { 
            canAbsen: false, 
            message: `Belum bisa absen pulang. Waktu lembur selesai pada ${lembur.jam_selesai} (${timeRemaining} lagi)`, 
            radiusInfo 
          };
        }
      }
      
      return { canAbsen: isWithinRadius(), message: isWithinRadius() ? 'Silahkan lakukan absen pulang lembur' : 'Anda berada di luar radius lokasi', radiusInfo };
    }
  };

  const calculateTotalJam = () => {
    if (!lembur) return '0 Jam 0 Menit';
    
    let totalMinutes = 0;
    
    // Jika sudah absen pulang, tampilkan total jam dari database
    if (absenData?.total_jam && absenData?.jam_pulang) {
      const totalJamDecimal = parseFloat(absenData.total_jam);
      totalMinutes = Math.round(totalJamDecimal * 60);
    }
    // Jika sudah absen masuk tapi belum pulang, hitung realtime
    else if (absenData?.jam_masuk && !absenData?.jam_pulang) {
      const jamMasukAbsen = absenData.jam_masuk;
      const [masukHour, masukMin] = jamMasukAbsen.split(':').map(Number);
      
      const now = currentTime;
      const currentHour = now.getHours();
      const currentMin = now.getMinutes();
      
      const masukMinutes = masukHour * 60 + masukMin;
      const currentMinutes = currentHour * 60 + currentMin;
      
      totalMinutes = currentMinutes - masukMinutes;
      
      // Jika melewati tengah malam
      if (totalMinutes < 0) {
        totalMinutes += 24 * 60;
      }
    }
    
    // Konversi menit ke jam dan menit
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    
    return `${hours} Jam ${minutes} Menit`;
  };

  const handleAbsen = async (jenis: 'masuk' | 'pulang') => {
    console.log('=== HANDLE ABSEN START ===');
    console.log('Jenis:', jenis);
    
    if (!lembur || !userLocation) {
      console.log('ERROR: Lokasi tidak tersedia');
      alert.showAlert({ type: 'error', message: 'Lokasi tidak tersedia' });
      return;
    }

    if (!canAbsenMasuk() && jenis === 'masuk') {
      console.log('ERROR: Tanggal di luar periode lembur');
      alert.showAlert({ type: 'warning', message: 'Tanggal di luar periode lembur yang disetujui' });
      return;
    }
    
    if (!canAbsenPulang() && jenis === 'pulang') {
      console.log('ERROR: Tanggal di luar periode lembur');
      alert.showAlert({ type: 'warning', message: 'Tanggal di luar periode lembur yang disetujui' });
      return;
    }

    // Langsung ambil foto dan submit (seperti presensi biasa)
    await takePhotoAndSubmit(jenis);
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
    Animated.spring(detailTranslateY, {
      toValue: 0,
      useNativeDriver: true,
      tension: 65,
      friction: 11
    }).start();
  };

  const closeDetailModal = () => {
    Animated.timing(detailTranslateY, {
      toValue: 1000,
      duration: 250,
      useNativeDriver: true,
    }).start(() => {
      setShowDetailModal(false);
      setDetailAbsenData(null);
    });
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
          <View style={styles.sectionTitleContainer}>
            <Text style={styles.sectionTitle}>Pilih Tanggal</Text>
            <View style={styles.activeIndicator} />
          </View>
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
              
              {/* Indikator Radius */}
              {getAbsenInfo('masuk').radiusInfo && (
                <View style={styles.radiusIndicator}>
                  <View style={[
                    styles.radiusStatus,
                    { backgroundColor: getAbsenInfo('masuk').radiusInfo?.isWithin ? '#E8F5E8' : '#FFF0F0' }
                  ]}>
                    <View style={[
                      styles.radiusDot,
                      { backgroundColor: getAbsenInfo('masuk').radiusInfo?.isWithin ? '#4CAF50' : '#F44336' }
                    ]} />
                    <Text style={[
                      styles.radiusText,
                      { color: getAbsenInfo('masuk').radiusInfo?.isWithin ? '#4CAF50' : '#F44336' }
                    ]}>
                      {getAbsenInfo('masuk').radiusInfo?.isWithin ? 'Di dalam radius' : 'Di luar radius'} 
                      ({getAbsenInfo('masuk').radiusInfo?.distance}m)
                    </Text>
                  </View>
                </View>
              )}
            </View>
            <View style={styles.absenActions}>
              <TouchableOpacity 
                style={[
                  styles.absenBtn, 
                  getAbsenInfo('masuk').canAbsen && !isProcessing && styles.absenBtnActive,
                  isProcessing && selectedAbsen?.jenis === 'masuk' && styles.absenBtnProcessing
                ]}
                onPress={() => handleAbsen('masuk')}
                disabled={!getAbsenInfo('masuk').canAbsen || isProcessing}
              >
                <Ionicons 
                  name={isProcessing && selectedAbsen?.jenis === 'masuk' ? 'hourglass-outline' : 'camera'} 
                  size={18} 
                  color={getAbsenInfo('masuk').canAbsen && !isProcessing ? '#fff' : '#999'} 
                />
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
              
              {/* Indikator Radius */}
              {getAbsenInfo('pulang').radiusInfo && (
                <View style={styles.radiusIndicator}>
                  <View style={[
                    styles.radiusStatus,
                    { backgroundColor: getAbsenInfo('pulang').radiusInfo?.isWithin ? '#E8F5E8' : '#FFF0F0' }
                  ]}>
                    <View style={[
                      styles.radiusDot,
                      { backgroundColor: getAbsenInfo('pulang').radiusInfo?.isWithin ? '#4CAF50' : '#F44336' }
                    ]} />
                    <Text style={[
                      styles.radiusText,
                      { color: getAbsenInfo('pulang').radiusInfo?.isWithin ? '#4CAF50' : '#F44336' }
                    ]}>
                      {getAbsenInfo('pulang').radiusInfo?.isWithin ? 'Di dalam radius' : 'Di luar radius'} 
                      ({getAbsenInfo('pulang').radiusInfo?.distance}m)
                    </Text>
                  </View>
                </View>
              )}
            </View>
            <View style={styles.absenActions}>
              <TouchableOpacity 
                style={[
                  styles.absenBtn, 
                  getAbsenInfo('pulang').canAbsen && !isProcessing && styles.absenBtnActive,
                  isProcessing && selectedAbsen?.jenis === 'pulang' && styles.absenBtnProcessing
                ]}
                onPress={() => handleAbsen('pulang')}
                disabled={!getAbsenInfo('pulang').canAbsen || isProcessing}
              >
                <Ionicons 
                  name={isProcessing && selectedAbsen?.jenis === 'pulang' ? 'hourglass-outline' : 'camera'} 
                  size={18} 
                  color={getAbsenInfo('pulang').canAbsen && !isProcessing ? '#fff' : '#999'} 
                />
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
              <Text style={styles.totalJamValue}>{calculateTotalJam()}</Text>
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
              <Text style={styles.totalJamValue}>{calculateTotalJam()}</Text>
            </View>
          )}
        </View>

        {/* Lokasi Lembur - Dihapus karena otomatis deteksi */}
      </ScrollView>

      {/* Detail Absen Modal - Bottom Sheet */}
      <Modal visible={showDetailModal} transparent animationType="none" statusBarTranslucent onRequestClose={closeDetailModal}>
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={closeDetailModal} />
          <Animated.View style={[styles.detailModalContainer, { transform: [{ translateY: detailTranslateY }] }]}>
            <View {...detailPanResponder.panHandlers} style={styles.handleContainer}>
              <View style={styles.handleBar} />
            </View>
            
            <View style={styles.detailModalHeader}>
              <Text style={styles.detailModalTitle}>Detail Absen {detailAbsenData?.jenis === 'masuk' ? 'Masuk' : 'Pulang'}</Text>
            </View>
            
            <ScrollView style={styles.detailModalContent} showsVerticalScrollIndicator={false}>
              {/* Info Waktu */}
              <View style={styles.detailSection}>
                <View style={styles.sectionHeaderConfirm}>
                  <Ionicons name="time-outline" size={20} color="#004643" />
                  <Text style={styles.sectionTitleConfirm}>Waktu Absensi</Text>
                </View>
                
                <View style={styles.cardRow}>
                  <View style={styles.infoCardBox}>
                    <Text style={styles.cardBoxLabel}>JAM {detailAbsenData?.jenis === 'masuk' ? 'MASUK' : 'PULANG'}</Text>
                    <Text style={styles.cardBoxValue}>{detailAbsenData?.jam || '-'}</Text>
                  </View>
                  <View style={styles.infoCardBox}>
                    <Text style={styles.cardBoxLabel}>TANGGAL</Text>
                    <Text style={styles.cardBoxValue}>{formatDate(detailAbsenData?.tanggal || '')}</Text>
                  </View>
                </View>
              </View>
              
              {/* Info Lokasi */}
              {(detailAbsenData?.lintang && detailAbsenData?.bujur) && (
                <View style={styles.detailSection}>
                  <View style={styles.sectionHeaderConfirm}>
                    <Ionicons name="location-outline" size={20} color="#004643" />
                    <Text style={styles.sectionTitleConfirm}>Lokasi Absensi</Text>
                  </View>
                  
                  <View style={styles.cardRow}>
                    <View style={styles.infoCardBox}>
                      <Text style={styles.cardBoxLabel}>KOORDINAT {detailAbsenData?.jenis === 'masuk' ? 'MASUK' : 'PULANG'}</Text>
                      <Text style={styles.cardBoxValue}>{detailAbsenData.lintang?.toFixed(6)}, {detailAbsenData.bujur?.toFixed(6)}</Text>
                    </View>
                  </View>
                </View>
              )}
              
              {/* Face Confidence */}
              {detailAbsenData?.face_confidence && (
                <View style={styles.detailSection}>
                  <View style={styles.sectionHeaderConfirm}>
                    <Ionicons name="person-outline" size={20} color="#004643" />
                    <Text style={styles.sectionTitleConfirm}>Verifikasi Wajah</Text>
                  </View>
                  
                  <View style={styles.cardRow}>
                    <View style={styles.infoCardBox}>
                      <Text style={styles.cardBoxLabel}>TINGKAT KEMIRIPAN</Text>
                      <Text style={styles.cardBoxValue}>{detailAbsenData.face_confidence}%</Text>
                    </View>
                  </View>
                </View>
              )}
              
              {/* Foto Absen - Dipindah ke bawah */}
              {detailAbsenData?.foto && (
                <View style={styles.detailSection}>
                  <View style={styles.sectionHeaderConfirm}>
                    <Ionicons name="camera-outline" size={20} color="#004643" />
                    <Text style={styles.sectionTitleConfirm}>Foto Absen</Text>
                  </View>
                  <View style={styles.fotoContainer}>
                    <Image 
                      source={{ uri: `${getApiUrl('')}/uploads/lembur/${detailAbsenData.foto}` }} 
                      style={styles.fotoAbsen} 
                      resizeMode="cover" 
                    />
                  </View>
                </View>
              )}
            </ScrollView>
          </Animated.View>
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
  sectionTitleContainer: { alignItems: 'flex-start' },
  sectionTitle: { fontSize: 17, fontWeight: '800', color: '#1A1A1A', letterSpacing: -0.3, marginBottom: 8 },
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
  absenBtnProcessing: { backgroundColor: '#FF9800' },
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

  // Radius Indicator Styles
  radiusIndicator: {
    marginTop: 8,
  },
  radiusStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  radiusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  radiusText: {
    fontSize: 10,
    fontWeight: '600',
  },

  // Skeleton Styles
  skeletonText: { backgroundColor: '#E0E0E0', borderRadius: 4 },

  // Detail Modal Styles - Bottom Sheet
  detailModalContainer: {
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
  detailModalHeader: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  detailModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    textAlign: 'center',
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
    paddingHorizontal: 20,
    paddingBottom: 16,
    maxHeight: SCREEN_HEIGHT * 0.65,
  },
  detailSection: {
    marginBottom: 16,
  },
  sectionHeaderConfirm: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sectionTitleConfirm: {
    fontSize: 16,
    fontWeight: '700',
    color: '#004643',
  },
  cardRow: {
    flexDirection: 'row',
    gap: 12,
  },
  infoCardBox: {
    flex: 1,
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  cardBoxLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6B7280',
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  cardBoxValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  sectionDivider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginBottom: 12,
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