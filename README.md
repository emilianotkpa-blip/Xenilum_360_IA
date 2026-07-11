# Xenilum 360 IA — Agente personal de Emiliano (WhatsApp)

> Referencia técnica del agente **Xenilum** para trabajar con cualquier agente/desarrollador. Contexto general del ecosistema: ver `../../../README.md` (README maestro de Autónoma System).
> Última actualización: 2026-07-10. 🔐 Llaves al final; rotarlas pronto (estuvieron en chat).

---

## 1. Qué es
**Xenilum** es el **asistente personal de Emiliano por WhatsApp**: consulta y gestiona el CRM de Autónoma System conversando. Corre en **n8n** y responde por **Evolution API**.

- **Workflow n8n:** `WF - Agente Autonoma System - Xenilum` → ID **`U0UKaNX3htS05crU`**
- **Estado:** activo. Se dispara por **webhook** (mensajes de WhatsApp de Emiliano) y por un **cron diario** (revisión proactiva).
- **Solo responde a Emiliano** (IF "Es Emiliano" filtra por número/identidad).

---

## 2. Infraestructura del agente

| Pieza | Detalle |
|---|---|
| **Orquestador** | n8n → `https://prueba-n8n-prueba.urdzg3.easypanel.host` (API `/api/v1/`, header `X-N8N-API-KEY`) |
| **LLM** | **OpenAI `gpt-4.1-mini`** (nodo "OpenAI Chat Model", credencial n8n `openAiApi` id `fYGIdQL6Sv57GDaD`). El nodo "Claude Sonnet" (`claude-sonnet-4-5`) está **deshabilitado** — para volver a Claude, habilitarlo y conectarlo al agente |
| **Memoria** | `memoryBufferWindow` (en RAM). **Pendiente**: pasar a memoria persistente (Postgres) |
| **Canal de salida** | **Evolution API** (WhatsApp no oficial) → `https://prueba-bruno-evolution-api.urdzg3.easypanel.host`, instancia **"Emi"** (credencial n8n `evolutionApi`) |
| **Datos** | NocoDB (CRM) vía token `xc-token`; ver tablas/IDs en el README maestro |

**Flujo actual (simplificado):** Webhook WhatsApp → Set contexto → IF "Es Emiliano" → **AI Agent "Cerebro Autonoma"** (OpenAI + memoria + tools) → Evolution API responde.

---

## 3. Tools del agente (capacidades)

Cada tool es un **sub-workflow** de n8n conectado al AI Agent por `ai_tool`. Los "Gestionar" usan el patrón: `executeWorkflowTrigger (passthrough) → Code (HTTP a NocoDB con xc-token) → confirmación`.

| Tool (nombre para el modelo) | Sub-workflow ID | Qué hace |
|---|---|---|
| `Consultar Pipeline` | `Xbz1q69gIEveiMO1` | Lee los prospectos del pipeline |
| `Consultar Equipo` | `2wTLZ5zyj0IwSgWS` | Lee el equipo y sus tareas activas (para obtener **equipo_id**) |
| `Agregar Prospecto` | `hRnecu6ahrf1uKG9` | Crea un prospecto (pipeline) |
| `Actualizar Prospecto` | `l4PxroScrrnmqR5U` | Edita un prospecto |
| `Tabla_Clientes` | (nodo `nocoDbTool` interno) | Acceso a clientes |
| **`gestionar_cliente`** | `FmoE7JQpgpLWXLw8` | **Crear/editar CLIENTE** (tabla `mqmf75uo7alxzyr`). Con `Id`=edita, sin `Id`=crea. Req al crear: `nombre_empresa` |
| **`gestionar_tarea`** | `c9eyg3uB94HhMaEY` | **Crear/editar TAREA** (`m04sve8bcl6exnm`). Req: `titulo`. Campos: prioridad, estado, fecha_limite, hora_limite, equipo_id, proyectos_id, notas |
| **`gestionar_proyecto`** | `4HSxI3bxP24IKK2E` | **Crear/editar PROYECTO** (`m5qns05nh0vrrwa`). Req: `nombre_proyecto`. Campos: cliente, clientes_id, estado, etapa, costo_total, anticipo, fechas, porcentaje_avance |

