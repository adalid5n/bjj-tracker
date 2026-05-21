# T-2 — SQLite-WASM con OPFS — Plan de implementación

**Versión:** 1.0
**Estado:** Diseño detallado. Pendiente de tu aprobación punto por punto antes de tocar código.
**Tarea de origen:** ITERACION_0.md §"PLAN DE TAREAS — T-2"

---

## OBJETIVO

Integrar `@sqlite.org/sqlite-wasm` con persistencia OPFS en la app SvelteKit existente, exponiendo una API mínima (`init`, `run`, `query`) usable desde componentes Svelte. La BD debe sobrevivir a recarga, cierre de pestaña y reinicio del dispositivo.

**Lo que NO entra en T-2** (anti-scope-creep):
- Helpers de dominio (`createCompanero`, etc.) — son T-4/T-5.
- Migraciones generalizadas — solo `SCHEMA_V1` aplicado al primer init.
- Tests automáticos de la capa de DB — basta verificación manual.
- Export/Import JSON — es T-8.
- Tipos TS del dominio — son T-3.

---

## 1. RESTRICCIONES QUE ESTA TAREA RESPETA

Las constraints duras viven en [T2_RESTRICCIONES.md](T2_RESTRICCIONES.md) (fichero hermano). Resumen aplicable a este plan:

1. **Cliente only.** Nada del módulo de BD puede evaluarse durante SSR/prerender.
2. **Sin SharedArrayBuffer.** GH Pages no envía COOP/COEP.
3. **Solo OPFS.** No `kvvfs`, no IndexedDB, no localStorage para datos.
4. **SQL crudo.** No ORMs.
5. **API mínima:** `init`, `run`, `query`. Punto.
6. **Ficheros sensibles requieren aprobación previa para modificarlos:** `vite.config.ts`, `svelte.config.js`, `src/routes/+layout.svelte`, `src/routes/+layout.ts`, `.github/workflows/deploy.yml`.

---

## 2. RESUMEN DEL ENFOQUE TÉCNICO

| Decisión | Elegido | Razón corta |
|---|---|---|
| Librería | `@sqlite.org/sqlite-wasm` (oficial) | §10.1 del REQUISITOS lo nombra. |
| VFS | `opfs` (no `OPFS-SAHPool`, no `kvvfs`) | Persistencia + sin COOP/COEP. |
| Modo de ejecución | Dedicated Worker + Promiser API oficial | Único modo que da `FileSystemSyncAccessHandle` sin SAB. |
| Carga del módulo | `import()` dinámico desde `onMount` o tras guard `browser` | SSR-safety. |
| Distribución del `.wasm` | Copia a `static/sqlite/` vía script npm | Evita pelearse con el bundler y respetar el `base` de GH Pages. |
| Migraciones | Sola `SCHEMA_V1`: `if (!hasMeta) executeSchemaV1()` | YAGNI hasta v2. |

---

## 3. DECISIONES TÉCNICAS QUE REQUIEREN TU APROBACIÓN

Cada D-N bloquea o influye en la implementación. Recomendación + alternativas. Quiero un OK antes de empezar.

### D-1 — Librería SQLite-WASM
- **Recomendado:** `@sqlite.org/sqlite-wasm`. Versión actual ~3.46.x.
- **Justificación de la dependencia:** mencionada en REQUISITOS §10.1 — no necesita justificación adicional.
- **Alternativas descartadas:**
  - `wa-sqlite`: más control sobre VFS, pero más curva y NO mencionada en §10.1.
  - `sql.js`: sin OPFS — incumple requisitos de persistencia.

### D-2 — VFS / modelo de I/O
- **Recomendado:** VFS `opfs` con SQLite ejecutándose en un dedicated Worker, hablando con main thread vía Promiser (postMessage interno). No requiere COOP/COEP.
- **Implicación:** la API es asíncrona end-to-end (`init`, `run`, `query` devuelven `Promise`). Compatible con la API mínima.
- **Alternativas descartadas:**
  - `OPFS-SAHPool`: relevante si hubiera contención multi-tab; la app es single-tab.
  - SQLite en main thread con `kvvfs`: incumple persistencia/rendimiento.

