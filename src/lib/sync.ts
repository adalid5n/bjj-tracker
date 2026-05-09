/**
 * Export e Import de toda la BD a/desde JSON.
 * Cliente only — depende de `$lib/db`, que requiere browser.
 *
 * Modelo de uso (REQUISITOS §10.3):
 * - Sin merge selectivo. Import = wipe + replace.
 * - schema_version validado strict; mismatch → error claro.
 * - Para sync entre dispositivos hasta que llegue mecanismo automático.
 */

import { init, query, run } from '$lib/db';
import type { Companero, Roll, Sesion } from '$lib/types';

export const CURRENT_SCHEMA_VERSION = 1;

export type ExportPayload = {
	schema_version: number;
	exported_at: string;
	companeros: Companero[];
	sesiones: Sesion[];
	rolls: Roll[];
};

export async function exportAll(): Promise<ExportPayload> {
	await init();
	const [companeros, sesiones, rolls] = await Promise.all([
		query<Companero>('SELECT * FROM companeros ORDER BY created_at'),
		query<Sesion>('SELECT * FROM sesiones ORDER BY created_at'),
		query<Roll>('SELECT * FROM rolls ORDER BY created_at')
	]);
	return {
		schema_version: CURRENT_SCHEMA_VERSION,
		exported_at: new Date().toISOString(),
		companeros,
		sesiones,
		rolls
	};
}

export async function getSchemaVersion(): Promise<number> {
	await init();
	const rows = await query<{ value: string }>(
		"SELECT value FROM schema_meta WHERE key = 'version'"
	);
	return Number(rows[0]?.value ?? 0);
}

function assertExportShape(payload: unknown): asserts payload is ExportPayload {
	if (!payload || typeof payload !== 'object') {
		throw new Error('El fichero no parece un export válido (no es un objeto JSON).');
	}
	const p = payload as Record<string, unknown>;
	if (typeof p.schema_version !== 'number') {
		throw new Error('Falta el campo schema_version en el JSON.');
	}
	if (!Array.isArray(p.companeros) || !Array.isArray(p.sesiones) || !Array.isArray(p.rolls)) {
		throw new Error('Faltan tablas (companeros, sesiones, rolls) en el JSON.');
	}
}

/**
 * Reemplaza TODA la BD con el contenido del payload.
 * Borra companeros, sesiones y rolls en orden de FK y luego inserta lo nuevo.
 * Si schema_version no coincide con CURRENT_SCHEMA_VERSION → throws.
 */
export async function importAll(payload: unknown): Promise<{
	companeros: number;
	sesiones: number;
	rolls: number;
}> {
	assertExportShape(payload);

	if (payload.schema_version !== CURRENT_SCHEMA_VERSION) {
		throw new Error(
			`Versión incompatible. El fichero usa schema_version=${payload.schema_version}, esta app espera ${CURRENT_SCHEMA_VERSION}.`
		);
	}

	await init();

	// Wipe en orden FK (hijos antes que padres).
	await run('DELETE FROM rolls');
	await run('DELETE FROM sesiones');
	await run('DELETE FROM companeros');

	// Insert en orden inverso (padres antes que hijos).
	for (const c of payload.companeros) {
		await run(
			`INSERT INTO companeros (id, nombre, cinturon, peso_relativo, notas, created_at, updated_at)
			 VALUES (?, ?, ?, ?, ?, ?, ?)`,
			[
				c.id,
				c.nombre,
				c.cinturon ?? null,
				c.peso_relativo ?? null,
				c.notas ?? null,
				c.created_at,
				c.updated_at
			]
		);
	}

	for (const s of payload.sesiones) {
		await run(
			`INSERT INTO sesiones (id, fecha, tipo, foco, tecnica_clase, obs_profesor, created_at, updated_at)
			 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
			[
				s.id,
				s.fecha,
				s.tipo,
				s.foco ?? null,
				s.tecnica_clase ?? null,
				s.obs_profesor ?? null,
				s.created_at,
				s.updated_at
			]
		);
	}

	for (const r of payload.rolls) {
		await run(
			`INSERT INTO rolls (
				id, sesion_id, companero_id, orden, tamano_relativo, duracion_min,
				resultado, que_intente, que_fallo, posiciones_problema,
				created_at, updated_at
			) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
			[
				r.id,
				r.sesion_id,
				r.companero_id ?? null,
				r.orden,
				r.tamano_relativo ?? null,
				r.duracion_min ?? null,
				r.resultado ?? null,
				r.que_intente ?? null,
				r.que_fallo ?? null,
				r.posiciones_problema ?? null,
				r.created_at,
				r.updated_at
			]
		);
	}

	return {
		companeros: payload.companeros.length,
		sesiones: payload.sesiones.length,
		rolls: payload.rolls.length
	};
}
