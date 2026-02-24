import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Linking, Platform, Alert } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { AppHeader } from '../../../components';
import { PegawaiAPI, API_CONFIG } from '../../../constants/config';

export default function DetailKegiatanScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [loading, setLoading] = useState(true);
  const [kegiatan, setKegiatan] = useState<any>(null);
  const [viewingDoc, setViewingDoc] = useState(false);

  useEffect(() => {
    if (params.id) {
      fetchDetailKegiatan();
    }
  }, [params.id]);

  const fetchDetailKegiatan = async () => {
    try {
      setLoading(true);
      const response = await PegawaiAPI.getDetailKegiatan(Number(params.id));
      if (response.success && response.data) {
        setKegiatan(response.data);
      }
    } catch (error) {
      console.error('Error fetching detail:', error);
      Alert.alert('Error', 'Gagal memuat detail kegiatan');
    } finally {
      setLoading(false);
    }
  };

  const getStatusInfo = () => {
    if (!kegiatan) return { label: '', color: '', icon: '' };
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const mulai = new Date(kegiatan.tanggal_mulai);
    const selesai = new Date(kegiatan.tanggal_selesai);
    mulai.setHours(0, 0, 0, 0);
    selesai.setHours(23, 59, 59, 999);

    if (today >= mulai && today <= selesai) {
      return { label: 'Berlangsung', color: '#4CAF50', icon: 'radio-button-on' };
    } else if (mulai > today) {
      return { label: 'Akan Datang', color: '#FF9800', icon: 'time' };
    } else {
      return { label: 'Selesai', color: '#2196F3', icon: 'checkmark-circle' };
    }
  };

  const getJenisDinasLabel = (jenis: string) => {
    switch (jenis) {
      case 'lokal': return 'Dinas Lokal';
      case 'luar_kota': return 'Dinas Luar Kota';
      case 'luar_negeri': return 'Dinas Luar Negeri';
      default: return jenis;
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const calculateDuration = () => {
    if (!kegiatan) return 0;
    const mulai = new Date(kegiatan.tanggal_mulai);
    const selesai = new Date(kegiatan.tanggal_selesai);
    const diff = selesai.getTime() - mulai.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24)) + 1;
  };

  const openMap = (lokasi: any) => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${lokasi.latitude},${lokasi.longitude}`;
    Linking.openURL(url);
  };

  const viewDokumen = async () => {
    if (!kegiatan?.dokumen_spt) {
      Alert.alert('Info', 'Tidak ada dokumen untuk dilihat');
      return;
    }

    try {
      const fileUri = `${API_CONFIG.BASE_URL}/uploads/spt/${kegiatan.dokumen_spt}`;
      const supported = await Linking.canOpenURL(fileUri);
      
      if (supported) {
        await Linking.openURL(fileUri);
      } else {
        Alert.alert('Error', 'Tidak dapat membuka dokumen');
      }
    } catch (error) {
      console.error('View document error:', error);
      Alert.alert('Error', 'Gagal membuka dokumen');
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <StatusBar style="light" translucent={true} backgroundColor="transparent" />
        <AppHeader title="Detail Kegiatan" showBack={true} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#004643" />
          <Text style={styles.loadingText}>Memuat detail...</Text>
        </View>
      </View>
    );
  }

  if (!kegiatan) {
    return (
      <View style={styles.container}>
        <StatusBar style="light" translucent={true} backgroundColor="transparent" />
        <AppHeader title="Detail Kegiatan" showBack={true} />
        <View style={styles.emptyContainer}>
          <Ionicons name="alert-circle-outline" size={64} color="#E0E0E0" />
          <Text style={styles.emptyText}>Data kegiatan tidak ditemukan</Text>
        </View>
      </View>
    );
  }

  const status = getStatusInfo();

  return (
    <View style={styles.container}>
      <StatusBar style="light" translucent={true} backgroundColor="transparent" />
      <AppHeader title="Detail Kegiatan" showBack={true} />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Informasi Dasar */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionIconBox}>
              <Ionicons name="information-circle" size={18} color="#004643" />
            </View>
            <Text style={styles.sectionTitle}>Informasi Kegiatan</Text>
          </View>
          
          <View style={styles.infoCard}>
            <View style={styles.cardHeader}>
              <View style={styles.cardLeft}>
                <Text style={styles.mainTitle}>{kegiatan.nama_kegiatan}</Text>
                <Text style={styles.subtitle}>{kegiatan.nomor_spt}</Text>
              </View>
              <View style={styles.cardRight}>
                <View style={[styles.statusBadgeSmall, { backgroundColor: status.color + '20' }]}>
                  <Ionicons name={status.icon as any} size={12} color={status.color} />
                  <Text style={[styles.statusTextSmall, { color: status.color }]}>
                    {status.label}
                  </Text>
                </View>
              </View>
            </View>
            
            <View style={styles.badgeContainer}>
              <View style={styles.jenisBadge}>
                <Ionicons name="location" size={14} color="#004643" />
                <Text style={styles.jenisBadgeText}>{getJenisDinasLabel(kegiatan.jenis_dinas)}</Text>
              </View>
            </View>

            {kegiatan.deskripsi && (
              <View style={styles.descriptionBox}>
                <Text style={styles.descriptionLabel}>Deskripsi:</Text>
                <Text style={styles.descriptionText}>{kegiatan.deskripsi}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Jadwal & Waktu */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionIconBox}>
              <Ionicons name="calendar" size={18} color="#004643" />
            </View>
            <Text style={styles.sectionTitle}>Jadwal & Waktu</Text>
          </View>
          
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <View style={styles.iconBox}>
                <Ionicons name="calendar-outline" size={20} color="#004643" />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Tanggal Mulai</Text>
                <Text style={styles.infoValue}>{formatDate(kegiatan.tanggal_mulai)}</Text>
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.infoRow}>
              <View style={styles.iconBox}>
                <Ionicons name="calendar-outline" size={20} color="#004643" />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Tanggal Selesai</Text>
                <Text style={styles.infoValue}>{formatDate(kegiatan.tanggal_selesai)}</Text>
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.infoRow}>
              <View style={styles.iconBox}>
                <Ionicons name="time-outline" size={20} color="#004643" />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Durasi</Text>
                <Text style={styles.infoValue}>{calculateDuration()} hari</Text>
              </View>
            </View>

            {kegiatan.jam_mulai && kegiatan.jam_selesai && (
              <>
                <View style={styles.divider} />
                <View style={styles.infoRow}>
                  <View style={styles.iconBox}>
                    <Ionicons name="time" size={20} color="#004643" />
                  </View>
                  <View style={styles.infoContent}>
                    <Text style={styles.infoLabel}>Jam Kerja</Text>
                    <Text style={styles.infoValue}>{kegiatan.jam_mulai} - {kegiatan.jam_selesai} WIB</Text>
                  </View>
                </View>
              </>
            )}
          </View>
        </View>

        {/* Lokasi Dinas */}
        {kegiatan.lokasi && kegiatan.lokasi.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionIconBox}>
                <Ionicons name="location" size={18} color="#004643" />
              </View>
              <Text style={styles.sectionTitle}>Lokasi Dinas ({kegiatan.lokasi.length})</Text>
            </View>
            
            {kegiatan.lokasi.map((lokasi: any, index: number) => (
              <View key={index} style={styles.lokasiCard}>
                <View style={styles.lokasiHeader}>
                  <Ionicons name="location" size={20} color="#004643" />
                  <Text style={styles.lokasiName}>{lokasi.nama_lokasi}</Text>
                </View>
                
                {lokasi.alamat && (
                  <Text style={styles.lokasiAddress}>{lokasi.alamat}</Text>
                )}

                <TouchableOpacity
                  style={styles.lokasiBtn}
                  onPress={() => openMap(lokasi)}
                >
                  <Ionicons name="navigate" size={16} color="#004643" />
                  <Text style={styles.lokasiBtnText}>Buka Peta</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        {/* Rekan Dinas */}
        {kegiatan.pegawai && kegiatan.pegawai.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionIconBox}>
                <Ionicons name="people" size={18} color="#004643" />
              </View>
              <Text style={styles.sectionTitle}>Rekan Dinas ({kegiatan.pegawai.length})</Text>
            </View>
            
            {kegiatan.pegawai.map((pegawai: any, index: number) => (
              <View key={index} style={styles.pegawaiCard}>
                <View style={styles.avatarCircle}>
                  <Text style={styles.avatarText}>
                    {pegawai.nama_lengkap?.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View style={styles.pegawaiInfo}>
                  <Text style={styles.pegawaiName}>{pegawai.nama_lengkap}</Text>
                  <Text style={styles.pegawaiNip}>NIP: {pegawai.nip}</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Dokumen SPT */}
        {kegiatan.dokumen_spt && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionIconBox}>
                <Ionicons name="document-text" size={18} color="#004643" />
              </View>
              <Text style={styles.sectionTitle}>Dokumen SPT</Text>
            </View>
            
            <View style={styles.dokumenCard}>
              <View style={styles.dokumenIcon}>
                <Ionicons name="document-text" size={32} color="#004643" />
              </View>
              <View style={styles.dokumenInfo}>
                <Text style={styles.dokumenName}>{kegiatan.dokumen_spt}</Text>
                <Text style={styles.dokumenSize}>Dokumen SPT</Text>
              </View>
              <TouchableOpacity
                style={styles.downloadBtn}
                onPress={viewDokumen}
              >
                <Ionicons name="eye-outline" size={24} color="#004643" />
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff' },
  content: { flex: 1, paddingTop: 15, paddingBottom: 30 },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: { fontSize: 14, color: '#666' },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  emptyText: { fontSize: 14, color: '#666' },

  section: { marginBottom: 20 },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    marginHorizontal: 15,
    gap: 8,
  },
  sectionIconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#F0F8F7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
    flex: 1,
  },
  infoCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    marginHorizontal: 15,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  cardLeft: {
    flex: 1,
    marginRight: 10,
  },
  cardRight: {
    alignItems: 'flex-end',
  },
  statusBadgeSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  statusTextSmall: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  mainTitle: { fontSize: 16, fontWeight: 'bold', color: '#333', marginBottom: 4 },
  subtitle: { fontSize: 13, color: '#666', marginBottom: 0 },
  badgeContainer: { flexDirection: 'row', marginBottom: 12, marginTop: 12 },
  jenisBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F8F7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  jenisBadgeText: { fontSize: 12, fontWeight: '600', color: '#004643' },
  descriptionBox: {
    backgroundColor: '#F8FAFC',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  descriptionLabel: { fontSize: 12, fontWeight: '600', color: '#64748B', marginBottom: 4 },
  descriptionText: { fontSize: 13, color: '#475569', lineHeight: 20 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#F0F8F7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoContent: { flex: 1 },
  infoLabel: { fontSize: 12, color: '#64748B', marginBottom: 2 },
  infoValue: { fontSize: 14, fontWeight: '600', color: '#1E293B' },
  divider: { height: 1, backgroundColor: '#F1F5F9', marginVertical: 12 },
  lokasiCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    marginBottom: 12,
    marginHorizontal: 15,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  lokasiHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  lokasiName: { fontSize: 15, fontWeight: '600', color: '#1E293B', flex: 1 },
  lokasiAddress: { fontSize: 13, color: '#64748B', marginBottom: 12, lineHeight: 18 },
  lokasiBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F0F8F7',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
    marginTop: 12,
  },
  lokasiBtnText: { fontSize: 13, fontWeight: '600', color: '#004643' },
  pegawaiCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    marginHorizontal: 15,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    gap: 12,
  },
  avatarCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#004643',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: { fontSize: 18, fontWeight: '700', color: '#fff' },
  pegawaiInfo: { flex: 1 },
  pegawaiName: { fontSize: 14, fontWeight: '600', color: '#1E293B', marginBottom: 2 },
  pegawaiNip: { fontSize: 12, color: '#64748B' },
  dokumenCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    marginHorizontal: 15,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    gap: 12,
  },
  dokumenIcon: {
    width: 50,
    height: 50,
    borderRadius: 8,
    backgroundColor: '#F0F8F7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dokumenInfo: { flex: 1 },
  dokumenName: { fontSize: 14, fontWeight: '600', color: '#1E293B', marginBottom: 2 },
  dokumenSize: { fontSize: 12, color: '#64748B' },
  downloadBtn: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#F0F8F7',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
