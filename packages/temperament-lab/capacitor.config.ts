import type { CapacitorConfig } from '@capacitor/cli';

// PLACEHOLDER — confirmar appId cuando haya nombre oficial
const config: CapacitorConfig = {
  appId: 'com.ohtlica.tempera',
  appName: 'Tempera',
  webDir: 'frontend/dist',
  server: { androidScheme: 'https' },
};

export default config;
