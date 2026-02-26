import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useRef, useState } from "react";
import {
    Animated,
    Dimensions,
    FlatList,
    Image,
    Modal,
    PanResponder,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from "react-native";
import { AppHeader, SkeletonLoader } from "../../../../components";
import { API_CONFIG, getApiUrl } from "../../../../constants/config";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

interface LemburDetail {
  tanggal: string;
  status: string;
  jam_mulai: string | null;
  jam_selesai: string | null;
  keterangan: string;
  has_pengajuan: boolean;
  has_absen: boolean;
}

const statusConfig = {
  Disetujui: { color: "#4CAF50", icon: "checkmark-circle" },
  Pending: { color: "#FF9800", icon: "time" },
  Ditolak: { color: "#F44336", icon: "close-circle" },
  "Belum Waktunya": { color: "#9E9E9E", icon: "time-outline" },
  "Belum Absen": { color: "#FF6F00", icon: "alert-circle" },
};

export default function DetailLemburPegawai() {
  const router = useRouter();
  const { id, filter, start_date, end_date, month, year } =
    useLocalSearchParams();
  const [pegawai, setPegawai] = useState({ nama: "", nip: "", user_id: "" });
  const [pegawaiData, setPegawaiData] = useState<any>(null);
  const [lemburData, setLemburData] = useState<LemburDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [detailLembur, setDetailLembur] = useState<any>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [periodInfo, setPeriodInfo] = useState("");

  const translateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;

  useEffect(() => {
    fetchDetailLembur();
    generatePeriodInfo();
  }, []);

  const generatePeriodInfo = () => {
    const today = new Date();
    const days = [
      "Minggu",
      "Senin",
      "Selasa",
      "Rabu",
      "Kamis",
      "Jumat",
      "Sabtu",
    ];
    const months = [
      "Januari",
      "Februari",
      "Maret",
      "April",
      "Mei",
      "Juni",
      "Juli",
      "Agustus",
      "September",
      "Oktober",
      "November",
      "Desember",
    ];

    switch (filter) {
      case "mingguan":
        if (start_date && end_date) {
          const startDate = new Date(start_date as string);
          const endDate = new Date(end_date as string);
          setPeriodInfo(
            `${startDate.getDate()} ${months[startDate.getMonth()].slice(0, 3)} - ${endDate.getDate()} ${months[endDate.getMonth()].slice(0, 3)} ${endDate.getFullYear()}`,
          );
        }
        break;
      case "bulanan":
        if (month && year) {
          const targetMonth = parseInt(month as string) - 1;
          const targetYear = parseInt(year as string);
          setPeriodInfo(`${months[targetMonth]} ${targetYear}`);
        } else {
          setPeriodInfo(`${months[today.getMonth()]} ${today.getFullYear()}`);
        }
        break;
      case "tahunan":
        if (year) {
          setPeriodInfo(`Tahun ${year}`);
        } else {
          setPeriodInfo(`Tahun ${today.getFullYear()}`);
        }
        break;
      default:
        setPeriodInfo("Periode tidak diketahui");
    }
  };

  const fetchDetailLembur = async () => {
    setLoading(true);

    try {
      const pegawaiResponse = await fetch(
        `${getApiUrl(API_CONFIG.ENDPOINTS.DETAIL_PEGAWAI)}/${id}`,
      );
      const pegawaiData = await pegawaiResponse.json();

      if (pegawaiData.success && pegawaiData.data) {
        setPegawaiData(pegawaiData.data);
        setPegawai({
          nama: pegawaiData.data.nama_lengkap || "Nama tidak ditemukan",
          nip: pegawaiData.data.nip || "-",
          user_id:
            pegawaiData.data.id_user || pegawaiData.data.id_pegawai || "",
        });

        // Gunakan id_pegawai dari URL, bukan id_user dari data pegawai
        await fetchLemburData(id as string);
      } else {
        setPegawai({
          nama: "Data pegawai tidak ditemukan",
          nip: "-",
          user_id: "",
        });
        setLemburData([]);
      }
    } catch (error) {
      console.error("Fetch error:", error);
      setPegawai({ nama: "Error memuat data", nip: "-", user_id: "" });
      setLemburData([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchLemburData = async (pegawaiId: string) => {
    try {
      // Gunakan id_pegawai untuk query detail lembur
      let params: any = {
        id_pegawai: pegawaiId,
        type: "lembur",
      };

      if (filter === "mingguan" && start_date && end_date) {
        params.start_date = start_date;
        params.end_date = end_date;
      } else if (filter === "bulanan" && month && year) {
        params.month = month;
        params.year = year;
      } else if (filter === "tahunan" && year) {
        params.year = year;
      }

      console.log("Fetching lembur detail with params:", params);
      const response = await fetch(
        `${getApiUrl(API_CONFIG.ENDPOINTS.DETAIL_LAPORAN)}?${new URLSearchParams(params).toString()}`,
      );
      const data = await response.json();

      console.log("Lembur detail response:", JSON.stringify(data, null, 2));

      if (data.success && data.data) {
        if (Array.isArray(data.data)) {
          console.log("Setting lembur data:", data.data.length, "items");
          setLemburData(data.data);
        } else {
          console.log("Data is not array, setting empty");
          setLemburData([]);
        }
      } else {
        setLemburData([]);
      }
    } catch (error) {
      console.error("Error fetching lembur data:", error);
      setLemburData([]);
    }
  };

  const showDetailForDate = (item: LemburDetail) => {
    // Gunakan id dari URL (id_pegawai) bukan user_id
    fetchDetailLemburHarian(item.tanggal, id as string);
  };

  const openBottomSheet = () => {
    setShowDetailModal(true);
    Animated.spring(translateY, {
      toValue: 0,
      useNativeDriver: true,
      tension: 65,
      friction: 11,
    }).start();
  };

  const closeBottomSheet = () => {
    Animated.timing(translateY, {
      toValue: SCREEN_HEIGHT,
      duration: 250,
      useNativeDriver: true,
    }).start(() => {
      setShowDetailModal(false);
    });
  };

  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: (_, gestureState) => gestureState.dy > 5,
    onPanResponderMove: (_, gestureState) => {
      if (gestureState.dy > 0) {
        translateY.setValue(gestureState.dy);
      }
    },
    onPanResponderRelease: (_, gestureState) => {
      if (gestureState.dy > 100) {
        closeBottomSheet();
      } else {
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: true,
        }).start();
      }
    },
  });

  const fetchDetailLemburHarian = async (
    tanggal: string,
    pegawaiId: string,
  ) => {
    try {
      // Format tanggal ke YYYY-MM-DD jika dalam format ISO
      const dateObj = new Date(tanggal);
      const formattedDate = dateObj.toISOString().split("T")[0];

      console.log("Fetching detail lembur harian:", {
        tanggal,
        formattedDate,
        pegawaiId,
      });
      // Gunakan id_pegawai bukan user_id
      const response = await fetch(
        `${getApiUrl(API_CONFIG.ENDPOINTS.DETAIL_LAPORAN)}?type=lembur&date=${formattedDate}&id_pegawai=${pegawaiId}`,
      );
      const data = await response.json();

      console.log("Detail lembur harian response:", data);

      if (
        data.success &&
        data.data &&
        Array.isArray(data.data) &&
        data.data.length > 0
      ) {
        // Transform array data ke format yang dibutuhkan modal
        const firstItem = data.data[0];
        const transformedData = {
          tanggal: firstItem.tanggal,
          status: firstItem.status,
          pengajuan: {
            alasan: firstItem.keterangan,
            jam_mulai: firstItem.jam_mulai,
            jam_selesai: firstItem.jam_selesai,
            durasi: "-",
          },
          absen: null, // Belum ada data absen
        };
        setDetailLembur(transformedData);
        openBottomSheet();
      } else {
        console.log("No detail data available");
      }
    } catch (error) {
      console.error("Error fetching detail lembur:", error);
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) {
      return { day: "-", date: 0, month: "-" };
    }
    // Handle both ISO format and YYYY-MM-DD format
    const date = new Date(dateString);
    const days = [
      "Minggu",
      "Senin",
      "Selasa",
      "Rabu",
      "Kamis",
      "Jumat",
      "Sabtu",
    ];
    const months = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "Mei",
      "Jun",
      "Jul",
      "Ags",
      "Sep",
      "Okt",
      "Nov",
      "Des",
    ];

    return {
      day: days[date.getDay()],
      date: date.getDate(),
      month: months[date.getMonth()],
    };
  };

  const renderLemburItem = ({ item }: { item: LemburDetail }) => {
    if (!item || !item.tanggal) return null;
    const dateInfo = formatDate(item.tanggal);
    const config =
      statusConfig[item.status as keyof typeof statusConfig] ||
      statusConfig["Pending"];

    return (
      <TouchableOpacity
        style={styles.lemburItem}
        onPress={() => showDetailForDate(item)}
      >
        <View style={styles.dateSection}>
          <Text style={styles.dayText}>{dateInfo.day}</Text>
          <Text style={styles.dateText}>{dateInfo.date}</Text>
          <Text style={styles.monthTextSmall}>{dateInfo.month}</Text>
        </View>

        <View style={styles.statusSection}>
          <View style={styles.statusHeader}>
            <View
              style={[styles.statusBadge, { backgroundColor: config.color }]}
            >
              <Ionicons name={config.icon as any} size={16} color="white" />
              <Text style={styles.statusText}>{item.status}</Text>
            </View>
          </View>

          <Text style={styles.keteranganText}>{item.keterangan || "-"}</Text>

          {item.jam_mulai && (
            <View style={styles.timeInfo}>
              <Text style={styles.timeText}>
                {item.jam_mulai} - {item.jam_selesai || "Belum"}
              </Text>
            </View>
          )}
        </View>

        <Ionicons name="chevron-forward" size={20} color="#666" />
      </TouchableOpacity>
    );
  };

  const renderDetailModal = () => {
    if (!detailLembur || !detailLembur.tanggal) return null;

    const formatDetailDate = (dateString: string) => {
      if (!dateString) return "-";
      // Handle both ISO and YYYY-MM-DD format
      const date = new Date(dateString);
      const days = [
        "Minggu",
        "Senin",
        "Selasa",
        "Rabu",
        "Kamis",
        "Jumat",
        "Sabtu",
      ];
      const months = [
        "Januari",
        "Februari",
        "Maret",
        "April",
        "Mei",
        "Juni",
        "Juli",
        "Agustus",
        "September",
        "Oktober",
        "November",
        "Desember",
      ];

      return `${days[date.getDay()]}, ${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
    };

    return (
      <Modal
        visible={showDetailModal}
        transparent={true}
        animationType="none"
        statusBarTranslucent
        onRequestClose={closeBottomSheet}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={closeBottomSheet}
          />
          <Animated.View
            style={[styles.bottomSheet, { transform: [{ translateY }] }]}
          >
            <View {...panResponder.panHandlers} style={styles.handleContainer}>
              <View style={styles.handleBar} />
            </View>

            <View style={styles.sheetContent}>
              <Text style={styles.sheetTitle}>Detail Lembur</Text>

              <ScrollView
                style={styles.detailScrollView}
                showsVerticalScrollIndicator={false}
              >
                <View style={styles.detailHeader}>
                  <Text style={styles.detailDate}>
                    {formatDetailDate(detailLembur.tanggal)}
                  </Text>
                  <View
                    style={[
                      styles.detailStatusBadge,
                      {
                        backgroundColor:
                          statusConfig[
                            detailLembur.status as keyof typeof statusConfig
                          ]?.color || "#9E9E9E",
                      },
                    ]}
                  >
                    <Ionicons
                      name={
                        (statusConfig[
                          detailLembur.status as keyof typeof statusConfig
                        ]?.icon as any) || "information-circle"
                      }
                      size={16}
                      color="white"
                    />
                    <Text style={styles.detailStatusText}>
                      {detailLembur.status}
                    </Text>
                  </View>
                </View>

                {detailLembur.pengajuan && (
                  <>
                    <View style={styles.sectionHeaderConfirm}>
                      <Ionicons
                        name="document-text-outline"
                        size={18}
                        color="#004643"
                      />
                      <Text style={styles.sectionTitleConfirm}>
                        Data Pengajuan Lembur
                      </Text>
                    </View>
                    <View style={styles.sectionDivider} />

                    <View style={styles.confirmItemFull}>
                      <Text style={styles.confirmLabel}>Alasan Lembur</Text>
                      <Text style={styles.confirmValue}>
                        {detailLembur.pengajuan.alasan || "-"}
                      </Text>
                    </View>

                    <View style={styles.confirmRow}>
                      <View style={styles.confirmItemHalf}>
                        <Text style={styles.confirmLabel}>Waktu Mulai</Text>
                        <Text style={styles.confirmValue}>
                          {detailLembur.pengajuan.jam_mulai || "-"}
                        </Text>
                      </View>
                      <View style={styles.confirmItemHalf}>
                        <Text style={styles.confirmLabel}>Waktu Selesai</Text>
                        <Text style={styles.confirmValue}>
                          {detailLembur.pengajuan.jam_selesai || "-"}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.confirmItemFull}>
                      <Text style={styles.confirmLabel}>Durasi Diajukan</Text>
                      <Text style={styles.confirmValue}>
                        {detailLembur.pengajuan.durasi || "-"}
                      </Text>
                    </View>
                  </>
                )}

                {/* Selalu tampilkan section absen walaupun null */}
                <>
                  <View style={styles.sectionHeaderConfirm}>
                    <Ionicons name="time-outline" size={18} color="#004643" />
                    <Text style={styles.sectionTitleConfirm}>
                      Data Absen Lembur
                    </Text>
                  </View>
                  <View style={styles.sectionDivider} />

                  <View style={styles.confirmRow}>
                    <View style={styles.confirmItemHalf}>
                      <Text style={styles.confirmLabel}>Check In</Text>
                      <Text style={styles.confirmValue}>
                        {detailLembur.absen?.jam_masuk || "-"}
                      </Text>
                    </View>
                    <View style={styles.confirmItemHalf}>
                      <Text style={styles.confirmLabel}>Check Out</Text>
                      <Text style={styles.confirmValue}>
                        {detailLembur.absen?.jam_keluar || "-"}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.confirmItemFull}>
                    <Text style={styles.confirmLabel}>Durasi Aktual</Text>
                    <Text style={styles.confirmValue}>
                      {detailLembur.absen?.durasi_aktual || "-"}
                    </Text>
                  </View>

                  <View style={styles.confirmRow}>
                    <View style={styles.confirmItemHalf}>
                      <Text style={styles.confirmLabel}>Lokasi Masuk</Text>
                      <Text style={styles.confirmValue}>
                        {detailLembur.absen?.lokasi_masuk || "-"}
                      </Text>
                    </View>
                    <View style={styles.confirmItemHalf}>
                      <Text style={styles.confirmLabel}>Lokasi Pulang</Text>
                      <Text style={styles.confirmValue}>
                        {detailLembur.absen?.lokasi_pulang || "-"}
                      </Text>
                    </View>
                  </View>
                </>
              </ScrollView>
            </View>
          </Animated.View>
        </View>
      </Modal>
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <StatusBar
          style="light"
          translucent={true}
          backgroundColor="transparent"
        />
        <AppHeader
          title="Detail Lembur Pegawai"
          showBack={true}
          fallbackRoute="/laporan/laporan-detail-lembur"
        />
        <SkeletonLoader type="list" count={5} message="Memuat data lembur..." />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar
        style="light"
        translucent={true}
        backgroundColor="transparent"
      />
      <AppHeader
        title="Detail Lembur Pegawai"
        showBack={true}
        fallbackRoute="/laporan/laporan-detail-lembur"
      />

      <View style={styles.pegawaiInfo}>
        <View style={styles.pegawaiHeader}>
          {pegawaiData?.foto_profil ? (
            <Image
              source={{
                uri: `${API_CONFIG.BASE_URL}${pegawaiData.foto_profil.replace("/uploads/pegawai/uploads/pegawai/", "/uploads/pegawai/")}`,
              }}
              style={styles.avatarImage}
            />
          ) : (
            <View style={styles.avatarContainer}>
              <Text style={styles.avatarText}>
                {pegawai.nama.charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
          <View style={styles.pegawaiDetails}>
            <Text style={styles.pegawaiNama}>{pegawai.nama}</Text>
            <Text style={styles.pegawaiNip}>
              NIP: {pegawai.nip || "Belum diisi"}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.periodInfo}>
        <View style={styles.periodHeader}>
          <Ionicons name="calendar-outline" size={20} color="#004643" />
          <Text style={styles.periodTitle}>Periode Laporan</Text>
        </View>
        <Text style={styles.periodText}>{periodInfo}</Text>
      </View>

      <FlatList
        data={lemburData}
        keyExtractor={(item, index) => `${item.tanggal}-${index}`}
        renderItem={renderLemburItem}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={() => (
          <View style={styles.emptyState}>
            <Ionicons name="moon-outline" size={60} color="#ccc" />
            <Text style={styles.emptyText}>Tidak ada data lembur</Text>
          </View>
        )}
      />
      {renderDetailModal()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFB" },
  pegawaiInfo: {
    backgroundColor: "#fff",
    marginHorizontal: 20,
    marginTop: 12,
    marginBottom: 16,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 12,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  pegawaiHeader: { flexDirection: "row", alignItems: "center" },
  avatarContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#E6F0EF",
    overflow: "hidden",
  },
  avatarText: { color: "#004643", fontWeight: "bold", fontSize: 16 },
  avatarImage: { width: 40, height: 40, borderRadius: 20, marginRight: 16 },
  pegawaiDetails: { flex: 1 },
  pegawaiNama: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 4,
  },
  pegawaiNip: { fontSize: 14, color: "#666", fontWeight: "500" },
  periodInfo: {
    backgroundColor: "#F0F8F7",
    marginHorizontal: 20,
    marginBottom: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E0F2F1",
  },
  periodHeader: { flexDirection: "row", alignItems: "center", marginBottom: 4 },
  periodTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#004643",
    marginLeft: 8,
  },
  periodText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#004643",
    textAlign: "left",
  },
  listContainer: { paddingHorizontal: 20, paddingBottom: 20 },
  lemburItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 16,
    marginBottom: 12,
    borderRadius: 12,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  dateSection: { alignItems: "center", marginRight: 16, minWidth: 60 },
  dayText: { fontSize: 12, color: "#666", marginBottom: 2 },
  dateText: { fontSize: 20, fontWeight: "bold", color: "#333" },
  monthTextSmall: { fontSize: 12, color: "#666", marginTop: 2 },
  statusSection: { flex: 1, marginRight: 8 },
  statusHeader: { marginBottom: 4 },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: "flex-start",
  },
  statusText: {
    color: "white",
    fontSize: 12,
    fontWeight: "600",
    marginLeft: 4,
  },
  keteranganText: { fontSize: 12, color: "#666", marginBottom: 4 },
  timeInfo: { marginTop: 4 },
  timeText: { fontSize: 11, color: "#888" },
  emptyState: {
    alignItems: "center",
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  emptyText: { fontSize: 16, fontWeight: "600", color: "#666", marginTop: 16 },
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  modalBackdrop: { flex: 1 },
  bottomSheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: Platform.OS === "ios" ? 34 : 20,
    maxHeight: SCREEN_HEIGHT * 0.85,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 20,
  },
  handleContainer: { paddingVertical: 12, alignItems: "center" },
  handleBar: { width: 40, height: 4, backgroundColor: "#DDD", borderRadius: 2 },
  sheetContent: { paddingHorizontal: 20, paddingBottom: 16 },
  sheetTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#333",
    marginBottom: 16,
    textAlign: "center",
  },
  detailScrollView: { maxHeight: SCREEN_HEIGHT * 0.65 },
  detailHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  detailDate: { fontSize: 15, fontWeight: "600", color: "#004643", flex: 1 },
  detailStatusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  detailStatusText: { color: "white", fontSize: 14, fontWeight: "600" },
  sectionHeaderConfirm: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 8,
    marginBottom: 8,
  },
  sectionTitleConfirm: { fontSize: 15, fontWeight: "700", color: "#004643" },
  sectionDivider: { height: 1, backgroundColor: "#E5E7EB", marginBottom: 12 },
  confirmRow: { flexDirection: "row", gap: 12, marginBottom: 12 },
  confirmItemHalf: {
    flex: 1,
    backgroundColor: "#F8F9FA",
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  confirmItemFull: {
    backgroundColor: "#F8F9FA",
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginBottom: 12,
  },
  confirmLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "#6B7280",
    marginBottom: 6,
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  confirmValue: {
    fontSize: 14,
    color: "#1F2937",
    fontWeight: "600",
    lineHeight: 18,
  },
  photoRow: { flexDirection: "row", gap: 12, marginBottom: 16 },
  photoColumn: { flex: 1 },
  photoHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    gap: 6,
  },
  photoLabel: { fontSize: 12, color: "#666", fontWeight: "600" },
  photoContainer: {
    backgroundColor: "#F8F9FA",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    overflow: "hidden",
    aspectRatio: 1,
  },
  photoPresensi: { width: "100%", height: "100%" },
  photoPlaceholder: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F5F5F5",
  },
  photoPlaceholderText: {
    fontSize: 11,
    color: "#999",
    marginTop: 8,
    fontWeight: "500",
  },
});
