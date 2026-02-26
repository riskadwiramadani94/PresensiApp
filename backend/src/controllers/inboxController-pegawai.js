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

      // Reminder absen masuk (dari jam_masuk sampai batas_absen)
      if (currentTime >= jamMasuk && currentTime <= batasAbsen && !sudahAbsenMasuk) {
        notifications.push({
          id: `reminder-masuk-${todayStr}`,
          type: 'reminder_absen_masuk',
          title: 'Reminder Absen Masuk',
          desc: `Jangan lupa absen masuk sebelum pukul ${batasAbsen}!`,
          time: 'Sekarang',
          icon: 'time',
          color: '#2196F3',
          priority: 'high',
          isCompleted: false
        });
      }

      // Terlambat absen masuk (setelah batas_absen sampai jam_pulang)
      if (currentTime > batasAbsen && currentTime <= jamPulang && !sudahAbsenMasuk) {
        notifications.push({
          id: `terlambat-masuk-${todayStr}`,
          type: 'terlambat_absen_masuk',
          title: 'Belum Absen Masuk',
          desc: 'Anda belum absen masuk hari ini. Absen sekarang akan tercatat terlambat.',
          time: 'Sekarang',
          icon: 'alert-circle',
          color: '#F44336',
          priority: 'critical',
          isCompleted: false
        });
      }

      // Reminder absen pulang (1 jam sebelum jam pulang sampai jam pulang)
      const [pulangHour, pulangMin] = jamPulang.split(':').map(Number);
      const oneHourBefore = `${String(pulangHour - 1).padStart(2, '0')}:${String(pulangMin).padStart(2, '0')}`;
      
      if (currentTime >= oneHourBefore && currentTime <= jamPulang && sudahAbsenMasuk && !sudahAbsenPulang) {
        notifications.push({
          id: `reminder-pulang-${todayStr}`,
          type: 'reminder_absen_pulang',
          title: 'Reminder Absen Pulang',
          desc: 'Jangan lupa absen pulang sebelum meninggalkan kantor!',
          time: 'Sekarang',
          icon: 'time',
          color: '#2196F3',
          priority: 'medium',
          isCompleted: false
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
      const itemDate = new Date(item.tanggal);
      const daysAgo = Math.floor((today - itemDate) / (1000 * 60 * 60 * 24));
      
      notifications.push({
        id: `lupa-${item.tanggal}`,
        type: 'lupa_absen_pulang',
        title: 'Lupa Absen Pulang',
        desc: `Anda belum absen pulang pada ${formatDate(item.tanggal)}. Hubungi admin untuk koreksi.`,
        time: `${daysAgo} hari yang lalu`,
        icon: 'alert-circle',
        color: '#FF9800',
        tanggal: item.tanggal,
        priority: 'high',
        isCompleted: false
      });
    });

    console.log('Total notifikasi:', notifications.length);
    console.log('===================');

    res.json({
      success: true,
      data: notifications
    });

  } catch (error) {
    console.error('Get inbox notifications error:', error);
    res.json({ 
      success: false, 
      message: 'Database error: ' + error.message 
    });
  }
};

module.exports = { getInboxNotifications };
