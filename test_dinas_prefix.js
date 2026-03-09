const { getConnection } = require('./backend/src/config/database');

async function testDinasPrefix() {
  try {
    const db = await getConnection();
    console.log('=== TEST SISTEM PREFIX DINAS ===\n');

    // Get sample pegawai
    const [pegawaiRows] = await db.execute(`
      SELECT p.id_user, p.nama_lengkap FROM pegawai p
      JOIN users u ON p.id_user = u.id_user
      WHERE u.role = 'pegawai'
      LIMIT 1
    `);
    
    if (pegawaiRows.length === 0) {
      console.log('Tidak ada pegawai untuk test');
      return;
    }
    
    const pegawai = pegawaiRows[0];
    console.log(`Test dengan pegawai: ${pegawai.nama_lengkap}`);
    
    // Test beberapa tanggal
    const testDates = [
      '2026-03-05', // Kemarin
      '2026-03-06', // Kemarin
      '2026-03-09'  // Hari ini
    ];
    
    for (const dateStr of testDates) {
      console.log(`\n--- Tanggal: ${dateStr} ---`);
      
      // Check if on dinas
      const [dinasRows] = await db.execute(`
        SELECT d.id_dinas, d.nama_kegiatan, d.tanggal_mulai, d.tanggal_selesai
        FROM dinas_pegawai dp
        JOIN dinas d ON dp.id_dinas = d.id_dinas
        WHERE dp.id_user = ?
        AND ? BETWEEN DATE(d.tanggal_mulai) AND DATE(d.tanggal_selesai)
        AND dp.status_konfirmasi = 'konfirmasi'
        LIMIT 1
      `, [pegawai.id_user, dateStr]);
      
      const isDinas = dinasRows.length > 0;
      
      if (isDinas) {
        console.log(`✅ SEDANG DINAS: ${dinasRows[0].nama_kegiatan}`);
        console.log(`   Periode: ${dinasRows[0].tanggal_mulai} s/d ${dinasRows[0].tanggal_selesai}`);
        console.log(`   Status akan menjadi: "Dinas-[Status]"`);
      } else {
        console.log(`❌ TIDAK DINAS`);
        console.log(`   Status akan menjadi: "[Status]" (tanpa prefix)`);
      }
      
      // Check existing presensi
      const [presensiRows] = await db.execute(`
        SELECT status FROM presensi 
        WHERE id_user = ? AND tanggal = ? AND jam_masuk IS NOT NULL
      `, [pegawai.id_user, dateStr]);
      
      if (presensiRows.length > 0) {
        const originalStatus = presensiRows[0].status;
        const finalStatus = isDinas ? `Dinas-${originalStatus}` : originalStatus;
        console.log(`   Presensi ada: "${originalStatus}" → "${finalStatus}"`);
      } else {
        console.log(`   Presensi belum ada`);
      }
    }

  } catch (error) {
    console.error('Error:', error.message);
  }
}

testDinasPrefix();