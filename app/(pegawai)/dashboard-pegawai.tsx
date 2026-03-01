import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  ScrollView, 
  TouchableOpacity, 
  StatusBar as RNStatusBar,
  Alert,
  Platform,
  RefreshControl,
  Image,
  SafeAreaView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import { PegawaiAPI, getApiUrl, API_CONFIG } from '../../constants/config';

interface UserData {
  nama: string;
  jabatan: string;
  statusAbsen: string;
  keteranganAbsen: string;
  jamMasuk: string;
  jamKeluar: string;
  totalJamKerja: string;
}

export default function BerandaScreen() {
  const router = useRouter();
  const [userData, setUserData] = useState<UserData>({
    nama: '',
    jabatan: '',
    statusAbsen: 'Belum Absen',
    keteranganAbsen: 'Anda belum melakukan absensi hari ini',
    jamMasuk: '08:00',
    jamKeluar: '17:00',
    totalJamKerja: '0j 0m'
  });
  const [loading, setLoading] = useState(true);
  const [lastCheckDate, setLastCheckDate] = useState(new Date());

  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    loadUserDataFirst();
    fetchUserData();
    startLocationTracking();
    
    // Update waktu setiap 30 detik
    const timeInterval = setInterval(() => {
      setCurrentTime(new Date());
    }, 30000);
    
    // Cek pergantian hari setiap 1 menit
    const dayCheckInterval = setInterval(() => {
      const now = new Date();
      const lastCheck = new Date(lastCheckDate);
      
      // Jika hari berbeda, refresh data
      if (now.getDate() !== lastCheck.getDate() || 
          now.getMonth() !== lastCheck.getMonth() || 
          now.getFullYear() !== lastCheck.getFullYear()) {
        console.log('🔄 Hari berganti, refresh data dashboard...');
        fetchUserData();
        setLastCheckDate(now);
      }
    }, 60000); // Cek setiap 1 menit
    
    return () => {
      clearInterval(timeInterval);
      clearInterval(dayCheckInterval);
    };
  }, [lastCheckDate]);

  const loadUserDataFirst = async () => {
    try {
      const userData = await AsyncStorage.getItem('userData');
      if (userData) {
        const user = JSON.parse(userData);
        setUserData((prev) => ({
          ...prev,
          nama: user.nama_lengkap || user.nama || 'Pengguna',
          jabatan: user.jabatan || 'Pegawai'
        }));
      }
    } catch (error) {
      console.log('Error loading user data first:', error);
    }
  };

  const fetchUserData = async () => {
    try {
      const userDataStr = await AsyncStorage.getItem('userData');
      
      if (!userDataStr) {
        console.log('No userData in AsyncStorage');
        setUserData((prev) => ({
          ...prev,
          nama: 'Pengguna',
          jabatan: 'Pegawai'
        }));
        return;
      }
      
      const user = JSON.parse(userDataStr);
      const userId = user.id_user || user.id;
      
      if (!userId) {
        throw new Error('No user ID found');
      }
      
      const result = await PegawaiAPI.getDashboard(userId.toString());
      console.log('Dashboard API result:', result);
      
      if (result.success) {
        const data = result.data;
        
        let statusAbsen = 'Belum Absen';
        let keteranganAbsen = 'Anda belum melakukan absensi hari ini';
        
        if (data.presensi_hari_ini) {
          const jamMasuk = data.presensi_hari_ini.jam_masuk;
          const status = data.presensi_hari_ini.status;
          
          if (jamMasuk) {
            if (status === 'Terlambat') {
              statusAbsen = 'Terlambat';
              keteranganAbsen = `Anda terlambat absen pada pukul ${jamMasuk.substring(0, 5)} WIB`;
            } else {
              statusAbsen = 'Sudah Absen';
              keteranganAbsen = `Anda sudah absen pada pukul ${jamMasuk.substring(0, 5)} WIB`;
            }
          }
        }
        
        setUserData({
          nama: data.user_info?.nama_lengkap || user.nama_lengkap || user.nama || 'Pengguna',
          jabatan: data.user_info?.jabatan || user.jabatan || 'Pegawai',
          statusAbsen,
          keteranganAbsen,
          jamMasuk: data.jam_kerja?.jam_masuk || '08:00',
          jamKeluar: data.jam_kerja?.jam_keluar || '17:00',
          totalJamKerja: data.summary_bulan_ini?.total_hadir + 'h' || '0h'
        });
        
        const updatedUserData = {
          ...user,
          nama_lengkap: data.user_info?.nama_lengkap || user.nama_lengkap,
          jabatan: data.user_info?.jabatan || user.jabatan
        };
        await AsyncStorage.setItem('userData', JSON.stringify(updatedUserData));
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      console.log('Dashboard Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const startLocationTracking = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        console.log('Location permission denied');
        return;
      }

      const userDataStr = await AsyncStorage.getItem('userData');
      if (!userDataStr) return;
      
      const user = JSON.parse(userDataStr);
      const userId = user.id_user || user.id;

      // Send location every 5 minutes
      const sendLocation = async () => {
        try {
          const location = await Location.getCurrentPositionAsync({});
          const { latitude, longitude } = location.coords;

          await fetch(getApiUrl(API_CONFIG.ENDPOINTS.UPDATE_LOCATION), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id_user: userId, latitude, longitude })
          });
          
          console.log('Location updated:', latitude, longitude);
        } catch (error) {
          console.log('Error sending location:', error);
        }
      };

      // Send immediately
      sendLocation();

      // Then send every 5 minutes
      const interval = setInterval(sendLocation, 5 * 60 * 1000);
      return () => clearInterval(interval);
    } catch (error) {
      console.log('Location tracking error:', error);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <RNStatusBar 
          barStyle="light-content"
          backgroundColor="#004643"
          translucent={false}
        />
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          bounces={false}
          overScrollMode="never"
          refreshControl={
            <RefreshControl refreshing={loading} onRefresh={fetchUserData} />
          }
        >
          <View style={styles.dashboardHeader}>
            <View style={styles.backgroundPattern}>
              <View style={styles.bubble1} />
              <View style={styles.bubble2} />
              <View style={styles.bubble3} />
            </View>

            <View style={styles.headerSection}>
              <View style={styles.adminInfo}>
                <Text style={styles.greetingText}>Selamat datang,</Text>
                <Text style={styles.userName}>{userData.nama || 'Memuat...'}</Text>
              </View>
              <View style={styles.dateTimeContainer}>
                <Text style={styles.dateTimeText}>
                  {currentTime.toLocaleDateString('id-ID', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </Text>
                <Text style={styles.timeText}>
                  {currentTime.toLocaleTimeString('id-ID', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })} WIB
                </Text>
              </View>
            </View>

            <View style={styles.summarySection}>
              <View style={styles.infoCard}>
                <View style={styles.statusRow}>
                  <View style={[styles.statusDot, 
                    userData.statusAbsen === 'Belum Absen' ? styles.dotOrange : 
                    userData.statusAbsen === 'Terlambat' ? styles.dotRed : styles.dotGreen
                  ]} />
                  <View style={styles.statusContent}>
                    <Text style={styles.statusTitle}>Status Absensi</Text>
                    <Text style={styles.statusText}>{userData.keteranganAbsen}</Text>
                  </View>
                </View>

                <View style={styles.dividerLine} />

                <View style={styles.jamKerjaRow}>
                  <View style={styles.jamItem}>
                    <View style={styles.jamIconBox}>
                      <Ionicons name="log-in-outline" size={18} color="#fff" />
                    </View>
                    <Text style={styles.jamLabel}>Jam Masuk</Text>
                    <Text style={styles.jamValue}>{userData.jamMasuk || '08:00'}</Text>
                  </View>
                  
                  <View style={styles.verticalDivider} />
                  
                  <View style={styles.jamItem}>
                    <View style={styles.jamIconBox}>
                      <Ionicons name="log-out-outline" size={18} color="#fff" />
                    </View>
                    <Text style={styles.jamLabel}>Jam Pulang</Text>
                    <Text style={styles.jamValue}>{userData.jamKeluar || '17:00'}</Text>
                  </View>
                </View>
              </View>
            </View>
          </View>

          <View style={styles.menuSection}>
            <View style={styles.mainMenuRow}>
              {[
                { id: 1, name: 'Presensi', image: require('../../assets/images/icons/pegawai/presensi.png'), route: '/menu-pegawai/presensi' },
                { id: 2, name: 'Pengajuan', image: require('../../assets/images/icons/pegawai/pengajuan.png'), route: '/menu-pegawai/pengajuan' },
                { id: 3, name: 'Dinas', image: require('../../assets/images/icons/pegawai/kegiatan.png'), route: '/menu-pegawai/kegiatan' },
                { id: 4, name: 'Lembur', image: require('../../assets/images/icons/pegawai/lembur.png'), route: '/menu-pegawai/lembur' },
              ].map((item) => (
                <TouchableOpacity 
                  key={item.id} 
                  style={styles.mainMenuItem}
                  activeOpacity={0.7}
                  onPress={() => {
                    if (item.route) {
                      router.push(item.route as any);
                    }
                  }}
                >
                  <Image source={item.image} style={styles.menuIcon} />
                  <Text style={styles.menuLabel}>{item.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#004643',
  },
  container: { 
    flex: 1, 
    backgroundColor: '#FFFFFF' 
  },
  scrollContent: { flexGrow: 1 },
  dashboardHeader: {
    backgroundColor: '#004643',
    paddingTop: 0,
    paddingBottom: 30,
    paddingHorizontal: 20,
    position: 'relative',
  },
  backgroundPattern: {
    position: 'absolute',
    top: -150,
    left: 0,
    right: 0,
    bottom: 0,
    overflow: 'hidden',
  },
  bubble1: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: 'rgba(255,255,255,0.05)',
    top: -50,
    right: -100,
  },
  bubble2: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(255,255,255,0.04)',
    bottom: -50,
    left: -60,
  },
  bubble3: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255,255,255,0.03)',
    top: 100,
    left: 30,
  },
  headerSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 20 : 40,
    paddingBottom: 10,
    marginBottom: 25,
  },
  adminInfo: { flex: 1 },
  greetingText: { fontSize: 14, color: '#E8F5E9' },
  userName: { fontSize: 18, fontWeight: 'bold', color: '#fff' },
  dateTimeContainer: {
    alignItems: 'flex-end',
  },
  dateTimeText: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '400',
  },
  timeText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: 'bold',
    marginTop: 1,
  },
  summarySection: {
    marginBottom: 60,
    paddingHorizontal: 8,
  },
  infoCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 4,
    marginRight: 10,
  },
  dotOrange: {
    backgroundColor: '#FFA726',
  },
  dotRed: {
    backgroundColor: '#EF5350',
  },
  dotGreen: {
    backgroundColor: '#66BB6A',
  },
  statusContent: {
    flex: 1,
  },
  statusTitle: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.7)',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 3,
  },
  statusText: {
    fontSize: 13,
    color: '#fff',
    fontWeight: '600',
    lineHeight: 18,
  },
  dividerLine: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    marginBottom: 14,
  },
  jamKerjaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  jamItem: {
    flex: 1,
    alignItems: 'center',
  },
  jamIconBox: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  jamLabel: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.7)',
    fontWeight: '500',
    marginBottom: 3,
  },
  jamValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    letterSpacing: 0.5,
  },
  verticalDivider: {
    width: 1,
    height: 45,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    marginHorizontal: 16,
  },
  menuSection: { 
    marginTop: -60, 
    backgroundColor: '#FFFFFF', 
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingTop: 30,
    paddingHorizontal: 24,
    paddingBottom: 40,
    flex: 1,
  },
  mainMenuRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: Platform.OS === 'ios' ? 5 : 0,
  },
  mainMenuItem: {
    width: Platform.OS === 'ios' ? '22%' : '23%',
    alignItems: 'center',
  },
  menuIcon: {
    width: 35,
    height: 35,
    resizeMode: 'contain',
    marginBottom: 8,
  },
  menuLabel: { fontSize: 11, color: '#444', fontWeight: '500', textAlign: 'center' }
});
