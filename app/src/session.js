/* Sesión Supabase + cabeceras de auth para los endpoints de Xenilum.
   El backend (n8n) valida el JWT y checa el rol (admin | equipo). */
import { createClient } from "@supabase/supabase-js";

// URL y anon key son PÚBLICAS (ok en el frontend). Fallback = valores del ecosistema Autónoma.
const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL || "https://prueba-supabase.urdzg3.easypanel.host";
const SUPABASE_ANON =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzgyNTM0NTcyLCJleHAiOjIwOTc4OTQ1NzJ9.7ge9-frLvemm2cYPx2OLqWYzeMJeAKxRPB8nlx7SJOE";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
});

// XEN_KEY solo como fallback de desarrollo. En prod, quita VITE_XEN_KEY y se usa solo el JWT.
const XEN_KEY = import.meta.env.VITE_XEN_KEY || "";
let accessToken = null;
let userEmail = import.meta.env.VITE_USER_EMAIL || "";

function apply(session) {
  accessToken = session?.access_token || null;
  if (session?.user?.email) userEmail = session.user.email;
}
supabase.auth.getSession().then(({ data }) => apply(data.session));
supabase.auth.onAuthStateChange((_event, session) => apply(session));

export function authHeaders(extra) {
  const h = { "Content-Type": "application/json", ...(extra || {}) };
  if (accessToken) h["Authorization"] = `Bearer ${accessToken}`;
  else if (XEN_KEY) h["x-xenilum-key"] = XEN_KEY;
  return h;
}

export function getUserEmail() {
  return userEmail || "emilianotkpa@gmail.com";
}

export function signOut() {
  return supabase.auth.signOut();
}
