import React from 'react';
import { StyleSheet, View, Text, ScrollView, SafeAreaView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function RiwayatScreen() {
  // Data dummy untuk simulasi tampilan
  const riwayatData = [
    { tgl: '01', hari: 'Rab', masuk: '08:29', pulang: '17:04', status: 'Terlambat', color: '#FF9800' },
    { tgl: '02', hari: 'Kam', masuk: '07:54', pulang: '17:00', status: 'Tepat Waktu', color: '#4CAF50' },
    { tgl: '03', hari: 'Jum', masuk: '08:32', pulang: '17:04', status: 'Terlambat', color: '#FF9800' },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        
        {/* HEADER LAPORAN */}
        <View style={styles.header}>
          <Text style={styles.title}>Laporan Presensi</Text>
          <View style={styles.filterRow}>
            <TouchableOpacity style={styles.filterBtn}>
              <Text>Laporan Bulanan</Text>
              <Ionicons name="chevron-down" size={16} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.filterBtn}>
              <Text>Januari 2026</Text>
              <Ionicons name="chevron-down" size={16} />
            </TouchableOpacity>
          </View>
        </View>

        {/* RINGKASAN STATISTIK (Seperti Gambar Referensi Terakhir) */}
        <View style={styles.statsContainer}>
          <View style={[styles.statBox, { borderLeftColor: '#2196F3' }]}>
            <Text style={styles.statLabel}>Hadir</Text>
            <Text style={styles.statValue}>19 hari</Text>
          </View>
          <View style={[styles.statBox, { borderLeftColor: '#FF9800' }]}>
            <Text style={styles.statLabel}>Terlambat</Text>
            <Text style={styles.statValue}>7j 17m</Text>
          </View>
          <View style={[styles.statBox, { borderLeftColor: '#4CAF50' }]}>
            <Text style={styles.statLabel}>Jam Kerja</Text>
            <Text style={styles.statValue}>146j 14m</Text>
          </View>
        </View>

        {/* LIST RIWAYAT HARIAN */}
        <View style={styles.listSection}>
          <Text style={styles.sectionTitle}>Terlama - Terbaru</Text>
          
          {riwayatData.map((item, index) => (
            <View key={index} style={styles.logCard}>
              <View style={[styles.dateBox, { backgroundColor: item.color }]}>
                <Text style={styles.dateText}>{item.tgl}</Text>
              </View>
              
              <View style={styles.logInfo}>
                <View style={styles.logHeader}>
                  <Text style={styles.dayText}>{item.hari} <Text style={{color: item.color}}>{item.status}</Text></Text>
                  <Text style={styles.timeRange}>{item.masuk} - {item.pulang}</Text>
                </View>
                <Text style={styles.jobText}>Pegawai Magang ITB</Text>
              </View>
            </View>
          ))}
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFB', paddingBottom: 100 },
  header: { padding: 20, backgroundColor: '#fff' },
  title: { fontSize: 18, fontWeight: 'bold', marginBottom: 15 },
  filterRow: { flexDirection: 'row', justifyContent: 'space-between' },
  filterBtn: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#F0F0F0', 
    padding: 10, 
    borderRadius: 8,
    width: '48%',
    justifyContent: 'space-between'
  },
  statsContainer: { 
    flexDirection: 'row', 
    padding: 20, 
    justifyContent: 'space-between' 
  },
  statBox: { 
    backgroundColor: '#fff', 
    width: '31%', 
    padding: 12, 
    borderRadius: 10, 
    borderLeftWidth: 4,
    elevation: 2 
  },
  statLabel: { fontSize: 10, color: '#777' },
  statValue: { fontSize: 13, fontWeight: 'bold', marginTop: 5 },
  listSection: { paddingHorizontal: 20 },
  sectionTitle: { fontSize: 14, color: '#777', marginBottom: 15 },
  logCard: { 
    flexDirection: 'row', 
    backgroundColor: '#fff', 
    borderRadius: 12, 
    marginBottom: 12, 
    overflow: 'hidden',
    elevation: 1
  },
  dateBox: { width: 50, justifyContent: 'center', alignItems: 'center' },
  dateText: { color: '#fff', fontWeight: 'bold', fontSize: 18 },
  logInfo: { flex: 1, padding: 15 },
  logHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  dayText: { fontWeight: 'bold', fontSize: 14 },
  timeRange: { fontSize: 12, color: '#444' },
  jobText: { fontSize: 12, color: '#999', marginTop: 4 }
});