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

  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    loadUserDataFirst();
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

  const loadUserDataFirst = async () => {
    try {
      const userData = await AsyncStorage.getItem('userData');
      if (userData) {
        const user = JSON.parse(userData);
        // Set data dari AsyncStorage DULU
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
      // Ambil user data dari AsyncStorage
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
        
        // Tentukan status dan keterangan absen
        let statusAbsen = 'Belum Absen';
        let keteranganAbsen = 'Anda belum melakukan absensi hari ini';
        
        if (data.presensi_hari_ini) {
          const jamMasuk = data.presensi_hari_ini.jam_masuk;
          const status = data.presensi_hari_ini.status;
          
          if (status === 'Terlambat') {
            statusAbsen = 'Terlambat';
            keteranganAbsen = `Anda terlambat absen pada pukul ${jamMasuk?.substring(0, 5)} WIB`;
          } else {
            statusAbsen = 'Sudah Absen';
            keteranganAbsen = `Anda sudah absen pada pukul ${jamMasuk?.substring(0, 5)} WIB`;
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
        
        // Update AsyncStorage dengan data terbaru
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
      
      // Tetap gunakan data dari AsyncStorage yang sudah di-set di loadUserDataFirst
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <RNStatusBar 
        barStyle="light-content"
        backgroundColor="transparent"
        translucent={true}
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
        {/* Background Gradient */}
        <LinearGradient
          colors={['#004643', '#43A047']}
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

          {/* SECTION 2: INFO CARD - STATUS & JAM KERJA */}
          <View style={styles.infoCard}>
            {/* Status Absensi */}
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

            {/* Divider */}
            <View style={styles.dividerLine} />

            {/* Jam Kerja */}
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  gradientBackground: {
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingHorizontal: 20,
    paddingBottom: 80,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  scrollContent: { flexGrow: 1 },
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
  infoCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 40,
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
    marginTop: -80, 
    backgroundColor: '#FFFFFF', 
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingTop: 35,
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
