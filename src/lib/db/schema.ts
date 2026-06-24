/**
 * Schema de la BD y migraciones incrementales.
 *
 * Modelo de versionado:
 * - `SCHEMA_V1` es el DDL original. Se aplica en BDs completamente vacías
 *   (cuando la tabla `schema_meta` no existe).
 * - `MIGRATIONS` es la lista ordenada de migraciones incrementales. Cada
 *   entrada lleva de la versión `from` a `to` y se aplica en orden tras V1.
 * - Una BD recién creada hoy ejecuta V1 + todas las migraciones, lo que
 *   garantiza que el código de migración se ejerce siempre y no hay
 *   divergencia entre "BD nueva" y "BD migrada".
 *
 * Para añadir v3, v4, etc. en el futuro: añadir entrada nueva al final del
 * array `MIGRATIONS` con `from: N` y `to: N+1`.
 */

export const SCHEMA_V1 = `
CREATE TABLE schema_meta (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
INSERT INTO schema_meta (key, value) VALUES ('version', '1');

CREATE TABLE companeros (
  id TEXT PRIMARY KEY,
  nombre TEXT NOT NULL,
  cinturon TEXT,
  peso_relativo TEXT,
  notas TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE sesiones (
  id TEXT PRIMARY KEY,
  fecha TEXT NOT NULL,
  tipo TEXT NOT NULL,
  foco TEXT,
  tecnica_clase TEXT,
  obs_profesor TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE rolls (
  id TEXT PRIMARY KEY,
  sesion_id TEXT NOT NULL REFERENCES sesiones(id) ON DELETE CASCADE,
  companero_id TEXT REFERENCES companeros(id) ON DELETE SET NULL,
  orden INTEGER NOT NULL,
  tamano_relativo TEXT,
  duracion_min INTEGER,
  resultado TEXT,
  que_intente TEXT,
  que_fallo TEXT,
  posiciones_problema TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX idx_rolls_sesion ON rolls(sesion_id);
CREATE INDEX idx_rolls_companero ON rolls(companero_id);
CREATE INDEX idx_sesiones_fecha ON sesiones(fecha DESC);
`;

/**
 * DDL incremental para subir de schema v1 a v2.
 *
 * Notas de diseño:
 * - UNIQUE(nombre, posicion_origen_id, variante): SQLite trata cada NULL
 *   como distinto en UNIQUE, por lo que una restricción nominal a nivel de
 *   tabla NO bloquearía duplicados cuando `variante` es NULL. Se usa un
 *   índice único con COALESCE(variante, '') para tratar todos los NULL
 *   como equivalentes a la cadena vacía únicamente a efectos del índice
 *   (la columna sigue conservando NULL en almacenamiento, que es la
 *   semántica que queremos: "no tiene variante" ≠ "variante llamada vacía").
 *
 * - CHECK sobre destino: exactamente uno de `posicion_destino_id` /
 *   `sumision_destino_id` debe estar presente, según el `tipo` de la
 *   técnica. Si tipo='sumision' → sumision_destino_id NOT NULL y
 *   posicion_destino_id NULL. En cualquier otro caso → posicion_destino_id
 *   NOT NULL y sumision_destino_id NULL.
 *
 * - La limpieza de `companeros.experiencia_anos` (deuda de MEJORAS_FUTURAS)
 *   NO va aquí porque la columna puede no existir en BDs creadas tras T-4
 *   y un `DROP COLUMN` directo fallaría. Se hace en código TS dentro de
 *   `migrate1To2()` con PRAGMA table_info antes del DROP.
 */
