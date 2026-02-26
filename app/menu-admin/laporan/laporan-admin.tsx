import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import {
    Alert,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from "react-native";
import { AppHeader, SkeletonLoader } from "../../../components";
import { API_CONFIG, getApiUrl } from "../../../constants/config";

export default function LaporanAdminScreen() {
  const router = useRouter();
  const [stats, setStats] = useState({
    totalAbsen: 0,
    totalDinas: 0,
    totalIzin: 0,
    totalLembur: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLaporanStats();
  }, []);

  const fetchLaporanStats = async () => {
    try {
      console.log("Fetching laporan stats...");
      const response = await fetch(getApiUrl(API_CONFIG.ENDPOINTS.LAPORAN));
      const result = await response.json();
      console.log("Laporan API Response:", result);
      if (result && result.stats) {
        console.log("Stats received:", result.stats);
        setStats(result.stats);
      } else {
        console.log("No stats in response:", result);
      }
    } catch (error) {
      console.error("Error fetching laporan stats:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleExportPDF = async (type?: string) => {
    try {
      Alert.alert("Export PDF", "Sedang memproses export...");

      const params = type ? `?type=${type}` : "";
      const response = await fetch(
        `${getApiUrl(API_CONFIG.ENDPOINTS.LAPORAN)}/export${params}`,
      );

      if (response.ok) {
        Alert.alert("Sukses", "Laporan berhasil di-export ke PDF");
      } else {
        Alert.alert("Error", "Gagal export laporan");
      }
    } catch (error) {
      Alert.alert("Error", "Gagal export laporan");
    }
  };

  const laporanItems = [
    {
      type: "absen",
      label: "Laporan Absen",
      icon: "time-outline",
      color: "#4CAF50",
      desc: "Data kehadiran pegawai harian",
      count: stats.totalAbsen,
    },
    {
      type: "dinas",
      label: "Laporan Dinas",
      icon: "car-outline",
      color: "#2196F3",
      desc: "Data perjalanan dinas pegawai",
      count: stats.totalDinas,
    },
    {
      type: "izin",
      label: "Laporan Izin/Cuti",
      icon: "document-text-outline",
      color: "#FF9800",
      desc: "Data izin dan cuti pegawai",
      count: stats.totalIzin,
    },
    {
      type: "lembur",
      label: "Laporan Lembur",
      icon: "moon-outline",
      color: "#9C27B0",
      desc: "Data lembur pegawai",
      count: stats.totalLembur,
    },
  ];

  return (
    <View style={styles.container}>
      <StatusBar
        style="light"
        translucent={true}
        backgroundColor="transparent"
      />

      {/* HEADER */}
      <AppHeader
        title="Laporan"
        showBack={true}
        fallbackRoute="/admin/dashboard-admin"
      />

      {loading ? (
        <SkeletonLoader
          type="list"
          count={4}
          message="Memuat statistik laporan..."
        />
      ) : (
        <View style={styles.contentContainer}>
          <ScrollView
            style={styles.content}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.laporanGrid}>
              {laporanItems.map((item) => (
                <TouchableOpacity
                  key={item.type}
                  style={styles.laporanCard}
                  onPress={() => {
                    const routes: Record<string, any> = {
                      absen: '/menu-admin/laporan/laporan-detail-absen',
                      dinas: '/menu-admin/laporan/laporan-detail-dinas',
                      izin: '/menu-admin/laporan/laporan-detail-izin',
                      lembur: '/menu-admin/laporan/laporan-detail-lembur'
                    };
                    router.push(routes[item.type] as any);
                  }}
                >
                  <View
                    style={[
                      styles.laporanIcon,
                      { backgroundColor: item.color },
                    ]}
                  >
                    <Ionicons name={item.icon as any} size={24} color="#fff" />
                  </View>
                  <View style={styles.laporanInfo}>
                    <Text style={styles.laporanTitle}>{item.label}</Text>
                    <Text style={styles.laporanDesc}>{item.desc}</Text>
                    <Text style={styles.laporanCount}>{item.count} data</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#ccc" />
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  contentContainer: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  subtitle: {
    fontSize: 16,
    color: "#666",
    marginBottom: 25,
    textAlign: "center",
  },
  laporanGrid: {
    gap: 15,
  },
  laporanCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 15,
    borderRadius: 15,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  laporanIcon: {
    width: 50,
    height: 50,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  laporanInfo: {
    flex: 1,
  },
  laporanTitle: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 2,
  },
  laporanDesc: {
    fontSize: 12,
    color: "#666",
    lineHeight: 16,
  },
  laporanCount: {
    fontSize: 11,
    color: "#004643",
    fontWeight: "bold",
    marginTop: 2,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 10,
    color: "#666",
  },
});
