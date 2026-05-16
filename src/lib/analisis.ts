/**
 * Consultas de análisis del PoC (T-5.it2).
 *
 * - C1 (`getProblemasRecurrentes`): posiciones y técnicas marcadas como
 *   `fallo` en los rolls de las últimas N sesiones (N ∈ {3, 5, 10}),
 *   agregadas por entidad y ordenadas por frecuencia descendente. Sin
 *   umbral mínimo de ocurrencias — todos los `fallo` cuentan.
 *
 * - C2 (`getCompanerosProblema`): compañeros contra los que el ratio
 *   `me_dominaron / total_rolls > 0.5`. Sin mínimo de rolls (decisión
 *   sesión 18; configurable en el futuro, anotado en MEJORAS_FUTURAS).
 *   Para cada compañero bandera incluye top-3 posiciones marcadas como
 *   `fallo` en sus rolls perdidos, como pista de "dónde pierdo".
 *
 * Cliente only — depende de `$lib/db`, que requiere browser.
 */

import { init, query } from '$lib/db';

export interface ProblemaPosicion {
	id: string;
	nombre: string;
	count: number;
}

export interface ProblemaTecnica {
	id: string;
	nombre: string;
	variante: string | null;
	posicion_origen_nombre: string;
	count: number;
}

export interface ProblemasRecurrentes {
	posiciones: ProblemaPosicion[];
	tecnicas: ProblemaTecnica[];
	/** Cuántas sesiones se han considerado realmente (puede ser < N si la
	 *  BD tiene menos sesiones que la ventana pedida). 0 si no hay datos. */
	sesiones_consideradas: number;
}

export interface PosicionDondePierdo {
	id: string;
	nombre: string;
	count: number;
}

export interface CompaneroProblema {
	companero_id: string;
	companero_nombre: string;
	total_rolls: number;
	derrotas: number;
	/** Ratio `derrotas / total_rolls`, entre 0 y 1. */
	pct: number;
	/** Top-3 posiciones marcadas como `fallo` en los rolls perdidos contra
	 *  este compañero. Array vacío si ningún roll perdido tiene posiciones
	 *  marcadas — en la UI se muestra como "sin posición registrada". */
	posiciones_donde_pierdo: PosicionDondePierdo[];
}

export async function getProblemasRecurrentes(
	N: 3 | 5 | 10
): Promise<ProblemasRecurrentes> {
	await init();

	const sesiones = await query<{ id: string }>(
		'SELECT id FROM sesiones ORDER BY fecha DESC LIMIT ?',
		[N]
	);

	if (sesiones.length === 0) {
		return { posiciones: [], tecnicas: [], sesiones_consideradas: 0 };
	}

	const sesionIds = sesiones.map((s) => s.id);
	const placeholders = sesionIds.map(() => '?').join(', ');

	const posiciones = await query<ProblemaPosicion>(
		`SELECT p.id, p.nombre, COUNT(*) AS count
		 FROM roll_posicion rp
		 JOIN rolls r ON rp.roll_id = r.id
		 JOIN posiciones p ON rp.posicion_id = p.id
		 WHERE rp.resultado = 'fallo' AND r.sesion_id IN (${placeholders})
		 GROUP BY p.id, p.nombre
		 ORDER BY count DESC, p.nombre`,
		sesionIds
	);

	const tecnicas = await query<ProblemaTecnica>(
		`SELECT t.id, t.nombre, t.variante, p.nombre AS posicion_origen_nombre, COUNT(*) AS count
		 FROM roll_tecnica rt
		 JOIN rolls r ON rt.roll_id = r.id
		 JOIN tecnicas t ON rt.tecnica_id = t.id
		 JOIN posiciones p ON t.posicion_origen_id = p.id
		 WHERE rt.resultado = 'fallo' AND r.sesion_id IN (${placeholders})
		 GROUP BY t.id, t.nombre, t.variante, p.nombre
		 ORDER BY count DESC, t.nombre`,
		sesionIds
	);

	return {
		posiciones,
		tecnicas,
		sesiones_consideradas: sesiones.length
	};
}

export async function getCompanerosProblema(): Promise<CompaneroProblema[]> {
	await init();

	// Stats globales por compañero. `HAVING pct > 0.5` filtra los que no
	// cruzan el umbral; el orden DESC por pct + derrotas pone los peores
	// arriba sin necesidad de re-ordenar en TS.
	const stats = await query<{
		companero_id: string;
		companero_nombre: string;
		total_rolls: number;
		derrotas: number;
		pct: number;
	}>(
		`SELECT
			c.id AS companero_id,
			c.nombre AS companero_nombre,
			COUNT(*) AS total_rolls,
			SUM(CASE WHEN r.resultado = 'me_dominaron' THEN 1 ELSE 0 END) AS derrotas,
			(SUM(CASE WHEN r.resultado = 'me_dominaron' THEN 1 ELSE 0 END) * 1.0 / COUNT(*)) AS pct
		 FROM rolls r
		 JOIN companeros c ON r.companero_id = c.id
		 WHERE r.companero_id IS NOT NULL
		 GROUP BY c.id, c.nombre
		 HAVING pct > 0.5
		 ORDER BY pct DESC, derrotas DESC`
	);

	if (stats.length === 0) return [];

	// Una sub-query por compañero bandera para top-3 posiciones donde
	// más se pierde. A nuestro volumen (≤decenas de compañeros bandera,
	// improbable) esto está sobrado; si en el futuro escala mal, se
	// reescribe como una sola query con window functions.
	const results: CompaneroProblema[] = [];
	for (const s of stats) {
		const posiciones = await query<PosicionDondePierdo>(
			`SELECT p.id, p.nombre, COUNT(*) AS count
			 FROM roll_posicion rp
			 JOIN rolls r ON rp.roll_id = r.id
			 JOIN posiciones p ON rp.posicion_id = p.id
			 WHERE rp.resultado = 'fallo'
			   AND r.companero_id = ?
			   AND r.resultado = 'me_dominaron'
			 GROUP BY p.id, p.nombre
			 ORDER BY count DESC, p.nombre
			 LIMIT 3`,
			[s.companero_id]
		);
		results.push({
			...s,
			posiciones_donde_pierdo: posiciones
		});
	}

	return results;
}
