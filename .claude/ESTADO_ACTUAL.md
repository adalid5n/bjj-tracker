# Estado actual del proyecto

**Última actualización:** 2026-06-25 (sesión 49 — auditoría de cambios IA/schema + selector de disciplina en Sumisión/Técnica + fixes menores IA)
**Fase activa:** Pausa entre iteraciones (post-it.6). Cambios entregados como pulido continuo; sin tag de iteración.
**Próxima iteración:** Candidatos vivos: **F3 de visualización de contras** (sub-grafo filtrado, contras como aristas, rojo apagado — ramas F1+F2 parqueadas en remoto como spikes); reducir copy en pantallas; sugerencia automática de compañero; "Forzar actualización" en `/ajustes`; Node 24 en workflow.

---

## Sesión 49 (2026-06-25) — Auditoría de cambios sesiones 46-48 + selector disciplina + fixes IA

Sesión de revisión: las sesiones 46-48 se implementaron con otra herramienta (Claude Sonnet 4.6). Se auditaron contra las reglas duras del proyecto.

**Auditoría — resultado:**
- ✅ Migraciones V7/V8/V9 inmutables y bien añadidas al final del array (no se tocó V1-V6).
- ✅ Capa de datos: SQL crudo parametrizado, sin ORM, transacciones nativas.
- ✅ Runas: `settings.svelte.ts` con patrón canónico (sin `$state` a nivel de módulo).
- ⚠️ **API key de Groq pública en el bundle de cliente** (`VITE_GROQ_KEY` se inlinea). Decisión del owner: aceptable para el POC (key gratuita de Groq, uso acotado a usuarios del POC). Pendiente reevaluar antes de abrir más (proxy serverless o restricción por dominio). La key nunca se commiteó (`.env.local` gitignoreado).

**Cambios entregados (todos en `main`):**
- **Selector de disciplina en `SumisionWizard` y `TecnicaWizard`** (igualados a `PosicionWizard`): `Chips` con BJJ/Grappling/Ambos, en vista por pasos y en formulario de edición. Colgado de un paso existente (Nombre en Sumisión, Tipo en Técnica) — sin renumerar pasos ni tocar validación/save. `SumisionWizard` no importaba `Chips`: añadido.
- **Fixes menores IA** (`ImportarClaseDialog.svelte`): texto de error "Gemini" → "Groq"; quitada mención a `PUBLIC_GROQ_KEY` (nombre viejo); mensaje de timeout.
- **Timeout en llamadas a Groq** (`ai.ts`): nuevo helper `fetchGroq(body)` con `AbortController` (30s) que elimina la duplicación de los 4 `fetch` y aborta peticiones colgadas (mala red en móvil). Lanza `AI_TIMEOUT`, mapeado a mensaje amable en los 3 manejadores de error del dialog.

`pnpm check` y `pnpm build`: limpios.

---

## Sesiones 46-48 (2026-06-24) — Tags, disciplina, simplificación categorías + importación IA de clase

**Hecho — cuatro bloques de trabajo sin tag de iteración, todos en `main`.**

### Bloque 1 — Sistema de tags para posiciones (schema V7)

- **`SCHEMA_V7_MIGRATION`**: tablas `tags` (id, nombre, color, created_at) y `posicion_tags` (posicion_id, tag_id). Relación N:M posición↔tag con cascade delete.
- **`src/lib/tags.ts`** (nuevo): DAL completo — `listTags`, `createTag`, `updateTag`, `deleteTag`, `addTagToPosicion`, `removeTagFromPosicion`, `getTagsForPosicion`, `getAllTagsPerPosicion`. Colores preset en `TAG_PRESET_COLORS`.
- **`PosicionWizard.svelte`**: nuevo paso "Tags" (paso 5, antes de Notas). Selección de tags existentes + creación inline de nuevo tag con color picker de preset. `allTags` cargado en `onMount`.
- **`mapa/+page.svelte`**: bulk tag — selección múltiple de posiciones + "Añadir tag" / "Quitar tag" en modo edición. `tagsPerPosicion` como Map cargado junto a los datos principales.
- **`types/index.ts`**: interfaz `Tag`.

### Bloque 2 — Filtro por disciplina (BJJ / Grappling)

- **`Disciplina`** = `'bjj' | 'grappling' | 'ambos'` en types.
- Campo `disciplina` añadido a `posiciones`, `tecnicas`, `sumisiones_terminales` (no requirió migración separada — aprovechó V7 o campo DEFAULT en creación).
- **`settings.svelte.ts`**: `disciplinaActiva` (`'bjj'|'grappling'`) persistida en `app_settings` vía `KEY_DISCIPLINA_ACTIVA`. `setDisciplinaActiva()`.
- **`ajustes/+page.svelte`**: selector de disciplina (toggle BJJ / Grappling) bajo el switch de vista avanzada.
- **`mapa/+page.svelte`**: toggle de disciplina integrado en la misma fila que tabs Grafo/Lista (fix scroll: antes ocupaba fila propia y rompía `calc(100dvh-13rem)`). El grafo y la lista se filtran por `disciplinaActiva`.
- **Wizards**: `PosicionWizard`, `TecnicaWizard`, `SumisionWizard` arrancan con `disciplina = settings.disciplinaActiva`. ⚠️ *Corrección sesión 49*: en su entrega original solo `PosicionWizard` exponía selector para cambiar la disciplina por entidad; `Sumisión` y `Técnica` la heredaban del toggle global sin posibilidad de editarla. Resuelto en sesión 49 (ver abajo).

### Bloque 3 — Simplificación de categorías de posición (schema V8)

- Fusión `control_superior` + `espalda` → `control`. Quedan 4 valores: `guardia | control | transicion | otro`.
- **`SCHEMA_V8_MIGRATION`**: dos `UPDATE posiciones SET categoria = 'control'` para los dos valores antiguos.
- **`CategoriaPosicion`** en types actualizado.
- Todos los selectores de categoría en wizards y filtros actualizados.

### Bloque 4 — Importación de clase vía IA (feature principal)

Pipeline de 3 fases con Groq (llama-3.3-70b-versatile):

**Fase 1 — Normalización** (`normalizarDescripcion`):
- Corrección de términos mal transcritos por voz (`look down` → `Lockdown`, `Underwood` → `Underhook`). Marca correcciones con `**...**` e inciertos con `~~...~~`.
- UI: panel superior read-only con palabras originales cambiadas resaltadas (amarillo), panel inferior editable con correcciones resaltadas (amarillo = corregido, naranja = incierto). `spellcheck="false"` en el contenteditable. Misma altura `h-52` en ambos paneles.
- `contenteditable` gestionado con `bind:this` + `$effect` que setea `innerHTML` directamente (no Svelte rendering — conflicto con DOM management).

**Fase 2 — Extracción** (`generarPropuestaDeClase`):
- Extrae posiciones nuevas, sumisiones nuevas y técnicas con sus detalles de ejecución.
- Reglas explícitas en el prompt: controles no son posiciones (lockdown, underhook), variantes de posición (Dogfight underhook vs overhook), tildes, detalles de setup/ejecución en campo `detalles`.

**Fase 3 — Validación** (`validarPropuesta`):
- Rúbrica explícita: controles como posiciones → eliminar; posición no en texto → eliminar; genérico+variante coexistiendo → eliminar genérico; dos variantes opuestas → eliminar la no confirmada en texto.
- Restauración de `detalles` en código tras la validación (el modelo los elimina al devolver JSON reducido) — `Map<nombre, detalles>` del extractor.
- Silenciosa para el usuario (loading "Verificando propuesta…").

**UI del dialog**:
- Pasos: `input` → `normalizado` → `review` → `detalles`.
- Step `detalles`: textareas pre-rellenas con los detalles extraídos por la IA.
- `capitalizeFirst` aplicado en todos los nombres al construir el draft.

### Bloque 5 — Notas/detalles siempre visibles en modales

- `TecnicaModalContent`: `detalles` y `errores_comunes` ahora visibles siempre que tengan contenido (antes solo en `modoAvanzado`).
- `PosicionModalContent`: `notas` siempre visible si hay contenido.
- `SumisionModalContent`: `notas` siempre visible si hay contenido.

### Decisiones clave

- **Tags en posiciones únicamente** (por ahora). Técnicas y sumisiones no tienen tags — añadirlos requeriría tablas de unión adicionales; se deja para cuando haya caso de uso claro.
- **Disciplina `'ambos'`** en el tipo pero los filtros de mapa solo muestran `bjj` o `grappling` según la activa, más los que tienen `'ambos'`.
- **Validator silencioso**: el usuario no ve qué corrigió el validador — se eliminó el banner verde tras feedback. La validación mejora la propuesta sin ruido visual.
- **`detalles` restaurados en código**, no vía prompt: más fiable que pedirle al modelo que propague un campo opcional.
- **Groq key en `.env.local`** (`PUBLIC_GROQ_KEY`). NUNCA comitear. La app falla con error explícito si la key no está.

### Archivos modificados/nuevos

**Nuevos:**
- `src/lib/ai.ts`
- `src/lib/components/ImportarClaseDialog.svelte`
- `src/lib/tags.ts`

**Modificados:**
- `src/lib/db/schema.ts` (V7 + V8)
- `src/lib/types/index.ts` (Tag, CategoriaPosicion, Disciplina)
- `src/lib/settings.svelte.ts` (disciplinaActiva)
- `src/lib/posiciones.ts` (disciplina)
- `src/lib/sumisiones.ts` (disciplina)
- `src/lib/tecnicas.ts` (disciplina)
- `src/lib/components/PosicionWizard.svelte` (tags + disciplina)
- `src/lib/components/PosicionModalContent.svelte` (notas siempre visible)
- `src/lib/components/SumisionModalContent.svelte` (notas siempre visible)
- `src/lib/components/TecnicaModalContent.svelte` (detalles siempre visible)
- `src/lib/components/TecnicaWizard.svelte` (disciplina)
- `src/lib/components/SumisionWizard.svelte` (disciplina)
- `src/lib/components/mapa-modal-stack.svelte.ts`
- `src/lib/components/RollEditor.svelte`
- `src/routes/mapa/+page.svelte` (disciplina toggle + tags bulk + fix scroll)
- `src/routes/ajustes/+page.svelte` (selector disciplina)
- `src/routes/rolls/+page.svelte`
- `src/lib/grafo.spec.ts`
- `.claude/ESTADO_ACTUAL.md` (esta entrada)

### Próximo paso concreto

Decidir próxima iteración entre candidatos. La más preparada técnicamente es F3 (contras sub-grafo) — plan T9 pendiente de redactar. Alternativas: tags en técnicas/sumisiones si el owner reporta necesidad, o candidatos del ROADMAP.

---

## Sesión 45 (2026-05-22) — F2 implementada y rechazada en preview, pivot a F3 cerrado

**Hecho — implementación completa de Pasos 1-5 del T8 (F2 mutación in-place) en rama `feature/contras-mapa-inplace` + rechazo en preview por el owner + decisión de pivot al approach F3 (sub-grafo filtrado, contras como aristas).** La rama F2 queda parqueada sin merge en commit `dabfa88`, igual que pasó con F1 (`f936282`). Esta entrada actualiza main con el aprendizaje; el código F2 no se mergea.

### Flujo

1. **Paso 1 inline en main chat** (orquestador): `computeRadialPositions` copiado desde rama parqueada F1 al final del `<script>` de `GrafoMapa.svelte`, + 3 selectores nuevos (`node[temp][kind="contra"]`, `edge[temp]`, `edge[temp][tipo="transicion"]`) al final del array de `buildStylesheet`. `pnpm check` 0/0/0.
2. **Pasos 2+3 y Paso 5 en paralelo vía 2 subagentes** (decisión del orquestador: pasos 2 y 3 tocan el mismo archivo, no se pueden paralelizar entre sí; sí con Paso 5 que es archivo distinto):
   - Agente A — `GrafoMapa.svelte`: 3 métodos imperativos (`enterContrasMode`, `transitionContrasMode`, `exitContrasMode`) expuestos vía `export function`; helpers privados `injectContrasElements` + `hideAllExceptHubEdge`; snapshot interno del viewport y display; handlers tap sobre `node[temp]` (satélites) y sobre canvas vacío. Decisión del agente: filtrar `kind === 'contra'` en el tap para que el hub-as-node central no dispare push redundante. Reusó la prop existente `onAttemptPush` para los satélites.
   - Agente B — `TecnicaModalContent.svelte`: prop nueva `onShowInGraph?: (tecnicaId: string) => void` + botón `Button variant="outline" size="sm"` al inicio del bloque `status === 'ready'` visible solo si `onShowInGraph !== undefined && contras.length > 0`.
3. **Paso 4 sequential** (Agente C tras los anteriores): orquestación en `mapa/+page.svelte` + 2 props nuevas en `MapaModalHost.svelte` (`onShowInGraph` y `onContrasModeEscape`). Incluye `$effect` async de sincronización stack↔grafo con flag `cancelled` (patrón verbatim del T8 §3.5), AlertDialog dirty reusado (`mostrarConfirmDescartarGrafo` + `accionPostDescarteGrafo`, no duplicado), botón "Volver al mapa" en sub-header, wrapper `{#if contrasMode === null}` sobre botones de edición, `onEscapeKeydown` interceptado en los 3 wrappers del Host (Dialog, sheet-side, sheet-bottom — el agente apreció que el plan solo mencionaba uno y lo extendió por consistencia con la regla "aplica fixes a todos los equivalentes").
4. `pnpm check` 1060/0/0 sobre el estado combinado. `pnpm build` OK.
5. **Dataset de testing generado para esta sesión** (fuera del scope, ayuda del orquestador): `bjj-tracker-export-20260522-test-contras.json` en el root del proyecto (no comiteado). Toma el último export v6 del 2026-05-20 y añade 10 contras nuevas para tener 12 totales distribuidas en 4 hubs (5+3+2+2), con anidamiento de 3 niveles posible (Armbar mount → Upa → Kimura → Upa) y 4 técnicas sin contras (para verificar botón ausente). Importable vía `/ajustes`.
6. **Hallazgo del owner en preview** (reload duro tras build):
   - **Bug visual real**: al entrar al modo contras los nodos del resto del grafo se sobreponen en lugar de ocultarse, y al salir el grafo nunca se restaura. Causa probable: el snapshot del display captura valores vacíos/`undefined` (los nodos no tenían `display` explícito antes), y al restaurar los seteos no se aplican; los nodos podrían además colapsar al `(0,0)` por defecto al perder layout.
   - **Rechazo de approach**: incoherencia de modelo visual. "Me cuesta entender cómo antes las técnicas eran flechas y ahora en el nuevo grafo las técnicas se vuelven nodos." La misma entidad cambia de tipo según contexto, rompe el lenguaje del grafo.
7. Owner contra-propuso un re-encuadre completo (que el T8 plan no consideró): el grafo en modo contras se debe **filtrar a un sub-grafo** donde **las contras siguen siendo aristas** (su forma natural), con sus posiciones origen/destino reales como nodos del sub-grafo. Las técnicas SIEMPRE son aristas, en todo contexto.
8. **3 decisiones UX cerradas del nuevo approach F3** sobre el re-encuadre:
   - Contras se dibujan como aristas (no nodos satélite).
   - Color distinto para contras: "amenazante", **rojo apagado**. Token nuevo a definir.
   - Solo se muestran las contras directamente relacionadas con la arista seleccionada. Anidamiento recursivo: tap en contra Y → re-filtrar al sub-grafo de Y.
   - Layout: posiciones fcose actuales preservadas (sin layout shift). Sin recalcular.

### Decisiones clave

- **F2 rechazada y parqueada como spike documentado.** El commit `dabfa88` queda en remoto navegable. NO se mergea a main. Patrón idéntico al que se hizo con F1 (`f936282`).
- **Lección sensible para el orquestador y para futuros planes**: el T8 fue planeado con un Reader Test que no detectó la incoherencia "técnica como arista en el grafo principal vs técnica como nodo en el modo contras". El Reader Test cubrió correctitud técnica (race conditions, lifecycle, async patterns, IDs) pero no validó la **coherencia del modelo visual** con el resto de la app. Para próximos planes con impacto visual fuerte: incluir explícitamente "¿la representación visual de cada entidad cambia entre contextos?" como check del Reader Test o como parte del review previo al `doc-coauthoring`.
- **Aprovechable de F2 para F3 (~60%)**: el botón en `TecnicaModalContent`, todo el cableado de `mapa/+page.svelte` (`$effect` async con `cancelled` flag, AlertDialog dirty, breadcrumb integrado al `mapaModalStack`, ESC interceptado, tap-canvas), las 2 props nuevas del `MapaModalHost`. Se tira de F2: `injectContrasElements`, `computeRadialPositions`, los selectores `node[temp][kind="contra"]`, el "hub-as-node" central. Los 3 métodos imperativos `enter/transition/exitContrasMode` siguen siendo el patrón válido, solo cambia su implementación interna.
- **F3 a planificar como T9** en próxima sesión con su propio plan formal vía `doc-coauthoring`. Estimación ~2-3h de implementación.

### Próximo paso concreto

Al retomar:
1. Redactar `T9_PLAN_contras_subgrafo.md` (o nombre análogo) con las 3 decisiones UX ya cerradas + diseño técnico:
   - Cómo identificar el sub-grafo: posiciones extremos de X + posiciones extremos de cada contra Y.
   - Cómo aplicar la atenuación del resto: `opacity: 0.15` vs `display:'none'`. La opción `display:'none'` está demostrada como problemática (esta sesión). `opacity` mantiene posiciones intactas y permite restauración trivial.
   - Color "amenazante" rojo apagado: definir token en `src/routes/layout.css` (variante de `--destructive`? o token nuevo `--threat` / `--contra` con saturación más baja).
   - Cómo interactúa con el estado `selected` actual del grafo (`.selected` se aplica hoy a la arista del top del stack).
   - Animación: la transición sigue siendo `cy.layout({animate:true})` o basta con `cy.animate` por elemento al cambiar opacity/color? Sin layout shift, lo segundo basta.
2. Crear rama `feature/contras-subgrafo` desde main.
3. Implementar — aprovechando lo aprovechable de F2 vía cherry-pick selectivo o reimplementación (decidir al planear).

### Archivos modificados en esta sesión

- En rama `feature/contras-mapa-inplace` (commit `dabfa88`, push hecho):
  - `src/lib/components/GrafoMapa.svelte`
  - `src/lib/components/MapaModalHost.svelte`
  - `src/lib/components/TecnicaModalContent.svelte`
  - `src/routes/mapa/+page.svelte`
- En `main` (este commit):
  - `.claude/ESTADO_ACTUAL.md` (esta entrada).
  - `.claude/MEJORAS_FUTURAS.md` (entrada "Visualización de contras" reescrita con historial de F1+F2 rechazadas y decisiones de F3).

### Reportes de subagentes (gitignored, viven solo en feature)

- `.claude/agent-reports/20260522-T8-pasos-2-3/implementation.md`
- `.claude/agent-reports/20260522-T8-paso-5/implementation.md`
- `.claude/agent-reports/20260522-T8-paso-4/implementation.md`

### Dataset de testing generado en esta sesión (no comiteado)

- `bjj-tracker-export-20260522-test-contras.json` (root del proyecto): 12 contras distribuidas en 4 hubs. Sirve para futuros pivots o vuelta a este approach. Importable vía `/ajustes` (schema v6 estricto).

---

## Sesión 44 (2026-05-22) — Plan técnico de Fase 2 cerrado, rama F1 parqueada, T8 a main

**Hecho — review de la rama F1 + replanteo del approach + plan formal de Fase 2 (mutación in-place del grafo principal de `/mapa`) redactado en [`T8_PLAN_contras_mapa_inplace.md`](T8_PLAN_contras_mapa_inplace.md), revisado con Reader Test y comiteado a main.** Sin tocar código de implementación todavía; es checkpoint de planificación. La rama `feature/contras-mapa-inplace` se creó al inicio de sesión desde main; queda lista para arrancar implementación en próxima sesión.

### Flujo

1. Arranque tras `git pull`: nuevo commit `971e8e0` (doc sesión 43) bajado, rama `feature/contras-visuales` también presente. Owner pide revisar lo que hay en F1 antes de decidir qué hacer con la rama, y replantear el approach.
2. Review del código de la rama F1 (commit `f936282`): `MiniGrafoContras.svelte` (505 líneas) + integración en `TecnicaModalContent.svelte`. Conclusión técnica: implementación cumple T7 al pie de la letra, código sólido y reutilizable como **piezas**, pero **no como entrega** — F2 (mutación in-place) no instancia un Cytoscape separado, así que el componente entero no se reutiliza; sí ~80 líneas (helpers radiales, label multi-línea, cap N=20).
3. Decisión sobre rama F1: **parquear sin merge**. Razón: descartar la rama no descarta el conocimiento (decisiones del T7, aprendizaje sobre `Tecnica.tipo` para dashed). Lo que se pierde es el archivo físico, que no encaja arquitectónicamente en F2. Mergear sería entregar UX que el owner mismo rechaza → churn puro.
4. Decisión sobre rama F2: **rama nueva `feature/contras-mapa-inplace` desde main**, no seguir desde la rama F1. Razón: histórico limpio. El commit de F1 cuenta una historia ("añadí mini-grafo"); F2 cuenta otra incompatible ("mutación in-place"). Mezclar ambos en la misma rama produce un git log confuso.
5. **Plan agent** lanzado con brief completo (factibilidad mutación in-place, animación entre layouts, compatibilidad con ADRs 004/006/007/008, 6 preguntas técnicas + 4 UX abiertas). Informe largo entregado en mensaje (modo read-only del agent) y persistido en `.claude/agent-reports/20260522-contras-mapa-inplace-plan/plan.md`. Conclusión: factible, sin nuevas deps, sin tocar archivos prohibidos, animación nativa via `cy.layout({animate:true})`.
6. **6 decisiones UX cerradas** con el owner: (1) modal sigue abierto sobre el grafo modo contras, (2) entrada por botón "Ver contras en el mapa" en el modal, (3) tap en contra Y promueve Y con breadcrumb integrado al `mapaModalStack`, (4) F2.0 sin URL (F2.1 opcional diferida), (5) dirty → AlertDialog, (6) cap N=20 confirmado.
7. **T8 redactado** con `doc-coauthoring` (skill, sin Stage 1 de Context Gathering — el contexto ya estaba cerrado por el informe del agente + decisiones). Estructura paralela a T7: resumen, decisiones cerradas, modelo técnico, 6 pasos de implementación, F2.1 diferido, verificación y riesgos, referencias.
8. **Reader Test** del T8 con sub-agente sin contexto previo. Devolvió 11 problemas, 2 bloqueantes (`getContras` es async pero llamado sync en el `$effect` propuesto; `popAll()` no existe en `mapaModalStack`, la API real es `closeAll()`), 4 altos (firma incorrecta de `computeRadialPositions`, handler tap sobre satélites no descrito, D-3 promete 3 vías de salida pero solo 1 implementada en pasos, owner del snapshot ambiguo), 5 medios/bajos.
9. **2 decisiones técnicas bloqueantes** cerradas con el owner: (a) las contras se resuelven en el padre con `await getContras(...)` antes de invocar el método del grafo (D-18 nuevo en T8), patrón `$effect` async con flag de cancelación; (b) "Volver al mapa" hace `mapaModalStack.closeAll()` (D-extra), no `popTo(0)`.
10. **T8 corregido** con las 11 observaciones aplicadas: D-13/D-15/D-18/D-extra reformulados, nueva §3.8 ("Handlers de tap nuevos en GrafoMapa.svelte") con código explícito para tap en satélite + tap en canvas vacío, §3.5 con `$effect` async + cancelled flag, §3.7 paso 7 simplificado (un solo ESC cierra todo en lugar de capa-por-capa), §7 corregido (Host recibe 2 props nuevas).

### Decisiones clave

- **Rama F1 parqueada, no descartada.** Sigue en remoto navegable. El día que F2 necesite mirar cómo se calculaba la posición radial o el `readTokens` de F1, `git show feature/contras-visuales:src/lib/components/MiniGrafoContras.svelte` da acceso sin checkout.
- **F2 = mutación in-place sobre la misma instancia Cytoscape** (D-11). Sin destruir/recrear. Reusa zoom, pan, posiciones cacheadas de fcose, estado interno.
- **`getContras` es async, las contras se resuelven en el padre** (D-18). El `$effect` que sincroniza `mapaModalStack` con el grafo es async con flag `cancelled` para evitar race conditions si el usuario hace tap-tap-tap rápido entre contras.
- **Un solo ESC cierra todo (modo + modal)** en lugar de capa-por-capa. Simplificación tras Reader Test. Si en uso real se siente brusco, se reabre como mejora F2.2.
- **F2.1 (deep-link con URL)** queda diferido: F2.0 valida la mutación in-place sin meter complejidad de history/URL. Si el owner pide deep-link tras probar, F2.1 lo añade en sesión separada con su propio plan ~2h.

### Próximo paso concreto

Al retomar la implementación de F2.0:

1. `git checkout feature/contras-mapa-inplace` (la rama ya está creada localmente; tras push de main de esta sesión, hacer `git merge main --ff-only` para que la rama incluya el commit de T8 + ESTADO_ACTUAL).
2. **Paso 1 del T8** — copiar `computeRadialPositions` desde la rama parqueada al final del `<script>` de `GrafoMapa.svelte` + añadir 3 selectores nuevos al `buildStylesheet`. `pnpm check` 0/0/0.
3. **Paso 2** — implementar `enterContrasMode` y `exitContrasMode` con snapshot interno + handlers tap del modo (§3.8). Test manual desde DevTools o botón temporal en `+page.svelte`.
4. **Paso 3** (paralelizable con Paso 2 tras Paso 1) — implementar `transitionContrasMode`.
5. **Paso 4** — estado `contrasMode` + `$effect` async + handler `handleShowInGraph` + AlertDialog dirty + guard al `$effect` de `panToEntity` + ocultación de botones de edición + botón "Volver al mapa" en `+page.svelte`.
6. **Paso 5** (paralelizable con Paso 4) — botón "Ver contras en el mapa" en `TecnicaModalContent.svelte`, prop nueva al `MapaModalHost`.
7. **Paso 6** — verificación E2E con todos los casos del §4 paso 6 del T8. Si OK, push y actualización de ESTADO_ACTUAL para sesión 45.

### Archivos modificados (3)

- `.claude/T8_PLAN_contras_mapa_inplace.md` (nuevo, ~420 líneas)
- `.claude/ESTADO_ACTUAL.md` (esta entrada)
- Rama nueva: `feature/contras-mapa-inplace` (sin commits aún; tras este push se hará `merge main --ff-only` para incorporar el T8 a la rama de trabajo)

### Reportes de subagentes (gitignored)

- `.claude/agent-reports/20260522-contras-mapa-inplace-plan/plan.md` — informe del Plan agent.
- `.claude/agent-reports/20260522-contras-mapa-inplace-plan/reader-test.md` — auditoría del Reader Test.

---

## Sesión 43 (2026-05-22) — Fase 1 implementada en rama, approach del mini-grafo en revisión

**Hecho — implementación completa de Fase 1 según [`T7_PLAN_contras_fase1.md`](T7_PLAN_contras_fase1.md) en rama `feature/contras-visuales`, más fix UX colateral en Combobox.** En preview, el owner cuestionó la base del approach: esperaba una transición animada desde el grafo principal (`/mapa`) hacia la vista de contras, no un mini-grafo aislado dentro de un modal. Decisión sobre qué hacer con la rama queda abierta — push sí, merge a main no.

### Flujo

1. Arranque: rama `feature/contras-visuales` creada desde `main`. Dos subagentes lanzados en paralelo (decisión del orquestador por petición explícita del owner de maximizar paralelo):
   - Agente A (`general-purpose`): implementa `MiniGrafoContras.svelte` entero (Pasos 1-4 del plan). Informe en `.claude/agent-reports/20260522-contras-fase1-impl/componente.md`.
   - Agente B (`general-purpose`): sustituye el bloque `<ul>` de contras en `TecnicaModalContent.svelte` por el nuevo componente (Paso 5). Informe en `.claude/agent-reports/20260522-contras-fase1-impl/sustitucion.md`.
2. Hallazgo del Agente A sobre el modelo de datos: la columna `tipo` para decidir si la arista va dashed NO vive en `tecnica_contras` (que es solo relacional: `tecnica_id`, `contra_tecnica_id`, `created_at`), sino en `Tecnica.tipo` de cada contra. La API del plan §3 queda exactamente como estaba — cero cambio para el padre.
3. Hallazgo del Agente B (regresión no prevista en el plan): el botón ✕ que disparaba el `AlertDialog` de "Quitar contra" vivía DENTRO del `<ul>` eliminado. Al sustituir el bloque, `handleQuitarContraClick` y el AlertDialog quedaron huérfanos (definidos pero sin disparador). Plan asumió que se quedaban "debajo del canvas" sin caer en cuenta.
4. Orquestador abre opción al owner: (A) chips compactos debajo del mini-grafo, (B) diferir a F1.1 long-press, (C) long-press ahora. Owner elige (A) — chips conservan AlertDialog intacto, cero regresión.
5. Edit inline en `TecnicaModalContent.svelte`: bloque de chips `[nombre técnica] ✕` con hover destructive sutil, dentro del mismo `{#if contras.length > 0}`, reutilizando `XIcon` y `handleQuitarContraClick`.
6. Verificación local: `pnpm check` 1061/0/0, `pnpm build` 9.16s, SW generado sin warnings nuevos.
7. Owner arranca preview por su lado, prueba, y reporta: "no me gusta el grafo dentro del sheet, pensaba que habría una transición animada del grafo inicial". Orquestador abre 3 interpretaciones via `AskUserQuestion`. Owner elige la más radical: mutación in-place del grafo de `/mapa`, sin modal.
8. Segundo feedback del owner (independiente del approach): "+ Añadir contra" abre Combobox que requiere otro click para mostrar la lista — quiere que arranque abierto directo. Fix aplicado: prop `defaultOpen` en `Combobox.svelte`. Primer intento `let open = $state(defaultOpen)` no funcionó (bits-ui `Popover.Root` no respeta `open=true` inicial sin Trigger montado). Corregido con `onMount` + `tick()` antes de poner `open = true`.

