import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import { initPWA } from "./pwa.js";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Registra el Service Worker (Web Push se activa tras login, en producción/HTTPS).
initPWA();
