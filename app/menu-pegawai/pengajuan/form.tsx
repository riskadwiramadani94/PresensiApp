import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Platform, Image, Modal, Animated, PanResponder } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppHeader } from '../../../components';
import { PegawaiAPI, API_CONFIG, fetchWithRetry } from '../../../constants/config';
import * as ImagePicker from 'expo-image-picker';
import CustomCalendar from '../../../components/CustomCalendar';
import AnalogTimePicker from '../../../components/AnalogTimePicker';
import { CustomAlert } from '../../../components/CustomAlert';
import { useCustomAlert } from '../../../hooks/useCustomAlert';

export default function PengajuanScreen() {
  const router = useRouter();
  const [userId, setUserId] = useState<string>('');
  const [jenisPengajuan, setJenisPengajuan] = useState('');
  const [tanggalMulai, setTanggalMulai] = useState(new Date());
  const [tanggalSelesai, setTanggalSelesai] = useState(new Date());
  const [jamMulai, setJamMulai] = useState('08:00');
  const [jamSelesai, setJamSelesai] = useState('17:00');
  const [alasan, setAlasan] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [showTimePickerSelesai, setShowTimePickerSelesai] = useState(false);
  const [datePickerMode, setDatePickerMode] = useState<'mulai' | 'selesai'>('mulai');
  const [showCalendarModal, setShowCalendarModal] = useState(false);
  const [calendarMode, setCalendarMode] = useState<'single' | 'range'>('single');
  const calendarTranslateY = useRef(new Animated.Value(500)).current;
  const [timePickerMode, setTimePickerMode] = useState<'mulai' | 'selesai'>('mulai');
  const [loading, setLoading] = useState(false);
  const [dokumenFoto, setDokumenFoto] = useState<any>(null);
  const [showJenisPicker, setShowJenisPicker] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const translateY = useRef(new Animated.Value(500)).current;
  const confirmTranslateY = useRef(new Animated.Value(500)).current;
  const { visible, config, showAlert, hideAlert, handleConfirm } = useCustomAlert();

  const jenisPengajuanOptions = [
    { value: 'izin_datang_terlambat', label: 'Izin Datang Terlambat', icon: 'time-outline', needDate: true, needSingleTime: true },
    { value: 'izin_pulang_cepat', label: 'Izin Pulang Cepat', icon: 'exit-outline', needDate: true, needSingleTime: true },
    { value: 'cuti_sakit', label: 'Cuti Sakit', icon: 'medical-outline', needDateRange: true, needUpload: true },
    { value: 'cuti_alasan_penting', label: 'Cuti Alasan Penting', icon: 'calendar-outline', needDateRange: true },
    { value: 'cuti_tahunan', label: 'Cuti Tahunan', icon: 'calendar-outline', needDateRange: true },
    { value: 'lembur', label: 'Lembur', icon: 'moon-outline', needDateRange: true, needTimeRange: true },
  ];

  useEffect(() => {
    loadUserId();
  }, []);

  const loadUserId = async () => {
    try {
      const userData = await AsyncStorage.getItem('userData');
      if (userData) {
        const user = JSON.parse(userData);
        const id = user.id_user || user.id;
        setUserId(id.toString());
      }
    } catch (error) {
      console.error('Error loading user ID:', error);
    }
  };

  // Fungsi untuk cek apakah pegawai sedang dinas
  const checkDinasStatus = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const response = await fetchWithRetry(`${API_CONFIG.BASE_URL}/pegawai/presensi/api/check-dinas-status?user_id=${userId}&date=${today}`);
      const data = await response.json();
      return data.is_dinas || false;
    } catch (error) {
      console.error('Error checking dinas status:', error);
      return false;
    }
  };

  // Handler untuk memilih jenis pengajuan dengan validasi dinas
  const handleSelectJenisPengajuan = async (value: string) => {
    // Jika pilih lembur, cek apakah sedang dinas
    if (value === 'lembur') {
      const isDinas = await checkDinasStatus();
      if (isDinas) {
        closeBottomSheet();
        showAlert({
          type: 'info',
          title: 'Tidak Dapat Mengajukan Lembur',
          message: 'Anda sedang dalam periode dinas. Pegawai yang sedang dinas tidak dapat mengajukan lembur. Silakan ajukan lembur setelah periode dinas selesai.'
        });
        return;
      }
    }
    
    setJenisPengajuan(value);
    closeBottomSheet();
  };

  const selectedJenis = jenisPengajuanOptions.find(j => j.value === jenisPengajuan);

  const handleSubmit = () => {
    if (!jenisPengajuan) {
      showAlert({ type: 'error', title: 'Error', message: 'Pilih jenis pengajuan terlebih dahulu' });
      return;
    }
    if (!alasan.trim()) {
      showAlert({ type: 'error', title: 'Error', message: 'Alasan harus diisi' });
      return;
    }

    // Show confirmation modal
    setShowConfirmModal(true);
    openConfirmBottomSheet();
  };

  const confirmSubmit = async () => {
    setLoading(true);
    closeConfirmBottomSheet();
    try {
      const data = {
        user_id: userId,
        jenis_pengajuan: jenisPengajuan,
        tanggal_mulai: formatDateForDB(tanggalMulai),
        tanggal_selesai: (selectedJenis?.needDateRange || jenisPengajuan === 'lembur') ? formatDateForDB(tanggalSelesai) : null,
        jam_mulai: (selectedJenis?.needSingleTime || selectedJenis?.needTimeRange) ? jamMulai + ':00' : null,
        jam_selesai: selectedJenis?.needTimeRange ? jamSelesai + ':00' : null,
        alasan_text: alasan,
        dokumen_foto: dokumenFoto ? dokumenFoto.uri : null,
      };

      const response = await PegawaiAPI.submitPengajuan(data);
      
      if (response.success) {
        showAlert({
          type: 'success',
          title: 'Sukses',
          message: 'Pengajuan berhasil dikirim',
          onConfirm: () => router.back()
        });
      } else {
        // Gunakan tipe 'info' untuk pesan validasi, bukan 'error'
        showAlert({ 
          type: 'info', 
          title: 'Informasi', 
          message: response.message || 'Gagal mengirim pengajuan' 
        });
      }
    } catch (error) {
      showAlert({ type: 'error', title: 'Error', message: 'Terjadi kesalahan saat mengirim pengajuan' });
    } finally {
      setLoading(false);
    }
  };

  const formatDateForDB = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };



  const formatDate = (date: Date) => {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };



  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      showAlert({ type: 'error', title: 'Error', message: 'Izin akses galeri diperlukan' });
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled) {
      setDokumenFoto(result.assets[0]);
    }
  };

  const openBottomSheet = () => {
    setShowJenisPicker(true);
    Animated.timing(translateY, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  const closeBottomSheet = () => {
    Animated.timing(translateY, {
      toValue: 500,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setShowJenisPicker(false);
    });
  };

  const openConfirmBottomSheet = () => {
    Animated.timing(confirmTranslateY, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  const closeConfirmBottomSheet = () => {
    Animated.timing(confirmTranslateY, {
      toValue: 500,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setShowConfirmModal(false);
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

  const confirmPanResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: (_, gestureState) => gestureState.dy > 5,
    onPanResponderMove: (_, gestureState) => {
      if (gestureState.dy > 0) {
        confirmTranslateY.setValue(gestureState.dy);
      }
    },
    onPanResponderRelease: (_, gestureState) => {
      if (gestureState.dy > 100) {
        closeConfirmBottomSheet();
      } else {
        Animated.spring(confirmTranslateY, {
          toValue: 0,
          useNativeDriver: true,
        }).start();
      }
    },
  });

  const calendarPanResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: (_, gestureState) => gestureState.dy > 5,
    onPanResponderMove: (_, gestureState) => {
      if (gestureState.dy > 0) {
        calendarTranslateY.setValue(gestureState.dy);
      }
    },
    onPanResponderRelease: (_, gestureState) => {
      if (gestureState.dy > 100) {
        closeCalendarModal();
      } else {
        Animated.spring(calendarTranslateY, {
          toValue: 0,
          useNativeDriver: true,
        }).start();
      }
    },
  });

  const openCalendarModal = (mode: 'single' | 'range') => {
    setCalendarMode(mode);
    setShowCalendarModal(true);
    Animated.timing(calendarTranslateY, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  const closeCalendarModal = () => {
    Animated.timing(calendarTranslateY, {
      toValue: 500,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setShowCalendarModal(false);
    });
  };

  const handleDateSelect = (date: Date) => {
    if (calendarMode === 'single') {
      setTanggalMulai(date);
      closeCalendarModal();
    } else {
      if (datePickerMode === 'mulai') {
        setTanggalMulai(date);
        setDatePickerMode('selesai');
      } else {
        if (date < tanggalMulai) {
          showAlert({ type: 'error', title: 'Error', message: 'Tanggal selesai tidak boleh lebih awal dari tanggal mulai' });
          return;
        }
        setTanggalSelesai(date);
        closeCalendarModal();
        setDatePickerMode('mulai');
      }
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" translucent={true} backgroundColor="transparent" />
      
      <AppHeader 
        title="Form Pengajuan" 
        showBack={true}
      />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Jenis Pengajuan */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Jenis Pengajuan <Text style={styles.required}>*</Text></Text>
          <TouchableOpacity 
            style={styles.dropdownButton}
            onPress={openBottomSheet}
          >
            {jenisPengajuan ? (
              <View style={styles.dropdownSelected}>
                <Ionicons 
                  name={selectedJenis?.icon as any} 
                  size={20} 
                  color="#004643" 
                />
                <Text style={styles.dropdownSelectedText}>{selectedJenis?.label}</Text>
              </View>
            ) : (
              <Text style={styles.dropdownPlaceholder}>Pilih jenis pengajuan</Text>
            )}
            <Ionicons name="chevron-down" size={20} color="#666" />
          </TouchableOpacity>
        </View>

        {/* Tanggal Tunggal - untuk izin & lembur */}
        {selectedJenis?.needDate && !selectedJenis?.needDateRange && (
          <View style={styles.formGroup}>
            <Text style={styles.label}>Tanggal <Text style={styles.required}>*</Text></Text>
            <TouchableOpacity 
              style={styles.dateInputFull}
              onPress={() => openCalendarModal('single')}
            >
              <Ionicons name="calendar-outline" size={20} color="#666" />
              <Text style={styles.dateText}>{formatDate(tanggalMulai)}</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Tanggal Range - untuk cuti & lembur */}
        {selectedJenis?.needDateRange && (
          <View style={styles.formGroup}>
            <Text style={styles.label}>
              {jenisPengajuan === 'lembur' ? 'Periode Lembur' : 'Periode Cuti'} <Text style={styles.required}>*</Text>
            </Text>
            <View style={styles.dateRow}>
              <TouchableOpacity 
                style={styles.dateInput}
                onPress={() => {
                  setDatePickerMode('mulai');
                  openCalendarModal('range');
                }}
              >
                <Ionicons name="calendar-outline" size={20} color="#666" />
                <Text style={styles.dateText}>{formatDate(tanggalMulai)}</Text>
              </TouchableOpacity>
              <Text style={styles.dateSeparator}>s/d</Text>
              <TouchableOpacity 
                style={styles.dateInput}
                onPress={() => {
                  setDatePickerMode('selesai');
                  openCalendarModal('range');
                }}
              >
                <Ionicons name="calendar-outline" size={20} color="#666" />
                <Text style={styles.dateText}>{formatDate(tanggalSelesai)}</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Jam Tunggal - untuk izin */}
        {selectedJenis?.needSingleTime && (
          <View style={styles.formGroup}>
            <Text style={styles.label}>
              {jenisPengajuan === 'izin_datang_terlambat' ? 'Jam Rencana Datang' : 'Jam Rencana Pulang'} <Text style={styles.required}>*</Text>
            </Text>
            <TouchableOpacity 
              style={styles.dateInputFull}
              onPress={() => setShowTimePicker(true)}
            >
              <Ionicons name="time-outline" size={20} color="#666" />
              <Text style={styles.dateText}>{jamMulai}</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Jam Range - untuk lembur */}
        {selectedJenis?.needTimeRange && (
          <View style={styles.formGroup}>
            <Text style={styles.label}>Waktu Lembur <Text style={styles.required}>*</Text></Text>
            <View style={styles.dateRow}>
              <TouchableOpacity 
                style={styles.dateInput}
                onPress={() => setShowTimePicker(true)}
              >
                <Ionicons name="time-outline" size={20} color="#666" />
                <Text style={styles.dateText}>{jamMulai}</Text>
              </TouchableOpacity>
              <Text style={styles.dateSeparator}>s/d</Text>
              <TouchableOpacity 
                style={styles.dateInput}
                onPress={() => setShowTimePickerSelesai(true)}
              >
                <Ionicons name="time-outline" size={20} color="#666" />
                <Text style={styles.dateText}>{jamSelesai}</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Upload Dokumen - untuk cuti sakit */}
        {selectedJenis?.needUpload && (
          <View style={styles.formGroup}>
            <Text style={styles.label}>Surat Dokter (Opsional)</Text>
            {dokumenFoto ? (
              <View style={styles.uploadedContainer}>
                <Image source={{ uri: dokumenFoto.uri }} style={styles.uploadedImage} />
                <TouchableOpacity style={styles.removeButton} onPress={() => setDokumenFoto(null)}>
                  <Ionicons name="close-circle" size={24} color="#F44336" />
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity style={styles.uploadButton} onPress={pickImage}>
                <Ionicons name="cloud-upload-outline" size={32} color="#004643" />
                <Text style={styles.uploadText}>Upload Surat Dokter</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Alasan */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Alasan <Text style={styles.required}>*</Text></Text>
          <TextInput
            style={styles.textArea}
            placeholder="Jelaskan alasan pengajuan Anda..."
            placeholderTextColor="#999"
            multiline
            numberOfLines={4}
            value={alasan}
            onChangeText={setAlasan}
            textAlignVertical="top"
          />
        </View>

        {/* Submit Button */}
        <TouchableOpacity 
          style={[styles.submitButton, loading && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <Text style={styles.submitButtonText}>Mengirim...</Text>
          ) : (
            <>
              <Ionicons name="send" size={20} color="#fff" />
              <Text style={styles.submitButtonText}>Kirim Pengajuan</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>

      {/* Calendar Modal */}
      <Modal
        visible={showCalendarModal}
        transparent
        animationType="none"
        statusBarTranslucent
        onRequestClose={closeCalendarModal}
      >
        <View style={styles.calendarOverlay}>
          <TouchableOpacity 
            style={styles.calendarBackdrop} 
            activeOpacity={1}
            onPress={closeCalendarModal}
          />
          <Animated.View style={[styles.calendarSheet, { transform: [{ translateY: calendarTranslateY }] }]}>
            <View {...calendarPanResponder.panHandlers} style={styles.handleContainer}>
              <View style={styles.handleBar} />
            </View>
            
            <View style={styles.calendarSheetHeader}>
              <Text style={styles.calendarSheetTitle}>
                {calendarMode === 'single' 
                  ? 'Pilih Tanggal' 
                  : datePickerMode === 'mulai' 
                    ? 'Pilih Tanggal Mulai' 
                    : 'Pilih Tanggal Selesai'}
              </Text>
              <TouchableOpacity onPress={closeCalendarModal}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.calendarSheetContent} showsVerticalScrollIndicator={false}>
              <CustomCalendar
                initialDate={datePickerMode === 'mulai' ? tanggalMulai : tanggalSelesai}
                startDate={calendarMode === 'range' && datePickerMode === 'selesai' ? tanggalMulai : undefined}
                onDatePress={handleDateSelect}
                events={[]}
                showWeekends={false}
              />
            </ScrollView>
          </Animated.View>
        </View>
      </Modal>

      {/* Custom Time Pickers */}
      <AnalogTimePicker
        visible={showTimePicker}
        initialTime={jamMulai}
        onTimeSelect={(time) => {
          setJamMulai(time);
          setShowTimePicker(false);
        }}
        onClose={() => setShowTimePicker(false)}
      />

      <AnalogTimePicker
        visible={showTimePickerSelesai}
        initialTime={jamSelesai}
        onTimeSelect={(time) => {
          setJamSelesai(time);
          setShowTimePickerSelesai(false);
        }}
        onClose={() => setShowTimePickerSelesai(false)}
      />

      {/* Bottom Sheet Picker */}
      <Modal
        visible={showJenisPicker}
        transparent
        animationType="none"
        statusBarTranslucent
        onRequestClose={closeBottomSheet}
      >
        <View style={styles.bottomSheetOverlay}>
          <TouchableOpacity 
            style={styles.bottomSheetBackdrop} 
            activeOpacity={1}
            onPress={closeBottomSheet}
          />
          <Animated.View style={[styles.bottomSheet, { transform: [{ translateY }] }]}>
            <View {...panResponder.panHandlers} style={styles.handleContainer}>
              <View style={styles.handleBar} />
            </View>
            
            <View style={styles.bottomSheetHeader}>
              <Text style={styles.bottomSheetTitle}>Pilih Jenis Pengajuan</Text>
            </View>
            
            <ScrollView style={styles.bottomSheetContent} showsVerticalScrollIndicator={false}>
              {jenisPengajuanOptions.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.bottomSheetItem,
                    jenisPengajuan === option.value && styles.bottomSheetItemActive
                  ]}
                  onPress={() => handleSelectJenisPengajuan(option.value)}
                >
                  <View style={styles.bottomSheetItemLeft}>
                    <View style={[
                      styles.bottomSheetIcon,
                      jenisPengajuan === option.value && styles.bottomSheetIconActive
                    ]}>
                      <Ionicons 
                        name={option.icon as any} 
                        size={20} 
                        color={jenisPengajuan === option.value ? '#fff' : '#004643'} 
                      />
                    </View>
                    <Text style={[
                      styles.bottomSheetItemText,
                      jenisPengajuan === option.value && styles.bottomSheetItemTextActive
                    ]}>
                      {option.label}
                    </Text>
                  </View>
                  {jenisPengajuan === option.value && (
                    <Ionicons name="checkmark-circle" size={24} color="#004643" />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </Animated.View>
        </View>
      </Modal>

      {/* Confirmation Modal */}
      <Modal
        visible={showConfirmModal}
        transparent
        animationType="none"
        statusBarTranslucent
        onRequestClose={closeConfirmBottomSheet}
      >
        <View style={styles.bottomSheetOverlay}>
          <TouchableOpacity 
            style={styles.bottomSheetBackdrop} 
            activeOpacity={1}
            onPress={closeConfirmBottomSheet}
          />
          <Animated.View style={[styles.confirmBottomSheet, { transform: [{ translateY: confirmTranslateY }] }]}>
            <View {...confirmPanResponder.panHandlers} style={styles.handleContainer}>
              <View style={styles.handleBar} />
            </View>
            
            <View style={styles.confirmSheetContent}>
              <Text style={styles.confirmSheetTitle}>Konfirmasi Pengajuan</Text>
              
              <ScrollView style={styles.confirmScrollView} showsVerticalScrollIndicator={false}>
                <View style={styles.confirmItem}>
                  <Text style={styles.confirmLabel}>Jenis Pengajuan</Text>
                  <Text style={styles.confirmValue}>{selectedJenis?.label}</Text>
                </View>

                {selectedJenis?.needDate && !selectedJenis?.needDateRange && (
                  <View style={styles.confirmItem}>
                    <Text style={styles.confirmLabel}>Tanggal</Text>
                    <Text style={styles.confirmValue}>{formatDate(tanggalMulai)}</Text>
                  </View>
                )}

                {selectedJenis?.needDateRange && (
                  <View style={styles.confirmItem}>
                    <Text style={styles.confirmLabel}>
                      {jenisPengajuan === 'lembur' ? 'Periode Lembur' : 'Periode Cuti'}
                    </Text>
                    <Text style={styles.confirmValue}>
                      {formatDate(tanggalMulai)} s/d {formatDate(tanggalSelesai)}
                    </Text>
                  </View>
                )}

                {selectedJenis?.needSingleTime && (
                  <View style={styles.confirmItem}>
                    <Text style={styles.confirmLabel}>
                      {jenisPengajuan === 'izin_datang_terlambat' ? 'Jam Rencana Datang' : 'Jam Rencana Pulang'}
                    </Text>
                    <Text style={styles.confirmValue}>{jamMulai}</Text>
                  </View>
                )}

                {selectedJenis?.needTimeRange && (
                  <View style={styles.confirmItem}>
                    <Text style={styles.confirmLabel}>Waktu Lembur</Text>
                    <Text style={styles.confirmValue}>{jamMulai} s/d {jamSelesai}</Text>
                  </View>
                )}

                <View style={styles.confirmItem}>
                  <Text style={styles.confirmLabel}>Alasan</Text>
                  <Text style={styles.confirmValue}>{alasan}</Text>
                </View>

                {dokumenFoto && (
                  <View style={styles.confirmItem}>
                    <Text style={styles.confirmLabel}>Dokumen</Text>
                    <Text style={styles.confirmValue}>Surat dokter dilampirkan</Text>
                  </View>
                )}
              </ScrollView>
              
              <View style={styles.confirmButtonGroup}>
                <TouchableOpacity 
                  style={styles.confirmCancelBtn}
                  onPress={closeConfirmBottomSheet}
                >
                  <Text style={styles.confirmCancelText}>Batal</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[styles.confirmSubmitBtn, loading && styles.confirmSubmitBtnDisabled]}
                  onPress={confirmSubmit}
                  disabled={loading}
                >
                  <Text style={styles.confirmSubmitText}>
                    {loading ? 'Mengirim...' : 'Kirim Pengajuan'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </Animated.View>
        </View>
      </Modal>
      
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
  container: { flex: 1, backgroundColor: '#ffffff' },
  content: {
    flex: 1,
    padding: 16,
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  required: {
    color: '#F44336',
  },
  dropdownButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    borderRadius: 8,
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  dropdownSelected: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  dropdownSelectedText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  dropdownPlaceholder: {
    fontSize: 14,
    color: '#999',
  },
  bottomSheetOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  bottomSheetBackdrop: {
    flex: 1,
  },
  bottomSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    maxHeight: '70%',
  },
  handleContainer: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  handleBar: {
    width: 40,
    height: 4,
    backgroundColor: '#DDD',
    borderRadius: 2,
  },
  bottomSheetHeader: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  bottomSheetTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  bottomSheetContent: {
    maxHeight: 400,
  },
  bottomSheetItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  bottomSheetItemActive: {
    backgroundColor: '#E6F0EF',
  },
  bottomSheetItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  bottomSheetIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E6F0EF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bottomSheetIconActive: {
    backgroundColor: '#004643',
  },
  bottomSheetItemText: {
    fontSize: 15,
    color: '#333',
    fontWeight: '500',
    flex: 1,
  },
  bottomSheetItemTextActive: {
    color: '#004643',
    fontWeight: '600',
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dateInput: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  dateInputFull: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  dateText: {
    fontSize: 14,
    color: '#333',
  },
  dateSeparator: {
    fontSize: 14,
    color: '#666',
  },
  textArea: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#333',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    minHeight: 100,
  },
  submitButton: {
    flexDirection: 'row',
    backgroundColor: '#004643',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 10,
    marginBottom: 30,
  },
  submitButtonDisabled: {
    backgroundColor: '#999',
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  uploadButton: {
    backgroundColor: '#E6F0EF',
    borderRadius: 8,
    padding: 20,
    alignItems: 'center',
    gap: 8,
    borderWidth: 2,
    borderColor: '#004643',
    borderStyle: 'dashed',
  },
  uploadText: {
    fontSize: 14,
    color: '#004643',
    fontWeight: '600',
  },
  uploadedContainer: {
    position: 'relative',
    borderRadius: 8,
    overflow: 'hidden',
  },
  uploadedImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
  },
  removeButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#fff',
    borderRadius: 12,
  },
  calendarOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  calendarBackdrop: {
    flex: 1,
  },
  calendarSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    maxHeight: '80%',
  },
  calendarSheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  calendarSheetTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  calendarSheetContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  confirmBottomSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    maxHeight: '80%',
  },
  confirmSheetContent: {
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  confirmSheetTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  confirmScrollView: {
    maxHeight: 300,
    marginBottom: 16,
  },
  confirmItem: {
    backgroundColor: '#F8F9FA',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  confirmLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  confirmValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  confirmButtonGroup: {
    flexDirection: 'row',
    gap: 12,
  },
  confirmCancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  confirmCancelText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#666',
  },
  confirmSubmitBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    backgroundColor: '#004643',
    alignItems: 'center',
  },
  confirmSubmitBtnDisabled: {
    backgroundColor: '#999',
  },
  confirmSubmitText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
});