### Decisiones tomadas

- **Chips de "Quitar contra" debajo del canvas** (opción A del orquestador). Mantienen el AlertDialog intacto, cero regresión. Si en Fase 2 el approach cambia, los chips probablemente desaparecen también.
- **Fix del `defaultOpen` del Combobox** queda válido independientemente del approach de las contras — es una mejora UX reusable. Si se descarta `feature/contras-visuales`, este fix se rescata como commit separado a main.
- **Approach del mini-grafo en revisión.** El owner valida que F1 técnicamente funciona y verifica el flujo, pero rechaza la UX de "mini dentro de modal" como entrega final. Lo que él quiere es esencialmente F2 (mutación in-place del grafo principal). NO se mergea a main hoy.
- **Push de la rama sí, merge a main no.** La rama queda en remoto como spike documentado.

### Decisiones pendientes (para próxima sesión)

1. **Qué hacer con `feature/contras-visuales`**: mergear como entrega intermedia (deja en main código que probablemente se vuelve a tocar en F2), parquear sin merge (queda en remoto, navegable), o descartar y rescatar solo el fix del Combobox.
2. **Plan formal de Fase 2** (mutación in-place del `/mapa`): si arrancamos plan con `Plan agent` + `doc-coauthoring`, o si pasamos a otro candidato del backlog primero (reducir copy, sugerencia de compañero, etc.).
3. **UX de F2** (decisiones gordas):
   - ¿El modal de técnica sigue existiendo (con descripción, editar/borrar) o todo pasa a sidebar/sheet adyacente?
   - ¿Cómo se entra al "modo contras de X" y cómo se vuelve al mapa entero?
   - Tap en una contra dentro de la vista expandida: ¿navega a "modo contras de Y" o abre otro panel?
   - ¿Hay breadcrumb? ¿Persiste estado al recargar?

### Archivos modificados (4)

- `src/lib/components/MiniGrafoContras.svelte` (nuevo, 504 líneas) — componente Cytoscape hub-spoke. Implementa D-1 a D-12 del plan sin desviaciones funcionales. Defensivos añadidos por el agente: `userZoomingEnabled: false` (no pelea con scroll del Sheet), `autoungrabify: true` (consistente con D-11 read-only).
- `src/lib/components/TecnicaModalContent.svelte` — sustituido `<ul>` de contras (líneas 491-529 originales) por `<MiniGrafoContras .../>` + bloque de chips `[nombre técnica] ✕` debajo. Import `MiniGrafoContras` en línea 30. `XIcon` y `handleQuitarContraClick` vuelven a tener uso runtime.
- `src/lib/components/Combobox.svelte` — nueva prop `defaultOpen?: boolean = false`. Cuando `true`, el popover arranca abierto. Implementado con `onMount` + `tick()` porque `bind:open` inicial a `true` no funciona sin Trigger montado (limitación bits-ui).
- `.claude/ESTADO_ACTUAL.md` — esta entrada.

### Archivos NO tocados pese a tener relación

- ADR-009 (`docs/adr/009-mini-grafo-contras.md`) **NO creado.** El plan §6 lo pedía al cerrar Fase 1, pero como Fase 1 no se da por cerrada hasta resolver la decisión de F1 vs F2, queda pendiente. Si descartamos el approach, este ADR no llega a existir.
- `MEJORAS_FUTURAS.md` línea 379 **NO actualizada.** Por el mismo motivo: el texto "color del tipo de cada contra" debía pasar a "paleta monocromática consistente" al cerrar F1; con F1 en revisión, no se toca.
- `ROADMAP.md` / `CHANGELOG.md` **sin entradas nuevas.** Sin merge a main no hay release.

### Próximo paso concreto

Al retomar:

1. Owner decide qué hacer con la rama (mergear / parquear / descartar) — ver "Decisiones pendientes" §1.
2. Si va a F2: arrancar `Plan agent` con brief para evaluar factibilidad técnica de mutación in-place del `/mapa` (¿se puede sin tocar `+layout.svelte` ni `vite.config.ts`? ¿cómo persiste el estado "modo contras"? ¿cómo es la animación entre layouts fcose y radial sobre la misma instancia Cytoscape?). El informe del agent va antes de redactar `T8_PLAN_contras_mapa_inplace.md` con `doc-coauthoring`.
3. Si va a otro candidato del backlog: re-priorizar y abrir nuevo plan ese.

---

## Sesión 42 (2026-05-22) — Plan técnico de Fase 1 (contras visuales)

**Hecho — plan técnico formal de la Fase 1 de "Visualización de contras en el grafo" redactado y guardado en [`T7_PLAN_contras_fase1.md`](T7_PLAN_contras_fase1.md).** Sin tocar código todavía; es checkpoint de planificación antes de arrancar la implementación. La rama `feature/contras-visuales` se crea al iniciar el Paso 1.

### Flujo

1. Owner decidió, entre los candidatos del backlog, arrancar plan técnico de Fase 1 (mini-grafo de contras en modal de técnica), descartando para hoy una iteración 7 explícita.
2. Recon técnico delegado a Plan agent (informe en `.claude/agent-reports/20260521-contras-fase1-plan/plan.md`, gitignored). Lee `GrafoMapa.svelte`, `TecnicaModalContent.svelte`, `contras.ts`, `mapa-modal-stack.svelte.ts`, `layout.css`, ADRs 004/006/008. Devuelve análisis con 9 decisiones técnicas (A-I), 7 decisiones pendientes para owner, y 5 pasos de implementación.
3. Push-back del owner contra la idea original del backlog de "color por tipo": el grafo principal hoy es deliberadamente monocromático (`GrafoMapa.svelte:219-258`), introducir color solo en el mini rompería la decisión global. Confirmada paleta monocromática consistente.
4. Confirmadas las 7 decisiones del agente con un cambio: altura del canvas subida de 240 a 320 px (los 240 quedaban apretados con N>7 contras).
5. Plan formal redactado con `doc-coauthoring`: 6 secciones, 13 decisiones cerradas agrupadas por tema (visual, topología y datos, componente/API, documentación), pasos de implementación con dependencias y verificación de cada uno, riesgos a vigilar.

### Decisiones clave

- **Paleta monocromática**, idéntica al grafo grande. La entrada `MEJORAS_FUTURAS.md:379` debe actualizarse al cerrar Fase 1 para no contradecir esto.
- **Layout `preset` radial trigonométrico**, sin fcose. Determinista, barato, evita añadir 122 KB al chunk del modal.
- **Aristas dirigidas hub → contra** (flecha). El modelo `tecnica_contras` es asimétrico (`src/lib/contras.ts:1-13`).
- **API del componente sobredimensionada para Fase 2**: props `selectedId` y `height` declaradas pero no usadas — Fase 2 las consume sin retrabajo.
- **Mini-grafo read-only** en Fase 1. La edición (Combobox + AlertDialog) se queda donde está hoy.
- **ADR-009 corto** al cerrar Fase 1 para registrar las dos decisiones con peso (monocromático vence al backlog + preset sobre fcose).

### Próximo paso concreto

Implementación de Fase 1 según el plan `T7_PLAN_contras_fase1.md`:

1. `git checkout -b feature/contras-visuales` desde `main`.
2. Paso 1+2: esqueleto del componente `MiniGrafoContras.svelte` + readTokens/stylesheet.
3. Paso 3+4: layout radial + tap handlers + reactividad de tema (paralelizables).
4. Paso 5: sustitución del bloque de hipervínculos en `TecnicaModalContent.svelte`.
5. Verificación `pnpm check` + `pnpm build` + `pnpm preview` con reload duro.

### Archivos modificados (2)

- `.claude/T7_PLAN_contras_fase1.md` (nuevo)
- `.claude/ESTADO_ACTUAL.md` (esta entrada)

---

## Sesión 41 (2026-05-21) — Reorganización spec-driven de la documentación

**Hecho — movido el corpus de docs internos (`.claude/`) a una estructura pública y navegable bajo `docs/` + ficheros canónicos en la raíz.** Disparado por una conversación de organización en la que el owner planteó si valía la pena pasar a un tracker (Jira/Linear/GitHub Issues) con MCP. Tras hacer push-back sobre el coste vs dolor real, acordamos que el 80% del valor de "best practices" venía de la parte spec-driven (docs-as-code) y que el pilot de tracker queda aplazado.

### Movimientos (todos con `git mv`, preservan histórico)

- `.claude/REQUISITOS.md` → `docs/spec/REQUISITOS.md`
- 6 `.claude/ITERACION_*.md` → `docs/iterations/`
- 8 `.claude/decisiones/*.md` → `docs/adr/`
- 3 `.claude/T2_*.md` legacy → `docs/iterations/archive/`
- `.claude/CONTEXTO_AGENTE.md` → `CLAUDE.md` (root, convención Claude Code)

### Nuevos ficheros

