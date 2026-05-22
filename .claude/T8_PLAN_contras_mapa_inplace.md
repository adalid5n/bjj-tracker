# Plan técnico — Fase 2: Mutación in-place del grafo de `/mapa` para visualizar contras

**Estado:** plan de ejecución, decisiones cerradas. Listo para arrancar.
**Rama:** `feature/contras-mapa-inplace` (ya creada desde `main`).
**Origen:** entrada de backlog `Visualización de contras en el grafo — 2 fases` en [`MEJORAS_FUTURAS.md`](MEJORAS_FUTURAS.md). Fase 1 implementada y rechazada como approach en la rama parqueada `feature/contras-visuales`; el plan formal de F1 está en [`T7_PLAN_contras_fase1.md`](T7_PLAN_contras_fase1.md) como histórico.
**Deliberación previa:** [informe del Plan agent](agent-reports/20260522-contras-mapa-inplace-plan/plan.md) — alternativas descartadas y tradeoffs largos. Este documento sólo recoge las decisiones tomadas. [Reader Test](agent-reports/20260522-contras-mapa-inplace-plan/reader-test.md) aplicado en sesión 44; correcciones incorporadas.

---

## 1. Resumen ejecutivo

Mutar **la misma instancia Cytoscape** del grafo principal (`GrafoMapa.svelte`) para entrar en un **"modo contras de X"** cuando el usuario pulsa un botón explícito dentro del modal de técnica. La transición es animada: el resto del grafo se difumina (`display:none`), la técnica X queda como arista destacada, y sus contras aparecen como nodos satélite temporales en disposición radial con aristas dirigidas X → contra. El modal sigue abierto durante el modo. Tap en una contra Y promueve Y como nuevo hub y empuja Y al `mapaModalStack` — el breadcrumb del modal pasa a ser también el breadcrumb del recorrido X→Y→Z. Salir restaura layout fcose, viewport y visibilidad.

**Sin nuevas dependencias** (Cytoscape y fcose ya están), **sin tocar archivos prohibidos** (`vite.config.ts`, `+layout.svelte`, etc.), **sin migración de BD**, **sin componente nuevo de gran tamaño**: el grueso son ~80-120 líneas TS dentro de `GrafoMapa.svelte` + un `$effect` async y estado local en `mapa/+page.svelte` + un botón nuevo en `TecnicaModalContent.svelte`. F2.1 (URL deep-link opcional) queda como sección diferida al final, fuera del alcance principal.

El estado del modo vive sólo en memoria de browser: F5 vacía a la vez el `mapaModalStack` (que vive en `$state` runtime) y el `contrasMode`, devolviendo al usuario al mapa entero. Esto es coherente con D-5.

**Esfuerzo: M-L** (1-2 sesiones de trabajo enfocado, 6 pasos). El riesgo principal está en orquestar bien la animación + el `$effect` async que sincroniza el stack con el grafo durante el anidamiento (D-4).

---

## 2. Decisiones cerradas

### UX (cerradas con el owner)

- **D-1. Modal sigue abierto sobre el grafo durante modo contras.** Sheet-side desktop / sheet-bottom móvil como hoy. El grafo muta detrás. *Por qué:* reusa `mapaModalStack`, `MapaModalHost`, breadcrumb y dirty-guard sin tocar arquitectura. Aborda la queja del owner ("el grafo no participaba en F1") sin romper el patrón de modal vigente.
- **D-2. Entrada al modo contras vía botón explícito** dentro del modal de técnica ("Ver contras en el mapa"). Tap en arista sigue abriendo el modal como hoy. *Por qué:* cero cambio en el handler `tap` actual sobre aristas (`GrafoMapa.svelte:776-790`); accesible por teclado vía Tab; descarta el long-press por bug conocido (`GrafoMapa.svelte:94-100`).
- **D-3. Salida del modo contras** por tres vías: (a) ESC, (b) botón explícito "Volver al mapa", (c) tap sobre el canvas vacío (sin elemento). Las tres están implementadas en pasos concretos del §4: ESC en §3.7 paso 7 (interceptación del `onEscapeKeydown` del Host), botón en §3.7 paso 6, tap-canvas en §3.8 (handler nuevo en `GrafoMapa.svelte`).
- **D-4. Tap en una contra Y dentro del modo contras** promueve Y como nuevo hub con animación + push de Y al `mapaModalStack`. El breadcrumb del modal pasa a mostrar X→Y, navegable. *Por qué:* el `mapaModalStack` YA es el sistema de "historia entre entidades del mapa"; forzar al modo contras a tener su propio sistema sería duplicar.
- **D-5. Persistencia y URL — F2.0 no.** El estado del modo contras vive como `$state` local en `mapa/+page.svelte`. F5 resetea al mapa entero (también vacía el stack del modal). F2.1 (deep-link con `?contras=<tecnicaId>`) queda diferido (§5).
- **D-6. Entrada con `dirty=true` (cambios sin guardar en la organización del grafo)** abre AlertDialog "Tienes cambios sin guardar en la organización. Si entras en modo contras se descartarán al volver." Descartar entra, cancelar mantiene. *Por qué:* coherente con `beforeNavigate` actual.
- **D-extra. "Volver al mapa" hace `mapaModalStack.closeAll()`.** Cierra el modal entero y sale del modo. Si el usuario quiere volver a explorar X, vuelve a tapar la arista. *Por qué:* el copy "Volver al mapa" promete vuelta al estado inicial; `popTo(0)` dejaría el modal de X abierto, sorprendente si el usuario venía navegando X→Y→Z.

