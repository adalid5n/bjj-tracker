# ADR-008 — Persistencia del layout del grafo en SQLite + dirty state + auto-dirty

**Fecha:** 2026-05-18
**Estado:** Aceptada
**Sesión:** 23
**Commits:** `c674569` (T-9.a, capa DB) + `c15da2b` (T-9.b, UI)

## Contexto

El grafo de Cytoscape con fcose (ADR-004) es no-determinista: dos
montajes del mismo dataset producen layouts visualmente distintos. El
módulo-level `positionsCache: Map<string, {x,y}>` introducido en T-7
mitigaba el problema entre cambios de tab dentro de la misma sesión,
pero se perdía en cada recarga.

Más grave: al añadir un nodo nuevo, fcose se re-corría sobre TODO el
grafo y reorganizaba los existentes — el usuario perdía el trabajo
manual de explorar/organizar el grafo (zoom + pan + el orden mental
que se había hecho).

Visión del owner (sesión 21):

- Drag nativo de nodos (sin modo edición separado).
- Organización del usuario prevalece: al añadir nodos, los existentes
  NO se mueven (fcose con `fixedNodeConstraint`; solo el nuevo se
  acomoda).
- Botón "Guardar organización" que persiste en SQLite (no
  localStorage — así viaja en export/import JSON).
- Botón "Reorganizar" (existente): fcose temporal, sobrescribe en
  pantalla pero NO toca lo persistido hasta Guardar. Cambios pendientes
  visibles (dirty state).
- F5 → carga lo último guardado.

Matiz aceptado por el owner: no hay sync automático entre desktop y
móvil (no hay backend). El export/import JSON es el puente.

## Decisión

### Modelo de datos (T-9.a, commit `c674569`)

Tabla única `grafo_layout`, sin FK, en migración nueva v4→v5:

```sql
CREATE TABLE grafo_layout (
  entidad_id TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('posicion', 'sumision')),
  x REAL NOT NULL,
  y REAL NOT NULL,
  PRIMARY KEY (entidad_id, kind)
);
```

Decisiones de modelado:

- **Una sola tabla para posiciones y sumisiones** (en lugar de
  `posicion_layout` y `sumision_layout`). `entidad_id` apunta a dos
  tablas distintas según `kind`, no hay FK declarada — la integridad
  referencial se mantiene en TS.
- **PK compuesta `(entidad_id, kind)`.** `INSERT OR REPLACE` cubre
  alta y update sin distinguir.
- **`CHECK (kind IN ('posicion', 'sumision'))`** garantiza el dominio
  (SQLite no tiene ENUM).
- **REAL para `x`/`y`.** Cytoscape y fcose trabajan en coordenadas
  continuas; no hay grid implícito.

### API del módulo `src/lib/grafo-layout.ts`

```ts
export type GrafoLayoutKind = 'posicion' | 'sumision';
export type GrafoLayoutRow = {
  entidadId: string;
  kind: GrafoLayoutKind;
  x: number;
  y: number;
};

export async function getAllLayouts(): Promise<GrafoLayoutRow[]>;
export async function upsertLayouts(rows: GrafoLayoutRow[]): Promise<void>;
export async function deleteLayout(entidadId: string, kind: GrafoLayoutKind): Promise<void>;
```

- `upsertLayouts`: no-op si `rows.length === 0`. Si no, `BEGIN` →
  `INSERT OR REPLACE` por fila → `COMMIT`. `ROLLBACK` en `catch` con
  re-lanzamiento del error. Patrón idéntico al
  `syncComplementaria` de ADR-002.
- Limpieza de huérfanos: `deletePosicion()` y `deleteSumision()`
  llaman a `deleteLayout` al final de su flujo. Sin triggers SQL, sin
  cascade — la limpieza vive en TS donde es visible y auditable.

### Export/import JSON (`src/lib/sync.ts`)

