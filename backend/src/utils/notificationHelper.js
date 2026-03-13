const { getConnection } = require('../config/database');

/**
 * Helper untuk mengirim notifikasi ke pegawai
 */

// Fungsi untuk mengirim notifikasi dinas baru
const sendDinasNotification = async (dinasId, pegawaiIds, type = 'dinas_baru') => {
  try {
    const db = await getConnection();
    
    // Ambil data dinas
    const [dinasRows] = await db.execute(
      'SELECT nama_kegiatan, nomor_spt, tanggal_mulai, tanggal_selesai FROM dinas WHERE id_dinas = ?',
      [dinasId]
    );
    
    if (dinasRows.length === 0) {
      console.log('Dinas tidak ditemukan untuk notifikasi');
      return;
    }
    
    const dinas = dinasRows[0];
    
    // Format tanggal
    const formatDate = (dateStr) => {
      const date = new Date(dateStr);
      const day = date.getDate();
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Ags', 'Sep', 'Okt', 'Nov', 'Des'];
      return `${day} ${months[date.getMonth()]} ${date.getFullYear()}`;
    };
    
    let title, message, icon, color;
    
    if (type === 'dinas_baru') {
      title = 'Penugasan Dinas Baru';
      message = `Anda ditugaskan untuk "${dinas.nama_kegiatan}" (${dinas.nomor_spt}) pada ${formatDate(dinas.tanggal_mulai)} - ${formatDate(dinas.tanggal_selesai)}`;
      icon = 'briefcase';
      color = '#2196F3';
    } else if (type === 'dinas_dibatalkan') {
      title = 'Dinas Dibatalkan';
      message = `Penugasan dinas "${dinas.nama_kegiatan}" (${dinas.nomor_spt}) telah dibatalkan oleh admin`;
      icon = 'close-circle';
      color = '#F44336';
    }
    
    // Insert notifikasi untuk setiap pegawai
    for (const pegawaiId of pegawaiIds) {
      await db.execute(`
        INSERT INTO notifications (
          id_user, type, title, message, icon, color, 
          related_id, related_type, is_read, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 'dinas', 0, NOW())
      `, [pegawaiId, type, title, message, icon, color, dinasId]);
    }
    
    console.log(`✅ Notifikasi ${type} dikirim ke ${pegawaiIds.length} pegawai`);
    
  } catch (error) {
    console.error('Error sending dinas notification:', error);
  }
};

// Fungsi untuk mengirim notifikasi update dinas
const sendDinasUpdateNotification = async (dinasId, pegawaiIds) => {
  try {
    const db = await getConnection();
    
    // Ambil data dinas
    const [dinasRows] = await db.execute(
      'SELECT nama_kegiatan, nomor_spt FROM dinas WHERE id_dinas = ?',
      [dinasId]
    );
    
    if (dinasRows.length === 0) return;
    
    const dinas = dinasRows[0];
    
    // Insert notifikasi untuk setiap pegawai
    for (const pegawaiId of pegawaiIds) {
      await db.execute(`
        INSERT INTO notifications (
          id_user, type, title, message, icon, color, 
          related_id, related_type, is_read, created_at
        ) VALUES (?, 'dinas_update', 'Dinas Diperbarui', ?, 'create', '#FF9800', ?, 'dinas', 0, NOW())
      `, [
        pegawaiId, 
        `Informasi dinas "${dinas.nama_kegiatan}" (${dinas.nomor_spt}) telah diperbarui oleh admin`,
        dinasId
      ]);
    }
    
    console.log(`✅ Notifikasi update dinas dikirim ke ${pegawaiIds.length} pegawai`);
    
  } catch (error) {
    console.error('Error sending dinas update notification:', error);
  }
};

module.exports = {
  sendDinasNotification,
  sendDinasUpdateNotification
};