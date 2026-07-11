import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Puerto 5175: el 5173 (orvito-dashboard) y 5174 (preview CRM) suelen estar ocupados.
export default defineConfig({
  plugins: [react()],
  server: { port: 5175, strictPort: true, host: true },
  preview: { port: 5175, strictPort: true },
});