### Visual y topológicas (heredadas del T7 que sobreviven a F2)

- **D-7. Paleta monocromática estricta**, idéntica al resto del grafo. Hub (arista X) destacado por borde grueso (clase `.selected` ya existente, sin cambios). Satélites temporales con relleno `--muted` + borde `--muted-foreground`. Aristas hub→satélite en `--muted-foreground`. *Por qué:* coherencia global del grafo (decisión vigente en commit `f3f9c72`).
- **D-8. Aristas hub → contra dirigidas con flecha** (`target-arrow-shape: triangle`). *Por qué:* `tecnica_contras` es asimétrica (`src/lib/contras.ts:1-13`).
- **D-9. Aristas de tipo `transicion` dashed.** *Por qué:* paridad con el grafo principal (`GrafoMapa.svelte:260-263`).
- **D-10. Label de cada satélite multi-línea**: `{nombre técnica}\ndesde {posición origen}`, `text-wrap: wrap`. *Por qué:* paridad informativa con la lista plana actual del modal.

### Técnicas (cerradas por el Plan agent + Reader Test)

- **D-11. NO destruir la instancia Cytoscape.** Mutar `cy` en caliente: añadir/quitar elements temporales con `cy.add`/`cy.remove`, ocultar el resto con `style('display','none')` igual que ya hace `applyFilters` (`GrafoMapa.svelte:313-347`). *Por qué:* preserva zoom, pan, posiciones cacheadas de fcose y estado interno. Recrear sería una regresión gratuita.
- **D-12. Animación nativa con `cy.layout({ animate: true, animationDuration: 350, animationEasing: 'ease-in-out' })`.** Sin `cy.animate` por nodo. *Por qué:* es la API que pide el feedback del owner ("transición animada desde el grafo inicial"). Cytoscape interpola posiciones entre el modelo actual y el `preset` durante 350 ms.
- **D-13. Snapshot del viewport** (`pan`, `zoom`) y de la visibilidad (`displayPorId`) **viven dentro de `GrafoMapa.svelte`**, capturados en `enterContrasMode` y consumidos en `exitContrasMode`. El padre solo activa/desactiva el modo y orquesta el flujo; no almacena el snapshot. *Por qué:* el snapshot es estado interno del grafo, no del flujo de navegación.
- **D-14. `cy.stop()` antes de cada `layout().run()`** en entrada, salida y transición entre hubs. *Por qué:* corta animación en curso para que tap-tap-tap rápido no acumule cola. Mismo patrón que `panToEntity` (`GrafoMapa.svelte:623`).
- **D-15. IDs con prefijo nuevo para elementos temporales**: `contra-node:<tecnicaId>` para satélites, `contra-edge:<hubId>-><satId>` para aristas. Marcador `data:{temp:true}` para limpieza segura con `cy.remove('node[temp], edge[temp]')` (selector por truthiness, consistente en toda la implementación). *Por qué:* defensivo. Evita colisiones con ids ya en uso por aristas reales del catálogo.
- **D-16. Cap visual N=20 contras dibujadas en el grafo**, con badge "+N más…" y lista de overflow dentro del modal (no en el canvas). *Por qué:* defensivo, gratis. Evita solapado feo de labels en un caso patológico futuro.
- **D-17. Silenciar handlers de edición durante modo contras**: `dragfree` (`GrafoMapa.svelte:720-726`) no marca dirty mientras el modo está activo; los botones "Mover nodos", "Reorganizar", "Guardar organización" se ocultan; `selectedGraphId` sync se respeta sobre la arista X. Los satélites temporales no entran al sync de selección. *Por qué:* el modo contras es exploración, no edición de layout.
- **D-18. Las contras se resuelven en el padre antes de invocar el método del grafo.** El `$effect` de sincronización es **async con flag de cancelación** (patrón Svelte 5). Hace `await getContras(...)` y luego llama a `transitionContrasMode(hub, contrasResueltas, posicionesById)`. *Por qué:* `getContras` es async (`src/lib/contras.ts`); meter `await` dentro del método imperativo del grafo acopla el lifecycle del grafo a una promesa, peor patrón. El padre orquesta la asincronía; el grafo recibe datos crudos.

---

## 3. Modelo técnico

### 3.1 Estado en `mapa/+page.svelte`

```ts
let contrasMode = $state<string | null>(null);   // tecnicaId del hub actual, o null
```

El `viewportSnapshot` y `displaySnapshot` **NO viven aquí** — los gestiona `GrafoMapa.svelte` internamente (D-13). El padre solo activa el modo y orquesta el `$effect` de sincronización.

