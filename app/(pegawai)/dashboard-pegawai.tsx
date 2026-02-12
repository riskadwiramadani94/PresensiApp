import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  ScrollView, 
  TouchableOpacity, 
  SafeAreaView, 
  StatusBar as RNStatusBar,
  Alert,
  Platform,
  RefreshControl
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { PegawaiAPI } from '../../constants/config';
import { LinearGradient } from 'expo-linear-gradient';

interface UserData {
  nama: string;
  jabatan: string;
  statusAbsen: string;
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
    jamMasuk: '08:00',
    jamKeluar: '17:00',
    totalJamKerja: '0j 0m'
  });
  const [loading, setLoading] = useState(true);

  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    fetchUserData();
    
    // Update time every 30 seconds
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 30000);
    
    return () => clearInterval(interval);
  }, []);

  const formatDate = () => {
    const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
    
    const day = days[currentTime.getDay()];
    const date = currentTime.getDate();
    const month = months[currentTime.getMonth()];
    const year = currentTime.getFullYear();
    
    return `${day}, ${date} ${month} ${year}`;
  };

  const getGreeting = () => {
    const hour = currentTime.getHours();
    if (hour >= 5 && hour < 11) return 'Selamat Pagi';
    if (hour >= 11 && hour < 15) return 'Selamat Siang';
    if (hour >= 15 && hour < 18) return 'Selamat Sore';
    return 'Selamat Malam';
  };

  const fetchUserData = async () => {
    try {
      // Ambil user data dari AsyncStorage (dari hasil login)
      const userData = await AsyncStorage.getItem('userData');
      console.log('AsyncStorage userData:', userData);
      
      if (!userData) {
        console.log('No userData in AsyncStorage');
        // Gunakan data fallback jika tidak ada data login
        setUserData({
          nama: 'Pengguna',
          jabatan: 'Pegawai', 
          statusAbsen: 'Belum Absen',
          jamMasuk: '08:00',
          jamKeluar: '17:00',
          totalJamKerja: '0h'
        });
        return;
      }
      
      const user = JSON.parse(userData);
      console.log('Parsed user:', user);
      
      // Gunakan id atau id_user yang tersedia
      const userId = user.id_user || user.id;
      if (!userId) {
        throw new Error('No user ID found');
      }
      
      const result = await PegawaiAPI.getDashboard(userId.toString());
      console.log('Dashboard API result:', result);
      console.log('Jam kerja data:', result.data?.jam_kerja);
      console.log('Jam masuk dari API:', result.data?.jam_kerja?.jam_masuk);
      console.log('Jam keluar dari API:', result.data?.jam_kerja?.jam_keluar);
      
      if (result.success) {
        const data = result.data;
        setUserData({
          nama: data.user_info?.nama_lengkap || user.nama || 'Pengguna',
          jabatan: data.user_info?.jabatan || 'Pegawai',
          statusAbsen: data.presensi_hari_ini ? 'Sudah Absen' : 'Belum Absen',
          jamMasuk: data.jam_kerja?.jam_masuk || '08:00',
          jamKeluar: data.jam_kerja?.jam_keluar || '17:00',
          totalJamKerja: data.summary_bulan_ini?.total_hadir + 'h' || '0h'
        });
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      console.log('Dashboard Error:', error);
      
      // Gunakan data fallback dari AsyncStorage jika ada
      const userData = await AsyncStorage.getItem('userData');
      if (userData) {
        const user = JSON.parse(userData);
        setUserData({
          nama: user.nama_lengkap || user.nama || 'Pengguna',
          jabatan: user.jabatan || 'Pegawai',
          statusAbsen: 'Belum Absen',
          jamMasuk: '08:00',
          jamKeluar: '17:00',
          totalJamKerja: '0h'
        });
        
        // Hanya tampilkan alert jika benar-benar error koneksi, bukan data kosong
        if (error instanceof Error && error.message.includes('fetch')) {
          Alert.alert('Info', 'Menggunakan data offline - tidak dapat terhubung ke server');
        }
      } else {
        // Jika tidak ada data sama sekali
        setUserData({
          nama: 'Pengguna',
          jabatan: 'Pegawai',
          statusAbsen: 'Belum Absen',
          jamMasuk: '08:00',
          jamKeluar: '17:00',
          totalJamKerja: '0h'
        });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <RNStatusBar barStyle="dark-content" backgroundColor="#004643" translucent={false} />
      <ScrollView 
        showsVerticalScrollIndicator={false} 
        contentContainerStyle={styles.scrollContent}
        bounces={false}
        overScrollMode="never"
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={fetchUserData} />
        }
      >
        {/* Background Gradient */}
        <LinearGradient
          colors={['#004643', '#2E7D32']}
          style={styles.gradientBackground}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          {/* SECTION 1: HEADER */}
          <View style={styles.headerSection}>
            <View style={styles.adminInfo}>
              <Text style={styles.greetingText}>Selamat datang,</Text>
              <Text style={styles.userName}>{userData.nama || 'Memuat...'}</Text>
            </View>
            <View style={styles.rightSection}>
              <View style={styles.dateTimeContainer}>
                <Text style={styles.dateTimeText}>{formatDate()}</Text>
                <Text style={styles.timeText}>
                  {currentTime.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB
                </Text>
              </View>
              <TouchableOpacity style={styles.notificationButton}>
                <Ionicons name="notifications" size={24} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>

          {/* SECTION 2: JAM KERJA CARD */}
          <View style={styles.jamKerjaContainer}>
            <View style={styles.jamKerjaBox}>
              <Ionicons name="timer-outline" size={20} color="#fff" style={{ marginRight: 10 }} />
              <View>
                <Text style={styles.jamKerjaLabel}>Jam Masuk</Text>
                <Text style={styles.jamKerjaValue}>{userData.jamMasuk || '08:00'}</Text>
              </View>
            </View>

            <View style={styles.jamKerjaBox}>
              <Ionicons name="calendar-outline" size={20} color="#fff" style={{ marginRight: 10 }} />
              <View>
                <Text style={styles.jamKerjaLabel}>Jam Pulang</Text>
                <Text style={styles.jamKerjaValue}>{userData.jamKeluar || '17:00'}</Text>
              </View>
            </View>
          </View>
        </LinearGradient>

        {/* SECTION 3: MENU LAYANAN */}
        <View style={styles.menuSection}>
          <View style={styles.mainMenuRow}>
            {[
              { id: 1, name: 'Kegiatan', icon: 'document-text', color: '#E8F5E9', iconColor: '#2E7D32' },
              { id: 2, name: 'Pengajuan', icon: 'clipboard', color: '#E3F2FD', iconColor: '#1976D2', route: '/pengajuan' },
              { id: 3, name: 'Lembur', icon: 'moon', color: '#F3E5F5', iconColor: '#7B1FA2' },
              { id: 4, name: 'Bantuan', icon: 'help-circle', color: '#FFEBEE', iconColor: '#D32F2F' },
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
                <View style={[styles.menuIconCircle, { backgroundColor: item.color }]}>
                  <Ionicons name={item.icon as any} size={22} color={item.iconColor} />
                </View>
                <Text style={styles.menuLabel}>{item.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  gradientBackground: {
    paddingTop: Platform.OS === 'ios' ? 20 : 40,
    paddingHorizontal: 20,
    paddingBottom: 80,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  scrollContent: { paddingBottom: 100 },
  headerSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 25,
  },
  adminInfo: { flex: 1 },
  greetingText: { fontSize: 14, color: '#E8F5E9' },
  userName: { fontSize: 18, fontWeight: 'bold', color: '#fff' },
  rightSection: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    gap: 12,
  },
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
  notificationButton: {
    padding: 10,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  summarySection: {
    marginBottom: 40,
  },
  quickStatsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: 8,
  },
  quickStatBox: {
    flex: 1,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    borderRadius: 8,
    padding: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  statContent: {
    alignItems: 'center',
    marginBottom: 4,
  },
  quickStatNumber: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    marginTop: 4,
    textAlign: 'center',
  },
  quickStatLabel: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
    fontWeight: '400',
  },
  jamKerjaContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 40,
  },
  jamKerjaBox: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    width: '48%',
    padding: 15,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  iconBox: { 
    width: 40, 
    height: 40, 
    borderRadius: 10, 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginRight: 10,
    backgroundColor: 'transparent'
  },
  jamKerjaLabel: { fontSize: 10, color: 'rgba(255,255,255,0.9)' },
  jamKerjaValue: { fontSize: 13, fontWeight: 'bold', color: '#fff' },
  menuSection: { 
    marginTop: -80, 
    marginHorizontal: 20, 
    backgroundColor: '#fff', 
    borderRadius: 20, 
    padding: 20,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    marginBottom: 20
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
  menuIconCircle: {
    width: Platform.OS === 'ios' ? 56 : 58,
    height: Platform.OS === 'ios' ? 56 : 58,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  menuLabel: { fontSize: 11, color: '#444', fontWeight: '500', textAlign: 'center' }
});
