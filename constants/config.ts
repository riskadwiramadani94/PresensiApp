// Konfigurasi API untuk HadirinApp - Node.js Backend

const isDevelopment = __DEV__ || process.env.NODE_ENV === 'development';

// Untuk APK production, gunakan IP yang bisa diakses dari luar
// Atau deploy backend ke cloud service
const PRODUCTION_URL = "http://10.251.102.60:3000"; // IP yang benar
const DEVELOPMENT_URL = "http://10.251.102.60:3000"; // IP yang benar

// Multiple server options untuk APK
const SERVER_OPTIONS = [
  'http://10.251.102.60:3000',   // WiFi IP - IP yang benar
  'http://10.251.102.191:3000',   // IP lama sebagai backup
  'http://192.168.1.100:3000',    // IP alternatif
  'http://10.0.2.2:3000',         // Android Emulator
  'http://localhost:3000',        // Localhost
  'http://127.0.0.1:3000'         // Loopback
];

const BASE_URL = isDevelopment ? DEVELOPMENT_URL : PRODUCTION_URL;

const debugLog = (message: string, data?: any) => {
  if (isDevelopment) {
    console.log(`[HadirinApp Debug] ${message}`, data || '');
  }
};

/* ========================================
   API ENDPOINTS CONFIGURATION
======================================== */

export const API_CONFIG = {
  BASE_URL,
  ENDPOINTS: {
    
    /* ================= AUTH ================= */
    LOGIN: '/auth/api/login',
    PROFILE: '/auth/api/profile',
    
    /* ================= ADMIN ================= */
    ADMIN: '/admin/api/admin',
    
    /* ================= PEGAWAI & AKUN (Admin) ================= */
    DATA_PEGAWAI: '/admin/pegawai-akun/api/data-pegawai',
    DETAIL_PEGAWAI: '/admin/pegawai-akun/api/detail-pegawai',
    UPDATE_PEGAWAI: '/admin/pegawai-akun/api/update-pegawai',
    DELETE_PEGAWAI: '/admin/pegawai-akun/api/delete-pegawai',
    CHECK_EMAILS: '/admin/pegawai-akun/api/check-emails',
    
    /* ================= LAPORAN (Admin) ================= */
    LAPORAN: '/admin/laporan/api/laporan',
    DETAIL_LAPORAN: '/admin/laporan/api/detail-laporan',
    DETAIL_ABSEN_PEGAWAI: '/admin/laporan/api/detail-absen-pegawai',
    DETAIL_ABSEN: '/admin/laporan/api/detail-absen',
    EXPORT_LAPORAN: '/admin/laporan/api/export-laporan',
    EXPORT_PEGAWAI: '/admin/laporan/api/export-pegawai',
    
    /* ================= PENGATURAN (Admin) ================= */
    LOKASI_KANTOR: '/admin/pengaturan/api/lokasi-kantor',
    JAM_KERJA: '/admin/pengaturan/api/jam-kerja',
    HARI_LIBUR: '/admin/pengaturan/api/hari-libur',
    
    /* ================= PRESENSI (Admin) ================= */
    TRACKING: '/admin/presensi/api/tracking',
    UPDATE_LOCATION: '/admin/presensi/api/update-location',
    HEARTBEAT: '/admin/presensi/api/heartbeat',
    
    /* ================= PERSETUJUAN (Admin) ================= */
    APPROVAL: '/admin/persetujuan/api/approval',
    
    /* ================= KELOLA DINAS (Admin) ================= */
    DINAS_AKTIF: '/admin/kelola-dinas/api/dinas-aktif',
    CREATE_DINAS: '/admin/kelola-dinas/api/create-dinas',
    UPDATE_DINAS: '/admin/kelola-dinas/api/update-dinas',
    DELETE_DINAS: '/admin/kelola-dinas/api/delete-dinas',
    DETAIL_DINAS: '/admin/kelola-dinas/api/detail-dinas',
    RIWAYAT_DINAS: '/admin/kelola-dinas/api/riwayat-dinas',
    VALIDASI_ABSEN: '/admin/kelola-dinas/api/validasi-absen',
    DINAS_LOKASI: '/admin/kelola-dinas/api/dinas',
    CHECK_ABSEN_LOCATION: '/admin/kelola-dinas/api/check-location',
    
    /* ================= PUSAT VALIDASI (Admin) ================= */
    PUSAT_VALIDASI: '/admin/pusat-validasi/api',
    PUSAT_VALIDASI_ABSEN_DINAS: '/admin/pusat-validasi/api/absen-dinas',
    PUSAT_VALIDASI_PENGAJUAN: '/admin/pusat-validasi/api/pengajuan',
    PUSAT_VALIDASI_STATISTIK: '/admin/pusat-validasi/api/statistik',
    PUSAT_VALIDASI_SETUJUI: '/admin/pusat-validasi/api/setujui',
    PUSAT_VALIDASI_TOLAK: '/admin/pusat-validasi/api/tolak',
    
    /* ================= PEGAWAI ================= */
    PEGAWAI_DASHBOARD: '/pegawai/api/dashboard',
    PEGAWAI_PRESENSI: '/pegawai/presensi/api/presensi',
    PEGAWAI_DETECT_LOCATION: '/pegawai/presensi/api/detect-location',
    PEGAWAI_PENGAJUAN: '/pegawai/pengajuan/api/pengajuan',
    PEGAWAI_PROFILE: '/pegawai/profil/api/profile',
    PEGAWAI_KEGIATAN: '/pegawai/kegiatan/api/kegiatan',
    PEGAWAI_INBOX: '/pegawai/inbox/api/notifications',
    PEGAWAI_INBOX_MARK_ALL: '/pegawai/inbox/api/mark-all-read',
    PEGAWAI_INBOX_MARK_READ: '/pegawai/inbox/api/mark-read',
    
    /* ================= INBOX ================= */
    INBOX_NOTIFICATIONS: '/api/inbox/notifications',
    INBOX_UNREAD_COUNT: '/api/inbox/unread-count',
    INBOX_MARK_READ: '/api/inbox/mark-read',
    INBOX_MARK_ALL_READ: '/api/inbox/mark-all-read',
  }
};

