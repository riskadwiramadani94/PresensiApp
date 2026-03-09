import { Ionicons } from "@expo/vector-icons";
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
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { AppHeader, CustomAlert } from "../../../components";
import CustomCalendar from "../../../components/CustomCalendar";
import { useCustomAlert } from "../../../hooks/useCustomAlert";
import { API_CONFIG, getApiUrl } from "../../../constants/config";

interface PegawaiAbsen {
  id_pegawai: number;
  nama_lengkap: string;
  nip: string;
  foto_profil?: string;
  summary: {
    Hadir: number;
    "Tidak Hadir": number;
    Terlambat: number;
    Izin: number;
    Sakit: number;
    Cuti: number;
    "Pulang Cepat": number;
    "Dinas Luar/ Perjalanan Dinas": number;
    Dinas: number;
  };
}

const statusConfig = {
  Hadir: { color: "#4CAF50" },
  "Tidak Hadir": { color: "#F44336" },
  Terlambat: { color: "#FF9800" },
  Izin: { color: "#2196F3" },
  Sakit: { color: "#E91E63" },
  Cuti: { color: "#9C27B0" },
  "Pulang Cepat": { color: "#795548" },
  "Dinas Luar/ Perjalanan Dinas": { color: "#607D8B" },
  Dinas: { color: "#00BCD4" },
};

