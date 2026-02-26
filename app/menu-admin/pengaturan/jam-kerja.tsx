import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useRef, useState } from "react";
import {
    Alert,
    Animated,
    Dimensions,
    KeyboardAvoidingView,
    Modal,
    PanResponder,
    Platform,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import DateTimePickerModal from "react-native-modal-datetime-picker";
import { AppHeader, SkeletonLoader } from "../../../components";
import {
    API_CONFIG,
    getApiUrl,
    PengaturanAPI,
} from "../../../constants/config";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

interface JamKerjaHari {
  hari: string;
  jam_masuk: string;
  batas_absen: string;
  jam_pulang: string;
  is_kerja: boolean;
}

export default function JamKerjaScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [savingIndex, setSavingIndex] = useState<number | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editIndex, setEditIndex] = useState(-1);
  const [editJamMasuk, setEditJamMasuk] = useState("");
  const [editBatasAbsen, setEditBatasAbsen] = useState("");
  const [editJamPulang, setEditJamPulang] = useState("");
  const [showJamMasukPicker, setShowJamMasukPicker] = useState(false);
  const [showBatasAbsenPicker, setShowBatasAbsenPicker] = useState(false);
  const [showJamPulangPicker, setShowJamPulangPicker] = useState(false);
  const translateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const [jamKerjaList, setJamKerjaList] = useState<JamKerjaHari[]>([
    {
      hari: "Senin",
      jam_masuk: "08:00",
      batas_absen: "08:30",
      jam_pulang: "17:00",
      is_kerja: true,
    },
    {
      hari: "Selasa",
      jam_masuk: "08:00",
      batas_absen: "08:30",
      jam_pulang: "17:00",
      is_kerja: true,
    },
    {
      hari: "Rabu",
      jam_masuk: "08:00",
      batas_absen: "08:30",
      jam_pulang: "17:00",
      is_kerja: true,
    },
    {
      hari: "Kamis",
      jam_masuk: "08:00",
      batas_absen: "08:30",
      jam_pulang: "17:00",
      is_kerja: true,
    },
    {
      hari: "Jumat",
      jam_masuk: "08:00",
      batas_absen: "08:30",
      jam_pulang: "16:30",
      is_kerja: true,
    },
    {
      hari: "Sabtu",
      jam_masuk: "08:00",
      batas_absen: "08:30",
      jam_pulang: "12:00",
      is_kerja: false,
    },
    {
      hari: "Minggu",
      jam_masuk: "08:00",
      batas_absen: "08:30",
      jam_pulang: "17:00",
      is_kerja: false,
    },
  ]);

  useEffect(() => {
    fetchJamKerja();
  }, []);

  const fetchJamKerja = async () => {
    try {
      setLoading(true);
      const response = await PengaturanAPI.getJamKerja();
      if (response.success && response.data) {
        setJamKerjaList(response.data);
      }
    } catch (error) {
      console.error("Error fetching jam kerja:", error);
    } finally {
      setLoading(false);
    }
  };

  const toggleHariKerja = async (index: number) => {
    try {
      setSavingIndex(index);
      const updated = [...jamKerjaList];
      updated[index].is_kerja = !updated[index].is_kerja;

      const payload = { jam_kerja: updated };
      const response = await fetch(getApiUrl(API_CONFIG.ENDPOINTS.JAM_KERJA), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        setJamKerjaList(updated);
      } else {
        Alert.alert("Error", result.message || "Gagal menyimpan perubahan");
      }
    } catch (error) {
      console.error("Toggle error:", error);
      Alert.alert("Error", "Gagal menyimpan perubahan");
    } finally {
      setSavingIndex(null);
    }
  };

  const handleEditJam = (item: JamKerjaHari, index: number) => {
    setEditIndex(index);
    setEditJamMasuk(item.jam_masuk);
    setEditBatasAbsen(item.batas_absen);
    setEditJamPulang(item.jam_pulang);
    openModal();
  };

  const openModal = () => {
    setShowEditModal(true);
    Animated.spring(translateY, {
      toValue: 0,
      useNativeDriver: true,
      tension: 65,
      friction: 11,
    }).start();
  };

  const closeModal = () => {
    Animated.timing(translateY, {
      toValue: SCREEN_HEIGHT,
      duration: 250,
      useNativeDriver: true,
    }).start(() => {
      setShowEditModal(false);
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
        closeModal();
      } else {
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: true,
        }).start();
      }
    },
  });

  const handleSaveEdit = async () => {
    if (!editJamMasuk || !editBatasAbsen || !editJamPulang) {
      Alert.alert("Error", "Semua jam harus diisi");
      return;
    }

    try {
      setLoading(true);
      const updated = [...jamKerjaList];
      updated[editIndex].jam_masuk = editJamMasuk;
      updated[editIndex].batas_absen = editBatasAbsen;
      updated[editIndex].jam_pulang = editJamPulang;

      const payload = { jam_kerja: updated };
      const response = await fetch(getApiUrl(API_CONFIG.ENDPOINTS.JAM_KERJA), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        setJamKerjaList(updated);
        closeModal();
        Alert.alert("Sukses", "Jam kerja berhasil diperbarui");
      } else {
        Alert.alert("Error", result.message || "Gagal menyimpan perubahan");
      }
    } catch (error) {
      console.error("Save edit error:", error);
      Alert.alert("Error", "Gagal menyimpan perubahan");
    } finally {
      setLoading(false);
    }
  };

  const formatJam = (text: string) => {
    const cleaned = text.replace(/\D/g, "");
    if (cleaned.length >= 3) {
      return `${cleaned.slice(0, 2)}:${cleaned.slice(2, 4)}`;
    }
    return cleaned;
  };

  const formatTime = (time: Date) => {
    const hours = String(time.getHours()).padStart(2, "0");
    const minutes = String(time.getMinutes()).padStart(2, "0");
    return `${hours}:${minutes}`;
  };

  const handleJamMasukConfirm = (time: Date) => {
    const formattedTime = formatTime(time);
    setEditJamMasuk(formattedTime);
    setShowJamMasukPicker(false);
  };

  const handleBatasAbsenConfirm = (time: Date) => {
    const formattedTime = formatTime(time);
    setEditBatasAbsen(formattedTime);
    setShowBatasAbsenPicker(false);
  };

  const handleJamPulangConfirm = (time: Date) => {
    const formattedTime = formatTime(time);
    setEditJamPulang(formattedTime);
    setShowJamPulangPicker(false);
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
    >
      <StatusBar
        style="light"
        translucent={true}
        backgroundColor="transparent"
      />

      <AppHeader title="Jam Kerja" showBack={true} />

      <View style={styles.contentWrapper}>
        <ScrollView
          style={styles.contentContainer}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.content}>
            <View style={styles.infoCard}>
              <Ionicons name="information-circle" size={20} color="#004643" />
              <Text style={styles.infoText}>
                Atur jam kerja per hari. Hari libur akan ditandai merah di
                kalender
              </Text>
            </View>

            {loading ? (
              <SkeletonLoader
                type="schedule"
                count={7}
                message="Memuat jam kerja..."
              />
            ) : (
              jamKerjaList.map((item, index) => (
                <View key={index} style={styles.hariCard}>
                  <View style={styles.hariInfo}>
                    <View style={styles.hariLeft}>
                      <Text style={styles.hariNama}>{item.hari}</Text>
                      <Text style={styles.hariJam}>
                        {item.is_kerja
                          ? `${item.jam_masuk} - ${item.jam_pulang}`
                          : "Libur"}
                      </Text>
                    </View>

                    <View style={styles.hariRight}>
                      <Switch
                        value={item.is_kerja}
                        onValueChange={() => toggleHariKerja(index)}
                        trackColor={{ false: "#E0E0E0", true: "#A8D5BA" }}
                        thumbColor={item.is_kerja ? "#004643" : "#f4f3f4"}
                        disabled={savingIndex === index}
                      />
                      {savingIndex === index && (
                        <Ionicons
                          name="hourglass-outline"
                          size={16}
                          color="#004643"
                        />
                      )}

                      <TouchableOpacity
                        style={[
                          styles.editBtn,
                          !item.is_kerja && styles.editBtnDisabled,
                        ]}
                        onPress={() =>
                          item.is_kerja && handleEditJam(item, index)
                        }
                        disabled={!item.is_kerja}
                      >
                        <Ionicons
                          name="create-outline"
                          size={20}
                          color={item.is_kerja ? "#004643" : "#ccc"}
                        />
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              ))
            )}
          </View>
        </ScrollView>
      </View>

      <Modal
        visible={showEditModal}
        transparent
        animationType="none"
        statusBarTranslucent
        onRequestClose={closeModal}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={closeModal}
          />
          <Animated.View
            style={[styles.bottomSheet, { transform: [{ translateY }] }]}
          >
            <View {...panResponder.panHandlers} style={styles.handleContainer}>
              <View style={styles.handleBar} />
            </View>

            <View style={styles.sheetContent}>
              <Text style={styles.sheetTitle}>
                Edit Jam Kerja{" "}
                {editIndex >= 0 ? jamKerjaList[editIndex].hari : ""}
              </Text>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Jam Masuk</Text>
                <View style={styles.inputWrapper}>
                  <TextInput
                    style={styles.input}
                    placeholder="08:00"
                    value={editJamMasuk}
                    onChangeText={(text) => setEditJamMasuk(formatJam(text))}
                    keyboardType="numeric"
                    maxLength={5}
                  />
                  <TouchableOpacity
                    style={styles.iconButton}
                    onPress={() => setShowJamMasukPicker(true)}
                  >
                    <Ionicons name="time" size={20} color="#004643" />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Batas Absen</Text>
                <View style={styles.inputWrapper}>
                  <TextInput
                    style={styles.input}
                    placeholder="08:30"
                    value={editBatasAbsen}
                    onChangeText={(text) => setEditBatasAbsen(formatJam(text))}
                    keyboardType="numeric"
                    maxLength={5}
                  />
                  <TouchableOpacity
                    style={styles.iconButton}
                    onPress={() => setShowBatasAbsenPicker(true)}
                  >
                    <Ionicons name="time" size={20} color="#004643" />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Jam Pulang</Text>
                <View style={styles.inputWrapper}>
                  <TextInput
                    style={styles.input}
                    placeholder="17:00"
                    value={editJamPulang}
                    onChangeText={(text) => setEditJamPulang(formatJam(text))}
                    keyboardType="numeric"
                    maxLength={5}
                  />
                  <TouchableOpacity
                    style={styles.iconButton}
                    onPress={() => setShowJamPulangPicker(true)}
                  >
                    <Ionicons name="time" size={20} color="#004643" />
                  </TouchableOpacity>
                </View>
              </View>

              <TouchableOpacity style={styles.saveBtn} onPress={handleSaveEdit}>
                <Text style={styles.saveText}>Simpan</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </View>
      </Modal>

      <DateTimePickerModal
        isVisible={showJamMasukPicker}
        mode="time"
        onConfirm={handleJamMasukConfirm}
        onCancel={() => setShowJamMasukPicker(false)}
        is24Hour={true}
        display="default"
      />

      <DateTimePickerModal
        isVisible={showBatasAbsenPicker}
        mode="time"
        onConfirm={handleBatasAbsenConfirm}
        onCancel={() => setShowBatasAbsenPicker(false)}
        is24Hour={true}
        display="default"
      />

      <DateTimePickerModal
        isVisible={showJamPulangPicker}
        mode="time"
        onConfirm={handleJamPulangConfirm}
        onCancel={() => setShowJamPulangPicker(false)}
        is24Hour={true}
        display="default"
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFB" },
  contentWrapper: {
    flex: 1,
  },
  contentContainer: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 5,
    paddingTop: 15,
    paddingBottom: 20,
  },
  infoCard: {
    flexDirection: "row",
    backgroundColor: "#F0F8F7",
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    marginHorizontal: 15,
    alignItems: "flex-start",
    borderWidth: 1,
    borderColor: "#D0E8E4",
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    color: "#004643",
    marginLeft: 12,
    lineHeight: 16,
  },
  hariCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 15,
    marginBottom: 12,
    marginHorizontal: 15,
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  hariInfo: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  hariLeft: {
    flex: 1,
  },
  hariNama: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 4,
  },
  hariJam: {
    fontSize: 14,
    color: "#666",
  },
  hariRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    minWidth: 100,
    justifyContent: "flex-end",
  },
  editBtn: {
    padding: 8,
    backgroundColor: "#F0F8F7",
    borderRadius: 8,
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  editBtnDisabled: {
    backgroundColor: "#F5F5F5",
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
  inputWrapper: {
    position: "relative",
    flexDirection: "row",
    alignItems: "center",
  },
  input: {
    flex: 1,
    backgroundColor: "#F5F5F5",
    borderRadius: 10,
    padding: 12,
    paddingRight: 45,
    fontSize: 14,
    color: "#333",
  },
  iconButton: {
    position: "absolute",
    right: 12,
    padding: 4,
  },
  saveBtn: {
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
});
