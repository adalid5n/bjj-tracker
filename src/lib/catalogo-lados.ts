/**
 * Creación en las dos disciplinas (T-4.it7, change `ambos-como-copias`).
 *
 * "Ambos" ya no se guarda en el catálogo: es un atajo que crea DOS
 * elementos independientes, uno de BJJ y otro de Grappling. Este módulo
 * envuelve los `create*` de cada entidad para:
 *  - crear las dos copias de forma atómica (`conSavepoint`, anidable con
 *    `syncComplementaria`);
 *  - buscar la contraparte de un elemento en la otra disciplina por nombre
 *    normalizado (`trim` + minúsculas; si hay varias, la más antigua), y
 *  - crear en la otra disciplina lo que le falte a una técnica "Ambos"
 *    (origen o destino), devolviendo lo creado para avisar al usuario.
 *
 * Cliente only — depende de `$lib/db`.
 */

import { init, query } from '$lib/db';
import { createPosicion, type NewPosicion } from '$lib/posiciones';
import { createSumision } from '$lib/sumisiones';
import { createTecnica, type NewTecnica } from '$lib/tecnicas';
import { getTagsForPosicion, setTagsForPosicion } from '$lib/tags';
import { conSavepoint } from '$lib/transaccion';
import { normalizarNombre } from '$lib/separar-ambos';
import type {
	Disciplina,
	DisciplinaCatalogo,
	Posicion,
	SumisionTerminal,
	Tecnica
} from '$lib/types';

export type Lado = DisciplinaCatalogo;
export const LADOS: Lado[] = ['bjj', 'grappling'];

export const DISCIPLINA_LABEL: Record<Disciplina, string> = {
	bjj: 'BJJ',
	grappling: 'Grappling',
	ambos: 'Ambos'
};

export function otroLado(l: Lado): Lado {
	return l === 'bjj' ? 'grappling' : 'bjj';
}

/**
 * Lados en que se crea un elemento con la disciplina `d`, con
 * `preferido` primero cuando `d` es "Ambos" (su copia es la que se abre o
 * se enlaza después).
 */
export function ladosDe(d: Disciplina, preferido: Lado): Lado[] {
	if (d !== 'ambos') return [d];
	return [preferido, otroLado(preferido)];
}

/** Elemento creado solo para completar la otra disciplina (aviso al usuario). */
export type CreadoParaCompletar = {
	kind: 'posicion' | 'sumision';
	nombre: string;
	disciplina: Lado;
};

/** Texto del aviso: `"Mount" (posición) se creó también en Grappling.` */
export function textoAvisoCreados(creados: CreadoParaCompletar[]): string {
	if (creados.length === 0) return '';
	const partes = creados.map(
		(c) =>
			`"${c.nombre}" (${c.kind === 'posicion' ? 'posición' : 'sumisión'}) en ${DISCIPLINA_LABEL[c.disciplina]}`
	);
	return `Para completar la otra disciplina se creó: ${partes.join(', ')}.`;
}

function masAntiguo<T extends { created_at: string; id: string }>(a: T, b: T): number {
	if (a.created_at !== b.created_at) return a.created_at < b.created_at ? -1 : 1;
	return a.id < b.id ? -1 : 1;
}

export async function buscarPosicionPorNombre(
	nombre: string,
	lado: Lado,
	filtro?: (p: Posicion) => boolean
): Promise<Posicion | null> {
	await init();
	const n = normalizarNombre(nombre);
	const rows = await query<Posicion>('SELECT * FROM posiciones WHERE disciplina = ?', [lado]);
	return (
		rows
			.filter((p) => normalizarNombre(p.nombre) === n && (!filtro || filtro(p)))
			.sort(masAntiguo)[0] ?? null
	);
}

export async function buscarSumisionPorNombre(
	nombre: string,
	lado: Lado
): Promise<SumisionTerminal | null> {
	await init();
	const n = normalizarNombre(nombre);
	const rows = await query<SumisionTerminal>(
		'SELECT * FROM sumisiones_terminales WHERE disciplina = ?',
		[lado]
	);
	return rows.filter((s) => normalizarNombre(s.nombre) === n).sort(masAntiguo)[0] ?? null;
}

// ---------------------------------------------------------------------------
// Posiciones
// ---------------------------------------------------------------------------

export type DatosPosicion = Omit<NewPosicion, 'disciplina' | 'posicion_complementaria_id'>;

/**
 * Crea la posición en la disciplina `d` (dos copias si es "Ambos").
 *
 * Complementaria: `complementariaId` se eligió en la lista de `ladoLista`
 * (la disciplina elegida o, con "Ambos", la preferida). La copia de la otra
 * disciplina se vincula con la posición LIBRE del mismo nombre que esa
 * complementaria en su disciplina, si existe; si no, queda sin
 * complementaria (design §5).
 */
export async function crearPosicionEnLados(
	data: DatosPosicion,
	d: Disciplina,
	opts: { preferido: Lado; tagIds: string[]; complementariaId: string | null }
): Promise<Partial<Record<Lado, Posicion>>> {
	await init();
	const lados = ladosDe(d, opts.preferido);
	const ladoLista = lados[0];
	let nombreComplementaria: string | null = null;
	if (opts.complementariaId && lados.length > 1) {
		const rows = await query<Posicion>('SELECT * FROM posiciones WHERE id = ?', [
			opts.complementariaId
		]);
		nombreComplementaria = rows[0]?.nombre ?? null;
	}
	return conSavepoint(async () => {
		const creadas: Partial<Record<Lado, Posicion>> = {};
		for (const lado of lados) {
			let complementaria: string | null = null;
			if (lado === ladoLista) {
				complementaria = opts.complementariaId;
			} else if (nombreComplementaria) {
				const libre = await buscarPosicionPorNombre(
					nombreComplementaria,
					lado,
					(p) => !p.posicion_complementaria_id
				);
				complementaria = libre?.id ?? null;
			}
			const p = await createPosicion({
				...data,
				disciplina: lado,
				posicion_complementaria_id: complementaria
			});
			if (opts.tagIds.length > 0) await setTagsForPosicion(p.id, opts.tagIds);
			creadas[lado] = p;
		}
		return creadas;
	});
}