export const SCHEMA_V2_MIGRATION = `
CREATE TABLE posiciones (
  id TEXT PRIMARY KEY,
  nombre TEXT NOT NULL,
  categoria TEXT NOT NULL DEFAULT 'otro',
  tipo TEXT,
  notas TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE sumisiones_terminales (
  id TEXT PRIMARY KEY,
  nombre TEXT NOT NULL UNIQUE,
  notas TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE tecnicas (
  id TEXT PRIMARY KEY,
  nombre TEXT NOT NULL,
  variante TEXT,
  posicion_origen_id TEXT NOT NULL REFERENCES posiciones(id) ON DELETE CASCADE,
  posicion_destino_id TEXT REFERENCES posiciones(id) ON DELETE SET NULL,
  sumision_destino_id TEXT REFERENCES sumisiones_terminales(id) ON DELETE SET NULL,
  tipo TEXT NOT NULL,
  estado TEXT NOT NULL DEFAULT 'probando',
  detalles TEXT NOT NULL DEFAULT '',
  errores_comunes TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,

  CHECK (
    (tipo = 'sumision' AND sumision_destino_id IS NOT NULL AND posicion_destino_id IS NULL)
    OR
    (tipo != 'sumision' AND posicion_destino_id IS NOT NULL AND sumision_destino_id IS NULL)
  )
);

CREATE UNIQUE INDEX idx_tecnicas_nombre_origen_variante
  ON tecnicas (nombre, posicion_origen_id, COALESCE(variante, ''));

CREATE TABLE tecnica_contras (
  tecnica_id TEXT NOT NULL REFERENCES tecnicas(id) ON DELETE CASCADE,
  contra_tecnica_id TEXT NOT NULL REFERENCES tecnicas(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL,
  PRIMARY KEY (tecnica_id, contra_tecnica_id)
);

CREATE TABLE roll_posicion_problema (
  roll_id TEXT NOT NULL REFERENCES rolls(id) ON DELETE CASCADE,
  posicion_id TEXT NOT NULL REFERENCES posiciones(id) ON DELETE CASCADE,
  PRIMARY KEY (roll_id, posicion_id)
);

CREATE INDEX idx_tecnicas_origen ON tecnicas(posicion_origen_id);
CREATE INDEX idx_tecnicas_destino_pos ON tecnicas(posicion_destino_id);
CREATE INDEX idx_tecnicas_destino_sum ON tecnicas(sumision_destino_id);
CREATE INDEX idx_tecnicas_nombre ON tecnicas(nombre);
CREATE INDEX idx_contras_tecnica ON tecnica_contras(tecnica_id);

UPDATE schema_meta SET value = '2' WHERE key = 'version';
`;

/**
 * Tipo mínimo que cumple cualquier handle de BD que sepa hacer exec con
 * SQL + opciones (oo1.DB, OpfsSAHPoolDatabase). Suficiente para escribir
 * las funciones de migración sin acoplarlas al tipo concreto de handle.
 */
export type MigrationDb = {
	exec: (...a: unknown[]) => unknown;
};

/**
 * Devuelve true si la columna `columnName` existe en la tabla `tableName`.
 * Implementado con `PRAGMA table_info`, que devuelve una fila por columna
 * con campos [cid, name, type, notnull, dflt_value, pk].
 */
function hasColumn(db: MigrationDb, tableName: string, columnName: string): boolean {
	const rows = db.exec({
		sql: `PRAGMA table_info(${tableName})`,
		returnValue: 'resultRows',
		rowMode: 'object'
	}) as { name: string }[];
	return rows.some((r) => r.name === columnName);
}

/**
 * Migración v1 → v2. Suma las tablas nuevas y limpia la columna huérfana
 * `experiencia_anos` de `companeros` si está presente (deuda de
 * MEJORAS_FUTURAS).
 */
function migrate1To2(db: MigrationDb): void {
	if (hasColumn(db, 'companeros', 'experiencia_anos')) {
		db.exec('ALTER TABLE companeros DROP COLUMN experiencia_anos');
	}
	db.exec(SCHEMA_V2_MIGRATION);
}

