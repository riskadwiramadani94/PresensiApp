const { getConnection } = require('../config/database');

const getDayName = (date) => {
  const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  return days[date.getDay()];
};

// Simpan notifikasi ke tabel notifikasi jika belum ada hari ini
const upsertNotifikasi = async (db, id_user, judul, pesan, tipe, data = null) => {
  const today = new Date().toISOString().split('T')[0];
  const [existing] = await db.execute(
    `SELECT id_notifikasi, is_read FROM notifikasi 
     WHERE id_user = ? AND tipe = ? AND DATE(created_at) = ? AND judul = ?
     LIMIT 1`,
    [id_user, tipe, today, judul]
  );
  // Kalau sudah ada dan sudah dibaca, jangan insert/update apapun
  if (existing.length > 0) return;
  await db.execute(
    `INSERT INTO notifikasi (id_user, judul, pesan, tipe, data, is_read) VALUES (?, ?, ?, ?, ?, 0)`,
    [id_user, judul, pesan, tipe, data ? JSON.stringify(data) : null]
  );
};

// Map tipe ke icon, warna, reference_type, priority
const getTipeMeta = (tipe) => {
  const map = {
    reminder_masuk:                  { icon: 'time',             color: '#2196F3', reference_type: 'presensi',  priority: 'high'   },
    reminder_pulang:                 { icon: 'time',             color: '#00BCD4', reference_type: 'presensi',  priority: 'medium' },
    reminder_terlambat:              { icon: 'warning',          color: '#FF5722', reference_type: 'presensi',  priority: 'urgent' },
    absen_masuk:                     { icon: 'log-in',           color: '#4CAF50', reference_type: 'presensi',  priority: 'low'    },
    absen_pulang:                    { icon: 'log-out',          color: '#4CAF50', reference_type: 'presensi',  priority: 'low'    },
    absen_dinas_masuk:               { icon: 'airplane',         color: '#00BCD4', reference_type: 'presensi',  priority: 'low'    },
    absen_dinas_pulang:              { icon: 'airplane',         color: '#00BCD4', reference_type: 'presensi',  priority: 'low'    },
    pengajuan_baru:                  { icon: 'document-text',    color: '#FF9800', reference_type: 'pengajuan', priority: 'medium' },
    pengajuan_approved:              { icon: 'checkmark-circle', color: '#4CAF50', reference_type: 'pengajuan', priority: 'high'   },
    pengajuan_rejected:              { icon: 'close-circle',     color: '#F44336', reference_type: 'pengajuan', priority: 'high'   },
    pengajuan:                       { icon: 'document-text',    color: '#FF9800', reference_type: 'pengajuan', priority: 'medium' },
    approval:                        { icon: 'checkmark-circle', color: '#4CAF50', reference_type: 'pengajuan', priority: 'high'   },
    dinas_assigned:                  { icon: 'briefcase',        color: '#9C27B0', reference_type: 'dinas',     priority: 'high'   },
    dinas_cancelled:                 { icon: 'close-circle',     color: '#9E9E9E', reference_type: 'dinas',     priority: 'medium' },
    lembur_approved:                 { icon: 'checkmark-circle', color: '#4CAF50', reference_type: 'pengajuan', priority: 'high'   },
    lembur_rejected:                 { icon: 'close-circle',     color: '#F44336', reference_type: 'pengajuan', priority: 'high'   },
    hari_libur:                      { icon: 'sunny',            color: '#FFA726', reference_type: 'info',      priority: 'low'    },
    info:                            { icon: 'alert-circle',     color: '#FF9800', reference_type: 'info',      priority: 'medium' },
  };
  return map[tipe] || { icon: 'notifications', color: '#6B7280', reference_type: 'info', priority: 'low' };
};

