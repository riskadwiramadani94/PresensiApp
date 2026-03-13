import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking, Dimensions, Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { AppHeader, CustomAlert } from '../../../../components';
import { useCustomAlert } from '../../../../hooks/useCustomAlert';
import { KelolaDinasAPI, PegawaiAkunAPI } from '../../../../constants/config';

const { width } = Dimensions.get('window');

// Interface DetailDinas dengan status
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
  radius: number;
  koordinat_lat?: number;
  koordinat_lng?: number;
  created_at?: string;
  dokumen_spt?: string;
  status?: string; // Tambahkan status dari database
  pegawai: Array<{
    nama: string;
    nip: string;
    jabatan: string;
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
  const alert = useCustomAlert();
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
            const pegawaiLengkap = dinasData.pegawai.map((pDinas: any) => {
              const pData = pegawaiResponse.data.find((p: any) => p.nama_lengkap === pDinas.nama);
              return {
                ...pDinas,
                nip: pData?.nip || '-',
                jabatan: pData?.jabatan || '-',
                id_user: pData?.id_user || pData?.id
              };
            });
            
            setDetailDinas({
              ...dinasData,
              jenisDinas: dinasData.jenisDinas || 'lokal',
              pegawai: pegawaiLengkap,
              lokasi_dinas: dinasData.lokasi_list || []
            });
          } else {
            setDetailDinas(dinasData);
          }
        } else {
          alert.showAlert({ type: 'error', message: 'Data dinas tidak ditemukan' });
          router.back();
        }
      }
    } catch (error) {
      alert.showAlert({ type: 'error', message: 'Gagal memuat detail dinas' });
    } finally {
      setLoading(false);
    }
  };

  const getDinasStatus = () => {
    if (!detailDinas) return { status: 'Unknown', color: '#7F8C8D' };
    
    // Cek status dari database terlebih dahulu
    if (detailDinas.status === 'dibatalkan') {
      return { status: 'Dibatalkan', color: '#E74C3C' }; // Merah untuk dibatalkan
    }
    if (detailDinas.status === 'selesai') {
      return { status: 'Selesai', color: '#34495E' }; // Navy untuk selesai
    }
    
    // Jika status aktif, hitung berdasarkan tanggal
    const today = new Date();
    const mulai = new Date(detailDinas.tanggal_mulai);
    const selesai = new Date(detailDinas.tanggal_selesai);
    today.setHours(0, 0, 0, 0);
    mulai.setHours(0, 0, 0, 0);
    selesai.setHours(23, 59, 59, 999);

    if (today < mulai) return { status: 'Mendatang', color: '#E67E22' }; // Orange modern
    if (today >= mulai && today <= selesai) return { status: 'Aktif', color: '#27AE60' }; // Green modern
    return { status: 'Selesai', color: '#34495E' }; // Navy modern
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('id-ID', {
      day: 'numeric', month: 'short', year: 'numeric'
    });
  };

  // Tampilan Loading yang lebih rapi
  if (loading) {
    return (
      <View style={styles.container}>
        <StatusBar style="light" translucent backgroundColor="transparent" />
        <AppHeader title="Detail Dinas" showBack={true} fallbackRoute="/menu-admin/kelola-dinas" />
        
        {/* ========================================
             SKELETON LOADING STATE - DETAIL DINAS
        ======================================== */}
        <ScrollView 
          showsVerticalScrollIndicator={false} 
          contentContainerStyle={styles.scrollContent}
          bounces={false}
          overScrollMode="never"
        >
          {/* Skeleton Header */}
          <View style={styles.premiumHeader}>
            <View style={styles.headerTopRow}>
              <View style={styles.titleWrapper}>
                <View style={styles.skeletonTitle} />
                <View style={styles.sptContainer}>
                  <View style={styles.skeletonSptIcon} />
                  <View style={styles.skeletonSptText} />
                </View>
              </View>
              <View style={styles.skeletonStatusTag} />
            </View>
          </View>

          {/* Skeleton Card 1 - Info Utama */}
          <View style={styles.elegantCard}>
            <View style={styles.cardHeader}>
              <View style={styles.skeletonCardIcon} />
              <View style={styles.skeletonCardTitle} />
            </View>
            <View style={styles.separator} />
            <View style={styles.infoRowModern}>
              <View style={styles.skeletonIconBox} />
              <View style={styles.infoContentModern}>
                <View style={styles.skeletonLabel} />
                <View style={styles.skeletonValue} />
              </View>
            </View>
            <View style={styles.infoRowModern}>
              <View style={styles.skeletonIconBox} />
              <View style={styles.infoContentModern}>
                <View style={styles.skeletonLabel} />
                <View style={styles.skeletonValue} />
              </View>
            </View>
            <View style={[styles.infoRowModern, { marginBottom: 0 }]}>
              <View style={styles.skeletonIconBox} />
              <View style={styles.infoContentModern}>
                <View style={styles.skeletonLabel} />
                <View style={styles.skeletonDescription} />
              </View>
            </View>
          </View>

          {/* Skeleton Card 2 - Waktu */}
          <View style={styles.elegantCard}>
            <View style={styles.cardHeader}>
              <View style={styles.skeletonCardIcon} />
              <View style={styles.skeletonCardTitle} />
            </View>
            <View style={styles.timelineContainer}>
              <View style={styles.timePoint}>
                <View style={styles.skeletonTimeDot} />
                <View style={styles.skeletonTimeLine} />
              </View>
              <View style={styles.timeData}>
                <View style={styles.skeletonLabel} />
                <View style={styles.skeletonDateValue} />
              </View>
            </View>
            <View style={[styles.timelineContainer, { marginTop: -5 }]}>
              <View style={styles.timePoint}>
                <View style={styles.skeletonTimeDot} />
              </View>
              <View style={styles.timeData}>
                <View style={styles.skeletonLabel} />
                <View style={styles.skeletonDateValue} />
              </View>
            </View>
            <View style={styles.skeletonJamKerjaBadge} />
          </View>

          {/* Skeleton Section Header */}
          <View style={styles.sectionHeaderModern}>
            <View style={styles.skeletonSectionTitle} />
            <View style={styles.skeletonBadgeCount} />
          </View>

          {/* Skeleton Personnel Cards */}
          {[1, 2, 3].map((item) => (
            <View key={item} style={styles.modernPersonnelCard}>
              <View style={styles.skeletonAvatarGradient} />
              <View style={styles.personnelInfoModern}>
                <View style={styles.skeletonPersonnelName} />
                <View style={styles.skeletonPersonnelNip} />
                <View style={styles.skeletonJabatanBadge} />
              </View>
              <View style={styles.skeletonPersonnelAction} />
            </View>
          ))}
        </ScrollView>
      </View>
    );
  }

  if (!detailDinas) return null;
  const status = getDinasStatus();

  return (
    <View style={styles.container}>
      <StatusBar style="light" translucent backgroundColor="transparent" />
      <AppHeader title="Detail Dinas" showBack={true} fallbackRoute="/menu-admin/kelola-dinas" />

      <ScrollView 
        showsVerticalScrollIndicator={false} 
        contentContainerStyle={styles.scrollContent}
        bounces={false}
        overScrollMode="never"
      >
        {/* ============================================================
            PREMIUM HEADER SECTION
           ============================================================ */}
        <View style={styles.premiumHeader}>
          <View style={styles.headerTopRow}>
            <View style={styles.titleWrapper}>
              <Text style={styles.kegiatanTitle} numberOfLines={2}>{detailDinas.namaKegiatan}</Text>
              <View style={styles.sptContainer}>
                <Ionicons name="documents-outline" size={14} color="#B2DFDB" />
                <Text style={styles.sptText}>No. SPT: {detailDinas.nomorSpt}</Text>
              </View>
            </View>
            <View style={[styles.statusTag, { backgroundColor: status.color + '20' }]}>
              <View style={[styles.statusDot, { backgroundColor: status.color }]} />
              <Text style={[styles.statusTagText, { color: status.color }]}>{status.status}</Text>
            </View>
          </View>
        </View>

        {/* ============================================================
            INFO UTAMA CARD (Clean & Professional)
           ============================================================ */}
        <View style={styles.elegantCard}>
          <View style={styles.cardHeader}>
            <MaterialCommunityIcons name="briefcase-check-outline" size={20} color="#004643" />
            <Text style={styles.cardTitle}>Informasi Fundamental</Text>
          </View>

          <View style={styles.separator} />

          <View style={styles.infoRowModern}>
            <View style={styles.infoIconBox}>
              <Ionicons name={detailDinas.jenisDinas === 'lokal' ? "pin" : "airplane"} size={16} color="#00695C" />
            </View>
            <View style={styles.infoContentModern}>
              <Text style={styles.labelModern}>KATEGORI PERJALANAN</Text>
              <Text style={styles.valueModern}>
                {detailDinas.jenisDinas === 'lokal' ? 'Dinas Lokal' : 'Dinas Luar Kota / Negeri'}
              </Text>
            </View>
          </View>

          <View style={styles.infoRowModern}>
            <View style={styles.infoIconBox}>
              <Ionicons name="map-outline" size={16} color="#00695C" />
            </View>
            <View style={styles.infoContentModern}>
              <Text style={styles.labelModern}>LOKASI TUJUAN UTAMA</Text>
              <Text style={styles.valueModern}>{detailDinas.lokasi}</Text>
              {detailDinas.lokasi_dinas?.map((loc, i) => (
                <View key={i} style={styles.subLocationItem}>
                  <Ionicons name="location-outline" size={12} color="#7F8C8D" />
                  <Text style={styles.subLocationText}>{loc.nama_lokasi}</Text>
                  <View style={styles.radiusBadge}><Text style={styles.radiusText}>{detailDinas.radius}m</Text></View>
                </View>
              ))}
            </View>
          </View>

          <View style={[styles.infoRowModern, { marginBottom: 0 }]}>
            <View style={styles.infoIconBox}>
              <Ionicons name="reader-outline" size={16} color="#00695C" />
            </View>
            <View style={styles.infoContentModern}>
              <Text style={styles.labelModern}>DESKRIPSI OBYEKTIF</Text>
              <Text style={styles.descriptionText}>{detailDinas.deskripsi || 'Tidak ada deskripsi teknis yang ditambahkan.'}</Text>
            </View>
          </View>
        </View>

        {/* ============================================================
            WAKTU & JADWAL CARD (Visual Timeline Look)
           ============================================================ */}
        <View style={styles.elegantCard}>
          <View style={styles.cardHeader}>
            <Ionicons name="time-outline" size={20} color="#004643" />
            <Text style={styles.cardTitle}>Waktu & Linimasa</Text>
          </View>
          <View style={styles.separator} />
          
          <View style={styles.timelineContainer}>
            <View style={styles.timePoint}>
              <View style={styles.timeDot} />
              <View style={styles.timeLine} />
            </View>
            <View style={styles.timeData}>
              <Text style={styles.labelModern}>MULAI TUGAS</Text>
              <Text style={styles.dateValueModern}>{formatDate(detailDinas.tanggal_mulai)}</Text>
            </View>
          </View>

          <View style={[styles.timelineContainer, { marginTop: -5 }]}>
            <View style={styles.timePoint}>
              <View style={[styles.timeDot, { backgroundColor: '#E74C3C' }]} />
            </View>
            <View style={styles.timeData}>
              <Text style={styles.labelModern}>ESTIMASI SELESAI</Text>
              <Text style={styles.dateValueModern}>{formatDate(detailDinas.tanggal_selesai)}</Text>
            </View>
          </View>

          <View style={styles.jamKerjaBadgeModern}>
            <MaterialCommunityIcons name="clock-fast" size={15} color="#004643" />
            <Text style={styles.jamKerjaTextModern}>
              {detailDinas.jam_mulai ? `Pukul ${detailDinas.jam_mulai} s/d ${detailDinas.jam_selesai}` : 'Sesuai Jam Operasional Kantor'}
            </Text>
          </View>
        </View>

        {/* ============================================================
            DOKUMEN SPT CARD (Actionable)
           ============================================================ */}
        {detailDinas.dokumen_spt && (
          <TouchableOpacity 
            style={styles.premiumDocumentCard}
            onPress={() => Linking.openURL(`http://192.168.1.7:3000/uploads/spt/${detailDinas.dokumen_spt}`)}
          >
            <View style={styles.docIconBox}><Ionicons name="cloud-download-outline" size={22} color="#FFF" /></View>
            <View style={styles.docInfo}>
              <Text style={styles.docTitleModern}>Lampiran Resmi SPT</Text>
              <Text style={styles.docSubModern} numberOfLines={1}>{detailDinas.dokumen_spt}</Text>
            </View>
            <Ionicons name="chevron-forward-circle-outline" size={22} color="#004643" />
          </TouchableOpacity>
        )}

        {/* ============================================================
            PERSONEL LIST SECTION (Clean Cards)
           ============================================================ */}
        <View style={styles.sectionHeaderModern}>
          <Text style={styles.sectionTitleModern}>Personel yang Ditugaskan</Text>
          <View style={styles.badgeCountModern}><Text style={styles.badgeTextModern}>{detailDinas.pegawai?.length}</Text></View>
        </View>

        {detailDinas.pegawai?.map((p, idx) => (
          <View key={idx} style={styles.modernPersonnelCard}>
            <View style={styles.avatarGradient}>
              <Text style={styles.avatarLetter}>{p.nama.charAt(0).toUpperCase()}</Text>
            </View>
            <View style={styles.personnelInfoModern}>
              <Text style={styles.personnelNameModern}>{p.nama}</Text>
              <Text style={styles.personnelNipModern}>NIP. {p.nip}</Text>
              <View style={styles.jabatanBadgeModern}>
                <Ionicons name="ribbon-outline" size={10} color="#004643" style={{marginRight: 4}} />
                <Text style={styles.jabatanTextModern}>{p.jabatan}</Text>
              </View>
            </View>
          </View>
        ))}
      </ScrollView>

      <CustomAlert
        visible={alert.visible}
        type={alert.config.type}
        title={alert.config.title}
        message={alert.config.message}
        onClose={alert.hideAlert}
        onConfirm={alert.handleConfirm}
        confirmText={alert.config.confirmText}
        cancelText={alert.config.cancelText}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#004643' }, // Same as header to prevent white gap
  scrollContent: { paddingBottom: 40, backgroundColor: '#F4F7F7', flexGrow: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 50 },
  loadingText: { color: '#666', fontSize: 14, fontStyle: 'italic' },
  
  // ==========================================
  // PREMIUM HEADER STYLE
  // ==========================================
  premiumHeader: {
    backgroundColor: '#004643', // Hijau tua primary
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

  // ==========================================
  // ELEGANT CARD GENERAL STYLES
  // ==========================================
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
    width: 34, height: 34, backgroundColor: '#F0F7F7', // Sangat pudar hijau primary
    borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 15, marginTop: 2 
  },
  infoContentModern: { flex: 1 },
  labelModern: { fontSize: 10, fontWeight: '800', color: '#95A5A6', letterSpacing: 1.1, marginBottom: 5 },
  valueModern: { fontSize: 15, fontWeight: '600', color: '#2C3E50', lineHeight: 20 },
  
  descriptionText: { fontSize: 14, color: '#576574', lineHeight: 22, fontWeight: '400' },

  // Sub-location styles
  subLocationItem: { flexDirection: 'row', alignItems: 'center', marginTop: 7, backgroundColor: '#F8FAFA', padding: 6, borderRadius: 8 },
  subLocationText: { fontSize: 12, color: '#7F8C8D', marginLeft: 6, flex: 1 },
  radiusBadge: { backgroundColor: '#27AE6015', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, marginLeft: 5 },
  radiusText: { fontSize: 10, color: '#27AE60', fontWeight: '700' },

  // ==========================================
  // TIMELINE STYLES
  // ==========================================
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

  // ==========================================
  // DOCUMENT CARD STYLE
  // ==========================================
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
    width: 48, height: 48, backgroundColor: '#00695C', // Sedikit lebih terang dari header
    borderRadius: 14, justifyContent: 'center', alignItems: 'center' 
  },
  docInfo: { flex: 1, marginLeft: 18, marginRight: 10 },
  docTitleModern: { fontSize: 15, fontWeight: '700', color: '#1A1A1A' },
  docSubModern: { fontSize: 12, color: '#95A5A6', marginTop: 3 },

  // ==========================================
  // PERSONNEL LIST STYLE
  // ==========================================
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
    width: 52, height: 52, borderRadius: 26, backgroundColor: '#004643', // Warna solid berkelas
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
  skeletonTitle: { width: '80%', height: 22, backgroundColor: 'rgba(255,255,255,0.3)', borderRadius: 4, marginBottom: 10 },
  skeletonSptIcon: { width: 14, height: 14, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 2 },
  skeletonSptText: { width: '60%', height: 13, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 4, marginLeft: 6 },
  skeletonStatusTag: { width: 80, height: 28, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 20 },
  skeletonCardIcon: { width: 20, height: 20, backgroundColor: '#E2E8F0', borderRadius: 4 },
  skeletonCardTitle: { width: '50%', height: 16, backgroundColor: '#E2E8F0', borderRadius: 4, marginLeft: 10 },
  skeletonIconBox: { width: 34, height: 34, backgroundColor: '#E2E8F0', borderRadius: 12, marginRight: 15, marginTop: 2 },
  skeletonLabel: { width: '70%', height: 10, backgroundColor: '#F1F5F9', borderRadius: 4, marginBottom: 5 },
  skeletonValue: { width: '50%', height: 15, backgroundColor: '#E2E8F0', borderRadius: 4 },
  skeletonDescription: { width: '90%', height: 14, backgroundColor: '#E2E8F0', borderRadius: 4 },
  skeletonTimeDot: { width: 12, height: 12, backgroundColor: '#E2E8F0', borderRadius: 6 },
  skeletonTimeLine: { width: 2, height: 40, backgroundColor: '#F1F5F9', marginTop: 2 },
  skeletonDateValue: { width: '60%', height: 16, backgroundColor: '#E2E8F0', borderRadius: 4 },
  skeletonJamKerjaBadge: { width: '80%', height: 36, backgroundColor: '#F1F5F9', borderRadius: 12, marginTop: 10, alignSelf: 'center' },
  skeletonSectionTitle: { width: '40%', height: 17, backgroundColor: '#E2E8F0', borderRadius: 4 },
  skeletonBadgeCount: { width: 24, height: 20, backgroundColor: '#E2E8F0', borderRadius: 10, marginLeft: 10 },
  skeletonAvatarGradient: { width: 52, height: 52, backgroundColor: '#E2E8F0', borderRadius: 26 },
  skeletonPersonnelName: { width: '70%', height: 15, backgroundColor: '#E2E8F0', borderRadius: 4, marginBottom: 6 },
  skeletonPersonnelNip: { width: '50%', height: 12, backgroundColor: '#F1F5F9', borderRadius: 4, marginBottom: 6 },
  skeletonJabatanBadge: { width: '40%', height: 18, backgroundColor: '#F1F5F9', borderRadius: 8 },
  skeletonPersonnelAction: { width: 18, height: 18, backgroundColor: '#E2E8F0', borderRadius: 4, marginLeft: 10 },
});