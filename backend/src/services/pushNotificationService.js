const { Expo } = require('expo-server-sdk');
const { getConnection } = require('../config/database');

const expo = new Expo();

class PushNotificationService {
  // Kirim notifikasi ke 1 user
  static async sendToUser(userId, title, message, tipe = 'info', data = {}) {
    try {
      console.log(`[PUSH] Sending to user ${userId}: ${title}`);
      
      const db = await getConnection();
      
      // Ambil push token dari user_devices
      const [devices] = await db.execute(
        'SELECT push_token FROM user_devices WHERE id_user = ? AND is_active = 1',
        [userId]
      );
      
      if (devices.length === 0) {
        console.log(`[PUSH] No active devices for user ${userId}`);
        // Tetap simpan ke database meski tidak ada device
        await this.saveToDatabase(userId, title, message, tipe, data);
        return;
      }
      
      // Kirim push notification
      const messages = [];
      for (const device of devices) {
        if (!Expo.isExpoPushToken(device.push_token)) {
          console.warn(`[PUSH] Invalid token: ${device.push_token}`);
          continue;
        }
        
        messages.push({
          to: device.push_token,
          sound: 'default',
          title: title,
          body: message,
          data: { ...data, tipe },
          priority: 'high',
          channelId: 'default'
        });
      }
      
      if (messages.length > 0) {
        const chunks = expo.chunkPushNotifications(messages);
        for (const chunk of chunks) {
          try {
            const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
            console.log(`[PUSH] Sent ${ticketChunk.length} notifications`);
          } catch (error) {
            console.error('[PUSH] Error sending chunk:', error);
          }
        }
      }
      
      // Simpan ke database
      await this.saveToDatabase(userId, title, message, tipe, data);
      
    } catch (error) {
      console.error('[PUSH] Error:', error);
      throw error;
    }
  }
  
  // Kirim notifikasi ke banyak user
  static async sendToMultipleUsers(userIds, title, message, tipe = 'info', data = {}) {
    try {
      console.log(`[PUSH] Sending to ${userIds.length} users: ${title}`);
      
      const db = await getConnection();
      
      // Ambil semua push token
      const placeholders = userIds.map(() => '?').join(',');
      const [devices] = await db.execute(
        `SELECT id_user, push_token FROM user_devices 
         WHERE id_user IN (${placeholders}) AND is_active = 1`,
        userIds
      );
      
      if (devices.length === 0) {
        console.log('[PUSH] No active devices found');
        return;
      }
      
      // Kirim push notification
      const messages = [];
      for (const device of devices) {
        if (!Expo.isExpoPushToken(device.push_token)) {
          continue;
        }
        
        messages.push({
          to: device.push_token,
          sound: 'default',
          title: title,
          body: message,
          data: { ...data, tipe },
          priority: 'high',
          channelId: 'default'
        });
      }
      
      if (messages.length > 0) {
        const chunks = expo.chunkPushNotifications(messages);
        for (const chunk of chunks) {
          try {
            await expo.sendPushNotificationsAsync(chunk);
          } catch (error) {
            console.error('[PUSH] Error sending chunk:', error);
          }
        }
      }
      
      // Simpan ke database untuk setiap user
      for (const userId of userIds) {
        await this.saveToDatabase(userId, title, message, tipe, data);
      }
      
      console.log(`[PUSH] Successfully sent to ${messages.length} devices`);
      
    } catch (error) {
      console.error('[PUSH] Error:', error);
      throw error;
    }
  }
  
  // Kirim notifikasi ke semua admin
  static async sendToAdmins(title, message, tipe = 'info', data = {}) {
    try {
      const db = await getConnection();
      
      // Ambil semua admin
      const [admins] = await db.execute(
        "SELECT id_user FROM users WHERE role = 'admin'"
      );
      
      const adminIds = admins.map(admin => admin.id_user);
      
      if (adminIds.length > 0) {
        await this.sendToMultipleUsers(adminIds, title, message, tipe, data);
      }
      
    } catch (error) {
      console.error('[PUSH] Error sending to admins:', error);
      throw error;
    }
  }
  
  // Simpan notifikasi ke database
  static async saveToDatabase(userId, title, message, tipe, data) {
    try {
      const db = await getConnection();
      
      await db.execute(
        `INSERT INTO notifikasi (id_user, judul, pesan, tipe, data, created_at)
         VALUES (?, ?, ?, ?, ?, NOW())`,
        [userId, title, message, tipe, JSON.stringify(data)]
      );
      
    } catch (error) {
      console.error('[PUSH] Error saving to database:', error);
    }
  }
  
  // Backward compatibility
  static async send(userId, title, message, data = {}) {
    return this.sendToUser(userId, title, message, 'info', data);
  }
}

module.exports = PushNotificationService;
