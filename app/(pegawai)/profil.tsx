import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { Alert, Image, Modal, Platform, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { PegawaiAPI } from '../../constants/config';
import { AuthStorage } from '../../utils/AuthStorage';

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
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [editModal, setEditModal] = useState(false);
  const [logoutModal, setLogoutModal] = useState(false);
  const [hasNIP, setHasNIP] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [editData, setEditData] = useState({
    nip: '',
    jenis_kelamin: '',
    jabatan: '',
    divisi: '',
    no_telepon: '',
    alamat: '',
    tanggal_lahir: '',
    password_baru: '',
    konfirmasi_password: ''
  });

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      const userData = await AuthStorage.getUser();
      if (userData) {
        setUser(userData);
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
      console.log('Fetching profile...');
      
      const currentUser = userData || user;
      
      if (!currentUser) {
        console.log('No user data, redirecting to login');
        Alert.alert('Error', 'Silakan login ulang');
        router.replace('/');
        return;
      }
      
      console.log('User data from AsyncStorage:', currentUser);
      
      // Coba berbagai kemungkinan field untuk user ID
      const userId = currentUser.id_user || currentUser.id;
      console.log('Extracted user ID:', userId);
      
      if (!userId) {
        console.log('No valid user ID found, using fallback data only');
        // Gunakan data dari AsyncStorage sebagai fallback
        const fallbackProfile = {
          id_user: 0,
          nama_lengkap: currentUser.nama_lengkap || 'User',
          email: currentUser.email || 'No email',
          jabatan: currentUser.jabatan || 'Staff',
          nip: currentUser.nip || 'Belum ada NIP',
          no_telepon: currentUser.no_telepon || 'Belum diisi',
          divisi: currentUser.divisi || 'Umum',
          jenis_kelamin: currentUser.jenis_kelamin || 'Belum diisi',
          alamat: currentUser.alamat || 'Belum diisi',
          tanggal_lahir: currentUser.tanggal_lahir || 'Belum diisi',
          foto_profil: null
        };
        
        setProfile(fallbackProfile);
        setHasNIP(!!fallbackProfile.nip);
        setEditData({
          nip: fallbackProfile.nip || '',
          jenis_kelamin: fallbackProfile.jenis_kelamin || '',
          jabatan: fallbackProfile.jabatan || '',
          divisi: fallbackProfile.divisi || '',
          no_telepon: fallbackProfile.no_telepon || '',
          alamat: fallbackProfile.alamat || '',
          tanggal_lahir: fallbackProfile.tanggal_lahir || '',
          password_baru: '',
          konfirmasi_password: ''
        });
        return;
      }
      
      console.log('User ID:', userId);
      console.log('Calling PegawaiAPI.getProfile...');
      
      // Coba ambil dari server terlebih dahulu
      try {
        const result = await PegawaiAPI.getProfile(userId.toString());
        console.log('Server response:', result);
        
        if (result.success && result.data) {
          console.log('Profile data from server:', result.data);
          setProfile(result.data);
          setHasNIP(!!result.data.nip);
          setEditData({
            nip: result.data.nip || '',
            jenis_kelamin: result.data.jenis_kelamin || '',
            jabatan: result.data.jabatan || '',
            divisi: result.data.divisi || '',
            no_telepon: result.data.no_telepon || '',
            alamat: result.data.alamat || '',
            tanggal_lahir: result.data.tanggal_lahir || '',
            password_baru: '',
            konfirmasi_password: ''
          });
          return;
        }
      } catch (serverError) {
        console.log('Server error, using AsyncStorage data:', serverError);
      }
      
      // Fallback ke data AsyncStorage
      console.log('Using fallback data from AsyncStorage');
      const fallbackProfile = {
        id_user: parseInt(userId),
        nama_lengkap: currentUser.nama_lengkap || 'User',
        email: currentUser.email || 'No email',
        jabatan: currentUser.jabatan || 'Staff',
        nip: currentUser.nip || 'Belum ada NIP',
        no_telepon: currentUser.no_telepon || 'Belum diisi',
        divisi: currentUser.divisi || 'Umum',
        jenis_kelamin: currentUser.jenis_kelamin || 'Belum diisi',
        alamat: currentUser.alamat || 'Belum diisi',
        tanggal_lahir: currentUser.tanggal_lahir || 'Belum diisi',
        foto_profil: null
      };
      
      console.log('Fallback profile:', fallbackProfile);
      setProfile(fallbackProfile);
      setHasNIP(!!fallbackProfile.nip);
      setEditData({
        nip: fallbackProfile.nip || '',
        jenis_kelamin: fallbackProfile.jenis_kelamin || '',
        jabatan: fallbackProfile.jabatan || '',
        divisi: fallbackProfile.divisi || '',
        no_telepon: fallbackProfile.no_telepon || '',
        alamat: fallbackProfile.alamat || '',
        tanggal_lahir: fallbackProfile.tanggal_lahir || '',
        password_baru: '',
        konfirmasi_password: ''
      });
    } catch (error) {
      console.error('Profile Error:', error);
      Alert.alert('Error', 'Gagal memuat profil: ' + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const updateProfile = async () => {
    try {
      if (!user) {
        Alert.alert('Error', 'Silakan login ulang');
        return;
      }
      
      const userId = user.id_user || user.id;
      if (!userId) {
        Alert.alert('Error', 'Data login tidak valid');
        return;
      }
      
      const result = await PegawaiAPI.updateProfile({
        user_id: userId.toString(),
        nama_lengkap: profile?.nama_lengkap,
        no_telepon: editData.no_telepon,
        alamat: editData.alamat
      });
      
      if (result.success) {
        Alert.alert('Sukses', result.message);
        setEditModal(false);
        fetchProfile();
      } else {
        Alert.alert('Error', result.message);
      }
    } catch (error) {
      Alert.alert('Error', 'Gagal update profil');
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

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text>Memuat profil...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        
        {/* HEADER PROFIL */}
        <View style={styles.profileHeader}>
          <View style={styles.imageWrapper}>
            <Image 
              source={{ 
                uri: profile?.foto_profil || `https://ui-avatars.com/api/?name=${profile?.nama_lengkap}&background=004643&color=fff&size=128`
              }} 
              style={styles.profileImage} 
            />
            <TouchableOpacity style={styles.editIcon}>
              <Ionicons name="camera" size={18} color="#fff" />
            </TouchableOpacity>
          </View>
          <Text style={styles.userName}>{profile?.nama_lengkap || 'User'}</Text>
          <Text style={styles.userRole}>👤 {profile?.jabatan || 'Pegawai'}</Text>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>NIP: {profile?.nip || 'Belum ada'}</Text>
          </View>
        </View>

        {/* INFO PRIBADI */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Informasi Pribadi</Text>
            <TouchableOpacity 
              style={styles.editBtn}
              onPress={() => setEditModal(true)}
            >
              <Ionicons name="create-outline" size={16} color="#004643" />
              <Text style={styles.editBtnText}>Edit</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.infoCard}>
            <InfoItem icon="mail-outline" label="Email" value={profile?.email || '-'} />
            <InfoItem icon="call-outline" label="Telepon" value={profile?.no_telepon || 'Belum diisi'} />
            <InfoItem icon="business-outline" label="Jabatan" value={profile?.jabatan || 'Belum diisi'} />
            <InfoItem icon="briefcase-outline" label="Divisi" value={profile?.divisi || 'Belum diisi'} />
            <InfoItem icon="person-outline" label="Jenis Kelamin" value={profile?.jenis_kelamin || 'Belum diisi'} />
            <InfoItem icon="location-outline" label="Alamat" value={profile?.alamat || 'Belum diisi'} />
            <InfoItem icon="calendar-outline" label="Tanggal Lahir" value={profile?.tanggal_lahir || 'Belum diisi'} />
          </View>
        </View>

        {/* PENGATURAN & LAINNYA */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Pengaturan Aplikasi</Text>
          <View style={styles.infoCard}>
            <MenuLink icon="shield-checkmark-outline" title="Ubah Password" />
            <MenuLink icon="notifications-outline" title="Pengaturan Notifikasi" />
            <MenuLink icon="help-circle-outline" title="Pusat Bantuan" />
          </View>
        </View>

        {/* TOMBOL LOGOUT */}
        <TouchableOpacity style={styles.logoutBtn} onPress={() => setLogoutModal(true)}>
          <Ionicons name="log-out-outline" size={20} color="#FF4D4D" />
          <Text style={styles.logoutText}>Keluar Akun</Text>
        </TouchableOpacity>



      </ScrollView>
      
      {/* Modal Edit */}
      <Modal visible={editModal} transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{hasNIP ? 'Edit Profil' : 'Lengkapi Profil'}</Text>
            
            {!hasNIP && (
              <>
                <Text style={styles.inputLabel}>NIP</Text>
                <TextInput
                  style={styles.input}
                  value={editData.nip}
                  onChangeText={(text) => setEditData({...editData, nip: text})}
                  placeholder="Masukkan NIP"
                />
                
                <Text style={styles.inputLabel}>Jenis Kelamin</Text>
                <View style={styles.genderContainer}>
                  <TouchableOpacity 
                    style={[styles.genderBtn, editData.jenis_kelamin === 'Laki-laki' && styles.genderBtnActive]}
                    onPress={() => setEditData({...editData, jenis_kelamin: 'Laki-laki'})}
                  >
                    <Text style={[styles.genderText, editData.jenis_kelamin === 'Laki-laki' && styles.genderTextActive]}>Laki-laki</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.genderBtn, editData.jenis_kelamin === 'Perempuan' && styles.genderBtnActive]}
                    onPress={() => setEditData({...editData, jenis_kelamin: 'Perempuan'})}
                  >
                    <Text style={[styles.genderText, editData.jenis_kelamin === 'Perempuan' && styles.genderTextActive]}>Perempuan</Text>
                  </TouchableOpacity>
                </View>
                
                <Text style={styles.inputLabel}>Jabatan</Text>
                <TextInput
                  style={styles.input}
                  value={editData.jabatan}
                  onChangeText={(text) => setEditData({...editData, jabatan: text})}
                  placeholder="Masukkan jabatan"
                />
                
                <Text style={styles.inputLabel}>Divisi</Text>
                <TextInput
                  style={styles.input}
                  value={editData.divisi}
                  onChangeText={(text) => setEditData({...editData, divisi: text})}
                  placeholder="Masukkan divisi"
                />
                
                <Text style={styles.inputLabel}>Tanggal Lahir</Text>
                <TextInput
                  style={styles.input}
                  value={editData.tanggal_lahir}
                  onChangeText={(text) => setEditData({...editData, tanggal_lahir: text})}
                  placeholder="YYYY-MM-DD"
                />
              </>
            )}
            
            <Text style={styles.inputLabel}>No. Telepon</Text>
            <TextInput
              style={styles.input}
              value={editData.no_telepon}
              onChangeText={(text) => setEditData({...editData, no_telepon: text})}
              placeholder="Masukkan nomor telepon"
            />
            
            <Text style={styles.inputLabel}>Alamat</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={editData.alamat}
              onChangeText={(text) => setEditData({...editData, alamat: text})}
              placeholder="Masukkan alamat"
              multiline
              numberOfLines={3}
            />
            
            <View style={styles.divider} />
            <Text style={styles.sectionLabel}>Ubah Password (Opsional)</Text>
            
            <Text style={styles.inputLabel}>Password Baru</Text>
            <View style={styles.passwordContainer}>
              <TextInput
                style={styles.passwordInput}
                value={editData.password_baru}
                onChangeText={(text) => setEditData({...editData, password_baru: text})}
                placeholder="Kosongkan jika tidak ubah password"
                secureTextEntry={!showPassword}
              />
              <TouchableOpacity 
                style={styles.eyeButton}
                onPress={() => setShowPassword(!showPassword)}
              >
                <Ionicons 
                  name={showPassword ? "eye-off-outline" : "eye-outline"} 
                  size={20} 
                  color="#666" 
                />
              </TouchableOpacity>
            </View>
            
            <Text style={styles.inputLabel}>Konfirmasi Password Baru</Text>
            <View style={styles.passwordContainer}>
              <TextInput
                style={styles.passwordInput}
                value={editData.konfirmasi_password}
                onChangeText={(text) => setEditData({...editData, konfirmasi_password: text})}
                placeholder="Ulangi password baru"
                secureTextEntry={!showConfirmPassword}
              />
              <TouchableOpacity 
                style={styles.eyeButton}
                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                <Ionicons 
                  name={showConfirmPassword ? "eye-off-outline" : "eye-outline"} 
                  size={20} 
                  color="#666" 
                />
              </TouchableOpacity>
            </View>
            
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.modalBtn, styles.cancelBtn]}
                onPress={() => setEditModal(false)}
              >
                <Text style={styles.cancelBtnText}>Batal</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modalBtn, styles.saveBtn]}
                onPress={updateProfile}
              >
                <Text style={styles.saveBtnText}>Simpan</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      
      {/* Modal Konfirmasi Logout */}
      <Modal visible={logoutModal} transparent animationType="fade">
        <TouchableOpacity 
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.5)',
            justifyContent: 'center',
            alignItems: 'center',
            paddingTop: Platform.OS === 'ios' ? 50 : 30,
          }}
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
    </SafeAreaView>
  );
}

