const cron = require('node-cron');
const NotificationTriggers = require('./notificationTriggers');
const db = require('../config/database');

class NotificationScheduler {
  static init() {
    console.log('[SCHEDULER] Initializing notification scheduler...');
    
    // Reminder presensi masuk - setiap hari jam 08:00
    cron.schedule('0 8 * * 1-6', async () => {
      console.log('[SCHEDULER] Running presensi masuk reminder...');
      await NotificationTriggers.sendPresensiReminder();
    }, {
      timezone: "Asia/Jakarta"
    });
    
    // Reminder presensi pulang - setiap hari jam 17:00
    cron.schedule('0 17 * * 1-6', async () => {
      console.log('[SCHEDULER] Running presensi pulang reminder...');
      await NotificationTriggers.sendPresensiPulangReminder();
    }, {
      timezone: "Asia/Jakarta"
    });
    
    // Reminder presensi masuk (warning) - setiap hari jam 08:15
    cron.schedule('15 8 * * 1-6', async () => {
      console.log('[SCHEDULER] Running late presensi warning...');
      await this.sendLatePresensiWarning();
    }, {
      timezone: "Asia/Jakarta"
    });
    
    // Check absen dinas yang perlu validasi - setiap jam
    cron.schedule('0 * * * *', async () => {
      console.log('[SCHEDULER] Checking pending dinas validation...');
      await this.checkPendingDinasValidation();
    }, {
      timezone: "Asia/Jakarta"
    });
    
    // Reminder dinas besok - setiap hari jam 18:00
    cron.schedule('0 18 * * *', async () => {
      console.log('[SCHEDULER] Running dinas reminder...');
      await this.sendDinasReminder();
    }, {
      timezone: "Asia/Jakarta"
    });
    
    console.log('[SCHEDULER] All notification schedules initialized');
  }
  
  // Warning untuk yang terlambat presensi
  static async sendLatePresensiWarning() {
    try {
      const { getConnection } = require('../config/database');
      const db = await getConnection();
      const today = new Date().toLocaleDateString('en-CA');
      
      // Cari user yang belum presensi dan sudah lewat batas
      const [users] = await db.execute(`
        SELECT u.id_user, u.nama_lengkap 
        FROM users u
        LEFT JOIN presensi p ON u.id_user = p.id_user AND p.tanggal = ?
        WHERE u.role = 'pegawai' AND p.id_presensi IS NULL
      `, [today]);
      
      for (const user of users) {
        await PushNotificationService.send(
          user.id_user,
          '⚠️ Terlambat Presensi',
          'Anda sudah melewati batas waktu presensi masuk. Segera lakukan presensi!',
          {
            type: 'presensi_late_warning',
            action: 'presensi_masuk'
          }
        );
      }
      
      console.log(`[SCHEDULER] Late presensi warning sent to ${users.length} users`);
    } catch (error) {
      console.error('[SCHEDULER] Late presensi warning error:', error);
    }
  }
  
  // Check absen dinas yang menunggu validasi
  static async checkPendingDinasValidation() {
    try {
      const { getConnection } = require('../config/database');
      const db = await getConnection();
      
      const [pendingCount] = await db.execute(`
        SELECT COUNT(*) as count FROM presensi 
        WHERE jenis_presensi = 'dinas' 
        AND (status_validasi_masuk = 'menunggu' OR status_validasi_pulang = 'menunggu')
      `);
      
      if (pendingCount[0].count > 0) {
        // Kirim notifikasi ke admin
        const [admins] = await db.execute(`SELECT id_user FROM users WHERE role = 'admin'`);
        const adminIds = admins.map(admin => admin.id_user);
        
        await NotificationTriggers.sendToMultiple(
          adminIds,
          '📋 Validasi Menunggu',
          `Ada ${pendingCount[0].count} absen dinas yang menunggu validasi`,
          {
            type: 'pending_validation',
            count: pendingCount[0].count
          }
        );
      }
    } catch (error) {
      console.error('[SCHEDULER] Pending dinas validation check error:', error);
    }
  }
  
  // Reminder dinas besok
  static async sendDinasReminder() {
    try {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = tomorrow.toLocaleDateString('en-CA');
      
      const [dinasUsers] = await db.query(`
        SELECT dp.id_user, u.nama_lengkap, d.nama_kegiatan, d.lokasi_tujuan
        FROM dinas_pegawai dp
        JOIN users u ON dp.id_user = u.id_user
        JOIN dinas d ON dp.id_dinas = d.id_dinas
        WHERE d.tanggal_mulai = ? AND d.status = 'aktif'
      `, [tomorrowStr]);
      
      for (const user of dinasUsers) {
        await NotificationTriggers.send(
          user.id_user,
          '📅 Reminder Dinas Besok',
          `Besok Anda memiliki dinas: ${user.nama_kegiatan} di ${user.lokasi_tujuan}`,
          {
            type: 'dinas_reminder',
            kegiatan: user.nama_kegiatan
          }
        );
      }
      
      console.log(`[SCHEDULER] Dinas reminder sent to ${dinasUsers.length} users`);
    } catch (error) {
      console.error('[SCHEDULER] Dinas reminder error:', error);
    }
  }
}

module.exports = NotificationScheduler;