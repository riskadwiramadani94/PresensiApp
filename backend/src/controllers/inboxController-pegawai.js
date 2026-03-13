const { getConnection } = require('../config/database');

const getDayName = (date) => {
  const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  return days[date.getDay()];
};

const formatDate = (dateStr) => {
  const date = new Date(dateStr);
  const day = date.getDate();
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Ags', 'Sep', 'Okt', 'Nov', 'Des'];
  return `${day} ${months[date.getMonth()]}`;
};

const getInboxNotifications = async (req, res) => {
  try {
    const { user_id } = req.query;
    
    if (!user_id) {
      return res.json({ success: false, message: 'User ID diperlukan' });
    }

    const db = await getConnection();
    const today = new Date();
    const dayName = getDayName(today);
    const todayStr = today.toISOString().split('T')[0];
    const currentTime = today.toTimeString().split(' ')[0].substring(0, 5); // HH:MM
    
    console.log('=== INBOX DEBUG ===');
    console.log('User ID:', user_id);
    console.log('Hari:', dayName);
    console.log('Tanggal:', todayStr);
    console.log('Waktu sekarang:', currentTime);
    
    const notifications = [];

    // 1. Ambil jam kerja hari ini
    const [jamKerjaRows] = await db.execute(
      'SELECT jam_masuk, batas_absen, jam_pulang, is_kerja FROM jam_kerja_hari WHERE hari = ?',
      [dayName]
    );

    // 2. Cek hari libur
    const [hariLiburRows] = await db.execute(
      'SELECT nama_libur FROM hari_libur WHERE tanggal = ? AND is_active = 1',
      [todayStr]
    );

    const isHoliday = hariLiburRows.length > 0;
    const isWorkDay = jamKerjaRows.length > 0 && jamKerjaRows[0].is_kerja === 1;

    console.log('Hari kerja?', isWorkDay);
    console.log('Hari libur?', isHoliday);
    console.log('Jam kerja data:', jamKerjaRows[0]);

    // 3. Reminder absen hari ini (hanya jika hari kerja dan bukan libur)
    if (isWorkDay && !isHoliday) {
      const jamKerja = jamKerjaRows[0];
      const jamMasuk = jamKerja.jam_masuk.substring(0, 5);
      const batasAbsen = jamKerja.batas_absen.substring(0, 5);
      const jamPulang = jamKerja.jam_pulang.substring(0, 5);

      // Cek presensi hari ini
      const [presensiToday] = await db.execute(
        'SELECT jam_masuk, jam_pulang FROM presensi WHERE id_user = ? AND DATE(tanggal) = ?',
        [user_id, todayStr]
      );

      const sudahAbsenMasuk = presensiToday.length > 0 && presensiToday[0].jam_masuk;
      const sudahAbsenPulang = presensiToday.length > 0 && presensiToday[0].jam_pulang;

      console.log('Jam Masuk:', jamMasuk);
      console.log('Batas Absen:', batasAbsen);
      console.log('Jam Pulang:', jamPulang);
      console.log('Sudah absen masuk?', sudahAbsenMasuk);
      console.log('Sudah absen pulang?', sudahAbsenPulang);

      // Reminder absen masuk - TETAP TAMPIL sebagai history
      if (currentTime >= jamMasuk && currentTime <= jamPulang) {
        const timestamp = sudahAbsenMasuk && presensiToday[0].jam_masuk
          ? new Date(`${todayStr}T${presensiToday[0].jam_masuk}+07:00`).toISOString()
          : new Date().toISOString();
        
        notifications.push({
          id: `reminder-masuk-${todayStr}`,
          type: 'reminder_absen_masuk',
          title: sudahAbsenMasuk ? 'Sudah Absen Masuk' : 'Reminder Absen Masuk',
          desc: sudahAbsenMasuk 
            ? `Anda sudah absen masuk pada pukul ${presensiToday[0].jam_masuk.substring(0, 5)} WIB`
            : `Jangan lupa absen masuk sebelum pukul ${batasAbsen} WIB!`,
          time: timestamp,
          icon: sudahAbsenMasuk ? 'checkmark-circle' : 'time',
          color: sudahAbsenMasuk ? '#4CAF50' : (currentTime > batasAbsen ? '#F44336' : '#2196F3'),
          priority: sudahAbsenMasuk ? 'low' : 'high',
          isCompleted: sudahAbsenMasuk
        });
      }

      // Reminder absen pulang - TETAP TAMPIL sebagai history
      if (sudahAbsenMasuk) {
        const timestamp = sudahAbsenPulang && presensiToday[0].jam_pulang
          ? new Date(`${todayStr}T${presensiToday[0].jam_pulang}+07:00`).toISOString()
          : new Date().toISOString();
        
        notifications.push({
          id: `reminder-pulang-${todayStr}`,
          type: 'reminder_absen_pulang',
          title: sudahAbsenPulang ? 'Sudah Absen Pulang' : 'Reminder Absen Pulang',
          desc: sudahAbsenPulang
            ? `Anda sudah absen pulang pada pukul ${presensiToday[0].jam_pulang.substring(0, 5)} WIB`
            : 'Jangan lupa absen pulang sebelum meninggalkan kantor!',
          time: timestamp,
          icon: sudahAbsenPulang ? 'checkmark-circle' : 'time',
          color: sudahAbsenPulang ? '#4CAF50' : '#2196F3',
          priority: sudahAbsenPulang ? 'low' : 'medium',
          isCompleted: sudahAbsenPulang
        });
      }
    }

    // 4. Cek lupa absen pulang (hari sebelumnya)
    const [lupaAbsenRows] = await db.execute(`
      SELECT tanggal, jam_masuk 
      FROM presensi 
      WHERE id_user = ? 
        AND jam_masuk IS NOT NULL 
        AND jam_pulang IS NULL 
        AND DATE(tanggal) < ?
      ORDER BY tanggal DESC
      LIMIT 5
    `, [user_id, todayStr]);

    lupaAbsenRows.forEach(item => {
      try {
        // Convert tanggal ke string dulu, lalu extract date only
        const tanggalStr = item.tanggal.toISOString ? item.tanggal.toISOString() : String(item.tanggal);
        const dateOnly = tanggalStr.split('T')[0]; // 2026-02-25
        const dateTime = `${dateOnly}T${item.jam_masuk}+07:00`;
        const timestamp = new Date(dateTime).toISOString();
        
        notifications.push({
          id: `lupa-${dateOnly}`,
          type: 'lupa_absen_pulang',
          title: 'Lupa Absen Pulang',
          desc: `Anda belum absen pulang pada ${formatDate(dateOnly)}. Hubungi admin untuk koreksi.`,
          time: timestamp,
          icon: 'alert-circle',
          color: '#FF9800',
          tanggal: dateOnly,
          priority: 'high',
          isCompleted: false
        });
      } catch (err) {
        console.log('Error parsing timestamp:', item.tanggal, item.jam_masuk, err.message);
      }
    });

    console.log('Total notifikasi:', notifications.length);
    
    // Hitung unread count (notifikasi yang belum selesai)
    const unreadCount = notifications.filter(n => !n.isCompleted).length;
    console.log('Unread count:', unreadCount);
    console.log('===================');

    res.json({
      success: true,
      data: notifications,
      unread_count: unreadCount
    });

  } catch (error) {
    console.error('Get inbox notifications error:', error);
    res.json({ 
      success: false, 
      message: 'Database error: ' + error.message 
    });
  }
};

