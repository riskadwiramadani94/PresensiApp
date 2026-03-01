-- FAQ ADMIN (70 FAQ)
-- Kategori: pegawai_akun, validasi, kelola_dinas, laporan, pengaturan, tracking

-- ========================================
-- KATEGORI: PEGAWAI & AKUN (12 FAQ)
-- ========================================
INSERT INTO faq (kategori, pertanyaan, jawaban, urutan, role) VALUES
('pegawai_akun', 'Bagaimana cara menambah pegawai baru?', 'Buka menu Pegawai > Tambah Pegawai, isi data lengkap pegawai, lalu klik Simpan.', 1, 'admin'),
('pegawai_akun', 'Bagaimana cara mengedit data pegawai?', 'Buka menu Pegawai, pilih pegawai yang ingin diedit, klik Edit, ubah data, lalu Simpan.', 2, 'admin'),
('pegawai_akun', 'Bagaimana cara menghapus akun pegawai?', 'Buka menu Pegawai, pilih pegawai, klik Hapus. Data pegawai akan dinonaktifkan.', 3, 'admin'),
('pegawai_akun', 'Bagaimana cara reset password pegawai?', 'Buka detail pegawai, klik Reset Password. Password baru akan dikirim ke email pegawai.', 4, 'admin'),
('pegawai_akun', 'Bagaimana cara melihat riwayat absensi pegawai?', 'Buka detail pegawai, pilih tab Riwayat Absensi untuk melihat histori kehadiran.', 5, 'admin'),
('pegawai_akun', 'Bagaimana cara mengatur jam kerja pegawai?', 'Buka menu Pengaturan > Jam Kerja, pilih pegawai, atur jam masuk dan pulang.', 6, 'admin'),
('pegawai_akun', 'Apa yang harus dilakukan jika data pegawai tidak muncul?', 'Pastikan pegawai sudah terdaftar dan status akun aktif. Coba refresh halaman.', 7, 'admin'),
('pegawai_akun', 'Bagaimana cara mengaktifkan kembali akun pegawai yang dinonaktifkan?', 'Buka menu Pegawai, filter status Non-Aktif, pilih pegawai, klik Aktifkan.', 8, 'admin'),
('pegawai_akun', 'Bagaimana cara melihat detail profil pegawai?', 'Klik nama pegawai di daftar untuk melihat detail lengkap profil dan riwayat.', 9, 'admin'),
('pegawai_akun', 'Bagaimana cara export data pegawai?', 'Buka menu Pegawai, klik tombol Export untuk download data dalam format Excel.', 10, 'admin'),
('pegawai_akun', 'Bagaimana cara filter pegawai berdasarkan divisi?', 'Gunakan filter Divisi di halaman Pegawai untuk menampilkan pegawai per divisi.', 11, 'admin'),
('pegawai_akun', 'Bagaimana cara mencari pegawai tertentu?', 'Gunakan kolom pencarian di halaman Pegawai, ketik nama atau NIP pegawai.', 12, 'admin'),

-- ========================================
-- KATEGORI: VALIDASI & PERSETUJUAN (15 FAQ)
-- ========================================
('validasi', 'Bagaimana cara menyetujui pengajuan izin?', 'Buka menu Pengajuan, pilih izin yang akan disetujui, klik Setujui, tambahkan catatan jika perlu.', 1, 'admin'),
('validasi', 'Bagaimana cara menolak pengajuan izin?', 'Buka menu Pengajuan, pilih izin, klik Tolak, wajib isi alasan penolakan.', 2, 'admin'),
('validasi', 'Bagaimana cara melihat detail pengajuan?', 'Klik pada item pengajuan untuk melihat detail lengkap termasuk dokumen pendukung.', 3, 'admin'),
('validasi', 'Apa yang harus dilakukan jika ada pengajuan mendesak?', 'Gunakan filter Mendesak atau cek notifikasi untuk pengajuan prioritas tinggi.', 4, 'admin'),
('validasi', 'Bagaimana cara validasi lembur pegawai?', 'Buka menu Pengajuan > Lembur, verifikasi jam lembur, lalu Setujui atau Tolak.', 5, 'admin'),
('validasi', 'Bagaimana cara melihat riwayat persetujuan?', 'Buka menu Pengajuan, pilih tab Riwayat untuk melihat semua pengajuan yang sudah diproses.', 6, 'admin'),
('validasi', 'Apa perbedaan izin sakit dan izin pribadi?', 'Izin sakit memerlukan surat dokter, izin pribadi untuk keperluan non-medis.', 7, 'admin'),
('validasi', 'Bagaimana cara validasi cuti tahunan?', 'Cek sisa cuti pegawai, verifikasi tanggal, lalu setujui jika memenuhi syarat.', 8, 'admin'),
('validasi', 'Bagaimana jika pegawai tidak upload dokumen pendukung?', 'Tolak pengajuan dengan alasan dokumen tidak lengkap, minta pegawai upload ulang.', 9, 'admin'),
('validasi', 'Bagaimana cara batch approval untuk banyak pengajuan?', 'Centang beberapa pengajuan, lalu klik Setujui Semua untuk approval massal.', 10, 'admin'),
('validasi', 'Bagaimana cara melihat pengajuan yang pending?', 'Filter status Pending di menu Pengajuan untuk melihat yang belum diproses.', 11, 'admin'),
('validasi', 'Apa yang harus dilakukan jika salah approve?', 'Hubungi IT untuk membatalkan approval, atau tolak pengajuan dengan alasan koreksi.', 12, 'admin'),
('validasi', 'Bagaimana cara notifikasi pegawai setelah approval?', 'Sistem otomatis mengirim notifikasi ke pegawai setelah pengajuan diproses.', 13, 'admin'),
('validasi', 'Bagaimana cara validasi izin dengan dokumen foto?', 'Klik dokumen untuk melihat foto, verifikasi keaslian, lalu proses pengajuan.', 14, 'admin'),
('validasi', 'Bagaimana cara melihat statistik approval?', 'Buka menu Laporan > Statistik Pengajuan untuk melihat data approval.', 15, 'admin'),

