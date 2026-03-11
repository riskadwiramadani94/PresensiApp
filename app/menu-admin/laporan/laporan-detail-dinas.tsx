import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  FlatList,
  Image,
  Linking,
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
import Toast from "../../../components/Toast";
import { API_CONFIG, getApiUrl } from "../../../constants/config";
import { useCustomAlert } from "../../../hooks/useCustomAlert";
import { useToast } from "../../../hooks/useToast";

interface DinasData {
  id: number;
  namaKegiatan: string;
  nomorSpt: string;
  tanggal_mulai: string;
  tanggal_selesai: string;
  lokasi: string;
  status?: string;
  pegawai: any[];
  jenisDinas?: string;
}

const statusConfig = {
  "akan datang": { color: "#FF9800", label: "Akan Datang" },
  berlangsung: { color: "#4CAF50", label: "Berlangsung" },
  aktif: { color: "#4CAF50", label: "Berlangsung" },
  selesai: { color: "#2196F3", label: "Selesai" },
  dibatalkan: { color: "#F44336", label: "Dibatalkan" },
};

export default function LaporanDetailDinasScreen() {
  const alert = useCustomAlert();
  const toast = useToast();
  const router = useRouter();
  const today = new Date();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<DinasData[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortOrder, setSortOrder] = useState<"desc" | "asc">("asc");

  const [selectedDate, setSelectedDate] = useState(today);
  const [selectedStartDate, setSelectedStartDate] = useState(() => {
    const start = new Date(today);
    start.setDate(today.getDate() - today.getDay() + 1);
    return start;
  });
  const [selectedMonth, setSelectedMonth] = useState(today);
  const [selectedEndDate, setSelectedEndDate] = useState(() => {
    const end = new Date(today);
    end.setDate(today.getDate() - today.getDay() + 7);
    return end;
  });
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
    akanDatang: 0,
    berlangsung: 0,
    selesai: 0,
  });
  const [jenisLaporan, setJenisLaporan] = useState("bulanan");
  const [showJenisModal, setShowJenisModal] = useState(false);
  const [showPeriodeModal, setShowPeriodeModal] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const jenisTranslateY = useRef(new Animated.Value(500)).current;
  const periodeTranslateY = useRef(new Animated.Value(500)).current;
  const calendarTranslateY = useRef(new Animated.Value(500)).current;
  const exportTranslateY = useRef(new Animated.Value(500)).current;
  const [datePickerMode, setDatePickerMode] = useState<
    "single" | "start" | "end"
  >("single");

  const handleExportAll = async () => {
    setShowExportModal(true);
    Animated.timing(exportTranslateY, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  const closeExportModal = () => {
    Animated.timing(exportTranslateY, {
      toValue: 500,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setShowExportModal(false);
    });
  };

  const handleExportFormat = async (format: 'excel' | 'pdf') => {
    closeExportModal();
    
    try {
      toast.showToast(`Sedang menyiapkan laporan dinas ${format.toUpperCase()}...`, 'loading');
      
      let params: any = {
        type: 'dinas',
        filter_date: jenisLaporan,
        format: format
      };

      if (jenisLaporan === "bulanan") {
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

      const url = `${getApiUrl(API_CONFIG.ENDPOINTS.EXPORT_LAPORAN)}?${new URLSearchParams(params).toString()}`;
      
      await Linking.openURL(url);
      
      setTimeout(() => {
        toast.showToast(`Laporan dinas ${format.toUpperCase()} berhasil diunduh!`, 'success');
      }, 1000);
      
    } catch (error: any) {
      console.error('Export dinas error:', error);
      toast.showToast('Gagal mengunduh laporan dinas', 'error');
    }
  };

  const jenisLaporanOptions = [
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

  const exportPanResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: (_, gestureState) => gestureState.dy > 5,
    onPanResponderMove: (_, gestureState) => {
      if (gestureState.dy > 0) {
        exportTranslateY.setValue(gestureState.dy);
      }
    },
    onPanResponderRelease: (_, gestureState) => {
      if (gestureState.dy > 100) {
        closeExportModal();
      } else {
        Animated.spring(exportTranslateY, {
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

  const getJenisLabel = () => {
    const jenis = jenisLaporanOptions.find((j) => j.value === jenisLaporan);
    return jenis?.label || "Laporan Bulanan";
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

  const toggleSortOrder = () => {
    setSortOrder((prev) => (prev === "desc" ? "asc" : "desc"));
  };

  const getStatusDinas = (item: DinasData) => {
    if (item.status === 'dibatalkan') return 'dibatalkan';
    if (item.status === 'selesai') return 'selesai';
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const mulai = new Date(item.tanggal_mulai);
    mulai.setHours(0, 0, 0, 0);
    const selesai = new Date(item.tanggal_selesai);
    selesai.setHours(0, 0, 0, 0);
    
    if (today < mulai) return 'akan datang';
    if (today >= mulai && today <= selesai) return 'berlangsung';
    return 'selesai';
  };

  const calculateStats = (dinasData: DinasData[]) => {
    let totalAkanDatang = 0;
    let totalBerlangsung = 0;
    let totalSelesai = 0;

    dinasData.forEach((dinas) => {
      const status = getStatusDinas(dinas);
      
      if (status === "akan datang") {
        totalAkanDatang++;
      } else if (status === "berlangsung") {
        totalBerlangsung++;
      } else if (status === "selesai") {
        totalSelesai++;
      }
    });

    setStats({
      akanDatang: totalAkanDatang,
      berlangsung: totalBerlangsung,
      selesai: totalSelesai,
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

      if (jenisLaporan === "bulanan") {
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
        filter_date: filterDate,
        search: searchQuery,
      };

      if (startDate) params.start_date = startDate;
      if (endDate) params.end_date = endDate;
      if (month) params.month = month;
      if (year) params.year = year;

      console.log('=== FILTER DEBUG ===');
      console.log('Jenis Laporan:', jenisLaporan);
      console.log('Selected Periode:', selectedPeriode);
      console.log('Params yang dikirim:', params);

      // Gunakan endpoint DINAS_AKTIF untuk mendapatkan list dinas
      const response = await fetch(
        `${getApiUrl(API_CONFIG.ENDPOINTS.DINAS_AKTIF)}?${new URLSearchParams(params).toString()}`,
      );
      const result = await response.json();

      console.log('API Response:', result);
      console.log('Jumlah data:', result.data?.length || 0);

      if (result.success && result.data && Array.isArray(result.data)) {
        // Filter data di frontend sesuai periode yang dipilih
        let filteredData = result.data;
        
        if (jenisLaporan === "bulanan" && month && year) {
          filteredData = result.data.filter((item: DinasData) => {
            const mulai = new Date(item.tanggal_mulai);
            const selesai = new Date(item.tanggal_selesai);
            const targetMonth = parseInt(month);
            const targetYear = parseInt(year);
            
            // Cek apakah dinas ada di bulan & tahun yang dipilih
            return (
              (mulai.getFullYear() === targetYear && mulai.getMonth() + 1 === targetMonth) ||
              (selesai.getFullYear() === targetYear && selesai.getMonth() + 1 === targetMonth) ||
              (mulai <= new Date(targetYear, targetMonth - 1, 1) && 
               selesai >= new Date(targetYear, targetMonth, 0))
            );
          });
        } else if (jenisLaporan === "tahunan" && year) {
          filteredData = result.data.filter((item: DinasData) => {
            const mulai = new Date(item.tanggal_mulai);
            const selesai = new Date(item.tanggal_selesai);
            const targetYear = parseInt(year);
            
            return (
              mulai.getFullYear() === targetYear || 
              selesai.getFullYear() === targetYear
            );
          });
        }
        
        console.log('Data setelah filter:', filteredData.length);
        
        const sortedData = filteredData.sort((a: DinasData, b: DinasData) =>
          sortOrder === "desc"
            ? b.namaKegiatan.localeCompare(a.namaKegiatan)
            : a.namaKegiatan.localeCompare(b.namaKegiatan),
        );
        setData(sortedData);
        calculateStats(filteredData);
      } else {
        setData([]);
        setStats({ akanDatang: 0, berlangsung: 0, selesai: 0 });
      }
    } catch (error) {
      console.error('Fetch error:', error);
      alert.showAlert({ type: "error", message: "Gagal memuat data dinas" });
      setData([]);
      setStats({ akanDatang: 0, berlangsung: 0, selesai: 0 });
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    const config = statusConfig[status as keyof typeof statusConfig];
    return config?.color || "#666";
  };

  const getStatusLabel = (status: string) => {
    const config = statusConfig[status as keyof typeof statusConfig];
    return config?.label || status;
  };

  const renderItem = ({ item }: { item: DinasData }) => {
    // Parse tanggal tanpa timezone untuk menghindari shift
    const parseTanggal = (dateStr: string) => {
      const date = new Date(dateStr);
      return date.toLocaleDateString("id-ID", {
        day: "numeric",
        month: "short",
      });
    };

    return (
    <TouchableOpacity
      style={styles.dinasCard}
      onPress={() => {
        router.push(`/menu-admin/laporan/detail-dinas/${item.id}` as any);
      }}
    >
      <View style={styles.cardMainContent}>
        <View style={styles.cardHeader}>
          <View style={styles.dinasInfo}>
            <Text style={styles.kegiatanName}>{item.namaKegiatan}</Text>
            <Text style={styles.sptNumber}>{item.nomorSpt}</Text>
          </View>
          <View
            style={[
              styles.statusBadge,
              {
                backgroundColor: getStatusColor(getStatusDinas(item)) + "15",
                borderColor: getStatusColor(getStatusDinas(item)) + "30",
              },
            ]}
          >
            <Text
              style={[
                styles.statusText,
                {
                  color: getStatusColor(getStatusDinas(item)),
                },
              ]}
            >
              {getStatusLabel(getStatusDinas(item))}
            </Text>
          </View>
        </View>

        <View style={styles.cardDivider} />

        <View style={styles.infoSection}>
          <View style={styles.infoRow}>
            <Ionicons name="calendar-outline" size={14} color="#64748B" />
            <Text style={styles.infoText}>
              {parseTanggal(item.tanggal_mulai)} - {parseTanggal(item.tanggal_selesai)}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="location-outline" size={14} color="#64748B" />
            <Text style={styles.infoText} numberOfLines={1}>
              {item.lokasi || "-"}
            </Text>
          </View>
        </View>

        <View style={styles.cardFooter}>
          <View style={styles.footerLeft}>
            <Ionicons name="people-circle" size={20} color="#64748B" />
            <Text style={styles.footerText}>
              <Text style={styles.footerBold}>{item.pegawai?.length || 0}</Text> Pegawai Bertugas
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#CBD5E1" />
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
        title="Laporan Dinas"
        showBack={true}
        fallbackRoute="/laporan/laporan-admin"
        rightIcon="download-outline"
        onRightPress={handleExportAll}
      />

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#004643" />
          <Text style={styles.loadingText}>Memuat data dinas...</Text>
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
                      { backgroundColor: "#FF9800" },
                    ]}
                  />
                  <Text style={styles.statLabel}>Akan Datang</Text>
                  <Text style={styles.statValue}>{stats.akanDatang}</Text>
                </View>
                <View style={styles.statCard}>
                  <View
                    style={[
                      styles.statIndicator,
                      { backgroundColor: "#4CAF50" },
                    ]}
                  />
                  <Text style={styles.statLabel}>Berlangsung</Text>
                  <Text style={styles.statValue}>{stats.berlangsung}</Text>
                </View>
                <View style={styles.statCard}>
                  <View
                    style={[
                      styles.statIndicator,
                      { backgroundColor: "#2196F3" },
                    ]}
                  />
                  <Text style={styles.statLabel}>Selesai</Text>
                  <Text style={styles.statValue}>{stats.selesai}</Text>
                </View>
              </View>
            </View>

            <View style={styles.searchContainer}>
              <View style={styles.searchInputWrapper}>
                <Ionicons name="search-outline" size={20} color="#666" />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Cari Dinas..."
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
            keyExtractor={(item, index) =>
              `dinas-${item.id}-${index}`
            }
            renderItem={renderItem}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={() => (
              <View style={styles.emptyState}>
                <Ionicons name="airplane-outline" size={60} color="#ccc" />
                <Text style={styles.emptyText}>
                  Tidak ada data dinas ditemukan
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

      {/* Custom Calendar Modal */}
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
            <ScrollView
              style={styles.calendarSheetContent}
              showsVerticalScrollIndicator={false}
            >
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
                      alert.showAlert({
                        type: "warning",
                        message: "Periode mingguan maksimal 7 hari",
                      });
                      return;
                    }
                    if (date < selectedStartDate) {
                      alert.showAlert({
                        type: "warning",
                        message: "Tanggal selesai harus setelah tanggal mulai",
                      });
                      return;
                    }
                    setSelectedEndDate(date);
                    closeCalendarModal();
                  }
                }}
                weekendDays={[]}
                showWeekends={false}
                initialDate={
                  datePickerMode === "single"
                    ? selectedDate
                    : datePickerMode === "start"
                      ? selectedStartDate
                      : selectedEndDate
                }
                startDate={
                  datePickerMode === "end" ? selectedStartDate : undefined
                }
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

      {/* Modal Export Format */}
      <Modal
        visible={showExportModal}
        transparent
        animationType="none"
        statusBarTranslucent
        onRequestClose={closeExportModal}
      >
        <View style={styles.bottomSheetOverlay}>
          <TouchableOpacity
            style={styles.bottomSheetBackdrop}
            activeOpacity={1}
            onPress={closeExportModal}
          />
          <Animated.View
            style={[
              styles.bottomSheet,
              { transform: [{ translateY: exportTranslateY }] },
            ]}
          >
            <View
              {...exportPanResponder.panHandlers}
              style={styles.handleContainer}
            >
              <View style={styles.handleBar} />
            </View>

            <View style={styles.bottomSheetHeader}>
              <Text style={styles.bottomSheetTitle}>Pilih Format Export</Text>
            </View>

            <View style={styles.bottomSheetContent}>
              <TouchableOpacity
                style={styles.bottomSheetItem}
                onPress={() => handleExportFormat('excel')}
              >
                <View style={styles.bottomSheetItemLeft}>
                  <View style={styles.bottomSheetIcon}>
                    <Ionicons name="document-outline" size={20} color="#004643" />
                  </View>
                  <Text style={styles.bottomSheetItemText}>Export Excel (.xlsx)</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#666" />
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.bottomSheetItem}
                onPress={() => handleExportFormat('pdf')}
              >
                <View style={styles.bottomSheetItemLeft}>
                  <View style={styles.bottomSheetIcon}>
                    <Ionicons name="document-text-outline" size={20} color="#004643" />
                  </View>
                  <Text style={styles.bottomSheetItemText}>Export PDF (.pdf)</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#666" />
              </TouchableOpacity>
            </View>
          </Animated.View>
        </View>
      </Modal>

      <Toast
        visible={toast.visible}
        message={toast.config.message}
        type={toast.config.type}
        onHide={toast.hideToast}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#ffffff" },
  contentContainer: { flex: 1 },
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
    backgroundColor: "#FAFBFC",
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
  dinasCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E8F0EF',
    shadowColor: '#004643',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  cardMainContent: { padding: 0 },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  dinasInfo: {
    flex: 1,
    marginRight: 12,
  },
  kegiatanName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1E293B",
    marginBottom: 4,
  },
  sptNumber: {
    fontSize: 11,
    color: "#64748B",
    fontWeight: "600",
  },
  cardDivider: {
    height: 1,
    backgroundColor: "#F1F5F9",
    marginBottom: 12,
  },
  infoSection: {
    gap: 8,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  infoText: {
    fontSize: 12,
    color: "#64748B",
    flex: 1,
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    marginHorizontal: -16,
    marginBottom: -16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginTop: 12,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
  },
  footerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  footerText: {
    fontSize: 12,
    color: "#64748B",
  },
  footerBold: {
    fontWeight: "700",
    color: "#1E293B",
  },
  statusContainer: {
    marginTop: 12,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    alignSelf: "flex-start",
  },
  statusText: {
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  loadingText: { marginTop: 10, color: "#666" },
  emptyState: {
    alignItems: "center",
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 14,
    color: "#999",
    marginTop: 10,
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
  calendarOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  calendarBackdrop: { flex: 1 },
  calendarSheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: Platform.OS === "ios" ? 34 : 20,
    maxHeight: "80%",
  },
  calendarSheetHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  calendarSheetTitle: { fontSize: 18, fontWeight: "600", color: "#333" },
  calendarSheetContent: { paddingHorizontal: 20, paddingTop: 16 },
});
