# Plan técnico — Fase 1: Mini-grafo de contras en modal de técnica

**Estado:** plan de ejecución, decisiones cerradas. Listo para arrancar.
**Rama:** `feature/contras-visuales` (a crear al iniciar Paso 1).
**Origen:** entrada de backlog `Visualización de contras en el grafo — 2 fases` en [`MEJORAS_FUTURAS.md`](MEJORAS_FUTURAS.md).
**Deliberación previa:** [informe del Plan agent](agent-reports/20260521-contras-fase1-plan/plan.md) — incluye alternativas descartadas y tradeoffs largos. Este documento sólo recoge las decisiones tomadas.

---

## 1. Resumen ejecutivo

Sustituir la lista plana de "Contras conocidas" dentro del modal de técnica por un **mini-grafo Cytoscape hub-spoke**: la técnica en el centro, sus contras como satélites en círculo, aristas dirigidas (técnica → contra) que reflejan la asimetría real del modelo `tecnica_contras`.

Componente nuevo aislado (`MiniGrafoContras.svelte`), sin dependencias nuevas (Cytoscape ya carga para el grafo principal y se reutiliza vía caché de módulos). Paleta **monocromática estricta**, idéntica a la del grafo grande — el color por tipo del brainstorm original queda descartado por incoherencia con la decisión global vigente.

La edición de contras (añadir / quitar) se queda donde está hoy: el mini-grafo es **sólo visualización**. Se diseña con API ligeramente sobredimensionada (props `selectedId` y `height` opcionales, declaradas pero no usadas) para reutilizarse como pieza interna en Fase 2 sin retrabajo.

**Esfuerzo: M** (≈1 sesión de trabajo enfocado, 5 pasos). Cero migración de BD, cero cambio de sync/export, cero tocar `vite.config`/layout.

## 2. Decisiones cerradas

### Visual

- **D-1. Paleta monocromática estricta**, idéntica a `GrafoMapa.svelte`. El hub usa el tratamiento "destacado" de las sumisiones (relleno `--foreground` macizo); los satélites usan el tratamiento neutro de las posiciones (`--muted` + borde `--muted-foreground`); aristas en `--muted-foreground`. *Por qué:* la decisión global del grafo grande (commit `f3f9c72`) prohíbe color-por-tipo. Introducirlo sólo en el mini rompería esa decisión en un sitio.
- **D-2. `transicion` se dibuja dashed** en las aristas del mini-grafo, igual que en el grafo grande. *Por qué:* consistencia visual con el catálogo. La arista dashed es la única señal de tipo que se mantiene en monocromático.
- **D-3. Sin `selected state` propio en Fase 1**. El contexto del modal **es** la técnica del hub; destacar el centro es redundante. La prop `selectedId` se declara para que Fase 2 la consuma sin rediseñar la API.

### Topología y datos

- **D-4. Aristas dirigidas hub → contra, con flecha** (`target-arrow-shape: triangle`). *Por qué:* `tecnica_contras` es asimétrica (`src/lib/contras.ts:1-13` lo documenta literal). Pintarla no-dirigida mentiría sobre el modelo.
- **D-5. Layout `preset` radial calculado trigonométricamente**, hub en `(0,0)` y satélites en `(R·cos θ, R·sin θ)` con `θᵢ = -π/2 + 2π·i/N`. **Sin fcose** aquí. *Por qué:* hub-spoke es geometría pura; determinista, barato, y evita añadir `cytoscape-fcose` al chunk del modal.
- **D-6. Cap visual a N=20 contras** con badge "+(N-20) más..." y fallback a lista plana debajo. *Por qué:* defensivo; el catálogo real no se acerca a este número, pero un guard barato evita un solapado de labels feo en un caso patológico futuro.
- **D-7. Cada satélite muestra `{nombre técnica}` como label principal y `desde {posición origen}` como segunda línea** (`text-wrap: wrap`). *Por qué:* paridad estricta con la información que da la lista plana de hoy. Si el mini-grafo perdiera ese sub-label sería una regresión.

### Componente y API

