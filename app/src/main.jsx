import React from "react";
import ReactDOM from "react-dom/client";
import XenilumChat from "./XenilumChat.jsx";
import { initPWA } from "./pwa.js";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <XenilumChat />
  </React.StrictMode>
);

// Registra el Service Worker y habilita Web Push (solo en producción/HTTPS).
initPWA();
