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
    return null; // Waktu tidak valid
  }
  
  const newHours = Math.floor(totalMinutes / 60);
  const newMinutes = totalMinutes % 60;
  
  return `${String(newHours).padStart(2, '0')}:${String(newMinutes).padStart(2, '0')}`;
}

// Cek dan kirim reminder absen masuk (1 jam sebelum)
async function checkAndSendReminderMasuk() {
  try {
    const currentTime = getCurrentTime();
    const currentDay = getCurrentDay();
    
    const db = await getConnection();
    
    // Ambil jam kerja hari ini
    const [jamKerja] = await db.execute(
      'SELECT jam_masuk, is_kerja FROM jam_kerja_hari WHERE hari = ?',
      [currentDay]
    );
    
    if (jamKerja.length === 0 || jamKerja[0].is_kerja === 0) {
      // Hari ini libur atau tidak ada data
      return;
    }
    
    const jamMasuk = jamKerja[0].jam_masuk;
    const reminderTime = subtractMinutes(jamMasuk, 60); // 1 jam sebelum jam masuk
    
    if (!reminderTime || currentTime !== reminderTime) {
      // Belum waktunya reminder
      return;
    }
    
    console.log(`[SCHEDULER] Sending reminder absen masuk for ${currentDay} at ${currentTime}`);
    
    // Ambil semua pegawai
    const [pegawai] = await db.execute(
      "SELECT id_user FROM users WHERE role = 'pegawai'"
    );
    
    if (pegawai.length === 0) {
      return;
    }
    
    const pegawaiIds = pegawai.map(p => p.id_user);
    
    // Kirim notifikasi
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

// Cek dan kirim reminder terlambat (sudah lewat jam masuk tapi belum absen)
async function checkAndSendReminderTerlambat() {
  try {
    const currentTime = getCurrentTime();
    const currentDay = getCurrentDay();
    const today = new Date().toISOString().split('T')[0];
    
    const db = await getConnection();
    
    // Ambil jam kerja hari ini
    const [jamKerja] = await db.execute(
      'SELECT jam_masuk, is_kerja FROM jam_kerja_hari WHERE hari = ?',
      [currentDay]
    );
    
    if (jamKerja.length === 0 || jamKerja[0].is_kerja === 0) {
      return;
    }
    
    const jamMasuk = jamKerja[0].jam_masuk.substring(0, 5);
    
    // Cek apakah sudah lewat jam masuk
    if (currentTime <= jamMasuk) {
      return;
    }
    
    console.log(`[SCHEDULER] Checking for late employees at ${currentTime}`);
    
    // Ambil pegawai yang belum absen masuk hari ini
    const [pegawaiTerlambat] = await db.execute(`
      SELECT u.id_user 
      FROM users u
      WHERE u.role = 'pegawai'
      AND u.id_user NOT IN (
        SELECT id_user FROM presensi 
        WHERE DATE(tanggal) = ? AND jam_masuk IS NOT NULL
      )
    `, [today]);
    
    if (pegawaiTerlambat.length === 0) {
      return;
    }
    
    const pegawaiIds = pegawaiTerlambat.map(p => p.id_user);
    
    // Kirim notifikasi terlambat
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

// Cek dan kirim reminder absen pulang
async function checkAndSendReminderPulang() {
  try {
    const currentTime = getCurrentTime();
    const currentDay = getCurrentDay();
    
    const db = await getConnection();
    
    // Ambil jam kerja hari ini dari jam_kerja_history (prioritas) atau jam_kerja_hari (fallback)
    const today = new Date().toISOString().split('T')[0];
    
    // Cek jam_kerja_history dulu
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
      // Ada data di jam_kerja_history
      jamPulang = jamKerjaHistory[0].jam_pulang;
      isKerja = jamKerjaHistory[0].is_kerja;
    } else {
      // Fallback ke jam_kerja_hari
      const [jamKerjaHari] = await db.execute(
        'SELECT jam_pulang, is_kerja FROM jam_kerja_hari WHERE hari = ?',
        [currentDay]
      );
      
      if (jamKerjaHari.length === 0 || jamKerjaHari[0].is_kerja === 0) {
        // Hari ini libur atau tidak ada data
        return;
      }
      
      jamPulang = jamKerjaHari[0].jam_pulang;
      isKerja = jamKerjaHari[0].is_kerja;
    }
    
    if (isKerja === 0) {
      // Hari ini libur
      return;
    }
    
    const reminderTime = subtractMinutes(jamPulang, 30); // 30 menit sebelum jam pulang
    
    if (!reminderTime || currentTime !== reminderTime) {
      // Belum waktunya reminder
      return;
    }
    
    console.log(`[SCHEDULER] Sending reminder absen pulang for ${currentDay} at ${currentTime}`);
    
    // Ambil pegawai yang sudah absen masuk hari ini tapi belum pulang
    const [pegawai] = await db.execute(
      `SELECT DISTINCT id_user FROM presensi 
       WHERE tanggal = CURDATE() AND jam_masuk IS NOT NULL AND jam_pulang IS NULL`
    );
    
    if (pegawai.length === 0) {
      console.log('[SCHEDULER] No pegawai to remind for absen pulang');
      return;
    }
    
    const pegawaiIds = pegawai.map(p => p.id_user);
    
    // Kirim notifikasi
    await PushNotificationService.sendToMultipleUsers(
      pegawaiIds,
      '🏠 Reminder Absen Pulang',
      `Jangan lupa absen pulang hari ini jam ${jamPulang.substring(0, 5)}. Selamat beristirahat!`,
      'reminder_pulang',
      { jam_pulang: jamPulang }
    );
    
    console.log(`[SCHEDULER] Reminder absen pulang sent to ${pegawaiIds.length} pegawai`);
    
  } catch (error) {
    console.error('[SCHEDULER] Error in checkAndSendReminderPulang:', error);
  }
}

// Start scheduler
function startScheduler() {
  console.log('[SCHEDULER] Starting notification scheduler...');
  
  // Cron job jalan setiap menit
  cron.schedule('* * * * *', async () => {
    const now = new Date();
    console.log(`[SCHEDULER] Running at ${now.toLocaleTimeString('id-ID')}`);
    
    try {
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
