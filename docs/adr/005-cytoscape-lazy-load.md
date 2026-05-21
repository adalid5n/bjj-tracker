# ADR-005 — Lazy-load de Cytoscape y fcose vía `await import()`

**Fecha:** 2026-05-17
**Estado:** Aceptada
**Sesión:** 20

## Contexto

T-1.it3 añade Cytoscape (`cytoscape@3.33.3`, ~434 KB) y la extensión
`cytoscape-fcose@2.2.0` (~122 KB) como dependencias del proyecto. Sin
ningún tratamiento especial, estos paquetes entrarían en el bundle
inicial de la app y se descargarían en cada arranque, incluso para
usuarios que nunca abren `/mapa` o que se quedan siempre en la vista
Lista del mapa.

Restricciones y consideraciones:

- **PWA con assets servidos por GitHub Pages.** Cada KB del bundle
  inicial cuenta: red móvil + parsing JS. ~550 KB extra en el entry
  bundle es un golpe perceptible en time-to-interactive.
- **El grafo se ve en exactamente una ruta** (`/mapa`) y solo cuando
  el usuario está en la vista Grafo (ver ADR-006). Las rutas
  `/captura`, `/companeros`, `/ajustes`, etc. nunca lo necesitan.
- **Vite + SvelteKit soportan code splitting nativo con `import()`
  dinámico.** Cada `await import('foo')` genera un chunk separado que
  se carga bajo demanda y se cachea por el navegador (y por el Service
  Worker de la PWA tras la primera visita).

## Decisión

Cargar Cytoscape y fcose con `await import(...)` dentro del `onMount`
de `GrafoMapa.svelte`, en paralelo con la carga de layouts persistidos
desde la BD:

```ts
const [cytoscapeMod, fcoseMod, dbLayouts] = await Promise.all([
  import('cytoscape'),
  import('cytoscape-fcose'),
  getAllLayouts()
]);

const cytoscape = cytoscapeMod.default;
const fcose = (fcoseMod as { default?: unknown }).default ?? fcoseMod;
cytoscape.use(fcose as never);
```

El resto del componente (props, stylesheet, handlers) carga
síncronamente con el resto del bundle de `/mapa`; solo los dos paquetes
pesados son diferidos.

## Consecuencias

- **Chunks separados garantizados.** El build genera dos chunks
  diferenciados que Vite nombra automáticamente
  (`cytoscape.<hash>.js`, `cytoscape-fcose.<hash>.js`). Verificado en
  `pnpm build` durante T-1.it3.
- **Latencia adicional al entrar en vista Grafo por primera vez.** El
  usuario paga el coste de descargar ~556 KB la primera vez que entra
  en `/mapa` con vista Grafo. Navegaciones posteriores usan cache HTTP
  + Service Worker. Trade-off aceptado por el owner.
- **El bundle inicial de la app NO incluye los chunks.** Confirmado
  con la salida de `pnpm build`: el entry bundle no referencia
  `cytoscape` ni `cytoscape-fcose`.
- **Fallback ESM/CJS obligatorio para fcose.** El paquete
  `cytoscape-fcose` viene como CommonJS empaquetado; según el bundler
  el export por defecto está en `mod.default` (interop ESM) o en `mod`
  directamente (consumo CJS plano). Sin el fallback
  `(fcoseMod.default ?? fcoseMod)` el registro `cytoscape.use(...)`
  falla silenciosamente y fcose no queda registrado — síntoma visible
  en T-5.it3: los nodos salían en diagonal porque el layout caía al
  default de Cytoscape (`grid`).

  La forma `cytoscape.default` (Cytoscape) NO necesita ese fallback —
  expone correctamente el default ESM. Solo fcose requiere la doble
  forma.

- **El componente `GrafoMapa` solo se evalúa cuando se monta.** Esto
  ya pasa de forma natural en SvelteKit: el `{#if vistaPrincipal ===
  'grafo'}` en `/mapa/+page.svelte` desmonta el componente cuando la
  vista cambia a Lista, así que la promesa de `import()` ni siquiera
  se dispara fuera de la vista Grafo.

## Alternativas consideradas

- **Import estático** (`import cytoscape from 'cytoscape'` arriba del
  componente). Cero complejidad pero penaliza el bundle inicial con
  ~556 KB extra. Descartado por coste claro y beneficio nulo (la mayoría
  de las páginas nunca usan el grafo).
- **Prefetch on idle** (cargar los chunks en `requestIdleCallback` al
  arrancar la app, para que estén calientes cuando el usuario abra el
  mapa). Pros: oculta la latencia tras la primera carga. Cons: añade
  complejidad (gestión de estado del prefetch, fallbacks, riesgo de
  cargar deps que el usuario jamás usa), y la cache del SW ya consigue
  el mismo efecto en visitas subsecuentes con cero código. Descartado
  por relación coste/beneficio.
- **Hint de prefetch nativo** (`<link rel="prefetch">` apuntando al
  chunk). Pros: declarativo, navegador-gestionado. Cons: SvelteKit no
  expone un API limpio para apuntar a chunks dinámicos por nombre
  hasheado; habría que post-procesar el manifest del build. Descartado
  por scope mínimo: el cache SW cubre el caso real.
- **Bundlear Cytoscape directamente** (sin extensión fcose, escribir
  un layout custom). Descartado por overhead absurdo: fcose hace lo
  que necesitamos, escribir un force-directed propio sería
  re-inventar la rueda.

## Referencias

- `src/lib/components/GrafoMapa.svelte::onMount` — el bloque
  `await Promise.all([...])` con los dos `import(...)` dinámicos.
- `src/lib/types/cytoscape-fcose.d.ts` — typings ad-hoc; sin esto el
  `import('cytoscape-fcose')` no tipa.
- `.claude/ESTADO_ACTUAL.md`, sesión 20 — T-1.it3 (spike) y T-5.it3
  (bug del fallback ESM/CJS).
- ADR-004 — elección de fcose (decisión hermana sobre QUÉ algoritmo,
  este ADR cubre CÓMO se carga).
- ADR-006 — el grafo es ahora la vista por defecto de `/mapa`, lo que
  implica que el coste de carga inicial del chunk se paga en la
  primera visita a la app (no solo si el usuario activamente abre
  Grafo). Owner asume ese coste.
