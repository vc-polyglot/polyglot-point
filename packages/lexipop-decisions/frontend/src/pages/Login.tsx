export async function goGoogleLogin(): Promise<{
  ok: boolean;
  user?: any;
  error?: string;
}> {
  try {
    alert("[1] Iniciando");
    const GoogleAuth = await getGoogleAuth();
    alert("[2] Plugin ok");

    const result = await GoogleAuth.signIn();
    alert("[3] SignIn ok");

    const idToken = result.authentication?.idToken;
    alert(`[4] idToken: ${!!idToken}`);

    const response = await fetch(`${getBase()}/auth/google/token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ idToken }),
    });

    alert(`[5] Status: ${response.status}`);

    if (response.ok) {
      const data = await response.json();
      alert(`[6] Data: ${JSON.stringify(data)}`);
      return { ok: true, user: data.user };
    } else {
      alert(`[ERROR] Status ${response.status}`);
      return { ok: false, error: "Error en backend" };
    }
  } catch (error: any) {
    alert(`[EXC] ${error.message}`);
    return { ok: false, error: error.message };
  }
}