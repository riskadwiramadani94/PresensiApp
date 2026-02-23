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
  Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import AppHeader from '../../components/AppHeader';
import { API_CONFIG, getApiUrl } from '../../constants/config';

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

  useEffect(() => {
    fetchProfile();
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
        Alert.alert('Error', 'Silakan login ulang');
        router.replace('/');
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
      
      const response = await fetch(url, {
        method: 'PUT',
        headers: {
          'user-id': userId.toString()
        },
        body: formData
      });

      const result = await response.json();

      if (result.success) {
        // Update AsyncStorage
        const updatedUserData = {
          ...userData,
          nama_lengkap: profile.nama_lengkap,
          email: profile.email,
          no_telepon: profile.no_telepon,
          foto_profil: result.data?.foto_profil || profile.foto_profil
        };
        await AsyncStorage.setItem('userData', JSON.stringify(updatedUserData));

        Alert.alert('Berhasil', 'Profil berhasil diperbarui', [
          { text: 'OK', onPress: () => router.back() }
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
        <AppHeader title="Edit Profil" showBack={true} fallbackRoute="/admin/profil-admin" />
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
        fallbackRoute="/admin/profil-admin"
      />
      
      <ScrollView 
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.content}>
          {/* FOTO PROFIL CARD */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Ionicons name="camera" size={24} color="#004643" />
              <Text style={styles.cardTitle}>Foto Profil</Text>
            </View>
            
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

          {/* DATA PROFIL CARD */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Ionicons name="person" size={24} color="#004643" />
              <Text style={styles.cardTitle}>Data Profil</Text>
            </View>

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
        </View>
      </ScrollView>

      {/* Button Footer - Fixed di bawah */}
      <View style={styles.buttonFooter}>
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
  content: {
    padding: 20,
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: '#F0F8F7',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    alignItems: 'flex-start',
    borderWidth: 1,
    borderColor: '#D0E8E4',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  infoContent: {
    flex: 1,
    marginLeft: 12,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#004643',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 12,
    color: '#004643',
    marginBottom: 4,
    lineHeight: 18,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginLeft: 10,
  },
  photoSection: {
    alignItems: 'center',
    marginBottom: 10,
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
    fontWeight: '500',
    marginBottom: 8,
    color: '#333',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    marginBottom: 15,
    fontSize: 14,
    color: '#333',
  },
  inputError: {
    borderColor: '#D32F2F',
  },
  errorText: {
    fontSize: 12,
    color: '#D32F2F',
    marginTop: -10,
    marginBottom: 10,
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
});
