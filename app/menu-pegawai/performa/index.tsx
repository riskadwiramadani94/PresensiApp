import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, RefreshControl } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppHeader } from '../../../components';
import { getApiUrl } from '../../../constants/config';

interface PerformaData {
  skor_performa: number;
  kategori: string;
  statistik: {
    total_jam_kerja: number;
    target_jam_kerja: number;
    persentase_jam_kerja: number;
    hari_hadir: number;
    target_hari_kerja: number;
    tingkat_kehadiran: number;
    hari_tepat_waktu: number;
    total_hari_masuk: number;
    ketepatan_waktu: number;
  };
  rincian: {
    hadir: number;
    terlambat: number;
    izin: number;
    sakit: number;
    cuti: number;
    alpha: number;
  };
  pencapaian: string[];
  aktivitas: {
    lembur: number;
    izin: number;
    cuti: number;
  };
}

export default function PerformaScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState<PerformaData | null>(null);

  useEffect(() => {
    fetchPerforma();
  }, []);

  const fetchPerforma = async () => {
    try {
      const userData = await AsyncStorage.getItem('userData');
      if (!userData) return;

      const user = JSON.parse(userData);
      const userId = user.id_user || user.id;

      const response = await fetch(getApiUrl('/pegawai/api/performa'), {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'user-id': userId.toString()
        }
      });

      const result = await response.json();
      if (result.success) {
        setData(result.data);
      }
    } catch (error) {
      console.error('Error fetch performa:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchPerforma();
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return '#4CAF50';
    if (score >= 75) return '#2196F3';
    if (score >= 60) return '#FFA726';
    return '#EF5350';
  };

  const ProgressBar = ({ percentage, color }: { percentage: number; color: string }) => (
    <View style={styles.progressBarContainer}>
      <View style={[styles.progressBarFill, { width: `${percentage}%`, backgroundColor: color }]} />
    </View>
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <StatusBar style="light" translucent={true} backgroundColor="transparent" />
        <AppHeader title="Performa Saya" showBack={true} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#004643" />
          <Text style={styles.loadingText}>Memuat data...</Text>
        </View>
      </View>
    );
  }

  if (!data) {
    return (
      <View style={styles.container}>
        <StatusBar style="light" translucent={true} backgroundColor="transparent" />
        <AppHeader title="Performa Saya" showBack={true} />
        <View style={styles.emptyContainer}>
          <Ionicons name="stats-chart-outline" size={64} color="#E0E0E0" />
          <Text style={styles.emptyText}>Belum ada data performa</Text>
        </View>
      </View>
    );
  }

  const scoreColor = getScoreColor(data.skor_performa);

  return (
    <View style={styles.container}>
      <StatusBar style="light" translucent={true} backgroundColor="transparent" />
      <AppHeader title="Performa Saya" showBack={true} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#004643']} />}
      >
        {/* Skor Performa */}
        <View style={[styles.card, styles.scoreCard]}>
          <View style={styles.cardTitleRow}>
            <Ionicons name="trophy" size={16} color="#666" />
            <Text style={styles.cardTitle}>SKOR PERFORMA BULAN INI</Text>
          </View>
          <Text style={[styles.scoreText, { color: scoreColor }]}>{data.skor_performa}/100</Text>
          <ProgressBar percentage={data.skor_performa} color={scoreColor} />
          <Text style={styles.categoryText}>Kategori: {data.kategori}</Text>
        </View>

        {/* Total Jam Kerja */}
        <View style={styles.card}>
          <View style={styles.metricHeader}>
            <Ionicons name="time-outline" size={20} color="#1976D2" />
            <Text style={styles.metricTitle}>Total Jam Kerja</Text>
          </View>
          <Text style={styles.metricValue}>
            {data.statistik.total_jam_kerja} jam dari {data.statistik.target_jam_kerja} jam
          </Text>
          <ProgressBar percentage={data.statistik.persentase_jam_kerja} color="#1976D2" />
          <Text style={styles.percentageText}>{data.statistik.persentase_jam_kerja}%</Text>
        </View>

        {/* Tingkat Kehadiran */}
        <View style={styles.card}>
          <View style={styles.metricHeader}>
            <Ionicons name="checkmark-circle-outline" size={20} color="#4CAF50" />
            <Text style={styles.metricTitle}>Tingkat Kehadiran</Text>
          </View>
          <Text style={styles.metricValue}>
            {data.statistik.hari_hadir} dari {data.statistik.target_hari_kerja} hari kerja
          </Text>
          <ProgressBar percentage={data.statistik.tingkat_kehadiran} color="#4CAF50" />
          <Text style={styles.percentageText}>{data.statistik.tingkat_kehadiran}%</Text>
        </View>

        {/* Ketepatan Waktu */}
        <View style={styles.card}>
          <View style={styles.metricHeader}>
            <Ionicons name="alarm-outline" size={20} color="#FF9800" />
            <Text style={styles.metricTitle}>Ketepatan Waktu</Text>
          </View>
          <Text style={styles.metricValue}>
            {data.statistik.hari_tepat_waktu} dari {data.statistik.total_hari_masuk} hari tepat waktu
          </Text>
          <ProgressBar percentage={data.statistik.ketepatan_waktu} color="#FF9800" />
          <Text style={styles.percentageText}>{data.statistik.ketepatan_waktu}%</Text>
        </View>

        {/* Rincian Kehadiran */}
        <View style={styles.card}>
          <View style={styles.cardTitleRow}>
            <Ionicons name="bar-chart" size={16} color="#666" />
            <Text style={styles.cardTitle}>RINCIAN KEHADIRAN</Text>
          </View>
          <View style={styles.detailRow}>
            <View style={styles.detailLabelRow}>
              <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />
              <Text style={styles.detailLabel}>Hadir</Text>
            </View>
            <Text style={styles.detailValue}>{data.rincian.hadir} hari</Text>
          </View>
          <View style={styles.detailRow}>
            <View style={styles.detailLabelRow}>
              <Ionicons name="time" size={16} color="#FF9800" />
              <Text style={styles.detailLabel}>Terlambat</Text>
            </View>
            <Text style={styles.detailValue}>{data.rincian.terlambat} hari</Text>
          </View>
          <View style={styles.detailRow}>
            <View style={styles.detailLabelRow}>
              <Ionicons name="document-text" size={16} color="#2196F3" />
              <Text style={styles.detailLabel}>Izin</Text>
            </View>
            <Text style={styles.detailValue}>{data.rincian.izin} hari</Text>
          </View>
          <View style={styles.detailRow}>
            <View style={styles.detailLabelRow}>
              <Ionicons name="medkit" size={16} color="#9C27B0" />
              <Text style={styles.detailLabel}>Sakit</Text>
            </View>
            <Text style={styles.detailValue}>{data.rincian.sakit} hari</Text>
          </View>
          <View style={styles.detailRow}>
            <View style={styles.detailLabelRow}>
              <Ionicons name="calendar" size={16} color="#00BCD4" />
              <Text style={styles.detailLabel}>Cuti</Text>
            </View>
            <Text style={styles.detailValue}>{data.rincian.cuti} hari</Text>
          </View>
          <View style={styles.detailRow}>
            <View style={styles.detailLabelRow}>
              <Ionicons name="close-circle" size={16} color="#F44336" />
              <Text style={styles.detailLabel}>Alpha</Text>
            </View>
            <Text style={styles.detailValue}>{data.rincian.alpha} hari</Text>
          </View>
        </View>

        {/* Pencapaian */}
        {data.pencapaian.length > 0 && (
          <View style={styles.card}>
            <View style={styles.cardTitleRow}>
              <Ionicons name="ribbon" size={16} color="#666" />
              <Text style={styles.cardTitle}>PENCAPAIAN</Text>
            </View>
            {data.pencapaian.map((item: string, index: number) => (
              <View key={index} style={styles.achievementRow}>
                <Ionicons 
                  name={item.includes('Terlambat') ? 'warning-outline' : 'checkmark-circle'} 
                  size={18} 
                  color={item.includes('Terlambat') ? '#FF9800' : '#4CAF50'} 
                />
                <Text style={styles.achievementText}>{item}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Aktivitas Lainnya */}
        <View style={styles.card}>
          <View style={styles.cardTitleRow}>
            <Ionicons name="list" size={16} color="#666" />
            <Text style={styles.cardTitle}>AKTIVITAS LAINNYA</Text>
          </View>
          <View style={styles.detailRow}>
            <View style={styles.detailLabelRow}>
              <Ionicons name="moon" size={16} color="#FF9800" />
              <Text style={styles.detailLabel}>Lembur</Text>
            </View>
            <Text style={styles.detailValue}>{data.aktivitas.lembur} kali</Text>
          </View>
          <View style={styles.detailRow}>
            <View style={styles.detailLabelRow}>
              <Ionicons name="document" size={16} color="#2196F3" />
              <Text style={styles.detailLabel}>Izin</Text>
            </View>
            <Text style={styles.detailValue}>{data.aktivitas.izin} pengajuan</Text>
          </View>
          <View style={styles.detailRow}>
            <View style={styles.detailLabelRow}>
              <Ionicons name="calendar" size={16} color="#00BCD4" />
              <Text style={styles.detailLabel}>Cuti</Text>
            </View>
            <Text style={styles.detailValue}>{data.aktivitas.cuti} pengajuan</Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff' },
  scrollContent: { paddingHorizontal: 15, paddingTop: 15, paddingBottom: 30 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadingText: { fontSize: 14, color: '#666' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  emptyText: { fontSize: 16, color: '#999' },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  scoreCard: { alignItems: 'center', paddingVertical: 20 },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 15 },
  cardTitle: { fontSize: 13, fontWeight: 'bold', color: '#666', letterSpacing: 0.5 },
  detailLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  scoreText: { fontSize: 48, fontWeight: 'bold', marginBottom: 10 },
  categoryText: { fontSize: 14, color: '#666', marginTop: 10, fontWeight: '600' },
  metricHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 8 },
  metricTitle: { fontSize: 15, fontWeight: '600', color: '#333' },
  metricValue: { fontSize: 14, color: '#666', marginBottom: 10 },
  progressBarContainer: {
    height: 8,
    backgroundColor: '#E0E0E0',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressBarFill: { height: '100%', borderRadius: 4 },
  percentageText: { fontSize: 16, fontWeight: 'bold', color: '#333', textAlign: 'right' },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  detailLabel: { fontSize: 14, color: '#666' },
  detailValue: { fontSize: 14, fontWeight: '600', color: '#333' },
  achievementRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
  achievementText: { fontSize: 14, color: '#666', flex: 1 },
});
