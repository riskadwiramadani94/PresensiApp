-- ========================================
-- INSERT FAQ DATA - HADIRINAPP
-- Total: 80 FAQ
-- ========================================

-- ========================================
-- FAQ KATEGORI: PRESENSI (15 FAQ)
-- ========================================
INSERT INTO faq (kategori, pertanyaan, jawaban, urutan) VALUES
('presensi', 'Bagaimana cara melakukan presensi masuk?', 'Buka menu Presensi (tombol tengah), pastikan GPS aktif, ambil foto selfie, lalu tekan tombol Absen Masuk. Pastikan Anda berada dalam radius lokasi kantor.', 1),
('presensi', 'Bagaimana cara melakukan presensi pulang?', 'Buka menu Presensi, ambil foto selfie, lalu tekan tombol Absen Pulang. Presensi pulang hanya bisa dilakukan setelah Anda melakukan presensi masuk.', 2),
('presensi', 'Berapa radius lokasi yang diperbolehkan untuk absen?', 'Radius lokasi ditentukan oleh admin, biasanya 50-200 meter dari titik lokasi kantor. Anda akan melihat notifikasi jika berada di luar radius.', 3),
('presensi', 'Apa yang harus dilakukan jika lupa absen masuk?', 'Segera hubungi admin/HRD untuk melakukan pengajuan retrospektif. Anda perlu memberikan alasan dan bukti pendukung.', 4),
('presensi', 'Apa yang harus dilakukan jika lupa absen pulang?', 'Hubungi admin/HRD untuk koreksi data presensi. Sistem akan mencatat jam pulang default jika tidak ada absen pulang.', 5),
('presensi', 'Mengapa foto selfie diperlukan saat presensi?', 'Foto selfie digunakan untuk verifikasi kehadiran dan memastikan bahwa yang melakukan presensi adalah pegawai yang bersangkutan.', 6),
('presensi', 'Apa perbedaan status Hadir dan Terlambat?', 'Status Hadir jika absen sebelum batas waktu yang ditentukan. Status Terlambat jika absen setelah batas waktu (biasanya 08:30).', 7),
('presensi', 'Bagaimana jika lokasi GPS tidak akurat?', 'Pastikan GPS aktif dan izin lokasi diberikan ke aplikasi. Coba keluar ruangan atau restart aplikasi. Jika masih bermasalah, hubungi admin.', 8),
('presensi', 'Jam berapa batas waktu absen masuk?', 'Batas waktu absen masuk biasanya 08:30 WIB. Setelah jam tersebut, status akan berubah menjadi Terlambat. Cek jam kerja di dashboard.', 9),
('presensi', 'Apakah bisa absen jika sedang dinas?', 'Ya, gunakan menu Dinas untuk absen saat perjalanan dinas. Lokasi absen akan disesuaikan dengan lokasi dinas yang ditentukan.', 10),
('presensi', 'Bagaimana cara melihat riwayat presensi?', 'Buka menu Presensi dari dashboard, pilih "Riwayat Presensi". Anda bisa filter berdasarkan harian, mingguan, bulanan, atau tahunan.', 11),
('presensi', 'Apa itu status "Belum Waktunya"?', 'Status ini muncul untuk tanggal yang belum tiba atau di luar jam kerja. Presensi hanya bisa dilakukan pada hari dan jam kerja yang ditentukan.', 12),
('presensi', 'Bagaimana cara melihat laporan presensi bulanan?', 'Buka Riwayat Presensi, pilih "Laporan Bulanan", lalu pilih bulan dan tahun yang diinginkan. Anda akan melihat statistik lengkap.', 13),
('presensi', 'Apa yang dimaksud dengan total jam kerja?', 'Total jam kerja adalah akumulasi waktu dari absen masuk hingga absen pulang dalam periode tertentu (harian/bulanan).', 14),
('presensi', 'Bagaimana cara filter riwayat presensi?', 'Di halaman Riwayat Presensi, klik tombol filter di atas. Pilih jenis laporan (harian/mingguan/bulanan/tahunan) dan periode yang diinginkan.', 15);