const getInboxNotifications = async (req, res) => {
  try {
    const { user_id } = req.query;
    if (!user_id) return res.json({ success: false, message: 'User ID diperlukan' });

    const db = await getConnection();
    const today = new Date();
    const dayName = getDayName(today);
    const todayStr = today.toISOString().split('T')[0];
    const currentTime = today.toTimeString().substring(0, 5);

    // Cek hari kerja & libur
    const [jamKerjaRows] = await db.execute(
      'SELECT jam_masuk, batas_absen, jam_pulang, is_kerja FROM jam_kerja_hari WHERE hari = ?',
      [dayName]
    );
    const [hariLiburRows] = await db.execute(
      'SELECT nama_libur FROM hari_libur WHERE tanggal = ? AND is_active = 1',
      [todayStr]
    );

    const isWorkDay = jamKerjaRows.length > 0 && jamKerjaRows[0].is_kerja === 1;
    const isHoliday = hariLiburRows.length > 0;

    // Notifikasi hari libur besok
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];
    const [liburBesok] = await db.execute(
      'SELECT nama_libur FROM hari_libur WHERE tanggal = ? AND is_active = 1',
      [tomorrowStr]
    );
    if (liburBesok.length > 0) {
      await upsertNotifikasi(
        db, user_id,
        `Libur: ${liburBesok[0].nama_libur}`,
        `Besok tanggal ${tomorrowStr} adalah hari libur: ${liburBesok[0].nama_libur}`,
        'hari_libur',
        { tanggal: tomorrowStr }
      );
    }

    // Generate & simpan notifikasi reminder hari ini
    if (isWorkDay && !isHoliday) {
      const jamKerja = jamKerjaRows[0];
      const jamMasuk = jamKerja.jam_masuk.substring(0, 5);
      const batasAbsen = jamKerja.batas_absen.substring(0, 5);
      const jamPulang = jamKerja.jam_pulang.substring(0, 5);

      const [presensiToday] = await db.execute(
        'SELECT jam_masuk, jam_pulang FROM presensi WHERE id_user = ? AND DATE(tanggal) = ?',
        [user_id, todayStr]
      );

      const sudahAbsenMasuk = presensiToday.length > 0 && presensiToday[0].jam_masuk;
      const sudahAbsenPulang = presensiToday.length > 0 && presensiToday[0].jam_pulang;

      // Reminder masuk
      if (currentTime >= jamMasuk && currentTime <= jamPulang) {
        if (sudahAbsenMasuk) {
          await upsertNotifikasi(db, user_id,
            'Sudah Absen Masuk',
            `Anda sudah absen masuk pada pukul ${presensiToday[0].jam_masuk.substring(0, 5)} WIB`,
            'absen_masuk', { tanggal: todayStr }
          );
        } else {
          const tipe = currentTime > batasAbsen ? 'reminder_terlambat' : 'reminder_masuk';
          const judul = currentTime > batasAbsen ? 'Anda Terlambat!' : 'Reminder Absen Masuk';
          const pesan = currentTime > batasAbsen
            ? `Sudah melewati batas absen pukul ${batasAbsen} WIB. Segera absen atau ajukan izin!`
            : `Jangan lupa absen masuk sebelum pukul ${batasAbsen} WIB!`;
          await upsertNotifikasi(db, user_id, judul, pesan, tipe, { tanggal: todayStr });
        }
      }

      // Reminder pulang
      if (sudahAbsenMasuk) {
        if (sudahAbsenPulang) {
          await upsertNotifikasi(db, user_id,
            'Sudah Absen Pulang',
            `Anda sudah absen pulang pada pukul ${presensiToday[0].jam_pulang.substring(0, 5)} WIB`,
            'absen_pulang', { tanggal: todayStr }
          );
        } else if (currentTime >= jamPulang) {
          await upsertNotifikasi(db, user_id,
            'Reminder Absen Pulang',
            'Jangan lupa absen pulang sebelum meninggalkan kantor!',
            'reminder_pulang', { tanggal: todayStr }
          );
        }
      }
    }

    // Simpan notifikasi lupa absen pulang (hari sebelumnya)
    const [lupaAbsenRows] = await db.execute(`
      SELECT tanggal FROM presensi 
      WHERE id_user = ? AND jam_masuk IS NOT NULL AND jam_pulang IS NULL AND DATE(tanggal) < ?
      ORDER BY tanggal DESC LIMIT 5
    `, [user_id, todayStr]);

    for (const item of lupaAbsenRows) {
      const tanggalStr = (item.tanggal.toISOString ? item.tanggal.toISOString() : String(item.tanggal)).split('T')[0];
      const label = new Date(tanggalStr).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
      await upsertNotifikasi(
        db, user_id,
        'Lupa Absen Pulang',
        `Anda belum absen pulang pada ${label}. Hubungi admin untuk koreksi.`,
        'info', { tanggal: tanggalStr }
      );
    }

    // Ambil semua notifikasi dari database
    const [rows] = await db.execute(
      `SELECT id_notifikasi, judul, pesan, tipe, data, is_read, created_at 
       FROM notifikasi WHERE id_user = ? ORDER BY created_at DESC LIMIT 50`,
      [user_id]
    );

    const notifications = rows.map(row => {
      const meta = getTipeMeta(row.tipe);
      return {
        id: `notif-${row.id_notifikasi}`,
        type: row.tipe,
        title: row.judul,
        message: row.pesan,
        time: row.created_at,
        reference_type: meta.reference_type,
        reference_id: row.id_notifikasi,
        icon: meta.icon,
        color: meta.color,
        priority: meta.priority,
        is_read: row.is_read === 1,
        created_at: row.created_at,
      };
    });

    const unreadCount = notifications.filter(n => !n.is_read).length;
    res.json({ success: true, data: notifications, unread_count: unreadCount });

  } catch (error) {
    console.error('Get inbox notifications error:', error);
    res.json({ success: false, message: 'Database error: ' + error.message });
  }
};

