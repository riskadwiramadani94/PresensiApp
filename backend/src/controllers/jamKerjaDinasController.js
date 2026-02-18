const { getConnection } = require('../config/database');

// Mapping hari dalam bahasa Indonesia ke bahasa Inggris untuk database
const hariMap = {
  'Sunday': 'Minggu',
  'Monday': 'Senin',
  'Tuesday': 'Selasa',
  'Wednesday': 'Rabu',
  'Thursday': 'Kamis',
  'Friday': 'Jumat',
  'Saturday': 'Sabtu'
};

const getJamKerjaDinas = async (req, res) => {
  try {
    const { id_dinas, tanggal } = req.query;

    if (!id_dinas) {
      return res.status(400).json({
        success: false,
        message: 'id_dinas wajib diisi'
      });
    }

    const db = await getConnection();

    // Get dinas data
    const [dinasRows] = await db.execute(
      'SELECT jam_mulai, jam_selesai FROM dinas WHERE id_dinas = ?',
      [id_dinas]
    );

    if (dinasRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Data dinas tidak ditemukan'
      });
    }

    const dinas = dinasRows[0];

    // Jika dinas punya jam custom, pakai itu
    if (dinas.jam_mulai && dinas.jam_selesai) {
      return res.json({
        success: true,
        data: {
          jam_mulai: dinas.jam_mulai,
          jam_selesai: dinas.jam_selesai,
          sumber: 'custom'
        }
      });
    }

    // Jika tidak ada jam custom, ambil dari jam_kerja_hari
    const targetDate = tanggal ? new Date(tanggal) : new Date();
    const dayName = targetDate.toLocaleDateString('en-US', { weekday: 'long' });
    const hariIndonesia = hariMap[dayName];

    const [jamKerjaRows] = await db.execute(
      'SELECT jam_masuk, jam_pulang FROM jam_kerja_hari WHERE hari = ?',
      [hariIndonesia]
    );

    if (jamKerjaRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Jam kerja untuk hari ini tidak ditemukan'
      });
    }

    const jamKerja = jamKerjaRows[0];

    res.json({
      success: true,
      data: {
        jam_mulai: jamKerja.jam_masuk,
        jam_selesai: jamKerja.jam_pulang,
        sumber: 'default'
      }
    });

  } catch (error) {
    console.error('Get jam kerja dinas error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error: ' + error.message
    });
  }
};

module.exports = {
  getJamKerjaDinas
};
