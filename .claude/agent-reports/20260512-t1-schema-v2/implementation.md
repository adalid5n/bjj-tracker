# T-1 — Schema v2 + migración v1→v2 — Reporte de implementación

**Fecha:** 2026-05-12
**Ámbito:** Iteración 1, tarea T-1 (`.claude/ITERACION_1.md`)
**Autor:** subagente Claude

---

## Resumen ejecutivo

Schema v2 definido como DDL incremental sobre v1 (no como bloque "fresh"
alternativo). Migración orquestada por una lista `MIGRATIONS` ordenada y un
helper `applyPendingMigrations(db)` reutilizable, llamado desde
`openDbHandle()` del worker. Las BDs nuevas ejecutan V1 + todas las
migraciones, así el código de migración se ejerce siempre. La limpieza de
la columna huérfana `experiencia_anos` se hace condicionalmente en TS
(con `PRAGMA table_info`) porque no existe en BDs creadas tras T-4.
Verificación con smoke page `/dev/db-migration-smoke` sobre BD en memoria
(`:memory:`), cero impacto en la BD real del usuario.

---

## Decisiones tomadas

### D-1. UNIQUE con `variante=NULL` → índice único con `COALESCE(variante, '')`

**Opción elegida:** índice único con `COALESCE`, como sugiere el plan.

**Razón:**
- Mantiene la semántica de columna: `variante = NULL` significa "no tiene
  variante" (técnica base), distinto de `variante = ''` (variante con
  nombre vacío, que sería absurdo). Si normalizara NULL→'' en INSERT,
  perdería esa distinción y todo el código que lee `tecnicas` tendría que
  saber que `''` es realmente NULL.
- Toda la lógica de unicidad queda declarativa en SQL, sin necesidad de
  preprocesar valores antes de cada INSERT.
- Coste: dos líneas más de DDL frente a una constraint nominal. Trivial.

**Alternativa descartada:** normalizar `variante = NULL → ''` antes de
INSERT. Acopla la integridad a cada llamada CRUD y degrada la semántica
de la columna.

### D-2. BD fresh = V1 + MIGRATION (no SCHEMA_V2_FRESH paralelo)

**Opción elegida:** mantener `SCHEMA_V1` literal y aplicar `MIGRATIONS`
encima en todos los casos (BDs nuevas y BDs ya existentes).

**Razón:**
- Sigue la recomendación del plan.
- Evita el riesgo de divergencia entre dos representaciones del schema
  final: "BD nueva creada con SCHEMA_V2_FRESH" vs "BD migrada con
  MIGRATION". Cualquier corrección futura solo se aplica en un sitio.
- El código de migración se ejerce en *cada arranque de BD nueva*, lo que
  es el equivalente más cercano a un "test continuo" sin tener tests
  automatizados.

**Coste:** una migración v1→v2 sobre BD vacía hace 2 pasos (V1, luego
MIGRATION) en lugar de 1. Coste despreciable comparado con la inicialización
de SQLite-WASM en sí.

### D-3. Patrón de migraciones — array ordenado con `from/to/run`

```ts
export const MIGRATIONS: { from: number; to: number; run: (db: MigrationDb) => void }[] = [
  { from: 1, to: 2, run: migrate1To2 }
];
```

**Razón:**
- Extensible: añadir v3 = añadir entrada `{ from: 2, to: 3, run: ... }` al
  final del array. `applyPendingMigrations` ya itera y aplica las
  pendientes según `schema_meta.version`.
- Cada migración es una función TS, no un string SQL pelado — admite
  lógica condicional (como detectar `experiencia_anos`) sin trucos.
- `LATEST_SCHEMA_VERSION` se deriva del array, no hay constante separada
  que pueda quedar desfasada.

**Alternativa descartada:** `switch` con cases por versión. Más imperativo,
más difícil de listar/auditar las migraciones disponibles, y no admite
metadatos asociados (descripción, fecha, autor) si quisiéramos en el futuro.

### D-4. Estrategia de test — smoke route con BD en memoria

**Opción elegida (a) con variante:** smoke route `/dev/db-migration-smoke`
que opera sobre `new sqlite3.oo1.DB(':memory:')` en lugar de un fichero
OPFS de prueba.

**Razón de la desviación respecto al plan:**
- BD en memoria es idempotente por construcción: cada click parte de cero
  sin tener que borrar nada.
- Cero riesgo de tocar la BD real del usuario por error (`bjj-tracker.sqlite3`
  vs `bjj-tracker-migration-test.sqlite3` es un nombre similar — un typo
  podría machacar la BD real).
