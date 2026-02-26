import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState, useCallback } from 'react';
import { Alert, Modal, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View, StatusBar as RNStatusBar, Image } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { PegawaiAPI, getApiUrl } from '../../constants/config';
import { AuthStorage } from '../../utils/AuthStorage';
import { AppHeader } from '../../components';
import * as ImagePicker from 'expo-image-picker';

interface UserProfile {
  id_user: number;
  nama_lengkap: string;
  email: string;
  nip?: string;
  no_telepon?: string;
  jabatan?: string;
  divisi?: string;
  jenis_kelamin?: string;
  alamat?: string;
  tanggal_lahir?: string;
  foto_profil?: string;
}

export default function ProfileScreen() {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [logoutModal, setLogoutModal] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    loadUserData();
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadUserData();
    }, [])
  );

  const loadUserData = async () => {
    try {
      const userData = await AuthStorage.getUser();
      if (userData) {
        fetchProfile(userData);
      } else {
        router.replace('/');
      }
    } catch (error) {
      console.error('Error loading user data:', error);
      router.replace('/');
    }
  };

  const fetchProfile = async (userData?: any) => {
    try {
      const currentUser = userData;
      
      if (!currentUser) {
        Alert.alert('Error', 'Silakan login ulang');
        router.replace('/');
        return;
      }
      
      const userId = currentUser.id_user || currentUser.id;
      
      // Set fallback dari AsyncStorage DULU
      const fallbackProfile: UserProfile = {
        id_user: userId,
        nama_lengkap: currentUser.nama_lengkap || 'User',
        email: currentUser.email || 'No email',
        jabatan: currentUser.jabatan || 'Staff',
        nip: currentUser.nip || '',
        no_telepon: currentUser.no_telepon || '',
        divisi: currentUser.divisi || 'Umum',
        jenis_kelamin: currentUser.jenis_kelamin || '',
        alamat: currentUser.alamat || '',
        tanggal_lahir: currentUser.tanggal_lahir || '',
        foto_profil: currentUser.foto_profil || undefined
      };
      
      setProfile(fallbackProfile);
      
      // Coba ambil dari server (opsional)
      try {
        const result = await PegawaiAPI.getDashboard(userId.toString());
        
        if (result.success && result.data?.user_info) {
          const serverProfile: UserProfile = {
            id_user: userId,
            nama_lengkap: result.data.user_info.nama_lengkap || fallbackProfile.nama_lengkap,
            email: currentUser.email || fallbackProfile.email,
            jabatan: result.data.user_info.jabatan || fallbackProfile.jabatan,
            nip: currentUser.nip || fallbackProfile.nip,
            no_telepon: currentUser.no_telepon || fallbackProfile.no_telepon,
            divisi: result.data.user_info.divisi || fallbackProfile.divisi,
            jenis_kelamin: currentUser.jenis_kelamin || fallbackProfile.jenis_kelamin,
            alamat: currentUser.alamat || fallbackProfile.alamat,
            tanggal_lahir: currentUser.tanggal_lahir || fallbackProfile.tanggal_lahir,
            foto_profil: result.data.user_info.foto_profil || fallbackProfile.foto_profil
          };
          
          setProfile(serverProfile);
          
          // Update AsyncStorage dengan data terbaru
          const updatedUserData = {
            ...currentUser,
            ...serverProfile
          };
          await AuthStorage.setUser(updatedUserData);
        }
      } catch (serverError) {
        console.log('Server error (using fallback):', serverError);
        // Tetap gunakan data fallback yang sudah di-set
      }
    } catch (error) {
      console.error('Profile Error:', error);
      Alert.alert('Error', 'Gagal memuat profil');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await AuthStorage.removeUser();
      setLogoutModal(false);
      router.replace('/');
    } catch (error) {
      console.error('Error during logout:', error);
      Alert.alert('Error', 'Gagal keluar dari akun');
    }
  };

  const pickAndUploadImage = async () => {
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
        await uploadPhoto(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Gagal memilih foto');
    }
  };

  const uploadPhoto = async (photoUri: string) => {
    setUploading(true);
    try {
      const userData = await AuthStorage.getUser();
      if (!userData) {
        Alert.alert('Error', 'Silakan login ulang');
        router.replace('/');
        return;
      }

      const userId = userData.id_user || userData.id;
      const formData = new FormData();
      
      formData.append('nama_lengkap', profile?.nama_lengkap || '');
      formData.append('jenis_kelamin', profile?.jenis_kelamin || '');
      formData.append('tanggal_lahir', profile?.tanggal_lahir || '');
      formData.append('alamat', profile?.alamat || '');
      formData.append('no_telepon', profile?.no_telepon || '');

      const filename = photoUri.split('/').pop() || 'profile.jpg';
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : 'image/jpeg';

      formData.append('foto_profil', {
        uri: photoUri,
        name: filename,
        type: type,
      } as any);

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
          foto_profil: result.data?.foto_profil || profile?.foto_profil
        };
        await AuthStorage.setUser(updatedUserData);
        
        setProfile({
          ...profile!,
          foto_profil: result.data?.foto_profil || profile?.foto_profil || undefined
        });
        
        Alert.alert('Berhasil', 'Foto profil berhasil diperbarui');
      } else {
        Alert.alert('Error', result.message || 'Gagal memperbarui foto profil');
      }
    } catch (error) {
      console.error('Error uploading photo:', error);
      Alert.alert('Error', 'Gagal mengupload foto profil');
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text>Memuat profil...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <RNStatusBar 
        barStyle="light-content"
        backgroundColor="transparent"
        translucent={true}
      />
      
      <AppHeader 
        title="Profil"
        showBack={false}
      />
      
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        
        <View style={styles.profileSection}>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{profile?.nama_lengkap || 'User'}</Text>
            <Text style={styles.profileEmail}>{profile?.email || 'user@example.com'}</Text>
            
            <TouchableOpacity 
              style={styles.editProfileBtn}
              onPress={() => router.push('/profile-pegawai/edit-profil' as any)}
            >
              <Text style={styles.editProfileText}>Edit Profil</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.profileImageWrapper}>
            {profile?.foto_profil ? (
              <View style={styles.profileAvatar}>
                <Image 
                  source={{ uri: getApiUrl(`/${profile.foto_profil}`) }} 
                  style={styles.profileAvatarImage}
                />
              </View>
            ) : (
              <View style={styles.profileAvatar}>
                <Ionicons name="person" size={40} color="#004643" />
              </View>
            )}
            <TouchableOpacity 
              style={styles.editPhotoBtn}
              onPress={pickAndUploadImage}
              disabled={uploading}
            >
              <Ionicons name="camera-outline" size={16} color="#004643" />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>PENGATURAN AKUN</Text>
          <View style={styles.menuCard}>
            <TouchableOpacity 
              style={styles.menuItem}
              onPress={() => router.push('/keamanan' as any)}
            >
              <View style={styles.menuLeft}>
                <View style={[styles.iconCircle, { backgroundColor: '#FFF3E0' }]}>
                  <Ionicons name="lock-closed-outline" size={20} color="#F57C00" />
                </View>
                <Text style={styles.menuText}>Keamanan</Text>
              </View>
              <Ionicons name="chevron-forward-outline" size={20} color="#999" />
            </TouchableOpacity>
            <View style={styles.menuDivider} />
            <TouchableOpacity style={styles.menuItem}>
              <View style={styles.menuLeft}>
                <View style={[styles.iconCircle, { backgroundColor: '#E3F2FD' }]}>
                  <Ionicons name="notifications-outline" size={20} color="#1976D2" />
                </View>
                <Text style={styles.menuText}>Notifikasi</Text>
              </View>
              <Ionicons name="chevron-forward-outline" size={20} color="#999" />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>INFO DAN DUKUNGAN SELENGKAPNYA</Text>
          <View style={styles.menuCard}>
            <TouchableOpacity 
              style={styles.menuItem}
              onPress={() => router.push('/tentang/kebijakan-privasi' as any)}
            >
              <View style={styles.menuLeft}>
                <View style={[styles.iconCircle, { backgroundColor: '#E0F2F1' }]}>
                  <Ionicons name="shield-checkmark-outline" size={20} color="#00897B" />
                </View>
                <Text style={styles.menuText}>Kebijakan Privasi</Text>
              </View>
              <Ionicons name="chevron-forward-outline" size={20} color="#999" />
            </TouchableOpacity>
            <View style={styles.menuDivider} />
            <TouchableOpacity 
              style={styles.menuItem}
              onPress={() => router.push('/tentang/syarat-ketentuan' as any)}
            >
              <View style={styles.menuLeft}>
                <View style={[styles.iconCircle, { backgroundColor: '#E8F5E9' }]}>
                  <Ionicons name="document-text-outline" size={20} color="#388E3C" />
                </View>
                <Text style={styles.menuText}>Syarat dan Ketentuan</Text>
              </View>
              <Ionicons name="chevron-forward-outline" size={20} color="#999" />
            </TouchableOpacity>

          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.menuCard}>
            <TouchableOpacity 
              style={styles.menuItem}
              onPress={() => setLogoutModal(true)}
            >
              <View style={styles.menuLeft}>
                <View style={[styles.iconCircle, { backgroundColor: '#FFEBEE' }]}>
                  <Ionicons name="log-out-outline" size={20} color="#D32F2F" />
                </View>
                <Text style={styles.menuText}>Keluar Akun</Text>
              </View>
              <Ionicons name="chevron-forward-outline" size={20} color="#999" />
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
      
      <Modal 
        visible={logoutModal} 
        transparent 
        statusBarTranslucent={true}
        animationType="none"
      >
        <TouchableOpacity 
          style={styles.logoutModalOverlay}
          activeOpacity={1}
          onPress={() => setLogoutModal(false)}
        >
          <View style={styles.logoutModalContent}>
            <View style={styles.logoutModalHeader}>
              <Ionicons name="log-out-outline" size={32} color="#FF4D4D" />
              <Text style={styles.logoutModalTitle}>Keluar Akun</Text>
              <Text style={styles.logoutModalMessage}>
                Apakah Anda yakin ingin keluar dari akun?
              </Text>
            </View>
            
            <View style={styles.logoutModalButtons}>
              <TouchableOpacity 
                style={styles.logoutCancelBtn}
                onPress={() => setLogoutModal(false)}
              >
                <Text style={styles.logoutCancelText}>Batal</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.logoutConfirmBtn}
                onPress={handleLogout}
              >
                <Text style={styles.logoutConfirmText}>Keluar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  scrollContent: { paddingBottom: 30 },
  
  profileSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 20,
  },
  profileInfo: { flex: 1 },
  profileName: { fontSize: 20, fontWeight: 'bold', color: '#333', marginBottom: 4 },
  profileEmail: { fontSize: 14, color: '#666', marginBottom: 12 },
  profileImageWrapper: { position: 'relative' },
  profileAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#E6F0EF',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  profileAvatarImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  editPhotoBtn: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#004643',
    justifyContent: 'center',
    alignItems: 'center',
  },
  editProfileBtn: {
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#004643',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    alignSelf: 'flex-start',
  },
  editProfileText: { fontSize: 13, fontWeight: '600', color: '#004643' },
  
  divider: { height: 1, backgroundColor: '#E0E0E0', marginVertical: 10 },
  
  section: { paddingHorizontal: 20, marginTop: 10 },
  sectionLabel: { fontSize: 12, fontWeight: '600', color: '#999', marginBottom: 10, marginLeft: 5, letterSpacing: 0.5 },
  
  menuCard: { backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#E0E0E0', overflow: 'hidden' },
  menuItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 16, paddingHorizontal: 15 },
  menuLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  iconCircle: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  menuText: { fontSize: 15, color: '#333', fontWeight: '500' },
  menuDivider: { height: 1, backgroundColor: '#F0F0F0' },
  
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 14, paddingHorizontal: 15 },
  infoLabel: { fontSize: 14, color: '#666' },
  infoValue: { fontSize: 14, color: '#333', fontWeight: '500' },
  
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  
  logoutModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: Platform.OS === 'android' ? 0 : 50,
  },
  logoutModalContent: { backgroundColor: '#fff', borderRadius: 16, padding: 24, width: '85%', maxWidth: 320 },
  logoutModalHeader: { alignItems: 'center', marginBottom: 24 },
  logoutModalTitle: { fontSize: 20, fontWeight: 'bold', color: '#333', marginTop: 12, marginBottom: 8 },
  logoutModalMessage: { fontSize: 16, color: '#666', textAlign: 'center', lineHeight: 22 },
  logoutModalButtons: { flexDirection: 'row', gap: 12 },
  logoutCancelBtn: { flex: 1, paddingVertical: 12, borderRadius: 8, backgroundColor: '#F5F5F5', alignItems: 'center' },
  logoutCancelText: { fontSize: 16, fontWeight: '600', color: '#666' },
  logoutConfirmBtn: { flex: 1, paddingVertical: 12, borderRadius: 8, backgroundColor: '#FF4D4D', alignItems: 'center' },
  logoutConfirmText: { fontSize: 16, fontWeight: '600', color: '#fff' },
});
