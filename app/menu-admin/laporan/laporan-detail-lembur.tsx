import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useRef, useState } from "react";
import {
    ActivityIndicator,
    Alert,
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
import { AppHeader } from "../../../components";
import CustomCalendar from "../../../components/CustomCalendar";
import { API_CONFIG, getApiUrl } from "../../../constants/config";

interface PegawaiLembur {
  id_pegawai: number;
  nama_lengkap: string;
  nip: string;
  foto_profil?: string;
  summary: {
    total_pengajuan: number;
    disetujui: number;
    pending: number;
    ditolak: number;
    total_jam: number;
    total_hari: number;
  };
}

export default function LaporanDetailLemburScreen() {
  const router = useRouter();
  const today = new Date();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<PegawaiLembur[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortOrder, setSortOrder] = useState<"desc" | "asc">("desc");

  const [selectedStartDate, setSelectedStartDate] = useState(() => {
    const start = new Date(today);
    start.setDate(today.getDate() - today.getDay() + 1);
    return start;
  });
  const [selectedEndDate, setSelectedEndDate] = useState(() => {
    const end = new Date(today);
    end.setDate(today.getDate() - today.getDay() + 7);
    return end;
  });
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [selectedPeriode, setSelectedPeriode] = useState(() => {
    const now = new Date();
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
    return `${months[now.getMonth()]} ${now.getFullYear()}`;
  });
  const [stats, setStats] = useState({
    totalPengajuan: 0,
    disetujui: 0,
    totalJam: 0,
  });
  const [jenisLaporan, setJenisLaporan] = useState("bulanan");
  const [showJenisModal, setShowJenisModal] = useState(false);
  const [showPeriodeModal, setShowPeriodeModal] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const jenisTranslateY = useRef(new Animated.Value(500)).current;
  const periodeTranslateY = useRef(new Animated.Value(500)).current;
  const calendarTranslateY = useRef(new Animated.Value(500)).current;
  const [datePickerMode, setDatePickerMode] = useState<"start" | "end">(
    "start",
  );

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

  const getJenisLabel = () => {
    const jenis = jenisLaporanOptions.find((j) => j.value === jenisLaporan);
    return jenis?.label || "Laporan Mingguan";
  };

  const getPeriodeLabel = () => {
    return selectedPeriode;
  };

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

  const calculateStats = (pegawaiData: PegawaiLembur[]) => {
    let totalPengajuan = 0;
    let disetujui = 0;
    let totalJam = 0;
    let totalHari = 0;

    pegawaiData.forEach((pegawai) => {
      const summary = pegawai.summary || {};
      totalPengajuan += summary.total_pengajuan || 0;
      disetujui += summary.disetujui || 0;
      totalJam += summary.total_jam || 0;
      totalHari += summary.total_hari || 0;
    });

    console.log("Calculated stats:", {
      totalPengajuan,
      disetujui,
      totalJam,
      totalHari,
    });

    setStats({
      totalPengajuan,
      disetujui,
      totalJam,
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

      if (jenisLaporan === "mingguan") {
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
        type: "lembur",
        filter_date: filterDate,
        search: searchQuery,
      };

      if (startDate) params.start_date = startDate;
      if (endDate) params.end_date = endDate;
      if (month) params.month = month;
      if (year) params.year = year;

      console.log("Fetching lembur with params:", params);
      const response = await fetch(
        `${getApiUrl(API_CONFIG.ENDPOINTS.LAPORAN)}?${new URLSearchParams(params).toString()}`,
      );
      const result = await response.json();

      console.log("Lembur API Response:", result);

      if (result.success && Array.isArray(result.data)) {
        console.log("Lembur data count:", result.data.length);
        if (result.data.length > 0) {
          console.log(
            "Sample data structure:",
            JSON.stringify(result.data[0], null, 2),
          );
        }
        const sortedData = result.data.sort(
          (a: PegawaiLembur, b: PegawaiLembur) =>
            sortOrder === "desc"
              ? b.nama_lengkap.localeCompare(a.nama_lengkap)
              : a.nama_lengkap.localeCompare(b.nama_lengkap),
        );
        setData(sortedData);
        calculateStats(result.data);
      } else {
        console.log("No data or invalid response");
        setData([]);
      }
    } catch (error) {
      console.error("Error fetching lembur data:", error);
      Alert.alert("Error", "Gagal memuat data lembur");
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  const renderItem = ({ item }: { item: PegawaiLembur }) => {
    const buildDetailParams = () => {
      let params: any = { filter: jenisLaporan };

      if (jenisLaporan === "mingguan") {
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
            `/laporan/detail-lembur/${item.id_pegawai}?${queryParams}` as any,
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
            <Text style={styles.employeeNip}>{item.nip}</Text>
            <View style={styles.infoRow}>
              <View style={styles.infoItem}>
                <Text style={styles.infoValue}>
                  {item.summary?.total_hari || 0}
                </Text>
                <Text style={styles.infoLabel}>Hari</Text>
              </View>
              <View style={styles.infoDivider} />
              <View style={styles.infoItem}>
                <Text style={styles.infoValue}>
                  {item.summary?.total_jam || 0}
                </Text>
                <Text style={styles.infoLabel}>Jam</Text>
              </View>
            </View>
          </View>
          <View style={styles.chevronIcon}>
            <Ionicons name="chevron-forward" size={20} color="#999" />
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
        title="Laporan Lembur"
        showBack={true}
        fallbackRoute="/laporan/laporan-admin"
      />

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#004643" />
          <Text style={styles.loadingText}>Memuat data lembur...</Text>
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
                  <Text style={styles.statLabel}>Total Jam</Text>
                  <Text style={styles.statValue}>{stats.totalJam} Jam</Text>
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
                  {sortOrder === "desc" ? "Z-A" : "A-Z"}
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
                <Ionicons name="moon-outline" size={60} color="#ccc" />
                <Text style={styles.emptyText}>Tidak ada data lembur</Text>
                <Text style={styles.emptySubText}>
                  Belum ada data lembur untuk periode ini
                </Text>
              </View>
            )}
          />
        </View>
      )}

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
                        {selectedStartDate.toLocaleDateString("id-ID")}
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
                        {selectedEndDate.toLocaleDateString("id-ID")}
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
            </ScrollView>
          </Animated.View>
        </View>
      </Modal>

      <Modal
        visible={showCalendar}
        transparent
        animationType="none"
        statusBarTranslucent
        onRequestClose={closeCalendarModal}
      >
        <View style={styles.bottomSheetOverlay}>
          <TouchableOpacity
            style={styles.bottomSheetBackdrop}
            activeOpacity={1}
            onPress={closeCalendarModal}
          />
          <Animated.View
            style={[
              styles.calendarBottomSheet,
              { transform: [{ translateY: calendarTranslateY }] },
            ]}
          >
            <View
              {...calendarPanResponder.panHandlers}
              style={styles.handleContainer}
            >
              <View style={styles.handleBar} />
            </View>
            <View style={styles.calendarSheetContent}>
              <Text style={styles.calendarSheetTitle}>
                {datePickerMode === "start"
                  ? "Pilih Tanggal Mulai"
                  : "Pilih Tanggal Selesai"}
              </Text>
              <CustomCalendar
                onDatePress={(date: Date) => {
                  if (datePickerMode === "start") {
                    setSelectedStartDate(date);
                    closeCalendarModal();
                  } else if (datePickerMode === "end") {
                    const daysDiff = Math.ceil(
                      (date.getTime() - selectedStartDate.getTime()) /
                        (1000 * 60 * 60 * 24),
                    );
                    if (daysDiff > 6) {
                      Alert.alert(
                        "Peringatan",
                        "Periode mingguan maksimal 7 hari",
                      );
                      return;
                    }
                    if (date < selectedStartDate) {
                      Alert.alert(
                        "Peringatan",
                        "Tanggal selesai harus setelah tanggal mulai",
                      );
                      return;
                    }
                    setSelectedEndDate(date);
                    closeCalendarModal();
                  }
                }}
                weekendDays={[]}
                showWeekends={false}
              />
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
    paddingVertical: 15,
    backgroundColor: "#fff",
  },
  searchInputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8F9FA",
    borderRadius: 12,
    paddingHorizontal: 15,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    gap: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: "#333",
    paddingVertical: 12,
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
    padding: 14,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    borderWidth: 1,
    borderColor: "#F0F0F0",
  },
  cardHeader: { flexDirection: "row", alignItems: "center" },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#E6F0EF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  avatarImage: {
    width: 42,
    height: 42,
    borderRadius: 21,
    marginRight: 12,
  },
  avatarText: { color: "#004643", fontWeight: "700", fontSize: 16 },
  employeeInfo: { flex: 1 },
  employeeName: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1a1a1a",
    marginBottom: 2,
  },
  employeeNip: { fontSize: 12, color: "#757575", marginBottom: 8 },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  infoItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  infoValue: {
    fontSize: 13,
    fontWeight: "700",
    color: "#1a1a1a",
  },
  infoLabel: {
    fontSize: 11,
    color: "#757575",
  },
  infoDivider: {
    width: 1,
    height: 12,
    backgroundColor: "#E0E0E0",
  },
  chevronIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#F5F5F5",
    justifyContent: "center",
    alignItems: "center",
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
  calendarContainer: { padding: 20 },
  calendarLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 12,
  },
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
  calendarButtonText: { fontSize: 14, color: "#333", fontWeight: "500" },
  dateSeparator: { fontSize: 14, color: "#666", fontWeight: "500" },
  confirmButton: {
    backgroundColor: "#004643",
    padding: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  confirmButtonText: { fontSize: 15, fontWeight: "600", color: "#fff" },
  calendarBottomSheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: Platform.OS === "ios" ? 34 : 20,
    maxHeight: "70%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 20,
  },
  calendarSheetContent: { paddingHorizontal: 20, paddingBottom: 16 },
  calendarSheetTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#333",
    marginBottom: 16,
    textAlign: "center",
  },
});
