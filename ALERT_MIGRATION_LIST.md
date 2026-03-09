# Daftar File yang Belum Menggunakan AlertCustom

## File yang perlu dimigrasi dari Alert.alert() ke CustomAlert:

### 1. Admin - Pegawai & Akun
- **app\menu-admin\pegawai-akun\akun-login-admin.tsx** (11 alert)
- **app\menu-admin\pegawai-akun\detail\edit\[id].tsx** (4 alert)
- **app\menu-admin\pegawai-akun\detail\[id].tsx** (2 alert)

### 2. Admin - Pengajuan
- **app\menu-admin\pengajuan\absen-dinas\index.tsx** (4 alert)
- **app\menu-admin\pengajuan\index.tsx** (8 alert)

### 3. Admin - Pengaturan
- **app\menu-admin\pengaturan\edit-lokasi.tsx** (7 alert)

### 4. Pegawai - Lembur
- **app\menu-pegawai\lembur\index.tsx** (10 alert)

### 5. Pegawai - Pengajuan
- **app\menu-pegawai\pengajuan\form.tsx** (7 alert)

### 6. Pegawai - Presensi
- **app\menu-pegawai\presensi\index.tsx** (3 alert)

### 7. Components
- **components\CustomCalendar.tsx** (1 alert)
- **components\MultiLokasiComponent.tsx** (2 alert)
- **components\NetworkDiagnostic.tsx** (2 alert)

## Total: 61 Alert.alert() yang perlu dimigrasi

## Langkah Migrasi:
1. Import CustomAlert dan useCustomAlert
2. Ganti Alert.alert() dengan showAlert()
3. Tambahkan CustomAlert component di render
4. Sesuaikan parameter sesuai dengan interface CustomAlert

## Prioritas:
1. **HIGH**: File dengan banyak alert (akun-login-admin.tsx, lembur/index.tsx)
2. **MEDIUM**: File pengajuan dan pengaturan
3. **LOW**: Components utility