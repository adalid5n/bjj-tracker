# Estado actual del proyecto

**Última actualización:** 2026-05-19 (sesión 29, T-2.it4 cerrada como ya hecha — feature ya existía en código)
**Fase activa:** Iteración 4 abierta — "**Pulido post-grafo y consistencia UX**". T-1.it4 ✅, T-3.it4 ✅, T-5.it4 ✅, T-2.it4 ✅; queda **solo T-4** para cerrar la iteración.
**Iteración en curso:** it.4. Plan formal en `ITERACION_4.md` (v1.1). Scope: T-1 ✅, T-3 ✅, T-5 ✅, T-2 ✅, T-4 (auditoría tokens). Cierre con tag `v0.4.1-it4`.

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
