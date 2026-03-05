import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useState, useRef } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Modal,
  Platform,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Animated,
  PanResponder,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import * as NavigationBar from "expo-navigation-bar";
import {
  API_CONFIG,
  getApiUrl,
  PegawaiAkunAPI,
} from "../../../constants/config";
import { AppHeader, CustomAlert } from "../../../components";
import { useCustomAlert } from "../../../hooks/useCustomAlert";

interface PegawaiData {
  id_pegawai?: number;
  id_user?: number;
  nama_lengkap: string;
  email?: string;
  password?: string;
  has_password?: boolean;
  nip?: string;
  jenis_kelamin?: string;
  jabatan?: string;
  divisi?: string;
  no_telepon?: string;
  status_pegawai?: string;
  foto_profil?: string;
  role?: string;
}

export default function DataPegawaiAdminScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();

  const [pegawai, setPegawai] = useState<PegawaiData[]>([]);
  const [filteredPegawai, setFilteredPegawai] = useState<PegawaiData[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;
  const [selectedPegawai, setSelectedPegawai] = useState<PegawaiData | null>(
    null,
  );
  const [showActionModal, setShowActionModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const alert = useCustomAlert();
  const translateY = useRef(new Animated.Value(300)).current;
  const deleteModalScale = useRef(new Animated.Value(0)).current;

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

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchPegawai(false);
    setRefreshing(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchPegawai();
      // Set navigation bar translucent
      if (Platform.OS === "android") {
        NavigationBar.setBackgroundColorAsync("transparent");
      }
    }, []),
  );

  useEffect(() => {
    if (params.refresh) {
      fetchPegawai();
    }
  }, [params.refresh]);

  useEffect(() => {
    filterPegawai();
  }, [searchQuery, pegawai]);

  const filterPegawai = () => {
    let filtered = pegawai;
    if (searchQuery.trim() !== "") {
      filtered = pegawai.filter(
        (p) =>
          p.nama_lengkap.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (p.email &&
            p.email.toLowerCase().includes(searchQuery.toLowerCase())) ||
          (p.jabatan &&
            p.jabatan.toLowerCase().includes(searchQuery.toLowerCase())) ||
          (p.nip && p.nip.includes(searchQuery)),
      );
    }
    setFilteredPegawai(filtered);
    setCurrentPage(1);
  };

  // Pagination logic
  const totalPages = Math.ceil(filteredPegawai.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentData = filteredPegawai.slice(startIndex, endIndex);

  const fetchPegawai = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      console.log(
        "Fetching data from:",
        getApiUrl(API_CONFIG.ENDPOINTS.DATA_PEGAWAI),
      );
      const response = await fetch(
        getApiUrl(API_CONFIG.ENDPOINTS.DATA_PEGAWAI),
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
        },
      );

      console.log("Response status:", response.status);
      const result = await response.json();
      console.log("Response data:", result);

      if (result.success) {
        setPegawai(result.data);
        setFilteredPegawai(result.data);
      } else {
        alert.showAlert({
          type: "error",
          message: result.message || "Gagal memuat data pegawai",
        });
      }
    } catch (error) {
      console.error("Fetch error:", error);
      alert.showAlert({
        type: "error",
        message: "Pastikan XAMPP nyala dan HP satu Wi-Fi dengan laptop.",
      });
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  const openDeleteModal = () => {
    setShowDeleteModal(true);
  };

  const closeDeleteModal = () => {
    setShowDeleteModal(false);
  };

  const deletePegawai = async (id: number, nama: string) => {
    closeDeleteModal();
    try {
      const result = await PegawaiAkunAPI.deletePegawai(id);
      if (result.success) {
        alert.showAlert({
          type: "success",
          message: "Data berhasil dihapus",
          onConfirm: () => fetchPegawai(),
        });
      } else {
        alert.showAlert({ type: "error", message: result.message });
      }
    } catch (error) {
      alert.showAlert({ type: "error", message: "Gagal menghapus data" });
    }
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
        title="Pegawai"
        showBack={true}
        showAddButton={true}
        onAddPress={() =>
          router.push("/menu-admin/pegawai-akun/add-data-pegawai" as any)
        }
        fallbackRoute="/admin/dashboard-admin"
      />

      <View style={styles.contentContainer}>
        <View style={styles.content}>
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

          {/* ========================================
               SKELETON LOADING STATE
          ======================================== */}
          {loading ? (
            <View style={styles.listContent}>
              {[1, 2, 3, 4, 5].map((item) => (
                <View key={item} style={[styles.pegawaiCard, styles.skeletonCard]}>
                  {/* Skeleton Avatar Section */}
                  <View style={styles.avatarSection}>
                    <View style={styles.skeletonAvatar} />
                    <View style={styles.skeletonStatusBadge} />
                  </View>

                  {/* Skeleton Info Section */}
                  <View style={styles.infoSection}>
                    <View style={styles.skeletonName} />
                    
                    <View style={styles.infoRow}>
                      <View style={styles.skeletonIconBox} />
                      <View style={styles.infoContent}>
                        <View style={styles.skeletonLabel} />
                        <View style={styles.skeletonEmail} />
                      </View>
                    </View>
                    
                    <View style={styles.infoRow}>
                      <View style={styles.skeletonIconBox} />
                      <View style={styles.infoContent}>
                        <View style={styles.skeletonLabel} />
                        <View style={styles.skeletonNip} />
                      </View>
                    </View>
                    
                    <View style={styles.infoRow}>
                      <View style={styles.skeletonIconBox} />
                      <View style={styles.infoContent}>
                        <View style={styles.skeletonLabel} />
                        <View style={styles.skeletonJabatan} />
                      </View>
                    </View>
                  </View>

                  {/* Skeleton Actions Section */}
                  <View style={styles.actionsSection}>
                    <View style={styles.skeletonMoreBtn} />
                  </View>
                </View>
              ))}
            </View>
          ) : (
            /* ========================================
               ACTUAL DATA LIST
            ======================================== */
            <FlatList
              data={currentData}
              keyExtractor={(item) =>
                item.id_pegawai?.toString() ||
                item.id_user?.toString() ||
                Math.random().toString()
              }
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={onRefresh}
                  colors={["#004643"]}
                  tintColor="#004643"
                />
              }
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
                                currentPage === page &&
                                  styles.pageNumberTextActive,
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
              renderItem={({ item }) => {
                // Fix status pegawai - handle case sensitivity dan NULL values
                const isActive =
                  item.status_pegawai?.toLowerCase() === "aktif" ||
                  item.status_pegawai === null ||
                  item.status_pegawai === undefined;

                return (
                  <TouchableOpacity
                    style={styles.pegawaiCard}
                    onPress={() => {
                      router.push(
                        `/menu-admin/pegawai-akun/detail/${item.id_pegawai || item.id_user}` as any,
                      );
                    }}
                    activeOpacity={0.7}
                  >
                    {/* Left Section - Avatar */}
                    <View style={styles.avatarSection}>
                      {item.foto_profil ? (
                        <Image
                          source={{
                            uri: `${API_CONFIG.BASE_URL}/${item.foto_profil}`,
                          }}
                          style={styles.profileImage}
                        />
                      ) : (
                        <View style={styles.avatar}>
                          <Text style={styles.avatarText}>
                            {item.nama_lengkap?.charAt(0).toUpperCase() || "P"}
                          </Text>
                        </View>
                      )}

                      {/* Status Badge */}
                      <View
                        style={[
                          styles.statusBadge,
                          isActive
                            ? styles.statusActive
                            : styles.statusInactive,
                        ]}
                      >
                        <View
                          style={[
                            styles.statusDot,
                            isActive ? styles.dotActive : styles.dotInactive,
                          ]}
                        />
                        <Text
                          style={[
                            styles.statusText,
                            isActive
                              ? styles.statusTextActive
                              : styles.statusTextInactive,
                          ]}
                        >
                          {isActive ? "Aktif" : "Tidak Aktif"}
                        </Text>
                      </View>
                    </View>

                    {/* Center Section - Info */}
                    <View style={styles.infoSection}>
                      <Text style={styles.pegawaiName}>
                        {item.nama_lengkap}
                      </Text>

                      <View style={styles.infoRow}>
                        <View style={styles.infoIconBox}>
                          <Ionicons name="mail-outline" size={14} color="#00695C" />
                        </View>
                        <View style={styles.infoContent}>
                          <Text style={styles.infoLabel}>EMAIL</Text>
                          <Text style={styles.infoValue}>
                            {item.email || "Email belum diisi"}
                          </Text>
                        </View>
                      </View>

                      <View style={styles.infoRow}>
                        <View style={styles.infoIconBox}>
                          <Ionicons name="card-outline" size={14} color="#00695C" />
                        </View>
                        <View style={styles.infoContent}>
                          <Text style={styles.infoLabel}>NIP</Text>
                          <Text style={styles.infoValue}>
                            {item.nip || "NIP belum diisi"}
                          </Text>
                        </View>
                      </View>

                      {item.jabatan && (
                        <View style={styles.infoRow}>
                          <View style={styles.infoIconBox}>
                            <Ionicons name="briefcase-outline" size={14} color="#00695C" />
                          </View>
                          <View style={styles.infoContent}>
                            <Text style={styles.infoLabel}>JABATAN</Text>
                            <Text style={styles.jabatanValue}>
                              {item.jabatan}
                            </Text>
                          </View>
                        </View>
                      )}
                    </View>

                    {/* Right Section - Actions */}
                    <View style={styles.actionsSection}>
                      <TouchableOpacity
                        style={styles.moreBtn}
                        onPress={(e) => {
                          e.stopPropagation();
                          setSelectedPegawai(item);
                          openModal();
                        }}
                      >
                        <Ionicons
                          name="ellipsis-vertical"
                          size={20}
                          color="#00695C"
                        />
                      </TouchableOpacity>
                    </View>
                  </TouchableOpacity>
                );
              }}
              contentInsetAdjustmentBehavior="never"
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Ionicons name="people-outline" size={80} color="#ccc" />
                  <Text style={styles.emptyText}>Belum ada data pegawai</Text>
                </View>
              }
            />
          )}
        </View>
      </View>

      {/* Action Modal - Bottom Sheet Style */}
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
                      setShowActionModal(false);
                      router.push(
                        `/menu-admin/pegawai-akun/detail/edit/${selectedPegawai?.id_pegawai || selectedPegawai?.id_user}` as any,
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
                      setTimeout(() => {
                        openDeleteModal();
                      }, 300);
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
        onRequestClose={closeDeleteModal}
      >
        <View style={styles.deleteModalOverlay}>
          <View style={styles.deleteModalContainer}>
            {/* Icon */}
            <View style={styles.deleteIconContainer}>
              <Ionicons name="trash-outline" size={48} color="#fff" />
            </View>

            {/* Message */}
            <Text style={styles.deleteModalMessage}>Hapus data pegawai?</Text>

            {/* Buttons */}
            <View style={styles.deleteModalButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={closeDeleteModal}
              >
                <Text style={styles.cancelButtonText}>Batal</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.deleteButton}
                onPress={() => {
                  deletePegawai(
                    selectedPegawai?.id_pegawai ||
                      selectedPegawai?.id_user ||
                      0,
                    selectedPegawai?.nama_lengkap || "",
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
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FAFBFC",
  },
  contentContainer: {
    flex: 1,
    backgroundColor: "#FAFBFC",
  },
  content: {
    flex: 1,
    backgroundColor: "#FAFBFC",
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
  sortBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#F8F9FA",
    borderWidth: 1,
    borderColor: "#E5E5E5",
    gap: 6,
    minWidth: 70,
    justifyContent: "center",
  },

  sortBtnActive: {
    backgroundColor: "#004643",
    borderColor: "#004643",
  },
  sortText: {
    fontSize: 13,
    color: "#666",
    fontWeight: "600",
  },
  sortTextActive: { color: "#fff" },

  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  listContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 20,
    backgroundColor: "#FAFBFC",
  },
  pegawaiCard: {
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
    flexDirection: 'row',
    alignItems: 'flex-start',
  },

  // Avatar Section
  avatarSection: {
    alignItems: 'center',
    marginRight: 14,
  },
  profileImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: '#F0F7F7',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#004643',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
  },
  avatarText: {
    color: '#FFF',
    fontWeight: '800',
    fontSize: 18,
    letterSpacing: 0.5,
  },

  // Status Badge
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 16,
    marginTop: 6,
    gap: 4,
    minWidth: 60,
    justifyContent: 'center',
  },
  statusActive: {
    backgroundColor: '#E8F8F5',
    borderWidth: 1,
    borderColor: '#B2DFDB',
  },
  statusInactive: {
    backgroundColor: '#FFF8E1',
    borderWidth: 1,
    borderColor: '#FFE0B2',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  dotActive: {
    backgroundColor: '#00C853',
  },
  dotInactive: {
    backgroundColor: '#FF8F00',
  },
  statusText: {
    fontSize: 8,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  statusTextActive: {
    color: '#00695C',
  },
  statusTextInactive: {
    color: '#E65100',
  },

  // Info Section
  infoSection: {
    flex: 1,
    paddingTop: 1,
  },
  pegawaiName: {
    fontWeight: '700',
    fontSize: 15,
    color: '#1A1A1A',
    marginBottom: 8,
    letterSpacing: -0.2,
    lineHeight: 20,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 7,
  },
  infoIconBox: {
    width: 24,
    height: 24,
    backgroundColor: '#F0F7F7',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    marginTop: 1,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 8,
    fontWeight: '800',
    color: '#95A5A6',
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  infoValue: {
    color: '#576574',
    fontSize: 12,
    fontWeight: '500',
    lineHeight: 15,
  },
  jabatanValue: {
    color: '#004643',
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 15,
  },

  // Actions Section
  actionsSection: {
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 2,
  },
  moreBtn: {
    padding: 10,
    borderRadius: 12,
    backgroundColor: '#F0F7F7',
    borderWidth: 1,
    borderColor: '#E8F5F4',
    shadowColor: '#004643',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 80,
    paddingBottom: 40,
    backgroundColor: "#FAFBFC",
  },
  emptyText: {
    fontSize: 16,
    color: "#8A9BA8",
    marginTop: 16,
    fontWeight: "500",
    letterSpacing: 0.2,
  },

  // Bottom Sheet Modal Styles
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
  actionIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  bottomSheetItemText: {
    fontSize: 16,
    color: "#333",
    fontWeight: "500",
  },

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

  // Delete Modal Styles
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
    shadowColor: "#000",
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
     SKELETON STYLES
  ======================================== */
  skeletonCard: {
    borderWidth: 1,
    borderColor: "#E0E0E0",
    backgroundColor: "#FAFCFB",
  },
  skeletonAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#E8F0EF",
  },
  skeletonStatusBadge: {
    width: 60,
    height: 20,
    borderRadius: 16,
    backgroundColor: "#F0F4F3",
    marginTop: 6,
  },
  skeletonName: {
    width: "75%",
    height: 14,
    backgroundColor: "#E8F0EF",
    borderRadius: 7,
    marginBottom: 8,
  },
  skeletonIconBox: {
    width: 24,
    height: 24,
    backgroundColor: "#F0F4F3",
    borderRadius: 8,
    marginRight: 10,
    marginTop: 1,
  },
  skeletonLabel: {
    width: "40%",
    height: 8,
    backgroundColor: "#F0F4F3",
    borderRadius: 4,
    marginBottom: 2,
  },
  skeletonEmail: {
    width: "80%",
    height: 11,
    backgroundColor: "#F0F4F3",
    borderRadius: 5,
  },
  skeletonNip: {
    width: "65%",
    height: 11,
    backgroundColor: "#F0F4F3",
    borderRadius: 5,
  },
  skeletonJabatan: {
    width: "70%",
    height: 11,
    backgroundColor: "#F0F4F3",
    borderRadius: 5,
  },
  skeletonMoreBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: "#E8F0EF",
  },
});
