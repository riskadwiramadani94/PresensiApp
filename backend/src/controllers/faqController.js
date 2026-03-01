const { getConnection } = require('../config/database');

// GET all FAQ grouped by category
exports.getAllFAQ = async (req, res) => {
  try {
    const { role } = req.query;
    const db = await getConnection();
    
    let query = 'SELECT * FROM faq WHERE is_active = 1';
    const params = [];
    
    if (role) {
      query += ' AND (role = ? OR role = "both")';
      params.push(role);
    }
    
    query += ' ORDER BY kategori, urutan, id_faq';
    
    const [rows] = await db.execute(query, params);

    // Group by category
    const grouped = rows.reduce((acc, faq) => {
      if (!acc[faq.kategori]) {
        acc[faq.kategori] = [];
      }
      acc[faq.kategori].push(faq);
      return acc;
    }, {});

    res.json({ success: true, data: grouped });
  } catch (error) {
    console.error('Error fetching FAQ:', error);
    res.status(500).json({ success: false, message: 'Gagal memuat FAQ' });
  }
};

// Search FAQ
exports.searchFAQ = async (req, res) => {
  try {
    const { q, role } = req.query;
    
    if (!q || q.length < 2) {
      return res.json({ success: true, data: [] });
    }

    const db = await getConnection();
    
    let query = 'SELECT * FROM faq WHERE is_active = 1 AND (pertanyaan LIKE ? OR jawaban LIKE ?)';
    const params = [`%${q}%`, `%${q}%`];
    
    if (role) {
      query += ' AND (role = ? OR role = "both")';
      params.push(role);
    }
    
    query += ' ORDER BY urutan, id_faq';
    
    const [rows] = await db.execute(query, params);

    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('Error searching FAQ:', error);
    res.status(500).json({ success: false, message: 'Gagal mencari FAQ' });
  }
};
