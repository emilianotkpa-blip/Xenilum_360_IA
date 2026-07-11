# Roadmap · Xenilum App — Consola de Inteligencia de Autónoma System

**Objetivo:** Evolucionar el prototipo de chat con UI generativa (sistema de bloques) a una app productiva conectada a n8n + NocoDB, con acciones ejecutables, voz, reportes proactivos y generador de presentaciones liquid glass.

**Restricción de datos (importante):** Xenilum solo tiene acceso a las tablas de **Autónoma System** (CRM interno: proyectos, tareas, finanzas, equipo, clientes como registros). NO tiene acceso a las tablas operativas de ORVE (asesores, reclutamiento, Diamantes). Todo bloque debe alimentarse solo de datos de Autónoma. Los diagramas de arquitectura sí son válidos porque son conocimiento, no datos.

**División de trabajo:**
- **Claude (app de chat):** frontend React (bloques, interacciones, modo presentación), diseño, y redacción de los dos prompts maestros (system prompt de Xenilum + prompt de construcción para Claude Code).
- **Claude Code:** todos los workflows de n8n, esquema NocoDB, endpoints, transcripción de voz, generador de presentaciones y reportes proactivos.

---

## Fase 0 — Contrato del schema (fundación, antes que todo)

**Responsable: Claude (chat)**

Documento único "Xenilum Block Schema v1" que define los tipos de bloque, sus campos exactos y reglas de uso. Es la fuente de verdad compartida: el frontend renderiza exactamente esto y el system prompt de Xenilum exige exactamente esto. Cualquier bloque nuevo se agrega primero aquí.

Bloques v1 (todos funcionales con datos de Autónoma):

| Tipo | Estado | Fuente de datos |
|---|---|---|
| `text` | ✅ Ya en prototipo | — |
| `kpis` | ✅ Ya en prototipo | Tablas de finanzas/CRM |
| `chart` (bar/line/pie) | ✅ Ya en prototipo | Cualquier query agregada |
| `table` | ✅ Ya en prototipo | Cualquier tabla |
| `list` (bullet/numbered) | ✅ Ya en prototipo | — |
| `checklist` (interactivo) | ✅ Ya en prototipo | Tareas del CRM (toggle → PATCH) |
| `accordion` (recursivo) | ✅ Ya en prototipo | — |
| `progress` | ✅ Ya en prototipo | % avance de proyectos |
| `callout` (info/warning/success) | ✅ Ya en prototipo | — |
| `diagram` (nodos + edges) | ✅ Ya en prototipo | Conocimiento de arquitecturas |
| `svg` (escape libre) | ✅ Ya en prototipo | — |
| `gauge` | 🔜 Fase 2 | Meta mensual (tabla config) vs real |
| `timeline` | 🔜 Fase 2 | Fechas de proyectos/entregas del CRM |
| `heatmap` | 🔜 Fase 2 | Actividad del equipo por día (tareas cerradas) |
| `image` | 🔜 Fase 2 | Supabase Storage (creativos, capturas) |
| `code` | 🔜 Fase 2 | Snippets/configs (conocimiento) |
| `actions` | 🔜 Fase 3 | Botones que disparan webhooks n8n |
| `presentation` | 🔜 Fase 5 | Preview + descarga de deck generado |

Fuera de alcance por ahora (requieren datos ORVE): heat map de asesores 4×4, funnel de reclutamiento WF1–WF11. Se reactivan en Fase 6 si se autoriza acceso.

---

## Fase 1 — Conexión real (de mock a producción)

**Claude Code:**
1. **Workflow "Xenilum Chat"** en n8n: webhook POST `/xenilum/chat` que recibe `{ message, userId, conversationId }`.
2. Agente con tools de consulta a NocoDB (API v2), solo tablas Autónoma: proyectos, tareas, finanzas, clientes, equipo. Nodos nativos únicamente (regla de producción).
3. Salida **estrictamente** en el schema de bloques v1 (validar JSON antes de responder; si falla el parse, reintentar una vez y si no, degradar a `{ blocks: [{ type: "text", ... }] }`).
4. Memoria de conversación por `conversationId` (Postgres, con cuidado de no repetir la contaminación de memoria que pasó en Orvito).
5. Historial de conversaciones en NocoDB (tabla `xen_conversations`, `xen_messages`) para que la app las liste.

**Claude (chat):**
1. Reemplazar mock por fetch al webhook con manejo de: loading, timeout (30s), error con retry, respuesta malformada (mostrar texto crudo como fallback).
2. Sidebar/lista de conversaciones anteriores.
3. Auth con Supabase (mismo patrón del CRM de Autónoma).

**Criterio de éxito:** preguntar "¿cuánto facturamos este mes?" y que la gráfica salga con datos reales de NocoDB.

---

## Fase 2 — Bloques nuevos funcionales

**Claude (chat):** componentes `gauge`, `timeline`, `heatmap` (actividad equipo), `image`, `code` — todos con estilo glass y exportables a SVG/PNG donde aplique.

**Claude Code:**
- Tabla `xen_config` en NocoDB con metas (ingresos mensuales, tareas semanales) para alimentar gauges.
- Queries agregadas para heatmap (tareas cerradas por persona por día, últimos 30 días).
- Endpoint de assets: subir/servir imágenes desde Supabase Storage.
- Actualizar el system prompt de Xenilum con los nuevos bloques y ejemplos de cuándo usarlos.

---

## Fase 3 — Saltos de categoría: acciones, drill-down y voz

