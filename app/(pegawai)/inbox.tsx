import React, { useState } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, SafeAreaView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function InboxScreen() {
  // Data dummy notifikasi
  const [notifications] = useState([
    {
      id: 1,
      type: 'approval',
      title: 'Pengajuan Disetujui',
      desc: 'Pengajuan Dinas Luar Anda untuk tanggal 13 Jan telah disetujui oleh Admin.',
      time: '10 Menit yang lalu',
      isRead: false,
      icon: 'checkmark-circle',
      color: '#4CAF50'
    },
    {
      id: 2,
      type: 'reminder',
      title: 'Lupa Absen Pulang?',
      desc: 'Sistem mencatat Anda belum melakukan absen pulang pada tanggal 10 Jan.',
      time: '1 Hari yang lalu',
      isRead: true,
      icon: 'alert-circle',
      color: '#FF9800'
    },
    {
      id: 3,
      type: 'info',
      title: 'Update Sistem v1.0',
      desc: 'Sekarang Anda bisa melakukan pengajuan Dinas Luar langsung melalui menu Pengajuan.',
      time: '3 Hari yang lalu',
      isRead: true,
      icon: 'information-circle',
      color: '#2196F3'
    }
  ]);

  return (
    <SafeAreaView style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Notifikasi</Text>
        <TouchableOpacity>
          <Text style={styles.markRead}>Tandai dibaca</Text>
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {notifications.map((item) => (
          <TouchableOpacity 
            key={item.id} 
            style={[styles.notifCard, !item.isRead && styles.unreadCard]}
          >
            <View style={[styles.iconWrapper, { backgroundColor: item.color + '20' }]}>
              <Ionicons name={item.icon as any} size={24} color={item.color} />
            </View>
            
            <View style={styles.notifContent}>
              <View style={styles.notifHeader}>
                <Text style={styles.notifTitle}>{item.title}</Text>
                <Text style={styles.notifTime}>{item.time}</Text>
              </View>
              <Text style={styles.notifDesc} numberOfLines={2}>
                {item.desc}
              </Text>
            </View>

            {!item.isRead && <View style={styles.dotIndicator} />}
          </TouchableOpacity>
        ))}

        {/* FOOTER JIKA KOSONG (Optional) */}
        {notifications.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="mail-open-outline" size={80} color="#DDD" />
            <Text style={styles.emptyText}>Belum ada notifikasi baru</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFB' },
  header: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    padding: 20, 
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0'
  },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#333' },
  markRead: { fontSize: 13, color: '#004643', fontWeight: '600' },
  notifCard: { 
    flexDirection: 'row', 
    padding: 18, 
    backgroundColor: '#fff', 
    borderBottomWidth: 1, 
    borderBottomColor: '#F5F5F5',
    alignItems: 'center'
  },
  unreadCard: { backgroundColor: '#F0F7F6' },
  iconWrapper: { 
    width: 50, 
    height: 50, 
    borderRadius: 25, 
    justifyContent: 'center', 
    alignItems: 'center',
    marginRight: 15
  },
  notifContent: { flex: 1 },
  notifHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  notifTitle: { fontSize: 14, fontWeight: 'bold', color: '#333' },
  notifTime: { fontSize: 10, color: '#999' },
  notifDesc: { fontSize: 12, color: '#666', lineHeight: 18 },
  dotIndicator: { 
    width: 8, 
    height: 8, 
    borderRadius: 4, 
    backgroundColor: '#004643', 
    marginLeft: 10 
  },
  emptyState: { alignItems: 'center', marginTop: 100 },
  emptyText: { color: '#999', marginTop: 10 }
});