# Mejoras futuras (post-PoC)

**Estado:** documento vivo
**Propósito:** anotar ideas, sugerencias y deuda que NO bloquean el PoC funcional pero conviene tener guardadas para iteraciones de pulido / refactor.

Cada entrada debería responder:
1. ¿Qué se cambia?
2. ¿Por qué?
3. ¿Cuándo abordar?

---

## UX

### Modo "hobbyist" vs "avanzado" — perfiles de uso

- **Origen:** Adalid, 2026-05-19 (sesión 26)
- **Idea:** ofrecer dos perfiles de uso configurables (probablemente en `/ajustes`):
  - **Hobbyist:** captura mínima. Solo los campos imprescindibles para registrar una sesión y un roll. Modelo de datos intacto; lo que se oculta son campos de UI, no columnas de BD.
  - **Avanzado:** todo lo que ya existe hoy (compañero detallado, posiciones problema, tipo/foco/observaciones, técnica clase, etc.).
- **Sospecha del owner:** muchos de los campos actuales aportan poco o nada al grafo (la salida principal de la app). Reducirlos al mínimo en modo hobbyist hace la captura mucho más rápida sin perder la información que de verdad alimenta el análisis.
- **Investigación pendiente (cuando toque, NO ahora):** auditar campo por campo qué datos contribuyen al grafo / análisis (consultas C1/C2, vista grafo) y cuáles son ornamentales / sin consumo downstream. Esa auditoría es prerequisito de diseñar el modo hobbyist con criterio — si no, es decisión arbitraria.
- **Por qué:** la fricción en captura post-clase (CU-1) es el cuello de botella real. Un modo simplificado para el caso primario, con la opción de subir a "avanzado" si el uso real lo pide, encaja mejor con el flujo natural de usuario.
- **Cuándo:** post-it.4. Probablemente iteración dedicada (el cambio toca múltiples editores: SesionEditor, RollEditor, CompaneroEditor). Empezar por la auditoría de datos antes de tocar UI.
- **Activo construido para reusar:** `src/lib/components/AnalisisHome.svelte` (creado en T-4.it5, commit `b7cf755`) — versión compacta del análisis (solo C1, top 3 posiciones + top 3 técnicas, ventana fija de 5 sesiones). NO está montado en home. Cuando se implemente el toggle hobbyist/avanzado, conectarlo: visible solo en modo "avanzado". El componente ya tiene su propia reactividad y reload via `reloadKey` prop.

### Reducir copy / texto inicial en cada pantalla

- **Origen:** Adalid, 2026-05-19 (sesión 26)
- **Estado actual:** muchas pantallas tienen títulos largos, descripciones explicativas, labels redundantes o textos de ayuda que pesan visualmente al entrar.
- **Pantalla ancla — `/rolls`** (señalada por owner como "se muestra mucho de golpe"). Puntos concretos detectados:
  - **Labels de chip-picker read-only en cada card** ("Posiciones que fueron bien", "Posiciones que fallé", "Técnicas que fueron bien", "Técnicas que fallé") — hasta 4 filas con label largo en cada roll. Candidatos: icono ✓/✗ + categoría corta, o quitar label si el color del chip ya indica resultado. Ya estaba anotado como pendiente en la entrada "Reducir read-only de chips".
  - **Filtro de Posición desplegado**: 5 sub-labels de categoría (`Guardia`, `Control superior`, `Espalda`, `Transición`, `Otro`) + chips de cada. Cuando se abre Filtros, el bloque se vuelve denso. Opción: categorías colapsables por defecto, o chips planos con prefijo de categoría.
  - **Contador `{rolls.length} roll(s)`** sobre la lista — texto pequeño pero awkward por el "(s)" plural. Eliminar o convertir en chip discreto al lado del título.
  - **Labels de filtros redundantes con su `Select` placeholder** ("Resultado" arriba + "Cualquiera" dentro del trigger). En filtros opcionales, el placeholder solo basta.
- **Idea (transversal):** auditar pantalla por pantalla qué texto se puede:
  - Eliminar si no aporta (instrucciones obvias, descripciones redundantes con un icono).
  - Acortar (títulos largos a 1-3 palabras).
  - Mover a tooltip / popover (ayuda accesible bajo demanda en lugar de siempre visible).
- **Por qué:** primera impresión más limpia al abrir cualquier pantalla. Reduce carga cognitiva en captura post-clase (CU-1). Coherente con la dirección de "modo edición" en grafo (UI no satura por defecto).
- **Cuándo:** transversal. Puede ir como tarea de pulido propia (lista de pantallas a auditar) o entrar pieza a pieza cuando se toque una pantalla por otro motivo. Recomendado: barrido formal al cerrar features grandes para mantener consistencia.

