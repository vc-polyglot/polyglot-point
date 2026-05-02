import { CapacitorConfig } from '@capacitor/cli';
const config: CapacitorConfig = {
  appId: 'com.lexipop.math',
  appName: 'LexiPop Math',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  },
  plugins: {
    GoogleAuth: {
      scopes: ['profile', 'email'],
      clientId: '613395578802-ci6n809e4fbaieurdjqnsjurh4aoimn9.apps.googleusercontent.com',
      androidClientId: '613395578802-a8deu7tr8artpm1b6qv7ugmij8ssub8p.apps.googleusercontent.com',
      serverClientId: '613395578802-ci6n809e4fbaieurdjqnsjurh4aoimn9.apps.googleusercontent.com',
      forceCodeForRefreshToken: true,
    }
  }
};
export default config;