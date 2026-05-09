import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./styles/index.css";

async function bootstrap() {
  const isNative = typeof window !== "undefined" && !!(window as any)?.Capacitor?.isNativePlatform?.();
  if (isNative) {
    try {
      const { GoogleAuth } = await import("@daniele-rolli/capacitor-google-auth");
      await GoogleAuth.initialize();
    } catch (e) {
      console.warn("[Capacitor] GoogleAuth init failed:", e);
    }
  }
  ReactDOM.createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}

bootstrap();