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

**Pasos:**
1. **Create App → Source:** repo `emilianotkpa-blip/Xenilum_360_IA`, branch `main`.
2. **Build:** método **Dockerfile**. Build context / Dockerfile path apuntando a la carpeta **`app`** (ahí viven el `Dockerfile` y `package.json`).
3. **Build Args** (se hornean en el bundle público — no pongas llaves privadas):

   | Arg | Valor |
   |---|---|
   | `VITE_API_BASE` | `https://prueba-n8n-prueba.urdzg3.easypanel.host/webhook/api` |
   | `VITE_XEN_KEY` | *(ver SECRETS.local.md)* |
   | `VITE_USER_EMAIL` | `emilianotkpa@gmail.com` |
   | `VITE_VAPID_PUBLIC_KEY` | `BDVluEt6EQlVaJotYGsxQFwmU5YbHSxG63sHibN5-rJcyRT_3JdKLd9wCkxewObaFQR2Yppd80uQ_5At6gHNZBk` |

4. **Puerto:** el contenedor expone **80**.
5. **Dominio + SSL:** `xenilum.autonomasystem.com` (ya está en el CORS de n8n) con certificado. **Web Push exige HTTPS.**
6. Deploy. Abre en el cel → menú → *Añadir a pantalla de inicio* → aparece el botón **🔔 Activar avisos**.

## ⚠️ Seguridad (importante, leer)
`VITE_XEN_KEY` queda **en el JS público**: cualquiera que abra la URL puede leerla y golpear los endpoints del CRM. Mitigaciones (elige una):
- **Rápida:** activar **Basic Auth** en EasyPanel delante de la app (o mantener el dominio no difundido).
- **Correcta (pendiente):** login con **Supabase** y que el frontend mande el **JWT** en vez de la XEN_KEY (los endpoints ya aceptan `Authorization: Bearer`).

## PWA / Web Push
- `public/manifest.webmanifest`, `public/icon.svg` (isotipo Prisma), `public/sw.js` (push + click + offline shell).
- `src/pwa.js` registra el SW e inyecta el botón de avisos; suscribe con la clave pública VAPID y hace `POST /xenilum/push-subscribe`.
- **Falta en n8n** para que el push llegue de verdad: ver `backend/docs/FASE-6-DEPLOY-HANDOFF.md`.
