# Xenilum App · Fase 1 — Handoff (conexión real)

**Estado:** ✅ Completa y verificada en vivo. `2026-07-10`.
**Qué logra:** el webhook responde con `{ blocks: [...] }` reales del CRM (NocoDB + finanzas de Supabase), persiste el historial y permite palomear tareas.

---

## 1. Lo que se construyó

### Tablas nuevas en NocoDB (base `pz2xzhu7e2bctb1`)
| Tabla | ID | Campos |
|---|---|---|
| `xen_conversations` | `mh6utzeon7iqonk` | titulo, user_email, last_message (+ Id, CreatedAt, UpdatedAt) |
| `xen_messages` | `mpty25ioum3ftd9` | conversation_id, role, blocks_json, content_preview (+ Id, CreatedAt) |

### Workflows n8n nuevos
| Workflow | ID | Rol |
|---|---|---|
| **Xenilum Chat** | `4GNzaXgXjK3qRvkL` | Los 4 endpoints (chat, conversations, messages, task-toggle) + AI Agent |
| **Xenilum Tool - Consultar Datos** | `j3M4AxIi6q42jtgf` | Sub-workflow tool `consultar_crm` (snapshot del CRM). **Debe estar ACTIVO** |

- Modelo: **OpenAI gpt-4.1-mini** (cred n8n `Tto6fLj9V2b9mYaS`), temp 0.2.
- Memoria: `memoryBufferWindow` aislada por `conversationId` (evita la contaminación tipo Orvito). Historial durable en `xen_messages`.
- Validación de salida: el `Finalize` parsea el JSON del agente; si falla, degrada a `{blocks:[{type:"text",content:<crudo>}]}`. El front nunca recibe JSON roto.

---

## 2. Endpoints (base `https://prueba-n8n-prueba.urdzg3.easypanel.host/webhook/api`)

| Método | Ruta | Body / Query | Respuesta |
|---|---|---|---|
| POST | `/xenilum/chat` | `{ message, userId, conversationId? }` | `{ blocks:[...], conversationId }` |
| GET | `/xenilum/conversations` | `?user=<email>` | `{ ok, conversations:[{id,titulo,last_message,updated_at}] }` |
| GET | `/xenilum/messages` | `?conversationId=<id>` | `{ ok, messages:[{role,blocks,created_at}] }` |
| PATCH | `/xenilum/task-toggle` | `{ taskId, done }` | `{ ok, taskId, done, estado }` |

### Autenticación (regla de oro: nada de acceso anónimo a datos)
Cada endpoint acepta **uno** de:
- Header `Authorization: Bearer <JWT Supabase>` con rol `admin` o `equipo` (lo que enviará el frontend).
- Header `x-xenilum-key: <XEN_KEY>` (acceso server-to-server / pruebas / futuros crons de reportes).

**XEN_KEY actual:** `xen_TU_LLAVE_AQUI`  (vive server-side en el nodo *Prep chat*; ver `SECRETS.local.md`).

---

## 3. Cómo probarlo (curl)

```bash
BASE=https://prueba-n8n-prueba.urdzg3.easypanel.host/webhook/api
XKEY=xen_TU_LLAVE_AQUI

# Chat — pregunta financiera
curl -s -X POST "$BASE/xenilum/chat" -H "Content-Type: application/json" -H "x-xenilum-key: $XKEY" \
  -d '{"message":"¿Cuánto facturamos este mes? Desglose por cliente.","userId":"emilianotkpa@gmail.com"}'

# Historial
curl -s "$BASE/xenilum/conversations?user=emilianotkpa@gmail.com" -H "x-xenilum-key: $XKEY"
curl -s "$BASE/xenilum/messages?conversationId=1" -H "x-xenilum-key: $XKEY"

# Toggle de tarea (usa un Id real de la tabla tareas)
curl -s -X PATCH "$BASE/xenilum/task-toggle" -H "Content-Type: application/json" -H "x-xenilum-key: $XKEY" \
  -d '{"taskId":24,"done":true}'
```

Pruebas ejecutadas OK: financiera ($65,000 MXN reales · Grupo ORVE), proyectos (progress con avances reales), task-toggle (Completada↔Pendiente verificado en NocoDB), 401 sin credencial.

---

## 4. Wiring del frontend (`xenilum-chat.jsx`)

Reemplazar el mock en `send()` (líneas ~839-851) por un fetch real:

```js
const send = async (text) => {
  const msg = (text ?? input).trim();
  if (!msg || thinking) return;
  setInput("");
  setMessages((m) => [...m, { role: "user", text: msg }]);
  setThinking(true);
  try {
    const res = await fetch(`${API_BASE}/xenilum/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${supabaseAccessToken}` },
      body: JSON.stringify({ message: msg, userId: userEmail, conversationId }),
    });
    const data = await res.json();
    setConversationId(data.conversationId);
    setMessages((m) => [...m, { role: "assistant", blocks: data.blocks }]);
  } catch (e) {
    setMessages((m) => [...m, { role: "assistant", blocks: [{ type: "text", content: "No pude conectar. Reintenta." }] }]);
  } finally { setThinking(false); }
};
```
- `API_BASE = https://prueba-n8n-prueba.urdzg3.easypanel.host/webhook/api`
- El checklist debe hacer `PATCH /xenilum/task-toggle` al palomear (usar `item.id` = Id real de la tarea).
- CORS ya permite `localhost:5173/5174`, `crm.autonomasystem.com` y `xenilum.autonomasystem.com`.

---

## 5. Pendiente / mejoras conocidas
- **Retry real del JSON del agente** (hoy: degradación directa; falta el 1 reintento antes de degradar).
- **Memoria a Postgres** (`memoryPostgresChat`) cuando tengamos el id de la cred `postgres` — hoy buffer en RAM aislado por conversación + historial en NocoDB.
- **Distinción COT vs REC** en finanzas ("facturado" hoy suma cotizaciones del mes; afinar a recibos/monto_recibido si se requiere).
- **Periodo arbitrario en finanzas** (hoy: mes actual; el snapshot no recibe parámetros por la limitación de paso de args del toolWorkflow en esta instancia).
- Rotar credenciales expuestas en los README (ver recomendación de seguridad).

## 6. Siguiente fase sugerida
**Fase 3a — Acciones ejecutables** (bloque `actions` + workflow "Xenilum Actions"): crear_tarea, enviar_recordatorio_cobro, agendar_sesion, marcar_factura_pagada, notificar_equipo. Es el mayor salto de valor según el roadmap.
