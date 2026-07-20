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
