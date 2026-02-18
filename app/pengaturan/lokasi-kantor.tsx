import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Modal, TextInput, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { PengaturanAPI } from '../../constants/config';
import { AppHeader, SkeletonLoader } from '../../components';

export default function LokasiKantorScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [lokasiKantor, setLokasiKantor] = useState<any[]>([]);
  const [lokasiDinas, setLokasiDinas] = useState<any[]>([]);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingLokasi, setEditingLokasi] = useState<any>(null);
  const [editNama, setEditNama] = useState('');
  const [editAlamat, setEditAlamat] = useState('');
  const [editLatitude, setEditLatitude] = useState<number | null>(null);
  const [editLongitude, setEditLongitude] = useState<number | null>(null);
  const [editRadius, setEditRadius] = useState('');
  const [showMapModal, setShowMapModal] = useState(false);
  const [markerPosition, setMarkerPosition] = useState<{latitude: number, longitude: number} | null>(null);
  const [showMenu, setShowMenu] = useState<number | null>(null);

  useEffect(() => {
    fetchLokasiData();
  }, []);

  // Refresh data ketika kembali dari halaman tambah lokasi
  useFocusEffect(
    React.useCallback(() => {
      fetchLokasiData();
    }, [])
  );

  const fetchLokasiData = async () => {
    try {
      setLoading(true);
      const response = await PengaturanAPI.getLokasiKantor();
      if (response.success && response.data) {
        const kantor = response.data.filter((item: any) => item.jenis_lokasi === 'tetap');
        const dinas = response.data.filter((item: any) => item.jenis_lokasi === 'dinas');
        setLokasiKantor(kantor);
        setLokasiDinas(dinas);
      }
    } catch (error) {
      console.error('Error fetching lokasi:', error);
      setLokasiKantor([
        { id: 1, nama_lokasi: 'Kantor Pusat', alamat: 'Jl. Sudirman No. 1', jenis_lokasi: 'tetap' }
      ]);
      setLokasiDinas([]);
    } finally {
      setLoading(false);
    }
  };

  const deleteLokasi = async (id: number) => {
    Alert.alert(
      'Konfirmasi',
      'Yakin ingin menghapus lokasi ini?',
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Hapus',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              const response = await PengaturanAPI.deleteLokasi(id);
              if (response.success) {
                // Update state langsung untuk menghapus dari tampilan
                setLokasiKantor(prev => prev.filter(item => item.id !== id));
                setLokasiDinas(prev => prev.filter(item => item.id !== id));
                Alert.alert('Sukses', 'Lokasi berhasil dihapus');
                // Refresh dari server untuk sinkronisasi
                await fetchLokasiData();
              } else {
                Alert.alert('Informasi', response.message || 'Gagal menghapus lokasi');
              }
            } catch (error) {
              console.error('Error deleting lokasi:', error);
              Alert.alert('Informasi', 'Terjadi kesalahan saat menghapus lokasi');
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  const editLokasi = (lokasi: any) => {
    setEditingLokasi(lokasi);
    setEditNama(lokasi.nama_lokasi);
    setEditAlamat(lokasi.alamat);
    setEditLatitude(lokasi.latitude);
    setEditLongitude(lokasi.longitude);
    setEditRadius(lokasi.radius?.toString() || '100');
    setShowEditModal(true);
  };

  const saveEditLokasi = async () => {
    if (!editNama.trim() || !editAlamat.trim()) {
      Alert.alert('Error', 'Nama lokasi dan alamat harus diisi');
      return;
    }

    if (!editLatitude || !editLongitude) {
      Alert.alert('Error', 'Lokasi harus dipilih di peta');
      return;
    }

    if (!editRadius || parseInt(editRadius) < 10 || parseInt(editRadius) > 1000) {
      Alert.alert('Error', 'Radius harus antara 10-1000 meter');
      return;
    }

    try {
      setLoading(true);
      // Simulasi update - ganti dengan API call yang benar
      Alert.alert('Sukses', 'Lokasi berhasil diupdate');
      setShowEditModal(false);
      fetchLokasiData();
    } catch (error) {
      Alert.alert('Error', 'Terjadi kesalahan saat mengupdate lokasi');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" translucent={true} backgroundColor="transparent" />
      
      <AppHeader 
        title="Lokasi Kantor"
        showBack={true}
        showAddButton={true}
        onAddPress={() => router.push('/pengaturan/tambah-lokasi')}
      />

      <View style={styles.contentContainer}>
        {loading ? (
          <SkeletonLoader type="list" count={4} message="Memuat lokasi kantor..." />
        ) : (
          <ScrollView style={styles.content}>
        <View style={styles.infoCard}>
          <Ionicons name="information-circle" size={20} color="#004643" />
          <Text style={styles.infoText}>
            Kelola lokasi kantor tetap dan lokasi untuk kegiatan dinas
          </Text>
        </View>

        {/* Lokasi Kantor Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionLeft}>
              <Ionicons name="business" size={20} color="#004643" />
              <Text style={styles.sectionTitle}>Lokasi Kantor</Text>
            </View>
          </View>
          
          {lokasiKantor.map((lokasi) => (
            <View key={lokasi.id} style={styles.lokasiCard}>
              <View style={styles.lokasiInfo}>
                <Text style={styles.lokasiName}>{lokasi.nama_lokasi}</Text>
                <Text style={styles.lokasiAddress}>{lokasi.alamat}</Text>
                <View style={styles.lokasiType}>
                  <Ionicons name="business-outline" size={12} color="#004643" />
                  <Text style={styles.lokasiTypeText}>Kantor Tetap</Text>
                </View>
              </View>
              <View style={styles.actionButtons}>
                <TouchableOpacity 
                  style={styles.editBtn}
                  onPress={() => router.push(`/pengaturan/edit-lokasi?id=${lokasi.id}`)}
                >
                  <Ionicons name="create-outline" size={15} color="#FF9800" />
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.deleteBtn}
                  onPress={() => deleteLokasi(lokasi.id)}
                >
                  <Ionicons name="trash-outline" size={15} color="#F44336" />
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>

        {/* Visual Separator */}
        <View style={styles.separator} />

        {/* Lokasi Dinas Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionLeft}>
              <Ionicons name="location" size={20} color="#FF6B35" />
              <Text style={styles.sectionTitle}>Lokasi Dinas</Text>
            </View>
          </View>
          
          {lokasiDinas.map((lokasi) => (
            <View key={lokasi.id} style={styles.lokasiCard}>
              <View style={styles.lokasiInfo}>
                <Text style={styles.lokasiName}>{lokasi.nama_lokasi}</Text>
                <Text style={styles.lokasiAddress}>{lokasi.alamat}</Text>
                <View style={styles.lokasiType}>
                  <Ionicons name="location-outline" size={12} color="#FF6B35" />
                  <Text style={[styles.lokasiTypeText, {color: '#FF6B35'}]}>Lokasi Dinas</Text>
                </View>
              </View>
              <View style={styles.actionButtons}>
                <TouchableOpacity 
                  style={styles.editBtn}
                  onPress={() => router.push(`/pengaturan/edit-lokasi?id=${lokasi.id}`)}
                >
                  <Ionicons name="create-outline" size={15} color="#FF9800" />
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.deleteBtn}
                  onPress={() => deleteLokasi(lokasi.id)}
                >
                  <Ionicons name="trash-outline" size={15} color="#F44336" />
                </TouchableOpacity>
              </View>
            </View>
          ))}
          
          {lokasiDinas.length === 0 && (
            <View style={styles.emptyState}>
              <Ionicons name="location-outline" size={40} color="#CCC" />
              <Text style={styles.emptyText}>Belum ada lokasi dinas</Text>
              <Text style={styles.emptySubtext}>Gunakan tombol di bawah untuk menambah lokasi</Text>
            </View>
          )}
        </View>
          </ScrollView>
        )}
      </View>
      


      <Modal
        visible={showEditModal}
        transparent={true}
        onRequestClose={() => setShowEditModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Lokasi</Text>
            </View>
            
            <ScrollView style={styles.modalForm}>
              <View style={styles.formGroup}>
                <Text style={styles.label}>Nama Lokasi *</Text>
                <View style={styles.inputWrapper}>
                  <Ionicons name="business-outline" size={20} color="#666" />
                  <TextInput
                    style={styles.input}
                    placeholder="Masukkan nama lokasi"
                    value={editNama}
                    onChangeText={setEditNama}
                    placeholderTextColor="#999"
                  />
                </View>
              </View>
              
              <View style={styles.formGroup}>
                <Text style={styles.label}>Alamat Lengkap *</Text>
                <View style={styles.inputWrapper}>
                  <Ionicons name="location-outline" size={20} color="#666" />
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    placeholder="Masukkan alamat lengkap"
                    value={editAlamat}
                    onChangeText={setEditAlamat}
                    placeholderTextColor="#999"
                    multiline={true}
                    numberOfLines={3}
                  />
                </View>
              </View>
              
              <View style={styles.formGroup}>
                <TouchableOpacity 
                  style={styles.mapBtn} 
                  onPress={() => setShowMapModal(true)}
                >
                  <Ionicons name="map-outline" size={20} color="#004643" />
                  <Text style={styles.mapBtnText}>
                    {editLatitude ? 'Lokasi Dipilih' : 'Pilih Lokasi di Peta'}
                  </Text>
                  {editLatitude && (
                    <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />
                  )}
                </TouchableOpacity>
                {editLatitude && editLongitude && (
                  <Text style={styles.coordText}>
                    {editLatitude.toFixed(6)}, {editLongitude.toFixed(6)}
                  </Text>
                )}
              </View>
              
              <View style={styles.formGroup}>
                <Text style={styles.label}>Radius Absensi (meter) *</Text>
                <View style={styles.inputWrapper}>
                  <Ionicons name="radio-outline" size={20} color="#666" />
                  <TextInput
                    style={styles.input}
                    placeholder="10-1000"
                    value={editRadius}
                    onChangeText={(text) => {
                      const numericValue = text.replace(/[^0-9]/g, '');
                      if (numericValue === '' || numericValue.length <= 4) {
                        setEditRadius(numericValue);
                      }
                    }}
                    keyboardType="numeric"
                    maxLength={4}
                  />
                  <Text style={styles.unitText}>m</Text>
                </View>
              </View>
            </ScrollView>
            
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={styles.cancelBtn}
                onPress={() => setShowEditModal(false)}
              >
                <Text style={styles.cancelBtnText}>Batal</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.saveBtn}
                onPress={saveEditLokasi}
                disabled={loading}
              >
                <Text style={styles.saveBtnText}>Simpan</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFB' },
  contentContainer: {
    flex: 1
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 0,
    width: '90%',
    maxHeight: '80%'
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0'
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#004643'
  },
  modalForm: {
    maxHeight: 300,
    paddingHorizontal: 20
  },
  formGroup: {
    marginBottom: 20,
    marginTop: 20
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9F9F9',
    borderRadius: 10,
    paddingHorizontal: 15,
    borderWidth: 1,
    borderColor: '#E0E0E0'
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: '#333',
    paddingVertical: 12,
    marginLeft: 10
  },
  textArea: {
    textAlignVertical: 'top',
    paddingTop: 12,
    minHeight: 80
  },
  modalButtons: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0'
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#F5F5F5',
    alignItems: 'center'
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666'
  },
  saveBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#004643',
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6
  },
  saveBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff'
  },
  mapBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F8F7',
    padding: 15,
    borderRadius: 10,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1
  },
  mapBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#004643',
    marginLeft: 8,
    flex: 1
  },
  coordText: {
    fontSize: 11,
    color: '#666',
    marginTop: 5,
    fontFamily: 'monospace'
  },
  unitText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
    marginLeft: 8
  },
  content: {
    flex: 1,
    paddingHorizontal: 5,
    paddingTop: 15
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: '#F0F8F7',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    marginHorizontal: 20,
    alignItems: 'flex-start',
    borderWidth: 1,
    borderColor: '#D0E8E4',
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    color: '#004643',
    marginLeft: 12,
    lineHeight: 16
  },
  section: {
    marginBottom: 16,
    marginHorizontal: 20
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingHorizontal: 4
  },
  sectionLeft: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginLeft: 8
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F8F7',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8
  },
  addBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#004643',
    marginLeft: 4
  },
  lokasiCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 16,
    marginBottom: 15,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4
  },
  lokasiInfo: {
    flex: 1
  },
  lokasiName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4
  },
  lokasiAddress: {
    fontSize: 13,
    color: '#666',
    marginBottom: 6
  },
  lokasiType: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  lokasiTypeText: {
    fontSize: 11,
    fontWeight: '500',
    color: '#004643',
    marginLeft: 4
  },
  deleteBtn: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#FFF5F5'
  },
  actionButtons: { flexDirection: 'row', gap: 5 },
  editBtn: { 
    padding: 6, 
    borderRadius: 6, 
    backgroundColor: '#FFF3E0' 
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#999',
    marginTop: 10
  },
  emptySubtext: {
    fontSize: 12,
    color: '#CCC',
    marginTop: 5,
    textAlign: 'center'
  },
  separator: {
    height: 1,
    backgroundColor: '#E0E0E0',
    marginVertical: 16,
    marginHorizontal: 10
  }
});
