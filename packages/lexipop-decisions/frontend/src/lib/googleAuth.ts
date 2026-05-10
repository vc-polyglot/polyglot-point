export async function getGoogleAuth() {
  if (!(window as any).Capacitor) return null;

  const mod = await import(
    /* @vite-ignore */
    "@daniele-rolli/capacitor-google-auth"
  );

  return mod.GoogleAuth;
}