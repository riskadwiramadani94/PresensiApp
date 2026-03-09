import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import {
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from "react-native";
import { AppHeader, CustomAlert } from "../../../components";
import { useCustomAlert } from "../../../hooks/useCustomAlert";
import { API_CONFIG, getApiUrl } from "../../../constants/config";

export default function LaporanAdminScreen() {
  const router = useRouter();
  const alert = useCustomAlert();
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
      alert.showAlert({ type: 'info', message: 'Sedang memproses export...' });

      const params = type ? `?type=${type}` : "";
      const response = await fetch(
        `${getApiUrl(API_CONFIG.ENDPOINTS.LAPORAN)}/export${params}`,
      );

      if (response.ok) {
        alert.showAlert({ type: 'success', message: 'Laporan berhasil di-export ke PDF' });
      } else {
        alert.showAlert({ type: 'error', message: 'Gagal export laporan' });
      }
    } catch (error) {
      alert.showAlert({ type: 'error', message: 'Gagal export laporan' });
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
        /* ========================================
             SKELETON LOADING STATE - LAPORAN
        ======================================== */
        <View style={styles.contentContainer}>
          <ScrollView
            style={styles.content}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.laporanGrid}>
              {[1, 2, 3, 4].map((item) => (
                <View key={item} style={styles.laporanCard}>
                  {/* Skeleton Icon */}
                  <View style={styles.skeletonLaporanIcon} />
                  {/* Skeleton Info */}
                  <View style={styles.laporanInfo}>
                    <View style={styles.skeletonLaporanTitle} />
                    <View style={styles.skeletonLaporanDesc} />
                    <View style={styles.skeletonLaporanCount} />
                  </View>
                  {/* Skeleton Chevron */}
                  <View style={styles.skeletonChevron} />
                </View>
              ))}
            </View>
          </ScrollView>
        </View>
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

      <CustomAlert
        visible={alert.visible}
        type={alert.config.type}
        title={alert.config.title}
        message={alert.config.message}
        onClose={alert.hideAlert}
        onConfirm={alert.handleConfirm}
        confirmText={alert.config.confirmText}
        cancelText={alert.config.cancelText}
      />
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
    gap: 10,
  },
  laporanCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF",
    borderRadius: 16,
    padding: 16,
    marginBottom: 2,
    marginHorizontal: 2,
    borderWidth: 1,
    borderColor: "#F0F3F3",
    shadowColor: "#004643",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  laporanIcon: {
    width: 52,
    height: 52,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
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

  /* ========================================
     SKELETON STYLES - LAPORAN
  ======================================== */
  // Skeleton untuk Icon Laporan
  skeletonLaporanIcon: {
    width: 50,
    height: 50,
    borderRadius: 12,
    backgroundColor: '#E0E0E0',
    marginRight: 12,
  },
  // Skeleton untuk Title Laporan
  skeletonLaporanTitle: {
    width: '60%',
    height: 14,
    backgroundColor: '#E0E0E0',
    borderRadius: 4,
    marginBottom: 4,
  },
  // Skeleton untuk Deskripsi Laporan
  skeletonLaporanDesc: {
    width: '80%',
    height: 12,
    backgroundColor: '#F0F0F0',
    borderRadius: 4,
    marginBottom: 4,
  },
  // Skeleton untuk Count Laporan
  skeletonLaporanCount: {
    width: '30%',
    height: 11,
    backgroundColor: '#E0E0E0',
    borderRadius: 4,
    marginTop: 2,
  },
  // Skeleton untuk Chevron
  skeletonChevron: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#E0E0E0',
  },
});