export const getApiUrl = (endpoint: string) => {
  return `${API_CONFIG.BASE_URL}${endpoint}`;
};

// Export BASE_URL untuk digunakan di komponen lain
export const getBaseUrl = () => {
  return API_CONFIG.BASE_URL;
};

// Helper function untuk generate URL upload files
export const getUploadUrl = (folder: string, filename: string | null): string | null => {
  if (!filename) return null;
  return `${API_CONFIG.BASE_URL}/uploads/${folder}/${filename}`;
};

// Helper functions untuk berbagai jenis upload
export const getPresensiPhotoUrl = (filename: string | null): string | null => getUploadUrl('presensi', filename);
export const getPegawaiPhotoUrl = (filename: string | null): string | null => getUploadUrl('pegawai', filename);
export const getAdminPhotoUrl = (filename: string | null): string | null => getUploadUrl('admin', filename);
export const getLemburPhotoUrl = (filename: string | null): string | null => getUploadUrl('lembur', filename);
export const getSptDocumentUrl = (filename: string | null): string | null => getUploadUrl('spt', filename);

export const fetchWithRetry = async (url: string, options: any = {}): Promise<Response> => {
  console.log('[API DEBUG] Request URL:', url);
  console.log('[API DEBUG] Request options:', JSON.stringify(options, null, 2));
  
  // Try multiple server options if first fails
  let lastError: Error | null = null;
  
  for (let i = 0; i < SERVER_OPTIONS.length; i++) {
    const serverUrl = url.replace(BASE_URL, SERVER_OPTIONS[i]);
    console.log(`[API DEBUG] Trying server ${i + 1}/${SERVER_OPTIONS.length}:`, serverUrl);
    
    // Create new AbortController for each attempt
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 seconds per attempt
    
    try {
      const response = await fetch(serverUrl, {
        ...options,
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          ...options.headers
        }
      });
      
      clearTimeout(timeoutId);
      console.log('[API DEBUG] Response status:', response.status);
      console.log('[API DEBUG] Response headers:', JSON.stringify([...response.headers.entries()]));
      
      if (!response.ok) {
        const errorText = await response.text();
        console.log('[API DEBUG] Error response:', errorText);
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      console.log(`[API DEBUG] Success with server: ${serverUrl}`);
      return response;
    } catch (error: any) {
      clearTimeout(timeoutId);
      console.log(`[API DEBUG] Server ${i + 1} failed:`, error.message);
      lastError = error;
      
      // If timeout or network error, try next server
      if (i < SERVER_OPTIONS.length - 1) {
        console.log('[API DEBUG] Trying next server...');
        continue;
      }
    }
  }
  
  if (lastError?.name === 'AbortError') {
    throw new Error('Request timeout - Server tidak merespons');
  }
  
  throw new Error(lastError?.message || 'Tidak dapat terhubung ke server');
};