- `CURRENT_SCHEMA_VERSION` 4 → 5.
- Payload incluye `grafo_layout: GrafoLayoutDbRow[]` (snake_case
  porque es serialización JSON externa).
- `exportAll` añade query paralela; `importAll` borra en el wipe e
  inserta tras `roll_tecnica`. Validador strict (`assertExportShape`)
  añade `'grafo_layout'` a `requiredArrays`.
- `grafo_layout` NO entra en el `countsLine` del toast de
  export/import. Decisión: plumbing visual, no entidad de negocio —
  coherente con `roll_posicion` y `roll_tecnica` (tampoco se
  cuentan).

### UI (T-9.b, commit `c15da2b`)

**`GrafoMapa.svelte`:**

- Prop bindable `dirty` (`$bindable(false)`) — el padre escucha vía
  `bind:dirty={grafoDirty}` y reactivamente pinta/oculta el botón
  "Guardar organización".
- Métodos imperativos exportados `saveLayout()` y `reorganize()`
  invocados vía `bind:this={grafoComponent}`.
- **Hidratación en `onMount`**: `getAllLayouts()` en paralelo con los
  imports de Cytoscape/fcose (ver ADR-005). Vuelca filas al
  `positionsCache` con clave compuesta (`pos:<id>` / `sum:<id>`) antes
  de instanciar Cytoscape.
- **Handler `dragfree`**: marca `dirty=true` + actualiza
  `positionsCache`, NO persiste. Flag `initialLoadComplete` (variable
  normal, no `$state`) silencia el handler durante el settle inicial
  para que el cierre natural del layout no cuente como "el usuario
  movió algo".
- **`pickLayoutOptions` con tres ramas** según el estado del cache:
  - Todos cacheados → `preset` con coords del cache.
  - Algunos cacheados (hay nodos nuevos) → `fcose` con
    `fixedNodeConstraint` para los conocidos, fcose acomoda los
    nuevos alrededor.
  - Cache vacío → fcose completo.
- **`reorganize()`**: limpia `positionsCache`, corre fcose completo
  ignorando layout guardado, marca `dirty=true`. NO persiste hasta
  Guardar.
- **`saveLayout()`**: lee `cy.nodes().map(...)` → `upsertLayouts(rows)`
  → `dirty=false`.
- **Auto-dirty al cargar**: si tras hidratar quedan nodos sin layout
  en BD y `nodes.length > 0`, sube `dirty=true` después del primer
  `runLayoutAndCache`. Caso típico: posición creada en otra máquina e
  importada, o catálogo recién inicializado.

**`/mapa/+page.svelte`:**

- Botón "Reorganizar" (siempre en vista Grafo) y "Guardar
  organización" (solo si `grafoDirty`) en la fila 2 del sub-header.
  El botón Reorganizar in-canvas (sobreimpuesto al grafo) se eliminó
  — ahora vive en el sub-header junto a Guardar.
- **AlertDialog "¿Descartar cambios del grafo?" separado del
  `MapaModalHost`**. Decisión justificada en
  `agent-reports/20260518-t9-it3-layout/ui-layer.md`: fusionar
  exigiría cambiar la API del host (exponer `isDirty()`), el caso
  "ambos dirty" es raro (los drags del grafo se hacen sin wizard
  abierto), y dos diálogos secuenciales con scope distinto comunican
  mejor qué se descarta. Si el usuario tiene dirty en ambos scopes,
  son dos clicks de "Descartar"; aceptable.
- **`beforeNavigate` de SvelteKit**: intercepta navegación
  BottomNav / back-forward con `grafoDirty=true` y dispara el mismo
  AlertDialog. Tras "Descartar" → `grafoDirty=false` + `goto(targetUrl)`.
- **F5 (`willUnload`) NO se intercepta.** Coherente con los wizards
  del proyecto, que también pierden borradores en F5. No añado
  `beforeunload` por consistencia y porque sería ruidoso.

## Consecuencias

