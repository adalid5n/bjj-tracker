/**
 * Gestión de contras entre técnicas. Relación N:N asimétrica:
 * "A contra de B" no implica "B contra de A".
 *
 * Semántica de la tabla `tecnica_contras`:
 *   (tecnica_id, contra_tecnica_id)  →  "contra_tecnica responde a tecnica"
 *
 *   - `getContras(X)`              → técnicas que contrarrestan a X (las contras DE X).
 *   - `getTecnicasQueContrarresta(X)` → técnicas para las que X es la contra
 *                                       (es decir, X las contrarresta).
 *
 * Cliente only — depende de `$lib/db`, que requiere browser.
 */

import { init, query, run } from '$lib/db';
import type { Tecnica } from '$lib/types';

/**
 * Añade `contraTecnicaId` como contra de `tecnicaId`. Idempotente:
 * re-añadir la misma contra no es un error.
 */
export async function addContra(tecnicaId: string, contraTecnicaId: string): Promise<void> {
	await init();
	const now = new Date().toISOString();
	await run(
		`INSERT OR IGNORE INTO tecnica_contras (tecnica_id, contra_tecnica_id, created_at)
		 VALUES (?, ?, ?)`,
		[tecnicaId, contraTecnicaId, now]
	);
}

export async function removeContra(tecnicaId: string, contraTecnicaId: string): Promise<void> {
	await init();
	await run(
		`DELETE FROM tecnica_contras
		 WHERE tecnica_id = ? AND contra_tecnica_id = ?`,
		[tecnicaId, contraTecnicaId]
	);
}

/**
 * Técnicas que contrarrestan a `tecnicaId` (las contras DE esta técnica).
 * Devuelve las técnicas-contra completas, no solo IDs.
 */
export async function getContras(tecnicaId: string): Promise<Tecnica[]> {
	await init();
	return query<Tecnica>(
		`SELECT t.*
		 FROM tecnica_contras tc
		 JOIN tecnicas t ON t.id = tc.contra_tecnica_id
		 WHERE tc.tecnica_id = ?
		 ORDER BY t.nombre`,
		[tecnicaId]
	);
}

/**
 * Técnicas para las que `tecnicaId` ES la contra (es decir, esta técnica
 * las contrarresta). Útil al ver una defensa y querer saber qué ataques
 * responde.
 *
 * Asimétrica: "A contra de B" no implica "B contra de A".
 */
export async function getTecnicasQueContrarresta(tecnicaId: string): Promise<Tecnica[]> {
	await init();
	return query<Tecnica>(
		`SELECT t.*
		 FROM tecnica_contras tc
		 JOIN tecnicas t ON t.id = tc.tecnica_id
		 WHERE tc.contra_tecnica_id = ?
		 ORDER BY t.nombre`,
		[tecnicaId]
	);
}
