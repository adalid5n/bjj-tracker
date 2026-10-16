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
 *    (origen o destino) o a una posición "Ambos" (su complementaria),
 *    devolviendo lo creado para avisar al usuario.
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
import type { LineaAviso } from '$lib/aviso-catalogo.svelte';
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
	/**
	 * Para qué se creó: la complementaria de la posición `posicion`, o el
	 * origen / destino de la técnica `tecnica` (para el detalle del aviso).
	 */
	para:
		| { tipo: 'complementaria'; posicion: string }
		| { tipo: 'tecnica'; tecnica: string; extremo: 'origen' | 'destino' };
};

/**
 * Complementaria de la copia de una posición "Ambos" resuelta con una
 * posición libre del mismo nombre que ya existía en esa disciplina.
 */
export type ComplementariaEnlazada = {
	posicion: string;
	complementaria: string;
	disciplina: Lado;
};

/**
 * Complementaria que no se pudo completar en una disciplina porque las
 * posiciones con su nombre ya tienen otra pareja (no se duplica ni se roba
 * el vínculo; la copia queda sin complementaria allí).
 */
export type ComplementariaSinVincular = {
	posicion: string;
	complementaria: string;
	disciplina: Lado;
};

// ---------------------------------------------------------------------------
// Avisos de lo hecho para completar la otra disciplina (T-4.it7, tarea 5d):
// una línea corta por evento + el detalle (qué pasó y por qué) que se abre
// al tocar el icono de info. `warning` = el usuario puede querer actuar.
// ---------------------------------------------------------------------------

const KIND_LABEL = { posicion: 'Posición', sumision: 'Sumisión' } as const;

function comillas(nombre: string): string {
	return `"${nombre}"`;
}

/** Líneas de aviso de lo creado en la otra disciplina. */
export function avisosCreados(creados: CreadoParaCompletar[]): LineaAviso[] {
	return creados.map((c) => {
		const en = DISCIPLINA_LABEL[c.disciplina];
		const otra = DISCIPLINA_LABEL[otroLado(c.disciplina)];
		if (c.para.tipo === 'complementaria') {
			return {
				tono: 'info',
				texto: `Posición complementaria ${comillas(c.nombre)} creada en ${en}`,
				detalle: `Como elegiste "Ambos", ${comillas(c.para.posicion)} existe en BJJ y en Grappling, y cada copia lleva su complementaria. En ${en} no había ninguna posición llamada ${comillas(c.nombre)}, así que se creó una copia de la de ${otra} (con sus datos y etiquetas) y se emparejó con ${comillas(c.para.posicion)} de ${en}.`
			};
		}
		const kind = c.kind === 'posicion' ? 'posición' : 'sumisión';
		const datos =
			c.kind === 'posicion' ? 'categoría, rol, notas y etiquetas' : 'nombre y notas';
		return {
			tono: 'info',
			texto: `${KIND_LABEL[c.kind]} ${comillas(c.nombre)} creada en ${en}`,
			detalle: `Como elegiste "Ambos", la técnica ${comillas(c.para.tecnica)} existe en BJJ y en Grappling. En ${en} no había ninguna ${kind} llamada ${comillas(c.nombre)} para usar como ${c.para.extremo}, así que se creó una copia de la de ${otra} (${datos}).`
		};
	});
}

/** Líneas de aviso de las complementarias enlazadas con una ya existente. */
export function avisosEnlazadas(enlazadas: ComplementariaEnlazada[]): LineaAviso[] {
	return enlazadas.map((e) => {
		const en = DISCIPLINA_LABEL[e.disciplina];
		return {
			tono: 'info',
			texto: `${comillas(e.complementaria)} enlazada con la existente en ${en}`,
			detalle: `Como elegiste "Ambos", ${comillas(e.posicion)} existe en BJJ y en Grappling, y cada copia lleva su complementaria. En ${en} ya había una posición ${comillas(e.complementaria)} sin pareja, así que se emparejó con ${comillas(e.posicion)} de ${en} en lugar de crear otra.`
		};
	});
}

/** Líneas de aviso de las copias que quedaron sin complementaria. */
export function avisosSinVincular(sinVincular: ComplementariaSinVincular[]): LineaAviso[] {
	return sinVincular.map((s) => {
		const en = DISCIPLINA_LABEL[s.disciplina];
		return {
			tono: 'warning',
			texto: `${comillas(s.posicion)} sin complementaria en ${en}`,
			detalle: `Como elegiste "Ambos", ${comillas(s.posicion)} existe en BJJ y en Grappling. En ${en} ya hay una posición ${comillas(s.complementaria)}, pero está emparejada con otra, así que no se tocó ni se duplicó: ${comillas(s.posicion)} de ${en} quedó sin complementaria. Si quieres, edítala y elige una.`
		};
	});
}

/**
 * Línea de aviso cuando "Ambos" se creó solo en una disciplina porque en la
 * otra ya había un elemento con ese nombre ("+ Crear nueva" desde un
 * asistente que lo recibe).
 */