/**
 * DDL incremental para subir de schema v2 a v3.
 *
 * Añade `posicion_complementaria_id` a `posiciones` como autoref nullable
 * con `ON DELETE SET NULL`: vincula bidireccionalmente las dos vistas de
 * una misma situación (p. ej. "Mount top" ↔ "Mount bottom") sin cascadear
 * borrados. La simetría se mantiene desde la capa TS (transacción doble
 * UPDATE en `updatePosicion`), no por triggers SQL. Ver ADR-002.
 *
 * SQLite restringe ADD COLUMN con REFERENCES a default NULL — cumplido
 * (la columna no declara DEFAULT, por lo que el default implícito es NULL).
 */
export const SCHEMA_V3_MIGRATION = `
ALTER TABLE posiciones
  ADD COLUMN posicion_complementaria_id TEXT REFERENCES posiciones(id) ON DELETE SET NULL;

UPDATE schema_meta SET value = '3' WHERE key = 'version';
`;

function migrate2To3(db: MigrationDb): void {
	db.exec(SCHEMA_V3_MIGRATION);
}

/**
 * DDL incremental para subir de schema v3 a v4 (T-3.it2).
 *
 * Modelo simétrico para vincular rolls con técnicas y con posiciones,
 * separando en ambos casos por `resultado` ('fue_bien' | 'fallo'):
 *
 *  - `roll_tecnica`: pivot nueva. Sustituye al texto libre
 *    `rolls.que_intente`/`rolls.que_fallo` desde la UI (las columnas se
 *    conservan como histórico — no se tocan en esta migración).
 *  - `roll_posicion`: reemplaza a `roll_posicion_problema` (que solo
 *    capturaba "donde tuve problema"). Ahora una posición se puede
 *    vincular como "fue bien" o como "fallo". Se migran las filas
 *    históricas de `roll_posicion_problema` a `roll_posicion` con
 *    `resultado = 'fallo'` (preserva la semántica original).
 *
 * Decisión de modelado:
 * - PK compuesta `(roll_id, *_id, resultado)`: la misma técnica/posición
 *   puede aparecer simultáneamente como `fue_bien` y como `fallo` en un
 *   mismo roll si el owner así lo registra. El resultado forma parte
 *   de la clave para permitir esa combinación sin duplicar filas dentro
 *   del mismo `resultado`.
 * - CHECK sobre `resultado` para garantizar el dominio
 *   ('fue_bien'|'fallo') sin necesidad de un ENUM (SQLite no los tiene).
 * - FKs con `ON DELETE CASCADE` a `rolls`, `tecnicas` y `posiciones`:
 *   si se borra un roll, sus vínculos desaparecen; si se borra una
 *   técnica/posición, deja de estar vinculada (no queremos huérfanos).
 */
export const SCHEMA_V4_MIGRATION = `
CREATE TABLE roll_tecnica (
  roll_id TEXT NOT NULL REFERENCES rolls(id) ON DELETE CASCADE,
  tecnica_id TEXT NOT NULL REFERENCES tecnicas(id) ON DELETE CASCADE,
  resultado TEXT NOT NULL CHECK (resultado IN ('fue_bien', 'fallo')),
  PRIMARY KEY (roll_id, tecnica_id, resultado)
);

CREATE INDEX idx_roll_tecnica_roll ON roll_tecnica(roll_id);
CREATE INDEX idx_roll_tecnica_tecnica ON roll_tecnica(tecnica_id);

CREATE TABLE roll_posicion (
  roll_id TEXT NOT NULL REFERENCES rolls(id) ON DELETE CASCADE,
  posicion_id TEXT NOT NULL REFERENCES posiciones(id) ON DELETE CASCADE,
  resultado TEXT NOT NULL CHECK (resultado IN ('fue_bien', 'fallo')),
  PRIMARY KEY (roll_id, posicion_id, resultado)
);

CREATE INDEX idx_roll_posicion_roll ON roll_posicion(roll_id);
CREATE INDEX idx_roll_posicion_posicion ON roll_posicion(posicion_id);

INSERT INTO roll_posicion (roll_id, posicion_id, resultado)
  SELECT roll_id, posicion_id, 'fallo' FROM roll_posicion_problema;

DROP TABLE roll_posicion_problema;

UPDATE schema_meta SET value = '4' WHERE key = 'version';
`;