// Fungsi untuk menandai notifikasi sebagai sudah dibaca
const markNotificationAsRead = async (req, res) => {
  try {
    const { user_id, notification_id } = req.body;
    
    if (!user_id || !notification_id) {
      return res.json({ success: false, message: 'User ID dan Notification ID diperlukan' });
    }

    const db = await getConnection();
    
    await db.execute(
      'UPDATE notifications SET is_read = 1, updated_at = NOW() WHERE id_notification = ? AND id_user = ?',
      [notification_id, user_id]
    );

    res.json({
      success: true,
      message: 'Notifikasi ditandai sebagai sudah dibaca'
    });

  } catch (error) {
    console.error('Mark notification as read error:', error);
    res.json({ 
      success: false, 
      message: 'Database error: ' + error.message 
    });
  }
};

// Fungsi untuk mendapatkan jumlah notifikasi yang belum dibaca
const getUnreadCount = async (req, res) => {
  try {
    const { user_id } = req.query;
    
    if (!user_id) {
      return res.json({ success: false, unread_count: 0 });
    }

    const db = await getConnection();
    
    const [countRows] = await db.execute(
      'SELECT COUNT(*) as unread_count FROM notifications WHERE id_user = ? AND is_read = 0',
      [user_id]
    );

    res.json({
      success: true,
      unread_count: countRows[0].unread_count || 0
    });

  } catch (error) {
    console.error('Get unread count error:', error);
    res.json({ 
      success: false, 
      unread_count: 0
    });
  }
};

module.exports = { getInboxNotifications, markNotificationAsRead, getUnreadCount };
