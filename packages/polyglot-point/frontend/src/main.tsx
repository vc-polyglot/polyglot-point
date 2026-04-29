import { createRoot } from "react-dom/client";
import { AuthProvider } from "./auth/AuthContext";
import App from "./App";
import "./styles/index.css";
import DevDrawer from "./dev/DevDrawer";
import { App as CapApp } from "@capacitor/app";
import { Browser } from "@capacitor/browser";

CapApp.addListener("appUrlOpen", async (data) => {
  const url = new URL(data.url);
  if (url.pathname.includes("/auth/success")) {
    const token = url.searchParams.get("token");
    if (token) {
      await fetch(`https://www.polyglotpoint.com/api/auth/session?token=${token}`, {
        credentials: "include",
      });
    }
    await Browser.close();
    window.location.href = "/";
  }
});

createRoot(document.getElementById("root")!).render(
  <AuthProvider>
    <App />
    {import.meta.env.DEV && <DevDrawer />}
  </AuthProvider>
);