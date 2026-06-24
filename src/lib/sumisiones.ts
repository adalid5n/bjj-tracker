/**
 * CRUD de Sumisiones terminales sobre la BD de SQLite-WASM.
 * Cliente only — depende de `$lib/db`, que requiere browser.
 *
 * Nota: `nombre` es UNIQUE en BD. Si el caller intenta crear/actualizar
 * con un nombre ya existente, SQLite levantará un error que se propaga
 * sin envoltura; la UI decide cómo presentarlo al usuario.
 */

import { init, query, run } from '$lib/db';
import { deleteLayout } from '$lib/grafo-layout';
import type { SumisionTerminal } from '$lib/types';

export type NewSumisionTerminal = Omit<SumisionTerminal, 'id' | 'created_at' | 'updated_at'>;
export type SumisionTerminalUpdate = Omit<SumisionTerminal, 'created_at' | 'updated_at'>;

export async function listSumisiones(): Promise<SumisionTerminal[]> {
	await init();
	return query<SumisionTerminal>('SELECT * FROM sumisiones_terminales ORDER BY nombre');
}

export async function getSumision(id: string): Promise<SumisionTerminal | null> {
	await init();
	const rows = await query<SumisionTerminal>(
		'SELECT * FROM sumisiones_terminales WHERE id = ?',
		[id]
	);
	return rows[0] ?? null;
}

export async function createSumision(data: NewSumisionTerminal): Promise<SumisionTerminal> {
	await init();
	const now = new Date().toISOString();
	const sumision: SumisionTerminal = {
		id: crypto.randomUUID(),
		...data,
		created_at: now,
		updated_at: now
	};
	await run(
		`INSERT INTO sumisiones_terminales (id, nombre, notas, disciplina, created_at, updated_at)
		 VALUES (?, ?, ?, ?, ?, ?)`,
		[sumision.id, sumision.nombre, sumision.notas, sumision.disciplina, sumision.created_at, sumision.updated_at]
	);
	return sumision;
}

export async function updateSumision(data: SumisionTerminalUpdate): Promise<void> {
	await init();
	const now = new Date().toISOString();
	await run(
		`UPDATE sumisiones_terminales
		 SET nombre = ?, notas = ?, disciplina = ?, updated_at = ?
		 WHERE id = ?`,
		[data.nombre, data.notas, data.disciplina, now, data.id]
	);
}

export async function deleteSumision(id: string): Promise<void> {
	await init();
	await run('DELETE FROM sumisiones_terminales WHERE id = ?', [id]);
	// Limpieza del layout del grafo (T-9.it3). `grafo_layout` no tiene FK
	// porque apunta a dos tablas; el huérfano se elimina aquí en TS.
	await deleteLayout(id, 'sumision');
}