-- ========================================
-- FAQ KATEGORI: PENGAJUAN (18 FAQ)
-- ========================================
INSERT INTO faq (kategori, pertanyaan, jawaban, urutan) VALUES
('pengajuan', 'Bagaimana cara mengajukan izin datang terlambat?', 'Buka menu Pengajuan > Tambah Pengajuan, pilih "Izin Datang Terlambat", isi tanggal, jam rencana datang, dan alasan. Klik Kirim Pengajuan.', 1),
('pengajuan', 'Bagaimana cara mengajukan izin pulang cepat?', 'Buka menu Pengajuan > Tambah Pengajuan, pilih "Izin Pulang Cepat", isi tanggal, jam rencana pulang, dan alasan. Klik Kirim Pengajuan.', 2),
('pengajuan', 'Bagaimana cara mengajukan cuti sakit?', 'Buka menu Pengajuan > Tambah Pengajuan, pilih "Cuti Sakit", isi periode cuti, upload surat dokter (opsional), dan alasan. Klik Kirim.', 3),
('pengajuan', 'Bagaimana cara mengajukan cuti tahunan?', 'Buka menu Pengajuan > Tambah Pengajuan, pilih "Cuti Tahunan", isi periode cuti dan alasan. Pastikan kuota cuti tahunan Anda masih tersedia.', 4),
('pengajuan', 'Bagaimana cara mengajukan cuti alasan penting?', 'Buka menu Pengajuan > Tambah Pengajuan, pilih "Cuti Alasan Penting", isi periode dan alasan yang jelas. Contoh: acara keluarga, keperluan mendesak.', 5),
('pengajuan', 'Bagaimana cara mengajukan lembur?', 'Buka menu Pengajuan > Tambah Pengajuan, pilih "Lembur", isi periode lembur, jam mulai-selesai, dan alasan. Tunggu persetujuan sebelum melakukan absen lembur.', 6),
('pengajuan', 'Berapa lama proses persetujuan pengajuan?', 'Proses persetujuan biasanya 1-3 hari kerja. Anda akan mendapat notifikasi di Kotak Masuk saat pengajuan disetujui atau ditolak.', 7),
('pengajuan', 'Apakah bisa membatalkan pengajuan yang sudah diajukan?', 'Pengajuan yang masih berstatus "Menunggu" bisa dibatalkan dengan menghubungi admin. Pengajuan yang sudah disetujui/ditolak tidak bisa dibatalkan.', 8),
('pengajuan', 'Apa itu pengajuan retrospektif?', 'Pengajuan retrospektif adalah pengajuan yang dibuat setelah tanggal kejadian berlalu. Ditandai dengan badge "Telat Ngajuin" dan memerlukan persetujuan khusus.', 9),
('pengajuan', 'Apakah perlu melampirkan dokumen untuk pengajuan?', 'Untuk Cuti Sakit, disarankan melampirkan surat dokter. Untuk pengajuan lain, dokumen bersifat opsional tergantung kebijakan perusahaan.', 10),
('pengajuan', 'Bagaimana cara melihat status pengajuan?', 'Buka menu Pengajuan, Anda akan melihat daftar pengajuan dengan status: Menunggu (orange), Disetujui (hijau), atau Ditolak (merah).', 11),
('pengajuan', 'Apa yang harus dilakukan jika pengajuan ditolak?', 'Lihat catatan admin di detail pengajuan untuk mengetahui alasan penolakan. Anda bisa mengajukan ulang dengan perbaikan sesuai catatan.', 12),
('pengajuan', 'Bagaimana cara upload surat dokter untuk cuti sakit?', 'Saat mengisi form Cuti Sakit, klik tombol "Upload Surat Dokter", pilih foto dari galeri atau ambil foto langsung. Ukuran maksimal 5MB.', 13),
('pengajuan', 'Apa perbedaan cuti sakit dan cuti alasan penting?', 'Cuti Sakit untuk kondisi kesehatan (perlu surat dokter). Cuti Alasan Penting untuk keperluan mendesak non-kesehatan (acara keluarga, dll).', 14),
('pengajuan', 'Bagaimana cara melihat catatan admin pada pengajuan?', 'Klik pengajuan yang ingin dilihat, scroll ke bawah ke bagian "Catatan Admin". Catatan akan muncul jika admin memberikan keterangan.', 15),
('pengajuan', 'Apa yang dimaksud dengan "Telat Ngajuin"?', 'Badge ini muncul jika Anda mengajukan izin/cuti setelah tanggal kejadian. Contoh: mengajukan izin tanggal 1 pada tanggal 3.', 16),
('pengajuan', 'Bagaimana cara filter pengajuan berdasarkan status?', 'Di halaman Pengajuan, klik icon filter (3 garis horizontal), pilih status: Semua, Menunggu, Disetujui, atau Ditolak.', 17),
('pengajuan', 'Bagaimana cara mencari pengajuan tertentu?', 'Gunakan kolom pencarian di atas daftar pengajuan. Anda bisa cari berdasarkan jenis pengajuan, tanggal, atau kata kunci dalam alasan.', 18);