- **`CLAUDE.md`** (root) — antes `CONTEXTO_AGENTE.md`. Links internos actualizados a las nuevas rutas; sección "Estado del proyecto" reescrita para reflejar iteraciones 0-6 cerradas y pausa actual.
- **`CHANGELOG.md`** (root) — formato [Keep a Changelog](https://keepachangelog.com/). 7 releases tageados (v0.1 a v0.6) + `Unreleased`. Derivado de `git log` entre tags y de los objetivos de cada `ITERACION_X.md`.
- **`ROADMAP.md`** (root) — vista pública filtrada del backlog. Destaca "Visualización de contras en el grafo — 2 fases" como próximo en cola. Las entradas tachadas / hechas viven solo en `MEJORAS_FUTURAS.md`.
- **`docs/adr/README.md`** — índice de los 8 ADRs con tabla, estado y formato. Referencia al patrón Michael Nygard.
- **`docs/iterations/README.md`** — índice de iteraciones (0 a 6) con estado, tag y fecha de cierre. Nota explícita sobre `it.2` e `it.3` que cerraron sin doc propio.

### Edits puntuales

- **`CLAUDE.md`** — sección "Estado del proyecto" reescrita (iteraciones 0 a 6 cerradas + pausa actual). Sección "Reglas que viven en otros sitios" actualizada con paths nuevos a `docs/spec/`, `docs/iterations/`, `docs/adr/`. Referencias a ADR-001 reformateadas como links markdown.
- **`README.md`** (root) — actualizada la ref `.claude/REQUISITOS.md §10` a `docs/spec/REQUISITOS.md §10` + añadidos links a `docs/iterations/`, `CHANGELOG.md` y `docs/adr/`.
- **`tests/e2e/README.md`** — ref `CONTEXTO_AGENTE.md` → `../../CLAUDE.md`.
- **`.claude/MEJORAS_FUTURAS.md`** — sed pragmático para actualizar refs internas: `decisiones/00N-...` → `../docs/adr/00N-...`, `CONTEXTO_AGENTE.md` → `../CLAUDE.md`, `ITERACION_N.md` → `../docs/iterations/ITERACION_N.md`. 9 sustituciones en total.

### Ficheros NO tocados

- **ADRs en `docs/adr/`** y **iteraciones en `docs/iterations/`** — referencias inline (`CONTEXTO_AGENTE.md`, `decisiones/00N-...`) se quedan como están. Son históricos: las menciones son prosa narrativa contextual, no links activos de navegación. La convención de ADRs inmutables manda. Si en el futuro hace falta navegabilidad perfecta desde ahí, se hace en un commit aparte de "fix refs históricas".
- **`.claude/ESTADO_ACTUAL.md`** — diario interno detallado, sigue donde está.
- **`.claude/agent-reports/`** — sigue gitignored.

### Estructura final del repo (parte de docs)

```
bjj-tracker/
├── README.md
├── CHANGELOG.md         ← nuevo
├── CLAUDE.md            ← nuevo (movido desde .claude/CONTEXTO_AGENTE.md)
├── ROADMAP.md           ← nuevo
├── docs/
│   ├── spec/REQUISITOS.md
│   ├── adr/             ← 8 ADRs + README índice
│   └── iterations/      ← 6 ITERACION_* + README + archive/
└── .claude/             ← solo working docs internos
    ├── ESTADO_ACTUAL.md
    ├── MEJORAS_FUTURAS.md
    └── agent-reports/   (gitignored)
```

### Estrategia de commits

2 commits separados (decisión del owner para limpieza de historia):

1. **`docs(backlog): añadir entrada "Visualización de contras en el grafo — 2 fases"`** — solo la nueva entrada en `MEJORAS_FUTURAS.md` (63 líneas) que el owner tenía pending sin commitear desde la sesión de brainstorm. Con paths originales (`decisiones/...`) consistentes con el estado del repo en ese commit.
2. **`docs: reorganize project documentation following spec-driven structure`** (este commit) — toda la reorganización: renames, ficheros nuevos, edits, update de links. Incluye el sed en `MEJORAS_FUTURAS.md` que actualiza los paths viejos a los nuevos.

### Validación

- `pnpm check` → 1060 files, 0 errors, 0 warnings ✅
- `git status` → 19 renames (R), 4 untracked nuevos, 4 modified (.claude/MEJORAS_FUTURAS.md, README.md, tests/e2e/README.md, CLAUDE.md content + rename).
- Build no afectado: solo movimientos de docs.

### Decisiones / aprendizajes

- **No retirar docs del repo.** El push-back fue clave. La "best practice" del mundo real no es "todo a tracker", sino "split deliberado por naturaleza del artefacto": specs/ADRs/CHANGELOG en repo (docs-as-code), backlog activo y tickets en tracker. La trazabilidad la ganas con la disciplina del repo, no añadiendo SaaS encima.
- **Pilot de tracker aplazado.** Decisión consciente: el dolor real actual es organización, no tracking. El pilot se podrá retomar más adelante (mejor candidato: cuando arranque el grafo de contras o una iteración nueva) si el owner reporta dolor concreto.
- **Una memoria nueva** guardada en `~/.claude/projects/-home-adalid-projects/memory/user_portfolio_motivation.md`: el owner usa sus proyectos personales también como portfolio QA→dev; separar "dolor real" vs "valor portfolio" al evaluar best practices.

### Próximo paso concreto

1. **Push de los 2 commits** (con OK del owner). Acto seguido GH Actions dispara deploy automático.
2. Tras el push, dos caminos según prioridad:
   - **(a)** Arrancar **plan técnico de "Visualización de contras en el grafo — Fase 1"** (mini-grafo en modal de técnica) en rama `feature/contras-visuales`. Plan formal a redactar con `doc-coauthoring` antes de tocar código.
   - **(b)** Iteración 7 explícita (decidir alcance entre los candidatos del ROADMAP) y enmarcar la feature del grafo dentro.

---

## Sesión 40 (2026-05-21) — Fix toast PWA: feedback visual al pulsar Recargar + fallback de reload

**Hecho — un bugfix UX en el toast de actualización PWA.** Reportado por el owner: "cuando hay una nueva versión, si le doy a recargar, no pasa nada, al menos visualmente. Ni siquiera se va ese popup". Dos defectos en uno: el botón "Recargar" no daba ninguna señal visible al pulsarlo, y si el flow de `SKIP_WAITING` + `controllerchange` no completaba, el popup se quedaba pegado.

### Diagnóstico

- `UpdateToast.svelte` llamaba a `pwa.update()` que ejecutaba `updateSW(true)` de `virtual:pwa-register` y nada más. Sin estado intermedio, sin feedback.
- El flujo correcto requiere: postMessage `SKIP_WAITING` al SW en `waiting` → activación → evento `controllerchange` en el cliente → `window.location.reload()`. Si cualquier eslabón fallaba (waiting null, controllerchange no llega, SW sin handler), el botón parecía muerto.
- Además, en pruebas el reload sucede en <50ms cuando todo va bien: el spinner ni se llegaba a pintar.

### Cambios

- **`src/lib/pwa.svelte.ts`** — añadidos:
  - `#updating = $state(false)` y getter `updating` para que la UI sepa si está en mitad del flujo.
  - Guard `if (this.#updating) return;` en `update()` para evitar clicks repetidos.
  - **Fallback hard reload** a los 3000ms (`setTimeout(() => window.location.reload(), 3000)`) que garantiza que el botón siempre acaba recargando, aunque el flow de SW falle silenciosamente.
  - **Espera de 400ms** (`await new Promise(r => setTimeout(r, 400))`) antes de llamar a `updateFn?.(true)`, para que el spinner tenga tiempo de pintarse antes de que `controllerchange` dispare el reload.
- **`src/lib/components/UpdateToast.svelte`** — el botón Recargar ahora cambia a "⟳ Actualizando…" con `LoaderCircleIcon` de lucide + `animate-spin` y `disabled={pwa.updating}`. La X de cerrar sigue activa siempre — el usuario puede dismissar el toast aunque haya pulsado Recargar.

### Validación

- `pnpm check` → 1060/0/0 (un fichero más por el icono nuevo).
- Owner verificó en preview real con SW: el spinner aparece visualmente al pulsar Recargar y luego refresh, como esperaba.

### Lecciones

- **Las acciones que disparan reload necesitan delay artificial para feedback visual.** Un cambio de `$state` no garantiza que el DOM pinte antes del siguiente evento; si el reload sucede en <50ms, el spinner es invisible. 400ms es un compromiso: imperceptible como latencia, perceptible como feedback.
- **Toda integración con APIs externas asíncronas (SW, postMessage, controllerchange) debe tener fallback temporal.** El flow vite-pwa de `SKIP_WAITING + controllerchange + reload` depende de varios eslabones; un `setTimeout(reload, 3000)` como red de seguridad convierte el botón en "siempre hace algo".

### Próximo paso concreto

Decidir próxima iteración o pausar. Sin candidatos nuevos añadidos al backlog en esta sesión.

### Archivos modificados (3) — todos modificados

- `src/lib/pwa.svelte.ts`
- `src/lib/components/UpdateToast.svelte`
- `.claude/ESTADO_ACTUAL.md` (esta entrada)

---

## Sesión 39 (2026-05-21) — Selected state grafo + z-index AlertDialog + reorden chips TipoTecnica + Origen/Destino navegables

**Hecho — cuatro mejoras en la misma sesión, todas en el contexto de `/mapa`. Sin nueva iteración, sin tag.** Una feature (selected visual en el grafo), un bug (z-index AlertDialog detrás del drawer en móvil), un cambio de orden de chips, y un rediseño visual del drawer de técnica para hacer Origen/Destino claramente navegables.

### Selected state en el grafo (`GrafoMapa` + `mapa/+page.svelte`)

Petición del owner: "necesito que el grafo tenga un estado selected que indique en qué punto estoy". Decisiones de producto: el destacado refleja **el top del `mapaModalStack`** (no un tap toggle independiente); estilo visual = **borde más grueso + color de acento (`--primary`)**.

- `GrafoMapa.svelte`: nueva prop `selectedGraphId?: string | null` (id con prefijo del grafo: `pos:<id>`, `sum:<id>`, o id de arista para técnicas). Dos selectores nuevos al final del stylesheet de Cytoscape: `node.selected` y `edge.selected`, ambos con `border-color/line-color = primary` y ancho mayor (`border-width: 4`, `width: 4`). `$effect` que sincroniza la clase `.selected` con la prop (`removeClass` global + `addClass` al match). Va al final del stylesheet para ganar en la cascada de Cytoscape.
- `mapa/+page.svelte`: `selectedGraphId` derivado del `mapaModalStack.top`. Posición → `pos:${id}`, sumisión → `sum:${id}`, técnica → `id` (las aristas no llevan prefijo). Wizards y stack vacío → `null` (nada destacado). Pasado al `<GrafoMapa>` como prop. Sincroniza automáticamente con la navegación entre modales del breadcrumb.

### Bug z-index AlertDialog (móvil)

Owner reportó: "cuando estoy usando el grafo y luego me quiero mover por el nav, el wizard de descartar queda atrás del drawer". Reconstruido: usuario con un modal de posición/técnica abierto en Sheet bottom móvil, mueve un nodo del grafo (mitad superior visible), tap nav (`BottomNav`). `beforeNavigate` dispara el `AlertDialog` del descartar grafo, pero queda al mismo plano que el Sheet (ambos `z-50` en shadcn).

Fix en los componentes shadcn locales: `alert-dialog-content.svelte` y `alert-dialog-overlay.svelte` pasan de `z-50` a `z-[60]`. Efecto: todos los `AlertDialog` de la app (descartar del grafo, descartar de wizards, descartar de complementaria, etc.) quedan siempre encima de cualquier `Dialog`/`Sheet`. No rompe nada — la jerarquía es la esperada (el confirm de descartar debe estar siempre encima del modal padre).

### Orden de chips de TipoTecnica

Owner: "Sumisiones se debería ver antes que sweeps, transiciones después de sweeps". Orden previo `['ataque', 'sweep', 'escape', 'transicion', 'sumision']`. Nuevo orden: **`['ataque', 'sumision', 'sweep', 'transicion', 'escape']`** (manteniendo ataque primero y escape último como anclas semánticas: ofensiva → defensiva).

Cambiado en los tres sitios donde se define el orden:
- `TecnicaWizard.svelte:104` — `TIPOS` array para chips del paso 4 (Tipo) del wizard.
- `PosicionModalContent.svelte:64` — `TIPOS_ORDEN` para tabs de tipo en el drawer de posición.
- `mapa/+page.svelte:100` — `TIPOS_TECNICA_ORDEN` para opciones del filtro multi-select.

### Origen y Destino como bloques navegables (`TecnicaModalContent`)

Owner: "desde técnica no queda claro dónde tienes que tocar para ir al paso siguiente, por cómo indicas 'Destino: nombre'". Comparado con el drawer de posición (tap claro en bloques completos), el drawer de técnica tenía Origen/Destino como texto inline + `<button class="hover:underline">` — affordance débil, especialmente en móvil donde no hay hover.

Rediseño: **bloques card con header pequeño en mayúsculas + nombre en `font-medium` + flecha direccional**.
- Origen: flecha `←` al inicio (vienes de aquí, tap para ir atrás en la cadena).
- Destino: flecha `→` al final (vas hacia aquí).
- Estilo: `flex w-full items-center gap-2 rounded border border-border p-3 text-left transition-colors hover:bg-accent focus-visible:bg-accent` — mismo lenguaje visual que la lista de técnicas del `PosicionModalContent`.
- Entidad eliminada: bloque con `border-dashed` + italic muted, sin botón (mantiene la maquetación pero comunica "ya no está").

### Validación

- `pnpm check` → 1059/0/0 (sin archivos nuevos).
- `pnpm build` → 6-7s sin warnings nuevos.
- Owner verificó visualmente: selected state OK, z-index OK (AlertDialog ahora encima del drawer en móvil), orden chips OK, Origen/Destino OK tras un retoque (Origen pidió flecha al lado izquierdo apuntando hacia atrás, no al derecho como había puesto inicialmente).

### Lecciones

- **Subir z-index en shadcn local es legítimo cuando un caso de uso lo requiere.** El `z-50` por defecto de shadcn asume que solo hay un Dialog/Sheet/AlertDialog a la vez. Cuando coexisten (drawer del modal + AlertDialog del descartar grafo, p. ej.), el último en montarse debería ganar por orden DOM — pero el `transform` del Sheet crea un stacking context propio y el orden DOM no basta. Subir el AlertDialog a `z-[60]` es la solución pragmática y no rompe nada porque jerárquicamente el AlertDialog SIEMPRE debe estar sobre el modal padre.
- **Flecha direccional vs flecha de affordance.** Mi primera implementación de Origen/Destino tenía ambos con flecha `→` al final (intención: "tap aquí, navegable"). El owner pidió que Origen tuviera `←` (intención: "vienes de aquí"). Lección: cuando hay un eje semántico claro (origen ↔ destino), la flecha debe codificar dirección, no solo affordance. La affordance la da el bloque entero (borde + hover); la flecha agrega significado.

### Próximo paso concreto

Decidir próxima iteración o pausar. Sin candidatos nuevos añadidos al backlog en esta sesión.

### Archivos modificados (7) — todos modificados

- `src/lib/components/GrafoMapa.svelte`
- `src/routes/mapa/+page.svelte`
- `src/lib/components/ui/alert-dialog/alert-dialog-content.svelte`
- `src/lib/components/ui/alert-dialog/alert-dialog-overlay.svelte`
- `src/lib/components/TecnicaWizard.svelte`
- `src/lib/components/PosicionModalContent.svelte`
- `src/lib/components/TecnicaModalContent.svelte`
- `.claude/ESTADO_ACTUAL.md` (esta entrada)

---

## Sesión 38 (2026-05-21) — Pulido UX: reorden roll wizard + bug `/mapa` complementaria + "+ Crear nueva" en wizards standalone

**Hecho — cinco entregables en una sola sesión (sin nueva iteración, sin tag).** Tres pulidos UX (reorden del wizard de roll + skip Tamaño tras crear compañero nuevo + gap dinámico bajo el calendar sticky en desktop), un bugfix arquitectónico (`/mapa` "+ Crear nueva complementaria" desde padre en creación), y un feature menor (habilitar "+ Crear nueva" en wizards standalone, dentro de `RollEditor`). Cuatro tareas formalizadas (T-1 a T-3, más un primer round de ajustes UX previo).

### Round 1 — Reorden roll wizard + sub-form compañero + gap calendar sticky

Tres ajustes UX detectados durante uso normal:

- **Reorden del wizard de roll (`RollEditor.svelte`):** orden previo `1=Compañero, 2=Posiciones, 3=Técnicas, 4=Tamaño, 5=Resultado, 6=Duración(avanzado)`. Nuevo: **`1=Compañero, 2=Tamaño, 3=Posiciones, 4=Técnicas, 5=Resultado, 6=Duración`**. Tamaño queda inmediatamente tras Compañero (decisión: el tamaño es relativo al compañero, conceptualmente ligado). Aplicado tanto al wizard de crear como al form de edición, por consistencia (mismo patrón que reorden de s36).
- **Skip Tamaño tras crear nuevo compañero:** cuando el usuario crea un nuevo compañero inline en el paso 1 del wizard de roll, al pulsar Continuar (con o sin peso rellenado en el sub-form de extras) el wizard salta directamente al paso 3 (Posiciones), saltando Tamaño. Si rellenó peso, este queda asignado a `tamano_relativo`; si no, queda vacío en el roll. Antes el skip solo ocurría cuando rellenaba peso, y dependía de una bandera `pendingSkipTamano` diferida hasta salir del paso de Posiciones — toda esa maquinaria simplificada a dos `advance()` consecutivos.
- **Bug del peso al crear nuevo compañero:** había DOS botones Continuar cuando el sub-form de extras del compañero estaba visible (uno dentro del sub-form, otro en el footer del wizard). El interno llamaba a `handleExtraDataContinue` (correcto). El externo llamaba a `advance()` (incorrecto: no procesaba peso, no saltaba Tamaño). Detectado por el owner. Fix: **eliminado el botón interno**; el del footer del wizard se ramifica con `{:else if currentStep===1 && showExtraData}` y llama a `handleExtraDataContinue`.
- **Gap dinámico bajo el calendar sticky en desktop (`MonthCalendar` + `+page.svelte`):** en desktop al scrollear y compactarse el calendar (sticky `top-14`), las primeras sesiones de la lista quedaban tapadas por debajo del calendar opaco. Causa: el flow del documento se reajusta al cambiar la altura del calendar (~620px → ~200px), las sesiones suben en flow, pero el sticky compact se mantiene visualmente pegado arriba. Es comportamiento natural de `position: sticky` (no empuja al flow siguiente). Fix: `compact` ahora es prop bindable de `MonthCalendar`; home recibe el estado vía `bind:compact={calendarCompact}` y aplica `style:margin-top={calendarCompact ? '13rem' : undefined}` a la `<section>` de sesiones. **Caveat documentado:** mejora el caso "scrollY justo > 100" (que es lo que el owner veía); para `scrollY` mucho mayor las sesiones acaban pasando por detrás del calendar — natural del sticky, no eliminable sin cambiar el patrón.

### T-1 — Botón "Reorganizar" visible solo en modo edición del grafo

`mapa/+page.svelte:692-702`. Antes el botón "Reorganizar" estaba siempre visible en el sub-header de la vista grafo, junto a "Mover nodos" y (cuando `grafoDirty`) "Guardar organización". El owner pidió que solo aparezca cuando estás en modo edición. Cambio trivial: envuelto en `{#if grafoEditing}`. "Mover nodos" sigue siempre visible (es el toggle). "Guardar organización" sigue gobernado por `grafoDirty`.

### T-2 — Bug `/mapa` "+ Crear nueva complementaria" desde padre en creación

Bug reportado por el owner: "no se puede añadir una nueva posición desde posición complementaria, mientras estamos creando una nueva posición. Tras guardar, o se cierra el wizard lateral. Y si le doy a guardar, se crean varias de la misma posición". Tres sub-defectos encadenados, los tres arreglados:

- **`MapaModalHost.svelte:492` — `{#key}` rota:** la expresión evaluaba a la cadena `'crear'` tanto para el wizard padre como para el sub-wizard ambos en modo crear. Svelte reusaba la instancia con el state del padre en lugar de remontarla. Fix: incluir `stack.length` en la clave (`${stack.length}:${...}`).
- **`PosicionWizard.svelte` — draft compartido entre padre y sub:** la señal "soy sub-wizard" era `parentForComplementaria !== undefined`, lo que excluía el caso "padre en modo crear sin id". En ese caso, el sub leía y escribía el mismo `posicionWizardDraft` con clave `'crear'` que el padre, pisando los datos del padre. Fix: dos props nuevas en `PosicionWizard`:
  - `isSubWizard` (calculado por el host: `stack.length > 1`) — gobierna lectura/escritura del `posicionWizardDraft`. Cubre también el caso latente del sub-wizard de posición pusheado desde `TecnicaWizard` (que antes leía el draft de posición sin ser su dueño).
  - `isComplementariaSubWizard` (true si vine de "+ Crear nueva complementaria") — gobierna el salto del paso 4 (Complementaria) independientemente de si el padre tiene id.
- **Simetría diferida cuando el padre está en modo crear:** verificado que `syncComplementaria` (`src/lib/posiciones.ts:98`) ya se invoca desde `createPosicion` y `updatePosicion`. Cuando el padre se guarda apuntando al sub recién creado, la simetría bidireccional se aplica automáticamente. No hacía falta código nuevo para T-2c — solo aprovechar el flujo existente.

`mapa-modal-stack.svelte.ts`: la entrada `wizard-posicion` modo `crear` de `MapaModalEntry` ahora acepta `isComplementariaSubWizard?: boolean` además de `parentForComplementaria?: string`. La documentación explica los dos casos (padre con id vs padre sin id).

### T-3 — Habilitar "+ Crear nueva" en wizards standalone (RollEditor)

Feature menor propuesto y aprobado tras detectar el caso colateral: en el `RollEditor`, los wizards `PosicionWizardDialog` y `TecnicaWizardDialog` (que envuelven `PosicionWizard` y `TecnicaWizard` en `mode='standalone'`) tenían los botones "+ Crear nueva" deshabilitados por diseño (`onCreateNew={mode === 'stack' ? handler : undefined}`). Razón histórica: el `mapaModalStack` solo se renderiza en `/mapa` vía `MapaModalHost`, así que cualquier `push` desde standalone era invisible. Habilitarlos requería arquitectura nueva.

Solución elegida: **sub-Dialogs anidados** (no global `mapaModalStack` en standalone). Cada Dialog wrapper gestiona sus propios sub-Dialogs vía callbacks `onResult` y estado interno. Profundidad limitada a 1 nivel (`allowCreateNewComplementaria=false` en el sub).

**Phase 1 — Posición:**
- `PosicionWizard`: nueva prop `onCreateNewComplementaria?: (onResult: (id: string) => void) => void` (solo standalone). Handler `handleStandaloneCreateNewComplementaria` invoca el callback; el padre llama `onResult(newId)` al guardar el sub; el wizard asigna `complementariaId = newId`.
- `PosicionWizardDialog`: dos props nuevas: `isComplementariaSubWizard` (se pasa al wizard interno para que salte el paso 4) y `allowCreateNewComplementaria` (controla si el wizard interno expone "+ Crear nueva"; se desactiva en el sub para limitar profundidad). Self-import del propio Dialog para anidar (Svelte 5 deprecó `<svelte:self>`).

**Phase 2 — Técnica + Sumisión:**
- `TecnicaWizard`: tres props nuevas `onCreateNewPosicionOrigen`, `onCreateNewPosicionDestino`, `onCreateNewSumisionDestino` con el mismo patrón. Tres handlers standalone (`handleStandaloneCreateNuevaPosicionOrigen`, etc.) que refrescan el catálogo local y asignan al state. No tocan draft (la instancia no se desmonta en standalone).
- `SumisionWizard`: se le añadió modo standalone (antes solo soportaba stack), con el patrón canónico (`mode`, `onDirtyChange`, `mode === 'stack'` guards en `onMount`/`onDestroy`/`cancel`/`handleSave`).
- **`SumisionWizardDialog.svelte` (nuevo):** wrapper análogo a `PosicionWizardDialog` pero sin sub-Dialog anidado (la sumisión no tiene complementaria).
- `TecnicaWizardDialog`: estado interno para tres sub-Dialogs (`subPosicionOrigenOpen`, `subPosicionDestinoOpen`, `subSumisionDestinoOpen`) + refs a callbacks. Tres `requestCreateXxx` handlers + tres `handleSubXxxSaved` handlers. Renderiza condicionalmente `PosicionWizardDialog` (×2 contextos) y `SumisionWizardDialog` cuando el flag correspondiente está activo. Los sub-`PosicionWizardDialog` van con `allowCreateNewComplementaria={false}` para evitar Dialogs de 3 niveles.

### Validación

- `pnpm check` → 1059/0/0 (un archivo nuevo: `SumisionWizardDialog.svelte`).
- `pnpm build` → 6-7s sin warnings nuevos.
- Owner verificó visualmente `pnpm preview`: los tres "perfect" del round 1 + OK explícito de T-1, T-2 (con instrucciones de verificación detalladas), T-3 Phase 1 y T-3 Phase 2.

### Lecciones — diagnóstico vs scope

- **El usuario diagnosticó él mismo el bug del peso** ("creo que hay 2 botones de continuar, uno dentro de la creación de compañero, y otro del wizard, el del wizard es el que no funciona"). Mi análisis previo no había llegado ahí. Lección: cuando el owner ofrece hipótesis específica, considerar como prioritaria — el contexto que tiene él (de uso real) puede ser superior al mío (de leer código).
- **Sticky compact + flow: trade-off insoluble sin cambiar patrón.** Documentado en el código y en la entrada de sesión. Mejor honestidad explícita ("este fix mejora el caso inicial, no elimina el problema en cualquier scrollY") que vender una solución completa que no lo es.
- **T-3 fue scope expandido y aceptado por el owner.** Originalmente el bug era "+ Crear nueva complementaria" no funcionaba en /mapa (T-2). El owner mencionó al pasar "desde rolleditor no deja crear complementaria, pero debería". Lo formalicé como T-3, propuse alcance "ambos posición y técnica", aprobó. El usuario más tarde preguntó "de dónde viene esto" — señal de que el scope se había desviado del bug. Aclaración explícita resolvió: el alcance era el aprobado, no hay confusión, sigue. Patrón aplicable: cuando un fix arrastra un feature derivado, hacer la separación explícita ("el bug es X; esto otro lo añadimos por coherencia, dime si lo quitamos").

### Próximo paso concreto

Decidir próxima iteración o pausar más. Sin candidatos nuevos añadidos al backlog en esta sesión (los pendientes siguen igual: reducir copy, sugerencia compañero, "Forzar actualización", Node 24, sombras en tokens).

### Archivos modificados (12) — 11 modificados + 1 nuevo

- `src/lib/components/RollEditor.svelte`
- `src/lib/components/MonthCalendar.svelte`
- `src/routes/+page.svelte`
- `src/routes/mapa/+page.svelte`
- `src/lib/components/MapaModalHost.svelte`
- `src/lib/components/mapa-modal-stack.svelte.ts`
- `src/lib/components/PosicionWizard.svelte`
- `src/lib/components/PosicionWizardDialog.svelte`
- `src/lib/components/TecnicaWizard.svelte`
- `src/lib/components/TecnicaWizardDialog.svelte`
- `src/lib/components/SumisionWizard.svelte`
- `src/lib/components/SumisionWizardDialog.svelte` (nuevo)
- `.claude/ESTADO_ACTUAL.md` (esta entrada)

---

## Sesión 37 (2026-05-20) — Iteración 6 cerrada (modo hobbyist vs avanzado) + tab Sumisiones en /mapa + cards a 2 filas

**Hecho — it.6 completa con tag `v0.6-it6` y bump 0.5.0 → 0.6.0. Tres tareas formales (T-1/T-2/T-3) + una mejora paralela (tab Sumisiones en /mapa) + ajustes post-T-3 (ocultar AnalisisPanel en /rolls, reorganizar home avanzado, reducir cards de roll a 2 filas mezcladas).**

**Idea raíz:** auditoría de campos opcionales hecha en s36 dejó la app más "hobbyist" de facto. it.6 expone esa decisión como toggle al user: un usuario que quiera la versión rica vuelve a tener todos los campos + análisis en home y en /rolls. Default hobbyist (app recién instalada arranca minimal).

**T-1.it6 — Fontanería (commit `81031d5`):**
- Migración `SCHEMA_V6_MIGRATION` con tabla `app_settings (key TEXT PK, value TEXT NOT NULL)` + seed `('modo_avanzado','false')`. V1..V5 intactos.
- `src/lib/settings.ts` — DAO key/value (UPSERT con `ON CONFLICT(key) DO UPDATE`).
- `src/lib/settings.svelte.ts` — `SettingsState` patrón canónico (class field + `$state` privado + getters + `init()` idempotente con promise cacheado). Singleton `settings`.
- `src/lib/sync.ts` — `CURRENT_SCHEMA_VERSION = 6`, export/import incluyen `app_settings`. Strict mismatch (sin compat v5).
- `/ajustes` — Switch de bits-ui directo (precedente del proyecto). Label "Vista avanzada" + texto de ayuda. `settings.init()` en `onMount`.
- `+layout.svelte` NO se toca — el init es lazy desde cada consumidor.

**T-2.it6 — Home (commit `1fd56d4`, parte 1):**
- `AnalisisHome` montado bajo `{#if settings.modoAvanzado}` debajo del bloque de sesiones del día.
- Lista de sesiones del día con `max-h-48 overflow-y-auto pr-1` en avanzado (~2 cards visibles, resto scrolleable interno). Hobbyist sin scroll.
- Bloque `{#if settings.modoAvanzado && s.foco}` en cada card.

**T-3.it6 — Wizards/editors/modales (commit `1fd56d4`, parte 2):**
Re-introducidos bajo `{#if settings.modoAvanzado}` los 9 campos retirados en s36:
| Componente | Campo |
|---|---|
| PosicionWizard | Notas |
| SumisionWizard | Notas |
| TecnicaWizard | Detalles + Errores comunes |
| SesionEditor (wizard) + SesionForm (form) | Foco + Técnica clase + Obs profesor |
| CompaneroEditor | Notas |
| RollEditor | Duración (en `duracion_min`, al final como paso 6) |
| PosicionModalContent + SumisionModalContent + TecnicaModalContent | Bloques read-only |
| +page.svelte cards | `s.foco` |

Patrón consistente en todos:
- `visibleSteps` calculado dinámicamente con `$derived` y `settings.modoAvanzado`.
- `*Original` preserva el dato de BD al editar en hobbyist (no se pisa).
- `settings.init()` en `onMount` (idempotente).
- `mapa-modal-stack.svelte.ts` extendido con campos en draft states (notas/detalles/erroresComunes).

**Mejora paralela — tab Sumisiones en /mapa (commit `859598e`):**
- Tercer botón en sub-toggle de Lista junto a Posiciones y Técnicas.
- Lista plana orden alfabético, tap → `SumisionModalContent` (flujo ya existente).
- Sin FAB local (el global ya tiene "Nueva sumisión").
- Bonus: desacoplado bug latente en `filtroSinResultados` (OR posiciones+sumisiones que con tabs separadas dejaba estados sin mensaje).

**Ajustes post-T-3 (commit `1fd56d4`, parte 3):**
- `/rolls` — `AnalisisPanel` bajo `{#if settings.modoAvanzado}`.
- `/rolls` y `/sesion/[id]` — cards de roll reducidas de 4 chip-pickers a 2 (Fue bien | Fue mal), mezcla plana posiciones + técnicas (sumisiones ya entran como técnicas con `tipo='sumision'`). Aplicado a ambos sitios por consistencia.

**Decisiones técnicas relevantes:**
- **Tabla key/value** en vez de columna por flag — futuras flags entran sin migración. Trade-off: pierdes tipado SQL, lo recuperas en `SettingsState`.
- **`settings.init()` lazy con promise cacheada** — coordinación cero entre consumidores, primera llamada hace round-trip a BD, las demás devuelven el promise. Coherente con el patrón de `theme.svelte.ts`.
- **`disabled` mientras `!initialized`** en el Switch — evita flicker on→off al hidratar.
- **Cards de roll mezcla plana**: el owner pidió explícitamente plano (no icono ⌖/⚡ ni color de borde distinto). Pierdes distinción posición vs técnica; ganas densidad visual.

**Validación:**
- `pnpm check` → 0/0/0 (1058 archivos) tras cada subagente y al final.
- `pnpm build` → 6-16s sin warnings nuevos.
- Owner verificó `pnpm preview` con toggle ON y OFF, ambos modos funcionando.

**Riesgo asumido y explicitado:** import estricto de JSON v5 viejo falla con "Versión incompatible…". El owner generó `bjj-tracker-export-20260520-v6.json` como referencia (no se commitea, JSONs gitignored).

**Lección — auditoría previa pagó deuda futura:**
La sesión 36 auditó campos sin intención de hacer toggle. Esa decisión hizo que it.6 fuera trivial en alcance (saber exactamente qué reabrir). Sin esa auditoría, it.6 hubiera empezado por debatir "qué es opcional" — semanas de discusión. Patrón aplicable: cuando una decisión de producto requiere clasificar el inventario, hacer la clasificación ANTES con criterio explícito (aquí: "alimenta el grafo o conecta rolls/sesiones") simplifica todas las decisiones derivadas.

**Próximo paso concreto:**
Decidir próxima iteración o pausar. Candidatos prioritarios: reducir copy en pantallas (con `/rolls` como ancla, parcialmente atacado al reducir cards), sugerencia automática de compañero, "Forzar actualización" en `/ajustes`.

**Archivos modificados (sesión completa):**
- `src/lib/db/schema.ts`
- `src/lib/settings.ts` (nuevo)
- `src/lib/settings.svelte.ts` (nuevo)
- `src/lib/sync.ts`
- `src/routes/ajustes/+page.svelte`
- `src/routes/+page.svelte`
- `src/routes/rolls/+page.svelte`
- `src/routes/sesion/[id]/+page.svelte`
- `src/routes/mapa/+page.svelte`
- `src/lib/components/PosicionWizard.svelte`
- `src/lib/components/PosicionModalContent.svelte`
- `src/lib/components/SumisionWizard.svelte`
- `src/lib/components/SumisionModalContent.svelte`
- `src/lib/components/TecnicaWizard.svelte`
- `src/lib/components/TecnicaModalContent.svelte`
- `src/lib/components/SesionEditor.svelte`
- `src/lib/components/SesionForm.svelte`
- `src/lib/components/CompaneroEditor.svelte`
- `src/lib/components/RollEditor.svelte`
- `src/lib/components/mapa-modal-stack.svelte.ts`
- `package.json` (bump)
- `.claude/ITERACION_6.md` (nuevo)
- `.claude/ESTADO_ACTUAL.md` (esta entrada)
- `.claude/MEJORAS_FUTURAS.md` (3 entradas marcadas hechas)

**Reportes de subagentes:** `.claude/agent-reports/20260520-it6-t1/`, `.claude/agent-reports/20260520-it6-t3/`, `.claude/agent-reports/20260520-tab-sumisiones-mapa/`.

---

## Sesión 36 (2026-05-20) — Pulido UX: recorte de opcionales en wizards + reorden RollEditor

**Hecho — barrido de campos opcionales en 6 wizards/editores + reorden de RollEditor para que Técnicas quede inmediatamente tras Posiciones. 12 archivos modificados, sin tag (no es nueva iteración).**

**Criterio del owner:** "lo importante es el grafo y la info que lo alimenta o lo relaciona a rolls/sesiones". Todo lo que no entra en esa intersección se quita de la UI (wizard + edit + read-only). Columnas BD se preservan intactas — migraciones inmutables y respeto a la regla del proyecto.

**Mapa previo (`.claude/agent-reports/20260519-revision-steps-wizards/mapa.md`):** un Explore confirmó que el grafo solo lee `posiciones`, `sumisiones_terminales`, `tecnicas`. Los rolls cruzan al grafo solo vía `roll_posicion` y `roll_tecnica`. El resto de campos opcionales (notas, detalles, errores comunes, foco, técnica clase, observaciones, duración) es metadata decorativa.

**Recortes aplicados (9 campos):**
- `PosicionWizard` — Notas (Complementaria SE QUEDA: alimenta `PosicionModalContent` "Vista del oponente" y prerellena `TecnicaWizard`).
- `SumisionWizard` — Notas. Wizard queda con 1 solo paso → indicador de progreso oculto cuando `totalSteps === 1`.
- `TecnicaWizard` — Detalles, Errores comunes. Wizard pasa de 7 a 6 pasos.
- `SesionEditor` + `SesionForm` — Foco, Técnica clase, Observaciones profesor. Wizard pasa de 5 a 2 pasos (Fecha + Tipo).
- `CompaneroEditor` — Notas. Wizard de 4 a 3 pasos.
- `RollEditor` — Duración. Wizard de 6 a 5 pasos.
- `+page.svelte` (home) — eliminado el bloque `{#if s.foco}` que mostraba el foco en cada card de sesión (por consistencia con el quitado en editor).
- Modales (`PosicionModalContent`, `SumisionModalContent`, `TecnicaModalContent`) — eliminados los bloques `{#if ...notas/detalles/errores}` correspondientes.

**Patrón aplicado para preservar datos legacy al editar:**
Cada wizard/editor mantiene una variable `*Original` que carga el valor existente de BD y lo reenvía intacto en el UPDATE. Resultado: registros con notas/detalles/duración antiguos no se blanquean al editar otros campos — solo dejan de poder verse/editarse desde UI. En creación nueva, los campos van con `''` o `undefined` según la API DAO.

**Reorden RollEditor (mismo commit):**
Owner pidió "técnicas después de posiciones en crear roll y editar roll". Orden previo: Compañero / Posiciones / Tamaño / Resultado / Técnicas. Orden nuevo: **Compañero / Posiciones / Técnicas / Tamaño / Resultado**. Aplicado tanto al wizard (renumeración de pasos + `handleWizardKeydown` + `canAdvance`) como al form de edición (reorden de bloques visuales).

**Decisiones que pidieron validación y se cerraron en sesión:**
- Sub-wizard de PosicionWizard ahora termina en "Tipo rol" en vez de Notas. Owner: OK.
- `s.foco` retirado de la lista del home (no solo del editor). Owner: OK.
- Barra de progreso de SumisionWizard oculta cuando `totalSteps === 1`. Owner: OK (lógica genérica: cualquier wizard con paso único no muestra indicador).
- Edit mode + modales read-only se limpian junto con wizard de creación. Owner: OK ("quitar de todos lados").

**Restricciones respetadas:**
- Migraciones inmutables — no se tocó `src/lib/db/schema.ts`.
- DAOs (`src/lib/posiciones.ts`, etc.) no se tocaron — siguen leyendo/escribiendo las columnas.
- Tipos en `src/lib/types/index.ts` no se tocaron — el día que se quieran dropear columnas, también se limpian estos campos.
- Sin Tailwind crudo, sin nuevas deps, sin tests automatizados.

**Validación:**
- `pnpm check` 1056/0/0 antes y después.
- `pnpm build` ✓ 6.50s sin warnings.
- Owner verificó `pnpm preview` manualmente: "todo testeado, todo OK".

**Lección — recorte guiado por criterio del owner:**
El criterio "alimenta el grafo o conecta a rolls" fue suficiente para tomar decisiones uniformes sobre 9 campos repartidos en 6 componentes. Cuando hubo duda (Complementaria), verificación en código resolvió la ambigüedad (el subagente miró solo cytoscape, pero Complementaria aparece en la modal del nodo y prerellena el wizard de técnica — sí "alimenta lo que el grafo presenta"). Lección: el mapeo "qué alimenta el grafo" debe incluir las superficies de interacción del grafo, no solo los nodos/aristas.

**Próximo paso concreto:**
- Decidir próxima iteración o pausar. Candidatos prioritarios (orden de afinidad del owner): modo hobbyist vs avanzado (con conexión de AnalisisHome ya construido), reducir copy en pantallas, sugerencia automática de compañero.

**Archivos modificados (12):**
- `src/lib/components/PosicionWizard.svelte`
- `src/lib/components/PosicionModalContent.svelte`
- `src/lib/components/SumisionWizard.svelte`
- `src/lib/components/SumisionModalContent.svelte`
- `src/lib/components/TecnicaWizard.svelte`
- `src/lib/components/TecnicaModalContent.svelte`
- `src/lib/components/SesionEditor.svelte`
- `src/lib/components/SesionForm.svelte`
- `src/lib/components/CompaneroEditor.svelte`
- `src/lib/components/RollEditor.svelte`
- `src/lib/components/mapa-modal-stack.svelte.ts`
- `src/routes/+page.svelte`

**Reportes en `.claude/agent-reports/20260519-revision-steps-wizards/`:**
- `mapa.md` — mapa estructural de campos por wizard y qué alimenta el grafo (Explore).
- `implementacion.md` — log detallado de cambios por archivo (implementer agent).

---

## Sesión 35 (2026-05-19) — T-3.it5 cerrada + it.5 cerrada con tag `v0.5-it5`

**Hecho — T-3.it5 (stats chip de la semana) cerrada y aplicado tag `v0.5-it5` con bump de versión 0.4.1 → 0.5.0. Iteración 5 completa.**

**T-3.it5 (commit `aaff495`):**
- `statsSemana` derived en home: cuenta sesiones entre lunes y domingo de la semana en curso y suma sus rolls. Sin queries nuevas a BD — filter sobre `sesiones` ya cargadas.
- Render como `<p>` discreto encima del MonthCalendar: `"N sesiones · M rolls esta semana"` (plural correcto). Oculto si `statsSemana.sesiones === 0`.
- "Esta semana" = Lun–Dom, no rolling 7 days.

**Cierre de it.5:**
- Tag `v0.5-it5` aplicado.
- Bump de versión `0.4.1 → 0.5.0` en `package.json`. Minor — la iteración introduce cambios funcionales visibles en la pantalla más importante de la app (home).
- 4 tareas formalizadas:
  - T-1 (MonthCalendar scroll-driven + reorganización home).
  - T-2 (markers en calendario).
  - T-3 (stats chip de la semana).
  - T-4 (AnalisisHome, código construido sin montar, esperando it.6).
- Fix adicional en s34 (`0805fa6`): persistencia de `diaSeleccionado` en sessionStorage — resolvió bug del reset al volver de /sesion/[id].

**Resumen meta — qué nos llevamos de it.5:**
- **Home rediseñada de lista plana a dashboard con calendario:** el user ve la semana de un vistazo, selecciona un día, ve sus sesiones; tiene contexto temporal en chip arriba. Cambio cualitativo de UX en la pantalla más visitada.
- **Patrón `scroll-driven compactation`** documentado: 3 capas anti-loop (overflow-anchor:none + hysteresis + lockout temporal). Reusable si otra pantalla necesita un header sticky que se compacta.
- **Patrón "componente construido, sin montar"** consolidado: T-4 cerrada con código presente pero desconectado, esperando otra iteración. Misma lógica que T-2.it4 (componente ya existía); aquí el componente se construye proactivamente para reusar después.
- **Lecciones sparring** acumuladas durante T-1 (5 versiones distintas con pivots seguidos del owner) y sesión 33 ("no preguntar confirmaciones vacías"). Guardadas en memoria del proyecto.

**Próximo paso concreto:**
- Decidir próxima iteración o pausar. Candidatos prioritarios (orden de afinidad expresada): modo hobbyist vs avanzado (con conexión de AnalisisHome), reducir copy en pantallas, sugerencia automática de compañero.

---

## Sesión 34 (2026-05-19) — T-4.it5 cerrada (diferida a it.6) + fix sessionStorage de fecha

**Hecho — T-4.it5 cerrada con cambio de scope (componente construido pero no montado, diferido a it.6 modo hobbyist/avanzado) + fix de bug reportado durante la sesión: `diaSeleccionado` se reseteaba a hoy al volver de /sesion/[id].**

**T-4.it5 (commit `b7cf755`):**
- Nuevo `src/lib/components/AnalisisHome.svelte` (~109 líneas): versión compacta del AnalisisPanel — solo C1 (problemas recurrentes), top 3 posiciones + top 3 técnicas, ventana fija de 5 sesiones.
- **NO montado en home.** Decisión owner: "no lo pongas, o esconderlo bajo un ajuste de Modo Hobbyist vs Análisis". Como el toggle es feature de it.6 (existe en backlog), se difiere la integración. El componente queda construido y listo para conectar.
- Razón rechazo del approach inline: implementar el toggle hobbyist/avanzado en it.5 sería scope creep significativo (toca settings, persistencia, branching en múltiples pantallas).
- `MEJORAS_FUTURAS.md §Modo hobbyist vs avanzado` actualizado para anotar el "activo construido" listo para reusar.

**Fix bug `diaSeleccionado` (commit `0805fa6`):**
- Reportado por owner: al entrar a una sesión desde un día no-hoy y volver con back, el calendario se reseteaba a hoy.
- Causa: `let diaSeleccionado = $state(todayIso())` se reinicializaba en cada mount del componente home (SvelteKit remonta al volver).
- Fix: persistir en sessionStorage (clave `home:diaSeleccionado`). En onMount, restaurar si hay valor válido. Flag `initialized` evita que el `$effect` de persistencia escriba el default sobre el valor stored antes de que onMount restaure.
- sessionStorage (no localStorage): el día solo persiste durante la sesión actual del tab. Al cerrar tab y volver un día distinto, default a hoy. Preserva el comportamiento "abrir app día nuevo → hoy" sin que back rompa selección.

**Lección — diferir features con código ya construido:** misma conclusión que T-2.it4 (feature ya existía) en variante distinta: una tarea puede cerrarse con código construido pero sin exponerlo en UI si la exposición depende de otra feature aún no implementada. Documentar bien la razón.

**Validación:**
- `pnpm check` 1056/0/0 tras los dos commits.
- Visual owner OK ("perfect") tras el fix de fecha.

**Próximo paso concreto:**
- Arrancar **T-3.it5** — stats chip arriba ("3 sesiones · 12 rolls" de la semana en curso). Última tarea de it.5. Tras cerrarla, aplicar tag `v0.5-it5` + bump 0.4.1 → 0.5.0.

---

## Sesión 33 (2026-05-19) — T-2.it5 cerrada (markers) + fix UX scroll de T-1

**Hecho — T-2.it5 cerrada con cambio mínimo en home (4 líneas) + fix UX en T-1 (threshold de expansión bajado de 50 a 5 para crear "tensión" antes de expandir).**

**T-2.it5 (commit `d09157d`):**
- `const diasConSesion = $derived(new Set(sesiones.map((s) => s.fecha)));` en home.
- Pasado como prop `markers` al `MonthCalendar`. El slot del marker (punto bajo el día) ya existía en T-1.
- Reactivo: el Set se recomputa al crear/eliminar sesiones.

**Fix UX de T-1 (commit `fe41907`):**
- Owner reportó que al scrollear arriba con el calendario compacto, este expandía demasiado pronto — antes de que el primer card de sesión llegara al top.
- Hysteresis bajada: `compact = false` cuando `scrollY < 5` (antes 50). El threshold de activación se mantiene en `> 100`.
- Resultado: el card llega al top, se queda visible debajo del calendario compacto. Solo cuando el user "tira" hasta el top absoluto (scrollY < 5), el calendario expande. Sensación de "tensión" intencional.

**Validación:**
- `pnpm check` 1055/0/0.
- Visual owner OK ("perfecto" para markers + "perfecto" tras fix de threshold).

**Próximo paso concreto:**
- Arrancar **T-4.it5** — insights simplificados en home. Antes que T-3 (stats chip) según orden acordado en s31 (los insights consumen más espacio visual y conviene definirlos en contexto del layout). Pendiente revisar `AnalisisPanel.svelte` para decidir qué insights priorizar (2-3) y si extraer un componente compacto vs reusar el existente.

---

## Sesión 32 (2026-05-19) — T-1.it5 cerrada tras pivot semanal→mensual scroll-driven

**Hecho — T-1.it5 cerrada (commit `cd4583a`). El plan original de "calendario semanal" se reescribió a "mensual con compactación scroll-driven" tras feedback del owner sobre el primer prototipo. Plan formal ITERACION_5.md actualizado a v2.0 con las decisiones revisadas.**

**Cronología del pivot dentro de T-1:**
1. Prototipo inicial: `WeeklyCalendar.svelte` (7 días, semana actual). Owner pidió mensual.
2. Refactor a `MonthCalendar.svelte` con toggle click compact (mes ↔ semana). Owner clarificó "no transformación a semana, solo se hace pequeño" + "compactar al scrollear, no al click".
3. Refactor a scroll-driven con sentinel + IntersectionObserver. Funcionó pero loop por scroll anchoring del browser.
4. Refactor a scroll listener directo. Funcionó pero loop por jitter de scrollY durante la transición CSS.
5. Versión final: **3 capas anti-loop combinadas** — `overflow-anchor:none` en main + hysteresis 50/100 + lockout temporal 250ms. Estable.

**Decisiones de producto cerradas en s32 (revisaron las de s31):**
- Mensual (no semanal).
- Scroll-driven (no click-driven).
- Mes completo siempre — compactación reduce cells, oculta weekday headers + botón Hoy, pero NO elimina filas.
- Botón "Hoy" visible solo en expanded (resuelve colateralmente el bug "Hoy reseteaba a tamaño normal" observado en s32).
- Resto de decisiones de s31 mantenidas (markers como punto simple, día vacío con placeholder + FAB, mobile-first).

**Implementación (commit `cd4583a`):**
- `src/lib/components/MonthCalendar.svelte` (nuevo, ~230 líneas).
- `src/routes/+page.svelte`: `diaSeleccionado` state, sesiones filtradas, MonthCalendar + sección filtrada, `min-h-[calc(100vh+200px)]` + `[overflow-anchor:none]`.
- `src/lib/components/SesionEditor.svelte`: prop `defaultFecha?` (pisa today al abrir).

**Decisión técnica notable — bits-ui Calendar descartado.** Disponible y validado primero (regla del proyecto). No encaja para compactación scroll-driven y customización fina. Construir custom con `@internationalized/date` (lib que bits-ui usa internamente) da control completo. Documentado en el plan.

**Lección — varios pivots dentro de la misma tarea.** T-1 tuvo 5 versiones distintas antes del OK final. Sparring note futuro: en tareas con componentes UI visuales y feedback iterativo, conviene prototipar más rápido (con stubs o mockups) antes de pulir transiciones y estados anti-loop. La inversión en "scroll-driven robusto" (3 capas anti-loop) llegó solo al final, tras descartar el approach inicial.

**Validación:**
- `pnpm check` 1055/0/0.
- Visual owner OK ("perfecto").

**Próximo paso concreto:**
- Arrancar **T-2.it5** — markers en calendario (computar `Set<string>` de fechas con sesión desde home, pasarlo como prop al MonthCalendar; el slot ya existe en T-1).

---

## Sesión 31 (2026-05-19) — Apertura it.5 con plan formal (doc-coauthoring)

**Hecho — Iteración 5 "Rediseño de home (calendario + dashboard)" abierta con plan formal en `ITERACION_5.md`. Plan co-redactado vía skill `doc-coauthoring` y validado por reader test con sub-agente sin contexto.**

**Decisiones de producto cerradas (todas en esta sesión):**
- **Vista del calendario:** semanal (no mensual). Mensual sigue en backlog.
- **Tamaño en home:** panel grande arriba.
- **Tap día:** la sección inferior se filtra mostrando las sesiones de ese día seleccionado. Día default = hoy.
- **Día sin sesión:** placeholder discreto + FAB visible. Sin CTA grande.
- **Markers:** punto simple bajo días con sesión. Sin variantes por tipo ni count.
- **Navegación calendario:** botones ← →, swipe horizontal en móvil, botón "Hoy".
- **Layout:** dashboard con secciones modulares (no "lista de sesiones + calendario añadido").
- **Mobile-first.**
- **Sin uso real como criterio de cierre.** 4 tareas + tag = cierre.

**Scope final (4 tareas):**
- T-1.it5 (pilar) — WeeklyCalendar + reorganización del home en dos secciones.
- T-2.it5 — markers en calendario.
- T-3.it5 — stats chip arriba ("3 sesiones · 12 rolls").
- T-4.it5 — insights simplificados en home (versión reducida de `AnalisisPanel`).

**Orden:** T-1 → T-2 → T-4 → T-3.

**Reader test (doc-coauthoring Stage 3):** sub-agente Explore sin contexto del proyecto leyó el plan y respondió 8 preguntas predichas + checks de ambigüedad. Resultado: doc accionable; detectó 2 gaps menores que se corrigieron antes de cerrar el plan:
1. Caso "app totalmente vacía" (sin ninguna sesión jamás) no estaba documentado — añadido bloque explícito.
2. `CU-1` usado sin glosar — añadida referencia a `REQUISITOS.md §2`.

**Sparring note nueva (memoria):** owner observó que estaba pidiendo "confirmaciones vacías" (preguntar "¿procedo?" tras un OK ya dado). Regla guardada: tras OK explícito sobre un plan, ejecutar los pasos evidentes sin re-confirmar. Reservar preguntas para info nueva o decisiones reales.

**Backlog:**
- Entrada "Rediseño de home — calendario + agrupamiento de sesiones" tachada como **promovida a it.5** (con notas — el agrupamiento ya entró en T-5.it4; el resto entra ahora).

**Próximo paso concreto:**
- Arrancar **T-1.it5** — investigar si `bits-ui Calendar` encaja para la vista semanal o hay que construir custom; refactor home con la nueva estructura.

---

## Sesión 30 (2026-05-19) — T-4.it4 cerrada + it.4 cerrada con tag `v0.4.1-it4`

**Hecho — T-4.it4 (auditoría tokens semánticos) cerrada sin código: el barrido confirmó 0 hits de Tailwind crudo en `src/`. It.4 completa cerrada con tag `v0.4.1-it4` y bump de versión 0.4.0 → 0.4.1.**

**Auditoría T-4.it4 (resultado):**
- Grep exhaustivo en `src/` (excluyendo `src/lib/components/ui/*`) buscando:
  - `{bg|text|border|ring|from|to|via|fill|stroke|outline|divide|placeholder|caret|accent|shadow}-{color-tailwind}-{shade}` con o sin opacity.
  - Arbitrary values `bg-[...]`, `text-[...]`, etc.
  - `bg-white`, `text-black`.
- **0 hits de colores Tailwind crudos.** La regla del proyecto se respeta literalmente en todo el código propio.
- Hallazgo lateral: 2 shadows con `rgba(0,0,0,X)` inline en BottomNav y AppHeader. NO violan la regla literal (no son `bg-color-shade`). Decisión del owner: anotar como mejora futura, no promover a T-4 (sería scope creep).

**Cierre de it.4:**
- Tag `v0.4.1-it4` aplicado.
- Bump de versión: `0.4.0` → `0.4.1` en `package.json` (patch, coherente con el "es pulido sin features funcionales mayores" — aunque T-5 introdujo agrupamiento en home, que es funcional, el peso global de la iteración sigue siendo pulido).
- 5 tareas formalizadas: T-1 (long-press → modo edición), T-3 (orden /rolls), T-5 (home con headers), T-2 (combobox compañero — ya estaba), T-4 (auditoría tokens — ya cumplida).
- 3 con código nuevo; 2 sin código (validación documental).

**Resumen meta — qué nos llevamos de it.4:**
- **Patrón "modo edición vs navegación"** para canvases interactivos (Cytoscape): tap silenciado en navegación + grabbable en edición. Reusable en otros canvases si emergen.
- **Helper compartido `src/lib/day-headers.ts`** para agrupamiento por día con headers Hoy/Ayer/fecha. Usable por cualquier vista que liste registros con `fecha` ISO.
- **Sparring note "revisar backlog vs código antes de promover tareas"**. Aplicar al planificar it.5: leer el código actual contra cada entrada candidata.
- **Sparring note "pivot organizado vs scope creep"**. Cuando una idea grande quiere colarse, identificar la pieza más pequeña accionable y dejar el resto fuera (opción B del s27).

**Próximo paso concreto:**
- Decidir si arrancar it.5 ya o pausar. Candidatos prioritarios discutidos durante it.4 (en orden de afinidad expresada): rediseño completo de home (calendario + visión general), modo hobbyist vs avanzado.

---

## Sesión 29 (2026-05-19) — T-2.it4 cerrada sin código (feature ya existía)

**Hecho — T-2.it4 (combobox compañero en RollEditor) marcada ✅ tras descubrir que la feature ya estaba implementada antes de ser promovida a it.4. Cero código nuevo; solo limpieza documental.**

**Hallazgo:** al arrancar la fase Plan de T-2 (`grep companero src/lib/components/RollEditor.svelte` + listado de componentes), apareció `src/lib/components/CompaneroCombobox.svelte` — un componente que:
- Filtra `companeros` por `query` en vivo (`$derived` `filtered`).
- Muestra opción `+ Crear nuevo: "<query>"` cuando no hay match exacto (`showCreate`).
- Dispara `onCreate(nombre)` sin abrir modal externo.
- Está integrado en `RollEditor.svelte:689-694` en el step 1 "¿Con quién?".

Esto cubre literalmente la Parte B del backlog "Roll editor — sugerir compañero por defecto + selector inteligente". Probablemente se construyó en T-10 o T-11 (it.1) y nadie volvió a tachar la entrada del backlog.

**Lección documentada como sparring note:** revisar el código actual contra cada entrada del backlog antes de promoverla a una iteración. La formalización de it.4 (s26) hubiera detectado esto si se hubiera verificado contra el repo en lugar de tirar del backlog crudo. Coste: ~5 min de investigación previa habrían evitado promover una tarea fantasma.

**Backlog actualizado:**
- La entrada "Roll editor — sugerir compañero por defecto + selector inteligente" se reescribió: Parte B marcada como HECHA con referencia a `CompaneroCombobox.svelte`; Parte A (sugerencia automática) sigue activa como diferida a futura iteración de captura.

**Validación:**
- Sin cambios en código → `pnpm check` queda como en s28 (1054/0/0).
- Validación visual no requerida explícitamente por el owner; se confía en la lectura de código del componente como evidencia.

**Próximo paso concreto:**
- Arrancar **T-4.it4** — auditoría tokens semánticos en `src/`. Última tarea de it.4. Tras cerrarla, aplicar tag `v0.4.1-it4` y cerrar iteración.

---

## Sesión 28 (2026-05-19) — T-5.it4 cerrada — home con headers por día

**Hecho — T-5.it4 implementada y validada visualmente en un solo paso (commit `0d50b00`). Home pasa de lista plana a agrupada por día con headers "Hoy" / "Ayer" / fecha formateada.**

**Decisiones de producto cerradas pre-implementación:**
- **Formato de fecha con año** (`lun, 12 may 2026`) en lugar del `lun, 12 may` previo de home. Consistencia con `/rolls` + permite distinguir sesiones de años anteriores en uso prolongado.
- **Extraer helper** (`src/lib/day-headers.ts`) en lugar de duplicar. Dos consumidores reales (`/rolls` y home), ~15 líneas de lógica — DRY justificado.

**Cambio de UI emergente (no estaba explícito en el plan de T-5):**
- En el card de home se eliminó la fecha (`formatFecha(s.fecha)`) porque ahora la comunica el header del grupo, y se promocionó el tipo de sesión (`BJJ` / `Grappling` / `Open mat`) a la posición principal del card. Es consistente con el principio que el owner anotó hace minutos ("Reducir copy / texto inicial en cada pantalla"): si la info ya está visible por otro vector, eliminarla del segundo punto.

**Refactor incidental:**
- `/rolls/+page.svelte` perdió ~30 líneas duplicadas (las funciones `todayIso`, `yesterdayIso`, `headerFmt`, `dayHeaderLabel` se movieron al helper). Sin cambio visual ni funcional en `/rolls`.

**Validación:**
- `pnpm check` 1054/0/0.
- Verificación visual del owner OK: headers correctos en bloques Hoy / Ayer / días previos; card sin fecha se entiende; tap sesión → detalle sigue funcionando.

**Próximo paso concreto:**
- Arrancar **T-2.it4** — combobox compañero en RollEditor (solo Parte B del backlog: combobox autocompletado + opción "Crear como nuevo compañero" inline si no hay match). Reusar `Combobox.svelte` propio (existente desde T-10).

---

## Sesión 27 (2026-05-19) — T-3 cerrada + pivot organizado a home (opción B)

**Hecho — T-3.it4 cerrada con validación visual + T-5.it4 promovida desde backlog como pieza concreta del rediseño de home. Plan it.4 re-formalizado a v1.1 con orden T-5 → T-2 → T-4.**

**Contexto:** dentro de la misma jornada (s26 → s27), tras cerrar T-3 el owner pidió pivotar al rediseño de home (anotado en backlog hace minutos). Yo señalé que entra en colisión con la formalización recién hecha y propuse 4 opciones (A: respetar plan; B: promover una pieza concreta; C: pausar it.4; D: abandonar plan). Eligió B.

**Decisiones tomadas (s27):**
- **T-3.it4 ✅ cerrada** con orden `s.fecha DESC, r.created_at DESC` (commit `90aa1a7`). Decisión pre-implementación: Opción B del análisis (mantener `s.fecha` como criterio primario) en lugar de la Opción A literal del backlog, que habría duplicado headers de día.
- **T-5.it4 promovida**: "Agrupar sesiones en home con headers por día (patrón `/rolls`)". El resto del paraguas "Rediseño de home" (calendario + visión general) queda en backlog para it.5.
- **Orden de ejecución it.4:** T-5 → T-2 → T-4.
- **Criterio de cierre actualizado**: ahora son 5 tareas, no 4. Tag `v0.4.1-it4` sin cambio.

**Backlog actualizado (sesiones 26-27):**
- Nueva entrada: "Reducir copy/texto inicial en cada pantalla" con `/rolls` como ancla concreta (4 puntos detectados: labels de chip-picker read-only, sub-labels de categoría en filtro Posición, contador "N roll(s)", labels redundantes en Selects).
- Nueva entrada paraguas: "Rediseño de home" (calendario + agrupamiento + visión general). El agrupamiento por día queda promovido a T-5.it4; calendario y visión general siguen en backlog.
- Nueva entrada: "Modo hobbyist vs avanzado" — dos perfiles de uso para reducir fricción de captura. Lleva investigación pendiente de auditoría de qué datos alimentan el grafo (NO ahora).
- Limpieza: entrada "Long-press para activar drag de nodos" marcada como HECHA con referencia a T-1.it4 (resuelta con solución distinta — modo edición).

**Validación T-3.it4:**
- `pnpm check` 1053/0/0.
- Verificación visual del owner OK: dentro del bloque "Hoy", el último roll capturado aparece arriba; headers de día siguen agrupando bien; filtros siguen funcionando.

**Sparring note (por qué importa el pivot organizado):**
El owner intentó pivotar al rediseño de home 30 minutos después de formalizar it.4 con scope congelado, y 10 minutos después de anotar en el backlog que el rediseño "no encaja en tarea de pulido suelta, conviene plan formal en it.5". Era scope creep clásico. La opción B (promover una pieza concreta) salva el activo de la formalización sin frustrar el deseo de tocar home ya. Lección para futuro: cuando una idea grande quiere colarse en una iteración cerrada, identificar la pieza más pequeña accionable y dejar el resto fuera.

**Próximo paso concreto:**
- Arrancar T-5.it4: investigar `src/routes/+page.svelte`, decidir si extraer `dayHeaderLabel` + agrupador de `/rolls/+page.svelte` a util compartido (`src/lib/date-headers.ts` o similar) o duplicar.
- Aplicar el patrón a la lista de sesiones de home. Validación visual del owner antes de cerrar.

---

## Sesión 26 (2026-05-19) — formalización y renombrado de it.4

**Hecho — it.4 pasa de "scope libre desde backlog" a iteración formal con plan, nombre y criterio de cierre.**

**Contexto:** s25 dejó it.4 abierta sin plan, con un único entregable (T-1.it4) y una lista informal de candidatos del backlog. El owner pidió formalizar antes de seguir.

**Decisiones de producto (confirmadas vía AskUserQuestion):**
- **Nombre:** "Pulido post-grafo y consistencia UX". Refleja origen (post-it.3) + hilo conductor (consistencia, no funcionalidad nueva).
- **Scope final** (4 tareas):
  - T-1.it4 ✅ — long-press → modo edición en grafo + UX móvil del grafo.
  - T-2.it4 — combobox compañero en RollEditor (solo Parte B del backlog: combobox + crear inline; la Parte A — sugerencia automática — se difiere).
  - T-3.it4 — orden `/rolls` por `created_at DESC`.
  - T-4.it4 — auditoría de tokens semánticos en `src/`.
- **Fuera (diferido a backlog):** tab Sumisiones en `/mapa`, botón "Forzar actualización" en `/ajustes`, sugerencia automática de compañero, bump a Node 24 en workflow.
- **Tag de cierre:** `v0.4.1-it4` (patch, no minor — pulido sin features nuevas).
- **Sin "captura de N sesiones reales"** como criterio de cierre; las 4 tareas son auto-verificables.

**Renumeración / alineación con REQUISITOS:**
- La "it.4 = Móvil" original de REQUISITOS §6 quedó fusionada en iteraciones previas: export/import JSON entregado en it.0; móvil del mapa edita desde decisión de s6 (2026-05-13). Nota explícita añadida en REQUISITOS §6 documentándolo.
- Numeración conservada (sigue siendo it.4); cambia solo el contenido y el nombre.

**Artefactos creados/modificados (todavía sin commit, pendiente OK):**
- `.claude/ITERACION_4.md` (nuevo) — plan formal con objetivo, scope, criterio, T-1.it4 marcada cerrada, orden sugerido de ejecución para T-2/T-3/T-4.
- `.claude/REQUISITOS.md` §6 — entrada de it.4 reescrita con nuevo nombre + nota sobre fusión del móvil original.
- `.claude/ESTADO_ACTUAL.md` (este fichero) — header + esta sesión.

**Próximo paso concreto:**
- OK explícito del owner sobre el plan → commit `docs(it-4): formalizar y renombrar iteración 4` agrupando los 3 cambios.
- Tras el commit, elegir entre T-3.it4 (más pequeña, recomendada como recalibrado), T-2.it4 (medio) o T-4.it4 (mecánica pero extensa).

---

## Sesión 25 (2026-05-19)

**Hecho — T-1.it4 cerrada con rework completo del approach (commit `4cbacae`) + 3 mejoras UX del grafo en móvil. Push a `origin/main` aprobado tras validación visual del owner.**

**Contexto:** sesión arrancada con la rama `claude/continue-work-rVl5W` que llevaba la T-1.it4 del subagente (sesión 24, commits `93baea6` + `e135cab`). Fast-forward a `main` "a ciegas" por decisión del owner; validación visual posterior detectó dos bugs distintos que llevaron a reescribir el approach.

**Decisiones técnicas tomadas (con evidencia del bundle de Cytoscape):**

1. **El long-press a base de toggling `grabify` durante un touch NO es viable con Cytoscape.** `r.dragData.touchDragEles` se inicializa SOLO en `touchstart` (si el nodo era grabbable en ese momento) y no se reevalúa después. Si nosotros cambiamos `grabify` a mitad del touch (vía taphold o setTimeout), Cytoscape sí ve el nodo como draggable en `touchmove` pero `touchDragEles` sigue `undefined` → `addNodesToDrag(undefined, …)` → `TypeError: Cannot read properties of undefined (reading 'cy')` (`cytoscape.esm.mjs:25723` llamada desde `:27057`).

2. **`pannable` y `grabbable` son mutuamente excluyentes en Cytoscape**: el override `grabbable` fuerza `false` cuando `pannable` está activo (`cytoscape.esm.mjs:13757`: `return ele.cy().autoungrabify() || ele.pannable() ? false : undefined;`). Por eso `grabify()` no surte efecto sobre un nodo `panify`. El toggle debe ir en pareja.

3. **`tapholdDuration` de Cytoscape está hardcoded a 500 ms** (`cytoscape.esm.mjs:28095`). No se expone al constructor.

4. **`pannable` NO es propiedad de stylesheet**, es un flag del elemento expuesto via API `panify()` / `unpanify()` (una sola `n`).

5. **`$effect` de Svelte 5 con early return**: si la primera ejecución hace `if (!cy) return;` antes de leer una prop reactiva, Svelte solo registra `cy` (que no es `$state`) como dep → el effect nunca se re-evalúa cuando la prop cambia. Fix: leer la prop al principio (`const isEditing = editing;`) antes del early return.

**Solución (commit `4cbacae`) — T-1.it4 reescrita como modo edición:**
- Prop bindable `editing` en `GrafoMapa.svelte` + botón "Mover nodos" en el sub-header de `/mapa` (variant `outline` ↔ `default` según estado).
- Modo navegación (default): nodos `panify + ungrabify` → tap abre modal, drag desde nodo pannea canvas.
- Modo edición: nodos `unpanify + grabify` → tap silenciado (no abre modal para no chocar con drag), drag mueve el nodo y marca `dirty` (botón "Guardar organización" aparece, igual flujo que pre-it.4).
- Eliminado todo el código del taphold: `armedNode`, `armTimer`, `cancelArmTimer`, `disarmCurrentNode`, `suppressNextTap`, los listeners globales `tapdrag`/`tapend`, el selector de stylesheet `node.drag-armed`. La feature "feedback visual al armar" desaparece — ya no aplica con el patrón nuevo.

**UX del grafo en móvil (mismo commit):**
- Grafo llega al bottom nav: en `/mapa/+page.svelte:690`, wrapper a `-mx-4 -mb-28 h-[calc(100dvh-13rem)] sm:mx-0 sm:mb-0 sm:h-[70vh]`. `-mb-28` cancela el `pb-28` del `<main>`. Border y rounded solo en `sm:` y arriba (en móvil de borde a borde).
- `panToEntity` (`GrafoMapa.svelte:538-`) mide el drawer real del DOM (`document.querySelector('[data-slot="sheet-content"][data-side="..."]').getBoundingClientRect()`) en lugar de asumir 50% del contenedor. Auto-calibrado si se cambia el tamaño del drawer.
- `BottomNav.svelte:42`: sombra `0_-2px_4px_rgba(0,0,0,0.04)` → `0_-2px_8px_rgba(0,0,0,0.18)`. Aplica a todas las pantallas; el motivo de tocarla es que sobre fondos oscuros (el grafo dark) un alpha de 4% se perdía por completo. Mejora general de definición.

**Reglas de proceso clarificadas (memoria + `CONTEXTO_AGENTE.md`):**
- Actualizar `ESTADO_ACTUAL.md` es parte del flujo de push, no algo separado. Cada push deja el doc al día.

**Validación técnica:**
- `pnpm check` → 1053 ficheros, 0/0 errores/warnings.
- Validación visual: owner confirmó modo navegación + modo edición + pan desde nodo OK.

**Próximo paso concreto:**
- Decidir siguiente tarea de it.4 desde el backlog (`MEJORAS_FUTURAS.md`). Candidatos discutidos en s24: combobox compañero en RollEditor, tab Sumisiones en `/mapa`, orden `/rolls` por `created_at DESC`, tokens semánticos en componentes propios, botón "Forzar actualización" en `/ajustes`, Node 24 en workflow (requiere abrir fichero prohibido).

---

## Sesión 24 (2026-05-18, noche) — implementación inicial T-1.it4, reescrita en s25

**Hecho — T-1.it4 implementada en 1 commit (`93baea6`) por subagente en cloud; pendiente validación visual del owner en local antes de cerrar. APPROACH DESCARTADO: la sesión 25 confirmó que no es viable con Cytoscape (ver decisiones técnicas s25, puntos 1-2). Lo que sigue queda como histórico de qué se intentó y por qué.**

**Contexto:** sesión arrancada justo tras cerrar it.3 (tag `v0.4-it3`). No se redactó plan formal de it.4: se decidió tarea-a-tarea desde el backlog. El owner eligió empezar por la entrada anotada en s23 — "Long-press para activar el drag de nodos en el grafo" (`MEJORAS_FUTURAS.md` §UX).

**Decisiones de producto cerradas al inicio (T-1.it4):**
- Umbral del long-press: **350 ms** (punto medio entre la estimación inicial de 250 ms y el default de Cytoscape de 500 ms). Sensación de "press deliberado" sin frustrar.
- Feedback visual al armar: **borde 4 px + escala +10 %** del nodo. Anuncia "ya puedes arrastrar" sin animación de pulso.
- Feedback háptico: **`navigator.vibrate(20)`** al armar (no-op silencioso en desktop / iOS sin permiso).
- Aplicabilidad: **mismo umbral en desktop y táctil**. Consistencia + simplifica el código frente a bifurcar por `pointerType`.

**T-1.it4 (commit `93baea6`):** long-press para drag de nodos en grafo.
- `GrafoMapa.svelte`: nodos en `ungrabify` por defecto al mount; listener `'add', 'node'` mantiene el estado para nodos añadidos posteriormente (tras refresh del catálogo vía el `$effect` que reemplaza elements).
- Estado local: `armTimer`, `armedNode`, `ARM_DURATION_MS = 350`. Helpers `cancelArmTimer()` / `disarmCurrentNode()`.
- Handlers nuevos:
  - `tapstart 'node'`: arranca timer 350 ms; al disparar arma el nodo (`grabbify()` + clase `drag-armed` + `navigator.vibrate(20)`).
  - `tapdrag` global: cancela el timer si el usuario se mueve antes del umbral → el touch acaba siendo pan del canvas (resuelve el drag accidental al hacer scroll iniciado sobre un nodo).
  - `tapend` global: cancela timer + desarma (idempotente con `dragfree`).
- `dragfree 'node'` (existente): se añade `disarmCurrentNode()` al final, tras volcar al cache y marcar dirty.
- Stylesheet: selector `node.drag-armed` con `border-width: 4` + `width/height: mapData(degree, 0, 8, 30.8, 70.4)` (los mismos rangos base 28-64 ×1.1, hardcoded porque Cytoscape no permite multiplicar `mapData` inline).
- `onDestroy`: cancela timer + nulea `armedNode` antes de destruir Cytoscape.

**No se usa el evento nativo `taphold` de Cytoscape** porque `r.tapholdDuration` está hardcoded a 500 ms en el renderer (`node_modules/cytoscape/src/extensions/renderer/base/index.mjs:103`) y no se expone como opción pública del constructor. Replicar el patrón con `tapstart` + `tapdrag` + `tapend` da control sobre el umbral sin tocar internals.

**Comportamiento resultante** (a validar en local):
- Tap rápido en nodo → abre modal (igual que antes).
- Press <350 ms y soltar sin moverse → abre modal.
- Press <350 ms + mover → pan del canvas. **Antes:** arrastraba el nodo accidentalmente. **Ahora:** pan limpio.
- Press ≥350 ms quieto → vibración + nodo crece +10 % con borde reforzado → al mover arrastra; al soltar marca dirty (igual flujo que pre-it.4 para Guardar/Reorganizar).
- Press ≥350 ms y soltar sin mover → cleanup silencioso. No abre modal, no marca dirty.

**Validación técnica:**
- `pnpm check` → 1052 ficheros, 0/0 errores/warnings.
- `pnpm test:unit` → 13/13 tests reales pasando (`grafo.spec.ts` 12/12 intactos; el fallo de `Welcome.svelte.spec.ts` por Playwright browser sin instalar es preexistente y se ignora, igual que en sesiones previas).
- `pnpm build` → 8.81 s, sin warnings nuevos.
- **Validación visual: pendiente.** La sesión se desarrolló en el contenedor cloud (Claude Code on the web) sin acceso a navegador del owner. Regla del proyecto (`CONTEXTO_AGENTE.md`): no testar automatizado sin consentimiento explícito.

**Próximo paso concreto (al continuar en local):**
1. `git pull origin claude/continue-work-rVl5W` + `pnpm install` por si cambió algo.
2. `pnpm dev`, abrir `/mapa` en vista Grafo (default), validar los 5 comportamientos listados arriba en táctil (móvil real o devtools touch emulator) y en desktop.
3. Si sensación OK → commit `docs(it-4): cerrar sesión 24 — T-1.it4 validada` actualizando este fichero con resultado de la validación.
4. Si hay que ajustar (umbral, intensidad visual, vibración) → commit nuevo con el ajuste antes del `docs(...)`.
5. Decidir siguiente tarea de it.4 desde el backlog. Candidatos discutidos al inicio de la sesión: combobox compañero en RollEditor, tab Sumisiones en `/mapa`, orden `/rolls` por `created_at DESC`, tokens semánticos en componentes propios, botón "Forzar actualización" en `/ajustes`, Node 24 en workflow (requiere abrir fichero prohibido).

---

## Sesión 23 (2026-05-18, tarde)

**Hecho — T-9.it3 (a+b), T-10.it3 y T-10.it3.a cerradas en 4 commits.**

**Decisiones de producto cerradas al inicio de la sesión (T-9):**
- Modelo de tabla: `grafo_layout(entidad_id TEXT, kind TEXT CHECK in ('posicion','sumision'), x REAL, y REAL, PRIMARY KEY (entidad_id, kind))`. Tabla única sin FK (apunta a dos tablas distintas según `kind`).
- Limpieza de huérfanos: manual en TS dentro de `deletePosicion()` / `deleteSumision()` (no triggers, no cascade).
- Layout sí viaja en export/import JSON (`sync.ts` bumpa schema version 4→5).
- "Reorganizar" corre fcose completo sobre todos los nodos (ignora layout guardado); vista previa temporal hasta Guardar.
- Drag con dirty explícito + botón "Guardar organización" visible solo si dirty; nada persiste sin pulsar Guardar.
- Auto-dirty al cargar si hay nodos sin layout en BD (típico: posición creada en otra máquina + importada).
- F5 con dirty pendiente NO se intercepta (coherente con wizards del proyecto).

**Decisiones de producto cerradas para T-10:**
- Pan animado al cambiar el top del modal stack: solo pan, zoom intacto.
- Re-pan en cada cambio del top (push, pop, salto entre entidades).
- Técnica = arista → pan al midpoint entre source y target.
- Cerrar el modal entero (stack vacío) → no hacer nada (el grafo se queda donde estaba).
- Wizards (`wizard-*`) NO disparan pan (no son navegación entre entidades).

**T-9.a.it3 (commit `c674569`):** DB layer del layout del grafo.
- `SCHEMA_V5_MIGRATION` en `db/schema.ts` con la tabla `grafo_layout`. Migraciones v1-v4 intactas.
- `src/lib/grafo-layout.ts` (nuevo): `getAllLayouts`, `upsertLayouts` (batch BEGIN/COMMIT/ROLLBACK), `deleteLayout`. Tipo público `GrafoLayoutRow` en snake_case por consistencia con el resto del lib (revertí un primer intento del subagente que iba camelCase).
- `deletePosicion` y `deleteSumision` ahora llaman a `deleteLayout` al final.
- `sync.ts`: `CURRENT_SCHEMA_VERSION` 4→5, payload + export + import + validador strict incluyen `grafo_layout`. Layout NO entra en el `countsLine` del toast (plumbing visual, no entidad de negocio — como `roll_posicion`/`roll_tecnica`).

**T-9.b.it3 (commit `c15da2b`):** UI del layout.
- `GrafoMapa.svelte`: prop bindable `dirty`, métodos exportados `saveLayout()` / `reorganize()`, hidratación desde BD en `onMount` (siembra el `positionsCache` antes de instanciar Cytoscape), `dragfree` handler marca dirty + cachea pero NO persiste, fcose con `fixedNodeConstraint` para acomodar nodos nuevos respetando los fijados. Auto-dirty cuando hay nodos sin layout en BD tras hidratar. Flag `initialLoadComplete` silencia `dragfree` durante el settle inicial.
- `/mapa/+page.svelte`: botones "Reorganizar" (siempre en vista grafo) y "Guardar organización" (solo si `grafoDirty`) en la fila 2 del sub-header. AlertDialog "¿Descartar cambios del grafo?" SEPARADO del modal host (decisión defendida en `agent-reports/20260518-t9-it3-layout/ui-layer.md`: 2 diálogos secuenciales por scope vs cambiar la API del host).
- `beforeNavigate` de SvelteKit intercepta navegación BottomNav / back/forward con `grafoDirty=true` → mismo AlertDialog → tras "Descartar" hace `goto(targetUrl)`. `willUnload=true` (F5) NO se intercepta.
- Botón Reorganizar in-canvas (sobreimpuesto al grafo) eliminado; ahora vive en el sub-header.
- `tests/e2e/grafo-layout.e2e.mjs` (script Playwright manual, 10 casos) + `tests/e2e/README.md` + `.gitignore`. Extensión `.e2e.mjs` queda fuera del `testMatch` de `playwright.config.ts` → no entra en CI. `playwright.config.ts` ya existía (vino con el scaffolding, nunca había habido tests).
- `CONTEXTO_AGENTE.md`: regla nueva — "no crear ni ejecutar tests automatizados sin consentimiento explícito" (subagentes y orquestador). Provino de un incidente en esta sesión: un subagente ejecutó un script Playwright propio para validar T-9.b sin pedírmelo a mí ni al owner; los binarios ya estaban en el proyecto, pero el consentimiento no.
- `MEJORAS_FUTURAS.md`: entrada nueva — "Long-press para activar drag de nodos en el grafo" (Adalid 2026-05-18). Drag instantáneo de Cytoscape funciona; revisar tras uso real en móvil.

**T-10.it3 (commit `18e295b`):** sincronización modal↔grafo.
- `GrafoMapa.svelte`: método imperativo `panToEntity(target, presentation)`. Resuelve coordenadas (nodo `pos:`/`sum:` por id; midpoint de la arista para `kind: 'tecnica'`), calcula pan target descontando insets del drawer (50% del ancho en `sheet-side`, 50% del alto en `sheet-bottom`), anima 300ms ease-in-out vía `cy.animate({ pan })`. Zoom intacto. `cy.stop()` antes de animar.
- `/mapa/+page.svelte`: `$effect` que observa `mapaModalStack.top` y la `presentation` derivada; cuando el top cambia (push, pop, salto) llama `panToEntity(...)`. Filtra wizards y `top === undefined`. Bonus: si el dispositivo rota cruzando 768px con un modal abierto, `presentation` cambia y el `$effect` re-corre → re-pan adaptándose al nuevo drawer.
- Firma elegida: `(target, presentation: 'dialog'|'sheet-side'|'sheet-bottom')` en lugar de pasar insets en pixels, porque el contenedor vive dentro del componente (acceso directo a `cy.width()`/`cy.height()`).

**T-10.it3.a (commit `f28313c`):** fix del breadcrumb.
- Bug reportado por Adalid mientras testaba T-10: estando en modal de Posición A, abrir Técnica T (origen A) crea breadcrumb `[A, T]`; click en "Origen A" hacía `push` y dejaba `[A, T, A]` en vez de retroceder a `[A]`.
- Fix unificado: nuevo método `pushOrPopTo(entry)` en `mapa-modal-stack.svelte.ts` — si la entidad destino (mismo `kind`+`id`) ya está en el stack, hace `popTo` en lugar de `push`. Single source of truth para "no duplicar entidades en el breadcrumb; volver a una visitada es retroceder".
- Reemplazos: 5 sitios — `pushPosicion`/`pushSumision`/`pushTecnica` en `TecnicaModalContent.svelte`, `pushTecnica` en `PosicionModalContent.svelte` y `SumisionModalContent.svelte`. **NO se tocan** los `closeAll + push` (`attemptPushModal` de `+page.svelte`, taps del grafo en `GrafoMapa.svelte`) — son salto lateral, no navegación interna; semántica distinta. **NO se tocan** los push de wizards.

**Validación:**
- Cada commit con `pnpm check` 0/0 y 13/13 tests reales.
- T-9.b: validación manual del owner en `pnpm dev` (sub-header, AlertDialog, BottomNav con beforeNavigate).
- T-10: validación manual del owner en `pnpm dev` (pan funciona; el bug del breadcrumb se descubrió aquí y se arregló en T-10.it3.a).
- T-10.it3.a: `pnpm check` 0/0; sin validación visual adicional al cierre por scope contenido del fix.
- 4 commits empujados a origin en 2 lotes (T-9.a + T-9.b + T-10.it3 tras OK del owner; T-10.it3.a aparte).

**Notas de proceso (incidente del subagente Playwright):**
- Un subagente ejecutó un script Playwright propio para validar T-9.b sin pedírmelo a mí ni al owner. Los binarios ya estaban instalados (vienen como dev deps), no añadió nada al `package.json` ni al lockfile, y los artefactos quedaban en `/tmp`.
- Decisiones que se tomaron en consecuencia:
  - Regla nueva en `CONTEXTO_AGENTE.md` (ver arriba).
  - El script se movió a `tests/e2e/grafo-layout.e2e.mjs` con paths parametrizados (`BJJ_E2E_URL`, `BJJ_E2E_OUT`), README de uso y `.gitignore` para `output/`.

**T-11.it3 (commit `4eeeaa7`, tag `v0.4-it3`):** cierre formal de it.3.
- Bump `package.json` 0.3.0 → 0.4.0.
- 5 ADRs nuevos en `.claude/decisiones/` (004-008). ADR-009 (breadcrumb dedup) NO se redactó: regla bien capturada en el comentario de `pushOrPopTo` y en sesión 23 de este fichero; si reaparece en otros contextos, se promociona.
  - 004 — fcose (algoritmo de layout, sesión 20).
  - 005 — lazy-load Cytoscape vía `await import(...)` (sesión 20).
  - 006 — layout grafo siempre-visible + Sheet/Drawer (sesión 22).
  - 007 — sincronización modal↔grafo / pan animado (sesión 23, T-10).
  - 008 — persistencia layout SQLite + dirty + auto-dirty (sesión 23, T-9).
- Tag anotado `v0.4-it3` empujado a origin con `--follow-tags`.

**Iteración 3 cerrada.** Total: 11 tareas, 8 sesiones (s16 a s23), ~26 commits. Funcionalidad principal: vista grafo del mapa técnico con persistencia de layout, sincronización modal↔grafo y UI Sheet/Drawer.

**Próximo paso concreto:**
- Planificar iteración 4. Posibles candidatos en backlog (`MEJORAS_FUTURAS.md`):
  - Long-press para drag en grafo (anotado en s23).
  - Refinamientos de UX heredados de iteraciones previas.
  - Funcionalidad nueva del PoC (consultar REQUISITOS.md y discutir scope con el owner antes de elegir).

---

## Sesión 22 (2026-05-17 → 2026-05-18)

**Hecho — T-8.it3 completa en 3 commits (T-8.a, T-8.b, T-8.c+d).**

**Decisiones de producto cerradas al inicio de la sesión:**
- Codificación visual de nodos: color = tipo+rol, tamaño = degree dinámico (inicialmente; mutó a monocromática durante T-8.c+d).
- Drawer lateral derecho en desktop, drawer inferior `~50dvh` en móvil. Solo en vista Grafo; en vista Lista se mantiene Dialog centrado.
- Sub-header sticky con dos filas (toggle binario Grafo/Lista + fila contextual con sub-toggle o FilterDropdowns).
- Default de `/mapa` = vista Grafo (chasis principal, owner asume el coste de cargar el chunk Cytoscape en la primera visita).
- Tab Sumisiones queda fuera, anotado en `MEJORAS_FUTURAS.md`.
- Color sumisión inicialmente token nuevo `--sumision` púrpura; eliminado al pivotar a paleta monocromática.
- Sheet vía `pnpm dlx shadcn-svelte add sheet` (copia componentes al árbol; bumpa `@lucide/svelte` ^1.14→^1.16, sin dep npm nueva).
- Toggle Grafo/Lista con modal abierto: permitido siempre (drafts de wizard sobreviven al remount).

**T-8.a (commit `2646b22`):** sub-header dos filas + nuevo shape de estado (`vistaActiva` 3-state → `vistaPrincipal` + `subVistaLista`). Solo toca `+page.svelte`.

**T-8.b (commit `5c86862`):** migración Dialog → Sheet/Drawer en `MapaModalHost`:
- Nuevo hook `useMediaQuery` en `src/lib/hooks/use-media.svelte.ts` (~25 LOC, class field con `matchMedia` listener, guard SSR).
- `MapaModalHost` acepta prop `presentation: 'dialog' | 'sheet-side' | 'sheet-bottom'`, padre deriva con `$derived` desde `vistaPrincipal` + breakpoint.
- Snippet `modalContent()` reutilizado entre los tres wrappers; AlertDialog "¿Descartar?" sigue fuera.
- Comportamiento Sheet (descubierto iterando con el owner):
  - Overlay con `pointer-events-none!` (Tailwind v4 `!important`) + transparente → grafo queda visible e interactivo detrás.
  - `preventScroll={false}` → bits-ui no aplica `pointer-events: none` al body (era el bloqueador que impedía clicar grafo/toggle con drawer abierto).
  - `interactOutsideBehavior="ignore"` → click en el grafo NO cierra el drawer.
  - `top-14! bottom-14!` (sheet-side) y `bottom-14!` (sheet-bottom) → drawer no tapa `AppHeader` ni `BottomNav`.
  - X propio dentro del snippet (`showCloseButton={false}` en los wrappers) porque el X nativo de bits-ui cerraba el drawer aunque hubiera dirty.
- **Dirty guard unificado**: `attemptCloseAll(onClose?)` en el host acepta callback que se invoca solo si el cierre se confirma (inmediato o tras "Descartar" en AlertDialog). Padre lo usa para:
  - Toggle Grafo/Lista (`requestVistaChange`).
  - Click en otro nodo del grafo (nueva prop `onAttemptPush` en `GrafoMapa`, padre pasa wrapper que usa `attemptCloseAll`).
  - `openPosicion`/`openSumision`/`openTecnica`/`openWizardCrear*` (helper `attemptPushModal`).
- Default `vistaPrincipal` cambió de `'lista'` a `'grafo'` por feedback del owner durante la sesión.

**T-8.c+d (commit `f3f9c72`):** nodos circulares + tamaño por degree + canvas dark.
- `buildGrafoElements` calcula `degree` (in+out) por nodo y lo guarda en `data.degree`. 5 tests nuevos en `grafo.spec.ts`.
- `GrafoMapa::buildStylesheet`: reescrito a paleta monocromática sobre canvas oscuro forzado.
  - Canvas: `class="dark"` en el contenedor + `bg-card` sólido + `rounded-xl` + `border border-border`. Probe de `readTokens` también con `.dark` → tokens resuelven al esquema dark independiente del tema del sistema.
  - Posición (cualquier rol) → `bg-muted` + borde `muted-foreground`. Diferenciación ofensiva/defensiva/neutral pasa al modal.
  - Sumisión → `bg-foreground` macizo (único nodo que destaca).
  - Tamaño: `mapData(degree, 0, 8, 28-64 px)`. Huérfanos al mínimo.
  - Label fuera del círculo (`text-valign: bottom`) con pill `round-rectangle` en tono `muted` + opacity 1 + padding 3 (oculta las flechas que pasan por debajo sin ser blanco puro).
  - Flechas todas en `muted-foreground`; `transicion` dashed como único matiz de tipo.
- `GrafoLeyenda` simplificada a 2 nodos (posición / sumisión) + 2 flechas (acción / transición).
- Token `--sumision` añadido inicialmente al `layout.css` se retiró al pivotar a monocromática (cleanup en el mismo cambio).

**Iteración de diseño relevante (sesión larga):** la paleta visual del grafo evolucionó del plan inicial (4 colores macizos por tipo+rol) hasta el resultado final (monocromática sobre canvas dark) en 3 iteraciones con feedback del owner. El plan en `.claude/agent-reports/20260517-t8-it3-grafo/plan.md` refleja las decisiones intermedias; el código refleja el resultado final.

**Validación:**
- `pnpm check` limpio en cada commit (1050 ficheros, 0 errores, 0 warnings).
- `pnpm test:unit`: 12/12 en `grafo.spec.ts` (el fallo de `Welcome.svelte.spec.ts` es preexistente, Playwright no instalado).
- `pnpm build` + `pnpm preview` + hard refresh tras cada commit estructural (regla de CONTEXTO_AGENTE para cambios que tocan SW/PWA/modal).

**Próximo paso concreto:**
- Arrancar **T-9.it3** — persistencia + drag + botón Guardar:
  - Migración SQLite v4: tabla `grafo_layout (entidad_id, x, y)` (modelo exacto a decidir al arrancar).
  - Drag nativo (grabify) en posiciones y sumisiones.
  - Botón "Guardar organización" con dirty state visible.
  - "Reorganizar" → fcose temporal, no persiste hasta Guardar.
  - Entra la decisión de si la tabla `grafo_layout` viaja en el export/import JSON (sí por defecto, vía sync.ts).

---

## Sesión 21 (2026-05-17, tarde)

**Hecho — diagnóstico y cierre de T-7.it3 + replanteo del resto de it.3**

**Diagnóstico de la regresión reportada en sesión 20 (el grafo se movía
y el zoom se reseteaba tras `4d8748a`):**

- No era un bug del código. Logs temporales `[T-7]` en
  `pickLayoutOptions`, `runLayoutAndCache` y el `$effect` reactivo del
  dataset confirmaron: en el caso "arista entre nodos existentes",
  `pickLayout → preset`, `optsFit=false`, `zoomChanged=false`,
  `panChanged=false`, `totalPanDelta={0,0}`. El grafo NO se mueve.
- La regresión era el **Service Worker sirviendo un bundle viejo**
  (anterior al fix de T-7). El owner estaba probando contra GH Pages
  con la PWA cacheada agresivamente. Bundle nombrado como
  `5.BjKgAW_x.js` con un log `[GrafoMapa] layout` que no existe en el
  código actual — era el bundle previo cacheado por el SW.
- Validado caso "nodo nuevo" también: el owner añadió un nodo y
  reportó "nada se mueve, todo OK". No se exploró por qué el caso
  "nodo nuevo" no dispara fcose como dice el código teórico — irrelevante
  porque ese flujo se va a redefinir en T-8/T-9.
- El commit `1a2af1b` que anotaba la regresión fue un falso positivo
  por cache de SW. Anotado aquí para referencia futura.

**Logs temporales limpiados** del fichero antes de cerrar T-7.

**Revelación de visión del owner mid-sesión** (mientras hablábamos de
qué hacer con T-8/T-9): el grafo que quiere construir es bastante más
ambicioso que lo desplegado en T-1..T-7:

- **Nodos circulares uniformes** (no rectángulos ni diamantes); el
  tamaño/color codifica la categoría.
- **Grafo siempre visible**, no como una de tres tabs (Lista /
  Posiciones / Técnicas / Grafo) sino como chasis principal de la
  vista. Toggle binario **Grafo / Lista**, con Lista conteniendo el
  sub-toggle Posiciones/Técnicas/Sumisiones actual.
- **Modal/wizard como drawer inferior** en móvil (~50% alto) para no
  tapar el grafo. Desktop pendiente de decidir (drawer lateral o
  mantener centrado).
- **Sincronización modal↔grafo:** al abrir un modal de una entidad
  (posición/sumisión/técnica), el grafo hace **pan/zoom animado al
  nodo focal**. Al saltar a otra entidad desde dentro del modal, el
  grafo transiciona al nuevo nodo. El grafo "cuenta la historia" que
  estás leyendo.
- **Organización del usuario prevalece y se persiste:**
  - Al añadir nodos, los existentes NO se mueven (fcose con
    `fixedNodeConstraint`; solo el nuevo se acomoda).
  - **Drag nativo (grabify)** en posiciones y sumisiones — sin modo
    edición separado.
  - **Botón "Guardar organización"** que persiste las posiciones en
    SQLite (no localStorage — así entra en export/import JSON).
  - Botón **"Reorganizar"** (el que ya existe) → fcose temporal,
    sobrescribe lo de pantalla pero NO toca lo persistido hasta
    Guardar. Cambios pendientes marcados visualmente (dirty state).
  - Refresh (F5) → carga lo último guardado de SQLite, si existe.

**Matiz aceptado por el owner**: no hay sync automático entre desktop
y móvil (no hay backend). El export/import JSON es el puente. Si la
tabla `grafo_layout` entra en el export, el layout viaja al importar.

**Plan it.3 actualizado (reemplaza al de sesión 20):**

- **T-7.it3 ✅** — cerrada hoy. El caso "nodo nuevo" no se valida en
  el modelo actual porque desaparece en T-8/T-9.
- **T-8.it3** — composición + estética nuevas:
  - Toggle binario Grafo / Lista (colapsar Posiciones/Técnicas/Grafo →
    Lista con sub-toggle interno).
  - Nodos circulares uniformes; tamaño/color codifican categoría
    (decisiones concretas al arrancar).
  - Grafo siempre visible en vista Grafo. Modal → drawer inferior
    en móvil; decisión desktop pendiente.
- **T-9.it3** — organización persistente:
  - Migración SQLite v4: tabla `grafo_layout (entidad_id, x, y)` o
    similar (modelo exacto a decidir al arrancar).
  - Drag nativo (grabify) en posiciones y sumisiones.
  - Botón "Guardar organización" con estado dirty visible.
  - Reorganizar → fcose temporal, no persiste hasta Guardar.
- **T-10.it3** — sincronización modal↔grafo: pan/zoom animado al
  nodo focal cuando se abre/cambia el modal. Decisiones pendientes:
  qué hacer si el nodo está filtrado, qué pasa al cerrar el modal,
  qué tipo de animación.
- **T-11.it3** — cierre formal: bump 0.4.0, tag `v0.4-it3`, ADRs
  004 (fcose), 005 (lazy-load Cytoscape), 006 (nueva — layout grafo
  siempre-visible + drawer), 007 (nueva — sincronización modal↔grafo),
  008 (nueva — persistencia de layout en SQLite + dirty state).

**MEJORAS_FUTURAS.md actualizado** con entrada "Sumisiones vs técnicas
— redundancia del modelo" para revisar post-it.3.

**Validación de la sesión:**
- `git diff src/lib/components/GrafoMapa.svelte` vuelve vacío tras
  limpiar los logs (idéntico al HEAD).

**Próximo paso concreto:**
1. Commit con la limpieza de logs (no toca código real) +
   actualización de ESTADO_ACTUAL.md y MEJORAS_FUTURAS.md.
2. Arrancar T-8.it3 — empezar por decisiones de producto al inicio:
   - Codificación visual de nodos (tamaño/color por qué categoría).
   - Layout desktop (drawer lateral, mantener modal central, o
     drawer inferior universal).
   - Cómo se materializa el toggle binario y dónde vive el
     sub-toggle de Lista (en el sub-header existente o en un panel
     propio).

---

## Sesión 20 (2026-05-17, mañana)

**Hecho — Arranque y desarrollo de iteración 3 (T-1.it3 a T-7.it3)**

Planificación delegada a agente Plan al inicio (informe completo en
`.claude/agent-reports/20260516-it3-plan/plan.md`). 9 tareas T-1.it3 a
T-9.it3 definidas, 7 ejecutadas en esta sesión.

**Decisiones de producto cerradas al inicio:**
- Toggle Lista | Grafo en `/mapa` (tercer estado del toggle existente
  "Posiciones / Técnicas").
- Misma capacidad en móvil y desktop (sin diferencias).
- Alcance mínimo: grafo + filtros + modales existentes. Sin export a
  imagen, sin posiciones manuales guardadas en BD.
- Auto-layout (Cytoscape calcula), no coordenadas en schema.
- Sumisión = un único nodo terminal (REQUISITOS §3.5).
- Algoritmo: fcose (force-directed con clustering).

**Tareas completadas:**

- **T-1.it3 ✅ Spike Cytoscape + fcose**
  - `pnpm add cytoscape@3.33.3 cytoscape-fcose@2.2.0`.
  - Tipo declaration `src/lib/types/cytoscape-fcose.d.ts`.
  - Componente mínimo `GrafoMapa.svelte` con dataset hardcoded.
  - Validado bundle: chunks separados (~434 KB cytoscape + ~122 KB
    fcose). NO entra en bundle inicial — lazy-loaded vía
    `await import(...)` dentro de `onMount`.
  - Ruta dev temporal `/dev/grafo-spike` (eliminada en T-3).

- **T-2.it3 ✅ Función pura `buildGrafoElements`**
  - `src/lib/grafo.ts` mapea `(posiciones, sumisiones, técnicas)` →
    `{nodes, edges}` formato Cytoscape.
  - IDs de nodos prefijados `pos:<id>` / `sum:<id>` para evitar
    colisiones.
  - 8 tests unitarios en `grafo.spec.ts` (vacío, mapeo, aristas
    paralelas, descarte de huérfanas, nodos aislados).

- **T-3.it3 ✅ Toggle Lista / Grafo en /mapa**
  - Tercer estado `'grafo'` en `vistaActiva` con tercer botón en el
    sub-header sticky existente.
  - Buscador del header se oculta en vista grafo (decisión asumida).
  - Eliminada la ruta `/dev/grafo-spike` ahora que el grafo está
    integrado.

- **T-4.it3 ✅ Filtros tipo / estado / categoría**
  - **Cambio de UI tras feedback del owner:** los 3 filtros pasan
    de `MultiChips` (3 filas) a 3 dropdowns compactos
    `FilterDropdown.svelte` con badge contador. Una sola línea en el
    sub-header. Usa wrapper local de `DropdownMenu` con `CheckboxItem`.
  - Filtros aplican via `applyFilters(cy)` en `$effect` sin
    reconstruir el grafo (toggle `display: none/element`). Nodos
    huérfanos tras filtrar también se ocultan si hay filtro activo.
  - Patrón vacío = todos pasan (consistente con vista Técnicas).
  - **Fix en CheckboxItem:** `closeOnSelect={false}` en lugar de
    `onSelect={preventDefault}` (esta bloqueaba también el
    `onCheckedChange` en bits-ui v2).

- **T-5.it3 ✅ Estilos visuales finales**
  - Mapeo de colores por tipo via CSS vars del proyecto:
    `ataque=--primary`, `sweep=--success`, `escape=--warning`,
    `transicion=--muted-foreground` (dashed), `sumision=--destructive`.
  - Estado: funciona y probando se ven igual (sólida color tipo).
    Solo descartada se distingue (línea dotted, opacidad 0.4).
  - Nodos posición: rectángulo redondeado, borde según rol
    (verde ofensiva, rojo defensiva, neutral fino).
  - Nodos sumisión: forma diamante con borde rojo y relleno gris
    (tras feedback del owner — el diamante rojo macizo desentonaba).
  - Reactividad al tema claro/oscuro: `$effect` sobre `theme.isDark`
    reaplica stylesheet vía `requestAnimationFrame`.
  - **Bug crítico resuelto:** Cytoscape no entiende `oklch()` ni
    `var(--…)` — la lectura inicial vía `getComputedStyle().getPropertyValue('--token')`
    devolvía oklch literal y el parser de color de Cytoscape lo
    descartaba (colores se quedaban en azul default `:selected`).
    Solución: probe DOM resuelve `var(--token)` aplicada a `color`, y
    canvas trampolín convierte el resultado a `rgb()` sRGB
    garantizado.
  - **Otro bug resuelto:** import de `cytoscape-fcose` necesita
    fallback `(fcoseMod.default ?? fcoseMod)` para cubrir ambos
    shapes ESM/CJS. Sin esto fcose no se registraba y los nodos
    salían en diagonal.
  - Leyenda nueva: `GrafoLeyenda.svelte` — botón "?" arriba a la
    derecha del canvas, abre Popover (bits-ui directo) con las
    convenciones de color/forma. Usa tokens semánticos así que la
    leyenda y el grafo se sincronizan ante cambios de tema.

- **T-6.it3 ✅ Click handlers → mapaModalStack**
  - `cy.on('tap', 'node', ...)` y `'edge'` pushean al stack de
    modales existente. IDs de nodo llevan prefijo, se strippea.
  - `$effect` reactivo sobre `nodes`/`edges` reemplaza elementos en
    sitio cuando el padre llama `refresh()` (tras editar/crear desde
    modal abierto desde el grafo).

- **T-7.it3 🟡 (parcialmente validado) — Estabilidad de layout**
  - Cache de posiciones a nivel de módulo (`<script module>`):
    `positionsCache: Map<string, {x,y}>`. Mantiene el determinismo
    entre cambios de tab.
  - `pickLayoutOptions(nodes, forceFcose)` decide layout:
    - Todos cacheados → `preset` (estable, idéntico).
    - Algún nodo nuevo → `fcose` completo (recoloca todo).
    - **Descartada** la variante intermedia con `fixedNodeConstraint`
      tras feedback del owner: mantener viejos inmóviles + nuevo en
      mal sitio sumaba un click manual de Reorganizar; mejor
      auto-relayout completo cuando aparece nodo nuevo.
  - Botón "Reorganizar" (icono refresh, esquina superior izquierda
    del canvas) limpia el cache y fuerza fcose completo manual.
  - Toast inferior "Reorganizando grafo…" durante 600ms cuando se
    dispara fcose completo (no aparece en el caso preset).
  - **Bug del cache vacío resuelto:** `instance.one('layoutstop')`
    se registraba DESPUÉS de que el constructor de Cytoscape
    ejecutase el layout inicial; el evento se perdía y el cache
    nunca se rellenaba. Solución: instanciar con `layout: 'null'`,
    registrar `instance.on('layoutstop')` como handler persistente, y
    disparar el layout real con `runLayoutAndCache(instance, false, true)`.
  - **Bug del reset de zoom resuelto:** Cytoscape aplica `fit: true`
    por defecto a los layouts → cada actualización del catálogo
    re-encuadraba el viewport del usuario. Solución: `fit: false`
    por defecto en `runLayoutAndCache`, y `fit: true` solo en el
    primer mount y en el botón Reorganizar.
  - **Validado por el owner antes del último push:** añadir una
    arista entre nodos existentes NO movía el grafo y NO reseteaba
    el zoom.
  - **🔴 REGRESIÓN reportada tras el commit `4d8748a`:** volvió a
    moverse el grafo Y a resetearse el zoom al añadir o quitar algo,
    incluso entre nodos existentes. Algo del último ajuste
    (`fit: false` parametrizado + `fit: true` solo en mount inicial
    y Reorganizar) ha roto los dos comportamientos que ya funcionaban.
    Hipótesis a verificar al inicio de la próxima sesión:
      - El `instance.elements().remove()` + `instance.add(...)` del
        `$effect` del dataset puede estar reseteando el viewport por
        sí mismo (antes del layout), ignorando el `fit: false` del
        preset.
      - O el `(opts as ...).fit = fit` no se aplica al layout preset
        (raro, pero hay que confirmar leyendo la doc o haciendo
        `console.log(opts)` justo antes del `instance.layout(opts).run()`).
      - O en el caso "arista entre nodos existentes", el dataset
        cambia de identidad pero el cache se está vaciando por algún
        motivo y cae a fcose (verificar con log temporal de `cacheSize`
        antes de quitarlo del todo).
    Plan: reabrir T-7, añadir logs temporales (`cacheSize`,
    `isPreset`, `fit`), reproducir, diagnosticar y arreglar.
  - **Pendiente validar:** añadir un nodo nuevo (posición o
    sumisión) debería disparar fcose con toast visible. Validar en
    próxima sesión después de arreglar la regresión.

**Cambios de UX importantes registrados en `MEJORAS_FUTURAS.md`:**

- **Simplificar enum TipoTecnica** si el uso real solo usa
  `transicion` y `sumision` (owner sospecha que el resto no las
  usará). Decisión tras 2-3 semanas de uso real.
- **Reducir fricción al crear técnica tipo sumisión** — el nombre se
  duplica con el nodo terminal sumisión. Cuatro opciones a evaluar
  (auto-fill nombre / atajo "+ Añadir sumisión desde aquí" /
  esconder nombre redundante / refactor del modelo).

**ADRs propuestos pero no escritos (pendientes):**
- ADR-004: elección de layout fcose (con comparativa).
- ADR-005: lazy-loading de Cytoscape y umbral de bundle.

**Validación de la sesión:**
- `pnpm check` limpio (0 errors / 0 warnings).
- `pnpm build` limpio (chunks separados confirmados).
- 8/8 tests unitarios de `grafo.spec.ts` pasan.

**Próximo paso concreto:**
1. Validar en navegador (Adalid) el fix del cache en T-7: tras
   refrescar, cambiar entre tabs y añadir una arista entre nodos
   existentes **NO** debe mover el grafo. Si funciona, cerrar T-7.
2. **T-8.it3** — pulido móvil + a11y mínima.
3. **T-9.it3** — cierre formal: bump versión `0.4.0`, tag `v0.4-it3`,
   escritura de ADRs 004 y 005, actualización de ESTADO_ACTUAL al
   cierre.

---

## Sesión 19 (2026-05-16)

**Hecho — T-7.it2: cierre de iteración 2**

Cierre formal de la iteración 2 (mapa técnico + captura inline) sin
ejecutar T-6.it2 (pulido post uso real). El owner decidió saltar el
pulido al no haber acumulado feedback de uso real todavía; si surgen
molestias durante el uso, se anotarán sueltas en `MEJORAS_FUTURAS.md`
o se llevarán a la próxima iteración, sin reabrir T-6.it2.

**Cambios de cierre:**

- `package.json` — bump de versión `0.0.2 → 0.3.0`. Hasta ahora el
  `package.json` había estado desfasado de los tags (`v0.1-it0` y
  `v0.2-it1` se crearon sin tocarlo). A partir de este cierre, la
  versión del paquete se sincroniza con el tag de cierre de iteración
  (`v0.3-it2` → `0.3.0`). `src/lib/version.ts` lee de `package.json`,
  así que se actualiza automáticamente.
- `ESTADO_ACTUAL.md` — esta entrada (sesión 19).

**Decisiones tomadas durante la sesión:**

- **T-6.it2 omitida sin aplazar.** No se mueve a MEJORAS_FUTURAS ni
  al inicio de it.3 — se cierra it.2 tal cual, y si el uso real
  destapa molestias se atajan suelto o en it.3.
- **Alinear `package.json` con tags a partir de ahora.** El convenio
  pasa a ser: en cada cierre de iteración, bumpear `package.json` al
  número de la iteración (`v0.X-itX` → `0.X.0`).

**Validación de cierre:**
- `pnpm check` limpio (0 errors / 0 warnings).
- `pnpm build` limpio (build OK, 9.4s, sin warnings de plugins
  nuevos).
- Sin rutas `/dev/*` que limpiar (eso pasó en T-15 de it.1).

**Iteración 2 — resumen final:**

- T-1.it2 ✅ vínculo top↔bottom + vista del oponente (`f098a4e`, `4e0b184`).
- T-2.it2 ✅ refactor plano-edit en wizards (`aba8300`).
- T-3.it2 ✅ rolls↔técnicas/posiciones por entidad + 4 listas (`6d3751b`).
- Chip-picker ✅ rediseño (`8b03e86`, tarea independiente).
- T-4.it2 ✅ prefill de contras inline con complementaria del origen (`00e0eb6`).
- T-5.it2 ✅ panel de análisis C1 + C2 en /rolls (`0a3bf13`).
- T-6.it2 ⏭ omitida (pulido post uso real, sin acumular feedback).
- T-7.it2 ✅ cierre + tag `v0.3-it2` (esta sesión).

**ADRs creados en it.2:** `001-bump-deps-fix-refresh.md`,
`002-vinculo-top-bottom.md`, `003-theme-manager.md`.

**Próximo paso concreto:** sin trabajo de código planificado.
Pendiente arrancar planificación de iteración 3 cuando el owner
acumule feedback de uso real o quiera abordar entradas de
`MEJORAS_FUTURAS.md`.

---

## Última sesión (2026-05-16, sesión 18)

**Hecho — T-5.it2: panel de análisis C1 + C2 en /rolls**

Tres piezas nuevas, una integración:

- **`src/lib/analisis.ts`** (módulo nuevo): dos funciones de consulta
  sobre la BD.
  - `getProblemasRecurrentes(N: 3 | 5 | 10)` → `{ posiciones, tecnicas,
    sesiones_consideradas }`. Agrega `roll_posicion`/`roll_tecnica`
    con `resultado='fallo'` filtrando por los rolls de las últimas N
    sesiones (SELECT con `LIMIT N` ordenado por `sesion.fecha DESC`).
    GROUP BY entidad, ORDER BY count DESC.
  - `getCompanerosProblema()` → array de compañeros con
    `me_dominaron / total_rolls > 0.5`. Para cada uno, sub-query top-3
    posiciones marcadas como `fallo` en sus rolls perdidos.
- **`src/lib/components/AnalisisPanel.svelte`** (componente nuevo):
  panel plegable (`<details>` nativo, expandido por defecto). Header
  con selector segmented `3 / 5 / 10` (patrón de `/mapa` + RollEditor).
  Dos secciones: "Problemas recurrentes" (C1, dos sub-listas) y
  "Compañeros bandera" (C2, cards con borde/bg `warning/5` + `/30`).
  Items NO clickables (texto informativo). Estado vacío explícito por
  cada caso (sin sesiones, sin fallos, sin banderas).
- **`/rolls/+page.svelte`** (integración): `<AnalisisPanel
  reloadKey={analisisReloadKey} />` entre el bloque sticky de filtros y
  la lista de rolls. Tras guardar/borrar un roll, `analisisReloadKey++`
  fuerza recarga via `$effect`.

**Decisiones tomadas durante la sesión:**

- **Resumen automático post-sesión aplazado a MEJORAS_FUTURAS**, no
  incluido en T-5.it2. El criterio "app sugiere algo accionable" se
  cubre con C1 + C2. Si tras 2-3 semanas de uso real falta una vista
  combinada por-sesión, se reabre.
- **C1 — selector 3 / 5 / 10, sin umbral mínimo de ocurrencias.**
  Todos los `fallo` cuentan; ordenado por frecuencia DESC. Más simple
  y más datos para decidir luego si hace falta filtrar.
- **C2 — sin mínimo de rolls.** Cualquier compañero con
  `me_dominaron > 50%` activa bandera. Riesgo de falso positivo (1
  roll perdido = 100% loss rate) aceptado por ahora. Anotado en
  MEJORAS_FUTURAS para hacerlo configurable cuando el ruido moleste.
- **C2 — "pierdo" = `me_dominaron` estricto** (no incluir
  `equilibrado`). Literal de REQUISITOS §3.6.
- **C1 + C2 combinan ambos ejes del modelo v4**: posiciones-fallé +
  técnicas-fallé. La distinción ya existe en BD desde T-3.it2.
- **Vista = panel colapsable en /rolls**, no ruta nueva ni tab en
  home. Menos navegación, contexto junto a los datos crudos.
- **Items NO clickables al inicio.** /mapa no soporta deep-link a
  una entidad concreta; montarlo añade scope. Si tras uso real falta
  navegación, se añade.
- **Sin helper `getComplementaria` ni helpers nuevos.** El módulo de
  análisis no comparte queries con otros módulos; aislado.
- **Estado del plegable NO persiste entre visitas.** Simple. Si
  molesta abrir cada vez, se persiste luego.

**MEJORAS_FUTURAS actualizado** con dos entradas nuevas en UX:
- "Resumen automático post-sesión — aplazado de T-5.it2".
- "C2 — mínimo de rolls configurable para activar bandera".

**Validación**: `pnpm check` limpio (0/0). Validación visual en
navegador hecha por el owner durante la sesión.

**Iteración 2 — plan vivo:**

- T-1.it2 ✅ (commits `f098a4e`, `4e0b184`).
- T-2.it2 ✅ refactor plano-edit (commit `aba8300`).
- T-3.it2 ✅ rolls↔técnicas/posiciones + 4 listas (commit `6d3751b`).
- **Chip-picker rediseño ✅ (commit `8b03e86`, tarea independiente).**
- T-4.it2 ✅ prefill de contras inline (commit `00e0eb6`).
- **T-5.it2 ✅ panel de análisis C1 + C2 (esta sesión).**
- T-6.it2 (siguiente) — pulido UX post uso real.
- T-7.it2 — cierre + tag `v0.3-it2`.

**Próximo paso concreto:** uso real durante unos días para alimentar
T-6.it2 (pulido post uso real). Sin cambios de código planificados
hasta tener feedback del owner.

---

## Última sesión (2026-05-16, sesión 17)

**Hecho — T-4.it2: prefill de contras inline (deuda heredada de T-11
de it.1, desbloqueada por ADR-002)**

En `TecnicaModalContent.svelte`, al pulsar "+ Crear nueva técnica"
desde el Combobox de "+ Añadir contra", el push del wizard ahora
pasa `posicionOrigenId: origen?.posicion_complementaria_id ?? undefined`.
El wizard de técnica recibe la prop (`posicionOrigenIdProp`,
`TecnicaWizard:58`) y prefija el paso 3 con la complementaria. El
usuario puede aceptar o cambiarla en el wizard.

**Comportamiento por caso:**
- Origen con complementaria asignada → paso 3 prefijado con la
  complementaria (caso esperado para BJJ canónico: Mount top →
  contra desde Mount bottom).
- Origen sin complementaria (transición, par aún no enlazado) →
  paso 3 vacío, usuario elige a mano. Idéntico al comportamiento
  pre-T-4.it2.

**Decisiones tomadas durante la sesión:**
- **Opción A para "sin complementaria"**: no prefill como fallback.
  Descartadas opción B (adivinar por nombre/tipo: frágil, ADR-002
  ya lo descartó) y opción C (forzar enlazar antes: demasiado
  intrusivo).
- **Sin helper `getComplementaria(id)`**: el subagente Explore lo
  sugirió, pero al revisar el código vimos que solo había un sitio
  donde añadir una consulta nueva (`TecnicaModalContent` ya tenía
  `origen` cargado y solo necesitaba el ID, no la entidad). El otro
  callsite candidato (`PosicionModalContent`) usa `.find()` sobre
  un array ya cargado y reemplazarlo añadiría una query a BD.
  Abstracción prematura → descartada.
- **Sin tests, sin ADR**. Cambio pequeño (1 prop en el push) sobre
  cableado ya existente desde T-1.it2. ADR-002 ya documenta el
  vínculo; T-4.it2 solo aplica ese vínculo a un sitio concreto.

**Comentario de deuda reescrito** (`TecnicaModalContent.svelte:295-310`):
ya no es deuda, refleja el nuevo comportamiento y la regla de
fallback.

**Validación**: `pnpm check` limpio (0/0). Validación visual en
navegador hecha por el owner durante la sesión.

**Iteración 2 — plan vivo:**

- T-1.it2 ✅ (commits `f098a4e`, `4e0b184`).
- T-2.it2 ✅ refactor plano-edit (commit `aba8300`).
- T-3.it2 ✅ rolls↔técnicas/posiciones + 4 listas (commit `6d3751b`).
- **Chip-picker rediseño ✅ (commit `8b03e86`, tarea independiente).**
- **T-4.it2 ✅ prefill de contras inline (esta sesión).**
- T-5.it2 (siguiente) — consultas C1/C2 + resumen texto post-sesión.
- T-6.it2 — pulido UX post uso real.
- T-7.it2 — cierre + tag `v0.3-it2`.

**Próximo paso concreto:** arrancar T-5.it2 (consultas C1/C2 +
resumen texto post-sesión).

---

## Última sesión (2026-05-16, sesión 16)

**Hecho — Rediseño chip-picker (tarea independiente, fuera del plan
T-N de it.2)**

Surgió de `MEJORAS_FUTURAS.md` como pendiente inmediato tras T-3.it2.b.
Se priorizó antes de T-4.it2 porque las 4 chip-lists de `RollEditor`
introducidas en T-3.it2.b eran la pantalla que el owner iba a usar
más en uso real — si la captura era incómoda se rompía el feedback
loop que alimenta T-4/T-5.

**Componente nuevo `src/lib/components/ChipPicker.svelte`** con dos
modos:

- **`mode='select'`** (editable): buscador opcional + chips en grid
  de 2 filas con scroll horizontal (`grid-flow-col auto-cols-max
  grid-rows-2`). Soporta agrupado por categoría (prop `groups`) o
  lista plana (`items`). Chip dashed "+ Crear nueva" al final del
  último grupo si se pasa `onCreateNew`. El buscador interno se
  puede ocultar con `showSearch={false}` para que el padre controle
  la query desde fuera (caso tabs en RollEditor).
- **`mode='readonly'`**: sin buscador, chips como `<span>` no
  interactivos. Layout `flex flex-wrap` (no grid 2 filas forzadas:
  si caben en una fila, una; si solo hay 1 chip, no se reserva la
  segunda fila — decisión post-validación owner).
- **Prop `accent: 'primary' | 'success' | 'warning'`**: tinta el
  contenedor con `bg-{accent}/5` y los chips seleccionados con
  `bg-{accent}` + `text-{accent}-foreground` en lugar del default
  `primary`. Tokens ya existían en `layout.css`. Solo aplica en
  `mode='select'`.

**Sustituciones aplicadas:**

- 8 ocurrencias de `MultiChips` en `RollEditor.svelte` (4 wizard,
  4 form). `MultiChips` se conserva intacto para otros usos
  estáticos (PESOS, RESULTADOS, etc.).
- 4 chip-rows read-only en `src/routes/rolls/+page.svelte`.
- 4 chip-rows read-only en `src/routes/sesion/[id]/+page.svelte`.

**UX adicional en RollEditor (4 bloques: paso 2 wizard, paso 6 wizard,
form posiciones, form técnicas):**

- **Tabs estilo segmented toggle** (patrón heredado de `/mapa`:
  wrapper `inline-flex rounded-md border bg-muted p-0.5` con tab
  activo `bg-background shadow-sm` e inactivo `text-muted-foreground`).
  Una primera iteración usó el componente `Chips` existente como
  toggle pero visualmente no se diferenciaba de los chips del
  ChipPicker debajo — el owner pidió el patrón de /mapa
  explícitamente para que el cambio de tab se notase.
- **Buscador único por bloque** (en lugar de uno por set "fue bien
  / fue mal"). Cambiar de tab conserva la query. Filtrado en vivo
  case-insensitive contra `label`.
- **Accent semántico**: tab "Fue bien" → `accent='success'` (tinte
  verde 5 % + chips seleccionados verdes). Tab "Fue mal" →
  `accent='warning'` (ámbar). Resuelve la queja "los chips no
  parecen cambiar al alternar tab" tintando el contexto incluso
  cuando no hay nada seleccionado.
- **Contador en cada tab**: `Fue bien (N) / Fue mal (N)`, contando
  desde el array de selección (no del catálogo filtrado — así "(3)"
  significa "3 marcadas", independiente del buscador).
- **Reset al abrir editor**: tab a `'fue_bien'`, query a `''`. En
  el `$effect` que se ejecuta al abrir el Dialog.

**Decisiones tomadas durante la sesión:**

- **ChipPicker componente nuevo, no extender MultiChips**: las APIs
  son distintas (groups, search, onCreateNew, accent) y MultiChips
  se sigue usando para chips estáticos. Mantener ambos limpios.
- **Read-only flat (`flex flex-wrap`)**, no 2 filas forzadas. Owner
  validó tras ver la versión inicial con grid 2 filas (que dejaba
  huecos con 1 solo chip).
- **Segmented toggle inline (4 copias)** en lugar de extraer un
  `SegmentedTabs.svelte` — consistente con /mapa y con la regla "no
  introducir abstracciones que la tarea no exija". Si reaparece en
  más sitios, se extrae.
- **Accent solo en modo `select`** (editable). Read-only se queda
  neutro porque ya hay labels textuales por fila ("Posiciones que
  fueron bien:") que dan el contexto.
- **Transición vs diferenciación por color (decisión de UX)**: el
  owner notó que al cambiar de tab los chips parecían estáticos.
  Análisis honesto: la transición fade/slide no ayudaría porque los
  chips son LOS MISMOS (el catálogo no cambia, solo cambia el array
  de selección). La diferenciación por color sí porque cambia el
  contexto incluso sin selección. Se eligió la segunda.

**MEJORAS_FUTURAS actualizado**: entrada "Reducir read-only de chips
en /rolls y /sesion/[id]" marcada como hecha parcial (la presentación
compacta sí; el "quitar/abreviar el label" queda como pendiente si
reaparece la fricción en uso real).

**Validación**: `pnpm check` limpio (0 errors / 0 warnings).
Validación visual en navegador hecha por el owner durante la sesión.
Commit `8b03e86`, pusheado a `origin/main`.

**Iteración 2 — plan vivo:**

- T-1.it2 ✅ (commits `f098a4e`, `4e0b184`).
- T-2.it2 ✅ refactor plano-edit (commit `aba8300`).
- T-3.it2 ✅ rolls↔técnicas/posiciones + 4 listas (commit `6d3751b`).
- **Chip-picker rediseño ✅ (commit `8b03e86`, tarea independiente).**
- T-4.it2 (siguiente) — reescritura del prefill de contras inline.
- T-5.it2 — consultas C1/C2 + resumen texto post-sesión.
- T-6.it2 — pulido UX post uso real.
- T-7.it2 — cierre + tag `v0.3-it2`.

**Próximo paso concreto:** arrancar T-4.it2 (reescritura del prefill
de contras inline, desbloqueado por ADR-002).

---

## Última sesión (2026-05-16, sesión 15)

**Hecho — T-3.it2 + T-3.it2.b: rolls↔técnicas/posiciones por entidad con outcome bien/fallé**

Modelo final v4:
- Tabla nueva `roll_tecnica(roll_id, tecnica_id, resultado)` con
  `resultado ∈ {'fue_bien','fallo'}` y PK compuesta. Sustituye los
  TEXT libres `que_intente`/`que_fallo` desde la UI (las columnas
  quedan en BD como histórico, no se escriben).
- Tabla `roll_posicion(roll_id, posicion_id, resultado)` reemplaza
  `roll_posicion_problema` con el mismo modelo. Migración v3→v4
  copia el histórico previo como `resultado='fallo'` y dropea la
  tabla antigua. La columna TEXT `posiciones_problema` se queda
  en `rolls` como histórico.

UI:
- `RollEditor` con **4 chip-lists** (mismo patrón en wizard y form):
  Posiciones-fue-bien, Posiciones-fallé, Técnicas-fue-bien,
  Técnicas-fallé. Cada lista tiene sub-wizard inline para crear
  nueva entidad. Se descartó el textarea legacy de "Posiciones
  donde tuve problema (texto libre)".
- `TecnicaWizardDialog.svelte` nuevo (wrapper de `TecnicaWizard`
  para uso standalone fuera de `mapaModalStack`). `TecnicaWizard`
  refactorizado con prop `mode='stack'|'standalone'`, mismo patrón
  que `PosicionWizard`.
- `/rolls` y `/sesion/[id]` muestran hasta 4 filas read-only de
  chips bajo cada roll (ocultas si la lista está vacía).

Sync:
- `CURRENT_SCHEMA_VERSION = 4`. ExportPayload incluye `roll_posicion`
  y `roll_tecnica` con `resultado`. Importación valida shape strict.

**Decisión sobre modelo (consensuada con owner):**
- Exploramos 3 alternativas: eliminar "fallé", outcome ternario
  (bien/medio/fallé), o dos listas simétricas bien/fallé.
- Owner eligió 4 listas separadas por eje y resultado.
- Migración del histórico: lo que estaba en `roll_posicion_problema`
  se trata como `'fallo'` (lo que era semánticamente).

**Fixes post-validación inmediatos (mismo commit):**
- `CompaneroCombobox`: bug del label "Crear 'test'" que se quedaba
  en el input al seleccionar — el label ahora es el nombre real
  (`query.trim()`), no el texto decorativo.
- `CompaneroCombobox`: el dropdown abre al click/focus (`bind:open`
  + `onclick`/`onfocus`). Antes solo abría al escribir.
- `svelte.config.js`: `paths.relative: false` (cambio aprobado por
  owner explícitamente — fichero protegido). Sin esto, en rutas
  profundas (`/sesion/[id]`) el navegador resolvía los assets como
  relativos al path actual y daban 404.
- `/rolls/+page.svelte`: el link "Ver sesión" estaba como `<a href>`
  dentro de un `<button>` (HTML inválido) y disparaba navegación
  full-page que no era interceptada por SvelteKit → reload completo
  → Worker nuevo competía por OPFS con el viejo → error de SAH-Pool
  "Access Handles cannot be created…". Fix: `onclick` con
  `preventDefault` + `goto(...)` programático para forzar navegación
  SPA pura.

**Bug del subagente — corrupción de SCHEMA_V2_MIGRATION (revertido):**
Durante T-3.it2.b un subagente modificó `SCHEMA_V2_MIGRATION`
reemplazando la tabla histórica `roll_posicion_problema` por
`roll_posicion`. Eso rompía la inmutabilidad de migraciones (BD
nuevas no podían inicializarse, BD que pasaban por v2→v3→v4
fallaban en el INSERT desde tabla inexistente). Revertido a la DDL
original. **Aprendizaje:** las migraciones históricas son
inmutables — los cambios de schema van SIEMPRE en una migración
nueva, nunca retrocediendo a editar una anterior. Anotar como
restricción explícita para futuros subagentes que toquen BD.

**Iteración 2 — plan vivo actualizado:**

- T-1.it2 ✅ (commits `f098a4e`, `4e0b184`).
- T-2.it2 ✅ refactor plano-edit (commit `aba8300`).
- T-3.it2 ✅ rolls↔técnicas/posiciones por entidad + 4 listas.
- T-4.it2 (siguiente) — reescritura del prefill de contras inline.
- T-5.it2 — consultas C1/C2 + resumen texto post-sesión.
- T-6.it2 — pulido UX post uso real.
- T-7.it2 — cierre + tag `v0.3-it2`.

**Pendientes inmediatos como tareas independientes (no T-4.it2):**
- Rediseño de `MultiChips`/chip-picker con buscador + scroll
  horizontal (2 filas máx) + chip "Crear nueva" estilizado. Aplicar
  tanto en captura (RollEditor) como en read-only de listados.
  Anotado en `MEJORAS_FUTURAS.md`.

---

## Dónde estamos en macro

Iteración 0 ✅ cerrada en `v0.1-it0` (2026-05-10).

Iteración 0.5 ✅ funcionalmente cerrada. Falta solo T-9 (verificación en
uso real) y tag `v0.1-it0.5`. Pendiente, no bloquea.

Iteración 1 ✅ cerrada en `v0.2-it1` (2026-05-14, sesión 12). Mapa
técnico completo: schema v2 + migración v1→v2 + CRUD de posiciones,
sumisiones, técnicas (con destino condicional y contras N:N
asimétricas) + UI completa (`/mapa` con tabs Posiciones/Técnicas,
modales encadenados, wizards de creación/edición, "+ Crear nueva
inline") + captura inline de posiciones-problema en rolls + filtro y
visualización en `/rolls` y `/sesion/[id]` + pulido UX masivo
(AppHeader global, theme manager, paleta suavizada, card list canónico,
sticky sub-headers, DateRangePopover, auto-capitalización).

T-14 cerrada como **limpieza manual por el owner** desde la UI
(eliminó entidades con nombres "test"/"prueba" creadas durante
validación). El catálogo BJJ real se construirá orgánicamente desde
`/mapa` cuando capture sesiones reales. T-15 eliminó las rutas dev
`/dev/seed-mapa` y `/dev/db-migration-smoke` y la rama `/dev/*` de
`header-title.ts`.

**Iteración 2 confirmada como T-1.it2:** vincular posiciones
complementarias (top ↔ bottom) + vista del oponente en el modal de
posición. Decidido en sesión 9. Mini-ADR pendiente
(`decisiones/002-vinculo-top-bottom.md`).

---

## Última sesión (2026-05-15, sesión 14)

**Hecho — T-2.it2: refactor "plano-edit" en los 3 wizards**

Patrón canónico (mismo que `RollEditor`): el componente bifurca por
`modo` en un `$derived viewMode: 'wizard' | 'form'`. Modo `editar`
renderiza un form único con todos los campos visibles a la vez; modo
`crear` mantiene el stepper. Mismo componente, dos ramas internas
(`{#if viewMode === 'wizard'} ... {:else} ... {/if}`) — un solo
punto de carga/validación/save.

- **PosicionWizard**: rama form con Nombre, Categoría, Tipo,
  Complementaria (combobox con "+ Crear nueva inline"), Notas. El
  combobox de complementaria mantiene el flujo de sub-wizard de
  T-1.it2 (`parentForComplementaria` salta paso 4 cuando el padre
  está en wizard; en form el sub se abre con sus 5 pasos normales).
- **SumisionWizard**: rama form con Nombre + Notas.
- **TecnicaWizard**: rama form con Nombre, Variante, Origen (combobox),
  Tipo (chips), Destino condicional (combobox de posiciones o
  sumisiones según tipo), Estado (chips), Detalles, Errores comunes.

**Pulido UX adicional en la sesión:**

- **Placeholder "Pinta-pega" → "Anota"** en los textareas de los 3
  wizards (wizard + form, 6 ocurrencias). "Pinta-pega" no es
  expresión natural.
- **Footer Cancelar izquierda** (patrón "esquinas opuestas",
  preferencia owner). Decisión: separa la salida segura de la acción
  primaria, reduce clics accidentales. Aplicado a `CompaneroEditor`
  (donde el span vacío al inicio dejaba Cancelar centrado) y a
  `RollEditor` (modo form). El Borrar de RollEditor se agrupa con
  Cancelar a la izquierda como acciones no-primarias:
  `[Borrar Cancelar] .... [Guardar]`. Se descartó el patrón
  Material/shadcn-default (todo agrupado a la derecha).

**Decisiones tomadas:**

- **`viewMode` derivado del `modo` prop**, no de un prop separado.
  Conserva la API simple del wizard.
- **Misma instancia de componente para wizard y form**. Alternativa
  descartada: componentes hermanos (`*Editor` vs `*Wizard`). Coste
  extra sin valor — toda la lógica de validación/save/dirty se
  comparte.
- **Esquinas opuestas para Cancelar/Guardar** (vs agrupado a la
  derecha). Razón: separación seguridad/acción primaria; convención
  macOS/GNOME; permite encajar Borrar a la izquierda cuando exista.

**Iteración 2 — plan vivo actualizado:**

- T-1.it2 ✅ (commits `f098a4e`, `4e0b184`).
- T-2.it2 ✅ refactor plano-edit.
- T-3.it2 (siguiente) — linkear rolls a técnicas (entidades, no texto
  libre).
- T-4.it2 — reescritura del prefill de contras inline.
- T-5.it2 — consultas C1/C2 + resumen texto post-sesión.
- T-6.it2 — pulido UX post uso real.
- T-7.it2 — cierre + tag `v0.3-it2`.

---

## Sesión previa (2026-05-14, sesión 13)

**Hecho — T-1.it2: vínculo top↔bottom + vista del oponente**

ADR-002 (commit `4064638`) escrito antes de tirar. Implementación:

- **Schema v3 + migración v2→v3** (`src/lib/db/schema.ts`): nueva
  columna autoref `posicion_complementaria_id` con `ON DELETE SET NULL`.
  Migración encadenada al array `MIGRATIONS` siguiendo el patrón de T-1
  de it.1.
- **CRUD de posiciones** (`src/lib/posiciones.ts`): helper
  `syncComplementaria(aId, newBId)` mantiene la simetría bidireccional
  via transacción atómica (rompe emparejamientos previos cuando hace
  falta). `createPosicion` / `updatePosicion` / `deletePosicion` lo
  invocan. Tipo `Posicion` extendido con `posicion_complementaria_id?`.
- **Sync** (`src/lib/sync.ts`): `CURRENT_SCHEMA_VERSION → 3`; INSERT
  de posiciones incluye la columna nueva. Bumpear schema_version
  rompe import de exports antiguos (comportamiento documentado strict).
- **PosicionWizard**: paso nuevo "Complementaria" (Combobox de
  bits-ui) entre Tipo y Notas → wizard pasa de 4 a 5 pasos. Items
  excluyen la propia posición y las que ya tengan otra complementaria.
  Item especial "Sin complementaria" al inicio cuando hay vínculo
  para limpiar. **"+ Crear nueva posición" inline** funcional vía
  `posicionWizardDraft` (réplica del patrón de T-10): el padre se
  desmonta al pushear el sub-wizard, el draft preserva su estado, el
  sub-wizard al guardar hace `pop` + `invokeReturnHandler` con el id,
  el padre se remonta con la complementaria preseleccionada.
- **PosicionModalContent**: sección **"Vista del oponente"** con
  técnicas que salen de la complementaria, agrupadas por tipo (mismo
  patrón visual que las técnicas propias). Cache `contrasCount`
  extendido para no mostrar "Sin contras" falso. Botón "Ir a
  {complementaria}" hace `closeAll + push` (reinicia el contexto, no
  apila — evita breadcrumbs infinitos al alternar A↔B↔A...).
- **MapaModalHost**: invalidación pesimista del cache
  `posicionesById` tras guardar wizard de posición (las ediciones
  ahora afectan a 2-3 filas via `syncComplementaria`). `$effect` para
  limpiar `posicionWizardDraft` cuando wizard-posicion deja el stack.

**Fixes post-validación stakeholder** (issues #1, #2, #4):

- **#1**: sublabel del Combobox de complementaria mostraba la clave
  cruda ("control_superior"). Mapeo vía nuevo `CATEGORIA_LABEL`
  derivado de `CATEGORIAS` (single source of truth, sin duplicar).
- **#2**: faltaba "+ Crear nueva" — añadido como descrito arriba.
- **#4**: breadcrumbs infinitos alternando complementarias — fix con
  `closeAll + push` como descrito arriba.

**Fixes post-validación stakeholder** (sesión 13 continuada):

Tras commit `f098a4e` el owner reportó 6 issues sobre el flujo nuevo:

- **#1 sublabel cruda** en combobox de Complementaria
  (`control_superior` en lugar de `Control superior`). Fix: helper
  `CATEGORIA_LABEL` derivado de `CATEGORIAS` (single source).
- **#2 botón "+ Crear nueva" no funcionaba** (faltaba cablear
  `onCreateNew`). Fix: replicado patrón draft + returnHandler de T-10.
- **#4 breadcrumbs infinitos** al alternar entre complementarias.
  Fix: "Ir a {complementaria}" hace `closeAll + push` (reset stack).
- **Breadcrumb confuso** mostraba wizards como nodos navegables. Fix:
  filtro en `MapaModalHost` — solo nodos de lectura
  (posicion/tecnica/sumision) entran al breadcrumb. Si tras filtrar
  queda 1 nivel, se oculta. Mapeo de índices al `popTo` real.
- **#A scrollbar al hacer mousedown en Editar.** Causa: shadcn Button
  aplica `active:not-aria-[haspopup]:translate-y-px` al pulsar; con
  los botones Editar/Borrar dentro del wrapper scrollable y el
  contenido al borde, el translate empujaba 1px fuera del clip y
  disparaba overflow. Fix: footer (Editar/Borrar) fuera del
  scrollable en `PosicionModalContent` + wrapper de `kind=posicion`
  en `MapaModalHost` pasa a `flex flex-col` sin `overflow-y-auto`
  (PosicionModalContent maneja su propio scroll interno).
- **#B scroll del fondo se reseteaba al abrir el combobox.** Causa
  raíz: `Popover.Portal` al body colisionaba con el scroll-lock del
  Dialog y reseteaba `scrollTop`. Fix: eliminado el `Popover.Portal`
  del `Combobox` — el popover renderiza inline dentro del
  `Dialog.Content` (que no tiene `overflow: hidden`, así que se ve
  entero). Aplica a complementaria, contras y cualquier otro uso del
  `Combobox`.
- **#C sub-wizard "+ Crear nueva" mostraba paso 4 confuso + se
  reiniciaba al paso 1 del padre tras guardar.** Fix grande:
  - Nuevo campo `parentForComplementaria?: string` en la entry
    `wizard-posicion crear` del stack. Lo pone
    `handleCreateNewComplementaria` con el id del padre.
  - `PosicionWizard` con esa prop: salta el paso 4 (visibleSteps
    derivado `[1,2,3,5]` en lugar de `[1,2,3,4,5]`), indicador de
    progreso dinámico ("Paso X de 4" en lugar de "5"), asigna
    `posicion_complementaria_id = parentForComplementaria`
    automáticamente al crear.
  - Sub-wizard NO usa `posicionWizardDraft` (ni lee ni escribe ni
    limpia) → el draft del padre sobrevive el remount y al volver
    restaura `currentStep` correcto.
- **Bug del remount**: `<PosicionWizard>` no se remontaba al
  cambiar el top del stack de `wizard-posicion editar` a
  `wizard-posicion crear` (mismo `kind`, el `{#if}` no cambia de
  rama). Fix: `{#key}` derivado de `modo:id` en MapaModalHost para
  forzar remount.

**Pendiente del owner** (no bloquea cierre técnico):

- Retro-vincular pares ya creados en it.1 desde la UI (1 click por
  par). Datos en su DB local OPFS, no en repo. Ritmo libre.

**Deuda detectada (no aplicada todavía)**: el patrón "footer fuera
del scrollable" debería replicarse en `TecnicaModalContent` y
`SumisionModalContent` por consistencia — tienen el mismo bug latente
del `active:translate-y-px`. Esperando a que aparezca en uso real
para extender el refactor.

**Decisiones tomadas:**

- **Modelo de complementaria: columna autoref** (no tabla par, no
  inferencia por categoría+rol). ADR-002.
- **Simetría en TS, no triggers SQL**. ADR-002.
- **Ir a complementaria = reset de stack**, no push. Justificación:
  saltar a la complementaria es navegar a otro nodo del mapa, no
  abrir un sub-contexto. Sin reset el breadcrumb crece indefinidamente.
- **Invalidación pesimista de `posicionesById` tras guardar wizard
  de posición**. Pragmático: el coste de invalidar todo el cache es
  despreciable (las posiciones se recargan a demanda) y garantiza
  coherencia frente a edits que tocan 2-3 filas a la vez.
- **`+ Crear nueva` desde el combobox de complementaria solo cuando
  `mode === 'stack'`**: la versión `standalone` del wizard (usada
  desde RollEditor) no tiene acceso al stack del mapa, así que el
  sub-wizard no funcionaría — `onCreateNew={undefined}` en ese caso.

**Iteración 2 — Ts previstas (plan vivo):**

- T-1.it2 ✅ — vínculo top↔bottom + vista oponente.
- T-2.it2 — refactor "plano-edit" para los 3 wizards (Pos/Sum/Tec):
  modo `editar` = formulario único con todos los campos visibles a
  la vez (como `RollEditor`), modo `crear` sigue siendo stepper.
- T-3.it2 — linkear rolls a técnicas (entidades, no texto libre).
  REQUISITOS §6 it.2.
- T-4.it2 — reescritura del prefill de contras inline (desbloqueado
  por ADR-002).
- T-5.it2 — consultas C1/C2 + resumen texto post-sesión.
  REQUISITOS §3.6.
- T-6.it2 — pulido UX que aparezca tras uso real.
- T-7.it2 — cierre + tag `v0.3-it2`.

---

## Sesión previa (2026-05-14, sesión 12)

**Hecho — Cierre de iteración 1**

- **T-14 (limpieza manual)**: el owner purgó desde `/mapa` las entidades
  con nombres "test"/"prueba" creadas durante la validación de T-4 a
  T-13. Cero código tocado por esta tarea. El catálogo BJJ real lo
  construirá orgánicamente desde la UI cuando capture sesiones reales,
  no desde un seed predefinido (opción c) del híbrido — en la práctica,
  100 % desde UI tras descartar el seed).
- **T-15 (cierre técnico)**:
  - Eliminado `src/routes/dev/` completo (`seed-mapa` y
    `db-migration-smoke`).
  - Eliminada la rama `/dev/*` de `deriveHeader()` en
    `src/lib/header-title.ts` (queda obsoleta sin rutas que la
    matcheen).
  - Verificación: `pnpm run check` 0 errors/0 warnings, `pnpm run
    build` ✓ sin chunks dev en el bundle.
  - Tag `v0.2-it1`.

**Decisiones tomadas:**

- **Catálogo del mapa = 100 % UI-driven, sin seed.** Opción c) del
  híbrido se reduce a (a) en la práctica: ningún seed predefinido,
  todo desde `/mapa`. Razón: el seed solo aportaba data artificial
  para validar la UI durante it.1, una vez la UI funciona ya no aporta.
