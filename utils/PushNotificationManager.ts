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
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export class PushNotificationManager {
  /**
   * Request permission dan register push token
   */
  static async registerForPushNotifications() {
    try {
      if (!Device.isDevice) {
        console.log('[PUSH] Push notifications only work on physical devices');
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
        console.log('[PUSH] Notification permission denied');
        return null;
      }

      console.log('[PUSH] Notification permission granted');
      
      // Dapatkan push token dari Expo
      const tokenData = await Notifications.getExpoPushTokenAsync({
        projectId: 'e5b90c9b-a9fa-4114-a4cd-05e34b97d2e8', // Project ID dari app.config.js
      });
      
      const pushToken = tokenData.data;
      console.log('[PUSH] Got push token:', pushToken);
      
      // Save token ke backend
      await this.savePushToken(pushToken);
      
      return pushToken;
    } catch (error: any) {
      console.error('[PUSH] Error registering for push notifications:', error);
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

    // Cek jika type undefined atau null
    if (!type) {
      console.log('Notification data missing type:', data);
      return;
    }

    switch (type) {
      case 'presensi_reminder':
        router.push('/(pegawai)/presensi');
        break;
      
      case 'presensi_validation':
        router.push('/(admin)/tracking');
        break;
      
      case 'pengajuan_approved':
      case 'pengajuan_rejected':
        router.push('/menu-pegawai/pengajuan');
        break;
      
      case 'pengajuan_new':
        router.push('/menu-admin/pengajuan');
        break;
      
      case 'absen_dinas_validation':
        if (reference_id) {
          router.push(`/pengajuan/absen-dinas/${reference_id}`);
        } else {
          router.push('/pengajuan/absen-dinas');
        }
        break;
      
      case 'system_announcement':
        router.push('/(pegawai)/bantuan');
        break;
      
      default:
        console.log('Unknown notification type:', type);
    }
  }
}