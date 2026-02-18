import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Modal } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppHeader } from '../../components';

export default function PengaturanScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <StatusBar style="light" translucent={true} backgroundColor="transparent" />
      
      <AppHeader 
        title="Pengaturan"
        showBack={true}
      />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>PENGATURAN ABSENSI</Text>
          <View style={styles.menuCard}>
          <TouchableOpacity 
            style={styles.menuItem}
            onPress={() => router.push('/pengaturan/jam-kerja' as any)}
          >
            <View style={styles.menuLeft}>
              <View style={[styles.iconCircle, { backgroundColor: '#E3F2FD' }]}>
                <Ionicons name="time-outline" size={22} color="#1976D2" />
              </View>
              <View style={styles.menuTextContainer}>
                <Text style={styles.menuText}>Jam Kerja</Text>
                <Text style={styles.menuDesc}>Atur jam masuk dan pulang kerja</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward-outline" size={20} color="#999" />
          </TouchableOpacity>
          
          <View style={styles.menuDivider} />
          
          <TouchableOpacity 
            style={styles.menuItem}
            onPress={() => router.push('/pengaturan/kalender-libur' as any)}
          >
            <View style={styles.menuLeft}>
              <View style={[styles.iconCircle, { backgroundColor: '#FFEBEE' }]}>
                <Ionicons name="calendar-outline" size={22} color="#F44336" />
              </View>
              <View style={styles.menuTextContainer}>
                <Text style={styles.menuText}>Kalender Libur</Text>
                <Text style={styles.menuDesc}>Kelola hari libur dan tanggal merah</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward-outline" size={20} color="#999" />
          </TouchableOpacity>
          
          <View style={styles.menuDivider} />
          
          <TouchableOpacity 
            style={styles.menuItem}
            onPress={() => router.push('/pengaturan/lokasi-kantor' as any)}
          >
            <View style={styles.menuLeft}>
              <View style={[styles.iconCircle, { backgroundColor: '#E8F5E9' }]}>
                <Ionicons name="location-outline" size={22} color="#4CAF50" />
              </View>
              <View style={styles.menuTextContainer}>
                <Text style={styles.menuText}>Lokasi Kantor</Text>
                <Text style={styles.menuDesc}>Tentukan lokasi dan radius absensi</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward-outline" size={20} color="#999" />
          </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 30,
  },
  section: {
    marginTop: 10,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#999',
    marginBottom: 10,
    marginLeft: 5,
    letterSpacing: 0.5,
  },
  menuCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 15,
  },
  menuLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  menuTextContainer: {
    flex: 1,
  },
  menuText: {
    fontSize: 15,
    color: '#333',
    fontWeight: '500',
    marginBottom: 2,
  },
  menuDesc: {
    fontSize: 12,
    color: '#999',
  },
  menuDivider: {
    height: 1,
    backgroundColor: '#F0F0F0',
  },
});
