/**
 * CRUD de Técnicas sobre la BD de SQLite-WASM, más consultas específicas
 * para el modal de mapa (técnicas por posición, variantes hermanas,
 * variaciones que llegan a una sumisión terminal).
 *
 * Cliente only — depende de `$lib/db`, que requiere browser.
 *
 * Validación de destino: el schema tiene un CHECK que exige exactamente
 * uno de (`posicion_destino_id`, `sumision_destino_id`) según `tipo`.
 * Antes de tocar BD validamos en TS y throweamos con un mensaje claro,
 * para evitar dejarle al caller el CHECK constraint críptico de SQLite.
 */

import { init, query, run } from '$lib/db';
import type { Tecnica, TipoTecnica } from '$lib/types';

export type NewTecnica = Omit<Tecnica, 'id' | 'created_at' | 'updated_at'>;
export type TecnicaUpdate = Omit<Tecnica, 'created_at' | 'updated_at'>;

function assertDestinoCoherente(data: Pick<Tecnica, 'tipo' | 'posicion_destino_id' | 'sumision_destino_id'>): void {
	const tienePosicion = !!data.posicion_destino_id;
	const tieneSumision = !!data.sumision_destino_id;
	if (data.tipo === 'sumision') {
		if (!tieneSumision) {
			throw new Error('Tipo "sumision" requiere sumision_destino_id');
		}
		if (tienePosicion) {
			throw new Error('Tipo "sumision" no admite posicion_destino_id (debe ser null)');
		}
	} else {
		if (!tienePosicion) {
			throw new Error(`Tipo "${data.tipo}" requiere posicion_destino_id`);
		}
		if (tieneSumision) {
			throw new Error(`Tipo "${data.tipo}" no admite sumision_destino_id (debe ser null)`);
		}
	}
}

export async function listTecnicas(): Promise<Tecnica[]> {
	await init();
	return query<Tecnica>('SELECT * FROM tecnicas ORDER BY nombre');
}

export async function getTecnica(id: string): Promise<Tecnica | null> {
	await init();
	const rows = await query<Tecnica>('SELECT * FROM tecnicas WHERE id = ?', [id]);
	return rows[0] ?? null;
}

export async function createTecnica(data: NewTecnica): Promise<Tecnica> {
	assertDestinoCoherente(data);
	await init();
	const now = new Date().toISOString();
	const tecnica: Tecnica = {
		id: crypto.randomUUID(),
		...data,
		created_at: now,
		updated_at: now
	};
	await run(
		`INSERT INTO tecnicas (
			id, nombre, variante, posicion_origen_id, posicion_destino_id,
			sumision_destino_id, tipo, estado, detalles, errores_comunes,
			created_at, updated_at
		) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		[
			tecnica.id,
			tecnica.nombre,
			tecnica.variante ?? null,
			tecnica.posicion_origen_id,
			tecnica.posicion_destino_id ?? null,
			tecnica.sumision_destino_id ?? null,
			tecnica.tipo,
			tecnica.estado,
			tecnica.detalles,
			tecnica.errores_comunes,
			tecnica.created_at,
			tecnica.updated_at
		]
	);
	return tecnica;
}

export async function updateTecnica(data: TecnicaUpdate): Promise<void> {
	assertDestinoCoherente(data);
	await init();
	const now = new Date().toISOString();
	await run(
		`UPDATE tecnicas
		 SET nombre = ?, variante = ?, posicion_origen_id = ?, posicion_destino_id = ?,
		     sumision_destino_id = ?, tipo = ?, estado = ?, detalles = ?, errores_comunes = ?,
		     updated_at = ?
		 WHERE id = ?`,
		[
			data.nombre,
			data.variante ?? null,
			data.posicion_origen_id,
			data.posicion_destino_id ?? null,
			data.sumision_destino_id ?? null,
			data.tipo,
			data.estado,
			data.detalles,
			data.errores_comunes,
			now,
			data.id
		]
	);
}

export async function deleteTecnica(id: string): Promise<void> {
	await init();
	await run('DELETE FROM tecnicas WHERE id = ?', [id]);
}

/**
 * Todas las técnicas que salen de una posición concreta.
 * Útil para mostrar el modal de posición con todas sus salidas.
 */
export async function getTecnicasByPosicion(posicionOrigenId: string): Promise<Tecnica[]> {
	await init();
	return query<Tecnica>(
		'SELECT * FROM tecnicas WHERE posicion_origen_id = ? ORDER BY tipo, nombre',
		[posicionOrigenId]
	);
}

/**
 * Técnicas de una posición filtradas por tipo (para los tabs del modal
 * de posición: Ataques | Sweeps | Escapes | Transiciones | Sumisiones).
 */
export async function getTecnicasByPosicionYTipo(
	posicionOrigenId: string,
	tipo: TipoTecnica
): Promise<Tecnica[]> {
	await init();
	return query<Tecnica>(
		'SELECT * FROM tecnicas WHERE posicion_origen_id = ? AND tipo = ? ORDER BY nombre',
		[posicionOrigenId, tipo]
	);
}

/**
 * "Otras variantes de [nombre]": aristas hermanas con el mismo nombre pero
 * distinto origen y/o variante. Excluye la técnica desde la que se llama.
 *
 * Orden: por origen y luego variante (las técnicas sin variante primero,
 * gracias a `variante IS NOT NULL` que ordena NULL antes que cualquier valor).
 */
export async function getOtrasVariantes(nombre: string, excluirId: string): Promise<Tecnica[]> {
	await init();
	return query<Tecnica>(
		`SELECT * FROM tecnicas
		 WHERE nombre = ? AND id != ?
		 ORDER BY posicion_origen_id, variante IS NOT NULL, variante`,
		[nombre, excluirId]
	);
}

/**
 * Variaciones que terminan en una sumisión concreta. Para el modal de
 * sumisión terminal, donde se listan agrupadas por origen.
 */
export async function getTecnicasQueLleganASumision(sumisionId: string): Promise<Tecnica[]> {
	await init();
	return query<Tecnica>(
		'SELECT * FROM tecnicas WHERE sumision_destino_id = ? ORDER BY posicion_origen_id, nombre',
		[sumisionId]
	);
}

/**
 * Cuenta cuántas técnicas tienen una sumisión como destino. Se usa para
 * decidir si se puede borrar la sumisión sin orfanizar referencias
 * (análogo a `countRollsByPosicion` en `rolls.ts`).
 *
 * Convención del proyecto: alias en lowercase (el worker preserva el
 * case del alias tal cual).
 */
export async function countTecnicasBySumisionDestino(sumisionId: string): Promise<number> {
	await init();
	const rows = await query<{ n: number }>(
		'SELECT COUNT(*) AS n FROM tecnicas WHERE sumision_destino_id = ?',
		[sumisionId]
	);
	return rows[0]?.n ?? 0;
}
