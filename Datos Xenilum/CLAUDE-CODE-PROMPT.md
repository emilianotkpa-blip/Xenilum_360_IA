# PROMPT MAESTRO · Claude Code — Construcción de Xenilum App

## Misión

Construir el backend completo de **Xenilum App**, la consola de inteligencia de Autónoma System: un chat con UI generativa donde el agente Xenilum responde con bloques visuales (gráficas, tablas, diagramas, checklists) alimentados por datos reales de NocoDB, con acciones ejecutables, entrada por voz, reportes proactivos y generador de presentaciones liquid glass.

Trabajas **por fases, en orden, con checkpoint al final de cada una**. No avances a la siguiente fase sin confirmación de Emiliano.

## Archivos de esta carpeta (léelos antes de empezar)

1. `roadmap-xenilum-app.md` — el plan completo con las 6 fases y la división de trabajo.
2. `xenilum-block-schema-v1.md` — **el contrato**. Toda salida del agente debe cumplirlo. Es la fuente de verdad; no lo modifiques sin avisar (el frontend depende de él).
3. `xenilum-system-prompt.md` — el system prompt del agente para el nodo en n8n. Ajusta los nombres de tools a como queden en el workflow, sin cambiar las reglas.
4. `xenilum-chat.jsx` — el frontend actual (prototipo con mock). Te dice exactamente qué espera recibir el cliente. El bloque `send()` tiene marcado dónde va el fetch real.

## Contexto del stack (ya lo conoces, pero las reglas duras)

- **n8n** self-hosted en el VPS (EasyPanel/Docker Swarm). SOLO nodos nativos en producción. Respetar convenciones de nombres de workflows existentes.
- **NocoDB API v2** para toda persistencia estructurada.
- **Supabase**: Auth (mismo patrón que crm.autonomasystem.com) y Storage para assets.
- **WhatsApp Cloud API** (vía la infraestructura ya migrada de Orvito) para avisos.
- **OpenAI Whisper** para transcripción de voz (patrón ya probado: audio → base64 → binario → Whisper).
- Restricción de datos: el agente solo consulta tablas de **Autónoma System**. Cero acceso a tablas operativas de ORVE u otros clientes.

## Reglas de trabajo

1. **Antes de la Fase 1, pregunta a Emiliano:** nombres exactos de las tablas de NocoDB a usar (proyectos, tareas, finanzas, clientes, equipo), base URL del webhook, y dónde vivirá el frontend (¿subdominio nuevo tipo xenilum.autonomasystem.com o ruta dentro del CRM?).
2. Nunca ejecutes operaciones destructivas (DELETE, drops, sobreescritura de workflows productivos) sin confirmación explícita.
3. Cada workflow nuevo: nombre descriptivo consistente con la convención existente, tag `xenilum`, y nota interna de qué hace.
4. Toda salida del agente pasa por validación de JSON contra el schema ANTES de responder al frontend. Si el parse falla: 1 reintento; si vuelve a fallar, degradar a `{ "blocks": [{ "type": "text", "content": "<output crudo>" }] }`. El frontend nunca debe recibir JSON roto.
5. Al terminar cada fase: resumen de lo construido, cómo probarlo (curl de ejemplo), y qué falta.

---

## FASE 1 — Conexión real (PRIORIDAD MÁXIMA)

**Objetivo:** que "¿cuánto facturamos este mes?" devuelva bloques con datos reales.

1. Crear tablas en NocoDB: `xen_conversations` (id, user, título, created_at, updated_at) y `xen_messages` (id, conversation_id, role, blocks_json, created_at).
2. Workflow **"Xenilum Chat"**: webhook POST `/xenilum/chat` recibe `{ message, userId, conversationId }`.
3. Nodo de agente con el system prompt de `xenilum-system-prompt.md` y tools de consulta NocoDB (solo tablas Autónoma): consultas por proyecto, tareas por persona/estado, resumen financiero por periodo, facturas pendientes.
4. Memoria de conversación por `conversationId` (Postgres). Cuidado con el bug conocido de contaminación de memoria entre sesiones que pasó en Orvito — aislar por conversation, no por user.
5. Validación del JSON de salida (regla 4 de arriba) + persistir cada mensaje en `xen_messages`.
6. Endpoint GET `/xenilum/conversations` y `/xenilum/messages?conversationId=` para que la app liste el historial.
7. Endpoint PATCH `/xenilum/task-toggle` que recibe `{ taskId, done }` y actualiza la tarea en NocoDB (lo usa el bloque checklist).

