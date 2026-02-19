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
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as NavigationBar from 'expo-navigation-bar';
import { API_CONFIG, getApiUrl, PegawaiAkunAPI } from "../../constants/config";
import { AppHeader, SkeletonLoader } from "../../components";

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
  const [selectedPegawai, setSelectedPegawai] = useState<PegawaiData | null>(null);
  const [showActionModal, setShowActionModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const translateY = useRef(new Animated.Value(300)).current;
  const deleteModalScale = useRef(new Animated.Value(0)).current;

  const openModal = () => {
    setShowActionModal(true);
    if (Platform.OS === 'android') {
      NavigationBar.setVisibilityAsync('hidden');
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
      if (Platform.OS === 'android') {
        NavigationBar.setVisibilityAsync('visible');
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
      if (Platform.OS === 'android') {
        NavigationBar.setBackgroundColorAsync('transparent');
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
      console.log('Fetching data from:', getApiUrl(API_CONFIG.ENDPOINTS.DATA_PEGAWAI));
      const response = await fetch(
        getApiUrl(API_CONFIG.ENDPOINTS.DATA_PEGAWAI),
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
        }
      );
      
      console.log('Response status:', response.status);
      const result = await response.json();
      console.log('Response data:', result);

      if (result.success) {
        setPegawai(result.data);
        setFilteredPegawai(result.data);
      } else {
        Alert.alert("Error", result.message || "Gagal memuat data pegawai");
      }
    } catch (error) {
      console.error('Fetch error:', error);
      Alert.alert(
        "Koneksi Error",
        "Pastikan XAMPP nyala dan HP satu Wi-Fi dengan laptop.\n\nDetail: " + (error as Error).message,
      );
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
        Alert.alert("Sukses", result.message);
        fetchPegawai(); // Refresh data
      } else {
        Alert.alert("Error", result.message);
      }
    } catch (error) {
      Alert.alert("Error", "Gagal menghapus data pegawai");
    }
  };



  return (
    <View style={styles.container}>
      <StatusBar style="light" translucent={true} backgroundColor="transparent" />

      {/* HEADER */}
      <AppHeader 
        title="Data Pegawai"
        showBack={true}
        showAddButton={true}
        onAddPress={() => router.push("/pegawai-akun/add-data-pegawai" as any)}
        fallbackRoute="/admin/dashboard-admin"
      />

      {loading ? (
        <SkeletonLoader type="list" count={5} message="Memuat data pegawai..." />
      ) : (
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
                  <TouchableOpacity onPress={() => setSearchQuery('')}>
                    <Ionicons name="close-circle" size={20} color="#999" />
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* Scrollable List */}
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
            renderItem={({ item }) => (
              <TouchableOpacity 
                style={styles.pegawaiCard}
                onPress={() => {
                  router.push(
                    `/pegawai-akun/detail/${item.id_pegawai || item.id_user}` as any
                  );
                }}
                activeOpacity={0.7}
              >
                {item.foto_profil ? (
                  <Image
                    source={{ uri: `${API_CONFIG.BASE_URL}/${item.foto_profil}` }}
                    style={styles.profileImage}
                  />
                ) : (
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>
                      {item.nama_lengkap?.charAt(0).toUpperCase() || "P"}
                    </Text>
                  </View>
                )}
                <View style={{ flex: 1 }}>
                  <Text style={styles.pegawaiName}>{item.nama_lengkap}</Text>
                  <Text style={styles.pegawaiEmail}>
                    {item.email || "Email belum diisi"}
                  </Text>
                  <Text style={styles.pegawaiNip}>
                    NIP: {item.nip || "Belum diisi"}
                  </Text>
                </View>
                <View style={styles.pegawaiActions}>
                  <TouchableOpacity
                    style={styles.moreBtn}
                    onPress={(e) => {
                      e.stopPropagation();
                      setSelectedPegawai(item);
                      openModal();
                    }}
                  >
                    <Ionicons name="ellipsis-vertical" size={18} color="#666" />
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            )}
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
          </View>
        </View>
      )}

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
          <Animated.View style={[styles.bottomSheetModal, {
            transform: [{ translateY }]
          }]}>
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
                        `/pegawai-akun/detail/edit/${selectedPegawai?.id_pegawai || selectedPegawai?.id_user}` as any
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
                    <Text style={[styles.bottomSheetItemText, { color: '#F44336' }]}>Hapus</Text>
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
        animationType="none"
        statusBarTranslucent={true}
        onRequestClose={closeDeleteModal}
      >
        <View style={styles.deleteModalOverlay}>
          <View style={styles.deleteModalContainer}>
            {/* Icon */}
            <View style={styles.deleteIconContainer}>
              <Ionicons name="alert-circle-outline" size={48} color="#FF4444" />
            </View>
            
            {/* Title */}
            <Text style={styles.deleteModalTitle}>Hapus Data Pegawai</Text>
            
            {/* Message */}
            <Text style={styles.deleteModalMessage}>
              Apakah Anda yakin ingin menghapus data pegawai:
            </Text>
            
            {/* Employee Info */}
            <View style={styles.employeeInfoCard}>
              <Text style={styles.employeeName}>{selectedPegawai?.nama_lengkap}</Text>
              <Text style={styles.employeeDetail}>{selectedPegawai?.email || 'Email tidak tersedia'}</Text>
              <Text style={styles.employeeDetail}>NIP: {selectedPegawai?.nip || 'Tidak tersedia'}</Text>
            </View>
            
            {/* Warning */}
            <Text style={styles.warningText}>Data yang dihapus tidak dapat dikembalikan</Text>
            
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
                    selectedPegawai?.id_pegawai || selectedPegawai?.id_user || 0,
                    selectedPegawai?.nama_lengkap || ""
                  );
                }}
              >
                <Text style={styles.deleteButtonText}>Ya, Hapus</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: "#fff",
  },
  contentContainer: {
    flex: 1,
  },
  content: { 
    flex: 1 
  },
  searchContainer: {
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#fff'
  },
  searchInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    paddingHorizontal: 15,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    gap: 12
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    paddingVertical: 12
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
    fontWeight: "600" 
  },
  sortTextActive: { color: "#fff" },

  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  listContent: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 20 },
  pegawaiCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 15,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  profileImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 16,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#E6F0EF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  avatarText: { color: "#004643", fontWeight: "bold", fontSize: 20 },
  pegawaiName: {
    fontWeight: "bold",
    fontSize: 16,
    color: "#333",
    marginBottom: 2,
  },
  pegawaiEmail: { color: "#888", fontSize: 12, marginBottom: 2 },
  pegawaiNip: { color: "#666", fontSize: 12, marginBottom: 2 },
  pegawaiActions: { alignItems: "flex-end", justifyContent: "center" },
  moreBtn: { 
    padding: 8, 
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 8,
  },
  statusText: { fontSize: 10, fontWeight: "bold" },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 100,
  },
  emptyText: { fontSize: 16, color: "#ccc", marginTop: 16 },
  
  // Bottom Sheet Modal Styles
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingTop: Platform.OS === 'android' ? 0 : 50,
  },
  modalBackdrop: {
    flex: 1,
  },
  bottomSheetModal: {
    backgroundColor: '#F8F9FA',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    paddingTop: 8,
  },
  handleContainer: {
    paddingVertical: 12,
    alignItems: 'center',
    width: '100%',
  },
  handleBar: {
    width: 40,
    height: 4,
    backgroundColor: '#DDD',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 8,
    marginBottom: 16,
  },
  bottomSheetHeader: {
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  actionCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
  },
  bottomSheetActions: {
    backgroundColor: 'transparent',
  },
  bottomSheetItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 18,
    backgroundColor: 'transparent',
    gap: 15,
  },
  actionDivider: {
    height: 1,
    backgroundColor: '#F0F0F0',
    marginHorizontal: 20,
  },
  actionIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bottomSheetItemText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
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

  // Delete Modal Styles
  deleteModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  deleteModalContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 320,
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  deleteIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FFEBEE',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  deleteModalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
    textAlign: 'center',
  },
  deleteModalMessage: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 20,
  },
  employeeInfoCard: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
    width: '100%',
    marginBottom: 16,
  },
  employeeName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
    marginBottom: 6,
  },
  employeeDetail: {
    fontSize: 13,
    color: '#666',
    textAlign: 'center',
    marginBottom: 2,
  },
  warningText: {
    fontSize: 12,
    color: '#FF8C00',
    textAlign: 'center',
    marginBottom: 20,
    fontStyle: 'italic',
  },
  deleteModalButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#F8F9FA',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E9ECEF',
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6C757D',
  },
  deleteButton: {
    flex: 1,
    backgroundColor: '#FF4444',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  deleteButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#fff',
  },
});

