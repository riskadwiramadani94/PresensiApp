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
import { SkeletonLoader, AppHeader } from "../../components";
import * as ImagePicker from 'expo-image-picker';

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
        Alert.alert('Error', 'Silakan login ulang');
        router.replace('/');
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
      Alert.alert("Error", "Gagal memuat profil admin");
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
      Alert.alert('Error', 'Gagal keluar dari akun');
    }
  };

  /* ========================================
     IMAGE HANDLERS
  ======================================== */
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
        const photoUri = result.assets[0].uri;
        await uploadPhoto(photoUri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Gagal memilih foto');
    }
  };

  const uploadPhoto = async (photoUri: string) => {
    setUploading(true);
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
        
        {/* SECTION: PROFILE INFO */}
        <View style={styles.profileSection}>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{profile?.nama_lengkap || 'Administrator'}</Text>
            <Text style={styles.profileEmail}>{profile?.email || 'admin@example.com'}</Text>
            
            {/* BUTTON: EDIT PROFILE */}
            <TouchableOpacity 
              style={styles.editProfileBtn}
              onPress={() => router.push({ pathname: '/profile-admin/edit-profil', params: { modal: 'true' } } as any)}
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
                  onError={(e) => {
                    console.log('Image load error:', e.nativeEvent.error);
                    console.log('Image URL:', getApiUrl(`/${profile.foto_profil}`));
                  }}
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
              {uploading ? (
                <ActivityIndicator size="small" color="#004643" />
              ) : (
                <Ionicons name="camera-outline" size={16} color="#004643" />
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* DIVIDER */}
        <View style={styles.divider} />
        {/* MENU SECTIONS */}
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

        {/* INFO DAN DUKUNGAN SELENGKAPNYA */}
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

        {/* AKUN */}
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
    </View>
  );
}

/* ========================================
   STYLES
======================================== */
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  scrollContent: {
    paddingBottom: 30,
  },
  
  // Profile Section
  profileSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 20,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  profileImageWrapper: {
    position: 'relative',
  },
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
  editProfileText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#004643',
  },
  
  // Divider
  divider: {
    height: 1,
    backgroundColor: '#E0E0E0',
    marginVertical: 10,
  },
  
  // Section
  section: {
    paddingHorizontal: 20,
    marginTop: 10,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#999',
    marginBottom: 10,
    marginLeft: 5,
    letterSpacing: 0.5,
  },
  
  // Menu Card
  menuCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Platform.OS === 'ios' ? 14 : 16,
    paddingHorizontal: 15,
  },
  menuLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  menuText: {
    fontSize: 15,
    color: '#333',
    fontWeight: '500',
  },
  menuDivider: {
    height: 1,
    backgroundColor: '#F0F0F0',
    marginHorizontal: -15,
  },
  
  // Modal
  logoutModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    paddingTop: Platform.OS === 'android' ? 0 : 50,
  },
  logoutModalContent: { 
    backgroundColor: '#fff', 
    borderRadius: 16, 
    padding: 24, 
    width: '85%', 
    maxWidth: 320 
  },
  logoutModalHeader: { 
    alignItems: 'center', 
    marginBottom: 24 
  },
  logoutModalTitle: { 
    fontSize: 20, 
    fontWeight: 'bold', 
    color: '#333', 
    marginTop: 12, 
    marginBottom: 8 
  },
  logoutModalMessage: { 
    fontSize: 16, 
    color: '#666', 
    textAlign: 'center', 
    lineHeight: 22 
  },
  logoutModalButtons: { 
    flexDirection: 'row', 
    gap: 12 
  },
  logoutCancelBtn: { 
    flex: 1, 
    paddingVertical: 12, 
    borderRadius: 8, 
    backgroundColor: '#F5F5F5', 
    alignItems: 'center' 
  },
  logoutCancelText: { 
    fontSize: 16, 
    fontWeight: '600', 
    color: '#666' 
  },
  logoutConfirmBtn: { 
    flex: 1, 
    paddingVertical: 12, 
    borderRadius: 8, 
    backgroundColor: '#FF4D4D', 
    alignItems: 'center' 
  },
  logoutConfirmText: { 
    fontSize: 16, 
    fontWeight: '600', 
    color: '#fff' 
  },

  /* ========================================
     SKELETON STYLES - PROFIL ADMIN
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
    marginBottom: 12,
  },
  skeletonEditBtn: {
    width: 100,
    height: 36,
    backgroundColor: '#E0E0E0',
    borderRadius: 20,
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
    marginBottom: 10,
    marginLeft: 5,
  },
  skeletonMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Platform.OS === 'ios' ? 14 : 16,
    paddingHorizontal: 15,
  },
  skeletonIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#E0E0E0',
    marginRight: 12,
  },
  skeletonMenuText: {
    width: '50%',
    height: 16,
    backgroundColor: '#F0F0F0',
    borderRadius: 4,
  },
});
