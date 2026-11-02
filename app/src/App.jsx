import React, { useEffect, useState } from "react";
import { supabase } from "./session.js";
import XenilumChat from "./XenilumChat.jsx";
import Login from "./Login.jsx";
import { mountPushBell } from "./pwa.js";

const PRISMA_TOP = "M22 20 L50 44 L78 20 L78 34 L50 58 L22 34 Z";
const PRISMA_BOT = "M22 80 L50 56 L78 80 L78 66 L50 42 L22 66 Z";

function Loading() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        background: "linear-gradient(165deg,#0E2340,#04101F 75%)",
      }}
    >
      <svg viewBox="0 0 100 100" width="54" height="54" style={{ opacity: 0.9 }}>
        <defs>
          <linearGradient id="ld-top" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#F5E3B3" />
            <stop offset=".5" stopColor="#E4B95B" />
            <stop offset="1" stopColor="#C9A24A" />
          </linearGradient>
          <linearGradient id="ld-bot" x1="1" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#C9A24A" />
            <stop offset="1" stopColor="#8A6D2E" />
          </linearGradient>
        </defs>
        <path d={PRISMA_TOP} fill="url(#ld-top)">
          <animate attributeName="opacity" values="1;.4;1" dur="1.4s" repeatCount="indefinite" />
        </path>
        <path d={PRISMA_BOT} fill="url(#ld-bot)" opacity=".92">
          <animate attributeName="opacity" values=".4;1;.4" dur="1.4s" repeatCount="indefinite" />
        </path>
      </svg>
    </div>
  );
}

/**
 * ¿Entra a la consola? Si Dirección ya le armó su lista de apps en el panel de Permisos del
 * CRM (`app_metadata.apps`), tiene que incluir 'xenilum'. Sin lista, todo sigue como antes.
 * Dirección entra siempre.
 */
function entraAXenilum(user) {
  const m = user?.app_metadata || {};
  if (m.role === "admin" || !Array.isArray(m.apps)) return true;
  return m.apps.includes("xenilum");
}

function SinAcceso() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: 24,
        background: "linear-gradient(165deg,#0E2340,#04101F 75%)",
        color: "#F5F1E8",
        fontFamily: "Inter, system-ui, sans-serif",
        textAlign: "center",
      }}
    >
      <div style={{ maxWidth: 360 }}>
        <svg viewBox="0 0 100 100" width="44" height="44" style={{ opacity: 0.85 }} aria-hidden="true">
          <path d={PRISMA_TOP} fill="#E4B95B" />
          <path d={PRISMA_BOT} fill="#8A6D2E" opacity=".92" />
        </svg>
        <p style={{ fontSize: 17, fontWeight: 600, margin: "14px 0 6px" }}>Tu cuenta no tiene acceso a Xenilum</p>
        <p style={{ fontSize: 14, color: "rgba(245,241,232,.65)", margin: "0 0 18px" }}>
          Dirección lo da desde el panel de Permisos del CRM.
        </p>
        <button
          onClick={() => supabase.auth.signOut()}
          style={{
            background: "transparent",
            color: "#E4B95B",
            border: "1px solid rgba(228,185,91,.45)",
            borderRadius: 999,
            padding: "8px 18px",
            fontSize: 14,
            cursor: "pointer",
          }}
        >
          Entrar con otra cuenta
        </button>
      </div>
    </div>
  );
}

export default function App() {
  // undefined = cargando sesión; null = sin sesión; objeto = autenticado
  const [session, setSession] = useState(undefined);

  useEffect(() => {
    // Mientras se verifica la sesión inicial (y se renueva si hace falta) se ignoran los
    // eventos de auth: el primero trae el token GUARDADO, y pintarlo enseñaría «sin acceso»
    // un instante a quien Dirección acaba de darle la app.
    let listo = false;
    supabase.auth.getSession().then(async ({ data }) => {
      let s = data.session;
      // El token guardado trae los permisos de cuando se emitió (hasta una hora atrás): si
      // con esos no entra, se renueva una vez antes de decir que no.
      if (s && !entraAXenilum(s.user)) {
        const { data: r } = await supabase.auth.refreshSession().catch(() => ({ data: null }));
        if (r && r.session) s = r.session;
      }
      listo = true;
      setSession(s);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      if (listo) setSession(s);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  // Solo ofrecemos activar avisos a quien ya entró y tiene acceso a la consola.
  useEffect(() => {
    if (session && entraAXenilum(session.user)) mountPushBell();
  }, [session]);

  if (session === undefined) return <Loading />;
  if (!session) return <Login />;
  if (!entraAXenilum(session.user)) return <SinAcceso />;
  return <XenilumChat />;
}
