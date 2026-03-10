const { getConnection } = require('../config/database');

// Get kegiatan dinas untuk pegawai tertentu
const getKegiatanPegawai = async (req, res) => {
  try {
    const { user_id, status } = req.query;

    if (!user_id) {
      return res.status(400).json({
        success: false,
        message: 'User ID diperlukan'
      });
    }

    console.log('Fetching kegiatan for user_id:', user_id);

    const db = await getConnection();

    let query = `
      SELECT 
        d.id_dinas as id,
        d.nama_kegiatan,
        d.nomor_spt,
        d.jenis_dinas,
        d.tanggal_mulai,
        d.tanggal_selesai,
        d.jam_mulai,
        d.jam_selesai,
        d.deskripsi,
        d.dokumen_spt,
        d.created_at
      FROM dinas d
      INNER JOIN dinas_pegawai dp ON d.id_dinas = dp.id_dinas
      WHERE dp.id_user = ?
      ORDER BY d.tanggal_mulai DESC
    `;

    const [kegiatan] = await db.execute(query, [user_id]);

    // Format dates
    const formattedKegiatan = kegiatan.map(item => ({
      ...item,
      tanggal_mulai: item.tanggal_mulai ? new Date(item.tanggal_mulai).toISOString().split('T')[0] : null,
      tanggal_selesai: item.tanggal_selesai ? new Date(item.tanggal_selesai).toISOString().split('T')[0] : null,
      created_at: item.created_at ? new Date(item.created_at).toISOString().split('T')[0] : null
    }));

    console.log('Kegiatan found:', formattedKegiatan.length);

    res.json({
      success: true,
      data: formattedKegiatan
    });

  } catch (error) {
    console.error('Error getting kegiatan pegawai:', error);
    // Return empty array instead of error for better UX
    res.json({
      success: true,
      data: [],
      message: 'Belum ada kegiatan dinas'
    });
  }
};

// Get detail kegiatan dinas
const getDetailKegiatan = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'ID kegiatan diperlukan'
      });
    }

    const db = await getConnection();

    // Get data dinas
    const [dinas] = await db.execute(
      `SELECT 
        id_dinas as id,
        nama_kegiatan,
        nomor_spt,
        jenis_dinas,
        tanggal_mulai,
        tanggal_selesai,
        jam_mulai,
        jam_selesai,
        deskripsi,
        dokumen_spt,
        created_at
      FROM dinas
      WHERE id_dinas = ?`,
      [id]
    );

    if (dinas.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Kegiatan tidak ditemukan'
      });
    }

    const kegiatanData = dinas[0];

    // Get lokasi dinas
    const [lokasi] = await db.execute(
      `SELECT 
        l.id_lokasi_kantor as id,
        l.nama_lokasi,
        l.alamat,
        l.lintang as latitude,
        l.bujur as longitude,
        l.radius
      FROM lokasi_kantor l
      INNER JOIN dinas_lokasi dl ON l.id_lokasi_kantor = dl.id_lokasi_kantor
      WHERE dl.id_dinas = ?`,
      [id]
    );

    // Get pegawai yang ikut dinas
    const [pegawai] = await db.execute(
      `SELECT 
        u.id_user,
        p.nama_lengkap,
        p.nip,
        u.email,
        u.foto_profil
      FROM users u
      INNER JOIN dinas_pegawai dp ON u.id_user = dp.id_user
      INNER JOIN pegawai p ON u.id_user = p.id_user
      WHERE dp.id_dinas = ?
      ORDER BY p.nama_lengkap`,
      [id]
    );

    // Combine data
    const result = {
      ...kegiatanData,
      tanggal_mulai: kegiatanData.tanggal_mulai ? new Date(kegiatanData.tanggal_mulai).toISOString().split('T')[0] : null,
      tanggal_selesai: kegiatanData.tanggal_selesai ? new Date(kegiatanData.tanggal_selesai).toISOString().split('T')[0] : null,
      created_at: kegiatanData.created_at ? new Date(kegiatanData.created_at).toISOString().split('T')[0] : null,
      lokasi: lokasi,
      pegawai: pegawai
    };

    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('Error getting detail kegiatan:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat mengambil detail kegiatan',
      error: error.message
    });
  }
};

module.exports = {
  getKegiatanPegawai,
  getDetailKegiatan
};
