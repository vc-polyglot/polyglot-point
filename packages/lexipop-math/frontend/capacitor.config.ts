import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.lexipop.math',
  appName: 'LexiPop Math',
  webDir: 'dist',
  server: {
    url: 'https://www.lexipopmath.com',
    cleartext: false
  }
};

export default config;
