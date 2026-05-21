# ADR-004 — Algoritmo fcose como layout del grafo de Cytoscape

**Fecha:** 2026-05-17
**Estado:** Aceptada
**Sesión:** 20

## Contexto

T-1.it3 introduce un grafo interactivo del catálogo (posiciones,
sumisiones y técnicas) sobre Cytoscape. El catálogo no trae coordenadas
en el schema (decisión cerrada al arrancar la iteración: auto-layout,
no `x/y` persistidos en las entidades — la persistencia llega más
tarde, ver ADR-008). Esto obliga a escoger un algoritmo de layout que
calcule la disposición en el cliente, sin backend, en cada montaje.

Restricciones del proyecto en el momento de decidir:

- **Cliente-only.** Toda la lógica corre en navegador (SvelteKit static
  + SQLite-WASM). No hay servidor donde pre-calcular layouts ni
  posibilidad de cachear posiciones en backend.
- **Volumen modesto a medio plazo.** El catálogo realista en horizonte
  de iteración 3 ronda 30-60 nodos y 80-150 aristas. No hay caso "miles
  de nodos" que justifique algoritmos pesados.
- **Modelo del grafo.** Nodos = posiciones + sumisiones (sumisión es
  nodo terminal único, REQUISITOS §3.5). Aristas = técnicas. Hay
  clusters naturales por categoría/rol (guardia, control superior, etc.)
  que un buen layout debería revelar.
- **Sin dependencias no acordadas.** Cualquier algoritmo elegido debe
  venir como extensión oficial de Cytoscape, no como librería ad-hoc.

## Decisión

`cytoscape-fcose@2.2.0` (force-directed con clustering) como layout
único del grafo.

Razones concretas:

- **Calidad visual del clustering.** fcose es una variante de CoSE
  ("Compound Spring Embedder") con soporte explícito de constraints
  (`fixedNodeConstraint`, `alignmentConstraint`, etc.) y mejor
  separación de clusters que el `cose` clásico. En el dataset real del
  proyecto, agrupa visualmente las posiciones por categoría sin
  configuración adicional.
- **API estable y mantenida.** Versión 2.x activa, compatible con
  Cytoscape 3.33.
- **Soporte de constraints que aparecerá útil más adelante.** En T-9.b
  (ver ADR-008) fcose se reutiliza con `fixedNodeConstraint` para
  acomodar nodos nuevos respetando los ya colocados por el usuario.
  Otros layouts no exponen ese parámetro.
- **Coste de bundle aceptable.** Chunk separado de ~122 KB (gzip
  ~35 KB), lazy-loaded junto a Cytoscape (ver ADR-005). No impacta el
  bundle inicial.

## Consecuencias

- **Layout no-determinista por defecto.** fcose parte de coordenadas
  aleatorias y resuelve fuerzas hasta convergencia. Dos montajes del
  mismo dataset producen layouts visualmente distintos. Mitigaciones
  aplicadas a lo largo de la iteración:
  - `randomize: false` cuando se tiene cache de posiciones (no
    re-aleatoriza si ya hay un layout previo).
  - Layout `preset` (no fcose) cuando TODOS los nodos están cacheados
    — produce el mismo resultado bit-a-bit en cada mount.
  - `fixedNodeConstraint` en T-9.b para que el subset cacheado quede
    fijo y solo los nodos nuevos se acomoden con fuerzas (ver ADR-008).
- **+122 KB en el chunk del grafo.** Coste aceptado por el owner como
  parte del peaje de la vista grafo (que es la vista por defecto de
  `/mapa` desde T-8.it3, ver ADR-006).
- **Bug del shape ESM/CJS al registrar la extensión.** El paquete
  `cytoscape-fcose` viene como CommonJS empaquetado y según el bundler
  el `default` está en `mod.default` o en `mod` directamente. El fix
  `(fcoseMod.default ?? fcoseMod)` quedó documentado en T-5.it3 y
  vuelve a aparecer en ADR-005 (es parte del lazy-load del algoritmo).
- **Reglas establecidas para el resto de la iteración:**
  - `fit: false` por defecto al re-correr el layout (evita reset del
    viewport del usuario; ver sesión 20, T-7.it3).
  - `cy.stop()` antes de cualquier `animate()` o `layout().run()`
    posterior para no encadenar animaciones.

## Alternativas consideradas

- **`cose` (built-in de Cytoscape).** El predecesor de fcose. Pros:
  cero dependencias adicionales (viene en el core). Cons: clustering
  inferior, sin soporte de `fixedNodeConstraint`, peor rendimiento en
  grafos con clusters claros. Descartado porque la diferencia visual
  era apreciable y el constraint de fijar nodos era requisito implícito
  (cristalizó en T-9.b).
- **`dagre` (jerárquico).** Layout en niveles, ideal para DAGs. Cons:
  el grafo del proyecto NO es acíclico (las técnicas pueden ir en
  ambos sentidos: sweep y reverse-sweep entre dos posiciones), por lo
  que dagre fuerza una linealización artificial que no representa el
  modelo. Descartado por mismatch semántico.
- **`breadthfirst` / `circle` / `concentric`.** Layouts geométricos
  fijos. Pros: deterministas, baratos. Cons: pierden la información de
  clustering por categoría, distribuyen nodos en forma rígida (anillos
  concéntricos, capas) que choca con la metáfora "mapa libre".
  Descartado por estética y por ausencia de clustering.
- **`elk` (Eclipse Layout Kernel).** Layouts avanzados (mr-tree,
  layered, force). Pros: muy potente. Cons: el binding `cytoscape-elk`
  trae ~700 KB del kernel WASM, lo cual triplica el coste de
  `cytoscape-fcose`. Descartado por bundle.
- **Coordenadas en schema desde el inicio.** Persistir `x/y` por nodo
  en la BD y prescindir de auto-layout. Descartado al arrancar T-1
  (decisión explícita del owner): el catálogo es manual, no hay UI
  para definir coordenadas a mano antes de existir el grafo, y la
  experiencia inicial sería un grafo vacío sin layout. La persistencia
  llega más tarde como complemento, no como sustituto — ver ADR-008.

## Referencias

- Commit del spike inicial (T-1.it3): primer commit de la iteración 3.
- `src/lib/components/GrafoMapa.svelte` — uso de fcose en
  `pickLayoutOptions(...)` y en el `runLayoutAndCache`.
- `src/lib/types/cytoscape-fcose.d.ts` — typings ad-hoc para la
  extensión (no trae `.d.ts` propios).
- ADR-005 — lazy-load de Cytoscape y fcose (decisión hermana).
- ADR-008 — persistencia del layout: reutiliza fcose con
  `fixedNodeConstraint` para nodos nuevos.
- `.claude/ESTADO_ACTUAL.md`, sesión 20 (T-1.it3 a T-7.it3).
- `.claude/agent-reports/20260516-it3-plan/plan.md` — plan inicial de
  la iteración, donde la elección de algoritmo se decide al inicio.