export default function LaporanDetailAbsenScreen() {
  const alert = useCustomAlert();
  const router = useRouter();
  const today = new Date();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<PegawaiAbsen[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortOrder, setSortOrder] = useState<"desc" | "asc">("asc");

  // Initialize dengan hari ini
  const [selectedDate, setSelectedDate] = useState(today);
  const [selectedStartDate, setSelectedStartDate] = useState(() => {
    const start = new Date(today);
    start.setDate(today.getDate() - today.getDay() + 1); // Senin minggu ini
    return start;
  });
  const [selectedEndDate, setSelectedEndDate] = useState(() => {
    const end = new Date(today);
    end.setDate(today.getDate() - today.getDay() + 7); // Minggu minggu ini
    return end;
  });
  const [selectedMonth, setSelectedMonth] = useState(today);
  const [selectedPeriode, setSelectedPeriode] = useState(() => {
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
    return `${months[today.getMonth()]} ${today.getFullYear()}`;
  });
  const [stats, setStats] = useState({
    hadir: 0,
    terlambat: 0,
    tidakHadir: 0,
  });
  const [jenisLaporan, setJenisLaporan] = useState("bulanan");
  const [showJenisModal, setShowJenisModal] = useState(false);
  const [showPeriodeModal, setShowPeriodeModal] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const jenisTranslateY = useRef(new Animated.Value(500)).current;
  const periodeTranslateY = useRef(new Animated.Value(500)).current;
  const calendarTranslateY = useRef(new Animated.Value(500)).current;
  const [datePickerMode, setDatePickerMode] = useState<
    "single" | "start" | "end"
  >("single");

  const jenisLaporanOptions = [
    { value: "harian", label: "Laporan Harian", icon: "calendar" },
    { value: "mingguan", label: "Laporan Mingguan", icon: "calendar-outline" },
    { value: "bulanan", label: "Laporan Bulanan", icon: "calendar-number" },
    { value: "tahunan", label: "Laporan Tahunan", icon: "calendar-sharp" },
  ];

  const openFilterModal = () => {};
  const closeFilterModal = () => {};
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

  // Periode Modal
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

  const calendarPanResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: (_, gestureState) => gestureState.dy > 5,
    onPanResponderMove: (_, gestureState) => {
      if (gestureState.dy > 0) {
        calendarTranslateY.setValue(gestureState.dy);
      }
    },
    onPanResponderRelease: (_, gestureState) => {
      if (gestureState.dy > 100) {
        closeCalendarModal();
      } else {
        Animated.spring(calendarTranslateY, {
          toValue: 0,
          useNativeDriver: true,
        }).start();
      }
    },
  });

  const showCalendarModal = () => {
    setShowCalendar(true);
    Animated.spring(calendarTranslateY, {
      toValue: 0,
      useNativeDriver: true,
      tension: 65,
      friction: 11,
    }).start();
  };

  const closeCalendarModal = () => {
    Animated.timing(calendarTranslateY, {
      toValue: 500,
      duration: 250,
      useNativeDriver: true,
    }).start(() => {
      setShowCalendar(false);
    });
  };

  useEffect(() => {
    fetchData();
  }, [searchQuery, sortOrder, jenisLaporan, selectedPeriode]);

  const formatDate = (date: Date) => {
    const day = date.getDate();
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
    const month = months[date.getMonth()];
    const year = date.getFullYear();
    return `${day} ${month} ${year}`;
  };

  const formatDateRange = (start: Date, end: Date) => {
    const startDay = start.getDate();
    const endDay = end.getDate();
    const months = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "Mei",
      "Jun",
      "Jul",
      "Agu",
      "Sep",
      "Okt",
      "Nov",
      "Des",
    ];
    const month = months[start.getMonth()];
    const year = start.getFullYear();
    return `${startDay}-${endDay} ${month} ${year}`;
  };

  const formatMonthYear = () => {
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
    return `${months[selectedMonth.getMonth()]} ${selectedMonth.getFullYear()}`;
  };

  const getJenisLabel = () => {
    const jenis = jenisLaporanOptions.find((j) => j.value === jenisLaporan);
    return jenis?.label || "Laporan Bulanan";
  };

  const getPeriodeLabel = () => {
    return selectedPeriode;
  };

  // Generate list bulan dinamis (2020-2030)
  const generateMonthList = () => {
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
    const list = [];
    for (let year = 2020; year <= 2030; year++) {
      for (let month = 0; month < 12; month++) {
        list.push(`${months[month]} ${year}`);
      }
    }
    return list;
  };

  // Generate list tahun dinamis (2020-2030)
  const generateYearList = () => {
    const list = [];
    for (let year = 2020; year <= 2030; year++) {
      list.push(year.toString());
    }
    return list;
  };

  const toggleSortOrder = () => {
    setSortOrder((prev) => (prev === "desc" ? "asc" : "desc"));
  };

  const calculateStats = (pegawaiData: PegawaiAbsen[]) => {
    let totalHadir = 0;
    let totalTerlambat = 0;
    let totalTidakHadir = 0;

    pegawaiData.forEach((pegawai) => {
      // ✅ Hadir = Hadir + Terlambat (terlambat sudah termasuk hadir)
      const hadir = pegawai.summary["Hadir"] || 0;
      const terlambat = pegawai.summary["Terlambat"] || 0;
      
      // Total hadir = hadir + terlambat (tidak perlu tambah dinas karena sudah dihitung di backend)
      totalHadir += hadir + terlambat;
      totalTerlambat += terlambat;
      
      // ✅ Tidak Hadir dari backend (sudah benar)
      totalTidakHadir += pegawai.summary["Tidak Hadir"] || 0;
    });

    setStats({
      hadir: totalHadir,
      terlambat: totalTerlambat,
      tidakHadir: totalTidakHadir,
    });
  };

  const formatDateForAPI = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      let filterDate = "bulan_ini";
      let startDate = "";
      let endDate = "";
      let month = "";
      let year = "";

      if (jenisLaporan === "harian") {
        filterDate = "harian";
        startDate = formatDateForAPI(selectedDate);
      } else if (jenisLaporan === "mingguan") {
        filterDate = "mingguan";
        startDate = formatDateForAPI(selectedStartDate);
        endDate = formatDateForAPI(selectedEndDate);
      } else if (jenisLaporan === "bulanan") {
        filterDate = "bulanan";
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
        const [monthName, yearStr] = selectedPeriode.split(" ");
        month = String(months.indexOf(monthName) + 1).padStart(2, "0");
        year = yearStr;
      } else if (jenisLaporan === "tahunan") {
        filterDate = "tahunan";
        year = selectedPeriode;
      }

      const params: any = {
        type: "absen",
        filter_date: filterDate,
        search: searchQuery,
      };

      if (startDate) params.start_date = startDate;
      if (endDate) params.end_date = endDate;
      if (month) params.month = month;
      if (year) params.year = year;

      const response = await fetch(
        `${getApiUrl(API_CONFIG.ENDPOINTS.LAPORAN)}?${new URLSearchParams(params).toString()}`,
      );
      const result = await response.json();

      if (result.success) {
        const sortedData = result.data.sort(
          (a: PegawaiAbsen, b: PegawaiAbsen) =>
            sortOrder === "desc"
              ? b.nama_lengkap.localeCompare(a.nama_lengkap)
              : a.nama_lengkap.localeCompare(b.nama_lengkap),
        );
        setData(sortedData);
        calculateStats(result.data);
      } else {
        setData([]);
      }
    } catch (error) {
      alert.showAlert({ type: 'error', message: 'Gagal memuat data absen' });
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  const renderStatusBadge = (status: string, count: number) => {
    if (count === 0) return null;
    const config = statusConfig[status as keyof typeof statusConfig];
    if (!config) return null;

    // Untuk status Dinas, tampilkan tanpa angka
    if (status === "Dinas") {
      return (
        <View
          key={status}
          style={[styles.statusBadge, { backgroundColor: config.color + "15" }]}
        >
          <Text style={[styles.statusText, { color: config.color }]}>
            Dinas
          </Text>
        </View>
      );
    }

    return (
      <View
        key={status}
        style={[styles.statusBadge, { backgroundColor: config.color + "15" }]}
      >
        <Text style={[styles.statusText, { color: config.color }]}>
          {status.replace("Dinas Luar/ Perjalanan Dinas", "Dinas")} ({count})
        </Text>
      </View>
    );
  };

  const renderAbsentStatus = (item: PegawaiAbsen) => {
    // Tidak perlu render badge "Tidak Hadir" karena sudah ada di summary
    return null;
  };

  const renderItem = ({ item }: { item: PegawaiAbsen }) => {
    // Build query params for detail page
    const buildDetailParams = () => {
      let params: any = { filter: jenisLaporan };

      if (jenisLaporan === "harian") {
        params.start_date = formatDateForAPI(selectedDate);
      } else if (jenisLaporan === "mingguan") {
        params.start_date = formatDateForAPI(selectedStartDate);
        params.end_date = formatDateForAPI(selectedEndDate);
      } else if (jenisLaporan === "bulanan") {
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
        const [monthName, yearStr] = selectedPeriode.split(" ");
        params.month = String(months.indexOf(monthName) + 1).padStart(2, "0");
        params.year = yearStr;
      } else if (jenisLaporan === "tahunan") {
        params.year = selectedPeriode;
      }

      return new URLSearchParams(params).toString();
    };

    return (
      <TouchableOpacity
        style={styles.pegawaiCard}
        onPress={() => {
          const queryParams = buildDetailParams();
          router.push(
            `/menu-admin/laporan/detail-absen/${item.id_pegawai}?${queryParams}` as any,
          );
        }}
      >
        <View style={styles.cardMainContent}>
          <View style={styles.cardHeader}>
            <View style={styles.employeeSection}>
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
                <View style={styles.nipContainer}>
                  <Ionicons name="card-outline" size={12} color="#64748B" />
                  <Text style={styles.employeeNip}>NIP: {item.nip}</Text>
                </View>
              </View>
            </View>
            <TouchableOpacity style={styles.detailBtn}>
              <Ionicons name="chevron-forward" size={16} color="#00695C" />
            </TouchableOpacity>
          </View>

          <View style={styles.cardDivider} />

          <View style={styles.statusContainer}>
            {Object.entries(item.summary)
              .filter(([status, count]) => count > 0)
              .map(([status, count]) => renderStatusBadge(status, count))}
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
        title="Laporan Absen"
        showBack={true}
        fallbackRoute="/laporan/laporan-admin"
      />

      {loading ? (
        /* ========================================
             SKELETON LOADING STATE - LAPORAN DETAIL ABSEN
        ======================================== */
        <View style={styles.contentContainer}>
          {/* Skeleton Sticky Header */}
          <View style={styles.stickyHeader}>
            {/* Skeleton Filter Row */}
            <View style={styles.header}>
              <View style={styles.filterRow}>
                <View style={[styles.filterBtn, styles.skeletonFilterBtn]} />
                <View style={[styles.filterBtn, styles.skeletonFilterBtn]} />
              </View>
            </View>

            {/* Skeleton Stats Container */}
            <View style={styles.statsContainer}>
              <View style={styles.statsRow}>
                {[1, 2, 3].map((item) => (
                  <View key={item} style={styles.statCard}>
                    <View style={styles.skeletonStatIndicator} />
                    <View style={styles.skeletonStatLabel} />
                    <View style={styles.skeletonStatValue} />
                  </View>
                ))}
              </View>
            </View>

            {/* Skeleton Search Container */}
            <View style={styles.searchContainer}>
              <View style={styles.skeletonSearchInput} />
            </View>

            {/* Skeleton Sort Section */}
            <View style={styles.sortSection}>
              <View style={styles.skeletonSortHeader} />
            </View>
          </View>

          {/* Skeleton List Content */}
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          >
            {[1, 2, 3, 4].map((item) => (
              <View key={item} style={styles.pegawaiCard}>
                {/* Skeleton Card Header */}
                <View style={styles.cardHeader}>
                  <View style={styles.skeletonAvatar} />
                  <View style={styles.employeeInfo}>
                    <View style={styles.skeletonEmployeeName} />
                    <View style={styles.skeletonEmployeeNip} />
                  </View>
                  <View style={styles.skeletonDetailBtn} />
                </View>
                {/* Skeleton Status Container */}
                <View style={styles.statusContainer}>
                  <View style={styles.skeletonStatusBadge} />
                  <View style={styles.skeletonStatusBadge} />
                  <View style={styles.skeletonStatusBadge} />
                </View>
              </View>
            ))}
          </ScrollView>
        </View>
      ) : (
        <View style={styles.contentContainer}>
          {/* STICKY HEADER - Filter, Stats, Search, Sort */}
          <View style={styles.stickyHeader}>
            {/* HEADER FILTER */}
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

            {/* RINGKASAN STATISTIK */}
            <View style={styles.statsContainer}>
              <View style={styles.statsRow}>
                <View style={styles.statCard}>
                  <View
                    style={[
                      styles.statIndicator,
                      { backgroundColor: "#4CAF50" },
                    ]}
                  />
                  <Text style={styles.statLabel}>Hadir</Text>
                  <Text style={styles.statValue}>{stats.hadir} hari</Text>
                </View>

                <View style={styles.statCard}>
                  <View
                    style={[
                      styles.statIndicator,
                      { backgroundColor: "#FF9800" },
                    ]}
                  />
                  <Text style={styles.statLabel}>Total Terlambat</Text>
                  <Text style={styles.statValue}>{stats.terlambat}x</Text>
                </View>

                <View style={styles.statCard}>
                  <View
                    style={[
                      styles.statIndicator,
                      { backgroundColor: "#F44336" },
                    ]}
                  />
                  <Text style={styles.statLabel}>Tidak Hadir</Text>
                  <Text style={styles.statValue}>{stats.tidakHadir} hari</Text>
                </View>
              </View>
            </View>

            {/* Search Container */}
            <View style={styles.searchContainer}>
              <View style={styles.searchInputWrapper}>
                <Ionicons name="search-outline" size={20} color="#666" />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Cari Pegawai..."
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

            {/* SECTION HEADER DENGAN SORT */}
            <View style={styles.sortSection}>
              <TouchableOpacity
                style={styles.sectionHeader}
                onPress={toggleSortOrder}
              >
                <Ionicons name="list" size={20} color="#004643" />
                <Text style={styles.sectionTitle}>
                  {sortOrder === "desc" ? "Z-A" : "A-Z"}
                </Text>
                <Ionicons name="swap-vertical" size={18} color="#004643" />
              </TouchableOpacity>
            </View>
          </View>

          {/* SCROLLABLE LIST */}
          <FlatList
            data={data}
            keyExtractor={(item) => item.id_pegawai.toString()}
            renderItem={renderItem}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContent}
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

            <ScrollView
              style={styles.bottomSheetContent}
              showsVerticalScrollIndicator={false}
            >
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
            </ScrollView>
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

            <ScrollView
              style={styles.bottomSheetContent}
              showsVerticalScrollIndicator={false}
            >
              {/* Kalender untuk Harian */}
              {jenisLaporan === "harian" && (
                <View style={styles.calendarContainer}>
                  <Text style={styles.calendarLabel}>Pilih Tanggal:</Text>
                  <TouchableOpacity
                    style={styles.calendarButton}
                    onPress={() => {
                      setDatePickerMode("single");
                      showCalendarModal();
                    }}
                  >
                    <Ionicons
                      name="calendar-outline"
                      size={20}
                      color="#004643"
                    />
                    <Text style={styles.calendarButtonText}>
                      {formatDate(selectedDate)}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.confirmButton}
                    onPress={() => {
                      setSelectedPeriode(formatDate(selectedDate));
                      closePeriodeModal();
                    }}
                  >
                    <Text style={styles.confirmButtonText}>Terapkan</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Kalender Range untuk Mingguan */}
              {jenisLaporan === "mingguan" && (
                <View style={styles.calendarContainer}>
                  <Text style={styles.calendarLabel}>
                    Pilih Periode Minggu:
                  </Text>
                  <View style={styles.dateRangeRow}>
                    <TouchableOpacity
                      style={styles.calendarButtonSmall}
                      onPress={() => {
                        setDatePickerMode("start");
                        showCalendarModal();
                      }}
                    >
                      <Text style={styles.calendarLabelSmall}>Dari:</Text>
                      <Text style={styles.calendarButtonText}>
                        {formatDate(selectedStartDate)}
                      </Text>
                    </TouchableOpacity>
                    <Text style={styles.dateSeparator}>s/d</Text>
                    <TouchableOpacity
                      style={styles.calendarButtonSmall}
                      onPress={() => {
                        setDatePickerMode("end");
                        showCalendarModal();
                      }}
                    >
                      <Text style={styles.calendarLabelSmall}>Sampai:</Text>
                      <Text style={styles.calendarButtonText}>
                        {formatDate(selectedEndDate)}
                      </Text>
                    </TouchableOpacity>
                  </View>
                  <TouchableOpacity
                    style={styles.confirmButton}
                    onPress={() => {
                      setSelectedPeriode(
                        formatDateRange(selectedStartDate, selectedEndDate),
                      );
                      closePeriodeModal();
                    }}
                  >
                    <Text style={styles.confirmButtonText}>Terapkan</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* List bulan untuk bulanan - Generated */}
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

              {/* List tahun untuk tahunan - Generated */}
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
            </ScrollView>
          </Animated.View>
        </View>
      </Modal>

      {/* Custom Calendar Modal - Bottom Sheet */}
      <Modal
        visible={showCalendar}
        transparent
        animationType="none"
        statusBarTranslucent
        onRequestClose={closeCalendarModal}
      >
        <View style={styles.calendarOverlay}>
          <TouchableOpacity
            style={styles.calendarBackdrop}
            activeOpacity={1}
            onPress={closeCalendarModal}
          />
          <Animated.View
            style={[
              styles.calendarSheet,
              { transform: [{ translateY: calendarTranslateY }] },
            ]}
          >
            <View
              {...calendarPanResponder.panHandlers}
              style={styles.handleContainer}
            >
              <View style={styles.handleBar} />
            </View>
            
            <View style={styles.calendarSheetHeader}>
              <Text style={styles.calendarSheetTitle}>
                {datePickerMode === "single"
                  ? "Pilih Tanggal"
                  : datePickerMode === "start"
                    ? "Pilih Tanggal Mulai"
                    : "Pilih Tanggal Selesai"}
              </Text>
              <TouchableOpacity onPress={closeCalendarModal}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.calendarSheetContent} showsVerticalScrollIndicator={false}>
              <CustomCalendar
                onDatePress={(date: Date) => {
                  if (datePickerMode === "single") {
                    setSelectedDate(date);
                    closeCalendarModal();
                  } else if (datePickerMode === "start") {
                    setSelectedStartDate(date);
                    closeCalendarModal();
                  } else if (datePickerMode === "end") {
                    const daysDiff = Math.ceil(
                      (date.getTime() - selectedStartDate.getTime()) /
                        (1000 * 60 * 60 * 24),
                    );
                    if (daysDiff > 6) {
                      alert.showAlert({ type: 'warning', message: 'Periode mingguan maksimal 7 hari' });
                      return;
                    }
                    if (date < selectedStartDate) {
                      alert.showAlert({ type: 'warning', message: 'Tanggal selesai harus setelah tanggal mulai' });
                      return;
                    }
                    setSelectedEndDate(date);
                    closeCalendarModal();
                  }
                }}
                weekendDays={[]}
                showWeekends={false}
                initialDate={datePickerMode === "single" ? selectedDate : datePickerMode === "start" ? selectedStartDate : selectedEndDate}
                startDate={datePickerMode === "end" ? selectedStartDate : undefined}
              />
            </ScrollView>
          </Animated.View>
        </View>
      </Modal>

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
  container: { flex: 1, backgroundColor: "#ffffff" },
  contentContainer: {
    flex: 1,
  },
  stickyHeader: { backgroundColor: "#FAFBFC" },
  header: {
    paddingHorizontal: 20,
    paddingTop: 15,
    paddingBottom: 10,
    backgroundColor: "#FAFBFC",
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
    backgroundColor: "#FAFBFC",
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
    backgroundColor: '#FFF',
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E8F0EF',
    shadowColor: '#004643',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  cardMainContent: { padding: 16 },
  cardHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginBottom: 12 
  },
  employeeSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#004643',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    elevation: 1,
  },
  avatarImage: { 
    width: 44, 
    height: 44, 
    borderRadius: 22, 
    marginRight: 12,
    borderWidth: 2,
    borderColor: '#F0F7F7',
  },
  avatarText: { 
    color: '#FFF', 
    fontWeight: '700', 
    fontSize: 18 
  },
  employeeInfo: { flex: 1 },
  employeeName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 4,
    letterSpacing: -0.2,
  },
  nipContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  employeeNip: { 
    fontSize: 11, 
    color: '#64748B',
    fontWeight: '500',
  },
  detailBtn: { 
    padding: 8, 
    borderRadius: 12, 
    backgroundColor: '#F0F7F7',
    borderWidth: 1,
    borderColor: '#E8F5F4',
  },
  cardDivider: { 
    height: 1, 
    backgroundColor: '#F1F5F9', 
    marginBottom: 12 
  },
  statusContainer: { 
    flexDirection: 'row', 
    flexWrap: 'wrap', 
    gap: 6 
  },
  statusBadge: { 
    paddingHorizontal: 8, 
    paddingVertical: 4, 
    borderRadius: 8,
    borderWidth: 1,
  },
  statusText: { 
    fontSize: 10, 
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  loadingText: { marginTop: 10, color: "#666" },
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
  calendarContainer: { padding: 20 },
  calendarLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 12,
  },
  calendarButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#F5F5F5",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    marginBottom: 16,
  },
  calendarButtonText: { fontSize: 14, color: "#333", fontWeight: "500" },
  dateRangeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 16,
  },
  calendarButtonSmall: {
    flex: 1,
    backgroundColor: "#F5F5F5",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  calendarLabelSmall: { fontSize: 11, color: "#666", marginBottom: 4 },
  dateSeparator: { fontSize: 14, color: "#666", fontWeight: "500" },
  confirmButton: {
    backgroundColor: "#004643",
    padding: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  confirmButtonText: { fontSize: 15, fontWeight: "600", color: "#fff" },
  calendarOverlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0, 0, 0, 0.5)" },
  calendarBackdrop: { flex: 1 },
  calendarSheet: { backgroundColor: "#fff", borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingBottom: Platform.OS === "ios" ? 34 : 20, maxHeight: "80%" },
  calendarSheetHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: "#F0F0F0" },
  calendarSheetTitle: { fontSize: 18, fontWeight: "600", color: "#333" },
  calendarSheetContent: { paddingHorizontal: 20, paddingTop: 16 },

  /* ========================================
     SKELETON STYLES - LAPORAN DETAIL ABSEN
  ======================================== */
  // Skeleton untuk Filter Button
  skeletonFilterBtn: {
    backgroundColor: '#F0F0F0',
    height: 40,
  },
  // Skeleton untuk Stat Card
  skeletonStatIndicator: {
    width: 30,
    height: 3,
    backgroundColor: '#E0E0E0',
    borderRadius: 2,
    marginBottom: 8,
  },
  skeletonStatLabel: {
    width: '60%',
    height: 10,
    backgroundColor: '#F0F0F0',
    borderRadius: 4,
    marginBottom: 4,
  },
  skeletonStatValue: {
    width: '40%',
    height: 16,
    backgroundColor: '#E0E0E0',
    borderRadius: 4,
  },
  // Skeleton untuk Search Input
  skeletonSearchInput: {
    width: '100%',
    height: 48,
    backgroundColor: '#F0F0F0',
    borderRadius: 12,
  },
  // Skeleton untuk Sort Header
  skeletonSortHeader: {
    width: '100%',
    height: 40,
    backgroundColor: '#F0F0F0',
    borderRadius: 8,
  },
  // Skeleton untuk Avatar
  skeletonAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#E0E0E0',
    marginRight: 12,
  },
  // Skeleton untuk Employee Name
  skeletonEmployeeName: {
    width: '70%',
    height: 15,
    backgroundColor: '#E0E0E0',
    borderRadius: 4,
    marginBottom: 4,
  },
  // Skeleton untuk Employee NIP
  skeletonEmployeeNip: {
    width: '50%',
    height: 11,
    backgroundColor: '#F0F0F0',
    borderRadius: 4,
  },
  // Skeleton untuk Detail Button
  skeletonDetailBtn: {
    width: 32,
    height: 32,
    backgroundColor: '#F0F7F7',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E8F5F4',
  },
  // Skeleton untuk Status Badge
  skeletonStatusBadge: {
    width: 80,
    height: 24,
    backgroundColor: '#F0F0F0',
    borderRadius: 8,
  },
});

