import React from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AppHeader from '../../components/AppHeader';

export default function BantuanScreen() {
  const handleContact = (type: string) => {
    switch(type) {
      case 'whatsapp':
        Linking.openURL('https://wa.me/6281234567890');
        break;
      case 'email':
        Linking.openURL('mailto:support@hadirin.com');
        break;
      case 'phone':
        Linking.openURL('tel:+6281234567890');
        break;
    }
  };

  return (
    <View style={styles.container}>
      <AppHeader title="Bantuan" showBack={false} />
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Hubungi Kami</Text>
            
            <TouchableOpacity style={styles.card} onPress={() => handleContact('whatsapp')}>
              <View style={[styles.iconBox, { backgroundColor: '#25D366' }]}>
                <Ionicons name="logo-whatsapp" size={24} color="#fff" />
              </View>
              <View style={styles.cardContent}>
                <Text style={styles.cardTitle}>WhatsApp</Text>
                <Text style={styles.cardSubtitle}>Chat dengan kami</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#999" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.card} onPress={() => handleContact('email')}>
              <View style={[styles.iconBox, { backgroundColor: '#EA4335' }]}>
                <Ionicons name="mail" size={24} color="#fff" />
              </View>
              <View style={styles.cardContent}>
                <Text style={styles.cardTitle}>Email</Text>
                <Text style={styles.cardSubtitle}>support@hadirin.com</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#999" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.card} onPress={() => handleContact('phone')}>
              <View style={[styles.iconBox, { backgroundColor: '#2196F3' }]}>
                <Ionicons name="call" size={24} color="#fff" />
              </View>
              <View style={styles.cardContent}>
                <Text style={styles.cardTitle}>Telepon</Text>
                <Text style={styles.cardSubtitle}>+62 812-3456-7890</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#999" />
            </TouchableOpacity>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>FAQ</Text>
            
            <View style={styles.faqCard}>
              <Text style={styles.faqQuestion}>Bagaimana cara melakukan presensi?</Text>
              <Text style={styles.faqAnswer}>Klik tombol Presensi di menu utama, pastikan GPS aktif dan Anda berada di lokasi kantor.</Text>
            </View>

            <View style={styles.faqCard}>
              <Text style={styles.faqQuestion}>Bagaimana cara mengajukan izin?</Text>
              <Text style={styles.faqAnswer}>Buka menu Pengajuan, pilih jenis izin, isi form dan upload dokumen pendukung jika diperlukan.</Text>
            </View>

            <View style={styles.faqCard}>
              <Text style={styles.faqQuestion}>Dimana melihat riwayat presensi?</Text>
              <Text style={styles.faqAnswer}>Buka menu Presensi di dashboard untuk melihat riwayat presensi bulanan Anda.</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { padding: 20, paddingBottom: 100 },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#1a1a1a', marginBottom: 12 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  cardContent: { flex: 1 },
  cardTitle: { fontSize: 14, fontWeight: '600', color: '#1a1a1a', marginBottom: 2 },
  cardSubtitle: { fontSize: 12, color: '#999' },
  faqCard: {
    backgroundColor: '#F5F5F5',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  faqQuestion: { fontSize: 14, fontWeight: '600', color: '#1a1a1a', marginBottom: 8 },
  faqAnswer: { fontSize: 13, color: '#666', lineHeight: 20 },
});