- **D-8. Una instancia Cytoscape por modal**, creada en `onMount` y destruida en `onDestroy`. Sin singleton, sin pool. *Por qué:* el constructor es barato para N<20 nodos (~10-30 ms), Cytoscape ya está en memoria, y un singleton acoplaría el componente a un container fijo (peor para Fase 2).
- **D-9. Interacción vía callbacks como props** (`onTapContra`, `onTapHub` opcionales). El componente no importa `mapaModalStack`; la navegación la pasa el padre. *Por qué:* mismo patrón que `onAttemptPush` de `GrafoMapa`. Fase 2 lo reusará con otro callback (p.ej. expandir la contra dentro del grafo principal).
- **D-10. Altura del canvas: 320 px fijos** (subido desde los 240 px del informe inicial). Wrapper `min-h-80 w-full`. *Por qué:* 240 px se queda corto con 7-8 contras; 320 mejora legibilidad sin asfixiar el resto del `sheet-bottom` móvil. Si en preview se ve corto con N grande, subimos a 360-400 sin tocar otra cosa.
- **D-11. Mini-grafo read-only en Fase 1**. El "+ Añadir contra" (Combobox) y el "Quitar contra" (AlertDialog) se quedan tal cual debajo del canvas en `TecnicaModalContent.svelte`. *Por qué:* mezclar visualización con CRUD complica el componente sin ganancia clara hoy. Si tras uso real Adalid pide long-press para quitar, se añade como mejora F1.1.
- **D-12. `readTokens` se copia verbatim desde `GrafoMapa.svelte`** (no se extrae a `$lib/grafo-tokens.ts` todavía). *Por qué:* extraer a utilidad compartida tiene sentido cuando haya 3 consumidores reales (Fase 2 traerá el tercero). Hacerlo ahora sólo por Fase 1 es refactor prematuro.

### Documentación

- **D-13. ADR-009 corto al cierre de Fase 1** (~30-40 líneas) en `docs/adr/009-mini-grafo-contras.md`. *Por qué:* deja registro de dos decisiones con peso para sesiones futuras: subordinación del backlog a la paleta monocromática y elección de `preset` radial sobre fcose.

## 3. Modelo de componente

**Path:** `src/lib/components/MiniGrafoContras.svelte` (nuevo).

### API pública

```ts
type Props = {
  // Técnica del hub (centro del mini-grafo).
  tecnica: Tecnica;
  // Contras ya resueltas a entidades completas. El padre las trae de
  // getContras(tecnicaId) — no se vuelve a hacer query desde aquí.
  contras: Tecnica[];
  // Cache id→nombre de posiciones, para el sub-label "desde {origen}"
  // en cada satélite. El padre ya lo tiene (posicionesById).
  posicionesById: Record<string, string>;
  // Callback al tap sobre un satélite. Si no se pasa, no-op.
  onTapContra?: (contra: Tecnica) => void;
  // Callback al tap sobre el hub. Si no se pasa, no-op.
  onTapHub?: (tecnica: Tecnica) => void;
  // Reservado para Fase 2: highlight de un nodo concreto. Declarado
  // pero no usado en Fase 1.
  selectedId?: string | null;
  // Altura del canvas en píxeles. Default 320.
  height?: number;
};
```

### Lifecycle

- **`onMount`** (async): `await import('cytoscape')` (resuelve cache de módulos cargada por `GrafoMapa`), construye elementos (hub + satélites + edges), calcula posiciones radiales, instancia Cytoscape con `layout: { name: 'preset', positions, fit: true, padding: 20 }`, registra handlers `tap`. Flag `cancelled` antes de instanciar para sobrevivir a un desmontaje rápido del modal a media hidratación.
- **`$effect` sobre `[tecnica, contras, posicionesById]`**: si cambia la lista (Adalid añade/quita contra desde el padre), `cy.elements().remove() + cy.add(...) + layout({name:'preset', positions}).run()`. Mismo patrón que `GrafoMapa.svelte:636-646`.
- **`$effect` sobre `theme.isDark`**: re-aplica `buildMiniStylesheet(readTokens())` envuelto en `requestAnimationFrame` para esperar al settle de las CSS vars. Paridad con `GrafoMapa.svelte:400-407`.
- **`onDestroy`**: `cy?.destroy(); cy = null;`.

### Helpers internos

- `readTokens()` — copia verbatim de `GrafoMapa.svelte:115-162`. Probe DOM + trampolín canvas para resolver CSS vars a `rgb()` strings que Cytoscape parsea.
- `buildMiniStylesheet(tokens)` — versión reducida: `node` base, `node[kind="tecnica-hub"]` (relleno `--foreground` macizo), `node[kind="tecnica-contra"]` (relleno `--muted` + borde `--muted-foreground`), `edge` dirigida, `edge[tipo="transicion"]` dashed.
- `computeRadialPositions(N, R)` — devuelve `Map<string, {x,y}>`. `R = clamp(80, 50 + N·12, 140)`. Mitigación para N=1: incrementar R en 20 px o desplazar el satélite a `θ=0` (derecha) para que no choque con el label del hub.
- `buildElements(tecnica, contras, posicionesById)` — devuelve `{nodes, edges}` con labels multi-línea para los satélites.

