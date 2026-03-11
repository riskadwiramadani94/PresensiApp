// Konfigurasi API untuk HadirinApp - Node.js Backend

const isDevelopment = __DEV__ || process.env.NODE_ENV === 'development';
const BASE_URL = __DEV__ ? 'http://10.251.102.191:3000' : 'http://10.251.102.191:3000';

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
  }
};

export const getApiUrl = (endpoint: string) => {
  return `${API_CONFIG.BASE_URL}${endpoint}`;
};

export const fetchWithRetry = async (url: string, options: any = {}): Promise<Response> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);
  
  debugLog('API Request', { url, method: options.method || 'GET' });
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...options.headers
      }
    });
    
    clearTimeout(timeoutId);
    debugLog('API Response', { url, status: response.status });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    return response;
  } catch (error: any) {
    clearTimeout(timeoutId);
    debugLog('API Error', { url, error: error.message });
    
    if (error.name === 'AbortError') {
      throw new Error('Request timeout - Server tidak merespons');
    }
    
    throw new Error(error.message || 'Tidak dapat terhubung ke server');
  }
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
        headers: { 'Content-Type': 'application/json' },
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
        headers: { 'Content-Type': 'application/json' },
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

export default API_CONFIG;