-- ========================================
-- FAQ KATEGORI: DINAS (12 FAQ)
-- ========================================
INSERT INTO faq (kategori, pertanyaan, jawaban, urutan) VALUES
('dinas', 'Apa itu kegiatan dinas?', 'Kegiatan dinas adalah penugasan resmi dari perusahaan untuk melakukan pekerjaan di luar lokasi kantor, bisa lokal, luar kota, atau luar negeri.', 1),
('dinas', 'Bagaimana cara melihat jadwal dinas saya?', 'Buka menu Dinas dari dashboard. Anda akan melihat daftar kegiatan dinas dengan status: Akan Datang, Berlangsung, atau Selesai.', 2),
('dinas', 'Apa perbedaan dinas lokal, luar kota, dan luar negeri?', 'Dinas Lokal: dalam kota. Dinas Luar Kota: antar kota/provinsi. Dinas Luar Negeri: ke negara lain. Perbedaan ada pada tunjangan dan prosedur.', 3),
('dinas', 'Apa itu Nomor SPT?', 'SPT (Surat Perintah Tugas) adalah nomor resmi penugasan dinas. Setiap kegiatan dinas memiliki nomor SPT unik sebagai bukti penugasan resmi.', 4),
('dinas', 'Bagaimana cara absen saat dinas?', 'Saat berada di lokasi dinas, buka menu Dinas, pilih kegiatan yang sedang berlangsung, lalu klik Absen Masuk/Pulang sesuai jadwal.', 5),
('dinas', 'Apakah bisa absen dinas di beberapa lokasi?', 'Ya, jika kegiatan dinas mencakup beberapa lokasi, admin akan mengatur multiple lokasi. Anda bisa absen di lokasi mana saja yang sudah ditentukan.', 6),
('dinas', 'Bagaimana jika lokasi dinas berbeda dengan yang tertera?', 'Hubungi admin segera untuk update lokasi dinas. Absen di luar lokasi yang ditentukan akan ditolak sistem atau perlu validasi manual.', 7),
('dinas', 'Apa yang dimaksud status "Akan Datang", "Berlangsung", dan "Selesai"?', 'Akan Datang: dinas belum dimulai. Berlangsung: dinas sedang berjalan (bisa absen). Selesai: dinas sudah berakhir (tidak bisa absen).', 8),
('dinas', 'Bagaimana cara melihat detail kegiatan dinas?', 'Klik card kegiatan dinas di daftar. Anda akan melihat detail lengkap: nama kegiatan, nomor SPT, periode, lokasi, dan peserta.', 9),
('dinas', 'Bagaimana cara filter kegiatan dinas?', 'Klik icon filter di halaman Dinas, pilih status: Semua, Akan Datang, Berlangsung, atau Selesai untuk melihat dinas sesuai kategori.', 10),
('dinas', 'Apakah absen dinas perlu validasi?', 'Ya, absen dinas akan divalidasi oleh admin untuk memastikan kehadiran sesuai dengan lokasi dan jadwal yang ditentukan.', 11),
('dinas', 'Bagaimana jika tidak bisa mengikuti dinas yang sudah dijadwalkan?', 'Segera hubungi admin/atasan untuk memberitahu. Anda mungkin perlu mengajukan izin atau akan ada penggantian peserta dinas.', 12);

