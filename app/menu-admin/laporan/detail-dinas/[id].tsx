import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  FlatList,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { AppHeader, CustomAlert } from "../../../../components";
import { API_CONFIG, getApiUrl } from "../../../../constants/config";
import { useCustomAlert } from "../../../../hooks/useCustomAlert";

interface PegawaiAbsen {
  id_user: number;
  nama_lengkap: string;
  nip: string;
  status: string;
  jam_masuk?: string;
  jam_pulang?: string;
  foto_masuk?: string;
  foto_pulang?: string;
  lokasi_absen?: string;
  is_lokasi_sesuai: boolean;
}

interface DinasDetail {
  id: number;
  namaKegiatan: string;
  nomorSpt: string;
  tanggal_mulai: string;
  tanggal_selesai: string;
  lokasi: string;
  status: string;
  jenisDinas: string;
}

const statusConfig = {
  hadir: { color: "#4CAF50", label: "Hadir", icon: "checkmark-circle" },
  terlambat: { color: "#FF9800", label: "Terlambat", icon: "time" },
  belum_absen: { color: "#F44336", label: "Belum Absen", icon: "close-circle" },
};

export default function DetailLaporanDinasScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const alert = useCustomAlert();
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dinasDetail, setDinasDetail] = useState<DinasDetail | null>(null);
  const [pegawaiList, setPegawaiList] = useState<PegawaiAbsen[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [stats, setStats] = useState({
    total: 0,
    hadir: 0,
    terlambat: 0,
    belumAbsen: 0,
  });

  useEffect(() => {
    if (dinasDetail) {
      // Jika sudah ada dinasDetail, berarti ini perubahan tanggal
      fetchDinasDetail(true);
    } else {
      // First load
      fetchDinasDetail(false);
    }
  }, [id, selectedDate]);

  const fetchDinasDetail = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      console.log('Fetching dinas detail for ID:', id, 'Date:', formatDateForAPI(selectedDate));
      
      // Fetch dinas detail menggunakan DINAS_AKTIF dengan tanggal
      const dateParam = formatDateForAPI(selectedDate);
      const response = await fetch(
        `${getApiUrl(API_CONFIG.ENDPOINTS.DINAS_AKTIF)}?tanggal=${dateParam}`
      );
      const result = await response.json();

      console.log('Dinas API Response:', result);

      if (result.success && result.data) {
        // Cari dinas berdasarkan ID
        const dinas = result.data.find((d: any) => d.id === parseInt(id as string));
        
        console.log('Found dinas:', dinas);
        
        if (dinas) {
          // Map data dari API ke format yang dibutuhkan
          const mappedDinas: DinasDetail = {
            id: dinas.id,
            namaKegiatan: dinas.namaKegiatan,
            nomorSpt: dinas.nomorSpt,
            tanggal_mulai: dinas.tanggal_mulai,
            tanggal_selesai: dinas.tanggal_selesai,
            lokasi: dinas.lokasi,
            status: dinas.status || 'aktif',
            jenisDinas: dinas.jenisDinas || 'lokal',
          };
          
          // Hanya set dinasDetail saat pertama kali load
          if (!isRefresh) {
            setDinasDetail(mappedDinas);
          }
          
          // Map pegawai list dari dinas dengan struktur yang benar
          const pegawai = (dinas.pegawai || []).map((p: any) => {
            // Tentukan status berdasarkan data absensi
            let status = 'belum_absen';
            
            // Cek apakah ada jam masuk
            const jamMasuk = p.jam_masuk || p.jamAbsen || p.jamMasuk;
            const jamPulang = p.jam_pulang || p.jamPulang;
            
            if (jamMasuk) {
              // Jika ada jam masuk, cek apakah terlambat atau hadir
              // Asumsi jam kerja standar 08:00
              const [jamMasukHour, jamMasukMinute] = jamMasuk.split(':').map(Number);
              const jamMasukMenit = jamMasukHour * 60 + jamMasukMinute;
              const batasWaktu = 8 * 60 + 15; // 08:15
              
              if (jamMasukMenit <= batasWaktu) {
                status = 'hadir';
              } else {
                status = 'terlambat';
              }
            } else {
              // Belum absen
              status = 'belum_absen';
            }
            
            return {
              id_user: p.id_user || 0,
              nama_lengkap: p.nama || p.nama_lengkap || 'Tidak ada nama',
              nip: p.nip || '-',
              status: status,
              jam_masuk: jamMasuk,
              jam_pulang: jamPulang,
              foto_masuk: p.foto_masuk || p.fotoAbsen || p.fotoAbsenMasuk,
              foto_pulang: p.foto_pulang || p.fotoAbsenPulang,
              lokasi_absen: p.lokasiAbsen || p.lokasi_absen || p.lokasiAbsenMasuk,
              is_lokasi_sesuai: p.isLokasiSesuai || p.is_lokasi_sesuai || p.isLokasiSesuaiMasuk || false,
            };
          });
          
          console.log('Mapped pegawai:', pegawai);
          
          setPegawaiList(pegawai);
          calculateStats(pegawai);
        } else {
          console.log('Dinas not found with ID:', id);
          setPegawaiList([]);
          setStats({ total: 0, hadir: 0, terlambat: 0, belumAbsen: 0 });
        }
      }
    } catch (error) {
      console.error("Fetch error:", error);
      alert.showAlert({ type: "error", message: "Gagal memuat data dinas" });
    } finally {
      if (isRefresh) {
        setRefreshing(false);
      } else {
        setLoading(false);
      }
    }
  };

  const calculateStats = (pegawai: PegawaiAbsen[]) => {
    const total = pegawai.length;
    const hadir = pegawai.filter((p) => p.status === "hadir").length;
    const terlambat = pegawai.filter((p) => p.status === "terlambat").length;
    const belumAbsen = pegawai.filter((p) => p.status === "belum_absen").length;

    setStats({ total, hadir, terlambat, belumAbsen });
  };

  const formatDateForAPI = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const formatDateDisplay = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const getDinasStatus = () => {
    if (!dinasDetail) return { status: "Aktif", color: "#4CAF50" };
    
    if (dinasDetail.status === "dibatalkan") {
      return { status: "Dibatalkan", color: "#F44336" };
    }
    if (dinasDetail.status === "selesai") {
      return { status: "Selesai", color: "#2196F3" };
    }

    const today = new Date();
    const mulai = new Date(dinasDetail.tanggal_mulai);
    const selesai = new Date(dinasDetail.tanggal_selesai);

    today.setHours(0, 0, 0, 0);
    mulai.setHours(0, 0, 0, 0);
    selesai.setHours(0, 0, 0, 0);

    if (today < mulai) {
      return { status: "Belum Dimulai", color: "#FF9800" };
    } else if (today >= mulai && today <= selesai) {
      return { status: "Berlangsung", color: "#4CAF50" };
    } else {
      return { status: "Selesai", color: "#2196F3" };
    }
  };

  const generateDateRange = () => {
    if (!dinasDetail) return [];
    
    const start = new Date(dinasDetail.tanggal_mulai);
    const end = new Date(dinasDetail.tanggal_selesai);
    const dates = [];

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      dates.push(new Date(d));
    }

    return dates;
  };

  const filteredPegawai = pegawaiList;

  const renderPegawaiCard = ({ item }: { item: PegawaiAbsen }) => {
    const statusInfo = statusConfig[item.status as keyof typeof statusConfig];

    return (
      <TouchableOpacity
        style={styles.pegawaiCard}
        onPress={() => {
          // TODO: Open detail modal
        }}
      >
        <View style={styles.pegawaiHeader}>
          <View style={styles.pegawaiAvatar}>
            <Text style={styles.pegawaiAvatarText}>
              {item.nama_lengkap.charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={styles.pegawaiInfo}>
            <Text style={styles.pegawaiName}>{item.nama_lengkap}</Text>
            <View style={styles.nipContainer}>
              <Ionicons name="card-outline" size={12} color="#64748B" />
              <Text style={styles.pegawaiNip}>{item.nip}</Text>
            </View>
          </View>
        </View>

        <View style={styles.statusRow}>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: statusInfo.color + "15" },
            ]}
          >
            <Ionicons
              name={statusInfo.icon as any}
              size={14}
              color={statusInfo.color}
            />
            <Text style={[styles.statusText, { color: statusInfo.color }]}>
              {statusInfo.label}
            </Text>
          </View>
          {item.is_lokasi_sesuai && (
            <View style={styles.lokasiSesuai}>
              <Ionicons name="location" size={12} color="#4CAF50" />
              <Text style={styles.lokasiText}>Sesuai Lokasi</Text>
            </View>
          )}
        </View>

        {item.jam_masuk && (
          <View style={styles.jamRow}>
            <Ionicons name="time-outline" size={14} color="#64748B" />
            <Text style={styles.jamText}>
              {item.jam_masuk} → {item.jam_pulang || "-"}
            </Text>
          </View>
        )}

        <View style={styles.cardFooter}>
          <Text style={styles.detailLink}>Lihat Detail</Text>
          <Ionicons name="chevron-forward" size={16} color="#004643" />
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.containerLoading}>
        <StatusBar style="light" translucent backgroundColor="transparent" />
        <AppHeader title="Detail Laporan Dinas" showBack />
        <ScrollView 
          showsVerticalScrollIndicator={false} 
          contentContainerStyle={styles.scrollContent}
          bounces={false}
          overScrollMode="never"
        >
          {/* Skeleton Premium Header */}
          <View style={styles.skeletonHeader}>
            <View style={styles.headerTopRow}>
              <View style={styles.titleWrapper}>
                <View style={styles.skeletonTitle} />
                <View style={styles.nipContainer}>
                  <View style={styles.skeletonNipIcon} />
                  <View style={styles.skeletonNipText} />
                </View>
              </View>
              <View style={styles.skeletonAvatarHeader} />
            </View>
            <View style={styles.skeletonPeriodHeader} />
          </View>

          {/* Skeleton Pegawai List */}
          <View style={styles.listContainer}>
            {[1, 2, 3, 4, 5].map((item) => (
              <View key={item} style={styles.pegawaiCard}>
                <View style={styles.pegawaiHeader}>
                  <View style={styles.skeletonAvatar} />
                  <View style={styles.pegawaiInfo}>
                    <View style={styles.skeletonName} />
                    <View style={styles.skeletonNip} />
                  </View>
                </View>
                <View style={styles.skeletonStatus} />
                <View style={styles.skeletonJam} />
              </View>
            ))}
          </View>
        </ScrollView>
      </View>
    );
  }

  if (!dinasDetail) {
    return (
      <View style={styles.container}>
        <StatusBar style="light" translucent backgroundColor="transparent" />
        <AppHeader title="Detail Laporan Dinas" showBack />
        <View style={styles.emptyContainer}>
          <Ionicons name="alert-circle-outline" size={60} color="#ccc" />
          <Text style={styles.emptyText}>Data dinas tidak ditemukan</Text>
        </View>
      </View>
    );
  }

  const dinasStatus = getDinasStatus();
  const dateRange = generateDateRange();

  return (
    <View style={styles.container}>
      <StatusBar style="light" translucent backgroundColor="transparent" />
      <AppHeader title="Detail Laporan Dinas" showBack />

      <ScrollView 
        showsVerticalScrollIndicator={false} 
        contentContainerStyle={styles.scrollContent}
        bounces={false}
        overScrollMode="never"
      >
        {/* Premium Header Section - Dinas Info */}
        <View style={styles.premiumHeader}>
          <View style={styles.headerTopRow}>
            <View style={styles.titleWrapper}>
              <Text style={styles.dinasTitle} numberOfLines={2}>{dinasDetail.namaKegiatan}</Text>
              <View style={styles.nipContainer}>
                <Ionicons name="document-text-outline" size={14} color="#B2DFDB" />
                <Text style={styles.nipText}>{dinasDetail.nomorSpt}</Text>
              </View>
            </View>
            <View style={styles.dinasIconContainer}>
              <Ionicons name="briefcase" size={28} color="#FFF" />
            </View>
          </View>
          
          {/* Periode & Status dalam Header */}
          <View style={styles.periodContainerHeader}>
            <Ionicons name="calendar-outline" size={16} color="#B2DFDB" />
            <Text style={styles.periodTextHeader}>
              {formatDateDisplay(dinasDetail.tanggal_mulai)} - {formatDateDisplay(dinasDetail.tanggal_selesai)}
            </Text>
          </View>
          
          <View style={styles.statusContainerHeader}>
            <View style={[styles.statusDot, { backgroundColor: dinasStatus.color }]} />
            <Text style={[styles.statusLabel, { color: '#FFF' }]}>
              {dinasStatus.status}
            </Text>
          </View>
          
          <View style={styles.lokasiContainerHeader}>
            <Ionicons name="location-outline" size={14} color="#B2DFDB" />
            <Text style={styles.lokasiTextHeader}>
              {dinasDetail.lokasi}
            </Text>
          </View>
        </View>

        {/* Statistik */}
        <View style={styles.statsContainer}>
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <View style={[styles.statIndicator, { backgroundColor: "#10B981" }]} />
              <Text style={styles.statLabel}>Hadir</Text>
              <Text style={styles.statValue}>{stats.hadir}</Text>
            </View>
            <View style={styles.statCard}>
              <View style={[styles.statIndicator, { backgroundColor: "#F59E0B" }]} />
              <Text style={styles.statLabel}>Terlambat</Text>
              <Text style={styles.statValue}>{stats.terlambat}</Text>
            </View>
            <View style={styles.statCard}>
              <View style={[styles.statIndicator, { backgroundColor: "#EF4444" }]} />
              <Text style={styles.statLabel}>Belum Absen</Text>
              <Text style={styles.statValue}>{stats.belumAbsen}</Text>
            </View>
          </View>
        </View>

        {/* Date Picker Horizontal */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Pilih Tanggal</Text>
          <View style={styles.activeIndicator} />
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.calendarContainer}
        >
          {dateRange.map((date, index) => {
            const isSelected =
              formatDateForAPI(date) === formatDateForAPI(selectedDate);
            const dayName = date.toLocaleDateString("id-ID", {
              weekday: "short",
            });
            const dayNum = date.getDate();
            const monthName = date.toLocaleDateString("id-ID", {
              month: "short",
            });
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const dateOnly = new Date(date);
            dateOnly.setHours(0, 0, 0, 0);
            const isToday = dateOnly.getTime() === today.getTime();

            return (
              <TouchableOpacity
                key={index}
                style={[
                  styles.dateCard,
                  isSelected && styles.dateCardSelected,
                  isToday && !isSelected && styles.dateCardToday,
                ]}
                onPress={() => {
                  setSelectedDate(date);
                }}
              >
                <Text
                  style={[
                    styles.dateDay,
                    isSelected && styles.textWhite,
                  ]}
                >
                  {dayName}
                </Text>
                <Text
                  style={[
                    styles.dateNum,
                    isSelected && styles.textWhite,
                  ]}
                >
                  {dayNum}
                </Text>
                <Text
                  style={[
                    styles.dateMonth,
                    isSelected && styles.textWhite,
                  ]}
                >
                  {monthName}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* List Pegawai */}
        <View style={styles.listContainer}>
          {filteredPegawai.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="people-outline" size={60} color="#ccc" />
              <Text style={styles.emptyText}>
                Tidak ada data pegawai ditemukan
              </Text>
            </View>
          ) : (
            filteredPegawai.map((item, index) => (
              <View key={index}>{renderPegawaiCard({ item })}</View>
            ))
          )}
        </View>
      </ScrollView>

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
  container: { flex: 1, backgroundColor: "#004643" },
  containerLoading: { flex: 1, backgroundColor: "#004643" },
  scrollContent: { paddingBottom: 40, backgroundColor: "#F4F7F7", flexGrow: 1 },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: { marginTop: 10, color: "#666", fontSize: 14 },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
  },
  emptyText: { marginTop: 10, color: "#999", fontSize: 14, textAlign: "center" },
  
  // Premium Header Style
  premiumHeader: {
    backgroundColor: "#004643",
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 30,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    marginBottom: 15,
    ...Platform.select({
      ios: { shadowColor: "#000", shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.15, shadowRadius: 12 },
      android: { elevation: 8 },
    }),
  },
  skeletonHeader: {
    backgroundColor: "#004643",
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 30,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    marginBottom: 15,
  },
  headerTopRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  titleWrapper: { flex: 1, marginRight: 15 },
  dinasTitle: { fontSize: 22, fontWeight: "800", color: "#FFF", letterSpacing: -0.5, lineHeight: 28 },
  nipContainer: { flexDirection: "row", alignItems: "center", marginTop: 10 },
  nipText: { fontSize: 13, color: "#B2DFDB", fontWeight: "500", marginLeft: 6 },
  
  dinasIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.3)",
  },
  
  periodContainerHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 15,
    backgroundColor: "rgba(255,255,255,0.1)",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    alignSelf: "flex-start",
  },
  periodTextHeader: {
    fontSize: 13,
    color: "#B2DFDB",
    fontWeight: "600",
    marginLeft: 8,
  },
  
  statusContainerHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 10,
  },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusLabel: { fontSize: 13, fontWeight: "600", marginLeft: 6 },
  
  lokasiContainerHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginTop: 10,
    backgroundColor: "rgba(255,255,255,0.1)",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  lokasiTextHeader: { 
    fontSize: 13, 
    color: "#B2DFDB", 
    fontWeight: "500", 
    marginLeft: 6, 
    flex: 1,
    lineHeight: 18,
  },

  // Tab
  tabContainer: {
    flexDirection: "row",
    padding: 16,
    gap: 12,
    backgroundColor: "#F4F7F7",
  },
  tabButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: "#F5F5F5",
    gap: 8,
  },
  tabButtonActive: { backgroundColor: "#E6F0EF" },
  tabText: { fontSize: 14, color: "#999", fontWeight: "500" },
  tabTextActive: { color: "#004643", fontWeight: "600" },

  // Section Header
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 20,
    marginBottom: 16,
    paddingHorizontal: 16,
    position: "relative",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0F172A",
  },
  activeIndicator: {
    width: 40,
    height: 4,
    backgroundColor: "#004643",
    borderRadius: 2,
    position: "absolute",
    bottom: -6,
    left: 16,
  },

  // Calendar / Date Picker
  calendarContainer: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  dateCard: {
    width: 68,
    height: 95,
    backgroundColor: "#FFF",
    borderRadius: 12,
    marginRight: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  dateCardSelected: {
    backgroundColor: "#004643",
    borderColor: "#004643",
  },
  dateCardToday: {
    borderStyle: "dashed",
    borderColor: "#004643",
    borderWidth: 1.5,
  },
  dateDay: {
    fontSize: 10,
    fontWeight: "700",
    color: "#94A3B8",
    marginBottom: 4,
  },
  dateNum: {
    fontSize: 24,
    fontWeight: "800",
    color: "#0F172A",
  },
  dateMonth: {
    fontSize: 10,
    fontWeight: "700",
    color: "#64748B",
  },
  textWhite: {
    color: "#FFF",
  },

  // Stats
  statsContainer: {
    marginHorizontal: 16,
    marginTop: 20,
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

  // Search
  searchContainer: { paddingHorizontal: 16, paddingBottom: 12 },
  searchInputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F5F5F5",
    borderRadius: 12,
    paddingHorizontal: 12,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: "#333",
    paddingVertical: 12,
  },

  // Pegawai List
  listContainer: { paddingHorizontal: 16, paddingBottom: 20 },
  pegawaiListContainer: { paddingHorizontal: 16, paddingBottom: 20 },
  pegawaiCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E8F0EF",
    shadowColor: "#004643",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  pegawaiHeader: { flexDirection: "row", marginBottom: 12 },
  pegawaiAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#004643",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  pegawaiAvatarText: { color: "#fff", fontWeight: "700", fontSize: 18 },
  pegawaiInfo: { flex: 1 },
  pegawaiName: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1E293B",
    marginBottom: 4,
  },
  nipContainer: { flexDirection: "row", alignItems: "center", gap: 4 },
  pegawaiNip: { fontSize: 11, color: "#64748B", fontWeight: "500" },
  statusRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  statusText: { fontSize: 11, fontWeight: "700" },
  lokasiSesuai: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  lokasiText: { fontSize: 11, color: "#4CAF50", fontWeight: "600" },
  jamRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 12,
  },
  jamText: { fontSize: 12, color: "#64748B" },
  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 4,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#F0F0F0",
  },
  detailLink: { fontSize: 13, color: "#004643", fontWeight: "600" },
  emptyState: {
    alignItems: "center",
    paddingVertical: 40,
  },
  
  // Skeleton Styles
  skeletonTitle: {
    width: "80%",
    height: 22,
    backgroundColor: "rgba(255,255,255,0.3)",
    borderRadius: 4,
    marginBottom: 10,
  },
  skeletonNipIcon: {
    width: 14,
    height: 14,
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 2,
  },
  skeletonNipText: {
    width: "60%",
    height: 13,
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 4,
    marginLeft: 6,
  },
  skeletonAvatarHeader: {
    width: 56,
    height: 56,
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 28,
  },
  skeletonPeriodHeader: {
    width: "50%",
    height: 32,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 12,
    marginTop: 15,
  },
  skeletonAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#E0E0E0",
    marginRight: 12,
  },
  skeletonName: {
    width: "70%",
    height: 15,
    backgroundColor: "#E0E0E0",
    borderRadius: 4,
    marginBottom: 6,
  },
  skeletonNip: {
    width: "50%",
    height: 11,
    backgroundColor: "#F0F0F0",
    borderRadius: 4,
  },
  skeletonStatus: {
    width: "60%",
    height: 28,
    backgroundColor: "#F0F0F0",
    borderRadius: 8,
    marginBottom: 8,
  },
  skeletonJam: {
    width: "40%",
    height: 14,
    backgroundColor: "#F0F0F0",
    borderRadius: 4,
  },
});
