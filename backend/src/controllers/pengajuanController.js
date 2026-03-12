const { getConnection } = require('../config/database');
const PushNotificationService = require('../services/pushNotificationService');

const getPengajuan = async (req, res) => {
  try {
    const { user_id } = req.query;

    if (!user_id) {
      return res.json({ success: false, message: 'User ID diperlukan' });
    }

    const db = await getConnection();

    const [pengajuan] = await db.execute(`
      SELECT 
        p.*,
        u.nama_lengkap as nama_approver
      FROM pengajuan p
      LEFT JOIN users u ON p.disetujui_oleh = u.id_user
      WHERE p.id_user = ? 
      ORDER BY p.tanggal_pengajuan DESC
    `, [user_id]);

    // Format data untuk tampilan yang lebih baik
    const formattedData = pengajuan.map(item => ({
      ...item,
      tanggal_mulai: item.tanggal_mulai ? new Date(item.tanggal_mulai).toISOString().split('T')[0] : null,
      tanggal_selesai: item.tanggal_selesai ? new Date(item.tanggal_selesai).toISOString().split('T')[0] : null,
      tanggal_pengajuan: item.tanggal_pengajuan ? new Date(item.tanggal_pengajuan).toISOString().split('T')[0] : null,
      waktu_persetujuan: item.waktu_persetujuan ? new Date(item.waktu_persetujuan).toISOString().split('T')[0] : null,
      jenis_pengajuan_label: getJenisPengajuanLabel(item.jenis_pengajuan),
      status_label: getStatusLabel(item.status),
      tanggal_mulai_formatted: formatDate(item.tanggal_mulai),
      tanggal_selesai_formatted: item.tanggal_selesai ? formatDate(item.tanggal_selesai) : null,
      tanggal_pengajuan_formatted: formatDateTime(item.tanggal_pengajuan)
    }));

    res.json({
      success: true,
      data: formattedData
    });

  } catch (error) {
    console.error('Get pengajuan error:', error);
    res.json({ success: false, message: 'Database error: ' + error.message });
  }
};

// Helper functions untuk formatting
const getJenisPengajuanLabel = (jenis) => {
  const labels = {
    'izin_datang_terlambat': 'Izin Datang Terlambat',
    'izin_pulang_cepat': 'Izin Pulang Cepat',
    'cuti_sakit': 'Cuti Sakit',
    'cuti_alasan_penting': 'Cuti Alasan Penting',
    'cuti_tahunan': 'Cuti Tahunan',
    'lembur': 'Lembur'
  };
  return labels[jenis] || jenis;
};

const getStatusLabel = (status) => {
  const labels = {
    'menunggu': 'Menunggu',
    'disetujui': 'Disetujui',
    'ditolak': 'Ditolak'
  };
  return labels[status] || status;
};

const formatDate = (dateStr) => {
  if (!dateStr) return null;
  const date = new Date(dateStr);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
};