function migrate3To4(db: MigrationDb): void {
	db.exec(SCHEMA_V4_MIGRATION);
}

/**
 * DDL incremental para subir de schema v4 a v5 (T-9.it3).
 *
 * Añade `grafo_layout`: persistencia de la posición (x, y) de cada nodo del
 * grafo del mapa técnico. Una sola tabla cubre tanto posiciones como
 * sumisiones para evitar duplicar lógica de capa de datos.
 *
 * Decisiones de modelado:
 * - Clave compuesta `(entidad_id, kind)`. No hay FK porque `entidad_id`
 *   apunta a dos tablas distintas (`posiciones` o `sumisiones_terminales`)
 *   según `kind`. La integridad referencial se mantiene desde TS: las
 *   funciones `deletePosicion()` / `deleteSumision()` limpian su fila de
 *   `grafo_layout` explícitamente. Trade-off: ganamos tabla única y código
 *   simple; el coste es que un bug en TS podría dejar huérfanos (auditable
 *   con un LEFT JOIN puntual si hace falta).
 * - `CHECK (kind IN ('posicion', 'sumision'))` garantiza el dominio sin
 *   ENUM (SQLite no los tiene).
 * - `x`/`y` como REAL: fcose y Cytoscape trabajan en coordenadas continuas;
 *   no hay grid implícito.
 */
export const SCHEMA_V5_MIGRATION = `
CREATE TABLE grafo_layout (
  entidad_id TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('posicion', 'sumision')),
  x REAL NOT NULL,
  y REAL NOT NULL,
  PRIMARY KEY (entidad_id, kind)
);

UPDATE schema_meta SET value = '5' WHERE key = 'version';
`;

function migrate4To5(db: MigrationDb): void {
	db.exec(SCHEMA_V5_MIGRATION);
}

/**
 * DDL incremental para subir de schema v5 a v6 (T-1.it6).
 *
 * Añade la tabla `app_settings` (key/value genérica) para alojar flags de
 * preferencias del usuario que viven en BD y deben sobrevivir al
 * export/import. El primer (y por ahora único) uso es `modo_avanzado`,
 * que controla la "Vista avanzada" introducida en it.6.
 *
 * Decisiones de modelado:
 * - Tabla key/value en vez de columnas tipadas: el set de flags es
 *   pequeño y volátil; una columna por flag obligaría a migrar cada vez.
 *   Trade-off: perdemos tipado SQL, lo recuperamos en la capa TS
 *   (`SettingsState`).
 * - Seed inicial con `modo_avanzado='false'` para que el getter de
 *   `SettingsState` tenga un valor que leer sin null-check en el primer
 *   arranque tras migración. Una BD nueva ejecuta V1 + esta migración y
 *   queda con el seed.
 */
export const SCHEMA_V6_MIGRATION = `
CREATE TABLE app_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

INSERT INTO app_settings (key, value) VALUES ('modo_avanzado', 'false');

UPDATE schema_meta SET value = '6' WHERE key = 'version';
`;

function migrate5To6(db: MigrationDb): void {
	db.exec(SCHEMA_V6_MIGRATION);
}

export const SCHEMA_V7_MIGRATION = `
CREATE TABLE tags (
  id TEXT PRIMARY KEY,
  nombre TEXT NOT NULL UNIQUE,
  color TEXT NOT NULL DEFAULT '#6366f1',
  created_at TEXT NOT NULL
);

CREATE TABLE posicion_tags (
  posicion_id TEXT NOT NULL REFERENCES posiciones(id) ON DELETE CASCADE,
  tag_id TEXT NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (posicion_id, tag_id)
);

UPDATE schema_meta SET value = '7' WHERE key = 'version';
`;