- No requiere instalar/desinstalar el VFS OPFS-SAH-Pool en cada ejecución
  (que es una operación más pesada y con el race conocido cuando otro
  worker está holding handles).
- Sigue siendo verificación end-to-end del schema: SQLite-WASM real,
  exactamente las mismas constraints CHECK/UNIQUE/FK que en producción.

**Lo que pierde:** no verifica la interacción con OPFS-SAH-Pool en sí. Pero
esa interacción ya está verificada por la app entera en uso normal y por
el smoke histórico `/dev/db-smoke` (que se eliminó tras cierre de
iteración 0.5 — ver más abajo en deudas).

**Opciones descartadas:**
- (b) Vitest browser-mode: setup desproporcionado para una tarea, viola
  la restricción "no añadir dependencias" en la práctica (aunque las
  versiones de vitest y vitest-browser-svelte ya estén en `package.json`,
  configurar vitest.config + setup files es trabajo aparte que pertenece
  a una iteración propia).
- (c) Smoke manual escrito en MD: menos fiable, el agente o el usuario
  pueden saltarse pasos, no detecta regresiones en futuras refactorizaciones
  del schema.

---

## Ficheros modificados / creados

| Ruta | Tipo | Resumen |
|---|---|---|
| `src/lib/db/schema.ts` | Modificado | Añadido `SCHEMA_V2_MIGRATION`, `MigrationDb`, `MIGRATIONS`, `LATEST_SCHEMA_VERSION`, `applyPendingMigrations(db)`. `SCHEMA_V1` intacto. |
| `src/lib/db/db-worker.ts` | Modificado | `openDbHandle()` llama a `applyPendingMigrations(db)` tras aplicar SCHEMA_V1 (si toca). |
| `src/routes/dev/db-migration-smoke/+page.svelte` | Creado | Smoke page con 17 checks sobre BD `:memory:`. Verifica tablas, índices, CHECK, UNIQUE con variante NULL, drop de `experiencia_anos`, conservación de datos, idempotencia. |
| `.claude/agent-reports/20260512-t1-schema-v2/implementation.md` | Creado | Este reporte. |

**Ficheros NO tocados** (respetando restricciones de CONTEXTO_AGENTE):
`vite.config.ts`, `svelte.config.js`, `+layout.svelte`, `+layout.ts`,
`.github/workflows/deploy.yml`, `package.json` (sin nuevas deps).

---

## Resultado de `pnpm check`

```
> bjj-tracker@0.0.2 check /home/adalid/projects/bjj-tracker
> svelte-kit sync && svelte-check --tsconfig ./tsconfig.json

1778610249417 START "/home/adalid/projects/bjj-tracker"
1778610249422 COMPLETED 960 FILES 0 ERRORS 0 WARNINGS 0 FILES_WITH_PROBLEMS
```

0 errores, 0 warnings. (Un error inicial — comparación `'loading'` en un
contexto donde Svelte había estrechado el tipo — se corrigió antes de
cerrar.)

---

## Pasos manuales de verificación para Adalid

1. `nvm use 22` (si no estás ya en Node 22).
2. `pnpm dev -- --host` (o `pnpm preview -- --host` si quieres probar el
   build).
3. Abrir en el navegador `http://localhost:5173/bjj-tracker/dev/db-migration-smoke`
   (la URL exacta depende del `base` de `svelte.config.js`; en dev puede
   ser solo `/dev/db-migration-smoke` — si una falla, prueba la otra).
4. Esperar a que `Cargando SQLite-WASM…` desaparezca y aparezca el botón
   **Ejecutar smoke**.
5. Pulsar el botón.
6. Verificar que la barra superior dice "**17 / 17 checks OK**" en verde
   (success). Si algún check falla, aparece la lista detallada con ✗ rojo
   y el mensaje de error correspondiente.
7. Pulsar **Ejecutar smoke** varias veces seguidas: debe dar siempre el
   mismo resultado (la página crea una BD en memoria nueva cada vez).
8. (Opcional) Abrir DevTools → Application → IndexedDB / Storage para
   confirmar que `bjj-tracker.sqlite3` en OPFS sigue intacta y NO se ha
   creado ningún fichero `*-migration-test.sqlite3` (no hay ninguno
   porque el smoke usa BD en memoria, no OPFS).