// ---------------------------------------------------------------------------
// Sumisiones
// ---------------------------------------------------------------------------

export async function crearSumisionEnLados(
	data: { nombre: string; notas: string },
	d: Disciplina,
	opts: { preferido: Lado }
): Promise<Partial<Record<Lado, SumisionTerminal>>> {
	await init();
	return conSavepoint(async () => {
		const creadas: Partial<Record<Lado, SumisionTerminal>> = {};
		for (const lado of ladosDe(d, opts.preferido)) {
			creadas[lado] = await createSumision({ ...data, disciplina: lado });
		}
		return creadas;
	});
}

// ---------------------------------------------------------------------------
// Técnicas
// ---------------------------------------------------------------------------

/**
 * Contraparte de una posición en `lado`: la misma si ya es de ese lado; si
 * no, la del mismo nombre normalizado (la más antigua) o, si no hay, una
 * copia nueva (nombre, categoría, rol, notas y etiquetas).
 */
async function posicionEnLado(
	id: string,
	lado: Lado,
	creados: CreadoParaCompletar[]
): Promise<string> {
	const rows = await query<Posicion>('SELECT * FROM posiciones WHERE id = ?', [id]);
	const p = rows[0];
	if (!p) throw new Error('No se encontró la posición.');
	if (p.disciplina === lado) return p.id;
	const existente = await buscarPosicionPorNombre(p.nombre, lado);
	if (existente) return existente.id;
	const copia = await createPosicion({
		nombre: p.nombre,
		categoria: p.categoria,
		tipo: p.tipo,
		notas: p.notas,
		disciplina: lado,
		posicion_complementaria_id: null
	});
	const tags = await getTagsForPosicion(p.id);
	if (tags.length > 0) await setTagsForPosicion(copia.id, tags.map((t) => t.id));
	creados.push({ kind: 'posicion', nombre: copia.nombre, disciplina: lado });
	return copia.id;
}

async function sumisionEnLado(
	id: string,
	lado: Lado,
	creados: CreadoParaCompletar[]
): Promise<string> {
	const rows = await query<SumisionTerminal>('SELECT * FROM sumisiones_terminales WHERE id = ?', [
		id
	]);
	const s = rows[0];
	if (!s) throw new Error('No se encontró la sumisión.');
	if (s.disciplina === lado) return s.id;
	const existente = await buscarSumisionPorNombre(s.nombre, lado);
	if (existente) return existente.id;
	const copia = await createSumision({ nombre: s.nombre, notas: s.notas, disciplina: lado });
	creados.push({ kind: 'sumision', nombre: copia.nombre, disciplina: lado });
	return copia.id;
}

/** Hay una técnica con el mismo nombre, origen y variante (índice único). */
export async function existeTecnicaIdentica(
	nombre: string,
	origenId: string,
	variante: string | undefined | null
): Promise<boolean> {
	await init();
	const rows = await query<Tecnica>(
		'SELECT * FROM tecnicas WHERE posicion_origen_id = ? ',
		[origenId]
	);
	const n = nombre.trim().toLowerCase();
	const v = (variante ?? '').trim().toLowerCase();
	return rows.some(
		(t) => t.nombre.trim().toLowerCase() === n && (t.variante ?? '').trim().toLowerCase() === v
	);
}

export class TecnicaDuplicadaError extends Error {
	constructor(public lado: Lado) {
		super(`Ya existe una técnica con ese mismo nombre, origen y variante en ${DISCIPLINA_LABEL[lado]}.`);
		this.name = 'TecnicaDuplicadaError';
	}
}

/**
 * Crea la técnica en la disciplina de su origen (`ladoOrigen`) y, si
 * `ambos`, también en la otra: entre las contrapartes por nombre de su
 * origen y destino en esa disciplina, creando las que falten (P2). Si en
 * la otra disciplina ya existe la técnica idéntica → `TecnicaDuplicadaError`
 * (no se crea nada).
 */
export async function crearTecnicaEnLados(
	data: Omit<NewTecnica, 'disciplina'>,
	ladoOrigen: Lado,
	ambos: boolean
): Promise<{ tecnicas: Partial<Record<Lado, Tecnica>>; creados: CreadoParaCompletar[] }> {
	await init();
	return conSavepoint(async () => {
		const creados: CreadoParaCompletar[] = [];
		const tecnicas: Partial<Record<Lado, Tecnica>> = {};
		tecnicas[ladoOrigen] = await createTecnica({ ...data, disciplina: ladoOrigen });
		if (ambos) {
			const lado = otroLado(ladoOrigen);
			const origen = await posicionEnLado(data.posicion_origen_id, lado, creados);
			if (await existeTecnicaIdentica(data.nombre, origen, data.variante)) {
				throw new TecnicaDuplicadaError(lado);
			}
			tecnicas[lado] = await createTecnica({
				...data,
				disciplina: lado,
				posicion_origen_id: origen,
				posicion_destino_id: data.posicion_destino_id
					? await posicionEnLado(data.posicion_destino_id, lado, creados)
					: undefined,
				sumision_destino_id: data.sumision_destino_id
					? await sumisionEnLado(data.sumision_destino_id, lado, creados)
					: undefined
			});
		}
		return { tecnicas, creados };
	});
}
