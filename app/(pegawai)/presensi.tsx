import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, SafeAreaView, Alert, Modal, Dimensions, Animated, Platform } from 'react-native';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { PegawaiAPI, API_CONFIG } from '../../constants/config';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { height: screenHeight, width: screenWidth } = Dimensions.get('window');

export default function PresensiScreen() {
  const [location, setLocation] = useState<any>(null);
  const [distance, setDistance] = useState<number>(0);
  const [availableLocations, setAvailableLocations] = useState<any[]>([]);
  const [nearestLocation, setNearestLocation] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [hasCheckedIn, setHasCheckedIn] = useState(false);
  const [checkInTime, setCheckInTime] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [pendingAttendanceType, setPendingAttendanceType] = useState<'masuk' | 'pulang' | null>(null);
  
  // State untuk collapsible panel
  const [panelHeight, setPanelHeight] = useState(screenHeight * 0.35);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const panelAnimation = useRef(new Animated.Value(screenHeight * 0.35)).current;
  const minHeight = 120;
  const maxHeight = screenHeight * 0.6;

  useEffect(() => {
    fetchLocations();
    getCurrentLocation();
    checkTodayAttendance();
    
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    
    return () => clearInterval(timer);
  }, []);

  const checkTodayAttendance = async () => {
    try {
      const userData = await AsyncStorage.getItem('userData');
      if (!userData) return;
      
      const user = JSON.parse(userData);
      const userId = user.id_user || user.id;
      const today = new Date().toISOString().split('T')[0];
      
      const response = await fetch(`${API_CONFIG.BASE_URL}/check-attendance.php?user_id=${userId}&date=${today}`);
      const data = await response.json();
      
      if (data.success && data.has_checked_in) {
        setHasCheckedIn(true);
        setCheckInTime(data.check_in_time);
      }
    } catch (error) {
      console.error('Error checking attendance:', error);
    }
  };

  const fetchLocations = async () => {
    try {
      const response = await fetch(`${API_CONFIG.BASE_URL}/debug-lokasi.php`);
      const data = await response.json();
      
      if (data.lokasi_kantor) {
        const activeLocations = data.lokasi_kantor.filter((loc: any) => 
          loc.status === 'aktif' && loc.is_active === 1 && loc.jenis_lokasi === 'tetap'
        );
        
        setAvailableLocations(activeLocations);
      }
    } catch (error) {
      console.error('Error fetching locations:', error);
      Alert.alert('Error', 'Gagal memuat data lokasi');
    } finally {
      setLoading(false);
    }
  };

  const getCurrentLocation = async () => {
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      
      let currLocation = await Location.getCurrentPositionAsync({});
      setLocation(currLocation.coords);
      
      if (availableLocations.length > 0) {
        calculateDistances(currLocation.coords);
      }
    } catch (error) {
      console.error('Error getting location:', error);
    }
  };

  const calculateDistances = (userLocation: any) => {
    let minDistance = Infinity;
    let closest = null;
    
    availableLocations.forEach((loc) => {
      const dist = getDistance(
        userLocation.latitude,
        userLocation.longitude,
        parseFloat(loc.latitude),
        parseFloat(loc.longitude)
      );
      
      if (dist < minDistance) {
        minDistance = dist;
        closest = { ...loc, distance: dist };
      }
    });
    
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
    
    if (nearestLocation.jenis_lokasi !== 'tetap') {
      return { valid: false, message: "Silakan absen di lokasi kantor yang telah ditentukan" };
    }
    if (!isInRange) {
      return { valid: false, message: `Anda berada di luar area kantor (${Math.round(distance)}m dari lokasi)` };
    }
    
    return { valid: true, message: "Lokasi valid" };
  };

  const togglePanel = () => {
    const newHeight = isCollapsed ? screenHeight * 0.35 : minHeight;
    setIsCollapsed(!isCollapsed);
    
    Animated.spring(panelAnimation, {
      toValue: newHeight,
      useNativeDriver: false,
      tension: 100,
      friction: 8,
    }).start();
    
    setPanelHeight(newHeight);
  };

  const handleAbsenMasuk = async () => {
    await takePhotoWithLocation();
    setPendingAttendanceType('masuk');
  };

  const handleAbsenPulang = async () => {
    await takePhotoWithLocation();
    setPendingAttendanceType('pulang');
  };

  const takePhotoWithLocation = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Error', 'Izin kamera diperlukan');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled) {
        setCapturedPhoto(result.assets[0].uri);
      } else {
        setPendingAttendanceType(null);
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert('Error', 'Gagal mengambil foto');
      setPendingAttendanceType(null);
    }
  };

  const confirmAttendance = async () => {
    if (!pendingAttendanceType || !capturedPhoto) return;
    
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
      formData.append('type', pendingAttendanceType);
      formData.append('latitude', location.latitude.toString());
      formData.append('longitude', location.longitude.toString());
      formData.append('lokasi_id', nearestLocation.id.toString());
      
      formData.append('foto', {
        uri: capturedPhoto,
        type: 'image/jpeg',
        name: `${pendingAttendanceType}_${userId}_${Date.now()}.jpg`,
      } as any);
      
      const response = await fetch(`${API_CONFIG.BASE_URL}/submit-presensi.php`, {
        method: 'POST',
        body: formData,
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      const result = await response.json();
      
      if (result.success) {
        Alert.alert('Berhasil', `Absensi ${pendingAttendanceType} berhasil dicatat`);
        setCapturedPhoto(null);
        setPendingAttendanceType(null);
        
        if (pendingAttendanceType === 'masuk') {
          setHasCheckedIn(true);
          setCheckInTime(new Date().toLocaleTimeString('id-ID'));
        }
      } else {
        Alert.alert('Error', result.message || 'Gagal mencatat absensi');
      }
    } catch (error) {
      console.error('Error submitting attendance:', error);
      Alert.alert('Error', 'Terjadi kesalahan saat mengirim data');
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
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text>Memuat data lokasi...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
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
        {Platform.OS === 'web' ? (
          <View style={[styles.map, styles.webMapPlaceholder]}>
            <Text style={styles.webMapText}>Peta tidak tersedia di web</Text>
            <Text style={styles.webMapSubtext}>Gunakan aplikasi mobile untuk fitur peta</Text>
          </View>
        ) : (
          <View style={[styles.map, styles.webMapPlaceholder]}>
            <Text style={styles.webMapText}>Fitur peta sementara dinonaktifkan</Text>
            <Text style={styles.webMapSubtext}>Akan segera tersedia</Text>
          </View>
        )}
      </View>

      <Animated.View style={[styles.panel, { height: panelAnimation }]}>
        <TouchableOpacity 
          style={styles.handleContainer}
          onPress={togglePanel}
          activeOpacity={0.7}
        >
          <View style={styles.handle} />
        </TouchableOpacity>

        <View style={styles.panelContent}>
          <View style={styles.headerInfo}>
            <Text style={styles.dateText}>{formatDate(currentTime)}</Text>
            <Text style={styles.timeText}>{formatTime(currentTime)}</Text>
          </View>

          {!isCollapsed && (
            <>
              <View style={styles.statusContainer}>
                <View style={styles.statusItem}>
                  <Ionicons name="location" size={16} color="#666" />
                  <View style={styles.locationDetails}>
                    <Text style={styles.locationName}>
                      {nearestLocation ? nearestLocation.nama_lokasi : 'Lokasi tidak terdeteksi'}
                    </Text>
                    {nearestLocation && (
                      <Text style={styles.locationAddress}>
                        {nearestLocation.alamat}
                      </Text>
                    )}
                  </View>
                </View>
                
                <View style={styles.statusItem}>
                  <Ionicons 
                    name={distance <= (nearestLocation?.radius || 0) ? "checkmark-circle" : "close-circle"} 
                    size={16} 
                    color={distance <= (nearestLocation?.radius || 0) ? "#4CAF50" : "#F44336"} 
                  />
                  <Text style={[styles.statusText, {
                    color: distance <= (nearestLocation?.radius || 0) ? "#4CAF50" : "#F44336"
                  }]}>
                    Jarak: {Math.round(distance)}m
                  </Text>
                </View>
              </View>

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
                            size={20} 
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
                            size={20} 
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
                  <Text style={styles.checkInText}>Masuk: {checkInTime}</Text>
                </View>
              )}
            </>
          )}
        </View>
      </Animated.View>

      <Modal
        visible={capturedPhoto !== null}
        transparent={true}
        animationType="slide"
      >
        <View style={styles.modalContainer}>
          <View style={styles.confirmationModal}>
            <Text style={styles.modalTitle}>Konfirmasi Absensi</Text>
            
            {capturedPhoto && (
              <View style={styles.photoContainer}>
                <Ionicons name="camera" size={48} color="#4CAF50" />
                <Text style={styles.photoLabel}>Foto berhasil diambil</Text>
                <View style={styles.locationInfo}>
                  <Ionicons name="location" size={16} color="#4CAF50" />
                  <Text style={styles.locationText}>
                    {nearestLocation?.nama_lokasi || 'Lokasi terdeteksi'}
                  </Text>
                </View>
                <Text style={styles.distanceText}>
                  Jarak: {Math.round(distance)}m
                </Text>
              </View>
            )}
            
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={styles.cancelButton}
                onPress={() => {
                  setCapturedPhoto(null);
                  setPendingAttendanceType(null);
                }}
              >
                <Text style={styles.cancelButtonText}>Batal</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.confirmButton}
                onPress={confirmAttendance}
                disabled={isProcessing}
              >
                <Text style={styles.confirmButtonText}>
                  {isProcessing ? 'Menyimpan...' : 'Konfirmasi'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
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
  handleContainer: {
    alignItems: 'center',
    paddingVertical: 12,
    justifyContent: 'center',
  },
  handle: {
    width: 50,
    height: 5,
    backgroundColor: '#ddd',
    borderRadius: 3,
  },
  panelContent: {
    flex: 1,
    paddingHorizontal: 20,
    paddingBottom: 30,
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
    top: 60,
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
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginVertical: 2,
  },
  buttonIcon: {
    marginRight: 8,
  },
  mainButtonText: {
    fontSize: 16,
    fontWeight: '600',
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
    alignItems: 'center',
    padding: 10,
    backgroundColor: '#E8F5E8',
    borderRadius: 8,
  },
  checkInText: {
    color: '#4CAF50',
    fontSize: 14,
    fontWeight: '500',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  confirmationModal: {
    backgroundColor: 'white',
    padding: 24,
    borderRadius: 16,
    width: '90%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
  },
  photoContainer: {
    alignItems: 'center',
    marginVertical: 20,
    padding: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
  },
  photoLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4CAF50',
    marginTop: 8,
    marginBottom: 12,
  },
  locationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  locationText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  distanceText: {
    fontSize: 14,
    color: '#666',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cancelButton: {
    flex: 1,
    padding: 14,
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    marginRight: 12,
  },
  cancelButtonText: {
    textAlign: 'center',
    color: '#666',
    fontWeight: '600',
    fontSize: 16,
  },
  confirmButton: {
    flex: 1,
    padding: 14,
    backgroundColor: '#4CAF50',
    borderRadius: 10,
  },
  confirmButtonText: {
    textAlign: 'center',
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  },
  webMapPlaceholder: {
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center'
  },
  webMapText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '600'
  },
  webMapSubtext: {
    fontSize: 12,
    color: '#999',
    marginTop: 4
  }
});