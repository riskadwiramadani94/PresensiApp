import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function registerForPushNotificationsAsync() {
  if (!Device.isDevice) {
    console.log("Must use physical device for Push Notifications");
    return null;
  }

  try {
    const { status: existingStatus } =
      await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== "granted") {
      console.log("Failed to get push token for push notification!");
      return null;
    }

    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("default", {
        name: "default",
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#FF231F7C",
      });
    }

    // Dapatkan Expo Push Token
    const token = await Notifications.getExpoPushTokenAsync({
      projectId: '8af35b0e-437c-4473-847e-f55d8d97cb79'
    });

    console.log("Push token:", token.data);
    return token.data;

  } catch (error) {
    console.log("Notification setup error:", error);
    return null;
  }
}

export async function savePushTokenToBackend(pushToken: string, userId?: number, baseUrl?: string) {
  try {
    const url = baseUrl || await AsyncStorage.getItem("baseUrl") || 'http://192.168.1.4:3000';

    if (!userId) {
      console.log("[PUSH] No user ID provided");
      return false;
    }

    console.log('[PUSH] Sending token to backend:', url);
    console.log('[PUSH] User ID:', userId);

    const response = await fetch(`${url}/api/devices/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        push_token: pushToken,
        device_type: Platform.OS,
        device_name: Device.modelName || Device.deviceName,
        user_id: userId
      })
    });

    const data = await response.json();

    if (data.success) {
      console.log("[PUSH] Token saved to backend successfully");
      return true;
    } else {
      console.log("[PUSH] Failed to save token:", data.message);
      return false;
    }

  } catch (error) {
    console.log("[PUSH] Error saving token to backend:", error);
    return false;
  }
}

export async function cancelAllNotifications() {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
    console.log("All notifications cancelled");
  } catch (error) {
    console.log("Cancel notification error:", error);
  }
}