- **Sin uso real verificado como criterio de cierre de T-14.** Lo
  habría retrasado sin valor (la UI está validada caso a caso por el
  stakeholder a lo largo de toda it.1, no necesita una "demo de
  cierre").
- **Eliminar ambas rutas dev en T-15** (no conservar ninguna como
  utilidad). El owner lo pidió explícito. Si reaparece la necesidad
  de un smoke de migraciones o seed de arranque en it.2+, se reabre
  como tarea propia.

---

## Sesión previa (2026-05-14, sesión 11)

**Hecho — T-13: Visualización de posiciones-problema**

- Helper nuevo `getPosicionesProblemaByRolls(rollIds[])` en `rolls.ts`:
  una sola query con `IN (?,…)`, devuelve `Map<rollId, Posicion[]>`.
  Evita N+1.
- `listAllRolls()` extendido con `posicion_problema_ids?: string[]`
  (WHERE EXISTS + IN, semántica OR).
- `/sesion/[id]`: chips read-only `bg-muted text-muted-foreground
  border-border` bajo cada roll con posiciones-problema.
- `/rolls`: catálogo cargado en `onMount`, filtro multi-select con
  `MultiChips` agrupado por categoría, chips read-only bajo cada fila.
  Commit `e50bbd6`.

**Hecho — Pulido UX masivo (M1–M9, post-T-13)**

A petición del owner tras verificar T-13. Cambios profundos:

- **M1 — Agrupar rolls por día en `/rolls`**. Headers "Hoy/Ayer/`lun, 12
  may 2026`" con clases de `/mapa`. Fecha eliminada del item individual
  (queda duplicada con el header).
- **M2 — Filtro de fechas como `DateRangePopover`** (componente nuevo).
  Sustituye los dos `DateInput` por un único trigger con texto humano
  ("Cualquier fecha" / "Desde 1 may" / "1 may – 14 may") que abre un
  `RangeCalendar` de bits-ui en popover. Botón "Limpiar" interno.
- **M3 — Auto-capitalización en 22 inputs de texto libre**. Helper
  `capitalizeFirst()` en `utils.ts`, aplicado vía `oninput` explícito
  (NO `$effect`) en `PosicionWizard`, `SumisionWizard`, `TecnicaWizard`,
  `RollEditor`, `SesionEditor`, `SesionForm`, `CompaneroEditor`.
- **M4 — `AppHeader` global** (`src/lib/components/AppHeader.svelte`,
  `src/lib/header-title.ts`). Sticky top-0 z-30 h-14. Mapping
  pathname → título + isTopLevel. Back ← solo en páginas no top-level
  (hace `history.back()`). `<h1>` propios eliminados de las 5 pages
  top-level + botón back propio eliminado de `/sesion/[id]`.
- **M5 — Estilo DateRangePicker** (iteraciones). Bug clave descubierto:
  bits-ui marca `data-selected` en TODOS los días del rango (incluyendo
  medios), no solo extremos. Mi regla `data-[selected]:bg-primary`
  pintaba todos los del rango. Fix: usar `data-[range-start]:bg-primary`
  + `data-[range-end]:bg-primary` (excluye middles). Visual final:
  franja translúcida `bg-primary/15` continua con extremos rounded-full
  + círculos intensos `size-8 m-0.5 rounded-full` en los extremos
  (2px de halo translúcido alrededor del círculo).
- **M6 — Sticky sub-headers** en `/rolls` (bloque `<details>` de
  filtros) y `/mapa` (toggle + buscador + filtro). Patrón `sticky
  top-14 z-20 bg-background border-b border-border pb-2 -mx-4 px-4`.
  `/companeros` y `/sesion/[id]` sin controles top → no se tocan.
- **M7 — Theme manager** (ver `decisiones/003-theme-manager.md`).
  Singleton `ThemeState` en `theme.svelte.ts` (`$state` en class
  fields, no module-level). Auto por defecto + override manual en
  `/ajustes` (sección "Apariencia", 3 botones). Persistencia
  `localStorage['theme']`. Suscripción a `matchMedia`.
- **M8 — Paleta suavizada** en `layout.css`. Light off-white
  (`oklch(0.99 0 0)` background, cards `oklch(1 0 0)` blanco puro
  encima). Dark gris cálido (`oklch(0.21 0 0)` background,
  `oklch(0.26 0 0)` cards). Bordes más visibles
  (`oklch(0.88 0 0)` light, `oklch(1 0 0 / 14%)` dark).
- **M9 — Cards en items de lista**. Reemplaza el patrón "pelado"
  (`divide-y` sin frame individual) por `<ul class="space-y-2">` +
  items con `rounded-lg border border-border bg-card shadow-xs
  transition-colors hover:bg-accent`. Aplicado a las 5 pantallas
  (home, rolls, sesion/[id], mapa, companeros).

**Decisiones tomadas (con peso):**

- **Patrón `AppHeader` global** sobre header per-page. Mapping
  centralizado en `header-title.ts` strippea `paths.base` para
  funcionar igual en dev (sin base) y prod (con `/bjj-tracker/`).
  Cualquier nueva ruta requiere actualizar `deriveHeader()` con su
  título.
- **`ThemeState` singleton con `$state` en class fields** (cumple
  regla del proyecto). Sin `mode-watcher` (dep no acordada). ADR-003.
- **FOUC en primera carga con tema oscuro persistido aceptado**
  (compromise para no tocar `app.html`). Mitigación documentada en
  `MEJORAS_FUTURAS.md`.
- **Paleta retocada para jerarquía visual**. Background ≠ card, cards
  destacan sobre el fondo. Light off-white con card blanco puro
  encima; dark gris cálido con card más claro. Bordes con suficiente
  contraste para enmarcar elementos sin caer en saturación.
- **Patrón "card list" canónico**: `<ul class="space-y-2">` +
  `rounded-lg border border-border bg-card shadow-xs
  transition-colors hover:bg-accent` en cada item. Aplica a las 5
  listas principales. Anotado follow-up "saturación" en MEJORAS_FUTURAS.
- **Patrón sticky sub-header canónico**: `sticky top-14 z-20
  bg-background border-b border-border pb-2 -mx-4 px-4`. `top-14` =
  altura del AppHeader. Sin overflow ni transform (no rompen el
  portal del Popover).
- **Auto-capitalización con `oninput` explícito**, NO `$effect`
  reactivo (regla del proyecto desde T-10 sesión 8). En wizards con
  `handleNombreInput` existente, integrar `capitalizeFirst` al inicio
  de esa función — no añadir `oninput` adicional.
- **DateRangePicker: bg-primary solo en `data-[range-start]` y
  `data-[range-end]`**, NUNCA en `data-[selected]` genérico. bits-ui
  marca `data-selected` en todos los días del rango (incluso medios).
  Diagnosticado en sesión 11 con Playwright headless.
- **Verificación con Playwright headless** durante diagnóstico del
  bug del DateRangePicker. Confirmó que el popover SÍ se abre en
  todos los viewports — el reporte de "no se abre" del owner se
  resolvió tras hard refresh (probable Service Worker cacheado).

---

## Sesión previa (2026-05-14, sesión 10)

**Hecho — T-12: Captura inline de posiciones-problema en wizard de roll**

- `RollEditor.svelte` ganó un paso nuevo "Posiciones donde tuve problema"
  entre compañero y tamaño (wizard de 5 → 6 pasos). Multi-chips
  agrupados por categoría con orden de `/mapa`.
- Botón "+ Crear nueva posición" inline → abre **wrapper standalone**
  `PosicionWizardDialog.svelte` (componente NUEVO) con el wizard de
  posición completo en su propio Dialog. Al guardar, la nueva posición
  queda preseleccionada y vuelve al RollEditor sin perder progreso.
- `PosicionWizard.svelte` desacoplado: prop nueva `mode: 'stack' | 'standalone'`
  (default `'stack'`). En standalone usa callbacks (`onSaved`,
  `onRequestClose`, `onDirtyChange`) en lugar de `mapaModalStack`. El
  flujo del mapa sigue funcionando idéntico.
- `MultiChips.svelte` NUEVO — chips multi-select reutilizable (Chips
  existente es single-select estricto en 5 sitios).
- Persistencia: `setPosicionesProblema(rollId, ids[])` (ya existía en
  T-2) se invoca en `/sesion/[id]` y `/rolls` tras `createRoll` /
  `updateRoll`. En modo editar precarga con `getPosicionesProblema`.
- Skip de tamaño preconfigurado pasa de inmediato → diferido vía
  `pendingSkipTamano` (porque el paso 2 nuevo se intercala antes).

**Hecho — Tab "Técnicas" en `/mapa` (extra, no en plan original)**

- Toggle "Posiciones" / "Técnicas" en la cabecera de `/mapa`. Tab
  Técnicas con buscador + filtro multi-select por tipo + lista plana
  ordenada alfabética. Cada item: nombre + variante + "desde X → Y" +
  chip de tipo + chip de estado (oculto si "probando"). Click → push
  modal de técnica.
- `onCatalogChanged` recarga también `listTecnicas()`.

**Hecho — Pulido UX masivo**

- **Sticky footers en todos los wizards/editores**: `Dialog.Content`
  pasa a `flex max-h-[90vh] flex-col`, body envuelto en
  `flex-1 overflow-y-auto`, footer fuera del scroll. Aplicado a
  RollEditor, SesionEditor, CompaneroEditor, PosicionWizardDialog,
  MapaModalHost, PosicionWizard, SumisionWizard, TecnicaWizard.
- **Wrappers scroll simétricos** `-mx-3 px-3` (antes `-mr-1 pr-1`,
  cortaba los inputs por la derecha y luego por la izquierda).
- **Enter handler en todos los wizards** — patrón:
  `onkeydowncapture={handleWizardKeydown}` en el wrapper + listener
  global `document.addEventListener('keydown', ..., true)` en `onMount`
  para cubrir "foco perdido". El handler **siempre intercepta** Enter
  dentro del wizard (preventDefault + stopImmediatePropagation) excepto
  cuando el target es input/textarea/`role="radiogroup"`. Esto evita
  el bug del Enter activando el botón "Paso 1" del indicador de
  progreso (que es focuseable). Guard `if (typeof document !== 'undefined')`
  en mount/destroy porque `onDestroy` SÍ se ejecuta en SSR/prerender.
- **Botón Continuar en paso 1 del RollEditor** (faltaba — el `{:else}`
  caía en `<span></span>` vacío).
- **Botón Continuar en paso 4 (tipo) del TecnicaWizard** (faltaba).
- **"+ Crear nueva posición" inline en paso 3 (origen) del TecnicaWizard**
  (antes solo en paso 5 destino).
- **Renombre**: "+ Añadir técnica desde aquí" → "+ Nueva técnica desde
  esta posición" en `PosicionModalContent`.
- **Bug bucle Upa→Upa**: `MapaModalHost` no remontaba ModalContent al
  cambiar `top.id` (mismo `kind`), la lista de contras se quedaba con
  la del anterior. Fix con `{#key top.id}` en los 3 ModalContent.
- **Bug returnHandler singleton** (descubierto en flujo de contras
  inline): `mapa-modal-stack.svelte.ts` cambia `#returnHandler` por
  pila LIFO `#returnHandlers[]`. Sin esto, el handler del modal padre
  se sobrescribía cuando un sub-wizard registraba el suyo.
- **Auto-peso del compañero**: al cambiar `companeroId`, ahora siempre
  pisa `tamanoRelativo` con `peso_relativo` del compañero (antes solo
  si estaba vacío, fallaba al cambiar entre compañeros).
- **Quitar prefill incorrecto** del wizard de técnica desde flujo de
  contras: la contra la ejecuta el oponente, no la misma posición.
  Sin schema de vínculo top/bottom no se puede inferir el origen
  correcto, así que sin prefill. (Se reintroducirá en it.2.)
- **Validación nombre paso 1 TecnicaWizard (Opción A)**: aviso
  informativo si nombre coincide con otro existente (no bloquea).
  Bloqueo real al avanzar del paso 3 cuando ya hay (nombre + origen +
  variante).
- **Bug `d` suelta en `src/lib/companeros.ts`**: identificador huérfano
  que rompía el prerender en bundle minificado. Eliminado.
- **Seed corregido**: añadida "Guardia cerrada top"; destinos de Upa y
  Elbow escape apuntan a esa nueva posición.

**Hecho — Infra / docs**

- `.gitignore`: excluidos exports JSON locales (`bjj-tracker-*.json`).
- `CONTEXTO_AGENTE.md`: sección nueva "Preferencias del owner
  (transversales a la app)" — incluye "aplicar fixes consistentemente
  a todos los equivalentes" y "máquina dual nvm/fnm". Vive en repo
  (versionado) para que viaje entre máquinas.

**Decisiones tomadas (con peso):**

- **Wrapper standalone para wizards fuera del mapa** (Opción B): se
  desacopla del stack del mapa mediante prop `mode`. Coste bajo,
  patrón reusable para futuros casos (sumisión, técnica si surge).
  Descartadas: A (stack global a nivel app — refactor cascada, toca
  `+layout.svelte` vetado), C (Dialog anidado sin abstracción — sin
  reusabilidad).
- **Validación de nombre Opción A en TecnicaWizard**: aviso paso 1 +
  bloqueo paso 3. El UNIQUE es compuesto (no se puede chequear en
  paso 1 con seguridad).
- **Enter handler con `closest('[role="radiogroup"]')`**: chips
  mantienen su semántica de Enter para seleccionar; el resto del
  wizard intercepta SIEMPRE para evitar que Enter active botones
  del indicador / footer.
- **Patrón sticky footer canónico** del proyecto: `Dialog.Content` =
  `flex max-h-[90vh] flex-col`; body = `flex-1 overflow-y-auto`;
  footer fuera (`<Dialog.Footer>` propio o `<div>` plano según
  componente). `min-h-0` en padres flex column para que el overflow
  respete el alto.
- **Vínculo top/bottom NO entra en it.1**: se trabaja como primera
  tarea de it.2 (T-1.it2). Con un mini-ADR previo.

---

## Sesión previa (2026-05-13, sesión 8) — T-10 + T-11

[T-10: editor de TECNICA wizard 7 pasos. T-11: UI de contras
editable (✕ inline, + Añadir contra con Combobox, + Crear nueva
técnica inline). Patrones T-8 / T-9 / T-10 establecidos.]

---

## Última sesión (2026-05-13, sesión 8)

**Hecho:**
- **T-10** ✅ Editor de TECNICA (wizard de 7 pasos con destino
  condicional). Acceso desde el modal de una posición vía botón
  "+ Añadir técnica desde aquí" — origen prefill. 7 pasos: Nombre →
  Variante (skippable) → Origen (combobox) → Tipo (chips: ataque /
  sweep / escape / transicion / sumision) → Destino (combobox de
  posiciones o sumisiones según tipo, con "+ Crear nueva" inline) →
  Estado (chips skippable) → Detalles + errores comunes (textareas).
- **`Combobox.svelte`** NUEVO (~145 líneas) — wrapper sobre
  `Popover` + `Command` (shadcn-svelte). Soporta `onCreateNew` para
  meter la opción "+ Crear nuevo …" al final de la lista filtrada.
  Reutilizable más allá del wizard de técnica.
- **"+ Crear nueva inline" en paso 5** — patrón nuevo del proyecto:
  el TecnicaWizard registra un `returnHandler` en el stack, pushea el
  sub-wizard (posición / sumisión) y, cuando éste guarda en modo
  crear y detecta el handler, hace `pop()` + `invokeReturnHandler` en
  lugar del habitual `closeAll + push modal`. El TecnicaWizard recibe
  el id nuevo y prefill el destino.
- **`tecnicaWizardDraft` store** — necesario porque al pushear el
  sub-wizard, el TecnicaWizard se desmonta (host renderiza solo el
  top). El draft persiste el estado completo entre montajes; el
  wizard escribe en cada cambio y lee al montar. Se limpia al guardar
  con éxito y cuando `wizard-tecnica` deja el stack (host vigila).
- **Botones Editar / Borrar en `TecnicaModalContent`** con el mismo
  patrón Tooltip + AlertDialog de T-8/T-9. Borrar bloqueado si la
  técnica es contra de otra (vía nuevo helper `countContrasIncoming`
  en `contras.ts`).
- **Botón "+ Añadir técnica desde aquí"** en `PosicionModalContent`,
  visible siempre, pushea `wizard-tecnica modo crear` con
  `posicionOrigenId` prefijado.
- **Validación UNIQUE en TecnicaWizard** — pre-carga `listTecnicas()`
  y comprueba `(nombre, posicion_origen_id, variante)` antes de
  guardar. Catch del UNIQUE de SQLite como red defensiva.
- **Fix: toast/confirm de export-import incluyen el mapa** (sesión
  paralela). El toast solo contaba 3 tablas v1 (compañeros/sesiones/
  rolls) y el confirm() decía "REEMPLAZA compañeros, sesiones y
  rolls" sin mencionar el catálogo — daba falsa sensación de no
  exportar el mapa. Helper `countsLine` unificado, singular/plural,
  confirm dice "logbook + mapa técnico". Commit `a108332`.
- **Merge manual de dos exports** (sesión paralela): unimos un export
  v1 (logbook) con uno v2 (mapa) en un solo JSON v2 que el stakeholder
  pudo importar. Script ad-hoc, no se persiste en código.
- **Fixes T-10 (post-validación stakeholder):**
  - Etiqueta "Saltar" → siempre "Continuar" en wizards skippables
    (TecnicaWizard y PosicionWizard). Comportamiento idéntico (si hay
    valor avanza con él, si no aplica default), solo cambia el label.
  - **Bug del autoselect del destino inline**: el `returnHandler`
    asignaba `posicionDestinoId = newId` en la instancia VIEJA del
    TecnicaWizard (la que se desmontó al pushear el sub-wizard). La
    instancia remontada leía del draft (donde el destino seguía
    `null`) y sobrescribía la asignación. Fix: el handler escribe
    también al draft con el nuevo destino — el wizard remontado lo
    recoge correctamente en su `onMount`.
  - **Bug del Enter/Continuar invisible**: en SumisionWizard, un
    `$effect` reactivo que limpiaba `nombreError` cuando cambiaba
    `nombre` también se auto-borraba en el mismo microtask en que
    `tryAdvanceFromStep1` escribía el error. El usuario veía un flash
    (o nada). Fix: reemplazado por `oninput` explícito en el `<Input>`.
    Patrón aplicado también defensivamente en TecnicaWizard.
- **Validación inline de duplicado en PosicionWizard** (post-fixes):
  el patrón ya existía en SumisionWizard y TecnicaWizard; faltaba en
  PosicionWizard pese a que `posiciones.nombre` también tiene UNIQUE.
  Añadido `existentes` cargado en `onMount`, helper `nombreYaExiste`
  (case-insensitive, excluye el propio id en editar), `tryAdvanceFromStep1`
  + `handleNombreInput`, mensaje inline con `aria-invalid` /
  `aria-describedby`, y catch defensivo del UNIQUE en `handleSave`.

**Decisiones tomadas (con peso):**
- **"+ Crear nueva inline" se gestiona con `returnHandler` + draft**.
  No con un `returnTo` declarativo en el entry. Más flexible y deja
  el patrón abierto a otros casos (cualquier wizard puede registrar
  un handler antes de pushear otro y volver con el id).
- **Draft persistente del TecnicaWizard** como solución al desmontaje
  por sub-wizard. El draft es de un solo wizard (no genérico) pero
  patrón replicable si en el futuro otros wizards lo necesitan.
- **Acceso al wizard de técnica SOLO desde el modal de una posición**
  (no desde el dropdown del FAB de `/mapa`). El origen siempre tiene
  contexto. Si se necesita más adelante se añade.
- **Etiqueta "Continuar" siempre** en wizards skippables. Más simple
  cognitivamente que el "Continuar/Saltar dinámico" original de T-8.
  Aplica a Posicion, Sumision y Tecnica.
- **Validación inline de nombre duplicado siempre con `oninput`**,
  nunca con `$effect` reactivo escuchando el campo. El effect se
  auto-borraba un microtask después de escribir el error. Regla
  general del proyecto.
- **Múltiples destinos por técnica** — anotado en MEJORAS_FUTURAS
  con dos modos (refactor schema N:M vs filas independientes con
  mismo nombre). Decisión post-T-14 (uso real).

---

## Sesión previa (2026-05-13, sesión 7)

**Hecho:**
- **T-9** ✅ Editor de SUMISION (wizard) + dropdown del FAB + acciones
  editar/borrar. Replica del patrón T-8 con 2 pasos (nombre obligatorio
  + notas opcionales). Wizard integrado en el stack como
  `kind: 'wizard-sumision'`. Reutilizable crear/editar.
- **FAB de `/mapa` migrado a dropdown** (shadcn-svelte `dropdown-menu`,
  instalado sin tocar `package.json`/`pnpm-lock.yaml`). Un solo botón
  "+ Nuevo" que despliega hacia arriba (`side="top" align="end"`,
  evita chocar con BottomNav) dos items: "Nueva posición" / "Nueva
  sumisión". Empty state actualizado a "Pulsa '+ Nuevo' para empezar."
- **Botones Editar / Borrar en `SumisionModalContent`**: Tooltip que
  envuelve span+Button-disabled si la sumisión es destino de alguna
  técnica (mensaje "Esta sumisión es destino de N técnica(s). Borra
  esas referencias antes."); AlertDialog de confirmación si no hay
  bloqueo. `onChanged` cableado en `MapaModalHost` para refrescar la
  lista tras borrar.
- **Helper nuevo** `countTecnicasBySumisionDestino(id)` en
  `tecnicas.ts` (`SELECT COUNT(*) WHERE sumision_destino_id = ?`).
- **Validación inline de nombre duplicado**: el wizard carga
  `listSumisiones()` en `onMount` y bloquea el avance del paso 1 si el
  nombre ya existe (case-insensitive, excluye el id propio en modo
  editar). Mensaje "Ya existe una sumisión con ese nombre." en el
  paso 1 vía estado dedicado `nombreError`, limpiado reactivamente al
  editar. El catch del UNIQUE en `handleSave` se conserva como
  defensa frente a carreras entre pestañas.
- **Fix crítico del Esc**: la combinación Dialog + AlertDialog dejaba
  un overlay residual bloqueando clicks tras cerrar el AlertDialog con
  Esc. Causa: bits-ui iniciaba el cierre del Dialog principal cuando
  abríamos el AlertDialog desde `onOpenChange`, y la cancelación tardía
  lo dejaba inconsistente. Solución: interceptar antes con
  `onEscapeKeydown` / `onInteractOutside` en `Dialog.Content` y hacer
  `preventDefault()` si dirty — bits-ui ni siquiera empieza a cerrarse.
  El `handleOpenChange` se mantiene como fallback para el botón ✕.
- **Fix del descarte que dejaba el AlertDialog abierto**: tras pulsar
  "Descartar", el AlertDialog se quedaba colgado porque
  `handleConfirmDescartar` solo tocaba el stack y confiaba en que
  bits-ui cerrara el AlertDialog al pulsar `<AlertDialog.Action>`; al
  cerrarse el Dialog principal en el mismo tick el cierre del
  AlertDialog se perdía. Solución: bajar `mostrarConfirmDescartar` y
  limpiar `accionPendiente` **antes** de tocar el stack.
- **AlertDialog ahora controlado**: `open` + `onOpenChange` en lugar
  de `bind:open`, para que cualquier vía de cierre (Esc, click fuera,
  Cancelar) limpie `accionPendiente` y nunca dispare descartar
  implícito. La acción destructiva solo se ejecuta vía el botón rojo.

**Decisiones tomadas (con peso):**
- **Validación de duplicado contra lista pre-cargada en memoria** vs
  query dedicada. Catálogo es pequeño (decenas de sumisiones máximo).
  Sin función nueva en `sumisiones.ts`. Patrón aplicable también al
  wizard de técnica (T-10) cuando valide nombre+origen+variante únicos.
- **`onEscapeKeydown` + `onInteractOutside` con `preventDefault()`**
  como patrón de intercepción de cierre de Dialog cuando hay dirty.
  Más limpio que abortar en `onOpenChange` (bits-ui ya inició el
  cierre interno cuando llega ahí, lo que deja estado inconsistente).
  Aplicar también en T-10.
- **AlertDialog controlado (no `bind:open`)** para que el cierre por
  cualquier vía limpie estado explícitamente. El botón rojo de
  Descartar baja el flag **antes** de tocar el stack, para evitar que
  el cierre simultáneo del Dialog padre se trague el `onOpenChange`
  del AlertDialog.
- **Esc en el AlertDialog ≠ descartar**: solo el botón rojo descarta.
  Esc / click-fuera / Cancelar vuelven al wizard con los cambios
  intactos. Confirmado por stakeholder.
- **Dropdown del FAB hacia arriba** (`side="top" align="end"`):
  abrir hacia abajo lo metería detrás del BottomNav. `align="end"`
  alinea con el borde derecho del trigger para no salir de viewport.
- **Detección del UNIQUE de SQLite** vía regex
  `/UNIQUE constraint failed/i` sobre el `message` del Error.
  Robusto a variantes de formato. Sigue usándose como red defensiva
  aunque el caso normal ya no llega ahí.

---

## Sesión previa (2026-05-13, sesión 6)

**Hecho:**
- **T-8** ✅ Editor de POSICION (wizard) + FAB + acciones editar/borrar.
  Wizard de 4 pasos con auto-avance (`PosicionWizard.svelte`, 330+
  líneas), integrado **dentro del stack de modales** como `kind:
  'wizard-posicion'` (no es un Dialog independiente, contenido inline
  del Dialog del host). Reutilizable crear/editar.
- **MapaModalEntry** extendido con union discriminada `wizard-posicion`
  modo `crear` / `editar`. `MapaModalHost` dispatcha al wizard, invalida
  cache `posicionesById[id]` tras guardar, expone `onCatalogChanged`
  para refrescar `/mapa`, y gestiona `AlertDialog "¿Descartar cambios?"`
  cuando cualquier acción de cierre (Esc / overlay / ✕ / ← Atrás /
  Cancelar) ocurre con isDirty.
- **Dirty handler** en `mapa-modal-stack` (`setDirtyHandler` / `isDirty`).
  El wizard registra un `$derived` que compara estado actual vs snapshot
  inicial (modo editar) o defaults vacíos (modo crear), y lo limpia
  tras guardar o desmontar.
- **Botones Editar / Borrar** en `PosicionModalContent` visibles en
  cualquier anchura (móvil + desktop). Borrar deshabilitado con
  `Tooltip` (wrapper shadcn) explicativo si la posición tiene técnicas
  o rolls asociados; si no, `AlertDialog` de confirmación.
- **FAB extended "+ Nueva posición"** en `/mapa` visible en cualquier
  anchura, posición `fixed bottom-24 right-6` (no choca con BottomNav).
- **Query nueva** `countRollsByPosicionProblema(id)` en `rolls.ts`.
- **Wrappers shadcn-svelte instalados**: `alert-dialog` y `tooltip`
  vía `pnpm dlx shadcn-svelte@latest add alert-dialog tooltip`. Sin
  cambios en `package.json` / `pnpm-lock.yaml` (primitives bits-ui ya
  estaban). `confirm()` nativo y `title` HTML reemplazados.
- **Fixes UX** post-validación del stakeholder:
  - "Saltar" → "Continuar" en pasos skippables cuando ya hay valor.
  - **Bug de persistencia**: los inputs estaban dentro de `{#if
    currentStep === N}`, el remount con `bind:value` $bindable emitía
    `undefined` antes de leer la prop, sobrescribía el `$state` del
    padre. Fix: todos los pasos montados, ocultos con `class:hidden`.
- **Decisión de scope**: móvil del mapa **también edita**. Revierte la
  decisión original de it.1 (móvil read-only). `REQUISITOS.md`
  (CU-2, §4.1, §6 it.4) e `ITERACION_1.md` (§F-2, §F-3, §F-4,
  §DECISIONES, §PANTALLAS, T-8/T-9, §CRITERIOS) actualizados.

**Decisiones tomadas (con peso):**
- **Wizard como `kind` del stack**, no Dialog independiente. UN solo
  Dialog en toda la app, sin anidados. Patrón reusable para T-9 / T-10.
- **Borrado prohibido** si la posición tiene técnicas saliendo o rolls
  que la referencian (vs cascade automático). Más seguro y obliga al
  usuario a limpiar primero. Tooltip explica el motivo.
- **`AlertDialog` y `Tooltip` (shadcn-svelte) sobre `confirm()` y
  `title` nativos** — heredan tokens del proyecto, dark mode,
  accesibilidad. Coste: 0 deps añadidas.
- **Patrón `class:hidden` para pasos del wizard** (en lugar de
  `{#if}`) para evitar bug de remount con `bind:value` $bindable.
  Documentado para futuros wizards (T-9, T-10).
- **`categoria` y `tipo` como `undefined` por defecto** en el wizard
  (no `'otro'`). Permite distinguir "vacío" de "el usuario eligió
  algo" para decidir label del botón skippable. Materializa el
  default `'otro'` al guardar.
- **Dirty handler registrado en el stack** (vs binding directo). El
  host consulta antes de cualquier cierre. Reusable para T-9 / T-10.
- **Móvil del mapa edita**. Cambio de scope explicado arriba.

---

## Sesión previa (2026-05-12, sesión 5)

**Hecho:**
- **T-6** ✅ `TecnicaModalContent.svelte` (288 líneas) — chips de tipo +
  estado (+ variante si la hay), Origen y Destino como botones que
  pushean al stack, secciones de Setup / Errores comunes (ocultas si
  vacías), Contras conocidas (lista clickable con "desde {origen}" en
  segunda línea), Otras variantes de [nombre] (oculto si no hay
  hermanas). Estados loading/error/ready idénticos al patrón de T-5.
- **T-7** ✅ `SumisionModalContent.svelte` (139 líneas) — sin chips de
  header, Notas (oculta si vacía), Variaciones agrupadas por posición
  de origen (alfabético), cada item clickable → push de la técnica.
- **MapaModalHost actualizado** — caches `tecnicasById` y `sumisionesById`
  análogos al de posición, dispatch correcto según `top.kind`,
  placeholders fuera. El recorrido nodo → técnica → contra → respuesta
  funciona sin bucles.
- **Seed ampliado para validar T-6/T-7** — las dos armbar unificadas a
  mismo `nombre="Armbar"` con variantes `"desde guardia"` / `"desde mount"`
  (ahora son hermanas reales que disparan "Otras variantes"). Añadido
  `CONTRAS_SEED` con 2 contras forzadas (Upa contra Armbar desde mount,
  Hip bump sweep contra Armbar desde guardia) — relaciones forzadas
  para tener data de UI; las contras realistas se construyen en T-14.
- **CONTEXTO_AGENTE.md** — línea de Node 22 neutralizada para no asumir
  `nvm` (la máquina usa `fnm`).

**Decisiones tomadas (con peso):**
- **Colores del chip de tipo de técnica**: ataque=primary/15,
  sweep=success/15, escape=warning/15, transicion=muted,
  sumision=destructive/15. Lenguaje visual: sumisión "cierra" la
  partida, escape sale de mal sitio (alerta resuelta), sweep cambia
  control (positivo), transición es movimiento neutro.
- **Colores del chip de estado de técnica**: probando=warning,
  funciona=success, descartada=muted.
- **Sin chip "Sumisión terminal" en el modal de sumisión** — el título
  y la sección "Variaciones que terminan aquí" ya dejan claro el rol.
  Se evita ruido visual.
- **Segunda línea "desde {origen}" en contras y otras variantes
  siempre activa** — resuelve homónimas sin coste.
- **Huérfanos (relacionada eliminada) se muestran sin link** con texto
  gris "(posición/sumisión eliminada)". Defensivo aunque con FK ON
  CASCADE no debería pasar.
- **Etiqueta "Contras conocidas" se mantiene** — confusión potencial
  (¿contras DE o A?), pero con catálogo real (T-14) se reevalúa.
- **CONTRAS_SEED en seed-mapa**: las relaciones del seed son forzadas
  para validar UI, no representan BJJ realista. T-14 introduce el
  catálogo real con contras canónicas.

---

## Sesión previa (2026-05-12, sesión 4)

**Hecho:**
- **Discusión de diseño del mapa** con stakeholder. Cerradas las 3
  cuestiones abiertas de `REQUISITOS.md §7`:
    - Sumisiones = nodos terminales del grafo (no salen aristas).
    - Mismo nombre técnico desde distintos orígenes = aristas distintas
      que comparten el `nombre`. UI las agrupa.
    - Variantes ("la cross choke de mi profe") = aristas paralelas con
      campo `variante` distinto. No hay plantilla/instancia separadas.
  Commit `f345d2e`.
- **Tipos de técnica** confirmados: ataque / sweep / escape / transicion
  / sumision. "Defensa" fuera (vive como contra de otra técnica).
- **Plan de iteración 1** escrito en `.claude/ITERACION_1.md` — 15 tareas
  (F-1 a F-6), criterios, riesgos, decisiones confirmadas. Commit
  `50e31da`. T-2.5 (sync v2) añadida tras descubrir deuda en T-1.
- **T-1** ✅ Schema v2 + migración v1→v2 + smoke `/dev/db-migration-smoke`
  + `PRAGMA foreign_keys = ON` global. Migraciones como array
  `{from,to,run}` extensible. BDs nuevas aplican V1 + migraciones siempre
  (no schema_v2_fresh paralelo). Verificado por Adalid: 23/23 checks OK
  (subió de 17/17 tras añadir verificación FK). Commit `f93b72f`.
- **Fix sync.ts** ✅ — al activar FK, importar JSONs v1 antiguos con
  referencias huérfanas fallaba. Patrón estándar de bulk-import: PRAGMA
  OFF + BEGIN/COMMIT + PRAGMA ON + `foreign_key_check` para auditar sin
  abortar. Lección documentada en ADR mental: cuando activas invariantes
  hay que revisar callers que dependían del comportamiento permisivo.
  Commit `e5f2462`.
- **T-2** ✅ Capa de datos CRUD para schema v2: `posiciones.ts`,
  `sumisiones.ts`, `tecnicas.ts` (CRUD + 4 consultas para modal),
  `contras.ts` (N:N asimétrica), extensión de `rolls.ts` con
  `setPosicionesProblema`/`getPosicionesProblema`. Validación TS en
  `createTecnica` con `assertDestinoCoherente` para evitar el CHECK
  críptico de SQLite. Commit `e62b19a`.
- **T-2.5** ✅ `sync.ts` cubre schema v2 (8 tablas en export/import).
  `CURRENT_SCHEMA_VERSION → 2`. Validación strict. Commit `df61670`.
- **T-3** ✅ Página `/mapa` read-only: header + buscador + posiciones
  agrupadas por categoría + sumisiones aparte + chips de tipo/categoría
  con tokens semánticos. Tab "Mapa" añadido al `BottomNav` entre Rolls
  y Compañeros (orden final: Home → Rolls → Mapa → Compañeros → Ajustes).
  Items en read-only con `cursor-default`. Commit `f65bf4c`.
- **T-4 + T-5** ✅ Stack de modales del mapa + modal de posición:
    - `mapa-modal-stack.svelte.ts`: store singleton con `$state` en class
      field privado. Operaciones push/pop/popTo/closeAll.
    - `MapaModalHost.svelte`: UN solo Dialog controlado por el store (no
      Dialogs anidados, evita problemas de focus/overlay). Breadcrumb si
      stack>1, botón ← si stack>1, botón ✕ siempre. Esc/click overlay/✕
      van por `onOpenChange` → `closeAll`.
    - `PosicionModalContent.svelte`: chips de tipo+categoría, notas,
      tabs por tipo de técnica (a mano con botones-chip, shadcn-svelte
      no tiene Tabs primitive instalado). Item de técnica clickable →
      push modal de técnica (placeholder T-6).
    - Seed temporal `/dev/seed-mapa` para validar inmediatamente sin
      esperar a T-8: 3 posiciones + 2 sumisiones + 6 técnicas idempotente.
      Se elimina al cerrar it.1 (T-15).
  Validado por Adalid: lista, modales, breadcrumb, navegación, ← / ✕,
  placeholders correctos. Commit `2542d71`.

**Decisiones tomadas (con peso):**
- Las 3 cuestiones abiertas de REQUISITOS §7 cerradas (ver arriba).
- Tipos de técnica: ataque/sweep/escape/transicion/sumision. Sin
  "defensa".
- `PRAGMA foreign_keys = ON` activado globalmente. Bulk imports usan
  PRAGMA OFF + transacción + foreign_key_check para tolerar huérfanos
  heredados.
- Stack de modales = UN Dialog controlado por store (no Dialogs anidados).
  Patrón potencialmente reusable en otras pantallas si hace falta.
- Wizard de técnica en 7 pasos sin fusión (decisión producto).
- Móvil del mapa en it.1 (lectura), no esperar a it.4.
- Linkear rolls a técnicas se queda para it.2 (respeta REQUISITOS §6).
- Posiciones semilla para T-14: guardia cerrada bottom + mount bottom
  (las que sugería REQUISITOS).
- Validación de destino exclusivo en TS además del CHECK en BD, para
  devolver mensajes accionables a la UI.
- Naming asimétrico de contras: `getContras(X)` = "contras DE X";
  `getTecnicasQueContrarresta(X)` = "técnicas para las que X es la
  contra". Direccion explícita en el nombre.

---

## Próximo paso

**T-3.it2 — Linkear rolls a técnicas (entidades, no texto libre).**

Hoy `RollEditor` captura "qué intenté" y "qué falló" como texto libre
+ posiciones-problema como entidades (T-12). Falta lo que REQUISITOS
§6 it.2 marca como pieza clave: linkear rolls a TÉCNICAS reales del
catálogo. Esto desbloquea las consultas C1/C2 (T-5.it2) y el resumen
post-sesión.

Cosas a definir antes de empezar:

1. **Modelo de datos**: nueva tabla `roll_tecnica` (N:M)? ¿Con
   marcadores tipo `intentada/conseguida/sufrida`?
2. **UI**: ¿en el wizard de roll (multi-chips de técnicas) o en una
   vista de detalle del roll?
3. **Carga del catálogo**: con cientos de técnicas, ¿agrupar por
   posición de origen? ¿Buscador?

Pendiente del owner (no bloquea T-3.it2):

- **Retro-vincular pares ya creados en it.1** desde la UI. Datos en
  DB local OPFS, no en repo.

---

## Iteración 2 — entrada confirmada

**T-1.it2 — Vínculo posiciones complementarias (top ↔ bottom) +
vista del oponente.** Decidido 2026-05-13 (sesión 9) como **primera
tarea de it.2**, no como T-11.5 dentro de it.1. Razón: la vista del
oponente es valor visible para el usuario y merece su propia iteración;
it.1 cierra con scope limpio y tag `v0.2-it1`.

Casos de uso (justificación de la tarea):

1. Vista del oponente en el modal de posición: desde "Mount top" ver
   "Lo que puede hacer tu oponente desde Mount bottom" (escapes, sweeps,
   sumisiones).
2. Prefill correcto al crear una contra inline: hoy T-11 va sin prefill
   porque la complementaria no es derivable; con el vínculo, prefijar
   la posición correcta del ejecutor de la contra.
3. Métricas combinadas a futuro: "tiempo total en mount" = top + bottom.
4. Rolls bidireccionales / sugerencias automáticas (it.3+).

Antes de implementar, escribir mini-ADR `decisiones/002-vinculo-top-bottom.md`
con la decisión del modelo (campo autoref `posicion_complementaria_id`
vs tabla `posicion_par` vs categoría+rol). Schema v3 + migración + UI
mínima en modal de posición. Retro-vincular pares creados en T-14 a
mano (1 click por par, ≤6 pares).

---

## Decisiones recientes con peso

- **2026-05-14 (s12) — Catálogo del mapa 100 % UI-driven.** Sin seed
  predefinido. Razón: el seed era validación de UI para it.1; una vez
  la UI funciona, el catálogo orgánico desde uso real refleja mejor el
  BJJ del owner que cualquier lista teórica.
- **2026-05-14 (s12) — Sin uso real verificado como criterio de
  cierre.** La validación caso a caso a lo largo de it.1 (T-4 a T-13)
  ya cubre el "funciona en práctica". Una "demo de cierre" habría sido
  retrasarse sin valor.
- **2026-05-14 (s12) — Eliminar ambas rutas dev en T-15.** No
  conservar ninguna como utilidad. Si reaparece la necesidad (smoke
  de migración en it.2+, seed de arranque), se trata como tarea
  nueva con criterio actual.
- **2026-05-13 (s8) — Patrón "+ Crear nueva inline" con
  `returnHandler` + draft del wizard padre.** Cuando un wizard A
  abre otro wizard B en el stack y necesita el id de B al guardar:
  A registra un `returnHandler`, B detecta el handler y, en vez de
  `closeAll + push modal` habitual, hace `pop()` +
  `invokeReturnHandler(id, kind)`. A escribe el id al draft (no a la
  variable local, porque la instancia se desmontó). Patrón replicable
  para T-11 (contras inline).
- **2026-05-13 (s8) — Etiqueta "Continuar" siempre** en wizards
  skippables. El "Continuar/Saltar dinámico" original de T-8 era más
  ruido que beneficio. Aplica a los tres wizards actuales.
- **2026-05-13 (s8) — Validación inline de duplicado con `oninput`,
  nunca con `$effect` reactivo escuchando el campo.** El effect se
  auto-borraba un microtask después de escribir el error. Regla
  general del proyecto (Posicion, Sumision, Tecnica).
- **2026-05-13 (s8) — Acceso al wizard de técnica solo desde el modal
  de una posición.** Origen siempre con contexto. El dropdown del
  FAB de `/mapa` no incluye "Nueva técnica".
- **2026-05-13 (s8) — Múltiples destinos por técnica** anotado en
  MEJORAS_FUTURAS como decisión post-T-14. Dos modos posibles:
  refactor N:M o filas independientes con mismo nombre (modelo actual
  ya lo soporta).
- **2026-05-13 (s8) — Toast/confirm de export-import incluyen las 8
  tablas.** Antes solo contaba 3 v1, daba falsa sensación de no
  exportar el mapa. Commit `a108332`.
- **2026-05-13 (s7) — `onEscapeKeydown` + `onInteractOutside` con
  `preventDefault()` en `Dialog.Content`** como patrón de intercepción
  de cierre cuando hay dirty. Más limpio que abortar tarde en
  `onOpenChange` (bits-ui ya inició el cierre interno cuando llega
  ahí). Aplicar también en el wizard de técnica (T-10).
- **2026-05-13 (s7) — AlertDialog controlado (no `bind:open`)**: el
  cierre por cualquier vía limpia `accionPendiente` y baja el flag.
  El botón rojo "Descartar" baja el flag **antes** de tocar el stack
  para evitar que el cierre simultáneo del Dialog padre se trague el
  `onOpenChange` del AlertDialog.
- **2026-05-13 (s7) — Esc en AlertDialog ≠ descartar.** Solo el botón
  rojo descarta. Esc / click-fuera / Cancelar vuelven al wizard con
  los cambios intactos.
- **2026-05-13 (s7) — Validación de unicidad contra lista pre-cargada
  en memoria** vs query dedicada. Catálogo pequeño. Sin función nueva
  en el módulo de datos. Aplicable a T-10.
- **2026-05-13 (s7) — Dropdown del FAB hacia arriba**
  (`side="top" align="end"`) para no chocar con `BottomNav`.
- **2026-05-13 (s6) — Wizard como `kind` del stack de modales.** No
  Dialog independiente. UN solo Dialog en toda la app. Patrón reusable
  para wizards de sumisión (T-9) y técnica (T-10).
- **2026-05-13 (s6) — Borrado prohibido si hay referencias.** En lugar
  de cascade automático, se obliga al usuario a limpiar primero. Tooltip
  explica el motivo. Mismo criterio aplicará para sumisión (técnicas
  destino) y técnica (contras + rolls).
- **2026-05-13 (s6) — `AlertDialog` + `Tooltip` (shadcn-svelte) como
  estándar UI** sobre `confirm()` y `title` nativos. Heredan tokens y
  dark mode. Sin coste de deps (primitives bits-ui ya estaban).
- **2026-05-13 (s6) — Patrón `class:hidden` para pasos de wizard** en
  lugar de `{#if}` (evita bug de remount con `bind:value` $bindable).
  Aplicar también en T-9 y T-10.
- **2026-05-13 (s6) — Dirty handler registrado en el stack.** El host
  consulta antes de cerrar / pop / volver atrás. Reusable.
- **2026-05-13 (s6) — Móvil del mapa también edita.** Cambio de scope
  respecto a la decisión original (it.1 = móvil read-only) porque el
  stakeholder revela uso real: capturar técnicas durante o tras clase
  desde móvil. FAB "+ Nueva posición" y botones Editar/Borrar visibles
  en cualquier anchura. `REQUISITOS.md` y `ITERACION_1.md` actualizados.
- **2026-05-12 (s5) — Colores semánticos del chip de tipo de técnica.**
  ataque=primary/15, sweep=success/15, escape=warning/15,
  transicion=muted, sumision=destructive/15. Patrón: éxito tonal (sweep
  positivo), alerta resuelta (escape), neutro (transición), cierre
  (sumisión).
- **2026-05-12 (s5) — Colores semánticos del chip de estado.**
  probando=warning, funciona=success, descartada=muted.
- **2026-05-12 (s5) — Sin chip "Sumisión terminal"** en header del modal
  de sumisión (redundante con título + sección de variaciones).
- **2026-05-12 (s5) — Etiqueta "Contras conocidas" se mantiene** pese
  a ambigüedad potencial (¿contras DE o A?). Se reevalúa cuando T-14
  pueble el catálogo real.
- **2026-05-12 (s5) — Seed temporal con relaciones forzadas.** Las
  contras del seed (`/dev/seed-mapa`) son artificiales (Upa↔Armbar
  desde mount, Hip bump sweep↔Armbar desde guardia) — sirven para
  validar UI, no representan BJJ realista. T-14 introduce el catálogo
  realista.
- **2026-05-12 (s4) — REQUISITOS §7 cerrado.** Sumisiones nodos
  terminales, variantes como aristas paralelas con campo `variante`,
  mismo nombre técnico desde distintos orígenes = aristas hermanas.
- **2026-05-12 (s4) — Tipos de técnica finales.** ataque / sweep /
  escape / transicion / sumision. "Defensa" eliminada (vive como
  contra).
- **2026-05-12 (s4) — PRAGMA foreign_keys = ON globalmente.** Bulk
  imports usan PRAGMA OFF + transacción + foreign_key_check para
  tolerar huérfanos sin abortar.
- **2026-05-12 (s4) — Stack de modales = UN Dialog + store.** No
  Dialogs anidados. Evita problemas de focus/overlay y queda como
  patrón reusable.
- **2026-05-12 (s4) — Wizard de técnica en 7 pasos sin fusión.**
- **2026-05-12 (s3) — Bump de patches svelte/kit/vite** para resolver
  bug pre-existente del refresh en prod. ADR `decisiones/001`.
- **2026-05-12 (s3) — `pnpm-lock.yaml` es el único lockfile autoritativo**.
- **2026-05-12 (s3) — `$state` solo dentro de class fields**, nunca
  module-level.
- **2026-05-12 (s3) — Verificación con `pnpm preview` + refresh** antes
  de pushear cambios que toquen SW/PWA/bundle.
- **2026-05-11 (s2) — `bits-ui DateField`** para inputs de fecha.
- **2026-05-11 (s2) — Wizard de sesión como Dialog modal** abierto desde
  home, no como página `/sesion/nueva`.
- **2026-05-11 (s2) — FAB extended (icono + label)** cuando el `+` solo
  sea ambiguo (detalle de sesión).
- **2026-05-10 — Auto-update PWA: opción B (prompt)** sobre opción A
  (skipWaiting).

---

## Notas internas para próxima sesión

- **Node 22 obligatorio** (`.nvmrc`). Asegurar Node 22 activo antes de
  cualquier comando (en una de las dos máquinas se usa `fnm`, en la
  otra `nvm` — verificar antes de tocar shell init).
- **pnpm, no npm.** Dev: `pnpm dev -- --host`. Preview: `pnpm preview
  -- --host`. Install: `pnpm install`.
- **Path quirk de dev:** en `pnpm dev` la app sirve en `/`, no en
  `/bjj-tracker/`. El base path solo aplica en build de producción.
- **Rutas dev eliminadas en T-15** (`/dev/seed-mapa`,
  `/dev/db-migration-smoke`). Si reaparece la necesidad en it.2+, se
  reabre como tarea propia.
- **It.1 cerrada al 100 %.** Próxima sesión arranca it.2 con mini-ADR
  `decisiones/002-vinculo-top-bottom.md` antes de tocar código.
- **Wrappers shadcn disponibles**: `alert-dialog`, `tooltip` (T-8),
  `dropdown-menu` (T-9) y `command`/`popover` (T-10, primitives de
  bits-ui usados via wrapper). Más `Combobox.svelte` propio sobre
  ellos. Reutilizar en T-11 sin reinstalar.
- **Patrones reusables establecidos en T-8 + T-9 + T-10** (aplicar
  tal cual en T-11):
  - Wizard como `kind` del stack (no Dialog independiente).
  - `class:hidden` para pasos del wizard (no `{#if}`).
  - Snapshot + `$derived isDirty` + `setDirtyHandler` en
    `onMount`/`onDestroy`.
  - Validación inline contra lista pre-cargada en memoria, limpieza
    con `oninput` (NO `$effect`).
  - `onEscapeKeydown` + `onInteractOutside` en `Dialog.Content` con
    `preventDefault()` si dirty.
  - AlertDialog controlado (`open`+`onOpenChange`, no `bind:open`).
  - Botón "Descartar" baja el flag **antes** de tocar el stack.
  - Tooltip sobre `<span><Button disabled></span>` para botón Borrar
    bloqueado por referencias.
  - Etiqueta "Continuar" siempre (no "Saltar").
  - Defaults `undefined` para enums skippables (materializar al
    guardar).
  - "+ Crear nueva inline" → `returnHandler` + escritura al draft del
    wizard padre.
- **Bug pendiente de cerrar de it.0.5:** falta T-9 (captura de 1 sesión
  real con el flujo nuevo) + tag `v0.1-it0.5`. No bloquea it.1.
- Push: SSH con `id_ed25519_personal` (alias `github-personal`). Si
  falla con "ssh_askpass", `ssh-add ~/.ssh/id_ed25519_personal`.

---

## Cómo usar este fichero

- Al iniciar una sesión de trabajo: leer este fichero primero para
  ponerse al día.
- Al cerrar una sesión: actualizar las secciones "Última sesión",
  "Próximo paso" y "Decisiones recientes con peso".
- Las secciones macro ("Dónde estamos") cambian con poca frecuencia,
  solo al cerrar / abrir iteración.