-- ========================================
-- FAQ KATEGORI: LEMBUR (15 FAQ)
-- ========================================
INSERT INTO faq (kategori, pertanyaan, jawaban, urutan) VALUES
('lembur', 'Bagaimana cara mengajukan lembur?', 'Buka menu Pengajuan > Tambah Pengajuan, pilih "Lembur", isi periode lembur, jam mulai-selesai, dan alasan. Tunggu persetujuan sebelum absen.', 1),
('lembur', 'Bagaimana cara absen lembur masuk?', 'Setelah pengajuan disetujui, buka menu Lembur pada hari H, pastikan dalam radius lokasi dan sesuai jadwal, lalu klik Absen Masuk dan ambil foto.', 2),
('lembur', 'Bagaimana cara absen lembur pulang?', 'Setelah selesai lembur, buka menu Lembur, klik Absen Pulang pada card lembur yang aktif, ambil foto selfie. Jam lembur akan dihitung otomatis.', 3),
('lembur', 'Apakah jam lembur dihitung otomatis?', 'Ya, sistem akan menghitung total jam lembur berdasarkan selisih waktu absen masuk dan absen pulang secara otomatis.', 4),
('lembur', 'Apa perbedaan lembur kantor dan lembur dinas?', 'Lembur Kantor: dilakukan di lokasi kantor. Lembur Dinas: dilakukan di lokasi dinas. Lokasi absen akan disesuaikan dengan jenis lembur.', 5),
('lembur', 'Berapa lama proses persetujuan lembur?', 'Proses persetujuan lembur biasanya 1-2 hari kerja. Pastikan mengajukan minimal H-1 sebelum jadwal lembur.', 6),
('lembur', 'Bagaimana cara melihat riwayat lembur?', 'Buka menu Lembur, pilih tab "Riwayat". Anda akan melihat semua riwayat lembur dengan total jam dan periode.', 7),
('lembur', 'Apa yang dimaksud "Siap Absen"?', 'Status ini muncul jika Anda berada dalam radius lokasi dan sesuai jadwal lembur. Tombol absen akan aktif dan bisa diklik.', 8),
('lembur', 'Apa yang dimaksud "Di Luar Radius"?', 'Status ini muncul jika Anda berada di luar radius lokasi yang ditentukan. Anda perlu mendekati lokasi untuk bisa absen.', 9),
('lembur', 'Apa yang dimaksud "Belum Waktunya"?', 'Status ini muncul jika waktu saat ini belum sesuai jadwal lembur. Absen hanya bisa dilakukan sesuai jam yang diajukan.', 10),
('lembur', 'Apakah bisa lembur tanpa pengajuan?', 'Tidak, semua lembur harus melalui pengajuan dan mendapat persetujuan terlebih dahulu. Absen lembur tanpa pengajuan tidak akan tercatat.', 11),
('lembur', 'Bagaimana jika lupa absen lembur?', 'Segera hubungi admin untuk koreksi data. Anda perlu memberikan bukti pendukung bahwa benar-benar melakukan lembur.', 12),
('lembur', 'Berapa radius lokasi untuk absen lembur?', 'Radius lokasi lembur sama dengan radius presensi normal, biasanya 50-200 meter. Cek jarak Anda di card lembur (ditampilkan dalam meter).', 13),
('lembur', 'Apakah perlu foto selfie saat absen lembur?', 'Ya, foto selfie wajib untuk verifikasi kehadiran saat absen masuk dan pulang lembur, sama seperti presensi normal.', 14),
('lembur', 'Bagaimana cara melihat total jam lembur?', 'Total jam lembur ditampilkan di card riwayat lembur. Anda juga bisa melihat akumulasi jam lembur bulanan di dashboard.', 15);

