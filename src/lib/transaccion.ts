/**
 * Transacción anidable sobre `run` (T-4.it7).
 *
 * `BEGIN` no se puede anidar en SQLite; `SAVEPOINT` sí: fuera de una
 * transacción abre una (y `RELEASE` la confirma), dentro de otra crea un
 * punto de retorno. Lo usan las operaciones que componen otras que ya
 * eran atómicas (p. ej. crear las dos copias de un elemento "Ambos", que
 * llama a `createPosicion` → `syncComplementaria`).
 *
 * Cliente only — depende de `$lib/db`.
 */

import { run } from '$lib/db';

let secuencia = 0;

export async function conSavepoint<T>(fn: () => Promise<T>): Promise<T> {
	const nombre = `sp_${++secuencia}`;
	await run(`SAVEPOINT ${nombre}`);
	try {
		const resultado = await fn();
		await run(`RELEASE ${nombre}`);
		return resultado;
	} catch (err) {
		// Deshace lo hecho desde el savepoint y lo cierra. Si fallan (la
		// transacción ya no existe), priorizamos el error original.
		await run(`ROLLBACK TO ${nombre}`).catch(() => {});
		await run(`RELEASE ${nombre}`).catch(() => {});
		throw err;
	}
}
