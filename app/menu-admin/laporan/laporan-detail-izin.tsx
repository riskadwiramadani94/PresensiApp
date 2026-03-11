import { Ionicons } from "@expo/vector-icons";
import * as NavigationBar from "expo-navigation-bar";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useRef, useState } from "react";
import {
    ActivityIndicator,
    Animated,
    FlatList,
    Image,
    Modal,
    PanResponder,
    Platform,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from "react-native";
import { AppHeader } from "../../../components";
import { API_CONFIG, getApiUrl } from "../../../constants/config";

interface PegawaiIzin {
  id_pegawai: number;
  nama_lengkap: string;
  nip: string;
  foto_profil?: string;
  summary: {
    total_pengajuan: number;
    disetujui: number;
    pending: number;
    ditolak: number;
    total_hari: number;
  };
}

export default function LaporanDetailIzinScreen() {
  const router = useRouter();
  const [data, setData] = useState<PegawaiIzin[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortOrder, setSortOrder] = useState<"desc" | "asc">("asc");
  const [selectedPeriode, setSelectedPeriode] = useState(() => {
    const now = new Date();
    const months = [
      "Januari", "Februari", "Maret", "April", "Mei", "Juni",
      "Juli", "Agustus", "September", "Oktober", "November", "Desember",
    ];
    return `${months[now.getMonth()]} ${now.getFullYear()}`;
  });
  const [stats, setStats] = useState({
    totalPengajuan: 0,
    disetujui: 0,
    totalHari: 0,
  });
  const [jenisLaporan, setJenisLaporan] = useState("bulanan");
  const [showJenisModal, setShowJenisModal] = useState(false);
  const [showPeriodeModal, setShowPeriodeModal] = useState(false);
  const jenisTranslateY = useRef(new Animated.Value(500)).current;
  const periodeTranslateY = useRef(new Animated.Value(500)).current;
  const [selectedStartDate, setSelectedStartDate] = useState(() => {
    const start = new Date();
    start.setDate(start.getDate() - start.getDay() + 1);
    return start;
  });
  const [selectedEndDate, setSelectedEndDate] = useState(() => {
    const end = new Date();
    end.setDate(end.getDate() - end.getDay() + 7);
    return end;
  });

  const jenisLaporanOptions = [
    { value: "mingguan", label: "Laporan Mingguan", icon: "calendar-outline" },
    { value: "bulanan", label: "Laporan Bulanan", icon: "calendar-number" },
    { value: "tahunan", label: "Laporan Tahunan", icon: "calendar-sharp" },
  ];

  const openJenisModal = () => {
    setShowJenisModal(true);
    Animated.timing(jenisTranslateY, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  const closeJenisModal = () => {
    Animated.timing(jenisTranslateY, {
      toValue: 500,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setShowJenisModal(false);
    });
  };

  const openPeriodeModal = () => {
    setShowPeriodeModal(true);
    Animated.timing(periodeTranslateY, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  const closePeriodeModal = () => {
    Animated.timing(periodeTranslateY, {
      toValue: 500,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setShowPeriodeModal(false);
    });
  };

  const jenisPanResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: (_, gestureState) => gestureState.dy > 5,
    onPanResponderMove: (_, gestureState) => {
      if (gestureState.dy > 0) {
        jenisTranslateY.setValue(gestureState.dy);
      }
    },
    onPanResponderRelease: (_, gestureState) => {
      if (gestureState.dy > 100) {
        closeJenisModal();
      } else {
        Animated.spring(jenisTranslateY, {
          toValue: 0,
          useNativeDriver: true,
        }).start();
      }
    },
  });

  const periodePanResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: (_, gestureState) => gestureState.dy > 5,
    onPanResponderMove: (_, gestureState) => {
      if (gestureState.dy > 0) {
        periodeTranslateY.setValue(gestureState.dy);
      }
    },
    onPanResponderRelease: (_, gestureState) => {
      if (gestureState.dy > 100) {
        closePeriodeModal();
      } else {
        Animated.spring(periodeTranslateY, {
          toValue: 0,
          useNativeDriver: true,
        }).start();
      }
    },
  });

  useEffect(() => {
    fetchData();
  }, [searchQuery, sortOrder, jenisLaporan, selectedPeriode]);

  const toggleSortOrder = () => {
    setSortOrder((prev) => (prev === "desc" ? "asc" : "desc"));
  };

  const getJenisLabel = () => {
    const jenis = jenisLaporanOptions.find((j) => j.value === jenisLaporan);
    return jenis?.label || "Laporan Bulanan";
  };

  const getPeriodeLabel = () => {
    return selectedPeriode;
  };

  const generateMonthList = () => {
    const months = [
      "Januari", "Februari", "Maret", "April", "Mei", "Juni",
      "Juli", "Agustus", "September", "Oktober", "November", "Desember",
    ];
    const list = [];
    for (let year = 2026; year <= 2035; year++) {
      for (let month = 0; month < 12; month++) {
        list.push(`${months[month]} ${year}`);
      }
    }
    return list;
  };

  const generateYearList = () => {
    const list = [];
    for (let year = 2026; year <= 2035; year++) {
      list.push(year.toString());
    }
    return list;
  };

  const formatDateForAPI = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const formatDateRange = (start: Date, end: Date) => {
    const startDay = start.getDate();
    const endDay = end.getDate();
    const months = [
      "Jan", "Feb", "Mar", "Apr", "Mei", "Jun",
      "Jul", "Agu", "Sep", "Okt", "Nov", "Des",
    ];
    const month = months[start.getMonth()];
    const year = start.getFullYear();
    return `${startDay}-${endDay} ${month} ${year}`;
  };

  const calculateStats = (pegawaiData: PegawaiIzin[]) => {
    let totalPengajuan = 0;
    let disetujui = 0;
    let totalHari = 0;

    pegawaiData.forEach((pegawai) => {
      const summary = pegawai.summary || {};
      totalPengajuan += summary.total_pengajuan || 0;
      disetujui += summary.disetujui || 0;
      totalHari += summary.total_hari || 0;
    });

    setStats({
      totalPengajuan,
      disetujui,
      totalHari,
    });
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      let filterDate = "bulan_ini";
      let startDate = "";
      let endDate = "";
      let month = "";
      let year = "";

      if (jenisLaporan === "mingguan") {
        filterDate = "mingguan";
        startDate = formatDateForAPI(selectedStartDate);
        endDate = formatDateForAPI(selectedEndDate);
      } else if (jenisLaporan === "bulanan") {
        filterDate = "bulanan";
        const months = [
          "Januari", "Februari", "Maret", "April", "Mei", "Juni",
          "Juli", "Agustus", "September", "Oktober", "November", "Desember",
        ];
        const [monthName, yearStr] = selectedPeriode.split(" ");
        month = String(months.indexOf(monthName) + 1).padStart(2, "0");
        year = yearStr;
      } else if (jenisLaporan === "tahunan") {
        filterDate = "tahunan";
        year = selectedPeriode;
      }

      const params: any = {
        type: "izin",
        filter_date: filterDate,
        search: searchQuery,
      };

      if (startDate) params.start_date = startDate;
      if (endDate) params.end_date = endDate;
      if (month) params.month = month;
      if (year) params.year = year;

      console.log("Fetching izin with params:", params);
      const response = await fetch(
        `${getApiUrl(API_CONFIG.ENDPOINTS.LAPORAN)}?${new URLSearchParams(params).toString()}`,
      );
      const result = await response.json();

      console.log("Izin API Response:", result);

      if (result.success && Array.isArray(result.data)) {
        const sortedData = result.data.sort(
          (a: PegawaiIzin, b: PegawaiIzin) =>
            sortOrder === "asc"
              ? a.nama_lengkap.localeCompare(b.nama_lengkap)
              : b.nama_lengkap.localeCompare(a.nama_lengkap),
        );
        setData(sortedData);
        calculateStats(result.data);
      } else {
        setData([]);
        setStats({ totalPengajuan: 0, disetujui: 0, totalHari: 0 });
      }
    } catch (error) {
      console.error("Error fetching izin data:", error);
      setData([]);
      setStats({ totalPengajuan: 0, disetujui: 0, totalHari: 0 });
    } finally {
      setLoading(false);
    }
  };

  const renderItem = ({ item }: { item: PegawaiIzin }) => {
    const buildDetailParams = () => {
      let params: any = { filter: jenisLaporan };

      if (jenisLaporan === "mingguan") {
        params.start_date = formatDateForAPI(selectedStartDate);
        params.end_date = formatDateForAPI(selectedEndDate);
      } else if (jenisLaporan === "bulanan") {
        const months = [
          "Januari", "Februari", "Maret", "April", "Mei", "Juni",
          "Juli", "Agustus", "September", "Oktober", "November", "Desember",
        ];
        const [monthName, yearStr] = selectedPeriode.split(" ");
        params.month = String(months.indexOf(monthName) + 1).padStart(2, "0");
        params.year = yearStr;
      } else if (jenisLaporan === "tahunan") {
        params.year = selectedPeriode;
      }

      return new URLSearchParams(params).toString();
    };

    const summary = item.summary || {};
    const approvalRate = summary.total_pengajuan > 0 
      ? Math.round((summary.disetujui / summary.total_pengajuan) * 100) 
      : 0;
    const avgDays = summary.total_pengajuan > 0 
      ? (summary.total_hari / summary.total_pengajuan).toFixed(1) 
      : 0;

    return (
      <TouchableOpacity
        style={styles.pegawaiCard}
        onPress={() => {
          const queryParams = buildDetailParams();
          router.push(
            `/menu-admin/laporan/detail-izin/${item.id_pegawai}?${queryParams}` as any,
          );
        }}
      >
        <View style={styles.cardHeader}>
          {item.foto_profil ? (
            <Image
              source={{
                uri: `${API_CONFIG.BASE_URL}${item.foto_profil.replace("/uploads/pegawai/uploads/pegawai/", "/uploads/pegawai/")}`,
              }}
              style={styles.avatarImage}
            />
          ) : (
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {item.nama_lengkap.charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
          <View style={styles.employeeInfo}>
            <Text style={styles.employeeName}>{item.nama_lengkap}</Text>
            <Text style={styles.employeeNip}>NIP: {item.nip}</Text>
          </View>
        </View>
        
        <View style={styles.divider} />
        
        <View style={styles.metricsRow}>
          <View style={styles.metricItem}>
            <Ionicons name="document-text-outline" size={12} color="#2196F3" />
            <Text style={styles.metricValue}>{summary.total_pengajuan || 0}</Text>
          </View>
          <View style={styles.metricItem}>
            <Ionicons name="checkmark-circle-outline" size={12} color="#4CAF50" />
            <Text style={styles.metricValue}>{summary.disetujui || 0}</Text>
          </View>
          <View style={styles.metricItem}>
            <Ionicons name="time-outline" size={12} color="#FF9800" />
            <Text style={styles.metricValue}>{summary.pending || 0}</Text>
          </View>
          <View style={styles.metricItem}>
            <Ionicons name="close-circle-outline" size={12} color="#F44336" />
            <Text style={styles.metricValue}>{summary.ditolak || 0}</Text>
          </View>
          <View style={styles.metricSeparator} />
          <View style={styles.metricItem}>
            <Text style={styles.metricValue}>{summary.total_hari || 0}</Text>
            <Text style={styles.metricLabel}>hari</Text>
          </View>
        </View>
        
        <View style={styles.kpiRow}>
          <View style={styles.kpiItem}>
            <Ionicons name="trending-up-outline" size={12} color="#666" />
            <Text style={styles.kpiText}>{approvalRate}% approval</Text>
          </View>
          <View style={styles.kpiSeparator} />
          <View style={styles.kpiItem}>
            <Text style={styles.kpiText}>{avgDays} hari/pengajuan</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar
        style="light"
        translucent={true}
        backgroundColor="transparent"
      />

      <AppHeader
        title="Laporan Izin/Cuti"
        showBack={true}
        fallbackRoute="/admin/dashboard-admin"
      />

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#004643" />
          <Text style={styles.loadingText}>Memuat data izin/cuti...</Text>
        </View>
      ) : (
        <View style={styles.contentContainer}>
          <View style={styles.stickyHeader}>
            <View style={styles.header}>
              <View style={styles.filterRow}>
                <TouchableOpacity
                  style={styles.filterBtn}
                  onPress={openJenisModal}
                >
                  <Text style={styles.filterText}>{getJenisLabel()}</Text>
                  <Ionicons name="chevron-down" size={16} color="#666" />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.filterBtn}
                  onPress={openPeriodeModal}
                >
                  <Text style={styles.filterText}>{getPeriodeLabel()}</Text>
                  <Ionicons name="chevron-down" size={16} color="#666" />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.statsContainer}>
              <View style={styles.statsRow}>
                <View style={styles.statCard}>
                  <View
                    style={[
                      styles.statIndicator,
                      { backgroundColor: "#2196F3" },
                    ]}
                  />
                  <Text style={styles.statLabel}>Total Pengajuan</Text>
                  <Text style={styles.statValue}>{stats.totalPengajuan}</Text>
                </View>

                <View style={styles.statCard}>
                  <View
                    style={[
                      styles.statIndicator,
                      { backgroundColor: "#4CAF50" },
                    ]}
                  />
                  <Text style={styles.statLabel}>Disetujui</Text>
                  <Text style={styles.statValue}>{stats.disetujui}</Text>
                </View>

                <View style={styles.statCard}>
                  <View
                    style={[
                      styles.statIndicator,
                      { backgroundColor: "#FF9800" },
                    ]}
                  />
                  <Text style={styles.statLabel}>Total Hari</Text>
                  <Text style={styles.statValue}>{stats.totalHari} Hari</Text>
                </View>
              </View>
            </View>

            <View style={styles.searchContainer}>
              <View style={styles.searchInputWrapper}>
                <Ionicons name="search-outline" size={20} color="#666" />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Cari pegawai..."
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  placeholderTextColor="#999"
                />
                {searchQuery.length > 0 && (
                  <TouchableOpacity onPress={() => setSearchQuery("")}>
                    <Ionicons name="close-circle" size={20} color="#999" />
                  </TouchableOpacity>
                )}
              </View>
            </View>

            <View style={styles.sortSection}>
              <TouchableOpacity
                style={styles.sectionHeader}
                onPress={toggleSortOrder}
              >
                <Ionicons name="list" size={20} color="#004643" />
                <Text style={styles.sectionTitle}>
                  {sortOrder === "asc" ? "A-Z" : "Z-A"}
                </Text>
                <Ionicons name="swap-vertical" size={18} color="#004643" />
              </TouchableOpacity>
            </View>
          </View>

          <FlatList
            data={data}
            keyExtractor={(item) =>
              item.id_pegawai?.toString() || Math.random().toString()
            }
            renderItem={renderItem}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={() => (
              <View style={styles.emptyState}>
                <Ionicons name="document-outline" size={60} color="#ccc" />
                <Text style={styles.emptyText}>Tidak ada data izin/cuti</Text>
                <Text style={styles.emptySubText}>
                  Belum ada data izin/cuti untuk periode ini
                </Text>
              </View>
            )}
          />
        </View>
      )}

      {/* Modal Jenis Laporan */}
      <Modal
        visible={showJenisModal}
        transparent
        animationType="none"
        statusBarTranslucent
        onRequestClose={closeJenisModal}
      >
        <View style={styles.bottomSheetOverlay}>
          <TouchableOpacity
            style={styles.bottomSheetBackdrop}
            activeOpacity={1}
            onPress={closeJenisModal}
          />
          <Animated.View
            style={[
              styles.bottomSheet,
              { transform: [{ translateY: jenisTranslateY }] },
            ]}
          >
            <View
              {...jenisPanResponder.panHandlers}
              style={styles.handleContainer}
            >
              <View style={styles.handleBar} />
            </View>

            <View style={styles.bottomSheetHeader}>
              <Text style={styles.bottomSheetTitle}>Pilih Jenis Laporan</Text>
            </View>

            <View style={styles.bottomSheetContent}>
              {jenisLaporanOptions.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.bottomSheetItem,
                    jenisLaporan === option.value &&
                      styles.bottomSheetItemActive,
                  ]}
                  onPress={() => {
                    setJenisLaporan(option.value);
                    closeJenisModal();
                  }}
                >
                  <View style={styles.bottomSheetItemLeft}>
                    <View
                      style={[
                        styles.bottomSheetIcon,
                        jenisLaporan === option.value &&
                          styles.bottomSheetIconActive,
                      ]}
                    >
                      <Ionicons
                        name={option.icon as any}
                        size={20}
                        color={
                          jenisLaporan === option.value ? "#fff" : "#004643"
                        }
                      />
                    </View>
                    <Text
                      style={[
                        styles.bottomSheetItemText,
                        jenisLaporan === option.value &&
                          styles.bottomSheetItemTextActive,
                      ]}
                    >
                      {option.label}
                    </Text>
                  </View>
                  {jenisLaporan === option.value && (
                    <Ionicons
                      name="checkmark-circle"
                      size={24}
                      color="#004643"
                    />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </Animated.View>
        </View>
      </Modal>

      {/* Modal Periode */}
      <Modal
        visible={showPeriodeModal}
        transparent
        animationType="none"
        statusBarTranslucent
        onRequestClose={closePeriodeModal}
      >
        <View style={styles.bottomSheetOverlay}>
          <TouchableOpacity
            style={styles.bottomSheetBackdrop}
            activeOpacity={1}
            onPress={closePeriodeModal}
          />
          <Animated.View
            style={[
              styles.bottomSheet,
              { transform: [{ translateY: periodeTranslateY }] },
            ]}
          >
            <View
              {...periodePanResponder.panHandlers}
              style={styles.handleContainer}
            >
              <View style={styles.handleBar} />
            </View>

            <View style={styles.bottomSheetHeader}>
              <Text style={styles.bottomSheetTitle}>Pilih Periode</Text>
            </View>

            <View style={styles.bottomSheetContent}>
              {jenisLaporan === "bulanan" &&
                generateMonthList().map((bulan, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.bottomSheetItem,
                      selectedPeriode === bulan && styles.bottomSheetItemActive,
                    ]}
                    onPress={() => {
                      setSelectedPeriode(bulan);
                      closePeriodeModal();
                    }}
                  >
                    <Text
                      style={[
                        styles.bottomSheetItemText,
                        selectedPeriode === bulan &&
                          styles.bottomSheetItemTextActive,
                      ]}
                    >
                      {bulan}
                    </Text>
                    {selectedPeriode === bulan && (
                      <Ionicons
                        name="checkmark-circle"
                        size={24}
                        color="#004643"
                      />
                    )}
                  </TouchableOpacity>
                ))}

              {jenisLaporan === "tahunan" &&
                generateYearList().map((tahun) => (
                  <TouchableOpacity
                    key={tahun}
                    style={[
                      styles.bottomSheetItem,
                      selectedPeriode === tahun && styles.bottomSheetItemActive,
                    ]}
                    onPress={() => {
                      setSelectedPeriode(tahun);
                      closePeriodeModal();
                    }}
                  >
                    <Text
                      style={[
                        styles.bottomSheetItemText,
                        selectedPeriode === tahun &&
                          styles.bottomSheetItemTextActive,
                      ]}
                    >
                      {tahun}
                    </Text>
                    {selectedPeriode === tahun && (
                      <Ionicons
                        name="checkmark-circle"
                        size={24}
                        color="#004643"
                      />
                    )}
                  </TouchableOpacity>
                ))}
            </View>
          </Animated.View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#ffffff" },
  contentContainer: { flex: 1 },
  stickyHeader: { backgroundColor: "#fff" },
  header: {
    paddingHorizontal: 20,
    paddingTop: 15,
    paddingBottom: 10,
    backgroundColor: "#fff",
  },
  filterRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
  },
  filterBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F5F5F5",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    flex: 1,
    justifyContent: "space-between",
  },
  filterText: {
    fontSize: 13,
    color: "#333",
    fontWeight: "500",
  },
  searchContainer: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
    backgroundColor: '#FAFBFC',
  },
  searchInputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 14,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: "#E8F0EF",
    gap: 12,
    shadowColor: "#004643",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: "#333",
    paddingVertical: 14,
    fontWeight: "400",
  },
  statsContainer: {
    marginHorizontal: 20,
    marginTop: 10,
    marginBottom: 10,
  },
  statsRow: {
    flexDirection: "row",
    gap: 10,
  },
  statCard: {
    flex: 1,
    backgroundColor: "#fff",
    padding: 12,
    borderRadius: 12,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  statIndicator: {
    width: 30,
    height: 3,
    borderRadius: 2,
    marginBottom: 8,
  },
  statLabel: {
    fontSize: 10,
    color: "#999",
    marginBottom: 4,
  },
  statValue: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1a1a1a",
  },
  sortSection: {
    paddingHorizontal: 20,
    paddingBottom: 10,
    backgroundColor: "#fff",
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#F0F8F7",
    padding: 10,
    borderRadius: 8,
  },
  sectionTitle: {
    fontSize: 14,
    color: "#004643",
    fontWeight: "600",
    flex: 1,
  },
  handleContainer: {
    paddingVertical: 12,
    alignItems: "center",
    width: "100%",
  },
  handleBar: {
    width: 40,
    height: 4,
    backgroundColor: "#DDD",
    borderRadius: 2,
    alignSelf: "center",
    marginTop: 8,
    marginBottom: 16,
  },
  listContent: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 20 },
  pegawaiCard: {
    backgroundColor: "#fff",
    marginBottom: 12,
    borderRadius: 12,
    padding: 16,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    borderWidth: 1,
    borderColor: "#F0F0F0",
  },
  cardHeader: { 
    flexDirection: "row", 
    alignItems: "center",
    marginBottom: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#E6F0EF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  avatarImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  avatarText: { 
    color: "#004643", 
    fontWeight: "700", 
    fontSize: 16 
  },
  employeeInfo: { 
    flex: 1 
  },
  employeeName: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1a1a1a",
    marginBottom: 2,
  },
  employeeNip: { 
    fontSize: 12, 
    color: "#757575" 
  },
  divider: {
    height: 1,
    backgroundColor: "#F0F0F0",
    marginBottom: 12,
  },
  metricsRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
    gap: 8,
  },
  metricItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  metricValue: {
    fontSize: 13,
    fontWeight: "700",
    color: "#1a1a1a",
  },
  metricLabel: {
    fontSize: 11,
    color: "#757575",
  },
  metricSeparator: {
    width: 1,
    height: 12,
    backgroundColor: "#E0E0E0",
    marginHorizontal: 4,
  },
  kpiRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  kpiItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  kpiText: {
    fontSize: 12,
    color: "#666",
    fontWeight: "500",
  },
  kpiSeparator: {
    width: 1,
    height: 10,
    backgroundColor: "#E0E0E0",
  },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  loadingText: { marginTop: 10, color: "#666" },
  emptyState: {
    alignItems: "center",
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#666",
    marginTop: 16,
  },
  emptySubText: {
    fontSize: 14,
    color: "#999",
    marginTop: 8,
    textAlign: "center",
  },
  bottomSheetOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  bottomSheetBackdrop: { flex: 1 },
  bottomSheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: Platform.OS === "ios" ? 34 : 20,
    maxHeight: "70%",
  },
  bottomSheetHeader: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  bottomSheetTitle: { fontSize: 18, fontWeight: "600", color: "#333" },
  bottomSheetContent: { maxHeight: 400 },
  bottomSheetItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F5F5F5",
  },
  bottomSheetItemActive: { backgroundColor: "#E6F0EF" },
  bottomSheetItemLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  bottomSheetIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#E6F0EF",
    justifyContent: "center",
    alignItems: "center",
  },
  bottomSheetIconActive: { backgroundColor: "#004643" },
  bottomSheetItemText: {
    fontSize: 15,
    color: "#333",
    fontWeight: "500",
    flex: 1,
  },
  bottomSheetItemTextActive: { color: "#004643", fontWeight: "600" },
});