**Definition of done:** curl al webhook con una pregunta financiera devuelve `{ blocks: [...] }` válido con datos reales; el toggle de tarea actualiza NocoDB.

## FASE 3a — Acciones ejecutables (segunda prioridad, antes que Fase 2)

1. Workflow **"Xenilum Actions"**: webhook POST `/xenilum/action` recibe `{ actionId, params, userId }`, router (Switch) por `actionId`.
2. Catálogo inicial (cerrado — el agente NO puede inventar actionIds):
   - `crear_tarea` → crea registro en NocoDB
   - `enviar_recordatorio_cobro` → mensaje por Cloud API / email al contacto de la factura
   - `agendar_sesion` → crea evento y notifica por Slack al canal del proyecto
   - `marcar_factura_pagada` → update en NocoDB
   - `notificar_equipo` → mensaje al canal Slack correspondiente
3. Cada acción responde `{ success, message }` que la app muestra como confirmación.
4. Actualizar el system prompt del agente: habilitar el bloque `actions` (ver schema) con el catálogo y la regla de que solo propone, nunca ejecuta.
5. Log de acciones ejecutadas en NocoDB (`xen_action_log`: quién, qué, cuándo, params, resultado).

## FASE 2 — Datos para bloques nuevos

1. Tabla `xen_config` en NocoDB: metas (ingreso mensual objetivo, tareas semanales objetivo) → alimenta bloques `gauge`.
2. Query agregada para `heatmap`: tareas cerradas por persona por día, últimos 30 días.
3. Queries de fechas/hitos para `timeline`.
4. Endpoint de assets con Supabase Storage para bloque `image`.
5. Actualizar system prompt con los bloques nuevos (siguiendo el schema, sección Fase 2).

## FASE 3c — Voz

1. En el webhook de chat: aceptar `{ type: "audio", data: "<base64>", format: "webm" }`.
2. base64 → binario → OpenAI Whisper → texto → mismo flujo del agente.
3. Responder incluyendo `{ transcription: "..." }` junto a los blocks para que la app muestre lo que se entendió.

## FASE 4 — Reportes proactivos v2

1. Tabla `xen_reports` (id, tipo, fecha, blocks_json, leído).
2. Mejorar el workflow existente de reportes: cron diario 7:00 AM (America/Merida) y semanal lunes → el agente genera el reporte EN SCHEMA DE BLOQUES → guarda en `xen_reports`.
3. Aviso corto por WhatsApp vía Cloud API: "📊 Tu reporte está listo en la consola" + link. WhatsApp avisa; la app muestra el reporte completo.
4. Alertas por evento: factura a ≤3 días de vencer, proyecto sin actividad ≥7 días.
5. Endpoint GET `/xenilum/reports?unread=true` para que la app los muestre al abrir.

## FASE 5 — Generador de presentaciones

1. Tomar las plantillas base HTML liquid glass existentes (general y ejecutiva) y parametrizarlas con placeholders.
2. Workflow **"Xenilum Decks"**: recibe JSON de slides (`{ template, title, client, slides: [{ layout, ... }] }`, layouts: portada, kpis, bullets, comparativa, timeline, cierre) → renderiza → guarda HTML en Supabase Storage → devuelve `{ url, downloadUrl, slideCount }`.
3. Tool `generar_presentacion` para el agente: arma el JSON consultando datos reales de NocoDB para los KPIs.
4. Habilitar bloque `presentation` en el system prompt.
5. Soportar refinamiento: regenerar deck a partir del JSON anterior con cambios puntuales.

---

## Al terminar todo

Documento final de handoff: URLs de todos los endpoints, tablas creadas, workflows con sus IDs, y el system prompt final del agente tal como quedó desplegado.
