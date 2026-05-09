/**
 * CRUD de Compañeros sobre la BD de SQLite-WASM.
 * Cliente only — depende de `$lib/db`, que requiere browser.
 */

import { init, query, run } from '$lib/db';
import type { Companero } from '$lib/types';

export type NewCompanero = Omit<Companero, 'id' | 'created_at' | 'updated_at'>;
export type CompaneroUpdate = Omit<Companero, 'created_at' | 'updated_at'>;

export async function listCompaneros(): Promise<Companero[]> {
	await init();
	return query<Companero>('SELECT * FROM companeros ORDER BY nombre');
}

export async function createCompanero(data: NewCompanero): Promise<Companero> {
	await init();
	const now = new Date().toISOString();
	const companero: Companero = {
		id: crypto.randomUUID(),
		...data,
		created_at: now,
		updated_at: now
	};
	await run(
		`INSERT INTO companeros (id, nombre, cinturon, peso_relativo, notas, created_at, updated_at)
		 VALUES (?, ?, ?, ?, ?, ?, ?)`,
		[
			companero.id,
			companero.nombre,
			companero.cinturon ?? null,
			companero.peso_relativo ?? null,
			companero.notas ?? null,
			companero.created_at,
			companero.updated_at
		]
	);
	return companero;
}

export async function updateCompanero(data: CompaneroUpdate): Promise<void> {
	await init();
	const now = new Date().toISOString();
	await run(
		`UPDATE companeros
		 SET nombre = ?, cinturon = ?, peso_relativo = ?, notas = ?, updated_at = ?
		 WHERE id = ?`,
		[data.nombre, data.cinturon ?? null, data.peso_relativo ?? null, data.notas ?? null, now, data.id]
	);
}

export async function deleteCompanero(id: string): Promise<void> {
	await init();
	await run('DELETE FROM companeros WHERE id = ?', [id]);
}