9. Navegar a la app normal (`/`) y comprobar que sigue funcionando — la
   migración v1→v2 se aplica automáticamente al primer `init()` y debería
   ser transparente. En `/ajustes` verás "Versión BD: 2" en lugar de "1".

**Lo que NO entra en esta verificación** (queda para T-2 y siguientes):
- CRUD sobre las nuevas tablas (no hay capa de datos todavía).
- UI del mapa (`/mapa`).
- Editores de posición/sumisión/técnica.

---

## Deuda técnica / cuestiones pendientes

### Pequeñas

- **`sync.ts` (export/import) no cubre las tablas nuevas todavía**: la
  función `exportAll()` solo lee `companeros/sesiones/rolls`, y
  `CURRENT_SCHEMA_VERSION = 1` en `src/lib/sync.ts`. Esto significa que
  tras la migración v2:
  - Los export siguen marcando `schema_version: 1` y omiten las tablas
    nuevas (datos del catálogo no se exportan).
  - Los import esperan `schema_version === 1`, así que un import sobre
    una BD ya migrada a v2 funciona pero NO restaura el catálogo (no es
    parte del payload).
  Esto no rompe nada hoy porque T-1 solo crea las tablas vacías. Pero hay
  que abordarlo en una tarea aparte (puede ir junto con T-2 capa de datos,
  o como tarea dedicada de export v2). **No lo he tocado yo porque
  está fuera del alcance literal de T-1.** Sugiero crear T-1.b o T-2.b en
  ITERACION_1.md.

- **El smoke `/dev/db-migration-smoke` no está enlazado desde ningún sitio
  del UI.** Hay que acceder por URL directa. Si quieres link permanente
  desde la home (como ya hubo con `/dev/db-smoke`), añadirlo en
  `src/routes/+page.svelte`. Lo dejé sin link para mantener el alcance
  mínimo de T-1; tú decides.

- **`/dev/db-smoke` (sanity check original de T-2) parece no estar en el
  repo.** El plan T2_PLAN_v2.md dice que se mantiene como sanity check
  futuro, pero `src/routes/dev/` no existía cuando empecé. Posible que se
  borrase y la doc no se actualizase. No es problema mío, pero conviene
  saberlo: con T-1, vuelve a haber un `src/routes/dev/` con la migration
  smoke. Si quieres recuperar también el db-smoke original, decisión
  aparte.

### Mayores

- **Foreign keys no están habilitadas en SQLite-WASM por defecto.** SQLite
  ignora las cláusulas `REFERENCES` y `ON DELETE` salvo que se ejecute
  `PRAGMA foreign_keys = ON` por conexión. El schema v2 define varias FK
  con `ON DELETE CASCADE` y `ON DELETE SET NULL` (en `tecnicas`,
  `tecnica_contras`, `roll_posicion_problema`) que **no se aplicarán
  hasta que activemos el pragma**. La columna `posicion_origen_id` en
  `tecnicas` tampoco verá su `NOT NULL REFERENCES` enforced.

  **No lo he añadido yo** porque tocar el comportamiento de
  `openDbHandle()` para todas las conexiones afecta a la app entera, no
  solo a T-1, y puede tener efectos en código existente que dependa de
  que las FK no se enforcen (poco probable, pero merece OK explícito de
  Adalid). Sugiero:
    - Añadir `db.exec('PRAGMA foreign_keys = ON')` en `openDbHandle()`
      justo tras abrir la conexión, antes de `applyPendingMigrations()`.
    - Verificar con un check extra en el smoke que las FK fallan
      apropiadamente al borrar una posición con técnicas dependientes.
  Decisión a tomar antes de T-2 (cuando empieces a hacer CRUD que dependa
  de cascade).

- **CHECK constraint sobre `tecnicas.tipo` es por valor de `tipo`, no por
  rango**: la CHECK actual no impide tipos inválidos como
  `tipo = 'magia_negra'` siempre que el usuario rellene `posicion_destino_id`
  correctamente. La validación de enum vive en la app, no en BD. Eso es
  consistente con cómo `companeros.cinturon` o `rolls.resultado` se
  manejan hoy (sin CHECK por valor). Lo señalo por si quieres unificar el
  approach en algún momento (p.ej. añadir CHECKs IN ('ataque','sweep',
  'escape','transicion','sumision') a `tipo`).

---

## Notas finales

- Sin commits, sin push, `pnpm dev` no se quedó corriendo. Working tree
  con cambios sin commitear listos para tu revisión.
- `pnpm-lock.yaml` y `package.json` no se han tocado.
