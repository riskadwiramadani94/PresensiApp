import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState, useCallback } from 'react';
import { Alert, Modal, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View, StatusBar as RNStatusBar, Image, ActivityIndicator } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { PegawaiAPI, getApiUrl } from '../../constants/config';
import { AuthStorage } from '../../utils/AuthStorage';
import { AppHeader, CustomAlert } from '../../components';
import * as ImagePicker from 'expo-image-picker';
import { useCustomAlert } from '../../hooks/useCustomAlert';
import { LinearGradient } from 'expo-linear-gradient';

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
      console.log('=== DEBUG PROFIL PEGAWAI ===');
      console.log('User ID:', userId);
      console.log('Current User Data:', currentUser);
      
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
      
      console.log('Fallback Profile:', fallbackProfile);
      setProfile(fallbackProfile);
      
      // Coba ambil dari server (opsional)
      try {
        // Gunakan Dashboard API yang sudah ada dan benar
        const result = await PegawaiAPI.getDashboard(userId.toString());
        console.log('Dashboard API result:', result);
        
        if (result.success && result.data?.user_info) {
          console.log('Server Data NIP:', result.data.user_info.nip);
          console.log('Server Data Tanggal Lahir:', result.data.user_info.tanggal_lahir);
          
          const serverProfile: UserProfile = {
            id_user: userId,
            nama_lengkap: result.data.user_info.nama_lengkap || fallbackProfile.nama_lengkap,
            email: result.data.user_info.email || currentUser.email || fallbackProfile.email,
            jabatan: result.data.user_info.jabatan || fallbackProfile.jabatan,
            nip: result.data.user_info.nip || fallbackProfile.nip,
            no_telepon: result.data.user_info.no_telepon || fallbackProfile.no_telepon,
            divisi: result.data.user_info.divisi || fallbackProfile.divisi,
            jenis_kelamin: result.data.user_info.jenis_kelamin || fallbackProfile.jenis_kelamin,
            alamat: result.data.user_info.alamat || fallbackProfile.alamat,
            tanggal_lahir: result.data.user_info.tanggal_lahir || fallbackProfile.tanggal_lahir,
            foto_profil: result.data.user_info.foto_profil || fallbackProfile.foto_profil
          };
          
          console.log('Final Server Profile:', serverProfile);
          setProfile(serverProfile);
          
          // Update AsyncStorage dengan data terbaru
          const updatedUserData = {
            ...currentUser,
            ...serverProfile
          };
          await AuthStorage.setUser(updatedUserData);
        } else {
          console.log('Dashboard API Failed or No Data:', result);
        }
      } catch (serverError) {
        console.log('=== SERVER ERROR ===');
        console.log('Error Details:', serverError);
        console.log('Using fallback data instead');
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
        {/* Skeleton Header */}
        <LinearGradient colors={["#004643", "#065f46"]} style={styles.profileHeader}>
          <View style={styles.profileContent}>
            <View style={styles.photoWrapper}>
              <View style={styles.skeletonAvatar} />
            </View>
            <View style={styles.profileTextInfo}>
              <View style={styles.skeletonName} />
              <View style={styles.skeletonNip} />
              <View style={styles.skeletonBadge} />
            </View>
          </View>
        </LinearGradient>

        <View style={styles.infoSection}>
          {/* Skeleton Cards */}
          {[1, 2, 3, 4].map((item) => (
            <View key={item} style={styles.elegantCard}>
              <View style={styles.cardHeader}>
                <View style={styles.skeletonIcon} />
                <View style={styles.skeletonCardTitle} />
              </View>
              <View style={styles.separator} />
              <View style={styles.infoRowModern}>
                <View style={styles.skeletonIconBox} />
                <View style={styles.infoContentModern}>
                  <View style={styles.skeletonLabel} />
                  <View style={styles.skeletonValue} />
                </View>
              </View>
              {item < 4 && (
                <View style={[styles.infoRowModern, { marginBottom: 0 }]}>
                  <View style={styles.skeletonIconBox} />
                  <View style={styles.infoContentModern}>
                    <View style={styles.skeletonLabel} />
                    <View style={styles.skeletonValue} />
                  </View>
                </View>
              )}
            </View>
          ))}
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
        
        {/* PROFILE HEADER SECTION */}
        <LinearGradient
          colors={["#004643", "#00695C"]}
          style={styles.profileHeader}
        >
          <View style={styles.profileContent}>
            <View style={styles.photoWrapper}>
              {profile?.foto_profil ? (
                <Image
                  source={{ uri: getApiUrl(`/${profile.foto_profil}`) }}
                  style={styles.avatarImage}
                />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Text style={styles.avatarInitial}>
                    {profile?.nama_lengkap?.charAt(0).toUpperCase() || 'U'}
                  </Text>
                </View>
              )}
              <TouchableOpacity 
                style={styles.editPhotoBtn}
                onPress={pickAndUploadImage}
                disabled={uploading}
              >
                {uploading ? (
                  <ActivityIndicator size="small" color="#004643" />
                ) : (
                  <Ionicons name="camera-outline" size={16} color="#004643" />
                )}
              </TouchableOpacity>
            </View>
            <View style={styles.profileTextInfo}>
              <Text style={styles.mainName}>{profile?.nama_lengkap || 'User'}</Text>
              <Text style={styles.subText}>{profile?.email || 'user@example.com'}</Text>
              <View style={styles.badgeMini}>
                <Text style={styles.badgeTextMini}>{profile?.jabatan || 'Pegawai'}</Text>
              </View>
            </View>
          </View>
        </LinearGradient>

        <View style={styles.infoSection}>
          {/* Card 1: Informasi Profil */}
          <View style={styles.elegantCard}>
            <View style={styles.cardHeader}>
              <Ionicons name="person-circle-outline" size={20} color="#004643" />
              <Text style={styles.cardTitle}>Informasi Profil</Text>
            </View>
            
            <View style={styles.separator} />
            
            <View style={styles.infoRowModern}>
              <View style={styles.infoIconBox}>
                <Ionicons name="mail-outline" size={16} color="#00695C" />
              </View>
              <View style={styles.infoContentModern}>
                <Text style={styles.labelModern}>EMAIL</Text>
                <Text style={styles.valueModern}>{profile?.email || 'user@example.com'}</Text>
              </View>
            </View>

            <View style={styles.infoRowModern}>
              <View style={styles.infoIconBox}>
                <Ionicons name="id-card-outline" size={16} color="#00695C" />
              </View>
              <View style={styles.infoContentModern}>
                <Text style={styles.labelModern}>NIP</Text>
                <Text style={styles.valueModern}>{profile?.nip || '-'}</Text>
              </View>
            </View>

            <View style={styles.infoRowModern}>
              <View style={styles.infoIconBox}>
                <Ionicons name="call" size={16} color="#00695C" />
              </View>
              <View style={styles.infoContentModern}>
                <Text style={styles.labelModern}>NOMOR TELEPON</Text>
                <Text style={styles.valueModern}>{profile?.no_telepon || '-'}</Text>
              </View>
            </View>

            <View style={styles.infoRowModern}>
              <View style={styles.infoIconBox}>
                <Ionicons name="transgender-outline" size={16} color="#00695C" />
              </View>
              <View style={styles.infoContentModern}>
                <Text style={styles.labelModern}>JENIS KELAMIN</Text>
                <Text style={styles.valueModern}>{profile?.jenis_kelamin || '-'}</Text>
              </View>
            </View>

            <View style={styles.infoRowModern}>
              <View style={styles.infoIconBox}>
                <Ionicons name="calendar-outline" size={16} color="#00695C" />
              </View>
              <View style={styles.infoContentModern}>
                <Text style={styles.labelModern}>TANGGAL LAHIR</Text>
                <Text style={styles.valueModern}>{profile?.tanggal_lahir ? (() => {
                  // Cek apakah sudah dalam format DD/MM/YYYY
                  if (profile.tanggal_lahir.includes('/')) {
                    return profile.tanggal_lahir;
                  }
                  // Jika dalam format ISO atau YYYY-MM-DD
                  try {
                    const date = new Date(profile.tanggal_lahir);
                    if (isNaN(date.getTime())) return '-';
                    const day = String(date.getDate()).padStart(2, '0');
                    const month = String(date.getMonth() + 1).padStart(2, '0');
                    const year = date.getFullYear();
                    return `${day}/${month}/${year}`;
                  } catch {
                    return '-';
                  }
                })() : '-'}</Text>
              </View>
            </View>

            <View style={styles.infoRowModern}>
              <View style={styles.infoIconBox}>
                <Ionicons name="ribbon-outline" size={16} color="#00695C" />
              </View>
              <View style={styles.infoContentModern}>
                <Text style={styles.labelModern}>JABATAN</Text>
                <Text style={styles.valueModern}>{profile?.jabatan || '-'}</Text>
              </View>
            </View>

            <View style={styles.infoRowModern}>
              <View style={styles.infoIconBox}>
                <Ionicons name="business-outline" size={16} color="#00695C" />
              </View>
              <View style={styles.infoContentModern}>
                <Text style={styles.labelModern}>DIVISI</Text>
                <Text style={styles.valueModern}>{profile?.divisi || '-'}</Text>
              </View>
            </View>

            <View style={styles.infoRowModern}>
              <View style={styles.infoIconBox}>
                <Ionicons name="location-outline" size={16} color="#00695C" />
              </View>
              <View style={styles.infoContentModern}>
                <Text style={styles.labelModern}>ALAMAT</Text>
                <Text style={styles.descriptionText}>{profile?.alamat || 'Alamat belum diisi'}</Text>
              </View>
            </View>

            <View style={[styles.infoRowModern, { marginBottom: 0 }]}>
              <View style={styles.infoIconBox}>
                <Ionicons name="pencil-outline" size={16} color="#00695C" />
              </View>
              <View style={styles.infoContentModern}>
                <Text style={styles.labelModern}>AKSI</Text>
                <TouchableOpacity 
                  style={styles.editProfileBtn}
                  onPress={() => router.push('/profile-pegawai/edit-profil' as any)}
                >
                  <Text style={styles.editProfileText}>Edit Profil</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Card 2: Pengaturan Akun */}
          <View style={styles.elegantCard}>
            <View style={styles.cardHeader}>
              <Ionicons name="settings-outline" size={20} color="#004643" />
              <Text style={styles.cardTitle}>Pengaturan Akun</Text>
            </View>
            
            <View style={styles.separator} />
            
            <View style={styles.infoRowModern}>
              <View style={styles.infoIconBox}>
                <Ionicons name="lock-closed-outline" size={16} color="#00695C" />
              </View>
              <View style={styles.infoContentModern}>
                <Text style={styles.labelModern}>KEAMANAN</Text>
                <TouchableOpacity onPress={() => router.push('/keamanan' as any)}>
                  <Text style={styles.linkText}>Pengaturan Keamanan</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={[styles.infoRowModern, { marginBottom: 0 }]}>
              <View style={styles.infoIconBox}>
                <Ionicons name="notifications-outline" size={16} color="#00695C" />
              </View>
              <View style={styles.infoContentModern}>
                <Text style={styles.labelModern}>NOTIFIKASI</Text>
                <TouchableOpacity>
                  <Text style={styles.linkText}>Pengaturan Notifikasi</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Card 3: Info & Dukungan */}
          <View style={styles.elegantCard}>
            <View style={styles.cardHeader}>
              <Ionicons name="information-circle-outline" size={20} color="#004643" />
              <Text style={styles.cardTitle}>Info & Dukungan</Text>
            </View>
            
            <View style={styles.separator} />
            
            <View style={styles.infoRowModern}>
              <View style={styles.infoIconBox}>
                <Ionicons name="shield-checkmark-outline" size={16} color="#00695C" />
              </View>
              <View style={styles.infoContentModern}>
                <Text style={styles.labelModern}>KEBIJAKAN PRIVASI</Text>
                <TouchableOpacity onPress={() => router.push('/tentang/kebijakan-privasi' as any)}>
                  <Text style={styles.linkText}>Lihat Kebijakan</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={[styles.infoRowModern, { marginBottom: 0 }]}>
              <View style={styles.infoIconBox}>
                <Ionicons name="document-text-outline" size={16} color="#00695C" />
              </View>
              <View style={styles.infoContentModern}>
                <Text style={styles.labelModern}>SYARAT & KETENTUAN</Text>
                <TouchableOpacity onPress={() => router.push('/tentang/syarat-ketentuan' as any)}>
                  <Text style={styles.linkText}>Lihat Syarat</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Card 4: Keluar Akun */}
          <View style={styles.elegantCard}>
            <View style={styles.cardHeader}>
              <Ionicons name="log-out-outline" size={20} color="#D32F2F" />
              <Text style={styles.cardTitle}>Keluar Akun</Text>
            </View>
            
            <View style={styles.separator} />
            
            <View style={[styles.infoRowModern, { marginBottom: 0 }]}>
              <View style={styles.infoIconBox}>
                <Ionicons name="log-out-outline" size={16} color="#D32F2F" />
              </View>
              <View style={styles.infoContentModern}>
                <Text style={styles.labelModern}>LOGOUT</Text>
                <TouchableOpacity onPress={() => setLogoutModal(true)}>
                  <Text style={[styles.linkText, { color: '#D32F2F' }]}>Keluar dari Akun</Text>
                </TouchableOpacity>
              </View>
            </View>
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
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  scrollContent: { paddingBottom: 30 },
  
  // Header Section
  profileHeader: {
    paddingTop: 20,
    paddingBottom: 30,
    paddingHorizontal: 25,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  profileContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  photoWrapper: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    borderColor: "rgba(255,255,255,0.3)",
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
    position: 'relative',
  },
  avatarImage: {
    width: "100%",
    height: "100%",
  },
  avatarPlaceholder: {
    width: "100%",
    height: "100%",
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarInitial: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#fff",
  },
  profileTextInfo: {
    marginLeft: 20,
    flex: 1,
  },
  mainName: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 4,
  },
  subText: {
    fontSize: 14,
    color: "#E0F2F1",
    marginBottom: 8,
  },
  badgeMini: {
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: "flex-start",
  },
  badgeTextMini: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
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
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    alignSelf: 'flex-start',
  },
  editProfileText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#00695C',
  },
  linkText: {
    fontSize: 14,
    color: '#00695C',
    fontWeight: '500',
  },
  
  // Info Section
  infoSection: { marginTop: -20, paddingHorizontal: 16 },
  elegantCard: {
    backgroundColor: '#FFF',
    marginBottom: 16,
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 3,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#1A1A1A', marginLeft: 10 },
  separator: { height: 1, backgroundColor: '#F0F3F3', marginBottom: 18 },
  
  // Modern Info Rows
  infoRowModern: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 18 },
  infoIconBox: { 
    width: 34, height: 34, backgroundColor: '#F0F7F7',
    borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 15, marginTop: 2 
  },
  infoContentModern: { flex: 1 },
  labelModern: { fontSize: 10, fontWeight: '800', color: '#95A5A6', letterSpacing: 1.1, marginBottom: 5 },
  valueModern: { fontSize: 15, fontWeight: '600', color: '#2C3E50', lineHeight: 20 },
  descriptionText: { fontSize: 14, color: '#576574', lineHeight: 22, fontWeight: '400' },
  
  // Menu Items
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 18,
    paddingHorizontal: 18,
  },
  menuLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
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
    marginHorizontal: -20,
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

  // Skeleton Styles
  skeletonAvatar: { width: '100%', height: '100%', backgroundColor: 'rgba(255,255,255,0.3)', borderRadius: 40 },
  skeletonName: { width: '70%', height: 20, backgroundColor: 'rgba(255,255,255,0.3)', borderRadius: 4, marginBottom: 8 },
  skeletonNip: { width: '50%', height: 14, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 4, marginBottom: 8 },
  skeletonBadge: { width: '40%', height: 20, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 6 },
  skeletonIcon: { width: 20, height: 20, backgroundColor: '#E2E8F0', borderRadius: 4 },
  skeletonCardTitle: { width: '60%', height: 16, backgroundColor: '#E2E8F0', borderRadius: 4, marginLeft: 10 },
  skeletonIconBox: { width: 34, height: 34, backgroundColor: '#E2E8F0', borderRadius: 12, marginRight: 15, marginTop: 2 },
  skeletonLabel: { width: '80%', height: 10, backgroundColor: '#F1F5F9', borderRadius: 4, marginBottom: 5 },
  skeletonValue: { width: '60%', height: 15, backgroundColor: '#E2E8F0', borderRadius: 4 },
});
