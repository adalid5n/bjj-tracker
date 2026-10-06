/**
 * Historial de importaciones de clase (T-2.it7, schema v10).
 * Cliente only — depende de `$lib/db`, que requiere browser.
 *
 * Cada entrada guarda SOLO el último texto analizado y lo aceptado
 * (lo creado de verdad en el catálogo, como JSON con ids + nombres), más
 * metadatos: título, origen del título, estado, error y fechas. El texto
 * interpretado y la propuesta de la IA no se guardan (decisión del owner).
 */

import { init, query, run } from '$lib/db';
import type { SqlValue } from '$lib/db/types';
import type { CategoriaPosicion, TipoTecnica } from '$lib/types';

export type EstadoImportacion = 'importada' | 'sin_terminar' | 'fallo';
export type TituloOrigen = 'ia' | 'texto';

export type AceptadoPosicion = { id: string; nombre: string; categoria: CategoriaPosicion };
export type AceptadoSumision = { id: string; nombre: string };
export type AceptadoTecnica = {
	id: string;
	nombre: string;
	tipo: TipoTecnica;
	origen: string;
	destino: string;
};

export type Aceptado = {
	posiciones: AceptadoPosicion[];
	sumisiones: AceptadoSumision[];
	tecnicas: AceptadoTecnica[];
};

/** Fila tal cual vive en SQL (y en el fichero de copia de seguridad). */
export type ImportacionRow = {
	id: string;
	created_at: string;
	updated_at: string;
	titulo: string;
	titulo_origen: TituloOrigen;
	texto: string;
	aceptado_json: string | null;
	estado: EstadoImportacion;
	error: string | null;
};

export type ImportacionPatch = Partial<
	Pick<ImportacionRow, 'titulo' | 'titulo_origen' | 'texto' | 'estado' | 'error'>
> & { aceptado?: Aceptado | null };

/** Título de respaldo: primeras ~6 palabras del texto analizado. */
export function tituloDeRespaldo(texto: string, palabras = 6): string {
	const ws = texto.trim().split(/\s+/).filter(Boolean);
	if (ws.length === 0) return 'Importación';
	const base = ws.slice(0, palabras).join(' ');
	return ws.length > palabras ? `${base}…` : base;
}

export async function createImportacion(texto: string): Promise<ImportacionRow> {
	await init();
	const now = new Date().toISOString();
	const row: ImportacionRow = {
		id: crypto.randomUUID(),
		created_at: now,
		updated_at: now,
		titulo: tituloDeRespaldo(texto),
		titulo_origen: 'texto',
		texto,
		aceptado_json: null,
		estado: 'sin_terminar',
		error: null
	};
	await run(
		`INSERT INTO importaciones (id, created_at, updated_at, titulo, titulo_origen, texto, aceptado_json, estado, error)
		 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		[
			row.id,
			row.created_at,
			row.updated_at,
			row.titulo,
			row.titulo_origen,
			row.texto,
			row.aceptado_json,
			row.estado,
			row.error
		]
	);
	return row;
}

export async function getImportacion(id: string): Promise<ImportacionRow | null> {
	await init();
	const rows = await query<ImportacionRow>('SELECT * FROM importaciones WHERE id = ?', [id]);
	return rows[0] ?? null;
}

export async function updateImportacion(id: string, patch: ImportacionPatch): Promise<void> {
	await init();
	const sets: string[] = [];
	const params: SqlValue[] = [];
	const campos = ['titulo', 'titulo_origen', 'texto', 'estado', 'error'] as const;
	for (const campo of campos) {
		if (patch[campo] !== undefined) {
			sets.push(`${campo} = ?`);
			params.push(patch[campo] as SqlValue);
		}
	}
	if (patch.aceptado !== undefined) {
		sets.push('aceptado_json = ?');
		params.push(patch.aceptado ? JSON.stringify(patch.aceptado) : null);
	}
	sets.push('updated_at = ?');
	params.push(new Date().toISOString());
	params.push(id);
	await run(`UPDATE importaciones SET ${sets.join(', ')} WHERE id = ?`, params);
}

export async function listImportaciones(): Promise<ImportacionRow[]> {
	await init();
	return query<ImportacionRow>('SELECT * FROM importaciones ORDER BY created_at DESC');
}

export async function deleteImportacion(id: string): Promise<void> {
	await init();
	await run('DELETE FROM importaciones WHERE id = ?', [id]);
}

// --- Helpers puros ---------------------------------------------------------

export function aceptadoVacio(): Aceptado {
	return { posiciones: [], sumisiones: [], tecnicas: [] };
}

/** Parsea `aceptado_json` de forma tolerante (null / JSON roto → null). */
export function parseAceptado(json: string | null | undefined): Aceptado | null {
	if (!json) return null;
	try {
		const v = JSON.parse(json) as Partial<Aceptado>;
		return {
			posiciones: Array.isArray(v.posiciones) ? v.posiciones : [],
			sumisiones: Array.isArray(v.sumisiones) ? v.sumisiones : [],
			tecnicas: Array.isArray(v.tecnicas) ? v.tecnicas : []
		};
	} catch {
		return null;
	}
}

function unirSinDuplicar<T extends { id: string }>(previo: T[], nuevo: T[]): T[] {
	const ids = new Set(previo.map((x) => x.id));
	return [...previo, ...nuevo.filter((x) => !ids.has(x.id))];
}

/** Suma lo nuevo a lo aceptado previo sin duplicar por id. */
export function mergeAceptado(previo: Aceptado | null, nuevo: Aceptado): Aceptado {
	if (!previo) return nuevo;
	return {
		posiciones: unirSinDuplicar(previo.posiciones, nuevo.posiciones),
		sumisiones: unirSinDuplicar(previo.sumisiones, nuevo.sumisiones),
		tecnicas: unirSinDuplicar(previo.tecnicas, nuevo.tecnicas)
	};
}

const CATEGORIA_LABEL: Record<CategoriaPosicion, string> = {
	guardia: 'Guardia',
	control: 'Control',
	transicion: 'Transición',
	otro: 'Otro'
};

const TIPO_TECNICA_LABEL: Record<TipoTecnica, string> = {
	ataque: 'Ataque',
	sweep: 'Sweep',
	escape: 'Escape',
	transicion: 'Transición',
	sumision: 'Sumisión'
};

/** Lista legible (sin JSON) de lo aceptado, una línea por elemento. */
export function formatAceptadoLegible(aceptado: Aceptado): string {
	const bloques: string[] = [];
	if (aceptado.posiciones.length > 0) {
		bloques.push(
			[
				'Posiciones nuevas:',
				...aceptado.posiciones.map(
					(p) => `- ${p.nombre} (${CATEGORIA_LABEL[p.categoria] ?? p.categoria})`
				)
			].join('\n')
		);
	}
	if (aceptado.sumisiones.length > 0) {
		bloques.push(
			['Sumisiones nuevas:', ...aceptado.sumisiones.map((s) => `- ${s.nombre}`)].join('\n')
		);
	}
	if (aceptado.tecnicas.length > 0) {
		bloques.push(
			[
				'Técnicas:',
				...aceptado.tecnicas.map(
					(t) =>
						`- ${t.nombre}: ${t.origen} → ${t.destino} (${TIPO_TECNICA_LABEL[t.tipo] ?? t.tipo})`
				)
			].join('\n')
		);
	}
	return bloques.length > 0 ? bloques.join('\n\n') : 'No se creó ningún elemento nuevo.';
}
