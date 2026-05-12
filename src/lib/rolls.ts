/**
 * CRUD de Rolls sobre la BD de SQLite-WASM.
 * Cliente only — depende de `$lib/db`, que requiere browser.
 */

import { init, query, run } from '$lib/db';
import type { Posicion, ResultadoRoll, Roll, TipoSesion } from '$lib/types';

export type NewRoll = Omit<Roll, 'id' | 'orden' | 'created_at' | 'updated_at'>;
export type RollUpdate = Omit<Roll, 'orden' | 'created_at' | 'updated_at'>;

export type RollWithContext = Roll & {
	companero_nombre: string | null;
	sesion_fecha: string;
	sesion_tipo: TipoSesion;
};

export type RollFilters = {
	from?: string;
	to?: string;
	companero_id?: string;
	resultado?: ResultadoRoll;
	tipo_sesion?: TipoSesion;
};

export async function listRolls(sesionId: string): Promise<Roll[]> {
	await init();
	return query<Roll>('SELECT * FROM rolls WHERE sesion_id = ? ORDER BY orden DESC', [sesionId]);
}

export async function listAllRolls(filters: RollFilters = {}): Promise<RollWithContext[]> {
	await init();
	const where: string[] = [];
	const params: (string | number)[] = [];

	if (filters.from) {
		where.push('s.fecha >= ?');
		params.push(filters.from);
	}
	if (filters.to) {
		where.push('s.fecha <= ?');
		params.push(filters.to);
	}
	if (filters.companero_id) {
		where.push('r.companero_id = ?');
		params.push(filters.companero_id);
	}
	if (filters.resultado) {
		where.push('r.resultado = ?');
		params.push(filters.resultado);
	}
	if (filters.tipo_sesion) {
		where.push('s.tipo = ?');
		params.push(filters.tipo_sesion);
	}

	const whereSql = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';

	return query<RollWithContext>(
		`SELECT
			r.*,
			c.nombre AS companero_nombre,
			s.fecha AS sesion_fecha,
			s.tipo AS sesion_tipo
		 FROM rolls r
		 LEFT JOIN companeros c ON r.companero_id = c.id
		 LEFT JOIN sesiones s ON r.sesion_id = s.id
		 ${whereSql}
		 ORDER BY s.fecha DESC, r.orden DESC`,
		params
	);
}

export async function createRoll(data: NewRoll): Promise<Roll> {
	await init();
	const now = new Date().toISOString();
	const maxRows = await query<{ max_orden: number | null }>(
		'SELECT MAX(orden) AS max_orden FROM rolls WHERE sesion_id = ?',
		[data.sesion_id]
	);
	const nextOrden = (maxRows[0]?.max_orden ?? 0) + 1;
	const roll: Roll = {
		id: crypto.randomUUID(),
		orden: nextOrden,
		...data,
		created_at: now,
		updated_at: now
	};
	await run(
		`INSERT INTO rolls (
			id, sesion_id, companero_id, orden, tamano_relativo, duracion_min,
			resultado, que_intente, que_fallo, posiciones_problema,
			created_at, updated_at
		) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		[
			roll.id,
			roll.sesion_id,
			roll.companero_id ?? null,
			roll.orden,
			roll.tamano_relativo ?? null,
			roll.duracion_min ?? null,
			roll.resultado ?? null,
			roll.que_intente ?? null,
			roll.que_fallo ?? null,
			roll.posiciones_problema ?? null,
			roll.created_at,
			roll.updated_at
		]
	);
	return roll;
}

export async function updateRoll(data: RollUpdate): Promise<void> {
	await init();
	const now = new Date().toISOString();
	await run(
		`UPDATE rolls
		 SET sesion_id = ?, companero_id = ?, tamano_relativo = ?, duracion_min = ?,
		     resultado = ?, que_intente = ?, que_fallo = ?, posiciones_problema = ?,
		     updated_at = ?
		 WHERE id = ?`,
		[
			data.sesion_id,
			data.companero_id ?? null,
			data.tamano_relativo ?? null,
			data.duracion_min ?? null,
			data.resultado ?? null,
			data.que_intente ?? null,
			data.que_fallo ?? null,
			data.posiciones_problema ?? null,
			now,
			data.id
		]
	);
}

export async function deleteRoll(id: string): Promise<void> {
	await init();
	await run('DELETE FROM rolls WHERE id = ?', [id]);
}

/**
 * Reemplaza el conjunto de posiciones de problema de un roll por las
 * indicadas en `posicionIds`. Operación atómica: envuelta en
 * BEGIN/COMMIT (ROLLBACK si algo falla a mitad).
 *
 * IDs duplicados en el array se ignoran (la PK compuesta lo impediría;
 * de-duplicamos antes para evitar el error y ahorrar inserts).
 */
export async function setPosicionesProblema(
	rollId: string,
	posicionIds: string[]
): Promise<void> {
	await init();
	const unicos = Array.from(new Set(posicionIds));
	await run('BEGIN');
	try {
		await run('DELETE FROM roll_posicion_problema WHERE roll_id = ?', [rollId]);
		for (const posicionId of unicos) {
			await run(
				'INSERT INTO roll_posicion_problema (roll_id, posicion_id) VALUES (?, ?)',
				[rollId, posicionId]
			);
		}
		await run('COMMIT');
	} catch (err) {
		await run('ROLLBACK').catch(() => {
			// si el ROLLBACK falla (transacción ya cerrada), priorizamos
			// reportar el error original.
		});
		throw err;
	}
}

/**
 * Cuenta cuántos rolls referencian una posición como "problema". Se usa
 * para decidir si se puede borrar la posición sin orfanizar referencias.
 *
 * Convención del proyecto: alias en lowercase (como `rolls_count` en
 * `sesiones.ts`) — el worker preserva el case del alias tal cual.
 */
export async function countRollsByPosicionProblema(posicionId: string): Promise<number> {
	await init();
	const rows = await query<{ count: number }>(
		'SELECT COUNT(*) AS count FROM roll_posicion_problema WHERE posicion_id = ?',
		[posicionId]
	);
	return rows[0]?.count ?? 0;
}

/**
 * Devuelve las posiciones de problema asociadas a un roll, ordenadas por
 * nombre. JOIN con `posiciones` para devolver el objeto completo y no
 * solo el id.
 */
export async function getPosicionesProblema(rollId: string): Promise<Posicion[]> {
	await init();
	return query<Posicion>(
		`SELECT p.*
		 FROM roll_posicion_problema rpp
		 JOIN posiciones p ON p.id = rpp.posicion_id
		 WHERE rpp.roll_id = ?
		 ORDER BY p.nombre`,
		[rollId]
	);
}