Las contras del hub se resuelven con `getContras(tecnicaId)` (`src/lib/contras.ts`, **async — devuelve `Promise<Tecnica[]>`**). El padre las `await`-ea y pasa pre-resueltas a los métodos imperativos del grafo. Las posiciones se calculan radialmente en `GrafoMapa.svelte`: hub en `(0, 0)`, satélite `i` en `(R·cos θᵢ, R·sin θᵢ)` con `θᵢ = -π/2 + 2π·i/N`. Función `computeRadialPositions(ids: string[], hubId: string): Map<string, {x:number;y:number}>` se copia desde la rama parqueada `feature/contras-visuales:src/lib/components/MiniGrafoContras.svelte:222-244`. **Importante**: la función NO recibe `R` — lo calcula internamente como `clamp(80, 50+N·12, 140)`. Y el hub entra al `Map` que devuelve (en `(0,0)`), junto con los satélites. Mitigación N=1: si solo hay 1 contra, θ=0 (derecha) para no chocar con label del hub.

El catálogo `tecnicas` y el índice `posicionesById` que aparecen en el `$effect` (§3.5) ya viven hoy en `mapa/+page.svelte` como `$state` derivados del catálogo cargado vía `loadAll()` — no son nuevos.

### 3.2 API nueva en `GrafoMapa.svelte`

Tres métodos imperativos expuestos vía bindable o ref (mismo patrón que `panToEntity`). Las contras llegan **ya resueltas** (Promise resuelta por el padre, D-18):

```ts
// Entra al modo: captura snapshot interno (viewport + display), oculta
// lo no relevante, inyecta nodos temporales con kind="contra" + aristas
// dirigidas hub→contra, aplica layout preset radial animado y hace fit.
// Cablea los dos handlers tap nuevos (sobre satélites y sobre canvas
// vacío) durante el modo; los desconecta en exitContrasMode.
export function enterContrasMode(
  hub: Tecnica,
  contras: Tecnica[],
  posicionesById: Record<string, string>
): void;

// Transición entre hubs sin salir del modo: cy.stop(), quita
// satélites temporales actuales, inyecta los de Y, layout preset
// radial animado. NO toca snapshot (sigue dentro del modo).
export function transitionContrasMode(
  newHub: Tecnica,
  newContras: Tecnica[],
  posicionesById: Record<string, string>
): void;

// Sale del modo: cy.stop(), quita temporales, restaura display desde
// snapshot interno, layout preset animado a posiciones cacheadas de
// fcose, restaura viewport snapshot manualmente. Desconecta handlers
// tap del modo.
export function exitContrasMode(): void;
```

El snapshot del viewport (`pan`, `zoom`) y del `display` (Map<id, 'element'|'none'>) viven como **variables del componente** `GrafoMapa.svelte` (no `$state`, no expuestas al padre), seteadas en `enter` y consumidas en `exit`.

### 3.3 Animación

Todas las transiciones usan la misma forma:

```ts
cy.stop();
cy.layout({
  name: 'preset',
  positions: (node) => positionsMap.get(node.id()) ?? { x: 0, y: 0 },
  animate: true,
  animationDuration: 350,
  animationEasing: 'ease-in-out',
  fit: true,        // sí en entrada/transición; NO en salida
  padding: 40
}).run();
```

En la salida, `fit:false` y se restaura el viewport manualmente tras `layoutstop`:

```ts
cy.one('layoutstop', () => {
  cy.animate(
    { pan: viewportSnapshotInterno.pan, zoom: viewportSnapshotInterno.zoom },
    { duration: 300, easing: 'ease-in-out' }
  );
});
```

`cy.stop()` interrumpe la animación en curso dejando los nodos en sus posiciones intermedias; la siguiente animación interpola desde ahí, sin snap visual.

### 3.4 Stylesheet adicional en `buildStylesheet`

Tres selectores nuevos al final de `GrafoMapa.svelte:219-286` (al final para ganar en la cascada de Cytoscape). Usan selector `[temp]` (truthiness, consistente con D-15):

```ts
{
  selector: 'node[temp][kind = "contra"]',
  style: {
    'background-color': tokens.muted,
    'background-opacity': 1,
    'border-color': tokens.mutedForeground,
    'border-width': 2,
    width: 36, height: 36,
    label: 'data(label)',
    'text-valign': 'bottom',
    'text-halign': 'center',
    'text-wrap': 'wrap',
    'text-max-width': '90px',
    color: tokens.foreground,
    'text-background-color': tokens.muted,
    'text-background-opacity': 1,
    'text-background-padding': 3,
    'text-background-shape': 'round-rectangle'
  }
},
{
  selector: 'edge[temp]',
  style: {
    'curve-style': 'bezier',
    'target-arrow-shape': 'triangle',
    width: 2,
    'line-color': tokens.mutedForeground,
    'target-arrow-color': tokens.mutedForeground,
    'arrow-scale': 1.1
  }
},
{
  selector: 'edge[temp][tipo = "transicion"]',
  style: { 'line-style': 'dashed' }
}
```

