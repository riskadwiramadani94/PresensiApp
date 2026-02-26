# Migration: Jam Kerja History

## Tujuan
Menyimpan historis perubahan jam kerja agar perubahan setting tidak mempengaruhi data laporan bulan-bulan sebelumnya.

## Cara Menjalankan Migration

### 1. Buka phpMyAdmin
- Buka browser: http://localhost/phpmyadmin
- Login dengan username/password MySQL Anda
- Pilih database aplikasi (biasanya `hadirin_db` atau sesuai nama database Anda)

### 2. Jalankan SQL Migration
- Klik tab "SQL" di phpMyAdmin
- Copy seluruh isi file `migration_jam_kerja_history.sql`
- Paste ke text area SQL
- Klik tombol "Go" atau "Kirim"

### 3. Verifikasi
Setelah berhasil, jalankan query ini untuk memastikan data sudah masuk:
```sql
SELECT * FROM jam_kerja_history ORDER BY hari;
```

Harusnya ada 7 row (Senin sampai Minggu) dengan:
- `tanggal_mulai_berlaku` = 2024-01-01
- `tanggal_selesai_berlaku` = NULL

### 4. Restart Backend Server
- Stop backend server (Ctrl+C di terminal)
- Start lagi: `npm start` atau `node src/index.js`

## Testing

### Test 1: Ubah Setting Jam Kerja
1. Login sebagai admin
2. Buka menu: Pengaturan > Jam Kerja
3. Ubah Sabtu dari Libur → Kerja
4. Klik Simpan
5. Cek database:
```sql
SELECT * FROM jam_kerja_history WHERE hari = 'Sabtu' ORDER BY id DESC LIMIT 2;
```
Harusnya ada 2 row:
- Row lama: `tanggal_selesai_berlaku` = kemarin
- Row baru: `tanggal_mulai_berlaku` = hari ini, `tanggal_selesai_berlaku` = NULL

### Test 2: Lihat Laporan Bulan Lalu
1. Buka Riwayat Presensi
2. Pilih bulan lalu (sebelum ubah setting)
3. Sabtu harusnya masih tampil "Libur" ✅

### Test 3: Lihat Laporan Bulan Ini
1. Pilih bulan ini (setelah ubah setting)
2. Sabtu harusnya tampil "Tidak Hadir" atau "Hadir" (bukan "Libur") ✅

## Troubleshooting

### Error: Table 'jam_kerja_history' already exists
Tabel sudah dibuat sebelumnya. Skip langkah CREATE TABLE, langsung jalankan INSERT.

### Error: Duplicate entry
Data sudah ada. Tidak perlu insert lagi.

### Sabtu masih tampil "Libur" di bulan ini
- Pastikan backend sudah direstart
- Clear cache aplikasi mobile
- Cek query di `presensiController.js` sudah menggunakan `jam_kerja_history`

## File yang Diubah

1. ✅ `backend/database/migration_jam_kerja_history.sql` - SQL migration
2. ✅ `backend/src/controllers/pengaturanController-admin.js` - Simpan history saat update
3. ✅ `backend/src/controllers/presensiController.js` - Baca dari history berdasarkan tanggal

## Rollback (Jika Ada Masalah)

Jika ingin kembali ke sistem lama:

```sql
-- Hapus tabel history
DROP TABLE IF EXISTS jam_kerja_history;
```

Lalu revert perubahan di:
- `pengaturanController-admin.js` (hapus kode history)
- `presensiController.js` (kembalikan query ke `jam_kerja_hari`)
