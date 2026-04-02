/* ========================================
   LOKASI KANTOR
   • Tekan lama di peta untuk tambah lokasi
   • Tap marker untuk lihat detail
======================================== */

import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import { useFocusEffect, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useRef, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Animated,
    Dimensions,
    Modal,
    PanResponder,
    Platform,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import MapView, { Marker, PROVIDER_GOOGLE } from "react-native-maps";
import { AppHeader, CustomAlert } from "../../../components";
import { PengaturanAPI } from "../../../constants/config";
import { useCustomAlert } from "../../../hooks/useCustomAlert";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

interface LokasiData {
  id: number;
  nama_lokasi: string;
  alamat: string;
  lintang: number;
  bujur: number;
  radius: number;
  jenis_lokasi: "tetap" | "dinas";
}

export default function LokasiKantorScreen() {
  const router = useRouter();
  const mapRef = useRef<MapView>(null);
  const translateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const alert = useCustomAlert();

  const [loading, setLoading] = useState(false);
  const [locations, setLocations] = useState<LokasiData[]>([]);
  const [userCoords, setUserCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<LokasiData | null>(
    null,
  );
  const [showBottomSheet, setShowBottomSheet] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isAddMode, setIsAddMode] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [tempMarker, setTempMarker] = useState<{
    latitude: number;
    longitude: number;
    address: string;
  } | null>(null);

  const [formData, setFormData] = useState({
    jenis: "tetap" as "tetap" | "dinas",
    nama: "",
    radius: "100",
  });

  useFocusEffect(
    React.useCallback(() => {
      getUserLocation();
      fetchLocations();
    }, []),
  );

  const getUserLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const coords = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
      setUserCoords(coords);
      mapRef.current?.animateToRegion({ ...coords, latitudeDelta: 0.01, longitudeDelta: 0.01 }, 800);
    } catch (e) {
      console.error('Error getting user location:', e);
    }
  };

  const fetchLocations = async () => {
    try {
      setLoading(true);
      const response = await PengaturanAPI.getLokasiKantor();
      if (response.success && response.data) {
        setLocations(response.data);
      }
    } catch (error) {
      console.error("Error fetching locations:", error);
    } finally {
      setLoading(false);
    }
  };

  const openBottomSheet = () => {
    setShowBottomSheet(true);
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
      setShowBottomSheet(false);
      setIsAddMode(false);
      setIsEditMode(false);
      setTempMarker(null);
      setSelectedLocation(null);
      setFormData({ jenis: "tetap", nama: "", radius: "100" });
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

  // Tekan lama di peta untuk tambah lokasi baru
  const handleMapLongPress = async (e: any) => {
    const { latitude, longitude } = e.nativeEvent.coordinate;

    try {
      const result = await Location.reverseGeocodeAsync({
        latitude,
        longitude,
      });
      let address = "Indonesia";

      if (result.length > 0) {
        const addr = result[0];
        const parts = [];
        if (addr.street) parts.push(addr.street);
        if (addr.district) parts.push(addr.district);
        if (addr.city) parts.push(addr.city);
        if (addr.region) parts.push(addr.region);
        address = parts.join(", ") || "Indonesia";
      }

      setTempMarker({ latitude, longitude, address });

      if (isEditMode) {
        // Mode edit: buka bottom sheet lagi dengan koordinat baru
        openBottomSheet();
      } else {
        // Mode tambah baru
        setIsAddMode(true);
        setFormData({ jenis: "tetap", nama: "", radius: "100" });
        openBottomSheet();
      }
    } catch (error) {
      setTempMarker({ latitude, longitude, address: "Indonesia" });
      if (isEditMode) {
        openBottomSheet();
      } else {
        setIsAddMode(true);
        openBottomSheet();
      }
    }
  };

  // Tap marker untuk lihat detail lokasi
  const handleMarkerPress = (location: LokasiData) => {
    setSelectedLocation(location);
    setIsAddMode(false);
    openBottomSheet();
  };

  const handleSave = async () => {
    if (!formData.nama.trim()) {
      alert.showAlert({ type: 'error', message: 'Nama lokasi wajib diisi' });
      return;
    }

    if (!tempMarker) {
      alert.showAlert({ type: 'error', message: 'Lokasi belum dipilih' });
      return;
    }

    if (
      !formData.radius ||
      parseInt(formData.radius) < 10 ||
      parseInt(formData.radius) > 1000
    ) {
      alert.showAlert({ type: 'error', message: 'Radius harus antara 10-1000 meter' });
      return;
    }

    try {
      setLoading(true);

      if (isEditMode && selectedLocation) {
        const response = await PengaturanAPI.updateLokasi(selectedLocation.id, {
          nama_lokasi: formData.nama.trim(),
          alamat: tempMarker.address,
          lintang: tempMarker.latitude,
          bujur: tempMarker.longitude,
          radius: parseInt(formData.radius),
          jenis_lokasi: formData.jenis,
        });

        if (response.success) {
          alert.showAlert({ 
            type: 'success', 
            message: 'Lokasi berhasil diupdate',
            onConfirm: () => {
              closeBottomSheet();
              fetchLocations();
            }
          });
        } else {
          alert.showAlert({ type: 'error', message: response.message || 'Gagal mengupdate lokasi' });
        }
      } else {
        const response = await PengaturanAPI.saveLokasiKantor({
          nama_lokasi: formData.nama.trim(),
          alamat: tempMarker.address,
          lintang: tempMarker.latitude,
          bujur: tempMarker.longitude,
          radius: parseInt(formData.radius),
          jenis_lokasi: formData.jenis,
        });

        if (response.success) {
          alert.showAlert({ 
            type: 'success', 
            message: 'Lokasi berhasil disimpan',
            onConfirm: () => {
              closeBottomSheet();
              fetchLocations();
            }
          });
        } else {
          alert.showAlert({ type: 'error', message: response.message || 'Gagal menyimpan lokasi' });
        }
      }
    } catch (error) {
      alert.showAlert({ type: 'error', message: 'Terjadi kesalahan saat menyimpan' });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = () => {
    if (!selectedLocation) return;

    setIsEditMode(true);
    setIsAddMode(false);
    setFormData({
      jenis: selectedLocation.jenis_lokasi,
      nama: selectedLocation.nama_lokasi,
      radius: selectedLocation.radius.toString(),
    });
    setTempMarker({
      latitude: selectedLocation.lintang,
      longitude: selectedLocation.bujur,
      address: selectedLocation.alamat,
    });
  };

  const handleUbahLokasi = () => {
    // Tutup bottom sheet, user akan tap di map untuk pilih lokasi baru
    Animated.timing(translateY, {
      toValue: SCREEN_HEIGHT,
      duration: 250,
      useNativeDriver: true,
    }).start(() => {
      setShowBottomSheet(false);
    });
  };

  const handleDelete = async () => {
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!selectedLocation) return;
    
    setShowDeleteModal(false);
    try {
      setLoading(true);
      const response = await PengaturanAPI.deleteLokasi(selectedLocation.id);
      if (response.success) {
        alert.showAlert({ 
          type: 'success', 
          message: 'Lokasi berhasil dihapus',
          onConfirm: () => {
            closeBottomSheet();
            fetchLocations();
          }
        });
      } else {
        alert.showAlert({ type: 'error', message: response.message || 'Gagal menghapus lokasi' });
      }
    } catch (error) {
      alert.showAlert({ type: 'error', message: 'Terjadi kesalahan saat menghapus' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar
        style="light"
        translucent={true}
        backgroundColor="transparent"
      />
      <AppHeader title="Lokasi Kantor" showBack={true} />

      {/* Info counter lokasi */}
      <View style={styles.counterContainer}>
        <View style={styles.counterItem}>
          <Ionicons name="business" size={16} color="#004643" />
          <Text style={styles.counterText}>
            Kantor:{" "}
            <Text style={styles.counterValue}>
              {locations.filter((l) => l.jenis_lokasi === "tetap").length}
            </Text>
          </Text>
        </View>
        <View style={styles.counterDivider} />
        <View style={styles.counterItem}>
          <Ionicons name="briefcase" size={16} color="#FFC107" />
          <Text style={styles.counterText}>
            Dinas:{" "}
            <Text style={styles.counterValue}>
              {locations.filter((l) => l.jenis_lokasi === "dinas").length}
            </Text>
          </Text>
        </View>
      </View>

      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        initialRegion={{
          latitude: userCoords?.latitude ?? -6.2088,
          longitude: userCoords?.longitude ?? 106.8456,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        }}
        onLongPress={handleMapLongPress} // Long press untuk tambah lokasi
        showsUserLocation
        showsMyLocationButton
      >
        {/* Marker lokasi kantor/dinas */}
        {locations.map((loc) => (
          <Marker
            key={loc.id}
            coordinate={{ latitude: loc.lintang, longitude: loc.bujur }}
            onPress={() => handleMarkerPress(loc)} // Tap untuk detail
            stopPropagation={true} // Fix iOS tap detection
          >
            <View
              style={[
                styles.customMarker,
                loc.jenis_lokasi === "tetap"
                  ? styles.markerTetap
                  : styles.markerDinas,
              ]}
            >
              <Ionicons
                name={loc.jenis_lokasi === "tetap" ? "business" : "briefcase"}
                size={20}
                color="#fff"
              />
            </View>
          </Marker>
        ))}

        {tempMarker && (
          <Marker
            coordinate={{
              latitude: tempMarker.latitude,
              longitude: tempMarker.longitude,
            }}
          >
            <View style={[styles.tempMarker, isEditMode && styles.editMarker]}>
              <Ionicons
                name={isEditMode ? "create" : "location"}
                size={24}
                color={isEditMode ? "#FFC107" : "#FF6B35"}
              />
            </View>
          </Marker>
        )}
      </MapView>

      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#004643" />
        </View>
      )}

      <Modal
        visible={showBottomSheet}
        transparent
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
              {isAddMode || isEditMode ? (
                <>
                  <Text style={styles.sheetTitle}>
                    {isEditMode ? "Edit Lokasi" : "Tambah Lokasi"}
                  </Text>

                  <View style={styles.formGroup}>
                    <Text style={styles.label}>Jenis Lokasi</Text>
                    <View style={styles.radioGroup}>
                      <TouchableOpacity
                        style={[
                          styles.radioBtn,
                          formData.jenis === "tetap" && styles.radioBtnActive,
                        ]}
                        onPress={() =>
                          setFormData({ ...formData, jenis: "tetap" })
                        }
                      >
                        <Ionicons
                          name="business"
                          size={16}
                          color={formData.jenis === "tetap" ? "#fff" : "#666"}
                        />
                        <Text
                          style={[
                            styles.radioText,
                            formData.jenis === "tetap" &&
                              styles.radioTextActive,
                          ]}
                        >
                          Kantor Tetap
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[
                          styles.radioBtn,
                          formData.jenis === "dinas" && styles.radioBtnActive,
                        ]}
                        onPress={() =>
                          setFormData({ ...formData, jenis: "dinas" })
                        }
                      >
                        <Ionicons
                          name="briefcase"
                          size={16}
                          color={formData.jenis === "dinas" ? "#fff" : "#666"}
                        />
                        <Text
                          style={[
                            styles.radioText,
                            formData.jenis === "dinas" &&
                              styles.radioTextActive,
                          ]}
                        >
                          Lokasi Dinas
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  <View style={styles.formGroup}>
                    <Text style={styles.label}>Nama Kantor *</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Contoh: ITB Ganesha"
                      value={formData.nama}
                      onChangeText={(text) =>
                        setFormData({ ...formData, nama: text })
                      }
                    />
                  </View>

                  <View style={styles.formGroup}>
                    <Text style={styles.label}>Radius (meter) *</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="10-1000"
                      value={formData.radius}
                      onChangeText={(text) => {
                        const num = text.replace(/[^0-9]/g, "");
                        if (num === "" || num.length <= 4) {
                          setFormData({ ...formData, radius: num });
                        }
                      }}
                      keyboardType="numeric"
                      maxLength={4}
                    />
                  </View>

                  <View style={styles.autoInfo}>
                    <Ionicons
                      name="information-circle"
                      size={16}
                      color="#666"
                    />
                    <View style={styles.autoInfoText}>
                      <Text style={styles.autoLabel}>
                        {isEditMode ? "Lokasi Saat Ini:" : "Alamat (otomatis):"}
                      </Text>
                      <Text style={styles.autoValue}>
                        {tempMarker?.address}
                      </Text>
                      <Text style={styles.autoLabel}>Koordinat:</Text>
                      <Text style={styles.autoValue}>
                        {tempMarker?.latitude.toFixed(6)},{" "}
                        {tempMarker?.longitude.toFixed(6)}
                      </Text>
                    </View>
                  </View>

                  {isEditMode && (
                    <TouchableOpacity
                      style={styles.ubahLokasiBtn}
                      onPress={handleUbahLokasi}
                    >
                      <Ionicons name="map-outline" size={18} color="#004643" />
                      <Text style={styles.ubahLokasiText}>
                        Ubah Lokasi di Peta
                      </Text>
                    </TouchableOpacity>
                  )}

                  <View style={styles.buttonGroup}>
                    <TouchableOpacity
                      style={styles.cancelBtn}
                      onPress={closeBottomSheet}
                    >
                      <Text style={styles.cancelText}>Batal</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.saveBtn}
                      onPress={handleSave}
                      disabled={loading}
                    >
                      <Text style={styles.saveText}>
                        {loading
                          ? "Menyimpan..."
                          : isEditMode
                            ? "Simpan Perubahan"
                            : "Simpan"}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </>
              ) : (
                <>
                  <Text style={styles.sheetTitle}>
                    {selectedLocation?.nama_lokasi}
                  </Text>

                  <View style={styles.infoRow}>
                    <Ionicons
                      name={
                        selectedLocation?.jenis_lokasi === "tetap"
                          ? "business"
                          : "briefcase"
                      }
                      size={16}
                      color="#004643"
                    />
                    <Text style={styles.infoText}>
                      {selectedLocation?.jenis_lokasi === "tetap"
                        ? "Kantor Tetap"
                        : "Lokasi Dinas"}
                    </Text>
                  </View>

                  <View style={styles.infoRow}>
                    <Ionicons name="location" size={16} color="#004643" />
                    <Text style={styles.infoText}>
                      {selectedLocation?.alamat}
                    </Text>
                  </View>

                  <View style={styles.infoRow}>
                    <Ionicons name="radio-outline" size={16} color="#004643" />
                    <Text style={styles.infoText}>
                      Radius: {selectedLocation?.radius}m
                    </Text>
                  </View>

                  <View style={styles.infoRow}>
                    <Ionicons name="navigate" size={16} color="#004643" />
                    <Text style={styles.infoText}>
                      {selectedLocation?.lintang.toFixed(6)},{" "}
                      {selectedLocation?.bujur.toFixed(6)}
                    </Text>
                  </View>

                  <View style={styles.buttonGroup}>
                    <TouchableOpacity
                      style={styles.deleteBtn}
                      onPress={handleDelete}
                    >
                      <Ionicons name="trash-outline" size={18} color="#fff" />
                      <Text style={styles.deleteText}>Hapus</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.editBtn}
                      onPress={handleEdit}
                    >
                      <Ionicons name="create-outline" size={18} color="#fff" />
                      <Text style={styles.editText}>Edit</Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}
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
            <Text style={styles.deleteModalMessage}>Hapus lokasi ini?</Text>
            <View style={styles.deleteModalButtons}>
              <TouchableOpacity
                style={styles.deleteCancelButton}
                onPress={() => setShowDeleteModal(false)}
              >
                <Text style={styles.deleteCancelButtonText}>Batal</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.deleteConfirmButton}
                onPress={confirmDelete}
              >
                <Text style={styles.deleteConfirmButtonText}>Hapus</Text>
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
  container: { flex: 1, backgroundColor: "#F8FAFB" },
  counterContainer: {
    flexDirection: "row",
    backgroundColor: "#fff",
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
    gap: 16,
  },
  counterItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  counterText: {
    fontSize: 13,
    color: "#666",
    fontWeight: "500",
  },
  counterValue: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1E293B",
  },
  counterDivider: {
    width: 1,
    height: 20,
    backgroundColor: "#E5E7EB",
  },
  map: { flex: 1 },
  customMarker: {
    width: 37,
    height: 37,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: "#fff",
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    overflow: "visible",
  },
  markerTetap: { backgroundColor: "#004643" },
  markerDinas: { backgroundColor: "#FFC107" },
  tempMarker: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#FF6B35",
    elevation: 3,
  },
  editMarker: {
    borderWidth: 3,
    borderColor: "#FFC107",
    borderStyle: "dashed",
    shadowColor: "#FFC107",
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 8,
  },
  loadingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(255,255,255,0.7)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  modalBackdrop: { flex: 1 },
  bottomSheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: Platform.OS === "ios" ? 34 : 20,
    maxHeight: SCREEN_HEIGHT * 0.8,
  },
  handleContainer: {
    paddingVertical: 12,
    alignItems: "center",
  },
  handleBar: {
    width: 40,
    height: 4,
    backgroundColor: "#DDD",
    borderRadius: 2,
  },
  sheetContent: { paddingHorizontal: 20, paddingBottom: 16 },
  sheetTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#333",
    marginBottom: 16,
  },
  formGroup: { marginBottom: 16 },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
  },
  radioGroup: {
    flexDirection: "row",
    gap: 8,
  },
  radioBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: "#F5F5F5",
    gap: 6,
  },
  radioBtnActive: { backgroundColor: "#004643" },
  radioText: {
    fontSize: 13,
    color: "#666",
    fontWeight: "500",
  },
  radioTextActive: { color: "#fff" },
  input: {
    backgroundColor: "#F5F5F5",
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    color: "#333",
  },
  autoInfo: {
    flexDirection: "row",
    backgroundColor: "#F0F8F7",
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    gap: 8,
  },
  autoInfoText: { flex: 1 },
  autoLabel: {
    fontSize: 11,
    color: "#666",
    marginTop: 4,
  },
  autoValue: {
    fontSize: 12,
    color: "#004643",
    fontWeight: "500",
  },
  buttonGroup: {
    flexDirection: "row",
    gap: 12,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: "#F5F5F5",
    alignItems: "center",
  },
  cancelText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#666",
  },
  saveBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: "#004643",
    alignItems: "center",
  },
  saveText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#fff",
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 12,
    gap: 8,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: "#666",
    lineHeight: 20,
  },
  deleteBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: "#F44336",
    gap: 6,
  },
  deleteText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#fff",
  },
  editBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: "#FF9800",
    gap: 6,
  },
  editText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#fff",
  },
  ubahLokasiBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F0F8F7",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#004643",
    borderStyle: "dashed",
    gap: 8,
  },
  ubahLokasiText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#004643",
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
  deleteCancelButton: {
    flex: 1,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.3)",
  },
  deleteCancelButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#fff",
  },
  deleteConfirmButton: {
    flex: 1,
    backgroundColor: "#F44336",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  deleteConfirmButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#fff",
  },
});
