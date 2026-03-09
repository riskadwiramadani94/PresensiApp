import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import * as NavigationBar from "expo-navigation-bar";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useRef, useState } from "react";
import {
    Alert,
    Animated,
    Modal,
    PanResponder,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from "react-native";
import { AppHeader, SkeletonLoader, CustomAlert } from "../../../components";
import { useCustomAlert } from "../../../hooks/useCustomAlert";
import { PengaturanAPI } from "../../../constants/config";

/* ========================================
   TYPES & INTERFACES
======================================== */
interface HariLibur {
  id: number;
  tanggal: string;
  nama_libur: string;
  jenis: string;
  is_active?: number;
}

interface JamKerjaHari {
  hari: string;
  is_kerja: boolean;
}

/* ========================================
   MAIN COMPONENT
======================================== */
export default function KalenderLiburScreen() {
  const router = useRouter();
  const alert = useCustomAlert();
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [selectedHolidayInfo, setSelectedHolidayInfo] = useState<HariLibur | null>(null);
  const [successMessage, setSuccessMessage] = useState("");
  const [selectedHoliday, setSelectedHoliday] = useState<HariLibur | null>(null);
  const [hariLibur, setHariLibur] = useState<HariLibur[]>([]);
  const [jamKerja, setJamKerja] = useState<JamKerjaHari[]>([]);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [formData, setFormData] = useState({
    namaLibur: "",
    jenis: "nasional",
  });
  const translateY = useRef(new Animated.Value(500)).current;

  /* ========================================
     MODAL HANDLERS
  ======================================== */
  const openModal = () => {
    setShowModal(true);
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
      toValue: 500,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setShowModal(false);
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

  /* ========================================
     DATA FETCHING
  ======================================== */
  useFocusEffect(
    React.useCallback(() => {
      fetchHariLibur();
      fetchJamKerja();
    }, []),
  );

  const fetchHariLibur = async () => {
    try {
      setLoading(true);
      const response = await PengaturanAPI.getHariLibur();
      if (response.success && response.data) {
        setHariLibur(response.data);
      }
    } catch (error) {
      console.error("Error fetching hari libur:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchJamKerja = async () => {
    try {
      const response = await PengaturanAPI.getJamKerja();
      if (response.success && response.data) {
        setJamKerja(response.data);
      }
    } catch (error) {
      console.error("Error fetching jam kerja:", error);
    }
  };

  /* ========================================
     CALENDAR LOGIC
  ======================================== */
  const getDaysInMonth = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i));
    }
    return days;
  };

  const isWeekend = (date: Date | null) => {
    if (!date || jamKerja.length === 0) return false;
    const dayIndex = date.getDay();
    const hariMap = [
      "Minggu",
      "Senin",
      "Selasa",
      "Rabu",
      "Kamis",
      "Jumat",
      "Sabtu",
    ];
    const namaHari = hariMap[dayIndex];
    const jamKerjaHari = jamKerja.find((jk) => jk.hari === namaHari);
    return jamKerjaHari ? !jamKerjaHari.is_kerja : false;
  };

  const isHoliday = (date: Date | null) => {
    if (!date) return false;
    // Format tanggal lokal tanpa konversi timezone
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const dateStr = `${year}-${month}-${day}`;

    return hariLibur.some((h) => {
      // Konversi tanggal dari server (ISO format) ke format YYYY-MM-DD
      const serverDate = new Date(h.tanggal);
      const serverDateStr = `${serverDate.getFullYear()}-${String(serverDate.getMonth() + 1).padStart(2, "0")}-${String(serverDate.getDate()).padStart(2, "0")}`;
      return serverDateStr === dateStr && h.is_active !== 0;
    });
  };

  const getHolidayInfo = (date: Date | null) => {
    if (!date) return null;
    // Format tanggal lokal tanpa konversi timezone
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const dateStr = `${year}-${month}-${day}`;

    return hariLibur.find((h) => {
      // Konversi tanggal dari server (ISO format) ke format YYYY-MM-DD
      const serverDate = new Date(h.tanggal);
      const serverDateStr = `${serverDate.getFullYear()}-${String(serverDate.getMonth() + 1).padStart(2, "0")}-${String(serverDate.getDate()).padStart(2, "0")}`;
      return serverDateStr === dateStr && h.is_active !== 0;
    });
  };

  /* ========================================
     EVENT HANDLERS
  ======================================== */
  const handleDatePress = (date: Date | null) => {
    if (!date) return;
    const holiday = getHolidayInfo(date);
    if (holiday) {
      setSelectedHolidayInfo(holiday);
      setShowInfoModal(true);
    } else {
      setSelectedDate(date);
      setFormData({ namaLibur: "", jenis: "nasional" });
      openModal();
    }
  };

  const handleHolidayAction = (action: 'edit' | 'delete') => {
    setShowInfoModal(false);
    if (action === 'delete' && selectedHolidayInfo) {
      setSelectedHoliday(selectedHolidayInfo);
      setShowDeleteModal(true);
    }
    // Edit functionality can be added later if needed
  };

  const handleSaveHoliday = async () => {
    if (!selectedDate || !formData.namaLibur.trim()) {
      alert.showAlert({ type: 'error', message: 'Nama libur wajib diisi' });
      return;
    }

    try {
      setLoading(true);

      const year = selectedDate.getFullYear();
      const month = String(selectedDate.getMonth() + 1).padStart(2, "0");
      const day = String(selectedDate.getDate()).padStart(2, "0");
      const formattedDate = `${year}-${month}-${day}`;

      const response = await PengaturanAPI.saveHariLibur({
        tanggal: formattedDate,
        nama_libur: formData.namaLibur.trim(),
        jenis: formData.jenis,
      });

      if (response.success) {
        const newHoliday: HariLibur = {
          id: response.data?.id || Date.now(),
          tanggal: formattedDate,
          nama_libur: formData.namaLibur.trim(),
          jenis: formData.jenis,
        };

        setHariLibur((prev) => [...prev, newHoliday]);
        closeModal();
        setSuccessMessage("Hari libur berhasil ditambahkan");
        setShowSuccessModal(true);
        setTimeout(() => {
          setShowSuccessModal(false);
          fetchHariLibur();
        }, 1500);
      } else {
        alert.showAlert({ type: 'error', message: response.message || 'Gagal menyimpan hari libur' });
      }
    } catch (error) {
      alert.showAlert({ type: 'error', message: 'Terjadi kesalahan saat menyimpan' });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteHoliday = async () => {
    if (!selectedHoliday) return;
    setShowDeleteModal(false);
    try {
      const response = await PengaturanAPI.deleteHariLibur(selectedHoliday.id);
      if (response.success) {
        setHariLibur((prev) => prev.filter((h) => h.id !== selectedHoliday.id));
        setSuccessMessage("Hari libur berhasil dihapus");
        setShowSuccessModal(true);
        setTimeout(() => {
          setShowSuccessModal(false);
          fetchHariLibur();
        }, 1500);
      } else {
        alert.showAlert({ type: 'error', message: response.message || 'Gagal menghapus hari libur' });
      }
    } catch (error) {
      alert.showAlert({ type: 'error', message: 'Terjadi kesalahan saat menghapus' });
    }
  };

  const changeMonth = (direction: number) => {
    const newMonth = new Date(currentMonth);
    newMonth.setMonth(currentMonth.getMonth() + direction);
    setCurrentMonth(newMonth);
  };

  /* ========================================
     RENDER
  ======================================== */
  const days = getDaysInMonth();
  const monthName = currentMonth.toLocaleDateString("id-ID", {
    month: "long",
    year: "numeric",
  });

  return (
    <View style={styles.container}>
      <StatusBar
        style="light"
        translucent={true}
        backgroundColor="transparent"
      />

      <AppHeader title="Kalender Libur" showBack={true} />

      <ScrollView style={styles.content}>
        {loading ? (
          <>
            <View style={styles.skeletonCalendarCard}>
              <View style={styles.skeletonCalendarHeader}>
                <View style={styles.skeletonMonthBtn} />
                <View style={styles.skeletonMonthText} />
                <View style={styles.skeletonMonthBtn} />
              </View>
              <View style={styles.skeletonWeekDays} />
              <View style={styles.skeletonDaysGrid}>
                {[...Array(35)].map((_, i) => (
                  <View key={i} style={styles.skeletonDayCell} />
                ))}
              </View>
            </View>
            <View style={styles.skeletonLegendCard}>
              <View style={styles.skeletonLegendTitle} />
              <View style={styles.skeletonLegendItem} />
              <View style={styles.skeletonLegendItem} />
            </View>
            <View style={styles.skeletonListCard}>
              <View style={styles.skeletonListTitle} />
              {[...Array(3)].map((_, i) => (
                <View key={i} style={styles.skeletonListItem} />
              ))}
            </View>
          </>
        ) : (
          <>
            <View style={styles.calendarCard}>
              <View style={styles.calendarHeader}>
                <TouchableOpacity
                  onPress={() => changeMonth(-1)}
                  style={styles.monthBtn}
                >
                  <Ionicons name="chevron-back" size={24} color="#004643" />
                </TouchableOpacity>
                <Text style={styles.monthText}>{monthName}</Text>
                <TouchableOpacity
                  onPress={() => changeMonth(1)}
                  style={styles.monthBtn}
                >
                  <Ionicons name="chevron-forward" size={24} color="#004643" />
                </TouchableOpacity>
              </View>

              <View style={styles.weekDays}>
                {["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"].map(
                  (day, i) => (
                    <Text key={i} style={styles.weekDayText}>
                      {day}
                    </Text>
                  ),
                )}
              </View>

              <View style={styles.daysGrid}>
                {days.map((date, index) => {
                  const isWE = isWeekend(date);
                  const isHol = isHoliday(date);
                  const isToday =
                    date && date.toDateString() === new Date().toDateString();

                  return (
                    <TouchableOpacity
                      key={index}
                      style={[
                        styles.dayCell,
                        !date && styles.emptyCell,
                        (isWE || isHol) && styles.holidayCell,
                        isToday && styles.todayCell,
                      ]}
                      onPress={() => handleDatePress(date)}
                      disabled={!date}
                    >
                      {date && (
                        <Text
                          style={[
                            styles.dayText,
                            (isWE || isHol) && styles.holidayText,
                            isToday && styles.todayText,
                          ]}
                        >
                          {date.getDate()}
                        </Text>
                      )}
                      {isHol && <View style={styles.holidayDot} />}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            <View style={styles.legendCard}>
              <Text style={styles.legendTitle}>Keterangan:</Text>
              <View style={styles.legendItem}>
                <View
                  style={[styles.legendBox, { backgroundColor: "#FFEBEE" }]}
                />
                <Text style={styles.legendText}>
                  Hari Libur (dari pengaturan jam kerja)
                </Text>
              </View>
              <View style={styles.legendItem}>
                <View
                  style={[styles.legendBox, { backgroundColor: "#FFCDD2" }]}
                />
                <Text style={styles.legendText}>Hari Libur Khusus</Text>
              </View>
            </View>

            <View style={styles.listCard}>
              <Text style={styles.listTitle}>Daftar Hari Libur</Text>
              {hariLibur.length > 0 ? (
                hariLibur.map((item) => (
                  <View key={item.id} style={styles.listItem}>
                    <View style={styles.listItemLeft}>
                      <Ionicons name="calendar" size={16} color="#004643" />
                      <View style={styles.listItemInfo}>
                        <Text style={styles.listItemName}>
                          {item.nama_libur}
                        </Text>
                        <Text style={styles.listItemDate}>
                          {new Date(item.tanggal).toLocaleDateString("id-ID", {
                            day: "numeric",
                            month: "long",
                            year: "numeric",
                          })}
                        </Text>
                      </View>
                    </View>
                    <TouchableOpacity
                      onPress={() => {
                        setSelectedHoliday(item);
                        setShowDeleteModal(true);
                      }}
                    >
                      <Ionicons
                        name="trash-outline"
                        size={20}
                        color="#F44336"
                      />
                    </TouchableOpacity>
                  </View>
                ))
              ) : (
                <Text style={styles.emptyText}>
                  Belum ada hari libur yang ditambahkan
                </Text>
              )}
            </View>
          </>
        )}
      </ScrollView>

      <Modal
        visible={showModal}
        transparent
        animationType="none"
        statusBarTranslucent={true}
        onRequestClose={closeModal}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={closeModal}
          />
          <Animated.View
            style={[styles.bottomSheetModal, { transform: [{ translateY }] }]}
          >
            {/* Handle Bar */}
            <View {...panResponder.panHandlers} style={styles.handleContainer}>
              <View style={styles.handleBar} />
            </View>

            {/* Content */}
            <View style={styles.bottomSheetContent}>
              <Text style={styles.modalTitle}>Tambah Hari Libur</Text>

              <Text style={styles.modalDate}>
                {selectedDate?.toLocaleDateString("id-ID", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </Text>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Nama Libur *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Contoh: Hari Raya Idul Fitri"
                  value={formData.namaLibur}
                  onChangeText={(text) =>
                    setFormData({ ...formData, namaLibur: text })
                  }
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Jenis Libur</Text>
                <View style={styles.radioGroup}>
                  {["nasional", "keagamaan", "perusahaan"].map((jenis) => (
                    <TouchableOpacity
                      key={jenis}
                      style={[
                        styles.radioBtn,
                        formData.jenis === jenis && styles.radioBtnActive,
                      ]}
                      onPress={() => setFormData({ ...formData, jenis })}
                    >
                      <Text
                        style={[
                          styles.radioText,
                          formData.jenis === jenis && styles.radioTextActive,
                        ]}
                      >
                        {jenis.charAt(0).toUpperCase() + jenis.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <TouchableOpacity
                style={[styles.saveBtn, loading && styles.saveBtnDisabled]}
                onPress={handleSaveHoliday}
                disabled={loading}
              >
                <Text style={styles.saveBtnText}>
                  {loading ? "Menyimpan..." : "Simpan"}
                </Text>
              </TouchableOpacity>
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
            <Text style={styles.deleteModalMessage}>Hapus hari libur ini?</Text>
            <View style={styles.deleteModalButtons}>
              <TouchableOpacity
                style={styles.deleteCancelButton}
                onPress={() => setShowDeleteModal(false)}
              >
                <Text style={styles.deleteCancelButtonText}>Batal</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.deleteConfirmButton}
                onPress={handleDeleteHoliday}
              >
                <Text style={styles.deleteConfirmButtonText}>Hapus</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Holiday Info Modal */}
      <Modal
        visible={showInfoModal}
        transparent={true}
        animationType="fade"
        statusBarTranslucent={true}
        onRequestClose={() => setShowInfoModal(false)}
      >
        <View style={styles.infoModalOverlay}>
          <View style={styles.infoModalContainer}>
            <View style={styles.infoIconContainer}>
              <Ionicons name="calendar" size={48} color="#fff" />
            </View>
            
            <Text style={styles.infoModalTitle}>Hari Libur</Text>
            
            {selectedHolidayInfo && (
              <>
                <Text style={styles.infoModalDate}>
                  {new Date(selectedHolidayInfo.tanggal).toLocaleDateString('id-ID', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </Text>
                
                <Text style={styles.infoModalName}>
                  {selectedHolidayInfo.nama_libur}
                </Text>
                
                <Text style={styles.infoModalType}>
                  Jenis: {selectedHolidayInfo.jenis.charAt(0).toUpperCase() + selectedHolidayInfo.jenis.slice(1)}
                </Text>
              </>
            )}
            
            <View style={styles.infoModalButtons}>
              <TouchableOpacity
                style={styles.infoCloseButtonFull}
                onPress={() => setShowInfoModal(false)}
              >
                <Text style={styles.infoCloseButtonText}>Tutup</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Success Modal */}
      <Modal
        visible={showSuccessModal}
        transparent={true}
        animationType="fade"
        statusBarTranslucent={true}
      >
        <View style={styles.successModalOverlay}>
          <View style={styles.successModalContainer}>
            <View style={styles.successIconContainer}>
              <Ionicons name="checkmark-circle-outline" size={48} color="#fff" />
            </View>
            <Text style={styles.successMessage}>{successMessage}</Text>
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

/* ========================================
   STYLES
======================================== */
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFB" },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 15,
  },
  infoCard: {
    flexDirection: "row",
    backgroundColor: "#F0F8F7",
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
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
  calendarCard: {
    backgroundColor: '#FFF',
    borderRadius: 18,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E8F0EF',
    shadowColor: '#004643',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  calendarHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  monthBtn: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: "#F5F5F5",
  },
  monthText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  weekDays: {
    flexDirection: "row",
    marginBottom: 12,
    paddingVertical: 8,
    backgroundColor: "#F8F9FA",
    borderRadius: 8,
  },
  weekDayText: {
    flex: 1,
    textAlign: "center",
    fontSize: 11,
    fontWeight: "600",
    color: "#666",
  },
  daysGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  dayCell: {
    width: "14.28%",
    height: 32,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 6,
    marginBottom: 4,
  },
  emptyCell: {
    backgroundColor: "transparent",
  },
  holidayCell: {
    backgroundColor: "#FFEBEE",
    borderWidth: 1,
    borderColor: "#E53E3E",
  },
  todayCell: {
    backgroundColor: "#004643",
    elevation: 2,
    shadowColor: "#004643",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
  },
  dayText: {
    fontSize: 13,
    color: "#333",
    fontWeight: "500",
  },
  holidayText: {
    color: "#E53E3E",
    fontWeight: "600",
  },
  todayText: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  holidayDot: {
    position: "absolute",
    bottom: 2,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#E53E3E",
  },
  legendCard: {
    backgroundColor: '#FFF',
    borderRadius: 18,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E8F0EF',
    shadowColor: '#004643',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  legendTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 12,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  legendBox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    marginRight: 12,
  },
  legendText: {
    fontSize: 13,
    color: "#666",
  },
  listCard: {
    backgroundColor: '#FFF',
    borderRadius: 18,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E8F0EF',
    shadowColor: '#004643',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  listTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 16,
  },
  listItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  listItemLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  listItemInfo: {
    marginLeft: 12,
    flex: 1,
  },
  listItemName: {
    fontSize: 15,
    fontWeight: "500",
    color: "#333",
    marginBottom: 4,
  },
  listItemDate: {
    fontSize: 13,
    color: "#666",
  },
  emptyText: {
    fontSize: 13,
    color: "#999",
    textAlign: "center",
    paddingVertical: 24,
  },
  skeletonInfoCard: {
    height: 60,
    backgroundColor: "#E0E0E0",
    borderRadius: 12,
    marginBottom: 16,
  },
  skeletonCalendarCard: {
    backgroundColor: '#FFF',
    borderRadius: 18,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E8F0EF',
    elevation: 3,
  },
  skeletonCalendarHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  skeletonMonthBtn: {
    width: 40,
    height: 40,
    backgroundColor: "#E0E0E0",
    borderRadius: 8,
  },
  skeletonMonthText: {
    width: 120,
    height: 20,
    backgroundColor: "#E0E0E0",
    borderRadius: 4,
  },
  skeletonWeekDays: {
    height: 30,
    backgroundColor: "#E0E0E0",
    borderRadius: 8,
    marginBottom: 12,
  },
  skeletonDaysGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  skeletonDayCell: {
    width: "14.28%",
    height: 32,
    backgroundColor: "#E0E0E0",
    borderRadius: 6,
    marginBottom: 4,
  },
  skeletonLegendCard: {
    backgroundColor: '#FFF',
    borderRadius: 18,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E8F0EF',
    elevation: 3,
  },
  skeletonLegendTitle: {
    width: 100,
    height: 18,
    backgroundColor: "#E0E0E0",
    borderRadius: 4,
    marginBottom: 12,
  },
  skeletonLegendItem: {
    height: 18,
    backgroundColor: "#E0E0E0",
    borderRadius: 4,
    marginBottom: 10,
  },
  skeletonListCard: {
    backgroundColor: '#FFF',
    borderRadius: 18,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E8F0EF',
    elevation: 3,
  },
  skeletonListTitle: {
    width: 140,
    height: 18,
    backgroundColor: "#E0E0E0",
    borderRadius: 4,
    marginBottom: 16,
  },
  skeletonListItem: {
    height: 50,
    backgroundColor: "#E0E0E0",
    borderRadius: 8,
    marginBottom: 12,
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
    backgroundColor: "#fff",
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
  bottomSheetContent: {
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 8,
  },
  modalDate: {
    fontSize: 14,
    color: "#004643",
    marginBottom: 20,
    fontWeight: "500",
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
  },
  input: {
    backgroundColor: "#F5F5F5",
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    color: "#333",
  },
  radioGroup: {
    flexDirection: "row",
    gap: 8,
  },
  radioBtn: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: "#F5F5F5",
    alignItems: "center",
  },
  radioBtnActive: {
    backgroundColor: "#004643",
  },
  radioText: {
    fontSize: 12,
    color: "#666",
    fontWeight: "500",
  },
  radioTextActive: {
    color: "#fff",
  },
  saveBtn: {
    backgroundColor: "#004643",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
    minHeight: 50,
  },
  saveBtnDisabled: {
    backgroundColor: "#999",
  },
  saveBtnText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
    marginLeft: 6,
    textAlign: "center",
  },

  deleteModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30,
  },
  deleteModalContainer: {
    backgroundColor: '#004643',
    borderRadius: 20,
    padding: 32,
    width: '100%',
    maxWidth: 300,
    alignItems: 'center',
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
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  deleteModalMessage: {
    fontSize: 18,
    color: '#fff',
    textAlign: 'center',
    marginBottom: 28,
    fontWeight: '600',
  },
  deleteModalButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  deleteCancelButton: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  deleteCancelButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
  deleteConfirmButton: {
    flex: 1,
    backgroundColor: '#F44336',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  deleteConfirmButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },

  successModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30,
  },
  successModalContainer: {
    backgroundColor: '#004643',
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    minWidth: 200,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  successIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  successMessage: {
    fontSize: 18,
    color: '#fff',
    textAlign: 'center',
    fontWeight: '600',
  },

  // Holiday Info Modal Styles
  infoModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30,
  },
  infoModalContainer: {
    backgroundColor: '#004643',
    borderRadius: 20,
    padding: 32,
    width: '100%',
    maxWidth: 320,
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  infoIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  infoModalTitle: {
    fontSize: 20,
    color: '#fff',
    fontWeight: '700',
    marginBottom: 16,
  },
  infoModalDate: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    marginBottom: 12,
  },
  infoModalName: {
    fontSize: 18,
    color: '#fff',
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 8,
  },
  infoModalType: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
    marginBottom: 24,
  },
  infoModalButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  infoCloseButtonFull: {
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  infoCloseButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
  infoDeleteButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
});
