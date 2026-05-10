# T-2 — SQLite-WASM con OPFS — Plan revisado (v2)

**Versión:** 2.0
**Fecha:** 2026-05-09
**Estado:** ✅ T-2 cerrada. Todos los pasos verdes.
**Reemplaza a:** `T2_PLAN.md` (v1 mantenido como histórico)

---

## POR QUÉ ESTE PLAN REVISADO

El plan v1 dio por bueno que el VFS `opfs` estándar de SQLite-WASM funcionaba en GitHub Pages siempre que SQLite corriese en un Worker dedicado. La doc oficial de la librería desmiente esa premisa: el VFS `opfs` **siempre** requiere `SharedArrayBuffer`, que a su vez requiere las cabeceras `COOP` y `COEP` del servidor — y GitHub Pages no permite configurarlas.

La pieza concreta que el v1 elegía (`sqlite3Worker1Promiser`) además quedó marcada como `@deprecated` el 2026-04-15.

**Solución adoptada:** usar el VFS `opfs-sahpool` (SAH-Pool), que persiste igual en OPFS pero **no requiere SAB ni COOP/COEP**. La librería lo expone como API soportada (no deprecada) vía `installOpfsSAHPoolVfs()` y la clase `OpfsSAHPoolDatabase`.

**Impacto en producto:** ninguno. Mismo SQLite, misma persistencia OPFS, mismo offline-first, misma latencia esperada para nuestro volumen (§4.7).

---

## DECISIONES (ACTUALIZADAS)

| ID | Tema | v1 (descartado) | v2 (vigente) | Estado |
|---|---|---|---|---|
| D-1 | Librería | `@sqlite.org/sqlite-wasm` | `@sqlite.org/sqlite-wasm` (sin cambio) | Aprobada |
| D-2 | VFS / modelo de I/O | `opfs` + Worker + Promiser oficial | `opfs-sahpool` + Worker propio | **Aprobada (B)** |
| D-3 | Distribución del `.wasm` | D-3a: copiar 4 ficheros a `static/sqlite/` | D-3a' adaptada: copiar **solo** `sqlite3.wasm`. El JS lo bundlea Vite. | Aprobada |
| D-4 | Política de errores | API throws; `init` idempotente | sin cambio | Aprobada |
| D-5 | Forma del schema | `SCHEMA_V1` literal en `schema.ts` | sin cambio | Aprobada |
| D-6 | Tipado de filas | `query<T = Row>(sql, params): Promise<T[]>` | sin cambio | Aprobada |
| D-7 | SW debe cachear `.wasm` | Modificar `vite.config.ts` (`workbox.globPatterns`) | sin cambio | **Pendiente, aprobada en discusión** |

---

## ARQUITECTURA INTERNA RESULTANTE

```
[main thread]                              [Web Worker (db-worker.ts)]
src/lib/db/index.ts                        src/lib/db/db-worker.ts
  ├── init() ──────────────────► postMessage('init', {wasmBaseUrl})
  ├── run(sql, params) ────────► postMessage('run', {sql, params})
  └── query(sql, params) ──────► postMessage('query', {sql, params})
                                              │
                                              ├── sqlite3InitModule({locateFile})
                                              │     └── carga static/sqlite/sqlite3.wasm
                                              ├── installOpfsSAHPoolVfs({name, capacity})
                                              ├── new OpfsSAHPoolDb('/bjj-tracker.sqlite3')
                                              ├── (1ª vez) ejecuta SCHEMA_V1
                                              └── responde con {id, ok, rows?}
```

Mensajería: cada llamada main→worker lleva un `id` autoincremental. El main thread mantiene un `Map<id, Promise>` y resuelve/rechaza al recibir respuesta. El worker es persistente — vive lo que vive la pestaña.

---

## FICHEROS (estado actual)

### Creados en Paso 1 (commit `33dfb19`)
- `scripts/copy-sqlite-wasm.mjs` — copia assets de runtime de sqlite-wasm a `static/sqlite/`. (En Paso 2 se redujo la lista de 3 ficheros a solo `sqlite3.wasm`.)
- `static/sqlite/.gitkeep`

### Creados en Paso 2 (commit `1c7246e`)
- `src/lib/db/types.ts` — `SqlValue`, `Row`.
- `src/lib/db/schema.ts` — `SCHEMA_V1` literal de ITERACION_0.
- `src/lib/db/db-worker.ts` — Worker propio con SAH-Pool.
- `src/lib/db/index.ts` — API pública `init`/`run`/`query`.

### Modificados (acumulado)
- `package.json` — dep `@sqlite.org/sqlite-wasm`, script `prepare:sqlite` encadenado a `prepare`.
- `pnpm-lock.yaml` — coherente con `package.json`.
- `.gitignore` — ignora `static/sqlite/*` excepto `.gitkeep`.

### Pendientes de crear
- `src/routes/dev/db-smoke/+page.svelte` (Paso 3)

### Pendientes de modificar (con tu OK explícito)
- `vite.config.ts` — añadir `wasm` a `workbox.globPatterns` (Paso 5, decisión D-7).

### Sin tocar (igual que v1)
- `svelte.config.js`, `src/routes/+layout.svelte`, `src/routes/+layout.ts`, `.github/workflows/deploy.yml`.

---

## RIESGOS (actualizados)

