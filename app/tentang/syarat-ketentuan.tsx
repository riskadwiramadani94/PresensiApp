import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppHeader } from '../../components';
import { useRouter } from 'expo-router';

export default function SyaratKetentuanScreen() {
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
      <AppHeader title="Syarat dan Ketentuan" showBack={true} onBackPress={handleBack} />
      
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <Text style={styles.introText}>
          Syarat dan Ketentuan ini mengatur penggunaan aplikasi Validin (Validasi Digital Indonesia) untuk manajemen kehadiran dan validasi digital pegawai. Dengan menggunakan aplikasi ini, Anda menyetujui untuk mematuhi seluruh ketentuan yang berlaku.
        </Text>
        
        <Text style={styles.sectionTitle}>1. Penerimaan Ketentuan</Text>
        <Text style={styles.bodyText}>
          Dengan mengakses, mendaftar, atau menggunakan aplikasi Validin, Anda menyatakan bahwa Anda telah membaca, memahami, dan menyetujui untuk terikat dengan Syarat dan Ketentuan ini. Jika Anda tidak setuju dengan ketentuan ini, Anda tidak diperkenankan menggunakan aplikasi.
          {"\n\n"}
          Syarat dan Ketentuan ini berlaku untuk semua pengguna aplikasi Validin, termasuk admin, pegawai, dan pihak yang berwenang mengakses sistem.
        </Text>
        
        <Text style={styles.sectionTitle}>2. Definisi dan Istilah</Text>
        <Text style={styles.bodyText}>
          <Text style={styles.boldText}>Validin:</Text> Aplikasi manajemen kehadiran dan validasi digital pegawai yang dikembangkan untuk organisasi.
          {"\n\n"}
          <Text style={styles.boldText}>Pengguna:</Text> Setiap individu yang mengakses dan menggunakan aplikasi Validin, termasuk admin dan pegawai.
          {"\n\n"}
          <Text style={styles.boldText}>Admin:</Text> Pengguna dengan hak akses penuh untuk mengelola sistem, data pegawai, dan pengaturan aplikasi.
          {"\n\n"}
          <Text style={styles.boldText}>Pegawai:</Text> Pengguna yang menggunakan aplikasi untuk absensi, pengajuan cuti/izin, dan fitur terkait kehadiran.
          {"\n\n"}
          <Text style={styles.boldText}>Absensi:</Text> Proses check-in dan check-out yang dilakukan pegawai melalui aplikasi dengan validasi lokasi GPS dan foto selfie.
          {"\n\n"}
          <Text style={styles.boldText}>Dinas:</Text> Kegiatan kerja di luar lokasi kantor tetap yang memerlukan validasi kehadiran khusus.
        </Text>
        
        <Text style={styles.sectionTitle}>3. Persyaratan Penggunaan</Text>
        <Text style={styles.bodyText}>
          <Text style={styles.boldText}>a) Kelayakan Pengguna:</Text> Anda harus merupakan pegawai resmi atau admin yang berwenang dari organisasi yang menggunakan Validin. Penggunaan aplikasi oleh pihak yang tidak berwenang dilarang keras.
          {"\n\n"}
          <Text style={styles.boldText}>b) Akun Pengguna:</Text> Setiap pengguna harus memiliki akun yang valid dengan informasi yang akurat dan lengkap. Anda bertanggung jawab penuh atas keamanan akun Anda.
          {"\n\n"}
          <Text style={styles.boldText}>c) Perangkat dan Koneksi:</Text> Anda harus memiliki perangkat mobile yang kompatibel dengan aplikasi Validin dan koneksi internet yang stabil untuk menggunakan fitur aplikasi.
          {"\n\n"}
          <Text style={styles.boldText}>d) Izin Akses:</Text> Anda harus memberikan izin akses lokasi GPS, kamera, dan penyimpanan yang diperlukan untuk fungsi absensi dan validasi digital.
        </Text>
        
        <Text style={styles.sectionTitle}>4. Hak dan Kewajiban Pengguna</Text>
        <Text style={styles.bodyText}>
          <Text style={styles.boldText}>Hak Pengguna:{"\n"}</Text>
          • Mengakses dan menggunakan fitur aplikasi sesuai role yang diberikan{"\n"}
          • Melihat dan memperbarui data pribadi Anda{"\n"}
          • Melihat riwayat kehadiran dan pengajuan Anda{"\n"}
          • Mengajukan cuti, izin, lembur, dan koreksi presensi{"\n"}
          • Mendapatkan notifikasi terkait kehadiran dan pengajuan{"\n"}
          • Mengubah password dan pengaturan keamanan akun{"\n"}
          • Mendapatkan dukungan teknis dari tim Validin
          {"\n\n"}
          <Text style={styles.boldText}>Kewajiban Pengguna:{"\n"}</Text>
          • Memberikan informasi yang akurat dan lengkap saat registrasi dan penggunaan aplikasi{"\n"}
          • Menjaga kerahasiaan password dan informasi akun Anda{"\n"}
          • Melakukan absensi sesuai dengan jam kerja dan lokasi yang ditentukan{"\n"}
          • Menggunakan aplikasi hanya untuk tujuan yang sah dan sesuai kebijakan organisasi{"\n"}
          • Tidak menyalahgunakan fitur aplikasi atau mencoba memanipulasi sistem{"\n"}
          • Melaporkan segera jika terjadi masalah keamanan atau aktivitas mencurigakan{"\n"}
          • Mematuhi seluruh kebijakan dan prosedur organisasi terkait kehadiran
        </Text>
        
        <Text style={styles.sectionTitle}>5. Penggunaan Fitur Absensi</Text>
        <Text style={styles.bodyText}>
          <Text style={styles.boldText}>a) Validasi Lokasi GPS:{"\n"}</Text>
          • Absensi hanya dapat dilakukan di lokasi yang telah ditentukan oleh admin{"\n"}
          • Sistem akan memvalidasi jarak Anda dari titik lokasi kantor/dinas{"\n"}
          • Absensi di luar radius yang ditentukan akan ditolak atau ditandai sebagai anomali{"\n"}
          • Anda harus mengaktifkan GPS dan memberikan izin akses lokasi
          {"\n\n"}
          <Text style={styles.boldText}>b) Foto Selfie Absensi:{"\n"}</Text>
          • Setiap absensi memerlukan foto selfie untuk validasi identitas{"\n"}
          • Foto harus jelas menampilkan wajah Anda{"\n"}
          • Dilarang menggunakan foto orang lain atau foto yang dimanipulasi{"\n"}
          • Foto akan disimpan sebagai bukti kehadiran dan dapat diakses oleh admin
          {"\n\n"}
          <Text style={styles.boldText}>c) Waktu Absensi:{"\n"}</Text>
          • Check-in harus dilakukan sesuai jam kerja yang ditentukan{"\n"}
          • Keterlambatan akan tercatat dalam sistem{"\n"}
          • Check-out harus dilakukan setelah jam kerja selesai{"\n"}
          • Lupa check-out dapat diajukan koreksi presensi dengan persetujuan admin
        </Text>
        
        <Text style={styles.sectionTitle}>6. Pengajuan Cuti, Izin, dan Lembur</Text>
        <Text style={styles.bodyText}>
          <Text style={styles.boldText}>a) Jenis Pengajuan:{"\n"}</Text>
          • Cuti Sakit: Memerlukan surat keterangan dokter atau bukti pendukung{"\n"}
          • Cuti Tahunan: Sesuai dengan kuota dan kebijakan organisasi{"\n"}
          • Izin Pribadi: Untuk keperluan mendesak dengan persetujuan atasan{"\n"}
          • Pulang Cepat: Izin meninggalkan kantor sebelum jam kerja selesai{"\n"}
          • Lembur: Pengajuan kerja di luar jam kerja normal{"\n"}
          • Koreksi Presensi: Perbaikan data absensi yang salah atau terlewat
          {"\n\n"}
          <Text style={styles.boldText}>b) Prosedur Pengajuan:{"\n"}</Text>
          • Pengajuan harus dilakukan melalui aplikasi Validin{"\n"}
          • Isi formulir pengajuan dengan lengkap dan akurat{"\n"}
          • Lampirkan dokumen pendukung jika diperlukan{"\n"}
          • Tunggu persetujuan dari admin atau atasan yang berwenang{"\n"}
          • Anda akan menerima notifikasi status pengajuan (disetujui/ditolak)
          {"\n\n"}
          <Text style={styles.boldText}>c) Persetujuan dan Penolakan:{"\n"}</Text>
          • Admin atau atasan berhak menyetujui atau menolak pengajuan{"\n"}
          • Penolakan harus disertai alasan yang jelas{"\n"}
          • Pengajuan yang disetujui akan tercatat dalam sistem{"\n"}
          • Penyalahgunaan pengajuan dapat mengakibatkan sanksi
        </Text>
        
        <Text style={styles.sectionTitle}>7. Absensi Dinas</Text>
        <Text style={styles.bodyText}>
          <Text style={styles.boldText}>a) Jenis Dinas:{"\n"}</Text>
          • Dinas Lokal: Kegiatan di dalam kota/wilayah kerja{"\n"}
          • Dinas Luar Kota: Kegiatan di luar kota/wilayah kerja{"\n"}
          • Dinas Luar Negeri: Kegiatan di luar negeri
          {"\n\n"}
          <Text style={styles.boldText}>b) Validasi Dinas:{"\n"}</Text>
          • Admin akan membuat kegiatan dinas dengan lokasi dan waktu yang ditentukan{"\n"}
          • Pegawai yang ditugaskan akan menerima notifikasi{"\n"}
          • Absensi dinas dilakukan di lokasi yang telah ditentukan{"\n"}
          • Sistem akan memvalidasi lokasi GPS sesuai radius yang ditetapkan{"\n"}
          • Riwayat absensi dinas dapat dilihat di menu dinas
        </Text>
        
        <Text style={styles.sectionTitle}>8. Larangan Penggunaan</Text>
        <Text style={styles.bodyText}>
          Pengguna dilarang keras melakukan tindakan berikut:
          {"\n\n"}
          • Memberikan informasi palsu atau menyesatkan{"\n"}
          • Menggunakan akun orang lain atau membagikan akun Anda{"\n"}
          • Melakukan absensi untuk orang lain (titip absen){"\n"}
          • Memanipulasi lokasi GPS atau foto absensi{"\n"}
          • Menggunakan aplikasi pihak ketiga untuk memanipulasi sistem{"\n"}
          • Mengakses atau mencoba mengakses data yang bukan milik Anda{"\n"}
          • Mengganggu, merusak, atau mencoba meretas sistem Validin{"\n"}
          • Menyebarkan malware, virus, atau kode berbahaya{"\n"}
          • Menggunakan aplikasi untuk tujuan ilegal atau melanggar hukum{"\n"}
          • Menyalahgunakan fitur pengajuan untuk kepentingan pribadi{"\n"}
          • Melakukan spam atau mengirim notifikasi yang tidak perlu
        </Text>
        
        <Text style={styles.sectionTitle}>9. Keamanan Akun</Text>
        <Text style={styles.bodyText}>
          <Text style={styles.boldText}>a) Tanggung Jawab Keamanan:{"\n"}</Text>
          • Anda bertanggung jawab penuh atas keamanan akun dan password Anda{"\n"}
          • Jangan bagikan password kepada siapa pun, termasuk admin{"\n"}
          • Gunakan password yang kuat dengan kombinasi huruf, angka, dan simbol{"\n"}
          • Ubah password secara berkala untuk keamanan optimal{"\n"}
          • Logout setelah selesai menggunakan aplikasi di perangkat bersama
          {"\n\n"}
          <Text style={styles.boldText}>b) Aktivitas Mencurigakan:{"\n"}</Text>
          • Laporkan segera jika Anda mencurigai akun Anda diakses oleh pihak lain{"\n"}
          • Hubungi admin atau tim support jika terjadi masalah keamanan{"\n"}
          • Sistem akan mencatat log aktivitas untuk audit dan pelacakan{"\n"}
          • Akun yang terdeteksi melakukan aktivitas mencurigakan dapat ditangguhkan
        </Text>
        
        <Text style={styles.sectionTitle}>10. Hak Kekayaan Intelektual</Text>
        <Text style={styles.bodyText}>
          Seluruh konten, desain, logo, kode program, dan fitur aplikasi Validin adalah hak kekayaan intelektual yang dilindungi oleh hukum. Pengguna tidak diperkenankan:
          {"\n\n"}
          • Menyalin, memodifikasi, atau mendistribusikan aplikasi tanpa izin{"\n"}
          • Melakukan reverse engineering atau dekompilasi kode aplikasi{"\n"}
          • Menggunakan logo atau merek Validin tanpa izin tertulis{"\n"}
          • Membuat aplikasi serupa atau turunan dari Validin{"\n"}
          • Mengklaim kepemilikan atas aplikasi atau fitur Validin
        </Text>
        
        <Text style={styles.sectionTitle}>11. Privasi dan Perlindungan Data</Text>
        <Text style={styles.bodyText}>
          Penggunaan data pribadi Anda diatur dalam Kebijakan Privasi yang terpisah. Dengan menggunakan aplikasi Validin, Anda menyetujui pengumpulan, penggunaan, dan penyimpanan data sesuai dengan Kebijakan Privasi.
          {"\n\n"}
          <Text style={styles.boldText}>Poin Penting:{"\n"}</Text>
          • Data Anda akan digunakan untuk validasi kehadiran dan manajemen kepegawaian{"\n"}
          • Lokasi GPS dan foto absensi akan disimpan sebagai bukti kehadiran{"\n"}
          • Data dapat diakses oleh admin dan pihak yang berwenang{"\n"}
          • Kami menerapkan standar keamanan tinggi untuk melindungi data Anda{"\n"}
          • Anda memiliki hak untuk mengakses dan memperbarui data pribadi Anda
        </Text>
        
        <Text style={styles.sectionTitle}>12. Sanksi dan Penangguhan Akun</Text>
        <Text style={styles.bodyText}>
          <Text style={styles.boldText}>a) Pelanggaran Ringan:{"\n"}</Text>
          • Peringatan tertulis melalui notifikasi aplikasi{"\n"}
          • Pembatasan akses sementara ke fitur tertentu{"\n"}
          • Kewajiban untuk memperbaiki pelanggaran dalam waktu yang ditentukan
          {"\n\n"}
          <Text style={styles.boldText}>b) Pelanggaran Berat:{"\n"}</Text>
          • Penangguhan akun sementara atau permanen{"\n"}
          • Pencabutan hak akses ke aplikasi Validin{"\n"}
          • Pelaporan ke pihak berwenang jika melanggar hukum{"\n"}
          • Tindakan hukum sesuai dengan peraturan yang berlaku
          {"\n\n"}
          <Text style={styles.boldText}>c) Contoh Pelanggaran Berat:{"\n"}</Text>
          • Manipulasi data absensi atau pengajuan{"\n"}
          • Penggunaan akun orang lain atau titip absen{"\n"}
          • Percobaan meretas atau merusak sistem{"\n"}
          • Penyalahgunaan data pribadi pegawai lain{"\n"}
          • Tindakan yang merugikan organisasi atau pengguna lain
        </Text>
        
        <Text style={styles.sectionTitle}>13. Pembaruan dan Pemeliharaan Sistem</Text>
        <Text style={styles.bodyText}>
          <Text style={styles.boldText}>a) Pembaruan Aplikasi:{"\n"}</Text>
          • Kami berhak melakukan pembaruan aplikasi untuk perbaikan dan peningkatan fitur{"\n"}
          • Pengguna disarankan untuk selalu menggunakan versi terbaru aplikasi{"\n"}
          • Pembaruan penting akan diberitahukan melalui notifikasi{"\n"}
          • Versi lama mungkin tidak didukung setelah pembaruan mayor
          {"\n\n"}
          <Text style={styles.boldText}>b) Pemeliharaan Sistem:{"\n"}</Text>
          • Kami dapat melakukan pemeliharaan sistem secara berkala{"\n"}
          • Pemeliharaan terjadwal akan diberitahukan sebelumnya{"\n"}
          • Akses aplikasi mungkin terbatas selama pemeliharaan{"\n"}
          • Kami akan berusaha meminimalkan gangguan layanan
        </Text>
        
        <Text style={styles.sectionTitle}>14. Penghentian Layanan</Text>
        <Text style={styles.bodyText}>
          <Text style={styles.boldText}>a) Penghentian oleh Pengguna:{"\n"}</Text>
          • Anda dapat berhenti menggunakan aplikasi kapan saja{"\n"}
          • Hubungi admin untuk menonaktifkan akun Anda{"\n"}
          • Data Anda akan diarsipkan sesuai kebijakan retensi data
          {"\n\n"}
          <Text style={styles.boldText}>b) Penghentian oleh Validin:{"\n"}</Text>
          • Kami berhak menghentikan atau membatasi akses Anda jika terjadi pelanggaran{"\n"}
          • Kami dapat menghentikan layanan jika organisasi tidak lagi menggunakan Validin{"\n"}
          • Penghentian layanan akan diberitahukan sebelumnya jika memungkinkan{"\n"}
          • Data akan diarsipkan atau dihapus sesuai dengan kebijakan yang berlaku
        </Text>
        
        <Text style={styles.sectionTitle}>15. Batasan Tanggung Jawab</Text>
        <Text style={styles.bodyText}>
          <Text style={styles.boldText}>a) Ketersediaan Layanan:{"\n"}</Text>
          • Kami berusaha menjaga aplikasi tetap tersedia 24/7, namun tidak menjamin 100% uptime{"\n"}
          • Gangguan layanan dapat terjadi karena pemeliharaan, masalah teknis, atau force majeure{"\n"}
          • Kami tidak bertanggung jawab atas kerugian akibat gangguan layanan yang di luar kendali kami
          {"\n\n"}
          <Text style={styles.boldText}>b) Akurasi Data:{"\n"}</Text>
          • Kami berusaha menjaga akurasi data, namun tidak menjamin 100% bebas dari kesalahan{"\n"}
          • Pengguna bertanggung jawab untuk memverifikasi data mereka sendiri{"\n"}
          • Laporkan segera jika ada ketidakakuratan data
          {"\n\n"}
          <Text style={styles.boldText}>c) Kerugian:{"\n"}</Text>
          • Kami tidak bertanggung jawab atas kerugian langsung atau tidak langsung akibat penggunaan aplikasi{"\n"}
          • Tanggung jawab kami terbatas pada perbaikan layanan atau pengembalian biaya (jika berlaku){"\n"}
          • Pengguna menggunakan aplikasi dengan risiko sendiri
        </Text>
        
        <Text style={styles.sectionTitle}>16. Perubahan Syarat dan Ketentuan</Text>
        <Text style={styles.bodyText}>
          Kami berhak mengubah Syarat dan Ketentuan ini sewaktu-waktu untuk menyesuaikan dengan:
          {"\n\n"}
          • Perubahan fitur atau fungsi aplikasi Validin{"\n"}
          • Perubahan regulasi dan hukum yang berlaku{"\n"}
          • Peningkatan keamanan dan perlindungan pengguna{"\n"}
          • Kebijakan organisasi yang menggunakan Validin
          {"\n\n"}
          Perubahan penting akan diberitahukan melalui notifikasi aplikasi dan email. Penggunaan aplikasi setelah perubahan berarti Anda menyetujui Syarat dan Ketentuan yang diperbarui. Jika Anda tidak setuju, Anda harus berhenti menggunakan aplikasi.
        </Text>
        
        <Text style={styles.sectionTitle}>17. Hukum yang Berlaku</Text>
        <Text style={styles.bodyText}>
          Syarat dan Ketentuan ini diatur dan ditafsirkan sesuai dengan hukum Republik Indonesia. Setiap perselisihan yang timbul akan diselesaikan melalui:
          {"\n\n"}
          • Musyawarah dan negosiasi antara pihak yang bersengketa{"\n"}
          • Mediasi oleh pihak ketiga yang netral{"\n"}
          • Arbitrase sesuai dengan ketentuan yang berlaku{"\n"}
          • Pengadilan yang berwenang di wilayah hukum Indonesia
        </Text>
        
        <Text style={styles.sectionTitle}>18. Kontak dan Dukungan</Text>
        <Text style={styles.bodyText}>
          Jika Anda memiliki pertanyaan, keluhan, atau memerlukan bantuan terkait Syarat dan Ketentuan ini, silakan hubungi:
          {"\n\n"}
          <Text style={styles.boldText}>Email:</Text> support@validin.id{"\n"}
          <Text style={styles.boldText}>Layanan Bantuan:</Text> Tersedia di menu Bantuan aplikasi Validin{"\n"}
          <Text style={styles.boldText}>Admin Organisasi:</Text> Hubungi admin sistem di organisasi Anda
          {"\n\n"}
          Kami akan merespons pertanyaan Anda dalam waktu 3-5 hari kerja.
        </Text>
        
        <Text style={styles.footerText}>
          Dengan menggunakan aplikasi Validin, Anda menyatakan telah membaca, memahami, dan menyetujui seluruh isi Syarat dan Ketentuan ini. Jika Anda tidak setuju, Anda tidak diperkenankan menggunakan aplikasi.
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