-- ========================================
-- KATEGORI: KELOLA DINAS (12 FAQ)
-- ========================================
('kelola_dinas', 'Bagaimana cara membuat kegiatan dinas baru?', 'Buka menu Dinas > Tambah Dinas, isi detail kegiatan, pilih peserta, lalu Simpan.', 1, 'admin'),
('kelola_dinas', 'Bagaimana cara mengedit kegiatan dinas?', 'Buka menu Dinas, pilih kegiatan, klik Edit, ubah data, lalu Simpan.', 2, 'admin'),
('kelola_dinas', 'Bagaimana cara menambah peserta dinas?', 'Edit kegiatan dinas, pilih Tambah Peserta, centang pegawai, lalu Simpan.', 3, 'admin'),
('kelola_dinas', 'Bagaimana cara menghapus kegiatan dinas?', 'Pilih kegiatan dinas, klik Hapus. Kegiatan yang sudah berjalan tidak bisa dihapus.', 4, 'admin'),
('kelola_dinas', 'Bagaimana cara melihat lokasi pegawai saat dinas?', 'Buka detail dinas, klik Tracking untuk melihat lokasi real-time peserta.', 5, 'admin'),
('kelola_dinas', 'Bagaimana cara mengatur anggaran dinas?', 'Saat membuat dinas, isi kolom Anggaran dengan nominal yang dialokasikan.', 6, 'admin'),
('kelola_dinas', 'Bagaimana cara melihat riwayat dinas pegawai?', 'Buka detail pegawai, pilih tab Riwayat Dinas untuk melihat histori kegiatan.', 7, 'admin'),
('kelola_dinas', 'Bagaimana cara export laporan dinas?', 'Buka menu Dinas, klik Export untuk download laporan dalam format Excel/PDF.', 8, 'admin'),
('kelola_dinas', 'Bagaimana cara filter dinas berdasarkan tanggal?', 'Gunakan filter Tanggal di halaman Dinas untuk menampilkan kegiatan per periode.', 9, 'admin'),
('kelola_dinas', 'Bagaimana cara membatalkan dinas yang sudah dibuat?', 'Edit kegiatan dinas, ubah status menjadi Dibatalkan, isi alasan pembatalan.', 10, 'admin'),
('kelola_dinas', 'Bagaimana cara melihat detail peserta dinas?', 'Klik nama peserta di detail dinas untuk melihat profil dan riwayat kehadiran.', 11, 'admin'),
('kelola_dinas', 'Bagaimana cara notifikasi peserta dinas?', 'Sistem otomatis mengirim notifikasi ke peserta saat dinas dibuat atau diubah.', 12, 'admin'),

-- ========================================
-- KATEGORI: LAPORAN (10 FAQ)
-- ========================================
('laporan', 'Bagaimana cara melihat laporan absensi harian?', 'Buka menu Laporan > Absensi, pilih tanggal, klik Tampilkan untuk melihat data.', 1, 'admin'),
('laporan', 'Bagaimana cara export laporan ke Excel?', 'Setelah menampilkan laporan, klik tombol Export Excel di pojok kanan atas.', 2, 'admin'),
('laporan', 'Bagaimana cara melihat laporan bulanan?', 'Pilih filter Bulan di menu Laporan, pilih bulan dan tahun, lalu Tampilkan.', 3, 'admin'),
('laporan', 'Bagaimana cara melihat laporan per pegawai?', 'Gunakan filter Pegawai di menu Laporan untuk melihat data individual.', 4, 'admin'),
('laporan', 'Bagaimana cara melihat statistik kehadiran?', 'Buka menu Laporan > Statistik untuk melihat grafik dan persentase kehadiran.', 5, 'admin'),
('laporan', 'Bagaimana cara melihat laporan lembur?', 'Buka menu Laporan > Lembur untuk melihat total jam dan biaya lembur.', 6, 'admin'),
('laporan', 'Bagaimana cara melihat laporan izin dan cuti?', 'Buka menu Laporan > Izin/Cuti untuk melihat riwayat pengajuan pegawai.', 7, 'admin'),
('laporan', 'Bagaimana cara print laporan?', 'Setelah menampilkan laporan, klik tombol Print untuk mencetak dokumen.', 8, 'admin'),
('laporan', 'Bagaimana cara melihat laporan keterlambatan?', 'Buka menu Laporan > Keterlambatan untuk melihat pegawai yang terlambat.', 9, 'admin'),
('laporan', 'Bagaimana cara filter laporan berdasarkan divisi?', 'Gunakan filter Divisi di menu Laporan untuk menampilkan data per departemen.', 10, 'admin'),