### 3a. Acciones ejecutables (el más importante)
**Claude (chat):** bloque `actions`: `{ type: "actions", items: [{ label, actionId, params, style: "primary"|"danger", confirm?: "¿Seguro?" }] }`. Al tocar → POST a `/xenilum/action` → muestra resultado como nuevo mensaje. Acciones destructivas piden confirmación en la UI.

**Claude Code:** workflow "Xenilum Actions" con router por `actionId`. Catálogo inicial:
- `crear_tarea` (NocoDB)
- `enviar_recordatorio_cobro` (email/WhatsApp vía Cloud API)
- `agendar_sesion` (crear evento + notificar por Slack)
- `marcar_factura_pagada`
- `notificar_equipo` (mensaje a canal Slack del proyecto)

Regla de seguridad: Xenilum solo puede *proponer* acciones del catálogo; el humano siempre las dispara con el botón. Nada se ejecuta automático desde el LLM.

### 3b. Drill-down en gráficas
**Claude (chat):** onClick en barras/segmentos → auto-envía "desglósame {name}" al chat. Solo frontend, cero backend nuevo.

### 3c. Entrada por voz
**Claude (chat):** botón de micrófono → MediaRecorder API → audio a base64 → POST al webhook con `{ type: "audio", data }` → mostrar "transcribiendo…" → al recibir la transcripción, mostrarla como mensaje del usuario y continuar el flujo normal.

**Claude Code:** en el webhook, si llega audio: base64 → binario → **OpenAI Whisper** (transcripción) → el texto entra al mismo agente. Reusar el patrón ya probado de Evolution API + convert to base64 de Orvito, adaptado a input de la app.

---

## Fase 4 — Reportes proactivos v2 (mejorar los existentes)

**Concepto:** los reportes ya no llegan solo por WhatsApp; la app es el canal principal y los muestra con bloques completos.

**Claude Code:**
1. Migrar/mejorar el workflow existente de reportes: cron (diario 7:00 AM, semanal lunes) → el agente genera el reporte **en schema de bloques** → se guarda en NocoDB (`xen_reports`: fecha, tipo, blocks JSON, leído sí/no).
2. Aviso corto por WhatsApp (Cloud API): "📊 Tu reporte matutino está listo en la consola" con link — WhatsApp avisa, la app muestra.
3. Tipos: matutino (pendientes + bloqueos + agenda), semanal (finanzas + avance proyectos), y alertas por evento (factura por vencer, proyecto sin actividad X días).

**Claude (chat):**
1. Al abrir la app: si hay reportes no leídos, aparecen como mensajes de Xenilum esperándote ("Buenos días Emiliano, esto pasó ayer…").
2. Badge/inbox de reportes con historial navegable.

---

## Fase 5 — Generador de presentaciones liquid glass

**Arquitectura clave:** Xenilum NO genera HTML completo. Genera el **contenido estructurado** y n8n lo inyecta en la plantilla base que ya existe. Así el deck siempre sale con la calidad de siempre y el costo en tokens es mínimo.

**Claude Code:**
1. Convertir las plantillas base HTML (general y ejecutiva) en plantillas con placeholders (`{{title}}`, `{{#slides}}…{{/slides}}`).
2. Workflow "Xenilum Decks": recibe JSON de slides → renderiza plantilla → guarda HTML final en Supabase Storage / VPS → devuelve URL.
3. Schema de slides: `{ template: "general"|"ejecutiva", title, client, slides: [{ layout: "portada"|"kpis"|"bullets"|"comparativa"|"timeline"|"cierre", ...campos por layout }] }`.
4. Tool del agente: `generar_presentacion` — Xenilum arma el JSON a partir de la petición ("hazme la presentación de avance de junio para ORVE") consultando datos reales de NocoDB para los KPIs.

**Claude (chat):**
1. Bloque `presentation`: tarjeta glass con miniatura, título, botones "Ver" (abre en nueva pestaña / iframe fullscreen) y "Descargar HTML".
2. Flujo de refinamiento: "cámbiale el título a la slide 3" → Xenilum regenera solo el JSON → n8n re-renderiza.

---

## Fase 6 — Futuro (requiere decisión de negocio)

- Acceso autorizado a tablas ORVE → se activan heat map 4×4 de Diamantes y funnel de reclutamiento.
- Multi-tenant: la misma consola white-label para clientes (cada cliente ve solo sus datos) — potencial producto SaaS de Autónoma.
- Notificaciones push (PWA).

---

## Orden de ejecución recomendado

1. **Fase 0** → Claude escribe el schema v1 + los dos prompts maestros (system prompt de Xenilum y prompt de construcción para Claude Code).
2. **Fase 1** → Claude Code conecta todo. *Sin esto nada más importa.*
3. **Fase 3a (acciones)** antes que Fase 2 — es el mayor salto de valor.
4. **Fase 2** (bloques nuevos) y **3b/3c** (drill-down, voz) en paralelo.
5. **Fase 4** (reportes) y **Fase 5** (presentaciones) al final — son los más vistosos pero dependen de que la base sea sólida.

## Entregables inmediatos de Claude (chat) para arrancar hoy

1. ✅ Prototipo frontend con 11 bloques + exportación SVG/PNG (hecho).
2. ⏳ Modo presentación (fullscreen por bloque) — se agrega al prototipo.
3. ⏳ Documento "Xenilum Block Schema v1" (contrato completo con ejemplos JSON de cada bloque).
4. ⏳ System prompt de Xenilum (para el agente en n8n).
5. ⏳ Prompt maestro para Claude Code (instrucciones de construcción de Fases 1, 3 y 4 con el contexto del stack: n8n nodos nativos, NocoDB API v2, EasyPanel, Supabase).
