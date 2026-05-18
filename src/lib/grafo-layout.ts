/**
 * CRUD del layout persistido del grafo del mapa técnico (T-9.it3).
 * Cliente only — depende de `$lib/db`, que requiere browser.
 *
 * La tabla `grafo_layout` guarda la posición (x, y) de cada nodo del grafo,
 * sea una posición o una sumisión terminal. Clave compuesta (entidad_id,
 * kind); sin FK porque `entidad_id` apunta a dos tablas distintas según
 * `kind`. La limpieza de huérfanos vive en `deletePosicion()` /
 * `deleteSumision()`, no en triggers SQLite (decisión deliberada para que
 * el invariante sea visible desde TS y auditable). Ver migración v5 en
 * `db/schema.ts`.
 */

import { init, query, run } from '$lib/db';

export type GrafoLayoutKind = 'posicion' | 'sumision';

export type GrafoLayoutRow = {
	entidad_id: string;
	kind: GrafoLayoutKind;
	x: number;
	y: number;
};

/**
 * Devuelve TODAS las filas de layout almacenadas. Sin filtro: el caller
 * decide cómo unirlas con sus nodos en memoria (las que no tengan layout
 * persistido caerán al algoritmo fcose en la UI).
 */
export async function getAllLayouts(): Promise<GrafoLayoutRow[]> {
	await init();
	return query<GrafoLayoutRow>('SELECT entidad_id, kind, x, y FROM grafo_layout');
}

/**
 * Upsert batch: inserta o reemplaza cada fila en una sola transacción.
 * `INSERT OR REPLACE` sobre la PK compuesta (entidad_id, kind) hace el
 * trabajo sin tener que distinguir new/update desde TS.
 *
 * El batch va envuelto en BEGIN/COMMIT (con ROLLBACK en caso de fallo)
 * para que un guardado parcial no deje el grafo a medias en BD. El
 * worker serializa todas las llamadas a `run` (ver db-worker.ts), por
 * lo que la transacción no se interleva con otras operaciones.
 *
 * No-op silencioso si `rows` está vacío.
 */
export async function upsertLayouts(rows: GrafoLayoutRow[]): Promise<void> {
	if (rows.length === 0) return;
	await init();

	await run('BEGIN');
	try {
		for (const r of rows) {
			await run(
				`INSERT OR REPLACE INTO grafo_layout (entidad_id, kind, x, y)
				 VALUES (?, ?, ?, ?)`,
				[r.entidad_id, r.kind, r.x, r.y]
			);
		}
		await run('COMMIT');
	} catch (err) {
		await run('ROLLBACK').catch(() => {
			// Si el ROLLBACK falla, priorizamos el error original.
		});
		throw err;
	}
}

/**
 * Borra la fila de layout para (entidadId, kind). No-op si no existe
 * (DELETE WHERE no encuentra fila → 0 rows afectadas, sin error).
 *
 * Pensado para llamarse desde `deletePosicion()` y `deleteSumision()`,
 * tras los chequeos de referencias y el DELETE de la entidad principal.
 */
export async function deleteLayout(
	entidad_id: string,
	kind: GrafoLayoutKind
): Promise<void> {
	await init();
	await run('DELETE FROM grafo_layout WHERE entidad_id = ? AND kind = ?', [entidad_id, kind]);
}
