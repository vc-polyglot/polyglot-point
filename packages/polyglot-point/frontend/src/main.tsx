import { createRoot } from "react-dom/client";
import { AuthProvider } from "./auth/AuthContext";
import App from "./App";
import "./styles/index.css";
import DevDrawer from './dev/DevDrawer';

createRoot(document.getElementById("root")!).render(
  <AuthProvider>
    <App />
{import.meta.env.DEV && <DevDrawer />}
  </AuthProvider>
);
