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
      return { status: "Belum Dimulai", color: "#FF9800" };
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
          case "belum_dimulai":
            return status === "Belum Dimulai";
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

  const deleteDinas = async (id: number, nama: string) => {
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
    const pegawaiArray = item.pegawai || [];
    const totalPegawai = pegawaiArray.length;
    const dinasStatusInfo = getDinasStatus(
      item.tanggal_mulai,
      item.tanggal_selesai,
    );
    const isBelumDimulai = dinasStatusInfo.status === "Belum Dimulai";

    // Cek apakah dinas berlangsung dan masih dalam 1 jam pertama
    const canEditBerlangsung = () => {
      if (dinasStatusInfo.status !== "Sedang Berlangsung") return false;

      const now = new Date();
      const dinasStart = new Date(
        item.tanggal_mulai + " " + (item.jam_mulai || "08:00:00"),
      );
      const hoursDiff =
        (now.getTime() - dinasStart.getTime()) / (1000 * 60 * 60);

      return hoursDiff <= 1; // Batas 1 jam
    };

    const showActionButton = isBelumDimulai || canEditBerlangsung();

    return (
      <TouchableOpacity
        style={styles.dinasCard}
        onPress={() =>
          router.push(`/menu-admin/kelola-dinas/detail-dinas/${item.id}` as any)
        }
        activeOpacity={0.7}
      >
        <View style={styles.cardHeader}>
          <View style={styles.cardTitle}>
            <Text style={styles.kegiatanName}>{item.namaKegiatan}</Text>
            <Text style={styles.sptNumber}>{item.nomorSpt}</Text>
          </View>
          <View style={styles.cardHeaderRight}>
            <View
              style={[
                styles.dinasStatusBadge,
                { backgroundColor: dinasStatusInfo.color + "20" },
              ]}
            >
              <Text
                style={[
                  styles.dinasStatusText,
                  { color: dinasStatusInfo.color },
                ]}
              >
                {dinasStatusInfo.status === "Sedang Berlangsung"
                  ? "Berlangsung"
                  : dinasStatusInfo.status === "Belum Dimulai"
                    ? "Belum Mulai"
                    : "Selesai"}
              </Text>
            </View>
            {showActionButton && (
              <TouchableOpacity
                style={styles.moreBtn}
                onPress={(e) => {
                  e.stopPropagation();
                  setSelectedDinas(item);
                  openModal();
                }}
              >
                <Ionicons name="ellipsis-vertical" size={18} color="#666" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        <View style={styles.cardInfo}>
          <View style={styles.infoRow}>
            <View style={styles.infoIconBox}>
              <Ionicons name="location-outline" size={16} color="#00695C" />
            </View>
            <Text style={styles.infoText}>{item.lokasi}</Text>
          </View>
          <View style={styles.infoRow}>
            <View style={styles.infoIconBox}>
              <Ionicons name="time-outline" size={16} color="#00695C" />
            </View>
            <Text style={styles.infoText}>
              {item.jam_mulai && item.jam_selesai
                ? `${item.jam_mulai} - ${item.jam_selesai}`
                : "Perjalanan Lokal"}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <View style={styles.infoIconBox}>
              <Ionicons name="calendar-outline" size={16} color="#00695C" />
            </View>
            <Text style={styles.infoText}>
              {new Date(item.tanggal_mulai).toLocaleDateString("id-ID", {
                day: "numeric",
                month: "short",
              })}{" "}
              -
              {new Date(item.tanggal_selesai).toLocaleDateString("id-ID", {
                day: "numeric",
                month: "short",
              })}
            </Text>
          </View>
        </View>

        <View style={styles.cardFooter}>
          <View style={styles.footerLeft}>
            <Ionicons name="people-circle" size={20} color="#64748B" />
            <Text style={styles.footerText}>
              <Text style={styles.footerBold}>{totalPegawai}</Text> Pegawai Bertugas
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#CBD5E1" />
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

      {/* HEADER */}
      <AppHeader
        title="Dinas"
        showBack={true}
        showAddButton={true}
        onAddPress={() => router.push("/menu-admin/kelola-dinas/tambah-dinas" as any)}
      />

      <View style={styles.contentWrapper}>
        {/* Fixed Search and Date */}
        <View style={styles.fixedControls}>
          {/* Search Container with Filter Icon */}
          <View style={styles.searchContainer}>
            <View style={styles.searchInputWrapper}>
              <Ionicons name="search-outline" size={20} color="#666" />
              <TextInput
                style={styles.searchInput}
                placeholder="Cari dinas..."
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
            <TouchableOpacity
              style={styles.filterIconBtn}
              onPress={openFilterModal}
            >
              <Ionicons name="options" size={20} color="#004643" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Scrollable List */}
        {loading ? (
          /* ========================================
               SKELETON LOADING STATE - KELOLA DINAS
          ======================================== */
          <View style={styles.listContent}>
            {[1, 2, 3].map((item) => (
              <View key={item} style={styles.dinasCard}>
                {/* Skeleton Card Header */}
                <View style={styles.cardHeader}>
                  <View style={styles.cardTitle}>
                    <View style={styles.skeletonKegiatanName} />
                    <View style={styles.skeletonSptNumber} />
                  </View>
                  <View style={styles.cardHeaderRight}>
                    <View style={styles.skeletonStatusBadge} />
                    <View style={styles.skeletonMoreBtn} />
                  </View>
                </View>

                {/* Skeleton Card Info */}
                <View style={styles.cardInfo}>
                  <View style={styles.infoRow}>
                    <View style={styles.skeletonInfoIconBox} />
                    <View style={[styles.skeletonInfoText, { flex: 1 }]} />
                  </View>
                  <View style={styles.infoRow}>
                    <View style={styles.skeletonInfoIconBox} />
                    <View style={[styles.skeletonInfoText, { flex: 1 }]} />
                  </View>
                  <View style={styles.infoRow}>
                    <View style={styles.skeletonInfoIconBox} />
                    <View style={[styles.skeletonInfoText, { flex: 1 }]} />
                  </View>
                  <View style={styles.infoRow}>
                    <View style={styles.skeletonInfoIconBox} />
                    <View style={[styles.skeletonInfoText, { flex: 1 }]} />
                  </View>
                </View>
              </View>
            ))}
          </View>
        ) : (
          <FlatList
            style={styles.flatList}
            data={currentData}
            keyExtractor={(item) => item.id.toString()}
            renderItem={renderDinasCard}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={["#004643"]}
                tintColor="#004643"
              />
            }
            ListEmptyComponent={() => (
              <View style={styles.emptyState}>
                <Ionicons name="briefcase-outline" size={60} color="#ccc" />
                <Text style={styles.emptyText}>Tidak ada data dinas</Text>
              </View>
            )}
            ListFooterComponent={() => {
              if (totalPages <= 1) return null;
              return (
                <View style={styles.paginationContainer}>
                  <TouchableOpacity
                    style={[
                      styles.pageBtn,
                      currentPage === 1 && styles.pageBtnDisabled,
                    ]}
                    onPress={() => setCurrentPage(currentPage - 1)}
                    disabled={currentPage === 1}
                  >
                    <Ionicons
                      name="chevron-back"
                      size={16}
                      color={currentPage === 1 ? "#ccc" : "#004643"}
                    />
                  </TouchableOpacity>

                  <View style={styles.pageNumbers}>
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                      (page) => (
                        <TouchableOpacity
                          key={page}
                          style={[
                            styles.pageNumber,
                            currentPage === page && styles.pageNumberActive,
                          ]}
                          onPress={() => setCurrentPage(page)}
                        >
                          <Text
                            style={[
                              styles.pageNumberText,
                              currentPage === page && styles.pageNumberTextActive,
                            ]}
                          >
                            {page}
                          </Text>
                        </TouchableOpacity>
                      ),
                    )}
                  </View>

                  <TouchableOpacity
                    style={[
                      styles.pageBtn,
                      currentPage === totalPages && styles.pageBtnDisabled,
                    ]}
                    onPress={() => setCurrentPage(currentPage + 1)}
                    disabled={currentPage === totalPages}
                  >
                    <Ionicons
                      name="chevron-forward"
                      size={16}
                      color={currentPage === totalPages ? "#ccc" : "#004643"}
                    />
                  </TouchableOpacity>
                </View>
              );
            }}
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
                  { value: "belum_dimulai", label: "Belum Dimulai", icon: "time" },
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

      {/* Action Modal */}
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
            {/* Handle Bar with Pan Gesture */}
            <View {...panResponder.panHandlers} style={styles.handleContainer}>
              <View style={styles.handleBar} />
            </View>

            {/* Header */}
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
                  deleteDinas(
                    selectedDinas?.id || 0,
                    selectedDinas?.namaKegiatan || "",
                  );
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
        confirmText={alert.config.confirmText}
        cancelText={alert.config.cancelText}
        autoClose={alert.config.type === 'success'}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  contentWrapper: {
    flex: 1,
    backgroundColor: "#fff",
  },
  fixedControls: {
    paddingTop: 8,
    paddingBottom: 8,
    backgroundColor: "#fff",
  },
  flatList: {
    flex: 1,
  },

  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
    backgroundColor: "#fff",
    gap: 10,
  },
  searchInputWrapper: {
    flex: 1,
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
  filterIconBtn: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: "#333",
    paddingVertical: 14,
    fontWeight: "400",
  },
  listContent: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 20,
  },

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
  emptyState: {
    alignItems: "center",
    paddingVertical: 40,
    paddingTop: 100,
  },
  emptyText: {
    fontSize: 14,
    color: "#999",
    marginTop: 10,
  },
  paginationContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 20,
    marginTop: 10,
  },
  pageBtn: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: "#F5F5F5",
  },
  pageBtnDisabled: {
    backgroundColor: "#F0F0F0",
  },
  pageNumbers: {
    flexDirection: "row",
    marginHorizontal: 15,
  },
  pageNumber: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginHorizontal: 2,
    borderRadius: 8,
    backgroundColor: "#F5F5F5",
  },
  pageNumberActive: {
    backgroundColor: "#004643",
  },
  pageNumberText: {
    fontSize: 14,
    color: "#666",
    fontWeight: "500",
  },
  pageNumberTextActive: {
    color: "#fff",
    fontWeight: "bold",
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
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    marginHorizontal: 2,
    borderWidth: 1,
    borderColor: '#F0F3F3',
    shadowColor: '#004643',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 10,
  },
  cardTitle: { flex: 1, marginRight: 10 },
  cardHeaderRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  dinasStatusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  dinasStatusText: {
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  kegiatanName: { fontSize: 16, fontWeight: "700", color: "#1E293B", marginBottom: 6 },
  sptNumber: { fontSize: 11, color: "#64748B", fontWeight: "600", letterSpacing: 0.5 },
  cardInfo: { marginBottom: 0 },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  infoIconBox: {
    width: 28,
    height: 28,
    backgroundColor: "#F0F7F7",
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  infoText: {
    fontSize: 13,
    color: "#475569",
    flex: 1,
  },
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
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    marginHorizontal: -14,
    marginBottom: -14,
    paddingHorizontal: 14,
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
  moreBtn: {
    padding: 8,
  },
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

  /* ========================================
     SKELETON STYLES - KELOLA DINAS
  ======================================== */
  skeletonKegiatanName: {
    width: '70%',
    height: 16,
    backgroundColor: '#E8F0EF',
    borderRadius: 6,
    marginBottom: 6,
  },
  skeletonSptNumber: {
    width: '45%',
    height: 11,
    backgroundColor: '#F0F4F3',
    borderRadius: 4,
  },
  skeletonStatusBadge: {
    width: 85,
    height: 24,
    backgroundColor: '#E8F0EF',
    borderRadius: 8,
  },
  skeletonMoreBtn: {
    width: 34,
    height: 34,
    backgroundColor: '#E8F0EF',
    borderRadius: 17,
  },
  skeletonInfoIconBox: {
    width: 28,
    height: 28,
    borderRadius: 10,
    backgroundColor: '#F0F4F3',
    marginRight: 10,
  },
  skeletonInfoText: {
    height: 13,
    backgroundColor: '#E8F0EF',
    borderRadius: 6,
  },
});
