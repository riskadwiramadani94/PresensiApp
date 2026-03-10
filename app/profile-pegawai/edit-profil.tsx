import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Alert,
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  Modal,
  Animated,
  PanResponder,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import AppHeader from '../../components/AppHeader';
import { PegawaiAPI, getApiUrl } from '../../constants/config';
import { CustomAlert } from '../../components/CustomAlert';
import { useCustomAlert } from '../../hooks/useCustomAlert';
import { CustomCalendar } from '../../components';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export const unstable_settings = {
  presentation: 'modal'
};

interface ProfileData {
  nama_lengkap: string;
  email: string;
  nip: string;
  jenis_kelamin: string;
  tanggal_lahir: string;
  alamat: string;
  no_telepon: string;
  jabatan: string;
  divisi: string;
  foto_profil: string | null;
}

export default function EditProfilPegawaiScreen() {
  const router = useRouter();
  const alert = useCustomAlert();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<ProfileData>({
    nama_lengkap: '',
    email: '',
    nip: '',
    jenis_kelamin: '',
    tanggal_lahir: '',
    alamat: '',
    no_telepon: '',
    jabatan: '',
    divisi: '',
    foto_profil: null
  });
  const [newPhoto, setNewPhoto] = useState<string | null>(null);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [showCalendar, setShowCalendar] = useState(false);
  const calendarTranslateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;

  const formatDate = (date: Date) => {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const handleDateSelect = (date: Date) => {
    // Format ke YYYY-MM-DD untuk database
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dbFormat = `${year}-${month}-${day}`;
    
    setProfile({...profile, tanggal_lahir: dbFormat});
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
    if (!profile.tanggal_lahir) return undefined;
    
    // Handle format ISO (2007-09-28T17:00:00.000Z)
    if (profile.tanggal_lahir.includes('T')) {
      const date = new Date(profile.tanggal_lahir);
      if (!isNaN(date.getTime())) {
        return date;
      }
    }
    
    // Handle format YYYY-MM-DD dari database
    if (profile.tanggal_lahir.includes('-') && profile.tanggal_lahir.length === 10) {
      const [year, month, day] = profile.tanggal_lahir.split('-');
      return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    }
    
    // Handle format DD/MM/YYYY
    if (profile.tanggal_lahir.includes('/')) {
      const [day, month, year] = profile.tanggal_lahir.split('/');
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

  useEffect(() => {
    fetchProfile();
  }, []);

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

  const fetchProfile = async () => {
    try {
      const userDataStr = await AsyncStorage.getItem('userData');
      const userData = userDataStr ? JSON.parse(userDataStr) : null;

      if (!userData) {
        alert.showAlert({ type: 'error', message: 'Silakan login ulang', onConfirm: () => router.replace('/') });
        return;
      }

      const userId = userData.id_user || userData.id;
      
      try {
        /* ========================================
           API ENDPOINTS CONFIGURATION
           Endpoint: /pegawai/dashboard/api/dashboard
           Method: GET
           Params: user_id
        ======================================== */
        const result = await PegawaiAPI.getDashboard(userId.toString());
        
        if (result.success && result.data) {
          console.log('Profile data from API:', result.data.user_info);
          setProfile({
            nama_lengkap: result.data.user_info?.nama_lengkap || userData.nama_lengkap || '',
            email: result.data.user_info?.email || userData.email || '',
            nip: result.data.user_info?.nip || userData.nip || '',
            jenis_kelamin: result.data.user_info?.jenis_kelamin || userData.jenis_kelamin || '',
            tanggal_lahir: result.data.user_info?.tanggal_lahir || userData.tanggal_lahir || '',
            alamat: result.data.user_info?.alamat || userData.alamat || '',
            no_telepon: result.data.user_info?.no_telepon || userData.no_telepon || '',
            jabatan: result.data.user_info?.jabatan || userData.jabatan || '',
            divisi: result.data.user_info?.divisi || userData.divisi || '',
            foto_profil: result.data.user_info?.foto_profil || userData.foto_profil || null
          });
          return;
        }
      } catch (apiError) {
        console.log('API error, using AsyncStorage:', apiError);
      }

      setProfile({
        nama_lengkap: userData.nama_lengkap || '',
        email: userData.email || '',
        nip: userData.nip || '',
        jenis_kelamin: userData.jenis_kelamin || '',
        tanggal_lahir: userData.tanggal_lahir || '',
        alamat: userData.alamat || '',
        no_telepon: userData.no_telepon || '',
        jabatan: userData.jabatan || '',
        divisi: userData.divisi || '',
        foto_profil: userData.foto_profil || null
      });
    } catch (error) {
      console.error('Error fetching profile:', error);
      alert.showAlert({ type: 'error', message: 'Gagal memuat profil' });
    } finally {
      setLoading(false);
    }
  };

  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status !== 'granted') {
        alert.showAlert({ type: 'error', message: 'Izin akses galeri diperlukan' });
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setNewPhoto(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      alert.showAlert({ type: 'error', message: 'Gagal memilih foto' });
    }
  };

  const validateForm = (): boolean => {
    const newErrors: { [key: string]: string } = {};

    if (!profile.nama_lengkap.trim()) {
      newErrors.nama_lengkap = 'Nama lengkap tidak boleh kosong';
    }

    if (profile.no_telepon && profile.no_telepon.trim()) {
      const phoneRegex = /^[0-9]{10,15}$/;
      if (!phoneRegex.test(profile.no_telepon.replace(/\s/g, ''))) {
        newErrors.no_telepon = 'Nomor telepon harus 10-15 digit angka';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) {
      return;
    }

    setSaving(true);
    try {
      const userDataStr = await AsyncStorage.getItem('userData');
      const userData = userDataStr ? JSON.parse(userDataStr) : null;

      if (!userData) {
        alert.showAlert({ type: 'error', message: 'Silakan login ulang', onConfirm: () => router.replace('/') });
        return;
      }

      const userId = userData.id_user || userData.id;
      const formData = new FormData();
      
      formData.append('nama_lengkap', profile.nama_lengkap);
      formData.append('jenis_kelamin', profile.jenis_kelamin);
      formData.append('tanggal_lahir', profile.tanggal_lahir);
      formData.append('alamat', profile.alamat);
      formData.append('no_telepon', profile.no_telepon);

      if (newPhoto) {
        const filename = newPhoto.split('/').pop() || 'profile.jpg';
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `image/${match[1]}` : 'image/jpeg';

        formData.append('foto_profil', {
          uri: newPhoto,
          name: filename,
          type: type,
        } as any);
      }

      const url = getApiUrl('/pegawai/profil/api/profile');
      
      /* ========================================
         API ENDPOINTS CONFIGURATION
         Endpoint: /pegawai/profil/api/profile
         Method: PUT
         Headers: user-id
         Body: FormData (nama_lengkap, jenis_kelamin, tanggal_lahir, alamat, no_telepon, foto_profil)
      ======================================== */
      const response = await fetch(url, {
        method: 'PUT',
        headers: {
          'user-id': userId.toString()
        },
        body: formData
      });

      const result = await response.json();

      if (result.success) {
        const updatedUserData = {
          ...userData,
          nama_lengkap: profile.nama_lengkap,
          jenis_kelamin: profile.jenis_kelamin,
          tanggal_lahir: profile.tanggal_lahir,
          alamat: profile.alamat,
          no_telepon: profile.no_telepon,
          foto_profil: result.data?.foto_profil || profile.foto_profil
        };
        await AsyncStorage.setItem('userData', JSON.stringify(updatedUserData));

        alert.showAlert({ 
          type: 'success', 
          message: 'Profil berhasil diperbarui',
          onConfirm: () => router.push('/(pegawai)/profil' as any)
        });
      } else {
        alert.showAlert({ type: 'error', message: result.message || 'Gagal memperbarui profil' });
      }
    } catch (error) {
      console.error('Error saving profile:', error);
      alert.showAlert({ type: 'error', message: 'Gagal memperbarui profil' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <AppHeader title="Edit Profil" showBack={true} fallbackRoute="/(pegawai)/profil" />
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {/* SKELETON - FOTO PROFIL SECTION */}
          <View style={styles.sectionHeader}>
            <View style={styles.skeletonIcon} />
            <View style={styles.skeletonSectionTitle} />
          </View>
          <View style={styles.divider} />
          
          <View style={styles.formContent}>
            <View style={styles.photoSection}>
              <View style={styles.skeletonPhoto} />
              <View style={styles.skeletonPhotoHint} />
            </View>
          </View>

          {/* SKELETON - DATA PROFIL SECTION */}
          <View style={styles.sectionHeader}>
            <View style={styles.skeletonIcon} />
            <View style={styles.skeletonSectionTitle} />
          </View>
          <View style={styles.divider} />
          
          <View style={styles.formContent}>
            {[1, 2, 3, 4, 5, 6, 7, 8].map((item) => (
              <View key={item} style={styles.inputGroup}>
                <View style={styles.skeletonLabel} />
                <View style={styles.skeletonInput} />
              </View>
            ))}
          </View>
        </ScrollView>

        <View style={styles.buttonFooter}>
          <View style={styles.skeletonButton} />
        </View>
      </View>
    );
  }

  const photoUri = newPhoto || (profile.foto_profil ? getApiUrl(`/${profile.foto_profil}`) : null);

  return (
    <View style={styles.container}>
      <AppHeader 
        title="Edit Profil" 
        showBack={true}
        fallbackRoute="/(pegawai)/profil"
      />
      
      <KeyboardAvoidingView 
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView 
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* FOTO PROFIL SECTION */}
          <View style={styles.sectionHeader}>
            <Ionicons name="camera-outline" size={20} color="#004643" />
            <Text style={styles.sectionTitle}>Foto Profil</Text>
          </View>
          <View style={styles.divider} />
          
          <View style={styles.formContent}>
            <View style={styles.photoSection}>
              <TouchableOpacity onPress={pickImage} style={styles.photoWrapper}>
                {photoUri ? (
                  <Image source={{ uri: photoUri }} style={styles.photoImage} />
                ) : (
                  <View style={styles.photoPlaceholder}>
                    <Ionicons name="person-outline" size={50} color="#004643" />
                  </View>
                )}
                <View style={styles.photoEditBtn}>
                  <Ionicons name="camera-outline" size={18} color="#004643" />
                </View>
              </TouchableOpacity>
              <Text style={styles.photoHint}>Ketuk untuk mengubah foto</Text>
            </View>
          </View>

          {/* DATA PROFIL SECTION */}
          <View style={styles.sectionHeader}>
            <Ionicons name="person-outline" size={20} color="#004643" />
            <Text style={styles.sectionTitle}>Data Profil</Text>
          </View>
          <View style={styles.divider} />
          
          <View style={styles.formContent}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Nama Lengkap</Text>
              <TextInput
                style={[styles.input, errors.nama_lengkap && styles.inputError]}
                value={profile.nama_lengkap}
                onChangeText={(text) => {
                  setProfile({ ...profile, nama_lengkap: text });
                  if (errors.nama_lengkap) {
                    setErrors({ ...errors, nama_lengkap: '' });
                  }
                }}
                placeholder="Masukkan nama lengkap"
                placeholderTextColor="#999"
              />
              {errors.nama_lengkap && (
                <Text style={styles.errorText}>{errors.nama_lengkap}</Text>
              )}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Email</Text>
              <TextInput
                style={[styles.input, styles.inputDisabled]}
                value={profile.email}
                editable={false}
                placeholderTextColor="#999"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>NIP</Text>
              <TextInput
                style={[styles.input, styles.inputDisabled]}
                value={profile.nip}
                editable={false}
                placeholderTextColor="#999"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Jenis Kelamin</Text>
              <View style={styles.genderContainer}>
                <TouchableOpacity 
                  style={[styles.genderBtn, profile.jenis_kelamin === 'Laki-laki' && styles.genderBtnActive]}
                  onPress={() => setProfile({ ...profile, jenis_kelamin: 'Laki-laki' })}
                >
                  <Text style={[styles.genderText, profile.jenis_kelamin === 'Laki-laki' && styles.genderTextActive]}>Laki-laki</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.genderBtn, profile.jenis_kelamin === 'Perempuan' && styles.genderBtnActive]}
                  onPress={() => setProfile({ ...profile, jenis_kelamin: 'Perempuan' })}
                >
                  <Text style={[styles.genderText, profile.jenis_kelamin === 'Perempuan' && styles.genderTextActive]}>Perempuan</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Tanggal Lahir</Text>
              <TouchableOpacity onPress={showCalendarModal} style={styles.datePickerButton}>
                <Text style={[styles.datePickerText, !profile.tanggal_lahir && styles.datePickerPlaceholder]}>
                  {profile.tanggal_lahir ? (() => {
                    // Handle format ISO (2007-09-28T17:00:00.000Z)
                    if (profile.tanggal_lahir.includes('T')) {
                      const date = new Date(profile.tanggal_lahir);
                      if (!isNaN(date.getTime())) {
                        const day = String(date.getDate()).padStart(2, '0');
                        const month = String(date.getMonth() + 1).padStart(2, '0');
                        const year = date.getFullYear();
                        return `${day}/${month}/${year}`;
                      }
                    }
                    // Handle format YYYY-MM-DD
                    if (profile.tanggal_lahir.includes('-') && profile.tanggal_lahir.length === 10) {
                      const [year, month, day] = profile.tanggal_lahir.split('-');
                      return `${day}/${month}/${year}`;
                    }
                    // Return as is if already DD/MM/YYYY
                    return profile.tanggal_lahir;
                  })() : 'DD/MM/YYYY'}
                </Text>
                <View style={styles.calendarIconButton}>
                  <Ionicons name="calendar" size={20} color="#004643" />
                </View>
              </TouchableOpacity>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Alamat</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={profile.alamat}
                onChangeText={(text) => setProfile({ ...profile, alamat: text })}
                placeholder="Masukkan alamat lengkap"
                placeholderTextColor="#999"
                multiline
                numberOfLines={3}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Nomor Telepon</Text>
              <View style={styles.phoneInputContainer}>
                <View style={styles.phonePrefix}>
                  <Text style={styles.phonePrefixText}>+62</Text>
                </View>
                <TextInput
                  style={[styles.phoneInput, errors.no_telepon && styles.inputError]}
                  value={profile.no_telepon}
                  onChangeText={(text) => {
                    // Remove any non-numeric characters
                    let cleaned = text.replace(/[^\d]/g, '');
                    // Remove leading 0 if present
                    if (cleaned.startsWith('0')) {
                      cleaned = cleaned.substring(1);
                    }
                    // Limit to 12 digits
                    if (cleaned.length <= 12) {
                      setProfile({ ...profile, no_telepon: cleaned });
                      if (errors.no_telepon) {
                        setErrors({ ...errors, no_telepon: '' });
                      }
                    }
                  }}
                  placeholder="8xxxxxxxxx"
                  placeholderTextColor="#999"
                  keyboardType="phone-pad"
                />
              </View>
              {errors.no_telepon && (
                <Text style={styles.errorText}>{errors.no_telepon}</Text>
              )}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Jabatan</Text>
              <TextInput
                style={[styles.input, styles.inputDisabled]}
                value={profile.jabatan}
                editable={false}
                placeholderTextColor="#999"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Divisi</Text>
              <TextInput
                style={[styles.input, styles.inputDisabled]}
                value={profile.divisi}
                editable={false}
                placeholderTextColor="#999"
              />
            </View>
          </View>
        </ScrollView>

       <View style={[styles.buttonContainer, Platform.OS === 'android' ? { marginBottom: keyboardHeight } : {}]}>
        <TouchableOpacity 
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <>
              <Ionicons name="hourglass-outline" size={20} color="#fff" />
              <Text style={styles.saveButtonText}>Menyimpan...</Text>
            </>
          ) : (
            <>
              <Ionicons name="checkmark-circle-outline" size={20} color="#fff" />
              <Text style={styles.saveButtonText}>Simpan Perubahan</Text>
            </>
          )}
        </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      <CustomAlert
        visible={alert.visible}
        type={alert.config.type}
        message={alert.config.message}
        onClose={alert.hideAlert}
        onConfirm={alert.handleConfirm}
      />

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
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  scrollView: { flex: 1 },
  scrollContent: {
    paddingBottom: 20,
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
    marginBottom: 16
  },
  photoSection: { alignItems: 'center', marginBottom: 16 },
  photoWrapper: { position: 'relative', marginBottom: 10 },
  photoImage: { width: 100, height: 100, borderRadius: 50 },
  photoPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#E6F0EF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoEditBtn: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#004643',
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoHint: { fontSize: 12, color: '#666', textAlign: 'center' },
  inputLabel: { fontSize: 14, fontWeight: '600', color: '#333', marginBottom: 8 },
  input: {
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: '#333',
    borderWidth: 1,
    borderColor: '#E0E0E0'
  },
  inputError: { borderColor: '#F44336', borderWidth: 2 },
  inputDisabled: { backgroundColor: '#F5F5F5', color: '#999' },
  textArea: { textAlignVertical: 'top', minHeight: 80 },
  errorText: { fontSize: 12, color: '#F44336', marginTop: 4, marginLeft: 4 },
  genderContainer: { flexDirection: 'row', gap: 12 },
  genderBtn: { flex: 1, paddingVertical: 12, paddingHorizontal: 16, borderRadius: 8, backgroundColor: '#F8F9FA', alignItems: 'center', borderWidth: 1, borderColor: '#E0E0E0' },
  genderBtnActive: { backgroundColor: '#004643', borderColor: '#004643' },
  genderText: { fontSize: 14, fontWeight: '600', color: '#666' },
  genderTextActive: { color: '#fff', fontWeight: 'bold' },
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
  saveButtonDisabled: { backgroundColor: '#999' },
  saveButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
    marginLeft: 6,
    textAlign: 'center'
  },
  buttonContainer: {
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  buttonFooter: {
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },

  /* ========================================
     SKELETON STYLES - EDIT PROFIL PEGAWAI
  ======================================== */
  skeletonIcon: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#E0E0E0',
  },
  skeletonSectionTitle: {
    width: 100,
    height: 16,
    backgroundColor: '#E0E0E0',
    borderRadius: 4,
    marginLeft: 8,
  },
  skeletonPhoto: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#E0E0E0',
    marginBottom: 10,
  },
  skeletonPhotoHint: {
    width: 120,
    height: 12,
    backgroundColor: '#F0F0F0',
    borderRadius: 4,
  },
  skeletonLabel: {
    width: '40%',
    height: 14,
    backgroundColor: '#E0E0E0',
    borderRadius: 4,
    marginBottom: 8,
  },
  skeletonInput: {
    height: 48,
    backgroundColor: '#F0F0F0',
    borderRadius: 8,
  },
  skeletonButton: {
    height: 50,
    backgroundColor: '#E0E0E0',
    borderRadius: 12,
  },
  
  // Date Picker Styles
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
  
  // Modal Styles
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