Estos selectores quedan siempre en el stylesheet; sólo se activan cuando hay elementos `temp:true`. Esto garantiza que el `$effect` de tema (`GrafoMapa.svelte:400-407`) los re-aplica al toggle dark↔light sin perderlos.

### 3.5 Sincronización stack ↔ grafo (async)

`$effect` en `mapa/+page.svelte` que reacciona al `top` del `mapaModalStack`. Patrón **async con flag de cancelación** porque `getContras` es asíncrono:

```ts
$effect(() => {
  const top = mapaModalStack.top;
  if (contrasMode === null) return; // fuera del modo: no interceptar

  let cancelled = false;

  (async () => {
    if (top?.kind === 'tecnica' && top.id !== contrasMode) {
      // Anidamiento o pop del breadcrumb a otra técnica.
      const newHub = tecnicas.find(t => t.id === top.id);
      if (!newHub) return;
      const newContras = await getContras(newHub.id);
      if (cancelled) return; // user cambió de top mientras esperábamos
      grafoComponent?.transitionContrasMode(newHub, newContras, posicionesById);
      contrasMode = newHub.id;
    } else if (!top || top.kind !== 'tecnica') {
      // Stack ya no apunta a técnica: salir del modo.
      grafoComponent?.exitContrasMode();
      contrasMode = null;
    }
  })();

  return () => { cancelled = true; };
});
```

**Por qué no entra en bucle infinito:** el `$effect` reacciona a cambios del `top` del stack y de `contrasMode`. Al hacer `contrasMode = newHub.id` dentro del effect, Svelte 5 detectaría re-run si `contrasMode` se lee como dependencia ANTES del write (sí lo es: el guard `if (contrasMode === null) return`). Para evitar el re-run innecesario, la rama `if` siempre escribe `contrasMode` al MISMO valor que el `top` actual — en la siguiente reactivación el guard del `if` ve `top.id === contrasMode` y no entra en ninguna rama. Quiescent en una iteración.

El `$effect` existente que dispara `panToEntity` (`mapa/+page.svelte:210-220`) recibe un **guard al principio**: `if (contrasMode !== null) return`. Mientras el modo está activo, las navegaciones del stack se canalizan vía `transitionContrasMode`, no vía `panToEntity`.

### 3.6 Cambios en `TecnicaModalContent.svelte`

Nuevo botón "Ver contras en el mapa" debajo del título de la técnica, solo visible si `contras.length > 0` Y `onShowInGraph` está pasado. Callback opcional `onShowInGraph?: (tecnicaId: string) => void` pasado desde `mapa/+page.svelte` a través de `MapaModalHost`. Si el callback no se pasa (modal abierto desde `/rolls`, `/sesion/[id]`, etc., donde no hay grafo principal disponible), el botón no se renderiza.

El bloque de chips para quitar contras introducido en la rama F1 (chips compactos `[nombre técnica] ✕` debajo de la lista) **no se replica aquí**: F2.0 mantiene el flujo actual de edición de contras (Combobox "+ Añadir contra" + AlertDialog "Quitar"). Si tras usar F2.0 el owner ve que la edición se siente desconectada del modo contras, se evalúa como mejora F2.2.

### 3.7 Cambios en `mapa/+page.svelte`

1. **Estado nuevo:** `let contrasMode = $state<string | null>(null)`. Snapshots viven en `GrafoMapa.svelte` internamente (D-13).
2. **Handler `handleShowInGraph(tecnicaId)`:** async. Resuelve `await getContras(tecnicaId)` → chequea `dirty` → AlertDialog si procede (D-6) → busca `hub` en `tecnicas` → llama `grafoComponent.enterContrasMode(hub, contras, posicionesById)` → setea `contrasMode = tecnicaId`.
3. **`$effect` async de sincronización stack ↔ grafo** (§3.5).
4. **Guard al `$effect` de `panToEntity`** (`mapa/+page.svelte:210-220`): `if (contrasMode !== null) return` al principio.
5. **Wrapper `{#if contrasMode === null}`** alrededor de los botones "Mover nodos", "Reorganizar", "Guardar organización" en el sub-header (líneas ~683-722).
6. **Botón "Volver al mapa"** (visible solo si `contrasMode !== null`) que llama a `mapaModalStack.closeAll()`. El `$effect` de §3.5 detecta `!top` en la siguiente reactivación y dispara `exitContrasMode()` + `contrasMode = null` automáticamente. **No** llamamos a `exitContrasMode()` directamente desde aquí — dejamos que la lógica de sincronización converja sola.
7. **Interceptación del ESC capa por capa.** Hoy `MapaModalHost.svelte:556` tiene `onEscapeKeydown={handleAttemptClose}`. Para implementar D-3, se añade un callback nuevo `onContrasModeEscape?: () => void` que el Host invoca **antes** de `handleAttemptClose` si está pasado. El padre lo conecta: cuando `contrasMode !== null`, `onContrasModeEscape = () => mapaModalStack.closeAll()` (un ESC saca todo el stack, y el `$effect` sale del modo). Cuando `contrasMode === null`, el callback queda `undefined` y `handleAttemptClose` se ejecuta como hoy.

   *Nota de simplificación:* la decisión D-3 original mencionaba "primer ESC sale del modo, segundo ESC cierra el modal" como dos pulsaciones. Tras el Reader Test, simplificamos: un solo ESC cierra todo (modo + modal). Es coherente con cómo se llega al modo (un solo botón "Ver contras en el mapa"), simétrico en reversa. Si en uso real se siente brusco, se reabre como mejora.

