# Xenilum · Fase 7 — Contexto por secciones, bloques y robustez de salida

**Fecha:** 2026-07-20. Todo aplicado EN VIVO por la API de n8n (con backup previo en `backend/workflows/`).

> ⚠️ Las llaves NO viven en este repo. Están solo en `~/.secrets/autonoma/.env` (fuera de OneDrive).

---

## 1. Contexto vivo por secciones (antes: todo caía en "Arquitectura")

**Síntoma:** al dictar contexto, la sección **Objetivo** quedaba vacía y todo se apilaba en
*Arquitectura y decisiones*, además con párrafos casi duplicados.

**Causa (confirmada en código):** el sub-workflow `Xenilum Tool - Anotar Contexto`
(`8XF27Lu4Xi0uSFww`) tenía la sección **hardcodeada**:
```js
const DEC='## Arquitectura y decisiones';
if(md.indexOf(DEC)>=0){ md=md.replace(DEC, DEC+'\n'+line); }
```
y la tool ni siquiera recibía un parámetro de sección.

**Fix:**
- La tool ahora acepta `{"proyecto","nota","seccion"}` con `objetivo | arquitectura | estado | pendientes | historial`
  (sinónimos tolerados: *meta, decisiones, actual, avance, falta, próximos…*). Sin `seccion` → `arquitectura`.
- Inserta al **final** de la sección (orden cronológico) y **crea la sección** si falta.
- **Deduplica**: si la nota ya existe (normalizada, sin acentos ni signos) no la vuelve a escribir y responde `duplicado:true`.
- `description` de la tool y `$fromAI` actualizados para que el modelo mande `seccion`.
- Prompt: el agente debe **partir un dictado largo en VARIAS llamadas**, una por sección.

## 2. Crear bloques (antes: imposible)

**Síntoma:** "créame un bloque con el % que consideres" → solo pintaba un `progress` visual.

**Causa:** `consultar_bloques_y_reparto` es **solo lectura**; no existía ninguna herramienta ni acción
que escribiera en la tabla `bloques` (`mlmcvj5ol0vsmh0`).

**Fix (opción B1 — con confirmación):** nueva acción **`crear_bloque`** en `Xenilum Actions` (`M1VAqNVrSKgF3M3v`).
- Params: `{ proyecto | proyecto_id, nombre (obligatorio), peso_pct (0-100), dueno | dueno_id, brief_md?, fecha_entrega?, valor?, estado? }`.
- Resuelve **proyecto y dueño por nombre** (fuzzy) si no llegan los Ids.
- Suma los `peso_pct` existentes del proyecto e informa el **total**; avisa si supera el 100%.
- **El agente NO crea bloques**: propone el botón y el humano confirma (mismo criterio que las acciones que tocan dinero,
  porque `peso_pct` afecta el reparto).

## 3. Respuestas que se cortaban y salían como JSON crudo

**Síntoma:** al pedir una presentación, el chat mostró el `{"blocks":[...]}` completo como texto.

**Causa:** `Finalize chat` hacía `JSON.parse`, luego un intento con regex `{...}`, y si ambos fallaban
**volcaba el texto crudo**. La respuesta del agente venía **truncada** (JSON inválido) porque era enorme:
duplicaba el contenido del deck en bloques de preview *y* en los params del botón.

**Fix:**
- `repairBlocks()` en `Finalize chat`: recorre el array `blocks` respetando strings/escapes y **rescata todos los
  bloques COMPLETOS** de un JSON truncado. Si aun así no se puede, muestra un aviso claro — **nunca más JSON crudo**.
- Prompt: **esquema obligatorio** de `generar_presentacion` (`{template,title,client?,slides:[...]}` con los `layout`
  documentados). El agente estaba inventando `tema/puntos/datos/publico/objetivo`, que el generador ignora → deck vacío.
- Prompt: al proponer un deck, **máx 1-2 bloques de preview**; el detalle va en los slides del botón.

