import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { StatusBar } from 'expo-status-bar';
import DateTimePickerModal from "react-native-modal-datetime-picker";
import { PengaturanAPI, API_CONFIG, getApiUrl } from "../../constants/config";
import { AppHeader, SkeletonLoader } from "../../components";

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
  const [showEditModal, setShowEditModal] = useState(false);
  const [editIndex, setEditIndex] = useState(-1);
  const [editJamMasuk, setEditJamMasuk] = useState("");
  const [editBatasAbsen, setEditBatasAbsen] = useState("");
  const [editJamPulang, setEditJamPulang] = useState("");
  const [showJamMasukPicker, setShowJamMasukPicker] = useState(false);
  const [showBatasAbsenPicker, setShowBatasAbsenPicker] = useState(false);
  const [showJamPulangPicker, setShowJamPulangPicker] = useState(false);
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

  const toggleHariKerja = (index: number) => {
    const updated = [...jamKerjaList];
    updated[index].is_kerja = !updated[index].is_kerja;
    setJamKerjaList(updated);
  };

  const handleEditJam = (item: JamKerjaHari, index: number) => {
    setEditIndex(index);
    setEditJamMasuk(item.jam_masuk);
    setEditBatasAbsen(item.batas_absen);
    setEditJamPulang(item.jam_pulang);
    setShowEditModal(true);
  };

  const handleSaveEdit = () => {
    if (!editJamMasuk || !editBatasAbsen || !editJamPulang) {
      Alert.alert("Error", "Semua jam harus diisi");
      return;
    }
    const updated = [...jamKerjaList];
    updated[editIndex].jam_masuk = editJamMasuk;
    updated[editIndex].batas_absen = editBatasAbsen;
    updated[editIndex].jam_pulang = editJamPulang;
    setJamKerjaList(updated);
    setShowEditModal(false);
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

  const handleSave = async () => {
    try {
      setLoading(true);
      
      const payload = { jam_kerja: jamKerjaList };
      console.log('Trying payload format:', JSON.stringify(payload, null, 2));
      
      const response = await fetch(getApiUrl(API_CONFIG.ENDPOINTS.JAM_KERJA), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      
      const responseText = await response.text();
      console.log('Response status:', response.status);
      console.log('Raw response:', responseText);
      
      let result;
      try {
        result = JSON.parse(responseText);
      } catch (parseError) {
        console.error('JSON parse error:', parseError);
        setLoading(false);
        Alert.alert("Error", `Server response error: ${responseText}`);
        return;
      }

      if (response.ok && result.success) {
        Alert.alert("Sukses", "Pengaturan jam kerja berhasil disimpan", [
          {
            text: "OK",
            onPress: () => {
              setLoading(false);
              router.back();
            },
          },
        ]);
      } else {
        setLoading(false);
        
        // Handle specific database error
        if (result.message && result.message.includes('beginTransaction')) {
          Alert.alert(
            "Error Database", 
            "Terjadi masalah pada server database. Silakan hubungi administrator sistem.\n\nDetail: " + result.message,
            [
              { text: "OK" },
              { 
                text: "Kembali", 
                onPress: () => router.back() 
              }
            ]
          );
        } else {
          Alert.alert("Error", result.message || `Server error: ${response.status}`);
        }
      }
    } catch (error) {
      setLoading(false);
      console.error('Save error:', error);
      Alert.alert("Error", `Network error: ${error.message}`);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
    >
      <StatusBar style="light" translucent={true} backgroundColor="transparent" />
      
      <AppHeader 
        title="Jam Kerja"
        showBack={true}
      />

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
              <SkeletonLoader type="schedule" count={7} message="Memuat jam kerja..." />
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
                      />

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

      {/* Button Footer - Fixed di bawah seperti header */}
      <View style={styles.buttonFooter}>
        <TouchableOpacity
          style={[styles.saveBtn, loading && styles.saveBtnDisabled]}
          onPress={handleSave}
          disabled={loading}
        >
          {loading ? (
            <>
              <Ionicons name="hourglass-outline" size={20} color="#fff" />
              <Text style={styles.saveBtnText}>Menyimpan...</Text>
            </>
          ) : (
            <>
              <Ionicons name="checkmark-circle-outline" size={20} color="#fff" />
              <Text style={styles.saveBtnText}>Simpan Jam Kerja</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Edit Modal */}
      <Modal visible={showEditModal} animationType="none" transparent statusBarTranslucent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>
              Edit Jam Kerja{" "}
              {editIndex >= 0 ? jamKerjaList[editIndex].hari : ""}
            </Text>

            <View style={styles.modalInputGroup}>
              <Text style={styles.modalLabel}>Jam Masuk</Text>
              <View style={styles.modalInputWrapper}>
                <Ionicons name="time-outline" size={20} color="#666" />
                <TextInput
                  style={styles.modalInput}
                  placeholder="08:00"
                  value={editJamMasuk}
                  onChangeText={(text) => setEditJamMasuk(formatJam(text))}
                  keyboardType="numeric"
                  maxLength={5}
                />
                <TouchableOpacity
                  onPress={() => setShowJamMasukPicker(true)}
                  style={styles.timeButton}
                >
                  <Ionicons name="time" size={20} color="#004643" />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.modalInputGroup}>
              <Text style={styles.modalLabel}>Batas Absen</Text>
              <View style={styles.modalInputWrapper}>
                <Ionicons name="time-outline" size={20} color="#666" />
                <TextInput
                  style={styles.modalInput}
                  placeholder="08:30"
                  value={editBatasAbsen}
                  onChangeText={(text) => setEditBatasAbsen(formatJam(text))}
                  keyboardType="numeric"
                  maxLength={5}
                />
                <TouchableOpacity
                  onPress={() => setShowBatasAbsenPicker(true)}
                  style={styles.timeButton}
                >
                  <Ionicons name="time" size={20} color="#004643" />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.modalInputGroup}>
              <Text style={styles.modalLabel}>Jam Pulang</Text>
              <View style={styles.modalInputWrapper}>
                <Ionicons name="time-outline" size={20} color="#666" />
                <TextInput
                  style={styles.modalInput}
                  placeholder="17:00"
                  value={editJamPulang}
                  onChangeText={(text) => setEditJamPulang(formatJam(text))}
                  keyboardType="numeric"
                  maxLength={5}
                />
                <TouchableOpacity
                  onPress={() => setShowJamPulangPicker(true)}
                  style={styles.timeButton}
                >
                  <Ionicons name="time" size={20} color="#004643" />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalBtnCancel}
                onPress={() => setShowEditModal(false)}
              >
                <Text style={styles.modalBtnCancelText}>Batal</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalBtnSave}
                onPress={handleSaveEdit}
              >
                <Text style={styles.modalBtnSaveText}>Simpan</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Time Picker Modals */}
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
  hariBatas: {
    fontSize: 12,
    color: "#999",
    marginTop: 2,
  },
  hariRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 15,
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
  saveBtn: {
    backgroundColor: "#004643",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
    minHeight: 50
  },
  saveBtnDisabled: {
    backgroundColor: "#999",
  },
  saveBtnText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
    marginLeft: 6,
    textAlign: "center"
  },
  buttonFooter: {
    backgroundColor: 'white',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContainer: {
    backgroundColor: "#fff",
    borderRadius: 15,
    padding: 20,
    width: "85%",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#004643",
    marginBottom: 20,
    textAlign: "center",
  },
  modalInputGroup: {
    marginBottom: 15,
  },
  modalLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
  },
  modalInputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFB",
    borderRadius: 10,
    paddingHorizontal: 15,
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  modalInput: {
    flex: 1,
    fontSize: 16,
    color: "#333",
    paddingVertical: 12,
    marginLeft: 10,
  },
  timeButton: {
    padding: 8,
    borderRadius: 6,
    backgroundColor: "#F0F8F0",
  },
  modalButtons: {
    flexDirection: "row",
    gap: 10,
    marginTop: 20,
  },
  modalBtnCancel: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: "#F5F5F5",
    alignItems: "center",
  },
  modalBtnCancelText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#666",
  },
  modalBtnSave: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: "#004643",
    alignItems: "center",
  },
  modalBtnSaveText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },
});
