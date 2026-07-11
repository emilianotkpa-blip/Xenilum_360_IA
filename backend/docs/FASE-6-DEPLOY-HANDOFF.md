# Xenilum · Fase 6 — Deploy (PWA + Web Push) — Handoff

**Estado:** frontend listo para deploy (Dockerfile + PWA + SW). Push **cableado en el cliente**; falta el lado n8n para enviarlo.
**Fecha:** 2026-07-11.

---

## 1. Lo que ya quedó (frontend / repo)
- **Repo:** `github.com/emilianotkpa-blip/Xenilum_360_IA`. Deploy en EasyPanel tipo **Dockerfile** (`app/Dockerfile` → nginx). Ver `app/README.md`.
- **PWA:** `manifest.webmanifest` + `icon.svg` (Prisma) + metas iOS/Android en `index.html`. Instalable en el cel.
- **Service Worker** (`app/public/sw.js`): maneja `push` (muestra la notificación) y `notificationclick` (abre la app). Espera un payload JSON:
  ```json
  { "title": "📊 Reporte matutino", "body": "Buenos días…", "url": "/", "tag": "reporte", "icon": "/icon.svg" }
  ```
- **Cliente** (`app/src/pwa.js`): registra el SW, pide permiso con el botón **🔔 Activar avisos**, se suscribe con la **VAPID pública** y manda la suscripción a:
  `POST {API_BASE}/xenilum/push-subscribe` con `{ userId, subscription }` (header `x-xenilum-key` o JWT).

## 2. Llaves VAPID
Generadas 2026-07-11 (`npx web-push generate-vapid-keys`). Valores en `SECRETS.local.md`.
- **Pública** → build arg `VITE_VAPID_PUBLIC_KEY` (ya en `app/.env` y en el deploy).
- **Privada** → SOLO en n8n (nodo que envía el push). Nunca en el frontend/repo.

## 3. Lo que falta en n8n (2 piezas)

### a) Endpoint `POST /xenilum/push-subscribe` (guardar suscripciones)
- Auth igual que los demás (acepta `x-xenilum-key` o JWT Supabase).
- Tabla NocoDB nueva sugerida **`xen_push_subs`** (base `pz2xzhu7e2bctb1`): `user_email`, `endpoint` (único), `p256dh`, `auth`, `created`.
- Lógica: **upsert por `endpoint`** (el `subscription.keys.p256dh` y `.auth` vienen en el body). Un usuario puede tener varios dispositivos → varias filas.

### b) Enviar el push (al generar reporte / alerta)
Cada notificación se firma con VAPID y se hace `POST` al `subscription.endpoint`. Opciones en n8n:
- **Recomendada:** Code node con la lib **`web-push`** si la instancia permite módulos externos
  (`NODE_FUNCTION_ALLOW_EXTERNAL=web-push`). API: `webpush.setVapidDetails(subject, pub, priv)` + `webpush.sendNotification(sub, JSON.stringify(payload))`.
- **Sin módulos externos:** microservicio aparte (Node + `web-push`) que n8n llama por HTTP, o implementar VAPID (ECDSA P-256 + JWT + AES128GCM) a mano (complejo — no recomendado).
- Manejar **410/404** del endpoint = suscripción muerta → borrar esa fila.

### c) Cablearlo en `Xenilum Reportes` (workflow `LIL1o93dO6AJt66f`)
Tras generar cada reporte: leer `xen_push_subs` del usuario → enviar push con `{title,body,url:"/"}`. Complementa (no reemplaza) el aviso por WhatsApp que ya existe.

## 4. Checklist de verificación (post-deploy)
1. App abre en HTTPS en `xenilum.autonomasystem.com`.
2. Chrome Android → *Instalar app* / *Añadir a inicio* (verifica manifest + SW instalable).
3. Aparece **🔔 Activar avisos** → aceptar permiso → llega la suscripción a `xen_push_subs`.
4. Disparar un reporte de prueba → llega la notificación al cel (app cerrada).
5. Tocar la notificación → abre Xenilum.

> iOS: el push solo funciona si la PWA está **añadida a la pantalla de inicio** (Safari → Compartir → Añadir a pantalla de inicio).
