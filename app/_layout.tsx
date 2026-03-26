import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Platform } from "react-native";
import * as NavigationBar from "expo-navigation-bar";
import * as Notifications from "expo-notifications";
import { useEffect, useRef } from "react";
import { registerForPushNotificationsAsync, savePushTokenToBackend } from "../components/notificationService";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function RootLayout() {
  const notificationListener = useRef<any>();
  const responseListener = useRef<any>();
  
  useEffect(() => {
    if (Platform.OS === "android") {
      NavigationBar.setBackgroundColorAsync("transparent");
      NavigationBar.setButtonStyleAsync("light");
    }
    
    // Setup push notifications
    setupPushNotifications();
    
    // Setup notification listeners
    notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
      console.log('[NOTIF] Notification received:', notification);
      // Notifikasi diterima saat app foreground
    });

    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('[NOTIF] Notification tapped:', response);
      // User tap notifikasi - bisa navigate ke screen tertentu
      const data = response.notification.request.content.data;
      // TODO: Handle navigation based on notification type
    });

    return () => {
      if (notificationListener.current) {
        Notifications.removeNotificationSubscription(notificationListener.current);
      }
      if (responseListener.current) {
        Notifications.removeNotificationSubscription(responseListener.current);
      }
    };
  }, []);
  
  const setupPushNotifications = async () => {
    try {
      console.log('[NOTIF] Setting up push notifications...');
      
      // Request permission dan dapatkan token
      const token = await registerForPushNotificationsAsync();
      
      if (token) {
        console.log('[NOTIF] Got push token:', token);
        
        // Simpan token ke state/storage untuk digunakan setelah login
        await AsyncStorage.setItem('pendingPushToken', token);
        
        // Cek apakah user sudah login
        const authToken = await AsyncStorage.getItem("token");
        
        if (authToken) {
          // Kirim token ke backend
          const saved = await savePushTokenToBackend(token);
          if (saved) {
            console.log('[NOTIF] Push token registered to backend');
            await AsyncStorage.removeItem('pendingPushToken');
          }
        } else {
          console.log('[NOTIF] User not logged in yet, token will be registered after login');
        }
      }
      
      console.log('[NOTIF] Push notifications setup complete!');
    } catch (error) {
      console.error('[NOTIF] Setup error:', error);
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
