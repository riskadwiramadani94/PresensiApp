import React, { useState, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { 
  StyleSheet, View, Text, TextInput, TouchableOpacity, 
  Alert, ActivityIndicator, ScrollView, Platform, KeyboardAvoidingView, Modal 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { getApiUrl, API_CONFIG } from '../../constants/config';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppHeader, CustomCalendar } from '../../components';

export default function AddDataPegawaiForm() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    nama_lengkap: '',
    email: '',
    password: '',
    nip: '',
    jenis_kelamin: '',
    jabatan: '',
    divisi: '',
    no_telepon: '',
    alamat: '',
    tanggal_lahir: ''
  });
  const [loading, setLoading] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [existingEmails, setExistingEmails] = useState<string[]>([]);
  
  // New states for improvements
  const [validationErrors, setValidationErrors] = useState<{[key: string]: string}>({});
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 4;

  const generateEmail = (nama: string) => {
    if (!nama.trim()) return '';
    
    const words = nama.toLowerCase()
      .replace(/[^a-z\s]/g, '')
      .trim()
      .split(' ')
      .filter(word => word.length > 0);
    
    if (words.length === 0) return '';
    
    const firstName = words[0];
    let baseEmail = `${firstName}001@itb.ac.id`;
    
    // Cek duplikat dan increment angka
    if (!existingEmails.includes(baseEmail)) {
      return baseEmail;
    }
    
    // Cari nomor yang belum dipakai
    for (let i = 2; i <= 999; i++) {
      const paddedNumber = i.toString().padStart(3, '0');
      const numberedEmail = `${firstName}${paddedNumber}@itb.ac.id`;
      
      if (!existingEmails.includes(numberedEmail)) {
        return numberedEmail;
      }
    }
    
    // Jika sampai 999 masih duplikat, pakai 4 digit
    for (let i = 1000; i <= 9999; i++) {
      const numberedEmail = `${firstName}${i}@itb.ac.id`;
      
      if (!existingEmails.includes(numberedEmail)) {
        return numberedEmail;
      }
    }
    
    return `${firstName}${Date.now()}@itb.ac.id`; // fallback
  };

  const fetchExistingEmails = async () => {
    try {
      const response = await fetch(getApiUrl(API_CONFIG.ENDPOINTS.CHECK_EMAILS));
      const result = await response.json();
      if (result.success) {
        setExistingEmails(result.emails || []);
      }
    } catch (error) {
      console.log('Error fetching emails:', error);
    }
  };

  useEffect(() => {
    fetchExistingEmails();
    loadDraftData();
  }, []);

  // Auto-save draft every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      saveDraftData();
    }, 30000);
    return () => clearInterval(interval);
  }, [formData]);

  // Real-time validation - hanya field penting yang wajib
  const validateField = (field: string, value: any) => {
    const errors = { ...validationErrors };
    
    switch (field) {
      case 'nama_lengkap':
        if (!value?.trim()) {
          errors.nama_lengkap = 'Nama lengkap wajib diisi';
        } else {
          delete errors.nama_lengkap;
        }
        break;
      case 'nip':
        if (!value?.trim()) {
          errors.nip = 'NIP wajib diisi';
        } else {
          delete errors.nip;
        }
        break;
      case 'email':
        if (!value?.trim()) {
          errors.email = 'Email wajib diisi';
        } else if (!isValidEmail(value)) {
          errors.email = 'Format email tidak valid';
        } else {
          delete errors.email;
        }
        break;
      case 'password':
        if (!value?.trim()) {
          errors.password = 'Password wajib diisi';
        } else if (value.length < 6) {
          errors.password = 'Password minimal 6 karakter';
        } else {
          delete errors.password;
        }
        break;
      case 'jenis_kelamin':
        if (!value?.trim()) {
          errors.jenis_kelamin = 'Jenis kelamin wajib dipilih';
        } else {
          delete errors.jenis_kelamin;
        }
        break;
      case 'jabatan':
        if (!value?.trim()) {
          errors.jabatan = 'Jabatan wajib diisi';
        } else {
          delete errors.jabatan;
        }
        break;
      case 'divisi':
        if (!value?.trim()) {
          errors.divisi = 'Divisi wajib diisi';
        } else {
          delete errors.divisi;
        }
        break;
      // Field opsional - tidak ada validasi wajib
      case 'no_telepon':
        if (value?.trim() && !isValidPhone(value)) {
          errors.no_telepon = 'Format nomor telepon tidak valid';
        } else {
          delete errors.no_telepon;
        }
        break;
    }
    
    setValidationErrors(errors);
  };

  const isValidEmail = (email: string) => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
  };

  const isValidPhone = (phone: string) => {
    const regex = /^[0-9+\-\s()]{10,15}$/;
    return regex.test(phone);
  };

  // Auto-save functions
  const saveDraftData = async () => {
    try {
      const draftData = {
        formData,
        timestamp: new Date().toISOString()
      };
      await AsyncStorage.setItem('pegawai_draft', JSON.stringify(draftData));
    } catch (error) {
      console.error('Error saving draft:', error);
    }
  };

  const loadDraftData = async () => {
    try {
      const draftStr = await AsyncStorage.getItem('pegawai_draft');
      if (draftStr) {
        const draft = JSON.parse(draftStr);
        const draftAge = new Date().getTime() - new Date(draft.timestamp).getTime();
        
        if (draftAge < 24 * 60 * 60 * 1000) {
          Alert.alert(
            'Draft Ditemukan',
            'Ditemukan data draft yang belum disimpan. Muat data draft?',
            [
              { text: 'Tidak', onPress: () => clearDraftData() },
              { 
                text: 'Ya', 
                onPress: () => {
                  setFormData(draft.formData || formData);
                }
              }
            ]
          );
        } else {
          clearDraftData();
        }
      }
    } catch (error) {
      console.error('Error loading draft:', error);
    }
  };

  const clearDraftData = async () => {
    try {
      await AsyncStorage.removeItem('pegawai_draft');
    } catch (error) {
      console.error('Error clearing draft:', error);
    }
  };

  // Progress calculation - berdasarkan field wajib dan opsional
  const calculateProgress = () => {
    const fields = [
      formData.nama_lengkap?.trim(),
      formData.nip?.trim(), 
      formData.email?.trim(),
      formData.password?.trim(),
      formData.jenis_kelamin?.trim(),
      formData.jabatan?.trim(),
      formData.divisi?.trim(),
      formData.no_telepon?.trim(),
      formData.alamat?.trim(),
      formData.tanggal_lahir?.trim()
    ];
    const filledFields = fields.filter(field => field && field !== '').length;
    return Math.round((filledFields / fields.length) * 100);
  };

  const handleNameChange = (text: string) => {
    setFormData({
      ...formData, 
      nama_lengkap: text
    });
    validateField('nama_lengkap', text);
  };

  const formatDate = (date: Date) => {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const handleDateSelect = (date: Date) => {
    const formattedDate = formatDate(date);
    setFormData({...formData, tanggal_lahir: formattedDate});
    setShowCalendar(false);
  };

  const showCalendarModal = () => {
    setShowCalendar(true);
  };

  const formatTanggal = (text: string) => {
    const cleaned = text.replace(/\D/g, '');
    if (cleaned.length >= 5) {
      return `${cleaned.slice(0,2)}/${cleaned.slice(2,4)}/${cleaned.slice(4,8)}`;
    } else if (cleaned.length >= 3) {
      return `${cleaned.slice(0,2)}/${cleaned.slice(2,4)}`;
    }
    return cleaned;
  };

  const handleSubmit = async () => {
    // Validate hanya field penting yang wajib diisi
    const errors: {[key: string]: string} = {};
    
    if (!formData.nama_lengkap?.trim()) errors.nama_lengkap = 'Nama lengkap wajib diisi';
    if (!formData.nip?.trim()) errors.nip = 'NIP wajib diisi';
    if (!formData.email?.trim()) errors.email = 'Email wajib diisi';
    if (!formData.password?.trim()) errors.password = 'Password wajib diisi';
    if (!formData.jenis_kelamin?.trim()) errors.jenis_kelamin = 'Jenis kelamin wajib dipilih';
    if (!formData.jabatan?.trim()) errors.jabatan = 'Jabatan wajib diisi';
    if (!formData.divisi?.trim()) errors.divisi = 'Divisi wajib diisi';
    
    // Validasi format untuk field opsional jika diisi
    if (formData.no_telepon?.trim() && !isValidPhone(formData.no_telepon)) {
      errors.no_telepon = 'Format nomor telepon tidak valid';
    }
    
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      Alert.alert('Data Belum Lengkap', 'Mohon lengkapi field yang wajib diisi (bertanda *)');
      return;
    }
    
    // Show confirmation modal if all data is valid
    setShowConfirmModal(true);
  };

  const confirmSubmit = async () => {
    // Validate field penting yang wajib
    const errors: {[key: string]: string} = {};
    
    if (!formData.nama_lengkap?.trim()) errors.nama_lengkap = 'Nama lengkap wajib diisi';
    if (!formData.nip?.trim()) errors.nip = 'NIP wajib diisi';
    if (!formData.email?.trim()) errors.email = 'Email wajib diisi';
    if (!formData.password?.trim()) errors.password = 'Password wajib diisi';
    if (!formData.jenis_kelamin?.trim()) errors.jenis_kelamin = 'Jenis kelamin wajib dipilih';
    if (!formData.jabatan?.trim()) errors.jabatan = 'Jabatan wajib diisi';
    if (!formData.divisi?.trim()) errors.divisi = 'Divisi wajib diisi';
    
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      setShowConfirmModal(false);
      Alert.alert('Error', 'Mohon lengkapi field yang wajib diisi');
      return;
    }

    const dataToSend = formData;

    setLoading(true);
    setShowConfirmModal(false);
    
    try {
      const response = await fetch(getApiUrl(API_CONFIG.ENDPOINTS.DATA_PEGAWAI), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dataToSend)
      });

      const result = await response.json();
      
      if (result.success) {
        await clearDraftData();
        Alert.alert('Sukses', 'Data pegawai berhasil ditambahkan!', [
          { text: 'OK', onPress: () => {
              setFormData({
                nama_lengkap: '',
                email: '',
                password: '',
                nip: '',
                jenis_kelamin: '',
                jabatan: '',
                divisi: '',
                no_telepon: '',
                alamat: '',
                tanggal_lahir: ''
              });
              router.back();
            }
          }
        ]);
      } else {
        Alert.alert('Error', result.message || 'Gagal menambahkan data pegawai');
      }
    } catch (error) {
      Alert.alert('Koneksi Error', 'Pastikan XAMPP nyala dan HP satu Wi-Fi dengan laptop.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar style="dark" translucent={true} backgroundColor="transparent" />
      <AppHeader 
        title="Tambah Pegawai"
        showBack={true}
        fallbackRoute="/pegawai-akun/data-pegawai-admin"
      />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
            
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
                  style={[styles.textInput, validationErrors.nama_lengkap && styles.inputError]}
                  placeholder="Masukkan nama lengkap"
                  value={formData.nama_lengkap}
                  onChangeText={handleNameChange}
                />
                {validationErrors.nama_lengkap && (
                  <Text style={styles.errorText}>{validationErrors.nama_lengkap}</Text>
                )}
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>NIP *</Text>
                <TextInput
                  style={[styles.textInput, validationErrors.nip && styles.inputError]}
                  placeholder="Masukkan NIP"
                  value={formData.nip}
                  onChangeText={(text) => {
                    setFormData({...formData, nip: text});
                    validateField('nip', text);
                  }}
                />
                {validationErrors.nip && (
                  <Text style={styles.errorText}>{validationErrors.nip}</Text>
                )}
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>No. Telepon</Text>
                <TextInput
                  style={[styles.textInput, validationErrors.no_telepon && styles.inputError]}
                  placeholder="Masukkan nomor telepon"
                  value={formData.no_telepon}
                  onChangeText={(text) => {
                    setFormData({...formData, no_telepon: text});
                    validateField('no_telepon', text);
                  }}
                  keyboardType="phone-pad"
                />
                {validationErrors.no_telepon && (
                  <Text style={styles.errorText}>{validationErrors.no_telepon}</Text>
                )}
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Tanggal Lahir</Text>
                <View style={styles.dateInputContainer}>
                  <TextInput
                    style={styles.textInput}
                    placeholder="DD/MM/YYYY"
                    value={formData.tanggal_lahir}
                    onChangeText={(text) => {
                      const formatted = formatTanggal(text);
                      setFormData({...formData, tanggal_lahir: formatted});
                    }}
                    keyboardType="numeric"
                    maxLength={10}
                  />
                  <TouchableOpacity onPress={showCalendarModal} style={styles.calendarButton}>
                    <Ionicons name="calendar" size={20} color="#004643" />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Jenis Kelamin *</Text>
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
                {validationErrors.jenis_kelamin && (
                  <Text style={styles.errorText}>{validationErrors.jenis_kelamin}</Text>
                )}
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Alamat Lengkap</Text>
                <TextInput
                  style={[styles.textInput, styles.textArea]}
                  placeholder="Masukkan alamat lengkap"
                  value={formData.alamat}
                  onChangeText={(text) => setFormData({...formData, alamat: text})}
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
                <Text style={styles.inputLabel}>Jabatan *</Text>
                <TextInput
                  style={[styles.textInput, validationErrors.jabatan && styles.inputError]}
                  placeholder="Masukkan jabatan"
                  value={formData.jabatan}
                  onChangeText={(text) => {
                    setFormData({...formData, jabatan: text});
                    validateField('jabatan', text);
                  }}
                />
                {validationErrors.jabatan && (
                  <Text style={styles.errorText}>{validationErrors.jabatan}</Text>
                )}
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Divisi *</Text>
                <TextInput
                  style={[styles.textInput, validationErrors.divisi && styles.inputError]}
                  placeholder="Masukkan divisi"
                  value={formData.divisi}
                  onChangeText={(text) => {
                    setFormData({...formData, divisi: text});
                    validateField('divisi', text);
                  }}
                />
                {validationErrors.divisi && (
                  <Text style={styles.errorText}>{validationErrors.divisi}</Text>
                )}
              </View>
            </View>

            {/* Informasi Akun */}
            <View style={styles.sectionHeader}>
              <Ionicons name="lock-closed-outline" size={20} color="#004643" />
              <Text style={styles.sectionTitle}>Informasi Akun</Text>
            </View>
            <View style={styles.divider} />
            
            <View style={styles.formContent}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Email *</Text>
                <TextInput
                  style={[styles.textInput, validationErrors.email && styles.inputError]}
                  placeholder="Masukkan email"
                  value={formData.email}
                  onChangeText={(text) => {
                    setFormData({...formData, email: text});
                    validateField('email', text);
                  }}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
                {validationErrors.email && (
                  <Text style={styles.errorText}>{validationErrors.email}</Text>
                )}
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Password *</Text>
                <TextInput
                  style={[styles.textInput, validationErrors.password && styles.inputError]}
                  placeholder="Masukkan password"
                  value={formData.password}
                  onChangeText={(text) => {
                    setFormData({...formData, password: text});
                    validateField('password', text);
                  }}
                  secureTextEntry
                />
                {validationErrors.password && (
                  <Text style={styles.errorText}>{validationErrors.password}</Text>
                )}
              </View>
            </View>

        </ScrollView>

        {/* Button Footer - Fixed di bawah seperti header */}
        <View style={styles.buttonFooter}>
          <TouchableOpacity 
            style={[styles.submitBtn, loading && styles.submitBtnDisabled]} 
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <>
                <Ionicons name="hourglass-outline" size={20} color="#fff" />
                <Text style={styles.submitText}>Menyimpan...</Text>
              </>
            ) : (
              <>
                <Ionicons name="checkmark-circle-outline" size={20} color="#fff" />
                <Text style={styles.submitText}>Simpan Data Pegawai</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Calendar Modal */}
        <Modal 
          visible={showCalendar} 
          transparent
          animationType="none"
          statusBarTranslucent={true}
          onRequestClose={() => setShowCalendar(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.calendarModalContainer}>
              <View style={styles.calendarModalHeader}>
                <Text style={styles.calendarModalTitle}>Pilih Tanggal Lahir</Text>
                <TouchableOpacity onPress={() => setShowCalendar(false)}>
                  <Ionicons name="close" size={24} color="#666" />
                </TouchableOpacity>
              </View>
              <CustomCalendar 
                onDatePress={(date) => handleDateSelect(date)}
                weekendDays={[0, 6]}
                showWeekends={false}
              />
            </View>
          </View>
        </Modal>

        {/* Confirmation Modal */}
        <Modal 
          visible={showConfirmModal} 
          transparent
          accessible={false}
          accessibilityViewIsModal={false}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.confirmModalContainer}>
              <View style={styles.confirmModalHeader}>
                <Text style={styles.confirmModalTitle}>Konfirmasi Data Pegawai</Text>
                <TouchableOpacity onPress={() => setShowConfirmModal(false)}>
                  <Ionicons name="close" size={24} color="#666" />
                </TouchableOpacity>
              </View>
              
              <ScrollView style={styles.confirmModalContent}>
                <View style={styles.confirmItem}>
                  <Text style={styles.confirmLabel}>Nama Lengkap:</Text>
                  <Text style={styles.confirmValue}>{formData.nama_lengkap}</Text>
                </View>
                
                <View style={styles.confirmItem}>
                  <Text style={styles.confirmLabel}>NIP:</Text>
                  <Text style={styles.confirmValue}>{formData.nip}</Text>
                </View>
                
                <View style={styles.confirmItem}>
                  <Text style={styles.confirmLabel}>Email:</Text>
                  <Text style={styles.confirmValue}>{formData.email}</Text>
                </View>
                
                {formData.jenis_kelamin && (
                  <View style={styles.confirmItem}>
                    <Text style={styles.confirmLabel}>Jenis Kelamin:</Text>
                    <Text style={styles.confirmValue}>{formData.jenis_kelamin}</Text>
                  </View>
                )}
                
                {formData.jabatan && (
                  <View style={styles.confirmItem}>
                    <Text style={styles.confirmLabel}>Jabatan:</Text>
                    <Text style={styles.confirmValue}>{formData.jabatan}</Text>
                  </View>
                )}
                
                {formData.divisi && (
                  <View style={styles.confirmItem}>
                    <Text style={styles.confirmLabel}>Divisi:</Text>
                    <Text style={styles.confirmValue}>{formData.divisi}</Text>
                  </View>
                )}
                
                {formData.no_telepon && (
                  <View style={styles.confirmItem}>
                    <Text style={styles.confirmLabel}>No. Telepon:</Text>
                    <Text style={styles.confirmValue}>{formData.no_telepon}</Text>
                  </View>
                )}
                
                {formData.alamat && (
                  <View style={styles.confirmItem}>
                    <Text style={styles.confirmLabel}>Alamat:</Text>
                    <Text style={styles.confirmValue}>{formData.alamat}</Text>
                  </View>
                )}
                
                {formData.tanggal_lahir && (
                  <View style={styles.confirmItem}>
                    <Text style={styles.confirmLabel}>Tanggal Lahir:</Text>
                    <Text style={styles.confirmValue}>{formData.tanggal_lahir}</Text>
                  </View>
                )}
              </ScrollView>
              
              <View style={styles.confirmModalFooter}>
                <TouchableOpacity 
                  style={styles.cancelConfirmBtn}
                  onPress={() => setShowConfirmModal(false)}
                >
                  <Text style={styles.cancelConfirmText}>Batal</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.saveConfirmBtn}
                  onPress={confirmSubmit}
                  disabled={loading}
                >
                  <Text style={styles.saveConfirmText}>
                    {loading ? 'Menyimpan...' : 'Simpan Data'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>


    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },

  content: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
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
    marginBottom: 16
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8
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
    gap: 12
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
  dateInputContainer: {
    position: 'relative'
  },
  calendarButton: {
    position: 'absolute',
    right: 12,
    top: 12,
    padding: 4,
    borderRadius: 4,
    backgroundColor: '#F0F8F0'
  },
  submitBtn: {
    backgroundColor: '#004643',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
    minHeight: 50
  },
  submitBtnDisabled: {
    backgroundColor: '#999'
  },
  submitText: {
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

  inputError: {
    borderColor: '#F44336',
    borderWidth: 2
  },
  errorText: {
    fontSize: 12,
    color: '#F44336',
    marginTop: 4,
    marginLeft: 4
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  confirmModalContainer: {
    backgroundColor: '#fff',
    borderRadius: 15,
    width: '90%',
    maxHeight: '80%'
  },
  confirmModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0'
  },
  confirmModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333'
  },
  confirmModalContent: {
    paddingHorizontal: 20,
    paddingVertical: 15,
    maxHeight: 400
  },
  confirmItem: {
    marginBottom: 15
  },
  confirmLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 4
  },
  confirmValue: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20
  },
  confirmModalFooter: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    gap: 10
  },
  cancelConfirmBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#F5F5F5',
    alignItems: 'center'
  },
  cancelConfirmText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666'
  },
  saveConfirmBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#004643',
    alignItems: 'center'
  },
  saveConfirmText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff'
  },
  centerModalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingHorizontal: 20,
  },
  calendarModalContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    width: '90%',
    maxWidth: 350,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  calendarModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0'
  },
  calendarModalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  monthBtn: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#F5F5F5'
  },
  closeBtn: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#F5F5F5'
  },
  weekDays: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#F8F9FA'
  },
  weekDayText: {
    flex: 1,
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '600',
    color: '#666'
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    paddingVertical: 12
  },
  dayCell: {
    width: '14.28%',
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 6,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    backgroundColor: '#FFFFFF',
  },
  emptyCell: {
    backgroundColor: 'transparent',
    borderColor: 'transparent',
  },
  todayCell: {
    backgroundColor: '#004643',
    borderColor: '#004643',
  },
  futureCell: {
    backgroundColor: '#F5F5F5',
    borderColor: '#E0E0E0',
  },
  dayText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500'
  },
  todayText: {
    color: '#FFFFFF',
    fontWeight: '700'
  },
  futureText: {
    color: '#999',
    fontWeight: '400'
  },
  calendarTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#004643',
  },
  monthYearBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#F0F8F7'
  },
  monthPickerContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    width: '100%',
    maxWidth: 400,
  },
  monthPickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  monthPickerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  pickerRow: {
    flexDirection: 'row',
    gap: 20,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  pickerColumn: {
    flex: 1,
  },
  pickerLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
    textAlign: 'center',
  },
  pickerList: {
    maxHeight: 200,
  },
  pickerItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 4,
  },
  selectedPickerItem: {
    backgroundColor: '#004643',
  },
  pickerItemText: {
    fontSize: 14,
    color: '#333',
    textAlign: 'center',
  },
  selectedPickerItemText: {
    color: 'white',
    fontWeight: '600',
  },
  confirmButton: {
    backgroundColor: '#004643',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginTop: 16,
    marginHorizontal: 20,
    marginBottom: 20,
  },
  modalBackdrop: {
    flex: 1,
  },
  progressContainer: {
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0'
  },
  progressContent: {
    flex: 1,
  },
  progressText: {
    fontSize: 16,
    color: '#333',
    flex: 1
  },
  progressBar: {
    height: 8,
    backgroundColor: '#E0E0E0',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#004643',
    borderRadius: 4
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8
  },
  progressLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333'
  },
  progressPercentage: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#004643'
  }
});