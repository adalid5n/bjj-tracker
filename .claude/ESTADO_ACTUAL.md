# Estado actual del proyecto

**Última actualización:** 2026-05-14 (cierre sesión 13)
**Fase activa:** Iteración 2 — T-1.it2 cerrada, T-2.it2 siguiente
**Iteración en curso:** it.2 (1/7 tareas previstas cerradas; T-1.it2)

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

## Última sesión (2026-05-14, sesión 13)

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

**Pendiente del owner** (no bloquea cierre técnico):

- Retro-vincular pares ya creados en it.1 desde la UI (1 click por
  par). Datos en su DB local OPFS, no en repo. Ritmo libre.

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

**T-2.it2 — Refactor "plano-edit" en los 3 wizards
(Pos/Sum/Tec).** Modo `editar` debe pasar de stepper a formulario
único con todos los campos visibles a la vez (referencia: `RollEditor`).
Modo `crear` se queda con stepper (guía al usuario que no sabe qué
viene). Aplicar consistentemente a `PosicionWizard`, `SumisionWizard`
y `TecnicaWizard` (regla del proyecto: fixes a wizards aplican a
TODOS los equivalentes).

Subtareas previsibles:

1. Decidir estructura: ¿mismo componente con dos ramas internas, o
   componentes hermanos `*Editor` vs `*Wizard`? Mi inclinación:
   mismo componente, dos ramas — un solo punto de carga/validación/
   save.
2. PosicionWizard: rama editar plana con los 4 campos (nombre,
   categoría, tipo, complementaria, notas).
3. SumisionWizard: rama editar plana (nombre, notas).
4. TecnicaWizard: rama editar plana (nombre, variante, origen, tipo,
   destino condicional, estado, detalles, errores).
5. Verificar que el flujo "+ Crear nueva inline" sigue funcionando
   desde el wizard padre cuando ambos pueden ser planos / stepper
   mixto.
6. Verificación en preview + commit + push.

Por hacer pendiente del owner (no bloquea T-2.it2):

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
