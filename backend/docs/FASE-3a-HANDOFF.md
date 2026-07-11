# Xenilum App · Fase 3a — Acciones ejecutables (handoff)

**Estado:** ✅ Completa y verificada en vivo. Modelo de seguridad: **Xenilum solo PROPONE (botones); el humano ejecuta al tocarlos.** Nada se dispara automático desde el LLM.

## Backend
- Workflow **Xenilum Actions** `M1VAqNVrSKgF3M3v` (activo): `POST /webhook/api/xenilum/action { actionId, params, userId }` → auth → handler por actionId → log → `{ success, message }`.
- Tabla **`xen_action_log`** `mm8opurqcxtn07w` (user_email, action_id, params_json, success, result_message).
- WhatsApp real vía nodo `evolutionApi` (cred "Evolution account" `Zf7AIQRJMilaN7im`, instancia **Xenilium**). `remoteJid` dinámico desde `params.telefono`; si no hay teléfono → va a Emiliano (`5219861039024`).

### Catálogo cerrado de acciones
| actionId | Qué hace | Infra | style |
|---|---|---|---|
| `crear_tarea` | Inserta tarea en NocoDB | NocoDB ✅ | primary |
| `marcar_factura_pagada` | `finanzas_ingresos` → estado Pagado + monto_recibido=total | Supabase ✅ | danger + confirm |
| `enviar_recordatorio_cobro` | WhatsApp al cliente (o a Emiliano si no hay tel) | Evolution ✅ | danger + confirm |
| `notificar_equipo` | WhatsApp a un número (o a Emiliano) | Evolution ✅ | primary |
| `agendar_sesion` | Registra tarea + aviso WhatsApp | NocoDB+Evolution ✅ (Calendar/Slack ❌ pendiente cred) | primary |

## Frontend
- Bloque `actions` en `app/src/XenilumChat.jsx` (`ActionsBlock` + `ActionCtx`): botones primary(oro)/danger(rojo), confirmación inline en 2 pasos para las peligrosas, ejecuta vía `POST /xenilum/action` y agrega el resultado como mensaje (callout success/warning).

## Prompt
- Sección 8 "Acciones ejecutables": catálogo cerrado (no puede inventar actionId), params por acción (llenados desde el snapshot), regla "solo propone", danger+confirm para mensajes/dinero.

## Probado
- `crear_tarea` (id 56 creada y borrada), `marcar_factura_pagada` (COT-044 → Pagado $20k → revertida), `notificar_equipo` (WhatsApp real enviado a Emiliano). Agente propone bloques `actions` con params reales para "recordatorio de cobro" y "crear tarea".

## Fase 3b — Drill-down ✅
Click en una barra/segmento de cualquier `chart` → auto-envía "Desglósame {name}" al chat (via `SendCtx` en el frontend; cero backend nuevo). También sirve para las gráficas multi-serie.

## Fase 3c — Voz ✅
- Frontend: botón 🎤 (MediaRecorder → webm → base64) en el input; muestra "Transcribiendo tu audio…"; al volver, pinta la transcripción como mensaje del usuario y sigue el flujo normal.
- Backend: el webhook `/xenilum/chat` acepta `{ type:"audio", data, format }`. Rama de audio en el workflow: **IF ¿audio? → Code (base64→binario) → nodo HTTP "Whisper" (multipart, whisper-1) → Code (inyecta texto) → Prep**. La respuesta incluye `transcription`.
- ⚠️ Aprendizaje clave: transcribir con multipart armado a mano en un Code node NO funciona (n8n serializa el Buffer → OpenAI 400). Se resolvió con un **nodo HTTP Request dedicado** con `contentType: multipart-form-data` + `formBinaryData`.

## Pendiente
- Conectar Slack/Google Calendar en n8n (OAuth, lo hace Emiliano) para `agendar_sesion`/`notificar_equipo` reales por esos canales.
- Endpoint de assets (Supabase Storage) para el bloque `image` (último de Fase 2).

⚠️ Los botones en la app ejecutan acciones REALES al hacer click (crean tareas, mandan WhatsApp, cambian finanzas). Para probar, usa datos que puedas revertir.
