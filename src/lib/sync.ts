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
import type {
	Companero,
	Posicion,
	Roll,
	Sesion,
	SumisionTerminal,
	Tecnica,
	TecnicaContra
} from '$lib/types';

export const CURRENT_SCHEMA_VERSION = 4;

// T-3.it2: filas de las tablas pivot `roll_tecnica` y `roll_posicion`.
// `resultado` es 'fue_bien' | 'fallo' (CHECK en SQL). La PK compuesta
// incluye `resultado` para permitir que una misma técnica/posición
// aparezca en ambos sets de un roll.
export type RollTecnicaRow = {
	roll_id: string;
	tecnica_id: string;
	resultado: 'fue_bien' | 'fallo';
};

export type RollPosicionRow = {
	roll_id: string;
	posicion_id: string;
	resultado: 'fue_bien' | 'fallo';
};

export type ExportPayload = {
	schema_version: number;
	exported_at: string;
	companeros: Companero[];
	sesiones: Sesion[];
	rolls: Roll[];
	posiciones: Posicion[];
	sumisiones_terminales: SumisionTerminal[];
	tecnicas: Tecnica[];
	tecnica_contras: TecnicaContra[];
	roll_posicion: RollPosicionRow[];
	roll_tecnica: RollTecnicaRow[];
};

