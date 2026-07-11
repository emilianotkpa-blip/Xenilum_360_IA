# Xenilum Block Schema v1

**Qué es esto:** El contrato entre el frontend (xenilum-chat.jsx) y el agente Xenilum en n8n. Toda respuesta del agente DEBE ser un JSON válido con esta estructura. El frontend renderiza exactamente estos tipos. Cualquier bloque nuevo se agrega primero aquí, luego al frontend, luego al system prompt.

## Envelope (respuesta completa del agente)

```json
{
  "blocks": [ { "type": "...", ... }, ... ]
}
```

- `blocks` es un array ordenado; se renderiza de arriba a abajo.
- Respuesta mínima válida: `{ "blocks": [{ "type": "text", "content": "..." }] }`
- Si el agente falla en generar JSON válido, n8n degrada a bloque de texto con el output crudo.

## Bloques v1 (implementados en el frontend)

### 1. text
```json
{ "type": "text", "content": "Párrafo de texto plano. Sin markdown." }
```

### 2. kpis
```json
{
  "type": "kpis",
  "items": [
    { "label": "Ingresos del mes", "value": "$86,500", "trend": "+12%", "up": true }
  ]
}
```
- 2 a 4 items. `up: true` pinta verde con ▲, `false` pinta ámbar con ●.

### 3. chart
```json
{
  "type": "chart",
  "chartType": "bar",
  "title": "Ingresos por cliente · Junio 2026",
  "data": [ { "name": "Grupo ORVE", "value": 52000 } ]
}
```
- `chartType`: `"bar"` | `"line"` | `"pie"`. Máximo ~8 puntos para legibilidad.

### 4. table
```json
{
  "type": "table",
  "title": "Proyectos activos",
  "columns": ["Proyecto", "Cliente", "Estado"],
  "rows": [ ["Orvito Admin Center", "Grupo ORVE", "En curso"] ]
}
```
- Si la última columna es estado, valores reconocidos: "En curso" (verde), "Atención" (ámbar), "En pausa" (gris).

### 5. list
```json
{ "type": "list", "style": "bullet", "items": ["Primero", "Segundo"] }
```
- `style`: `"bullet"` | `"numbered"`. Numbered solo cuando el orden importa.

### 6. checklist (interactivo)
```json
{
  "type": "checklist",
  "title": "Pendientes de la semana",
  "items": [ { "id": "task_123", "label": "Revisar contratos", "done": false } ]
}
```
- `id` = id real del registro en NocoDB. Toggle en la app → PATCH `/xenilum/task-toggle` → actualiza NocoDB.

### 7. accordion (recursivo)
```json
{
  "type": "accordion",
  "sections": [
    { "title": "Capa de entrada", "blocks": [ { "type": "list", "style": "bullet", "items": ["..."] } ] }
  ]
}
```
- `blocks` acepta cualquier bloque de este schema (anidamiento completo).

### 8. progress
```json
{
  "type": "progress",
  "title": "Avance por proyecto",
  "items": [ { "label": "CRM Autónoma", "value": 68 } ]
}
```
- `value`: entero 0–100.

### 9. callout
```json
{ "type": "callout", "variant": "warning", "content": "Las facturas vencen el día 15." }
```
- `variant`: `"info"` (dorado) | `"warning"` (ámbar) | `"success"` (verde).

### 10. diagram
```json
{
  "type": "diagram",
  "title": "Arquitectura de Orvito IA",
  "nodes": [
    { "id": "wa", "label": "WhatsApp Cloud API", "kind": "start" },
    { "id": "dec", "label": "¿Usuario público?", "kind": "decision" }
  ],
  "edges": [ { "from": "wa", "to": "dec", "label": "Sí" } ]
}
```
- `kind`: `"start"` | `"process"` | `"decision"` | `"end"`. Labels de nodo ≤ 24 caracteres.
- Auto-layout por niveles: el frontend calcula posiciones; el agente solo declara nodos y flechas.
- Exportable a SVG/PNG desde la app.

### 11. svg (escape libre — usar solo como último recurso)
```json
{ "type": "svg", "title": "Visual custom", "code": "<svg viewBox=\"0 0 600 300\">...</svg>" }
```
- ⚠ El frontend debe sanitizar con DOMPurify en producción.

## Bloques Fase 2 (por implementar — no usar aún)

- `gauge`: `{ type, title, value, target, unit }` — métrica vs meta (tabla xen_config).
- `timeline`: `{ type, title, items: [{ date, label, status }] }` — entregas/hitos del CRM.
- `heatmap`: `{ type, title, xLabels, yLabels, values: [[...]] }` — actividad del equipo por día.
- `image`: `{ type, title, url, caption }` — assets de Supabase Storage.
- `code`: `{ type, language, code }` — snippets con highlight.

## Bloque Fase 3 (por implementar — no usar aún)

- `actions`: `{ type, items: [{ label, actionId, params, style: "primary"|"danger", confirm }] }`
- Regla dura: `actionId` solo puede ser uno del catálogo cerrado definido en el workflow "Xenilum Actions". El agente propone; el humano ejecuta con el botón. Nunca ejecución automática.

## Bloque Fase 5 (por implementar — no usar aún)

- `presentation`: `{ type, title, url, downloadUrl, slideCount }` — deck liquid glass generado.

## Reglas generales para el agente

1. JSON válido siempre — sin markdown, sin backticks, sin texto fuera del JSON.
2. Empezar casi siempre con un bloque `text` que resuma el hallazgo en 1–2 oraciones.
3. Un visual por concepto: no repetir la misma info en gráfica Y tabla salvo que se pida.
4. Gráficas para comparaciones/tendencias; tablas para detalle con múltiples atributos; KPIs para 2–4 números clave; progress para avances; diagram para flujos/arquitecturas.
5. Cerrar con `callout` cuando haya una recomendación o alerta accionable.
6. Máximo ~6 bloques por respuesta salvo reportes completos.
