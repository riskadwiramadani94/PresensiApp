const { getConnection } = require('./src/config/database');

async function checkDatabase() {
  try {
    const db = await getConnection();
    
    console.log('=== JAM KERJA HARI ===');
    const [jamKerja] = await db.execute('SELECT * FROM jam_kerja_hari ORDER BY FIELD(hari, "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu")');
    console.table(jamKerja);
    
    console.log('\n=== HARI LIBUR ===');
    const [hariLibur] = await db.execute('SELECT * FROM hari_libur WHERE YEAR(tanggal) = YEAR(CURDATE()) ORDER BY tanggal');
    console.table(hariLibur);
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkDatabase();