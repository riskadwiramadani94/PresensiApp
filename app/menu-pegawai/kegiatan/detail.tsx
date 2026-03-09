import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Linking, Platform, Alert } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { AppHeader, CustomAlert } from '../../../hooks/useCustomAlert';
import { PegawaiAPI, API_CONFIG } from '../../../constants/config';

export default function DetailKegiatanScreen() {
  const alert = useCustomAlert();
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
      alert.showAlert({ type: 'error', message: 'Gagal memuat detail kegiatan' });
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
      alert.showAlert({ type: 'info', message: 'Tidak ada dokumen untuk dilihat' });
      return;
    }

    try {
      const fileUri = `${API_CONFIG.BASE_URL}/uploads/spt/${kegiatan.dokumen_spt}`;
      const supported = await Linking.canOpenURL(fileUri);
      
      if (supported) {
        await Linking.openURL(fileUri);
      } else {
        alert.showAlert({ type: 'error', message: 'Tidak dapat membuka dokumen' });
      }
    } catch (error) {
      console.error('View document error:', error);
      alert.showAlert({ type: 'error', message: 'Gagal membuka dokumen' });
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <StatusBar style="light" translucent={true} backgroundColor="transparent" />
        <AppHeader title="Detail Kegiatan" showBack={true} />
        
        <ScrollView 
          showsVerticalScrollIndicator={false} 
          contentContainerStyle={styles.scrollContent}
          bounces={false}
        >
          {/* Skeleton Premium Header */}
          <View style={styles.premiumHeader}>
            <View style={styles.headerTopRow}>
              <View style={styles.titleWrapper}>
                <View style={[styles.skeletonText, { width: '80%', height: 22, backgroundColor: 'rgba(255,255,255,0.3)', marginBottom: 10 }]} />
                <View style={styles.sptContainer}>
                  <View style={[styles.skeletonText, { width: 14, height: 14, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 2 }]} />
                  <View style={[styles.skeletonText, { width: '60%', height: 13, backgroundColor: 'rgba(255,255,255,0.2)', marginLeft: 6 }]} />
                </View>
              </View>
              <View style={[styles.skeletonText, { width: 80, height: 28, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 20 }]} />
            </View>
          </View>

          {/* Skeleton Info Card */}
          <View style={styles.elegantCard}>
            <View style={styles.cardHeader}>
              <View style={[styles.skeletonText, { width: 20, height: 20, backgroundColor: '#E2E8F0', borderRadius: 4 }]} />
              <View style={[styles.skeletonText, { width: '50%', height: 16, backgroundColor: '#E2E8F0', marginLeft: 10 }]} />
            </View>
            <View style={styles.separator} />
            <View style={styles.infoRowModern}>
              <View style={[styles.infoIconBox, { backgroundColor: '#E2E8F0' }]} />
              <View style={styles.infoContentModern}>
                <View style={[styles.skeletonText, { width: '70%', height: 10, backgroundColor: '#F1F5F9', marginBottom: 5 }]} />
                <View style={[styles.skeletonText, { width: '50%', height: 15, backgroundColor: '#E2E8F0' }]} />
              </View>
            </View>
            <View style={[styles.infoRowModern, { marginBottom: 0 }]}>
              <View style={[styles.infoIconBox, { backgroundColor: '#E2E8F0' }]} />
              <View style={styles.infoContentModern}>
                <View style={[styles.skeletonText, { width: '70%', height: 10, backgroundColor: '#F1F5F9', marginBottom: 5 }]} />
                <View style={[styles.skeletonText, { width: '90%', height: 14, backgroundColor: '#E2E8F0' }]} />
              </View>
            </View>
          </View>

          {/* Skeleton Timeline Card */}
          <View style={styles.elegantCard}>
            <View style={styles.cardHeader}>
              <View style={[styles.skeletonText, { width: 20, height: 20, backgroundColor: '#E2E8F0', borderRadius: 4 }]} />
              <View style={[styles.skeletonText, { width: '40%', height: 16, backgroundColor: '#E2E8F0', marginLeft: 10 }]} />
            </View>
            <View style={styles.timelineContainer}>
              <View style={styles.timePoint}>
                <View style={[styles.timeDot, { backgroundColor: '#E2E8F0' }]} />
                <View style={[styles.timeLine, { backgroundColor: '#F1F5F9' }]} />
              </View>
              <View style={styles.timeData}>
                <View style={[styles.skeletonText, { width: '70%', height: 10, backgroundColor: '#F1F5F9', marginBottom: 5 }]} />
                <View style={[styles.skeletonText, { width: '60%', height: 16, backgroundColor: '#E2E8F0' }]} />
              </View>
            </View>
            <View style={[styles.timelineContainer, { marginTop: -5 }]}>
              <View style={styles.timePoint}>
                <View style={[styles.timeDot, { backgroundColor: '#E2E8F0' }]} />
              </View>
              <View style={styles.timeData}>
                <View style={[styles.skeletonText, { width: '70%', height: 10, backgroundColor: '#F1F5F9', marginBottom: 5 }]} />
                <View style={[styles.skeletonText, { width: '60%', height: 16, backgroundColor: '#E2E8F0' }]} />
              </View>
            </View>
            <View style={[styles.skeletonText, { width: '80%', height: 36, backgroundColor: '#F1F5F9', borderRadius: 12, marginTop: 10, alignSelf: 'center' }]} />
          </View>

          {/* Skeleton Section Headers */}
          <View style={styles.sectionHeaderModern}>
            <View style={[styles.skeletonText, { width: '40%', height: 17, backgroundColor: '#E2E8F0' }]} />
            <View style={[styles.skeletonText, { width: 24, height: 20, backgroundColor: '#E2E8F0', borderRadius: 10, marginLeft: 10 }]} />
          </View>

          {/* Skeleton Cards */}
          {[1, 2].map((item) => (
            <View key={item} style={styles.modernPersonnelCard}>
              <View style={[styles.avatarGradient, { backgroundColor: '#E2E8F0' }]} />
              <View style={styles.personnelInfoModern}>
                <View style={[styles.skeletonText, { width: '70%', height: 15, backgroundColor: '#E2E8F0', marginBottom: 6 }]} />
                <View style={[styles.skeletonText, { width: '50%', height: 12, backgroundColor: '#F1F5F9' }]} />
              </View>
              <View style={[styles.skeletonText, { width: 18, height: 18, backgroundColor: '#E2E8F0', marginLeft: 10 }]} />
            </View>
          ))}
        </ScrollView>
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

      <ScrollView 
        showsVerticalScrollIndicator={false} 
        contentContainerStyle={styles.scrollContent}
        bounces={false}
      >
        {/* Premium Header Section */}
        <View style={styles.premiumHeader}>
          <View style={styles.headerTopRow}>
            <View style={styles.titleWrapper}>
              <Text style={styles.kegiatanTitle} numberOfLines={2}>{kegiatan.nama_kegiatan}</Text>
              <View style={styles.sptContainer}>
                <Ionicons name="documents-outline" size={14} color="#B2DFDB" />
                <Text style={styles.sptText}>No. SPT: {kegiatan.nomor_spt}</Text>
              </View>
            </View>
            <View style={[styles.statusTag, { backgroundColor: status.color + '20' }]}>
              <View style={[styles.statusDot, { backgroundColor: status.color }]} />
              <Text style={[styles.statusTagText, { color: status.color }]}>{status.label}</Text>
            </View>
          </View>
        </View>

        {/* Info Utama Card */}
        <View style={styles.elegantCard}>
          <View style={styles.cardHeader}>
            <MaterialCommunityIcons name="briefcase-check-outline" size={20} color="#004643" />
            <Text style={styles.cardTitle}>Informasi Fundamental</Text>
          </View>

          <View style={styles.separator} />

          <View style={styles.infoRowModern}>
            <View style={styles.infoIconBox}>
              <Ionicons name={kegiatan.jenis_dinas === 'lokal' ? "pin" : "airplane"} size={16} color="#00695C" />
            </View>
            <View style={styles.infoContentModern}>
              <Text style={styles.labelModern}>KATEGORI PERJALANAN</Text>
              <Text style={styles.valueModern}>{getJenisDinasLabel(kegiatan.jenis_dinas)}</Text>
            </View>
          </View>

          {kegiatan.deskripsi && (
            <View style={[styles.infoRowModern, { marginBottom: 0 }]}>
              <View style={styles.infoIconBox}>
                <Ionicons name="reader-outline" size={16} color="#00695C" />
              </View>
              <View style={styles.infoContentModern}>
                <Text style={styles.labelModern}>DESKRIPSI OBYEKTIF</Text>
                <Text style={styles.descriptionText}>{kegiatan.deskripsi}</Text>
              </View>
            </View>
          )}
        </View>

        {/* Waktu & Jadwal Card */}
        <View style={styles.elegantCard}>
          <View style={styles.cardHeader}>
            <Ionicons name="time-outline" size={20} color="#004643" />
            <Text style={styles.cardTitle}>Waktu & Linimasa</Text>
          </View>
          
          <View style={styles.timelineContainer}>
            <View style={styles.timePoint}>
              <View style={styles.timeDot} />
              <View style={styles.timeLine} />
            </View>
            <View style={styles.timeData}>
              <Text style={styles.labelModern}>MULAI TUGAS</Text>
              <Text style={styles.dateValueModern}>{formatDate(kegiatan.tanggal_mulai)}</Text>
            </View>
          </View>

          <View style={[styles.timelineContainer, { marginTop: -5 }]}>
            <View style={styles.timePoint}>
              <View style={[styles.timeDot, { backgroundColor: '#E74C3C' }]} />
            </View>
            <View style={styles.timeData}>
              <Text style={styles.labelModern}>ESTIMASI SELESAI</Text>
              <Text style={styles.dateValueModern}>{formatDate(kegiatan.tanggal_selesai)}</Text>
            </View>
          </View>

          <View style={styles.jamKerjaBadgeModern}>
            <MaterialCommunityIcons name="clock-fast" size={15} color="#004643" />
            <Text style={styles.jamKerjaTextModern}>
              {kegiatan.jam_mulai && kegiatan.jam_selesai ? `Pukul ${kegiatan.jam_mulai} s/d ${kegiatan.jam_selesai}` : 'Sesuai Jam Operasional Kantor'}
            </Text>
          </View>
        </View>

        {/* Lokasi Dinas */}
        {kegiatan.lokasi && kegiatan.lokasi.length > 0 && (
          <>
            <View style={styles.sectionHeaderModern}>
              <Text style={styles.sectionTitleModern}>Lokasi Dinas</Text>
              <View style={styles.badgeCountModern}><Text style={styles.badgeTextModern}>{kegiatan.lokasi.length}</Text></View>
            </View>
            
            {kegiatan.lokasi.map((lokasi: any, index: number) => (
              <View key={index} style={styles.lokasiCardModern}>
                <View style={styles.lokasiHeaderModern}>
                  <View style={styles.lokasiIconBox}>
                    <Ionicons name="location" size={20} color="#004643" />
                  </View>
                  <Text style={styles.lokasiNameModern}>{lokasi.nama_lokasi}</Text>
                </View>
                
                {lokasi.alamat && (
                  <Text style={styles.lokasiAddressModern}>{lokasi.alamat}</Text>
                )}

                <TouchableOpacity
                  style={styles.lokasiBtnModern}
                  onPress={() => openMap(lokasi)}
                >
                  <Ionicons name="navigate" size={16} color="#004643" />
                  <Text style={styles.lokasiBtnTextModern}>Buka Peta</Text>
                </TouchableOpacity>
              </View>
            ))}
          </>
        )}

        {/* Rekan Dinas */}
        {kegiatan.pegawai && kegiatan.pegawai.length > 0 && (
          <>
            <View style={styles.sectionHeaderModern}>
              <Text style={styles.sectionTitleModern}>Rekan Dinas</Text>
              <View style={styles.badgeCountModern}><Text style={styles.badgeTextModern}>{kegiatan.pegawai.length}</Text></View>
            </View>
            
            {kegiatan.pegawai.map((pegawai: any, index: number) => (
              <View key={index} style={styles.modernPersonnelCard}>
                <View style={styles.avatarGradient}>
                  <Text style={styles.avatarLetter}>
                    {pegawai.nama_lengkap?.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View style={styles.personnelInfoModern}>
                  <Text style={styles.personnelNameModern}>{pegawai.nama_lengkap}</Text>
                  <Text style={styles.personnelNipModern}>NIP: {pegawai.nip}</Text>
                </View>
                <TouchableOpacity style={styles.personnelAction}>
                  <Ionicons name="chatbubble-ellipses-outline" size={18} color="#00695C" />
                </TouchableOpacity>
              </View>
            ))}
          </>
        )}

        {/* Dokumen SPT */}
        {kegiatan.dokumen_spt && (
          <TouchableOpacity 
            style={styles.premiumDocumentCard}
            onPress={viewDokumen}
          >
            <View style={styles.docIconBox}><Ionicons name="cloud-download-outline" size={22} color="#FFF" /></View>
            <View style={styles.docInfo}>
              <Text style={styles.docTitleModern}>Lampiran Resmi SPT</Text>
              <Text style={styles.docSubModern} numberOfLines={1}>{kegiatan.dokumen_spt}</Text>
            </View>
            <Ionicons name="chevron-forward-circle-outline" size={22} color="#004643" />
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F7F7' },
  content: { flex: 1 },
  scrollContent: { paddingBottom: 40 },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: { fontSize: 14, color: '#666', fontStyle: 'italic' },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  emptyText: { fontSize: 14, color: '#666' },

  // Premium Header Style
  premiumHeader: {
    backgroundColor: '#004643',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 30,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    marginBottom: 15,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.15, shadowRadius: 12 },
      android: { elevation: 8 },
    }),
  },
  headerTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  titleWrapper: { flex: 1, marginRight: 15 },
  kegiatanTitle: { fontSize: 22, fontWeight: '800', color: '#FFF', letterSpacing: -0.5, lineHeight: 28 },
  sptContainer: { flexDirection: 'row', alignItems: 'center', marginTop: 10 },
  sptText: { fontSize: 13, color: '#B2DFDB', fontWeight: '500', marginLeft: 6 },
  
  statusTag: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  statusDot: { width: 7, height: 7, borderRadius: 4, marginRight: 7 },
  statusTagText: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },

  // Elegant Card General Styles
  elegantCard: {
    backgroundColor: '#FFF',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 20,
    padding: 20,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 8 },
      android: { elevation: 3 },
    }),
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#1A1A1A', marginLeft: 10 },
  separator: { height: 1, backgroundColor: '#F0F3F3', marginBottom: 18 },
  
  // Modern Info Rows
  infoRowModern: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 18 },
  infoIconBox: { 
    width: 34, height: 34, backgroundColor: '#F0F7F7',
    borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 15, marginTop: 2 
  },
  infoContentModern: { flex: 1 },
  labelModern: { fontSize: 10, fontWeight: '800', color: '#95A5A6', letterSpacing: 1.1, marginBottom: 5 },
  valueModern: { fontSize: 15, fontWeight: '600', color: '#2C3E50', lineHeight: 20 },
  
  descriptionText: { fontSize: 14, color: '#576574', lineHeight: 22, fontWeight: '400' },

  // Timeline Styles
  timelineContainer: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10 },
  timePoint: { alignItems: 'center', marginRight: 15, width: 14, marginTop: 4 },
  timeDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#00695C', borderWidth: 2, borderColor: '#FFF', elevation: 2 },
  timeLine: { width: 2, height: 40, backgroundColor: '#E0E6E6', marginTop: 2 },
  timeData: { flex: 1 },
  dateValueModern: { fontSize: 16, fontWeight: '700', color: '#333' },

  jamKerjaBadgeModern: { 
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#F0F7F7', borderRadius: 12, padding: 12, marginTop: 10
  },
  jamKerjaTextModern: { fontSize: 12, color: '#004643', fontWeight: '600', marginLeft: 8, fontStyle: 'italic' },

  // Document Card Style
  premiumDocumentCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF',
    marginHorizontal: 16, marginBottom: 20, padding: 18, borderRadius: 20,
    borderWidth: 1, borderColor: '#F0F3F3',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.02, shadowRadius: 6 },
      android: { elevation: 2 },
    }),
  },
  docIconBox: { 
    width: 48, height: 48, backgroundColor: '#00695C',
    borderRadius: 14, justifyContent: 'center', alignItems: 'center' 
  },
  docInfo: { flex: 1, marginLeft: 18, marginRight: 10 },
  docTitleModern: { fontSize: 15, fontWeight: '700', color: '#1A1A1A' },
  docSubModern: { fontSize: 12, color: '#95A5A6', marginTop: 3 },

  // Personnel List Style
  sectionHeaderModern: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 20, marginBottom: 15, marginTop: 5 },
  sectionTitleModern: { fontSize: 17, fontWeight: '800', color: '#1A1A1A', letterSpacing: -0.3 },
  badgeCountModern: { backgroundColor: '#004643', borderRadius: 10, paddingHorizontal: 9, paddingVertical: 3, marginLeft: 10 },
  badgeTextModern: { color: '#FFF', fontSize: 11, fontWeight: '800' },
  
  modernPersonnelCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF',
    marginHorizontal: 16, marginBottom: 12, padding: 16, borderRadius: 18,
    elevation: 2, shadowColor: '#000', shadowOpacity: 0.02, shadowRadius: 5, shadowOffset: {width:0, height:1}
  },
  avatarGradient: { 
    width: 52, height: 52, borderRadius: 26, backgroundColor: '#004643',
    justifyContent: 'center', alignItems: 'center', elevation: 2
  },
  avatarLetter: { color: '#FFF', fontSize: 22, fontWeight: '800' },
  personnelInfoModern: { flex: 1, marginLeft: 18 },
  personnelNameModern: { fontSize: 15, fontWeight: '700', color: '#1A1A1A' },
  personnelNipModern: { fontSize: 12, color: '#7F8C8D', marginTop: 3, marginBottom: 6 },
  jabatanBadgeModern: { 
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#F0F7F7', alignSelf: 'flex-start', paddingHorizontal: 9, paddingVertical: 4, borderRadius: 8 
  },
  jabatanTextModern: { fontSize: 10, color: '#004643', fontWeight: '700', textTransform: 'uppercase' },
  personnelAction: { padding: 5, marginLeft: 10 },

  // Skeleton Styles
  skeletonText: {
    backgroundColor: '#E0E0E0',
    borderRadius: 4,
  },

  // Location Card Style
  lokasiCardModern: {
    backgroundColor: '#FFF',
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 18,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.02,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 1 }
  },
  lokasiHeaderModern: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  lokasiIconBox: {
    width: 40, height: 40, backgroundColor: '#F0F7F7',
    borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 12
  },
  lokasiNameModern: { fontSize: 15, fontWeight: '700', color: '#1A1A1A', flex: 1 },
  lokasiAddressModern: { fontSize: 13, color: '#64748B', marginBottom: 12, lineHeight: 18, marginLeft: 52 },
  lokasiBtnModern: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#F0F7F7', paddingVertical: 12, borderRadius: 12, gap: 8, marginTop: 8
  },
  lokasiBtnTextModern: { fontSize: 13, fontWeight: '600', color: '#004643' },

  // Legacy styles (keeping for compatibility)
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

