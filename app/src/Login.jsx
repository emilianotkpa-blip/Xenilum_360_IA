import React, { useState } from "react";
import { supabase } from "./session.js";
import AmbientBackground from "./AmbientBackground.jsx";

const NAVY_DEEP = "#04101F";
const GOLD = "#C9A24A";
const GOLD_LIGHT = "#E4B95B";
const INK = "#EAF0F7";
const FONT = "'Inter', system-ui, -apple-system, Segoe UI, sans-serif";

const PRISMA_TOP = "M22 20 L50 44 L78 20 L78 34 L50 58 L22 34 Z";
const PRISMA_BOT = "M22 80 L50 56 L78 80 L78 66 L50 42 L22 66 Z";

function traducirError(msg) {
  const m = (msg || "").toLowerCase();
  if (m.includes("invalid login")) return "Correo o contraseña incorrectos.";
  if (m.includes("email not confirmed")) return "Falta confirmar el correo.";
  if (m.includes("rate limit")) return "Demasiados intentos, espera un momento.";
  if (m.includes("network") || m.includes("fetch")) return "Sin conexión con el servidor.";
  return msg || "No se pudo iniciar sesión.";
}

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    if (loading) return;
    setErr("");
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    setLoading(false);
    if (error) setErr(traducirError(error.message));
    // Si es correcto, onAuthStateChange (en App.jsx) cambia la vista automáticamente.
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: "24px",
        fontFamily: FONT,
        background:
          "radial-gradient(80% 60% at 78% 8%, rgba(201,162,74,.20), transparent 55%)," +
          "radial-gradient(70% 55% at 10% 96%, rgba(43,92,230,.18), transparent 55%)," +
          "linear-gradient(165deg, #0E2340, #04101F 75%)",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <AmbientBackground />
      <form
        onSubmit={submit}
        style={{
          width: "100%",
          maxWidth: 380,
          position: "relative",
          zIndex: 1,
          background: "rgba(20,28,42,.72)",
          backdropFilter: "blur(22px)",
          WebkitBackdropFilter: "blur(22px)",
          border: "1px solid rgba(255,255,255,.08)",
          borderRadius: 28,
          padding: "34px 28px 30px",
          boxShadow: "0 24px 60px rgba(0,0,0,.45)",
          color: INK,
        }}
      >
        {/* Logo Prisma */}
        <div style={{ display: "grid", placeItems: "center", marginBottom: 18 }}>
          <div
            style={{
              width: 66,
              height: 66,
              borderRadius: "22%",
              display: "grid",
              placeItems: "center",
              background: "linear-gradient(160deg,#123158,#04101F)",
              border: "1px solid rgba(201,162,74,.4)",
              boxShadow: "0 10px 28px rgba(0,0,0,.4)",
            }}
          >
            <svg viewBox="0 0 100 100" width="40" height="40">
              <defs>
                <linearGradient id="lg-top" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0" stopColor="#F5E3B3" />
                  <stop offset=".5" stopColor="#E4B95B" />
                  <stop offset="1" stopColor="#C9A24A" />
                </linearGradient>
                <linearGradient id="lg-bot" x1="1" y1="0" x2="0" y2="1">
                  <stop offset="0" stopColor="#C9A24A" />
                  <stop offset="1" stopColor="#8A6D2E" />
                </linearGradient>
              </defs>
              <path d={PRISMA_TOP} fill="url(#lg-top)" />
              <path d={PRISMA_BOT} fill="url(#lg-bot)" opacity=".92" />
            </svg>
          </div>
        </div>

        <h1
          style={{
            fontFamily: "'Sora', " + FONT,
            fontWeight: 800,
            fontSize: 22,
            textAlign: "center",
            margin: "0 0 4px",
            letterSpacing: ".5px",
          }}
        >
          Xenilum
        </h1>
        <p style={{ textAlign: "center", color: "rgba(234,240,247,.6)", fontSize: 13, margin: "0 0 22px" }}>
          Consola de Inteligencia · Autónoma System
        </p>

        <label style={labelSt}>Correo</label>
        <input
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="tucorreo@autonomasystem.com"
          required
          style={inputSt}
        />

        <label style={labelSt}>Contraseña</label>
        <input
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          required
          style={inputSt}
        />

        {err && (
          <div
            style={{
              background: "rgba(232,139,139,.12)",
              border: "1px solid rgba(232,139,139,.4)",
              color: "#F0B9B9",
              borderRadius: 12,
              padding: "9px 12px",
              fontSize: 13,
              margin: "4px 0 14px",
            }}
          >
            {err}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          style={{
            width: "100%",
            marginTop: err ? 0 : 14,
            padding: "13px",
            borderRadius: 14,
            border: "none",
            cursor: loading ? "default" : "pointer",
            fontFamily: FONT,
            fontWeight: 700,
            fontSize: 15,
            color: NAVY_DEEP,
            background: `linear-gradient(135deg, ${GOLD_LIGHT}, ${GOLD})`,
            opacity: loading ? 0.7 : 1,
            boxShadow: "0 10px 26px rgba(201,162,74,.28)",
          }}
        >
          {loading ? "Entrando…" : "Entrar"}
        </button>

        <p style={{ textAlign: "center", color: "rgba(234,240,247,.4)", fontSize: 12, marginTop: 18 }}>
          Usa tus credenciales del CRM de Autónoma.
        </p>
      </form>
    </div>
  );
}

const labelSt = {
  display: "block",
  fontSize: 12,
  color: "rgba(234,240,247,.65)",
  margin: "0 0 6px 2px",
  fontWeight: 600,
};
const inputSt = {
  width: "100%",
  boxSizing: "border-box",
  padding: "12px 14px",
  marginBottom: 16,
  borderRadius: 13,
  border: "1px solid rgba(255,255,255,.12)",
  background: "rgba(4,16,31,.6)",
  color: "#EAF0F7",
  fontSize: 15,
  fontFamily: FONT,
  outline: "none",
};
