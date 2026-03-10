import React, { useState, useEffect } from 'react';
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
  Platform,
  KeyboardAvoidingView,
  Keyboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import AppHeader from '../../components/AppHeader';
import { API_CONFIG, getApiUrl } from '../../constants/config';
import { CustomAlert } from '../../components/CustomAlert';
import { useCustomAlert } from '../../hooks/useCustomAlert';

export const unstable_settings = {
  presentation: 'modal'
};

interface ProfileData {
  nama_lengkap: string;
  email: string;
  no_telepon: string;
  foto_profil: string | null;
}

export default function EditProfilAdminScreen() {
  const router = useRouter();
  const alert = useCustomAlert();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<ProfileData>({
    nama_lengkap: '',
    email: '',
    no_telepon: '',
    foto_profil: null
  });
  const [newPhoto, setNewPhoto] = useState<string | null>(null);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [keyboardHeight, setKeyboardHeight] = useState(0);

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

      // Set data dari AsyncStorage sebagai fallback
      setProfile({
        nama_lengkap: userData.nama_lengkap || '',
        email: userData.email || '',
        no_telepon: userData.no_telepon || '',
        foto_profil: userData.foto_profil || null
      });

      // Coba ambil dari server
      try {
        const userId = userData.id_user || userData.id;
        const url = getApiUrl(`${API_CONFIG.ENDPOINTS.ADMIN}/profile`);
        
        /* ========================================
           API ENDPOINTS CONFIGURATION
           Endpoint: /admin/profile
           Method: GET
           Headers: user-id
        ======================================== */
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'user-id': userId.toString()
          }
        });

        const result = await response.json();
        
        if (result.success && result.data) {
          setProfile({
            nama_lengkap: result.data.nama_lengkap || '',
            email: result.data.email || '',
            no_telepon: result.data.no_telepon || '',
            foto_profil: result.data.foto_profil || null
          });
        }
      } catch (serverError) {
        console.log('Server error (using fallback):', serverError);
      }
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

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!profile.email.trim()) {
      newErrors.email = 'Email tidak boleh kosong';
    } else if (!emailRegex.test(profile.email)) {
      newErrors.email = 'Format email tidak valid';
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
      formData.append('email', profile.email);
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

      const url = getApiUrl(`${API_CONFIG.ENDPOINTS.ADMIN}/profile`);
      
      /* ========================================
         API ENDPOINTS CONFIGURATION
         Endpoint: /admin/profile
         Method: PUT
         Headers: user-id
         Body: FormData (nama_lengkap, email, no_telepon, foto_profil)
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
          email: profile.email,
          no_telepon: profile.no_telepon,
          foto_profil: result.data?.foto_profil || profile.foto_profil
        };
        await AsyncStorage.setItem('userData', JSON.stringify(updatedUserData));

        alert.showAlert({ 
          type: 'success', 
          message: 'Profil berhasil diperbarui',
          onConfirm: () => router.back()
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
        <AppHeader title="Edit Profil" showBack={true} fallbackRoute="/admin/profil-admin" />
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
            {[1, 2, 3].map((item) => (
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
        fallbackRoute="/admin/profil-admin"
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
                style={[styles.input, errors.email && styles.inputError]}
                value={profile.email}
                onChangeText={(text) => {
                  setProfile({ ...profile, email: text });
                  if (errors.email) {
                    setErrors({ ...errors, email: '' });
                  }
                }}
                placeholder="Masukkan email"
                placeholderTextColor="#999"
                keyboardType="email-address"
                autoCapitalize="none"
              />
              {errors.email && (
                <Text style={styles.errorText}>{errors.email}</Text>
              )}
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
          </View>
        </ScrollView>

        {/* Button Footer - Fixed di bawah */}
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#666',
  },
  scrollView: {
    flex: 1,
  },
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
  photoSection: {
    alignItems: 'center',
    marginBottom: 16,
  },
  photoWrapper: {
    position: 'relative',
    marginBottom: 10,
  },
  photoImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
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
  photoHint: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8
  },
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
  inputError: {
    borderColor: '#F44336',
    borderWidth: 2
  },
  errorText: {
    fontSize: 12,
    color: '#F44336',
    marginTop: 4,
    marginLeft: 4
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
  saveButtonDisabled: {
    backgroundColor: '#999'
  },
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
     SKELETON STYLES - EDIT PROFIL ADMIN
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