8. **Paso del callback `onShowInGraph={handleShowInGraph}`** al `MapaModalHost` (que lo reenvía al `TecnicaModalContent`).

### 3.8 Handlers de tap nuevos en `GrafoMapa.svelte`

Se cablean al entrar al modo (`enterContrasMode`) y se desconectan al salir (`exitContrasMode`). Mantenemos referencias para `cy.off()` limpio:

```ts
// Handler 1: tap sobre satélite temporal → promover Y a nuevo hub.
// El push al stack dispara el $effect de §3.5, que llama a
// transitionContrasMode con las contras de Y ya resueltas.
const tapSatelliteHandler = (event: cytoscape.EventObject) => {
  const node = event.target;
  const tecnicaId = node.data('tecnicaId') as string;
  const tecnica = tecnicas.find(t => t.id === tecnicaId);
  if (tecnica) {
    onAttemptPush?.({ kind: 'tecnica', id: tecnica.id, nombre: tecnica.nombre });
  }
};
instance.on('tap', 'node[temp]', tapSatelliteHandler);

// Handler 2: tap sobre canvas vacío (sin elemento) → salir del modo.
// Mismo patrón que onAttemptPush: notifica al padre, el padre llama a
// mapaModalStack.closeAll(), el $effect sale del modo limpiamente.
const tapEmptyCanvasHandler = (event: cytoscape.EventObject) => {
  if (event.target === instance) {
    onAttemptExitContrasMode?.();
  }
};
instance.on('tap', tapEmptyCanvasHandler);
```

`onAttemptExitContrasMode` es una prop nueva del componente (callback opcional). El padre la conecta a `() => mapaModalStack.closeAll()`.

En `exitContrasMode`, antes de tocar el grafo: `instance.off('tap', 'node[temp]', tapSatelliteHandler); instance.off('tap', tapEmptyCanvasHandler);`. Las referencias se mantienen en variables del módulo del componente.

---

## 4. Pasos de implementación

6 pasos. 3 y 5 son independientes y pueden paralelizarse; el resto secuencial.

### Paso 1 — Helpers radiales + stylesheet temporal · S

- Copiar `computeRadialPositions(ids: string[], hubId: string): Map<string, {x:number;y:number}>` desde la rama parqueada al final del `<script>` de `GrafoMapa.svelte`. Comando: `git show feature/contras-visuales:src/lib/components/MiniGrafoContras.svelte | head -n 250 | tail -n 30` (o leer y copiar la función entera, líneas ~222-244).
- Añadir los tres selectores nuevos (`node[temp][kind="contra"]`, `edge[temp]`, `edge[temp][tipo="transicion"]`) al final del array que devuelve `buildStylesheet`.
- **Verificación:** `pnpm check` 0/0/0. No hay cambio visible aún (no se invocan los helpers).

### Paso 2 — Métodos `enterContrasMode` / `exitContrasMode` · M · tras Paso 1

- Implementar ambos métodos con la API de §3.2.
- Declarar variables del componente para snapshot interno: `let viewportSnapshotInterno: {pan, zoom} | null = null;` y `let displaySnapshotInterno: Map<string, 'element'|'none'> | null = null;`.
- Declarar variables del componente para handlers tap del modo (que se cablean/descablean en enter/exit): `let tapSatelliteHandler...`, `let tapEmptyCanvasHandler...`.
- Lógica `enter`:
  1. Captura `viewportSnapshotInterno = { pan: cy.pan(), zoom: cy.zoom() }`.
  2. Captura `displaySnapshotInterno` recorriendo `cy.elements()` y guardando `el.style('display')` por id.
  3. `cy.batch()` setea `display:'none'` excepto la arista del hub + sus dos nodos extremos (origen y destino de la técnica X).
  4. `cy.add` de los satélites temporales (id `contra-node:<tecnicaId>`, `data:{temp:true, kind:'contra', tecnicaId, label}`) y aristas (id `contra-edge:<hubId>-><satId>`, `data:{temp:true, tipo: contra.tipo, source: 'contra-node:<hub>', target: 'contra-node:<sat>'}` — nota: el "hub" en términos de satélites es un nodo lógico; la arista temporal sale del hub-como-nodo. Decisión de implementación: añadir también un `contra-node:<hubId>` temporal en el centro que actúa como source de las aristas dirigidas, marcado `data:{temp:true, kind:'hub-tecnica'}`).
  5. Calcula posiciones con `computeRadialPositions([sat-ids], hub-id)`.
  6. `cy.stop(); cy.layout({preset, positions, animate:true, animationDuration:350, fit:true, padding:40}).run()`.
  7. Cablea los dos handlers tap (§3.8).
