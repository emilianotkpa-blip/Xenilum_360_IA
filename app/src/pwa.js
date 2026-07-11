/* Xenilum PWA — registra el Service Worker y gestiona la suscripción a Web Push.
   Autocontenido: inyecta su propio botón flotante, no toca XenilumChat.jsx. */

const API_BASE =
  import.meta.env.VITE_API_BASE ||
  "https://prueba-n8n-prueba.urdzg3.easypanel.host/webhook/api";
const XEN_KEY = import.meta.env.VITE_XEN_KEY || "";
const USER_EMAIL = import.meta.env.VITE_USER_EMAIL || "emilianotkpa@gmail.com";
const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY || "";

function authHeaders() {
  const h = { "Content-Type": "application/json" };
  if (XEN_KEY) h["x-xenilum-key"] = XEN_KEY;
  return h;
}

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

async function sendSubscriptionToServer(sub) {
  return fetch(`${API_BASE}/xenilum/push-subscribe`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ userId: USER_EMAIL, subscription: sub }),
  });
}

async function subscribe(reg) {
  const existing = await reg.pushManager.getSubscription();
  const sub =
    existing ||
    (await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    }));
  try {
    await sendSubscriptionToServer(sub);
  } catch (e) {
    // El navegador ya quedó suscrito; si el endpoint aún no existe en n8n, se reintenta luego.
    console.warn("[xenilum] push-subscribe endpoint no disponible aún:", e);
  }
  return sub;
}

/* ---- Botón flotante "Activar avisos" ---- */
function mountBell(reg) {
  if (!VAPID_PUBLIC_KEY) return; // push aún no configurado (sin llave pública) → no mostrar
  if (Notification.permission === "granted") return; // ya autorizado
  if (localStorage.getItem("xen_push_dismissed") === "1") return;

  const btn = document.createElement("button");
  btn.textContent = "🔔 Activar avisos";
  Object.assign(btn.style, {
    position: "fixed",
    right: "16px",
    bottom: "16px",
    zIndex: "9999",
    padding: "12px 16px",
    borderRadius: "999px",
    border: "1px solid rgba(201,162,74,.5)",
    background: "linear-gradient(135deg,#E4B95B,#C9A24A)",
    color: "#04101F",
    fontFamily: "Inter, system-ui, sans-serif",
    fontWeight: "700",
    fontSize: "14px",
    boxShadow: "0 10px 28px rgba(0,0,0,.4)",
    cursor: "pointer",
  });

  const dismiss = document.createElement("span");
  dismiss.textContent = "✕";
  Object.assign(dismiss.style, { marginLeft: "10px", opacity: ".7", fontWeight: "600" });
  dismiss.onclick = (e) => {
    e.stopPropagation();
    localStorage.setItem("xen_push_dismissed", "1");
    btn.remove();
  };
  btn.appendChild(dismiss);

  btn.onclick = async () => {
    btn.disabled = true;
    btn.style.opacity = ".7";
    try {
      const perm = await Notification.requestPermission();
      if (perm !== "granted") {
        btn.remove();
        return;
      }
      await subscribe(reg);
      btn.textContent = "✓ Avisos activados";
      setTimeout(() => btn.remove(), 1800);
    } catch (e) {
      console.warn("[xenilum] no se pudo activar push:", e);
      btn.disabled = false;
      btn.style.opacity = "1";
      btn.textContent = "🔔 Reintentar avisos";
    }
  };

  document.body.appendChild(btn);
}

export function initPWA() {
  if (typeof window === "undefined") return;
  if (!("serviceWorker" in navigator)) return;

  window.addEventListener("load", async () => {
    try {
      const reg = await navigator.serviceWorker.register("/sw.js");
      // Si ya hay permiso, re-asegura la suscripción en silencio.
      if ("PushManager" in window && Notification.permission === "granted" && VAPID_PUBLIC_KEY) {
        subscribe(reg).catch(() => {});
      } else if ("PushManager" in window) {
        mountBell(reg);
      }
    } catch (e) {
      console.warn("[xenilum] SW registro falló:", e);
    }
  });
}
