import { createRoot } from "react-dom/client";
import { AuthProvider } from "./auth/AuthContext";
import App from "./App";
import "./styles/index.css";
import DevDrawer from "./dev/DevDrawer";
import { Capacitor } from "@capacitor/core";
import { GoogleAuth } from "@daniele-rolli/capacitor-google-auth";

async function bootstrap() {
  if (Capacitor.isNativePlatform()) {
    await GoogleAuth.initialize();
  }

  createRoot(document.getElementById("root")!).render(
    <AuthProvider>
      <App />
      {import.meta.env.DEV && <DevDrawer />}
    </AuthProvider>
  );
}

bootstrap();