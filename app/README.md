# Xenilum App — Frontend (Vite + React) · PWA

Consola de inteligencia de Autónoma System: chat con UI generativa (bloques) + PWA instalable con Web Push.

## Desarrollo local
```bash
cp .env.example .env    # y rellena VITE_XEN_KEY (ver backend/docs/SECRETS.local.md)
npm install
npm run dev             # http://localhost:5175
```
> Web Push **no** funciona en `localhost` sobre `http`; requiere HTTPS (deploy). El SW sí se registra.

## Build de producción
```bash
npm run build           # genera dist/ (estático)
npm run preview         # sirve dist/ en :5175 para probar
```

## Deploy en EasyPanel (tipo **Dockerfile**)
El [`Dockerfile`](./Dockerfile) es multi-stage: compila con Node y sirve `dist/` con nginx (config en [`nginx.conf`](./nginx.conf), con fallback SPA, no-cache del `sw.js` y mime del manifest).

> **Nota deploy:** EasyPanel usa el **`Dockerfile` de la raíz del repo** (contexto = raíz), que compila esta carpeta `app/`. Este `app/Dockerfile` es para builds locales con contexto = `app/`.

**Pasos:**
1. **Create App → Source:** repo `emilianotkpa-blip/Xenilum_360_IA`, branch `main`.
2. **Build:** método **Dockerfile** (con la config por defecto: contexto = raíz, `Dockerfile` en la raíz). No hay que apuntar a subcarpeta.
3. **Build Args** (se hornean en el bundle público — no pongas llaves privadas):

   | Arg | Valor |
   |---|---|
   | `VITE_API_BASE` | `https://prueba-n8n-prueba.urdzg3.easypanel.host/webhook/api` |
   | `VITE_SUPABASE_URL` | `https://prueba-supabase.urdzg3.easypanel.host` |
   | `VITE_SUPABASE_ANON_KEY` | *(anon key pública — ver README maestro §3)* |
   | `VITE_VAPID_PUBLIC_KEY` | `BDVluEt6EQlVaJotYGsxQFwmU5YbHSxG63sHibN5-rJcyRT_3JdKLd9wCkxewObaFQR2Yppd80uQ_5At6gHNZBk` |

   > **Login activo:** con Supabase Auth, `VITE_XEN_KEY` **ya no es necesaria** y conviene **quitarla** de los Build Args (así deja de exponerse). El frontend manda el JWT del usuario. `VITE_USER_EMAIL` tampoco hace falta (sale de la sesión).

4. **Puerto:** el contenedor expone **80**.
5. **Dominio + SSL:** `xenilum.autonomasystem.com` (ya está en el CORS de n8n) con certificado. **Web Push exige HTTPS.**
6. Deploy. Abre en el cel → menú → *Añadir a pantalla de inicio* → aparece el botón **🔔 Activar avisos**.

## 🔐 Login (Supabase Auth)
- `src/session.js` crea el cliente Supabase (URL + anon key públicas) y expone `authHeaders()` (mete el **JWT** en `Authorization: Bearer`) y `getUserEmail()`.
- `src/App.jsx` es el *gate*: si no hay sesión muestra `src/Login.jsx` (email + contraseña); si hay, renderiza la consola. Botón **Salir** en el header.
- Usuarios = los del **CRM** (Supabase Auth, rol `app_metadata.role` admin/equipo). No hay que crear nada nuevo; Emiliano entra con sus credenciales del CRM.
- Con esto **quita `VITE_XEN_KEY`** de los Build Args: ya no se expone y el backend valida el JWT.
- Si el login diera **CORS/401**: revisar que el webhook de `Xenilum Chat` (n8n) permita el origen `https://xenilum.autonomasystem.com` y la cabecera `Authorization`.

## PWA / Web Push
- `public/manifest.webmanifest`, `public/icon.svg` (isotipo Prisma), `public/sw.js` (push + click + offline shell).
- `src/pwa.js` registra el SW e inyecta el botón de avisos; suscribe con la clave pública VAPID y hace `POST /xenilum/push-subscribe`.
- **Falta en n8n** para que el push llegue de verdad: ver `backend/docs/FASE-6-DEPLOY-HANDOFF.md`.
