# Xenilum App · Fase 5 — Generador de presentaciones liquid glass (handoff)

**Estado:** ✅ Funciona end-to-end. Arquitectura del roadmap: el agente arma el **contenido estructurado** (slides), n8n lo inyecta en la **plantilla base v2** → deck HTML compartible.

## Piezas
- Tabla NocoDB **`xen_decks`** `mj5sax51adlj5ih` (titulo, cliente, template, token, slide_count, slides_json, html).
- Workflow **Xenilum Decks** `5VOY6Mp5snPtKnYE` (activo):
  - `POST /webhook/api/xenilum/decks` `{ template, title, client, slides }` → renderiza (plantilla `Materiales/plantilla-presentacion-liquidglass-v2.html`) → guarda en xen_decks → devuelve `{ url, downloadUrl, slideCount, token }`.
  - `GET /webhook/api/xenilum/deck?t={token}` → sirve el HTML con **Content-Type text/html** (Supabase Storage forzaba text/plain, por eso se sirve desde n8n). Token no adivinable → URL compartible.
- Acción **`generar_presentacion`** en Xenilum Actions: llama al endpoint de decks y devuelve la URL. El frontend la pinta como bloque `presentation`.
- Frontend: bloque `presentation` (`PresentationBlock`) = tarjeta glass con miniatura, "Ver presentación ↗" (abre la URL) y "Descargar HTML".

## Layouts de slide
`portada` (title, subtitle, lead, tags[], date) · `kpis` (items[{label,value,note}]) · `bullets` (items[]) · `comparativa` (left/right {title,value,note}) · `timeline` (items[{date,label}]) · **`diagram`** (title, lead?, nodes[{id,label,kind:start|process|decision|end}], edges[{from,to,label?}] → diagrama de flujo SVG liquid-glass, mismo auto-layout que el bloque diagram del chat) · `cierre` (title, subtitle, contact). El agente arma 4-7 slides con datos reales del snapshot.

## Cómo se usa
En el chat: **"Genérame el deck de avance del mes para Grupo ORVE"** → el agente propone el botón `generar_presentacion` (con slides reales) → clic → se renderiza → aparece la tarjeta `presentation` con Ver/Descargar. El generador en JS puro está en `scratchpad/deckgen.js` (embebido en el nodo Render+Store).

## Nota de calidad (importante)
- El **render y el flujo son 100% confiables**. El **disparo por el agente** es variable con **gpt-4.1-mini**: dispara bien con petición clara ("genera el deck / archivo descargable"), pero la palabra suelta "presentación" a veces la interpreta como "muéstrame bloques".
- Recomendación (ya la mencionaste): para el paso de presentaciones conviene **Claude Sonnet 4.5** — sigue mejor la instrucción del disparador y escribe mejores slides. En n8n el modelo se cambia por nodo; se puede usar Sonnet solo aquí sin migrar toda la consola.

## Refinamiento
Cada generación crea un deck nuevo (con token). Para "cámbiale la slide 3", el agente re-propone `generar_presentacion` con todos los slides y el cambio aplicado.
