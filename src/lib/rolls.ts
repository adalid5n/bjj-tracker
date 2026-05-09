/**
 * CRUD de Rolls sobre la BD de SQLite-WASM.
 * Cliente only — depende de `$lib/db`, que requiere browser.
 */

import { init, query, run } from '$lib/db';
import type { Roll } from '$lib/types';

export type NewRoll = Omit<Roll, 'id' | 'orden' | 'created_at' | 'updated_at'>;
export type RollUpdate = Omit<Roll, 'orden' | 'created_at' | 'updated_at'>;

export async function listRolls(sesionId: string): Promise<Roll[]> {
	await init();
	return query<Roll>('SELECT * FROM rolls WHERE sesion_id = ? ORDER BY orden DESC', [sesionId]);
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
