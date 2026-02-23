import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Alert, Dimensions, Animated, Platform, PanResponder } from 'react-native';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { PegawaiAPI, API_CONFIG } from '../../constants/config';
import AsyncStorage from '@react-native-async-storage/async-storage';
import PresensiMap from '../../components/PresensiMap';
import { AppHeader } from '../../components';

const { height: screenHeight, width: screenWidth } = Dimensions.get('window');

export default function PresensiScreen() {
  const [location, setLocation] = useState<any>(null);
  const [distance, setDistance] = useState<number>(0);
  const [availableLocations, setAvailableLocations] = useState<any[]>([]);
  const [nearestLocation, setNearestLocation] = useState<any>(null);
  const [isDinas, setIsDinas] = useState(false);
  const [dinasInfo, setDinasInfo] = useState<any>(null);
  const [dinasLokasi, setDinasLokasi] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [hasCheckedIn, setHasCheckedIn] = useState(false);
  const [checkInTime, setCheckInTime] = useState<string | null>(null);
  const [validationStatus, setValidationStatus] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [lastCheckedDate, setLastCheckedDate] = useState<string>('');
  const [izinHariIni, setIzinHariIni] = useState<any>(null);
  
  // State untuk collapsible panel
  const [panelHeight, setPanelHeight] = useState(screenHeight * 0.33);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const panelAnimation = useRef(new Animated.Value(screenHeight * 0.33)).current;
  const minHeight = 110;
  const maxHeight = screenHeight * 0.5;

  useEffect(() => {
    const todayDate = new Date().toISOString().split('T')[0];
    setLastCheckedDate(todayDate);
    
    fetchLocations();
    checkTodayAttendance();
    fetchIzinHariIni();
    
    const timer = setInterval(() => {
      const now = new Date();
      setCurrentTime(now);
      
      const currentDate = now.toISOString().split('T')[0];
      
      // Cek jika sudah berganti hari
      if (lastCheckedDate && lastCheckedDate !== currentDate) {
        console.log('🔄 Hari berganti dari', lastCheckedDate, 'ke', currentDate, '- Reset status absen');
        
        // Reset state dulu
        setHasCheckedIn(false);
        setCheckInTime(null);
        setValidationStatus(null);
        setLastCheckedDate(currentDate);
        
        // Tunggu sebentar baru cek attendance hari baru
        setTimeout(() => {
          checkTodayAttendance();
          fetchLocations();
        }, 100);
      }
    }, 1000);
    
    return () => clearInterval(timer);
  }, [lastCheckedDate]);

  // Panggil getCurrentLocation setelah availableLocations ter-set
  useEffect(() => {
    if (availableLocations.length > 0 && !location) {
      getCurrentLocation();
    }
  }, [availableLocations]);

  const checkTodayAttendance = async () => {
    try {
      const userData = await AsyncStorage.getItem('userData');
      if (!userData) return;
      
      const user = JSON.parse(userData);
      const userId = user.id_user || user.id;
      const today = new Date().toISOString().split('T')[0];
      
      console.log('🔍 Checking attendance for date:', today);
      
      // Cek di presensi biasa
      const response1 = await fetch(`${API_CONFIG.BASE_URL}/check-attendance.php?user_id=${userId}&date=${today}`);
      const data1 = await response1.json();
      
      console.log('📋 Presensi biasa:', data1);
      
      // Cek di absen dinas
      const response2 = await fetch(`${API_CONFIG.BASE_URL}/pegawai/presensi/api/check-dinas-attendance?user_id=${userId}&date=${today}`);
      const data2 = await response2.json();
      
      console.log('📋 Absen dinas:', data2);
      
      if ((data1.success && data1.has_checked_in) || (data2.success && data2.has_checked_in)) {
        console.log('✅ Sudah absen hari ini');
        setHasCheckedIn(true);
        setCheckInTime(data1.check_in_time || data2.check_in_time);
        setValidationStatus(data2.status_validasi || 'disetujui');
      } else {
        console.log('❌ Belum absen hari ini');
        setHasCheckedIn(false);
        setCheckInTime(null);
        setValidationStatus(null);
      }
    } catch (error) {
      console.error('Error checking attendance:', error);
    }
  };

  const fetchIzinHariIni = async () => {
    try {
      const userData = await AsyncStorage.getItem('userData');
      if (!userData) return;
      
      const user = JSON.parse(userData);
      const userId = user.id_user || user.id;
      const today = new Date().toISOString().split('T')[0];
      
      const response = await fetch(
        `${API_CONFIG.BASE_URL}/pegawai/pengajuan/api/pengajuan/izin-hari-ini?user_id=${userId}&tanggal=${today}`
      );
      const data = await response.json();
      
      if (data.success && Object.keys(data.data).length > 0) {
        setIzinHariIni(data.data);
      } else {
        setIzinHariIni(null);
      }
    } catch (error) {
      console.error('Error fetching izin hari ini:', error);
    }
  };

  const fetchLocations = async () => {
    try {
      const userData = await AsyncStorage.getItem('userData');
      if (!userData) {
        console.log('❌ No user data found');
        setLoading(false);
        return;
      }
      
      const user = JSON.parse(userData);
      const userId = user.id_user || user.id;
      const today = new Date().toISOString().split('T')[0];
      
      console.log('🔍 Checking dinas status for user:', userId, 'date:', today);
      
      // Panggil API check-dinas-status
      const response = await fetch(
        `${API_CONFIG.BASE_URL}/pegawai/presensi/api/check-dinas-status?user_id=${userId}&date=${today}`
      );
      const data = await response.json();
      
      console.log('📋 Dinas status response:', data);
      
      if (data.success) {
        // Set status dinas
        setIsDinas(data.is_dinas || false);
        setDinasInfo(data.dinas_info || null);
        setDinasLokasi(data.lokasi_valid || []);
        
        // Format data agar konsisten
        const formattedLocations = (data.lokasi_valid || []).map((loc: any) => ({
          id: loc.id,
          nama_lokasi: loc.nama_lokasi,
          alamat: loc.alamat,
          latitude: loc.latitude,
          longitude: loc.longitude,
          radius: loc.radius,
          jenis_lokasi: loc.jenis_lokasi,
          status: 'aktif',
          is_active: 1
        }));
        
        console.log('✅ Locations found:', formattedLocations.length);
        setAvailableLocations(formattedLocations);
        
        // Log info dinas
        if (data.is_dinas && data.dinas_info) {
          console.log('📋 Sedang dinas:', data.dinas_info.nama_kegiatan);
          console.log('📍 Lokasi dinas:', formattedLocations.map((l: any) => l.nama_lokasi).join(', '));
        } else {
          console.log('🏢 Tidak sedang dinas, absen di kantor');
        }
      } else {
        console.log('❌ API error:', data.message);
        setAvailableLocations([]);
      }
    } catch (error) {
      console.error('❌ Error fetching locations:', error);
      Alert.alert('Error', 'Gagal memuat data lokasi');
      setAvailableLocations([]);
    } finally {
      setLoading(false);
    }
  };

  const getCurrentLocation = async () => {
    try {
      console.log('📍 Requesting location permission...');
      let { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status !== 'granted') {
        console.log('❌ Location permission denied');
        Alert.alert('Izin Lokasi', 'Aplikasi memerlukan izin lokasi untuk absensi');
        return;
      }
      
      console.log('✅ Location permission granted, getting current position...');
      
      let currLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
        timeInterval: 5000,
        distanceInterval: 0,
      });
      
      console.log('📍 Current location:', currLocation.coords);
      
      setLocation(currLocation.coords);
      
      // Jika tidak sedang dinas, gunakan API detect-location untuk auto-detect kantor terdekat
      if (!isDinas) {
        await detectNearestOffice(currLocation.coords);
      } else if (availableLocations.length > 0) {
        console.log('🔄 Calculating distances to', availableLocations.length, 'locations');
        calculateDistances(currLocation.coords);
      }
    } catch (error) {
      console.error('❌ Error getting location:', error);
      
      try {
        console.log('🔄 Trying to get last known location...');
        const lastLocation = await Location.getLastKnownPositionAsync();
        
        if (lastLocation) {
          console.log('📍 Using last known location:', lastLocation.coords);
          setLocation(lastLocation.coords);
          
          if (!isDinas) {
            await detectNearestOffice(lastLocation.coords);
          } else if (availableLocations.length > 0) {
            calculateDistances(lastLocation.coords);
          }
          
          Alert.alert(
            'Lokasi Terakhir',
            'Menggunakan lokasi terakhir yang diketahui. Pastikan GPS aktif untuk lokasi terkini.',
            [{ text: 'OK' }]
          );
        } else {
          Alert.alert(
            'Error Lokasi',
            'Tidak dapat mendapatkan lokasi GPS. Pastikan:\n\n1. GPS/Location Services aktif\n2. Izin lokasi diberikan\n3. Anda berada di area terbuka',
            [{ text: 'Coba Lagi', onPress: getCurrentLocation }]
          );
        }
      } catch (fallbackError) {
        console.error('❌ Error getting last known location:', fallbackError);
        Alert.alert(
          'Error Lokasi',
          'Tidak dapat mendapatkan lokasi GPS. Pastikan:\n\n1. GPS/Location Services aktif\n2. Izin lokasi diberikan\n3. Anda berada di area terbuka',
          [{ text: 'Coba Lagi', onPress: getCurrentLocation }]
        );
      }
    }
  };

  const detectNearestOffice = async (userLocation: any) => {
    try {
      console.log('🔍 Detecting nearest office...');
      const result = await PegawaiAPI.detectNearestLocation(
        userLocation.latitude,
        userLocation.longitude
      );
      
      if (result.success && result.data) {
        const { nearest_office, all_offices } = result.data;
        
        console.log('✅ Nearest office:', nearest_office.nama_lokasi, 'Distance:', nearest_office.distance, 'm');
        
        // Ambil koordinat asli dari database untuk lokasi terdekat
        const officeCoords = await fetch(
          `${API_CONFIG.BASE_URL}/admin/pengaturan/api/lokasi-kantor`
        );
        const officeData = await officeCoords.json();
        
        if (officeData.success && officeData.data) {
          const nearestOfficeData = officeData.data.find((loc: any) => loc.id === nearest_office.id);
          
          if (nearestOfficeData) {
            // Set nearest location dengan koordinat asli dari database
            setNearestLocation({
              id: nearest_office.id,
              nama_lokasi: nearest_office.nama_lokasi,
              alamat: nearest_office.alamat,
              latitude: parseFloat(nearestOfficeData.lintang),
              longitude: parseFloat(nearestOfficeData.bujur),
              radius: nearest_office.radius,
              distance: nearest_office.distance,
              isValid: nearest_office.is_within_radius
            });
            
            setDistance(nearest_office.distance);
            
            // Set available locations dengan koordinat asli
            const formattedLocations = all_offices.map((office: any) => {
              const officeInfo = officeData.data.find((loc: any) => loc.id === office.id);
              return {
                id: office.id,
                nama_lokasi: office.nama_lokasi,
                alamat: office.alamat,
                latitude: officeInfo ? parseFloat(officeInfo.lintang) : userLocation.latitude,
                longitude: officeInfo ? parseFloat(officeInfo.bujur) : userLocation.longitude,
                radius: office.radius,
                distance: office.distance,
                isValid: office.is_within_radius
              };
            });
            
            setAvailableLocations(formattedLocations);
          }
        }
      } else {
        console.log('❌ Failed to detect nearest office:', result.message);
        Alert.alert('Error', result.message || 'Gagal mendeteksi lokasi kantor terdekat');
      }
    } catch (error) {
      console.error('❌ Error detecting nearest office:', error);
    }
  };

  const calculateDistances = (userLocation: any) => {
    if (!userLocation || !userLocation.latitude || !userLocation.longitude) {
      console.log('❌ Invalid user location:', userLocation);
      return;
    }
    
    if (availableLocations.length === 0) {
      console.log('❌ No available locations to calculate');
      return;
    }
    
    let minDistance = Infinity;
    let closest = null;
    
    console.log('🔄 Calculating distances for', availableLocations.length, 'locations');
    
    // Hitung jarak ke semua lokasi
    availableLocations.forEach((loc) => {
      const locLat = parseFloat(loc.latitude || loc.lintang);
      const locLng = parseFloat(loc.longitude || loc.bujur);
      
      if (isNaN(locLat) || isNaN(locLng)) {
        console.log('⚠️ Invalid location coordinates:', loc);
        return;
      }
      
      const dist = getDistance(
        userLocation.latitude,
        userLocation.longitude,
        locLat,
        locLng
      );
      
      const isValid = dist <= loc.radius;
      console.log(`📏 ${loc.nama_lokasi}: ${Math.round(dist)}m - ${isValid ? '✅ Valid' : '❌ Terlalu jauh'}`);
      
      // Tambahkan distance dan isValid ke object lokasi
      loc.distance = dist;
      loc.isValid = isValid;
      
      if (dist < minDistance) {
        minDistance = dist;
        closest = { ...loc, distance: dist, isValid };
      }
    });
    
    console.log('✅ Nearest location:', (closest as any)?.nama_lokasi, 'Distance:', Math.round(minDistance), 'm');
    
    setDistance(minDistance);
    setNearestLocation(closest);
  };

  useEffect(() => {
    if (location && availableLocations.length > 0) {
      calculateDistances(location);
    }
  }, [location, availableLocations]);

  const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371e3;
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  };

  const validateLocation = () => {
    if (!nearestLocation) return { valid: false, message: "Lokasi tidak dapat dideteksi" };
    
    const isInRange = distance <= nearestLocation.radius;
    
    if (!isInRange) {
      return { valid: false, message: `Anda berada di luar radius (${Math.round(distance)}m dari ${nearestLocation.nama_lokasi})` };
    }
    
    return { valid: true, message: "Lokasi valid" };
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dy) > 5;
      },
      onPanResponderMove: (_, gestureState) => {
        const newHeight = panelHeight - gestureState.dy;
        if (newHeight >= minHeight && newHeight <= maxHeight) {
          panelAnimation.setValue(newHeight);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        const newHeight = panelHeight - gestureState.dy;
        
        if (gestureState.dy > 50) {
          // Swipe down - collapse
          Animated.spring(panelAnimation, {
            toValue: minHeight,
            useNativeDriver: false,
            tension: 100,
            friction: 10,
          }).start();
          setPanelHeight(minHeight);
          setIsCollapsed(true);
        } else if (gestureState.dy < -50) {
          // Swipe up - expand
          Animated.spring(panelAnimation, {
            toValue: screenHeight * 0.4,
            useNativeDriver: false,
            tension: 100,
            friction: 10,
          }).start();
          setPanelHeight(screenHeight * 0.4);
          setIsCollapsed(false);
        } else {
          // Return to current state
          Animated.spring(panelAnimation, {
            toValue: panelHeight,
            useNativeDriver: false,
            tension: 100,
            friction: 10,
          }).start();
        }
      },
    })
  ).current;

  const handleAbsenMasuk = async () => {
    await takePhotoAndSubmit('masuk');
  };

  const handleAbsenPulang = async () => {
    await takePhotoAndSubmit('pulang');
  };

  const takePhotoAndSubmit = async (type: 'masuk' | 'pulang') => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Error', 'Izin kamera diperlukan');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false, // Tidak perlu crop manual
        quality: 0.6, // Kompres otomatis untuk hemat storage
      });

      if (!result.canceled) {
        await submitAttendance(type, result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert('Error', 'Gagal mengambil foto');
    }
  };

  const submitAttendance = async (type: 'masuk' | 'pulang', photoUri: string | null) => {
    setIsProcessing(true);
    
    try {
      const userData = await AsyncStorage.getItem('userData');
      if (!userData) {
        Alert.alert('Error', 'Data user tidak ditemukan');
        return;
      }
      
      const user = JSON.parse(userData);
      const userId = user.id_user || user.id;
      
      const formData = new FormData();
      formData.append('user_id', userId.toString());
      formData.append('jenis_presensi', type);
      formData.append('latitude', location.latitude.toString());
      formData.append('longitude', location.longitude.toString());
      formData.append('lokasi_id', nearestLocation.id.toString());
      
      if (photoUri) {
        const filename = photoUri.split('/').pop();
        const match = /\.([\w]+)$/.exec(filename || '');
        const fileType = match ? `image/${match[1]}` : 'image/jpeg';
        
        formData.append('foto', {
          uri: photoUri,
          name: filename || `${type}_${userId}_${Date.now()}.jpg`,
          type: fileType,
        } as any);
      }
      
      const endpoint = `${API_CONFIG.BASE_URL}/pegawai/presensi/api/presensi`;
      
      const response = await fetch(endpoint, {
        method: 'POST',
        body: formData,
      });
      
      const result = await response.json();
      
      if (result.success) {
        // Tampilkan pesan berbeda untuk dinas vs kantor
        if (result.status_validasi === 'menunggu') {
          Alert.alert(
            'Presensi Tercatat',
            `Absensi ${type} berhasil dicatat di ${result.nama_lokasi}.\n\nStatus: Menunggu Validasi Admin`,
            [{ text: 'OK' }]
          );
        } else {
          Alert.alert('Berhasil', `Absensi ${type} berhasil dicatat di ${result.nama_lokasi}`);
        }
        
        if (type === 'masuk') {
          setHasCheckedIn(true);
          setCheckInTime(new Date().toLocaleTimeString('id-ID'));
        }
      } else {
        Alert.alert('Error', result.message || 'Gagal mencatat absensi');
      }
    } catch (error) {
      Alert.alert('Error', 'Terjadi kesalahan: ' + (error as Error).message);
    } finally {
      setIsProcessing(false);
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('id-ID', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <AppHeader title="Presensi" showBack={false} />
        <View style={styles.loadingContainer}>
          <Text>Memuat data lokasi...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <AppHeader title="Presensi" showBack={false} />
      {/* Warning Overlay on Map */}
      {(() => {
        const validation = validateLocation();
        return !validation.valid ? (
          <View style={styles.mapWarningOverlay}>
            <View style={styles.mapWarningContainer}>
              <Ionicons name="warning" size={20} color="#fff" />
              <Text style={styles.mapWarningText}>{validation.message}</Text>
            </View>
          </View>
        ) : null;
      })()}

      <View style={[styles.mapContainer, { height: screenHeight - panelHeight - 90 }]}>
        <PresensiMap
          userLocation={location}
          locations={isDinas && dinasLokasi.length > 0 ? dinasLokasi.map(lokasi => {
            const lokasiLat = parseFloat(lokasi.latitude);
            const lokasiLng = parseFloat(lokasi.longitude);
            const jarak = location ? getDistance(
              location.latitude,
              location.longitude,
              lokasiLat,
              lokasiLng
            ) : 999999;
            const isInRadius = jarak <= lokasi.radius;
            
            return {
              latitude: lokasiLat,
              longitude: lokasiLng,
              radius: lokasi.radius,
              nama: lokasi.nama_lokasi,
              isInRadius
            };
          }) : undefined}
          officeLocation={!isDinas && nearestLocation ? {
            latitude: parseFloat(nearestLocation.latitude),
            longitude: parseFloat(nearestLocation.longitude),
            radius: nearestLocation.radius,
            nama: nearestLocation.nama_lokasi
          } : undefined}
          style={styles.map}
        />
      </View>

      <Animated.View style={[
        styles.panel, 
        { height: panelAnimation },
        isCollapsed && styles.panelCollapsed
      ]}>
        <View 
          {...panResponder.panHandlers}
          style={styles.handleContainer}
        >
          <View style={styles.handle} />
        </View>

        <View style={styles.panelContent}>
          {isCollapsed ? (
            <View style={styles.collapsedView}>
              <View style={styles.collapsedHeader}>
                <View style={styles.collapsedHeaderCenter}>
                  <Text style={styles.collapsedTime}>{formatTime(currentTime)}</Text>
                  <Text style={styles.collapsedDate}>{formatDate(currentTime)}</Text>
                </View>
                {isDinas && dinasInfo && (
                  <View style={styles.dinasCompactBadge}>
                    <Ionicons name="airplane" size={14} color="#2196F3" />
                    <Text style={styles.dinasCompactText}>Dinas</Text>
                  </View>
                )}
              </View>
            </View>
          ) : (
            // Expanded view - compact info
            <>
              <View style={styles.compactHeader}>
                <View style={styles.compactHeaderCenter}>
                  <Text style={styles.compactTime}>{formatTime(currentTime)}</Text>
                  <Text style={styles.compactDate}>{formatDate(currentTime)}</Text>
                </View>
                {isDinas && dinasInfo && (
                  <View style={styles.dinasCompactBadge}>
                    <Ionicons name="airplane" size={14} color="#2196F3" />
                    <Text style={styles.dinasCompactText}>Dinas</Text>
                  </View>
                )}
              </View>

              {/* Status Lokasi Compact */}
              <View style={styles.statusCompact}>
                {/* Info Izin Hari Ini */}
                {izinHariIni && (
                  <View style={styles.izinInfoCard}>
                    <View style={styles.izinInfoHeader}>
                      <Ionicons name="information-circle" size={16} color="#004643" />
                      <Text style={styles.izinInfoTitle}>Info Izin Hari Ini</Text>
                    </View>
                    {izinHariIni.izin_datang_terlambat && (
                      <View style={styles.izinItem}>
                        <Ionicons name="time-outline" size={16} color="#FF9800" />
                        <View style={styles.izinItemContent}>
                          <Text style={styles.izinItemLabel}>Izin Datang Terlambat</Text>
                          <Text style={styles.izinItemJam}>Jam izin: {izinHariIni.izin_datang_terlambat.jam}</Text>
                        </View>
                        <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />
                      </View>
                    )}
                    {izinHariIni.izin_pulang_cepat && (
                      <View style={styles.izinItem}>
                        <Ionicons name="exit-outline" size={16} color="#2196F3" />
                        <View style={styles.izinItemContent}>
                          <Text style={styles.izinItemLabel}>Izin Pulang Cepat</Text>
                          <Text style={styles.izinItemJam}>Jam izin: {izinHariIni.izin_pulang_cepat.jam}</Text>
                        </View>
                        <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />
                      </View>
                    )}
                  </View>
                )}
                
                {isDinas && dinasLokasi.length > 0 ? (
                  <>
                    {(() => {
                      const lokasiDalamRadius = dinasLokasi.filter(lokasi => {
                        const lokasiLat = parseFloat(lokasi.latitude);
                        const lokasiLng = parseFloat(lokasi.longitude);
                        const jarak = location ? getDistance(
                          location.latitude,
                          location.longitude,
                          lokasiLat,
                          lokasiLng
                        ) : 999999;
                        return jarak <= lokasi.radius;
                      });
                      
                      return (
                        <View style={styles.statusSummary}>
                          <Ionicons 
                            name={lokasiDalamRadius.length > 0 ? "checkmark-circle" : "close-circle"} 
                            size={20} 
                            color={lokasiDalamRadius.length > 0 ? "#4CAF50" : "#F44336"} 
                          />
                          <Text style={styles.statusSummaryText}>
                            {lokasiDalamRadius.length} dari {dinasLokasi.length} lokasi dalam radius
                          </Text>
                        </View>
                      );
                    })()}
                    <Text style={styles.statusHint}>Tap marker di map untuk detail lokasi</Text>
                  </>
                ) : (
                  <View style={styles.statusSummary}>
                    <Ionicons 
                      name={distance <= (nearestLocation?.radius || 0) ? "checkmark-circle" : "close-circle"} 
                      size={20} 
                      color={distance <= (nearestLocation?.radius || 0) ? "#4CAF50" : "#F44336"} 
                    />
                    <Text style={styles.statusSummaryText}>
                      {nearestLocation ? nearestLocation.nama_lokasi : 'Lokasi tidak terdeteksi'}
                    </Text>
                  </View>
                )}
              </View>

              {/* Button Absen - Lebih Besar */}
              <View style={styles.actionContainer}>
                {(() => {
                  const validation = validateLocation();
                  const isValidLocation = validation.valid;
                  
                  return (
                    <>
                      {!hasCheckedIn ? (
                        <TouchableOpacity 
                          style={[
                            styles.mainButton,
                            isValidLocation ? styles.checkInButton : styles.disabledButton
                          ]}
                          onPress={isValidLocation ? handleAbsenMasuk : undefined}
                          disabled={isProcessing || !isValidLocation}
                        >
                          <Ionicons 
                            name="camera" 
                            size={24} 
                            color={isValidLocation ? "#fff" : "#9E9E9E"}
                          />
                          <Text style={[
                            styles.mainButtonText,
                            isValidLocation ? styles.checkInButtonText : styles.disabledButtonText
                          ]}>
                            {isProcessing ? 'Memproses...' : 
                             isValidLocation ? 'Absen Masuk' : 'Tidak Bisa Absen'}
                          </Text>
                        </TouchableOpacity>
                      ) : (
                        <TouchableOpacity 
                          style={[
                            styles.mainButton,
                            isValidLocation ? styles.checkOutButton : styles.disabledButton
                          ]}
                          onPress={isValidLocation ? handleAbsenPulang : undefined}
                          disabled={isProcessing || !isValidLocation}
                        >
                          <Ionicons 
                            name="camera" 
                            size={24} 
                            color={isValidLocation ? "#fff" : "#9E9E9E"}
                          />
                          <Text style={[
                            styles.mainButtonText,
                            isValidLocation ? styles.checkOutButtonText : styles.disabledButtonText
                          ]}>
                            {isProcessing ? 'Memproses...' : 
                             isValidLocation ? 'Absen Pulang' : 'Tidak Bisa Absen'}
                          </Text>
                        </TouchableOpacity>
                      )}
                    </>
                  );
                })()}
              </View>

              {hasCheckedIn && checkInTime && (
                <View style={styles.checkInInfo}>
                  <View style={styles.checkInRow}>
                    <Text style={styles.checkInText}>Masuk: {checkInTime}</Text>
                    {validationStatus && (
                      <View style={[
                        styles.validationBadge,
                        validationStatus === 'disetujui' && styles.validationApproved,
                        validationStatus === 'menunggu' && styles.validationPending,
                        validationStatus === 'ditolak' && styles.validationRejected
                      ]}>
                        <Ionicons 
                          name={
                            validationStatus === 'disetujui' ? 'checkmark-circle' :
                            validationStatus === 'menunggu' ? 'time' : 'close-circle'
                          } 
                          size={14} 
                          color={
                            validationStatus === 'disetujui' ? '#4CAF50' :
                            validationStatus === 'menunggu' ? '#FF9800' : '#F44336'
                          } 
                        />
                        <Text style={[
                          styles.validationText,
                          validationStatus === 'disetujui' && styles.validationTextApproved,
                          validationStatus === 'menunggu' && styles.validationTextPending,
                          validationStatus === 'ditolak' && styles.validationTextRejected
                        ]}>
                          {validationStatus === 'disetujui' ? 'Disetujui' :
                           validationStatus === 'menunggu' ? 'Menunggu' : 'Ditolak'}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              )}
            </>
          )}
        </View>
      </Animated.View>


    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mapContainer: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  panel: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  panelCollapsed: {
    shadowOpacity: 0,
    elevation: 0,
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
  },
  handleContainer: {
    alignItems: 'center',
    paddingVertical: 12,
    justifyContent: 'center',
    cursor: 'grab',
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: '#DDD',
    borderRadius: 2,
  },
  panelContent: {
    flex: 1,
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  collapsedView: {
    paddingVertical: 8,
  },
  collapsedHeader: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  collapsedHeaderCenter: {
    alignItems: 'center',
  },
  collapsedTime: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  collapsedDate: {
    fontSize: 12,
    color: '#666',
  },
  compactHeader: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    position: 'relative',
  },
  compactHeaderCenter: {
    alignItems: 'center',
  },
  compactTime: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  compactDate: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  dinasCompactBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 4,
    position: 'absolute',
    right: 0,
  },
  dinasCompactText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2196F3',
  },
  statusCompact: {
    marginBottom: 12,
  },
  statusSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  statusSummaryText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  statusHint: {
    fontSize: 11,
    color: '#999',
    fontStyle: 'italic',
    marginLeft: 28,
  },
  headerInfo: {
    alignItems: 'center',
    marginBottom: 15,
  },
  dateText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  timeText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  statusContainer: {
    marginBottom: 6,
  },
  statusItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#666',
  },
  locationDetails: {
    flex: 1,
    marginLeft: 8,
  },
  locationName: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  locationAddress: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  actionContainer: {
    marginTop: 0,
    marginBottom: 8,
  },
  mapWarningOverlay: {
    position: 'absolute',
    top: 90,
    left: 16,
    right: 16,
    zIndex: 1000,
  },
  mapWarningContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F44336',
    padding: 12,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  mapWarningText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#fff',
    fontWeight: '500',
    flex: 1,
  },
  mainButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    paddingVertical: 18,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginVertical: 2,
  },
  buttonIcon: {
    marginRight: 8,
  },
  mainButtonText: {
    fontSize: 17,
    fontWeight: '600',
    marginLeft: 8,
  },
  checkInButton: {
    backgroundColor: '#4CAF50',
  },
  checkInButtonText: {
    color: '#fff',
  },
  checkOutButton: {
    backgroundColor: '#F44336',
  },
  checkOutButtonText: {
    color: '#fff',
  },
  disabledButton: {
    backgroundColor: '#F5F5F5',
  },
  disabledButtonText: {
    color: '#9E9E9E',
  },
  checkInInfo: {
    padding: 10,
    backgroundColor: '#E8F5E8',
    borderRadius: 8,
  },
  checkInRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  checkInText: {
    color: '#4CAF50',
    fontSize: 14,
    fontWeight: '500',
  },
  validationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  validationApproved: {
    backgroundColor: '#E8F5E9',
  },
  validationPending: {
    backgroundColor: '#FFF4E5',
  },
  validationRejected: {
    backgroundColor: '#FFEBEE',
  },
  validationText: {
    fontSize: 12,
    fontWeight: '600',
  },
  validationTextApproved: {
    color: '#4CAF50',
  },
  validationTextPending: {
    color: '#FF9800',
  },
  validationTextRejected: {
    color: '#F44336',
  },
  dinasInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 6,
  },
  dinasInfoText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2196F3',
  },
  lokasiDinasList: {
    gap: 12,
  },
  lokasiDinasItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#fff',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  lokasiInfo: {
    flex: 1,
    marginLeft: 10,
  },
  lokasiNama: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  lokasiAlamat: {
    fontSize: 11,
    color: '#666',
    marginBottom: 4,
  },
  statusRadius: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statusRadiusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  izinInfoCard: {
    backgroundColor: '#E6F0EF',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#004643',
  },
  izinInfoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  izinInfoTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#004643',
  },
  izinItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 6,
  },
  izinItemContent: {
    flex: 1,
  },
  izinItemLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
  },
  izinItemJam: {
    fontSize: 11,
    color: '#666',
    marginTop: 2,
  },
});