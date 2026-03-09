// Real-time check untuk auto-generate "Tidak Hadir"
const realtimeCheck = async (req, res) => {
  try {
    const db = await getConnection();
    const today = new Date().toISOString().split('T')[0];
    const currentTime = new Date().toTimeString().slice(0, 8);
    
    let updatedCount = 0;
    
    // Get all pegawai
    const [allPegawai] = await db.execute(`
      SELECT p.id_user, p.nama_lengkap FROM pegawai p
      JOIN users u ON p.id_user = u.id_user
      WHERE u.role = 'pegawai'
    `);
    
    // Get hari kerja info
    const dayNames = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    const dayName = dayNames[new Date().getDay()];
    
    const [jamKerjaRows] = await db.execute(
      'SELECT is_kerja, batas_absen FROM jam_kerja_hari WHERE hari = ?',
      [dayName]
    );
    
    const isWorkDay = jamKerjaRows.length > 0 && jamKerjaRows[0].is_kerja === 1;
    const batasAbsen = jamKerjaRows[0]?.batas_absen || '08:30:00';
    
    // Skip jika bukan hari kerja atau belum lewat batas absen
    if (!isWorkDay || currentTime <= batasAbsen) {
      return res.json({
        success: true,
        message: 'Belum waktunya auto-generate',
        isWorkDay,
        currentTime,
        batasAbsen,
        updatedCount: 0
      });
    }
    
    // Check each pegawai
    for (const pegawai of allPegawai) {
      // Check if already has presensi today
      const [presensiRows] = await db.execute(
        'SELECT id_presensi FROM presensi WHERE id_user = ? AND DATE(tanggal) = ? AND jam_masuk IS NOT NULL',
        [pegawai.id_user, today]
      );
      
      // Auto-insert "Tidak Hadir" jika belum ada presensi
      if (presensiRows.length === 0) {
        const [insertResult] = await db.execute(`
          INSERT IGNORE INTO presensi (id_user, tanggal, status, status_validasi, jenis_presensi)
          VALUES (?, ?, 'Tidak Hadir', 'disetujui', 'kantor')
        `, [pegawai.id_user, today]);
        
        if (insertResult.affectedRows > 0) {
          updatedCount++;
        }
      }
    }
    
    res.json({
      success: true,
      message: `Auto-generated ${updatedCount} "Tidak Hadir" records`,
      isWorkDay,
      currentTime,
      batasAbsen,
      updatedCount
    });
    
  } catch (error) {
    console.error('Realtime check error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

module.exports = { realtimeCheck };