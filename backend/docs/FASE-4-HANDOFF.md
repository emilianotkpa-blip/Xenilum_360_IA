# Xenilum App · Fase 4 — Reportes proactivos (handoff)

**Estado:** ✅ Construido y probado. **Crons DESHABILITADOS** (no se envía nada solo hasta tu OK).

## Piezas
- Tabla NocoDB **`xen_reports`** `mievgooetyzdwdb` (tipo, titulo, blocks_json, resumen, leido).
- Workflow **Xenilum Reportes** `LIL1o93dO6AJt66f` (activo, pero los cron triggers están `disabled`):
  - `POST /webhook/api/xenilum/report/run { tipo, notify }` → genera el reporte (llamando al agente Xenilum vía /xenilum/chat con userId `reportes@xenilum` para no ensuciar tu sidebar) → guarda en xen_reports → si `notify:true`, WhatsApp de aviso.
  - **Cron Diario 7AM** (`0 7 * * *`, America/Merida) → reporte **matutino** (deshabilitado).
  - **Cron Semanal Lunes 7AM** (`0 7 * * 1`) → reporte **semanal** (deshabilitado).
  - `GET /webhook/api/xenilum/reports?unread=true` → lista reportes.
  - `PATCH /webhook/api/xenilum/report-read { reportId }` → marca leído.
- WhatsApp de aviso vía nodo evolutionApi (instancia Xenilium) a Emiliano `5219861039024`.

## Tipos de reporte
- **matutino**: saludo + checklist de pendientes/bloqueos + timeline de fechas límite + callouts de alertas.
- **semanal**: resumen + kpis financieros + progress de proyectos + callout.
- **alerta**: solo facturas por cobrar + proyectos sin avance (o "todo en orden").

## Frontend
- Al abrir la app, los reportes **no leídos** aparecen como mensajes de Xenilum (con cabecera "📊 {título}" y botón "marcar leído"), y un **badge** 📊N en el header.

## Probado
- Matutino generado (bloques text/checklist/timeline/callout). Semanal generado **+ WhatsApp real enviado**. Marcar leído funciona. Crons no disparan.

## Para activar los envíos automáticos
En n8n, workflow "Xenilum Reportes": habilitar los nodos **Cron Diario 7AM** y **Cron Semanal Lun** (quitar `disabled`). O dime y lo hago por API. Recibirás el matutino cada día 7 AM y el semanal los lunes, con aviso por WhatsApp.

## Notificaciones push nativas (cel)
Hoy el aviso al teléfono es por **WhatsApp**. Para push nativo (PWA) se requiere desplegar la app en HTTPS (EasyPanel) + service worker + Web Push (VAPID). Queda para el deploy.