const markNotificationAsRead = async (req, res) => {
  try {
    const { user_id, notification_id } = req.body;
    if (!user_id || !notification_id) {
      return res.json({ success: false, message: 'User ID dan Notification ID diperlukan' });
    }
    const db = await getConnection();
    const realId = String(notification_id).replace('notif-', '');
    await db.execute(
      'UPDATE notifikasi SET is_read = 1 WHERE id_notifikasi = ? AND id_user = ?',
      [realId, user_id]
    );
    res.json({ success: true, message: 'Notifikasi ditandai sebagai sudah dibaca' });
  } catch (error) {
    console.error('Mark notification as read error:', error);
    res.json({ success: false, message: 'Database error: ' + error.message });
  }
};

const getUnreadCount = async (req, res) => {
  try {
    const { user_id } = req.query;
    if (!user_id) return res.json({ success: true, unread_count: 0 });
    const db = await getConnection();
    const [rows] = await db.execute(
      'SELECT COUNT(*) as unread_count FROM notifikasi WHERE id_user = ? AND is_read = 0',
      [user_id]
    );
    res.json({ success: true, unread_count: rows[0].unread_count || 0 });
  } catch (error) {
    console.error('Get unread count error:', error);
    res.json({ success: false, unread_count: 0 });
  }
};

const markAllNotificationsAsRead = async (req, res) => {
  try {
    const { user_id } = req.body;
    if (!user_id) return res.json({ success: false, message: 'User ID diperlukan' });
    const db = await getConnection();
    await db.execute(
      'UPDATE notifikasi SET is_read = 1 WHERE id_user = ? AND is_read = 0',
      [user_id]
    );
    res.json({ success: true, message: 'Semua notifikasi ditandai sudah dibaca' });
  } catch (error) {
    console.error('Mark all as read error:', error);
    res.json({ success: false, message: 'Database error: ' + error.message });
  }
};

module.exports = { getInboxNotifications, markNotificationAsRead, markAllNotificationsAsRead, getUnreadCount };
