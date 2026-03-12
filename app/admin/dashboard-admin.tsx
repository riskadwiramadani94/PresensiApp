import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  Image,
  Platform,
  RefreshControl,
  StatusBar as RNStatusBar,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  SafeAreaView,
} from "react-native";
import { API_CONFIG, getApiUrl } from "../../constants/config";
import NotificationBell from "../../components/NotificationBell";

interface RecentActivity {
  id: string;
  type: 'pengajuan' | 'presensi';
  nama_lengkap: string;
  jam: string;
  jenis?: string;
  status: string;
  tanggal: string;
  foto_profil?: string;
}

interface DashboardData {
  stats: {
    hadir: number;
    tidak_hadir: number;
    total_pegawai: number;
  };
  recent: RecentActivity[];
  user?: {
    nama_lengkap: string;
    email: string;
    password?: string;
  };
}

export default function AdminDashboard() {
  const router = useRouter();
  const [data, setData] = useState<DashboardData>({
    stats: { hadir: 0, tidak_hadir: 0, total_pegawai: 0 },
    recent: [],
    user: undefined,
  });
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    loadUserData();
    getDashboardData();

    const interval = setInterval(() => {
      getDashboardData();
    }, 30000);

    const timeInterval = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);

    return () => {
      clearInterval(interval);
      clearInterval(timeInterval);
    };
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadUserData();
    }, []),
  );

  const loadUserData = async () => {
    try {
      const userData = await AsyncStorage.getItem("userData");
      if (userData) {
        const user = JSON.parse(userData);
        setData((prev) => ({
          ...prev,
          user: {
            nama_lengkap: user.nama_lengkap || "Administrator",
            email: user.email || "",
            password: "",
          },
        }));
      } else {
        setData((prev) => ({
          ...prev,
          user: {
            nama_lengkap: "Administrator",
            email: "",
            password: "",
          },
        }));
      }
    } catch (error) {
      console.log("Error loading user data:", error);
      setData((prev) => ({
        ...prev,
        user: {
          nama_lengkap: "Administrator",
          email: "",
          password: "",
        },
      }));
    }
  };

  const getInitials = (name: string) => {
    return name.charAt(0).toUpperCase();
  };

  const formatJenisPengajuan = (jenis: string) => {
    const jenisMap: { [key: string]: string } = {
      'cuti_sakit': 'Cuti Sakit',
      'cuti_tahunan': 'Cuti Tahunan',
      'izin_pribadi': 'Izin Pribadi',
      'izin_datang_terlambat': 'Izin Datang Terlambat',
      'pulang_cepat_terencana': 'Pulang Cepat Terencana',
      'pulang_cepat_mendadak': 'Pulang Cepat Mendadak',
      'koreksi_presensi': 'Koreksi Presensi',
      'lembur_hari_kerja': 'Lembur Hari Kerja',
      'lembur_akhir_pekan': 'Lembur Akhir Pekan',
      'lembur_hari_libur': 'Lembur Hari Libur',
    };
    
    if (jenisMap[jenis]) {
      return jenisMap[jenis];
    }
    
    // Format otomatis: ubah underscore jadi spasi dan capitalize setiap kata
    return jenis
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const getDashboardData = async () => {
    try {
      const response = await fetch(getApiUrl(API_CONFIG.ENDPOINTS.ADMIN));
      const result = await response.json();

      if (result.success) {
        const totalPegawai = result.stats?.total_pegawai || 0;
        
        // Format recent activities untuk menggabungkan pengajuan dan presensi
        const recentActivities: RecentActivity[] = [];
        
        // Cek apakah sudah lewat jam 12 malam (reset aktivitas)
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        
        // Tambahkan data presensi (hanya yang ada aktivitas)
        if (result.recent) {
          result.recent.forEach((item: any) => {
            // Filter: hanya tampilkan jika ada aktivitas nyata (bukan "Tidak Hadir")
            if (item.status !== 'Tidak Hadir' && item.jam_masuk) {
              // Cek apakah aktivitas ini masih hari ini
              const activityDate = new Date(item.tanggal_absen || new Date());
              const activityDay = new Date(activityDate.getFullYear(), activityDate.getMonth(), activityDate.getDate());
              
              // Hanya tampilkan aktivitas hari ini
              if (activityDay.getTime() === today.getTime()) {
                recentActivities.push({
                  id: `presensi-${item.nama_lengkap}-${item.jam_masuk}`,
                  type: 'presensi',
                  nama_lengkap: item.nama_lengkap,
                  jam: item.jam_masuk, // Backend sudah mengirim format HH:MM:SS
                  jenis: 'Presensi Masuk',
                  status: item.status,
                  tanggal: item.tanggal_absen || new Date().toISOString(),
                  foto_profil: item.foto_profil
                });
              }
            }
          });
        }
        
        // Tambahkan data pengajuan (semua pengajuan adalah aktivitas nyata)
        if (result.pengajuan) {
          result.pengajuan.forEach((item: any) => {
            // Cek apakah pengajuan ini masih hari ini
            const pengajuanDate = new Date(item.tanggal_pengajuan || new Date());
            const pengajuanDay = new Date(pengajuanDate.getFullYear(), pengajuanDate.getMonth(), pengajuanDate.getDate());
            
            // Hanya tampilkan pengajuan hari ini
            if (pengajuanDay.getTime() === today.getTime()) {
              // Format jam dengan detik untuk pengajuan
              let jamFormatted = item.jam_pengajuan;
              if (jamFormatted && jamFormatted.length >= 5) {
                if (jamFormatted.length >= 8) {
                  jamFormatted = jamFormatted.substring(0, 8);
                } else {
                  jamFormatted = jamFormatted + ':00';
                }
              } else {
                jamFormatted = new Date().toLocaleTimeString('id-ID', { 
                  hour: '2-digit', 
                  minute: '2-digit', 
                  second: '2-digit' 
                });
              }
              
              recentActivities.push({
                id: `pengajuan-${item.id_pengajuan}`,
                type: 'pengajuan',
                nama_lengkap: item.nama_lengkap,
                jam: jamFormatted,
                jenis: formatJenisPengajuan(item.jenis_pengajuan),
                status: item.status === 'menunggu' ? 'Menunggu' : item.status === 'disetujui' ? 'Disetujui' : 'Ditolak',
                tanggal: item.tanggal_pengajuan || new Date().toISOString(),
                foto_profil: item.foto_profil
              });
            }
          });
        }
        
        // Sort berdasarkan waktu terbaru
        recentActivities.sort((a, b) => new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime());

        setData((prev) => ({
          stats: {
            hadir: result.stats?.hadir || 0,
            tidak_hadir: result.stats?.tidak_hadir || 0,
            total_pegawai: totalPegawai,
          },
          recent: recentActivities.slice(0, 10), // Ambil 10 aktivitas terbaru
          user: prev.user,
        }));
      }
    } catch (error) {
      console.log("Koneksi Error:", error);
      setData((prev) => ({
        stats: { hadir: 0, tidak_hadir: 0, total_pegawai: 0 },
        recent: [],
        user: prev.user,
      }));
    } finally {
      setLoading(false);
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
            <RefreshControl refreshing={loading} onRefresh={getDashboardData} />
          }
        >
          {loading ? (
            /* ========================================
                 SKELETON LOADING STATE - DASHBOARD ADMIN
            ======================================== */
            <>
              <View style={styles.dashboardHeader}>
                <View style={styles.backgroundPattern}>
                  <View style={styles.bubble1} />
                  <View style={styles.bubble2} />
                  <View style={styles.bubble3} />
                </View>

                <View style={styles.headerSection}>
                  <View style={styles.adminInfo}>
                    <View style={styles.skeletonGreeting} />
                    <View style={styles.skeletonUserName} />
                  </View>
                  <View style={styles.dateTimeContainer}>
                    <View style={styles.skeletonDateTime} />
                    <View style={styles.skeletonTime} />
                  </View>
                </View>

                <View style={styles.summarySection}>
                  <View style={styles.statsCard}>
                    <View style={styles.quickStatsRow}>
                      <View style={styles.statItem}>
                        <View style={styles.skeletonStatIcon} />
                        <View style={styles.skeletonStatNumber} />
                        <View style={styles.skeletonStatLabel} />
                      </View>
                      
                      <View style={styles.divider} />
                      
                      <View style={styles.statItem}>
                        <View style={styles.skeletonStatIcon} />
                        <View style={styles.skeletonStatNumber} />
                        <View style={styles.skeletonStatLabel} />
                      </View>
                      
                      <View style={styles.divider} />
                      
                      <View style={styles.statItem}>
                        <View style={styles.skeletonStatIcon} />
                        <View style={styles.skeletonStatNumber} />
                        <View style={styles.skeletonStatLabel} />
                      </View>
                      
                      <View style={styles.divider} />
                      
                      <View style={styles.statItem}>
                        <View style={styles.skeletonStatIcon} />
                        <View style={styles.skeletonStatNumber} />
                        <View style={styles.skeletonStatLabel} />
                      </View>
                    </View>
                  </View>
                </View>
              </View>

              <View style={styles.menuSection}>
                <View style={styles.sectionHeader}>
                  <View style={styles.skeletonSectionTitle} />
                </View>
                <View style={styles.mainMenuRow}>
                  {[1, 2, 3, 4].map((item) => (
                    <View key={item} style={styles.mainMenuItem}>
                      <View style={styles.skeletonMenuIcon} />
                      <View style={styles.skeletonMenuLabel} />
                    </View>
                  ))}
                </View>
                <View style={styles.secondMenuRow}>
                  <View style={styles.mainMenuItem}>
                    <View style={styles.skeletonMenuIcon} />
                    <View style={styles.skeletonMenuLabel} />
                  </View>
                </View>

                {/* Skeleton Aktivitas Terbaru */}
                <View style={styles.activitySection}>
                  <View style={styles.sectionHeader}>
                    <View style={styles.skeletonSectionTitle} />
                  </View>
                  <View style={styles.activityCard}>
                    <View style={styles.activityScrollView}>
                      {[1, 2, 3, 4, 5].map((item) => (
                        <View key={item} style={styles.activityItem}>
                          <View style={styles.activityRow}>
                            <View style={styles.activityLeft}>
                              <View style={styles.skeletonAvatar} />
                              <View style={styles.skeletonActivityText} />
                            </View>
                            <View style={styles.skeletonActivityBadge} />
                          </View>
                          <View style={styles.activityDetail}>
                            <View style={styles.skeletonActivityDetail} />
                          </View>
                        </View>
                      ))}
                    </View>
                  </View>
                </View>
              </View>
            </>
          ) : (
            /* ========================================
                 ACTUAL CONTENT
            ======================================== */
            <>
              <View style={styles.dashboardHeader}>
                <View style={styles.backgroundPattern}>
                  <View style={styles.bubble1} />
                  <View style={styles.bubble2} />
                  <View style={styles.bubble3} />
                </View>

                <View style={styles.headerSection}>
                  <View style={styles.adminInfo}>
                    <Text style={styles.greetingText}>Selamat datang,</Text>
                    <Text style={styles.userName}>
                      {data.user?.nama_lengkap || "Administrator"}
                    </Text>
                  </View>
                  <View style={styles.dateTimeContainer}>
                    <Text style={styles.dateTimeText}>
                      {currentTime.toLocaleDateString("id-ID", {
                        weekday: "long",
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </Text>
                    <Text style={styles.timeText}>
                      {currentTime.toLocaleTimeString("id-ID", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}{" "}
                      WIB
                    </Text>
                  </View>
                  <View style={styles.notificationContainer}>
                    <NotificationBell userRole="admin" />
                  </View>
                </View>

                <View style={styles.summarySection}>
                  <View style={styles.statsCard}>
                    <View style={styles.quickStatsRow}>
                      <View style={styles.statItem}>
                        <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
                        <Text style={styles.quickStatNumber}>{data.stats.hadir}</Text>
                        <Text style={styles.quickStatLabel}>Hadir</Text>
                      </View>
                      
                      <View style={styles.divider} />
                      
                      <View style={styles.statItem}>
                        <Ionicons name="close-circle" size={20} color="#EF5350" />
                        <Text style={styles.quickStatNumber}>{data.stats.tidak_hadir}</Text>
                        <Text style={styles.quickStatLabel}>Tidak Hadir</Text>
                      </View>
                      
                      <View style={styles.divider} />
                      
                      <View style={styles.statItem}>
                        <Ionicons name="people" size={20} color="#42A5F5" />
                        <Text style={styles.quickStatNumber}>{data.stats.total_pegawai}</Text>
                        <Text style={styles.quickStatLabel}>Total</Text>
                      </View>
                      
                      <View style={styles.divider} />
                      
                      <View style={styles.statItem}>
                        <Ionicons name="analytics" size={20} color="#FFA726" />
                        <Text style={styles.quickStatNumber}>
                          {data.stats.total_pegawai > 0
                            ? Math.round((data.stats.hadir / data.stats.total_pegawai) * 100)
                            : 0}%
                        </Text>
                        <Text style={styles.quickStatLabel}>Kehadiran</Text>
                      </View>
                    </View>
                  </View>
                </View>
              </View>

              <View style={styles.menuSection}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Menu Utama</Text>
            </View>
            <View style={styles.mainMenuRow}>
              {[
                { id: 1, name: 'Pegawai', image: require('../../assets/images/icons/admin/pegawai.png'), route: '/menu-admin/pegawai-akun' },
                { id: 2, name: 'Pengajuan', image: require('../../assets/images/icons/admin/pengajuan.png'), route: '/menu-admin/pengajuan' },
                { id: 3, name: 'Dinas', image: require('../../assets/images/icons/admin/dinas.png'), route: '/menu-admin/kelola-dinas' },
                { id: 4, name: 'Laporan', image: require('../../assets/images/icons/admin/laporan.png'), route: '/menu-admin/laporan/laporan-admin' },
              ].map((item) => (
                <TouchableOpacity 
                  key={item.id} 
                  style={styles.mainMenuItem}
                  activeOpacity={0.7}
                  onPress={() => router.push(item.route as any)}
                >
                  <Image source={item.image} style={styles.menuIcon} />
                  <Text style={styles.menuLabel}>{item.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.secondMenuRow}>
              <TouchableOpacity 
                style={styles.mainMenuItem}
                activeOpacity={0.7}
                onPress={() => router.push('/menu-admin/pengaturan' as any)}
              >
                <Image source={require('../../assets/images/icons/admin/pengaturan.png')} style={styles.menuIcon} />
                <Text style={styles.menuLabel}>Pengaturan</Text>
              </TouchableOpacity>
            </View>

            {/* Aktivitas Terbaru */}
            <View style={styles.activitySection}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Aktivitas Terbaru</Text>
              </View>
              <View style={styles.activityCard}>
                <ScrollView 
                  style={styles.activityScrollView}
                  showsVerticalScrollIndicator={true}
                  nestedScrollEnabled={true}
                >
                  {data.recent.length > 0 ? (
                    data.recent.map((activity, index) => (
                      <View key={index} style={styles.activityItem}>
                        <View style={styles.activityRow}>
                          <View style={styles.activityLeft}>
                            <View style={styles.activityAvatar}>
                              {activity.foto_profil ? (
                                <Image 
                                  source={{ uri: `${getApiUrl('')}/${activity.foto_profil}` }}
                                  style={styles.avatarImage}
                                />
                              ) : (
                                <Text style={styles.avatarInitials}>
                                  {getInitials(activity.nama_lengkap)}
                                </Text>
                              )}
                            </View>
                            <Text style={styles.activityMainText}>
                              {activity.nama_lengkap} {activity.type === 'pengajuan' ? 'melakukan pengajuan' : 'absen'}
                            </Text>
                          </View>
                          <View style={[
                            styles.activityBadge,
                            activity.status === 'Hadir' || activity.status === 'Disetujui' ? styles.badgeSuccess :
                            activity.status === 'Terlambat' || activity.status === 'Menunggu' ? styles.badgeWarning :
                            styles.badgeError
                          ]}>
                            <Text style={[
                              styles.activityStatus,
                              activity.status === 'Hadir' || activity.status === 'Disetujui' ? styles.statusSuccess :
                              activity.status === 'Terlambat' || activity.status === 'Menunggu' ? styles.statusWarning :
                              styles.statusError
                            ]}>{activity.status}</Text>
                          </View>
                        </View>
                        <View style={styles.activityDetail}>
                          <Text style={styles.activityDetailText}>
                            {activity.jam} - {activity.jenis || (activity.type === 'presensi' ? 'Presensi Masuk' : 'Pengajuan')}
                          </Text>
                        </View>
                      </View>
                    ))
                  ) : (
                    <View style={styles.emptyActivity}>
                      <Ionicons name="time-outline" size={40} color="#ccc" />
                      <Text style={styles.emptyText}>Belum ada aktivitas hari ini</Text>
                    </View>
                  )}
                </ScrollView>
              </View>
            </View>
              </View>
            </>
          )}
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
  container: { flex: 1, backgroundColor: "#FFFFFF" },
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
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: Platform.OS === 'ios' ? 20 : 40,
    paddingBottom: 10,
    marginBottom: 25,
  },
  adminInfo: { flex: 1 },
  greetingText: { fontSize: 13, color: "#E8F5E9", fontWeight: "500" },
  userName: { fontSize: 22, fontWeight: "800", color: "#fff", letterSpacing: -0.5 },
  dateTimeContainer: {
    alignItems: "flex-end",
    marginRight: 10,
  },
  notificationContainer: {
    alignItems: "flex-end",
  },
  dateTimeText: {
    fontSize: 12,
    color: "rgba(255,255,255,0.8)",
    fontWeight: "500",
  },
  timeText: {
    fontSize: 15,
    color: "#fff",
    fontWeight: "700",
    marginTop: 1,
  },
  summarySection: {
    marginBottom: 40,
    paddingHorizontal: 8,
  },
  statsCard: {
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)",
  },
  quickStatsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
  },
  statItem: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: 4,
  },
  divider: {
    width: 1,
    height: 50,
    backgroundColor: "rgba(255,255,255,0.3)",
  },
  quickStatNumber: {
    fontSize: 18,
    fontWeight: "700",
    color: "#fff",
    marginTop: 6,
    marginBottom: 4,
    textAlign: "center",
  },
  quickStatLabel: {
    fontSize: 8,
    color: "rgba(255,255,255,0.95)",
    textAlign: "center",
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.2,
  },
  menuSection: { 
    marginTop: -50, 
    backgroundColor: '#FFFFFF', 
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingTop: 35,
    paddingHorizontal: 24,
    paddingBottom: 40,
    flex: 1,
  },
  sectionHeader: {
    borderLeftWidth: 4,
    borderLeftColor: '#004643',
    paddingLeft: 12,
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#004643',
    letterSpacing: -0.3,
  },
  mainMenuRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: Platform.OS === 'ios' ? 5 : 0,
  },
  mainMenuItem: {
    marginTop: -10,
    width: Platform.OS === 'ios' ? '22%' : '23%',
    alignItems: 'center',
  },
  secondMenuRow: {
    flexDirection: 'row',
    marginTop: 25,
    paddingHorizontal: Platform.OS === 'ios' ? 5 : 0,
  },
  menuIcon: {
    width: 35,
    height: 35,
    resizeMode: 'contain',
    marginBottom: 8,
  },
  menuLabel: { fontSize: 12, color: '#444', fontWeight: '600', textAlign: 'center' },
  
  // Activity Section
  activitySection: {
    marginTop: 30,
  },
  activityCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    maxHeight: 300, // Fixed height untuk scroll
  },
  activityScrollView: {
    maxHeight: 280,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  activityItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  activityRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  activityLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  activityAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E6F0EF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  activityMainText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#333',
    flex: 1,
  },
  activityDetail: {
    marginLeft: 42, // Sejajar dengan text utama (32px avatar + 10px margin)
  },
  activityDetailText: {
    fontSize: 13,
    color: '#666',
    fontWeight: '500',
  },
  activityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    minWidth: 70,
    alignItems: 'center',
  },
  badgeSuccess: {
    backgroundColor: '#E8F5E9',
  },
  badgeWarning: {
    backgroundColor: '#FFF3E0',
  },
  badgeError: {
    backgroundColor: '#FFEBEE',
  },
  activityStatus: {
    fontSize: 12,
    fontWeight: '700',
  },
  statusSuccess: {
    color: '#4CAF50',
  },
  statusWarning: {
    color: '#FF9800',
  },
  statusError: {
    color: '#F44336',
  },
  emptyActivity: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 15,
    color: '#999',
    marginTop: 10,
    fontWeight: '500',
  },
  avatarImage: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  avatarInitials: {
    fontSize: 12,
    fontWeight: '600',
    color: '#004643',
  },

  /* ========================================
     SKELETON STYLES - DASHBOARD ADMIN
  ======================================== */
  skeletonGreeting: {
    width: 100,
    height: 14,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 4,
    marginBottom: 4,
  },
  skeletonUserName: {
    width: 140,
    height: 18,
    backgroundColor: 'rgba(255,255,255,0.4)',
    borderRadius: 4,
  },
  skeletonDateTime: {
    width: 80,
    height: 10,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 4,
    marginBottom: 2,
  },
  skeletonTime: {
    width: 60,
    height: 12,
    backgroundColor: 'rgba(255,255,255,0.4)',
    borderRadius: 4,
  },
  skeletonStatIcon: {
    width: 20,
    height: 20,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 10,
    marginBottom: 6,
  },
  skeletonStatNumber: {
    width: 24,
    height: 18,
    backgroundColor: 'rgba(255,255,255,0.4)',
    borderRadius: 4,
    marginBottom: 4,
  },
  skeletonStatLabel: {
    width: 40,
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 4,
  },
  skeletonSectionTitle: {
    width: 120,
    height: 16,
    backgroundColor: '#E0E0E0',
    borderRadius: 4,
  },
  skeletonMenuIcon: {
    width: 35,
    height: 35,
    backgroundColor: '#E0E0E0',
    borderRadius: 8,
    marginBottom: 8,
  },
  skeletonMenuLabel: {
    width: 50,
    height: 11,
    backgroundColor: '#F0F0F0',
    borderRadius: 4,
  },
  skeletonAvatar: {
    width: 32,
    height: 32,
    backgroundColor: '#E0E0E0',
    borderRadius: 16,
    marginRight: 10,
  },
  skeletonActivityText: {
    width: 150,
    height: 14,
    backgroundColor: '#E0E0E0',
    borderRadius: 4,
    flex: 1,
  },
  skeletonActivityBadge: {
    width: 70,
    height: 24,
    backgroundColor: '#E0E0E0',
    borderRadius: 12,
  },
  skeletonActivityDetail: {
    width: 120,
    height: 12,
    backgroundColor: '#F0F0F0',
    borderRadius: 4,
  },
});
