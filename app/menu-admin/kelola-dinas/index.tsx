import { Ionicons } from "@expo/vector-icons";
import * as NavigationBar from "expo-navigation-bar";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useRef, useState } from "react";
import {
    Alert,
    Animated,
    FlatList,
    Modal,
    PanResponder,
    Platform,
    RefreshControl,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from "react-native";
import { AppHeader, CustomAlert } from "../../../components";
import { KelolaDinasAPI } from "../../../constants/config";
import { useCustomAlert } from "../../../hooks/useCustomAlert";

interface DinasAktif {
  id: number;
  namaKegiatan: string;
  nomorSpt: string;
  lokasi: string;
  jam_mulai?: string;
  jam_selesai?: string;
  jamKerja: string;
  radius: number;
  tanggal_mulai: string;
  tanggal_selesai: string;
  pegawai: Array<{
    nama: string;
    status: "hadir" | "terlambat" | "belum_absen";
    jamAbsen?: string;
  }>;
}

export default function KelolaDinasScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const alert = useCustomAlert();
  const [selectedFilter, setSelectedFilter] = useState("semua");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [dinasAktif, setDinasAktif] = useState<DinasAktif[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedDinas, setSelectedDinas] = useState<DinasAktif | null>(null);
  const [showActionModal, setShowActionModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const translateY = useRef(new Animated.Value(300)).current;
  const filterTranslateY = useRef(new Animated.Value(300)).current;
  const deleteModalScale = useRef(new Animated.Value(0)).current;
  const itemsPerPage = 10;

  const openFilterModal = () => {
    setShowFilterModal(true);
    if (Platform.OS === "android") {
      NavigationBar.setVisibilityAsync("hidden");
    }
    Animated.timing(filterTranslateY, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  const closeFilterModal = () => {
    Animated.timing(filterTranslateY, {
      toValue: 300,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setShowFilterModal(false);
      if (Platform.OS === "android") {
        NavigationBar.setVisibilityAsync("visible");
      }
    });
  };

  const filterPanResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: (_, gestureState) => {
      return gestureState.dy > 5;
    },
    onPanResponderMove: (_, gestureState) => {
      if (gestureState.dy > 0) {
        filterTranslateY.setValue(gestureState.dy);
      }
    },
    onPanResponderRelease: (_, gestureState) => {
      if (gestureState.dy > 100) {
        closeFilterModal();
      } else {
        Animated.spring(filterTranslateY, {
          toValue: 0,
          useNativeDriver: true,
        }).start();
      }
    },
  });

  const openModal = () => {
    setShowActionModal(true);
    if (Platform.OS === "android") {
      NavigationBar.setVisibilityAsync("hidden");
    }
    Animated.timing(translateY, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  const closeModal = () => {
    Animated.timing(translateY, {
      toValue: 300,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setShowActionModal(false);
      if (Platform.OS === "android") {
        NavigationBar.setVisibilityAsync("visible");
      }
    });
  };

  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: (_, gestureState) => {
      return gestureState.dy > 5;
    },
    onPanResponderMove: (_, gestureState) => {
      if (gestureState.dy > 0) {
        translateY.setValue(gestureState.dy);
      }
    },
    onPanResponderRelease: (_, gestureState) => {
      if (gestureState.dy > 100) {
        closeModal();
      } else {
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: true,
        }).start();
      }
    },
  });

  useEffect(() => {
    fetchDinasAktif();
  }, [selectedFilter]);

  // Listen for refresh parameter
  useEffect(() => {
    if (params.refresh) {
      fetchDinasAktif();
    }
  }, [params.refresh]);

  // Refresh when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      fetchDinasAktif();
    }, [])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchDinasAktif();
    setRefreshing(false);
  }, [selectedFilter]);

  const fetchDinasAktif = async () => {
    try {
      setLoading(true);
      console.log("Fetching dinas aktif data with filter:", selectedFilter);
      const statusParam =
        selectedFilter === "semua" ? undefined : selectedFilter;
      const response = await KelolaDinasAPI.getDinasAktif(statusParam);
      console.log("Dinas aktif API response:", response);

      if (response && response.success && Array.isArray(response.data)) {
        console.log("Setting dinas data:", response.data.length, "items");
        setDinasAktif(response.data);
      } else {
        console.log("No valid data received, setting empty array");
        setDinasAktif([]);
      }
    } catch (error) {
      console.error("Error fetching dinas aktif:", error);
      setDinasAktif([]);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "hadir":
        return "#4CAF50";
      case "terlambat":
        return "#FF9800";
      case "belum_absen":
        return "#F44336";
      default:
        return "#666";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "hadir":
        return "Hadir";
      case "terlambat":
        return "Terlambat";
      case "belum_absen":
        return "Belum Absen";
      default:
        return status;
    }
  };

  const getDinasStatus = (tanggalMulai: string, tanggalSelesai: string) => {
    const today = new Date();
    const mulai = new Date(tanggalMulai);
    const selesai = new Date(tanggalSelesai);

    today.setHours(0, 0, 0, 0);
    mulai.setHours(0, 0, 0, 0);
    selesai.setHours(23, 59, 59, 999);

    if (today < mulai) {
      return { status: "Akan Datang", color: "#FF9800" };
    } else if (today >= mulai && today <= selesai) {
      return { status: "Sedang Berlangsung", color: "#4CAF50" };
    } else {
      return { status: "Selesai", color: "#2196F3" };
    }
  };

  const getFilteredData = () => {
    let filtered = dinasAktif;

    if (searchQuery) {
      filtered = filtered.filter(
        (item) =>
          item.namaKegiatan.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.nomorSpt.toLowerCase().includes(searchQuery.toLowerCase()),
      );
    }

    // Filter berdasarkan status dinas
    if (selectedFilter !== "semua") {
      filtered = filtered.filter((item) => {
        const dinasStatusInfo = getDinasStatus(
          item.tanggal_mulai,
          item.tanggal_selesai,
        );
        const status = dinasStatusInfo.status;

        switch (selectedFilter) {
          case "berlangsung":
            return status === "Sedang Berlangsung";
          case "selesai":
            return status === "Selesai";
          case "akan_datang":
            return status === "Akan Datang";
          default:
            return true;
        }
      });
    }

    return filtered;
  };

  const filteredData = getFilteredData();
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentData = filteredData.slice(startIndex, startIndex + itemsPerPage);

  const deleteDinas = async (id: number) => {
    setShowDeleteModal(false);
    try {
      const result = await KelolaDinasAPI.deleteDinas(id);
      if (result.success) {
        alert.showAlert({ 
          type: 'success', 
          message: 'Data dinas berhasil dihapus',
          onConfirm: () => fetchDinasAktif()
        });
      } else {
        alert.showAlert({ type: 'error', message: result.message || 'Gagal menghapus data dinas' });
      }
    } catch (error) {
      console.error("Delete error:", error);
      alert.showAlert({ type: 'error', message: 'Tidak dapat terhubung ke server' });
    }
  };

  const renderDinasCard = ({ item }: { item: DinasAktif }) => {
    const info = getDinasStatus(item.tanggal_mulai, item.tanggal_selesai);
    const totalPegawai = item.pegawai?.length || 0;
    
    const canEdit = () => {
      if (info.status === "Akan Datang") return true;
      if (info.status === "Berlangsung") {
        const start = new Date(item.tanggal_mulai + " " + (item.jam_mulai || "08:00:00"));
        return (new Date().getTime() - start.getTime()) / 3600000 <= 1;
      }
      return false;
    };

    return (
      <TouchableOpacity 
        style={styles.dinasCard} 
        activeOpacity={0.9}
        onPress={() => router.push(`/menu-admin/kelola-dinas/detail-dinas/${item.id}` as any)}
      >
        <View style={[styles.statusAccent, { backgroundColor: info.color }]} />
        <View style={styles.cardMainContent}>
          <View style={styles.cardHeader}>
            <View style={styles.titleContainer}>
              <Text style={styles.kegiatanName} numberOfLines={1}>{item.namaKegiatan}</Text>
              <View style={styles.sptBadge}>
                <Text style={styles.sptNumber}>{item.nomorSpt}</Text>
              </View>
            </View>
            <View style={styles.headerRight}>
              <View style={[styles.statusTag, { backgroundColor: info.color + '15' }]}>
                <View style={[styles.statusDot, { backgroundColor: info.color }]} />
                <Text style={[styles.statusTagText, { color: info.color }]}>{info.status}</Text>
              </View>
              {canEdit() && (
                <TouchableOpacity 
                  style={styles.moreBtn} 
                  onPress={(e) => { e.stopPropagation(); setSelectedDinas(item); openModal(); }}
                >
                  <Ionicons name="ellipsis-horizontal" size={20} color="#94A3B8" />
                </TouchableOpacity>
              )}
            </View>
          </View>

          <View style={styles.cardDivider} />

          <View style={styles.infoGrid}>
            <View style={styles.infoItem}>
              <View style={styles.iconCircle}><Ionicons name="location" size={14} color="#004643" /></View>
              <Text style={styles.infoText} numberOfLines={1}>{item.lokasi}</Text>
            </View>
            <View style={styles.infoItem}>
              <View style={styles.iconCircle}><Ionicons name="calendar" size={14} color="#004643" /></View>
              <Text style={styles.infoText}>
                {new Date(item.tanggal_mulai).toLocaleDateString("id-ID", { day: "numeric", month: "short" })} - {new Date(item.tanggal_selesai).toLocaleDateString("id-ID", { day: "numeric", month: "short" })}
              </Text>
            </View>
          </View>

          <View style={styles.cardFooter}>
            <View style={styles.attendeesContainer}>
              <Ionicons name="people-circle" size={20} color="#64748B" />
              <Text style={styles.attendeesText}><Text style={{fontWeight: '700', color: '#1E293B'}}>{totalPegawai}</Text> Pegawai</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#CBD5E1" />
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" translucent backgroundColor="transparent" />
      <AppHeader title="Kelola Dinas" showBack={true} showAddButton={true} onAddPress={() => router.push("/menu-admin/kelola-dinas/tambah-dinas" as any)} fallbackRoute="/admin/dashboard-admin" />
      
      <View style={styles.contentWrapper}>
        <View style={styles.searchSection}>
          <View style={styles.searchBar}>
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
          <TouchableOpacity style={styles.filterBtn} onPress={openFilterModal}>
            <Ionicons name="options-outline" size={22} color="#004643" />
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.listPadding}>
            {[1, 2, 3].map((item) => (
              <View key={item} style={styles.dinasCard}>
                <View style={styles.skeletonStatusAccent} />
                <View style={styles.cardMainContent}>
                  <View style={styles.cardHeader}>
                    <View style={styles.titleContainer}>
                      <View style={styles.skeletonKegiatanName} />
                      <View style={styles.skeletonSptBadge}>
                        <View style={styles.skeletonSptNumber} />
                      </View>
                    </View>
                    <View style={styles.headerRight}>
                      <View style={styles.skeletonStatusTag} />
                      <View style={styles.skeletonMoreBtn} />
                    </View>
                  </View>

                  <View style={styles.cardDivider} />

                  <View style={styles.infoGrid}>
                    <View style={styles.infoItem}>
                      <View style={styles.skeletonIconCircle} />
                      <View style={[styles.skeletonInfoText, { width: '60%' }]} />
                    </View>
                    <View style={styles.infoItem}>
                      <View style={styles.skeletonIconCircle} />
                      <View style={[styles.skeletonInfoText, { width: '45%' }]} />
                    </View>
                  </View>

                  <View style={styles.cardFooter}>
                    <View style={styles.attendeesContainer}>
                      <View style={styles.skeletonIconCircle} />
                      <View style={[styles.skeletonInfoText, { width: '30%' }]} />
                    </View>
                    <View style={styles.skeletonChevron} />
                  </View>
                </View>
              </View>
            ))}
          </View>
        ) : (
        <FlatList
          data={currentData}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderDinasCard}
          contentContainerStyle={styles.listPadding}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#004643"]} />}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="document-text-outline" size={80} color="#E2E8F0" />
              <Text style={styles.emptyText}>Tidak ada data dinas ditemukan</Text>
            </View>
          }
        />
        )}
      </View>

      {/* Filter Modal - Bottom Sheet */}
      <Modal
        visible={showFilterModal}
        transparent={true}
        animationType="none"
        statusBarTranslucent={true}
        onRequestClose={closeFilterModal}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={closeFilterModal}
          />
          <Animated.View
            style={[
              styles.filterBottomSheetModal,
              {
                transform: [{ translateY: filterTranslateY }],
              },
            ]}
          >
            <View
              {...filterPanResponder.panHandlers}
              style={styles.handleContainer}
            >
              <View style={styles.handleBar} />
            </View>

            <View style={styles.bottomSheetContent}>
              <Text style={styles.modalTitle}>Pilih Status</Text>

              <View style={styles.filterList}>
                {[
                  { value: "semua", label: "Semua Status", icon: "apps" },
                  { value: "berlangsung", label: "Sedang Berlangsung", icon: "play-circle" },
                  { value: "selesai", label: "Selesai", icon: "checkmark-circle" },
                  { value: "akan_datang", label: "Akan Datang", icon: "time" },
                ].map((option, index, array) => (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.filterOption,
                      index === array.length - 1 && styles.filterOptionLast,
                    ]}
                    onPress={() => {
                      setSelectedFilter(option.value);
                      closeFilterModal();
                    }}
                  >
                    <View style={styles.filterOptionLeft}>
                      <Ionicons
                        name={option.icon as any}
                        size={20}
                        color={selectedFilter === option.value ? "#004643" : "#999"}
                      />
                      <Text
                        style={[
                          styles.filterOptionText,
                          selectedFilter === option.value && styles.filterOptionTextActive,
                        ]}
                      >
                        {option.label}
                      </Text>
                    </View>
                    {selectedFilter === option.value && (
                      <View style={styles.filterCheck}>
                        <Ionicons name="checkmark" size={18} color="#004643" />
                      </View>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </Animated.View>
        </View>
      </Modal>
      <Modal
        visible={showActionModal}
        transparent={true}
        animationType="none"
        statusBarTranslucent={true}
        onRequestClose={() => closeModal()}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={() => closeModal()}
          />
          <Animated.View
            style={[
              styles.bottomSheetModal,
              {
                transform: [{ translateY }],
              },
            ]}
          >
            <View {...panResponder.panHandlers} style={styles.handleContainer}>
              <View style={styles.handleBar} />
            </View>

            <View style={styles.bottomSheetHeader}>
              <View style={styles.actionCard}>
                <View style={styles.bottomSheetActions}>
                  <TouchableOpacity
                    style={styles.bottomSheetItem}
                    onPress={() => {
                      closeModal();
                      router.push(
                        `/menu-admin/kelola-dinas/edit-dinas/${selectedDinas?.id}` as any,
                      );
                    }}
                  >
                    <Ionicons name="create-outline" size={20} color="#FF9800" />
                    <Text style={styles.bottomSheetItemText}>Edit</Text>
                  </TouchableOpacity>

                  <View style={styles.actionDivider} />

                  <TouchableOpacity
                    style={styles.bottomSheetItem}
                    onPress={() => {
                      closeModal();
                      setTimeout(() => setShowDeleteModal(true), 300);
                    }}
                  >
                    <Ionicons name="trash-outline" size={20} color="#F44336" />
                    <Text
                      style={[styles.bottomSheetItemText, { color: "#F44336" }]}
                    >
                      Hapus
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Animated.View>
        </View>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        visible={showDeleteModal}
        transparent={true}
        animationType="fade"
        statusBarTranslucent={true}
        onRequestClose={() => setShowDeleteModal(false)}
      >
        <View style={styles.deleteModalOverlay}>
          <View style={styles.deleteModalContainer}>
            <View style={styles.deleteIconContainer}>
              <Ionicons name="trash-outline" size={48} color="#fff" />
            </View>

            <Text style={styles.deleteModalMessage}>
              Hapus data dinas?
            </Text>

            <View style={styles.deleteModalButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowDeleteModal(false)}
              >
                <Text style={styles.cancelButtonText}>Batal</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.deleteButton}
                onPress={() => {
                  deleteDinas(selectedDinas?.id || 0);
                }}
              >
                <Text style={styles.deleteButtonText}>Hapus</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      
      <CustomAlert
        visible={alert.visible}
        type={alert.config.type}
        title={alert.config.title}
        message={alert.config.message}
        onClose={alert.hideAlert}
        onConfirm={alert.handleConfirm}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FAFBFC" },
  contentWrapper: { flex: 1 },
  searchSection: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
    backgroundColor: '#FAFBFC',
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
  },
  searchBar: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 14,
    paddingHorizontal: 16,
    height: 50,
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
    fontWeight: "400",
  },
  filterBtn: {
    width: 50,
    height: 50,
    backgroundColor: "#FFF",
    borderRadius: 15,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  listPadding: { paddingHorizontal: 20, paddingBottom: 30 },

  statusSummary: { marginBottom: 12 },
  statusText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
  },
  progressBar: {
    height: 6,
    backgroundColor: "#E0E0E0",
    borderRadius: 3,
  },
  progressFill: {
    height: 6,
    backgroundColor: "#4CAF50",
    borderRadius: 3,
  },
  pegawaiList: { marginBottom: 12 },
  pegawaiItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  pegawaiInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  pegawaiName: {
    fontSize: 13,
    color: "#333",
    fontWeight: "500",
  },
  jamAbsen: {
    fontSize: 11,
    color: "#666",
    marginLeft: 6,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: "bold",
  },
  noPegawaiText: {
    fontSize: 14,
    color: "#999",
    fontStyle: "italic",
    textAlign: "center",
    paddingVertical: 10,
  },
  emptyState: { alignItems: "center", marginTop: 100 },
  emptyText: { marginTop: 15, color: "#94A3B8", fontSize: 14 },
  paginationContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 24,
    marginTop: 8,
    backgroundColor: "#FAFBFC",
  },
  pageBtn: {
    padding: 10,
    borderRadius: 12,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#E8F0EF",
    shadowColor: "#004643",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  pageBtnDisabled: {
    backgroundColor: "#F5F7F6",
    borderColor: "#E0E0E0",
  },
  pageNumbers: {
    flexDirection: "row",
    marginHorizontal: 16,
  },
  pageNumber: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginHorizontal: 3,
    borderRadius: 12,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#E8F0EF",
    shadowColor: "#004643",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  pageNumberActive: {
    backgroundColor: "#004643",
    borderColor: "#004643",
  },
  pageNumberText: {
    fontSize: 14,
    color: "#5A6C7D",
    fontWeight: "500",
  },
  pageNumberTextActive: {
    color: "#fff",
    fontWeight: "600",
  },

  filterBottomSheetModal: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: Platform.OS === "ios" ? 34 : 20,
    paddingTop: 8,
  },
  bottomSheetContent: {
    paddingHorizontal: 0,
    paddingBottom: 16,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1a1a1a",
    marginBottom: 16,
    paddingHorizontal: 20,
  },
  filterList: {
    backgroundColor: "#fff",
  },
  filterOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: 20,
    backgroundColor: "#fff",
    borderBottomWidth: 0.5,
    borderBottomColor: "#E5E5E5",
  },
  filterOptionLast: {
    borderBottomWidth: 0,
  },
  filterOptionLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  filterOptionText: {
    fontSize: 16,
    color: "#333",
    fontWeight: "400",
  },
  filterOptionTextActive: {
    color: "#004643",
    fontWeight: "500",
  },
  filterCheck: {
    width: 20,
    height: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  summaryCard: {
    backgroundColor: "#fff",
    marginHorizontal: 15,
    marginBottom: 8,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  summaryRow: {
    alignItems: "flex-start",
    marginBottom: 12,
  },

  dinasCard: {
    backgroundColor: "#FFF",
    borderRadius: 20,
    marginBottom: 16,
    flexDirection: "row",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  statusAccent: { width: 6, height: "100%" },
  cardMainContent: { flex: 1, padding: 16 },
  titleContainer: { flex: 1, marginRight: 8 },
  sptBadge: {
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: "flex-start",
  },
  headerRight: { alignItems: "flex-end" },
  statusTag: { flexDirection: "row", alignItems: "center", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, marginBottom: 8 },
  statusDot: { width: 6, height: 6, borderRadius: 3, marginRight: 6 },
  statusTagText: { fontSize: 10, fontWeight: "800", textTransform: "uppercase" },
  cardDivider: { height: 1, backgroundColor: "#F1F5F9", marginBottom: 12 },
  infoGrid: { gap: 8, marginBottom: 14 },
  infoItem: { flexDirection: "row", alignItems: "center", gap: 10 },
  iconCircle: { width: 28, height: 28, borderRadius: 14, backgroundColor: "#F0FDF4", justifyContent: "center", alignItems: "center" },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    marginHorizontal: -16,
    marginBottom: -16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginTop: 4,
  },
  attendeesContainer: { flexDirection: "row", alignItems: "center", gap: 6 },
  attendeesText: { fontSize: 12, color: "#64748B" },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 14,
  },
  cardTitle: { flex: 1, marginRight: 12 },
  cardHeaderRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  dinasStatusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
  },
  dinasStatusText: {
    fontSize: 9,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  kegiatanName: { fontSize: 16, fontWeight: "700", color: "#1E293B", marginBottom: 6 },
  sptNumber: { fontSize: 11, color: "#64748B", fontWeight: "600", letterSpacing: 0.5 },
  cardInfo: { marginBottom: 8 },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    gap: 10,
  },
  infoText: { fontSize: 13, color: "#475569", flex: 1 },
  dinasInfoSection: {
    backgroundColor: "#F8F9FA",
    padding: 10,
    borderRadius: 8,
    marginTop: 8,
  },
  dinasInfoText: {
    fontSize: 12,
    color: "#666",
    textAlign: "center",
    fontStyle: "italic",
  },
  moreBtn: { padding: 4 },
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    paddingTop: Platform.OS === "android" ? 0 : 50,
  },
  modalBackdrop: {
    flex: 1,
  },
  bottomSheetModal: {
    backgroundColor: "#F8F9FA",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: Platform.OS === "ios" ? 34 : 20,
    paddingTop: 8,
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
  bottomSheetHeader: {
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  actionCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    overflow: "hidden",
  },
  bottomSheetActions: {
    backgroundColor: "transparent",
  },
  bottomSheetItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 18,
    backgroundColor: "transparent",
    gap: 15,
  },
  actionDivider: {
    height: 1,
    backgroundColor: "#F0F0F0",
    marginHorizontal: 20,
  },
  bottomSheetItemText: {
    fontSize: 16,
    color: "#333",
    fontWeight: "500",
  },
  deleteModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 30,
  },
  deleteModalContainer: {
    backgroundColor: "#004643",
    borderRadius: 20,
    padding: 32,
    width: "100%",
    maxWidth: 300,
    alignItems: "center",
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  deleteIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  deleteModalMessage: {
    fontSize: 18,
    color: "#fff",
    textAlign: "center",
    marginBottom: 28,
    fontWeight: "600",
  },
  deleteModalButtons: {
    flexDirection: "row",
    gap: 12,
    width: "100%",
  },
  cancelButton: {
    flex: 1,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.3)",
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#fff",
  },
  deleteButton: {
    flex: 1,
    backgroundColor: "#F44336",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  deleteButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#fff",
  },

  /* Skeleton Styles */
  skeletonStatusAccent: { width: 6, height: "100%", backgroundColor: "#E2E8F0" },
  skeletonKegiatanName: { width: '75%', height: 16, backgroundColor: '#E2E8F0', borderRadius: 8, marginBottom: 6 },
  skeletonSptBadge: { backgroundColor: "#F1F5F9", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, alignSelf: "flex-start" },
  skeletonSptNumber: { width: 60, height: 11, backgroundColor: '#F1F5F9', borderRadius: 6 },
  skeletonStatusTag: { width: 80, height: 24, backgroundColor: '#E2E8F0', borderRadius: 20, marginBottom: 8 },
  skeletonMoreBtn: { width: 20, height: 20, backgroundColor: '#E2E8F0', borderRadius: 4 },
  skeletonIconCircle: { width: 28, height: 28, borderRadius: 14, backgroundColor: "#F1F5F9" },
  skeletonInfoText: { height: 13, backgroundColor: '#F1F5F9', borderRadius: 6 },
  skeletonChevron: { width: 18, height: 18, backgroundColor: '#F1F5F9', borderRadius: 4 },
});

