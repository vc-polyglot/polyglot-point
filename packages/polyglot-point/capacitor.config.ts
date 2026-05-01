import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.polyglot.point',
  appName: 'Polyglot Point',
  webDir: 'dist/public',
  server: {
    androidScheme: 'https'
  },
  plugins: {
    GoogleAuth: {
      scopes: ['profile', 'email'],
      clientId: '1058588126233-0fs5h75qa3ccorrk2do3glrnagjo5lfs.apps.googleusercontent.com',
      androidClientId: '1058588126233-0fs5h75qa3ccorrk2do3glrnagjo5lfs.apps.googleusercontent.com',
      serverClientId: '1058588126233-0fs5h75qa3ccorrk2do3glrnagjo5lfs.apps.googleusercontent.com',
      forceCodeForRefreshToken: true,
    }
  }
};

export default config;