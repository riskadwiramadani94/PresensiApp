const cron = require('node-cron');
const { getConnection } = require('../config/database');
const PushNotificationService = require('./pushNotificationService');

// Helper: Dapatkan waktu sekarang dalam format HH:mm
function getCurrentTime() {
  const now = new Date();
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

// Helper: Dapatkan hari ini dalam bahasa Indonesia
function getCurrentDay() {
  const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const now = new Date();
  return days[now.getDay()];
}

// Helper: Kurangi menit dari waktu (format HH:mm:ss)
function subtractMinutes(timeString, minutes) {
  const [hours, mins] = timeString.split(':').map(Number);
  const totalMinutes = hours * 60 + mins - minutes;
  
  if (totalMinutes < 0) {
    return null;
  }
  
  const newHours = Math.floor(totalMinutes / 60);
  const newMinutes = totalMinutes % 60;
  
  return `${String(newHours).padStart(2, '0')}:${String(newMinutes).padStart(2, '0')}`;
}

/* ========================================
        NOTIFIKASI: HARI LIBUR
        - Dikirim ke: Semua Pegawai
        - Type: 'hari_libur'
        - Icon: 🎉
        - Trigger: Jam 07:00, cek hari_libur & is_kerja = 0
   ======================================== */
async function checkAndSendReminderLibur() {
  try {
    const currentTime = getCurrentTime();
    if (currentTime !== '07:00') return;

    const currentDay = getCurrentDay();
    const today = new Date().toISOString().split('T')[0];
    const db = await getConnection();

    const [hariLibur] = await db.execute(
      'SELECT nama_libur FROM hari_libur WHERE tanggal = ? AND is_active = 1',
      [today]
    );

    let namaLibur = null;

    if (hariLibur.length > 0) {
      namaLibur = hariLibur[0].nama_libur;
    } else {
      const [jamKerja] = await db.execute(
        'SELECT is_kerja FROM jam_kerja_hari WHERE hari = ?',
        [currentDay]
      );
      if (jamKerja.length > 0 && jamKerja[0].is_kerja === 0) {
        namaLibur = currentDay;
      }
    }

    if (!namaLibur) return;

    console.log(`[SCHEDULER-LIBUR] Hari libur: ${namaLibur}`);

    const [pegawai] = await db.execute(
      "SELECT id_user FROM users WHERE role = 'pegawai'"
    );

    if (pegawai.length === 0) return;

    const pegawaiIds = pegawai.map(p => p.id_user);

    await PushNotificationService.sendToMultipleUsers(
      pegawaiIds,
      '🎉 Hari Libur',
      `Hari ini libur (${namaLibur}), tidak perlu absen. Selamat beristirahat!`,
      'hari_libur',
      { hari_libur: namaLibur }
    );

    console.log(`[SCHEDULER-LIBUR] Notifikasi libur terkirim ke ${pegawaiIds.length} pegawai`);

  } catch (error) {
    console.error('[SCHEDULER-LIBUR] Error:', error);
  }
}

/* ========================================
        NOTIFIKASI: REMINDER ABSEN MASUK
        - Dikirim ke: Semua Pegawai
        - Type: 'reminder_masuk'
        - Icon: ⏰
        - Trigger: 1 jam sebelum jam masuk
   ======================================== */
async function checkAndSendReminderMasuk() {
  try {
    const currentTime = getCurrentTime();
    const currentDay = getCurrentDay();
    const today = new Date().toISOString().split('T')[0];
    
    const db = await getConnection();

    const [hariLibur] = await db.execute(
      'SELECT id_hari_libur FROM hari_libur WHERE tanggal = ? AND is_active = 1',
      [today]
    );
    if (hariLibur.length > 0) return;
    
    const [jamKerja] = await db.execute(
      'SELECT jam_masuk, is_kerja FROM jam_kerja_hari WHERE hari = ?',
      [currentDay]
    );
    
    if (jamKerja.length === 0 || jamKerja[0].is_kerja === 0) return;
    
    const jamMasuk = jamKerja[0].jam_masuk;
    const reminderTime = subtractMinutes(jamMasuk, 60);
    
    if (!reminderTime || currentTime !== reminderTime) return;
    
    console.log(`[SCHEDULER] Sending reminder absen masuk for ${currentDay} at ${currentTime}`);
    
    const [pegawai] = await db.execute(
      "SELECT id_user FROM users WHERE role = 'pegawai'"
    );
    
    if (pegawai.length === 0) return;
    
    const pegawaiIds = pegawai.map(p => p.id_user);
    
    await PushNotificationService.sendToMultipleUsers(
      pegawaiIds,
      '⏰ Reminder Absen Masuk',
      `Jangan lupa absen masuk hari ini jam ${jamMasuk.substring(0, 5)}. Semangat bekerja!`,
      'reminder_masuk',
      { jam_masuk: jamMasuk }
    );
    
    console.log(`[SCHEDULER] Reminder absen masuk sent to ${pegawaiIds.length} pegawai`);
    
  } catch (error) {
    console.error('[SCHEDULER] Error in checkAndSendReminderMasuk:', error);
  }
}

/* ========================================
        NOTIFIKASI: REMINDER TERLAMBAT
        - Dikirim ke: Pegawai yang belum absen masuk
        - Type: 'reminder_terlambat'
        - Icon: ⚠️
        - Trigger: Setiap menit setelah jam masuk
   ======================================== */
async function checkAndSendReminderTerlambat() {
  try {
    const currentTime = getCurrentTime();
    const currentDay = getCurrentDay();
    const today = new Date().toISOString().split('T')[0];
    
    const db = await getConnection();

    const [hariLibur] = await db.execute(
      'SELECT id_hari_libur FROM hari_libur WHERE tanggal = ? AND is_active = 1',
      [today]
    );
    if (hariLibur.length > 0) return;
    
    const [jamKerja] = await db.execute(
      'SELECT jam_masuk, is_kerja FROM jam_kerja_hari WHERE hari = ?',
      [currentDay]
    );
    
    if (jamKerja.length === 0 || jamKerja[0].is_kerja === 0) return;
    
    const jamMasuk = jamKerja[0].jam_masuk.substring(0, 5);
    
    if (currentTime <= jamMasuk) return;
    
    console.log(`[SCHEDULER] Checking for late employees at ${currentTime}`);
    
    const [pegawaiTerlambat] = await db.execute(`
      SELECT u.id_user 
      FROM users u
      WHERE u.role = 'pegawai'
      AND u.id_user NOT IN (
        SELECT id_user FROM presensi 
        WHERE DATE(tanggal) = ? AND jam_masuk IS NOT NULL
      )
    `, [today]);
    
    if (pegawaiTerlambat.length === 0) return;
    
    const pegawaiIds = pegawaiTerlambat.map(p => p.id_user);
    
    await PushNotificationService.sendToMultipleUsers(
      pegawaiIds,
      '⚠️ Reminder Terlambat',
      `Anda belum absen masuk! Jam masuk adalah ${jamMasuk}. Segera lakukan absen.`,
      'reminder_terlambat',
      { jam_masuk: jamMasuk }
    );
    
    console.log(`[SCHEDULER] Reminder terlambat sent to ${pegawaiIds.length} pegawai`);
    
  } catch (error) {
    console.error('[SCHEDULER] Error in checkAndSendReminderTerlambat:', error);
  }
}

/* ========================================
        NOTIFIKASI: REMINDER ABSEN PULANG
        - Dikirim ke: Pegawai yang sudah absen masuk tapi belum pulang
        - Type: 'reminder_pulang'
        - Icon: 🏠
        - Trigger: 30 menit sebelum jam pulang
   ======================================== */
async function checkAndSendReminderPulang() {
  try {
    const currentTime = getCurrentTime();
    const currentDay = getCurrentDay();
    const today = new Date().toISOString().split('T')[0];
    
    const db = await getConnection();

    const [hariLibur] = await db.execute(
      'SELECT id_hari_libur FROM hari_libur WHERE tanggal = ? AND is_active = 1',
      [today]
    );
    if (hariLibur.length > 0) return;
    
    const [jamKerjaHistory] = await db.execute(`
      SELECT jam_pulang, is_kerja 
      FROM jam_kerja_history 
      WHERE hari = ? 
      AND ? BETWEEN tanggal_mulai_berlaku AND IFNULL(tanggal_selesai_berlaku, '9999-12-31')
      ORDER BY tanggal_mulai_berlaku DESC
      LIMIT 1
    `, [currentDay, today]);
    
    let jamPulang, isKerja;
    
    if (jamKerjaHistory.length > 0) {
      jamPulang = jamKerjaHistory[0].jam_pulang;
      isKerja = jamKerjaHistory[0].is_kerja;
      console.log(`[SCHEDULER-PULANG] Using jam_kerja_history: ${jamPulang}`);
    } else {
      const [jamKerjaHari] = await db.execute(
        'SELECT jam_pulang, is_kerja FROM jam_kerja_hari WHERE hari = ?',
        [currentDay]
      );
      
      if (jamKerjaHari.length === 0 || jamKerjaHari[0].is_kerja === 0) {
        console.log(`[SCHEDULER-PULANG] No work schedule for ${currentDay}`);
        return;
      }
      
      jamPulang = jamKerjaHari[0].jam_pulang;
      isKerja = jamKerjaHari[0].is_kerja;
      console.log(`[SCHEDULER-PULANG] Using jam_kerja_hari: ${jamPulang}`);
    }
    
    if (isKerja === 0) {
      console.log(`[SCHEDULER-PULANG] Today is holiday`);
      return;
    }
    
    const reminderTime = subtractMinutes(jamPulang, 30);
    
    console.log(`[SCHEDULER-PULANG] Current: ${currentTime}, Reminder: ${reminderTime}, Jam Pulang: ${jamPulang}`);
    
    if (!reminderTime || currentTime !== reminderTime) return;
    
    console.log(`[SCHEDULER] ⏰ Sending reminder absen pulang for ${currentDay} at ${currentTime}`);
    
    const [pegawai] = await db.execute(
      `SELECT DISTINCT id_user FROM presensi 
       WHERE tanggal = CURDATE() AND jam_masuk IS NOT NULL AND jam_pulang IS NULL`
    );
    
    console.log(`[SCHEDULER-PULANG] Found ${pegawai.length} pegawai to remind`);
    
    if (pegawai.length === 0) {
      console.log('[SCHEDULER] No pegawai to remind for absen pulang');
      return;
    }
    
    const pegawaiIds = pegawai.map(p => p.id_user);
    console.log(`[SCHEDULER-PULANG] Sending to user IDs:`, pegawaiIds);
    
    await PushNotificationService.sendToMultipleUsers(
      pegawaiIds,
      '🏠 Reminder Absen Pulang',
      `Jangan lupa absen pulang hari ini jam ${jamPulang.substring(0, 5)}. Selamat beristirahat!`,
      'reminder_pulang',
      { jam_pulang: jamPulang }
    );
    
    console.log(`[SCHEDULER] ✅ Reminder absen pulang sent to ${pegawaiIds.length} pegawai`);
    
  } catch (error) {
    console.error('[SCHEDULER] ❌ Error in checkAndSendReminderPulang:', error);
  }
}

// Start scheduler
function startScheduler() {
  console.log('[SCHEDULER] Starting notification scheduler...');
  
  cron.schedule('* * * * *', async () => {
    const now = new Date();
    console.log(`[SCHEDULER] Running at ${now.toLocaleTimeString('id-ID')}`);
    
    try {
      await checkAndSendReminderLibur();
      await checkAndSendReminderMasuk();
      await checkAndSendReminderTerlambat();
      await checkAndSendReminderPulang();
    } catch (error) {
      console.error('[SCHEDULER] Error:', error);
    }
  });
  
  console.log('[SCHEDULER] ✅ Notification scheduler started successfully');
  console.log('[SCHEDULER] Will check for reminders every minute');
}

module.exports = { startScheduler };
