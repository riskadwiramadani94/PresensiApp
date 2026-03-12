const { Expo } = require('expo-server-sdk');
const db = require('../config/database');

// Initialize Expo SDK
const expo = new Expo();

const PushNotificationService = {
  /**
   * Kirim push notification ke user
   * @param {number} userId - ID user penerima
   * @param {string} title - Judul notifikasi
   * @param {string} body - Isi notifikasi
   * @param {object} data - Data untuk navigation (type, reference_id, dll)
   */
  async send(userId, title, body, data = {}) {
    try {
      console.log(`[PUSH] Sending to user ${userId}: ${title}`);
      
      // 1. Ambil push token dari database
      const [devices] = await db.query(`
        SELECT push_token, device_type FROM user_devices 
        WHERE id_user = ? AND is_active = TRUE
      `, [userId]);
      
      if (devices.length === 0) {
        console.log(`[PUSH] No active devices for user ${userId}`);
        return { success: false, message: 'No active devices' };
      }
      
      // 2. Prepare messages
      const messages = [];
      
      for (const device of devices) {
        const pushToken = device.push_token;
        
        // Validasi token
        if (!Expo.isExpoPushToken(pushToken)) {
          console.log(`[PUSH] Invalid token: ${pushToken}`);
          continue;
        }
        
        messages.push({
          to: pushToken,
          sound: 'default',
          title: title,
          body: body,
          data: data, // Data untuk navigation
          badge: 1,
          priority: 'high',
          channelId: 'default'
        });
      }
      
      if (messages.length === 0) {
        console.log(`[PUSH] No valid tokens for user ${userId}`);
        return { success: false, message: 'No valid tokens' };
      }
      
      // 3. Kirim dalam batch
      const chunks = expo.chunkPushNotifications(messages);
      const tickets = [];
      
      for (const chunk of chunks) {
        try {
          const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
          tickets.push(...ticketChunk);
          
          // Log hasil
          ticketChunk.forEach((ticket, index) => {
            if (ticket.status === 'error') {
              console.error(`[PUSH] Error sending to ${chunk[index].to}:`, ticket.message);
              
              // Jika token invalid, nonaktifkan device
              if (ticket.details?.error === 'DeviceNotRegistered') {
                this.deactivateDevice(chunk[index].to);
              }
            } else {
              console.log(`[PUSH] Success: ${ticket.id}`);
            }
          });
        } catch (error) {
          console.error('[PUSH] Error sending chunk:', error);
        }
      }
      
      return { success: true, tickets };
    } catch (error) {
      console.error('[PUSH] Send error:', error);
      return { success: false, error: error.message };
    }
  },
  
  /**
   * Kirim push notification ke multiple users
   * @param {array} userIds - Array of user IDs
   * @param {string} title - Judul notifikasi
   * @param {string} body - Isi notifikasi
   * @param {object} data - Data untuk navigation
   */
  async sendToMultiple(userIds, title, body, data = {}) {
    console.log(`[PUSH] Sending to ${userIds.length} users`);
    
    const promises = userIds.map(userId => 
      this.send(userId, title, body, data)
    );
    
    const results = await Promise.all(promises);
    
    const successCount = results.filter(r => r.success).length;
    console.log(`[PUSH] Sent to ${successCount}/${userIds.length} users`);
    
    return results;
  },
  
  /**
   * Nonaktifkan device dengan token tertentu
   */
  async deactivateDevice(pushToken) {
    try {
      await db.query(`
        UPDATE user_devices 
        SET is_active = FALSE 
        WHERE push_token = ?
      `, [pushToken]);
      
      console.log(`[PUSH] Device deactivated: ${pushToken}`);
    } catch (error) {
      console.error('[PUSH] Deactivate device error:', error);
    }
  }
};

module.exports = PushNotificationService;