- **Sin borrar**: por decisión de Emiliano, los "gestionar" solo **crean y editan** (el borrado se hace manual). La edición es **parcial** (solo cambia los campos que se manden).
- Los `*_id` (equipo_id, proyectos_id, clientes_id) son **números**: el agente los obtiene con las tools de consulta antes de crear/editar.

---

## 4. Arquitectura objetivo (estilo "Agente Orve IA") — PENDIENTE

Referencia: `C:\Users\emili\Downloads\Agente - Asesor Orve IA (7).json` (42 nodos, muy completo). Traer a Xenilum:

1. **Buffer / debounce con Redis + Wait** — juntar mensajes seguidos y responder a todos juntos (no fragmento por fragmento). (cred n8n `redis`)
2. **Multimodal** — detectar y manejar **audio (transcribir con OpenAI Whisper), documentos, imágenes** (nodos IF "Es audio?/documento?").
3. **Memoria persistente en Postgres** (`memoryPostgresChat`) en vez del buffer en RAM. (cred n8n `postgres`)
4. **NO** RAG / vector store — Xenilum lee el CRM **en vivo** por tools, no necesita base de conocimiento estática.
5. (Opcional) registro de nickname/preferencias.

> Es un rediseño grande sobre un agente en vivo: hacerlo con backup del workflow antes de tocarlo.

---

## 5. Cómo trabajar/extenderlo (para otro agente)

- **Ver/editar el workflow por API:** `GET /api/v1/workflows/U0UKaNX3htS05crU` (header `X-N8N-API-KEY`). Para actualizar: `PUT` con `{name, nodes, connections, settings}` y luego `POST /api/v1/workflows/{id}/activate`.
- ⚠️ Al hacer `PUT`, **filtrar `settings`** a llaves permitidas o da 400 (`saveExecutionProgress, saveManualExecutions, saveDataErrorExecution, saveDataSuccessExecution, executionTimeout, errorWorkflow, timezone, executionOrder`).
- **Agregar una tool nueva:** crear un sub-workflow (`executeWorkflowTrigger passthrough → lógica → salida`), y en Xenilum agregar un nodo `toolWorkflow` con `workflowInputs.schema` (los campos que el modelo llena) conectado al AI Agent por `ai_tool`.
- **NocoDB desde una tool:** `POST/PATCH https://prueba-nocodb.urdzg3.easypanel.host/api/v2/tables/{tableId}/records` body `[{...campos}]` (PATCH incluye `Id`), header `xc-token`.
- **Backup rápido:** `GET` del workflow y guardar el JSON antes de cambios.
- **Modelos:** el nodo OpenAI usa credencial (no key inline). Para cambiar de modelo/proveedor, editar ese nodo.

---

## 6. 🔐 Credenciales

> ⚠️ Los valores reales **NO** viven en este repo. Están en `backend/docs/SECRETS.local.md`
> (gitignored, solo local) y en las credenciales de n8n. **Pendiente rotarlas** (estuvieron en chat).

```
OPENAI_API_KEY=<ver SECRETS.local.md>   # cred n8n "OpenAi account" id fYGIdQL6Sv57GDaD
N8N_API_KEY=<ver SECRETS.local.md>      # API pública de n8n
NOCODB_TOKEN=<ver SECRETS.local.md>     # datos del CRM
XEN_KEY=<ver SECRETS.local.md>          # acceso server-to-server a los endpoints Xenilum

# Evolution API (WhatsApp, instancia "Emi") — en n8n cred "evolutionApi"
EVOLUTION_API_URL=https://prueba-bruno-evolution-api.urdzg3.easypanel.host
EVOLUTION_INSTANCE=Emi
EVOLUTION_API_KEY=<ver SECRETS.local.md si aplica>
```

---

## 7. IDs de referencia rápida
- Xenilum workflow: `U0UKaNX3htS05crU`
- Tools nuevas: cliente `FmoE7JQpgpLWXLw8` · tarea `c9eyg3uB94HhMaEY` · proyecto `4HSxI3bxP24IKK2E`
- Credencial OpenAI: `fYGIdQL6Sv57GDaD` · Credencial NocoDB: `F8VyQHFcRBaFK1kH`
- Tablas NocoDB: tareas `m04sve8bcl6exnm` · equipo `mdmarauw84b6p3l` · proyectos `m5qns05nh0vrrwa` · clientes `mqmf75uo7alxzyr` · pipeline `mydryaz4xwnjj7z`
