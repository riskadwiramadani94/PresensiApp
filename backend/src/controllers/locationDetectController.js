const { getConnection } = require('../config/database');

function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371e3;
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) *
    Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

const LocationDetectController = {
  detectNearestOffice: async (req, res) => {
    try {
      const { lat, lng } = req.query;

      if (!lat || !lng) {
        return res.status(400).json({
          success: false,
          message: 'Latitude dan longitude harus disertakan'
        });
      }

      const userLat = parseFloat(lat);
      const userLng = parseFloat(lng);

      const pool = await getConnection();
      const query = `
        SELECT id, nama_lokasi, alamat, lintang, bujur, radius 
        FROM lokasi_kantor 
        WHERE is_active = 1 AND jenis_lokasi = 'tetap'
      `;
      
      const [offices] = await pool.query(query);

      if (offices.length === 0) {
        return res.json({
          success: false,
          message: 'Tidak ada lokasi kantor yang tersedia'
        });
      }

      const officesWithDistance = offices.map(office => {
        const distance = calculateDistance(
          userLat,
          userLng,
          parseFloat(office.lintang),
          parseFloat(office.bujur)
        );

        return {
          id: office.id,
          nama_lokasi: office.nama_lokasi,
          alamat: office.alamat,
          distance: Math.round(distance),
          radius: office.radius,
          is_within_radius: distance <= office.radius
        };
      });

      officesWithDistance.sort((a, b) => a.distance - b.distance);

      const nearestOffice = officesWithDistance[0];

      res.json({
        success: true,
        data: {
          nearest_office: nearestOffice,
          all_offices: officesWithDistance
        }
      });

    } catch (error) {
      console.error('Error detecting nearest office:', error);
      res.status(500).json({
        success: false,
        message: 'Gagal mendeteksi lokasi kantor terdekat'
      });
    }
  }
};

module.exports = LocationDetectController;