- **Uniformidad con el resto de tablas.** `grafo_layout` viaja en
  export/import como cualquier otra entidad. Exports de schema_version=4
  ya NO son importables (`schema_version=4 != 5 → throw`) — coherente
  con el modelo de versionado strict del proyecto. Si el owner
  necesitase un export "puente" en el futuro, es una tarea aparte.
- **Las migraciones históricas siguen intactas.** Migraciones v1-v4
  no se tocan (regla dura, ver CONTEXTO_AGENTE.md). La v5 entra al
  final del array `MIGRATIONS`, dispara `CREATE TABLE` en cualquier
  BD existente al cargar.
- **+1 KB neto** en el chunk de `/mapa` (187 → 188 KB pre-T-10) por
  los handlers, el AlertDialog y la lógica de dirty/save/reorganize.
- **Patrón canónico de exposición padre↔hijo en este proyecto**: prop
  bindable (`dirty`) para estado observable + métodos exportados
  (`saveLayout`, `reorganize`) para acciones imperativas. Mismo
  patrón que reutiliza `panToEntity` en ADR-007.
- **`positionsCache` sigue siendo module-level** (`Map` mutable, no
  `$state`). La regla del proyecto prohíbe `$state` a nivel módulo en
  `.svelte.ts`, pero esto no es estado reactivo — es un cache de
  trabajo que se siembra desde BD en cada mount, se actualiza en
  `dragfree`, se vacía en `reorganize()`, y se persiste en
  `saveLayout()`. Trade-off conocido: si el componente se remontara
  sin persistir, el cache module-level sobreviviría al remount (no
  pasa hoy porque la única forma de "remount sin persistir" sería
  navegación SPA con dirty pendiente, y el AlertDialog la intercepta).
- **`PRAGMA foreign_key_check` en `importAll`** no detectaría
  huérfanos de `grafo_layout` (no tiene FK declarada). Riesgo bajo: la
  única forma de generar huérfanos es manipular el JSON a mano (los
  `deleteLayout` en TS limpian).
- **Tests E2E manuales** en `tests/e2e/grafo-layout.e2e.mjs` (script
  Playwright, 10 casos validados). Extensión `.e2e.mjs` queda fuera
  del `testMatch` de `playwright.config.ts` — NO entra en CI. README
  de uso en `tests/e2e/README.md`.
- **Regla nueva en `CONTEXTO_AGENTE.md`** (consecuencia colateral):
  "no crear ni ejecutar tests automatizados sin consentimiento
  explícito" — provocada por un incidente en esta sesión (subagente
  ejecutó un script Playwright propio sin pedirlo).
- **`MEJORAS_FUTURAS.md`** registra "Long-press para activar drag de
  nodos en el grafo": el drag instantáneo de Cytoscape funciona pero
  revisar tras uso real en móvil.

## Alternativas consideradas

- **localStorage en lugar de SQLite.** Pros: trivial, sin migración.
  Cons: NO viaja en export/import JSON (que es la única forma de
  sincronizar entre máquinas en este proyecto), y mezcla preferencias
  con datos de catálogo en dos sistemas. Descartada por incoherencia
  con el modelo de portabilidad del proyecto.