/* ========================================
   AUTH API
======================================== */
export const AuthAPI = {
  login: async (email: string, password: string) => {
    try {
      const response = await fetchWithRetry(getApiUrl(API_CONFIG.ENDPOINTS.LOGIN), {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      return response.json();
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Tidak dapat terhubung ke server'
      };
    }
  },
  
  getProfile: async (user_id: string) => {
    try {
      const response = await fetchWithRetry(`${getApiUrl(API_CONFIG.ENDPOINTS.PROFILE)}?user_id=${user_id}`);
      return response.json();
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Tidak dapat terhubung ke server'
      };
    }
  },
};

/* ========================================
   ADMIN API
======================================== */
export const AdminAPI = {
  getAdminData: async (user_id?: string) => {
    try {
      const url = user_id ? `${getApiUrl(API_CONFIG.ENDPOINTS.ADMIN)}?user_id=${user_id}` : getApiUrl(API_CONFIG.ENDPOINTS.ADMIN);
      const response = await fetchWithRetry(url);
      return response.json();
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Tidak dapat terhubung ke server'
      };
    }
  },
  
  updateProfile: async (data: any) => {
    try {
      const response = await fetchWithRetry(getApiUrl(API_CONFIG.ENDPOINTS.ADMIN), {
        method: 'POST',
        body: JSON.stringify(data),
      });
      return response.json();
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Tidak dapat terhubung ke server'
      };
    }
  },
};