function migrate6To7(db: MigrationDb): void {
	db.exec(SCHEMA_V7_MIGRATION);
}

/**
 * DDL incremental para subir de schema v7 a v8.
 *
 * Simplificación de categorías de posición: fusiona `control_superior` y
 * `espalda` en un único valor `control`. Quedan 4 valores:
 * guardia | control | transicion | otro.
 *
 * Solo es un UPDATE de datos — no cambia DDL (SQLite no tiene CHECK en
 * `categoria`; el dominio lo impone la capa TS con el tipo union).
 */
export const SCHEMA_V8_MIGRATION = `
UPDATE posiciones SET categoria = 'control' WHERE categoria = 'control_superior';
UPDATE posiciones SET categoria = 'control' WHERE categoria = 'espalda';
UPDATE schema_meta SET value = '8' WHERE key = 'version';
`;

function migrate7To8(db: MigrationDb): void {
	db.exec(SCHEMA_V8_MIGRATION);
}

/**
 * DDL incremental para subir de schema v8 a v9.
 *
 * Añade campo `disciplina` (bjj | grappling | ambos) a posiciones,
 * tecnicas y sumisiones_terminales. Default 'bjj' para registros
 * existentes (se puede cambiar en bulk desde el mapa).
 * También siembra `disciplina_activa` en app_settings si no existe.
 */
export const SCHEMA_V9_MIGRATION = `
ALTER TABLE posiciones ADD COLUMN disciplina TEXT NOT NULL DEFAULT 'bjj';
ALTER TABLE tecnicas ADD COLUMN disciplina TEXT NOT NULL DEFAULT 'bjj';
ALTER TABLE sumisiones_terminales ADD COLUMN disciplina TEXT NOT NULL DEFAULT 'bjj';
INSERT OR IGNORE INTO app_settings (key, value) VALUES ('disciplina_activa', 'bjj');
UPDATE schema_meta SET value = '9' WHERE key = 'version';
`;

function migrate8To9(db: MigrationDb): void {
	db.exec(SCHEMA_V9_MIGRATION);
}

/**
 * Lista ordenada de migraciones disponibles. Para añadir v10:
 *   { from: 9, to: 10, run: (db) => { ... } }
 */
export const MIGRATIONS: { from: number; to: number; run: (db: MigrationDb) => void }[] = [
	{ from: 1, to: 2, run: migrate1To2 },
	{ from: 2, to: 3, run: migrate2To3 },
	{ from: 3, to: 4, run: migrate3To4 },
	{ from: 4, to: 5, run: migrate4To5 },
	{ from: 5, to: 6, run: migrate5To6 },
	{ from: 6, to: 7, run: migrate6To7 },
	{ from: 7, to: 8, run: migrate7To8 },
	{ from: 8, to: 9, run: migrate8To9 }
];

/**
 * Versión de schema más reciente conocida por el código. Coincide con el
 * `to` de la última entrada en `MIGRATIONS` (o 1 si no hay migraciones).
 */
export const LATEST_SCHEMA_VERSION = MIGRATIONS.length > 0
	? MIGRATIONS[MIGRATIONS.length - 1].to
	: 1;

/**
 * Lee `schema_meta.version` y aplica todas las migraciones pendientes en
 * orden. Idempotente: si la versión ya está al día, no hace nada.
 *
 * Asume que `schema_meta` ya existe (i.e. SCHEMA_V1 ya se aplicó).
 */
export function applyPendingMigrations(db: MigrationDb): void {
	const rows = db.exec({
		sql: "SELECT value FROM schema_meta WHERE key = 'version'",
		returnValue: 'resultRows',
		rowMode: 'object'
	}) as { value: string }[];
	const current = Number(rows[0]?.value ?? '1');

	for (const m of MIGRATIONS) {
		if (m.from >= current) {
			m.run(db);
		}
	}
}
