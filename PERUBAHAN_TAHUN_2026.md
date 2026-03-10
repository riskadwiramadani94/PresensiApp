# Perubahan Sistem Tahun 2026

## Ringkasan Perubahan

Sistem aplikasi HadirinApp telah diubah untuk memulai dari tahun 2026 ke depan. Semua data dan laporan sekarang dimulai dari tahun 2026, tidak ada data historis sebelum tahun tersebut.

## File yang Diubah

### 1. Frontend - Laporan Absen
**File:** `app/menu-admin/laporan/laporan-detail-absen.tsx`
- Fungsi `generateMonthList()`: Range tahun diubah dari 2020-2030 menjadi 2026-2035
- Fungsi `generateYearList()`: Range tahun diubah dari 2020-2030 menjadi 2026-2035

### 2. Frontend - Laporan Lembur  
**File:** `app/menu-admin/laporan/laporan-detail-lembur.tsx`
- Fungsi `generateMonthList()`: Range tahun diubah dari 2020-2030 menjadi 2026-2035
- Fungsi `generateYearList()`: Range tahun diubah dari 2020-2030 menjadi 2026-2035

### 3. Database Constraints
**File:** `backend/database/constraints_2026.sql`
- Menambahkan constraint CHECK untuk memastikan semua tanggal >= 2026-01-01
- Tabel yang diberi constraint:
  - `absen_lembur`
  - `dinas` 
  - `pengajuan`
  - `presensi`
  - `hari_libur`
  - `jam_kerja_history`
  - `pegawai`

## Dampak Perubahan

### ✅ Yang Berubah:
1. **Dropdown Tahun di Laporan**: Hanya menampilkan tahun 2026-2035
2. **Dropdown Bulan di Laporan**: Hanya menampilkan bulan dari Januari 2026 ke depan
3. **Validasi Database**: Sistem menolak input tanggal sebelum 2026-01-01
4. **Data Awal**: Sistem dimulai fresh dari tahun 2026

### ✅ Yang Tidak Berubah:
1. **Backend Controller**: Tidak ada perubahan pada logic backend
2. **API Endpoints**: Semua endpoint tetap sama
3. **Struktur Database**: Hanya menambah constraint, tidak mengubah struktur
4. **Fitur Aplikasi**: Semua fitur tetap berfungsi normal

## Cara Implementasi

### 1. Jalankan Constraint Database
```sql
-- Jalankan file constraints_2026.sql setelah database utama
mysql -u username -p database_name < backend/database/constraints_2026.sql
```

### 2. Update Frontend
File frontend sudah diupdate otomatis dengan perubahan range tahun.

### 3. Testing
- Test dropdown tahun di laporan absen dan lembur
- Test input tanggal untuk memastikan validasi 2026
- Test semua fitur laporan dengan data tahun 2026

## Data Default yang Ditambahkan

### Jam Kerja History (2026)
- Senin-Jumat: 08:00-17:00 (Kerja)
- Sabtu: 08:00-12:00 (Libur)  
- Minggu: Libur

### Hari Libur Nasional 2026
- 1 Januari 2026: Tahun Baru
- 17 Agustus 2026: Hari Kemerdekaan RI
- 25 Desember 2026: Hari Raya Natal

## Catatan Penting

1. **Fresh Start**: Aplikasi ini adalah fresh start dari 2026, tidak ada data historis
2. **Konsistensi**: Semua komponen (frontend, backend, database) sudah konsisten dengan tahun 2026
3. **Scalable**: Range tahun bisa diperpanjang dengan mudah di masa depan
4. **Validation**: Database constraint memastikan tidak ada data yang salah masuk

## Troubleshooting

### Jika Error Constraint
```sql
-- Hapus constraint jika perlu rollback
ALTER TABLE table_name DROP CONSTRAINT constraint_name;
```

### Jika Perlu Extend Range Tahun
Edit fungsi `generateMonthList()` dan `generateYearList()` di file:
- `laporan-detail-absen.tsx`
- `laporan-detail-lembur.tsx`

Ubah range dari `2026; year <= 2035` menjadi tahun yang diinginkan.