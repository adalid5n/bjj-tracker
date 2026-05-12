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
 * Lista ordenada de migraciones disponibles. Para añadir v3:
 *   { from: 2, to: 3, run: (db) => { ... } }
 */
export const MIGRATIONS: { from: number; to: number; run: (db: MigrationDb) => void }[] = [
	{ from: 1, to: 2, run: migrate1To2 }
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
