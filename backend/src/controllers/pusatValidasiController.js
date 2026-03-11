const { getConnection } = require('../config/database');

const pusatValidasiController = {

  // Get absen dinas yang menunggu validasi
  getAbsenDinas: async (req, res) => {
    try {
      const db = await getConnection();
      const query = `
        SELECT 
          pr.id_presensi as id,
          pr.id_dinas as id_dinas,
          pr.id_user,
          pr.tanggal as tanggal_absen,
          CASE 
            WHEN pr.status_validasi = 'menunggu' THEN NULL
            WHEN pr.status_validasi = 'ditolak' THEN NULL
            ELSE pr.jam_masuk
          END as jam_masuk,
          CASE 
            WHEN pr.status_validasi = 'menunggu' THEN NULL
            WHEN pr.status_validasi = 'ditolak' THEN NULL
            ELSE pr.jam_pulang
          END as jam_pulang,
          pr.lintang_masuk as latitude_masuk,
          pr.bujur_masuk as longitude_masuk,
          CASE 
            WHEN pr.foto_masuk IS NOT NULL AND pr.foto_masuk != '' 
            THEN CONCAT('http://192.168.1.8:3000/uploads/presensi/', pr.foto_masuk)
            ELSE NULL
          END as foto_masuk,
          CASE 
            WHEN pr.foto_pulang IS NOT NULL AND pr.foto_pulang != '' 
            THEN CONCAT('http://192.168.1.8:3000/uploads/presensi/', pr.foto_pulang)
            ELSE NULL
          END as foto_pulang,
          pr.status,
          pr.status_validasi,
          pr.alasan_luar_lokasi as keterangan,
          pg.nama_lengkap,
          pg.nip,
          d.nama_kegiatan,
          d.nomor_spt,
          d.alamat_lengkap
        FROM presensi pr
        JOIN users u ON pr.id_user = u.id_user
        JOIN pegawai pg ON u.id_user = pg.id_user
        JOIN dinas d ON pr.id_dinas = d.id_dinas
        WHERE pr.jenis_presensi = 'dinas' AND pr.status_validasi = 'menunggu'
        ORDER BY pr.tanggal DESC, pr.jam_masuk DESC
      `;
      
      const [results] = await db.execute(query);
      
      res.json({
        success: true,
        data: results
      });
    } catch (error) {
      console.error('Error getting absen dinas:', error);
      res.status(500).json({
        success: false,
        message: 'Gagal mengambil data absen dinas'
      });
    }
  },

  // Get SEMUA absen dinas (termasuk yang sudah diproses)
  getAllAbsenDinas: async (req, res) => {
    try {
      const db = await getConnection();
      const query = `
        SELECT 
          pr.id_presensi as id,
          pr.id_dinas as id_dinas,
          pr.id_user,
          pr.tanggal as tanggal_absen,
          CASE 
            WHEN pr.status_validasi = 'menunggu' THEN NULL
            WHEN pr.status_validasi = 'ditolak' THEN NULL
            ELSE pr.jam_masuk
          END as jam_masuk,
          CASE 
            WHEN pr.status_validasi = 'menunggu' THEN NULL
            WHEN pr.status_validasi = 'ditolak' THEN NULL
            ELSE pr.jam_pulang
          END as jam_pulang,
          pr.lintang_masuk as latitude_masuk,
          pr.bujur_masuk as longitude_masuk,
          CASE 
            WHEN pr.foto_masuk IS NOT NULL AND pr.foto_masuk != '' 
            THEN CONCAT('http://192.168.1.8:3000/uploads/presensi/', pr.foto_masuk)
            ELSE NULL
          END as foto_masuk,
          CASE 
            WHEN pr.foto_pulang IS NOT NULL AND pr.foto_pulang != '' 
            THEN CONCAT('http://192.168.1.8:3000/uploads/presensi/', pr.foto_pulang)
            ELSE NULL
          END as foto_pulang,
          pr.status,
          pr.status_validasi,
          pr.alasan_luar_lokasi as keterangan,
          pg.nama_lengkap,
          pg.nip,
          d.nama_kegiatan,
          d.nomor_spt,
          d.alamat_lengkap
        FROM presensi pr
        JOIN users u ON pr.id_user = u.id_user
        JOIN pegawai pg ON u.id_user = pg.id_user
        JOIN dinas d ON pr.id_dinas = d.id_dinas
        WHERE pr.jenis_presensi = 'dinas'
        ORDER BY pr.tanggal DESC, pr.jam_masuk DESC
        LIMIT 100
      `;
      
      const [results] = await db.execute(query);
      
      res.json({
        success: true,
        data: results
      });
    } catch (error) {
      console.error('Error getting all absen dinas:', error);
      res.status(500).json({
        success: false,
        message: 'Gagal mengambil data absen dinas'
      });
    }
  },

  // Get pengajuan yang menunggu persetujuan
  getPengajuan: async (req, res) => {
    try {
      const db = await getConnection();
      
      const query = `
        SELECT 
          p.id_pengajuan,
          p.id_user,
          p.jenis_pengajuan,
          p.tanggal_mulai,
          p.tanggal_selesai,
          p.jam_mulai,
          p.jam_selesai,
          p.alasan_text,
          p.dokumen_foto,
          p.status,
          p.is_retrospektif,
          p.tanggal_pengajuan,
          pg.nama_lengkap,
          pg.nip,
          COALESCE(pg.jabatan, '-') as jabatan,
          COALESCE(pg.divisi, '-') as divisi
        FROM pengajuan p
        JOIN users u ON p.id_user = u.id_user
        LEFT JOIN pegawai pg ON u.id_user = pg.id_user
        WHERE p.status = 'menunggu'
        ORDER BY p.tanggal_pengajuan DESC
      `;
      
      const [results] = await db.execute(query);
      
      res.json({
        success: true,
        data: results
      });
    } catch (error) {
      console.error('Error getting pengajuan:', error);
      console.error('Error details:', error.message);
      res.status(500).json({
        success: false,
        message: 'Gagal mengambil data pengajuan: ' + error.message
      });
    }
  },

  // Get SEMUA pengajuan (termasuk yang sudah diproses)
  getAllPengajuan: async (req, res) => {
    try {
      const db = await getConnection();
      
      const query = `
        SELECT 
          p.id_pengajuan,
          p.id_user,
          p.jenis_pengajuan,
          p.tanggal_mulai,
          p.tanggal_selesai,
          p.jam_mulai,
          p.jam_selesai,
          p.alasan_text,
          p.dokumen_foto,
          p.status,
          p.is_retrospektif,
          p.tanggal_pengajuan,
          pg.nama_lengkap,
          pg.nip,
          COALESCE(pg.jabatan, '-') as jabatan,
          COALESCE(pg.divisi, '-') as divisi
        FROM pengajuan p
        JOIN users u ON p.id_user = u.id_user
        LEFT JOIN pegawai pg ON u.id_user = pg.id_user
        ORDER BY p.tanggal_pengajuan DESC
        LIMIT 100
      `;
      
      const [results] = await db.execute(query);
      
      res.json({
        success: true,
        data: results
      });
    } catch (error) {
      console.error('Error getting all pengajuan:', error);
      res.status(500).json({
        success: false,
        message: 'Gagal mengambil data pengajuan: ' + error.message
      });
    }
  },

  // Get statistik untuk ringkasan validasi
  getStatistik: async (req, res) => {
    try {
      const db = await getConnection();
      
      // ABSEN DINAS
      // Perlu Validasi
      const [perluValidasi] = await db.execute(`
        SELECT COUNT(*) as count 
        FROM presensi 
        WHERE jenis_presensi = 'dinas'
        AND status IN ('Hadir', 'Terlambat') 
        AND status_validasi = 'menunggu'
      `);

      const [sudahValidasi] = await db.execute(`
        SELECT COUNT(*) as count 
        FROM presensi 
        WHERE jenis_presensi = 'dinas'
        AND status_validasi = 'disetujui'
      `);

      // Tidak Hadir (pegawai yang tidak ada record absen & sudah lewat batas absen)
      // Mengikuti jam_kerja_hari berdasarkan hari ini
      const dayNames = {
        'Sunday': 'Minggu',
        'Monday': 'Senin',
        'Tuesday': 'Selasa',
        'Wednesday': 'Rabu',
        'Thursday': 'Kamis',
        'Friday': 'Jumat',
        'Saturday': 'Sabtu'
      };
      const today = new Date();
      const dayName = dayNames[today.toLocaleDateString('en-US', { weekday: 'long' })];
      
      // Get batas_absen from jam_kerja_hari
      const [jamKerjaRows] = await db.execute(
        'SELECT batas_absen, is_kerja FROM jam_kerja_hari WHERE hari = ?',
        [dayName]
      );
      
      let tidakHadirCount = 0;
      if (jamKerjaRows.length > 0 && jamKerjaRows[0].is_kerja === 1) {
        const batasAbsen = jamKerjaRows[0].batas_absen;
        const currentTime = today.toTimeString().slice(0, 8);
        
        // Hanya hitung tidak hadir jika sudah lewat batas absen
        if (currentTime > batasAbsen) {
          const [tidakHadirRows] = await db.execute(`
            SELECT COUNT(*) as count 
            FROM dinas_pegawai dp
            INNER JOIN dinas d ON dp.id_dinas = d.id_dinas
            LEFT JOIN presensi pr ON dp.id_user = pr.id_user 
              AND pr.id_dinas = dp.id_dinas 
              AND pr.tanggal = CURDATE()
              AND pr.jenis_presensi = 'dinas'
            WHERE pr.id_presensi IS NULL 
            AND CURDATE() BETWEEN d.tanggal_mulai AND d.tanggal_selesai
            AND dp.status_konfirmasi = 'konfirmasi'
          `);
          tidakHadirCount = tidakHadirRows[0].count;
        }
      }
      
      const tidakHadir = [{ count: tidakHadirCount }];

      // PENGAJUAN
      const [menunggu] = await db.execute(`
        SELECT COUNT(*) as count 
        FROM pengajuan 
        WHERE status = 'menunggu'
      `);

      const [disetujui] = await db.execute(`
        SELECT COUNT(*) as count 
        FROM pengajuan 
        WHERE status = 'disetujui'
      `);

      const [ditolak] = await db.execute(`
        SELECT COUNT(*) as count 
        FROM pengajuan 
        WHERE status = 'ditolak'
      `);

      const stats = {
        absen_dinas: {
          perlu_validasi: perluValidasi[0].count,
          sudah_divalidasi: sudahValidasi[0].count,
          tidak_hadir: tidakHadir[0].count,
          total: perluValidasi[0].count + sudahValidasi[0].count + tidakHadir[0].count
        },
        pengajuan: {
          menunggu: menunggu[0].count,
          disetujui: disetujui[0].count,
          ditolak: ditolak[0].count,
          total: menunggu[0].count + disetujui[0].count + ditolak[0].count
        }
      };

      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      console.error('Error getting statistik:', error);
      res.status(500).json({
        success: false,
        message: 'Gagal mengambil statistik'
      });
    }
  },

  // Setujui item
  setujui: async (req, res) => {
    try {
      const db = await getConnection();
      const { type, id, catatan } = req.body;
      const adminId = req.user?.id_user || 10; // Default admin ID
      
      let query = '';
      let params = [];

      switch (type) {
        case 'absen_dinas':
          query = `
            UPDATE presensi 
            SET status_validasi = 'disetujui',
                divalidasi_oleh = ?,
                catatan_validasi = ?,
                waktu_validasi = NOW()
            WHERE id_presensi = ? AND jenis_presensi = 'dinas'
          `;
          params = [adminId, catatan || null, id];
          break;

        case 'pengajuan':
          query = `
            UPDATE pengajuan 
            SET status = 'disetujui',
                disetujui_oleh = ?,
                catatan_persetujuan = ?,
                waktu_persetujuan = NOW()
            WHERE id_pengajuan = ?
          `;
          params = [adminId, catatan || null, id];
          break;

        default:
          return res.status(400).json({
            success: false,
            message: 'Tipe validasi tidak valid'
          });
      }

      await db.execute(query, params);

      res.json({
        success: true,
        message: 'Berhasil menyetujui'
      });
    } catch (error) {
      console.error('Error approving:', error);
      res.status(500).json({
        success: false,
        message: 'Gagal menyetujui'
      });
    }
  },

  // Tolak item
  tolak: async (req, res) => {
    try {
      const db = await getConnection();
      const { type, id, catatan } = req.body;
      const adminId = req.user?.id_user || 10; // Default admin ID
      
      if (!catatan) {
        return res.status(400).json({
          success: false,
          message: 'Catatan penolakan wajib diisi'
        });
      }

      let query = '';
      let params = [];

      switch (type) {
        case 'absen_dinas':
          query = `
            UPDATE presensi 
            SET status_validasi = 'ditolak',
                divalidasi_oleh = ?,
                catatan_validasi = ?,
                waktu_validasi = NOW()
            WHERE id_presensi = ? AND jenis_presensi = 'dinas'
          `;
          params = [adminId, catatan, id];
          break;

        case 'pengajuan':
          query = `
            UPDATE pengajuan 
            SET status = 'ditolak',
                disetujui_oleh = ?,
                catatan_persetujuan = ?,
                waktu_persetujuan = NOW()
            WHERE id_pengajuan = ?
          `;
          params = [adminId, catatan, id];
          break;

        default:
          return res.status(400).json({
            success: false,
            message: 'Tipe validasi tidak valid'
          });
      }

      await db.execute(query, params);

      res.json({
        success: true,
        message: 'Berhasil menolak'
      });
    } catch (error) {
      console.error('Error rejecting:', error);
      res.status(500).json({
        success: false,
        message: 'Gagal menolak'
      });
    }
  }
};

module.exports = pusatValidasiController;