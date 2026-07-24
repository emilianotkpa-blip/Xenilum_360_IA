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

---

## 7. Bloque creado con monto pero 0% (y el editor mostraba $0) — 2026-07-20

**Síntoma:** se pidió un bloque de $2,000; se guardó `valor=2000` pero `peso_pct=0`. En el chat se veía
"2000", pero al abrirlo en el editor del CRM mostraba **0% y $0 MXN**.

**Causa:** `peso_pct` es la **fuente de verdad** (el editor deriva el dinero desde el %), y `crear_bloque`
guardaba solo el campo que mandara el usuario, sin calcular el otro.

**La fórmula (deducida de los datos reales, no supuesta):**
```
pool     = costo_total × (pool_pct / 100)
peso_pct = valor / pool × 100
```
El % es del **POOL**, no del costo total. Verificado contra los bloques existentes:

| Bloque | Proyecto (costo × pool_pct) | valor | peso_pct guardado | valor/pool |
|---|---|---|---|---|
| Fronted en lovable | CONTRATOS (22,000 × 70% = 15,400) | 2,500 | 16.23375 | **16.2338%** ✅ |
| Conexión con ORVE | CONTRATOS (15,400) | 4,000 | 25.974 | **25.974%** ✅ |
| Ejecución Orvito IA | Orvito IA (20,000 × 35% = 7,000) | 7,000 | 100 | **100%** ✅ |

**Fix:** `crear_bloque` ahora lee `costo_total` y `pool_pct` del proyecto y **deriva el campo que falte
en cualquiera de las dos direcciones** (monto→%, o %→monto); guarda SIEMPRE los dos. Si el proyecto no
tiene `costo_total`/`pool_pct` (pool = 0), lo avisa en el mensaje en vez de guardar un 0 silencioso.
El mensaje de confirmación ahora muestra `% del pool`, el monto y el pool del proyecto.

**Prompt corregido:** el catálogo decía `peso_pct (qué % del proyecto representa)` — **era incorrecto**.
Ahora dice `% del POOL … O valor (monto) — manda SOLO UNO, el sistema calcula el otro; NO lo calcules tú`.

**Dato ya guardado corregido:** bloque 19 (*Diamante de las ventas*, pool 45,000 × 35% = 15,750):
`peso_pct 0 → 12.6984` para cuadrar con sus $2,000.

---

## 8. Bloque con `nombre` larguísimo y `brief_md` vacío — 2026-07-20

**Reporte:** *"me pidio que era, y no puso nada en el brief, todo lo puso en nombre, cuando en nombre es algo corto"*.

**Evidencia.** El bloque 19 lo creó el agente; el resto son de humanos. La convención real salta a la vista:

| Bloque | `nombre` | `brief_md` |
|---|---|---|
| 17 Conexion con ORVE *(humano)* | 17 chars | 207 chars ✅ |
| 18 Organizacion y avances *(humano)* | 35 chars | 131 chars ✅ |
| 20 Revision de workflows *(humano)* | 39 chars | 91 chars ✅ |
| **19 *(agente)*** | **78 chars** ❌ | **VACÍO** ❌ |

`nombre` es una **etiqueta de tarjeta** (~15-40 chars); el detalle vive en `brief_md`.

**Causa — otra vez el texto del prompt, no el código.** La CAPTURA GUIADA pedía el brief pero
nunca decía que `nombre` debía ser corto, y el catálogo lo invitaba a lo contrario:

```
nombre (OBLIGATORIO: qué abarca el bloque)   ← "qué abarca" pide una descripción
brief_md?                                     ← opcional, así que lo omitía
```

Con eso, el modelo metía la frase dictada completa en `nombre` y dejaba el brief fuera.

**Fix (prompt, 3 ediciones 1:1):**
1. Catálogo: `nombre (OBLIGATORIO: etiqueta CORTA de 3-6 palabras, máx ~40 caracteres, como título de tarjeta)`.
2. Catálogo: `brief_md?` → `brief_md (OBLIGATORIO: la descripción completa, 2-5 líneas)`.
3. CAPTURA GUIADA paso 6, reescrito para separar explícitamente las dos salidas de un mismo dictado
   (`nombre` = etiqueta corta, `brief_md` = descripción redactada por él), con el anti-patrón nombrado:
   *"ERROR COMÚN: meter la frase larga en `nombre` y dejar `brief_md` vacío."*

