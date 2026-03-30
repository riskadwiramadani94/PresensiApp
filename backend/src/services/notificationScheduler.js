const cron = require('node-cron');
const { getConnection } = require('../config/database');
const PushNotificationService = require('./pushNotificationService');

function getCurrentTime() {
  const now = new Date();
  const wib = new Date(now.getTime() + (7 * 60 * 60 * 1000));
  const hours = String(wib.getUTCHours()).padStart(2, '0');
  const minutes = String(wib.getUTCMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

function getCurrentDay() {
  const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const now = new Date();
  const wib = new Date(now.getTime() + (7 * 60 * 60 * 1000));
  return days[wib.getUTCDay()];
}

function getTodayWIB() {
  const now = new Date();
  const wib = new Date(now.getTime() + (7 * 60 * 60 * 1000));
  return wib.toISOString().split('T')[0];
}

function subtractMinutes(timeString, minutes) {
  const [hours, mins] = timeString.split(':').map(Number);
  const totalMinutes = hours * 60 + mins - minutes;
  if (totalMinutes < 0) return null;
  const newHours = Math.floor(totalMinutes / 60);
  const newMinutes = totalMinutes % 60;
  return `${String(newHours).padStart(2, '0')}:${String(newMinutes).padStart(2, '0')}`;
}

async function saveNotifikasi(db, id_user, judul, pesan, tipe, data = null) {
  const today = getTodayWIB();
  const [existing] = await db.execute(
    `SELECT id_notifikasi FROM notifikasi WHERE id_user = ? AND tipe = ? AND DATE(created_at) = ? AND judul = ? LIMIT 1`,
    [id_user, tipe, today, judul]
  );
  if (existing.length > 0) return;
  await db.execute(
    `INSERT INTO notifikasi (id_user, judul, pesan, tipe, data, is_read) VALUES (?, ?, ?, ?, ?, 0)`,
    [id_user, judul, pesan, tipe, data ? JSON.stringify(data) : null]
  );
}

/* ========================================
        NOTIFIKASI: HARI LIBUR
   ======================================== */
async function checkAndSendReminderLibur() {
  try {
    const currentTime = getCurrentTime();
    if (currentTime !== '07:00') return;

    const currentDay = getCurrentDay();
    const today = getTodayWIB();
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

    const [pegawai] = await db.execute("SELECT id_user FROM users WHERE role = 'pegawai'");
    if (pegawai.length === 0) return;

    const pegawaiIds = pegawai.map(p => p.id_user);
    const judul = '🎉 Hari Libur';
    const pesan = `Hari ini libur (${namaLibur}), tidak perlu absen. Selamat beristirahat!`;

    await PushNotificationService.sendToMultipleUsers(pegawaiIds, judul, pesan, 'hari_libur', { hari_libur: namaLibur });

    for (const id of pegawaiIds) {
      await saveNotifikasi(db, id, judul, pesan, 'hari_libur', { hari_libur: namaLibur });
    }

    console.log(`[SCHEDULER-LIBUR] Notifikasi libur terkirim ke ${pegawaiIds.length} pegawai`);
  } catch (error) {
    console.error('[SCHEDULER-LIBUR] Error:', error);
  }
}

/* ========================================
        NOTIFIKASI: REMINDER ABSEN MASUK
   ======================================== */
async function checkAndSendReminderMasuk() {
  try {
    const currentTime = getCurrentTime();
    const currentDay = getCurrentDay();
    const today = getTodayWIB();
    const db = await getConnection();

    const [hariLibur] = await db.execute(
      'SELECT id_hari_libur FROM hari_libur WHERE tanggal = ? AND is_active = 1',
      [today]
    );
    if (hariLibur.length > 0) return;

    const [jamKerja] = await db.execute(
      'SELECT jam_masuk, batas_absen, is_kerja FROM jam_kerja_hari WHERE hari = ?',
      [currentDay]
    );
    if (jamKerja.length === 0 || jamKerja[0].is_kerja === 0) return;

    const jamMasuk = jamKerja[0].jam_masuk;
    const batasAbsen = jamKerja[0].batas_absen.substring(0, 5);
    const reminderTime = subtractMinutes(jamMasuk, 60);

    if (!reminderTime || currentTime !== reminderTime) return;

    const [pegawai] = await db.execute("SELECT id_user FROM users WHERE role = 'pegawai'");
    if (pegawai.length === 0) return;

    const pegawaiIds = pegawai.map(p => p.id_user);
    const judul = '⏰ Absen Masuk';
    const pesan = `Jangan lupa absen masuk sebelum pukul ${batasAbsen} WIB. Semangat bekerja!`;

    await PushNotificationService.sendToMultipleUsers(pegawaiIds, judul, pesan, 'reminder_masuk', { jam_masuk: jamMasuk });

    for (const id of pegawaiIds) {
      await saveNotifikasi(db, id, judul, pesan, 'reminder_masuk', { jam_masuk: jamMasuk });
    }

    console.log(`[SCHEDULER] Reminder absen masuk terkirim ke ${pegawaiIds.length} pegawai`);
  } catch (error) {
    console.error('[SCHEDULER] Error in checkAndSendReminderMasuk:', error);
  }
}

/* ========================================
        NOTIFIKASI: REMINDER TERLAMBAT
   ======================================== */
async function checkAndSendReminderTerlambat() {
  try {
    const currentTime = getCurrentTime();
    const currentDay = getCurrentDay();
    const today = getTodayWIB();
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

    const [h, m] = jamMasuk.split(':').map(Number);
    const batasWaktu = `${String(h + 2).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    if (currentTime > batasWaktu) return;

    const [ch, cm] = currentTime.split(':').map(Number);
    const selisihMenit = (ch * 60 + cm) - (h * 60 + m);
    if (selisihMenit % 30 !== 0) return;

    const [pegawaiTerlambat] = await db.execute(`
      SELECT u.id_user FROM users u
      WHERE u.role = 'pegawai'
      AND u.id_user NOT IN (
        SELECT id_user FROM presensi WHERE DATE(tanggal) = ? AND jam_masuk IS NOT NULL
      )
    `, [today]);

    if (pegawaiTerlambat.length === 0) return;

    const pegawaiIds = pegawaiTerlambat.map(p => p.id_user);
    const judul = '⚠️ Terlambat';
    const pesan = `Anda belum absen masuk! Jam masuk adalah ${jamMasuk}. Segera lakukan absen.`;

    await PushNotificationService.sendToMultipleUsers(pegawaiIds, judul, pesan, 'reminder_terlambat', { jam_masuk: jamMasuk });

    for (const id of pegawaiIds) {
      await saveNotifikasi(db, id, judul, pesan, 'reminder_terlambat', { jam_masuk: jamMasuk });
    }

    console.log(`[SCHEDULER] Reminder terlambat terkirim ke ${pegawaiIds.length} pegawai`);
  } catch (error) {
    console.error('[SCHEDULER] Error in checkAndSendReminderTerlambat:', error);
  }
}

/* ========================================
        NOTIFIKASI: REMINDER ABSEN PULANG
   ======================================== */
async function checkAndSendReminderPulang() {
  try {
    const currentTime = getCurrentTime();
    const currentDay = getCurrentDay();
    const today = getTodayWIB();
    const db = await getConnection();

    const [hariLibur] = await db.execute(
      'SELECT id_hari_libur FROM hari_libur WHERE tanggal = ? AND is_active = 1',
      [today]
    );
    if (hariLibur.length > 0) return;

    const [jamKerjaHistory] = await db.execute(`
      SELECT jam_pulang, is_kerja FROM jam_kerja_history
      WHERE hari = ? AND ? BETWEEN tanggal_mulai_berlaku AND IFNULL(tanggal_selesai_berlaku, '9999-12-31')
      ORDER BY tanggal_mulai_berlaku DESC LIMIT 1
    `, [currentDay, today]);

    let jamPulang, isKerja;
    if (jamKerjaHistory.length > 0) {
      jamPulang = jamKerjaHistory[0].jam_pulang;
      isKerja = jamKerjaHistory[0].is_kerja;
    } else {
      const [jamKerjaHari] = await db.execute(
        'SELECT jam_pulang, is_kerja FROM jam_kerja_hari WHERE hari = ?',
        [currentDay]
      );
      if (jamKerjaHari.length === 0 || jamKerjaHari[0].is_kerja === 0) return;
      jamPulang = jamKerjaHari[0].jam_pulang;
      isKerja = jamKerjaHari[0].is_kerja;
    }

    if (isKerja === 0) return;

    const reminderTime = subtractMinutes(jamPulang, 30);
    if (!reminderTime || currentTime !== reminderTime) return;

    const [pegawai] = await db.execute(
      `SELECT DISTINCT id_user FROM presensi WHERE tanggal = CURDATE() AND jam_masuk IS NOT NULL AND jam_pulang IS NULL`
    );
    if (pegawai.length === 0) return;

    const pegawaiIds = pegawai.map(p => p.id_user);
    const judul = '🏠 Absen Pulang';
    const pesan = `Jangan lupa absen pulang hari ini jam ${jamPulang.substring(0, 5)}. Selamat beristirahat!`;

    await PushNotificationService.sendToMultipleUsers(pegawaiIds, judul, pesan, 'reminder_pulang', { jam_pulang: jamPulang });

    for (const id of pegawaiIds) {
      await saveNotifikasi(db, id, judul, pesan, 'reminder_pulang', { jam_pulang: jamPulang });
    }

    console.log(`[SCHEDULER] Reminder absen pulang terkirim ke ${pegawaiIds.length} pegawai`);
  } catch (error) {
    console.error('[SCHEDULER] Error in checkAndSendReminderPulang:', error);
  }
}

function startScheduler() {
  console.log('[SCHEDULER] Starting notification scheduler...');
  cron.schedule('* * * * *', async () => {
    try {
      await checkAndSendReminderLibur();
      await checkAndSendReminderMasuk();
      await checkAndSendReminderTerlambat();
      await checkAndSendReminderPulang();
    } catch (error) {
      console.error('[SCHEDULER] Error:', error);
    }
  });
  console.log('[SCHEDULER] ✅ Notification scheduler started');
}

module.exports = { startScheduler };
