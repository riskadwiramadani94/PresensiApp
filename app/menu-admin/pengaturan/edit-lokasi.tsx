import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { AppHeader } from "../../../components";
import MapPicker from "../../../components/MapPicker";
import { PengaturanAPI } from "../../../constants/config";
import { CustomAlert } from '../../../components/CustomAlert';
import { useCustomAlert } from '../../../hooks/useCustomAlert';

export default function EditLokasiScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const [loading, setLoading] = useState(false);
  const [showMapPicker, setShowMapPicker] = useState(false);
  const { visible, config, showAlert, hideAlert, handleConfirm } = useCustomAlert();
  const [locationFromMap, setLocationFromMap] = useState<{
    latitude: number;
    longitude: number;
    address: string;
  } | null>(null);
  const [formData, setFormData] = useState({
    namaLokasi: "",
    alamat: "",
    latitude: null as number | null,
    longitude: null as number | null,
    radius: "100",
    jenis: "dinas" as "tetap" | "dinas",
  });

  useEffect(() => {
    fetchLokasiData();
  }, []);

  const fetchLokasiData = async () => {
    try {
      setLoading(true);
      const response = await PengaturanAPI.getLokasiKantor();
      if (response.success && response.data) {
        const lokasiId = Array.isArray(id)
          ? parseInt(id[0])
          : parseInt(id as string);
        const lokasi = response.data.find((item: any) => item.id == lokasiId);
        if (lokasi) {
          setFormData({
            namaLokasi: lokasi.nama_lokasi,
            alamat: lokasi.alamat,
            latitude: lokasi.lintang,
            longitude: lokasi.bujur,
            radius: lokasi.radius?.toString() || "100",
            jenis: lokasi.jenis_lokasi,
          });
          setLocationFromMap({
            latitude: lokasi.lintang,
            longitude: lokasi.bujur,
            address: lokasi.alamat,
          });
        }
      }
    } catch (error) {
      showAlert({ type: 'error', title: 'Error', message: 'Gagal memuat data lokasi' });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!formData.namaLokasi.trim() || !formData.alamat.trim()) {
      showAlert({ type: 'info', title: 'Info', message: 'Nama lokasi dan alamat wajib diisi' });
      return;
    }

    if (!formData.latitude || !formData.longitude) {
      showAlert({
        type: 'confirm',
        title: 'Koordinat Belum Dipilih',
        message: 'Silakan pilih lokasi di peta untuk mendapatkan koordinat yang akurat.',
        confirmText: 'Pilih di Peta',
        cancelText: 'Batal',
        onConfirm: () => setShowMapPicker(true)
      });
      return;
    }

    if (
      !formData.radius ||
      parseInt(formData.radius) < 10 ||
      parseInt(formData.radius) > 1000
    ) {
      showAlert({ type: 'info', title: 'Info', message: 'Radius harus antara 10-1000 meter' });
      return;
    }

    try {
      setLoading(true);
      const lokasiId = Array.isArray(id)
        ? parseInt(id[0])
        : parseInt(id as string);
      const response = await PengaturanAPI.updateLokasi(lokasiId, {
        nama_lokasi: formData.namaLokasi.trim(),
        alamat: formData.alamat.trim(),
        lintang: formData.latitude,
        bujur: formData.longitude,
        radius: parseInt(formData.radius),
        jenis_lokasi: formData.jenis,
      });

      if (response.success) {
        showAlert({
          type: 'success',
          title: 'Sukses',
          message: 'Lokasi berhasil diupdate',
          onConfirm: () => router.back()
        });
      } else {
        showAlert({ type: 'info', title: 'Info', message: response.message || 'Gagal mengupdate lokasi' });
      }
    } catch (error) {
      showAlert({ type: 'info', title: 'Info', message: 'Terjadi kesalahan saat mengupdate' });
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
      <AppHeader
        title="Edit Lokasi"
        showBack={true}
        fallbackRoute="/pengaturan"
      />

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.infoCard}>
          <Ionicons name="information-circle" size={20} color="#004643" />
          <View style={styles.infoContent}>
            <Text style={styles.infoText}>
              Edit informasi lokasi absensi. Gunakan peta untuk memilih
              koordinat yang akurat.
            </Text>
          </View>
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Jenis Lokasi *</Text>
          <View style={styles.radioGroup}>
            <TouchableOpacity
              style={[
                styles.radioBtn,
                formData.jenis === "tetap" && styles.radioBtnActive,
              ]}
              onPress={() => setFormData({ ...formData, jenis: "tetap" })}
            >
              <Ionicons
                name="business"
                size={16}
                color={formData.jenis === "tetap" ? "#fff" : "#666"}
              />
              <Text
                style={[
                  styles.radioText,
                  formData.jenis === "tetap" && styles.radioTextActive,
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
              onPress={() => setFormData({ ...formData, jenis: "dinas" })}
            >
              <Ionicons
                name="airplane"
                size={16}
                color={formData.jenis === "dinas" ? "#fff" : "#666"}
              />
              <Text
                style={[
                  styles.radioText,
                  formData.jenis === "dinas" && styles.radioTextActive,
                ]}
              >
                Lokasi Dinas
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Nama Lokasi *</Text>
          <View style={styles.inputWrapper}>
            <Ionicons name="business-outline" size={20} color="#666" />
            <TextInput
              style={styles.input}
              placeholder="Contoh: Kantor Pusat"
              value={formData.namaLokasi}
              onChangeText={(text) =>
                setFormData({ ...formData, namaLokasi: text })
              }
            />
          </View>
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Alamat Lengkap *</Text>
          <View style={styles.inputWrapper}>
            <Ionicons name="location-outline" size={20} color="#666" />
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Ketik alamat atau pilih dari peta"
              value={formData.alamat}
              onChangeText={(text) =>
                setFormData({ ...formData, alamat: text })
              }
              multiline
              numberOfLines={3}
            />
          </View>

          <TouchableOpacity
            style={styles.mapButton}
            onPress={() => setShowMapPicker(true)}
          >
            <Ionicons name="map-outline" size={20} color="#004643" />
            <Text style={styles.mapButtonText}>
              {locationFromMap ? "Ubah Lokasi di Peta" : "Pilih Lokasi di Peta"}
            </Text>
          </TouchableOpacity>

          {locationFromMap && (
            <View style={styles.coordInfo}>
              <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />
              <Text style={styles.coordText}>
                Koordinat: {locationFromMap.latitude.toFixed(6)},{" "}
                {locationFromMap.longitude.toFixed(6)}
              </Text>
            </View>
          )}

          {!locationFromMap && (
            <View style={styles.warningInfo}>
              <Ionicons name="alert-circle" size={16} color="#FF9800" />
              <Text style={styles.warningText}>
                Koordinat belum dipilih. Klik tombol di atas untuk pilih lokasi.
              </Text>
            </View>
          )}
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Radius Absensi (meter) *</Text>
          <View style={styles.inputWrapper}>
            <Ionicons name="radio-outline" size={20} color="#666" />
            <TextInput
              style={styles.input}
              placeholder="Masukkan radius dalam meter (10-1000)"
              value={formData.radius}
              onChangeText={(text) => {
                const numericValue = text.replace(/[^0-9]/g, "");
                if (numericValue === "" || numericValue.length <= 4) {
                  setFormData({ ...formData, radius: numericValue });
                }
              }}
              keyboardType="numeric"
              maxLength={4}
            />
            <Text style={styles.unitText}>m</Text>
          </View>
          <Text style={styles.helperText}>Rentang: 10-1000 meter</Text>
        </View>
      </ScrollView>

      <View style={styles.buttonFooter}>
        <TouchableOpacity
          style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
          onPress={handleSave}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons
                name="checkmark-circle-outline"
                size={20}
                color="#fff"
              />
              <Text style={styles.submitText}>Simpan Perubahan</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      <MapPicker
        visible={showMapPicker}
        onClose={() => setShowMapPicker(false)}
        onConfirm={(data) => {
          setLocationFromMap(data);
          setFormData({
            ...formData,
            alamat: data.address,
            latitude: data.latitude,
            longitude: data.longitude,
          });
          setShowMapPicker(false);
        }}
        initialLocation={
          locationFromMap
            ? {
                latitude: locationFromMap.latitude,
                longitude: locationFromMap.longitude,
              }
            : undefined
        }
      />
      
      <CustomAlert
        visible={visible}
        type={config.type}
        title={config.title}
        message={config.message}
        onClose={hideAlert}
        onConfirm={config.onConfirm ? handleConfirm : undefined}
        confirmText={config.confirmText}
        cancelText={config.cancelText}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFB" },
  content: { flex: 1, paddingHorizontal: 5, paddingTop: 20 },
  scrollContent: { paddingBottom: 20 },
  infoCard: {
    flexDirection: "row",
    backgroundColor: "#F0F8F7",
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    marginHorizontal: 15,
    alignItems: "flex-start",
  },
  infoText: { fontSize: 12, color: "#004643", lineHeight: 16 },
  infoContent: { flex: 1, marginLeft: 12 },
  formGroup: { marginBottom: 16, marginHorizontal: 15 },
  label: { fontSize: 14, fontWeight: "600", color: "#333", marginBottom: 8 },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 10,
    paddingHorizontal: 15,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: "#333",
    paddingVertical: 12,
    marginLeft: 10,
  },
  textArea: { textAlignVertical: "top", paddingTop: 12 },
  unitText: { fontSize: 14, color: "#666", fontWeight: "500", marginLeft: 8 },
  helperText: { fontSize: 11, color: "#666", marginTop: 4, marginLeft: 4 },
  buttonFooter: {
    backgroundColor: "white",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: "#e0e0e0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 5,
  },
  submitBtn: {
    backgroundColor: "#004643",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
    minHeight: 50,
  },
  submitBtnDisabled: { backgroundColor: "#ccc" },
  submitText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
    marginLeft: 6,
    textAlign: "center",
  },
  mapButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F0F8F7",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 10,
    marginTop: 10,
    borderWidth: 1,
    borderColor: "#004643",
    borderStyle: "dashed",
  },
  mapButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#004643",
    marginLeft: 8,
  },
  coordInfo: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E8F5E9",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  coordText: {
    fontSize: 11,
    color: "#2E7D32",
    marginLeft: 6,
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
  },
  warningInfo: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF3E0",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  warningText: { fontSize: 11, color: "#E65100", marginLeft: 6 },
  radioGroup: { flexDirection: "row", gap: 8 },
  radioBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: "#fff",
    gap: 6,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  radioBtnActive: { backgroundColor: "#004643", elevation: 3 },
  radioText: { fontSize: 13, color: "#666", fontWeight: "500" },
  radioTextActive: { color: "#fff" },
});
