/**
 * CRUD de Posiciones sobre la BD de SQLite-WASM.
 * Cliente only — depende de `$lib/db`, que requiere browser.
 */

import { init, query, run } from '$lib/db';
import type { Posicion } from '$lib/types';

export type NewPosicion = Omit<Posicion, 'id' | 'created_at' | 'updated_at'>;
export type PosicionUpdate = Omit<Posicion, 'created_at' | 'updated_at'>;

export async function listPosiciones(): Promise<Posicion[]> {
	await init();
	return query<Posicion>('SELECT * FROM posiciones ORDER BY categoria, nombre');
}

export async function getPosicion(id: string): Promise<Posicion | null> {
	await init();
	const rows = await query<Posicion>('SELECT * FROM posiciones WHERE id = ?', [id]);
	return rows[0] ?? null;
}

export async function createPosicion(data: NewPosicion): Promise<Posicion> {
	await init();
	const now = new Date().toISOString();
	const posicion: Posicion = {
		id: crypto.randomUUID(),
		...data,
		created_at: now,
		updated_at: now
	};
	await run(
		`INSERT INTO posiciones (id, nombre, categoria, tipo, notas, created_at, updated_at)
		 VALUES (?, ?, ?, ?, ?, ?, ?)`,
		[
			posicion.id,
			posicion.nombre,
			posicion.categoria,
			posicion.tipo ?? null,
			posicion.notas,
			posicion.created_at,
			posicion.updated_at
		]
	);
	return posicion;
}

export async function updatePosicion(data: PosicionUpdate): Promise<void> {
	await init();
	const now = new Date().toISOString();
	await run(
		`UPDATE posiciones
		 SET nombre = ?, categoria = ?, tipo = ?, notas = ?, updated_at = ?
		 WHERE id = ?`,
		[data.nombre, data.categoria, data.tipo ?? null, data.notas, now, data.id]
	);
}

export async function deletePosicion(id: string): Promise<void> {
	await init();
	await run('DELETE FROM posiciones WHERE id = ?', [id]);
}
