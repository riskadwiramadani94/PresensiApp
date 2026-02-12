import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  Image,
  Modal,
  Platform,
  RefreshControl,
  SafeAreaView,
  StatusBar as RNStatusBar,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { SkeletonLoader } from "../../components";
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
  const insets = useSafeAreaInsets();
  const [data, setData] = useState<DashboardData>({
    stats: { hadir: 0, tidak_hadir: 0, total_pegawai: 0 },
    recent: [],
    user: { nama_lengkap: "Administrator", email: "", password: "" },
  });
  const [loading, setLoading] = useState(true);
  const [showNotifications, setShowNotifications] = useState(false);

  useEffect(() => {
    loadUserData();
    getDashboardData();

    // Auto refresh setiap 30 detik - load user data juga
    const interval = setInterval(() => {
      loadUserData();
      getDashboardData();
    }, 30000);

    return () => clearInterval(interval);
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
        setData((prev) => ({
          ...prev,
          user: {
            nama_lengkap: user.nama_lengkap || "Administrator",
            email: user.email || "",
            password: "",
          },
        }));
      }
    } catch (error) {
      console.log("Error loading user data:", error);
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
    <SafeAreaView style={styles.container}>
      <RNStatusBar 
        barStyle="dark-content" 
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
        {/* Background Gradient */}
        <LinearGradient
          colors={["#004643", "#2E7D32"]}
          style={styles.gradientBackground}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
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
                {new Date().toLocaleDateString("id-ID", {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </Text>
              <Text style={styles.timeText}>
                {new Date().toLocaleTimeString("id-ID", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}{" "}
                WIB
              </Text>
            </View>
            <TouchableOpacity
              style={styles.notificationButton}
              onPress={() => setShowNotifications(true)}
            >
              <Ionicons name="notifications" size={24} color="#fff" />
            </TouchableOpacity>
          </View>
          </View>

          {/* SECTION 2: RINGKASAN KEHADIRAN */}
          <View style={styles.summarySection}>
          <View style={styles.quickStatsRow}>
            <View style={styles.quickStatBox}>
              <View style={styles.statContent}>
                <Ionicons name="checkmark-circle" size={18} color="#fff" />
                <Text style={styles.quickStatNumber}>{data.stats.hadir}</Text>
              </View>
              <Text style={styles.quickStatLabel}>Hadir</Text>
            </View>

            <View style={styles.quickStatBox}>
              <View style={styles.statContent}>
                <Ionicons name="close-circle" size={18} color="#fff" />
                <Text style={styles.quickStatNumber}>
                  {data.stats.tidak_hadir}
                </Text>
              </View>
              <Text style={styles.quickStatLabel}>Tidak Hadir</Text>
            </View>

            <View style={styles.quickStatBox}>
              <View style={styles.statContent}>
                <Ionicons name="people" size={18} color="#fff" />
                <Text style={styles.quickStatNumber}>
                  {data.stats.total_pegawai}
                </Text>
              </View>
              <Text style={styles.quickStatLabel}>Total</Text>
            </View>

            <View style={styles.quickStatBox}>
              <View style={styles.statContent}>
                <Ionicons name="analytics" size={18} color="#fff" />
                <Text style={styles.quickStatNumber}>
                  {data.stats.total_pegawai > 0
                    ? Math.round(
                        (data.stats.hadir / data.stats.total_pegawai) * 100,
                      )
                    : 0}
                  %
                </Text>
              </View>
              <Text style={styles.quickStatLabel}>Kehadiran</Text>
            </View>
          </View>
          </View>
        </LinearGradient>

        {/* SECTION 3: MENU LAYANAN */}
        <View style={styles.menuSection}>
          {/* Baris pertama - 4 menu utama */}
          <View style={styles.mainMenuRow}>
            {[
              {
                id: 1,
                name: "Pegawai",
                icon: "people",
                color: "#E8F5E9",
                iconColor: "#2E7D32",
                route: "/pegawai-akun",
              },
              {
                id: 2,
                name: "Dinas",
                icon: "business",
                color: "#E3F2FD",
                iconColor: "#1976D2",
                route: "/kelola-dinas",
              },
              {
                id: 3,
                name: "Laporan",
                icon: "document-text",
                color: "#F3E5F5",
                iconColor: "#7B1FA2",
                route: "/laporan/laporan-admin",
              },
              {
                id: 4,
                name: "Pengaturan",
                icon: "settings",
                color: "#FFEBEE",
                iconColor: "#D32F2F",
                route: "/pengaturan",
              },
            ].map((item) => (
              <TouchableOpacity
                key={item.id}
                style={styles.mainMenuItem}
                onPress={() => router.push(item.route as any)}
              >
                <View
                  style={[
                    styles.menuIconCircle,
                    { backgroundColor: item.color },
                  ]}
                >
                  <Ionicons
                    name={item.icon as any}
                    size={22}
                    color={item.iconColor}
                  />
                </View>
                <Text style={styles.menuLabel}>{item.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* SECTION 4: LOG AKTIVITAS */}
        <View style={styles.recentList}>
          <Text style={styles.sectionTitle}>Aktivitas Terbaru</Text>

          {loading ? (
            <SkeletonLoader message="Memuat aktivitas..." />
          ) : data.recent &&
            Array.isArray(data.recent) &&
            data.recent.length > 0 ? (
            data.recent.map((item: any, index: number) => (
              <View key={index} style={styles.activityCard}>
                <Image
                  source={{
                    uri: `https://ui-avatars.com/api/?name=${item.nama_lengkap}&background=random`,
                  }}
                  style={styles.avatar}
                />
                <View style={{ flex: 1 }}>
                  <Text style={styles.nameText}>{item.nama_lengkap}</Text>
                  <Text style={styles.activityText}>
                    {item.status} •{" "}
                    {item.jam_masuk ? item.jam_masuk.substring(0, 5) : "-"} WIB
                  </Text>
                </View>
                <View
                  style={[
                    styles.statusBadge,
                    {
                      backgroundColor:
                        item.status === "Hadir" ? "#E8F5E9" : "#FFF4E5",
                    },
                  ]}
                >
                  <Text
                    style={{
                      color: item.status === "Hadir" ? "#2E7D32" : "#F9BC60",
                      fontSize: 10,
                      fontWeight: "bold",
                    }}
                  >
                    {item.status}
                  </Text>
                </View>
              </View>
            ))
          ) : (
            <Text style={{ textAlign: "center", color: "#999", marginTop: 20 }}>
              Belum ada aktivitas hari ini
            </Text>
          )}
        </View>
      </ScrollView>

      {/* Modal Notifikasi */}
      <Modal
        visible={showNotifications}
        animationType="fade"
        transparent={true}
        statusBarTranslucent={true}
        onRequestClose={() => setShowNotifications(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowNotifications(false)}
        >
          <View
            style={[
              styles.notificationDropdown,
              {
                top:
                  Platform.OS === "ios"
                    ? insets.top + 60
                    : (RNStatusBar.currentHeight || 0) + 70,
              },
            ]}
          >
            <View style={styles.dropdownArrow} />
            <View style={styles.dropdownHeader}>
              <Text style={styles.modalTitle}>Notifikasi</Text>
              <TouchableOpacity
                onPress={() => {
                  setShowNotifications(false);
                  router.push("/notifikasi-admin" as any);
                }}
              >
                <Text style={styles.seeAllText}>Lihat Semua</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.notificationList}>
              <View style={styles.notificationItem}>
                <View style={styles.notificationIcon}>
                  <Ionicons name="person-add" size={16} color="#4CAF50" />
                </View>
                <View style={styles.notificationContent}>
                  <Text style={styles.notificationTitle}>
                    Pegawai Baru Terdaftar
                  </Text>
                  <Text style={styles.notificationDesc}>
                    John Doe telah mendaftar sebagai pegawai baru
                  </Text>
                  <Text style={styles.notificationTime}>2 jam yang lalu</Text>
                </View>
              </View>

              <View style={styles.notificationItem}>
                <View style={styles.notificationIcon}>
                  <Ionicons name="time" size={16} color="#FF9800" />
                </View>
                <View style={styles.notificationContent}>
                  <Text style={styles.notificationTitle}>Keterlambatan</Text>
                  <Text style={styles.notificationDesc}>
                    5 pegawai terlambat masuk hari ini
                  </Text>
                  <Text style={styles.notificationTime}>1 jam yang lalu</Text>
                </View>
              </View>

              <View style={styles.notificationItem}>
                <View style={styles.notificationIcon}>
                  <Ionicons name="checkmark-circle" size={16} color="#2196F3" />
                </View>
                <View style={styles.notificationContent}>
                  <Text style={styles.notificationTitle}>
                    Validasi Diperlukan
                  </Text>
                  <Text style={styles.notificationDesc}>
                    3 item menunggu validasi di Pusat Validasi
                  </Text>
                  <Text style={styles.notificationTime}>
                    30 menit yang lalu
                  </Text>
                </View>
              </View>
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F9FAFB" },
  gradientBackground: {
    paddingTop: Platform.OS === 'ios' ? 20 : 40,
    paddingHorizontal: 20,
    paddingBottom: 80,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  scrollContent: { paddingBottom: 100 },
  headerSection: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 25,
  },
  adminInfo: { flex: 1 },
  credentialRow: { flexDirection: "row", alignItems: "center", marginTop: 4 },
  emailText: { fontSize: 12, color: "#E8F5E9", fontFamily: "monospace" },
  passwordText: { fontSize: 12, color: "#E8F5E9", fontFamily: "monospace" },
  eyeBtn: { padding: 2, marginLeft: 2 },
  greetingText: { fontSize: 14, color: "#E8F5E9" },
  userName: { fontSize: 18, fontWeight: "bold", color: "#fff" },
  userJob: { fontSize: 12, color: "#E8F5E9", fontWeight: "500", marginTop: 2 },
  notificationBtn: {
    padding: 10,
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)",
  },
  dotBadge: {
    position: "absolute",
    top: 10,
    right: 12,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#FF4D4D",
    borderWidth: 1,
    borderColor: "#fff",
  },
  summarySection: {
    marginBottom: 40,
  },
  quickStatsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 8,
  },
  quickStatBox: {
    flex: 1,
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)",
    borderRadius: 8,
    padding: 8,
    paddingBottom: 8,
    backgroundColor: "rgba(255,255,255,0.05)",
    position: "relative",
    overflow: "hidden",
  },
  progressFill: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    borderRadius: 9,
  },
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
  statContent: {
    alignItems: "center",
    marginBottom: 4,
  },
  quickStatNumber: {
    fontSize: 12,
    fontWeight: "600",
    color: "#fff",
    marginTop: 2,
    textAlign: "center",
  },
  quickStatLabel: {
    fontSize: 8,
    color: "rgba(255,255,255,0.9)",
    textAlign: "center",
    fontWeight: "400",
  },
  menuSection: {
    marginTop: -80,
    marginHorizontal: 20,
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 20,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  sectionTitleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  sectionTitle: { fontSize: 16, fontWeight: "bold", color: "#333" },
  mainMenuRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
    paddingHorizontal: Platform.OS === "ios" ? 5 : 0,
  },
  mainMenuItem: {
    width: Platform.OS === "ios" ? "22%" : "23%",
    alignItems: "center",
  },
  menuIconCircle: {
    width: Platform.OS === "ios" ? 56 : 58,
    height: Platform.OS === "ios" ? 56 : 58,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  menuLabel: {
    fontSize: 11,
    color: "#444",
    fontWeight: "500",
    textAlign: "center",
  },
  recentList: {
    paddingHorizontal: 20,
    marginTop: 10,
    backgroundColor: "#fff",
    marginHorizontal: 20,
    borderRadius: 16,
    padding: 20,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  activityCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 15,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  avatar: { width: 40, height: 40, borderRadius: 20, marginRight: 12 },
  nameText: { fontWeight: "bold", fontSize: 14, color: "#333" },
  activityText: { fontSize: 12, color: "#888" },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  footer: { marginTop: 20, alignItems: "center" },
  footerText: { fontSize: 10, color: "#BBB" },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.3)",
  },
  notificationDropdown: {
    position: "absolute",
    right: 15,
    width: 280,
    backgroundColor: "#fff",
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
    maxHeight: 400,
  },
  dropdownArrow: {
    position: "absolute",
    top: -8,
    right: 20,
    width: 16,
    height: 16,
    backgroundColor: "#fff",
    transform: [{ rotate: "45deg" }],
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 8,
  },
  dropdownHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  modalTitle: { fontSize: 16, fontWeight: "bold", color: "#333" },
  seeAllText: { fontSize: 12, color: "#004643", fontWeight: "600" },
  notificationList: { maxHeight: 300 },
  notificationItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F8F8F8",
  },
  notificationIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F5F5F5",
    marginRight: 10,
  },
  notificationContent: { flex: 1 },
  notificationTitle: {
    fontSize: 13,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 2,
  },
  notificationDesc: { fontSize: 11, color: "#666", marginBottom: 2 },
  notificationTime: { fontSize: 9, color: "#999" },
});