## 4. Conversar como persona (aplicado antes, en la misma sesión)
Sección **0) CÓMO CONVERSAS** al inicio del prompt: clasifica (A) conversación vs (B) datos.
En (A) no llama herramientas y responde con **un solo bloque text** corto.

---

## Estado y verificación
| Workflow | ID | Cambio | Verificado |
|---|---|---|---|
| Xenilum Chat | `4GNzaXgXjK3qRvkL` | prompt 20,107 → **24,584** chars + `repairBlocks` | ✅ activo |
| Xenilum Tool - Anotar Contexto | `8XF27Lu4Xi0uSFww` | secciones + dedupe (3,146 → 4,717 chars) | ✅ activo |
| Xenilum Actions | `M1VAqNVrSKgF3M3v` | acción `crear_bloque` | ✅ activo |

Todos los parches se aplicaron con verificación 1:1 de los textos a reemplazar y **abortaban** si se perdía
alguna sección/herramienta previa. `backend/docs/system-prompt-xenilum-chat.md` es **espejo exacto** del nodo en vivo.

## Pendientes conocidos
- **Modelo**: sigue en `gpt-4.1-mini` (sin `maxTokens` configurado). Para calidad conversacional y disciplina de
  JSON/tools conviene **Claude Sonnet 4.5** (ya existe la credencial `anthropicApi`). Alternativa evaluada:
  OpenRouter + GLM (más barato, más riesgo en JSON estricto + tool calling).
- La sección **3) TU HERRAMIENTA (la única que tienes hoy)** del prompt quedó desactualizada: hoy hay 5 tools
  y su nota dice que las acciones "llegarán en una fase futura". Conviene reescribirla.
- Falta probar en vivo: dictar contexto largo (¿se reparte en secciones?), pedir un bloque (¿sale el botón?),
  pedir una presentación (¿ya no vuelca JSON?).

---

## 5. Captura guiada (entrevista) al crear cosas — 2026-07-20

**Petición:** que no adivine. Si le pides "créame un bloque", debe **preguntar** para quién, estado,
% o dinero, fecha y brief — con **botones de selección única** — y cerrar con el botón de confirmación.
Igual para tareas (hoy las creaba **sin descripción**) y para llenar el contexto.

**Cómo quedó** (sección `## CAPTURA GUIADA` en el prompt, apoyada en el bloque `buttons` ya existente):
- Regla general: preguntar **una cosa a la vez**, nunca repetir un dato ya dado, máx ~4 preguntas,
  y **siempre** cerrar con el bloque `actions` con todos los params llenos.
- **"Tú elige"** -> el agente escoge un valor sensato, lo dice en una línea y sigue; el humano confirma al final.
- **Bloque**: proyecto → dueño (botones del equipo + "Sin asignar") → `% del proyecto` / `monto en $` / "Tú decide"
  (si es %, consulta antes cuánto queda libre) → estado (botones con los valores REALES) → fecha (opcional)
  → brief (el usuario lo cuenta a grandes rasgos y **el agente lo redacta mejor**).
- **Tarea**: título accionable → responsable (botones) → prioridad (botones) → proyecto → fecha límite
  → **`descripcion` SIEMPRE**, redactada por el agente si el usuario no la dicta (prohibido crear sin ella).
- **Contexto**: modo entrevista sección por sección (objetivo → arquitectura → estado → pendientes),
  anotando cada respuesta en su sección y confirmando antes de seguir.

**Bug encontrado y corregido de paso:** `crear_bloque` guardaba `estado:'Pendiente'` (capitalizado), pero los
bloques reales usan `pendiente | en_curso | entregado | pagado` (minúscula). Se corrigió **solo** en la rama de
bloques: la verificación 1:1 detectó que el mismo texto existía también en `crear_tarea`, donde `'Pendiente'`
**sí** es correcto (enum de tareas: `Pendiente|En Progreso|Bloqueada|Completada`). Se dejó intacta.

Prompt: 26,691 -> **30,111** chars. Ambos workflows verificados activos.

---

## 6. Contexto duplicado: la causa era el consolidador nocturno — 2026-07-20

**Síntoma:** en `contexto_md` aparecían dos párrafos casi idénticos (parafraseados) diciendo lo mismo.

