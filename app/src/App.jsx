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

export default function App() {
  // undefined = cargando sesión; null = sin sesión; objeto = autenticado
  const [session, setSession] = useState(undefined);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  // Solo ofrecemos activar avisos cuando ya hay sesión.
  useEffect(() => {
    if (session) mountPushBell();
  }, [session]);

  if (session === undefined) return <Loading />;
  if (!session) return <Login />;
  return <XenilumChat />;
}
