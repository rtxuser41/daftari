import type { ExpoConfig } from "expo/config";

const bundleId = "com.app.daftar";

const config: ExpoConfig = {
  name: "DAFTAR — دفتر الأستاذ الذكي",
  slug: "daftar",
  version: "1.2.0",
  orientation: "portrait",
  icon: "./assets/images/daftar-mark-user.png",
  scheme: "daftar",
  userInterfaceStyle: "automatic",
  newArchEnabled: true,
  ios: {
    supportsTablet: true,
    bundleIdentifier: bundleId,
  },
  android: {
    allowBackup: false,
    adaptiveIcon: {
      backgroundColor: "#FAF9F6",
      foregroundImage: "./assets/images/daftar-mark-user.png",
    },
    edgeToEdgeEnabled: true,
    predictiveBackGestureEnabled: false,
    package: bundleId,
    permissions: ["POST_NOTIFICATIONS"],
    blockedPermissions: [
      "android.permission.READ_EXTERNAL_STORAGE",
      "android.permission.WRITE_EXTERNAL_STORAGE",
    ],
  },
  web: {
    bundler: "metro",
    output: "static",
    favicon: "./assets/images/daftar-mark-user.png",
  },
  plugins: [
    "expo-router",
    "expo-font",
    [
      "expo-notifications",
      {
        defaultChannel: "lessons",
        color: "#C5A059",
      },
    ],
    [
      "expo-local-authentication",
      {
        faceIDPermission: "السماح لـ DAFTAR باستخدام Face ID لحماية بياناتك.",
      },
    ],
    [
      "expo-secure-store",
      {
        configureAndroidBackup: true,
      },
    ],
    [
      "expo-splash-screen",
      {
        image: "./assets/images/daftar-logo-user.png",
        imageWidth: 240,
        resizeMode: "contain",
        backgroundColor: "#FAF9F6",
        dark: {
          backgroundColor: "#0E1927",
        },
      },
    ],
    [
      "expo-build-properties",
      {
        android: {
          buildArchs: ["armeabi-v7a", "arm64-v8a"],
          minSdkVersion: 24,
        },
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
    reactCompiler: true,
  },
};

export default config;