function InfoItem({ icon, label, value }: any) {
  return (
    <View style={styles.infoItem}>
      <Ionicons name={icon} size={20} color="#004643" style={styles.infoIcon} />
      <View>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value}</Text>
      </View>
    </View>
  );
}

function MenuLink({ icon, title }: any) {
  return (
    <TouchableOpacity style={styles.menuLink}>
      <View style={styles.menuLinkLeft}>
        <Ionicons name={icon} size={20} color="#555" />
        <Text style={styles.menuLinkText}>{title}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color="#CCC" />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFB' },
  scrollContent: { paddingTop: Platform.OS === 'ios' ? 0 : 20 },
  profileHeader: { backgroundColor: '#fff', alignItems: 'center', paddingTop: Platform.OS === 'ios' ? 20 : 40, paddingBottom: 30, borderBottomLeftRadius: 30, borderBottomRightRadius: 30, elevation: 2 },
  imageWrapper: { position: 'relative', marginBottom: 15 },
  profileImage: { width: 100, height: 100, borderRadius: 50, borderWidth: 3, borderColor: '#004643' },
  editIcon: { position: 'absolute', bottom: 0, right: 0, backgroundColor: '#004643', padding: 8, borderRadius: 20, borderWidth: 2, borderColor: '#fff' },
  userName: { fontSize: 22, fontWeight: 'bold', color: '#333' },
  userRole: { fontSize: 14, color: '#777', marginTop: 4 },
  badge: { backgroundColor: '#E6F0EF', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20, marginTop: 10 },
  badgeText: { color: '#004643', fontSize: 12, fontWeight: 'bold' },
  section: { marginTop: 25, paddingHorizontal: 20 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 15, fontWeight: 'bold', color: '#333' },
  editBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#E6F0EF', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  editBtnText: { marginLeft: 4, fontSize: 12, color: '#004643', fontWeight: '500' },
  infoCard: { backgroundColor: '#fff', borderRadius: 15, paddingVertical: 10, elevation: 1 },
  infoItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 15, paddingVertical: 12 },
  infoIcon: { width: 35 },
  infoLabel: { fontSize: 11, color: '#999' },
  infoValue: { fontSize: 14, color: '#333', fontWeight: '500' },
  menuLink: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 15, paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  menuLinkLeft: { flexDirection: 'row', alignItems: 'center' },
  menuLinkText: { marginLeft: 15, fontSize: 14, color: '#333' },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 30, marginBottom: 100 },
  logoutText: { marginLeft: 10, color: '#FF4D4D', fontWeight: 'bold', fontSize: 16 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
  },
  modalContent: { backgroundColor: '#fff', margin: 20, padding: 20, borderRadius: 15, width: '90%' },
  modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
  inputLabel: { fontSize: 14, fontWeight: '500', marginBottom: 8, color: '#333' },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 12, marginBottom: 15, fontSize: 14 },
  textArea: { height: 80, textAlignVertical: 'top' },
  modalButtons: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
  modalBtn: { flex: 1, padding: 12, borderRadius: 8, marginHorizontal: 5 },
  cancelBtn: { backgroundColor: '#f5f5f5' },
  saveBtn: { backgroundColor: '#004643' },
  cancelBtnText: { textAlign: 'center', color: '#666', fontWeight: '500' },
  saveBtnText: { textAlign: 'center', color: '#fff', fontWeight: 'bold' },
  genderContainer: { flexDirection: 'row', marginBottom: 15 },
  genderBtn: { flex: 1, padding: 12, borderWidth: 1, borderColor: '#ddd', borderRadius: 8, marginHorizontal: 5, alignItems: 'center' },
  genderBtnActive: { backgroundColor: '#004643', borderColor: '#004643' },
  genderText: { color: '#666' },
  genderTextActive: { color: '#fff', fontWeight: 'bold' },
  logoutModalContent: { backgroundColor: '#fff', borderRadius: 16, padding: 24, width: '85%', maxWidth: 320 },
  logoutModalHeader: { alignItems: 'center', marginBottom: 24 },
  logoutModalTitle: { fontSize: 20, fontWeight: 'bold', color: '#333', marginTop: 12, marginBottom: 8 },
  logoutModalMessage: { fontSize: 16, color: '#666', textAlign: 'center', lineHeight: 22 },
  logoutModalButtons: { flexDirection: 'row', gap: 12 },
  logoutCancelBtn: { flex: 1, paddingVertical: 12, borderRadius: 8, backgroundColor: '#F5F5F5', alignItems: 'center' },
  logoutCancelText: { fontSize: 16, fontWeight: '600', color: '#666' },
  logoutConfirmBtn: { flex: 1, paddingVertical: 12, borderRadius: 8, backgroundColor: '#FF4D4D', alignItems: 'center' },
  logoutConfirmText: { fontSize: 16, fontWeight: '600', color: '#fff' },
  divider: { height: 1, backgroundColor: '#E0E0E0', marginVertical: 15 },
  sectionLabel: { fontSize: 13, fontWeight: '600', color: '#666', marginBottom: 10 },
  passwordContainer: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#ddd', borderRadius: 8, marginBottom: 15 },
  passwordInput: { flex: 1, padding: 12, fontSize: 14 },
  eyeButton: { padding: 12 }
});
