import AsyncStorage from '@react-native-async-storage/async-storage';

export const AuthStorage = {
  // Ambil data user dari penyimpanan lokal
  async getUser() {
    try {
      const userData = await AsyncStorage.getItem('userData');
      console.log('[AUTH DEBUG] Getting user data:', userData);
      return userData ? JSON.parse(userData) : null;
    } catch (error) {
      console.error('Error mengambil data user:', error);
      return null;
    }
  },

  // Simpan data user ke penyimpanan lokal
  async setUser(userData) {
    try {
      console.log('[AUTH DEBUG] Saving user data:', userData);
      await AsyncStorage.setItem('userData', JSON.stringify(userData));
      
      // Verify data tersimpan
      const saved = await AsyncStorage.getItem('userData');
      console.log('[AUTH DEBUG] Verified saved data:', saved);
      
      return true;
    } catch (error) {
      console.error('Error menyimpan data user:', error);
      return false;
    }
  },

  // Hapus data user dari penyimpanan lokal (untuk logout)
  async removeUser() {
    try {
      await AsyncStorage.removeItem('userData');
      return true;
    } catch (error) {
      console.error('Error menghapus data user:', error);
      return false;
    }
  },

  // Cek apakah user sudah login atau belum
  async isLoggedIn() {
    try {
      const user = await this.getUser();
      return !!user; // Konversi ke boolean: ada user = true, tidak ada = false
    } catch (error) {
      console.error('Error mengecek status login:', error);
      return false;
    }
  },

  // Ambil role/peran user (admin atau user biasa)
  async getUserRole() {
    try {
      const user = await this.getUser();
      return user?.role || null; // Return role jika ada, null jika tidak ada
    } catch (error) {
      console.error('Error mengambil role user:', error);
      return null;
    }
  }
};