-- ========================================
-- FAQ KATEGORI: PROFIL (8 FAQ)
-- ========================================
INSERT INTO faq (kategori, pertanyaan, jawaban, urutan) VALUES
('profil', 'Bagaimana cara mengubah foto profil?', 'Buka menu Profil, klik foto profil, pilih "Ubah Foto". Anda bisa ambil foto baru atau pilih dari galeri. Ukuran maksimal 2MB.', 1),
('profil', 'Bagaimana cara mengubah data pribadi?', 'Buka menu Profil, klik tombol Edit. Anda bisa mengubah nomor telepon dan data lain yang diizinkan. Data seperti NIP tidak bisa diubah sendiri.', 2),
('profil', 'Bagaimana cara mengganti password?', 'Buka menu Profil, scroll ke bawah, klik "Ubah Password". Masukkan password lama, password baru, dan konfirmasi password baru.', 3),
('profil', 'Bagaimana cara mengubah nomor telepon?', 'Buka menu Profil, klik Edit, ubah nomor telepon di field yang tersedia, lalu klik Simpan. Nomor telepon digunakan untuk notifikasi penting.', 4),
('profil', 'Apakah bisa mengubah email?', 'Email tidak bisa diubah sendiri karena digunakan untuk login. Jika perlu mengubah email, hubungi admin/HRD dengan alasan yang jelas.', 5),
('profil', 'Bagaimana cara melihat informasi jabatan dan divisi?', 'Buka menu Profil, informasi jabatan dan divisi ditampilkan di bagian atas profil di bawah nama Anda.', 6),
('profil', 'Data apa saja yang bisa saya ubah sendiri?', 'Anda bisa mengubah: foto profil, nomor telepon, dan password. Data lain seperti nama, NIP, jabatan, divisi hanya bisa diubah oleh admin.', 7),
('profil', 'Bagaimana jika data pribadi saya salah?', 'Hubungi admin/HRD untuk koreksi data. Berikan informasi yang benar dan dokumen pendukung jika diperlukan.', 8);

-- ========================================
-- FAQ KATEGORI: UMUM (12 FAQ)
-- ========================================
INSERT INTO faq (kategori, pertanyaan, jawaban, urutan) VALUES
('umum', 'Bagaimana cara menghubungi admin/HRD?', 'Buka menu Bantuan, pilih salah satu metode kontak: WhatsApp, Email, atau Telepon. Anda juga bisa menghubungi langsung ke kantor HRD.', 1),
('umum', 'Apa yang harus dilakukan jika aplikasi error?', 'Coba restart aplikasi atau clear cache. Jika masih error, uninstall dan install ulang aplikasi. Jika tetap bermasalah, hubungi admin IT.', 2),
('umum', 'Bagaimana cara logout dari aplikasi?', 'Buka menu Profil, scroll ke bawah, klik tombol "Keluar" atau "Logout". Anda akan diminta konfirmasi sebelum logout.', 3),
('umum', 'Apakah aplikasi bisa digunakan offline?', 'Tidak, aplikasi memerlukan koneksi internet untuk sinkronisasi data. Pastikan Anda terhubung ke internet saat menggunakan aplikasi.', 4),
('umum', 'Mengapa aplikasi meminta izin lokasi?', 'Izin lokasi diperlukan untuk verifikasi kehadiran saat presensi. Sistem akan memastikan Anda berada di lokasi yang ditentukan saat absen.', 5),
('umum', 'Mengapa aplikasi meminta izin kamera?', 'Izin kamera diperlukan untuk mengambil foto selfie saat presensi sebagai bukti kehadiran dan verifikasi identitas pegawai.', 6),
('umum', 'Bagaimana cara update aplikasi?', 'Buka Play Store (Android) atau App Store (iOS), cari "HadirinApp", klik Update jika ada versi baru. Atau aktifkan auto-update di pengaturan store.', 7),
('umum', 'Apa yang harus dilakukan jika lupa password?', 'Di halaman login, klik "Lupa Password", masukkan email Anda. Link reset password akan dikirim ke email. Ikuti instruksi untuk reset password.', 8),
('umum', 'Bagaimana cara melihat notifikasi di kotak masuk?', 'Buka menu Kotak Masuk (icon amplop di bottom navigation). Anda akan melihat semua notifikasi: persetujuan pengajuan, pengumuman, dll.', 9),
('umum', 'Apakah data saya aman di aplikasi ini?', 'Ya, semua data dienkripsi dan disimpan dengan aman. Aplikasi menggunakan protokol keamanan standar industri untuk melindungi data pribadi Anda.', 10),
('umum', 'Bagaimana cara menggunakan fitur search/pencarian?', 'Setiap halaman yang memiliki fitur search akan menampilkan kolom pencarian di atas. Ketik kata kunci minimal 2 karakter untuk mencari.', 11),
('umum', 'Apa fungsi dashboard pegawai?', 'Dashboard menampilkan ringkasan: status absensi hari ini, jam kerja, dan akses cepat ke menu utama (Presensi, Pengajuan, Dinas, Lembur).', 12);
