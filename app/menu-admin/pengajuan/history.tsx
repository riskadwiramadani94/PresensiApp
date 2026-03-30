import React, { useState, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, Animated, PanResponder, Modal, Platform, RefreshControl, ScrollView, Dimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useFocusEffect, useRouter } from 'expo-router';
import { AppHeader } from '../../../components';
import { PusatValidasiAPI, KelolaDinasAPI, API_CONFIG } from '../../../constants/config';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface HistoryItem {
  id: string;
  tipe: 'absen_dinas' | 'pengajuan';
  judul: string;
  subjudul: string;
  nama?: string;
  tanggal_mulai: string;
  tanggal_selesai?: string;
  status?: string;
  keterangan?: string;
  tanggal_sort: string;
}

export default function HistoryScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [allData, setAllData] = useState<HistoryItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [filterTipe, setFilterTipe] = useState('semua');
  const [filterStatus, setFilterStatus] = useState('semua');
  const [filterPeriod, setFilterPeriod] = useState('semua');
  const [selectedPengajuan, setSelectedPengajuan] = useState<HistoryItem | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const filterTranslateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const detailTranslateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;

  const openFilterModal = () => {
    setShowFilterModal(true);
    Animated.spring(filterTranslateY, { toValue: 0, useNativeDriver: true, tension: 65, friction: 11 }).start();
  };

  const closeFilterModal = () => {
    Animated.timing(filterTranslateY, { toValue: SCREEN_HEIGHT, duration: 250, useNativeDriver: true })
      .start(() => setShowFilterModal(false));
  };

  const openDetailModal = (item: HistoryItem) => {
    setSelectedPengajuan(item);
    setShowDetailModal(true);
    Animated.spring(detailTranslateY, { toValue: 0, useNativeDriver: true, tension: 65, friction: 11 }).start();
  };

  const closeDetailModal = () => {
    Animated.timing(detailTranslateY, { toValue: SCREEN_HEIGHT, duration: 250, useNativeDriver: true })
      .start(() => { setShowDetailModal(false); setSelectedPengajuan(null); });
  };

  const filterPanResponder = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: (_, g) => g.dy > 5,
    onPanResponderMove: (_, g) => { if (g.dy > 0) filterTranslateY.setValue(g.dy); },
    onPanResponderRelease: (_, g) => {
      if (g.dy > 100) closeFilterModal();
      else Animated.spring(filterTranslateY, { toValue: 0, useNativeDriver: true }).start();
    },
  })).current;

  const detailPanResponder = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: (_, g) => g.dy > 5,
    onPanResponderMove: (_, g) => { if (g.dy > 0) detailTranslateY.setValue(g.dy); },
    onPanResponderRelease: (_, g) => {
      if (g.dy > 100) closeDetailModal();
      else Animated.spring(detailTranslateY, { toValue: 0, useNativeDriver: true }).start();
    },
  })).current;

  useFocusEffect(useCallback(() => { fetchAllData(); }, []));

  const fetchAllData = async () => {
    setLoading(true);
    try {
      const [resDinas, resPengajuan] = await Promise.all([
        PusatValidasiAPI.getAllAbsenDinas(),
        PusatValidasiAPI.getAllPengajuan(),
      ]);

      const dinasItems: HistoryItem[] = (resDinas.success && Array.isArray(resDinas.data) ? resDinas.data : []).map((d: any) => ({
        id: `dinas_${d.id_dinas || d.id}`,
        tipe: 'absen_dinas' as const,
        judul: d.nama_kegiatan || d.namaKegiatan || 'Dinas',
        subjudul: d.nomor_spt || d.nomorSpt || '',
        nama: d.nama_kegiatan || d.namaKegiatan,
        tanggal_mulai: d.tanggal_mulai,
        tanggal_selesai: d.tanggal_selesai,
        status: 'selesai',
        keterangan: d.lokasi,
        tanggal_sort: d.tanggal_mulai,
      }));

      const pengajuanItems: HistoryItem[] = (resPengajuan.success && Array.isArray(resPengajuan.data) ? resPengajuan.data : []).map((p: any) => ({
        id: `pengajuan_${p.id_pengajuan}`,
        tipe: 'pengajuan' as const,
        judul: formatJenis(p.jenis_pengajuan),
        subjudul: p.nip || '',
        nama: p.nama_lengkap,
        tanggal_mulai: p.tanggal_mulai,
        tanggal_selesai: p.tanggal_selesai,
        status: p.status,
        keterangan: p.alasan_text,
        tanggal_sort: p.tanggal_pengajuan || p.tanggal_mulai,
      }));

      const combined = [...dinasItems, ...pengajuanItems]
        .sort((a, b) => new Date(b.tanggal_sort).getTime() - new Date(a.tanggal_sort).getTime());

      setAllData(combined);
    } catch (e) {
      setAllData([]);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchAllData();
    setRefreshing(false);
  };

  const formatDate = (d: string) => new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });

  const formatJenis = (jenis: string) => {
    const map: { [k: string]: string } = {
      cuti_sakit: 'Cuti Sakit', cuti_tahunan: 'Cuti Tahunan', cuti_khusus: 'Cuti Khusus',
      cuti_alasan_penting: 'Cuti Alasan Penting', izin_pribadi: 'Izin Pribadi',
      izin_sakit: 'Izin Sakit', izin_datang_terlambat: 'Izin Datang Terlambat',
      izin_pulang_cepat: 'Izin Pulang Cepat',
    };
    return map[jenis] || jenis.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const getFilteredData = () => {
    let data = [...allData];

    if (filterTipe !== 'semua') data = data.filter(i => i.tipe === filterTipe);

    if (filterTipe !== 'absen_dinas' && filterStatus !== 'semua') {
      data = data.filter(i => i.status === filterStatus);
    }

    if (filterPeriod !== 'semua') {
      const today = new Date(); today.setHours(0, 0, 0, 0);
      data = data.filter(i => {
        const tgl = new Date(i.tanggal_sort); tgl.setHours(0, 0, 0, 0);
        if (filterPeriod === 'minggu_ini') {
          const start = new Date(today); start.setDate(today.getDate() - 7);
          return tgl >= start;
        }
        if (filterPeriod === 'bulan_ini') {
          return tgl.getMonth() === today.getMonth() && tgl.getFullYear() === today.getFullYear();
        }
        if (filterPeriod === '3_bulan') {
          const start = new Date(today); start.setMonth(today.getMonth() - 3);
          return tgl >= start;
        }
        return true;
      });
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      data = data.filter(i =>
        i.judul.toLowerCase().includes(q) ||
        i.subjudul.toLowerCase().includes(q) ||
        i.nama?.toLowerCase().includes(q) ||
        i.keterangan?.toLowerCase().includes(q)
      );
    }

    return data;
  };

  const activeFilterCount = [
    filterTipe !== 'semua',
    filterStatus !== 'semua',
    filterPeriod !== 'semua',
  ].filter(Boolean).length;

  const renderItem = ({ item }: { item: HistoryItem }) => {
    const isDinas = item.tipe === 'absen_dinas';
    const statusColor = item.status === 'disetujui' ? '#4CAF50' : item.status === 'ditolak' ? '#F44336' : '#2196F3';
    const statusLabel = item.status === 'disetujui' ? 'Disetujui' : item.status === 'ditolak' ? 'Ditolak' : 'Selesai';

    const handlePress = () => {
      if (isDinas) {
        router.push(`/menu-admin/pengajuan/absen-dinas/?dinasId=${item.id.replace('dinas_', '')}&isHistory=true` as any);
      } else {
        openDetailModal(item);
      }
    };

    return (
      <TouchableOpacity style={styles.card} onPress={handlePress} activeOpacity={0.7}>
        <View style={styles.cardHeader}>
          <View style={[styles.tipeIcon, { backgroundColor: isDinas ? '#E3F2FD' : '#E8F5E9' }]}>
            <Ionicons name={isDinas ? 'briefcase' : 'document-text'} size={16} color={isDinas ? '#2196F3' : '#4CAF50'} />
          </View>
          <View style={{ flex: 1, marginHorizontal: 10 }}>
            <Text style={styles.cardTitle} numberOfLines={1}>{item.judul}</Text>
            {item.nama ? (
              <Text style={styles.cardSubtitle}>{item.nama}</Text>
            ) : (
              <Text style={styles.cardSubtitle}>{item.subjudul}</Text>
            )}
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusColor + '20' }]}>
            {!isDinas && <View style={[styles.statusDot, { backgroundColor: statusColor }]} />}
            <Text style={[styles.statusText, { color: statusColor }]}>{statusLabel}</Text>
          </View>
        </View>

        <View style={styles.cardDivider} />

        <View style={styles.infoRow}>
          <Ionicons name="calendar-outline" size={13} color="#666" />
          <Text style={styles.infoText}>
            {formatDate(item.tanggal_mulai)}
            {item.tanggal_selesai && item.tanggal_selesai !== item.tanggal_mulai
              ? ` - ${formatDate(item.tanggal_selesai)}` : ''}
          </Text>
        </View>
        {item.keterangan ? (
          <View style={styles.infoRow}>
            <Ionicons name={isDinas ? 'location-outline' : 'document-text-outline'} size={13} color="#666" />
            <Text style={styles.infoText} numberOfLines={2}>{item.keterangan}</Text>
          </View>
        ) : null}
      </TouchableOpacity>
    );
  };

  const filteredData = getFilteredData();

  return (
    <View style={styles.container}>
      <StatusBar style="light" translucent backgroundColor="transparent" />
      <AppHeader title="History" showBack={true} />

      <View style={styles.fixedControls}>
        <View style={styles.searchContainer}>
          <View style={styles.searchInputWrapper}>
            <Ionicons name="search-outline" size={20} color="#666" />
            <TextInput
              style={styles.searchInput}
              placeholder="Cari history..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholderTextColor="#999"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={20} color="#999" />
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity style={styles.filterIconBtn} onPress={openFilterModal}>
            <Ionicons name="options" size={20} color="#004643" />
            {activeFilterCount > 0 && (
              <View style={styles.filterBadge}>
                <Text style={styles.filterBadgeText}>{activeFilterCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {loading ? (
        <View style={styles.listContent}>
          {[1, 2, 3, 4].map(i => (
            <View key={i} style={styles.card}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
                <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: '#E0E0E0', marginRight: 10 }} />
                <View style={{ flex: 1 }}>
                  <View style={{ height: 14, backgroundColor: '#E0E0E0', borderRadius: 4, marginBottom: 6, width: '70%' }} />
                  <View style={{ height: 11, backgroundColor: '#F0F0F0', borderRadius: 4, width: '45%' }} />
                </View>
                <View style={{ width: 60, height: 22, backgroundColor: '#E0E0E0', borderRadius: 8 }} />
              </View>
              <View style={{ height: 1, backgroundColor: '#F0F0F0', marginBottom: 10 }} />
              {[1, 2].map(j => (
                <View key={j} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6, gap: 8 }}>
                  <View style={{ width: 13, height: 13, borderRadius: 7, backgroundColor: '#E0E0E0' }} />
                  <View style={{ flex: 1, height: 11, backgroundColor: '#F0F0F0', borderRadius: 4 }} />
                </View>
              ))}
            </View>
          ))}
        </View>
      ) : (
        <FlatList
          data={filteredData}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#004643']} />}
          ListEmptyComponent={() => (
            <View style={styles.emptyContainer}>
              <Ionicons name="time-outline" size={60} color="#ccc" />
              <Text style={styles.emptyText}>Tidak ada history</Text>
            </View>
          )}
        />
      )}

      {/* Detail Pengajuan Modal */}
      <Modal visible={showDetailModal} transparent animationType="none" statusBarTranslucent onRequestClose={closeDetailModal}>
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={closeDetailModal} />
          <Animated.View style={[styles.detailSheet, { transform: [{ translateY: detailTranslateY }] }]}>
            <View {...detailPanResponder.panHandlers} style={styles.handleContainer}>
              <View style={styles.handleBar} />
            </View>
            {selectedPengajuan && (
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 30 }}>
                <View style={styles.detailHeader}>
                  <View style={[styles.tipeIcon, { backgroundColor: '#E8F5E9' }]}>
                    <Ionicons name="document-text" size={20} color="#4CAF50" />
                  </View>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={styles.detailJudul}>{selectedPengajuan.judul}</Text>
                    <Text style={styles.detailNama}>{selectedPengajuan.nama}</Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: (selectedPengajuan.status === 'disetujui' ? '#4CAF50' : '#F44336') + '20' }]}>
                    <View style={[styles.statusDot, { backgroundColor: selectedPengajuan.status === 'disetujui' ? '#4CAF50' : '#F44336' }]} />
                    <Text style={[styles.statusText, { color: selectedPengajuan.status === 'disetujui' ? '#4CAF50' : '#F44336' }]}>
                      {selectedPengajuan.status === 'disetujui' ? 'Disetujui' : 'Ditolak'}
                    </Text>
                  </View>
                </View>

                <View style={styles.detailDivider} />

                <View style={styles.detailGrid}>
                  <View style={styles.detailGridItem}>
                    <Text style={styles.detailLabel}>NIP</Text>
                    <Text style={styles.detailValue}>{selectedPengajuan.subjudul}</Text>
                  </View>
                  <View style={styles.detailGridItem}>
                    <Text style={styles.detailLabel}>Tanggal</Text>
                    <Text style={styles.detailValue}>
                      {formatDate(selectedPengajuan.tanggal_mulai)}
                      {selectedPengajuan.tanggal_selesai && selectedPengajuan.tanggal_selesai !== selectedPengajuan.tanggal_mulai
                        ? ` - ${formatDate(selectedPengajuan.tanggal_selesai)}` : ''}
                    </Text>
                  </View>
                </View>

                {selectedPengajuan.keterangan && (
                  <View style={styles.detailAlasan}>
                    <View style={styles.detailAlasanBar} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.detailLabel}>Alasan</Text>
                      <Text style={styles.detailValue}>{selectedPengajuan.keterangan}</Text>
                    </View>
                  </View>
                )}
              </ScrollView>
            )}
          </Animated.View>
        </View>
      </Modal>

      {/* Filter Modal */}
      <Modal visible={showFilterModal} transparent animationType="none" statusBarTranslucent onRequestClose={closeFilterModal}>
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={closeFilterModal} />
          <Animated.View style={[styles.filterSheet, { transform: [{ translateY: filterTranslateY }] }]}>
            <View {...filterPanResponder.panHandlers} style={styles.handleContainer}>
              <View style={styles.handleBar} />
            </View>

            <View style={styles.filterHeader}>
              <Text style={styles.filterTitle}>Filter</Text>
              <TouchableOpacity onPress={() => { setFilterTipe('semua'); setFilterStatus('semua'); setFilterPeriod('semua'); }}>
                <Text style={styles.resetText}>Reset</Text>
              </TouchableOpacity>
            </View>

            {/* Tipe */}
            <Text style={styles.filterSectionLabel}>Tipe</Text>
            {[
              { value: 'semua', label: 'Semua', icon: 'apps' },
              { value: 'absen_dinas', label: 'Absen Dinas', icon: 'briefcase' },
              { value: 'pengajuan', label: 'Pengajuan', icon: 'document-text' },
            ].map((opt, i, arr) => (
              <TouchableOpacity
                key={opt.value}
                style={[styles.filterOption, i === arr.length - 1 && { borderBottomWidth: 0 }]}
                onPress={() => { setFilterTipe(opt.value); if (opt.value === 'absen_dinas') setFilterStatus('semua'); }}
              >
                <View style={styles.filterOptionLeft}>
                  <Ionicons name={opt.icon as any} size={20} color={filterTipe === opt.value ? '#004643' : '#999'} />
                  <Text style={[styles.filterOptionText, filterTipe === opt.value && styles.filterOptionTextActive]}>{opt.label}</Text>
                </View>
                {filterTipe === opt.value && <Ionicons name="checkmark" size={18} color="#004643" />}
              </TouchableOpacity>
            ))}

            {/* Status - hanya tampil kalau tipe bukan absen_dinas */}
            {filterTipe !== 'absen_dinas' && (
              <>
                <Text style={[styles.filterSectionLabel, { marginTop: 16 }]}>Status Pengajuan</Text>
                {[
                  { value: 'semua', label: 'Semua', icon: 'apps' },
                  { value: 'disetujui', label: 'Disetujui', icon: 'checkmark-circle' },
                  { value: 'ditolak', label: 'Ditolak', icon: 'close-circle' },
                ].map((opt, i, arr) => (
                  <TouchableOpacity
                    key={opt.value}
                    style={[styles.filterOption, i === arr.length - 1 && { borderBottomWidth: 0 }]}
                    onPress={() => setFilterStatus(opt.value)}
                  >
                    <View style={styles.filterOptionLeft}>
                      <Ionicons name={opt.icon as any} size={20} color={filterStatus === opt.value ? '#004643' : '#999'} />
                      <Text style={[styles.filterOptionText, filterStatus === opt.value && styles.filterOptionTextActive]}>{opt.label}</Text>
                    </View>
                    {filterStatus === opt.value && <Ionicons name="checkmark" size={18} color="#004643" />}
                  </TouchableOpacity>
                ))}
              </>
            )}

            {/* Periode */}
            <Text style={[styles.filterSectionLabel, { marginTop: 16 }]}>Periode</Text>
            {[
              { value: 'semua', label: 'Semua Waktu', icon: 'time' },
              { value: 'minggu_ini', label: '7 Hari Terakhir', icon: 'calendar' },
              { value: 'bulan_ini', label: 'Bulan Ini', icon: 'calendar-outline' },
              { value: '3_bulan', label: '3 Bulan Terakhir', icon: 'calendar-clear-outline' },
            ].map((opt, i, arr) => (
              <TouchableOpacity
                key={opt.value}
                style={[styles.filterOption, i === arr.length - 1 && { borderBottomWidth: 0 }]}
                onPress={() => setFilterPeriod(opt.value)}
              >
                <View style={styles.filterOptionLeft}>
                  <Ionicons name={opt.icon as any} size={20} color={filterPeriod === opt.value ? '#004643' : '#999'} />
                  <Text style={[styles.filterOptionText, filterPeriod === opt.value && styles.filterOptionTextActive]}>{opt.label}</Text>
                </View>
                {filterPeriod === opt.value && <Ionicons name="checkmark" size={18} color="#004643" />}
              </TouchableOpacity>
            ))}

            <TouchableOpacity style={styles.applyBtn} onPress={closeFilterModal}>
              <Text style={styles.applyBtnText}>Terapkan</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  fixedControls: { paddingBottom: 8, backgroundColor: '#fff' },
  searchContainer: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 20, paddingBottom: 12, gap: 10 },
  searchInputWrapper: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 14, paddingHorizontal: 16, borderWidth: 1, borderColor: '#E8F0EF', gap: 12, shadowColor: '#004643', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 },
  searchInput: { flex: 1, fontSize: 15, color: '#333', paddingVertical: 14 },
  filterIconBtn: { width: 48, height: 48, borderRadius: 12, backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center' },
  filterBadge: { position: 'absolute', top: 6, right: 6, width: 16, height: 16, borderRadius: 8, backgroundColor: '#004643', justifyContent: 'center', alignItems: 'center' },
  filterBadgeText: { color: '#fff', fontSize: 9, fontWeight: '700' },
  listContent: { padding: 20, paddingBottom: 30 },
  card: { backgroundColor: '#FFF', borderRadius: 16, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: '#E8F0EF', shadowColor: '#004643', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  tipeIcon: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  cardTitle: { fontSize: 14, fontWeight: '700', color: '#1E293B', marginBottom: 2 },
  cardSubtitle: { fontSize: 11, color: '#64748B' },
  cardDivider: { height: 1, backgroundColor: '#F1F5F9', marginBottom: 10 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 5 },
  infoText: { fontSize: 12, color: '#475569', flex: 1 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, gap: 4 },
  statusDot: { width: 5, height: 5, borderRadius: 3 },
  statusText: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },
  emptyContainer: { alignItems: 'center', paddingTop: 60 },
  emptyText: { fontSize: 14, color: '#999', marginTop: 12 },
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
  modalBackdrop: { flex: 1 },
  detailSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    maxHeight: SCREEN_HEIGHT * 0.85,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 20,
  },
  filterSheet: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingBottom: Platform.OS === 'ios' ? 34 : 20, maxHeight: '85%' },
  handleContainer: { paddingVertical: 12, alignItems: 'center' },
  handleBar: { width: 40, height: 4, backgroundColor: '#DDD', borderRadius: 2 },
  filterHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginBottom: 16 },
  filterTitle: { fontSize: 16, fontWeight: '600', color: '#1a1a1a' },
  resetText: { fontSize: 14, color: '#F44336', fontWeight: '500' },
  filterSectionLabel: { fontSize: 12, fontWeight: '700', color: '#999', paddingHorizontal: 20, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 },
  filterOption: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, paddingHorizontal: 20, borderBottomWidth: 0.5, borderBottomColor: '#E5E5E5' },
  filterOptionLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  filterOptionText: { fontSize: 15, color: '#333' },
  filterOptionTextActive: { color: '#004643', fontWeight: '500' },
  applyBtn: { margin: 20, backgroundColor: '#004643', paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  applyBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  detailHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  detailJudul: { fontSize: 15, fontWeight: '700', color: '#1E293B', marginBottom: 2 },
  detailNama: { fontSize: 12, color: '#64748B' },
  detailDivider: { height: 1, backgroundColor: '#F1F5F9', marginBottom: 16 },
  detailRow: { marginBottom: 14 },
  detailLabel: { fontSize: 10, fontWeight: '700', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6 },
  detailValue: { fontSize: 14, color: '#1E293B', fontWeight: '600', lineHeight: 20 },
  detailBox: { backgroundColor: '#F8F9FA', borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: '#E5E7EB' },
  detailGrid: { flexDirection: 'row', gap: 12, marginBottom: 14 },
  detailGridItem: { flex: 1, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  detailAlasan: { flexDirection: 'row', gap: 12, paddingTop: 4 },
  detailAlasanBar: { width: 3, borderRadius: 2, backgroundColor: '#004643', minHeight: 40 },
});
