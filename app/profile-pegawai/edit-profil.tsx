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
  KeyboardAvoidingView,
  Platform,
  Keyboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import AppHeader from '../../components/AppHeader';
import { PegawaiAPI, getApiUrl } from '../../constants/config';

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
        Alert.alert('Error', 'Silakan login ulang');
        router.replace('/');
        return;
      }

      const userId = userData.id_user || userData.id;
      
      try {
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
      Alert.alert('Error', 'Gagal memuat profil');
    } finally {
      setLoading(false);
    }
  };

  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Izin akses galeri diperlukan');
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
      Alert.alert('Error', 'Gagal memilih foto');
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
        Alert.alert('Error', 'Silakan login ulang');
        router.replace('/');
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

        Alert.alert('Berhasil', 'Profil berhasil diperbarui', [
          { text: 'OK', onPress: () => router.push('/(pegawai)/profil' as any) }
        ]);
      } else {
        Alert.alert('Error', result.message || 'Gagal memperbarui profil');
      }
    } catch (error) {
      console.error('Error saving profile:', error);
      Alert.alert('Error', 'Gagal memperbarui profil');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <AppHeader title="Edit Profil" showBack={true} fallbackRoute="/(pegawai)/profil" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#004643" />
          <Text style={styles.loadingText}>Memuat profil...</Text>
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
              <TextInput
                style={styles.input}
                value={profile.tanggal_lahir}
                onChangeText={(text) => setProfile({ ...profile, tanggal_lahir: text })}
                placeholder="YYYY-MM-DD"
                placeholderTextColor="#999"
              />
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
              <TextInput
                style={[styles.input, errors.no_telepon && styles.inputError]}
                value={profile.no_telepon}
                onChangeText={(text) => {
                  setProfile({ ...profile, no_telepon: text });
                  if (errors.no_telepon) {
                    setErrors({ ...errors, no_telepon: '' });
                  }
                }}
                placeholder="Masukkan nomor telepon"
                placeholderTextColor="#999"
                keyboardType="phone-pad"
              />
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

        <View style={[styles.buttonFooter, { marginBottom: keyboardHeight }]}>
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, fontSize: 14, color: '#666' },
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
  buttonFooter: {
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
});