export async function exportAll(): Promise<ExportPayload> {
	await init();
	const [
		companeros,
		sesiones,
		rolls,
		posiciones,
		sumisionesTerminales,
		tecnicas,
		tecnicaContras,
		rollPosicion,
		rollTecnica
	] = await Promise.all([
		query<Companero>('SELECT * FROM companeros ORDER BY created_at'),
		query<Sesion>('SELECT * FROM sesiones ORDER BY created_at'),
		query<Roll>('SELECT * FROM rolls ORDER BY created_at'),
		query<Posicion>('SELECT * FROM posiciones ORDER BY created_at'),
		query<SumisionTerminal>('SELECT * FROM sumisiones_terminales ORDER BY created_at'),
		query<Tecnica>('SELECT * FROM tecnicas ORDER BY created_at'),
		query<TecnicaContra>('SELECT * FROM tecnica_contras ORDER BY created_at'),
		query<RollPosicionRow>(
			'SELECT roll_id, posicion_id, resultado FROM roll_posicion ORDER BY roll_id, posicion_id, resultado'
		),
		query<RollTecnicaRow>(
			'SELECT roll_id, tecnica_id, resultado FROM roll_tecnica ORDER BY roll_id, tecnica_id, resultado'
		)
	]);
	return {
		schema_version: CURRENT_SCHEMA_VERSION,
		exported_at: new Date().toISOString(),
		companeros,
		sesiones,
		rolls,
		posiciones,
		sumisiones_terminales: sumisionesTerminales,
		tecnicas,
		tecnica_contras: tecnicaContras,
		roll_posicion: rollPosicion,
		roll_tecnica: rollTecnica
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
	const requiredArrays = [
		'companeros',
		'sesiones',
		'rolls',
		'posiciones',
		'sumisiones_terminales',
		'tecnicas',
		'tecnica_contras',
		'roll_posicion',
		'roll_tecnica'
	];
	for (const key of requiredArrays) {
		if (!Array.isArray(p[key])) {
			throw new Error(`Falta la tabla "${key}" en el JSON (o no es un array).`);
		}
	}
}

/**
 * Reemplaza TODA la BD con el contenido del payload.
 * Borra todas las tablas en orden de FK y luego inserta lo nuevo.
 * Si schema_version no coincide con CURRENT_SCHEMA_VERSION → throws.
 */
export async function importAll(payload: unknown): Promise<{
	companeros: number;
	sesiones: number;
	rolls: number;
	posiciones: number;
	sumisiones_terminales: number;
	tecnicas: number;
	tecnica_contras: number;
	roll_posicion: number;
	roll_tecnica: number;
}> {
	assertExportShape(payload);

	if (payload.schema_version !== CURRENT_SCHEMA_VERSION) {
		throw new Error(
			`Versión incompatible. El fichero usa schema_version=${payload.schema_version}, esta app espera ${CURRENT_SCHEMA_VERSION}.`
		);
	}

	await init();

	// Desactivamos FK durante el bulk import. Patrón estándar (pg_dump,
	// sqlite .dump): permite wipe+insert sin importar el orden y tolera
	// referencias huérfanas heredadas de exports previos. Tras el import,
	// `PRAGMA foreign_key_check` audita la integridad y reporta huérfanos
	// sin abortar — la app sigue funcional aunque haya datos inconsistentes.
	await run('PRAGMA foreign_keys = OFF');

	try {
		await run('BEGIN');
		try {
			// Wipe en orden FK (hijos antes que padres) — no estrictamente
			// necesario con FK OFF, pero mantenemos el orden por claridad.
			await run('DELETE FROM roll_tecnica');
			await run('DELETE FROM roll_posicion');
			await run('DELETE FROM tecnica_contras');
			await run('DELETE FROM tecnicas');
			await run('DELETE FROM rolls');
			await run('DELETE FROM sesiones');
			await run('DELETE FROM sumisiones_terminales');
			await run('DELETE FROM posiciones');
			await run('DELETE FROM companeros');

			await insertAll(payload);

			await run('COMMIT');
		} catch (e) {
			await run('ROLLBACK');
			throw e;
		}
	} finally {
		await run('PRAGMA foreign_keys = ON');
	}

	// Auditoría post-import: detecta filas huérfanas heredadas del JSON.
	// No aborta — solo log.
	const violations = await query<{ table: string; rowid: number; parent: string; fkid: number }>(
		'PRAGMA foreign_key_check'
	);
	if (violations.length > 0) {
		console.warn(
			`Import completado con ${violations.length} fila(s) con referencias huérfanas heredadas del JSON. Detalle:`,
			violations
		);
	}

	return {
		companeros: payload.companeros.length,
		sesiones: payload.sesiones.length,
		rolls: payload.rolls.length,
		posiciones: payload.posiciones.length,
		sumisiones_terminales: payload.sumisiones_terminales.length,
		tecnicas: payload.tecnicas.length,
		tecnica_contras: payload.tecnica_contras.length,
		roll_posicion: payload.roll_posicion.length,
		roll_tecnica: payload.roll_tecnica.length
	};
}

async function insertAll(payload: ExportPayload): Promise<void> {
	// Orden parent-first (no estrictamente necesario con FK OFF, pero
	// mantiene el INSERT legible y resiliente si en el futuro reactivamos
	// las FK durante el import).
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

	for (const p of payload.posiciones) {
		await run(
			`INSERT INTO posiciones (id, nombre, categoria, tipo, notas, posicion_complementaria_id, created_at, updated_at)
			 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
			[
				p.id,
				p.nombre,
				p.categoria,
				p.tipo ?? null,
				p.notas,
				p.posicion_complementaria_id ?? null,
				p.created_at,
				p.updated_at
			]
		);
	}

	for (const s of payload.sumisiones_terminales) {
		await run(
			`INSERT INTO sumisiones_terminales (id, nombre, notas, created_at, updated_at)
			 VALUES (?, ?, ?, ?, ?)`,
			[s.id, s.nombre, s.notas, s.created_at, s.updated_at]
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

	for (const t of payload.tecnicas) {
		await run(
			`INSERT INTO tecnicas (
				id, nombre, variante, posicion_origen_id, posicion_destino_id,
				sumision_destino_id, tipo, estado, detalles, errores_comunes,
				created_at, updated_at
			) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
			[
				t.id,
				t.nombre,
				t.variante ?? null,
				t.posicion_origen_id,
				t.posicion_destino_id ?? null,
				t.sumision_destino_id ?? null,
				t.tipo,
				t.estado,
				t.detalles,
				t.errores_comunes,
				t.created_at,
				t.updated_at
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

	for (const tc of payload.tecnica_contras) {
		await run(
			`INSERT INTO tecnica_contras (tecnica_id, contra_tecnica_id, created_at)
			 VALUES (?, ?, ?)`,
			[tc.tecnica_id, tc.contra_tecnica_id, tc.created_at]
		);
	}

	for (const rp of payload.roll_posicion) {
		await run(
			`INSERT INTO roll_posicion (roll_id, posicion_id, resultado)
			 VALUES (?, ?, ?)`,
			[rp.roll_id, rp.posicion_id, rp.resultado]
		);
	}

	for (const rt of payload.roll_tecnica) {
		await run(
			`INSERT INTO roll_tecnica (roll_id, tecnica_id, resultado)
			 VALUES (?, ?, ?)`,
			[rt.roll_id, rt.tecnica_id, rt.resultado]
		);
	}
}
