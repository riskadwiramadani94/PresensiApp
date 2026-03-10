import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, TextInput } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppHeader } from '../../../components';
import { getApiUrl } from '../../../constants/config';

type StatusType = 'semua' | 'akan_datang' | 'berlangsung' | 'selesai';



export default function LemburScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<StatusType>('semua');
  const [lemburList, setLemburList] = useState<any[]>([]);
  const [filteredLembur, setFilteredLembur] = useState<any[]>([]);
  const [userId, setUserId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadUserId();
  }, []);

  useEffect(() => {
    if (userId) {
      fetchLembur();
    }
  }, [userId]);

  useEffect(() => {
    filterLembur();
  }, [activeTab, lemburList, searchQuery]);

  const loadUserId = async () => {
    try {
      const userData = await AsyncStorage.getItem('userData');
      if (userData) {
        const user = JSON.parse(userData);
        setUserId(user.id_user || user.id);
      }
    } catch (error) {
      console.error('Error loading user ID:', error);
      setLoading(false);
    }
  };



  const fetchLembur = async () => {
    try {
      setLoading(true);
      console.log('Fetching lembur for user:', userId);
      
      // Coba beberapa endpoint yang mungkin ada
      let response, result;
      
      // Endpoint 1: pengajuan hari ini
      try {
        response = await fetch(getApiUrl(`/pegawai/lembur/api/pengajuan-hari-ini?user_id=${userId}`));
        result = await response.json();
        console.log('Endpoint pengajuan-hari-ini:', result);
        
        if (result.success && result.data && result.data.length > 0) {
          setLemburList(result.data);
          console.log('Data found from pengajuan-hari-ini:', result.data.length);
          return;
        }
      } catch (e) {
        console.log('Endpoint pengajuan-hari-ini failed:', e);
      }
      
      // Endpoint 2: riwayat (untuk melihat semua data)
      try {
        response = await fetch(getApiUrl(`/pegawai/lembur/api/riwayat?user_id=${userId}`));
        result = await response.json();
        console.log('Endpoint riwayat:', result);
        
        if (result.success && result.data && result.data.length > 0) {
          setLemburList(result.data);
          console.log('Data found from riwayat:', result.data.length);
          return;
        }
      } catch (e) {
        console.log('Endpoint riwayat failed:', e);
      }
      
      // Jika tidak ada data
      console.log('No lembur data found from any endpoint');
      setLemburList([]);
      
    } catch (error) {
      console.error('Error fetching lembur:', error);
      setLemburList([]);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchLembur();
    setRefreshing(false);
  };

  const filterLembur = () => {
    let filtered = lemburList;

    if (activeTab !== 'semua') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      filtered = filtered.filter((item) => {
        const mulai = new Date(item.tanggal_mulai);
        const selesai = new Date(item.tanggal_selesai);
        mulai.setHours(0, 0, 0, 0);
        selesai.setHours(23, 59, 59, 999);

        if (activeTab === 'akan_datang') {
          return mulai > today;
        } else if (activeTab === 'berlangsung') {
          return today >= mulai && today <= selesai;
        } else if (activeTab === 'selesai') {
          return selesai < today;
        }
        return true;
      });
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((item) => 
        item.alasan_text.toLowerCase().includes(query) ||
        item.nomor_pengajuan?.toLowerCase().includes(query)
      );
    }

    setFilteredLembur(filtered);
  };

  const getStatusInfo = (item: any) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const mulai = new Date(item.tanggal_mulai);
    const selesai = new Date(item.tanggal_selesai);
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

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const handleDetailPress = (item: any) => {
    router.push({
      pathname: '/menu-pegawai/lembur/detail',
      params: { id: item.id_pengajuan || item.id || item.id_absen_lembur }
    });
  };



  const renderLemburCard = (item: any) => {
    const status = getStatusInfo(item);
    
    return (
      <TouchableOpacity
        key={item.id_pengajuan || item.id}
        style={styles.card}
        onPress={() => handleDetailPress(item)}
        activeOpacity={0.7}
      >
        <View style={styles.cardHeader}>
          <View style={styles.cardTitle}>
            <Text style={styles.lemburName}>Lembur - {item.alasan_text || item.alasan || 'Lembur'}</Text>
            <Text style={styles.pengajuanNumber}>{item.nomor_pengajuan || item.nomor_spt || 'No. Pengajuan'}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: status.color + '20' }]}>
            <Text style={[styles.statusText, { color: status.color }]}>
              {status.label}
            </Text>
          </View>
        </View>

        <View style={styles.cardInfo}>
          <View style={styles.infoRow}>
            <View style={styles.infoIconBox}>
              <Ionicons name="calendar-outline" size={16} color="#00695C" />
            </View>
            <Text style={styles.infoText}>
              {formatDate(item.tanggal_mulai || item.tanggal)} - {formatDate(item.tanggal_selesai || item.tanggal)}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <View style={styles.infoIconBox}>
              <Ionicons name="time-outline" size={16} color="#00695C" />
            </View>
            <Text style={styles.infoText}>
              {item.jam_mulai || item.jam_rencana_mulai || '-'} - {item.jam_selesai || item.jam_rencana_selesai || '-'}
            </Text>
          </View>
        </View>

        <View style={styles.cardFooter}>
          <View style={styles.footerLeft}>
            <Ionicons name="briefcase-outline" size={20} color="#64748B" />
            <Text style={styles.footerText}>Lembur</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#CBD5E1" />
        </View>
      </TouchableOpacity>
    );
  };









  return (
    <View style={styles.container}>
      <StatusBar style="light" translucent={true} backgroundColor="transparent" />
      
      <AppHeader title="Lembur" showBack={true} />

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputWrapper}>
          <Ionicons name="search-outline" size={20} color="#666" />
          <TextInput
            style={styles.searchInput}
            placeholder="Cari Lembur..."
            placeholderTextColor="#999"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery("")}>
              <Ionicons name="close-circle" size={20} color="#999" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {loading ? (
        <View style={styles.content}>
          {[1, 2, 3, 4, 5].map((item) => (
            <View key={item} style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.cardTitle}>
                  <View style={[styles.skeletonText, { width: '75%', height: 18, marginBottom: 8 }]} />
                  <View style={[styles.skeletonText, { width: '45%', height: 12 }]} />
                </View>
                <View style={[styles.skeletonText, { width: 80, height: 26, borderRadius: 8 }]} />
              </View>
              <View style={styles.cardInfo}>
                <View style={styles.infoRow}>
                  <View style={[styles.skeletonText, { width: 28, height: 28, borderRadius: 10, marginRight: 10 }]} />
                  <View style={[styles.skeletonText, { flex: 1, height: 14 }]} />
                </View>
                <View style={styles.infoRow}>
                  <View style={[styles.skeletonText, { width: 28, height: 28, borderRadius: 10, marginRight: 10 }]} />
                  <View style={[styles.skeletonText, { flex: 1, height: 14 }]} />
                </View>
              </View>
              <View style={styles.cardFooter}>
                <View style={styles.footerLeft}>
                  <View style={[styles.skeletonText, { width: 20, height: 20, borderRadius: 4, marginRight: 8 }]} />
                  <View style={[styles.skeletonText, { width: 50, height: 12 }]} />
                </View>
                <View style={[styles.skeletonText, { width: 18, height: 18, borderRadius: 4 }]} />
              </View>
            </View>
          ))}
        </View>
      ) : (
        <ScrollView
          style={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#004643']} />
          }
        >
          {filteredLembur.length > 0 ? (
            filteredLembur.map((item) => renderLemburCard(item))
          ) : (
            <View style={styles.emptyContainer}>
              <Ionicons name="briefcase-outline" size={64} color="#E0E0E0" />
              <Text style={styles.emptyTitle}>Belum Ada Lembur</Text>
              <Text style={styles.emptySubtitle}>
                Anda belum memiliki jadwal lembur
              </Text>
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  searchContainer: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  searchInputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 14,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#E8F0EF',
    gap: 12,
    shadowColor: '#004643',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#333',
    paddingVertical: 14,
    fontWeight: '400',
  },
  content: {
    flex: 1,
    paddingTop: 10,
    backgroundColor: '#fff',
  },
  skeletonText: {
    backgroundColor: '#E0E0E0',
    borderRadius: 4,
  },
  card: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    marginHorizontal: 20,
    marginTop: 2,
    borderWidth: 1,
    borderColor: '#F0F3F3',
    shadowColor: '#004643',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  cardTitle: { flex: 1, marginRight: 10 },
  lemburName: { fontSize: 16, fontWeight: '700', color: '#1E293B', marginBottom: 6 },
  pengajuanNumber: { fontSize: 11, color: '#64748B', fontWeight: '600', letterSpacing: 0.5 },
  cardInfo: { marginBottom: 0 },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  infoIconBox: {
    width: 28,
    height: 28,
    backgroundColor: '#F0F7F7',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  infoText: {
    fontSize: 13,
    color: '#475569',
    flex: 1,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    marginHorizontal: -14,
    marginBottom: -14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginTop: 12,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
  },
  footerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  footerText: {
    fontSize: 12,
    color: '#64748B',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#999',
    textAlign: 'center',
    paddingHorizontal: 40,
  },
});
