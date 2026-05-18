# ADR-006 — Layout "grafo siempre visible" + Sheet/Drawer en lugar de Dialog para los modales del mapa

**Fecha:** 2026-05-18
**Estado:** Aceptada
**Sesión:** 22
**Commit principal:** `5c86862` (T-8.b.it3, migración Dialog → Sheet)

## Contexto

Al cierre de la sesión 20 (T-1..T-7), `/mapa` tenía un toggle de tres
estados (Posiciones / Técnicas / Grafo) y los modales de entidad se
abrían como Dialog centrado de bits-ui. Con el grafo solo siendo una
de tres tabs, no había tensión: cuando estabas en Posiciones, el grafo
no se veía, así que un Dialog centrado encima de la lista era natural.

En la sesión 21 el owner reveló una visión más ambiciosa del mapa
(detallada en ESTADO_ACTUAL.md §21):

- El grafo no es una pestaña entre tres, es el **chasis principal** de
  `/mapa`. El usuario "vive" en el grafo y entra al detalle desde ahí.
- El grafo debe seguir visible mientras se navega un modal de
  entidad, para que el grafo "cuente la historia" que estás leyendo
  (ver ADR-007 — el grafo hace pan al nodo focal).

Esto rompe el modal Dialog centrado: tapa el grafo, pierde la
conexión visual entidad↔nodo, y obliga a cerrar el modal para volver a
ver el catálogo.

Componente shadcn-svelte `sheet` no estaba instalado en el proyecto.

## Decisión

**Sub-header sticky de dos filas** en `/mapa` (T-8.a, commit
`2646b22`):

- Fila 1: toggle binario **Grafo / Lista**.
- Fila 2: contextual — sub-toggle Posiciones/Técnicas/Sumisiones cuando
  la vista activa es Lista; filtros `FilterDropdown` + acciones del
  grafo (Reorganizar / Guardar organización, ver ADR-008) cuando es
  Grafo.

Vista por defecto al entrar en `/mapa` = **Grafo** (decisión del owner
en sesión 22, asume el coste del chunk Cytoscape en la primera visita).

**Presentación del modal según breakpoint y vista activa** (T-8.b):

- `presentation: 'dialog'` — vista Lista, todos los breakpoints. El
  grafo no está montado, no hay que evitar taparlo.
- `presentation: 'sheet-side'` — vista Grafo, desktop (≥768px). Drawer
  lateral derecho.
- `presentation: 'sheet-bottom'` — vista Grafo, móvil (<768px). Drawer
  inferior ~50dvh.

`MapaModalHost.svelte` recibe `presentation` como prop. El padre
deriva con `$derived` sobre `vistaPrincipal` + `useMediaQuery('(min-width: 768px)')`.
Snippet `modalContent()` reutilizado entre los tres wrappers (Dialog,
Sheet-side, Sheet-bottom).

**Configuración del Sheet en vista Grafo** (descubierta iterando con
el owner):

- Overlay con `pointer-events-none!` (Tailwind v4 `!important`) +
  transparente → el grafo queda visible E interactivo detrás del drawer.
- `preventScroll={false}` → bits-ui no aplica `pointer-events: none`
  al `<body>` (era el bloqueador que impedía clicar grafo/toggle con
  drawer abierto).
- `interactOutsideBehavior="ignore"` → click en el grafo NO cierra el
  drawer (el usuario puede explorar el grafo con un modal abierto).
- Insets verticales: `top-14! bottom-14!` (sheet-side) y `bottom-14!`
  (sheet-bottom) → drawer no tapa `AppHeader` ni `BottomNav`.
- `showCloseButton={false}` y X propio dentro del snippet — el X nativo
  de bits-ui cerraba el drawer aunque hubiera dirty pendiente.

**Dirty guard unificado**: `attemptCloseAll(onClose?)` en
`MapaModalHost` acepta callback que se invoca solo si el cierre se
confirma (inmediato si stack no-dirty, o tras "Descartar" en el
AlertDialog). El padre usa ese helper para toda transición que
implique cerrar el modal: toggle Grafo/Lista, click en otro nodo del
grafo (nueva prop `onAttemptPush` en `GrafoMapa`), `openPosicion` /
`openSumision` / `openTecnica` / `openWizardCrear*`. Lo unifica el
helper `attemptPushModal` en `/mapa/+page.svelte`.

**Toggle Grafo↔Lista con modal abierto: permitido siempre.** Drafts
de wizard sobreviven al remount (el dirty queda en el wizard mismo,
si lo hay, y dispara su propio AlertDialog).

**Componentes shadcn-svelte `sheet` añadidos** vía
`pnpm dlx shadcn-svelte add sheet`. Esto copió los archivos al árbol
del proyecto (no añadió una dep npm nueva) y bumpó `@lucide/svelte`
`^1.14 → ^1.16` como efecto colateral.