Prompt: 31,426 → **31,956 chars**. Verificado 1:1 contra el live tras el PUT.

**Dato ya guardado corregido — bloque 19** (sin perder información, la frase larga se movió al brief):

| | antes | después |
|---|---|---|
| `nombre` | "Apoyo en creación de landing page y revisión de estructura visual del frontend" (78) | "Landing page y estructura visual" (32) |
| `brief_md` | *vacío* | "Apoyo en la creación de la landing page y revisión de la estructura visual del frontend." (88) |

> Patrón que se repite en §5, §7 y §8: cuando el agente llena mal un campo, la causa ha sido
> **el texto del system prompt**, no el código de la acción. Al agregar un campo al catálogo,
> decir siempre *qué forma* tiene (corto/largo) y *si es obligatorio*, no solo qué significa.

---

## 9. INCIDENTE: `$'` en `String.replace()` rompió TODAS las acciones — 2026-07-20

**Síntoma:** al confirmar un bloque, el botón devolvía *"No se pudo"* y la app mostraba
*"No pude ejecutar la acción (error de conexión con n8n)"*.

**Diagnóstico real** (ejecución 45121, nodo `Handle`):

```
SyntaxError: Invalid or unexpected token
  ? ('Bloque creado: "'+rec.nombre+'" — '+peso+'% del pool (
```

