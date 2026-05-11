import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.ohtlica.app',
  appName: 'Ohtlica',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
    // NUNCA agregar server.url aquí en producción
  },
  plugins: {
    GoogleAuth: {
      scopes: ['profile', 'email'],
      clientId: '1058588126233-7egjc9es675mj6lfijquopmekfndf6ai.apps.googleusercontent.com',
      androidClientId: '1058588126233-7egjc9es675mj6lfijquopmekfndf6ai.apps.googleusercontent.com',
      serverClientId: '1058588126233-7egjc9es675mj6lfijquopmekfndf6ai.apps.googleusercontent.com',
      forceCodeForRefreshToken: true,
    }
  }
};

export default config;