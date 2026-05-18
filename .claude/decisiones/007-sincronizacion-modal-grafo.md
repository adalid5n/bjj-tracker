# ADR-007 — Sincronización modal↔grafo: pan animado al nodo focal

**Fecha:** 2026-05-18
**Estado:** Aceptada
**Sesión:** 23
**Commit:** `18e295b` (T-10.it3)

## Contexto

Con el grafo visible detrás del drawer (ADR-006), un nuevo problema
emerge: el nodo de la entidad que el modal está describiendo puede
quedar fuera de la zona útil del canvas o directamente tapado por el
drawer. Si abro el modal de "Mount top" desde el sub-header pero el
nodo "Mount top" está en la mitad derecha del grafo (oculta por el
drawer lateral derecho), pierdo la conexión visual entidad↔nodo que es
toda la justificación de mantener el grafo a la vista (ADR-006).

La visión del owner (sesión 21) ya anticipaba este caso: "el grafo
hace pan/zoom animado al nodo focal" cuando se abre un modal, y
transiciona cuando el modal salta a otra entidad por breadcrumb.

Decisiones de producto cerradas al arrancar T-10 (con el owner, todas
las recomendaciones aceptadas):

- **Solo pan, zoom intacto.** El usuario controla el zoom; tocarlo al
  abrir un modal es intrusivo y le quita contexto del resto del grafo.
- **Re-pan en cada cambio del top del stack** (push, pop, salto a
  otra entidad). El grafo "sigue la conversación".
- **Técnica = arista**, no nodo. Pan al midpoint entre source y
  target (ambos extremos en pantalla da contexto, mejor que centrar
  en uno).
- **Cerrar el modal entero (stack vacío) → no hacer nada.** El grafo
  se queda donde estaba, sin animación de vuelta.
- **Wizards (`wizard-*`) NO disparan pan.** No son navegación entre
  entidades; entrar a "Editar técnica" no cambia el nodo focal.

## Decisión

Método imperativo `panToEntity(target, presentation)` en
`GrafoMapa.svelte`, expuesto al padre vía `bind:this` (mismo patrón
que `saveLayout()` / `reorganize()` de ADR-008):

```ts
export function panToEntity(
  target: { kind: 'posicion' | 'sumision' | 'tecnica'; id: string },
  presentation: 'dialog' | 'sheet-side' | 'sheet-bottom'
): void
```

**Resolución de coordenadas modelo del punto focal:**

- `kind: 'posicion'` → `cy.getElementById('pos:' + id).position()`.
- `kind: 'sumision'` → `cy.getElementById('sum:' + id).position()`.
- `kind: 'tecnica'` → arista (`getElementById(id)` sin prefijo, ver
  `buildGrafoElements`); midpoint entre `source().position()` y
  `target().position()`.

Comprobaciones defensivas en cada rama: `empty()` o tipo incorrecto
→ early return silencioso (entidad huérfana, race con borrado, etc.).

**Cálculo del pan target descontando insets del drawer:**

```ts
const W = cy.width();
const H = cy.height();
let insetRight = 0, insetBottom = 0;
if (presentation === 'sheet-side')   insetRight  = W * 0.5;
else if (presentation === 'sheet-bottom') insetBottom = H * 0.5;
const targetPxX = (W - insetRight) / 2;
const targetPxY = (H - insetBottom) / 2;

const zoom = cy.zoom();
const panX = targetPxX - modelX * zoom;
const panY = targetPxY - modelY * zoom;
```

Es la transformación afín estándar de Cytoscape: `pixel = modelo *
zoom + pan`. Despejamos `pan` para que el `modelo` aparezca en el
`targetPx` deseado dentro de la zona útil del contenedor.

**Animación:**

```ts
cy.stop();
cy.animate({ pan: { x: panX, y: panY } }, { duration: 300, easing: 'ease-in-out' });
```

`cy.stop()` cancela animaciones previas (incluido el settle inicial
de fcose si todavía estuviese activo). Zoom no se toca.

**Reactividad en `/mapa/+page.svelte`:**

```ts
$effect(() => {
  const top = mapaModalStack.top;
  if (!top || !grafoComponent) return;
  if (top.kind !== 'posicion' && top.kind !== 'sumision' && top.kind !== 'tecnica') return;
  grafoComponent.panToEntity({ kind: top.kind, id: top.id }, presentation);
});
```

Svelte 5 traquea automáticamente la dependencia transitiva
(`mapaModalStack` internamente usa `$state` sobre el array del stack,
el getter `top` lee `arr[length-1]`). Cualquier `push`, `pop`,
`popTo`, `pushOrPopTo`, `closeAll` re-corre el effect. Las guardas
filtran wizards y stack vacío.

**Por qué pasar `presentation` en lugar de insets en pixels:**