- Lógica `exit`:
  1. `cy.stop()`.
  2. Descablea handlers tap del modo.
  3. `cy.remove('node[temp], edge[temp]')`.
  4. Restaura `display` recorriendo `displaySnapshotInterno`.
  5. `cy.layout({preset, positions: (n) => positionsCache.get(n.id()), animate:true, animationDuration:350, fit:false, padding:40}).run()`.
  6. `cy.one('layoutstop', () => cy.animate({pan: viewportSnapshotInterno.pan, zoom: viewportSnapshotInterno.zoom}, {duration: 300, easing: 'ease-in-out'}))`.
  7. Limpia snapshots: `viewportSnapshotInterno = null; displaySnapshotInterno = null;`.
- **Verificación:** test manual desde DevTools. Cómo: en preview, abrir consola, ejecutar `window.__grafoTest = $('.cy-container').__svelte_meta` (o el atributo equivalente que SvelteKit exponga; alternativa más simple: añadir temporalmente `<button onclick={() => grafoComponent.enterContrasMode(...)}>` en `+page.svelte` y quitarlo tras verificar). Probar `enter` con técnica que tenga 3-4 contras → `exit`. Comprobar entrada+salida limpia, sin glitch ni elementos huérfanos.

### Paso 3 — Método `transitionContrasMode` · S · paralelo con Paso 2 (tras Paso 1)

- Variante de `enter` que NO captura snapshot (ya capturado) y NO toca handlers tap (ya cableados).
- `cy.stop()` → `cy.remove('node[temp], edge[temp]')` → `cy.add` de los nuevos elements (incluyendo el nuevo hub-as-node) → `cy.layout({preset, positions:radial, animate:true, fit:true}).run()`.
- **Verificación:** test manual con `enter(X)` → `transition(Y)` → `exit()`. Comprobar que entre `transition` y `exit` no hay tirones de viewport ni handlers tap perdidos.

### Paso 4 — Estado y `$effect` async en `mapa/+page.svelte` · M · tras Paso 2

- Añadir `contrasMode` como `$state<string | null>(null)`.
- Implementar `handleShowInGraph(tecnicaId)` (async, §3.7 paso 2).
- Implementar el `$effect` async de sincronización (§3.5) con flag de cancelación.
- Implementar `handleAttemptExitContrasMode = () => mapaModalStack.closeAll()` (§3.8 + §3.7 paso 6).
- Añadir guard `if (contrasMode !== null) return` al `$effect` de `panToEntity`.
- Wrapper `{#if contrasMode === null}` a los botones de edición (D-17).
- Botón "Volver al mapa" visible cuando `contrasMode !== null` → llama `mapaModalStack.closeAll()`.
- Conectar `onAttemptExitContrasMode={handleAttemptExitContrasMode}` al `GrafoMapa`.
- Conectar `onContrasModeEscape={() => mapaModalStack.closeAll()}` al `MapaModalHost` cuando `contrasMode !== null`.
- **Verificación:** `pnpm check` 0/0/0. La integración E2E se valida en Paso 6.

### Paso 5 — Botón "Ver contras en el mapa" en `TecnicaModalContent.svelte` · S · paralelo con Paso 4

- Nueva prop `onShowInGraph?: (tecnicaId: string) => void`.
- Botón visible solo si `onShowInGraph` está pasado Y `contras.length > 0`. Texto: "Ver contras en el mapa" (definir copy exacto al implementar, o iterarlo en preview).
- Estilo: secundario, debajo del título de la técnica.
- Conectado a `handleShowInGraph` desde `mapa/+page.svelte` vía `MapaModalHost` (que recibe la prop nueva y la reenvía).
- **Verificación:** `pnpm check` 0/0/0; el botón aparece en el modal de técnica del `/mapa`, no aparece en el modal del mismo componente abierto desde `/rolls` o `/sesion/[id]`.

### Paso 6 — Verificación E2E y pulido · M · tras Pasos 1-5

- `pnpm check` + `pnpm build` + `pnpm preview` con reload duro (regla dura del repo).
- Casos a probar en preview, ambos temas, ambos breakpoints:
  - Técnica X con N contras: tap arista → modal → "Ver contras en el mapa" → animación de entrada → grafo modo contras.
  - ESC en modo contras → modal + modo se cierran a la vez (D-3 simplificada).
  - Anidamiento: dentro del modo contras de X, tap en contra Y (satélite) → animación de transición, modal X→Y, breadcrumb funciona. Tap en X del breadcrumb → vuelve a contras-de-X con animación.
  - Salir por "Volver al mapa": modo + modal cerrados, viewport y posiciones de fcose restauradas exactas.
  - Salir por tap en canvas vacío.
  - Dirty + entrada: AlertDialog aparece, "Cancelar" mantiene, "Descartar" entra.
  - Sin contras: el botón "Ver contras en el mapa" NO se muestra.
  - Toggle tema dark↔light dentro del modo: re-paint sin flicker.
  - Móvil 50dvh con N=5-7 contras: el layout radial se ve legible.
  - Cap N=20: técnica con >20 contras → 20 en grafo + badge + lista en modal.
  - Tap-tap-tap rápido entre contras: las animaciones encadenan sin glitch.