### Cambios en `TecnicaModalContent.svelte`

- Importar `MiniGrafoContras`.
- Sustituir el bloque `{#if contras.length > 0} <div class="mt-2 rounded border..."><ul>...</ul></div> {/if}` (líneas 491-529) por: `{#if contras.length > 0}<MiniGrafoContras {tecnica} {contras} {posicionesById} onTapContra={pushTecnica} />{/if}`.
- **Mantener intactos** los bloques debajo: "+ Añadir contra" (Combobox + "+ Crear nueva técnica" inline) y AlertDialog de "Quitar contra" (líneas 530-573 + 670-699). Edición sigue donde está.

## 4. Pasos de implementación

5 pasos. Pasos 3 y 4 son independientes y pueden hacerse en paralelo; el resto es secuencial.

### Paso 1 — Crear rama y esqueleto del componente · S

- `git checkout -b feature/contras-visuales` desde `main` actualizado.
- Crear `src/lib/components/MiniGrafoContras.svelte` con la API pública definida en §3, el wrapper DOM (`<div class="dark relative h-80 w-full overflow-hidden rounded border border-border bg-card">` + container Cytoscape), y `onMount`/`onDestroy` que crean y destruyen una instancia vacía.
- **Verificación:** integrarlo combinado con Paso 2 para validar visualmente — el esqueleto solo no se ve.

### Paso 2 — Estilos y tokens · S · tras Paso 1

- Copiar `readTokens()` verbatim desde `GrafoMapa.svelte:115-162`.
- Implementar `buildMiniStylesheet(tokens)` con los selectores de §3 (hub destacado, satélites neutros, aristas dirigidas en `--muted-foreground`, `transicion` dashed).
- **Verificación:** instalar el componente en `TecnicaModalContent.svelte` con mock `contras = [tecnica fake]` y comprobar que hub + 1 satélite + 1 arista se ven en monocromático.

### Paso 3 — Layout radial y elementos · M · tras Paso 2

- Implementar `computeRadialPositions(N, R)` y `buildElements(...)`.
- Pasar a Cytoscape `layout: { name: 'preset', positions, fit: true, padding: 20 }`.
- Aplicar el cap a N=20 con badge "+(N-20) más..." y fallback a lista plana debajo si se supera.
- **Verificación:** abrir una técnica con varios contras en `pnpm preview`, comprobar disposición radial estable y labels legibles; cambiar técnica vía breadcrumb y verificar que el `$effect` re-corre el layout sin glitches.

### Paso 4 — Handlers de tap + reactividad de tema · S · paralelo con Paso 3

- `cy.on('tap', 'node', ...)` discrimina por `data('kind')` y llama a `onTapContra` o `onTapHub`.
- `$effect` sobre `theme.isDark` que re-aplica `buildMiniStylesheet(readTokens())` envuelto en `requestAnimationFrame`.
- **Verificación manual:** tap en satélite empuja un nuevo modal de técnica (breadcrumb crece); toggle de tema con el mini-grafo abierto re-pinta colores sin flicker.

### Paso 5 — Sustituir el bloque en `TecnicaModalContent.svelte` · S · tras Pasos 1-4

- Sustituir el `<ul>` de contras (líneas 491-529) por `<MiniGrafoContras ... />` dentro del mismo `{#if contras.length > 0}`.
- **Verificación final:** `pnpm check` + `pnpm build` + `pnpm preview` con reload duro. Casos a probar: técnica con contras → mini-grafo; técnica sin contras → "Sin contras registradas" + botón (sin canvas vacío); añadir contra → mini crece; quitar contra → mini encoge; tap en satélite → breadcrumb avanza.

## 5. Verificación final y riesgos

### Verificación antes de declarar Fase 1 cerrada

- `pnpm check` → 0 errors, 0 warnings.
- `pnpm build` → sin warnings nuevos.
- `pnpm preview` + **reload duro** (regla dura del repo por bugs históricos de SW/bundle stale). No basta con `pnpm dev` o `pnpm check`.
- Casos manuales en preview, ambos temas:
  - Técnica con N contras (≥3): mini-grafo radial, labels legibles, flecha visible hub→contra.
  - Técnica con N=0: no canvas, sólo "Sin contras registradas" + botón.
  - Técnica con N=1: el satélite no choca con el label del hub.
  - Añadir contra → mini crece sin recargar la página.
  - Quitar contra → mini encoge.
  - Tap en satélite → modal del hub queda en breadcrumb, modal de la contra arriba.
  - Toggle dark↔light con el mini abierto: re-pinta sin flicker.

