import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Image } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { API_CONFIG, getApiUrl } from '../../../constants/config';
import { AppHeader } from '../../../components';

interface DetailDinas {
  id_pengajuan: number;
  nama_lengkap: string;
  nip: string;
  foto_profil?: string;
  jabatan: string;
  jenis_pengajuan: string;
  tanggal_mulai: string;
  tanggal_selesai: string;
  lokasi_dinas: string;
  alasan_text: string;
  dokumen_foto?: string;
  status: string;
  tanggal_pengajuan: string;
  tanggal_approval?: string;
  catatan_approval?: string;
}

export default function DetailDinasScreen() {
  const router = useRouter();
  const { id, filter, start_date, end_date } = useLocalSearchParams();
  const [data, setData] = useState<DetailDinas | null>(null);
  const [loading, setLoading] = useState(true);
  const [periodInfo, setPeriodInfo] = useState('');

  useEffect(() => {
    fetchDetail();
    generatePeriodInfo();
  }, [id]);

  const fetchDetail = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${getApiUrl(API_CONFIG.ENDPOINTS.DETAIL_LAPORAN)}?type=dinas&id=${id}`);
      const result = await response.json();
      
      if (result.success && result.data) {
        setData(result.data);
      } else {
        console.error('Failed to fetch detail:', result.message);
      }
    } catch (error) {
      console.error('Error fetching detail:', error);
    } finally {
      setLoading(false);
    }
  };

  const generatePeriodInfo = () => {
    const today = new Date();
    const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
    
    switch(filter) {
      case 'hari_ini':
        setPeriodInfo(`${days[today.getDay()]}, ${today.getDate()} ${months[today.getMonth()]} ${today.getFullYear()}`);
        break;
      case 'minggu_ini':
        const startOfWeek = new Date(today);
        startOfWeek.setDate(today.getDate() - today.getDay());
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);
        setPeriodInfo(`Minggu, ${startOfWeek.getDate()}-${endOfWeek.getDate()} ${months[today.getMonth()]} ${today.getFullYear()}`);
        break;
      case 'bulan_ini':
        setPeriodInfo(`${months[today.getMonth()]} ${today.getFullYear()}`);
        break;
      case 'pilih_tanggal':
        if (start_date && end_date) {
          const startDate = new Date(start_date as string);
          const endDate = new Date(end_date as string);
          setPeriodInfo(`${startDate.getDate()} ${months[startDate.getMonth()].slice(0,3)} - ${endDate.getDate()} ${months[endDate.getMonth()].slice(0,3)} ${endDate.getFullYear()}`);
        }
        break;
      default:
        setPeriodInfo('Periode tidak diketahui');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return '#4CAF50';
      case 'pending': return '#FF9800';
      case 'rejected': return '#F44336';
      default: return '#666';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'approved': return 'Disetujui';
      case 'pending': return 'Menunggu';
      case 'rejected': return 'Ditolak';
      default: return status;
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <StatusBar style="light" translucent={true} backgroundColor="transparent" />
        
        <AppHeader 
          title="Detail Perjalanan Dinas"
          showBack={true}
          fallbackRoute="/laporan/laporan-detail-dinas"
        />
        
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#004643" />
        </View>
      </View>
    );
  }

  if (!data) {
    return (
      <View style={styles.container}>
        <StatusBar style="light" translucent={true} backgroundColor="transparent" />
        
        <AppHeader 
          title="Detail Perjalanan Dinas"
          showBack={true}
          fallbackRoute="/laporan/laporan-detail-dinas"
        />
        
        <View style={styles.errorContainer}>
          <Text>Data tidak ditemukan</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style="light" translucent={true} backgroundColor="transparent" />
      
      <AppHeader 
        title="Detail Perjalanan Dinas"
        showBack={true}
        fallbackRoute="/laporan/laporan-detail-dinas"
      />

      <ScrollView style={styles.content}>
        {/* Period Info */}
        <View style={styles.periodInfo}>
          <View style={styles.periodHeader}>
            <Ionicons name="calendar-outline" size={20} color="#004643" />
            <Text style={styles.periodTitle}>Periode Laporan</Text>
          </View>
          <Text style={styles.periodText}>
            {periodInfo}
          </Text>
        </View>

        {/* Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            {data.foto_profil ? (
              <Image source={{ uri: data.foto_profil }} style={styles.avatarImage} />
            ) : (
              <Text style={styles.avatarText}>{data.nama_lengkap.charAt(0).toUpperCase()}</Text>
            )}
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{data.nama_lengkap}</Text>
            <Text style={styles.profileNip}>NIP: {data.nip}</Text>
            <Text style={styles.profileJob}>{data.jabatan}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(data.status) + '20' }]}>
            <Text style={[styles.statusText, { color: getStatusColor(data.status) }]}>
              {getStatusLabel(data.status)}
            </Text>
          </View>
        </View>

        {/* Detail Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Informasi Dinas</Text>
          
          <View style={styles.infoRow}>
            <Ionicons name="briefcase-outline" size={20} color="#666" />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Jenis Dinas</Text>
              <Text style={styles.infoValue}>{data.jenis_pengajuan.replace('_', ' ').toUpperCase()}</Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <Ionicons name="calendar-outline" size={20} color="#666" />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Periode</Text>
              <Text style={styles.infoValue}>{data.tanggal_mulai} s/d {data.tanggal_selesai}</Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <Ionicons name="location-outline" size={20} color="#666" />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Lokasi Dinas</Text>
              <Text style={styles.infoValue}>{data.lokasi_dinas}</Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <Ionicons name="document-text-outline" size={20} color="#666" />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Keterangan</Text>
              <Text style={styles.infoValue}>{data.alasan_text}</Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <Ionicons name="time-outline" size={20} color="#666" />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Tanggal Pengajuan</Text>
              <Text style={styles.infoValue}>{data.tanggal_pengajuan}</Text>
            </View>
          </View>

          {data.tanggal_approval && (
            <View style={styles.infoRow}>
              <Ionicons name="checkmark-circle-outline" size={20} color="#666" />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Tanggal Approval</Text>
                <Text style={styles.infoValue}>{data.tanggal_approval}</Text>
              </View>
            </View>
          )}

          {data.catatan_approval && (
            <View style={styles.infoRow}>
              <Ionicons name="chatbox-outline" size={20} color="#666" />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Catatan Approval</Text>
                <Text style={styles.infoValue}>{data.catatan_approval}</Text>
              </View>
            </View>
          )}
        </View>

        {data.dokumen_foto && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Dokumen Pendukung</Text>
            <Image source={{ uri: data.dokumen_foto }} style={styles.dokumenImage} />
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFB' },
  content: { flex: 1, padding: 20 },
  periodInfo: {
    backgroundColor: '#F0F8F7',
    marginBottom: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0F2F1',
  },
  periodHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  periodTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#004643',
    marginLeft: 8,
  },
  periodText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#004643',
    textAlign: 'center',
  },
  profileCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 16, borderRadius: 12, marginBottom: 20, elevation: 2 },
  avatar: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#E3F2FD', justifyContent: 'center', alignItems: 'center', marginRight: 12, overflow: 'hidden' },
  avatarImage: { width: 60, height: 60, borderRadius: 30 },
  avatarText: { color: '#1976D2', fontWeight: 'bold', fontSize: 24 },
  profileInfo: { flex: 1 },
  profileName: { fontSize: 16, fontWeight: 'bold', color: '#333', marginBottom: 4 },
  profileNip: { fontSize: 12, color: '#666', marginBottom: 2 },
  profileJob: { fontSize: 12, color: '#888' },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  statusText: { fontSize: 12, fontWeight: 'bold' },
  section: { backgroundColor: '#fff', padding: 16, borderRadius: 12, marginBottom: 16, elevation: 2 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#333', marginBottom: 16 },
  infoRow: { flexDirection: 'row', marginBottom: 16 },
  infoContent: { flex: 1, marginLeft: 12 },
  infoLabel: { fontSize: 12, color: '#666', marginBottom: 4 },
  infoValue: { fontSize: 14, color: '#333', fontWeight: '500' },
  dokumenImage: { width: '100%', height: 200, borderRadius: 8, resizeMode: 'cover' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});
