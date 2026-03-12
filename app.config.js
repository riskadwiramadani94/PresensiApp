export default {
  expo: {
    name: "Presensi",
    slug: "presensi-app-new", 
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/images/presensi-logo.png",
    userInterfaceStyle: "light",
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
        backgroundColor: "#ffffff"
      },
      permissions: [
        "NOTIFICATIONS",
        "RECEIVE_BOOT_COMPLETED",
        "INTERNET",
        "ACCESS_NETWORK_STATE"
      ],
      package: "com.c9586313.presensi",
      usesCleartextTraffic: true,
      networkSecurityConfig: "./network_security_config.xml"
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
          mode: "development"
        }
      ]
    ],
    experiments: {
      typedRoutes: true
    },
    updates: {
      url: "https://u.expo.dev/e5b90c9b-a9fa-4114-a4cd-05e34b97d2e8"
    },
    runtimeVersion: {
      policy: "appVersion"
    },
    extra: {
      eas: {
        projectId: "e5b90c9b-a9fa-4114-a4cd-05e34b97d2e8"
      }
    }
  }
};