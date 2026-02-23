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
  lokasi_lembur: 'kantor' | 'dinas';
  lokasi_detail: string;
  lokasi_id: number;
  latitude: number;
  longitude: number;
  radius: number;
  dinas_id?: number;
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
      const response = await fetch(getApiUrl(`/pegawai/lembur/api/absen-aktif?user_id=${userId}`));
      const result = await response.json();
      if (result.success) {
        setAbsenList(result.data || []);
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

  const getRadiusStatus = (item: AbsenLembur) => {
    if (!userLocation) {
      return { valid: false, distance: 0, message: 'Mengambil lokasi...' };
    }
    
    const distance = calculateDistance(
      userLocation.latitude,
      userLocation.longitude,
      item.latitude,
      item.longitude
    );
    
    const isValid = distance <= item.radius;
    
    return {
      valid: isValid,
      distance: Math.round(distance),
      message: isValid 
        ? `${Math.round(distance)}m (Dalam radius)` 
        : `${Math.round(distance)}m (Di luar radius ${item.radius}m)`
    };
  };

  const handleAbsen = async (item: AbsenLembur, jenis: 'masuk' | 'pulang') => {
    const status = getRadiusStatus(item);
    if (!status.valid) {
      Alert.alert('Tidak Bisa Absen', 'Anda di luar radius lokasi');
      return;
    }
    
    setSelectedAbsen({ ...item, jenis });
    await openCamera();
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

  const handleAbsenPulang = (absen: AbsenLembur) => {
    handleAbsen(absen, 'pulang');
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
    return `${days[date.getDay()]}, ${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
  };

  const formatTime = (timeString: string) => {
    return timeString.substring(0, 5);
  };

  const renderAbsen = () => (
    <ScrollView 
      style={styles.tabContent}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#004643']} />}
    >
      {absenList.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="finger-print-outline" size={64} color="#E0E0E0" />
          <Text style={styles.emptyText}>Belum ada absen lembur aktif</Text>
        </View>
      ) : (
        absenList.map((item) => {
          const radiusStatus = getRadiusStatus(item);
          
          return (
            <View key={item.id_absen_lembur} style={styles.card}>
              <View style={styles.iconHeader}>
                <View style={styles.iconCircle}>
                  <Ionicons name="finger-print" size={32} color="#FF9800" />
                </View>
                <View style={[styles.statusBadge, { backgroundColor: '#FF9800' + '20' }]}>
                  <Text style={[styles.statusText, { color: '#FF9800' }]}>Sedang Lembur</Text>
                </View>
              </View>

              <View style={styles.cardBody}>
                <View style={styles.infoRow}>
                  <Ionicons name="calendar-outline" size={16} color="#666" />
                  <Text style={styles.infoText}>{formatDate(item.tanggal)}</Text>
                </View>
                
                <View style={styles.infoRow}>
                  <Ionicons name="time-outline" size={16} color="#666" />
                  <Text style={styles.infoText}>
                    Jadwal: {formatTime(item.jam_rencana_mulai)} - {formatTime(item.jam_rencana_selesai)}
                  </Text>
                </View>
                
                <View style={styles.infoRow}>
                  <Ionicons name="location-outline" size={16} color="#666" />
                  <View style={styles.locationInfo}>
                    <Text style={styles.locationName}>{item.lokasi_detail}</Text>
                    <View style={styles.radiusStatus}>
                      <Ionicons 
                        name={radiusStatus.valid ? "checkmark-circle" : "close-circle"} 
                        size={14} 
                        color={radiusStatus.valid ? "#4CAF50" : "#F44336"} 
                      />
                      <Text style={[
                        styles.radiusText,
                        { color: radiusStatus.valid ? "#4CAF50" : "#F44336" }
                      ]}>
                        {radiusStatus.message}
                      </Text>
                    </View>
                  </View>
                </View>
                
                <View style={styles.timeCard}>
                  <View style={styles.timeItem}>
                    <Text style={styles.timeLabel}>Masuk</Text>
                    <Text style={styles.timeValue}>{item.jam_masuk ? formatTime(item.jam_masuk) : '-'}</Text>
                  </View>
                  <View style={styles.timeSeparator} />
                  <View style={styles.timeItem}>
                    <Text style={styles.timeLabel}>Pulang</Text>
                    <Text style={styles.timeValue}>{item.jam_pulang ? formatTime(item.jam_pulang) : '-'}</Text>
                  </View>
                </View>
              </View>

              {item.status === 'masuk' && (
                <TouchableOpacity 
                  style={[
                    styles.absenButton,
                    !radiusStatus.valid && styles.absenButtonDisabled
                  ]}
                  onPress={() => handleAbsenPulang(item)}
                  disabled={!radiusStatus.valid || isProcessing}
                >
                  <Ionicons 
                    name={radiusStatus.valid ? "camera" : "lock-closed"} 
                    size={20} 
                    color="#fff" 
                  />
                  <Text style={styles.absenButtonText}>
                    {isProcessing ? 'Memproses...' : radiusStatus.valid ? 'Absen Pulang Lembur' : 'Tidak Bisa Absen'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          );
        })
      )}
    </ScrollView>
  );

  const renderRiwayat = () => (
    <ScrollView 
      style={styles.tabContent}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#004643']} />}
    >
      {riwayatList.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="time-outline" size={64} color="#E0E0E0" />
          <Text style={styles.emptyText}>Belum ada riwayat lembur</Text>
        </View>
      ) : (
        riwayatList.map((item) => (
          <View key={item.id_absen_lembur} style={styles.card}>
            <View style={styles.iconHeader}>
              <View style={styles.iconCircle}>
                <Ionicons name="checkmark-circle" size={32} color="#4CAF50" />
              </View>
              <View style={[styles.statusBadge, { backgroundColor: '#4CAF50' + '20' }]}>
                <Text style={[styles.statusText, { color: '#4CAF50' }]}>
                  {item.total_jam} Jam
                </Text>
              </View>
            </View>

            <View style={styles.cardBody}>
              <View style={styles.infoRow}>
                <Ionicons name="calendar-outline" size={16} color="#666" />
                <Text style={styles.infoText}>{formatDate(item.tanggal)}</Text>
              </View>
              
              <View style={styles.infoRow}>
                <Ionicons name="time-outline" size={16} color="#666" />
                <Text style={styles.infoText}>
                  Jadwal: {formatTime(item.jam_rencana_mulai)} - {formatTime(item.jam_rencana_selesai)}
                </Text>
              </View>
              
              <View style={styles.infoRow}>
                <Ionicons name="location-outline" size={16} color="#666" />
                <Text style={styles.infoText}>{item.lokasi_detail}</Text>
              </View>
              
              <View style={styles.timeCard}>
                <View style={styles.timeItem}>
                  <Text style={styles.timeLabel}>Masuk</Text>
                  <Text style={styles.timeValue}>{formatTime(item.jam_masuk!)}</Text>
                </View>
                <View style={styles.timeSeparator} />
                <View style={styles.timeItem}>
                  <Text style={styles.timeLabel}>Pulang</Text>
                  <Text style={styles.timeValue}>{formatTime(item.jam_pulang!)}</Text>
                </View>
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

      <View style={styles.tabContainer}>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'absen' && styles.tabActive]}
          onPress={() => setActiveTab('absen')}
        >
          <Ionicons 
            name="finger-print" 
            size={20} 
            color={activeTab === 'absen' ? '#004643' : '#999'} 
          />
          <Text style={[styles.tabText, activeTab === 'absen' && styles.tabTextActive]}>
            Absen Lembur
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.tab, activeTab === 'riwayat' && styles.tabActive]}
          onPress={() => setActiveTab('riwayat')}
        >
          <Ionicons 
            name="time" 
            size={20} 
            color={activeTab === 'riwayat' ? '#004643' : '#999'} 
          />
          <Text style={[styles.tabText, activeTab === 'riwayat' && styles.tabTextActive]}>
            Riwayat
          </Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'absen' && renderAbsen()}
      {activeTab === 'riwayat' && renderRiwayat()}

      {/* Modal Preview */}
      <Modal visible={showPreviewModal} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Preview Foto</Text>
            <Image source={{ uri: photoUri }} style={styles.previewImage} />
            <View style={styles.buttonRow}>
              <TouchableOpacity style={styles.modalButton} onPress={handleRetake}>
                <Ionicons name="refresh" size={20} color="#666" />
                <Text style={styles.modalButtonText}>Ulangi</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalButton, styles.modalButtonPrimary]} onPress={handleSubmit}>
                <Ionicons name="checkmark" size={20} color="#fff" />
                <Text style={[styles.modalButtonText, styles.modalButtonTextPrimary]}>Kirim</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#F8FAFC' 
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 6,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: '#004643',
  },
  tabText: {
    fontSize: 13,
    color: '#999',
    fontWeight: '500',
  },
  tabTextActive: {
    color: '#004643',
    fontWeight: '600',
  },
  tabContent: {
    flex: 1,
    paddingTop: 15,
    paddingBottom: 20,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    marginBottom: 12,
    marginHorizontal: 15,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  iconHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  cardBody: {
    gap: 10,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    flex: 1,
  },
  locationInfo: {
    flex: 1,
  },
  locationName: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  radiusStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  radiusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  timeCard: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
  },
  timeItem: {
    flex: 1,
    alignItems: 'center',
  },
  timeLabel: {
    fontSize: 12,
    color: '#999',
    marginBottom: 4,
  },
  timeValue: {
    fontSize: 18,
    fontWeight: '600',
    color: '#004643',
  },
  timeSeparator: {
    width: 1,
    backgroundColor: '#E0E0E0',
    marginHorizontal: 12,
  },
  absenButton: {
    flexDirection: 'row',
    backgroundColor: '#F44336',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 12,
  },
  absenButtonDisabled: {
    backgroundColor: '#E0E0E0',
  },
  absenButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 14,
    color: '#999',
    marginTop: 12,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    width: '100%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
    textAlign: 'center',
  },
  previewImage: {
    width: '100%',
    height: 300,
    borderRadius: 12,
    marginBottom: 16,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 6,
    backgroundColor: '#F5F5F5',
  },
  modalButtonPrimary: {
    backgroundColor: '#004643',
  },
  modalButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  modalButtonTextPrimary: {
    color: '#fff',
  },
});
