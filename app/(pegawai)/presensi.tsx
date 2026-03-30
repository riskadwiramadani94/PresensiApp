import React, { useState, useEffect, useRef, useCallback } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Dimensions, Platform, Animated, PanResponder } from 'react-native';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { PegawaiAPI, API_CONFIG } from '../../constants/config';
import AsyncStorage from '@react-native-async-storage/async-storage';
import PresensiMap from '../../components/PresensiMap';
import { AppHeader, CustomAlert } from '../../components';
import { useCustomAlert } from '../../hooks/useCustomAlert';
import { usePresensiCard } from '../../contexts/PresensiCardContext';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
const BUBBLE_SIZE = 56;
const TAB_BAR_HEIGHT = Platform.OS === 'ios' ? 90 : 80;
const BUBBLE_MAX_Y = screenHeight - BUBBLE_SIZE - TAB_BAR_HEIGHT - 16;

export default function PresensiScreen() {
  const alert = useCustomAlert();
  const router = useRouter();
  const { isCardCollapsed, setIsCardCollapsed, openTrigger } = usePresensiCard();

  useEffect(() => {
    if (isCardCollapsed) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, { toValue: 1, duration: 900, useNativeDriver: true }),
          Animated.timing(glowAnim, { toValue: 0.3, duration: 900, useNativeDriver: true }),
        ])
      ).start();
    } else {
      glowAnim.stopAnimation();
      glowAnim.setValue(0);
    }
  }, [isCardCollapsed]);

  const [location, setLocation] = useState<any>(null);
  const [distance, setDistance] = useState<number>(0);
  const [availableLocations, setAvailableLocations] = useState<any[]>([]);
  const [nearestLocation, setNearestLocation] = useState<any>(null);
  const [isDinas, setIsDinas] = useState(false);
  const [dinasInfo, setDinasInfo] = useState<any>(null);
  const [dinasLokasi, setDinasLokasi] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasCheckedIn, setHasCheckedIn] = useState(false);
  const [hasCheckedOut, setHasCheckedOut] = useState(false);
  const [checkInTime, setCheckInTime] = useState<string | null>(null);
  const [checkOutTime, setCheckOutTime] = useState<string | null>(null);
  const [validationStatus, setValidationStatus] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [lastCheckedDate, setLastCheckedDate] = useState<string>('');
  const [izinHariIni, setIzinHariIni] = useState<any>(null);
  const [isHoliday, setIsHoliday] = useState(false);
  const [holidayReason, setHolidayReason] = useState<string>('');
  const [isWorkDay, setIsWorkDay] = useState(true);

  // collapseAnim: untuk width/height/borderRadius/bottom (tidak bisa native driver)
  const collapseAnim = useRef(new Animated.Value(1)).current;
  // glowAnim: untuk opacity/scale glow (bisa native driver)
  const glowAnim = useRef(new Animated.Value(0)).current;
  const bubblePos = useRef(new Animated.ValueXY({ x: screenWidth - BUBBLE_SIZE - 20, y: BUBBLE_MAX_Y })).current;
  const bubblePosRef = useRef({ x: screenWidth - BUBBLE_SIZE - 20, y: BUBBLE_MAX_Y });
  const isDragging = useRef(false);

  const bubblePanResponder = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 3 || Math.abs(g.dy) > 3,
    onPanResponderGrant: () => { isDragging.current = false; },
    onPanResponderMove: (_, g) => {
      isDragging.current = true;
      const newX = Math.max(0, Math.min(bubblePosRef.current.x + g.dx, screenWidth - BUBBLE_SIZE));
      const newY = Math.max(80, Math.min(bubblePosRef.current.y + g.dy, BUBBLE_MAX_Y));
      bubblePos.setValue({ x: newX, y: newY });
    },
    onPanResponderRelease: (_, g) => {
      const newX = Math.max(0, Math.min(bubblePosRef.current.x + g.dx, screenWidth - BUBBLE_SIZE));
      const newY = Math.max(80, Math.min(bubblePosRef.current.y + g.dy, BUBBLE_MAX_Y));
      const snapX = newX + BUBBLE_SIZE / 2 < screenWidth / 2 ? 20 : screenWidth - BUBBLE_SIZE - 20;
      bubblePosRef.current = { x: snapX, y: newY };
      Animated.spring(bubblePos, {
        toValue: { x: snapX, y: newY },
        useNativeDriver: false,
        tension: 60,
        friction: 10,
      }).start();
      if (!isDragging.current) openCard();
    },
  })).current;

  useEffect(() => {
    const todayDate = new Date().toISOString().split('T')[0];
    setLastCheckedDate(todayDate);
    fetchLocations();
    checkTodayAttendance();
    fetchIzinHariIni();
    checkWorkDay();

    const refreshInterval = setInterval(() => checkTodayAttendance(), 30000);
    const timer = setInterval(() => {
      const now = new Date();
      setCurrentTime(now);
      const currentDate = now.toISOString().split('T')[0];
      if (lastCheckedDate && lastCheckedDate !== currentDate) {
        setHasCheckedIn(false); setHasCheckedOut(false);
        setCheckInTime(null); setCheckOutTime(null);
        setValidationStatus(null); setLastCheckedDate(currentDate);
        setTimeout(() => { checkTodayAttendance(); fetchLocations(); checkWorkDay(); }, 100);
      }
    }, 1000);

    return () => { clearInterval(timer); clearInterval(refreshInterval); };
  }, [lastCheckedDate]);

  // Setiap kali tab presensi diklik (termasuk saat card collapsed), buka card
  useEffect(() => {
    if (openTrigger === 0) return;
    openCard();
  }, [openTrigger]);

  useEffect(() => {
    if (availableLocations.length > 0 && !location) getCurrentLocation();
  }, [availableLocations]);

  useEffect(() => {
    if (location && availableLocations.length > 0) calculateDistances(location);
  }, [location, availableLocations]);

  const collapseCard = () => {
    Animated.spring(collapseAnim, {
      toValue: 0,
      useNativeDriver: false,
      tension: 70,
      friction: 10,
    }).start(() => setIsCardCollapsed(true));
  };

  const openCard = () => {
    setIsCardCollapsed(false);
    collapseAnim.setValue(0);
    Animated.spring(collapseAnim, {
      toValue: 1,
      useNativeDriver: false,
      tension: 55,
      friction: 9,
    }).start();
  };

  const checkTodayAttendance = async () => {
    try {
      const userData = await AsyncStorage.getItem('userData');
      if (!userData) return;
      const user = JSON.parse(userData);
      const userId = user.id_user || user.id;
      const today = new Date().toISOString().split('T')[0];

      const [response1, response2raw] = await Promise.all([
        PegawaiAPI.getPresensi(userId.toString(), today),
        fetch(`${API_CONFIG.BASE_URL}/pegawai/presensi/api/check-dinas-attendance?user_id=${userId}&date=${today}`)
      ]);
      const data2 = await response2raw.json();

      const hasPresensi = response1.success && response1.data?.presensi_hari_ini?.jam_masuk;
      const hasPresensiPulang = response1.success && response1.data?.presensi_hari_ini?.jam_pulang;
      const hasDinas = data2.success && data2.has_checked_in;
      const hasDinasPulang = data2.success && data2.has_checked_out;

      if (hasPresensi || hasDinas) {
        setHasCheckedIn(true);
        if (hasDinas) { setCheckInTime(data2.check_in_time); setValidationStatus(data2.status_validasi || 'menunggu'); }
        else { const j = response1.data.presensi_hari_ini.jam_masuk; setCheckInTime(j.length > 8 ? j.substring(0, 8) : j); setValidationStatus(response1.data.presensi_hari_ini.status_validasi || 'disetujui'); }
      } else { setHasCheckedIn(false); setCheckInTime(null); setValidationStatus(null); }

      if (hasPresensiPulang || hasDinasPulang) {
        setHasCheckedOut(true);
        if (hasPresensiPulang) { const j = response1.data.presensi_hari_ini.jam_pulang; setCheckOutTime(j.length > 8 ? j.substring(0, 8) : j); }
        else setCheckOutTime(data2.check_out_time);
      } else { setHasCheckedOut(false); setCheckOutTime(null); }
    } catch { setHasCheckedIn(false); setHasCheckedOut(false); setCheckInTime(null); setCheckOutTime(null); setValidationStatus(null); }
  };

  const fetchIzinHariIni = async () => {
    try {
      const userData = await AsyncStorage.getItem('userData');
      if (!userData) return;
      const user = JSON.parse(userData);
      const userId = user.id_user || user.id;
      const today = new Date().toISOString().split('T')[0];
      const response = await fetch(`${API_CONFIG.BASE_URL}/pegawai/pengajuan/api/pengajuan/izin-hari-ini?user_id=${userId}&tanggal=${today}`);
      const data = await response.json();
      setIzinHariIni(data.success && Object.keys(data.data).length > 0 ? data.data : null);
    } catch {}
  };

  const checkWorkDay = async () => {
    try {
      const userData = await AsyncStorage.getItem('userData');
      if (!userData) return;
      const user = JSON.parse(userData);
      const userId = user.id_user || user.id;
      const today = new Date().toISOString().split('T')[0];
      const response = await fetch(`${API_CONFIG.BASE_URL}/pegawai/presensi/api/check-work-day?user_id=${userId}&date=${today}`);
      const data = await response.json();
      if (data.success) { setIsWorkDay(data.is_work_day); setIsHoliday(data.is_holiday || !data.is_work_day); setHolidayReason(data.reason || ''); }
    } catch {}
  };

  const fetchLocations = async () => {
    try {
      const userData = await AsyncStorage.getItem('userData');
      if (!userData) { setLoading(false); return; }
      const user = JSON.parse(userData);
      const userId = user.id_user || user.id;
      const today = new Date().toISOString().split('T')[0];
      const response = await fetch(`${API_CONFIG.BASE_URL}/pegawai/presensi/api/check-dinas-status?user_id=${userId}&date=${today}`);
      const data = await response.json();
      if (data.success) {
        setIsDinas(data.is_dinas || false);
        setDinasInfo(data.dinas_info || null);
        setDinasLokasi(data.lokasi_valid || []);
        setAvailableLocations((data.lokasi_valid || []).map((loc: any) => ({ ...loc, status: 'aktif', is_active: 1 })));
      } else setAvailableLocations([]);
    } catch { alert.showAlert({ type: 'error', message: 'Gagal memuat data lokasi' }); setAvailableLocations([]); }
    finally { setLoading(false); }
  };

  const getCurrentLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') { alert.showAlert({ type: 'warning', message: 'Aplikasi memerlukan izin lokasi untuk absensi' }); return; }
      const currLocation = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setLocation(currLocation.coords);
      if (!isDinas) await detectNearestOffice(currLocation.coords);
      else if (availableLocations.length > 0) calculateDistances(currLocation.coords);
    } catch {
      const lastLocation = await Location.getLastKnownPositionAsync().catch(() => null);
      if (lastLocation) { setLocation(lastLocation.coords); if (!isDinas) detectNearestOffice(lastLocation.coords); else calculateDistances(lastLocation.coords); }
    }
  };

  const detectNearestOffice = async (userLocation: any) => {
    try {
      const result = await PegawaiAPI.detectNearestLocation(userLocation.latitude, userLocation.longitude);
      if (result.success && result.data) {
        const { nearest_office, all_offices } = result.data;
        const officeCoords = await fetch(`${API_CONFIG.BASE_URL}/admin/pengaturan/api/lokasi-kantor`);
        const officeData = await officeCoords.json();
        if (officeData.success && officeData.data) {
          const nearestOfficeData = officeData.data.find((loc: any) => loc.id === nearest_office.id);
          if (nearestOfficeData) {
            setNearestLocation({ id: nearest_office.id, nama_lokasi: nearest_office.nama_lokasi, latitude: parseFloat(nearestOfficeData.lintang), longitude: parseFloat(nearestOfficeData.bujur), radius: nearest_office.radius, distance: nearest_office.distance, isValid: nearest_office.is_within_radius });
            setDistance(nearest_office.distance);
            setAvailableLocations(all_offices.map((office: any) => { const info = officeData.data.find((loc: any) => loc.id === office.id); return { id: office.id, nama_lokasi: office.nama_lokasi, latitude: info ? parseFloat(info.lintang) : userLocation.latitude, longitude: info ? parseFloat(info.bujur) : userLocation.longitude, radius: office.radius, distance: office.distance, isValid: office.is_within_radius }; }));
          }
        }
      }
    } catch {}
  };

  const calculateDistances = (userLocation: any) => {
    if (!userLocation || availableLocations.length === 0) return;
    let minDistance = Infinity, closest = null;
    availableLocations.forEach((loc) => {
      const locLat = parseFloat(loc.latitude || loc.lintang);
      const locLng = parseFloat(loc.longitude || loc.bujur);
      if (isNaN(locLat) || isNaN(locLng)) return;
      const dist = getDistance(userLocation.latitude, userLocation.longitude, locLat, locLng);
      loc.distance = dist; loc.isValid = dist <= loc.radius;
      if (dist < minDistance) { minDistance = dist; closest = { ...loc, distance: dist, isValid: dist <= loc.radius }; }
    });
    setDistance(minDistance); setNearestLocation(closest);
  };

  const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371e3, φ1 = lat1 * Math.PI / 180, φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180, Δλ = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(Δφ/2)**2 + Math.cos(φ1)*Math.cos(φ2)*Math.sin(Δλ/2)**2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  };

  const isLocationValid = () => {
    if (!nearestLocation) return false;
    if (isDinas && dinasLokasi.length > 0) return dinasLokasi.some(l => location && getDistance(location.latitude, location.longitude, parseFloat(l.latitude), parseFloat(l.longitude)) <= l.radius);
    return distance <= (nearestLocation?.radius || 0);
  };

  const handleAbsenMasuk = async () => {
    try {
      const now = new Date();
      const hari = ['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'][now.getDay()];
      const jamKerjaRes = await fetch(`${API_CONFIG.BASE_URL}/admin/pengaturan/api/jam-kerja`);
      const jamKerjaData = await jamKerjaRes.json();
      let jamMasuk = '08:00:00';
      if (jamKerjaData.success) { const h = jamKerjaData.data?.find((h: any) => h.hari === hari); if (h) jamMasuk = h.jam_masuk; }

      // Hitung batas awal absen = jam masuk - 1 jam
      const [hh, mm] = jamMasuk.split(':').map(Number);
      const totalMenit = hh * 60 + mm - 60;
      const batasAwal = `${String(Math.floor(totalMenit / 60)).padStart(2, '0')}:${String(totalMenit % 60).padStart(2, '0')}:00`;

      const currentTimeStr = now.toTimeString().slice(0, 8);
      if (currentTimeStr < batasAwal) {
        const today = now.toISOString().split('T')[0];
        const userData = await AsyncStorage.getItem('userData');
        const user = userData ? JSON.parse(userData) : null;
        const userId = user?.id_user || user?.id;
        const izinRes = await fetch(`${API_CONFIG.BASE_URL}/pegawai/pengajuan/api/pengajuan/izin-hari-ini?user_id=${userId}&tanggal=${today}`);
        const izinData = await izinRes.json();
        if (izinData.success && izinData.data?.izin_datang_terlambat) {
          // Ada izin terlambat → boleh absen
        } else {
          alert.showAlert({ type: 'warning', message: `Belum waktunya absen masuk. Absen dibuka jam ${batasAwal.slice(0, 5)}` });
          return;
        }
      }
    } catch {}
    router.push({ pathname: '/absen-face', params: { jenis: 'masuk' } } as any);
  };

  const handleAbsenPulang = async () => {
    try {
      const userData = await AsyncStorage.getItem('userData');
      if (!userData) return;
      const user = JSON.parse(userData);
      const userId = user.id_user || user.id;
      const now = new Date();
      const hari = ['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'][now.getDay()];
      const jamKerjaRes = await fetch(`${API_CONFIG.BASE_URL}/admin/pengaturan/api/jam-kerja`);
      const jamKerjaData = await jamKerjaRes.json();
      let jamPulang = '17:00:00';
      if (jamKerjaData.success) { const h = jamKerjaData.data?.find((h: any) => h.hari === hari); if (h) jamPulang = h.jam_pulang; }
      const currentTimeStr = now.toTimeString().slice(0, 8);
      if (currentTimeStr < jamPulang) {
        const today = now.toISOString().split('T')[0];
        const izinRes = await fetch(`${API_CONFIG.BASE_URL}/pegawai/pengajuan/api/pengajuan/izin-hari-ini?user_id=${userId}&tanggal=${today}`);
        const izinData = await izinRes.json();
        if (izinData.success && izinData.data?.izin_pulang_cepat) {
          const jamIzin = izinData.data.izin_pulang_cepat.jam + ':00';
          if (currentTimeStr < jamIzin) { alert.showAlert({ type: 'warning', message: `Belum waktunya absen pulang. Jam pulang: ${jamPulang.slice(0, 5)}` }); return; }
        } else { alert.showAlert({ type: 'warning', message: `Belum waktunya absen pulang. Jam pulang: ${jamPulang.slice(0, 5)}` }); return; }
      }
    } catch {}
    router.push({ pathname: '/absen-face', params: { jenis: 'pulang' } } as any);
  };

  const formatTime = (date: Date) => date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const formatDate = (date: Date) => date.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  const validLoc = isLocationValid();

  // Animasi: card menyusut ke pojok kanan bawah (posisi bubble)
  const cardWidth = screenWidth - 32; // left:16 + right:16
  const cardStyle = {
    opacity: collapseAnim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, 0.6, 1] }),
    transform: [
      {
        translateX: collapseAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [cardWidth / 2 - 12, 0], // geser ke kanan menuju pojok kanan
        }),
      },
      {
        translateY: collapseAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [80, 0], // geser sedikit ke bawah
        }),
      },
      {
        scale: collapseAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [0.05, 1],
        }),
      },
    ],
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <AppHeader title="Presensi" showBack={false} />
        <View style={styles.loadingContainer}><Text>Memuat data lokasi...</Text></View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <AppHeader title="Presensi" showBack={false} />

      {/* Peta Full Screen */}
      <View style={styles.mapContainer}>
        <PresensiMap
          userLocation={location}
          locations={isDinas && dinasLokasi.length > 0 ? dinasLokasi.map(lokasi => {
            const lat = parseFloat(lokasi.latitude), lng = parseFloat(lokasi.longitude);
            const jarak = location ? getDistance(location.latitude, location.longitude, lat, lng) : 999999;
            return { latitude: lat, longitude: lng, radius: lokasi.radius, nama: lokasi.nama_lokasi, isInRadius: jarak <= lokasi.radius };
          }) : undefined}
          officeLocation={!isDinas && nearestLocation ? { latitude: parseFloat(nearestLocation.latitude), longitude: parseFloat(nearestLocation.longitude), radius: nearestLocation.radius, nama: nearestLocation.nama_lokasi } : undefined}
          style={{ flex: 1 }}
        />
      </View>

      {/* Floating Card dengan animasi collapse ke navbar */}
      <Animated.View style={[styles.floatingCard, cardStyle]}>
        {/* Tombol collapse pojok kiri atas */}
        <TouchableOpacity
          onPress={collapseCard}
          activeOpacity={0.7}
          style={{ position: 'absolute', top: -10, left: -10, zIndex: 10 }}
        >
          <Ionicons name="remove-circle" size={26} color="#bbb" />
        </TouchableOpacity>

        {/* Header jam + status lokasi sejajar */}
        <View style={styles.cardHeader}>
          <Text style={styles.timeText}>{formatTime(currentTime)}</Text>
          <View style={styles.locationRow}>
            <Ionicons name={validLoc ? 'checkmark-circle' : 'close-circle'} size={16} color={validLoc ? '#4CAF50' : '#F44336'} />
            <Text style={[styles.locationText, { color: validLoc ? '#4CAF50' : '#F44336' }]} numberOfLines={1}>
              {isDinas
                ? `Dinas • ${Math.round(distance)}m`
                : nearestLocation
                  ? `${nearestLocation.nama_lokasi} • ${Math.round(distance)}m`
                  : 'Mendeteksi...'}
            </Text>
          </View>
        </View>

        <Text style={styles.dateText}>{formatDate(currentTime)}</Text>

        {/* Keterangan dinas / izin - hanya tampil kalau ada */}
        {(isDinas || izinHariIni) && (
          <>
            <View style={styles.divider} />
            {isDinas && (
              <View style={styles.keteranganRow}>
                <Ionicons name="briefcase-outline" size={13} color="#2196F3" />
                <Text style={styles.keteranganText}>
                  {(() => {
                    const total = dinasLokasi.length;
                    const dalamRadius = dinasLokasi.filter(l =>
                      location && getDistance(location.latitude, location.longitude, parseFloat(l.latitude), parseFloat(l.longitude)) <= l.radius
                    ).length;
                    return `${dalamRadius} dari ${total} lokasi dalam radius ✓`;
                  })()}
                </Text>
              </View>
            )}
            {izinHariIni?.izin_datang_terlambat && (
              <View style={styles.keteranganRow}>
                <Ionicons name="time-outline" size={13} color="#FF9800" />
                <Text style={styles.keteranganText}>Izin terlambat: {izinHariIni.izin_datang_terlambat.jam}</Text>
              </View>
            )}
            {izinHariIni?.izin_pulang_cepat && (
              <View style={styles.keteranganRow}>
                <Ionicons name="exit-outline" size={13} color="#FF9800" />
                <Text style={styles.keteranganText}>Izin pulang cepat: {izinHariIni.izin_pulang_cepat.jam}</Text>
              </View>
            )}
          </>
        )}

        <View style={styles.divider} />

        {/* Tombol Absen */}
        {isHoliday ? (
          <View style={styles.holidayBox}>
            <Ionicons name="calendar-outline" size={24} color="#999" />
            <View style={{ flex: 1 }}>
              <Text style={styles.holidayTitle}>Hari Libur</Text>
              <Text style={styles.holidayReason}>{holidayReason}</Text>
            </View>
          </View>
        ) : hasCheckedOut ? (
          <View style={styles.doneBox}>
            <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
            <View style={{ flex: 1 }}>
              <Text style={styles.doneTitle}>Absensi Selesai</Text>
              <Text style={styles.doneSubtitle}>Masuk: {checkInTime?.slice(0,5)} • Pulang: {checkOutTime?.slice(0,5)}</Text>
            </View>
          </View>
        ) : !hasCheckedIn ? (
          <TouchableOpacity
            style={[styles.absenBtn, { backgroundColor: validLoc ? '#4CAF50' : '#E0E0E0' }]}
            onPress={validLoc ? handleAbsenMasuk : undefined}
            disabled={!validLoc}
          >
            <Ionicons name="scan" size={22} color={validLoc ? '#fff' : '#9E9E9E'} />
            <Text style={[styles.absenBtnText, { color: validLoc ? '#fff' : '#9E9E9E' }]}>
              {validLoc ? 'Absen Masuk' : 'Di Luar Radius'}
            </Text>
          </TouchableOpacity>
        ) : (
          <>
            <View style={styles.checkedInInfo}>
              <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />
              <Text style={styles.checkedInText}>Masuk: {checkInTime?.slice(0,5)}</Text>
              {validationStatus && (
                <View style={[styles.valBadge, validationStatus === 'disetujui' ? styles.valApproved : validationStatus === 'menunggu' ? styles.valPending : styles.valRejected]}>
                  <Text style={styles.valText}>{validationStatus === 'disetujui' ? 'Disetujui' : validationStatus === 'menunggu' ? 'Menunggu' : 'Ditolak'}</Text>
                </View>
              )}
            </View>
            <TouchableOpacity
              style={[styles.absenBtn, { backgroundColor: validLoc ? '#F44336' : '#E0E0E0', marginTop: 8 }]}
              onPress={validLoc ? handleAbsenPulang : undefined}
              disabled={!validLoc}
            >
              <Ionicons name="scan" size={22} color={validLoc ? '#fff' : '#9E9E9E'} />
              <Text style={[styles.absenBtnText, { color: validLoc ? '#fff' : '#9E9E9E' }]}>
                {validLoc ? 'Absen Pulang' : 'Di Luar Radius'}
              </Text>
            </TouchableOpacity>
          </>
        )}
      </Animated.View>

      {/* Bubble draggable saat card collapsed */}
      {isCardCollapsed && (
        <Animated.View
          style={{
            position: 'absolute',
            left: bubblePos.x,
            top: bubblePos.y,
            width: BUBBLE_SIZE,
            height: BUBBLE_SIZE,
            borderRadius: BUBBLE_SIZE / 2,
            backgroundColor: '#2d7a47',
            justifyContent: 'center',
            alignItems: 'center',
            elevation: 10,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 6,
          }}
          {...bubblePanResponder.panHandlers}
        >
          <Animated.View style={{
            position: 'absolute',
            width: BUBBLE_SIZE,
            height: BUBBLE_SIZE,
            borderRadius: BUBBLE_SIZE / 2,
            borderWidth: 2.5,
            borderColor: '#4ade80',
            opacity: glowAnim,
            transform: [{ scale: glowAnim.interpolate({ inputRange: [0.3, 1], outputRange: [1, 1.4] }) }],
          }} />
          <Animated.View style={{
            position: 'absolute',
            width: BUBBLE_SIZE,
            height: BUBBLE_SIZE,
            borderRadius: BUBBLE_SIZE / 2,
            borderWidth: 1.5,
            borderColor: '#86efac',
            opacity: glowAnim.interpolate({ inputRange: [0.3, 1], outputRange: [0.1, 0.4] }),
            transform: [{ scale: glowAnim.interpolate({ inputRange: [0.3, 1], outputRange: [1.4, 1.8] }) }],
          }} />
          <Ionicons name="chevron-up-circle" size={30} color="#fff" style={{ transform: [{ rotate: '-45deg' }] }} />
        </Animated.View>
      )}

      <CustomAlert
        visible={alert.visible}
        type={alert.config.type}
        title={alert.config.title}
        message={alert.config.message}
        onClose={alert.hideAlert}
        onConfirm={alert.handleConfirm}
        confirmText={alert.config.confirmText}
        cancelText={alert.config.cancelText}
        autoClose={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  mapContainer: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 88 : 80,
    left: 0, right: 0, bottom: 0,
  },
  floatingCard: {
    position: 'absolute',
    bottom: 20,
    left: 16,
    right: 16,
    backgroundColor: 'rgba(255,255,255,0.96)',
    borderRadius: 20,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  timeText: { fontSize: 28, fontWeight: '700', color: '#1A1A1A', letterSpacing: -0.5 },
  dateText: { fontSize: 13, color: '#666', marginTop: 2, marginBottom: 4 },
  dinasBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#E3F2FD', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
  dinasBadgeText: { fontSize: 12, fontWeight: '600', color: '#2196F3' },
  divider: { height: 1, backgroundColor: '#F0F0F0', marginVertical: 10 },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  locationText: { fontSize: 12, fontWeight: '600', textAlign: 'right' },
  keteranganRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  keteranganText: { fontSize: 12, color: '#555', flex: 1 },
  izinBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#E6F0EF', padding: 8, borderRadius: 8, marginTop: 6 },
  izinText: { fontSize: 12, color: '#004643', flex: 1 },
  absenBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16, borderRadius: 14 },
  absenBtnText: { fontSize: 17, fontWeight: '700' },
  holidayBox: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#F5F5F5', padding: 12, borderRadius: 12 },
  holidayTitle: { fontSize: 14, fontWeight: '700', color: '#666' },
  holidayReason: { fontSize: 12, color: '#999', marginTop: 2 },
  doneBox: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#F0FFF4', padding: 12, borderRadius: 12 },
  doneTitle: { fontSize: 14, fontWeight: '700', color: '#4CAF50' },
  doneSubtitle: { fontSize: 12, color: '#666', marginTop: 2 },
  checkedInInfo: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#F0FFF4', padding: 10, borderRadius: 10 },
  checkedInText: { fontSize: 13, fontWeight: '600', color: '#4CAF50', flex: 1 },
  valBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  valApproved: { backgroundColor: '#E8F5E9' },
  valPending: { backgroundColor: '#FFF4E5' },
  valRejected: { backgroundColor: '#FFEBEE' },
  valText: { fontSize: 11, fontWeight: '600', color: '#333' },
});
