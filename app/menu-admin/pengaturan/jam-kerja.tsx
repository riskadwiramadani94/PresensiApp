import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useRef, useState } from "react";
import {
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
import { AppHeader } from "../../../components";
import { CustomAlert } from "../../../components/CustomAlert";
import AnalogTimePicker from "../../../components/AnalogTimePicker";
import { useCustomAlert } from "../../../hooks/useCustomAlert";
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
  const alert = useCustomAlert();
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
        alert.showAlert({ type: 'error', message: result.message || 'Gagal menyimpan perubahan' });
      }
    } catch (error) {
      console.error("Toggle error:", error);
      alert.showAlert({ type: 'error', message: 'Gagal menyimpan perubahan' });
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
      alert.showAlert({ type: 'error', message: 'Semua jam harus diisi' });
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
        alert.showAlert({ type: 'success', message: 'Jam kerja berhasil diperbarui', autoClose: true });
      } else {
        alert.showAlert({ type: 'error', message: result.message || 'Gagal menyimpan perubahan' });
      }
    } catch (error) {
      console.error("Save edit error:", error);
      alert.showAlert({ type: 'error', message: 'Gagal menyimpan perubahan' });
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
            {loading ? (
              /* ========================================
                   SKELETON LOADING STATE - JAM KERJA
              ======================================== */
              <>
                {[1, 2, 3, 4, 5, 6, 7].map((item) => (
                  <View key={item} style={styles.hariCard}>
                    <View style={styles.cardHeader}>
                      <View style={styles.hariSection}>
                        <View style={styles.skeletonHariIcon} />
                        <View style={styles.hariInfo}>
                          <View style={styles.skeletonHariLabel} />
                          <View style={styles.skeletonHariNama} />
                        </View>
                      </View>
                      <View style={styles.hariRight}>
                        <View style={styles.skeletonSwitch} />
                      </View>
                    </View>

                    <View style={styles.cardDivider} />

                    <View style={styles.jamInfoGrid}>
                      <View style={styles.jamInfoRow}>
                        <View style={styles.skeletonJamIcon} />
                        <View style={styles.jamInfoContent}>
                          <View style={styles.skeletonJamLabel} />
                          <View style={styles.skeletonJamValue} />
                        </View>
                      </View>
                      <View style={styles.jamInfoRow}>
                        <View style={styles.skeletonJamIcon} />
                        <View style={styles.jamInfoContent}>
                          <View style={styles.skeletonJamLabel} />
                          <View style={styles.skeletonJamValueShort} />
                        </View>
                      </View>
                    </View>

                    <View style={styles.cardFooter}>
                      <View style={styles.statusContainer}>
                        <View style={styles.skeletonStatusIcon} />
                        <View style={styles.skeletonStatusText} />
                      </View>
                      <View style={styles.skeletonEditBtn} />
                    </View>
                  </View>
                ))}
              </>
            ) : (
              <>
                {jamKerjaList.map((item, index) => (
                <View key={index} style={styles.hariCard}>
                  <View style={styles.cardHeader}>
                    <View style={styles.hariSection}>
                      <View style={styles.hariIconBox}>
                        <Ionicons name="calendar-outline" size={16} color="#00695C" />
                      </View>
                      <View style={styles.hariInfo}>
                        <Text style={styles.hariLabel}>HARI KERJA</Text>
                        <Text style={styles.hariNama}>{item.hari}</Text>
                      </View>
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
                    </View>
                  </View>

                  <View style={styles.cardDivider} />

                  <View style={styles.jamInfoGrid}>
                    <View style={styles.jamInfoRow}>
                      <View style={styles.jamIconBox}>
                        <Ionicons name="time-outline" size={14} color="#00695C" />
                      </View>
                      <View style={styles.jamInfoContent}>
                        <Text style={styles.jamInfoLabel}>JAM KERJA</Text>
                        <Text style={styles.jamInfoValue}>
                          {item.jam_masuk && item.jam_pulang ? `${item.jam_masuk} - ${item.jam_pulang}` : "08:00 - 17:00"}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.jamInfoRow}>
                      <View style={styles.jamIconBox}>
                        <Ionicons name="alarm-outline" size={14} color="#00695C" />
                      </View>
                      <View style={styles.jamInfoContent}>
                        <Text style={styles.jamInfoLabel}>BATAS ABSEN</Text>
                        <Text style={styles.jamInfoValue}>{item.batas_absen || "08:30"}</Text>
                      </View>
                    </View>
                  </View>

                  <View style={styles.cardFooter}>
                    <View style={styles.statusContainer}>
                      <Ionicons 
                        name={item.is_kerja ? "checkmark-circle" : "close-circle"} 
                        size={16} 
                        color={item.is_kerja ? "#4CAF50" : "#F44336"} 
                      />
                      <Text style={[styles.statusText, { color: item.is_kerja ? "#4CAF50" : "#F44336" }]}>
                        {item.is_kerja ? "Hari Kerja Aktif" : "Libur"}
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={styles.editBtn}
                      onPress={() => handleEditJam(item, index)}
                    >
                      <Ionicons name="create-outline" size={18} color="#00695C" />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
              </>
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

              <View style={styles.timeRowGroup}>
                <View style={styles.timeInputHalf}>
                  <Text style={styles.label}>Jam Masuk</Text>
                  <TouchableOpacity
                    style={styles.timeButton}
                    onPress={() => setShowJamMasukPicker(true)}
                  >
                    <Text style={styles.timeButtonText}>{editJamMasuk}</Text>
                    <Ionicons name="time" size={20} color="#004643" />
                  </TouchableOpacity>
                </View>

                <View style={styles.timeInputHalf}>
                  <Text style={styles.label}>Jam Pulang</Text>
                  <TouchableOpacity
                    style={styles.timeButton}
                    onPress={() => setShowJamPulangPicker(true)}
                  >
                    <Text style={styles.timeButtonText}>{editJamPulang}</Text>
                    <Ionicons name="time" size={20} color="#004643" />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Batas Absen</Text>
                <TouchableOpacity
                  style={styles.timeButton}
                  onPress={() => setShowBatasAbsenPicker(true)}
                >
                  <Text style={styles.timeButtonText}>{editBatasAbsen}</Text>
                  <Ionicons name="time" size={20} color="#004643" />
                </TouchableOpacity>
              </View>

              <TouchableOpacity style={styles.saveBtn} onPress={handleSaveEdit}>
                <Text style={styles.saveText}>Simpan</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </View>
      </Modal>

      <AnalogTimePicker
        visible={showJamMasukPicker}
        initialTime={editJamMasuk}
        onTimeSelect={(time) => setEditJamMasuk(time)}
        onClose={() => setShowJamMasukPicker(false)}
      />

      <AnalogTimePicker
        visible={showBatasAbsenPicker}
        initialTime={editBatasAbsen}
        onTimeSelect={(time) => setEditBatasAbsen(time)}
        onClose={() => setShowBatasAbsenPicker(false)}
      />

      <AnalogTimePicker
        visible={showJamPulangPicker}
        initialTime={editJamPulang}
        onTimeSelect={(time) => setEditJamPulang(time)}
        onClose={() => setShowJamPulangPicker(false)}
      />

      <CustomAlert
        visible={alert.visible}
        type={alert.config.type}
        message={alert.config.message}
        onClose={alert.hideAlert}
        onConfirm={alert.handleConfirm}
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
    backgroundColor: '#FFF',
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
    marginHorizontal: 15,
    borderWidth: 1,
    borderColor: '#F0F3F3',
    shadowColor: '#004643',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  cardMainContent: { flex: 1 },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  hariSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  hariIconBox: {
    width: 32,
    height: 32,
    backgroundColor: '#F0F7F7',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  hariInfo: {
    flex: 1,
  },
  hariLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#95A5A6',
    letterSpacing: 1.1,
    marginBottom: 3,
  },
  hariNama: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1A1A1A',
    letterSpacing: -0.2,
  },
  hariRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginBottom: 12,
  },
  jamInfoGrid: {
    gap: 10,
    marginBottom: 12,
  },
  jamInfoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  jamIconBox: {
    width: 28,
    height: 28,
    backgroundColor: '#F0F7F7',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    marginTop: 2,
  },
  jamInfoContent: {
    flex: 1,
  },
  jamInfoLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#95A5A6',
    letterSpacing: 1.1,
    marginBottom: 3,
  },
  jamInfoValue: {
    color: '#576574',
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 16,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    marginHorizontal: -16,
    marginBottom: -16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginTop: 8,
    borderBottomLeftRadius: 18,
    borderBottomRightRadius: 18,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  statusText: {
    fontSize: 12,
    color: '#4CAF50',
    fontWeight: '600',
  },
  editBtn: {
    padding: 8,
    backgroundColor: '#F0F7F7',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E8F5F4',
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
  timeRowGroup: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    gap: 12,
  },
  timeInputHalf: {
    flex: 1,
  },
  timeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F5F5F5',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  timeButtonText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
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

  /* ========================================
     SKELETON STYLES - JAM KERJA
  ======================================== */
  skeletonHariIcon: {
    width: 32,
    height: 32,
    backgroundColor: '#F0F7F7',
    borderRadius: 12,
    marginRight: 12,
  },
  skeletonHariLabel: {
    width: 60,
    height: 9,
    backgroundColor: '#F0F0F0',
    borderRadius: 4,
    marginBottom: 3,
  },
  skeletonHariNama: {
    width: 50,
    height: 15,
    backgroundColor: '#E0E0E0',
    borderRadius: 4,
  },
  skeletonSwitch: {
    width: 51,
    height: 31,
    backgroundColor: '#E0E0E0',
    borderRadius: 16,
  },
  skeletonJamIcon: {
    width: 28,
    height: 28,
    backgroundColor: '#F0F7F7',
    borderRadius: 10,
    marginRight: 12,
    marginTop: 2,
  },
  skeletonJamLabel: {
    width: 50,
    height: 9,
    backgroundColor: '#F0F0F0',
    borderRadius: 4,
    marginBottom: 3,
  },
  skeletonJamValue: {
    width: 90,
    height: 13,
    backgroundColor: '#E0E0E0',
    borderRadius: 4,
  },
  skeletonJamValueShort: {
    width: 40,
    height: 13,
    backgroundColor: '#E0E0E0',
    borderRadius: 4,
  },
  skeletonStatusIcon: {
    width: 16,
    height: 16,
    backgroundColor: '#F0F0F0',
    borderRadius: 8,
  },
  skeletonStatusText: {
    width: 100,
    height: 12,
    backgroundColor: '#F0F0F0',
    borderRadius: 4,
    marginLeft: 6,
  },
  skeletonEditBtn: {
    width: 34,
    height: 34,
    backgroundColor: '#F0F7F7',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E8F5F4',
  },
});
