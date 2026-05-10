export async function getGoogleAuth() {
  const cap = (window as any).Capacitor;
  if (!cap) return null;

  const GoogleAuth = cap.Plugins?.GoogleAuth;
  if (!GoogleAuth) return null;

  return GoogleAuth;
}