| # | Riesgo (v1) | Estado en v2 |
|---|---|---|
| R1 | Prerender evalúa el módulo de DB en Node | Mitigado: `index.ts` guarda con `typeof window` y `init()` hace dynamic-import del worker. Validar en Paso 4. |
| R2 | OPFS no disponible en algún navegador | Igual. Target Chrome/Firefox modernos. |
| R3 | GH Pages no envía COOP/COEP | **Eliminado**: SAH-Pool no necesita SAB. |
| R4 | Worker no encuentra el `.wasm` en producción por el `base` de GH Pages | Persiste. Mitigado en Paso 6 con verificación. El `wasmBaseUrl` se construye desde `$app/paths.base`. |
| R5 | SW cachea sin `.wasm` | Persiste. D-7 lo resuelve en Paso 5. |
| R6 | SW viejo no se actualiza tras deploy | Persiste, mitigación documentada (`Ctrl+Shift+R`). |
| R7 | Cuotas OPFS | Persiste. Cubierto por export JSON manual (T-8). |
| R8 | `pnpm install --frozen-lockfile` falla en CI por dep nueva | Resuelto en Paso 1: lockfile commiteado. |
| R9 | Vitest browser-mode bundlea sqlite-wasm | Persiste, defer hasta que ocurra. |
| R10 | Async lento en móviles antiguos | Persiste. Volumen previsto (§4.7) lo hace irrelevante. |
| R11 | `crypto.randomUUID()` en LAN dev | Persiste. Para la página de humo del Paso 3. |
| R12 | Vite dedupe rompe sqlite-wasm | Reducido: el worker importa el módulo bundleado por Vite (`?worker`), patrón estándar. Si pasa, evaluar `optimizeDeps.exclude`. |
| R13 *(nuevo)* | TS marca `sqlite3InitModule({locateFile})` como error porque las typings ocultan los params | Resuelto en Paso 2 con `@ts-expect-error` documentado. |
| R14 *(nuevo)* | SAH-Pool inicializa una pila de N "slots". Si N es bajo, no caben journal + DB | Mitigado: `initialCapacity: 6`. Para 1 BD pequeña sobra. |

---

## DEUDA TÉCNICA CONOCIDA (no bloquea T-2)

- **Duplicación del `.wasm` en el build**: Vite emite automáticamente una copia hasheada de `sqlite3.wasm` en `_app/immutable/workers/assets/` además de la nuestra en `static/sqlite/`. Causa: el bundle del paquete usa `import.meta.url` para localizar el wasm, y Vite es conservador y la emite "por si acaso", aunque en runtime nuestro `locateFile` redirige siempre a la copia estática. Impacto: precache PWA pesa 1.7 MB de wasm en lugar de ~900 KB. No afecta a funcionalidad ni a requisitos. Posibles fixes (cuando duela): usar la copia de Vite vía `?url` import y eliminar nuestra estática; o seguir como está.

- **Loop de refresh en primera carga tras deploy**: cuando un usuario que ya tenía la PWA instalada de una versión anterior abre la app por primera vez tras un deploy con cambios grandes en el SW (como T-2, que añadió 2.3 MB de precache), Edge/Chrome mobile entra en un bucle rápido de refresh mientras el SW nuevo se instala. Workaround manual: cancelar el refresh + recargar. Tras eso el SW queda estable y el comportamiento es normal. No afecta a usuarios nuevos (sin PWA previa). Si molesta en uso real, evaluar `registerType: 'prompt'` en lugar de `'autoUpdate'` o reducir tamaño del precache.

- **SAH-Pool race en escenario "Offline + reload" en DevTools**: al activar el modo Offline en DevTools y recargar la pestaña, el nuevo Worker intenta crear handles de OPFS mientras el Worker anterior aún los tiene bloqueados. Error: "Access Handles cannot be created if there is another open Access Handle". Solo reproducible con DevTools toggle, no en uso normal (cierre + reapertura limpios). Si se reprodujese fuera del DevTools, mitigación: añadir retry-with-backoff en `db-worker.ts`.

- **PWA standalone no podía navegar a `/dev/db-smoke`**: la PWA arranca en `start_url: /bjj-tracker/` (la home) y la home no tenía link a la página de humo, por lo que la navegación a páginas no enlazadas era imposible desde modo PWA standalone. Resuelto en commit `1efdc91` añadiendo un link temporal en la home.

---

## PLAN DE EJECUCIÓN INCREMENTAL

### ✅ Paso 1 — Instalar dependencia y copiar assets — `33dfb19`
### ✅ Paso 2 — Esqueleto del módulo DB — `1c7246e`
### ✅ Paso 3 — Página de humo `/dev/db-smoke` — `9c0d813`
### ✅ Paso 4 — Build estático sin romper prerender (saltado el manual de preview por quirk de routing con `.html`)
### ✅ Paso 5 — D-7 wasm en workbox.globPatterns — `20962f2`
### ✅ Paso 6 — Deploy real a GH Pages — verificado en producción
  - CI Node 20→22 — `1d54393`
  - Link temporal /dev/db-smoke desde home — `1efdc91`
  - Fix race + UX contención SAH-Pool — `ea38999`
### ✅ Paso 7 — Limpieza
  - JSDoc en exportables de `src/lib/db/index.ts`
  - **Decisión:** /dev/db-smoke se mantiene como sanity check futuro (override de la nota original en CONTEXTO_AGENTE.md "borrar al cerrar T-2"). Link en home también permanece.

---

## VERIFICACIÓN FUNCIONAL TOTAL AL CIERRE DE T-2

Idéntica al v1 §9. Sin cambios — el cambio interno no afecta a lo verificable manualmente.

---

*Documento vivo. Actualizar cuando aparezca otra desviación que afecte a las decisiones D-N o a la lista de ficheros tocados.*
