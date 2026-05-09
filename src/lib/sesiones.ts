/**
 * CRUD de Sesiones sobre la BD de SQLite-WASM.
 * Cliente only — depende de `$lib/db`, que requiere browser.
 */

import { init, query, run } from '$lib/db';
import type { Sesion } from '$lib/types';

export type NewSesion = Omit<Sesion, 'id' | 'created_at' | 'updated_at'>;
export type SesionUpdate = Omit<Sesion, 'created_at' | 'updated_at'>;
export type SesionWithCount = Sesion & { rolls_count: number };

export async function listSesiones(): Promise<SesionWithCount[]> {
	await init();
	return query<SesionWithCount>(
		`SELECT s.*, COUNT(r.id) AS rolls_count
		 FROM sesiones s
		 LEFT JOIN rolls r ON r.sesion_id = s.id
		 GROUP BY s.id
		 ORDER BY s.fecha DESC, s.created_at DESC`
	);
}

export async function getSesion(id: string): Promise<Sesion | null> {
	await init();
	const rows = await query<Sesion>('SELECT * FROM sesiones WHERE id = ?', [id]);
	return rows[0] ?? null;
}

export async function createSesion(data: NewSesion): Promise<Sesion> {
	await init();
	const now = new Date().toISOString();
	const sesion: Sesion = {
		id: crypto.randomUUID(),
		...data,
		created_at: now,
		updated_at: now
	};
	await run(
		`INSERT INTO sesiones (id, fecha, tipo, foco, tecnica_clase, obs_profesor, created_at, updated_at)
		 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
		[
			sesion.id,
			sesion.fecha,
			sesion.tipo,
			sesion.foco ?? null,
			sesion.tecnica_clase ?? null,
			sesion.obs_profesor ?? null,
			sesion.created_at,
			sesion.updated_at
		]
	);
	return sesion;
}

export async function updateSesion(data: SesionUpdate): Promise<void> {
	await init();
	const now = new Date().toISOString();
	await run(
		`UPDATE sesiones
		 SET fecha = ?, tipo = ?, foco = ?, tecnica_clase = ?, obs_profesor = ?, updated_at = ?
		 WHERE id = ?`,
		[
			data.fecha,
			data.tipo,
			data.foco ?? null,
			data.tecnica_clase ?? null,
			data.obs_profesor ?? null,
			now,
			data.id
		]
	);
}

export async function deleteSesion(id: string): Promise<void> {
	await init();
	await run('DELETE FROM sesiones WHERE id = ?', [id]);
}