/* ========================================
   PEGAWAI API
======================================== */
export const PegawaiAPI = {
  getDashboard: async (user_id: string) => {
    try {
      const response = await fetchWithRetry(`${getApiUrl(API_CONFIG.ENDPOINTS.PEGAWAI_DASHBOARD)}?user_id=${user_id}`);
      return response.json();
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Tidak dapat terhubung ke server',
        data: null
      };
    }
  },
  
  getPresensi: async (user_id: string, tanggal?: string) => {
    try {
      const params = new URLSearchParams({ user_id });
      if (tanggal) params.append('tanggal', tanggal);
      
      const response = await fetchWithRetry(`${getApiUrl(API_CONFIG.ENDPOINTS.PEGAWAI_PRESENSI)}?${params.toString()}`);
      return response.json();
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Tidak dapat terhubung ke server',
        data: null
      };
    }
  },
  
  submitPresensi: async (data: any) => {
    try {
      const response = await fetchWithRetry(getApiUrl(API_CONFIG.ENDPOINTS.PEGAWAI_PRESENSI), {
        method: 'POST',
        body: JSON.stringify(data),
      });
      return response.json();
    } catch (error) {
      return {
        success: false,
        message: (error as Error).message || 'Tidak dapat terhubung ke server'
      };
    }
  },
  
  getPengajuan: async (user_id: string) => {
    try {
      const response = await fetchWithRetry(`${getApiUrl(API_CONFIG.ENDPOINTS.PEGAWAI_PENGAJUAN)}?user_id=${user_id}`);
      return response.json();
    } catch (error) {
      return {
        success: false,
        message: (error as Error).message || 'Tidak dapat terhubung ke server',
        data: []
      };
    }
  },
  
  submitPengajuan: async (data: any) => {
    try {
      const response = await fetchWithRetry(getApiUrl(API_CONFIG.ENDPOINTS.PEGAWAI_PENGAJUAN), {
        method: 'POST',
        body: JSON.stringify(data),
      });
      return response.json();
    } catch (error) {
      return {
        success: false,
        message: (error as Error).message || 'Tidak dapat terhubung ke server'
      };
    }
  },
  
  getKegiatan: async (user_id: string, status?: string) => {
    try {
      const params = new URLSearchParams({ user_id });
      if (status) params.append('status', status);
      const response = await fetchWithRetry(`${getApiUrl(API_CONFIG.ENDPOINTS.PEGAWAI_KEGIATAN)}?${params.toString()}`);
      return response.json();
    } catch (error) {
      return {
        success: false,
        message: (error as Error).message || 'Tidak dapat terhubung ke server',
        data: []
      };
    }
  },
  
  detectNearestLocation: async (latitude: number, longitude: number) => {
    try {
      const response = await fetchWithRetry(
        `${getApiUrl(API_CONFIG.ENDPOINTS.PEGAWAI_DETECT_LOCATION)}?lat=${latitude}&lng=${longitude}`
      );
      return response.json();
    } catch (error) {
      return {
        success: false,
        message: (error as Error).message || 'Tidak dapat terhubung ke server',
        data: null
      };
    }
  },
  
  getDetailKegiatan: async (id: number) => {
    try {
      const response = await fetchWithRetry(`${getApiUrl(API_CONFIG.ENDPOINTS.PEGAWAI_KEGIATAN)}/${id}`);
      return response.json();
    } catch (error) {
      return {
        success: false,
        message: (error as Error).message || 'Tidak dapat terhubung ke server',
        data: null
      };
    }
  },
};

