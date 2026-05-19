/**
 * CRUD de Rolls sobre la BD de SQLite-WASM.
 * Cliente only — depende de `$lib/db`, que requiere browser.
 */

import { init, query, run } from '$lib/db';
import type { ResultadoRoll, Roll, TipoSesion } from '$lib/types';

export type NewRoll = Omit<Roll, 'id' | 'orden' | 'created_at' | 'updated_at'>;
export type RollUpdate = Omit<Roll, 'orden' | 'created_at' | 'updated_at'>;

/**
 * Resultado simétrico de un vínculo de roll con técnica/posición (T-3.it2).
 * - `fue_bien`: a la hora del roll, la técnica/posición salió bien.
 * - `fallo`: la técnica/posición no salió o el owner tuvo problemas.
 * La misma técnica/posición puede aparecer en ambos sets a la vez en un
 * mismo roll (la PK compuesta incluye `resultado`).
 */
export type RolResultado = 'fue_bien' | 'fallo';

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
	// T-13: filtra rolls cuya relación `roll_posicion` incluya al menos
	// una de las posiciones indicadas (cualquier resultado). Si está vacío
	// o ausente, no se aplica ningún filtro por posición.
	posicion_ids?: string[];
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
	if (filters.posicion_ids && filters.posicion_ids.length > 0) {
		// T-13: roll válido si tiene AL MENOS una posición entre las
		// seleccionadas (OR, no AND), sin importar el resultado. Subquery
		// con EXISTS para evitar duplicar filas de roll por cada match.
		// Placeholders dinámicos según cardinalidad del array.
		const placeholders = filters.posicion_ids.map(() => '?').join(', ');
		where.push(
			`EXISTS (
				SELECT 1 FROM roll_posicion rp
				WHERE rp.roll_id = r.id AND rp.posicion_id IN (${placeholders})
			)`
		);
		params.push(...filters.posicion_ids);
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
		 ORDER BY s.fecha DESC, r.created_at DESC`,
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
 * Cuenta cuántos rolls referencian una posición (en cualquier resultado).
 * Se usa para decidir si se puede borrar la posición sin orfanizar
 * referencias en `roll_posicion`.
 *
 * Convención del proyecto: alias en lowercase (como `rolls_count` en
 * `sesiones.ts`) — el worker preserva el case del alias tal cual.
 */
export async function countRollsByPosicion(posicionId: string): Promise<number> {
	await init();
	const rows = await query<{ count: number }>(
		'SELECT COUNT(*) AS count FROM roll_posicion WHERE posicion_id = ?',
		[posicionId]
	);
	return rows[0]?.count ?? 0;
}

/**
 * T-3.it2: reemplaza el conjunto de técnicas vinculadas al roll, separadas
 * por resultado (fue bien / falló). Operación atómica (BEGIN/COMMIT con
 * ROLLBACK en caso de error). Borrado total + reinserción — patrón simple
 * y predecible.
 *
 * Permite que la misma `tecnica_id` aparezca a la vez en `fueBien` y en
 * `fallaron` del mismo roll (la PK `(roll_id, tecnica_id, resultado)` lo
 * tolera porque el resultado difiere). De-duplicamos cada array por
 * separado para evitar conflictos con la PK dentro de un mismo resultado.
 */
export async function setTecnicasDelRoll(
	rollId: string,
	fueBien: string[],
	fallaron: string[]
): Promise<void> {
	await init();
	const fueBienUnicas = Array.from(new Set(fueBien));
	const fallaronUnicas = Array.from(new Set(fallaron));
	await run('BEGIN');
	try {
		await run('DELETE FROM roll_tecnica WHERE roll_id = ?', [rollId]);
		for (const tecnicaId of fueBienUnicas) {
			await run(
				'INSERT INTO roll_tecnica (roll_id, tecnica_id, resultado) VALUES (?, ?, ?)',
				[rollId, tecnicaId, 'fue_bien']
			);
		}
		for (const tecnicaId of fallaronUnicas) {
			await run(
				'INSERT INTO roll_tecnica (roll_id, tecnica_id, resultado) VALUES (?, ?, ?)',
				[rollId, tecnicaId, 'fallo']
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
 * T-3.it2: devuelve los ids de técnicas vinculados a un roll separados por
 * resultado. Orden estable por nombre de técnica para que la UI siempre
 * pinte los chips en el mismo orden entre recargas.
 */
export async function getTecnicasDelRoll(
	rollId: string
): Promise<{ fueBien: string[]; fallaron: string[] }> {
	await init();
	const rows = await query<{ tecnica_id: string; resultado: RolResultado }>(
		`SELECT rt.tecnica_id AS tecnica_id, rt.resultado AS resultado
		 FROM roll_tecnica rt
		 JOIN tecnicas t ON t.id = rt.tecnica_id
		 WHERE rt.roll_id = ?
		 ORDER BY t.nombre`,
		[rollId]
	);
	const fueBien: string[] = [];
	const fallaron: string[] = [];
	for (const r of rows) {
		if (r.resultado === 'fue_bien') fueBien.push(r.tecnica_id);
		else fallaron.push(r.tecnica_id);
	}
	return { fueBien, fallaron };
}

/**
 * T-3.it2: variante batch para listados (`/rolls`, `/sesion/[id]`). Devuelve
 * un mapa `rollId → { fueBien, fallaron }` con los ids de técnicas
 * agrupados por resultado. Si `rollIds` está vacío, devuelve un Map vacío
 * sin tocar la BD.
 *
 * NOTA: devuelve solo ids. La UI hace el lookup contra un catálogo
 * precargado de `listTecnicas()` para pintar nombres.
 */
export async function getTecnicasDelRollBatch(
	rollIds: string[]
): Promise<Map<string, { fueBien: string[]; fallaron: string[] }>> {
	const resultado = new Map<string, { fueBien: string[]; fallaron: string[] }>();
	if (rollIds.length === 0) return resultado;
	await init();

	const placeholders = rollIds.map(() => '?').join(', ');
	const rows = await query<{
		roll_id: string;
		tecnica_id: string;
		resultado: RolResultado;
	}>(
		`SELECT rt.roll_id AS roll_id, rt.tecnica_id AS tecnica_id, rt.resultado AS resultado
		 FROM roll_tecnica rt
		 JOIN tecnicas t ON t.id = rt.tecnica_id
		 WHERE rt.roll_id IN (${placeholders})
		 ORDER BY t.nombre`,
		rollIds
	);

	for (const r of rows) {
		let entry = resultado.get(r.roll_id);
		if (!entry) {
			entry = { fueBien: [], fallaron: [] };
			resultado.set(r.roll_id, entry);
		}
		if (r.resultado === 'fue_bien') entry.fueBien.push(r.tecnica_id);
		else entry.fallaron.push(r.tecnica_id);
	}
	return resultado;
}

/**
 * T-3.it2: reemplaza el conjunto de posiciones vinculadas al roll, separadas
 * por resultado (fue bien / falló). Misma semántica y patrón que
 * `setTecnicasDelRoll` (atomic BEGIN/COMMIT, dedupe por set, INSERT por
 * fila). Una misma posición puede aparecer en ambos sets de un mismo roll
 * (la PK `(roll_id, posicion_id, resultado)` lo permite).
 *
 * Sustituye a la antigua `setPosicionesProblema`, que solo cubría el caso
 * "donde tuve problema" (ahora representado como `fallaron`).
 */
export async function setPosicionesDelRoll(
	rollId: string,
	fueBien: string[],
	fallaron: string[]
): Promise<void> {
	await init();
	const fueBienUnicas = Array.from(new Set(fueBien));
	const fallaronUnicas = Array.from(new Set(fallaron));
	await run('BEGIN');
	try {
		await run('DELETE FROM roll_posicion WHERE roll_id = ?', [rollId]);
		for (const posicionId of fueBienUnicas) {
			await run(
				'INSERT INTO roll_posicion (roll_id, posicion_id, resultado) VALUES (?, ?, ?)',
				[rollId, posicionId, 'fue_bien']
			);
		}
		for (const posicionId of fallaronUnicas) {
			await run(
				'INSERT INTO roll_posicion (roll_id, posicion_id, resultado) VALUES (?, ?, ?)',
				[rollId, posicionId, 'fallo']
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
 * T-3.it2: devuelve los ids de posiciones vinculadas a un roll separados
 * por resultado. Orden estable por nombre de posición para que los chips
 * salgan deterministas entre recargas.
 */
export async function getPosicionesDelRoll(
	rollId: string
): Promise<{ fueBien: string[]; fallaron: string[] }> {
	await init();
	const rows = await query<{ posicion_id: string; resultado: RolResultado }>(
		`SELECT rp.posicion_id AS posicion_id, rp.resultado AS resultado
		 FROM roll_posicion rp
		 JOIN posiciones p ON p.id = rp.posicion_id
		 WHERE rp.roll_id = ?
		 ORDER BY p.nombre`,
		[rollId]
	);
	const fueBien: string[] = [];
	const fallaron: string[] = [];
	for (const r of rows) {
		if (r.resultado === 'fue_bien') fueBien.push(r.posicion_id);
		else fallaron.push(r.posicion_id);
	}
	return { fueBien, fallaron };
}

/**
 * T-3.it2: variante batch para listados. Devuelve un mapa
 * `rollId → { fueBien, fallaron }` con los ids de posiciones por
 * resultado. Si `rollIds` está vacío, devuelve un Map vacío sin tocar BD.
 *
 * La UI resuelve los ids contra un catálogo precargado (`listPosiciones()`)
 * para pintar nombres en los chips.
 */
export async function getPosicionesDelRollBatch(
	rollIds: string[]
): Promise<Map<string, { fueBien: string[]; fallaron: string[] }>> {
	const resultado = new Map<string, { fueBien: string[]; fallaron: string[] }>();
	if (rollIds.length === 0) return resultado;
	await init();

	const placeholders = rollIds.map(() => '?').join(', ');
	const rows = await query<{
		roll_id: string;
		posicion_id: string;
		resultado: RolResultado;
	}>(
		`SELECT rp.roll_id AS roll_id, rp.posicion_id AS posicion_id, rp.resultado AS resultado
		 FROM roll_posicion rp
		 JOIN posiciones p ON p.id = rp.posicion_id
		 WHERE rp.roll_id IN (${placeholders})
		 ORDER BY p.nombre`,
		rollIds
	);

	for (const r of rows) {
		let entry = resultado.get(r.roll_id);
		if (!entry) {
			entry = { fueBien: [], fallaron: [] };
			resultado.set(r.roll_id, entry);
		}
		if (r.resultado === 'fue_bien') entry.fueBien.push(r.posicion_id);
		else entry.fallaron.push(r.posicion_id);
	}
	return resultado;
}
