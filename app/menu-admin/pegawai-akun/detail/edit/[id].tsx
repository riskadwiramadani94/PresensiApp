import React, { useState, useEffect, useRef } from 'react';
import { StatusBar } from 'expo-status-bar';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView,
  Keyboard,
  Modal,
  Animated,
  PanResponder,
  Dimensions,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { StyleSheet } from 'react-native';
import { getApiUrl, API_CONFIG } from '../../../../../constants/config';
import { AppHeader, CustomCalendar } from '../../../../../components';
import { CustomAlert } from '../../../../../components/CustomAlert';
import { useCustomAlert } from '../../../../../hooks/useCustomAlert';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function EditPegawai() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [showCalendar, setShowCalendar] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const calendarTranslateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const successModalScale = useRef(new Animated.Value(0)).current;
  const { visible, config, showAlert, hideAlert, handleConfirm } = useCustomAlert();
  const [formData, setFormData] = useState({
    nama_lengkap: '',
    email: '',
    password: '',
    nip: '',
    no_telepon: '',
    tanggal_lahir: '',
    jenis_kelamin: '',
    jabatan: '',
    divisi: '',
    status_pegawai: '',
    alamat: '',
  });

  useEffect(() => {
    fetchPegawaiDetail();
  }, [id]);

  useEffect(() => {
    const keyboardShow = Keyboard.addListener('keyboardDidShow', (e) => {
      setKeyboardHeight(e.endCoordinates.height);
    });
    const keyboardHide = Keyboard.addListener('keyboardDidHide', () => {
      setKeyboardHeight(0);
    });
    return () => {
      keyboardShow.remove();
      keyboardHide.remove();
    };
  }, []);

  const fetchPegawaiDetail = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${getApiUrl(API_CONFIG.ENDPOINTS.DETAIL_PEGAWAI)}/${id}`);
      const result = await response.json();
      
      if (result.success) {
        console.log('Pegawai data:', result.data); // Debug log
        setFormData({
          nama_lengkap: result.data.nama_lengkap || '',
          email: result.data.email || '',
          password: '', // Kosongkan password untuk reset
          nip: result.data.nip || '',
          no_telepon: result.data.no_telepon || '',
          tanggal_lahir: formatDateFromISO(result.data.tanggal_lahir) || '',
          jenis_kelamin: result.data.jenis_kelamin || '',
          jabatan: result.data.jabatan || '',
          divisi: result.data.divisi || '',
          status_pegawai: result.data.status_pegawai || '',
          alamat: result.data.alamat || '',
        });
      } else {
        showAlert({ type: 'error', title: 'Error', message: result.message || 'Gagal memuat data pegawai' });
      }
    } catch (error) {
      showAlert({ type: 'error', title: 'Koneksi Error', message: 'Pastikan XAMPP nyala dan HP satu Wi-Fi dengan laptop.' });
    } finally {
      setLoading(false);
    }
  };

  // Format tanggal dari ISO ke DD/MM/YYYY
  const formatDateFromISO = (isoDate: string) => {
    if (!isoDate) return '';
    try {
      const date = new Date(isoDate);
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      return `${day}/${month}/${year}`;
    } catch (error) {
      return '';
    }
  };

  // Format tanggal dari DD/MM/YYYY ke YYYY-MM-DD untuk database
  const formatDateForDB = (dateStr: string) => {
    if (!dateStr) return '';
    try {
      const [day, month, year] = dateStr.split('/');
      if (day && month && year) {
        return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
      }
      return dateStr;
    } catch (error) {
      return dateStr;
    }
  };

  const formatDate = (date: Date) => {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const handleDateSelect = (date: Date) => {
    const formattedDate = formatDate(date);
    setFormData({...formData, tanggal_lahir: formattedDate});
    closeCalendarModal();
  };

  const showCalendarModal = () => {
    setShowCalendar(true);
    Animated.spring(calendarTranslateY, {
      toValue: 0,
      useNativeDriver: true,
      tension: 65,
      friction: 11
    }).start();
  };

  const parseSelectedDate = () => {
    if (!formData.tanggal_lahir) return undefined;
    
    const [day, month, year] = formData.tanggal_lahir.split('/');
    if (day && month && year) {
      return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    }
    return undefined;
  };

  const closeCalendarModal = () => {
    Animated.timing(calendarTranslateY, {
      toValue: SCREEN_HEIGHT,
      duration: 250,
      useNativeDriver: true
    }).start(() => {
      setShowCalendar(false);
    });
  };

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
          useNativeDriver: true
        }).start();
      }
    }
  });

  const handleSave = async () => {
    try {
      setSaving(true);
      const response = await fetch(`${getApiUrl(API_CONFIG.ENDPOINTS.UPDATE_PEGAWAI)}/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          tanggal_lahir: formatDateForDB(formData.tanggal_lahir)
        }),
      });
      const result = await response.json();
      
      if (result.success) {
        setShowSuccessModal(true);
        Animated.spring(successModalScale, {
          toValue: 1,
          useNativeDriver: true,
          tension: 65,
          friction: 11
        }).start();
      } else {
        showAlert({ type: 'error', title: 'Error', message: result.message || 'Gagal memperbarui data pegawai' });
      }
    } catch (error) {
      showAlert({ type: 'error', title: 'Koneksi Error', message: 'Pastikan XAMPP nyala dan HP satu Wi-Fi dengan laptop.' });
    } finally {
      setSaving(false);
    }
  };

  const closeSuccessModal = () => {
    Animated.timing(successModalScale, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true
    }).start(() => {
      setShowSuccessModal(false);
      router.back();
    });
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <StatusBar style="light" translucent={true} backgroundColor="transparent" />
        
        {/* HEADER */}
        <AppHeader 
          title="Edit Pegawai"
          showBack={true}
          fallbackRoute="/pegawai-akun/data-pegawai-admin"
        />

        <KeyboardAvoidingView 
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView 
            showsVerticalScrollIndicator={false} 
            contentContainerStyle={styles.scrollContent}
          >
            {/* ========================================
                 SKELETON LOADING STATE
            ======================================== */}
            
            {/* Skeleton - Informasi Pribadi */}
            <View style={styles.sectionHeader}>
              <Ionicons name="person-outline" size={20} color="#004643" />
              <Text style={styles.sectionTitle}>Informasi Pribadi</Text>
            </View>
            <View style={styles.divider} />
            
            <View style={styles.formContent}>
              {[1, 2, 3, 4, 5, 6].map((item) => (
                <View key={item} style={styles.inputGroup}>
                  {/* Skeleton Label */}
                  <View style={styles.skeletonLabel} />
                  {/* Skeleton Input */}
                  <View style={styles.skeletonInput} />
                </View>
              ))}
            </View>

            {/* Skeleton - Informasi Kepegawaian */}
            <View style={styles.sectionHeader}>
              <Ionicons name="briefcase-outline" size={20} color="#004643" />
              <Text style={styles.sectionTitle}>Informasi Kepegawaian</Text>
            </View>
            <View style={styles.divider} />
            
            <View style={styles.formContent}>
              {[1, 2, 3].map((item) => (
                <View key={item} style={styles.inputGroup}>
                  {/* Skeleton Label */}
                  <View style={styles.skeletonLabel} />
                  {/* Skeleton Input */}
                  <View style={styles.skeletonInput} />
                </View>
              ))}
            </View>

            {/* Skeleton - Informasi Akun Login */}
            <View style={styles.sectionHeader}>
              <Ionicons name="key-outline" size={20} color="#004643" />
              <Text style={styles.sectionTitle}>Informasi Akun Login</Text>
            </View>
            <View style={styles.divider} />
            
            <View style={styles.formContent}>
              {[1, 2].map((item) => (
                <View key={item} style={styles.inputGroup}>
                  {/* Skeleton Label */}
                  <View style={styles.skeletonLabel} />
                  {/* Skeleton Input */}
                  <View style={styles.skeletonInput} />
                </View>
              ))}
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style="light" translucent={true} backgroundColor="transparent" />
      
      {/* HEADER */}
      <AppHeader 
        title="Edit Pegawai"
        showBack={true}
        fallbackRoute="/pegawai-akun/data-pegawai-admin"
      />

      <KeyboardAvoidingView 
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView 
          showsVerticalScrollIndicator={false} 
          contentContainerStyle={styles.scrollContent}
        >
        {/* ========================================
             ACTUAL FORM DATA
        ======================================== */}
        
        {/* Informasi Pribadi */}
        <View style={styles.sectionHeader}>
          <Ionicons name="person-outline" size={20} color="#004643" />
          <Text style={styles.sectionTitle}>Informasi Pribadi</Text>
        </View>
        <View style={styles.divider} />
        
        <View style={styles.formContent}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Nama Lengkap *</Text>
              <TextInput
                style={styles.textInput}
                value={formData.nama_lengkap}
                onChangeText={(text) => setFormData({...formData, nama_lengkap: text})}
                placeholder="Masukkan nama lengkap"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>NIP *</Text>
              <TextInput
                style={styles.textInput}
                value={formData.nip}
                onChangeText={(text) => setFormData({...formData, nip: text})}
                placeholder="Masukkan NIP"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>No. Telepon</Text>
              <View style={styles.phoneInputContainer}>
                <View style={styles.phonePrefix}>
                  <Text style={styles.phonePrefixText}>+62</Text>
                </View>
                <TextInput
                  style={styles.phoneInput}
                  value={formData.no_telepon}
                  onChangeText={(text) => {
                    // Remove any non-numeric characters
                    let cleaned = text.replace(/[^\d]/g, '');
                    // Remove leading 0 if present
                    if (cleaned.startsWith('0')) {
                      cleaned = cleaned.substring(1);
                    }
                    // Limit to 12 digits
                    if (cleaned.length <= 12) {
                      setFormData({...formData, no_telepon: cleaned});
                    }
                  }}
                  placeholder="8xxxxxxxxx"
                  keyboardType="phone-pad"
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Tanggal Lahir</Text>
              <TouchableOpacity onPress={showCalendarModal} style={styles.datePickerButton}>
                <Text style={[styles.datePickerText, !formData.tanggal_lahir && styles.datePickerPlaceholder]}>
                  {formData.tanggal_lahir || 'DD/MM/YYYY'}
                </Text>
                <View style={styles.calendarIconButton}>
                  <Ionicons name="calendar" size={20} color="#004643" />
                </View>
              </TouchableOpacity>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Jenis Kelamin</Text>
              <View style={styles.genderContainer}>
                <TouchableOpacity 
                  style={[styles.genderBtn, formData.jenis_kelamin === 'Laki-laki' && styles.genderBtnActive]}
                  onPress={() => setFormData({...formData, jenis_kelamin: 'Laki-laki'})}
                >
                  <Text style={[styles.genderText, formData.jenis_kelamin === 'Laki-laki' && styles.genderTextActive]}>
                    Laki-laki
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.genderBtn, formData.jenis_kelamin === 'Perempuan' && styles.genderBtnActive]}
                  onPress={() => setFormData({...formData, jenis_kelamin: 'Perempuan'})}
                >
                  <Text style={[styles.genderText, formData.jenis_kelamin === 'Perempuan' && styles.genderTextActive]}>
                    Perempuan
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Alamat Lengkap</Text>
              <TextInput
                style={[styles.textInput, styles.textArea]}
                value={formData.alamat}
                onChangeText={(text) => setFormData({...formData, alamat: text})}
                placeholder="Masukkan alamat lengkap"
                multiline
                numberOfLines={3}
              />
            </View>
          </View>

        {/* Informasi Kepegawaian */}
        <View style={styles.sectionHeader}>
          <Ionicons name="briefcase-outline" size={20} color="#004643" />
          <Text style={styles.sectionTitle}>Informasi Kepegawaian</Text>
        </View>
        <View style={styles.divider} />
        
        <View style={styles.formContent}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Jabatan</Text>
              <TextInput
                style={styles.textInput}
                value={formData.jabatan}
                onChangeText={(text) => setFormData({...formData, jabatan: text})}
                placeholder="Masukkan jabatan"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Divisi</Text>
              <TextInput
                style={styles.textInput}
                value={formData.divisi}
                onChangeText={(text) => setFormData({...formData, divisi: text})}
                placeholder="Masukkan divisi"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Status Kepegawaian</Text>
              <View style={styles.genderContainer}>
                <TouchableOpacity 
                  style={[styles.genderBtn, formData.status_pegawai === 'Aktif' && styles.genderBtnActive]}
                  onPress={() => setFormData({...formData, status_pegawai: 'Aktif'})}
                >
                  <Text style={[styles.genderText, formData.status_pegawai === 'Aktif' && styles.genderTextActive]}>
                    Aktif
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.genderBtn, formData.status_pegawai === 'Tidak Aktif' && styles.genderBtnActive]}
                  onPress={() => setFormData({...formData, status_pegawai: 'Tidak Aktif'})}
                >
                  <Text style={[styles.genderText, formData.status_pegawai === 'Tidak Aktif' && styles.genderTextActive]}>
                    Tidak Aktif
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

        {/* Informasi Akun Login */}
        <View style={styles.sectionHeader}>
          <Ionicons name="key-outline" size={20} color="#004643" />
          <Text style={styles.sectionTitle}>Informasi Akun Login</Text>
        </View>
        <View style={styles.divider} />
        
        <View style={styles.formContent}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Email *</Text>
              <TextInput
                style={styles.textInput}
                value={formData.email}
                onChangeText={(text) => setFormData({...formData, email: text})}
                placeholder="Masukkan email"
                keyboardType="email-address"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Reset Password (Opsional)</Text>
              <View style={styles.passwordContainer}>
                <TextInput
                  style={styles.passwordInput}
                  value={formData.password}
                  onChangeText={(text) => setFormData({...formData, password: text})}
                  placeholder="Masukkan password baru atau kosongkan jika tidak ingin mengubah"
                  secureTextEntry={!showPassword}
                />
                <TouchableOpacity 
                  style={styles.eyeButton}
                  onPress={() => {
                    console.log('Eye button pressed, current showPassword:', showPassword);
                    setShowPassword(!showPassword);
                  }}
                >
                  <Ionicons 
                    name={showPassword ? "eye-off-outline" : "eye-outline"} 
                    size={20} 
                    color="#666" 
                  />
                </TouchableOpacity>
              </View>
              <Text style={styles.helperText}>*Kosongkan jika tidak ingin mengubah password</Text>
            </View>
          </View>

        </ScrollView>
      
        {/* Button Footer - Fixed di bawah seperti header */}
        <View style={[styles.buttonFooter, { marginBottom: keyboardHeight }]}>
        <TouchableOpacity 
          style={styles.saveButton}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="checkmark-circle-outline" size={20} color="#fff" />
              <Text style={styles.saveButtonText}>Simpan Data Pegawai</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
      </KeyboardAvoidingView>

      {/* Calendar Modal */}
      <Modal 
        visible={showCalendar} 
        transparent
        animationType="none"
        statusBarTranslucent={true}
        onRequestClose={closeCalendarModal}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={closeCalendarModal} />
          <Animated.View style={[styles.calendarBottomSheet, { transform: [{ translateY: calendarTranslateY }] }]}>
            <View {...calendarPanResponder.panHandlers} style={styles.handleContainer}>
              <View style={styles.handleBar} />
            </View>
            <View style={styles.calendarSheetContent}>
              <Text style={styles.calendarSheetTitle}>Pilih Tanggal Lahir</Text>
              <CustomCalendar 
                onDatePress={(date) => handleDateSelect(date)}
                initialDate={parseSelectedDate()}
                weekendDays={[0, 6]}
                showWeekends={false}
              />
            </View>
          </Animated.View>
        </View>
      </Modal>

      {/* Success Modal */}
      <Modal 
        visible={showSuccessModal} 
        transparent
        animationType="none"
        statusBarTranslucent
        onRequestClose={closeSuccessModal}
      >
        <View style={styles.successModalOverlay}>
          <Animated.View style={[styles.successModalContainer, {
            transform: [{ scale: successModalScale }]
          }]}>
            <View style={styles.successIconContainer}>
              <Ionicons name="checkmark-circle" size={48} color="#fff" />
            </View>
            
            <Text style={styles.successModalMessage}>
              Data pegawai berhasil diperbarui!
            </Text>
            
            <TouchableOpacity
              style={styles.successButton}
              onPress={closeSuccessModal}
            >
              <Text style={styles.successButtonText}>OK</Text>
            </TouchableOpacity>
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
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollContent: {
    paddingBottom: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#004643',
    marginLeft: 8
  },
  divider: {
    height: 1,
    backgroundColor: '#E0E0E0',
    marginHorizontal: 20,
    marginBottom: 16,
  },
  formContent: {
    paddingHorizontal: 20,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: '#333',
    borderWidth: 1,
    borderColor: '#E0E0E0'
  },
  textArea: {
    textAlignVertical: 'top',
    minHeight: 80
  },
  genderContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  genderBtn: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#F8F9FA',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0'
  },
  genderBtnActive: {
    backgroundColor: '#004643'
  },
  genderText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666'
  },
  genderTextActive: {
    color: '#fff'
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    backgroundColor: '#F8F9FA',
  },
  passwordInput: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: '#333',
  },
  eyeButton: {
    padding: 12,
  },
  helperText: {
    fontSize: 12,
    color: '#888',
    marginTop: 4,
    fontStyle: 'italic'
  },
  saveButton: {
    backgroundColor: '#004643',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
    minHeight: 50
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8
  },
  buttonFooter: {
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  
  /* ========================================
     SKELETON STYLES
  ======================================== */
  skeletonLabel: {
    width: '30%',
    height: 14,
    backgroundColor: '#E0E0E0',
    borderRadius: 4,
    marginBottom: 8,
  },
  skeletonInput: {
    width: '100%',
    height: 48,
    backgroundColor: '#F0F0F0',
    borderRadius: 8,
  },
  datePickerButton: {
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  datePickerText: {
    fontSize: 16,
    color: '#333',
    flex: 1
  },
  datePickerPlaceholder: {
    color: '#999'
  },
  calendarIconButton: {
    padding: 4,
    borderRadius: 4,
    backgroundColor: '#F0F8F0'
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)'
  },
  modalBackdrop: { 
    flex: 1 
  },
  calendarBottomSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    maxHeight: SCREEN_HEIGHT * 0.7,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 20
  },
  handleContainer: {
    paddingVertical: 12,
    alignItems: 'center'
  },
  handleBar: {
    width: 40,
    height: 4,
    backgroundColor: '#DDD',
    borderRadius: 2
  },
  calendarSheetContent: {
    paddingHorizontal: 20,
    paddingBottom: 16
  },
  calendarSheetTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginBottom: 16,
    textAlign: 'center'
  },
  
  // Success Modal Styles
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
    width: '100%',
    maxWidth: 300,
    alignItems: 'center',
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
  successModalMessage: {
    fontSize: 18,
    color: '#fff',
    textAlign: 'center',
    marginBottom: 28,
    fontWeight: '600',
  },
  successButton: {
    backgroundColor: '#fff',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
    alignItems: 'center',
    width: '100%',
  },
  successButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#004643',
  },
  phoneInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    overflow: 'hidden'
  },
  phonePrefix: {
    backgroundColor: '#004643',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderTopLeftRadius: 8,
    borderBottomLeftRadius: 8,
    justifyContent: 'center',
    alignItems: 'center'
  },
  phonePrefixText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff'
  },
  phoneInput: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: '#333',
    backgroundColor: 'transparent'
  },
});