**Causa (la clave):** NO lo hacía el chat. Existe el workflow **`Xenilum - Consolidacion Contexto Vivo`**
(`vCo0gP1khkMVbwII`), con **cron diario 8 AM**, que manda `contexto_md` + los avances nuevos a
**gpt-4.1-mini** para que devuelva el contexto actualizado, y lo reescribe entero.
Su system prompt decía *"integra los avances"* y *"sé conciso"* — pero **nunca pedía fusionar ni
deduplicar**. Un modelo chico, ante "integra esto en ese texto", hace lo más seguro: **añade una
línea nueva que repite lo ya escrito** en vez de reescribir la existente.

**Fix 1 — consolidador (raíz):** nuevas reglas en su system prompt:
- **FUSIONA, no acumules**: si un avance repite/amplía/corrige algo ya presente, se REESCRIBE esa línea
  en su lugar. Prohibido agregar otra que diga lo mismo con otras palabras.
- Cada sección (salvo *Historial reciente*) es un **documento vigente reescrito**, no un log acumulado.
- Una idea por línea; si una línea mezcla objetivo/arquitectura/estado/pendientes, se parte por sección.
- **Auto-revisión final**: releer la salida y colapsar duplicados en una sola línea, la más completa.

**Fix 2 — `anotar_contexto` (defensa en profundidad):** el dedupe pasó de exacto/substring a
**similitud por solapamiento de palabras** (umbral 0.8), que sí atrapa parafraseos.

**Verificación medida (no estimada):**
| Caso | Similitud | Detectado |
|---|---|---|
| Los 2 párrafos de Contratos reportados | **0.95** | ✅ |
| Nota que engloba a otra + info extra | 0.56 | ❌ (por diseño) |
| Notas legítimamente distintas | 0.00–0.40 | ✅ no marcadas |

**Límite conocido y deliberado:** el umbral se dejó en 0.8. Bajarlo para atrapar el caso de 0.56
empezaría a descartar notas buenas (las distintas ya llegan a 0.40). El solapamiento **parcial** es
juicio semántico → le toca al consolidador, no a la heurística.

**Pendiente:** los duplicados **ya escritos** no se limpian solos. El consolidador solo procesa
proyectos con avances sin consolidar (`consolidado!=true`), así que un contexto viejo y sucio se queda
igual hasta que haya un avance nuevo. Falta decidir si se corre una pasada de limpieza puntual.

### Limpieza de los duplicados ya escritos (ejecutada 2026-07-20)

Los contextos sucios NO se limpiaban solos, así que se corrió una pasada puntual.
**Deliberadamente determinística, no con LLM**: un reescritor con modelo podía perder información
en silencio, que era justo lo que había que evitar.

**Regla aplicada:** se elimina una línea SOLO si otra línea que se conserva es **igual o más larga**
y **cubre ≥90%** de sus palabras significativas. Siempre se conserva la versión más completa
(si la nueva cubre a una previa más corta, sustituye a la previa). Nunca se reescribe texto.

**Salvaguardas (abortaban la operación):** que el resultado quedara vacío, que cambiara el número de
secciones `##`, o que el recorte superara el 60%.

**Backup previo:** `backend/workflows/backups/contexto_md.BACKUP.json` (gitignored — es dato, no código).

**Resultado — 3 líneas fusionadas en 2 proyectos:**
| Proyecto | Antes → Después | Palabras perdidas |
|---|---|---|
| CONTRATOS | 1,863 → 1,312 chars | `identificación, corrección` (la conservada dice "identificar fallas y afinar") |
| CONTRATOS | — | ninguna (cobertura 1.0) |
| Sitios Web - invitaciones | 2,426 → 2,186 chars | `sirve` (la conservada dice "servirá" e incluye MÁS detalle) |

`Panel Dashboard - Reclutamiento` y `Diamante de las ventas` quedaron **intactos** (no tenían duplicados).
Verificado releyendo de NocoDB: los 4 proyectos conservan sus 5 secciones y ninguno quedó vacío.