### ~~Rediseño de home — calendario + agrupamiento de sesiones~~ — PROMOVIDO a it.5 (2026-05-19)

Estado: el agrupamiento por día con headers se entregó en T-5.it4 (commit
`0d50b00`). El calendario y la visión general de "qué información merece la
primera pantalla" entran en **Iteración 5 — Rediseño de home (calendario +
dashboard)**, plan formal en `ITERACION_5.md`. Esta entrada queda como
referencia histórica; el seguimiento activo vive en el plan de it.5.

Entrada original (preservada para contexto histórico):

### [Entrada original — antes de promover]

- **Origen:** Adalid, 2026-05-19 (sesión 26)
- **Estado actual:** home es una lista plana de sesiones (sin agrupamiento por proximidad temporal, sin vista de calendario).
- **Idea:**
  - **Calendario en home:** vista mensual (o semanal) que marque los días con sesiones; tap en un día abre la sesión / las sesiones de ese día. Reusar el `Calendar` de bits-ui (ya disponible según `CONTEXTO_AGENTE.md`) para no construir desde cero.
  - **Agrupar sesiones con headers por día (patrón `/rolls`):** "Hoy" y "Ayer" como labels reservados; el resto de días con su fecha formateada como header (`lun, 12 may 2026`). Decisión owner 2026-05-19: usar el mismo patrón que ya existe en `/rolls` (no collapse agresivo de "Antiguos").
  - **Visión general "mejor home":** paraguas para revisar qué información merece estar en la primera pantalla (¿stats rápidas? ¿próxima clase? ¿últimos rolls?). A concretar.
- **Por qué:** home es la primera pantalla en cada apertura de la PWA. Hoy es funcional pero pobre (lista plana). Calendario + agrupamiento dan navegación temporal y reducen scroll para ir a sesiones recientes.
- **Cuándo:** post-it.4. Probablemente como iteración dedicada (it.5 o it.6) — el rediseño general de home no encaja en una tarea de pulido suelta; conviene plan formal. Las piezas concretas (calendario y agrupamiento) podrían adelantarse como tareas sueltas si una de ellas duele especialmente antes de la iteración formal.

### ~~Long-press para activar el drag de nodos en el grafo~~ — HECHA en T-1.it4 (commits `93baea6` + `4cbacae`, 2026-05-19)

Resuelto con solución distinta a la planteada aquí: en lugar de long-press
(approach inicial que se descartó por incompatibilidad con Cytoscape — ver
`ESTADO_ACTUAL.md §Sesión 25` para detalle técnico), se introdujo un **modo
edición explícito** vía botón "Mover nodos" en el sub-header de `/mapa`. El
problema original (drag accidentales en móvil al panear/scrollear) quedó
cubierto: en modo navegación los nodos no son grabbable.

### ~~Reducir read-only de chips en /rolls y /sesion/[id]~~ — HECHO 2026-05-16 (parcial)

- **Origen:** T-3.it2.b, feedback Adalid 2026-05-16
- **Hecho:** rediseño completo del chip-picker (componente nuevo `ChipPicker.svelte`) aplicado tanto a captura como a read-only. Read-only ahora usa `flex flex-wrap` (sin filas-fijas, sin scroll horizontal — decisión post-validación del owner). Estética alineada entre editable y read-only.
- **Pendiente (si reaparece la fricción):** quitar/abreviar el label de texto completo ("Posiciones que fueron bien:" → icono o más corto). Quedó tal cual; en uso real verá si molesta. Si vuelve, se reabre como tarea propia.

### Roll editor — sugerir compañero por defecto + selector inteligente

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

### ~~Botón "+ Nuevo compañero" debe ser FAB igual que "+ Nueva sesión"~~ — HECHO en T-9+T-10 (commit pendiente)

La nueva ruta `/companeros` usa FAB consistente con `/`. La página dev `/dev/companeros-smoke` se queda con el botón normal porque es solo sanity check.

### Editor de compañero (y formularios similares) — captura por pasos con auto-avance + sugerencias en lugar de dropdowns

- **Origen:** T-4, feedback Adalid 2026-05-09
- **Idea:** rediseñar el editor de compañero para que en lugar de un formulario único con todos los campos visibles, sea una secuencia de "pasos" o "tabs" que avancen **automáticamente** cuando el usuario rellena cada campo. Para campos con valores cerrados (cinturón, peso relativo, tipo, resultado, etc.), reemplazar `Select` (dropdown) por **chips de sugerencia** que el usuario tappee directamente. Objetivo: 1 tap por campo, idealmente sin abrir teclados ni desplegables.
- **Por qué:**
  - CU-1 (capturar sesión tras clase) es el caso de uso primario y debe ser ágil en móvil.
  - Cada dropdown abre un overlay extra → 2-3 taps para cada selección.
  - Auto-avance reduce el "¿qué falta?" cognitivo y mantiene flow.
