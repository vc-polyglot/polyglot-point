let initialized = false;

export async function getGoogleAuth() {
  const cap = (window as any).Capacitor;
  if (!cap) return null;

  const GoogleAuth = cap.Plugins?.GoogleAuth;
  if (!GoogleAuth) return null;

  if (!initialized) {
    try {
      await GoogleAuth.initialize();
      initialized = true;
    } catch (e) {
      console.warn("[GoogleAuth] initialize error:", e);
    }
  }

  return GoogleAuth;
}