### Riesgos a vigilar durante implementación

- **Lifecycle Cytoscape vs Sheet.** El modal puede desmontarse en mitad del `await import('cytoscape')` si Adalid cierra rápido. Mitigación obligatoria: flag `cancelled` antes de `cytoscape({...})`, igual que `GrafoMapa.svelte:649-668`.
- **`.dark` wrapper en modal con tema claro.** El componente fuerza esquema oscuro en el canvas (el `readTokens` también añade `.dark` al probe). En light theme, esto puede verse como un "agujero oscuro" dentro de un modal claro. Verificar visualmente en preview con tema claro. Si choca: fallback de 1 línea — quitar el `dark` del wrapper y ajustar `readTokens` para no inyectar `.dark` en el probe.
- **`fit: true` obligatorio en todos los layouts** (montaje y re-layouts tras cambio de contras). Sin esto, el grafo queda descentrado al añadir/quitar.
- **Flicker al cambiar tema.** El `requestAnimationFrame` en el `$effect` de `theme.isDark` es necesario (las CSS vars tardan 1-2 frames en transicionar). Sin él, el re-paint se aplica con los colores viejos.
- **N=1 con θ=-π/2.** El satélite arriba puede chocar con el label del hub. Mitigación en `computeRadialPositions`: si N=1, mover a θ=0 (derecha) o incrementar R en 20 px.
- **No tocar** `vite.config.ts`, `svelte.config.js`, `+layout.svelte`, `+layout.ts`, `.github/workflows/deploy.yml`. Fase 1 no debería necesitarlo; si surge la tentación, parar y preguntar (regla dura del repo).

## 6. Referencias

### Ficheros clave del proyecto

- [`src/lib/components/GrafoMapa.svelte`](../src/lib/components/GrafoMapa.svelte) — referencia de patrones (readTokens, lifecycle, theme effect, tap handlers).
- [`src/lib/components/TecnicaModalContent.svelte`](../src/lib/components/TecnicaModalContent.svelte) — sustitución del bloque "Contras conocidas" (líneas 491-529).
- [`src/lib/contras.ts`](../src/lib/contras.ts) — API `getContras(tecnicaId)`, ya consumida por el modal; no se toca.
- [`src/lib/components/mapa-modal-stack.svelte.ts`](../src/lib/components/mapa-modal-stack.svelte.ts) — `pushOrPopTo` que el padre sigue usando vía helper `pushTecnica`.
- [`src/routes/layout.css`](../src/routes/layout.css) — tokens (`--foreground`, `--muted`, `--muted-foreground`, `--primary`, etc.).

### Decisiones previas que aplican

- [ADR-004 — fcose layout algorithm](../docs/adr/004-fcose-layout-algorithm.md) — no aplica al mini-grafo (preset radial, no fcose).
- [ADR-006 — grafo siempre visible (sheet drawer)](../docs/adr/006-grafo-siempre-visible-sheet-drawer.md) — dimensiones del drawer móvil/desktop.
- [ADR-008 — persistencia layout grafo](../docs/adr/008-persistencia-layout-grafo.md) — no aplica (mini-grafo no persiste posiciones).

### Deliberación previa

- [Informe del Plan agent](agent-reports/20260521-contras-fase1-plan/plan.md) — alternativas descartadas y tradeoffs largos. Este plan es la versión ejecutable; el informe queda como histórico.

### Acciones de housekeeping al cerrar Fase 1

- Actualizar la entrada `Visualización de contras en el grafo — 2 fases` en [`MEJORAS_FUTURAS.md`](MEJORAS_FUTURAS.md) (línea 379): el texto "color del tipo de cada contra (cyan/verde/naranja/gris punteado/rojo)" debe sustituirse por "paleta monocromática consistente con el grafo principal" para no contradecir la decisión D-1.
- Crear `docs/adr/009-mini-grafo-contras.md` (ADR corto ~30-40 líneas) registrando D-1 (monocromático vence al backlog) y D-5 (preset radial sobre fcose).
- Actualizar `ROADMAP.md`: mover Fase 1 a "Entregado" / `CHANGELOG.md` con la versión correspondiente.
