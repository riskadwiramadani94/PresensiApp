import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { getApiUrl, API_CONFIG } from '@/constants/config';
import { AuthStorage } from './AuthStorage';

// Konfigurasi notifikasi
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export class PushNotificationManager {
  /**
   * Request permission dan register push token
   */
  static async registerForPushNotifications() {
    try {
      if (!Device.isDevice) {
        console.log('[DEBUG] Push notifications only work on physical devices');
        return null;
      }

      // Request permission untuk notifications
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      
      if (finalStatus !== 'granted') {
        console.log('[DEBUG] Notification permission denied');
        return null;
      }

      console.log('[LOGIN] Notification permission granted');
      console.log('[DEBUG] Using bell notification system + local notifications');
      
      // Return success untuk bell notification
      return 'bell-notifications-enabled';
    } catch (error: any) {
      console.log('[PUSH ERROR]', error.message);
      return null;
    }
  }

  /**
   * Save push token ke backend
   */
  static async savePushToken(pushToken: string) {
    try {
      const user = await AuthStorage.getUser();
      if (!user) return;

      const deviceName = `${Device.brand} ${Device.modelName}`;
      const deviceType = Platform.OS === 'ios' ? 'ios' : 'android';

      const response = await fetch(`${getApiUrl('/api/push-token/save')}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: user.id_user || user.id,
          push_token: pushToken,
          device_type: deviceType,
          device_name: deviceName,
        }),
      });

      const result = await response.json();
      
      if (result.success) {
        console.log('Push token saved successfully');
      } else {
        console.error('Failed to save push token:', result.message);
      }
    } catch (error) {
      console.error('Error saving push token:', error);
    }
  }

  /**
   * Remove push token saat logout
   */
  static async removePushToken() {
    try {
      const token = await Notifications.getExpoPushTokenAsync();

      const response = await fetch(`${getApiUrl('/api/push-token/remove')}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          push_token: token.data,
        }),
      });

      const result = await response.json();
      console.log('Push token removed:', result.success);
    } catch (error) {
      console.error('Error removing push token:', error);
    }
  }

  /**
   * Handle notification tap - navigation
   */
  static setupNotificationHandlers(router: any) {
    // Handle notification tap saat app terbuka
    Notifications.addNotificationReceivedListener((notification) => {
      console.log('Notification received:', notification);
    });

    // Handle notification tap
    Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data;
      console.log('Notification tapped:', data);

      // Navigate berdasarkan type
      if (data?.type) {
        this.handleNotificationNavigation(data, router);
      }
    });
  }

  /**
   * Handle navigation berdasarkan notification type
   */
  static handleNotificationNavigation(data: any, router: any) {
    const { type, reference_id } = data;

    switch (type) {
      case 'presensi_reminder':
        router.push('/(pegawai)/presensi');
        break;
      
      case 'pengajuan_approved':
      case 'pengajuan_rejected':
        router.push('/menu-pegawai/pengajuan');
        break;
      
      case 'pengajuan_new':
        router.push('/menu-admin/pengajuan');
        break;
      
      case 'absen_dinas_validation':
        router.push('/menu-admin/pengajuan');
        break;
      
      case 'system_announcement':
        router.push('/(pegawai)/bantuan');
        break;
      
      default:
        console.log('Unknown notification type:', type);
    }
  }
}