import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState, useCallback } from 'react';
import { Alert, Modal, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View, StatusBar as RNStatusBar, Image } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { PegawaiAPI, getApiUrl } from '../../constants/config';
import { AuthStorage } from '../../utils/AuthStorage';
import { AppHeader, CustomAlert } from '../../components';
import * as ImagePicker from 'expo-image-picker';
import { useCustomAlert } from '../../hooks/useCustomAlert';

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
  const alert = useCustomAlert();
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
        alert.showAlert({ type: 'error', message: 'Silakan login ulang', onConfirm: () => router.replace('/') });
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
        /* ========================================
           API ENDPOINTS CONFIGURATION
           Endpoint: /pegawai/dashboard/api/dashboard
           Method: GET
           Params: user_id
        ======================================== */
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
      alert.showAlert({ type: 'error', message: 'Gagal memuat profil' });
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
      alert.showAlert({ type: 'error', message: 'Gagal keluar dari akun' });
    }
  };

  const pickAndUploadImage = async () => {
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
        await uploadPhoto(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      alert.showAlert({ type: 'error', message: 'Gagal memilih foto' });
    }
  };

  const uploadPhoto = async (photoUri: string) => {
    setUploading(true);
    try {
      const userData = await AuthStorage.getUser();
      if (!userData) {
        alert.showAlert({ type: 'error', message: 'Silakan login ulang', onConfirm: () => router.replace('/') });
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
      
      /* ========================================
         API ENDPOINTS CONFIGURATION
         Endpoint: /pegawai/profil/api/profile
         Method: PUT
         Body: FormData (foto_profil, data profil)
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
          foto_profil: result.data?.foto_profil || profile?.foto_profil
        };
        await AuthStorage.setUser(updatedUserData);
        
        setProfile({
          ...profile!,
          foto_profil: result.data?.foto_profil || profile?.foto_profil || undefined
        });
        
        alert.showAlert({ type: 'success', message: 'Foto profil berhasil diperbarui', autoClose: true });
      } else {
        alert.showAlert({ type: 'error', message: result.message || 'Gagal memperbarui foto profil' });
      }
    } catch (error) {
      console.error('Error uploading photo:', error);
      alert.showAlert({ type: 'error', message: 'Gagal mengupload foto profil' });
    } finally {
      setUploading(false);
    }
  };

  /* ========================================
     SKELETON LOADING COMPONENT
     Komponen untuk menampilkan placeholder
     saat data sedang dimuat dari server
  ======================================== */
  const renderSkeleton = () => (
    <View style={styles.container}>
      <RNStatusBar 
        barStyle="light-content"
        backgroundColor="transparent"
        translucent={true}
      />
      <AppHeader title="Profil" showBack={false} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View style={styles.skeletonProfileSection}>
          <View style={styles.skeletonProfileInfo}>
            <View style={styles.skeletonProfileName} />
            <View style={styles.skeletonProfileEmail} />
            <View style={styles.skeletonEditBtn} />
          </View>
          <View style={styles.skeletonAvatar} />
        </View>

        <View style={styles.divider} />

        <View style={styles.section}>
          <View style={styles.skeletonSectionLabel} />
          <View style={styles.menuCard}>
            {[1, 2].map((item) => (
              <View key={item}>
                <View style={styles.skeletonMenuItem}>
                  <View style={styles.skeletonIconCircle} />
                  <View style={styles.skeletonMenuText} />
                </View>
                {item === 1 && <View style={styles.menuDivider} />}
              </View>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.skeletonSectionLabel} />
          <View style={styles.menuCard}>
            {[1, 2].map((item) => (
              <View key={item}>
                <View style={styles.skeletonMenuItem}>
                  <View style={styles.skeletonIconCircle} />
                  <View style={styles.skeletonMenuText} />
                </View>
                {item === 1 && <View style={styles.menuDivider} />}
              </View>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.menuCard}>
            <View style={styles.skeletonMenuItem}>
              <View style={styles.skeletonIconCircle} />
              <View style={styles.skeletonMenuText} />
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );

  if (loading) {
    return renderSkeleton();
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
                  <Ionicons name="lock-closed-outline" size={Platform.OS === 'ios' ? 20 : 22} color="#F57C00" />
                </View>
                <Text style={styles.menuText}>Keamanan</Text>
              </View>
              <Ionicons name="chevron-forward-outline" size={20} color="#999" />
            </TouchableOpacity>
            <View style={styles.menuDivider} />
            <TouchableOpacity style={styles.menuItem}>
              <View style={styles.menuLeft}>
                <View style={[styles.iconCircle, { backgroundColor: '#E3F2FD' }]}>
                  <Ionicons name="notifications-outline" size={Platform.OS === 'ios' ? 20 : 22} color="#1976D2" />
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
                  <Ionicons name="shield-checkmark-outline" size={Platform.OS === 'ios' ? 20 : 22} color="#00897B" />
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
                  <Ionicons name="document-text-outline" size={Platform.OS === 'ios' ? 20 : 22} color="#388E3C" />
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
                  <Ionicons name="log-out-outline" size={Platform.OS === 'ios' ? 20 : 22} color="#D32F2F" />
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
  profileName: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1A1A1A',
    marginBottom: 6,
    letterSpacing: -0.3,
  },
  profileEmail: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 16,
    fontWeight: '500',
  },
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
    backgroundColor: '#F0F7F7',
    borderWidth: 1,
    borderColor: '#E8F5F4',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    alignSelf: 'flex-start',
  },
  editProfileText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#00695C',
    letterSpacing: 0.2,
  },
  
  divider: { height: 1, backgroundColor: '#E0E0E0', marginVertical: 10 },
  
  section: { paddingHorizontal: 20, marginTop: 10 },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#95A5A6',
    marginBottom: 12,
    marginLeft: 5,
    letterSpacing: 1.1,
    textTransform: 'uppercase',
  },
  
  menuCard: {
    backgroundColor: '#FFF',
    borderRadius: 18,
    padding: 4,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E8F0EF',
    shadowColor: '#004643',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 18,
    paddingHorizontal: 18,
  },
  menuLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  menuText: {
    fontSize: 15,
    color: '#1A1A1A',
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  menuDivider: {
    height: 1,
    backgroundColor: '#F0F0F0',
    marginHorizontal: -15,
  },
  
  logoutModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30,
  },
  logoutModalContent: { 
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
  logoutModalHeader: { 
    alignItems: 'center', 
    marginBottom: 24,
    width: '100%',
  },
  logoutModalTitle: { 
    fontSize: 18, 
    fontWeight: '600', 
    color: '#fff', 
    marginTop: 12, 
    marginBottom: 8,
    textAlign: 'center',
  },
  logoutModalMessage: { 
    fontSize: 16, 
    color: '#fff', 
    textAlign: 'center', 
    lineHeight: 22,
    fontWeight: '500',
  },
  logoutModalButtons: { 
    flexDirection: 'row', 
    gap: 12,
    width: '100%',
  },
  logoutCancelBtn: { 
    flex: 1, 
    paddingVertical: 14, 
    borderRadius: 12, 
    backgroundColor: 'rgba(255, 255, 255, 0.2)', 
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  logoutCancelText: { 
    fontSize: 15, 
    fontWeight: '600', 
    color: '#fff' 
  },
  logoutConfirmBtn: { 
    flex: 1, 
    paddingVertical: 14, 
    borderRadius: 12, 
    backgroundColor: '#F44336', 
    alignItems: 'center' 
  },
  logoutConfirmText: { 
    fontSize: 15, 
    fontWeight: '600', 
    color: '#fff' 
  },

  /* ========================================
     SKELETON STYLES - PROFIL PEGAWAI
  ======================================== */
  skeletonProfileSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 20,
  },
  skeletonProfileInfo: {
    flex: 1,
  },
  skeletonProfileName: {
    width: '60%',
    height: 24,
    backgroundColor: '#E0E0E0',
    borderRadius: 4,
    marginBottom: 8,
  },
  skeletonProfileEmail: {
    width: '50%',
    height: 16,
    backgroundColor: '#F0F0F0',
    borderRadius: 4,
    marginBottom: 16,
  },
  skeletonEditBtn: {
    width: 100,
    height: 40,
    backgroundColor: '#E0E0E0',
    borderRadius: 12,
  },
  skeletonAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#E0E0E0',
  },
  skeletonSectionLabel: {
    width: '40%',
    height: 14,
    backgroundColor: '#E0E0E0',
    borderRadius: 4,
    marginBottom: 12,
    marginLeft: 5,
  },
  skeletonMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 18,
    paddingHorizontal: 18,
  },
  skeletonIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#E0E0E0',
    marginRight: 14,
  },
  skeletonMenuText: {
    width: '50%',
    height: 16,
    backgroundColor: '#F0F0F0',
    borderRadius: 4,
  },
});
