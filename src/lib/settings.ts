/**
 * DAO mínimo para la tabla `app_settings` (key/value genérica).
 * Cliente only — depende de `$lib/db`, que requiere browser.
 *
 * Introducido en T-1.it6 para alojar el flag `modo_avanzado`. Si en el
 * futuro se añaden más flags, se siguen guardando aquí; no hace falta
 * tabla específica por cada una. La capa de tipado vive en
 * `settings.svelte.ts` (state reactivo).
 *
 * API mínima a propósito: la app no necesita listar todas las settings
 * ni borrarlas — solo leer y actualizar. UPSERT con `INSERT ... ON
 * CONFLICT DO UPDATE` (SQLite 3.24+) para que `setSetting` funcione
 * indistintamente si la key ya existe (caso normal: seedeada por la
 * migración) o no (caso futuro: nueva flag añadida desde código sin
 * migración).
 */
import { init, query, run } from '$lib/db';

type Row = { value: string };

export async function getSetting(key: string): Promise<string | null> {
	await init();
	const rows = await query<Row>('SELECT value FROM app_settings WHERE key = ?', [key]);
	return rows[0]?.value ?? null;
}

export async function setSetting(key: string, value: string): Promise<void> {
	await init();
	await run(
		`INSERT INTO app_settings (key, value) VALUES (?, ?)
		 ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
		[key, value]
	);
}
