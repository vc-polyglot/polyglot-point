import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.polyglot.point',
  appName: 'Polyglot Point',
  webDir: 'dist/public',
  server: {
    androidScheme: 'https'
  }
};

export default config;
