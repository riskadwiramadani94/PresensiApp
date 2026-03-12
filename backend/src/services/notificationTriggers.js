const PushNotificationService = require('./pushNotificationService');
const db = require('../config/database');

const NotificationTriggers = {
  /**
   * PRESENSI NOTIFICATIONS
   */
  
  // Reminder presensi masuk (kirim 30 menit sebelum batas absen)
  async sendPresensiReminder() {
    try {
      console.log('[TRIGGER] Sending presensi reminder...');
      
      // Ambil jam kerja hari ini
      const today = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD
      const dayName = new Date().toLocaleDateString('id-ID', { weekday: 'long' });
      
      const [jamKerja] = await db.query(`
        SELECT jam_masuk, batas_absen FROM jam_kerja_hari 
        WHERE hari = ? AND is_kerja = 1
      `, [dayName]);
      
      if (jamKerja.length === 0) return; // Hari libur
      
      const batasAbsen = jamKerja[0].batas_absen;
      
      // Cari user yang belum presensi hari ini
      const [users] = await db.query(`
        SELECT u.id_user, u.nama_lengkap 
        FROM users u
        LEFT JOIN presensi p ON u.id_user = p.id_user AND p.tanggal = ?
        WHERE u.role = 'pegawai' AND p.id_presensi IS NULL
      `, [today]);
      
      // Kirim reminder ke semua user yang belum presensi
      for (const user of users) {
        await PushNotificationService.send(
          user.id_user,
          '⏰ Reminder Presensi',
          `Jangan lupa presensi masuk! Batas waktu ${batasAbsen}`,
          {
            type: 'presensi_reminder',
            action: 'presensi_masuk'
          }
        );
      }
      
      console.log(`[TRIGGER] Presensi reminder sent to ${users.length} users`);
    } catch (error) {
      console.error('[TRIGGER] Presensi reminder error:', error);
    }
  },

  // Reminder presensi pulang
  async sendPresensiPulangReminder() {
    try {
      console.log('[TRIGGER] Sending presensi pulang reminder...');
      
      const today = new Date().toLocaleDateString('en-CA');
      
      // Cari user yang sudah presensi masuk tapi belum pulang
      const [users] = await db.query(`
        SELECT u.id_user, u.nama_lengkap 
        FROM users u
        INNER JOIN presensi p ON u.id_user = p.id_user 
        WHERE p.tanggal = ? AND p.jam_masuk IS NOT NULL AND p.jam_pulang IS NULL
      `, [today]);
      
      for (const user of users) {
        await PushNotificationService.send(
          user.id_user,
          '🏠 Waktu Pulang',
          'Jangan lupa presensi pulang sebelum meninggalkan kantor',
          {
            type: 'presensi_reminder',
            action: 'presensi_pulang'
          }
        );
      }
      
      console.log(`[TRIGGER] Presensi pulang reminder sent to ${users.length} users`);
    } catch (error) {
      console.error('[TRIGGER] Presensi pulang reminder error:', error);
    }
  },

  /**
   * PENGAJUAN NOTIFICATIONS
   */
  
  // Notifikasi saat pengajuan disetujui
  async notifyPengajuanApproved(pengajuanId) {
    try {
      const [pengajuan] = await db.query(`
        SELECT p.*, u.nama_lengkap 
        FROM pengajuan p
        JOIN users u ON p.id_user = u.id_user
        WHERE p.id_pengajuan = ?
      `, [pengajuanId]);
      
      if (pengajuan.length === 0) return;
      
      const data = pengajuan[0];
      const jenisPengajuan = this.formatJenisPengajuan(data.jenis_pengajuan);
      
      await PushNotificationService.send(
        data.id_user,
        '✅ Pengajuan Disetujui',
        `Pengajuan ${jenisPengajuan} Anda telah disetujui`,
        {
          type: 'pengajuan_approved',
          reference_id: pengajuanId,
          jenis: data.jenis_pengajuan
        }
      );
      
      console.log(`[TRIGGER] Pengajuan approved notification sent to user ${data.id_user}`);
    } catch (error) {
      console.error('[TRIGGER] Pengajuan approved notification error:', error);
    }
  },

  // Notifikasi saat pengajuan ditolak
  async notifyPengajuanRejected(pengajuanId, alasan) {
    try {
      const [pengajuan] = await db.query(`
        SELECT p.*, u.nama_lengkap 
        FROM pengajuan p
        JOIN users u ON p.id_user = u.id_user
        WHERE p.id_pengajuan = ?
      `, [pengajuanId]);
      
      if (pengajuan.length === 0) return;
      
      const data = pengajuan[0];
      const jenisPengajuan = this.formatJenisPengajuan(data.jenis_pengajuan);
      
      await PushNotificationService.send(
        data.id_user,
        '❌ Pengajuan Ditolak',
        `Pengajuan ${jenisPengajuan} Anda ditolak. ${alasan ? 'Alasan: ' + alasan : ''}`,
        {
          type: 'pengajuan_rejected',
          reference_id: pengajuanId,
          jenis: data.jenis_pengajuan
        }
      );
      
      console.log(`[TRIGGER] Pengajuan rejected notification sent to user ${data.id_user}`);
    } catch (error) {
      console.error('[TRIGGER] Pengajuan rejected notification error:', error);
    }
  },

  // Notifikasi ke admin saat ada pengajuan baru
  async notifyAdminNewPengajuan(pengajuanId) {
    try {
      const [pengajuan] = await db.query(`
        SELECT p.*, u.nama_lengkap 
        FROM pengajuan p
        JOIN users u ON p.id_user = u.id_user
        WHERE p.id_pengajuan = ?
      `, [pengajuanId]);
      
      if (pengajuan.length === 0) return;
      
      const data = pengajuan[0];
      const jenisPengajuan = this.formatJenisPengajuan(data.jenis_pengajuan);
      
      // Ambil semua admin
      const [admins] = await db.query(`
        SELECT id_user FROM users WHERE role = 'admin'
      `);
      
      const adminIds = admins.map(admin => admin.id_user);
      
      await PushNotificationService.sendToMultiple(
        adminIds,
        '📝 Pengajuan Baru',
        `${data.nama_lengkap} mengajukan ${jenisPengajuan}`,
        {
          type: 'pengajuan_new',
          reference_id: pengajuanId,
          user_name: data.nama_lengkap,
          jenis: data.jenis_pengajuan
        }
      );
      
      console.log(`[TRIGGER] New pengajuan notification sent to ${adminIds.length} admins`);
    } catch (error) {
      console.error('[TRIGGER] New pengajuan notification error:', error);
    }
  },

  /**
   * PRESENSI VALIDATION NOTIFICATIONS
   */
  
  // Notifikasi saat presensi divalidasi
  async notifyPresensiValidated(presensiId, status, catatan) {
    try {
      const [presensi] = await db.query(`
        SELECT p.*, u.nama_lengkap 
        FROM presensi p
        JOIN users u ON p.id_user = u.id_user
        WHERE p.id_presensi = ?
      `, [presensiId]);
      
      if (presensi.length === 0) return;
      
      const data = presensi[0];
      const statusText = status === 'disetujui' ? 'disetujui' : 'ditolak';
      const icon = status === 'disetujui' ? '✅' : '❌';
      
      await PushNotificationService.send(
        data.id_user,
        `${icon} Presensi ${statusText.charAt(0).toUpperCase() + statusText.slice(1)}`,
        `Presensi tanggal ${data.tanggal} telah ${statusText}${catatan ? '. ' + catatan : ''}`,
        {
          type: 'presensi_validated',
          reference_id: presensiId,
          status: status
        }
      );
      
      console.log(`[TRIGGER] Presensi validation notification sent to user ${data.id_user}`);
    } catch (error) {
      console.error('[TRIGGER] Presensi validation notification error:', error);
    }
  },

  /**
   * DINAS NOTIFICATIONS
   */
  
  // Notifikasi saat ditugaskan dinas
  async notifyDinasPenugasan(dinasId, userId) {
    try {
      const [dinas] = await db.query(`
        SELECT * FROM dinas WHERE id_dinas = ?
      `, [dinasId]);
      
      if (dinas.length === 0) return;
      
      const data = dinas[0];
      
      await PushNotificationService.send(
        userId,
        '🚗 Penugasan Dinas',
        `Anda ditugaskan untuk ${data.nama_kegiatan} pada ${data.tanggal_mulai}`,
        {
          type: 'dinas_assignment',
          reference_id: dinasId
        }
      );
      
      console.log(`[TRIGGER] Dinas assignment notification sent to user ${userId}`);
    } catch (error) {
      console.error('[TRIGGER] Dinas assignment notification error:', error);
    }
  },

  /**
   * SYSTEM NOTIFICATIONS
   */
  
  // Notifikasi sistem (pengumuman, perubahan jam kerja, dll)
  async sendSystemNotification(title, message, targetUsers = 'all') {
    try {
      let userIds = [];
      
      if (targetUsers === 'all') {
        const [users] = await db.query(`SELECT id_user FROM users`);
        userIds = users.map(u => u.id_user);
      } else if (targetUsers === 'pegawai') {
        const [users] = await db.query(`SELECT id_user FROM users WHERE role = 'pegawai'`);
        userIds = users.map(u => u.id_user);
      } else if (targetUsers === 'admin') {
        const [users] = await db.query(`SELECT id_user FROM users WHERE role = 'admin'`);
        userIds = users.map(u => u.id_user);
      } else if (Array.isArray(targetUsers)) {
        userIds = targetUsers;
      }
      
      await PushNotificationService.sendToMultiple(
        userIds,
        title,
        message,
        {
          type: 'system_announcement'
        }
      );
      
      console.log(`[TRIGGER] System notification sent to ${userIds.length} users`);
    } catch (error) {
      console.error('[TRIGGER] System notification error:', error);
    }
  },

  /**
   * UTILITY FUNCTIONS
   */
  formatJenisPengajuan(jenis) {
    const jenisMap = {
      'cuti_sakit': 'Cuti Sakit',
      'cuti_tahunan': 'Cuti Tahunan',
      'cuti_alasan_penting': 'Cuti Alasan Penting',
      'izin_datang_terlambat': 'Izin Datang Terlambat',
      'izin_pulang_cepat': 'Izin Pulang Cepat',
      'lembur': 'Lembur'
    };
    
    return jenisMap[jenis] || jenis.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }
};

module.exports = NotificationTriggers;