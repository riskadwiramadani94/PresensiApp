import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, RefreshControl, Modal, Image } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import { AppHeader } from '../../../components';
import { getApiUrl } from '../../../constants/config';

type TabType = 'absen' | 'riwayat';

interface AbsenLembur {
  id_absen_lembur: number;
  id_pengajuan: number;
  tanggal: string;
  jam_masuk: string | null;
  jam_pulang: string | null;
  jam_rencana_mulai: string;
  jam_rencana_selesai: string;
  total_jam: number | null;
  lokasi_detail: string;
  latitude: number;
  longitude: number;
  radius: number;
  status: 'masuk' | 'selesai';
}

export default function LemburScreen() {
  const [activeTab, setActiveTab] = useState<TabType>('absen');
  const [userId, setUserId] = useState<string>('');
  const [refreshing, setRefreshing] = useState(false);
  const [userLocation, setUserLocation] = useState<any>(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [photoUri, setPhotoUri] = useState('');
  const [selectedAbsen, setSelectedAbsen] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const [absenList, setAbsenList] = useState<AbsenLembur[]>([]);
  const [riwayatList, setRiwayatList] = useState<AbsenLembur[]>([]);
  const [pengajuanList, setPengajuanList] = useState<any[]>([]);

  useEffect(() => {
    loadUserId();
    getCurrentLocation();
  }, []);

  useEffect(() => {
    if (userId) {
      fetchData();
    }
  }, [userId, activeTab]);

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

  const fetchData = async () => {
    if (activeTab === 'absen') {
      await fetchAbsenAktif();
    } else {
      await fetchRiwayat();
    }
  };

  const fetchAbsenAktif = async () => {
    try {
      const pengajuanResponse = await fetch(getApiUrl(`/pegawai/lembur/api/pengajuan-hari-ini?user_id=${userId}`));
      const pengajuanResult = await pengajuanResponse.json();
      
      const absenResponse = await fetch(getApiUrl(`/pegawai/lembur/api/absen-aktif?user_id=${userId}`));
      const absenResult = await absenResponse.json();
      
      if (pengajuanResult.success) {
        setPengajuanList(pengajuanResult.data || []);
      }
      
      if (absenResult.success) {
        setAbsenList(absenResult.data || []);
      }
    } catch (error) {
      console.error('Error fetching absen aktif:', error);
    }
  };

  const fetchRiwayat = async () => {
    try {
      const response = await fetch(getApiUrl(`/pegawai/lembur/api/riwayat?user_id=${userId}`));
      const result = await response.json();
      if (result.success) {
        setRiwayatList(result.data || []);
      }
    } catch (error) {
      console.error('Error fetching riwayat:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await getCurrentLocation();
    await fetchData();
    setRefreshing(false);
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

  const getLocationStatus = async (pengajuan: any) => {
    try {
      const lokasiResponse = await fetch(getApiUrl(`/pegawai/lembur/api/lokasi?user_id=${userId}&tanggal=${pengajuan.tanggal_mulai}`));
      const lokasiResult = await lokasiResponse.json();
      
      if (!lokasiResult.success || !userLocation) {
        return { valid: false, distance: 0, lokasi: null };
      }
      
      const lokasi = lokasiResult.data;
      const distance = calculateDistance(
        userLocation.latitude,
        userLocation.longitude,
        lokasi.latitude,
        lokasi.longitude
      );
      
      return {
        valid: distance <= lokasi.radius,
        distance: Math.round(distance),
        lokasi: lokasi
      };
    } catch (error) {
      return { valid: false, distance: 0, lokasi: null };
    }
  };

  const openCamera = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Error', 'Izin kamera diperlukan');
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
      }
    } catch (error) {
      console.error('Error opening camera:', error);
      Alert.alert('Error', 'Gagal membuka kamera');
    }
  };

  const handleRetake = () => {
    setShowPreviewModal(false);
    setTimeout(() => openCamera(), 300);
  };

  const handleSubmit = async () => {
    if (!selectedAbsen || !photoUri || !userLocation) return;
    
    setIsProcessing(true);
    setShowPreviewModal(false);
    
    try {
      const formData = new FormData();
      
      if (selectedAbsen.jenis === 'masuk') {
        formData.append('id_pengajuan', selectedAbsen.id_pengajuan.toString());
        formData.append('user_id', userId);
        formData.append('lokasi_id', selectedAbsen.lokasi_id.toString());
        formData.append('dinas_id', selectedAbsen.dinas_id?.toString() || '');
      } else {
        formData.append('id_absen_lembur', selectedAbsen.id_absen_lembur.toString());
      }
      
      formData.append('latitude', userLocation.latitude.toString());
      formData.append('longitude', userLocation.longitude.toString());
      
      const filename = photoUri.split('/').pop();
      const match = /\.(\w+)$/.exec(filename || '');
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
        Alert.alert('Sukses', result.message);
        await fetchData();
      } else {
        Alert.alert('Error', result.message);
      }
    } catch (error) {
      console.error('Error submitting:', error);
      Alert.alert('Error', 'Terjadi kesalahan saat mengirim data');
    } finally {
      setIsProcessing(false);
      setPhotoUri('');
      setSelectedAbsen(null);
    }
  };

  const handleAbsenMasukPertama = async (pengajuan: any, locationStatus: any) => {
    if (!checkSchedule(pengajuan.jam_mulai, pengajuan.jam_selesai)) {
      Alert.alert('Belum Waktunya', 'Absen hanya bisa dilakukan sesuai jadwal lembur');
      return;
    }

    if (!locationStatus.valid) {
      Alert.alert('Di Luar Radius', `Anda berada ${locationStatus.distance}m dari lokasi (radius: ${locationStatus.lokasi?.radius}m)`);
      return;
    }
    
    setSelectedAbsen({
      id_pengajuan: pengajuan.id_pengajuan,
      lokasi_id: locationStatus.lokasi.lokasi_id,
      dinas_id: locationStatus.lokasi.dinas_id,
      jenis: 'masuk'
    });
    
    await openCamera();
  };

  const handleAbsenPulang = (absen: AbsenLembur, radiusStatus: any) => {
    if (!checkSchedule(absen.jam_rencana_mulai, absen.jam_rencana_selesai)) {
      Alert.alert('Belum Waktunya', 'Absen pulang hanya bisa dilakukan sesuai jadwal lembur');
      return;
    }

    if (!radiusStatus.valid) {
      Alert.alert('Di Luar Radius', 'Anda berada di luar radius lokasi');
      return;
    }
    
    setSelectedAbsen({ ...absen, jenis: 'pulang' });
    openCamera();
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
    return `${days[date.getDay()]}, ${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
  };

  const formatPeriode = (tanggalMulai: string, tanggalSelesai: string) => {
    const mulai = new Date(tanggalMulai);
    const selesai = new Date(tanggalSelesai);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
    
    const diffTime = Math.abs(selesai.getTime() - mulai.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    
    if (tanggalMulai === tanggalSelesai) {
      return `${mulai.getDate()} ${months[mulai.getMonth()]} ${mulai.getFullYear()}`;
    }
    
    if (mulai.getMonth() === selesai.getMonth() && mulai.getFullYear() === selesai.getFullYear()) {
      return `${mulai.getDate()} - ${selesai.getDate()} ${months[mulai.getMonth()]} ${mulai.getFullYear()} (${diffDays} hari)`;
    }
    
    if (mulai.getFullYear() === selesai.getFullYear()) {
      return `${mulai.getDate()} ${months[mulai.getMonth()]} - ${selesai.getDate()} ${months[selesai.getMonth()]} ${mulai.getFullYear()} (${diffDays} hari)`;
    }
    
    return `${mulai.getDate()} ${months[mulai.getMonth()]} ${mulai.getFullYear()} - ${selesai.getDate()} ${months[selesai.getMonth()]} ${selesai.getFullYear()} (${diffDays} hari)`;
  };

  const formatTime = (timeString: string) => {
    return timeString.substring(0, 5);
  };

  const PengajuanCard = ({ pengajuan }: any) => {
    const [locationStatus, setLocationStatus] = useState<any>({ valid: false, distance: 0, lokasi: null });

    useEffect(() => {
      getLocationStatus(pengajuan).then(setLocationStatus);
    }, [userLocation]);

    const isScheduleValid = checkSchedule(pengajuan.jam_mulai, pengajuan.jam_selesai);
    const canAbsen = isScheduleValid && locationStatus.valid;

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.dateRow}>
            <Ionicons name="calendar" size={16} color="#004643" />
            <Text style={styles.dateText}>{formatPeriode(pengajuan.tanggal_mulai, pengajuan.tanggal_selesai)}</Text>
          </View>
          <View style={[styles.badge, { backgroundColor: canAbsen ? '#4CAF5020' : '#FF980020' }]}>
            <Text style={[styles.badgeText, { color: canAbsen ? '#4CAF50' : '#FF9800' }]}>
              {canAbsen ? 'Siap Absen' : isScheduleValid ? 'Di Luar Radius' : 'Belum Waktunya'}
            </Text>
          </View>
        </View>

        <View style={styles.scheduleRow}>
          <Ionicons name="time-outline" size={14} color="#666" />
          <Text style={styles.scheduleText}>
            {formatTime(pengajuan.jam_mulai)} - {formatTime(pengajuan.jam_selesai)}
          </Text>
        </View>

        <Text style={styles.reasonText}>{pengajuan.alasan_text}</Text>

        {locationStatus.lokasi && (
          <View style={styles.locationRow}>
            <Ionicons name="location-outline" size={14} color="#666" />
            <Text style={styles.locationText}>{locationStatus.lokasi.nama_lokasi}</Text>
            <View style={[styles.radiusBadge, { backgroundColor: locationStatus.valid ? '#4CAF50' : '#F44336' }]}>
              <Text style={styles.radiusText}>{locationStatus.distance}m</Text>
            </View>
          </View>
        )}

        <TouchableOpacity 
          style={[styles.button, !canAbsen && styles.buttonDisabled]}
          onPress={() => handleAbsenMasukPertama(pengajuan, locationStatus)}
          disabled={!canAbsen || isProcessing}
        >
          <Ionicons name={canAbsen ? "camera" : "lock-closed"} size={18} color="#fff" />
          <Text style={styles.buttonText}>
            {isProcessing ? 'Memproses...' : 'Absen Masuk'}
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  const AbsenAktifCard = ({ item }: { item: AbsenLembur }) => {
    const radiusStatus = (() => {
      if (!userLocation) return { valid: false, distance: 0 };
      const distance = calculateDistance(
        userLocation.latitude,
        userLocation.longitude,
        item.latitude,
        item.longitude
      );
      return {
        valid: distance <= item.radius,
        distance: Math.round(distance)
      };
    })();

    const isScheduleValid = checkSchedule(item.jam_rencana_mulai, item.jam_rencana_selesai);
    const canAbsen = isScheduleValid && radiusStatus.valid;

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.dateRow}>
            <Ionicons name="calendar" size={16} color="#004643" />
            <Text style={styles.dateText}>{formatDate(item.tanggal)}</Text>
          </View>
          <View style={[styles.badge, { backgroundColor: '#FF980020' }]}>
            <Text style={[styles.badgeText, { color: '#FF9800' }]}>Sedang Lembur</Text>
          </View>
        </View>

        <View style={styles.scheduleRow}>
          <Ionicons name="time-outline" size={14} color="#666" />
          <Text style={styles.scheduleText}>
            {formatTime(item.jam_rencana_mulai)} - {formatTime(item.jam_rencana_selesai)}
          </Text>
        </View>

        <View style={styles.locationRow}>
          <Ionicons name="location-outline" size={14} color="#666" />
          <Text style={styles.locationText}>{item.lokasi_detail}</Text>
          <View style={[styles.radiusBadge, { backgroundColor: radiusStatus.valid ? '#4CAF50' : '#F44336' }]}>
            <Text style={styles.radiusText}>{radiusStatus.distance}m</Text>
          </View>
        </View>

        <View style={styles.timeRow}>
          <View style={styles.timeBox}>
            <Text style={styles.timeLabel}>Masuk</Text>
            <Text style={styles.timeValue}>{item.jam_masuk ? formatTime(item.jam_masuk) : '-'}</Text>
          </View>
          <View style={styles.timeBox}>
            <Text style={styles.timeLabel}>Pulang</Text>
            <Text style={styles.timeValue}>{item.jam_pulang ? formatTime(item.jam_pulang) : '-'}</Text>
          </View>
        </View>

        {item.status === 'masuk' && (
          <TouchableOpacity 
            style={[styles.button, styles.buttonDanger, !canAbsen && styles.buttonDisabled]}
            onPress={() => handleAbsenPulang(item, radiusStatus)}
            disabled={!canAbsen || isProcessing}
          >
            <Ionicons name={canAbsen ? "camera" : "lock-closed"} size={18} color="#fff" />
            <Text style={styles.buttonText}>
              {isProcessing ? 'Memproses...' : 'Absen Pulang'}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const renderAbsen = () => (
    <ScrollView 
      style={styles.content}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#004643']} />}
    >
      {pengajuanList.map((pengajuan) => (
        <PengajuanCard key={`pengajuan-${pengajuan.id_pengajuan}`} pengajuan={pengajuan} />
      ))}

      {absenList.map((item) => (
        <AbsenAktifCard key={item.id_absen_lembur} item={item} />
      ))}

      {absenList.length === 0 && pengajuanList.length === 0 && (
        <View style={styles.empty}>
          <Ionicons name="calendar-outline" size={48} color="#CCC" />
          <Text style={styles.emptyText}>Belum ada lembur hari ini</Text>
        </View>
      )}
    </ScrollView>
  );

  const renderRiwayat = () => (
    <ScrollView 
      style={styles.content}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#004643']} />}
    >
      {riwayatList.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="time-outline" size={48} color="#CCC" />
          <Text style={styles.emptyText}>Belum ada riwayat lembur</Text>
        </View>
      ) : (
        riwayatList.map((item) => (
          <View key={item.id_absen_lembur} style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.dateRow}>
                <Ionicons name="calendar" size={16} color="#004643" />
                <Text style={styles.dateText}>{formatDate(item.tanggal)}</Text>
              </View>
              <View style={[styles.badge, { backgroundColor: '#4CAF5020' }]}>
                <Text style={[styles.badgeText, { color: '#4CAF50' }]}>{item.total_jam} Jam</Text>
              </View>
            </View>

            <View style={styles.scheduleRow}>
              <Ionicons name="time-outline" size={14} color="#666" />
              <Text style={styles.scheduleText}>
                {formatTime(item.jam_rencana_mulai)} - {formatTime(item.jam_rencana_selesai)}
              </Text>
            </View>

            <View style={styles.locationRow}>
              <Ionicons name="location-outline" size={14} color="#666" />
              <Text style={styles.locationText}>{item.lokasi_detail}</Text>
            </View>

            <View style={styles.timeRow}>
              <View style={styles.timeBox}>
                <Text style={styles.timeLabel}>Masuk</Text>
                <Text style={styles.timeValue}>{formatTime(item.jam_masuk!)}</Text>
              </View>
              <View style={styles.timeBox}>
                <Text style={styles.timeLabel}>Pulang</Text>
                <Text style={styles.timeValue}>{formatTime(item.jam_pulang!)}</Text>
              </View>
            </View>
          </View>
        ))
      )}
    </ScrollView>
  );

  return (
    <View style={styles.container}>
      <StatusBar style="light" translucent={true} backgroundColor="transparent" />
      <AppHeader title="Lembur" showBack={true} />

      <View style={styles.tabs}>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'absen' && styles.tabActive]}
          onPress={() => setActiveTab('absen')}
        >
          <Ionicons name="finger-print" size={18} color={activeTab === 'absen' ? '#004643' : '#999'} />
          <Text style={[styles.tabText, activeTab === 'absen' && styles.tabTextActive]}>Absen</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.tab, activeTab === 'riwayat' && styles.tabActive]}
          onPress={() => setActiveTab('riwayat')}
        >
          <Ionicons name="time" size={18} color={activeTab === 'riwayat' ? '#004643' : '#999'} />
          <Text style={[styles.tabText, activeTab === 'riwayat' && styles.tabTextActive]}>Riwayat</Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'absen' && renderAbsen()}
      {activeTab === 'riwayat' && renderRiwayat()}

      <Modal visible={showPreviewModal} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Preview Foto</Text>
            <Image source={{ uri: photoUri }} style={styles.previewImage} />
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
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  tabs: { flexDirection: 'row', backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E0E0E0' },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, gap: 6, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabActive: { borderBottomColor: '#004643' },
  tabText: { fontSize: 13, color: '#999', fontWeight: '500' },
  tabTextActive: { color: '#004643', fontWeight: '600' },
  content: { flex: 1, padding: 12, backgroundColor: '#F5F5F5' },
  card: { backgroundColor: '#fff', borderRadius: 10, padding: 12, marginBottom: 10, borderWidth: 1, borderColor: '#E8E8E8' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dateText: { fontSize: 13, fontWeight: '600', color: '#004643' },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  badgeText: { fontSize: 11, fontWeight: '600' },
  scheduleRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  scheduleText: { fontSize: 12, color: '#666' },
  reasonText: { fontSize: 12, color: '#666', marginBottom: 8, lineHeight: 16 },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
  locationText: { flex: 1, fontSize: 12, color: '#666' },
  radiusBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  radiusText: { fontSize: 11, fontWeight: '600', color: '#fff' },
  timeRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  timeBox: { flex: 1, backgroundColor: '#F8F8F8', borderRadius: 8, padding: 8, alignItems: 'center' },
  timeLabel: { fontSize: 11, color: '#999', marginBottom: 2 },
  timeValue: { fontSize: 15, fontWeight: '600', color: '#004643' },
  button: { flexDirection: 'row', backgroundColor: '#004643', paddingVertical: 10, borderRadius: 8, alignItems: 'center', justifyContent: 'center', gap: 6 },
  buttonDanger: { backgroundColor: '#F44336' },
  buttonDisabled: { backgroundColor: '#CCC' },
  buttonText: { fontSize: 13, fontWeight: '600', color: '#fff' },
  empty: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  emptyText: { fontSize: 13, color: '#999', marginTop: 8 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { backgroundColor: '#fff', borderRadius: 12, padding: 16, width: '100%', maxWidth: 400 },
  modalTitle: { fontSize: 16, fontWeight: '600', color: '#333', marginBottom: 12, textAlign: 'center' },
  previewImage: { width: '100%', height: 250, borderRadius: 8, marginBottom: 12 },
  modalButtons: { flexDirection: 'row', gap: 10 },
  modalButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderRadius: 8, gap: 6, backgroundColor: '#F5F5F5' },
  modalButtonPrimary: { backgroundColor: '#004643' },
  modalButtonText: { fontSize: 13, fontWeight: '600', color: '#666' },
});
