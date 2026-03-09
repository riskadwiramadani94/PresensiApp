import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter, useFocusEffect } from "expo-router";
import React, { useEffect, useState, useCallback } from "react";
import {
  Alert,
  Modal,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Image,
  ActivityIndicator,
  StatusBar as RNStatusBar
} from "react-native";
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from "expo-linear-gradient";
import { API_CONFIG, getApiUrl } from "../../constants/config";
import { AppHeader, CustomAlert } from "../../components";
import * as ImagePicker from 'expo-image-picker';
import { useCustomAlert } from "../../hooks/useCustomAlert";

/* ========================================
   TYPES & INTERFACES
======================================== */
interface AdminProfile {
  id_user: number;
  email: string;
  role: string;
  nama_lengkap?: string;
  foto_profil?: string;
  no_telepon?: string;
}

/* ========================================
   MAIN COMPONENT
======================================== */
export default function ProfilAdminScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const alert = useCustomAlert();
  const [profile, setProfile] = useState<AdminProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [logoutModal, setLogoutModal] = useState(false);
  const [uploading, setUploading] = useState(false);

  /* ========================================
     DATA FETCHING
  ======================================== */
  useFocusEffect(
    useCallback(() => {
      fetchProfile();
    }, [])
  );

  const fetchProfile = async () => {
    try {
      console.log("Fetching admin profile...");

      // Get user data from AsyncStorage
      const userDataStr = await AsyncStorage.getItem("userData");
      const userData = userDataStr ? JSON.parse(userDataStr) : null;
      
      if (!userData) {
        alert.showAlert({ type: 'error', message: 'Silakan login ulang', onConfirm: () => router.replace('/') });
        return;
      }
      
      // Gunakan data dari AsyncStorage sebagai fallback
      const fallbackProfile = {
        id_user: userData.id_user || userData.id,
        email: userData.email,
        role: userData.role || 'admin',
        nama_lengkap: userData.nama_lengkap || 'Administrator',
        foto_profil: userData.foto_profil || null,
        no_telepon: userData.no_telepon || ''
      };
      
      setProfile(fallbackProfile);
      
        // Coba ambil dari server (opsional)
        try {
          const userId = userData.id_user || userData.id;
          const url = getApiUrl(`${API_CONFIG.ENDPOINTS.ADMIN}/profile`);
          console.log("Profile URL:", url);

          const response = await fetch(url, {
            method: "GET",
            headers: { 
              "Content-Type": "application/json",
              "user-id": userId.toString()
            }
          });
          const result = await response.json();

          console.log("Profile Response:", JSON.stringify(result, null, 2));

          if (result.success && result.data) {
            console.log("User data from server:", result.data);
            console.log("Foto profil path:", result.data.foto_profil);
            console.log("Full foto URL:", result.data.foto_profil ? getApiUrl(result.data.foto_profil) : 'No photo');
            setProfile(result.data);
            
            // Update AsyncStorage with latest data
            const updatedUserData = {
              ...userData,
              ...result.data
            };
            await AsyncStorage.setItem('userData', JSON.stringify(updatedUserData));
          }
        } catch (serverError) {
          console.log("Server error (using fallback):", serverError);
          // Tetap gunakan data fallback
        }
    } catch (error) {
      console.error("Error fetching profile:", error);
      alert.showAlert({ type: 'error', message: 'Gagal memuat profil admin' });
    } finally {
      setLoading(false);
    }
  };

  /* ========================================
     EVENT HANDLERS
  ======================================== */
  const handleLogout = async () => {
    try {
      await AsyncStorage.removeItem('userData');
      await AsyncStorage.removeItem('userToken');
      setLogoutModal(false);
      router.replace('/');
    } catch (error) {
      console.error('Error during logout:', error);
      alert.showAlert({ type: 'error', message: 'Gagal keluar dari akun' });
    }
  };

  /* ========================================
     IMAGE HANDLERS
  ======================================== */
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
        const photoUri = result.assets[0].uri;
        await uploadPhoto(photoUri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      alert.showAlert({ type: 'error', message: 'Gagal memilih foto' });
    }
  };

  const uploadPhoto = async (photoUri: string) => {
    setUploading(true);
    try {
      const userDataStr = await AsyncStorage.getItem('userData');
      const userData = userDataStr ? JSON.parse(userDataStr) : null;

      if (!userData) {
        alert.showAlert({ type: 'error', message: 'Silakan login ulang', onConfirm: () => router.replace('/') });
        return;
      }

      const userId = userData.id_user || userData.id;
      const formData = new FormData();
      
      formData.append('nama_lengkap', profile?.nama_lengkap || userData.nama_lengkap);
      formData.append('email', profile?.email || userData.email);
      formData.append('no_telepon', profile?.no_telepon || userData.no_telepon || '');

      const filename = photoUri.split('/').pop() || 'profile.jpg';
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : 'image/jpeg';

      formData.append('foto_profil', {
        uri: photoUri,
        name: filename,
        type: type,
      } as any);

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
        const updatedUserData = {
          ...userData,
          foto_profil: result.data?.foto_profil || profile?.foto_profil
        };
        await AsyncStorage.setItem('userData', JSON.stringify(updatedUserData));
        
        setProfile({
          ...profile!,
          foto_profil: result.data?.foto_profil || profile?.foto_profil || null
        });
        
        alert.showAlert({ type: 'success', message: 'Foto profil berhasil diperbarui' });
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
     RENDER
  ======================================== */
  if (loading) {
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
        {/* ========================================
             SKELETON LOADING STATE - PROFIL ADMIN
        ======================================== */}
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
            {/* Skeleton Card 1 */}
            <View style={styles.elegantCard}>
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
              <View style={styles.infoRowModern}>
                <View style={styles.skeletonIconBox} />
                <View style={styles.infoContentModern}>
                  <View style={styles.skeletonLabel} />
                  <View style={styles.skeletonValue} />
                </View>
              </View>
              <View style={[styles.infoRowModern, { marginBottom: 0 }]}>
                <View style={styles.skeletonIconBox} />
                <View style={styles.infoContentModern}>
                  <View style={styles.skeletonLabel} />
                  <View style={styles.skeletonDescription} />
                </View>
              </View>
            </View>

            {/* Skeleton Card 2 */}
            <View style={styles.elegantCard}>
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
              <View style={[styles.infoRowModern, { marginBottom: 0 }]}>
                <View style={styles.skeletonIconBox} />
                <View style={styles.infoContentModern}>
                  <View style={styles.skeletonLabel} />
                  <View style={styles.skeletonValue} />
                </View>
              </View>
            </View>

            {/* Skeleton Card 3 */}
            <View style={styles.elegantCard}>
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
              <View style={[styles.infoRowModern, { marginBottom: 0 }]}>
                <View style={styles.skeletonIconBox} />
                <View style={styles.infoContentModern}>
                  <View style={styles.skeletonLabel} />
                  <View style={styles.skeletonValue} />
                </View>
              </View>
            </View>

            {/* Skeleton Card 4 */}
            <View style={styles.elegantCard}>
              <View style={styles.cardHeader}>
                <View style={styles.skeletonIcon} />
                <View style={styles.skeletonCardTitle} />
              </View>
              <View style={styles.separator} />
              <View style={[styles.infoRowModern, { marginBottom: 0 }]}>
                <View style={styles.skeletonIconBox} />
                <View style={styles.infoContentModern}>
                  <View style={styles.skeletonLabel} />
                  <View style={styles.skeletonValue} />
                </View>
              </View>
            </View>
          </View>
        </ScrollView>
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
      
      {/* HEADER */}
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
                  onError={(e) => {
                    console.log('Image load error:', e.nativeEvent.error);
                    console.log('Image URL:', getApiUrl(`/${profile.foto_profil}`));
                  }}
                />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Text style={styles.avatarInitial}>
                    {profile?.nama_lengkap?.charAt(0).toUpperCase() || 'A'}
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
              <Text style={styles.mainName}>{profile?.nama_lengkap || 'Administrator'}</Text>
              <Text style={styles.subText}>{profile?.email || 'admin@example.com'}</Text>
              <View style={styles.badgeMini}>
                <Text style={styles.badgeTextMini}>{profile?.role || 'Admin'}</Text>
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
              <TouchableOpacity 
                style={styles.editProfileBtnHeader}
                onPress={() => router.push({ pathname: '/profile-admin/edit-profil', params: { modal: 'true' } } as any)}
              >
                <Ionicons name="pencil-outline" size={16} color="#00695C" />
                <Text style={styles.editProfileTextHeader}>Edit</Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.separator} />
            
            <View style={styles.infoRowModern}>
              <View style={styles.infoIconBox}>
                <Ionicons name="mail-outline" size={16} color="#00695C" />
              </View>
              <View style={styles.infoContentModern}>
                <Text style={styles.labelModern}>EMAIL</Text>
                <Text style={styles.valueModern}>{profile?.email || 'admin@example.com'}</Text>
              </View>
            </View>

            <View style={[styles.infoRowModern, { marginBottom: 0 }]}>
              <View style={styles.infoIconBox}>
                <Ionicons name="call" size={16} color="#00695C" />
              </View>
              <View style={styles.infoContentModern}>
                <Text style={styles.labelModern}>NOMOR TELEPON</Text>
                <Text style={styles.valueModern}>{profile?.no_telepon || '-'}</Text>
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
            
            <TouchableOpacity 
              style={styles.menuItem}
              onPress={() => router.push('/keamanan' as any)}
            >
              <View style={styles.menuLeft}>
                <View style={[styles.iconCircle, { backgroundColor: '#F0F7F7' }]}>
                  <Ionicons name="lock-closed-outline" size={18} color="#00695C" />
                </View>
                <Text style={styles.menuText}>Pengaturan Keamanan</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#00695C" />
            </TouchableOpacity>

            <View style={styles.menuDivider} />

            <TouchableOpacity style={styles.menuItem}>
              <View style={styles.menuLeft}>
                <View style={[styles.iconCircle, { backgroundColor: '#F0F7F7' }]}>
                  <Ionicons name="notifications-outline" size={18} color="#00695C" />
                </View>
                <Text style={styles.menuText}>Pengaturan Notifikasi</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#00695C" />
            </TouchableOpacity>
          </View>

          {/* Card 3: Info & Dukungan */}
          <View style={styles.elegantCard}>
            <View style={styles.cardHeader}>
              <Ionicons name="information-circle-outline" size={20} color="#004643" />
              <Text style={styles.cardTitle}>Info & Dukungan</Text>
            </View>
            
            <View style={styles.separator} />
            
            <TouchableOpacity 
              style={styles.menuItem}
              onPress={() => router.push('/tentang/kebijakan-privasi' as any)}
            >
              <View style={styles.menuLeft}>
                <View style={[styles.iconCircle, { backgroundColor: '#F0F7F7' }]}>
                  <Ionicons name="shield-checkmark-outline" size={18} color="#00695C" />
                </View>
                <Text style={styles.menuText}>Kebijakan Privasi</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#00695C" />
            </TouchableOpacity>

            <View style={styles.menuDivider} />

            <TouchableOpacity 
              style={styles.menuItem}
              onPress={() => router.push('/tentang/syarat-ketentuan' as any)}
            >
              <View style={styles.menuLeft}>
                <View style={[styles.iconCircle, { backgroundColor: '#F0F7F7' }]}>
                  <Ionicons name="document-text-outline" size={18} color="#00695C" />
                </View>
                <Text style={styles.menuText}>Syarat & Ketentuan</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#00695C" />
            </TouchableOpacity>
          </View>

          {/* Card 4: Keluar Akun */}
          <View style={styles.elegantCard}>
            <View style={styles.cardHeader}>
              <Ionicons name="log-out-outline" size={20} color="#D32F2F" />
              <Text style={styles.cardTitle}>Keluar Akun</Text>
            </View>
            
            <View style={styles.separator} />
            
            <TouchableOpacity 
              style={styles.menuItem}
              onPress={() => setLogoutModal(true)}
            >
              <View style={styles.menuLeft}>
                <View style={[styles.iconCircle, { backgroundColor: '#FFEBEE' }]}>
                  <Ionicons name="log-out-outline" size={18} color="#D32F2F" />
                </View>
                <Text style={[styles.menuText, { color: '#D32F2F' }]}>Keluar dari Akun</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#D32F2F" />
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Modal Konfirmasi Logout */}
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

/* ========================================
   STYLES
======================================== */
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  scrollContent: {
    paddingBottom: 30,
  },
  
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
  editProfileBtnHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F7F7',
    borderWidth: 1,
    borderColor: '#E8F5F4',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 4,
  },
  editProfileTextHeader: {
    fontSize: 12,
    fontWeight: '600',
    color: '#00695C',
  },
  linkText: {
    fontSize: 14,
    color: '#00695C',
    fontWeight: '500',
  },
  
  // Menu Items
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 0,
  },
  menuLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  menuText: {
    fontSize: 14,
    color: '#1A1A1A',
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  menuDivider: {
    height: 1,
    backgroundColor: '#F0F3F3',
    marginVertical: 4,
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
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#1A1A1A', marginLeft: 10, flex: 1 },
  separator: { height: 1, backgroundColor: '#F0F3F3', marginBottom: 0 },
  
  // Modern Info Rows
  infoRowModern: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 },
  infoIconBox: { 
    width: 34, height: 34, backgroundColor: '#F0F7F7',
    borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 15, marginTop: 2 
  },
  infoContentModern: { flex: 1 },
  labelModern: { fontSize: 10, fontWeight: '800', color: '#95A5A6', letterSpacing: 1.1, marginBottom: 5 },
  valueModern: { fontSize: 15, fontWeight: '600', color: '#2C3E50', lineHeight: 20 },
  
  // Modal
  logoutModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
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
     SKELETON STYLES - PROFIL ADMIN
  ======================================== */
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
  skeletonDescription: { width: '90%', height: 14, backgroundColor: '#E2E8F0', borderRadius: 4 },
});
