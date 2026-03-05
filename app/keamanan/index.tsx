import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  Alert,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
} from "react-native";
import { StatusBar } from 'expo-status-bar';
import { API_CONFIG, getApiUrl } from "../../constants/config";
import AppHeader from "../../components/AppHeader";
import { CustomAlert } from "../../components/CustomAlert";
import { useCustomAlert } from "../../hooks/useCustomAlert";

export const unstable_settings = {
  presentation: 'modal'
};

export default function PengaturanKeamananScreen() {
  const router = useRouter();
  const alert = useCustomAlert();
  const [showPasswordLama, setShowPasswordLama] = useState(false);
  const [showPasswordBaru, setShowPasswordBaru] = useState(false);
  const [showKonfirmasiPassword, setShowKonfirmasiPassword] = useState(false);
  const [currentEmail, setCurrentEmail] = useState("");
  const [userRole, setUserRole] = useState<string>('pegawai');
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [formData, setFormData] = useState({
    email: "",
    passwordLama: "",
    passwordBaru: "",
    konfirmasiPassword: "",
  });

  useEffect(() => {
    loadCurrentData();
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

  const loadCurrentData = async () => {
    try {
      const userDataStr = await AsyncStorage.getItem("userData");
      console.log('Raw userData from AsyncStorage:', userDataStr);
      
      const userData = userDataStr ? JSON.parse(userDataStr) : null;
      console.log('Parsed userData:', userData);
      
      if (userData) {
        const email = userData.email || "";
        const userId = userData.id_user;
        const role = userData.role || 'pegawai';
        
        console.log('Extracted email:', email);
        console.log('Extracted user ID:', userId);
        console.log('Extracted role:', role);
        
        setCurrentEmail(email);
        setUserRole(role);
        setFormData(prev => ({ ...prev, email: email }));
        
        if (!userId) {
          console.warn('User ID not found in userData');
          alert.showAlert({ type: 'error', message: 'Data pengguna tidak lengkap. Silakan login ulang.' });
        }
      } else {
        console.warn('No userData found in AsyncStorage');
        alert.showAlert({ type: 'error', message: 'Data pengguna tidak ditemukan. Silakan login ulang.', onConfirm: () => router.replace('/') });
      }
    } catch (error) {
      console.error("Error loading current data:", error);
      alert.showAlert({ type: 'error', message: 'Gagal memuat data pengguna' });
    }
  };
  
  const handleBack = () => {
    if (userRole === 'admin') {
      router.replace('/admin/profil-admin' as any);
    } else {
      router.replace('/(pegawai)/profil' as any);
    }
  };

  const handleUpdateProfile = async () => {
    if (!formData.passwordLama) {
      alert.showAlert({ type: 'error', message: 'Password lama harus diisi' });
      return;
    }
    if (!formData.passwordBaru) {
      alert.showAlert({ type: 'error', message: 'Password baru harus diisi' });
      return;
    }
    if (formData.passwordBaru !== formData.konfirmasiPassword) {
      alert.showAlert({ type: 'error', message: 'Password baru dan konfirmasi tidak cocok' });
      return;
    }
    if (formData.passwordBaru.length < 6) {
      alert.showAlert({ type: 'error', message: 'Password minimal 6 karakter' });
      return;
    }

    try {
      const userDataStr = await AsyncStorage.getItem("userData");
      const userData = userDataStr ? JSON.parse(userDataStr) : null;

      if (!userData) {
        alert.showAlert({ type: 'error', message: 'Silakan login ulang', onConfirm: () => router.replace('/') });
        return;
      }

      const userId = userData.id_user;
      const userRole = userData.role;

      if (!userId) {
        alert.showAlert({ type: 'error', message: 'ID pengguna tidak ditemukan. Silakan login ulang.', onConfirm: () => router.replace('/') });
        return;
      }

      let apiUrl;
      let requestBody: any;

      if (userRole === 'admin') {
        apiUrl = getApiUrl(API_CONFIG.ENDPOINTS.ADMIN);
        requestBody = {
          action: "update",
          user_id: parseInt(String(userId)),
          password_lama: formData.passwordLama.trim(),
          password_baru: formData.passwordBaru.trim()
        };
      } else {
        apiUrl = getApiUrl('/pegawai/profil/api/change-password');
        requestBody = {
          password_lama: formData.passwordLama.trim(),
          password_baru: formData.passwordBaru.trim()
        };
      }

      console.log('Sending update request:', requestBody);

      const response = await fetch(apiUrl, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "user-id": userId.toString()
        },
        body: JSON.stringify(requestBody),
      });

      const result = await response.json();
      console.log('Update response:', result);

      if (result.success) {
        await AsyncStorage.removeItem('userData');
        await AsyncStorage.removeItem('userToken');
        alert.showAlert({ 
          type: 'success', 
          message: 'Password berhasil diubah. Silakan login ulang.',
          onConfirm: () => router.replace('/')
        });
      } else {
        alert.showAlert({ type: 'error', message: result.message || 'Gagal update password' });
      }
    } catch (error) {
      console.error("Update Profile Error:", error);
      alert.showAlert({ type: 'error', message: 'Gagal update profil' });
    }
  };

  return (
    <View style={styles.container}>
      <AppHeader 
        title="Pengaturan Keamanan" 
        showBack={true}
        fallbackRoute={userRole === 'admin' ? '/admin/profil-admin' : '/(pegawai)/profil'}
      />
      <KeyboardAvoidingView 
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView showsVerticalScrollIndicator={false} style={styles.scrollView}>

        {/* FORM UBAH EMAIL & PASSWORD */}
        <View style={styles.content}>

          {/* UBAH PASSWORD */}
          <View style={styles.sectionHeader}>
            <Ionicons name="shield-checkmark" size={20} color="#004643" />
            <Text style={styles.sectionTitle}>Ubah Password</Text>
          </View>
          <View style={styles.divider} />

          <View style={styles.formContent}>
            <Text style={styles.inputLabel}>Password Lama</Text>
            <View style={styles.passwordContainer}>
              <TextInput
                style={styles.passwordInput}
                value={formData.passwordLama}
                onChangeText={(text) =>
                  setFormData({ ...formData, passwordLama: text })
                }
                placeholder="Masukkan password lama"
                secureTextEntry={!showPasswordLama}
              />
              <TouchableOpacity 
                style={styles.eyeButton}
                onPress={() => setShowPasswordLama(!showPasswordLama)}
              >
                <Ionicons 
                  name={showPasswordLama ? "eye-off-outline" : "eye-outline"} 
                  size={20} 
                  color="#666" 
                />
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>Password Baru</Text>
            <View style={styles.passwordContainer}>
              <TextInput
                style={styles.passwordInput}
                value={formData.passwordBaru}
                onChangeText={(text) =>
                  setFormData({ ...formData, passwordBaru: text })
                }
                placeholder="Minimal 6 karakter"
                secureTextEntry={!showPasswordBaru}
              />
              <TouchableOpacity 
                style={styles.eyeButton}
                onPress={() => setShowPasswordBaru(!showPasswordBaru)}
              >
                <Ionicons 
                  name={showPasswordBaru ? "eye-off-outline" : "eye-outline"} 
                  size={20} 
                  color="#666" 
                />
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>Konfirmasi Password Baru</Text>
            <View style={styles.passwordContainer}>
              <TextInput
                style={styles.passwordInput}
                value={formData.konfirmasiPassword}
                onChangeText={(text) =>
                  setFormData({ ...formData, konfirmasiPassword: text })
                }
                placeholder="Ulangi password baru"
                secureTextEntry={!showKonfirmasiPassword}
              />
              <TouchableOpacity 
                style={styles.eyeButton}
                onPress={() => setShowKonfirmasiPassword(!showKonfirmasiPassword)}
              >
                <Ionicons 
                  name={showKonfirmasiPassword ? "eye-off-outline" : "eye-outline"} 
                  size={20} 
                  color="#666" 
                />
              </TouchableOpacity>
            </View>
          </View>
        </View>
        </ScrollView>

        {/* Button Footer - Fixed di bawah */}
        <View style={[styles.buttonContainer, Platform.OS === 'android' ? { marginBottom: keyboardHeight } : {}]}>
        <TouchableOpacity 
          style={styles.saveButton}
          onPress={handleUpdateProfile}
        >
          <Ionicons name="checkmark-circle-outline" size={20} color="#fff" />
          <Text style={styles.saveButtonText}>Simpan Perubahan</Text>
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
  container: { flex: 1, backgroundColor: "#fff" },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
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
    marginBottom: 16,
  },
  formContent: {
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
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    marginBottom: 15,
  },
  passwordInput: {
    flex: 1,
    padding: 12,
    fontSize: 14,
  },
  eyeButton: {
    padding: 12,
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

});