- **Aplica también a:** editor de roll (T-6) y posiblemente editor de sesión (T-5) — todos tienen patrón formulario con campos enum.
- **Cuándo:** tras cerrar Iteración 0 con captura básica funcionando, antes de empezar Iteración 1.

---

### Orden de la tabla `/rolls` — más reciente arriba

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

### Botón "Forzar actualización" en `/ajustes`

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

### ~~Modo oscuro con toggle en Ajustes~~ — HECHO en sesión 11 (commit pendiente)

Implementado en sesión 11 (2026-05-14). `ThemeState` singleton en
`src/lib/theme.svelte.ts`, toggle 3 botones (Auto/Claro/Oscuro) en
`/ajustes`, persistencia `localStorage['theme']`, suscripción a
`matchMedia('(prefers-color-scheme: dark)')`. Decisión documentada en
`decisiones/003-theme-manager.md`.

### Sistema de diseño coherente — usar design tokens en lugar de Tailwind raw

- **Origen:** T-6, feedback Adalid 2026-05-09
- **Estado actual mixto:**
  - Componentes shadcn-svelte (Button, Dialog, Input, Select, etc.) ya usan los design tokens del sistema definidos en `src/routes/layout.css` como CSS vars (`--primary`, `--destructive`, `--muted`, etc.). Coherentes entre sí.
  - Componentes propios (`Fab.svelte`, badges de resultado en P2, mensajes "Sin compañero"/"vacío") usan Tailwind crudo (`bg-blue-600`, `text-green-800`, etc.). Improvisado.
- **Idea:**
  1. Migrar componentes custom para que usen los tokens semánticos shadcn (`bg-primary`, `text-destructive`, `bg-muted`, `text-muted-foreground`, etc.). Así el cambio de tema (light/dark, color base) refresca toda la app coherentemente.
  2. Añadir tokens del dominio cuando haga falta (color para "dominé" / "equilibrado" / "perdí", color para empty state, color para "vacío"/sin datos). Definirlos como CSS vars en `layout.css` y referenciarlos por nombre semántico, no por color literal.
- **Por qué:** consistencia visual, theming futuro (light/dark), facilita cambio de paleta global sin tocar componentes uno a uno.
- **Cuándo:** cuando arranque la fase de pulido visual de Iteración 0 o antes de "release público" si llega.

### Vista grafo del mapa técnico debe estar disponible (lectura) en móvil

- **Origen:** T-9+T-10 polish, feedback Adalid 2026-05-09
- **Idea:** cuando llegue iteración 3 (vista grafo con Cytoscape.js), no limitarla a desktop. El móvil debe poder VERLA (lectura, sin edición). Razón explícita de Adalid: "necesito tener el conocimiento a mano" — durante o tras una clase quiere consultar técnicas/contras/posiciones desde el móvil, no solo en casa.
- **Refinamiento de REQUISITOS:** §4.1 dice "Móvil: captura + lectura del mapa técnico (no edición)". Esto ya cubre lectura, pero deja ambiguo si lectura incluye la vista grafo o solo lista. Aclarar como sí: vista grafo en móvil = sí (read-only).
- **Implicación técnica:** Cytoscape.js debe rendear bien en móvil (touch gestures, zoom). Validarlo cuando se aborde iteración 3.
- **Cuándo:** iteración 3.

### ~~Vincular posiciones complementarias (top ↔ bottom)~~ — MOVIDA a tarea concreta

Decidido 2026-05-13 (s9) — primera tarea de **it.2** (T-1.it2). Ver
`ESTADO_ACTUAL.md` sección "Iteración 2 — entrada confirmada".
Mini-ADR `decisiones/002-vinculo-top-bottom.md` a escribir cuando arranque.

### Una técnica con múltiples destinos posibles

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

### Cards en items — revisar "saturación visual" tras uso real

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

### C2 — mínimo de rolls configurable para activar bandera

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

### Reducir fricción al crear técnica tipo sumisión (nombre redundante)

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

### Simplificar enum de TipoTecnica si el uso real solo usa transición

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

### Resumen automático post-sesión — aplazado de T-5.it2

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

### Sumisiones vs técnicas — redundancia del modelo

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

### Tab Sumisiones en el sub-toggle de Lista del /mapa

