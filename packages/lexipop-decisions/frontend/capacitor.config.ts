import { CapacitorConfig } from '@capacitor/cli';
const config: CapacitorConfig = {
  appId: 'com.ohtlica.app',
  appName: 'Ohtlica',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  },
  plugins: {
    GoogleSignIn: {
      clientId: '1058588126233-7egjc9es675mj6lfijquopmekfndf6ai.apps.googleusercontent.com',
      scopes: ['profile', 'email'],
      androidClientId: '1058588126233-9qssb250ncukj64jggt2i794vjhhve36.apps.googleusercontent.com',
      webClientId: '1058588126233-7egjc9es675mj6lfijquopmekfndf6ai.apps.googleusercontent.com',
      forceCodeForRefreshToken: true,
    }
  }
};
export default config;