**Hook `useMediaQuery`** en `src/lib/hooks/use-media.svelte.ts` (~25
LOC, class field con `matchMedia` listener, guard SSR). Patrón
estándar del proyecto: clase con `$state` en field y singleton
exportado, en línea con la regla de runas (ver CONTEXTO_AGENTE.md).

## Consecuencias

- **Tres modos de presentación coexisten** con el mismo contenido
  (`modalContent()` snippet). Cambio de modo es transición suave: en
  desktop redimensionar la ventana cruzando 768px con un modal abierto
  re-evalúa `presentation` y el modal cambia de lateral a inferior sin
  recrear el contenido.
- **El grafo queda interactivo detrás del drawer** (pan, zoom, tap a
  otro nodo). El click en otro nodo dispara `onAttemptPush` que pasa
  por el dirty guard. Si no hay dirty, transición inmediata; si hay
  dirty, AlertDialog del wizard.
- **El grafo se mueve con el modal abierto** (ADR-007): el pan al
  nodo focal calcula insets correctos dependiendo del modo de
  presentación. Esta sincronización solo tiene sentido porque el
  grafo está visible — es la justificación retroactiva de toda la
  decisión de Sheet sobre Dialog.
- **Owner asume el coste del chunk Cytoscape en la primera visita.**
  Como `/mapa` arranca en vista Grafo, el chunk lazy-loaded de
  Cytoscape + fcose (ADR-005) se carga al primer aterrizaje, no solo
  cuando el usuario activamente cambia a Grafo. Trade-off explícito.
- **+~3 KB en el bundle de `/mapa`** por el snippet duplicado de
  presentation + las clases utility de los wrappers Sheet. Despreciable.
- **`@lucide/svelte` bumpado** como side effect del scaffold de Sheet.
- Patrón replicable: cualquier nuevo modal en `/mapa` que deba
  coexistir con un grafo visible usa `presentation` y se beneficia
  del dirty guard unificado.

## Alternativas consideradas

- **Mantener Dialog centrado y conformarse con tapar el grafo.**
  Pros: cero cambio. Cons: pierde la metáfora "estoy leyendo sobre
  este nodo concreto", invalida el caso de uso de ADR-007 (sin grafo
  visible no hay nada que sincronizar). Descartada por mismatch con
  la visión del owner.
- **Drawer universal en todos los breakpoints** (siempre lateral o
  siempre inferior). Pros: una sola decisión, menos código. Cons: un
  drawer lateral en móvil (320px de ancho) deja al modal con ~50%
  del viewport y al grafo apretado en el otro 50% sin altura para
  zoom; un drawer inferior en desktop ocupa la mitad inferior y
  fuerza scroll vertical en el contenido del modal cuando el usuario
  tiene 1440px de altura disponible. Descartada por UX inferior en
  ambos breakpoints.
- **Modal pop-over anclado al nodo** (estilo tooltip grande). Pros:
  conexión visual nodo-modal evidente. Cons: imposible en móvil sin
  tapar el grafo; difícil de gestionar con stack de modales
  (breadcrumb empuja a otra entidad → ¿el popover se reposiciona?
  ¿salta de nodo? Confuso); no hay primitive bits-ui adecuado para
  este patrón con stack interno. Descartada por complejidad sin
  beneficio claro.
- **Toggle de tres estados conservado** (Posiciones / Técnicas /
  Grafo). Pros: menos cambio. Cons: el grafo sigue siendo un
  "ciudadano de segunda" frente a las listas. La visión del owner
  pide grafo-como-chasis, no grafo-como-tab. Descartada.

## Referencias

- Commits:
  - `2646b22` — T-8.a (sub-header dos filas, toggle binario).
  - `5c86862` — T-8.b (migración Dialog → Sheet, `useMediaQuery`,
    dirty guard unificado).
  - `f3f9c72` — T-8.c+d (nodos circulares + paleta monocromática
    sobre canvas dark, cosmético, fuera del scope de este ADR).
- Ficheros:
  - `src/routes/mapa/+page.svelte` — sub-header, deriva
    `presentation`, helper `attemptPushModal`.
  - `src/lib/components/mapa-modal-host.svelte` — wrappers Dialog /
    Sheet-side / Sheet-bottom + dirty guard `attemptCloseAll`.
  - `src/lib/hooks/use-media.svelte.ts` — hook breakpoint.
  - `src/lib/components/ui/sheet/` — primitives shadcn-svelte
    copiados.
- `.claude/ESTADO_ACTUAL.md` §22 (decisiones de producto al inicio,
  T-8 desglosado).
- ADR-007 — pan al nodo focal (decisión hermana, justificada por la
  visibilidad del grafo que este ADR habilita).
- ADR-008 — persistencia del layout: comparte el dirty-guard pattern
  (AlertDialog separado para el grafo, ver ese ADR para detalle).
