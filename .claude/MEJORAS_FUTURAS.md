# Mejoras futuras (backlog interno)

**Estado:** documento vivo
**Propósito:** backlog interno de bugs, mejoras, refactors y decisiones pendientes que no entran en la iteración en curso. Vista pública filtrada: [`ROADMAP.md`](../ROADMAP.md) (no copiar aquí detalles internos allí sin que lo pida el owner).

Cada entrada lleva, justo bajo su título, una línea de clasificación:

`**MF-NNN** · <Tipo> · Impacto <Alto|Medio|Bajo> · Esfuerzo <S|M|L> · Prioridad <P1|P2|P3|—> · <Estado>`

- **ID `MF-NNN`:** estable y secuencial; nunca se reutiliza (las entradas hechas lo conservan). Ancla HTML `<a id="mf-nnn"></a>` encima del título para enlazar sin depender del texto.
- **Tipo:** Bug / Mejora / Refactor / Decisión (decisión de producto pendiente, sin código todavía).
- **Impacto:** Alto / Medio / Bajo — gravedad en bugs, valor en mejoras y refactors.
- **Esfuerzo:** S (<1 h) / M (una sesión) / L (varias sesiones o migración de esquema).
- **Prioridad:** P1 / P2 / P3 — **solo la fija el owner**; `—` = sin asignar.
- **Estado:** Abierta / En curso / Hecha / Descartada (+ "pendiente de refinar" si aún no está lista para implementar).

Debajo, el cuerpo: Origen (fecha y fuente), Qué / Idea, Por qué, Cuándo y, si se conocen, notas técnicas con `fichero:línea`. Altas, cierres y repriorización: skill [`backlog-item`](skills/backlog-item/SKILL.md).

## Índice de entradas abiertas

Orden: Prioridad (P1, P2, P3, luego sin asignar), después Impacto, después ID.

