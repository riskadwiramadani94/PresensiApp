const db = require('../config/database');

const InboxController = {
  // Get read status untuk semua inbox items
  getReadStatus: async (req, res) => {
    try {
      const query = 'SELECT inbox_type, reference_id, is_read FROM inbox_read_status';
      const [results] = await db.query(query);
      
      const readStatus = {};
      results.forEach(item => {
        readStatus[item.reference_id] = item.is_read === 1;
      });
      
      res.json({ success: true, data: readStatus });
    } catch (error) {
      console.error('Error getting read status:', error);
      res.status(500).json({ success: false, message: 'Gagal mengambil status baca' });
    }
  },

  // Tandai satu item sebagai sudah dibaca
  markAsRead: async (req, res) => {
    try {
      const { inbox_type, reference_id } = req.body;
      
      const query = `
        INSERT INTO inbox_read_status (inbox_type, reference_id, is_read, read_at)
        VALUES (?, ?, 1, NOW())
        ON DUPLICATE KEY UPDATE is_read = 1, read_at = NOW()
      `;
      
      await db.query(query, [inbox_type, reference_id]);
      
      res.json({ success: true, message: 'Ditandai sebagai sudah dibaca' });
    } catch (error) {
      console.error('Error marking as read:', error);
      res.status(500).json({ success: false, message: 'Gagal menandai sebagai sudah dibaca' });
    }
  },

  // Tandai semua item sebagai sudah dibaca
  markAllAsRead: async (req, res) => {
    try {
      const { items } = req.body;
      
      if (!items || items.length === 0) {
        return res.json({ success: true, message: 'Tidak ada item untuk ditandai' });
      }
      
      const values = items.map(item => [item.inbox_type, item.reference_id, 1]);
      
      const query = `
        INSERT INTO inbox_read_status (inbox_type, reference_id, is_read, read_at)
        VALUES ?
        ON DUPLICATE KEY UPDATE is_read = 1, read_at = NOW()
      `;
      
      await db.query(query, [values]);
      
      res.json({ success: true, message: 'Semua notifikasi ditandai sebagai sudah dibaca' });
    } catch (error) {
      console.error('Error marking all as read:', error);
      res.status(500).json({ success: false, message: 'Gagal menandai semua sebagai sudah dibaca' });
    }
  }
};

module.exports = InboxController;