- **Autosave en cada `dragend`.** Pros: cero fricción, no hay botón
  "Guardar". Cons: pierde la red de seguridad ("acabo de hacer un
  drag por accidente, ¿cómo lo deshago?"), y rompe la metáfora
  consistente con el resto del proyecto (los wizards también requieren
  Guardar explícito, no autosave). Descartada por el owner: drag =
  dirty + Guardar explícito.
- **Dos tablas (`posicion_layout`, `sumision_layout`) con FK estricta
  + ON DELETE CASCADE.** Pros: integridad referencial garantizada a
  nivel DB, sin necesidad de limpieza manual TS. Cons: duplica la
  lógica de capa de datos (`getPosicionLayouts`, `getSumisionLayouts`,
  ...), exige dos queries paralelas para hidratar el grafo, no escala
  si mañana hubiera un tercer kind de nodo. Tabla única con `kind` +
  CHECK es más simple y se ha probado bien en el proyecto.
  Descartada por overhead sin beneficio claro.
- **Triggers SQLite para limpiar huérfanos.** Pros: invariante a
  nivel DB. Cons: lógica oculta, opaca para QA y debugging, rompe el
  patrón del proyecto (toda la lógica de datos vive en TS, SQL crudo
  mínimo — ver CONTEXTO_AGENTE.md). Descartada por opacidad. Mismo
  argumento que en ADR-002.
- **F5 con `beforeunload` para avisar al usuario.** Pros: cero
  pérdida de cambios. Cons: incoherente con el resto del proyecto
  (wizards pierden borradores en F5 sin avisar), añade ruido, los
  navegadores modernos ignoran el mensaje custom (solo muestran un
  prompt genérico). Descartada por consistencia.
- **Auto-dirty SOLO al primer drag**, no al cargar con nodos sin
  layout. Pros: menos fricción inicial. Cons: usuario importa un JSON
  desde otra máquina, abre el grafo, ve nodos en posiciones random
  (fcose sobre los huérfanos), no entiende qué pasa porque no hay
  indicador. El auto-dirty al cargar comunica "hay cambios listos
  para guardar", y el usuario pulsa Guardar tras revisar. Mejor UX,
  riesgo bajo de spam de dirty.

## Riesgos conocidos

- Detalle técnico en
  `.claude/agent-reports/20260518-t9-it3-layout/db-layer.md`
  (riesgos #1-6) y `.../ui-layer.md` (riesgos #1-6).
- Resumen: drafts huérfanos en F5 con dirty (aceptado), auto-dirty
  ruidoso si se importa catálogo grande (aceptado, alternativa peor),
  sin tests unitarios del módulo `grafo-layout.ts` (no urgente),
  posibles huérfanos vía manipulación de JSON a mano (no audita).

## Referencias

- Commits:
  - `c674569` — T-9.a (DB layer: schema v5, módulo `grafo-layout.ts`,
    limpieza en delete, sync.ts).
  - `c15da2b` — T-9.b (UI: drag, dirty bindable, Guardar/Reorganizar
    en sub-header, AlertDialog separado, `beforeNavigate`).
- Ficheros:
  - `src/lib/db/schema.ts` — `SCHEMA_V5_MIGRATION` y `migrate4To5`.
  - `src/lib/grafo-layout.ts` — API del módulo.
  - `src/lib/posiciones.ts` / `src/lib/sumisiones.ts` — llamadas a
    `deleteLayout`.
  - `src/lib/sync.ts` — `CURRENT_SCHEMA_VERSION = 5`, payload,
    validador, wipe+insert.
  - `src/lib/components/GrafoMapa.svelte` — hidratación,
    `pickLayoutOptions` con `fixedNodeConstraint`, `dragfree`,
    `saveLayout` / `reorganize`.
  - `src/routes/mapa/+page.svelte` — botones del sub-header,
    AlertDialog separado, `beforeNavigate`.
  - `tests/e2e/grafo-layout.e2e.mjs` + `tests/e2e/README.md`.
- Agent-reports:
  - `.claude/agent-reports/20260518-t9-it3-layout/db-layer.md`
    (T-9.a, riesgos y decisiones de naming/transacción).
  - `.claude/agent-reports/20260518-t9-it3-layout/ui-layer.md`
    (T-9.b, defensa del AlertDialog separado, validación preview).
- `.claude/ESTADO_ACTUAL.md` §21 (visión del owner), §23 (cierre de
  T-9.a + T-9.b).
- ADR-004, ADR-005 — fcose con `fixedNodeConstraint` y lazy-load
  reutilizados aquí.
- ADR-006 — el dirty-guard pattern del grafo conversa con el del
  modal host.
