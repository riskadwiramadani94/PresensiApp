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
} from "react-native";
import { SkeletonLoader } from "../../components";
import AppHeader from "../../components/AppHeader";
import { API_CONFIG, getApiUrl } from "../../constants/config";

interface RecentActivity {
  nama_lengkap: string;
  status: string;
  jam_masuk: string;
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

    // Auto refresh setiap 30 detik
    const interval = setInterval(() => {
      getDashboardData();
    }, 30000);

    // Update waktu setiap menit
    const timeInterval = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);

    return () => {
      clearInterval(interval);
      clearInterval(timeInterval);
    };
  }, []);

  // Auto-refresh saat kembali ke halaman ini
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
        // Set user data dari AsyncStorage DULU
        setData((prev) => ({
          ...prev,
          user: {
            nama_lengkap: user.nama_lengkap || "Administrator",
            email: user.email || "",
            password: "",
          },
        }));
      } else {
        // Fallback jika tidak ada data
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
      // Fallback jika error
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

  const getDashboardData = async () => {
    try {
      console.log(
        "Fetching dashboard data from:",
        getApiUrl(API_CONFIG.ENDPOINTS.ADMIN),
      );
      const response = await fetch(getApiUrl(API_CONFIG.ENDPOINTS.ADMIN));

      const result = await response.json();

      if (result.success) {
        const totalPegawai = result.stats?.total_pegawai || 0;

        setData((prev) => ({
          stats: {
            hadir: result.stats?.hadir || 0,
            tidak_hadir: result.stats?.tidak_hadir || 0,
            total_pegawai: totalPegawai,
          },
          recent: result.recent || [],
          user: prev.user, // Pertahankan data user dari AsyncStorage
        }));
      } else {
        console.log("API returned success: false", result.message);
      }
    } catch (error) {
      console.log("Koneksi Error:", error);
      // Set default data jika error, tapi pertahankan user data
      setData((prev) => ({
        stats: { hadir: 0, tidak_hadir: 0, total_pegawai: 0 },
        recent: [],
        user: prev.user, // Pertahankan data user dari AsyncStorage
      }));
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
          <RefreshControl refreshing={loading} onRefresh={getDashboardData} />
        }
      >
        {/* AppHeader dengan variant dashboard */}
        <AppHeader variant="dashboard" backgroundColor="#004643">
          {/* Background Pattern */}
          <View style={styles.backgroundPattern}>
            <View style={styles.bubble1} />
            <View style={styles.bubble2} />
            <View style={styles.bubble3} />
          </View>

          {/* SECTION 1: HEADER */}
          <View style={styles.headerSection}>
              <View style={styles.adminInfo}>
                <Text style={styles.greetingText}>Selamat datang,</Text>
                <Text style={styles.userName}>
                  {data.user?.nama_lengkap || "Administrator"}
                </Text>
              </View>
              <View style={styles.rightSection}>
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
                <TouchableOpacity
                  style={styles.notificationButton}
                  onPress={() => router.push("/notifikasi-admin" as any)}
                >
                  <Ionicons name="notifications" size={24} color="#fff" />
                </TouchableOpacity>
              </View>
            </View>

            {/* SECTION 2: RINGKASAN KEHADIRAN */}
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
          </AppHeader>

        {/* SECTION 3: MENU LAYANAN */}
        <View style={styles.menuSection}>
          <View style={styles.mainMenuRow}>
            {[
              { id: 1, name: 'Pegawai', image: require('../../assets/images/icons/admin/pegawai.png'), route: '/pegawai-akun' },
              { id: 2, name: 'Dinas', image: require('../../assets/images/icons/admin/dinas.png'), route: '/kelola-dinas' },
              { id: 3, name: 'Laporan', image: require('../../assets/images/icons/admin/laporan.png'), route: '/laporan/laporan-admin' },
              { id: 4, name: 'Pengaturan', image: require('../../assets/images/icons/admin/pengaturan.png'), route: '/pengaturan' },
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
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFFFFF" },
  scrollContent: { flexGrow: 1 },
  backgroundPattern: {
    position: 'absolute',
    top: 0,
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
    top: -100,
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
    paddingBottom: 10,
    marginBottom: 25,
  },
  adminInfo: { flex: 1 },
  greetingText: { fontSize: 14, color: "#E8F5E9" },
  userName: { fontSize: 18, fontWeight: "bold", color: "#fff" },
  rightSection: {
    alignItems: "flex-end",
    flexDirection: "row",
    gap: 12,
  },
  dateTimeContainer: {
    alignItems: "flex-end",
  },
  dateTimeText: {
    fontSize: 10,
    color: "rgba(255,255,255,0.8)",
    fontWeight: "400",
  },
  timeText: {
    fontSize: 12,
    color: "#fff",
    fontWeight: "bold",
    marginTop: 1,
  },
  notificationButton: {
    padding: 10,
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)",
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
    marginTop: -100, 
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
  menuIcon: {
    width: 48,
    height: 48,
    resizeMode: 'contain',
    marginBottom: 8,
  },
  menuLabel: { fontSize: 11, color: '#444', fontWeight: '500', textAlign: 'center' },
});