### D-3 — Cómo se carga el binario `.wasm` y el script del worker
SQLite-WASM se distribuye con un fichero JS principal, un fichero JS de worker (`sqlite3-worker1.mjs`), un proxy (`sqlite3-opfs-async-proxy.js`) y un blob `.wasm`. El loader del worker necesita encontrar el `.wasm` en runtime, y el `base` de GH Pages (`/bjj-tracker/`) complica los path resolves de Vite.

Tres opciones consideradas:

- **D-3a — Recomendada: copiar a `static/sqlite/` vía script.**
  - Crear `scripts/copy-sqlite-wasm.mjs` que copia `node_modules/@sqlite.org/sqlite-wasm/sqlite-wasm/jswasm/*` a `static/sqlite/`.
  - Encadenarlo desde el script `prepare` de npm que ya existe en `package.json`.
  - El worker se instancia con `new Worker(new URL(`${base}/sqlite/sqlite3-worker1.mjs`, window.location.origin), { type: 'module' })`, donde `base` viene de `$app/paths`.
  - **Ventajas:** `.wasm` queda con URL predecible; el SW lo cachea con un solo glob; no hay que tocar `vite.config.ts` por este motivo; el bundler no toca los assets.
  - **Coste:** ~30 líneas de script Node.
- **D-3b — Importar como asset Vite (`?url`).**
  - Requiere casi seguro tocar `vite.config.ts` (`optimizeDeps.exclude`, `assetsInclude`) y posiblemente `assetsInlineLimit`. Las URLs hasheadas chocan con el modo en que sqlite-wasm resuelve el `.wasm` relativo al worker.
  - **Solo si rechazas D-3a.**
- **D-3c — CDN (unpkg/jsdelivr).**
  - **Descartado:** rompe offline-first (REQUISITOS §4.2).

**Recomendación: D-3a.**

### D-4 — Política de errores en la API
- `run`/`query` lanzan en error. El caller decide qué hacer.
- `init()` es idempotente: llamar dos veces devuelve la misma instancia.
- `init()` lanza temprano si se detecta entorno no-browser (`typeof window === 'undefined'`) — defensa en profundidad por si alguien la importa mal.
- Sin retries, sin fallback automático.

### D-5 — Forma del schema y dónde vive
- **Recomendado:** un solo string en `src/lib/db/schema.ts`:
  ```ts
  export const SCHEMA_V1: string = `
    CREATE TABLE schema_meta (...);
    INSERT INTO schema_meta ...;
    CREATE TABLE companeros (...);
    CREATE TABLE sesiones (...);
    CREATE TABLE rolls (...);
    CREATE INDEX ...;
  `;
  ```
  Copiado literal de ITERACION_0.md §"ESQUEMA DE BASE DE DATOS".
- En T-2, sin runner de migraciones. Solo:
  ```
  if (no_existe_schema_meta_o_version<1) executeSchemaV1();
  ```
- Cuando aparezca un v2 (probablemente en iteración 1 al añadir posiciones/técnicas), ahí se decide si construir un mini-runner.

### D-6 — Tipado de filas en `query`
- **Recomendado:** `query<T = Row>(sql, params): Promise<T[]>` con `Row = Record<string, SqlValue>`. El llamante hace cast al shape conocido.
- **Alternativa:** devolver `unknown[]` y forzar parsing manual. Más correcto, más fricción. Tu llamada.

### D-7 — Service worker debe cachear `.wasm`
- El SW configurado por `vite-plugin-pwa` (en `vite.config.ts`) usa:
  ```
  globPatterns: ['**/*.{js,css,html,svg,png,ico,webp}']
  ```
  Falta `wasm`. Sin él, tras la primera carga + nueva navegación, el SW intercepta el request del `.wasm` y NO lo encuentra ⇒ la app no funciona offline.
