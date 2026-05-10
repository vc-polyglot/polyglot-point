import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/api":  "http://localhost:3002",
      "/auth": "http://localhost:3002",
    },
  },
  resolve: {
    alias: {
      "@daniele-rolli/capacitor-google-auth": path.resolve(__dirname, "src/shims/empty.ts"),
      "@capacitor/core": path.resolve(__dirname, "src/shims/empty.ts"),
    },
  },
});