/* ========================================
   PEGAWAI AKUN API (Admin)
======================================== */
export const PegawaiAkunAPI = {
  getDataPegawai: async () => {
    try {
      const response = await fetchWithRetry(getApiUrl(API_CONFIG.ENDPOINTS.DATA_PEGAWAI));
      return response.json();
    } catch (error) {
      return { success: false, message: 'Tidak dapat terhubung ke server', data: [] };
    }
  },
  
  getDetailPegawai: async (id: number) => {
    try {
      const response = await fetchWithRetry(`${getApiUrl(API_CONFIG.ENDPOINTS.DETAIL_PEGAWAI)}/${id}`);
      return response.json();
    } catch (error) {
      return { success: false, message: 'Tidak dapat terhubung ke server', data: null };
    }
  },
  
  createPegawai: async (data: any) => {
    try {
      const response = await fetchWithRetry(getApiUrl(API_CONFIG.ENDPOINTS.DATA_PEGAWAI), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      return response.json();
    } catch (error) {
      return { success: false, message: 'Tidak dapat terhubung ke server' };
    }
  },
  
  updatePegawai: async (id: number, data: any) => {
    try {
      const response = await fetchWithRetry(`${getApiUrl(API_CONFIG.ENDPOINTS.UPDATE_PEGAWAI)}/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      return response.json();
    } catch (error) {
      return { success: false, message: 'Tidak dapat terhubung ke server' };
    }
  },
  
  deletePegawai: async (id: number) => {
    try {
      const response = await fetchWithRetry(`${getApiUrl(API_CONFIG.ENDPOINTS.DELETE_PEGAWAI)}/${id}`, {
        method: 'DELETE',
      });
      return response.json();
    } catch (error) {
      return { success: false, message: 'Tidak dapat terhubung ke server' };
    }
  },
};

/* ========================================
   KELOLA DINAS API (Admin)
======================================== */
export const KelolaDinasAPI = {
  getDinasAktif: async (status?: string, tanggal?: string) => {
    try {
      const params = new URLSearchParams();
      if (status) params.append('status', status);
      if (tanggal) params.append('tanggal', tanggal);
      const queryString = params.toString();
      const url = queryString ? `${getApiUrl(API_CONFIG.ENDPOINTS.DINAS_AKTIF)}?${queryString}` : getApiUrl(API_CONFIG.ENDPOINTS.DINAS_AKTIF);
      const response = await fetchWithRetry(url);
      return response.json();
    } catch (error) {
      return { success: false, message: 'Tidak dapat terhubung ke server', data: [] };
    }
  },
  
  createDinas: async (data: any) => {
    try {
      // Jangan pakai fetchWithRetry karena FormData butuh auto Content-Type
      const response = await fetch(getApiUrl(API_CONFIG.ENDPOINTS.CREATE_DINAS), {
        method: 'POST',
        body: data, // FormData, jangan set Content-Type manual
      });
      return response.json();
    } catch (error) {
      return { success: false, message: 'Tidak dapat terhubung ke server' };
    }
  },
  
  updateDinas: async (id: number, data: any) => {
    try {
      const response = await fetch(`${getApiUrl(API_CONFIG.ENDPOINTS.UPDATE_DINAS)}/${id}`, {
        method: 'PUT',
        body: data,
      });
      return response.json();
    } catch (error) {
      return { success: false, message: 'Tidak dapat terhubung ke server' };
    }
  },
  
  deleteDinas: async (id: number) => {
    try {
      const response = await fetchWithRetry(`${getApiUrl(API_CONFIG.ENDPOINTS.DELETE_DINAS)}/${id}`, {
        method: 'DELETE',
      });
      return response.json();
    } catch (error) {
      return { success: false, message: 'Tidak dapat terhubung ke server' };
    }
  },
  
  cancelDinas: async (id: number) => {
    try {
      const response = await fetchWithRetry(`${getApiUrl(API_CONFIG.ENDPOINTS.DELETE_DINAS)}/${id}/cancel`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
      });
      return response.json();
    } catch (error) {
      return { success: false, message: 'Tidak dapat terhubung ke server' };
    }
  },
  
  getRiwayatDinas: async () => {
    try {
      const response = await fetchWithRetry(getApiUrl(API_CONFIG.ENDPOINTS.RIWAYAT_DINAS));
      return response.json();
    } catch (error) {
      return { success: false, message: 'Tidak dapat terhubung ke server', data: [] };
    }
  },
  
  getValidasiAbsen: async () => {
    try {
      const response = await fetchWithRetry(getApiUrl(API_CONFIG.ENDPOINTS.VALIDASI_ABSEN));
      return response.json();
    } catch (error) {
      return { success: false, message: 'Tidak dapat terhubung ke server', data: [] };
    }
  },
  
  getDetailDinas: async (id: number) => {
    try {
      const response = await fetchWithRetry(`${getApiUrl(API_CONFIG.ENDPOINTS.DETAIL_DINAS)}/${id}`);
      return response.json();
    } catch (error) {
      return { success: false, message: 'Tidak dapat terhubung ke server', data: null };
    }
  },
  
  getDinasLokasi: async (id_dinas: number) => {
    try {
      const response = await fetchWithRetry(`${getApiUrl(API_CONFIG.ENDPOINTS.DINAS_LOKASI)}/${id_dinas}/lokasi`);
      return response.json();
    } catch (error) {
      return { success: false, message: 'Tidak dapat terhubung ke server', data: [] };
    }
  },
  
  checkAbsenLocation: async (id_dinas: number, latitude: number, longitude: number) => {
    try {
      const response = await fetchWithRetry(getApiUrl(API_CONFIG.ENDPOINTS.CHECK_ABSEN_LOCATION), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id_dinas, latitude, longitude }),
      });
      return response.json();
    } catch (error) {
      return { success: false, message: 'Tidak dapat terhubung ke server' };
    }
  },
  
  validateAbsen: async (absenId: number, action: 'approve' | 'reject', absenType?: 'masuk' | 'pulang') => {
    try {
      const body: any = { action };
      if (absenType) {
        body.absen_type = absenType;
      }
      
      const response = await fetchWithRetry(`${getApiUrl('/admin/kelola-dinas/api/validate-absen')}/${absenId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      return response.json();
    } catch (error) {
      return { success: false, message: 'Tidak dapat terhubung ke server' };
    }
  },
};

/* ========================================
   PENGATURAN API (Admin)
======================================== */
export const PengaturanAPI = {
  getLokasiKantor: async () => {
    try {
      const response = await fetchWithRetry(getApiUrl(API_CONFIG.ENDPOINTS.LOKASI_KANTOR));
      return response.json();
    } catch (error) {
      return { success: false, message: 'Tidak dapat terhubung ke server', data: [] };
    }
  },
  
  saveLokasiKantor: async (data: any) => {
    try {
      const response = await fetchWithRetry(getApiUrl(API_CONFIG.ENDPOINTS.LOKASI_KANTOR), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      return response.json();
    } catch (error) {
      return { success: false, message: 'Tidak dapat terhubung ke server' };
    }
  },
  
  getHariLibur: async () => {
    try {
      const response = await fetchWithRetry(getApiUrl(API_CONFIG.ENDPOINTS.HARI_LIBUR));
      return response.json();
    } catch (error) {
      return { success: false, message: 'Tidak dapat terhubung ke server', data: [] };
    }
  },
  
  getJamKerja: async () => {
    try {
      const response = await fetchWithRetry(getApiUrl(API_CONFIG.ENDPOINTS.JAM_KERJA));
      return response.json();
    } catch (error) {
      return { success: false, message: 'Tidak dapat terhubung ke server', data: [] };
    }
  },
  
  saveJamKerja: async (data: any) => {
    try {
      const response = await fetchWithRetry(getApiUrl(API_CONFIG.ENDPOINTS.JAM_KERJA), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      return response.json();
    } catch (error) {
      return { success: false, message: 'Tidak dapat terhubung ke server' };
    }
  },
  
  saveHariLibur: async (data: any) => {
    try {
      const response = await fetchWithRetry(getApiUrl(API_CONFIG.ENDPOINTS.HARI_LIBUR), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      return response.json();
    } catch (error) {
      return { success: false, message: 'Tidak dapat terhubung ke server' };
    }
  },
  
  deleteHariLibur: async (id: number) => {
    try {
      const response = await fetchWithRetry(`${getApiUrl(API_CONFIG.ENDPOINTS.HARI_LIBUR)}/${id}`, {
        method: 'DELETE',
      });
      return response.json();
    } catch (error) {
      return { success: false, message: 'Tidak dapat terhubung ke server' };
    }
  },
  
  updateLokasi: async (id: number, data: any) => {
    try {
      const response = await fetchWithRetry(`${getApiUrl(API_CONFIG.ENDPOINTS.LOKASI_KANTOR)}/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      return response.json();
    } catch (error) {
      return { success: false, message: 'Tidak dapat terhubung ke server' };
    }
  },
  
  deleteLokasi: async (id: number) => {
    try {
      const response = await fetch(`${getApiUrl(API_CONFIG.ENDPOINTS.LOKASI_KANTOR)}/${id}`, {
        method: 'DELETE',
      });
      const result = await response.json();
      return result;
    } catch (error) {
      return { success: false, message: 'Tidak dapat terhubung ke server' };
    }
  },
};

/* ========================================
   PUSAT VALIDASI API (Admin)
======================================== */
export const PusatValidasiAPI = {
  getAbsenDinas: async () => {
    try {
      const response = await fetchWithRetry(getApiUrl(API_CONFIG.ENDPOINTS.PUSAT_VALIDASI_ABSEN_DINAS));
      return response.json();
    } catch (error) {
      return { success: false, message: 'Tidak dapat terhubung ke server', data: [] };
    }
  },
  
  getAllAbsenDinas: async () => {
    try {
      const response = await fetchWithRetry(getApiUrl(API_CONFIG.ENDPOINTS.PUSAT_VALIDASI_ABSEN_DINAS + '/all'));
      return response.json();
    } catch (error) {
      return { success: false, message: 'Tidak dapat terhubung ke server', data: [] };
    }
  },
  
  getPengajuan: async () => {
    try {
      const response = await fetchWithRetry(getApiUrl(API_CONFIG.ENDPOINTS.PUSAT_VALIDASI_PENGAJUAN));
      return response.json();
    } catch (error) {
      return { success: false, message: 'Tidak dapat terhubung ke server', data: [] };
    }
  },
  
  getAllPengajuan: async () => {
    try {
      const response = await fetchWithRetry(getApiUrl(API_CONFIG.ENDPOINTS.PUSAT_VALIDASI_PENGAJUAN + '/all'));
      return response.json();
    } catch (error) {
      return { success: false, message: 'Tidak dapat terhubung ke server', data: [] };
    }
  },
  
  getStatistik: async () => {
    try {
      const response = await fetchWithRetry(getApiUrl(API_CONFIG.ENDPOINTS.PUSAT_VALIDASI_STATISTIK));
      return response.json();
    } catch (error) {
      return { success: false, message: 'Tidak dapat terhubung ke server', data: {} };
    }
  },
  
  setujui: async (type: string, id: number, catatan?: string) => {
    try {
      const response = await fetchWithRetry(getApiUrl(API_CONFIG.ENDPOINTS.PUSAT_VALIDASI_SETUJUI), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, id, catatan }),
      });
      return response.json();
    } catch (error) {
      return { success: false, message: 'Tidak dapat terhubung ke server' };
    }
  },
  
  tolak: async (type: string, id: number, catatan: string) => {
    try {
      const response = await fetchWithRetry(getApiUrl(API_CONFIG.ENDPOINTS.PUSAT_VALIDASI_TOLAK), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, id, catatan }),
      });
      return response.json();
    } catch (error) {
      return { success: false, message: 'Tidak dapat terhubung ke server' };
    }
  },
};

/* ========================================
   INBOX API
======================================== */
export const InboxAPI = {
  getNotifications: async (user_id: string, role: string) => {
    try {
      const response = await fetchWithRetry(`${getApiUrl(API_CONFIG.ENDPOINTS.INBOX_NOTIFICATIONS)}?user_id=${user_id}&role=${role}`);
      return response.json();
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Tidak dapat terhubung ke server',
        data: []
      };
    }
  },
  
  getUnreadCount: async (user_id: string, role: string) => {
    try {
      const response = await fetchWithRetry(`${getApiUrl(API_CONFIG.ENDPOINTS.INBOX_UNREAD_COUNT)}?user_id=${user_id}&role=${role}`);
      return response.json();
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Tidak dapat terhubung ke server',
        unread_count: 0
      };
    }
  },
  
  markAsRead: async (notification_id: string, user_id: string) => {
    try {
      const response = await fetchWithRetry(getApiUrl(API_CONFIG.ENDPOINTS.INBOX_MARK_READ), {
        method: 'POST',
        body: JSON.stringify({ notification_id, user_id }),
      });
      return response.json();
    } catch (error: any) {
      return { success: false, message: error.message || 'Tidak dapat terhubung ke server' };
    }
  },

  markAllAsRead: async (user_id: string) => {
    try {
      const response = await fetchWithRetry(getApiUrl(API_CONFIG.ENDPOINTS.INBOX_MARK_ALL_READ), {
        method: 'POST',
        body: JSON.stringify({ user_id }),
      });
      return response.json();
    } catch (error: any) {
      return { success: false, message: error.message || 'Tidak dapat terhubung ke server' };
    }
  },
};

export default API_CONFIG;