- **Origen:** sesión 22 (2026-05-17), decisiones de producto de T-8.it3.
- **Idea:** añadir un tercer estado al sub-toggle de Lista (`/mapa` →
  vista Lista) para Sumisiones, junto a Posiciones y Técnicas. Hoy
  las sumisiones solo se acceden desde el modal de una posición; el
  owner quería separarlas como tab propio pero priorizó cerrar T-8
  primero.
- **Por qué:** acceso directo al catálogo de sumisiones sin pasar por
  posición. Útil cuando it.3 lleve la vista grafo y el inventario
  crezca lo suficiente para que la búsqueda dentro de modales sea
  fricción real.
- **Cuándo:** post-T-8.it3, valorar en cleanup de it.3 o como tarea
  propia en it.4 si la fricción es palpable en uso real.

### Sistematizar sombras (`shadow-[rgba(...)]` inline → tokens semánticos)

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

## Performance / build

### Reducir el precache PWA (~2.3 MB) eliminando la duplicación del `.wasm`

- **Origen:** T-2, deuda anotada en `T2_PLAN_v2.md`
- **Idea:** Vite emite una copia hasheada de `sqlite3.wasm` además de la nuestra estática. Eliminarla usando `?url` import o cambiando `locateFile` para apuntar a la versión bundleada.
- **Cuándo:** si el peso de instalación de la PWA empieza a molestar en uso real, o antes de cualquier release "público".

---

## Tech debt / dev experience

### FOUC inicial al cargar con tema oscuro persistido

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

### CATEGORIAS_ORDEN / CATEGORIA_LABEL duplicado en 3 sitios

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

### ~~Resolver el error preexistente de `virtual:pwa-register` en `+layout.svelte`~~ — HECHO en T-9+T-10 (commit pendiente)

Resuelto añadiendo `/// <reference types="vite-plugin-pwa/vanillajs" />` en `src/app.d.ts` (no toca `+layout.svelte`, sortea la regla de fichero prohibido).

### Loop de refresh en primera carga tras deploy con cambios grandes en SW

- **Origen:** T-2, observado en producción
- **Idea:** evaluar `registerType: 'prompt'` en lugar de `'autoUpdate'`, o reducir tamaño del precache, o añadir lógica de "skipWaiting" controlada.
- **Cuándo:** si afecta a usuarios reales o aparece en algún test posterior.

### Esquema BD legacy: columna `experiencia_anos` en `companeros`

- **Origen:** T-4, eliminada del schema_v1 actualizado por feedback de Adalid.
- **Detalle:** las BDs OPFS de instalaciones previas a T-4 todavía tienen la columna `experiencia_anos` (REAL nullable). El código actual no la referencia, no se inserta, no se lee — queda como dead column.
- **Cuándo:** cuando aparezca el primer schema_v2 (probablemente Iteración 1, al añadir tabla de Posiciones), aprovechar la migración para limpiar también esta columna huérfana.

### Actualizar GitHub Actions del workflow de deploy a versiones con Node 24

- **Origen:** anotación de GitHub Actions en el deploy del cierre de it.2 (run `25967932789`, 2026-05-16).
- **Detalle:** el workflow `.github/workflows/deploy.yml` usa `actions/checkout@v4`, `actions/setup-node@v4`, `actions/upload-artifact@v4` y `pnpm/action-setup@v4`, que internamente corren sobre Node 20. GitHub deprecó Node 20 en runners: desde el **2 de junio de 2026** se fuerza Node 24 por defecto, y el **16 de septiembre de 2026** se retira Node 20 del runner.
- **Idea:** actualizar cada action a la versión que ya soporta Node 24 nativamente (revisar releases de cada repo). Alternativa puente: añadir `FORCE_JAVASCRIPT_ACTIONS_TO_NODE24=true` como env var del workflow para opt-in antes del cutover.
- **Por qué:** ahora el deploy funciona pero está en cuenta atrás. Si no se actualiza antes de septiembre, el workflow se rompe y bloquea releases.
- **Cuándo:** antes del 2 de junio de 2026 idealmente (para validar con margen); como tarde, antes del 16 de septiembre de 2026.
- **Restricción del proyecto:** `.github/workflows/deploy.yml` está en la lista de ficheros que no se tocan sin pedirlo explícitamente (ver `CONTEXTO_AGENTE.md`). Esta tarea requiere que el owner lo abra.

---

## Cómo usar este documento

- Cuando sugiramos algo durante una iteración pero decidamos no hacerlo en el momento, lo anotamos aquí.
- Cuando arranque una iteración de pulido / refactor, este documento es la primera referencia para decidir qué entra.
- Cuando se aborda una entrada, mover a un cambio incremental en T-X de la iteración correspondiente y eliminar de aquí (o marcar `~~tachada~~ — hecho en commit XXX`).
