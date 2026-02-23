/* ========================================
   KOTAK MASUK ADMIN
   • Notifikasi validasi absen dinas
   • Info absen kantor hari ini
======================================== */

import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, StatusBar as RNStatusBar, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { AppHeader } from '../../components';
import { KelolaDinasAPI, getApiUrl, API_CONFIG } from '../../constants/config';

interface InboxItem {
  id: string;
  type: 'validasi_dinas' | 'info_absen';
  priority: 'high' | 'low';
  pegawai: {
    id: number;
    nama: string;
    nip: string;
  };
  dinas?: {
    id: number;
    nama: string;
  };
  absen: {
    tanggal: string;
    jam: string;
    lokasi: string;
  };
  created_at: string;
}

export default function InboxAdmin() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [inboxData, setInboxData] = useState<InboxItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  useFocusEffect(
    useCallback(() => {
      fetchInboxData();
    }, [])
  );

  const fetchInboxData = async () => {
    try {
      setLoading(true);
      const items: InboxItem[] = [];

      // 1. Ambil absen dinas yang perlu validasi (dari database)
      const validasiResult = await KelolaDinasAPI.getValidasiAbsen();
      
      if (validasiResult.success && validasiResult.data) {
        validasiResult.data.forEach((item: any) => {
          const tanggalOnly = item.tanggal_absen.split('T')[0];
          const createdAt = `${tanggalOnly}T${item.jam_masuk}`;
          
          items.push({
            id: `dinas-${item.id}`,
            type: 'validasi_dinas',
            priority: 'high',
            pegawai: {
              id: item.id_user,
              nama: item.nama_lengkap,
              nip: item.nip || '-'
            },
            dinas: {
              id: item.id_dinas,
              nama: item.nama_kegiatan
            },
            absen: {
              tanggal: tanggalOnly,
              jam: item.jam_masuk,
              lokasi: item.alamat_lengkap || 'Lokasi Dinas',
            },
            created_at: createdAt
          });
        });
      }

      // 2. Ambil semua absen kantor (history, bukan hanya hari ini)
      try {
        const presensiResponse = await fetch(
          getApiUrl(`/pegawai/presensi/api/all-presensi`),
          {
            headers: {
              'Content-Type': 'application/json',
            },
          }
        );
        const presensiData = await presensiResponse.json();
        
        if (presensiData.success && presensiData.data) {
          presensiData.data.forEach((item: any) => {
            if (item.jam_masuk) {
              const createdAt = `${item.tanggal}T${item.jam_masuk}`;
              
              items.push({
                id: `kantor-${item.id_presensi}`,
                type: 'info_absen',
                priority: 'low',
                pegawai: {
                  id: item.id_user,
                  nama: item.nama_lengkap,
                  nip: item.nip || '-'
                },
                absen: {
                  tanggal: item.tanggal,
                  jam: item.jam_masuk,
                  lokasi: 'Kantor',
                },
                created_at: createdAt
              });
            }
          });
        }
      } catch (error) {
        console.error('Error fetching presensi kantor:', error);
      }

      // Sort berdasarkan prioritas dan waktu
      items.sort((a, b) => {
        if (a.priority !== b.priority) {
          return a.priority === 'high' ? -1 : 1;
        }
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });

      setInboxData(items);
      
      console.log('📊 Total inbox items:', items.length);
      console.log('📊 Validasi dinas:', items.filter(i => i.type === 'validasi_dinas').length);
      console.log('📊 Absen kantor:', items.filter(i => i.type === 'info_absen').length);
    } catch (error) {
      console.error('Error fetching inbox:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchInboxData();
    setRefreshing(false);
  };

  const handleItemPress = (item: InboxItem) => {
    if (item.type === 'validasi_dinas') {
      // Redirect ke Pusat Validasi Absen Dinas
      router.push({
        pathname: '/pusat-validasi/absen-dinas',
        params: {
          dinasId: item.dinas?.id,
          tanggal: item.absen.tanggal,
          highlightPegawai: item.pegawai.id
        }
      } as any);
    } else {
      // Redirect ke Laporan Absen (akan dibuat nanti)
      // Untuk sekarang, tampilkan alert
      alert(`Lihat detail absen ${item.pegawai.nama}\nJam: ${item.absen.jam}\nLokasi: ${item.absen.lokasi}`);
    }
  };

  const getTimeAgo = (dateString: string) => {
    if (!dateString) return 'Baru saja';
    
    const date = new Date(dateString);
    
    // Check if date is valid
    if (isNaN(date.getTime())) {
      return 'Baru saja';
    }
    
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Baru saja';
    if (diffMins < 60) return `${diffMins} menit yang lalu`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} jam yang lalu`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return 'Kemarin';
    if (diffDays < 7) return `${diffDays} hari yang lalu`;
    const diffWeeks = Math.floor(diffDays / 7);
    if (diffWeeks < 4) return `${diffWeeks} minggu yang lalu`;
    const diffMonths = Math.floor(diffDays / 30);
    return `${diffMonths} bulan yang lalu`;
  };

  const renderInboxItem = ({ item }: { item: InboxItem }) => {
    const isValidasi = item.type === 'validasi_dinas';

    return (
      <TouchableOpacity
        style={styles.inboxCard}
        onPress={() => handleItemPress(item)}
        activeOpacity={0.7}
      >
        {/* Icon */}
        <View style={[
          styles.iconCircle,
          isValidasi ? styles.iconValidasi : styles.iconInfo
        ]}>
          <Ionicons 
            name={isValidasi ? 'checkmark-done' : 'checkmark-circle'} 
            size={20} 
            color="#fff" 
          />
        </View>

        {/* Content */}
        <View style={styles.content}>
          <Text style={styles.title}>
            {isValidasi ? 'Validasi Absen Dinas' : 'Absen Masuk'}
          </Text>
          <Text style={styles.name}>{item.pegawai.nama}</Text>
          <Text style={styles.time}>{getTimeAgo(item.created_at)}</Text>
        </View>

        {/* Arrow */}
        <Ionicons name="chevron-forward" size={20} color="#ccc" />
      </TouchableOpacity>
    );
  };

  const validasiCount = inboxData.filter(item => item.type === 'validasi_dinas').length;

  const filteredData = inboxData.filter(item => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      item.pegawai.nama.toLowerCase().includes(query) ||
      item.pegawai.nip.toLowerCase().includes(query) ||
      (item.dinas?.nama || '').toLowerCase().includes(query)
    );
  });

  return (
    <View style={styles.container}>
      <RNStatusBar 
        barStyle="light-content"
        backgroundColor="transparent"
        translucent={true}
      />
      
      <AppHeader 
        title={`Kotak Masuk ${validasiCount > 0 ? `(${validasiCount})` : ''}`}
        showBack={false}
      />

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={20} color="#9CA3AF" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Cari nama pegawai"
            placeholderTextColor="#9CA3AF"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
        <TouchableOpacity style={styles.filterButton}>
          <Ionicons name="options" size={20} color="#004643" />
        </TouchableOpacity>
      </View>
      
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#004643" />
          <Text style={styles.loadingText}>Memuat notifikasi...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredData}
          keyExtractor={(item) => item.id}
          renderItem={renderInboxItem}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListEmptyComponent={() => (
            <View style={styles.emptyContainer}>
              <Ionicons name="mail-open-outline" size={60} color="#ccc" />
              <Text style={styles.emptyText}>Tidak ada notifikasi</Text>
              <Text style={styles.emptySubtext}>Semua absen sudah divalidasi</Text>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    gap: 8,
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 40,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#1F2937',
  },
  filterButton: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
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
    paddingBottom: 100,
  },
  inboxCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  iconValidasi: {
    backgroundColor: '#EF4444',
  },
  iconInfo: {
    backgroundColor: '#3B82F6',
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 2,
  },
  name: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 2,
  },
  time: {
    fontSize: 11,
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
    fontSize: 16,
    fontWeight: '600',
    color: '#999',
  },
  emptySubtext: {
    marginTop: 4,
    fontSize: 14,
    color: '#ccc',
  },
});