| ID | Título | Tipo | Impacto | Esfuerzo | Prioridad | Estado |
|---|---|---|---|---|---|---|
| MF-028 | [Fallos catálogo e importación (baseline)](#mf-028) | Bug | Alto | L | P1 | Abierta |
| MF-029 | [Importar clase 2.0 — historial, reintentar, vista previa, revertir](#mf-029) | Mejora | Alto | L | P1 | Abierta · solo queda revertir |
| MF-043 | [Borrar una técnica usada en rolls borra esos vínculos sin avisar](#mf-043) | Bug | Alto | M | P1 | Abierta |
| MF-026 | [Bugs de importar clase (validación T-2.it7): micrófono y Refinar](#mf-026) | Bug | Medio | M | P1 | Abierta |
| MF-040 | [Ficha del mapa: cerrar al cambiar de contexto + hoja inferior con alturas fijas](#mf-040) | Mejora | Medio | L | P1 | Abierta |
| MF-041 | [Barra de edición del grafo: "Guardar" + "Cancelar"](#mf-041) | Mejora | Medio | M | P1 | Abierta |
| MF-012 | [Botón "Forzar actualización" en /ajustes](#mf-012) | Mejora | Medio | S | P2 | Abierta |
| MF-032 | [Visualización de contras — F3 sub-grafo filtrado](#mf-032) | Mejora | Medio | L | P2 | Abierta |
| MF-039 | [GitHub Actions del deploy a Node 24](#mf-039) | Refactor | Medio | S | P2 | Abierta |
| MF-045 | [Roll: crear compañero inline no se puede deshacer](#mf-045) | Bug | Medio | M | P2 | Abierta |
| MF-046 | [Ambos con elemento ya existente en una disciplina: crear solo donde falta](#mf-046) | Mejora | Medio | M | P2 | Abierta |
| MF-002 | [Asistentes: botón "Saltar" en pasos opcionales](#mf-002) | Mejora | Medio | M | P3 | Abierta |
| MF-003 | [Disciplina preseleccionada + "añadir también a la otra"](#mf-003) | Mejora | Medio | L | P3 | Abierta · pendiente de refinar |
| MF-004 | [Reducir copy / texto inicial en cada pantalla](#mf-004) | Mejora | Medio | L | P3 | Abierta |
| MF-017 | [Una técnica con múltiples destinos posibles](#mf-017) | Decisión | Medio | L | P3 | Abierta |
| MF-020 | [Reducir fricción al crear técnica tipo sumisión](#mf-020) | Mejora | Medio | M | P3 | Abierta |
| MF-022 | [Resumen automático post-sesión](#mf-022) | Mejora | Medio | M | P3 | Abierta |
| MF-023 | [Sumisiones vs técnicas — redundancia del modelo](#mf-023) | Decisión | Medio | L | P3 | Abierta |
| MF-027 | [Duplicar un elemento en la otra disciplina](#mf-027) | Mejora | Medio | M | P3 | Abierta |
| MF-030 | [Panel de alertas en el grafo — calidad del catálogo](#mf-030) | Mejora | Medio | L | P3 | Abierta |
| MF-044 | [Skills de flujo: validar, cerrar tarea y arranque de sesión](#mf-044) | Mejora | Medio | S | P3 | Abierta |
| MF-008 | [Roll editor — sugerir compañero por defecto](#mf-008) | Mejora | Bajo | M | P3 | Abierta |
| MF-018 | [Cards en items — revisar saturación visual](#mf-018) | Mejora | Bajo | S | P3 | Abierta |
| MF-019 | [C2 — mínimo de rolls configurable para la bandera](#mf-019) | Mejora | Bajo | S | P3 | Abierta |
| MF-021 | [Simplificar enum de TipoTecnica](#mf-021) | Decisión | Bajo | L | P3 | Abierta |
| MF-025 | [Sistematizar sombras inline → tokens](#mf-025) | Refactor | Bajo | S | P3 | Abierta |
| MF-031 | [Técnicas "sin acabar" (sin destino)](#mf-031) | Mejora | Bajo | L | P3 | Abierta |
| MF-033 | [Reducir el precache PWA (duplicación del .wasm)](#mf-033) | Mejora | Bajo | M | P3 | Abierta |
| MF-034 | [FOUC inicial con tema oscuro persistido](#mf-034) | Bug | Bajo | S | P3 | Abierta |
| MF-035 | [CATEGORIAS_ORDEN / CATEGORIA_LABEL duplicados](#mf-035) | Refactor | Bajo | S | P3 | Abierta |
| MF-042 | [Repo público vs privado](#mf-042) | Decisión | Medio | M | — | Abierta |
| MF-047 | [Posiciones complementarias: sugerir siempre y detectar parejas sin emparejar](#mf-047) | Mejora | Medio | M | — | Abierta |
| MF-048 | [Borrar bloqueado sin explicación visible (móvil)](#mf-048) | Bug | Medio | M | — | Abierta |

**Hechas** (fuera del índice; siguen en su sección): [MF-001](#mf-001) Modo hobbyist vs avanzado, [MF-005](#mf-005) Rediseño de home, [MF-006](#mf-006) Long-press drag, [MF-007](#mf-007) Reducir read-only de chips, [MF-009](#mf-009) FAB nuevo compañero, [MF-010](#mf-010) Editor de compañero por pasos, [MF-011](#mf-011) Orden de /rolls, [MF-013](#mf-013) Modo oscuro, [MF-014](#mf-014) Design tokens, [MF-015](#mf-015) Grafo en móvil, [MF-016](#mf-016) Complementarias top/bottom, [MF-024](#mf-024) Tab Sumisiones, [MF-036](#mf-036) virtual:pwa-register, [MF-038](#mf-038) Columna experiencia_anos, [MF-037](#mf-037) Loop de refresh tras deploy.

---

## UX

<a id="mf-001"></a>
### ~~Modo "hobbyist" vs "avanzado" — perfiles de uso~~ — HECHO en it.6 (2026-05-20, tag `v0.6-it6`)

**MF-001** · Mejora · Impacto — · Esfuerzo — · Prioridad — · Hecha (2026-05-20, it.6, tag `v0.6-it6`)

Toggle "Vista avanzada" en `/ajustes`. Tabla `app_settings` (key/value)
+ `SettingsState` reactivo. En avanzado: home muestra `AnalisisHome`
("Problemas recientes") y la lista de sesiones del día es scrolleable
(~2 cards visibles); `/rolls` muestra `AnalisisPanel`; wizards y
editores reabren los 9 campos opcionales recortados en s36 (notas,
detalles, errores comunes, foco, técnica clase, obs profesor,
duración, `s.foco` en cards de home). Default hobbyist.

<a id="mf-002"></a>
### Asistentes: botón "Saltar" en pasos opcionales

**MF-002** · Mejora · Impacto Medio · Esfuerzo M · Prioridad P3 · Abierta

- **Origen:** Adalid, 2026-10-16 (validación de T-4.it7)
- **Idea:** en los pasos opcionales de los asistentes, el botón dice "Saltar" mientras el campo esté vacío y pasa a "Continuar" en cuanto se rellena.
- **Por qué:** deja claro que el paso no es obligatorio y que pulsar no pierde nada; patrón habitual en onboarding/asistentes móviles.
- **Alcance:** todos los asistentes por pasos (Posicion, Sumision, Tecnica y los editores con pasos), por la regla de fixes consistentes. Ojo a la accesibilidad: el botón cambia de texto, no de sitio.
- **Cuándo:** pulido de asistentes; barato, puede ir suelto.

<a id="mf-003"></a>
### Disciplina preseleccionada + "añadir también a <la otra>" — PENDIENTE DE REFINAR

**MF-003** · Mejora · Impacto Medio · Esfuerzo L · Prioridad P3 · Abierta · pendiente de refinar

- **Estado:** idea, no lista para implementar (owner, 2026-10-16). Antes hay que cerrar los riesgos y el alcance de abajo.

- **Origen:** Adalid, 2026-10-16 (validación de T-4.it7)
- **Idea:** al crear desde el mapa, en vez de elegir BJJ / Grappling / Ambos, la disciplina activa viene dada y hay una casilla "Añadir también a Grappling" (o BJJ). Marcada = lo que hoy es "Ambos" (dos copias); el modelo de datos no cambia.
- **Por qué:** quita una decisión en el caso típico (crear en la disciplina que estás viendo).
- **Riesgos / a decidir:** crear en la disciplina equivocada sin darse cuenta → mostrar la disciplina en la cabecera del asistente. Choca con T-1.it7 (chips de disciplina `required`), que quedaría sustituido en los asistentes.
- **Dónde más afecta:** asistentes de Posición, Sumisión y Técnica abiertos desde el mapa; los mismos abiertos desde el editor de roll (la "actual" sería la del roll); importar clase (selector en el primer paso). **No aplica** a sesiones (BJJ/Grappling/Ambos significa clase mixta, no copias) ni a rolls (solo BJJ o Grappling).
- **Cuándo:** tras cerrar T-4 (depende del modelo de copias). Necesita change de OpenSpec (cambia `selectores` y `catalogo-tecnico`).

<a id="mf-004"></a>
### Reducir copy / texto inicial en cada pantalla

**MF-004** · Mejora · Impacto Medio · Esfuerzo L · Prioridad P3 · Abierta

- **Origen:** Adalid, 2026-05-19 (sesión 26)
- **Estado actual:** muchas pantallas tienen títulos largos, descripciones explicativas, labels redundantes o textos de ayuda que pesan visualmente al entrar.
- **Pantalla ancla — `/rolls`** (señalada por owner como "se muestra mucho de golpe"). Puntos concretos detectados:
  - ~~**Labels de chip-picker read-only en cada card**~~ — HECHO en s37 (2026-05-20, commit `1fd56d4`). Cards reducidas de 4 filas a 2 ("Fue bien" | "Fue mal"), mezcla plana posiciones + técnicas. Aplicado tanto en `/rolls` como en `/sesion/[id]` (regla de consistencia).
  - **Filtro de Posición desplegado**: 5 sub-labels de categoría (`Guardia`, `Control superior`, `Espalda`, `Transición`, `Otro`) + chips de cada. Cuando se abre Filtros, el bloque se vuelve denso. Opción: categorías colapsables por defecto, o chips planos con prefijo de categoría.
  - **Contador `{rolls.length} roll(s)`** sobre la lista — texto pequeño pero awkward por el "(s)" plural. Eliminar o convertir en chip discreto al lado del título.
  - **Labels de filtros redundantes con su `Select` placeholder** ("Resultado" arriba + "Cualquiera" dentro del trigger). En filtros opcionales, el placeholder solo basta.
- **Idea (transversal):** auditar pantalla por pantalla qué texto se puede:
  - Eliminar si no aporta (instrucciones obvias, descripciones redundantes con un icono).
  - Acortar (títulos largos a 1-3 palabras).
  - Mover a tooltip / popover (ayuda accesible bajo demanda en lugar de siempre visible).
- **Por qué:** primera impresión más limpia al abrir cualquier pantalla. Reduce carga cognitiva en captura post-clase (CU-1). Coherente con la dirección de "modo edición" en grafo (UI no satura por defecto).
- **Cuándo:** transversal. Puede ir como tarea de pulido propia (lista de pantallas a auditar) o entrar pieza a pieza cuando se toque una pantalla por otro motivo. Recomendado: barrido formal al cerrar features grandes para mantener consistencia.

<a id="mf-005"></a>
### ~~Rediseño de home — calendario + agrupamiento de sesiones~~ — PROMOVIDO a it.5 (2026-05-19)

**MF-005** · Mejora · Impacto — · Esfuerzo — · Prioridad — · Hecha (promovida a it.5, 2026-05-19)

Estado: el agrupamiento por día con headers se entregó en T-5.it4 (commit
`0d50b00`). El calendario y la visión general de "qué información merece la
primera pantalla" entran en **Iteración 5 — Rediseño de home (calendario +
dashboard)**, plan formal en `../docs/iterations/ITERACION_5.md`. Esta entrada queda como
referencia histórica; el seguimiento activo vive en el plan de it.5.

Entrada original (preservada para contexto histórico):

### [Entrada original — antes de promover]

- **Origen:** Adalid, 2026-05-19 (sesión 26)
- **Estado actual:** home es una lista plana de sesiones (sin agrupamiento por proximidad temporal, sin vista de calendario).
- **Idea:**
  - **Calendario en home:** vista mensual (o semanal) que marque los días con sesiones; tap en un día abre la sesión / las sesiones de ese día. Reusar el `Calendar` de bits-ui (ya disponible según `../CLAUDE.md`) para no construir desde cero.
  - **Agrupar sesiones con headers por día (patrón `/rolls`):** "Hoy" y "Ayer" como labels reservados; el resto de días con su fecha formateada como header (`lun, 12 may 2026`). Decisión owner 2026-05-19: usar el mismo patrón que ya existe en `/rolls` (no collapse agresivo de "Antiguos").
  - **Visión general "mejor home":** paraguas para revisar qué información merece estar en la primera pantalla (¿stats rápidas? ¿próxima clase? ¿últimos rolls?). A concretar.
- **Por qué:** home es la primera pantalla en cada apertura de la PWA. Hoy es funcional pero pobre (lista plana). Calendario + agrupamiento dan navegación temporal y reducen scroll para ir a sesiones recientes.
- **Cuándo:** post-it.4. Probablemente como iteración dedicada (it.5 o it.6) — el rediseño general de home no encaja en una tarea de pulido suelta; conviene plan formal. Las piezas concretas (calendario y agrupamiento) podrían adelantarse como tareas sueltas si una de ellas duele especialmente antes de la iteración formal.

<a id="mf-006"></a>
### ~~Long-press para activar el drag de nodos en el grafo~~ — HECHA en T-1.it4 (commits `93baea6` + `4cbacae`, 2026-05-19)

**MF-006** · Mejora · Impacto — · Esfuerzo — · Prioridad — · Hecha (T-1.it4, 2026-05-19)

Resuelto con solución distinta a la planteada aquí: en lugar de long-press
(approach inicial que se descartó por incompatibilidad con Cytoscape — ver
`ESTADO_ACTUAL.md §Sesión 25` para detalle técnico), se introdujo un **modo
edición explícito** vía botón "Mover nodos" en el sub-header de `/mapa`. El
problema original (drag accidentales en móvil al panear/scrollear) quedó
cubierto: en modo navegación los nodos no son grabbable.

<a id="mf-007"></a>
### ~~Reducir read-only de chips en /rolls y /sesion/[id]~~ — HECHO 2026-05-16 (parcial)

**MF-007** · Mejora · Impacto — · Esfuerzo — · Prioridad — · Hecha (2026-05-16, parcial)

- **Origen:** T-3.it2.b, feedback Adalid 2026-05-16
- **Hecho:** rediseño completo del chip-picker (componente nuevo `ChipPicker.svelte`) aplicado tanto a captura como a read-only. Read-only ahora usa `flex flex-wrap` (sin filas-fijas, sin scroll horizontal — decisión post-validación del owner). Estética alineada entre editable y read-only.
- **Pendiente (si reaparece la fricción):** quitar/abreviar el label de texto completo ("Posiciones que fueron bien:" → icono o más corto). Quedó tal cual; en uso real verá si molesta. Si vuelve, se reabre como tarea propia.

<a id="mf-008"></a>
### Roll editor — sugerir compañero por defecto + selector inteligente

**MF-008** · Mejora · Impacto Bajo · Esfuerzo M · Prioridad P3 · Abierta (Parte B hecha; queda Parte A)

- **Origen:** T-6, feedback Adalid 2026-05-09
- **Parte A — sugerencia automática (PENDIENTE):** al añadir un roll
  nuevo, pre-seleccionar un compañero como sugerencia. Algoritmo a
  decidir: último compañero de la sesión actual, o más frecuente del
  usuario, o último de la app en general. Diferido a iteración con
  foco en captura (decisión 2026-05-19 al formalizar it.4).
- **~~Parte B — selector tipo combobox~~ — HECHA** (probablemente en
  T-10/T-11 de it.1, confirmado y cerrado oficialmente en sesión 29 al
  abordar T-2.it4). El componente `src/lib/components/CompaneroCombobox.svelte`
  ya implementa autocompletado + opción "+ Crear nuevo" inline; está
  integrado en `RollEditor.svelte:689-694` (step 1, "¿Con quién?").
- **Por qué (de la entrada original):** captura más rápida en el caso
  primario (CU-1 tras clase). Reducir taps y modales anidados.
- **Cuándo (solo aplicable a Parte A):** iteración con foco en captura.
  Requiere antes decisión de algoritmo y validación en uso real.

<a id="mf-009"></a>
### ~~Botón "+ Nuevo compañero" debe ser FAB igual que "+ Nueva sesión"~~ — HECHO en T-9+T-10 (commit pendiente)

**MF-009** · Mejora · Impacto — · Esfuerzo — · Prioridad — · Hecha (T-9+T-10)

La nueva ruta `/companeros` usa FAB consistente con `/`. La página dev `/dev/companeros-smoke` se queda con el botón normal porque es solo sanity check.

<a id="mf-010"></a>
### ~~Editor de compañero (y formularios similares) — captura por pasos con auto-avance + sugerencias en lugar de dropdowns~~

**MF-010** · Mejora · Impacto — · Esfuerzo — · Prioridad — · Hecha (verificado en código 2026-10-16: `CompaneroEditor.svelte` y `RollEditor.svelte` ya son asistentes por pasos con chips)

> Nota (2026-10-16): cerrada al clasificar el backlog — los editores de compañero y roll ya son asistentes por pasos con chips (`CompaneroEditor.svelte`, `CinturonChips.svelte`, `RollEditor.svelte`). Si falta algo concreto (p. ej. auto-avance en algún paso), reabrir como entrada nueva.

- **Origen:** T-4, feedback Adalid 2026-05-09
- **Idea:** rediseñar el editor de compañero para que en lugar de un formulario único con todos los campos visibles, sea una secuencia de "pasos" o "tabs" que avancen **automáticamente** cuando el usuario rellena cada campo. Para campos con valores cerrados (cinturón, peso relativo, tipo, resultado, etc.), reemplazar `Select` (dropdown) por **chips de sugerencia** que el usuario tappee directamente. Objetivo: 1 tap por campo, idealmente sin abrir teclados ni desplegables.
- **Por qué:**
  - CU-1 (capturar sesión tras clase) es el caso de uso primario y debe ser ágil en móvil.
  - Cada dropdown abre un overlay extra → 2-3 taps para cada selección.
  - Auto-avance reduce el "¿qué falta?" cognitivo y mantiene flow.
- **Aplica también a:** editor de roll (T-6) y posiblemente editor de sesión (T-5) — todos tienen patrón formulario con campos enum.
- **Cuándo:** tras cerrar Iteración 0 con captura básica funcionando, antes de empezar Iteración 1.

---

<a id="mf-011"></a>
### ~~Orden de la tabla `/rolls` — más reciente arriba~~

**MF-011** · Mejora · Impacto — · Esfuerzo — · Prioridad — · Hecha (verificado en código 2026-10-16: `listAllRolls` ordena `s.fecha DESC, r.created_at DESC`, `src/lib/rolls.ts:98`)

> Nota (2026-10-16): cerrada al clasificar el backlog — el orden pedido ya está en el código.

- **Origen:** Adalid, 2026-05-11
- **Estado actual:** se ordena por `sesion.fecha DESC`, y dentro de la
  misma sesión por `rolls.orden ASC` (1, 2, 3…). Eso significa que un
  roll nuevo añadido a una sesión existente aparece *después* de los
  rolls anteriores de la misma sesión, no arriba del todo.
- **Idea:** ordenar primero por `created_at DESC` (o `updated_at DESC`)
  para que el último capturado aparezca siempre el primero — esa es la
  expectativa del usuario al revisar "qué acabo de meter".
- **Por qué:** captura post-clase típica: añades 3 rolls a una sesión
  de hoy y quieres ver el último que metiste en el tope, no enterrado
  bajo el primero.
- **Cuándo:** post-it.0.5, sin urgencia.

<a id="mf-012"></a>
### Botón "Forzar actualización" en `/ajustes`

**MF-012** · Mejora · Impacto Medio · Esfuerzo S · Prioridad P2 · Abierta

- **Origen:** Adalid, 2026-05-11 — tras incidente del service worker
  atascado sirviendo HTML viejo que apuntaba a chunks JS borrados
  (página en blanco).
- **Idea:** botón en `/ajustes` que ejecute en orden:
  1. `navigator.serviceWorker.getRegistrations()` → `unregister()` en cada uno.
  2. `caches.keys()` → `caches.delete()` en cada uno.
  3. `window.location.reload()`.
- **Por qué:** el toast "nueva versión disponible" de T-8 cubre el caso
  normal. Pero si el SW está atascado de verdad (no detecta que hay
  versión nueva), el toast nunca aparece y el usuario se queda colgado.
  Un botón "salida de emergencia" en Ajustes evita que el usuario tenga
  que ir a Ajustes del sistema Android → Borrar almacenamiento de Chrome.
- **Cuándo:** junto con T-8 (auto-update PWA) o inmediatamente después.

<a id="mf-013"></a>
### ~~Modo oscuro con toggle en Ajustes~~ — HECHO en sesión 11 (commit pendiente)

**MF-013** · Mejora · Impacto — · Esfuerzo — · Prioridad — · Hecha (sesión 11, 2026-05-14)

Implementado en sesión 11 (2026-05-14). `ThemeState` singleton en
`src/lib/theme.svelte.ts`, toggle 3 botones (Auto/Claro/Oscuro) en
`/ajustes`, persistencia `localStorage['theme']`, suscripción a
`matchMedia('(prefers-color-scheme: dark)')`. Decisión documentada en
`../docs/adr/003-theme-manager.md`.

<a id="mf-014"></a>
### ~~Sistema de diseño coherente — usar design tokens en lugar de Tailwind raw~~

**MF-014** · Refactor · Impacto — · Esfuerzo — · Prioridad — · Hecha (verificado 2026-10-16: sin colores Tailwind crudos en `src/`; la regla vive en `CLAUDE.md`. Sombras → MF-025)

> Nota (2026-10-16): cerrada al clasificar el backlog — `grep` sin colores Tailwind crudos en `src/` y la regla está en `CLAUDE.md`. Lo pendiente (sombras inline) vive en MF-025.

- **Origen:** T-6, feedback Adalid 2026-05-09
- **Estado actual mixto:**
  - Componentes shadcn-svelte (Button, Dialog, Input, Select, etc.) ya usan los design tokens del sistema definidos en `src/routes/layout.css` como CSS vars (`--primary`, `--destructive`, `--muted`, etc.). Coherentes entre sí.
  - Componentes propios (`Fab.svelte`, badges de resultado en P2, mensajes "Sin compañero"/"vacío") usan Tailwind crudo (`bg-blue-600`, `text-green-800`, etc.). Improvisado.
- **Idea:**
  1. Migrar componentes custom para que usen los tokens semánticos shadcn (`bg-primary`, `text-destructive`, `bg-muted`, `text-muted-foreground`, etc.). Así el cambio de tema (light/dark, color base) refresca toda la app coherentemente.
  2. Añadir tokens del dominio cuando haga falta (color para "dominé" / "equilibrado" / "perdí", color para empty state, color para "vacío"/sin datos). Definirlos como CSS vars en `layout.css` y referenciarlos por nombre semántico, no por color literal.
- **Por qué:** consistencia visual, theming futuro (light/dark), facilita cambio de paleta global sin tocar componentes uno a uno.
- **Cuándo:** cuando arranque la fase de pulido visual de Iteración 0 o antes de "release público" si llega.

<a id="mf-015"></a>
### ~~Vista grafo del mapa técnico debe estar disponible (lectura) en móvil~~

**MF-015** · Mejora · Impacto — · Esfuerzo — · Prioridad — · Hecha (it.3: grafo siempre visible, en móvil con drawer inferior — ADR-006)

> Nota (2026-10-16): cerrada al clasificar el backlog — desde it.3 el grafo se ve siempre en `/mapa`, también en móvil (drawer inferior, ADR-006).

- **Origen:** T-9+T-10 polish, feedback Adalid 2026-05-09
- **Idea:** cuando llegue iteración 3 (vista grafo con Cytoscape.js), no limitarla a desktop. El móvil debe poder VERLA (lectura, sin edición). Razón explícita de Adalid: "necesito tener el conocimiento a mano" — durante o tras una clase quiere consultar técnicas/contras/posiciones desde el móvil, no solo en casa.
- **Refinamiento de REQUISITOS:** §4.1 dice "Móvil: captura + lectura del mapa técnico (no edición)". Esto ya cubre lectura, pero deja ambiguo si lectura incluye la vista grafo o solo lista. Aclarar como sí: vista grafo en móvil = sí (read-only).
- **Implicación técnica:** Cytoscape.js debe rendear bien en móvil (touch gestures, zoom). Validarlo cuando se aborde iteración 3.
- **Cuándo:** iteración 3.

<a id="mf-016"></a>
### ~~Vincular posiciones complementarias (top ↔ bottom)~~ — MOVIDA a tarea concreta

**MF-016** · Mejora · Impacto — · Esfuerzo — · Prioridad — · Hecha (movida a T-1.it2)

Decidido 2026-05-13 (s9) — primera tarea de **it.2** (T-1.it2). Ver
`ESTADO_ACTUAL.md` sección "Iteración 2 — entrada confirmada".
Mini-ADR `../docs/adr/002-vinculo-top-bottom.md` a escribir cuando arranque.

<a id="mf-017"></a>
### Una técnica con múltiples destinos posibles

**MF-017** · Decisión · Impacto Medio · Esfuerzo L · Prioridad P3 · Abierta

- **Origen:** T-10, feedback Adalid 2026-05-13
- **Idea:** hoy una técnica tiene UN destino (`posicion_destino_id`
  o `sumision_destino_id`, exclusivo). En BJJ real el mismo movimiento
  puede terminar en sitios distintos según reacción del rival (ej.
  "Hip bump sweep" puede dejarte en mount, en knee-on-belly o en side
  control top según cómo reaccione). Soportarlo permitiría modelar la
  arista realmente como una "ejecución" con varios resultados.
- **Modos de modelarlo:**
  - **A) Refactor schema N:M**: tabla `tecnica_destino` con un row
    por (técnica, destino). Cambio grande: schema, migración,
    `tecnicas.ts`, sync.ts, wizard de técnica (paso 5 pasa a ser
    multi-select), modal de técnica, vista grafo (it.3) genera N
    aristas hermanas. Más fiel a la realidad.
  - **B) Sin tocar nada**: una técnica por destino, mismo nombre,
    distintas filas (variantes). Ya soportado por el modelo. El
    catálogo tiene más entradas pero la UI las puede agrupar por
    nombre (igual que hace con variantes).
- **Por qué:** depende del uso real. Si al rellenar el catálogo
  empieza a sentirse forzado tener "técnica X→A" + "técnica X→B" +
  "técnica X→C" como entradas independientes, refactor a A.
- **Cuándo:** decisión post-T-14 (uso real con catálogo poblado) o
  cuando llegue iteración 3 (vista grafo) y veamos si las aristas
  hermanas se ven raras.

<a id="mf-018"></a>
### Cards en items — revisar "saturación visual" tras uso real

**MF-018** · Mejora · Impacto Bajo · Esfuerzo S · Prioridad P3 · Abierta

- **Origen:** Adalid, sesión 11 (2026-05-14), tras aplicar M9.
- **Estado actual:** items de lista (home, rolls, mapa, sesion/[id],
  companeros) llevan `rounded-lg border border-border bg-card shadow-xs`
  + `space-y-2` entre items. Adalid reporta que se ve mejor que la
  versión "pelada" anterior pero "un poco saturado de elementos".
- **Idea (a evaluar en uso real):** bajar 1 nivel alguna de las
  señales: quitar `shadow-xs` (border + bg ya da frame), o usar
  `border-border/60` (borde más sutil), o reducir `space-y-2` →
  `space-y-1` si el problema es el espaciado.
- **Cuándo:** tras al menos una semana de uso real con catálogo
  poblado. Si en escaneo rápido cuesta encontrar lo importante,
  retocar.

<a id="mf-019"></a>
### C2 — mínimo de rolls configurable para activar bandera

**MF-019** · Mejora · Impacto Bajo · Esfuerzo S · Prioridad P3 · Abierta

- **Origen:** decisión de producto en sesión 18 (2026-05-16), T-5.it2.
- **Estado actual:** C2 activa la bandera cualquier compañero con
  `me_dominaron > 50% del total`, **sin mínimo de rolls**. Esto
  permite ver banderas pronto pero con riesgo de falso positivo
  (compañero con 1 roll perdido = 100% loss rate).
- **Idea:** añadir un selector (3 / 5 / 10 rolls mínimos) en el panel
  de análisis, equivalente al de C1. Defaultearía a "sin mínimo"
  para no romper comportamiento, el usuario sube el listón cuando le
  empiece a molestar el ruido.
- **Por qué:** decidido aplazar hasta ver, en uso real, si el ruido
  de "1 roll = bandera" es problema o no. Si el catálogo de
  compañeros crece y el owner empieza a ver banderas que no le dicen
  nada, se reabre.
- **Cuándo:** tras 2-3 semanas de uso real con C2 activo. Sin urgencia.

<a id="mf-020"></a>
### Reducir fricción al crear técnica tipo sumisión (nombre redundante)

**MF-020** · Mejora · Impacto Medio · Esfuerzo M · Prioridad P3 · Abierta

- **Origen:** sesión T-6.it3 (2026-05-17), feedback del owner tras
  crear "Kimura desde guardia cerrada" como técnica vinculada al
  nodo terminal sumisión "Kimura".
- **Síntoma:** flujo redundante visualmente — el usuario crea la
  sumisión "Kimura" como nodo terminal y luego una técnica también
  llamada "Kimura" para vincular origen→sumisión. El nombre se
  duplica en cabecera de modal de técnica + breadcrumb +
  notificaciones.
- **Por qué pasa:** el modelo separa "concepto sumisión" (nodo
  terminal, reusable desde múltiples orígenes) de "ejecución desde
  un origen concreto" (arista). Es coherente con REQUISITOS §3.5
  pero al usuario le parece duplicación cuando el origen es UNO.
- **Opciones a evaluar:**
  - **A) Auto-rellenar nombre + variante al crear técnica tipo sumisión.**
    En el wizard de técnica, paso "tipo = sumisión + destino =
    Kimura", el campo nombre se auto-fillea con "Kimura" y `variante`
    sugiere "desde {origen}". El usuario solo lo edita si quiere
    matizar. Coste mínimo, cero cambio de modelo.
  - **B) Atajo "+ Añadir sumisión desde aquí" en el modal de posición.**
    En lugar de "Nueva técnica" + elegir tipo sumisión + elegir
    destino, un botón directo que abre un mini-wizard de 1 paso:
    "¿qué sumisión?" y crea la técnica con nombre=sumisión y
    variante=null. Menos clicks. Schema intacto.
  - **C) Eliminar el nombre de la técnica tipo sumisión.** En vez de
    "Kimura (Kimura)" el modal mostraría solo "Kimura desde guardia
    cerrada". Requiere cambiar TecnicaModalContent + lista en
    /mapa/Técnicas. Schema intacto.
  - **D) Refactor del modelo: sumisión = sumatorio de aristas
    tipo `sumision`.** Eliminar nodo terminal sumisión, las técnicas
    tipo sumisión apuntan a "nada" (sin destino) y el grafo agrupa
    visualmente las que comparten nombre. Cambio grande, rompe
    REQUISITOS §3.5.
- **Recomendación inicial:** A + B son baratas y complementarias.
  Hacer A primero (gana 80 % de la fricción), B después si sigue
  molestando.
- **Cuándo:** post-it.3 si tras 1-2 semanas de uso real sigue
  molestando. No bloquea cierre de it.3.

<a id="mf-021"></a>
### Simplificar enum de TipoTecnica si el uso real solo usa transición

**MF-021** · Decisión · Impacto Bajo · Esfuerzo L · Prioridad P3 · Abierta

- **Origen:** sesión T-5.it3 (2026-05-17), conversación sobre leyenda del grafo.
- **Observación del owner:** "creo que solo se usará transición, que
  implicará pasar de posición A a posición B, sea avanzar o no en la
  lucha de posiciones". La distinción semántica entre `ataque` y
  `transicion` (también potencialmente `sweep`/`escape`) es difusa y
  puede que en la práctica solo se acabe usando `transicion` para
  cualquier paso A→B y `sumision` para los remates.
- **Idea:** tras 2-3 semanas de uso real con catálogo poblado, mirar
  qué distribución de `tipo` hay en `tecnicas`. Si >80 % son
  `transicion`+`sumision`, plantear:
  - **A) Migración a 2 tipos**: `transicion` y `sumision`. Schema
    nuevo, migración que mapea los demás → `transicion`. Limpio pero
    pierdes la diferenciación visual del grafo por tipo.
  - **B) Mantener enum pero ocultar tipos no usados de la UI**: el
    wizard de técnica solo ofrece los tipos con uso real. Schema
    intacto.
- **Por qué se aplaza:** decisión depende de datos de uso. Hoy
  mantenemos las 5 etiquetas porque el modelo ya estaba decidido en
  it.1 y T-5.it3 ya está cerrada.
- **Cuándo:** tras 2-3 semanas con catálogo realista poblado.

<a id="mf-022"></a>
### Resumen automático post-sesión — aplazado de T-5.it2

**MF-022** · Mejora · Impacto Medio · Esfuerzo M · Prioridad P3 · Abierta

- **Origen:** REQUISITOS §3.6 + criterio de éxito it.2. Discutido y
  aplazado en sesión 18 (2026-05-16) durante el planteamiento de
  T-5.it2.
- **Idea:** tras cerrar la captura de una sesión, mostrar
  automáticamente un bloque de texto resumiendo lo que pasó (rolls,
  resultados, posiciones-problema repetidas, banderas de C2). Cierra
  el bucle entre captura y análisis sin tener que ir activamente a
  /analisis.
- **Por qué se aplaza:** valor depende de si tras una sesión real el
  owner NO tiene claro qué pasó. Si suele saberlo de memoria, el
  resumen sería redundante con los datos crudos. Hay que validar la
  utilidad de C1/C2 (T-5.it2) en uso real antes de decidir si una
  vista combinada por sesión aporta sobre lo que ya ofrecen.
- **Cuándo:** tras 2-3 semanas de uso real de C1/C2. Si echas en
  falta una conclusión por-sesión que combine ambas, se reabre.
  Reutilizaría las queries C1/C2 ya construidas, así que la deuda
  técnica es mínima.

<a id="mf-023"></a>
### Sumisiones vs técnicas — redundancia del modelo

**MF-023** · Decisión · Impacto Medio · Esfuerzo L · Prioridad P3 · Abierta

- **Origen:** Adalid, 2026-05-17 (sesión 21), durante el replanteo de
  it.3.
- **Detalle:** una "técnica de sumisión" hoy se modela como una técnica
  con `tipo='sumision'` apuntando a un nodo sumisión terminal. Al
  capturar, el usuario rellena dos veces información que se solapa
  (nombre de la técnica + nombre del nodo sumisión destino) y el grafo
  representa la sumisión dos veces (la arista y el nodo terminal).
- **Idea:** revisar si una sumisión debería ser un único concepto —
  posibles caminos: (a) sumisión = nodo terminal sin arista
  redundante, la técnica se infiere; (b) sumisión = arista directa
  entre dos posiciones sin nodo terminal; (c) refactor del modelo
  para fusionar tipos. Decisión post-uso real.
- **Por qué:** al rediseñar el grafo (T-8.it3) y meter persistencia
  (T-9.it3), la redundancia se va a notar más. Pero un refactor del
  modelo es alcance grande, mejor hacerlo aparte cuando it.3 cierre.
- **Cuándo:** post-it.3, cuando el grafo siempre-visible y la
  organización persistente estén en uso real durante un par de
  semanas y se note exactamente qué es lo que molesta.

<a id="mf-024"></a>
### ~~Tab Sumisiones en el sub-toggle de Lista del /mapa~~ — HECHO en s37 (2026-05-20, commit `859598e`)

**MF-024** · Mejora · Impacto — · Esfuerzo — · Prioridad — · Hecha (s37, 2026-05-20, `859598e`)

Tercer botón "Sumisiones" en sub-toggle de Lista. Lista plana, orden
alfabético, tap abre `SumisionModalContent` (flujo ya existente). Sin
FAB local (el global ya tenía "Nueva sumisión"). Mejora paralela a
it.6.

<a id="mf-025"></a>
### Sistematizar sombras (`shadow-[rgba(...)]` inline → tokens semánticos)

**MF-025** · Refactor · Impacto Bajo · Esfuerzo S · Prioridad P3 · Abierta

- **Origen:** auditoría T-4.it4, sesión 30 (2026-05-19)
- **Estado actual:** dos sombras viven con valor inline:
  - `BottomNav.svelte:42` → `shadow-[0_-2px_8px_rgba(0,0,0,0.18)]`
  - `AppHeader.svelte:28` → `shadow-[0_2px_4px_rgba(0,0,0,0.04)]`
- **Idea:** definir tokens `--shadow-nav-top` y `--shadow-header-bottom`
  en `src/routes/layout.css` (con sus equivalentes en `.dark` si la
  intensidad debe cambiar). Reemplazar los hits por `shadow-nav-top` /
  `shadow-header-bottom`.
- **Por qué:** consistencia con el resto del sistema de diseño (tokens
  semánticos como single source of truth). Hoy las sombras son
  excepción al patrón general. Coste muy bajo (~15 min).
- **Por qué NO se hizo en T-4.it4:** la regla del proyecto prohíbe
  colores Tailwind crudos (`bg-color-shade`), no shadows con valor
  inline. Estrictamente la regla se respeta. Sistematizar shadows es
  expansión de scope, no la auditoría original.
- **Cuándo:** cualquier sesión de pulido posterior. Sin urgencia.

<a id="mf-026"></a>
### Bugs de importar clase detectados en la validación de T-2.it7 (2026-10-06)

**MF-026** · Bug · Impacto Medio · Esfuerzo M · Prioridad P1 · Abierta

- **Origen:** Adalid, validando T-2.it7 en preview.
- **Micrófono que no se apaga:** al dictar en el importador, el micrófono sigue encendido todo el rato si no se pulsa para apagarlo, también al analizar o cerrar. **Esperado:** se apaga solo al pulsar Analizar, al cerrar el diálogo o al salir de la pantalla.
- **"Refinar con IA" pierde los detalles:** si en la revisión se refina la propuesta, la pantalla siguiente (Añadir detalles) llega sin los detalles de ejecución, aunque estaban en el texto original. Causa probable: los detalles se restauran en el código tras generar la propuesta, pero no tras refinar (relacionado con "Refinar descarta lo editado", en la entrada "Fallos catálogo e importación (baseline)"). **Esperado:** refinar conserva los detalles.
- **Cuándo:** el owner decide cuándo ("los corregiremos luego"). Al arreglarlos, marcarlos o actualizar el spec `importar-clase` según la convención de bugs.

<a id="mf-027"></a>
### Duplicar un elemento en la otra disciplina

**MF-027** · Mejora · Impacto Medio · Esfuerzo M · Prioridad P3 · Abierta

- **Origen:** Adalid, 2026-10-06 (al decidir T-4.it7).
- **Idea:** como la disciplina de un elemento no se puede cambiar una vez creado (decisión del owner), ofrecer "Duplicar en BJJ/Grappling" para crear una copia independiente en la otra disciplina.
- **Cuándo:** implementación futura, después de la it.7.

<a id="mf-028"></a>
### Fallos catálogo e importación (baseline)

**MF-028** · Bug · Impacto Alto · Esfuerzo L · Prioridad P1 · Abierta

- **Origen:** línea base OpenSpec (sesión 50, 2026-10-05). El subagente los encontró al describir la app a partir del código. En el spec van marcados como "⚠️ Bug conocido", con el comportamiento esperado.
- **Bugs (marcados en el spec):**
  - Borrar una posición que solo es destino → hoy da error técnico. **Esperado:** se bloquea y se nombran las técnicas que llegan a ella (`PosicionModalContent.svelte:221` solo cuenta las técnicas salientes).
  - ~~Importar: lo que no se puede crear se pierde en silencio y el diálogo se cierra igual (`ImportarClaseDialog.svelte:396-490`). **Esperado:** informar de qué no se creó y por qué.~~ **Arreglado en T-4.it7 (2026-10-19):** al aceptar, el mapa muestra "No se creó: «X» — motivo" (ya existía, depende de otro que no se creó, origen/destino no disponible, o "no se pudo crear" genérico) y lo creado para completar la otra disciplina; marca quitada del spec `importar-clase`.
  - Importar sin key → se ve el texto interno `GROQ_KEY_MISSING`. **Esperado:** mensaje comprensible.
  - "Otras variantes de …" muestra el literal "(variante)" (`TecnicaModalContent.svelte` ~592).
  - La miga de navegación del mapa descarta los cambios sin guardar de un asistente sin preguntar (`MapaModalHost.svelte:376`).
- **Decisiones pendientes (no son bugs; el spec las describe tal cual):**
  - **it.7:** "Refinar" descarta lo editado a mano y parte del texto original; "Volver" desde la revisión vuelve al paso 1 y obliga a llamar otra vez a la IA; la IA no recibe las técnicas existentes; se pueden crear posiciones duplicadas renombrando en la revisión; las correcciones de la validación no se muestran; el paso de detalles ignora el modo hobbyist.
  - **it.9:** origen = destino permitido sin aviso (también en el asistente manual); la comparación de nombres es exacta.
  - **Sueltas:** la ficha de posición no filtra por disciplina. ("Borrar una técnica usada en rolls borra esos vínculos sin avisar" se separó a su propia entrada: [MF-043](#mf-043).)
- **Cuándo:** fuera de la it.7 por decisión del owner (solo entra lo que él ha pedido). P1 (owner, 2026-10-16).

<a id="mf-029"></a>
### Importar clase 2.0 — historial, reintentar, vista previa y revertir

**MF-029** · Mejora · Impacto Alto · Esfuerzo L · Prioridad P1 · Abierta · solo queda revertir

- **Origen:** Adalid, 2026-10-05 (sesión 50), tras el primer uso con `gpt-oss-120b` (origen = destino en movimientos defensivos/transitorios).
- **Estado actual:** la importación no deja rastro: el texto dictado y la propuesta de la IA se pierden al cerrar el diálogo; no se sabe qué creó cada importación; no hay forma de deshacerla.
- **Idea:**
  - **Historial** de importaciones (fecha, texto, propuesta IA, lo aceptado) consultable — sirve también de **diario de entreno**.
  - **Reintentar** desde un import guardado sin volver a escribir/dictar.
  - **Vista previa en el grafo** antes de confirmar: lo nuevo en amarillo, misma representación (posición = nodo, técnica = arista).
  - **Revertir** un import ya confirmado. Decisión abierta: qué pasa si algo creado ya se editó o se usó en un roll.
- **Por qué:** la IA se equivoca; hoy un error obliga a corregir a mano y a redictar. La vista previa reduce errores; revertir cubre los que se ven días después (no se sustituyen).
- **Cuándo:** historial, reintentar y vista previa **entregados en la it.7** (`v0.7-it7`, 2026-10-19). Queda abierto solo **revertir** (fuera de la it.7); la prioridad P1 era de la entrada completa — revisar con el owner.

<a id="mf-030"></a>
### Panel de alertas en el grafo — calidad del catálogo

**MF-030** · Mejora · Impacto Medio · Esfuerzo L · Prioridad P3 · Abierta

- **Origen:** Adalid, 2026-10-05 (sesión 50).
- **Idea:** apartado de alertas en `/mapa` que señale técnicas con origen = destino, nombres casi duplicados ("Guarda K" vs "Guardia K", ignorando tildes/mayúsculas) y otros huecos. Al importar, avisar de nombres parecidos en la revisión ("¿es la misma que Guardia K?") sin fusionar automáticamente.
- **Por qué:** la regla "usa el mismo nombre" solo vive en el prompt de la IA; el código compara nombre exacto. Las alertas hacen visible lo que hoy se cuela.
- **Cuándo:** **it.9** (owner, 2026-10-19: la it.8 pasa a ser pulido de los P1 del backlog). Sin cambio de esquema. Incluirá la alerta "pareja probable sin emparejar" de [MF-047](#mf-047).

<a id="mf-031"></a>
### Técnicas "sin acabar" (sin destino conocido) — APLAZADA

**MF-031** · Mejora · Impacto Bajo · Esfuerzo L · Prioridad P3 · Abierta (aplazada)

- **Origen:** Adalid, 2026-10-05 (sesión 50).
- **Idea:** permitir guardar una técnica sin saber aún a dónde lleva y listarla como pendiente en el panel de alertas.
- **Decisión vigente:** **se mantiene la regla de que toda técnica lleva a algún sitio.** Implicaría migración nueva (hoy la BD obliga a destino) y decidir cómo dibujar una arista sin destino (p. ej. nodo fantasma "?").
- **Cuándo:** revisar tras el panel de alertas (it.9), si el uso real lo pide.

<a id="mf-032"></a>
### Visualización de contras en el grafo — F3 sub-grafo filtrado (F1 y F2 rechazadas)

**MF-032** · Mejora · Impacto Medio · Esfuerzo L · Prioridad P2 · Abierta

- **Origen:** Adalid, 2026-05-21 (brainstorming inicial). Iterado en
  sesiones 42-45 (2026-05-21/22) con dos intentos rechazados.
- **Problema:** los contras son hoy una relación N:N invisible en el
  grafo principal. Decisión vigente: no dibujar aristas-de-aristas para
  no romper la legibilidad del catálogo. Por ese motivo los contras
  sólo aparecen como hipervínculos planos dentro del modal de técnica.
  Adalid quiere hacerlos más visuales **sin romper esa decisión**.
- **Histórico de approaches probados y rechazados:**
  - **F1 — Mini-grafo Cytoscape dentro del modal** (sesión 43, rama
    `feature/contras-visuales` parqueada). Hub-spoke con la técnica al
    centro y contras alrededor. Rechazada por el owner en preview: "no
    me gusta el grafo dentro del sheet, esperaba una transición animada
    desde el grafo inicial". El grafo principal no participaba.
  - **F2 — Mutación in-place del grafo principal** (sesión 44 plan,
    sesión 45 implementación; rama `feature/contras-mapa-inplace`
    parqueada, commit `dabfa88`). Modo contras que ocultaba el resto del
    grafo y dibujaba la técnica X + sus contras como **nodos satélite
    radiales**. Rechazada en preview por dos razones: (a) bug visual
    real (display:'none' no restauraba al salir), (b) **incoherencia de
    modelo**: las técnicas son aristas en el grafo principal pero se
    convertían en nodos satélite. Misma entidad cambia de tipo según
    contexto, rompe el lenguaje del grafo.
- **Approach actual cerrado para próxima sesión (F3 — sub-grafo
  filtrado del grafo principal):**
  - Tap en una arista X (técnica) entra al modo: el grafo se **filtra
    al sub-grafo** compuesto por los 2 nodos extremos de X (origen +
    destino) + la arista X + cada contra Y dibujada como **arista** en
    su forma natural (con sus posiciones origen/destino reales como
    nodos). Las técnicas siguen siendo aristas, las posiciones siguen
    siendo nodos — lenguaje del grafo intacto.
  - El resto del grafo se atenúa (dim u oculto, a decidir en plan).
  - **Solo las contras directamente relacionadas con la arista
    seleccionada** se dibujan. Anidamiento recursivo: tap en una contra
    Y → re-filtrar al sub-grafo de Y.
  - **Las contras se distinguen visualmente con un color "amenazante"
    (rojo apagado)** — token nuevo a definir, semánticamente "esto es
    lo que el contrincante puede hacerte".
  - **Layout: posiciones fcose actuales preservadas** (sin layout
    shift). Solo cambia visibilidad y resaltado.
- **Aprovechable de F2 (commit `dabfa88` en rama parqueada):** botón
  "Ver contras en el mapa" en `TecnicaModalContent`, cableado completo
  de `mapa/+page.svelte` (`$effect` async de sincronización stack↔grafo,
  AlertDialog dirty, breadcrumb integrado al stack, ESC interceptado,
  tap-canvas-vacío), las dos props nuevas del `MapaModalHost`. Se tira
  de F2: `injectContrasElements`, `computeRadialPositions`, los
  selectores `node[temp][kind="contra"]`, el "hub-as-node" central.
- **Por qué (objetivo):** los contras son información rica del modelo
  (sabes qué te van a hacer, sabes cómo defender) pero hoy son
  invisibles hasta abrir una técnica. Hacerlos visibles como sub-grafo
  con el lenguaje correcto (técnica = arista) materializa el
  conocimiento táctico de un golpe de vista, sin romper la coherencia
  del grafo principal.
- **Cuándo:** próxima sesión (T9 a redactar). Estimación ~2-3h de
  implementación + planning previo con `doc-coauthoring`.
- **Modo de trabajo acordado:** rama nueva `feature/contras-subgrafo`
  desde `main`. Plan formal a redactar **antes** de arrancar. Las ramas
  parqueadas `feature/contras-visuales` (F1) y `feature/contras-mapa-inplace`
  (F2) quedan navegables en remoto como spikes documentados; no se
  mergean.
- **Referencias:**
  - Modelo de datos: tabla `tecnica_contras` (N:N auto-referencial
    sobre `tecnicas`).
  - Decisiones arquitectónicas sobre el grafo:
    `../docs/adr/004-fcose-layout-algorithm.md`,
    `../docs/adr/006-grafo-siempre-visible-sheet-drawer.md`,
    `../docs/adr/007-sincronizacion-modal-grafo.md`,
    `../docs/adr/008-persistencia-layout-grafo.md`.
  - Vínculo top/bottom relacionado:
    `../docs/adr/002-vinculo-top-bottom.md`.
  - Historia: planes [`T7_PLAN_contras_fase1.md`](../docs/iterations/archive/T7_PLAN_contras_fase1.md)
    (F1) y [`T8_PLAN_contras_mapa_inplace.md`](../docs/iterations/archive/T8_PLAN_contras_mapa_inplace.md)
    (F2), ambos como referencia histórica de qué se descartó y por qué.

<a id="mf-040"></a>
### Ficha del mapa: cerrar al cambiar de contexto + hoja inferior con alturas fijas

**MF-040** · Mejora · Impacto Medio · Esfuerzo L · Prioridad P1 · Abierta

- **Origen:** Adalid, 2026-10-16 (uso real). Redefinida por el owner el mismo día (antes: "La ficha del mapa no se cierra al tocar fuera").
- **Qué pasa hoy:** la ficha (panel lateral en escritorio, hoja inferior de altura fija en móvil) que se abre al tocar un nodo o una arista en `/mapa` sigue abierta al cambiar BJJ ↔ Grappling o al entrar en "Mover nodos", y en móvil tapa medio grafo sin forma de apartarla salvo cerrándola.
- **Esperado:**
  - La ficha **se cierra solo** en dos casos: (a) al cambiar de disciplina BJJ ↔ Grappling (cambio de contexto) y (b) al entrar en el modo edición del grafo ("Mover nodos"). Si hay cambios sin guardar → confirmación "¿Descartar cambios?"; si se cancela, no se cambia de disciplina ni se entra en edición.
  - Todo lo demás se mantiene como en ADR-006: tocar otro nodo/arista navega a su ficha; tocar el grafo no la cierra.
  - **Nuevo:** en móvil la ficha es una **hoja inferior con alturas fijas** (*snap points* o *detents*: plegada mostrando solo la cabecera / media / desplegada), arrastrable arriba y abajo, para apartarla y mirar el grafo sin cerrarla. Patrón habitual en Google Maps, Apple Maps, etc.
  - **Escritorio (panel lateral):** a decidir al implementar (p. ej. panel lateral plegable).
- **Por qué:** la ficha abierta tapa el grafo y se queda "colgada" al cambiar de contexto; cerrar al tocar fuera rompería la exploración del grafo con la ficha abierta (motivo de ADR-006), así que se cierra solo en los cambios de contexto y se da una forma de apartarla.
- **Cuándo:** P1 (owner, 2026-10-16).
- **Notas técnicas:**
  - Hoy `interactOutsideBehavior="ignore"` es **deliberado** (ADR-006) en los dos `Sheet.Content` de `src/lib/components/MapaModalHost.svelte:581,595`; se mantiene. El cierre en (a) y (b) va en los controles de `src/routes/mapa/+page.svelte`, reutilizando el aviso de descartar existente (`attemptCloseAll` / `handleAttemptClose` en `MapaModalHost.svelte`).
  - **Componente actual:** `Sheet` de shadcn-svelte sobre `Dialog` de bits-ui (`src/lib/components/ui/sheet/sheet-content.svelte`), con altura fija `h-[50dvh]` en móvil. **No admite alturas fijas ni arrastre**; bits-ui no tiene Drawer. El `Drawer` de shadcn-svelte sí las admite (`snapPoints`), pero depende de `vaul-svelte`, que **no está instalado** → dependencia nueva que necesita aprobación del owner. Alternativa sin dependencia: gestos de arrastre y alturas propios sobre el `Sheet` actual (más código y más riesgo en accesibilidad y scroll interno). Por eso Esfuerzo L.
  - Requiere actualizar ADR-006 (enmienda o ADR nuevo) y change de OpenSpec sobre la capacidad `mapa` (cambio de comportamiento visible).

<a id="mf-041"></a>
### Barra de edición del grafo: "Guardar" + "Cancelar"

**MF-041** · Mejora · Impacto Medio · Esfuerzo M · Prioridad P1 · Abierta

- **Origen:** Adalid, 2026-10-16.
- **Qué pasa hoy:** en `/mapa` (`src/routes/mapa/+page.svelte` ~1033-1072) el botón "Mover nodos" pasa a relleno y cambia a "Salir" al activarse, y "Guardar organización" (también relleno) aparece solo cuando hay cambios, desplazando los demás botones. Puede haber dos botones primarios rellenos a la vez.
- **Patrón acordado:** en modo edición la barra muestra "Reorganizar" a un lado y, al otro, "Cancelar" (ghost/outline, descarta los cambios) + "Guardar" (único primario relleno, siempre presente, deshabilitado hasta que haya cambios). Nada se desplaza. Etiqueta solo "Guardar". Rojo solo para acciones destructivas.
- **Alternativa anotada:** estilo Apple, un único "Hecho" que guarda al salir.
- **Por qué:** jerarquía visual clara (un solo primario), sin saltos de layout y con una salida explícita que descarta.
- **Cuándo:** P1 (owner, 2026-10-16).
- **Notas técnicas:** "Cancelar" necesita restaurar las posiciones guardadas (persistencia del layout en ADR-008); por eso Esfuerzo M y no S. Cambio de comportamiento visible → spec `mapa`.

<a id="mf-043"></a>
### Borrar una técnica usada en rolls borra esos vínculos sin avisar

**MF-043** · Bug · Impacto Alto · Esfuerzo M · Prioridad P1 · Abierta

- **Origen:** línea base OpenSpec (sesión 50, 2026-10-05), dentro de [MF-028](#mf-028); separada a entrada propia por el owner el 2026-10-16.
- **Qué pasa hoy:** al borrar una técnica que aparece en rolls, sus vínculos con esos rolls desaparecen sin ningún aviso; el roll pierde esa información.
- **Esperado:** antes de borrar, avisar de cuántos rolls la usan y pedir confirmación (o bloquear el borrado, a decidir con el owner).
- **Por qué:** pérdida silenciosa de datos de entreno del usuario.
- **Cuándo:** P1 (owner, 2026-10-16).
- **Notas técnicas:** confirmar en el spec `catalogo-tecnico` si está marcada como "⚠️ Bug conocido" y apuntarla a esta entrada. Cambio de comportamiento visible → change de OpenSpec.
- **Relacionada (2026-10-21):** [MF-048](#mf-048) — posiciones usadas en rolls se **bloquean** al borrar (sin motivo visible en móvil), mientras que aquí la técnica desvincula los rolls en silencio. Al abordar esta entrada, decidir una regla de borrado común para posición, sumisión y técnica.

<a id="mf-045"></a>
### Roll: crear un compañero desde el asistente no se puede deshacer y deja compañeros sueltos

**MF-045** · Bug · Impacto Medio · Esfuerzo M · Prioridad P2 · Abierta

- **Origen:** owner, 2026-10-19 (validación de T-4.it7). Comportamiento previo: T-4 no tocó esta parte del asistente de roll.
- **Qué pasa hoy:** en el paso 1 del asistente de roll ("¿Con quién?"), al escribir un nombre nuevo y pulsar "+ Crear nuevo", el compañero se guarda en ese mismo momento y se despliega el bloque de datos extra (cinturón, peso, notas). El buscador sigue activo y deja crear **otro** compañero nuevo; el anterior se queda creado. Cancelar el roll tampoco lo borra. Resultado: compañeros basura o duplicados y ninguna forma clara de deshacer.
- **Esperado:** la creación desde el asistente se puede deshacer de forma evidente, sin perder la sensación de que ocurre en el mismo momento y dentro del flujo.
- **Propuesta (orquestador, a validar con el owner):** mientras se crea, sustituir el buscador por un chip "Nuevo: <nombre>" con ✕ / Deshacer; no permitir una segunda creación hasta confirmar o deshacer la primera; idealmente guardar el compañero solo al guardar el roll (o borrarlo si se cancela), para que cancelar no deje restos.
- **Copy del mismo bloque:** la etiqueta "+ Añadir más datos (opcional)" se lee rara y no parece una sección de campos opcionales → "Datos adicionales (opcional)" como encabezado de sección, visualmente claro que son campos opcionales.
- **Por qué:** ensucia la lista de compañeros (y las estadísticas por compañero) con entradas que el usuario no quería, y obliga a ir a /companeros a limpiarlas a mano.
- **Cuándo:** a decidir por el owner (prioridad sin asignar).
- **Notas técnicas:**
  - Persistencia inmediata: `CompaneroCombobox.svelte:46-50` llama a `onCreate(nombre)` al elegir la opción `__create__:`; `RollEditor.svelte:503-517` (`handleCompaneroCreate`) hace `await createCompanero({ nombre })` → `INSERT INTO companeros` (`src/lib/companeros.ts:16-32`), lo selecciona y pone `showExtraData = true`. Los extras se guardan después con `updateCompanero` en `handleExtraDataContinue` (`RollEditor.svelte:519-560`), que además salta el paso Tamaño. El roll se guarda aparte en `handleSave` (`RollEditor.svelte:675`). `RollEditor` no importa `deleteCompanero`: ni cancelar ni deshacer revierten el alta.
  - El combobox sigue renderizado con el bloque de extras abierto (`RollEditor.svelte:784-789` y `800-833`), así que se puede lanzar otra creación; cada una vuelve a ejecutar `handleCompaneroCreate` y deja la anterior en BD.
  - El modo edición (no asistente) también usa `onCreate={handleCompaneroCreate}` (`RollEditor.svelte:1113-1118`): crea al momento y pone `showExtraData = true`, pero ese bloque solo se pinta en el paso 1 del asistente — revisar en el mismo arreglo.
  - Copy: `RollEditor.svelte:802`.
  - Consistencia: `CompaneroCombobox` solo se usa en `RollEditor`. Los "+ Crear nueva" de posición / técnica / sumisión (`mapa-modal-stack.svelte.ts`, `TecnicaModalContent.svelte`) abren un sub-asistente apilado con su propio Cancelar — patrón distinto, no presentan este problema de la misma forma; no hace falta tocarlos, pero conviene que la solución elegida sea coherente con ellos (p. ej. cancelar = no queda nada creado).
  - Relacionada: [MF-008](#mf-008) (sugerir compañero por defecto en el mismo paso).
  - Cambio de comportamiento visible → requiere change de OpenSpec (spec de rolls / compañeros).

<a id="mf-046"></a>
### Ambos con un elemento que ya existe en una disciplina: crear solo donde falta (y avisar)

**MF-046** · Mejora · Impacto Medio · Esfuerzo M · Prioridad P2 · Abierta

- **Origen:** owner, 2026-10-19 (cierre de T-4.it7; supuesto (b) y desviación 1 de la implementación).
- **Qué pasa hoy:** (1) el asistente de posición o sumisión abierto desde el mapa con "Ambos" bloquea un nombre que ya existe en una de las dos disciplinas ("elige solo BJJ o cambia el nombre"); (2) una técnica "Ambos" que ya existe idéntica (nombre, origen y variante) en la otra disciplina no se guarda en ninguna y sale un mensaje.
- **Propuesta:** en los dos casos, crear solo en la disciplina donde falta y avisar de que en la otra ya existía, con el mismo criterio que ya usan los sub-asistentes ("+ Crear nueva" en complementaria, técnica y roll) y la importación.
- **Por qué:** quita un callejón sin salida y unifica el comportamiento de "Ambos" en todos los flujos.
- **Cuándo:** P2 (owner, 2026-10-19).
- **Notas técnicas:** `catalogo-lados.ts` (`crearTecnicaEnLados` lanza `TecnicaDuplicadaError`; lógica de "solo donde falta" ya existe para los sub-asistentes), `PosicionWizard`/`SumisionWizard`/`TecnicaWizard`. Cambia `catalogo-tecnico` ("Nombre de posición sin duplicados en el asistente", "Sumisión terminal", "Posiciones complementarias", "Conexiones dentro de la misma disciplina") → requiere change de OpenSpec. Relacionada con [MF-003](#mf-003) y [MF-027](#mf-027).

<a id="mf-047"></a>
### Posiciones complementarias: sugerir siempre y detectar parejas sin emparejar

**MF-047** · Mejora · Impacto Medio · Esfuerzo M · Prioridad — · Abierta

- **Origen:** owner, 2026-10-16/19 (idea: "casi toda posición debería tener complementaria; debería ser el estándar").
- **Qué pasa hoy:** en los backups del owner casi ninguna posición tiene complementaria y hay parejas evidentes sin emparejar ("Mount top" / "Mount bottom", "Guardia cerrada top" / "Guardia cerrada bottom"). El paso de complementaria del asistente es opcional y no propone nada.
- **Qué se propone:**
  1. **Sugerencia automática al crear:** a partir del nombre (top ↔ bottom, over ↔ under, arriba ↔ abajo…) y/o del `tipo` opuesto (ofensiva / defensiva), proponer la complementaria: preseleccionarla si ya existe; si no existe, ofrecer crearla en el mismo paso.
  2. **Alerta "pareja probable sin emparejar"** en el panel de alertas ([MF-030](#mf-030), it.9), para las posiciones ya existentes.
  3. **Decisión de modelo — por qué hoy no puede ser obligatoria:**
     - (i) posiciones simétricas (50/50, doble guardia, clinch neutro) necesitarían ser complementarias de sí mismas, cosa que hoy no se permite;
     - (ii) variantes (High mount, S-mount, Technical mount tienen todas "Mount bottom" debajo) chocan con la complementaria 1:1 — harían falta relaciones de varios a uno;
     - (iii) transiciones / scrambles sin contraparte con nombre propio;
     - (iv) captura rápida tras la clase: un paso obligatorio más frena el alta.
     - El owner se inclina por "estándar". **Recomendación del orquestador:** no obligatoria; sugerencia por defecto (1) + alerta (2), y revisar el modelo para (i) y (ii) antes de plantear que sea obligatoria.
- **Por qué:** la complementaria da el "otro lado" de cada posición (qué hacer arriba / abajo); hoy el dato existe pero casi no se rellena, así que no aporta.
- **Cuándo:** parte 2 junto al panel de alertas (it.9); parte 1 a decidir por el owner; parte 3 antes de cualquier "obligatoria".
- **Notas técnicas:** la complementaria es `posicion_complementaria_id`, simétrica vía `syncComplementaria` (`src/lib/posiciones.ts:101`); paso 4 del asistente en `src/lib/components/PosicionWizard.svelte`. Esfuerzo M cubre las partes 1-2 (la 2 asumiendo el panel de MF-030 ya hecho); la parte 3, si cambia el modelo (auto-pareja, varios a uno), sería L con migración nueva. Cambio de comportamiento visible → change de OpenSpec sobre `catalogo-tecnico` ("Posiciones complementarias"). Relacionada con [MF-016](#mf-016) y [MF-030](#mf-030).

<a id="mf-048"></a>
### Borrar bloqueado sin explicación visible (móvil)

**MF-048** · Bug · Impacto Medio · Esfuerzo M · Prioridad — · Abierta

- **Origen:** owner, 2026-10-21 (uso real en móvil: tras borrar todas las técnicas y sumisiones, 3 posiciones no se podían borrar y nada explicaba por qué).
- **Qué pasa hoy:** la ficha de posición deja "Borrar" deshabilitado cuando la posición se usa en rolls, y el motivo solo sale en un Tooltip que aparece al pasar el ratón: en táctil no se ve nunca. Además el texto dice "referenciada por N roll(s) **como problema**", pero cuenta cualquier uso de la posición en un roll. Lo mismo en la ficha de técnica cuando es contra de otra(s) ("Esta técnica es contra de N técnica(s)", también solo en Tooltip). Cuando el bloqueo es por técnicas que salen de la posición (o que llegan a la sumisión), la ficha ya lista esas técnicas de forma visible y navegable.
- **Esperado (decisión del owner, 2026-10-21):** se **mantiene el bloqueo** y el botón deshabilitado como hoy, y junto a él un icono de información que al tocar/pulsar abre un Popover explicando qué lo bloquea, con texto exacto (p. ej. "La usan 3 rolls", "Salen 2 técnicas de aquí", "Es contra de 1 técnica"; sin "como problema"). Idealmente lista y enlaza los rolls / técnicas que bloquean. Mismo patrón en posición, sumisión y técnica.
- **Por qué:** un botón deshabilitado sin motivo visible es un callejón sin salida: el usuario no sabe qué tiene que borrar ni dónde.
- **Cuándo:** futuro (owner, 2026-10-21: "apúntalo para corregirlo en un futuro"). Conviene hacerlo junto a [MF-043](#mf-043) o después, una vez decidida allí la regla de borrado.
- **Notas técnicas:**
  - Posición: `src/lib/components/PosicionModalContent.svelte` — carga `countRollsByPosicion` (~111-123; `src/lib/rolls.ts:183` cuenta cualquier fila de `roll_posicion`), `refsBloqueantes` = técnicas salientes + rolls (~221), motivo (~222-229), Tooltip solo hover en el pie (~493-503). Sumisión: `SumisionModalContent.svelte` (motivo ~101; hoy solo la bloquean técnicas y ya se listan). Técnica: `TecnicaModalContent.svelte` (motivo ~205, Tooltip ~628-639).
  - Popover reutilizable: `src/lib/components/ui/popover` (añadido en it.7 para los avisos).
  - **Coherencia de reglas:** hoy borrar una técnica usada en rolls quita esos vínculos sin avisar ([MF-043](#mf-043)), mientras que una posición usada en rolls se bloquea. La regla común (bloquear vs "borrar con aviso" que desvincula los rolls, alternativa que propuso el orquestador y el owner descartó por ahora) se decide al abordar MF-043.
  - **Bug relacionado:** borrar una posición que solo es destino da error técnico (`posicion_destino_id` con SET NULL rompe un CHECK; `openspec/specs/catalogo-tecnico/spec.md` ~309, en [MF-028](#mf-028)). Se arregla en el mismo cambio contando también las técnicas **entrantes** como bloqueo y nombrándolas en el Popover.
  - Cambio de comportamiento visible → requiere change de OpenSpec sobre `catalogo-tecnico`.

## Performance / build

<a id="mf-033"></a>
### Reducir el precache PWA (~2.3 MB) eliminando la duplicación del `.wasm`

**MF-033** · Mejora · Impacto Bajo · Esfuerzo M · Prioridad P3 · Abierta

- **Origen:** T-2, deuda anotada en `T2_PLAN_v2.md`
- **Idea:** Vite emite una copia hasheada de `sqlite3.wasm` además de la nuestra estática. Eliminarla usando `?url` import o cambiando `locateFile` para apuntar a la versión bundleada.
- **Cuándo:** si el peso de instalación de la PWA empieza a molestar en uso real, o antes de cualquier release "público".

---

## Tech debt / dev experience

<a id="mf-034"></a>
### FOUC inicial al cargar con tema oscuro persistido

**MF-034** · Bug · Impacto Bajo · Esfuerzo S · Prioridad P3 · Abierta

- **Origen:** sesión 11 (2026-05-14), implementación del theme manager.
- **Síntoma:** al abrir la app con `localStorage['theme'] === 'dark'`
  (o `'auto'` y sistema en oscuro), la página pinta en claro durante
  un microsegundo antes de que `onMount` ejecute `theme.init()` y
  aplique la clase `.dark` en `<html>`. Flash desagradable pero breve.
- **Mitigación:** script bloqueante en `<head>` de `app.html`:
  ```html
  <script>
    const m = localStorage.getItem('theme');
    const sysDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (m === 'dark' || (m !== 'light' && sysDark)) {
      document.documentElement.classList.add('dark');
    }
  </script>
  ```
  Se ejecuta antes del primer paint, evita el FOUC. **Toca
  `app.html`**, que está fuera de la lista prohibida pero cerca del
  espíritu de las reglas — pedir confirmación explícita antes.
- **Cuándo:** si el FOUC molesta en uso real (especialmente nocturno).
  Hoy aceptado como compromise.

<a id="mf-035"></a>
### CATEGORIAS_ORDEN / CATEGORIA_LABEL duplicado en 3 sitios

**MF-035** · Refactor · Impacto Bajo · Esfuerzo S · Prioridad P3 · Abierta

> Nota (2026-10-16): ya son más de 3 sitios — `mapa/+page.svelte:43,51`, `rolls/+page.svelte:45-46`, `RollEditor.svelte:84,310`, `PosicionModalContent.svelte:34`, `PosicionWizard.svelte:156`, `importaciones.ts:164`. Las categorías actuales son `guardia` / `control` / `transicion` / `otro`.

- **Origen:** T-13, sesión 11 (2026-05-14).
- **Detalle:** las constantes que definen el orden de categorías de
  posiciones (`top` / `bottom` / `pie` / `transicion` / `otro`) y sus
  labels en castellano viven duplicadas en al menos 3 ficheros:
  `/mapa/+page.svelte`, `RollEditor.svelte`, `/rolls/+page.svelte` (T-13).
  Si añadimos una categoría hay que tocar las 3.
- **Idea:** centralizar en `src/lib/categorias.ts` exportando
  `CATEGORIAS_ORDEN: readonly Categoria[]` y `CATEGORIA_LABEL: Record<Categoria, string>`.
- **Cuándo:** cuando el coste de la divergencia se note (ej. cuarto
  sitio que reproduce las mismas constantes), o cuando se añada nueva
  categoría.

<a id="mf-036"></a>
### ~~Resolver el error preexistente de `virtual:pwa-register` en `+layout.svelte`~~ — HECHO en T-9+T-10 (commit pendiente)

**MF-036** · Bug · Impacto — · Esfuerzo — · Prioridad — · Hecha (T-9+T-10)

Resuelto añadiendo `/// <reference types="vite-plugin-pwa/vanillajs" />` en `src/app.d.ts` (no toca `+layout.svelte`, sortea la regla de fichero prohibido).

<a id="mf-037"></a>
### ~~Loop de refresh en primera carga tras deploy con cambios grandes en SW~~

**MF-037** · Bug · Impacto Medio · Esfuerzo M · Prioridad — · Hecha (2026-10-16, ADR-001 + `registerType: 'prompt'`; el owner confirma que no ha vuelto a pasar)

> Nota (2026-10-16): `vite.config.ts:12` ya usa `registerType: 'prompt'` (cambio de 2026-05-20) y el bug de refresh de ADR-001 se resolvió subiendo versiones. Probablemente cubierto; confirmar con el owner y cerrar si no ha vuelto a pasar.

- **Origen:** T-2, observado en producción
- **Idea:** evaluar `registerType: 'prompt'` en lugar de `'autoUpdate'`, o reducir tamaño del precache, o añadir lógica de "skipWaiting" controlada.
- **Cuándo:** si afecta a usuarios reales o aparece en algún test posterior.

<a id="mf-038"></a>
### ~~Esquema BD legacy: columna `experiencia_anos` en `companeros`~~

**MF-038** · Refactor · Impacto — · Esfuerzo — · Prioridad — · Hecha (verificado 2026-10-16: una migración la elimina si existe, `src/lib/db/schema.ts:180-185`)

- **Origen:** T-4, eliminada del schema_v1 actualizado por feedback de Adalid.
- **Detalle:** las BDs OPFS de instalaciones previas a T-4 todavía tienen la columna `experiencia_anos` (REAL nullable). El código actual no la referencia, no se inserta, no se lee — queda como dead column.
- **Cuándo:** cuando aparezca el primer schema_v2 (probablemente Iteración 1, al añadir tabla de Posiciones), aprovechar la migración para limpiar también esta columna huérfana.

<a id="mf-039"></a>
### Actualizar GitHub Actions del workflow de deploy a versiones con Node 24

**MF-039** · Refactor · Impacto Medio · Esfuerzo S · Prioridad P2 · Abierta

> Nota (2026-10-16): pasado el corte de septiembre el workflow sigue con las actions `@v4` y los deploys funcionan (último OK: 2026-10-06), así que el riesgo inmediato ya no existe; queda como actualización de mantenimiento.

- **Origen:** anotación de GitHub Actions en el deploy del cierre de it.2 (run `25967932789`, 2026-05-16).
- **Detalle:** el workflow `.github/workflows/deploy.yml` usa `actions/checkout@v4`, `actions/setup-node@v4`, `actions/upload-artifact@v4` y `pnpm/action-setup@v4`, que internamente corren sobre Node 20. GitHub deprecó Node 20 en runners: desde el **2 de junio de 2026** se fuerza Node 24 por defecto, y el **16 de septiembre de 2026** se retira Node 20 del runner.
- **Idea:** actualizar cada action a la versión que ya soporta Node 24 nativamente (revisar releases de cada repo). Alternativa puente: añadir `FORCE_JAVASCRIPT_ACTIONS_TO_NODE24=true` como env var del workflow para opt-in antes del cutover.
- **Por qué:** ahora el deploy funciona pero está en cuenta atrás. Si no se actualiza antes de septiembre, el workflow se rompe y bloquea releases.
- **Cuándo:** antes del 2 de junio de 2026 idealmente (para validar con margen); como tarde, antes del 16 de septiembre de 2026.
- **Restricción del proyecto:** `.github/workflows/deploy.yml` está en la lista de ficheros que no se tocan sin pedirlo explícitamente (ver `../CLAUDE.md`). Esta tarea requiere que el owner lo abra.

<a id="mf-044"></a>
### Skills de flujo: validar, cerrar tarea y arranque de sesión

**MF-044** · Mejora · Impacto Medio · Esfuerzo S · Prioridad P3 · Abierta

- **Origen:** Adalid, 2026-10-16. Aplazadas por el owner.
- **Qué:** tres skills de proyecto (Esfuerzo S cada una) para pasos que hoy se repiten a mano:
  - `validar`: build + reiniciar el preview en 4173 + enlace + fecha del build + checklist de validación sacado del change.
  - `cerrar-tarea`: CHANGELOG + archivar el change + fusionar en `main` + actualizar ESTADO.
  - `arranque`: pull con comprobación de la clave SSH, leer ESTADO y avisar si la rama no es `main`.
- **Por qué:** menos pasos olvidados y menos tiempo en cada validación y cierre.
- **Cuándo:** cuando el owner lo decida.

---

## Proyecto / repositorio

<a id="mf-042"></a>
### Repo público vs privado

**MF-042** · Decisión · Impacto Medio · Esfuerzo M · Prioridad — · Abierta

- **Origen:** Adalid, 2026-10-16.
- **Hechos:**
  - El bundle de la PWA se descarga igualmente, así que hacer privado el repo protege poco del código.
  - El repo público expone specs, roadmap, backlog e histórico: el plano del producto.
  - No hay fichero `LICENSE` → por defecto, todos los derechos reservados. No añadir MIT por inercia.
  - Pasar a privado cuesta GitHub Pro (~4 $/mes) para mantener Pages, o mover el hosting a Cloudflare Pages / Netlify (gratis, ~1 sesión para cambiar el deploy).
  - El histórico ya es público: hacerlo privado no lo retira de copias existentes.
- **Decisión del owner (2026-10-16):** no hacer nada hasta que empiece a compartir la app.
- **Cuándo (disparador):** antes de compartir la app con alguien.

---

## Cómo usar este documento

- **Alta:** cuando surge algo que no se hace en el momento (bug, mejora, refactor o decisión pendiente), se registra con la skill `backlog-item`: siguiente `MF-NNN` libre, comprobación de duplicados, sección adecuada, plantilla fija y fila en el índice. Prioridad `—` salvo que el owner la dé.
- **Planificar:** al arrancar una iteración o una tanda de pulido, el índice (P1 → P2 → sin asignar) es la primera referencia para decidir qué entra. Una tarea `T-x.itN` que aborda una entrada la cita por su ID; si cambia comportamiento visible, necesita change de OpenSpec.
- **En curso:** al empezar a trabajarla, Estado → `En curso (T-x.itN)`.
- **Cierre:** Estado → `Hecha (fecha, commit/tarea)`, título tachado (`~~…~~`), fila fuera del índice y añadida a la lista **Hechas**. La entrada no se borra (su ID y su historia siguen enlazables). Si se descarta: `Descartada (fecha, motivo)`, mismo tratamiento.
- **Repriorizar:** solo el owner; se cambia el campo Prioridad en la línea de la entrada y se recoloca su fila en el índice.
- **Público vs interno:** [`ROADMAP.md`](../ROADMAP.md) es la vista pública filtrada; solo se actualiza si el owner lo pide.
