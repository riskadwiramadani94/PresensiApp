export default {
  expo: {
    name: "Presensi",
    slug: "presensi-app-new", 
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/images/presensi-logo.png",
    userInterfaceStyle: "light",
    scheme: "presensi", // Fix linking scheme warning
    splash: {
      image: "./assets/images/presensi-logo.png",
      resizeMode: "contain",
      backgroundColor: "#ffffff"
    },
    notification: {
      icon: "./assets/images/presensi-logo.png",
      color: "#2196F3",
      androidMode: "default",
      androidCollapsedTitle: "{{unread_count}} notifikasi baru"
    },
    ios: {
      supportsTablet: true,
      infoPlist: {
        UIBackgroundModes: ["remote-notification"]
      }
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/images/presensi-logo.png",
        backgroundColor: "#ffffff",
        monochromeImage: "./assets/images/presensi-logo.png"
      },
      permissions: [
        "NOTIFICATIONS",
        "RECEIVE_BOOT_COMPLETED",
        "INTERNET",
        "ACCESS_NETWORK_STATE",
        "ACCESS_FINE_LOCATION",
        "ACCESS_COARSE_LOCATION"
      ],
      package: "com.c9586313.presensi",
      usesCleartextTraffic: true,
      networkSecurityConfig: "./network_security_config.xml",
      notification: {
        icon: "./assets/images/presensi-logo.png",
        color: "#004643"
      }
    },
    web: {
      output: "static",
      favicon: "./assets/images/presensi-logo.png"
    },
    plugins: [
      "expo-router",
      "expo-dev-client",
      [
        "expo-notifications",
        {
          icon: "./assets/images/presensi-logo.png",
          color: "#2196F3",
          sounds: ["./assets/images/notification_sound.mp3"],
          mode: "development"
        }
      ]
    ],
    experiments: {
      typedRoutes: true
    },
    extra: {
      eas: {
        projectId: "8af35b0e-437c-4473-847e-f55d8d97cb79"
      }
    }
  }
};