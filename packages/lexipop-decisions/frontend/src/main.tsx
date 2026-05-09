import React from "react";
import ReactDOM from "react-dom/client";
import { Capacitor } from "@capacitor/core";
import { GoogleAuth } from "@daniele-rolli/capacitor-google-auth";
import App from "./App";
import "./styles/index.css";

async function bootstrap() {
  if (Capacitor.isNativePlatform()) {
    await GoogleAuth.initialize();
  }
  ReactDOM.createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}

bootstrap();