export function avisoSoloEn(
	kind: 'posicion' | 'sumision',
	nombre: string,
	lado: Lado,
	existenteEn: Lado
): LineaAviso {
	const en = DISCIPLINA_LABEL[lado];
	const otra = DISCIPLINA_LABEL[existenteEn];
	const kindMin = kind === 'posicion' ? 'posición' : 'sumisión';
	return {
		tono: 'info',
		texto: `${KIND_LABEL[kind]} ${comillas(nombre)} creada solo en ${en} (ya existía en ${otra})`,
		detalle: `Elegiste "Ambos", pero en ${otra} ya había una ${kindMin} llamada ${comillas(nombre)}. Para no duplicarla, solo se creó la de ${en}; en ${otra} se usa la que ya existía.`
	};
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
 * Complementaria: `complementariaId` es una posición de la disciplina
 * elegida o, con "Ambos", de cualquiera de las dos (el selector ofrece
 * también las que solo existen en la otra disciplina). Con "Ambos", la
 * copia de la disciplina de la complementaria se vincula con ella y la
 * copia de la otra disciplina también tiene complementaria (decisión del
 * owner 2026-10-16, design §5):
 *  - la posición LIBRE del mismo nombre normalizado en esa disciplina (la
 *    más antigua), si existe → `enlazadas`;
 *  - si no hay ninguna con ese nombre, una copia de la complementaria
 *    (nombre, categoría, rol, notas y etiquetas) → `creados`;
 *  - si las hay pero todas tienen otra pareja, queda sin complementaria
 *    (sin duplicar ni romper ese vínculo) → `sinVincular`.
 */
export async function crearPosicionEnLados(
	data: DatosPosicion,
	d: Disciplina,
	opts: { preferido: Lado; tagIds: string[]; complementariaId: string | null }
): Promise<{
	posiciones: Partial<Record<Lado, Posicion>>;
	creados: CreadoParaCompletar[];
	enlazadas: ComplementariaEnlazada[];
	sinVincular: ComplementariaSinVincular[];
}> {
	await init();
	const lados = ladosDe(d, opts.preferido);
	let complementariaOriginal: Posicion | null = null;
	if (opts.complementariaId && lados.length > 1) {
		const rows = await query<Posicion>('SELECT * FROM posiciones WHERE id = ?', [
			opts.complementariaId
		]);
		complementariaOriginal = rows[0] ?? null;
	}
	return conSavepoint(async () => {
		const posiciones: Partial<Record<Lado, Posicion>> = {};
		const creados: CreadoParaCompletar[] = [];
		const enlazadas: ComplementariaEnlazada[] = [];
		const sinVincular: ComplementariaSinVincular[] = [];
		for (const lado of lados) {
			let complementaria: string | null = null;
			if (lados.length === 1) {
				complementaria = opts.complementariaId;
			} else if (!complementariaOriginal) {
				complementaria = null;
			} else if (complementariaOriginal.disciplina === lado) {
				complementaria = complementariaOriginal.id;
			} else {
				complementaria = await complementariaEnLado(
					complementariaOriginal,
					data.nombre,
					lado,
					creados,
					enlazadas,
					sinVincular
				);
			}
			const p = await createPosicion({
				...data,
				disciplina: lado,
				posicion_complementaria_id: complementaria
			});
			if (opts.tagIds.length > 0) await setTagsForPosicion(p.id, opts.tagIds);
			posiciones[lado] = p;
		}
		return { posiciones, creados, enlazadas, sinVincular };
	});
}

/**
 * Complementaria en `lado` para la copia de una posición "Ambos" cuya
 * complementaria elegida (`q`) es de la otra disciplina. Ver
 * `crearPosicionEnLados`. Devuelve el id a vincular o null.
 */
async function complementariaEnLado(
	q: Posicion,
	nombrePosicion: string,
	lado: Lado,
	creados: CreadoParaCompletar[],
	enlazadas: ComplementariaEnlazada[],
	sinVincular: ComplementariaSinVincular[]
): Promise<string | null> {
	const libre = await buscarPosicionPorNombre(q.nombre, lado, (p) => !p.posicion_complementaria_id);
	if (libre) {
		enlazadas.push({ posicion: nombrePosicion, complementaria: libre.nombre, disciplina: lado });
		return libre.id;
	}
	if (await buscarPosicionPorNombre(q.nombre, lado)) {
		sinVincular.push({ posicion: nombrePosicion, complementaria: q.nombre, disciplina: lado });
		return null;
	}
	const copia = await createPosicion({
		nombre: q.nombre,
		categoria: q.categoria,
		tipo: q.tipo,
		notas: q.notas,
		disciplina: lado,
		posicion_complementaria_id: null
	});
	const tags = await getTagsForPosicion(q.id);
	if (tags.length > 0) await setTagsForPosicion(copia.id, tags.map((t) => t.id));
	creados.push({
		kind: 'posicion',
		nombre: copia.nombre,
		disciplina: lado,
		para: { tipo: 'complementaria', posicion: nombrePosicion }
	});
	return copia.id;
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
	creados: CreadoParaCompletar[],
	para: CreadoParaCompletar['para']
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
	creados.push({ kind: 'posicion', nombre: copia.nombre, disciplina: lado, para });
	return copia.id;
}

async function sumisionEnLado(
	id: string,
	lado: Lado,
	creados: CreadoParaCompletar[],
	para: CreadoParaCompletar['para']
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
	creados.push({ kind: 'sumision', nombre: copia.nombre, disciplina: lado, para });
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
			const para = (extremo: 'origen' | 'destino') =>
				({ tipo: 'tecnica', tecnica: data.nombre, extremo }) as const;
			const origen = await posicionEnLado(data.posicion_origen_id, lado, creados, para('origen'));
			if (await existeTecnicaIdentica(data.nombre, origen, data.variante)) {
				throw new TecnicaDuplicadaError(lado);
			}
			tecnicas[lado] = await createTecnica({
				...data,
				disciplina: lado,
				posicion_origen_id: origen,
				posicion_destino_id: data.posicion_destino_id
					? await posicionEnLado(data.posicion_destino_id, lado, creados, para('destino'))
					: undefined,
				sumision_destino_id: data.sumision_destino_id
					? await sumisionEnLado(data.sumision_destino_id, lado, creados, para('destino'))
					: undefined
			});
		}
		return { tecnicas, creados };
	});
}
