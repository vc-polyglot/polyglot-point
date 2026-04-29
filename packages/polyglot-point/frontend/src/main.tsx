import { createRoot } from "react-dom/client";
import { AuthProvider } from "./auth/AuthContext";
import App from "./App";
import "./styles/index.css";
import DevDrawer from "./dev/DevDrawer";
import { App as CapApp } from "@capacitor/app";
import { Browser } from "@capacitor/browser";

CapApp.addListener("appUrlOpen", (data) => {
  const url = new URL(data.url);
  if (url.pathname.includes("/auth/google/callback") || url.pathname === "/") {
    Browser.close();
    window.location.href = "/";
  }
});

createRoot(document.getElementById("root")!).render(
  <AuthProvider>
    <App />
    {import.meta.env.DEV && <DevDrawer />}
  </AuthProvider>
);
