const express = require('express');
const { connectDB } = require('./src/config/database');
const corsMiddleware = require('./src/middleware/cors');
require('dotenv').config();

// Import routes
const authRoutes = require('./src/routes/auth');
const adminRoutes = require('./src/routes/admin-admin');
const pegawaiRoutes = require('./src/routes/pegawai-admin');
const presensiRoutes = require('./src/routes/presensi');
const dashboardRoutes = require('./src/routes/dashboard');
const dashboardPegawaiRoutes = require('./src/routes/dashboard-pegawai');
const laporanRoutes = require('./src/routes/laporan-admin');
const pengaturanRoutes = require('./src/routes/pengaturan-admin');
const trackingRoutes = require('./src/routes/tracking-admin');

const approvalRoutes = require('./src/routes/approval-admin');
const pengajuanRoutes = require('./src/routes/pengajuan');
const dinasRoutes = require('./src/routes/dinas-admin');
const profileRoutes = require('./src/routes/profile');
const akunRoutes = require('./src/routes/akun-admin');
const pusatValidasiRoutes = require('./src/routes/pusat-validasi');
const kegiatanPegawaiRoutes = require('./src/routes/kegiatan-pegawai');
const performaPegawaiRoutes = require('./src/routes/performa-pegawai');
const lemburRoutes = require('./src/routes/lembur');
const inboxPegawaiRoutes = require('./src/routes/inbox-pegawai');
const faqRoutes = require('./src/routes/faq');
const calendarRoutes = require('./src/routes/calendar');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(corsMiddleware);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static files for uploads
app.use('/uploads', express.static('uploads'));

// Routes
app.use('/auth/api', authRoutes);
app.use('/admin/api', adminRoutes);
app.use('/admin/pegawai-akun/api', pegawaiRoutes);
app.use('/admin/pegawai-akun/api', akunRoutes);
app.use('/pegawai/presensi/api', presensiRoutes);
app.use('/pegawai', dashboardPegawaiRoutes);
app.use('/admin/laporan/api', laporanRoutes);
app.use('/admin/pengaturan/api', pengaturanRoutes);
app.use('/admin/presensi/api', trackingRoutes);

app.use('/admin/persetujuan/api', approvalRoutes);
app.use('/pegawai/pengajuan/api', pengajuanRoutes);
app.use('/admin/kelola-dinas/api', dinasRoutes);
app.use('/pegawai/profil/api', profileRoutes);
app.use('/admin/pusat-validasi/api', pusatValidasiRoutes);
app.use('/pegawai/kegiatan', kegiatanPegawaiRoutes);
app.use('/pegawai/api', performaPegawaiRoutes);
app.use('/pegawai/lembur/api', lemburRoutes);
app.use('/pegawai/inbox/api', inboxPegawaiRoutes);
app.use('/api/faq', faqRoutes);
app.use('/api', calendarRoutes);

// Health check
app.get('/', (req, res) => {
  res.json({ 
    success: true, 
    message: 'HadirinApp Backend API is running',
    timestamp: new Date().toISOString()
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ 
    success: false, 
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ 
    success: false, 
    message: 'Endpoint not found' 
  });
});

// Start server
const startServer = async () => {
  try {
    console.log('🚀 Starting HadirinApp Backend Server...');
    console.log('📍 Environment:', process.env.NODE_ENV || 'development');
    console.log('🔌 Port:', PORT);
    
    // Try to connect to database
    try {
      await connectDB();
    } catch (error) {
      console.warn('⚠️  Database connection failed, but server will start anyway');
      console.warn('Some endpoints may not work until database is available');
    }
    
    app.listen(PORT, '0.0.0.0', () => {
      const HOST_IP = process.env.HOST || 'localhost';
      console.log(`\n✅ Server running successfully!`);
      console.log(`🌐 Local: http://localhost:${PORT}`);
      console.log(`📱 Mobile: http://${HOST_IP}:${PORT}`);
      console.log(`\n📄 Available endpoints:`);
      console.log(`   POST /auth/api/login`);
      console.log(`   GET  /auth/api/profile`);
      console.log(`   GET  /admin/api/admin`);
      console.log(`   POST /admin/api/admin`);
      console.log(`   GET  /admin/pegawai-akun/api/data-pegawai`);
      console.log(`   POST /admin/pegawai-akun/api/data-pegawai`);
      console.log(`   PUT  /admin/pegawai-akun/api/update-pegawai/:id`);
      console.log(`   DEL  /admin/pegawai-akun/api/delete-pegawai/:id`);
      console.log(`   GET  /pegawai/api/dashboard`);
      console.log(`   GET  /pegawai/presensi/api/presensi`);
      console.log(`   POST /pegawai/presensi/api/presensi`);
      console.log(`   GET  /admin/laporan/api/laporan`);
      console.log(`   GET  /admin/pengaturan/api/lokasi-kantor`);
      console.log(`   POST /admin/pengaturan/api/lokasi-kantor`);
      console.log(`   PUT  /admin/pengaturan/api/lokasi-kantor/:id`);
      console.log(`   DEL  /admin/pengaturan/api/lokasi-kantor/:id`);
      console.log(`   GET  /admin/presensi/api/tracking`);
      console.log(`   GET  /admin/kelola-dinas/api/dinas-aktif`);
      console.log(`   POST /admin/kelola-dinas/api/create-dinas`);
      console.log(`   GET  /admin/kelola-dinas/api/riwayat-dinas`);
      console.log(`   GET  /admin/kelola-dinas/api/validasi-absen`);
      console.log(`   GET  /admin/kelola-dinas/api/stats`);
      console.log(`   GET  /admin/pusat-validasi/api/absen-dinas`);
      console.log(`   GET  /admin/pusat-validasi/api/pengajuan`);
      console.log(`   GET  /admin/pusat-validasi/api/statistik`);
      console.log(`   POST /admin/pusat-validasi/api/setujui`);
      console.log(`   POST /admin/pusat-validasi/api/tolak`);
      console.log(`   GET  /pegawai/kegiatan/api/kegiatan`);
      console.log(`   GET  /pegawai/kegiatan/api/kegiatan/:id`);
      console.log(`   GET  /pegawai/pengajuan/api/pengajuan`);
      console.log(`   POST /pegawai/pengajuan/api/pengajuan`);
      console.log(`   GET  /pegawai/pengajuan/api/pengajuan/izin-hari-ini`);
      console.log(`   GET  /api/faq`);
      console.log(`   GET  /api/faq/search`);
      console.log(`\n🔄 Ready to serve HadirinApp mobile app\n`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

startServer();