1. El contenedor vive dentro del componente; `cy.width()`/`cy.height()`
   son la fuente de verdad. Pedírselos al padre y reenviarlos sería
   duplicar el cálculo.
2. El enum ya está tipado y es la prop que `MapaModalHost` consume.
   Reusar el tipo evita inventar uno paralelo `{ right?, bottom? }`.
3. Si el ratio del drawer cambia (40% en vez de 50%), el ajuste vive
   en un único sitio dentro del grafo, no esparcido por el padre.

Trade-off: el grafo "conoce" la `presentation`, un detalle del padre.
Acepto la fuga: la prop ya viaja al padre desde `useMediaQuery` y el
grafo solo la usa para calcular insets.

## Consecuencias

- **Sincronización limpia con el breadcrumb del modal stack.** Push
  de "Posición A" → pan a A. Click en arista "Técnica T" desde A →
  push de T → pan al midpoint A↔dest. Pop (botón ←) → vuelve al top
  previo, re-pan. Coherente con la metáfora "el grafo cuenta lo que
  estás leyendo".
- **Bonus emergente: rotar el dispositivo cruzando 768px re-pan
  automáticamente.** Como `presentation` es dependencia del effect
  (`useMediaQuery` reactivo), al rotar el dispositivo o redimensionar
  la ventana con un modal abierto, `presentation` cambia (`sheet-side`
  ↔ `sheet-bottom`), el effect re-corre y el grafo se re-pan al
  nodo focal adaptándose al nuevo inset. Comportamiento gratis, no
  buscado.
- **+2.7 KB en el bundle de `/mapa`** (188.41 → 191.12 KB; gzip
  +1.07 KB). Coste despreciable.
- **Coste casi nulo en runtime.** Una animación de 300ms ease-in-out
  cada cambio del top. Cytoscape ya está montado en vista Grafo, no
  hay setup adicional.
- **Patrón replicable.** Cualquier futura sincronización
  componente-imperativo (e. g. zoom-to-fit programático, focus en
  filtro) puede usar el mismo molde de `bind:this` + método exportado
  + `$effect` sobre store de stack.
- **Self-loops (no esperados en el modelo) se tratan como no-op
  visual.** Si una técnica tuviese origen === destino, el midpoint
  cae sobre el nodo único → pan lo deja centrado, sin pestañeo.

## Alternativas consideradas

- **Pan + zoom-to-fit del nodo focal.** Centrar el nodo y ajustar el
  zoom para verlo "grande". Pros: legibilidad máxima del nodo focal.
  Cons: descartada por el owner — intrusiva, le roba el zoom al
  usuario (puede haber zoom-out global para ver el grafo completo y
  el pan-zoom lo destruiría). El usuario manda en el zoom; el modal
  solo sugiere "este es el nodo del que hablamos".
- **Volver al pan/zoom previo al cerrar el modal.** Pros: simetría
  ("el grafo recuerda dónde estabas"). Cons: animación de vuelta
  arbitraria (¿al pan justo antes del primer push? ¿al pan inicial
  del mount?), añade complejidad de tracking de viewport-stack,
  poco UX-clear. Descartada por el owner: "el grafo se queda donde
  esté al cerrar".
- **Técnica = pan al nodo de origen** (en lugar del midpoint). Pros:
  un solo punto, decisión simple. Cons: pierde el contexto del nodo
  destino, que es justamente la información que la técnica añade.
  Midpoint mantiene ambos extremos en pantalla (si el zoom lo
  permite). Descartada por valor informativo.
- **Pasar insets en pixels al método** (`panToEntity(target, { right,
  bottom })`). Pros: máxima flexibilidad. Cons: duplica el cálculo
  (el padre tendría que conocer el ancho del contenedor para
  calcular `width * 0.5`), inventa un tipo paralelo, viola la
  encapsulación al revés. Descartada por sobre-ingeniería.

## Referencias

- Commit: `18e295b` — T-10.it3.
- Ficheros:
  - `src/lib/components/GrafoMapa.svelte::panToEntity` (líneas
    ~469-540).
  - `src/routes/mapa/+page.svelte` — el `$effect` que sincroniza el
    top del stack con el método.
  - `src/lib/components/mapa-modal-stack.svelte.ts` — el store
    `mapaModalStack` con los métodos `push` / `pop` / `pushOrPopTo` /
    `popTo` / `closeAll`.
  - `src/lib/grafo.ts::buildGrafoElements` — la convención de ids
    (`pos:<id>`, `sum:<id>`, arista con `id = t.id` sin prefijo) que
    `panToEntity` consume.
- `.claude/agent-reports/20260518-t10-it3-pan-modal/implementation.md`
  — detalle técnico, checklist manual, riesgos.
- `.claude/ESTADO_ACTUAL.md` §23 (T-10.it3 + T-10.it3.a).
- ADR-006 — habilita este ADR (sin grafo visible, no hay nada que
  sincronizar).
