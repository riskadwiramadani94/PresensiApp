import React, { useState, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { StyleSheet } from 'react-native';
import { getApiUrl, API_CONFIG } from '../../../../../constants/config';
import { AppHeader } from '../../../../../components';

export default function EditPegawai() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    nama_lengkap: '',
    email: '',
    password: '',
    nip: '',
    no_telepon: '',
    tanggal_lahir: '',
    jenis_kelamin: '',
    jabatan: '',
    divisi: '',
    status_pegawai: '',
    alamat: '',
  });

  useEffect(() => {
    fetchPegawaiDetail();
  }, [id]);

  const fetchPegawaiDetail = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${getApiUrl(API_CONFIG.ENDPOINTS.DETAIL_PEGAWAI)}/${id}`);
      const result = await response.json();
      
      if (result.success) {
        console.log('Pegawai data:', result.data); // Debug log
        setFormData({
          nama_lengkap: result.data.nama_lengkap || '',
          email: result.data.email || '',
          password: '', // Kosongkan password untuk reset
          nip: result.data.nip || '',
          no_telepon: result.data.no_telepon || '',
          tanggal_lahir: result.data.tanggal_lahir || '',
          jenis_kelamin: result.data.jenis_kelamin || '',
          jabatan: result.data.jabatan || '',
          divisi: result.data.divisi || '',
          status_pegawai: result.data.status_pegawai || '',
          alamat: result.data.alamat || '',
        });
      } else {
        Alert.alert('Error', result.message || 'Gagal memuat data pegawai');
      }
    } catch (error) {
      Alert.alert('Koneksi Error', 'Pastikan XAMPP nyala dan HP satu Wi-Fi dengan laptop.');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const response = await fetch(getApiUrl(API_CONFIG.ENDPOINTS.UPDATE_PEGAWAI), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: id,
          ...formData
        }),
      });
      const result = await response.json();
      
      if (result.success) {
        Alert.alert('Berhasil', 'Data pegawai berhasil diperbarui', [
          { text: 'OK', onPress: () => router.back() }
        ]);
      } else {
        Alert.alert('Error', result.message || 'Gagal memperbarui data pegawai');
      }
    } catch (error) {
      Alert.alert('Koneksi Error', 'Pastikan XAMPP nyala dan HP satu Wi-Fi dengan laptop.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <StatusBar style="light" translucent={true} backgroundColor="transparent" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#004643" />
          <Text style={styles.loadingText}>Memuat data pegawai...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style="light" translucent={true} backgroundColor="transparent" />
      
      {/* HEADER */}
      <AppHeader 
        title="Edit Pegawai"
        showBack={true}
        fallbackRoute="/pegawai-akun/data-pegawai-admin"
      />

      <ScrollView 
        showsVerticalScrollIndicator={false} 
        contentContainerStyle={styles.scrollContent}
      >
        {/* Informasi Pribadi */}
        <View style={styles.sectionHeader}>
          <Ionicons name="person-outline" size={20} color="#004643" />
          <Text style={styles.sectionTitle}>Informasi Pribadi</Text>
        </View>
        <View style={styles.divider} />
        
        <View style={styles.formContent}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Nama Lengkap *</Text>
              <TextInput
                style={styles.textInput}
                value={formData.nama_lengkap}
                onChangeText={(text) => setFormData({...formData, nama_lengkap: text})}
                placeholder="Masukkan nama lengkap"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>NIP *</Text>
              <TextInput
                style={styles.textInput}
                value={formData.nip}
                onChangeText={(text) => setFormData({...formData, nip: text})}
                placeholder="Masukkan NIP"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>No. Telepon</Text>
              <TextInput
                style={styles.textInput}
                value={formData.no_telepon}
                onChangeText={(text) => setFormData({...formData, no_telepon: text})}
                placeholder="Masukkan nomor telepon"
                keyboardType="phone-pad"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Tanggal Lahir</Text>
              <TextInput
                style={styles.textInput}
                value={formData.tanggal_lahir}
                onChangeText={(text) => setFormData({...formData, tanggal_lahir: text})}
                placeholder="YYYY-MM-DD"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Jenis Kelamin</Text>
              <View style={styles.genderContainer}>
                <TouchableOpacity 
                  style={[styles.genderBtn, formData.jenis_kelamin === 'Laki-laki' && styles.genderBtnActive]}
                  onPress={() => setFormData({...formData, jenis_kelamin: 'Laki-laki'})}
                >
                  <Text style={[styles.genderText, formData.jenis_kelamin === 'Laki-laki' && styles.genderTextActive]}>
                    Laki-laki
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.genderBtn, formData.jenis_kelamin === 'Perempuan' && styles.genderBtnActive]}
                  onPress={() => setFormData({...formData, jenis_kelamin: 'Perempuan'})}
                >
                  <Text style={[styles.genderText, formData.jenis_kelamin === 'Perempuan' && styles.genderTextActive]}>
                    Perempuan
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Alamat Lengkap</Text>
              <TextInput
                style={[styles.textInput, styles.textArea]}
                value={formData.alamat}
                onChangeText={(text) => setFormData({...formData, alamat: text})}
                placeholder="Masukkan alamat lengkap"
                multiline
                numberOfLines={3}
              />
            </View>
          </View>

        {/* Informasi Kepegawaian */}
        <View style={styles.sectionHeader}>
          <Ionicons name="briefcase-outline" size={20} color="#004643" />
          <Text style={styles.sectionTitle}>Informasi Kepegawaian</Text>
        </View>
        <View style={styles.divider} />
        
        <View style={styles.formContent}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Jabatan</Text>
              <TextInput
                style={styles.textInput}
                value={formData.jabatan}
                onChangeText={(text) => setFormData({...formData, jabatan: text})}
                placeholder="Masukkan jabatan"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Divisi</Text>
              <TextInput
                style={styles.textInput}
                value={formData.divisi}
                onChangeText={(text) => setFormData({...formData, divisi: text})}
                placeholder="Masukkan divisi"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Status Kepegawaian</Text>
              <TextInput
                style={styles.textInput}
                value={formData.status_pegawai}
                onChangeText={(text) => setFormData({...formData, status_pegawai: text})}
                placeholder="Masukkan status kepegawaian"
              />
            </View>
          </View>

        {/* Informasi Akun Login */}
        <View style={styles.sectionHeader}>
          <Ionicons name="key-outline" size={20} color="#004643" />
          <Text style={styles.sectionTitle}>Informasi Akun Login</Text>
        </View>
        <View style={styles.divider} />
        
        <View style={styles.formContent}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Email *</Text>
              <TextInput
                style={styles.textInput}
                value={formData.email}
                onChangeText={(text) => setFormData({...formData, email: text})}
                placeholder="Masukkan email"
                keyboardType="email-address"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Reset Password (Opsional)</Text>
              <View style={styles.passwordContainer}>
                <TextInput
                  style={styles.passwordInput}
                  value={formData.password}
                  onChangeText={(text) => setFormData({...formData, password: text})}
                  placeholder="Masukkan password baru atau kosongkan jika tidak ingin mengubah"
                  secureTextEntry={!showPassword}
                />
                <TouchableOpacity 
                  style={styles.eyeButton}
                  onPress={() => {
                    console.log('Eye button pressed, current showPassword:', showPassword);
                    setShowPassword(!showPassword);
                  }}
                >
                  <Ionicons 
                    name={showPassword ? "eye-off-outline" : "eye-outline"} 
                    size={20} 
                    color="#666" 
                  />
                </TouchableOpacity>
              </View>
              <Text style={styles.helperText}>*Kosongkan jika tidak ingin mengubah password</Text>
            </View>
          </View>

      </ScrollView>
      
      {/* Button Footer - Fixed di bawah seperti header */}
      <View style={styles.buttonFooter}>
        <TouchableOpacity 
          style={styles.saveButton}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="checkmark-circle-outline" size={20} color="#fff" />
              <Text style={styles.saveButtonText}>Simpan Data Pegawai</Text>
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
  scrollContent: {
    paddingBottom: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
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
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: '#333',
    borderWidth: 1,
    borderColor: '#E0E0E0'
  },
  textArea: {
    textAlignVertical: 'top',
    minHeight: 80
  },
  genderContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  genderBtn: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#F8F9FA',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0'
  },
  genderBtnActive: {
    backgroundColor: '#004643'
  },
  genderText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666'
  },
  genderTextActive: {
    color: '#fff'
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    backgroundColor: '#F8F9FA',
  },
  passwordInput: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: '#333',
  },
  eyeButton: {
    padding: 12,
  },
  helperText: {
    fontSize: 12,
    color: '#888',
    marginTop: 4,
    fontStyle: 'italic'
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
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8
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