const formatDateTime = (dateStr) => {
  if (!dateStr) return null;
  const date = new Date(dateStr);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${day}/${month}/${year} ${hours}:${minutes}`;
};

const submitPengajuan = async (req, res) => {
  try {
    const { user_id, jenis_pengajuan, tanggal_mulai, tanggal_selesai, jam_mulai, jam_selesai, alasan_text, dokumen_foto } = req.body;

    if (!user_id || !jenis_pengajuan || !tanggal_mulai || !alasan_text) {
      return res.json({ success: false, message: 'Data tidak lengkap' });
    }

    const db = await getConnection();

    // VALIDASI 1: Cek apakah pegawai sedang dinas jika mengajukan lembur
    if (jenis_pengajuan === 'lembur') {
      const [dinasRows] = await db.execute(`
        SELECT d.id_dinas, d.nama_kegiatan, d.tanggal_mulai, d.tanggal_selesai
        FROM dinas_pegawai dp
        JOIN dinas d ON dp.id_dinas = d.id_dinas
        WHERE dp.id_user = ?
          AND d.status = 'aktif'
          AND dp.status_konfirmasi = 'konfirmasi'
          AND (
            (? BETWEEN d.tanggal_mulai AND d.tanggal_selesai)
            OR (? BETWEEN d.tanggal_mulai AND d.tanggal_selesai)
            OR (d.tanggal_mulai BETWEEN ? AND ?)
          )
        LIMIT 1
      `, [user_id, tanggal_mulai, tanggal_selesai || tanggal_mulai, tanggal_mulai, tanggal_selesai || tanggal_mulai]);

      if (dinasRows.length > 0) {
        const dinas = dinasRows[0];
        return res.json({ 
          success: false, 
          message: `Tidak dapat mengajukan lembur karena Anda sedang dinas "${dinas.nama_kegiatan}" pada periode tersebut. Pegawai yang sedang dinas tidak dapat mengajukan lembur.`
        });
      }

      // VALIDASI 2: Cek jam lembur harus di luar jam kerja untuk SETIAP HARI
      if (jam_mulai) {
        const dayNames = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
        const startDate = new Date(tanggal_mulai);
        const endDate = tanggal_selesai ? new Date(tanggal_selesai) : new Date(tanggal_mulai);
        const conflictDays = [];

        // Loop setiap hari dalam periode lembur
        let currentDate = new Date(startDate);
        while (currentDate <= endDate) {
          const dateStr = currentDate.toISOString().split('T')[0];
          const dayName = dayNames[currentDate.getDay()];

          // Cek apakah hari libur
          const [hariLiburRows] = await db.execute(
            'SELECT id_hari_libur FROM hari_libur WHERE tanggal = ? AND is_active = 1',
            [dateStr]
          );
          const isHoliday = hariLiburRows.length > 0;

          if (!isHoliday) {
            // Cek jam kerja dari jam_kerja_history (prioritas)
            const [jamKerjaHistoryRows] = await db.execute(`
              SELECT jam_pulang, is_kerja 
              FROM jam_kerja_history 
              WHERE hari = ? 
              AND ? BETWEEN tanggal_mulai_berlaku AND IFNULL(tanggal_selesai_berlaku, '9999-12-31')
              ORDER BY tanggal_mulai_berlaku DESC
              LIMIT 1
            `, [dayName, dateStr]);

            let jamPulang = null;
            let isKerja = false;

            if (jamKerjaHistoryRows.length > 0) {
              // Ada data di jam_kerja_history
              jamPulang = jamKerjaHistoryRows[0].jam_pulang;
              isKerja = jamKerjaHistoryRows[0].is_kerja === 1;
            } else {
              // Fallback ke jam_kerja_hari
              const [jamKerjaHariRows] = await db.execute(
                'SELECT jam_pulang, is_kerja FROM jam_kerja_hari WHERE hari = ?',
                [dayName]
              );
              if (jamKerjaHariRows.length > 0) {
                jamPulang = jamKerjaHariRows[0].jam_pulang;
                isKerja = jamKerjaHariRows[0].is_kerja === 1;
              }
            }

            // Jika hari kerja, validasi jam lembur harus setelah jam pulang
            if (isKerja && jamPulang) {
              // Bandingkan jam_mulai lembur dengan jam_pulang
              if (jam_mulai <= jamPulang) {
                conflictDays.push({
                  tanggal: dateStr,
                  hari: dayName,
                  jam_pulang: jamPulang
                });
              }
            }
          }

          // Next day
          currentDate.setDate(currentDate.getDate() + 1);
        }

        // Jika ada konflik, tolak pengajuan
        if (conflictDays.length > 0) {
          const conflictDetails = conflictDays.map(day => {
            const date = new Date(day.tanggal);
            const dateFormatted = `${date.getDate()} ${['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'][date.getMonth()]} ${date.getFullYear()}`;
            return `- ${day.hari}, ${dateFormatted} (jam pulang: ${day.jam_pulang})`;
          }).join('\n');

          return res.json({
            success: false,
            message: `Tidak dapat mengajukan lembur karena jam mulai lembur (${jam_mulai}) masih dalam jam kerja pada:\n${conflictDetails}\n\nLembur hanya dapat diajukan di luar jam kerja. Silakan sesuaikan jam lembur Anda.`
          });
        }
      }
    }

    const [result] = await db.execute(`
      INSERT INTO pengajuan (
        id_user, jenis_pengajuan, tanggal_mulai, tanggal_selesai, 
        jam_mulai, jam_selesai, alasan_text, dokumen_foto, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'menunggu')
    `, [
      user_id, jenis_pengajuan, tanggal_mulai, tanggal_selesai || null,
      jam_mulai || null, jam_selesai || null, alasan_text, dokumen_foto || null
    ]);

    if (result.affectedRows > 0) {
      // Ambil data user untuk notifikasi
      const [userData] = await db.execute(
        'SELECT nama_lengkap FROM users WHERE id_user = ?',
        [user_id]
      );
      
      const namaUser = userData[0]?.nama_lengkap || 'Pegawai';
      const jenisLabel = getJenisPengajuanLabel(jenis_pengajuan);
      
      // Kirim push notification ke semua admin
      const [adminData] = await db.execute(
        'SELECT id_user FROM users WHERE role = "admin"'
      );
      
      if (adminData.length > 0) {
        const adminIds = adminData.map(admin => admin.id_user);
        
        // Kirim push notification (async, tidak perlu tunggu)
        PushNotificationService.sendToMultiple(
          adminIds,
          'Pengajuan Baru 📝',
          `${namaUser} mengajukan ${jenisLabel}`,
          {
            type: 'pengajuan_baru',
            reference_type: 'pengajuan',
            reference_id: result.insertId,
            jenis_pengajuan: jenis_pengajuan,
            nama_pegawai: namaUser
          }
        ).catch(error => {
          console.error('[PUSH] Failed to send notification to admins:', error);
        });
      }
      
      res.json({ success: true, message: 'Pengajuan berhasil dikirim' });
    } else {
      res.json({ success: false, message: 'Gagal mengirim pengajuan' });
    }

  } catch (error) {
    console.error('Submit pengajuan error:', error);
    res.json({ success: false, message: 'Database error: ' + error.message });
  }
};

const getIzinHariIni = async (req, res) => {
  try {
    const { user_id, tanggal } = req.query;
    
    if (!user_id || !tanggal) {
      return res.json({ success: false, message: 'user_id dan tanggal diperlukan' });
    }
    
    const db = await getConnection();
    
    const [rows] = await db.execute(`
      SELECT jenis_pengajuan, jam_mulai, status
      FROM pengajuan
      WHERE id_user = ?
        AND tanggal_mulai = ?
        AND jenis_pengajuan IN ('izin_datang_terlambat', 'izin_pulang_cepat')
        AND status = 'disetujui'
    `, [user_id, tanggal]);
    
    const result = {};
    rows.forEach(row => {
      if (row.jenis_pengajuan === 'izin_datang_terlambat') {
        result.izin_datang_terlambat = {
          jam: row.jam_mulai,
          status: row.status
        };
      } else if (row.jenis_pengajuan === 'izin_pulang_cepat') {
        result.izin_pulang_cepat = {
          jam: row.jam_mulai,
          status: row.status
        };
      }
    });
    
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Get izin hari ini error:', error);
    res.json({ success: false, message: error.message });
  }
};

const deletePengajuan = async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!id) {
      return res.json({ success: false, message: 'ID pengajuan diperlukan' });
    }
    
    const db = await getConnection();
    
    // Cek status pengajuan
    const [pengajuan] = await db.execute(
      'SELECT status FROM pengajuan WHERE id_pengajuan = ?',
      [id]
    );
    
    if (pengajuan.length === 0) {
      return res.json({ success: false, message: 'Pengajuan tidak ditemukan' });
    }
    
    if (pengajuan[0].status !== 'menunggu') {
      return res.json({ success: false, message: 'Hanya pengajuan dengan status menunggu yang bisa dihapus' });
    }
    
    // Hapus pengajuan
    const [result] = await db.execute(
      'DELETE FROM pengajuan WHERE id_pengajuan = ?',
      [id]
    );
    
    if (result.affectedRows > 0) {
      res.json({ success: true, message: 'Pengajuan berhasil dihapus' });
    } else {
      res.json({ success: false, message: 'Gagal menghapus pengajuan' });
    }
  } catch (error) {
    console.error('Delete pengajuan error:', error);
    res.json({ success: false, message: error.message });
  }
};

module.exports = { getPengajuan, submitPengajuan, getIzinHariIni, deletePengajuan };