-- ========================================
-- KATEGORI: PENGATURAN (12 FAQ)
-- ========================================
('pengaturan', 'Bagaimana cara mengatur jam kerja kantor?', 'Buka menu Pengaturan > Jam Kerja, atur jam masuk dan pulang default.', 1, 'admin'),
('pengaturan', 'Bagaimana cara menambah lokasi kantor?', 'Buka menu Pengaturan > Lokasi Kantor, klik Tambah, pilih lokasi di peta, Simpan.', 2, 'admin'),
('pengaturan', 'Bagaimana cara mengatur radius absensi?', 'Edit lokasi kantor, atur Radius (dalam meter) untuk jangkauan absensi.', 3, 'admin'),
('pengaturan', 'Bagaimana cara menambah hari libur?', 'Buka menu Pengaturan > Kalender Libur, pilih tanggal, isi keterangan, Simpan.', 4, 'admin'),
('pengaturan', 'Bagaimana cara mengatur toleransi keterlambatan?', 'Buka menu Pengaturan > Jam Kerja, atur Toleransi Terlambat (dalam menit).', 5, 'admin'),
('pengaturan', 'Bagaimana cara mengubah logo perusahaan?', 'Buka menu Pengaturan > Profil Perusahaan, upload logo baru, lalu Simpan.', 6, 'admin'),
('pengaturan', 'Bagaimana cara mengatur notifikasi sistem?', 'Buka menu Pengaturan > Notifikasi, aktifkan/nonaktifkan jenis notifikasi.', 7, 'admin'),
('pengaturan', 'Bagaimana cara backup data?', 'Buka menu Pengaturan > Backup, klik Backup Sekarang untuk menyimpan data.', 8, 'admin'),
('pengaturan', 'Bagaimana cara mengatur shift kerja?', 'Buka menu Pengaturan > Shift, tambah shift baru dengan jam kerja berbeda.', 9, 'admin'),
('pengaturan', 'Bagaimana cara mengatur cuti tahunan?', 'Buka menu Pengaturan > Cuti, atur jumlah hari cuti default per tahun.', 10, 'admin'),
('pengaturan', 'Bagaimana cara menghapus lokasi kantor?', 'Buka menu Pengaturan > Lokasi Kantor, pilih lokasi, klik Hapus.', 11, 'admin'),
('pengaturan', 'Bagaimana cara mengatur format laporan?', 'Buka menu Pengaturan > Laporan, pilih format default (Excel/PDF).', 12, 'admin'),

-- ========================================
-- KATEGORI: UMUM (9 FAQ) - role='both'
-- ========================================
('umum', 'Bagaimana cara logout dari aplikasi?', 'Buka menu Profil, scroll ke bawah, klik tombol Logout.', 1, 'both'),
('umum', 'Bagaimana cara mengganti password?', 'Buka menu Profil > Edit Profil, klik Ubah Password, masukkan password lama dan baru.', 2, 'both'),
('umum', 'Apa yang harus dilakukan jika lupa password?', 'Klik Lupa Password di halaman login, masukkan email, ikuti instruksi reset.', 3, 'both'),
('umum', 'Bagaimana cara update aplikasi?', 'Buka Play Store/App Store, cari aplikasi, klik Update jika tersedia.', 4, 'both'),
('umum', 'Bagaimana cara menghubungi support?', 'Buka menu Bantuan, pilih metode kontak (WhatsApp/Email/Telepon).', 5, 'both'),
('umum', 'Apa yang harus dilakukan jika aplikasi error?', 'Coba tutup dan buka ulang aplikasi. Jika masih error, hubungi support.', 6, 'both'),
('umum', 'Bagaimana cara melihat versi aplikasi?', 'Buka menu Profil, scroll ke bawah untuk melihat nomor versi aplikasi.', 7, 'both'),
('umum', 'Apakah data saya aman?', 'Ya, semua data dienkripsi dan disimpan dengan standar keamanan tinggi.', 8, 'both'),
('umum', 'Bagaimana cara mengaktifkan notifikasi?', 'Buka Pengaturan HP > Aplikasi > Hadirin > Notifikasi, aktifkan semua notifikasi.', 9, 'both');
