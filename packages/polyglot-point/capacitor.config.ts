import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.polyglot.point',
  appName: 'Polyglot Point',
  webDir: 'frontend/dist',
  server: {
    androidScheme: 'https'
  }
};

export default config;
