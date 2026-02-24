/* ========================================
   KOTAK MASUK ADMIN
   • Item yang memerlukan validasi/approval
   • Absen Dinas (menunggu validasi)
   • Pengajuan (menunggu persetujuan)
======================================== */

import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { AppHeader } from '../../components';
import { PusatValidasiAPI } from '../../constants/config';

interface InboxItem {
  id: string;
  type: 'absen_dinas' | 'pengajuan';
  title: string;
  nama_pegawai: string;
  nip: string;
  waktu: string;
  tanggal: string;
  data: any;
}

export default function InboxAdmin() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [inboxData, setInboxData] = useState<InboxItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);

  useFocusEffect(
    useCallback(() => {
      fetchInboxData();
    }, [])
  );

  const fetchInboxData = async () => {
    try {
      setLoading(true);
      const items: InboxItem[] = [];

      // 1. Fetch Absen Dinas yang menunggu validasi
      const absenResult = await PusatValidasiAPI.getAbsenDinas();
      if (absenResult.success && absenResult.data) {
        absenResult.data.forEach((absen: any) => {
          items.push({
            id: `absen-${absen.id}`,
            type: 'absen_dinas',
            title: `Absen Dinas - ${absen.nama_kegiatan || 'Dinas'}`,
            nama_pegawai: absen.nama_lengkap || '-',
            nip: absen.nip || '-',
            waktu: absen.jam_masuk || '-',
            tanggal: absen.tanggal_absen || '-',
            data: absen
          });
        });
      }

      // 2. Fetch Pengajuan yang menunggu persetujuan
      const pengajuanResult = await PusatValidasiAPI.getPengajuan();
      if (pengajuanResult.success && pengajuanResult.data) {
        pengajuanResult.data.forEach((pengajuan: any) => {
          const jenisPengajuan = formatJenisPengajuan(pengajuan.jenis_pengajuan);
          items.push({
            id: `pengajuan-${pengajuan.id_pengajuan}`,
            type: 'pengajuan',
            title: `Pengajuan ${jenisPengajuan}`,
            nama_pegawai: pengajuan.nama_lengkap || '-',
            nip: pengajuan.nip || '-',
            waktu: formatWaktu(pengajuan.tanggal_pengajuan),
            tanggal: formatTanggal(pengajuan.tanggal_pengajuan),
            data: pengajuan
          });
        });
      }

      // Sort by waktu (terbaru di atas)
      items.sort((a, b) => {
        const dateA = new Date(a.data.tanggal_pengajuan || a.data.tanggal_absen);
        const dateB = new Date(b.data.tanggal_pengajuan || b.data.tanggal_absen);
        return dateB.getTime() - dateA.getTime();
      });

      setInboxData(items);
      setTotalCount(items.length);
    } catch (error) {
      console.error('Error fetching inbox:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatJenisPengajuan = (jenis: string) => {
    const jenisMap: { [key: string]: string } = {
      'cuti_sakit': 'Cuti Sakit',
      'cuti_tahunan': 'Cuti Tahunan',
      'izin_pribadi': 'Izin Pribadi',
      'pulang_cepat_terencana': 'Pulang Cepat',
      'pulang_cepat_mendadak': 'Pulang Cepat',
      'koreksi_presensi': 'Koreksi Presensi',
      'lembur_hari_kerja': 'Lembur Hari Kerja',
      'lembur_akhir_pekan': 'Lembur Akhir Pekan',
      'lembur_hari_libur': 'Lembur Hari Libur',
    };
    return jenisMap[jenis] || jenis;
  };

  const formatWaktu = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  };

  const formatTanggal = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchInboxData();
    setRefreshing(false);
  };

  const handleItemPress = (item: InboxItem) => {
    // Redirect ke Pusat Validasi dengan tab dan item yang sesuai
    if (item.type === 'absen_dinas') {
      // Untuk absen dinas, buka halaman detail absen dinas
      router.push({
        pathname: '/pusat-validasi/absen-dinas',
        params: {
          dinasId: item.data.id_dinas
        }
      } as any);
    } else {
      // Untuk pengajuan, buka pusat validasi tab pengajuan
      router.push({
        pathname: '/admin/pusat-validasi',
        params: {
          initialTab: 'pengajuan'
        }
      } as any);
    }
  };

  const renderInboxItem = ({ item }: { item: InboxItem }) => {
    const isAbsenDinas = item.type === 'absen_dinas';

    return (
      <TouchableOpacity
        style={styles.inboxCard}
        onPress={() => handleItemPress(item)}
        activeOpacity={0.7}
      >
        {/* Icon */}
        <View style={[
          styles.iconCircle,
          isAbsenDinas ? styles.iconAbsenDinas : styles.iconPengajuan
        ]}>
          <Ionicons 
            name={isAbsenDinas ? 'clipboard' : 'document-text'} 
            size={24} 
            color="#fff" 
          />
        </View>

        {/* Content */}
        <View style={styles.content}>
          <Text style={styles.title}>{item.title}</Text>
          <Text style={styles.subtitle}>{item.nama_pegawai} • {item.nip}</Text>
          <View style={styles.timeRow}>
            <Ionicons name="time-outline" size={14} color="#9CA3AF" />
            <Text style={styles.timeText}>{item.waktu} • {item.tanggal}</Text>
          </View>
        </View>

        {/* Arrow */}
        <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" translucent={true} backgroundColor="transparent" />
      
      <AppHeader 
        title={totalCount > 0 ? `Kotak Masuk (${totalCount})` : 'Kotak Masuk'}
        showBack={false}
      />
      
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#004643" />
          <Text style={styles.loadingText}>Memuat kotak masuk...</Text>
        </View>
      ) : (
        <FlatList
          data={inboxData}
          keyExtractor={(item) => item.id}
          renderItem={renderInboxItem}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl 
              refreshing={refreshing} 
              onRefresh={onRefresh}
              colors={['#004643']}
              tintColor="#004643"
            />
          }
          ListEmptyComponent={() => (
            <View style={styles.emptyContainer}>
              <Ionicons name="checkmark-done-circle-outline" size={80} color="#E0E0E0" />
              <Text style={styles.emptyText}>Tidak Ada Item</Text>
              <Text style={styles.emptySubtext}>
                Semua validasi dan pengajuan sudah ditindaklanjuti
              </Text>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#F8FAFC' 
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#666',
  },
  listContent: {
    padding: 16,
    paddingBottom: 100,
  },
  inboxCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  iconAbsenDinas: {
    backgroundColor: '#ffc400',
  },
  iconPengajuan: {
    backgroundColor: '#1282c3',
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 2,
  },

  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  timeText: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 18,
    fontWeight: '600',
    color: '#9CA3AF',
  },
  emptySubtext: {
    marginTop: 8,
    fontSize: 14,
    color: '#D1D5DB',
    textAlign: 'center',
    paddingHorizontal: 40,
  },
});
