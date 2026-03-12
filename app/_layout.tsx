import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Platform } from "react-native";
import * as NavigationBar from "expo-navigation-bar";
import { useEffect } from "react";
import * as Notifications from "expo-notifications";
import { PushNotificationManager } from "../utils/PushNotificationManager";
import { AuthStorage } from "../utils/AuthStorage";
import { useRouter } from "expo-router";

export default function RootLayout() {
  const router = useRouter();
  
  useEffect(() => {
    if (Platform.OS === "android") {
      NavigationBar.setBackgroundColorAsync("transparent");
      NavigationBar.setButtonStyleAsync("light");
    }
    
    // Initialize push notifications
    initPushNotifications();
    
    // Setup notification handlers
    PushNotificationManager.setupNotificationHandlers(router);
  }, []);
  
  const initPushNotifications = async () => {
    try {
      // Cek apakah user sudah login
      const user = await AuthStorage.getUser();
      
      if (user) {
        console.log('[APP] User logged in, registering push notifications');
        await PushNotificationManager.registerForPushNotifications();
      } else {
        console.log('[APP] User not logged in, skipping push notification registration');
      }
      
      // Handle notification yang dibuka saat app mati (cold start)
      const response = await Notifications.getLastNotificationResponseAsync();
      
      if (response) {
        console.log('[APP] App opened from notification (cold start)');
        const data = response.notification.request.content.data;
        
        // Delay untuk memastikan navigation ready
        setTimeout(() => {
          PushNotificationManager.handleNotificationNavigation(data, router);
        }, 1000);
      }
    } catch (error) {
      console.error('[APP] Push notification init error:', error);
    }
  };

  return (
    <>
      {/* Status bar global */}
      <StatusBar style="light" translucent backgroundColor="transparent" />

      {/* ROOT STACK — WAJIB TANPA HEADER */}
      <Stack
        screenOptions={{
          headerShown: false,
          animation: "fade",
        }}
      />
    </>
  );
}
