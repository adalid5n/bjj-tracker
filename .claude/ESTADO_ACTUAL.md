# Estado actual del proyecto

**Última actualización:** 2026-05-13 (cierre sesión 7)
**Fase activa:** Iteración 1 — Mapa técnico básico
**Iteración en curso:** it.1 (9.5/15 tareas cerradas: T-1 a T-9, T-2.5 intercalada)

---

## Dónde estamos en macro

Iteración 0 ✅ cerrada en `v0.1-it0` (2026-05-10). App permite capturar
sesiones, rolls, compañeros, ver tabla filtrable y exportar/importar JSON.

Iteración 0.5 ✅ funcionalmente cerrada (auto-update PWA + wizards + chips
+ DateField). Falta solo T-9 (verificación en uso real con 1 sesión
capturada con el flujo nuevo) y tag `v0.1-it0.5`. Pendiente, no bloquea.

Estamos en **iteración 1** — base estructural del mapa técnico. Plan
completo en `ITERACION_1.md`. 9 tareas y media cerradas (T-1 a T-9,
T-2.5 intercalada). El recorrido encadenado de modales funciona
end-to-end y ya se pueden crear / editar / borrar posiciones **y
sumisiones** desde móvil y desktop. Queda el wizard de técnica (T-10),
la UI de contras (T-11), la captura inline en roll (T-12) y el cierre
(T-13 a T-15).

---

## Última sesión (2026-05-13, sesión 7)

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

**T-10 — Editor de TECNICA (wizard).** El más complejo de los tres:
7 pasos con lógica condicional en el paso de destino (si tipo = sumision
combobox de sumisiones + "+ crear nueva sumisión" inline; si no,
combobox de posiciones + "+ crear nueva posición" inline). Mismo
patrón que T-8/T-9 (kind nuevo, dirty handler, AlertDialog,
intercepción Esc/interact con preventDefault).

**Notas para T-10:**
- Reutilizar todo el patrón consolidado: `kind: 'wizard-tecnica'`,
  snapshot/dirty, `class:hidden` para pasos, `setDirtyHandler`,
  validación inline contra lista pre-cargada, AlertDialog controlado.
- Validación de unicidad: UNIQUE `(nombre, posicion_origen_id,
  variante)` en BD. Pre-cargar `listTecnicas()` y validar antes de
  guardar. Probablemente mejor al final del wizard (no es practicable
  validar al avanzar del paso 1 porque depende también de origen +
  variante, que vienen en pasos posteriores).
- "+ Crear nueva posición" / "+ Crear nueva sumisión" inline desde el
  paso destino: push al stack del wizard correspondiente y volver al
  wizard de técnica al guardar. Estudiar si el patrón `kind` actual
  basta o hace falta un `returnTo` en el entry del stack.
- Borrado prohibido si la técnica es referenciada por alguna contra o
  por algún roll (ambos linkeos futuros — la primera vía
  `tecnica_contras`, la segunda no aplica todavía en it.1).
- Decidir si el wizard de técnica entra también en el dropdown de
  `/mapa` ("Nueva técnica") o solo se abre desde dentro de un modal de
  posición. La 2ª es la canónica (técnica = arista, necesita origen).

Después de T-10: T-11 (UI de contras), T-12 (captura inline en wizard
de roll), T-13 (chips en detalle de sesión + filtro nuevo en /rolls),
T-14 (semilla real con catálogo BJJ realista + uso real), T-15
(cierre con tag `v0.2-it1`).

---

## Decisiones recientes con peso

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
  cualquier comando (la máquina usa `fnm`, no `nvm`: `fnm use 22`).
- **pnpm, no npm.** Dev: `pnpm dev -- --host`. Preview: `pnpm preview
  -- --host`. Install: `pnpm install`.
- **Path quirk de dev:** en `pnpm dev` la app sirve en `/`, no en
  `/bjj-tracker/`. El base path solo aplica en build de producción.
  Las URLs de smoke/seed durante dev son `/dev/db-migration-smoke` y
  `/dev/seed-mapa` (sin prefijo).
- **Seed temporal vigente en `/dev/seed-mapa`** — botones "sembrar" y
  "limpiar". Ahora siembra también 2 contras + 2 armbars hermanas
  ("Armbar" con variantes "desde guardia" / "desde mount") para validar
  T-6/T-7. Se elimina en T-15.
- **Smoke de migración vigente en `/dev/db-migration-smoke`** — útil
  para sanidad de schema. Se evalúa mantener o eliminar al cerrar it.1.
- **Tareas que faltan de it.1:** T-10, T-11, T-12, T-13, T-14, T-15.
  T-9 cerrada esta sesión.
- **Wrappers shadcn disponibles**: `alert-dialog`, `tooltip` (de T-8) y
  `dropdown-menu` (de T-9). Usar en T-10 sin reinstalar.
- **Patrones reusables establecidos en T-8 + T-9** (aplicar tal cual
  en T-10):
  - Wizard como `kind` del stack (no Dialog independiente).
  - `class:hidden` para pasos del wizard (no `{#if}`).
  - Snapshot + `$derived isDirty` + `setDirtyHandler` en
    `onMount`/`onDestroy`.
  - Validación inline contra lista pre-cargada en memoria.
  - `onEscapeKeydown` + `onInteractOutside` en `Dialog.Content` con
    `preventDefault()` si dirty.
  - AlertDialog controlado (`open`+`onOpenChange`, no `bind:open`).
  - Botón "Descartar" baja el flag **antes** de tocar el stack.
  - Tooltip sobre `<span><Button disabled></span>` para botón Borrar
    bloqueado por referencias.
  - Defaults `undefined` para enums skippables (materializar al
    guardar).
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