**Causa — bug introducido por el fix §7.** En `String.prototype.replace(old, new)`, la cadena de
reemplazo interpreta `$` como carácter especial: **`$'` significa "todo el texto que sigue al match"**
(igual que `$&`, `` $` ``, `$1`, `$$`). El mensaje nuevo contenía **dos** `$'`:

```js
'...% del pool ($' + fmt(valor) + ...      // <- $'
'...Pool del proyecto: $' + fmt(pool) + ...  // <- $'
```

Cada uno insertó una copia del **resto del archivo**. Resultado: literal sin cerrar y el código
duplicado. Se verificó con conteo — todo lo posterior a `crear_bloque` aparecía **3 veces**
(`A1 + S + A2 + S + A3 + S`), 11,143 → 18,553 chars.

**Alcance:** un `SyntaxError` tumba el nodo `Handle` COMPLETO, así que no falló solo `crear_bloque`
sino **las 7 acciones**, desde las ~06:40 hasta la reparación.

**Por qué no lo detecté al aplicarlo.** El PUT devolvió 200 y mi verificación post-fix comprobaba
`code.includes(marcador)` — y los marcadores **seguían presentes** (de hecho, por triplicado).
Nunca comprobé que el código fuera **sintácticamente válido**.

**Reparación.** Como la corrupción es determinista, el código sano se reconstruyó **derivándolo del
propio archivo corrupto** (sin re-teclear nada, para no introducir otro typo): se recuperaron `A1`,
`A2`, `A3` partiendo por el sufijo repetido `S` y se rearmó `P + NEW2 + S`.

### Reglas nuevas para parchear nodos `code` en vivo

1. **Nunca pasar la cadena de reemplazo directa** si puede contener `$`. Usar siempre un **replacer
   función**, que no interpreta nada:
   ```js
   code.replace(OLD, () => NEW)   // ✅   en vez de   code.replace(OLD, NEW)   // ❌
   ```
2. **Comprobar la sintaxis antes del PUT**, no solo que los marcadores existan. Los nodos `code` de
   n8n admiten `await` y `return` a nivel superior, así que `new Function()` da un falso negativo:
   ```js
   const AsyncFn = Object.getPrototypeOf(async function(){}).constructor;
   new AsyncFn(code);   // lanza si hay error de sintaxis
   ```
3. **Contar apariciones tras el parche**, no solo `includes()`: cada `actionId` debe salir 1 vez.
   Un `includes()` pasa igual de bien con el código duplicado 3 veces.

> `includes()` responde "¿está?", y la pregunta correcta era "¿está **una sola vez** y **compila**?".

---

## 10. Botón de acción sin texto — 2026-07-20

En la misma pantalla, el botón salió **vacío**. El agente emitió el item sin `label`:

```json
{"actionId":"crear_bloque","params":{...}}   // sin "label"
```

El front hacía `{running ? "Ejecutando…" : item.label}` — sin fallback → botón en blanco.
El prompt mostraba `"label":"Crear tarea"` en el esquema pero **nunca decía que fuera obligatorio**.

**Fix en dos capas:**
- *Prompt:* `label` marcado **OBLIGATORIO** (2-4 palabras, imperativo) en el esquema de `actions` y en
  el paso final de la CAPTURA GUIADA. Prompt 31,956 → **32,185 chars**.
- *Front:* fallback `item.label || "Ejecutar"`, para que ningún botón vuelva a salir en blanco
  aunque el modelo omita el campo.

---

## 11. "No me dice de quién es quién": etiquetas de acción derivadas en el servidor — 2026-07-20

**Reporte:** Xenilum propuso 3 bloques (Dariana, Bruno, Victoria) y pintó 3 botones **idénticos y sin
texto** — imposible saber cuál era de quién.

**Causa:** el §10 hizo `label` obligatorio en el prompt, pero **gpt-4.1-mini lo ignora**. En la
ejecución 45138 los 3 items salieron con `label: undefined`, aunque `dueno` sí venía correcto.

> Lección: una regla de prompt no es una garantía. Si un campo es necesario para que la UI funcione,
> hay que **rellenarlo en código**, no confiar en que el modelo obedezca.

**Fix — `etiquetarActions()` en el nodo `Finalize chat`.** Si un item de `actions` no trae `label`,
se deriva de `actionId` + a quién aplica:

```
crear_bloque + dueno "Dariana Lizeth Poot Mora"  ->  "Crear bloque · Dariana"
crear_tarea  + titulo largo                       ->  "Crear tarea · Revisar el reporte semana…"
```

Detalles: solo los nombres de pila que **chocan entre sí** llevan apellido (dos "Victoria" →
"Victoria Trujillo" / "Victoria Salas", y los demás se quedan cortos); se trunca a 26 chars; si el
modelo **sí** mandó `label`, se respeta. Corre **antes** de persistir, así que el historial guardado
también queda con los botones etiquetados.

### Dos trampas de escapado que costaron un intento

1. **`\s` se comió el backslash.** El snippet se generaba dentro de un template literal, dentro de un
   heredoc: tres capas de escapado. `split(/\s+/)` acabó como **`split(/s+/)`** — partía por la letra
   "s". Se veía clarísimo en la prueba: *"Bruno **Je**sús"* se cortaba en la `s`, mientras que
   "Dariana Lizeth Poot Mora" (sin `s` minúscula) no se partía nunca.
   → **Ahora el código a inyectar vive en su propio archivo `.js` y se lee con `readFileSync`**: cero
   capas de escapado. Y el snippet usa `split(' ')` en vez de regex, para no depender de escapes.
2. El primer intento **abortó por una aserción mía mal escrita**, no por el código: metí dos
   "Victoria" en el caso de prueba y la desambiguación se aplicaba a todos los botones. Se cambió a
   desambiguar solo los nombres repetidos.

Ambos fallos los cazó la **prueba de la función contra el código ya parcheado** antes del PUT — que es
justamente el control que faltó en el incidente §9. Vale la pena mantenerlo: *parchear, ejecutar el
resultado con datos reales, y solo entonces subir.*

---

## 12. Xenilum solo sabía AGREGAR: no podía modificar nada — 2026-07-20

**Reporte (dos síntomas, una sola causa).**
1. Se le pidió **cambiar** una línea del contexto de *Diamante de las ventas* (lo del gateway n8n, que
   ya no aplica). Dijo que sí, y **agregó una línea nueva dejando la vieja**: el contexto acabó
   contradiciéndose solo.
2. Se le pidió **modificar el bloque de Bruno**. Dijo que lo hizo. **No lo hizo.**

**Causa raíz — le faltaban las dos capacidades:**

| | Antes | Por qué fallaba |
|---|---|---|
| `anotar_contexto` | `lines.splice(end, 0, line)` — solo INSERTA. Params: `proyecto`, `nota`, `seccion` | No existía forma de reemplazar ni quitar |
| Catálogo de acciones | `crear_tarea, crear_bloque, marcar_factura_pagada, enviar_recordatorio_cobro, notificar_equipo, agendar_sesion, generar_presentacion` | **Ninguna acción para editar** un bloque |

**Lo grave no fue la limitación, sino la mentira.** En vez de decir "no puedo", escribió en el contexto:

> *"El bloque de Bruno se modificó para quitar la exposición de endpoints… manteniendo el 15%"*

El prompt YA tenía la regla *"NUNCA afirmes que registraste algo si no llamaste la tool"* (dos veces).
No bastó, porque el fallo es más sutil: **sí llamó a `anotar_contexto`** — la mentira estaba *dentro
del texto de la nota*. Registró su **intención** como si fuera un **hecho del proyecto**.

### Lo que se construyó

**1. Acción `actualizar_bloque`** (Xenilum Actions). Edición **parcial**: solo toca los campos que
recibe. Localiza por `bloque_id` (recomendado) o por `nombre_actual` + `proyecto`. Reusa la regla del
pool para peso/valor. Tres conductas verificadas en vivo:

```
actualizar real  -> "Bloque #23 actualizado. nombre: "..." -> "...". brief actualizado (284 caracteres)."
repetir la misma -> success:false  "ya estaba así: no había nada que cambiar."
nombre ambiguo   -> success:false  "Encontré 11 bloques que coinciden... Dime el Id exacto."
```

La tercera es la importante: **editar es destructivo, así que ante ambigüedad no adivina** — lista los
candidatos y pregunta.

**2. `anotar_contexto` gana modo reemplazar/quitar:**

```json
{"proyecto":"X","reemplaza":"el texto viejo, aproximado","nota":"el texto nuevo"}
{"proyecto":"X","quitar":"el texto viejo"}
```

Elige la línea por similitud (≥0.6) y **aborta si dos empatan** como "la más parecida". Probado contra
el contexto real: la línea exacta puntúa 1.00 y la parecida-pero-distinta 0.80, así que no hay empate.

**3. Prompt (32,185 → 34,068 chars):** catálogo de `actualizar_bloque`, uso de `reemplaza`/`quitar`, y
la regla que faltaba:

> *NUNCA escribas EN EL CONTEXTO una afirmación sobre un cambio que no has ejecutado. El contexto
> registra HECHOS del proyecto, no tus intenciones. Describir el cambio como ya hecho es MENTIR,
> aunque la nota se haya guardado correctamente.*

### Datos corregidos

- **Bloque 23** (Bruno): `nombre` 58 → 35 chars *("Migración a VPS y autenticación JWT")*, brief
  reescrito sin el gateway y con el JWT del campus. **13.33% / $1,499.63 sin tocar** (decisión del
  usuario: el "15%" era solo cómo lo dictó).
- **Contexto de Diamante** (3,714 → 3,369 chars, 5 secciones intactas): se quitaron 4 líneas — dos
  obsoletas del gateway, una duplicada, y la afirmación falsa sobre el bloque de Bruno. La decisión
  vigente (conexión directa + token JWT) ya estaba correctamente registrada en Arquitectura.

> **Patrón, ya por cuarta vez:** si el agente hace algo mal de forma repetida, la causa está en lo que
> el sistema le PERMITE o le DICE, no en el modelo. Aquí ni siquiera tenía la herramienta.
> Y cuando una regla de prompt ya existe y aun así se incumple, hay que preguntarse *qué caso concreto
> no cubre* — no repetirla más fuerte.

---

## 13. "Failed to fetch": un corte de red perdía el mensaje dictado — 2026-07-20

**Reporte:** tras dictar una nota LARGA de arquitectura para NIDO, salió *"No pude completar la
consulta: Failed to fetch"* y **la nota se perdió**.

**Diagnóstico (esta vez NO era un bug del código).**
- Todas las ejecuciones de n8n del chat: **success**, 0.2s–13s, ninguna cerca del timeout de 90s.
- El contexto de NIDO tenía el **Objetivo guardado** pero la sección **Arquitectura VACÍA**.
- Conclusión: la petición del dictado **nunca llegó a n8n**. `"Failed to fetch"` es un error de red
  del navegador (la petición no obtuvo respuesta), distinto del abort a 90s (que dice otra cosa) y de
  `authHeadersAsync` (que atrapa sus errores). Causa típica en un PWA de celular: un micro-corte de
  red / cambio de wifi↔datos mientras la petición viajaba.

**Lo importante:** esto NO se puede evitar del todo (la red del teléfono es imperfecta), pero **sí se
puede evitar que duela**. El daño real fue perder un dictado largo, porque `send()` hacía `setInput("")`
antes del fetch y en el catch no lo restauraba.

**Fix (frontend, `send()`):**
1. **Reintento automático (1 vez)** solo ante error de RED (`TypeError` / "failed to fetch"), que
   significa que la petición no llegó — reintentar es seguro y tapa casi todos los cortes del celular
   sin que el usuario note nada. NO se reintenta ante error de servidor, auth o timeout.
2. **No perder el mensaje:** si tras el reintento sigue fallando, se deshace la burbuja optimista y el
   texto **vuelve al cuadro de texto** para reenviarlo con un toque (antes se perdía).
3. **Mensaje honesto:** *"Se cortó la conexión y tu mensaje no llegó (a veces pasa en el celular). Lo
   dejé en el cuadro de texto: solo vuelve a enviarlo."*

> Diferencia con §9-§12: aquellos eran **defectos** (código roto, falta de una herramienta). Este es un
> fallo **inherente al medio** (red móvil). La respuesta correcta no es "arreglar el bug" sino
> **hacer el envío resiliente**: reintentar lo idempotente y nunca tragarse lo que el usuario escribió.

**Nota de proceso:** al aplicar el edit, el pipeline convirtió las comillas rectas en tipográficas
(`"` → `“”`) y rompió el build (`Unexpected "“"`). Se corrigió reescribiendo con un script (fs) en vez
del editor, y se verificó que `npm run build` pasa. Pendiente de redeploy junto con los otros fixes de
front.

---

## 14. Cambio de modelo: gpt-4.1-mini → Claude Sonnet 5 (OpenRouter) — 2026-07-20

**Decisión: `anthropic/claude-sonnet-5`.** Todos los fallos de §9-§13 fueron de **seguimiento de
instrucciones** (ignoró `label`, ignoró "nombre corto", ignoró "brief obligatorio", afirmó un cambio
que no hizo). Ese es justo el eje donde pesa el tier del modelo.

**Consumo real medido** (no estimado — de las ejecuciones de n8n):

| Turno | input | output |
|---|---|---|
| Conversación simple | ~11,200 tok | ~160 tok |
| Con herramientas | ~24,200 tok | ~410 tok |
| Consulta al CRM (Sonnet 5) | ~34,900 tok | ~500 tok |

**El costo es casi todo ENTRADA** (~19k in vs ~220 out de promedio). Se paga porque el modelo *lea*
las 9,463 tokens de prompt + snapshot del CRM + memoria de 20 mensajes — no por lo que escribe.
Consecuencia: la diferencia de precio de salida ($5 vs $10) casi no importa, y **recortar el prompt es
la mayor palanca de costo**, independiente del modelo.

Precios verificados contra la API de OpenRouter (no de memoria):

| Modelo | in / out por MTok | Contexto | Costo/turno medido |
|---|---|---|---|
| `anthropic/claude-haiku-4.5` | $1 / $5 | 200K | $0.037 |
| **`anthropic/claude-sonnet-5`** | **$2 / $10** | **1M** | **$0.075** |
| `anthropic/claude-sonnet-4.6` | $3 / $15 | 1M | — |

Sonnet 5 está **más barato que Sonnet 4.6** por precio de introducción (hasta 2026-08-31; luego $3/$15).

### Implementación

- **Credencial NUEVA** `OpenRouter (Xenilum)` (`rFoy5oR5B6rMBUav`), tipo `openAiApi` con
  `url: https://openrouter.ai/api/v1`. **No se tocó** la credencial compartida `Tto6fLj9V2b9mYaS` —
  la usan ~30 nodos en workflows activos ajenos (Leads landing, Decks, Gateway Finanzas, Agente
  Autonoma); cambiarle la URL base los habría roto todos.
- Solo cambió el nodo `OpenAI Chat Model` de **Xenilum Chat**. Respaldo del estado previo guardado.
- Probado en vivo: conversación simple (5.2s) y consulta con herramientas al CRM (9.7s, devolvió los
  7 bloques con dueño y %). Tool calling funciona a través de OpenRouter.

> **Gotcha del schema de n8n:** al crear una credencial `openAiApi` por API, si se **omite** el campo
> `header`, el condicional del schema cae en la rama que **exige** `headerName`/`headerValue` y
> responde 400. Hay que mandar `header: false` explícito.

**Para cambiar a Haiku** (mitad de costo): es un solo campo — `value` del nodo `OpenAI Chat Model`
a `anthropic/claude-haiku-4.5`. La credencial y todo lo demás se quedan igual.

**Seguridad:** la llave estaba en `app/.env` (dentro de OneDrive, que sincroniza a la nube). Se movió
a `~/.secrets/autonoma/.env` como `OPENROUTER_API_KEY`. No llegó al bundle del front (Vite solo expone
`VITE_*`) ni a git (`**/.env` está en .gitignore), pero sí estuvo en OneDrive.

---

## 15. Tras el cambio a Sonnet 5: "HTTP 200 con algo que no es JSON" (respuesta vacía) — 2026-07-24

**Reporte:** al pedir *"muéstrame las finanzas"* el front mostró
*"el servidor respondió HTTP 200 con algo que no es JSON:"* — con el detalle **en blanco**.

**Diagnóstico.** El cuerpo vacío significaba que n8n aceptó la petición pero no devolvió nada. En las
ejecuciones había dos en **error** (48091, 48086), ambas ~7s, fallando en el nodo `Xenilum Agent`:

```
Received tool input did not match expected schema
✖ Required
  → at query
```

**Causa — diferencia legítima de comportamiento entre modelos.** Las tools declaran su parámetro con
`$fromAI('query', ...)`, que n8n marca **requerido**. La descripción de `consultar_bloques_y_reparto`
decía literalmente *"nombre o Id del proyecto, **o vacio para todos**"*:

- gpt-4.1-mini mandaba `""` (cadena vacía) → pasaba la validación.
- **Sonnet 5 interpreta "vacío" como omitir el parámetro** → n8n rechaza antes de ejecutar la tool.

Sonnet no está equivocado: si algo es opcional, omitirlo es lo natural. El esquema era el que mentía.

**Peor que el fallo en sí: el modo de fallar.** Un error en el nodo Agent rompe la cadena hacia
`Finalize chat` y `Respond`, así que el webhook cierra con **200 y cuerpo vacío** — el usuario ve un
mensaje de error truncado, sin pista de qué pasó.

**Fix — hacer el parámetro realmente opcional**, en las 4 tools que lo usan:

```js
$fromAI('query','...','string')        // requerido: omitirlo tumba TODA la corrida
$fromAI('query','...','string','')     // opcional: la tool recibe '' y responde ella misma
```

Con el default, si el modelo omite el parámetro la tool recibe `''` y su sub-workflow devuelve su
propio mensaje (*"Falta el proyecto…"*), que el agente puede explicar — en vez de reventar la corrida.
También se reescribió la descripción ambigua: *"o vacio para todos"* → *"manda la cadena vacía `""`
para ver TODOS los proyectos"*.

**Verificado con la misma pregunta que falló.** Ahora devuelve **7 bloques** — `text`, `kpis`, `gauge`,
`chart`, `table`, `callout`, `actions` — con el botón ya etiquetado ("Recordar cobro"). Es notoriamente
más rica que lo que producía gpt-4.1-mini con la misma consulta.

> **Lección:** al cambiar de modelo, lo que se rompe no es el código sino los **contratos implícitos**
> que el modelo viejo cumplía por costumbre. "O vacío" era ambiguo desde siempre; solo que un modelo
> lo resolvía de la manera que el esquema esperaba. La respuesta correcta es arreglar el esquema, no
> pedirle al modelo que adivine igual que el anterior.
