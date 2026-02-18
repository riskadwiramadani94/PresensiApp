import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Linking } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { AppHeader, SkeletonLoader } from '../../../components';
import { KelolaDinasAPI, PegawaiAkunAPI, PengaturanAPI } from '../../../constants/config';

interface DetailDinas {
  id: number;
  namaKegiatan: string;
  nomorSpt: string;
  jenisDinas: string;
  tanggal_mulai: string;
  tanggal_selesai: string;
  jam_mulai?: string;
  jam_selesai?: string;
  deskripsi?: string;
  lokasi: string;
  jamKerja: string;
  radius: number;
  koordinat_lat?: number;
  koordinat_lng?: number;
  status?: string;
  created_at?: string;
  dokumen_spt?: string;
  pegawai: Array<{
    nama: string;
    nip: string;
    jabatan: string;
    status: string;
    jamAbsen: string | null;
    id_user?: number;
  }>;
  lokasi_dinas?: Array<{
    id: number;
    nama_lokasi: string;
    jenis_lokasi: string;
  }>;
}

export default function DetailDinasScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const [detailDinas, setDetailDinas] = useState<DetailDinas | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDetailDinas();
  }, [id]);

  const fetchDetailDinas = async () => {
    try {
      setLoading(true);
      const response = await KelolaDinasAPI.getDinasAktif();
      
      if (response.success && response.data) {
        const dinasData = response.data.find((item: any) => item.id === Number(id));
        
        if (dinasData) {
          const pegawaiResponse = await PegawaiAkunAPI.getDataPegawai();
          
          if (pegawaiResponse.success && pegawaiResponse.data) {
            const pegawaiLengkap = dinasData.pegawai.map((pegawaiDinas: any) => {
              const pegawaiData = pegawaiResponse.data.find((p: any) => 
                p.nama_lengkap === pegawaiDinas.nama
              );
              return {
                ...pegawaiDinas,
                nip: pegawaiData?.nip || '-',
                jabatan: pegawaiData?.jabatan || '-',
                id_user: pegawaiData?.id_user || pegawaiData?.id_pegawai || pegawaiData?.id
              };
            });
            
            const updatedDinasData = {
              ...dinasData,
              jenisDinas: dinasData.jenisDinas || 'lokal',
              pegawai: pegawaiLengkap,
              lokasi_dinas: dinasData.lokasi_list || []
            };
            
            setDetailDinas(updatedDinasData);
          } else {
            setDetailDinas(dinasData);
          }
        } else {
          Alert.alert('Error', 'Data dinas tidak ditemukan');
        }
      } else {
        Alert.alert('Error', response.message || 'Gagal memuat detail dinas');
      }
    } catch (error) {
      Alert.alert('Error', 'Gagal memuat detail dinas');
    } finally {
      setLoading(false);
    }
  };

  const getDinasStatus = () => {
    if (!detailDinas) return { status: 'Unknown', color: '#666' };
    
    const today = new Date();
    const mulai = new Date(detailDinas.tanggal_mulai);
    const selesai = new Date(detailDinas.tanggal_selesai);
    
    today.setHours(0, 0, 0, 0);
    mulai.setHours(0, 0, 0, 0);
    selesai.setHours(23, 59, 59, 999);
    
    if (today < mulai) {
      return { status: 'Belum Dimulai', color: '#FF9800' };
    } else if (today >= mulai && today <= selesai) {
      return { status: 'Sedang Berlangsung', color: '#4CAF50' };
    } else {
      return { status: 'Selesai', color: '#2196F3' };
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '-';
    try {
      return new Date(dateString).toLocaleDateString('id-ID', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch (error) {
      return '-';
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <StatusBar style="light" translucent={true} backgroundColor="transparent" />
        <AppHeader 
          title="Detail Dinas"
          showBack={true}
          fallbackRoute="/kelola-dinas"
        />
        <SkeletonLoader type="detail" count={1} message="Memuat detail dinas..." />
      </View>
    );
  }

  if (!detailDinas) {
    return (
      <View style={styles.container}>
        <StatusBar style="light" translucent={true} backgroundColor="transparent" />
        <AppHeader 
          title="Detail Dinas"
          showBack={true}
          fallbackRoute="/kelola-dinas"
        />
        <View style={styles.emptyState}>
          <Ionicons name="document-outline" size={60} color="#ccc" />
          <Text style={styles.emptyText}>Data dinas tidak ditemukan</Text>
        </View>
      </View>
    );
  }

  const dinasStatus = getDinasStatus();
  const totalPegawai = detailDinas.pegawai?.length || 0;

  return (
    <View style={styles.container}>
      <StatusBar style="light" translucent={true} backgroundColor="transparent" />
      
      <AppHeader 
        title="Detail Dinas"
        showBack={true}
        fallbackRoute="/kelola-dinas"
      />

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.headerCard}>
          <View style={styles.headerTop}>
            <View style={styles.titleSection}>
              <Text style={styles.kegiatanTitle}>{detailDinas.namaKegiatan}</Text>
              <Text style={styles.sptNumber}>{detailDinas.nomorSpt}</Text>
            </View>
            <View style={[styles.dinasStatusBadge, { backgroundColor: dinasStatus.color }]}>
              <Text style={styles.dinasStatusText}>{dinasStatus.status}</Text>
            </View>
          </View>
          {detailDinas.created_at && (
            <Text style={styles.createdDate}>
              Tanggal dibuat: {formatDate(detailDinas.created_at)}
            </Text>
          )}
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.cardTitle}>Informasi Kegiatan</Text>
          
          <View style={styles.infoRow}>
            <Ionicons name="briefcase-outline" size={20} color="#004643" />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Jenis Dinas</Text>
              <Text style={styles.infoValue}>
                {detailDinas.jenisDinas === 'lokal' ? 'Dinas Lokal' : 
                 detailDinas.jenisDinas === 'luar_kota' ? 'Dinas Luar Kota' : 
                 detailDinas.jenisDinas === 'luar_negeri' ? 'Dinas Luar Negeri' : 
                 'Tidak diketahui'}
              </Text>
            </View>
          </View>
          
          <View style={styles.infoRow}>
            <Ionicons name="location-outline" size={20} color="#004643" />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Lokasi</Text>
              <Text style={styles.infoValue}>{detailDinas.lokasi}</Text>
              {detailDinas.lokasi_dinas && detailDinas.lokasi_dinas.length > 0 && (
                <View style={styles.lokasiDinasList}>
                  {detailDinas.lokasi_dinas.map((lokasi) => (
                    <View key={String(lokasi.id)} style={styles.lokasiDinasRow}>
                      <Text style={styles.lokasiDinasItem}>
                        • {lokasi.nama_lokasi} ({lokasi.jenis_lokasi === 'tetap' ? 'Kantor Tetap' : 'Lokasi Dinas'})
                      </Text>
                      <View style={styles.radiusBadge}>
                        <Text style={styles.radiusText}>{detailDinas.radius}m</Text>
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </View>
          </View>

          <View style={styles.infoRow}>
            <Ionicons name="document-text-outline" size={20} color="#004643" />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Deskripsi</Text>
              <Text style={styles.infoValue}>{detailDinas.deskripsi || '-'}</Text>
            </View>
          </View>
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.cardTitle}>Waktu & Jadwal Dinas</Text>
          
          <View style={styles.infoRow}>
            <Ionicons name="calendar-outline" size={20} color="#004643" />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Tanggal Mulai</Text>
              <Text style={styles.infoValue}>{formatDate(detailDinas.tanggal_mulai)}</Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <Ionicons name="calendar-outline" size={20} color="#004643" />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Tanggal Selesai</Text>
              <Text style={styles.infoValue}>{formatDate(detailDinas.tanggal_selesai)}</Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <Ionicons name="time-outline" size={20} color="#004643" />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Jam Kerja</Text>
              {detailDinas.jam_mulai && detailDinas.jam_selesai ? (
                <Text style={styles.infoValue}>
                  {detailDinas.jam_mulai} - {detailDinas.jam_selesai} (Jam Khusus)
                </Text>
              ) : (
                <Text style={styles.infoValue}>Mengikuti jam kerja kantor</Text>
              )}
            </View>
          </View>

          {detailDinas.koordinat_lat && detailDinas.koordinat_lng && (
            <View style={styles.infoRow}>
              <Ionicons name="navigate-outline" size={20} color="#004643" />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Koordinat GPS</Text>
                <Text style={styles.infoValue}>
                  {detailDinas.koordinat_lat.toFixed(6)}, {detailDinas.koordinat_lng.toFixed(6)}
                </Text>
              </View>
            </View>
          )}
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.cardTitle}>Dokumen SPT</Text>
          
          {detailDinas.dokumen_spt ? (
            <TouchableOpacity 
              style={styles.documentRow}
              onPress={() => {
                const fileUrl = `http://192.168.1.7:3000/uploads/spt/${detailDinas.dokumen_spt}`;
                Linking.openURL(fileUrl).catch(() => {
                  Alert.alert('Error', 'Tidak dapat membuka dokumen');
                });
              }}
            >
              <Ionicons name="document-attach-outline" size={20} color="#004643" />
              <View style={styles.infoContent}>
                <Text style={styles.infoValue}>{detailDinas.dokumen_spt}</Text>
                <Text style={styles.infoSubtext}>Tap untuk membuka dokumen</Text>
              </View>
              <Ionicons name="download-outline" size={20} color="#666" />
            </TouchableOpacity>
          ) : (
            <View style={styles.infoRow}>
              <Ionicons name="document-attach-outline" size={20} color="#999" />
              <View style={styles.infoContent}>
                <Text style={[styles.infoValue, { color: '#999' }]}>-</Text>
              </View>
            </View>
          )}
        </View>

        <View style={styles.pegawaiSection}>
          <Text style={styles.cardTitle}>Daftar Pegawai ({totalPegawai})</Text>
          
          {detailDinas.pegawai && detailDinas.pegawai.length > 0 ? detailDinas.pegawai.map((pegawai, index) => (
            <View key={`pegawai-${pegawai.id_user || pegawai.nip || index}`} style={styles.pegawaiCard}>
              <View style={styles.pegawaiHeader}>
                <View style={styles.avatarContainer}>
                  <Ionicons name="person-circle" size={40} color="#004643" />
                </View>
                <View style={styles.pegawaiInfo}>
                  <Text style={styles.pegawaiName}>{pegawai.nama}</Text>
                  <Text style={styles.pegawaiNip}>NIP: {pegawai.nip}</Text>
                  <Text style={styles.pegawaiJabatan}>{pegawai.jabatan}</Text>
                </View>
              </View>
            </View>
          )) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>Tidak ada pegawai</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFB',
  },
  scrollView: {
    flex: 1,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    marginTop: 10,
  },
  headerCard: {
    backgroundColor: '#fff',
    marginHorizontal: 15,
    marginTop: 15,
    marginBottom: 12,
    padding: 15,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  titleSection: {
    flex: 1,
    marginRight: 12,
  },
  kegiatanTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  sptNumber: {
    fontSize: 14,
    color: '#666',
  },
  dinasStatusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  dinasStatusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  createdDate: {
    fontSize: 12,
    color: '#999',
    fontStyle: 'italic',
  },
  infoCard: {
    backgroundColor: '#fff',
    marginHorizontal: 15,
    marginBottom: 12,
    padding: 15,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  infoContent: {
    flex: 1,
    marginLeft: 12,
  },
  infoLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  infoSubtext: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  lokasiDinasList: {
    marginTop: 8,
  },
  lokasiDinasRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  lokasiDinasItem: {
    fontSize: 12,
    color: '#666',
    flex: 1,
  },
  radiusBadge: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 8,
  },
  radiusText: {
    fontSize: 11,
    color: '#fff',
    fontWeight: '600',
  },
  documentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  pegawaiSection: {
    marginHorizontal: 15,
    marginBottom: 16,
  },
  pegawaiCard: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  pegawaiHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    marginRight: 12,
  },
  pegawaiInfo: {
    flex: 1,
  },
  pegawaiName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 2,
  },
  pegawaiNip: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  pegawaiJabatan: {
    fontSize: 12,
    color: '#004643',
    fontWeight: '500',
  },
});