- **Diff propuesta** (un solo carácter de cambio funcional):
  ```
  globPatterns: ['**/*.{js,css,html,svg,png,ico,webp,wasm}']
  ```
- **Impacto:** indispensable para cumplir REQUISITOS §4.2 (offline tras primera carga).
- **Tocar `vite.config.ts` requiere tu OK** (constraint #4 del prompt). Sin ese OK, T-2 no puede cerrarse cumpliendo §4.2.
- **Alternativa si rechazas D-7:** registrar una `runtimeCaching` rule manual en la config. Es más complejo y también toca `vite.config.ts`. No tiene ventaja.

---

## 4. FICHEROS A CREAR

| Fichero | Propósito |
|---|---|
| `src/lib/db/index.ts` | API pública: `init()`, `run(sql, params)`, `query(sql, params)`. Lazy-loads el worker. ~120 líneas. |
| `src/lib/db/schema.ts` | Constante `SCHEMA_V1` con CREATE TABLE/INDEX de ITERACION_0. ~50 líneas. |
| `src/lib/db/types.ts` | `SqlValue = string \| number \| null \| Uint8Array`, `Row = Record<string, SqlValue>`. ~10 líneas. |
| `scripts/copy-sqlite-wasm.mjs` | Script Node que copia los assets de sqlite-wasm a `static/sqlite/`. ~30 líneas. |
| `src/routes/dev/db-smoke/+page.svelte` | Página temporal de humo. Inserta + lista filas en `companeros`. Sirve como verificación manual. Permanece en repo (acceso solo desde URL conocida). |
| `static/sqlite/.gitkeep` | Mantiene el directorio. Los `.wasm` y `.mjs` copiados van a `.gitignore`. |

## 5. FICHEROS A MODIFICAR

Solo dos sin aprobación adicional:

| Fichero | Cambio | Justificación |
|---|---|---|
| `package.json` | (a) Añadir dep runtime `@sqlite.org/sqlite-wasm`. (b) Añadir script `prepare:sqlite` y encadenarlo desde `prepare`. | (a) Stack §10.1. (b) D-3a. |
| `.gitignore` | Añadir `static/sqlite/*` y `!static/sqlite/.gitkeep`. | Los assets se generan; no commitearlos. |

Modificación que **requiere tu aprobación previa** (D-7):

| Fichero | Cambio | Justificación |
|---|---|---|
| `vite.config.ts` | Añadir `wasm` al `workbox.globPatterns`. | Sin esto la app no funciona offline. |

## 6. FICHEROS QUE NO SE TOCAN

- `svelte.config.js` — el adapter, base path y prerender quedan como están.
- `src/routes/+layout.svelte` — no hace falta init de DB en layout.
- `src/routes/+layout.ts` — `prerender = true` se mantiene; el módulo de DB nunca se evalúa en prerender.
- `.github/workflows/deploy.yml` — el script `prepare:sqlite` se ejecuta vía hook `prepare` que ya corre con `pnpm install --frozen-lockfile`.

---

## 7. RIESGOS ESPECÍFICOS (SQLite-WASM + SvelteKit + GitHub Pages)

| # | Riesgo | Probabilidad | Impacto | Mitigación |
|---|---|---|---|---|
| R1 | **Prerender intenta evaluar el módulo de DB en Node** y falla porque `Worker`/`OPFS` no existen. | Alta si la API se importa estática. | Build roto. | Importar `$lib/db` solo desde `onMount` o tras `if (browser)`. JSDoc del módulo lo deja por escrito. |
| R2 | **OPFS no disponible** en el navegador (Safari < 15.2, Firefox < 111, Chrome incógnito a veces). | Media. Target principal es Chrome Android + desktop. | Fallo runtime al abrir la BD. | `init()` detecta y lanza error claro: "OPFS no disponible. Usa Chrome o Firefox actualizado y no en incógnito". |
| R3 | **GitHub Pages no envía COOP/COEP** ⇒ sin SharedArrayBuffer. | Cierta. | Cualquier VFS que dependa de SAB no funciona. | D-2: VFS `opfs` con dedicated Worker no necesita SAB. Verificar en deploy real, no solo en `pnpm dev`. |
| R4 | **El worker no encuentra el `.wasm` en producción** por el `base` de GH Pages (`/bjj-tracker/`). | Media-alta sin gestión explícita. | App rota en producción aunque funcione en local. | D-3a + construir la URL del worker desde `base` de `$app/paths`. Verificar en checkpoint #6 con deploy real. |
| R5 | **SW cachea sin `.wasm`** ⇒ rompe offline tras primera carga. | Cierta sin D-7. | Rompe REQUISITOS §4.2. | D-7. |
| R6 | **SW viejo no se actualiza** tras un deploy ("no veo mis cambios"). | Conocido (ITERACION_0 §RIESGOS). | Confusión. | Ya está `registerType: 'autoUpdate'`. Recordar `Ctrl+Shift+R` o "Update on reload" en DevTools al verificar checkpoints. |
| R7 | **Cuotas de OPFS** (~10% del disco; navegador puede borrar). | Baja a corto plazo. | Pérdida de BD. | Cubierto por el export JSON manual (T-8). No mitigamos en T-2; documentamos. |
| R8 | **`pnpm install --frozen-lockfile` falla en CI** porque añadimos dep nueva sin actualizar lockfile. | Cierta tras añadir dep. | Deploy roto. | `pnpm add @sqlite.org/sqlite-wasm` actualiza lockfile; commitearlo. Verificar en checkpoint #1. |
| R9 | **Vitest browser-mode intenta bundlear** `@sqlite.org/sqlite-wasm` para tests SSR. | Media si se importa en tests. | Tests rotos. | El módulo de DB no se importa desde tests en T-2. Si pasa, marcar como external en el proyecto `server` de Vitest. Defer hasta que ocurra. |
| R10 | **Promiser es async end-to-end** ⇒ transacciones largas se sienten lentas en móviles antiguos. | Baja para volumen previsto (§4.7: ~750 rolls/año). | Lag perceptible. | No optimizar en T-2. Medir cuando pase. |
| R11 | **`crypto.randomUUID()` requiere contexto seguro.** En `pnpm dev` desde otro device en LAN puede fallar. | Baja. | UUIDs no se generan. | UUIDs no entran en T-2 (entran en T-3). Para la página de humo, usar `crypto.randomUUID()` y aceptar que en LAN dev puede fallar — irrelevante para validar OPFS. |
| R12 | **Vite dedupe / pre-bundle** intenta procesar el JS de sqlite-wasm y rompe sus imports. | Posible. | Init falla con error opaco. | Si pasa, la solución es `optimizeDeps.exclude: ['@sqlite.org/sqlite-wasm']` en `vite.config.ts` — requiere tu aprobación adicional. Probable evitarlo del todo con D-3a (los assets cargan desde `static/`, no desde `node_modules`). |

---

## 8. PLAN DE EJECUCIÓN INCREMENTAL

Cada paso termina con un **checkpoint** ejecutable. No avanzo al siguiente sin que valides el anterior.

### Paso 1 — Instalar dependencia y copiar assets

**Acciones:**
- `pnpm add @sqlite.org/sqlite-wasm`
- Crear `scripts/copy-sqlite-wasm.mjs` que copia `node_modules/@sqlite.org/sqlite-wasm/sqlite-wasm/jswasm/{sqlite3.wasm, sqlite3.mjs, sqlite3-worker1*.mjs, sqlite3-opfs-async-proxy.js}` a `static/sqlite/`.
- Editar `package.json`: añadir `"prepare:sqlite": "node scripts/copy-sqlite-wasm.mjs"` y encadenarlo desde `prepare`.
- Editar `.gitignore`: ignorar `static/sqlite/` excepto `.gitkeep`.
- Crear `static/sqlite/.gitkeep`.

**Checkpoint #1 — verificable a mano:**
```bash
pnpm install                       # repuebla static/sqlite/
ls -la static/sqlite/              # ves sqlite3.wasm + sqlite3-worker1*.mjs
git status                         # NO aparece ningún .wasm/.mjs nuevo (gitignore)
git diff pnpm-lock.yaml            # tiene cambios y los commiteo
```

---

### Paso 2 — Esqueleto del módulo DB sin tocar la app

**Acciones:**
- Crear `src/lib/db/types.ts`.
- Crear `src/lib/db/schema.ts` (con `SCHEMA_V1` literal de ITERACION_0).
- Crear `src/lib/db/index.ts`. Implementación:
  - `init()`: si no inicializado, importa Promiser de `@sqlite.org/sqlite-wasm`, instancia worker apuntando a `${base}/sqlite/sqlite3-worker1.mjs`, abre BD `bjj-tracker.sqlite3` con VFS `opfs`. Comprueba `schema_meta`. Si no existe, ejecuta `SCHEMA_V1`. Devuelve handle interno.
  - `run(sql, params?)`: ejecuta vía Promiser, lanza si error.
  - `query(sql, params?)`: ejecuta vía Promiser, devuelve `T[]`.
  - Todas chequean `typeof window !== 'undefined'` al entrar.
- El módulo no se importa desde ningún sitio aún (excepto la página de humo del paso 3).

**Checkpoint #2 — verificable a mano:**
```bash
pnpm check                         # svelte-check + tsc OK
pnpm build                         # compila la app entera sin errores
```

---

### Paso 3 — Página de humo `/dev/db-smoke`

**Acciones:**
- Crear `src/routes/dev/db-smoke/+page.svelte`. Dentro de `onMount`:
  ```ts
  const db = await import('$lib/db');
  await db.init();
  // botón: insertar fila de prueba en companeros con crypto.randomUUID()
  // refrescar lista con db.query("SELECT * FROM companeros")
  ```
- Botón "Insertar otro" + botón "Vaciar".

**Checkpoint #3 — verificable a mano:**
1. `pnpm dev`
2. Navegador → `http://localhost:5173/dev/db-smoke`
3. Pulsar "Insertar otro" 3 veces ⇒ aparecen 3 filas.
4. F5 (recargar) ⇒ siguen las 3 filas.
5. Cerrar pestaña, abrir nueva, mismo URL ⇒ siguen las 3 filas.
6. Cerrar Chrome entero, reabrir, abrir URL ⇒ siguen las 3 filas.
7. DevTools > Application > Storage > "Origin Private File System" ⇒ ves un archivo `.sqlite3`.
8. DevTools > Console ⇒ 0 errores rojos.

Si falla en (3-6) ⇒ problema de OPFS o de URL del worker. Si falla en build ⇒ probable R1 (import estático no protegido).

---

### Paso 4 — Build estático y prerender no rompen

**Acciones:** ninguna, solo verificar.

**Checkpoint #4 — verificable a mano:**
```bash
pnpm build                         # debe completar SIN ejecutar nada de DB en Node
pnpm preview                       # sirve build en :4173
# Repetir las pruebas del checkpoint #3 contra el preview
```

Síntomas típicos de fallo:
- `Worker is not defined` durante prerender ⇒ algún `import` se evaluó en Node. Revisar que `import('$lib/db')` esté dentro de `onMount` o tras guard.
- 404 del `.wasm` en preview ⇒ el `base` no se resolvió bien al construir la URL del worker. Inspeccionar la URL generada.

---

### Paso 5 — APROBACIÓN para tocar `vite.config.ts` (D-7)

**Aquí paro y pido tu OK explícito.** El cambio:
```diff
  workbox: {
-   globPatterns: ['**/*.{js,css,html,svg,png,ico,webp}'],
+   globPatterns: ['**/*.{js,css,html,svg,png,ico,webp,wasm}'],
    navigateFallback: '/bjj-tracker/',
    navigateFallbackDenylist: [/^\/api\//]
  },
```

Sin esto, la app NO cumple §4.2 offline-first. Si lo apruebas, lo aplico y procedo al checkpoint #5.

**Checkpoint #5 — verificable a mano (post-aprobación):**
```bash
pnpm build && pnpm preview
```
1. Cargar `/dev/db-smoke`, insertar 2 filas.
2. DevTools > Application > Service Workers ⇒ activar "Offline".
3. Recargar la pestaña.
4. La página debe cargar y las filas deben seguir ahí, sin errores en consola.

---

### Paso 6 — Deploy real a GitHub Pages y validación

**Acciones:** push a `main` ⇒ GitHub Actions despliega.

**Checkpoint #6 — verificable a mano:**
- Chrome desktop:
  1. Abrir `https://<usuario>.github.io/bjj-tracker/dev/db-smoke`.
  2. Insertar 2 filas. Recargar. Persisten.
  3. DevTools > Application > Offline ✓. Recargar. Persisten.
- Chrome Android:
  4. Abrir misma URL. Insertar fila. Recargar. Persiste.
  5. "Instalar app" desde menú. Abrir desde icono. La fila sigue.
  6. Cerrar PWA, reiniciar móvil, abrir PWA ⇒ la fila sigue.

Síntoma esperable de R4 si no se gestionó el `base`: 404 al cargar `sqlite3-worker1.mjs` desde `https://<usuario>.github.io/sqlite/...` (sin el `/bjj-tracker`). Si ocurre, fix: construir la URL del worker con `base` desde `$app/paths`.

---

### Paso 7 — Limpieza para cerrar T-2

**Acciones:**
- Mantener `/dev/db-smoke` accesible vía URL directa (no se enlaza desde nav). Sirve como sanity check ad-hoc.
- Eliminar `console.log` de debugging.
- JSDoc de 3-5 líneas en cada exportable de `src/lib/db/index.ts` documentando contratos y SSR-safety.

**Checkpoint #7 — verificable a mano:**
```bash
pnpm lint && pnpm check
```
T-2 cerrado. T-3 (tipos del dominio) puede empezar.

---

## 9. VERIFICACIÓN FUNCIONAL TOTAL AL CIERRE DE T-2

Esta es la lista que vas a poder pasar manualmente cuando todo esté listo, antes de marcar la tarea como hecha:

- [ ] `pnpm dev`: la app sirve. Visito `/dev/db-smoke`. Inserto 3 filas. Recargo. Persisten.
- [ ] `pnpm build`: termina sin errores (prerender OK).
- [ ] `pnpm preview`: la app funciona idéntico a `dev`.
- [ ] DevTools muestra el archivo `.sqlite3` en OPFS y 0 errores en consola.
- [ ] La app desplegada en GitHub Pages permite hacer lo mismo.
- [ ] La app desplegada funciona offline tras primera carga.
- [ ] Datos persisten tras cerrar y reabrir la PWA en Android, y tras reiniciar el dispositivo.
- [ ] Solo se han modificado los ficheros listados en §5. Ningún archivo prohibido tocado fuera del scope aprobado de D-7.

---

## 10. RESUMEN — DECISIONES QUE NECESITO DE TI ANTES DE EMPEZAR

| ID | Decisión | Recomendación | Bloquea a |
|---|---|---|---|
| D-1 | Librería | `@sqlite.org/sqlite-wasm` | Paso 1 |
| D-2 | VFS | `opfs` + Promiser + dedicated Worker | Paso 2 |
| D-3 | Distribución del `.wasm` | D-3a (copiar a `static/sqlite/`) | Paso 1 |
| D-6 | Tipado de filas | `query<T = Row>` genérico | Paso 2 |
| D-7 | Tocar `vite.config.ts` para añadir `wasm` al SW | aprobar | Paso 5 |

D-4 y D-5 no requieren decisión tuya — son consecuencias mecánicas del enfoque. Las marco aquí solo para que las hayas leído.

Si me dices "todo aprobado", arranco por el paso 1.

---

*Documento listo. Apruébalo o pide cambios. Una vez aprobado, paso al Paso 1.*
