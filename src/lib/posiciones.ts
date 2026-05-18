/**
 * CRUD de Posiciones sobre la BD de SQLite-WASM.
 * Cliente only — depende de `$lib/db`, que requiere browser.
 */

import { init, query, run } from '$lib/db';
import { deleteLayout } from '$lib/grafo-layout';
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
		posicion_complementaria_id: data.posicion_complementaria_id ?? null,
		created_at: now,
		updated_at: now
	};
	// INSERT con complementaria=NULL primero (la sincronía la aplica
	// syncComplementaria tras el insert para que escriba ambos lados a la vez).
	await run(
		`INSERT INTO posiciones (id, nombre, categoria, tipo, notas, posicion_complementaria_id, created_at, updated_at)
		 VALUES (?, ?, ?, ?, ?, NULL, ?, ?)`,
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
	if (posicion.posicion_complementaria_id) {
		await syncComplementaria(posicion.id, posicion.posicion_complementaria_id);
	}
	return posicion;
}

export async function updatePosicion(data: PosicionUpdate): Promise<void> {
	await init();
	const now = new Date().toISOString();
	// Actualizamos los campos editables salvo la complementaria, que se
	// aplica vía syncComplementaria para mantener la simetría bidireccional.
	await run(
		`UPDATE posiciones
		 SET nombre = ?, categoria = ?, tipo = ?, notas = ?, updated_at = ?
		 WHERE id = ?`,
		[data.nombre, data.categoria, data.tipo ?? null, data.notas, now, data.id]
	);
	await syncComplementaria(data.id, data.posicion_complementaria_id ?? null);
}

export async function deletePosicion(id: string): Promise<void> {
	await init();
	// La FK ON DELETE SET NULL pondrá automáticamente
	// `posicion_complementaria_id = NULL` en la fila emparejada, pero sin
	// tocar su `updated_at`. Limpiamos explícitamente antes del DELETE para
	// mantener el timestamp coherente con el cambio efectivo.
	const now = new Date().toISOString();
	await syncComplementaria(id, null);
	await run('UPDATE posiciones SET updated_at = ? WHERE id = ?', [now, id]);
	await run('DELETE FROM posiciones WHERE id = ?', [id]);
	// Limpieza del layout del grafo (T-9.it3). `grafo_layout` no tiene FK
	// porque apunta a dos tablas; el huérfano se elimina aquí en TS.
	await deleteLayout(id, 'posicion');
}

/**
 * Aplica un cambio de complementaria en A → newB manteniendo la simetría
 * bidireccional con cualquier emparejamiento previo que se rompa. Operación
 * atómica (BEGIN/COMMIT, ROLLBACK si algo falla a mitad). Ver ADR-002.
 *
 * Casos cubiertos:
 * - newB === oldB de A → no-op (no toca DB, no marca updated_at).
 * - newB === null y A tenía oldB → libera oldB, A queda suelta.
 * - newB === id sin pareja → libera oldB de A si existía, A ↔ newB.
 * - newB === id con otra pareja C → libera C de newB, libera oldB de A si
 *   existía, A ↔ newB.
 *
 * Lanza si newB === aId (auto-referencia prohibida).
 */
async function syncComplementaria(aId: string, newBId: string | null): Promise<void> {
	if (newBId === aId) {
		throw new Error('Una posición no puede ser su propia complementaria.');
	}
	const now = new Date().toISOString();

	await run('BEGIN');
	try {
		const aRows = await query<{ posicion_complementaria_id: string | null }>(
			'SELECT posicion_complementaria_id FROM posiciones WHERE id = ?',
			[aId]
		);
		if (aRows.length === 0) {
			throw new Error(`Posición ${aId} no existe`);
		}
		const oldB = aRows[0].posicion_complementaria_id ?? null;

		if (oldB === newBId) {
			await run('COMMIT');
			return;
		}

		// 1. Liberar la pareja anterior de A.
		if (oldB !== null) {
			await run(
				`UPDATE posiciones
				 SET posicion_complementaria_id = NULL, updated_at = ?
				 WHERE id = ? AND posicion_complementaria_id = ?`,
				[now, oldB, aId]
			);
		}

		if (newBId !== null) {
			// 2. Verificar que newB existe y, si tenía otra pareja, liberarla.
			const bRows = await query<{ posicion_complementaria_id: string | null }>(
				'SELECT posicion_complementaria_id FROM posiciones WHERE id = ?',
				[newBId]
			);
			if (bRows.length === 0) {
				throw new Error(`Posición complementaria ${newBId} no existe`);
			}
			const oldA_of_B = bRows[0].posicion_complementaria_id ?? null;
			if (oldA_of_B !== null && oldA_of_B !== aId) {
				await run(
					`UPDATE posiciones
					 SET posicion_complementaria_id = NULL, updated_at = ?
					 WHERE id = ? AND posicion_complementaria_id = ?`,
					[now, oldA_of_B, newBId]
				);
			}
			// 3. Vincular newB → A.
			await run(
				`UPDATE posiciones SET posicion_complementaria_id = ?, updated_at = ? WHERE id = ?`,
				[aId, now, newBId]
			);
		}

		// 4. Vincular A → newB (o NULL).
		await run(
			`UPDATE posiciones SET posicion_complementaria_id = ?, updated_at = ? WHERE id = ?`,
			[newBId, now, aId]
		);

		await run('COMMIT');
	} catch (err) {
		await run('ROLLBACK').catch(() => {
			// Si el ROLLBACK falla (transacción ya cerrada), priorizamos el
			// error original.
		});
		throw err;
	}
}
