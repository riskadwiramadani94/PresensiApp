import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppHeader } from '../../components';
import { Ionicons } from '@expo/vector-icons';

export default function KebijakanPrivasiScreen() {
  const router = useRouter();
  const [userRole, setUserRole] = useState<string>('pegawai');
  
  useEffect(() => {
    loadUserRole();
  }, []);
  
  const loadUserRole = async () => {
    try {
      const userData = await AsyncStorage.getItem('userData');
      if (userData) {
        const user = JSON.parse(userData);
        setUserRole(user.role || 'pegawai');
      }
    } catch (error) {
      console.log('Error loading user role:', error);
    }
  };
  
  const handleBack = () => {
    if (userRole === 'admin') {
      router.push('/admin/profil-admin' as any);
    } else {
      router.push('/(pegawai)/profil' as any);
    }
  };
  
  return (
    <View style={styles.container}>
      <StatusBar style="light" translucent={true} backgroundColor="transparent" />
      <AppHeader title="Kebijakan Privasi" showBack={true} onBackPress={handleBack} />
      
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <Text style={styles.introText}>
          Kebijakan Privasi adalah dokumen yang menjelaskan bagaimana Validin (Validasi Digital Indonesia) 
          mengumpulkan, menggunakan, menyimpan, dan melindungi informasi pribadi Anda saat menggunakan aplikasi 
          manajemen kehadiran dan validasi digital pegawai.
        </Text>
        
        <Text style={styles.sectionTitle}>1. Informasi yang Kami Kumpulkan</Text>
        <Text style={styles.bodyText}>
          Validin mengumpulkan berbagai jenis informasi untuk menjalankan fungsi validasi digital kehadiran:
          {"\n\n"}
          <Text style={styles.boldText}>a) Data Identitas Pegawai:</Text> Nama lengkap, NIP, email, nomor telepon, jenis kelamin, jabatan, divisi, dan foto profil.
          {"\n\n"}
          <Text style={styles.boldText}>b) Data Kehadiran:</Text> Waktu check-in dan check-out, lokasi GPS saat absensi, foto selfie saat absensi, dan riwayat kehadiran harian.
          {"\n\n"}
          <Text style={styles.boldText}>c) Data Dinas:</Text> Informasi kegiatan dinas, lokasi dinas, jam kerja dinas, nomor SPT, dan radius validasi lokasi.
          {"\n\n"}
          <Text style={styles.boldText}>d) Data Pengajuan:</Text> Jenis pengajuan (cuti, izin, lembur, dinas), tanggal dan jam pengajuan, alasan/keterangan, dokumen pendukung, dan status persetujuan.
          {"\n\n"}
          <Text style={styles.boldText}>e) Data Akun:</Text> Username, password terenkripsi, role pengguna, riwayat login, dan pengaturan notifikasi.
        </Text>
        
        <Text style={styles.sectionTitle}>2. Cara Kami Mengumpulkan Informasi</Text>
        <Text style={styles.bodyText}>
          <Text style={styles.boldText}>a) Informasi yang Anda Berikan:</Text> Data yang Anda masukkan saat registrasi, edit profil, absensi, atau pengajuan.
          {"\n\n"}
          <Text style={styles.boldText}>b) Informasi yang Dikumpulkan Otomatis:</Text> Lokasi GPS saat absensi, waktu sistem, device ID, dan log aktivitas aplikasi.
          {"\n\n"}
          <Text style={styles.boldText}>c) Informasi dari Admin:</Text> Data pegawai yang diinput oleh admin, pengaturan jam kerja, lokasi kantor, dan konfigurasi sistem validasi.
        </Text>
        
        <Text style={styles.sectionTitle}>3. Penggunaan Informasi</Text>
        <Text style={styles.bodyText}>
          Informasi yang dikumpulkan digunakan untuk:
          {"\n\n"}
          • Validasi kehadiran pegawai secara digital dan real-time{"\n"}
          • Mengelola absensi harian dan absensi dinas{"\n"}
          • Memproses pengajuan cuti, izin, pulang cepat, lembur, dan koreksi presensi{"\n"}
          • Validasi lokasi dan waktu absensi sesuai pengaturan{"\n"}
          • Membuat laporan kehadiran dan statistik{"\n"}
          • Monitoring kehadiran pegawai oleh admin dan atasan{"\n"}
          • Mengirim notifikasi terkait kehadiran dan pengajuan{"\n"}
          • Meningkatkan keamanan dan mencegah penyalahgunaan sistem
        </Text>
        
        <Text style={styles.sectionTitle}>4. Keamanan Data</Text>
        <Text style={styles.bodyText}>
          Validin menerapkan standar keamanan tinggi untuk melindungi data Anda:
          {"\n\n"}
          • Password dienkripsi menggunakan algoritma hashing yang aman{"\n"}
          • Koneksi data menggunakan protokol HTTPS terenkripsi{"\n"}
          • Akses data dibatasi berdasarkan role (admin/pegawai){"\n"}
          • Validasi lokasi GPS untuk mencegah absensi palsu{"\n"}
          • Foto absensi disimpan dengan watermark waktu dan lokasi{"\n"}
          • Log aktivitas untuk audit dan pelacakan{"\n"}
          • Backup data berkala untuk mencegah kehilangan data
        </Text>
        
        <Text style={styles.sectionTitle}>5. Penyimpanan dan Retensi Data</Text>
        <Text style={styles.bodyText}>
          <Text style={styles.boldText}>Lokasi Penyimpanan:</Text> Data disimpan di server lokal yang aman dan hanya dapat diakses oleh sistem Validin.
          {"\n\n"}
          <Text style={styles.boldText}>Durasi Penyimpanan:</Text> Data kehadiran dan pengajuan disimpan sesuai kebijakan organisasi dan ketentuan ketenagakerjaan Indonesia (minimal 5 tahun untuk keperluan audit).
          {"\n\n"}
          <Text style={styles.boldText}>Penghapusan Data:</Text> Data pegawai yang tidak aktif akan diarsipkan. Anda dapat mengajukan penghapusan data setelah masa retensi berakhir.
        </Text>
        
        <Text style={styles.sectionTitle}>6. Berbagi dan Pengungkapan Informasi</Text>
        <Text style={styles.bodyText}>
          <Text style={styles.boldText}>Akses Internal:</Text> Data Anda dapat diakses oleh admin sistem, atasan langsung, dan pihak HR untuk keperluan manajemen kehadiran dan validasi.
          {"\n\n"}
          <Text style={styles.boldText}>Tidak Dibagikan ke Pihak Ketiga:</Text> Validin tidak menjual, menyewakan, atau membagikan data pribadi Anda kepada pihak ketiga untuk tujuan komersial.
          {"\n\n"}
          <Text style={styles.boldText}>Pengungkapan Wajib:</Text> Data dapat diungkapkan jika diwajibkan oleh hukum, perintah pengadilan, atau permintaan resmi dari pihak berwenang.
        </Text>
        
        <Text style={styles.sectionTitle}>7. Penggunaan Lokasi GPS</Text>
        <Text style={styles.bodyText}>
          Validin menggunakan lokasi GPS untuk memvalidasi bahwa Anda berada di lokasi yang ditentukan saat absensi, menghitung jarak dari titik lokasi kantor/dinas, mencegah absensi dari lokasi yang tidak sah, dan menyimpan koordinat lokasi sebagai bukti kehadiran.
          {"\n\n"}
          <Text style={styles.boldText}>Izin Lokasi:</Text> Anda harus memberikan izin akses lokasi untuk menggunakan fitur absensi. Lokasi hanya diakses saat Anda melakukan check-in/check-out.
        </Text>
        
        <Text style={styles.sectionTitle}>8. Penggunaan Kamera dan Foto</Text>
        <Text style={styles.bodyText}>
          <Text style={styles.boldText}>Foto Absensi:</Text> Validin memerlukan foto selfie saat absensi untuk validasi identitas dan mencegah kecurangan.
          {"\n\n"}
          <Text style={styles.boldText}>Foto Profil:</Text> Anda dapat mengunggah foto profil yang akan ditampilkan di akun Anda.
          {"\n\n"}
          <Text style={styles.boldText}>Dokumen Pengajuan:</Text> Foto/dokumen pendukung untuk pengajuan cuti sakit atau keperluan lainnya.
          {"\n\n"}
          Semua foto disimpan dengan aman dan hanya dapat diakses oleh pihak yang berwenang.
        </Text>
        
        <Text style={styles.sectionTitle}>9. Hak Anda sebagai Pengguna</Text>
        <Text style={styles.bodyText}>
          Anda memiliki hak untuk:
          {"\n\n"}
          • Mengakses dan melihat data pribadi Anda{"\n"}
          • Memperbarui informasi profil Anda{"\n"}
          • Mengubah password dan pengaturan keamanan{"\n"}
          • Melihat riwayat kehadiran dan pengajuan Anda{"\n"}
          • Mengajukan koreksi jika ada data yang tidak akurat{"\n"}
          • Mengatur preferensi notifikasi{"\n"}
          • Mengajukan penghapusan data sesuai ketentuan yang berlaku
        </Text>
        
        <Text style={styles.sectionTitle}>10. Hubungi Kami</Text>
        <Text style={styles.bodyText}>
          Jika Anda memiliki pertanyaan terkait kebijakan privasi ini, silakan hubungi tim Validin:
          {"\n\n"}
          <Text style={styles.boldText}>Email:</Text> privacy@validin.id{"\n"}
          <Text style={styles.boldText}>Support:</Text> support@validin.id{"\n"}
          <Text style={styles.boldText}>Menu Bantuan:</Text> Tersedia di aplikasi Validin
        </Text>
        
        <Text style={styles.footerText}>
          Dengan menggunakan aplikasi Validin, Anda menyatakan telah membaca, memahami, dan menyetujui seluruh isi Kebijakan Privasi ini.
        </Text>
        
        <Text style={styles.updateInfo}>Terakhir diperbarui: Januari 2025</Text>
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
    padding: 20,
    paddingBottom: 30,
  },
  introText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 22,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#004643',
    marginTop: 20,
    marginBottom: 8,
  },
  bodyText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 22,
    marginBottom: 12,
  },
  boldText: {
    fontWeight: 'bold',
    color: '#333',
  },
  footerText: {
    fontSize: 13,
    color: '#666',
    lineHeight: 20,
    marginTop: 20,
    marginBottom: 8,
    fontStyle: 'italic',
  },
  updateInfo: {
    fontSize: 12,
    color: '#999',
    marginTop: 12,
    fontStyle: 'italic',
  },
});