- Si todo OK, push de la rama y actualización de `ESTADO_ACTUAL.md` (regla del repo: doc se actualiza con el push).

---

## 5. F2.1 — Deep-link con URL (sección diferida)

**No incluido en el alcance principal de T8.** Se evalúa tras validar F2.0 en uso real. Si el owner pide deep-link al modo contras o que F5 mantenga la vista, se aborda como F2.1 con este alcance mínimo:

- Query param `?contras=<tecnicaId>` en `mapa/+page.svelte`.
- `goto('?contras=X')` al entrar / `goto('')` al salir, con `replaceState: false` para que el back-button del navegador funcione gratis.
- Al montar `/mapa` con `?contras=X` en la URL, dispara automáticamente `handleShowInGraph(X)` tras hidratar el catálogo.
- Anidamiento: la URL refleja siempre el hub actual, no la pila completa. La pila vive en `mapaModalStack` igual que en F2.0; el back-button del navegador equivale a "pop del top del stack".

**Riesgos a vigilar de F2.1:** interacción con el `beforeNavigate` actual, comportamiento del back-button cuando hay un AlertDialog abierto, comportamiento con `replaceState` vs `pushState`. Necesita una sesión de prueba propia.

---

## 6. Verificación final y riesgos

### Verificación antes de declarar F2.0 cerrada

- `pnpm check` → 0 errors, 0 warnings.
- `pnpm build` → sin warnings nuevos.
- `pnpm preview` + **reload duro** (regla dura del repo por bugs históricos de SW/bundle stale). No basta con `pnpm dev` o `pnpm check`.
- Todos los casos manuales del Paso 6.
- `.claude/ESTADO_ACTUAL.md` actualizado en el mismo push.

### Riesgos a vigilar durante implementación

- **Race condition `$effect` async + tap rápido.** El usuario hace tap en contra Y → el `$effect` arranca `await getContras(Y)` → ANTES de que resuelva, el usuario hace tap en otra contra Z (push de Z al stack). El `$effect` se re-ejecuta: el cleanup del run anterior pone `cancelled = true`, así el `transitionContrasMode(Y, ...)` del primer run nunca se llama. El segundo run arranca con `await getContras(Z)` y termina correctamente. **Mitigación obligatoria: el flag `cancelled` debe verificarse DESPUÉS del `await`.** Sin esto, hay race.
- **Race condition entre animación y tap del usuario.** `cy.stop()` antes de cada `layout().run()`. Sin esto, tap-tap-tap rápido acumula animaciones.
- **Pérdida de viewport al rotar pantalla o cambiar `presentation`.** El `$effect` de `panToEntity` (`mapa/+page.svelte:210-220`) reacciona a `presentation`. Guard `if (contrasMode !== null) return` al principio.
- **Lifecycle del modal vs modo contras.** Si el top del stack deja de ser técnica (porque el usuario cierra el modal sin pasar por el botón "Volver al mapa"), el `$effect` de sincronización sale del modo limpiamente vía la rama `else if`.
- **`mapaModalStack.closeAll()` mientras hay AlertDialog abierto.** Si el usuario tiene un AlertDialog de descartar abierto y pulsa "Volver al mapa", `closeAll` podría romper el flujo de confirmación. Verificar en Paso 6.
- **Accesibilidad teclado-only.** Botón "Ver contras en el mapa" tab-accesible. ESC cierra modo + modal (D-3 simplificada).
- **Mobile: 50dvh para el grafo es ajustado.** Con N≥7 contras el layout radial puede solapar labels. Cap N=20 ayuda pero verificar N=5-10 en preview real. Si solapa, considerar `padding: 30` en lugar de 40, o reducir tamaño de label.
- **Colisión de IDs.** Los satélites temporales DEBEN usar prefijos `contra-node:` y `contra-edge:` (D-15). Si por accidente reusamos `tecnica.id` sin prefijo, colisiona con la arista real del catálogo.
- **`cy.remove` durante animación.** Si la animación previa no terminó cuando llega `transitionContrasMode`, el `cy.remove('node[temp], edge[temp]')` puede dejar Cytoscape en estado inconsistente (comportamiento no documentado). Mitigación: el `cy.stop()` inmediato antes del `remove` debería garantizar consistencia. Verificar tap-tap-tap rápido en Paso 6.
- **Cambio de tema durante modo contras.** El `$effect` de tema (`GrafoMapa.svelte:400-407`) re-aplica stylesheet. Los selectores `node[temp]` y `edge[temp]` siempre están en el stylesheet — sin riesgo de que desaparezcan al re-aplicar.
- **No tocar** `vite.config.ts`, `svelte.config.js`, `+layout.svelte`, `+layout.ts`, `.github/workflows/deploy.yml`. F2.0 no debería necesitarlo; si surge la tentación, parar y preguntar (regla dura del repo).

---

## 7. Referencias

### Ficheros clave del proyecto

