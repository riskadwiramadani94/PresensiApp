# API Lembur Documentation

## Base URL
```
http://YOUR_IP:3000/pegawai/lembur/api
```

## Endpoints

### 1. Get Absen Lembur Aktif
**GET** `/absen-aktif`

**Query Parameters:**
- `user_id` (required): ID user pegawai

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id_absen_lembur": 1,
      "id_pengajuan": 5,
      "tanggal": "2026-02-22",
      "jam_masuk": "18:05:00",
      "jam_pulang": null,
      "total_jam": null,
      "lokasi_lembur": "kantor",
      "lokasi_id": 1,
      "dinas_id": null,
      "status": "masuk",
      "lokasi_detail": "Kantor Pusat",
      "latitude": -6.924523,
      "longitude": 107.738659,
      "radius": 100
    }
  ]
}
```

---

### 2. Get Riwayat Lembur
**GET** `/riwayat`

**Query Parameters:**
- `user_id` (required): ID user pegawai

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id_absen_lembur": 2,
      "id_pengajuan": 3,
      "tanggal": "2026-02-15",
      "jam_masuk": "18:00:00",
      "jam_pulang": "21:30:00",
      "total_jam": 3.5,
      "lokasi_lembur": "kantor",
      "lokasi_id": 1,
      "status": "selesai",
      "lokasi_detail": "Kantor Pusat",
      "latitude": -6.924523,
      "longitude": 107.738659,
      "radius": 100
    }
  ]
}
```

---

### 3. Get Lokasi untuk Absen Lembur
**GET** `/lokasi`

**Query Parameters:**
- `user_id` (required): ID user pegawai
- `tanggal` (required): Tanggal lembur (format: YYYY-MM-DD)

**Response (Kantor):**
```json
{
  "success": true,
  "data": {
    "lokasi_id": 1,
    "nama_lokasi": "Kantor Pusat",
    "latitude": -6.924523,
    "longitude": 107.738659,
    "radius": 100,
    "jenis": "kantor",
    "dinas_id": null
  }
}
```

**Response (Dinas):**
```json
{
  "success": true,
  "data": {
    "lokasi_id": 6,
    "nama_lokasi": "ITB Ganesha",
    "latitude": -6.890362,
    "longitude": 107.610191,
    "radius": 200,
    "jenis": "dinas",
    "dinas_id": 14
  }
}
```

---

### 4. Absen Masuk Lembur
**POST** `/absen-masuk`

**Content-Type:** `multipart/form-data`

**Body:**
- `id_pengajuan` (required): ID pengajuan lembur
- `user_id` (required): ID user pegawai
- `latitude` (required): Latitude GPS
- `longitude` (required): Longitude GPS
- `lokasi_id` (required): ID lokasi kantor/dinas
- `dinas_id` (optional): ID dinas (jika lembur dinas)
- `foto` (required): File foto selfie

**Response:**
```json
{
  "success": true,
  "message": "Absen masuk lembur berhasil",
  "data": {
    "id_absen_lembur": 1,
    "jam_masuk": "18:05:23"
  }
}
```

---

### 5. Absen Pulang Lembur
**POST** `/absen-pulang`

**Content-Type:** `multipart/form-data`

**Body:**
- `id_absen_lembur` (required): ID absen lembur
- `latitude` (required): Latitude GPS
- `longitude` (required): Longitude GPS
- `foto` (required): File foto selfie

**Response:**
```json
{
  "success": true,
  "message": "Absen pulang lembur berhasil",
  "data": {
    "jam_pulang": "21:30:15",
    "total_jam": 3.42
  }
}
```

---

## Error Responses

**400 Bad Request:**
```json
{
  "success": false,
  "message": "Anda sudah absen masuk lembur hari ini"
}
```

**404 Not Found:**
```json
{
  "success": false,
  "message": "Data absen tidak ditemukan"
}
```

**500 Internal Server Error:**
```json
{
  "success": false,
  "message": "Database error"
}
```

---

## Database Schema

### Table: `absen_lembur`
```sql
CREATE TABLE `absen_lembur` (
  `id_absen_lembur` int(11) NOT NULL AUTO_INCREMENT,
  `id_pengajuan` int(11) NOT NULL,
  `id_user` int(11) NOT NULL,
  `tanggal` date NOT NULL,
  `jam_masuk` time DEFAULT NULL,
  `jam_pulang` time DEFAULT NULL,
  `lintang_masuk` double DEFAULT NULL,
  `bujur_masuk` double DEFAULT NULL,
  `lintang_pulang` double DEFAULT NULL,
  `bujur_pulang` double DEFAULT NULL,
  `foto_masuk` varchar(255) DEFAULT NULL,
  `foto_pulang` varchar(255) DEFAULT NULL,
  `total_jam` decimal(5,2) DEFAULT NULL,
  `lokasi_lembur` enum('kantor','dinas') DEFAULT 'kantor',
  `lokasi_id` int(11) DEFAULT NULL,
  `dinas_id` int(11) DEFAULT NULL,
  `status` enum('masuk','selesai') DEFAULT 'masuk',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id_absen_lembur`)
);
```

---

## Upload Folder
Foto absen lembur disimpan di:
```
backend/uploads/lembur/
```

Format nama file:
```
lembur-{timestamp}-{random}.jpg
```

Contoh:
```
lembur-1708675200000-123456789.jpg
```
