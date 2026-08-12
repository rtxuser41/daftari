import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.daftari.app',
  appName: 'Daftari',
  webDir: 'dist',
  server: {
    // Only load the web assets over HTTPS inside the native WebView.
    androidScheme: 'https',
  },
};

export default config;