- [`src/lib/components/GrafoMapa.svelte`](../src/lib/components/GrafoMapa.svelte) — núcleo de la mutación in-place. Patrones a reusar: `applyFilters` (`:313-347`), `runLayoutAndCache` y `positionsCache` (`:18`, ~`:610-630`), `panToEntity` (`:546-629`), `readTokens` (`:115-162`), `buildStylesheet` (`:219-286`). Handler tap actual sobre aristas: `:776-790`. Comentario sobre el bug del long-press: `:94-100`.
- [`src/routes/mapa/+page.svelte`](../src/routes/mapa/+page.svelte) — estado del modo, orquestación del `$effect` async, botones de modo edición a ocultar (`:683-722`), `$effect` de `panToEntity` (`:210-220`).
- [`src/lib/components/TecnicaModalContent.svelte`](../src/lib/components/TecnicaModalContent.svelte) — nuevo botón "Ver contras en el mapa".
- [`src/lib/components/mapa-modal-stack.svelte.ts`](../src/lib/components/mapa-modal-stack.svelte.ts) — API real: `closeAll()`, `popTo(i)`, `pop()`, `push(entry)`. **`popAll` no existe.**
- [`src/lib/components/MapaModalHost.svelte`](../src/lib/components/MapaModalHost.svelte) — recibe **dos props nuevas**: `onShowInGraph` (que reenvía al `TecnicaModalContent`) y `onContrasModeEscape` (opcional; interceptado antes de `handleAttemptClose` en la lógica del `:556`).
- [`src/lib/contras.ts`](../src/lib/contras.ts) — `getContras(tecnicaId): Promise<Tecnica[]>` (**async**). Sin cambios al fichero; sólo se invoca desde el padre con `await`.
- [`src/routes/layout.css`](../src/routes/layout.css) — tokens semánticos (`--foreground`, `--muted`, `--muted-foreground`, etc.).

### Helpers reutilizables desde la rama parqueada `feature/contras-visuales`

Copia local (no import — la rama no se mergea). Acceso vía `git show feature/contras-visuales:src/lib/components/MiniGrafoContras.svelte` para leer el archivo sin checkout.

- `computeRadialPositions(ids: string[], hubId: string): Map<string, {x:number;y:number}>` (`:222-244`) — trigonometría pura con mitigación N=1. `R` se calcula INTERNAMENTE como `clamp(80, 50+N·12, 140)`; no es parámetro.
- `buildElements(hub, sats, posIndex)` (`:264-303`) — adaptar con prefijo `contra-node:` y flag `temp:true` en `data`.
- Label multi-línea (`:283`) — `c.variante ? \`${c.nombre} (${c.variante})\` : c.nombre` + `\ndesde ${origen}` — verbatim.

### Decisiones previas que aplican

- [ADR-004 — fcose layout algorithm](../docs/adr/004-fcose-layout-algorithm.md) — el layout fcose se preserva intacto; el modo contras es transitorio.
- [ADR-006 — grafo siempre visible (sheet drawer)](../docs/adr/006-grafo-siempre-visible-sheet-drawer.md) — dimensiones del drawer móvil/desktop que el modo contras debe respetar.
- [ADR-007 — sincronización modal-grafo](../docs/adr/007-sincronizacion-modal-grafo.md) — patrón que extiende el `$effect` del modo contras.
- [ADR-008 — persistencia layout grafo](../docs/adr/008-persistencia-layout-grafo.md) — `positionsCache` (module-level Map en `GrafoMapa.svelte:18`) es la fuente de verdad para restaurar fcose al salir.

### Deliberación previa

- [Informe del Plan agent](agent-reports/20260522-contras-mapa-inplace-plan/plan.md) — análisis técnico extendido con alternativas descartadas y tradeoffs largos.
- [Reader Test del T8](agent-reports/20260522-contras-mapa-inplace-plan/reader-test.md) — auditoría de un agente fresco sobre la primera versión de este plan; sus correcciones están incorporadas en esta versión.
- [`T7_PLAN_contras_fase1.md`](T7_PLAN_contras_fase1.md) — plan de F1 (mini-grafo en modal). Histórico, no activo.
- Rama parqueada [`feature/contras-visuales`](.) — spike de F1 navegable. Commit `f936282`.

### Acciones de housekeeping al cerrar F2.0

- Crear `docs/adr/009-modo-contras-in-place.md` (ADR corto ~30-40 líneas) registrando las decisiones con peso: D-11 (mutación in-place sin destruir instancia), D-12 (animación nativa via layout preset), D-4 (anidamiento integrado al `mapaModalStack`), D-18 (contras async resueltas en padre).
- Actualizar la entrada `Visualización de contras en el grafo — 2 fases` en [`MEJORAS_FUTURAS.md`](MEJORAS_FUTURAS.md): marcar F2.0 como hecha, F2.1 como "diferida — evaluar tras uso real".
- Actualizar `ROADMAP.md` (mover a "Entregado") y `CHANGELOG.md` con la versión correspondiente.
- Actualizar `ESTADO_ACTUAL.md` con el cierre de F2.0.
