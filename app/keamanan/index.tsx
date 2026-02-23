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
  View
} from "react-native";
import { StatusBar } from 'expo-status-bar';
import { API_CONFIG, getApiUrl } from "../../constants/config";
import AppHeader from "../../components/AppHeader";

export const unstable_settings = {
  presentation: 'modal'
};

export default function PengaturanKeamananScreen() {
  const router = useRouter();
  const [showPasswordLama, setShowPasswordLama] = useState(false);
  const [showPasswordBaru, setShowPasswordBaru] = useState(false);
  const [showKonfirmasiPassword, setShowKonfirmasiPassword] = useState(false);
  const [currentEmail, setCurrentEmail] = useState("");
  const [userRole, setUserRole] = useState<string>('pegawai');
  const [formData, setFormData] = useState({
    email: "",
    passwordLama: "",
    passwordBaru: "",
    konfirmasiPassword: "",
  });

  useEffect(() => {
    loadCurrentData();
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
          Alert.alert("Warning", "Data pengguna tidak lengkap. Silakan login ulang.");
        }
      } else {
        console.warn('No userData found in AsyncStorage');
        Alert.alert("Error", "Data pengguna tidak ditemukan. Silakan login ulang.");
        router.replace("/");
      }
    } catch (error) {
      console.error("Error loading current data:", error);
      Alert.alert("Error", "Gagal memuat data pengguna");
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
      Alert.alert("Error", "Password lama harus diisi");
      return;
    }
    if (!formData.passwordBaru) {
      Alert.alert("Error", "Password baru harus diisi");
      return;
    }
    if (formData.passwordBaru !== formData.konfirmasiPassword) {
      Alert.alert("Error", "Password baru dan konfirmasi tidak cocok");
      return;
    }
    if (formData.passwordBaru.length < 6) {
      Alert.alert("Error", "Password minimal 6 karakter");
      return;
    }

    try {
      const userDataStr = await AsyncStorage.getItem("userData");
      const userData = userDataStr ? JSON.parse(userDataStr) : null;

      if (!userData) {
        Alert.alert("Error", "Silakan login ulang");
        router.replace("/");
        return;
      }

      const userId = userData.id_user;
      const userRole = userData.role;

      if (!userId) {
        Alert.alert("Error", "ID pengguna tidak ditemukan. Silakan login ulang.");
        router.replace("/");
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
        Alert.alert("Sukses", "Password berhasil diubah. Silakan login ulang.", [
          { text: "OK", onPress: () => router.replace('/') }
        ]);
      } else {
        Alert.alert("Error", result.message || "Gagal update password");
      }
    } catch (error) {
      console.error("Update Profile Error:", error);
      Alert.alert("Error", "Gagal update profil");
    }
  };

  return (
    <View style={styles.container}>
      <AppHeader 
        title="Pengaturan Keamanan" 
        showBack={true}
        fallbackRoute={userRole === 'admin' ? '/admin/profil-admin' : '/(pegawai)/profil'}
      />
      <ScrollView showsVerticalScrollIndicator={false} style={styles.scrollView}>

        {/* FORM UBAH EMAIL & PASSWORD */}
        <View style={styles.content}>
          {/* INFO KEAMANAN */}
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Ionicons name="information-circle" size={20} color="#004643" />
              <View style={styles.infoContent}>
                <Text style={styles.infoTitle}>Tips Keamanan</Text>
                <Text style={styles.infoText}>• Password minimal 6 karakter</Text>
                <Text style={styles.infoText}>• Kombinasikan huruf besar, kecil, dan angka</Text>
                <Text style={styles.infoText}>• Jangan gunakan password yang mudah ditebak</Text>
                <Text style={styles.infoText}>• Ubah password secara berkala</Text>
                <Text style={styles.infoText}>• Jangan bagikan password kepada siapapun</Text>
              </View>
            </View>
          </View>

          {/* UBAH PASSWORD */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Ionicons name="shield-checkmark" size={24} color="#004643" />
              <Text style={styles.cardTitle}>Ubah Password</Text>
            </View>

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
      <View style={styles.buttonFooter}>
        <TouchableOpacity 
          style={styles.saveButton}
          onPress={handleUpdateProfile}
        >
          <Ionicons name="checkmark-circle-outline" size={20} color="#fff" />
          <Text style={styles.saveButtonText}>Simpan Perubahan</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
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
  infoCard: {
    flexDirection: 'row',
    backgroundColor: '#F0F8F7',
    padding: 15,
    borderRadius: 12,
    marginBottom: 12,
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
});
