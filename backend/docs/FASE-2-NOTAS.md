# Xenilum App · Fase 2 — Bloques nuevos (notas)

**Estado:** ✅ gauge, timeline, heatmap, code — funcionando end-to-end con datos reales. `image` renderiza pero falta endpoint de assets.

## Frontend (app Vite ejecutable)
- Nuevo proyecto en `app/` (React 18 + Vite 5 + Recharts). `npm run dev` → **http://localhost:5175** (5173/5174 estaban ocupados).
- `src/XenilumChat.jsx` = prototipo migrado + 5 componentes nuevos: `GaugeBlock`, `TimelineBlock`, `HeatmapBlock`, `ImageBlock`, `CodeBlock` (16 tipos en total).
- Cableado al webhook real (`.env`: `VITE_API_BASE`, `VITE_XEN_KEY` para dev local). El checklist hace `PATCH /xenilum/task-toggle`. Chip "Bloques nuevos (demo)" para ver Fase 2 sin backend.
- CORS del webhook ampliado a `localhost:5175/5176`.

## Backend
- Tabla **`xen_config`** `ma9syag3lipisvu` (clave/valor/descripcion). Sembrada: `ingreso_mensual_objetivo=120000`, `tareas_semanales_objetivo=40` — **⚠ placeholders, ajustar a los objetivos reales**.
- Snapshot (`consultar_crm`) ampliado con:
  - `config` → alimenta **gauge** (value=finanzas.ingresos_total, target=config.ingreso_mensual_objetivo).
  - `actividad_semana {xLabels,yLabels,values}` → **heatmap** (tareas cerradas por persona por día, últimos 7 días).
  - `hitos [{date,label,status}]` → **timeline** (entregas/inicios de proyectos; status done|pending|late).
- System prompt actualizado con las formas exactas y cuándo usar cada bloque nuevo.

Las formas de bloque implementadas coinciden exactamente con el contrato `xenilum-block-schema-v1.md` (sección Fase 2).

## Pendiente de Fase 2
- **Endpoint de assets (Supabase Storage)** para el bloque `image` (subir/servir creativos). El componente ya renderiza cualquier `url`; falta la fuente de assets. El agente tiene instrucción de NO inventar URLs.
- Ajustar las metas reales en `xen_config`.
