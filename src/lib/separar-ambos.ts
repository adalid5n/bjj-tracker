/**
 * Separación de los elementos "Ambos" del catálogo (T-4.it7, design §2).
 *
 * Módulo PURO: sin BD, sin runas, sin `$lib/db`. Recibe filas planas (las
 * mismas que devuelve `SELECT *` y que lleva el JSON de copia de seguridad)
 * y devuelve las filas resultantes. Lo usan:
 *  - la migración v12 (`db/schema.ts`, en el worker), y
 *  - la restauración de copias v6/v7 (y v8 editadas a mano) en `sync.ts`,
 * para que los dos caminos produzcan exactamente lo mismo.
 *
 * Reglas (resumen; detalle en `openspec/changes/ambos-como-copias/design.md`):
 *  1. Posición/sumisión "Ambos" → copia BJJ (conserva el id) + copia
 *     Grappling (id nuevo, mismos campos).
 *  2. Sumisión cuya copia chocaría con UNIQUE (nombre, disciplina) → la
 *     copia se renombra "<nombre> (Ambos)".
 *  3. A una técnica "Ambos" le falta un extremo en una disciplina → se usa el
 *     elemento del mismo nombre normalizado en esa disciplina (el más
 *     antiguo) o se crea una copia (mismos datos, etiquetas y sitio).
 *  4. Técnica de una disciplina: sus extremos "Ambos" pasan a la copia de su
 *     disciplina. Técnica "Ambos": siempre dos (BJJ conserva el id), salvo
 *     choque con el índice único (nombre, origen, variante) → se enlaza a la
 *     técnica existente ("fusionada").
 *  5–8. Contras, complementarias, etiquetas y organización del grafo se
 *     reparten por disciplina.
 *  9–10. (solo `inferirEntrenos`) disciplina de rolls y sesiones, y tipo de
 *     sesión bjj/grappling → clase.
 *
 * Propiedades: idempotente (sin "Ambos" no crea nada); no pierde filas
 * (salvo duplicados exactos que aparecen al fusionar, contados en
 * `resumen.recuentos[tabla].deduplicados`).
 */

export type Lado = 'bjj' | 'grappling';
const LADOS: Lado[] = ['bjj', 'grappling'];

type Fila = Record<string, unknown>;

export interface PosicionFila extends Fila {
	id: string;
	nombre: string;
	disciplina?: string | null;
	posicion_complementaria_id?: string | null;
	created_at?: string;
}

export interface SumisionFila extends Fila {
	id: string;
	nombre: string;
	disciplina?: string | null;
	created_at?: string;
}

export interface TecnicaFila extends Fila {
	id: string;
	nombre: string;
	variante?: string | null;
	posicion_origen_id: string;
	posicion_destino_id?: string | null;
	sumision_destino_id?: string | null;
	disciplina?: string | null;
}

export interface ContraFila extends Fila {
	tecnica_id: string;
	contra_tecnica_id: string;
}

export interface PosicionTagFila extends Fila {
	posicion_id: string;
	tag_id: string;
}

export interface LayoutFila extends Fila {
	entidad_id: string;
	kind: string;
}

export interface SesionFila extends Fila {
	id: string;
	tipo: string;
	disciplina?: string | null;
}

export interface RollFila extends Fila {
	id: string;
	sesion_id: string;
	disciplina?: string | null;
}

export interface RollPosicionFila extends Fila {
	roll_id: string;
	posicion_id: string;
	resultado: string;
}

export interface RollTecnicaFila extends Fila {
	roll_id: string;
	tecnica_id: string;
	resultado: string;
}

export interface DatosSeparables {
	posiciones: PosicionFila[];
	sumisiones_terminales: SumisionFila[];
	tecnicas: TecnicaFila[];
	tecnica_contras: ContraFila[];
	posicion_tags: PosicionTagFila[];
	grafo_layout: LayoutFila[];
	sesiones: SesionFila[];
	rolls: RollFila[];
	roll_posicion: RollPosicionFila[];
	roll_tecnica: RollTecnicaFila[];
	/**
	 * Ids de etiquetas existentes (solo lectura). Sirve para no duplicar
	 * filas de `posicion_tags` que apuntan a una etiqueta inexistente
	 * (huérfanos heredados): duplicarlas añadiría violaciones de FK.
	 */
	tagIds?: string[];
}

export type TablaSeparable = Exclude<keyof DatosSeparables, 'tagIds'>;

export interface ResumenSeparacion {
	/** Sumisiones copiadas que se renombraron por choque de nombre. */
	renombradas: { de: string; a: string; disciplina: Lado }[];
	/** Posiciones con el mismo nombre repetido en una disciplina tras separar. */
	duplicadas: { nombre: string; disciplina: Lado }[];
	/** Elementos creados en la otra disciplina para completar técnicas "Ambos". */
	creadasParaCompletar: { kind: 'posicion' | 'sumision'; nombre: string; disciplina: Lado }[];
	/** Copias de técnicas no creadas porque ya existía una igual (índice único). */
	fusionadas: { nombre: string; disciplina: Lado; con: string }[];
	/** Técnicas "Ambos" con un extremo inexistente: quedan solo como BJJ. */
	huerfanas: string[];
	/** Entradas/salidas por tabla, para las comprobaciones de la migración. */
	recuentos: Record<TablaSeparable, { entrada: number; salida: number; deduplicados: number }>;
}

export interface OpcionesSeparacion {
	nuevoId: () => string;
	/** true en la migración y en copias v6/v7: deduce disciplina de sesiones/rolls y el tipo. */
	inferirEntrenos: boolean;
}

/** Normalización de nombres para buscar contrapartes: `trim` + minúsculas. */
export function normalizarNombre(nombre: string): string {
	return nombre.trim().toLowerCase();
}

function esLado(d: unknown): d is Lado {
	return d === 'bjj' || d === 'grappling';
}

/** Disciplina guardada de un elemento; ausente (copias antiguas) = 'bjj'. */
function disciplinaDe(row: { disciplina?: string | null }): string {
	return row.disciplina == null || row.disciplina === '' ? 'bjj' : row.disciplina;
}

function otro(l: Lado): Lado {
	return l === 'bjj' ? 'grappling' : 'bjj';
}

/** Más antiguo primero (created_at, luego id) — criterio de "el más antiguo". */
function compararAntiguedad(a: Fila, b: Fila): number {
	const ca = String(a.created_at ?? '');
	const cb = String(b.created_at ?? '');
	if (ca !== cb) return ca < cb ? -1 : 1;
	return String(a.id) < String(b.id) ? -1 : 1;
}

type Copias = Map<string, Partial<Record<Lado, string>>>;

export function separarAmbos(
	datos: DatosSeparables,
	opts: OpcionesSeparacion
): { datos: DatosSeparables; resumen: ResumenSeparacion } {
	const resumen: ResumenSeparacion = {
		renombradas: [],
		duplicadas: [],
		creadasParaCompletar: [],
		fusionadas: [],
		huerfanas: [],
		recuentos: {} as ResumenSeparacion['recuentos']
	};

	// Estado ANTERIOR a la separación (para deducir la disciplina de rolls).
	const discPosOriginal = new Map(datos.posiciones.map((p) => [p.id, disciplinaDe(p)]));
	const discTecOriginal = new Map(datos.tecnicas.map((t) => [t.id, disciplinaDe(t)]));
	const posAmbos = new Set(
		datos.posiciones.filter((p) => disciplinaDe(p) === 'ambos').map((p) => p.id)
	);
	const sumAmbos = new Set(
		datos.sumisiones_terminales.filter((s) => disciplinaDe(s) === 'ambos').map((s) => s.id)
	);
	const tecAmbos = new Set(
		datos.tecnicas.filter((t) => disciplinaDe(t) === 'ambos').map((t) => t.id)
	);

	// ---------------------------------------------------------------------
	// 1. Posiciones
	// ---------------------------------------------------------------------
	// `copiasPos` = copias "de verdad" (el original y las copias creadas);
	// `contrapartesPos` = además, elementos de la otra disciplina encontrados
	// por nombre (paso 3). Técnicas, contras y rolls usan las dos;
	// complementarias solo las copias (no tocamos el vínculo de un elemento
	// ajeno encontrado por nombre).
	const copiasPos: Copias = new Map();
	const contrapartesPos: Copias = new Map();
	const posiciones: PosicionFila[] = [];
	const posPorId = new Map<string, PosicionFila>();
	const clonesPos: { origen: string; copia: string }[] = []; // para etiquetas y layout

	for (const p of datos.posiciones) {
		const d = disciplinaDe(p);
		if (d === 'ambos') {
			const bjj: PosicionFila = { ...p, disciplina: 'bjj' };
			const grap: PosicionFila = {
				...p,
				id: opts.nuevoId(),
				disciplina: 'grappling',
				posicion_complementaria_id: null // se resuelve en el paso 6
			};
			posiciones.push(bjj, grap);
			posPorId.set(bjj.id, bjj);
			posPorId.set(grap.id, grap);
			copiasPos.set(p.id, { bjj: bjj.id, grappling: grap.id });
			clonesPos.push({ origen: p.id, copia: grap.id });
		} else {
			const fila: PosicionFila = { ...p, disciplina: d };
			posiciones.push(fila);
			posPorId.set(fila.id, fila);
			copiasPos.set(p.id, esLado(d) ? { [d]: p.id } : {});
		}
	}

	// ---------------------------------------------------------------------
	// 2. Sumisiones (UNIQUE (nombre, disciplina) en BD → renombrar la copia)
	// ---------------------------------------------------------------------
	const copiasSum: Copias = new Map();
	const contrapartesSum: Copias = new Map();
	const sumisiones: SumisionFila[] = [];
	const clonesSum: { origen: string; copia: string }[] = [];
	const nombresSum: Record<string, Set<string>> = { bjj: new Set(), grappling: new Set() };
	for (const s of datos.sumisiones_terminales) {
		const d = disciplinaDe(s);
		if (d !== 'ambos') {
			(nombresSum[d] ??= new Set()).add(s.nombre);
		}
	}
	const nombreLibreSum = (nombre: string, lado: Lado): string => {
		if (!nombresSum[lado].has(nombre)) return nombre;
		let candidato = `${nombre} (Ambos)`;
		let n = 2;
		while (nombresSum[lado].has(candidato)) candidato = `${nombre} (Ambos ${n++})`;
		return candidato;
	};

	for (const s of datos.sumisiones_terminales) {
		const d = disciplinaDe(s);
		if (d === 'ambos') {
			const filas: Partial<Record<Lado, SumisionFila>> = {};
			for (const lado of LADOS) {
				const nombre = nombreLibreSum(s.nombre, lado);
				if (nombre !== s.nombre) resumen.renombradas.push({ de: s.nombre, a: nombre, disciplina: lado });
				nombresSum[lado].add(nombre);
				filas[lado] = {
					...s,
					id: lado === 'bjj' ? s.id : opts.nuevoId(),
					nombre,
					disciplina: lado
				};
			}
			sumisiones.push(filas.bjj!, filas.grappling!);
			copiasSum.set(s.id, { bjj: filas.bjj!.id, grappling: filas.grappling!.id });
			clonesSum.push({ origen: s.id, copia: filas.grappling!.id });
		} else {
			sumisiones.push({ ...s, disciplina: d });
			copiasSum.set(s.id, esLado(d) ? { [d]: s.id } : {});
		}
	}

	// ---------------------------------------------------------------------
	// 3. Completar los extremos de las técnicas "Ambos"
	// ---------------------------------------------------------------------
	const buscarPorNombre = <T extends { nombre: string; disciplina?: string | null }>(
		filas: T[],
		nombre: string,
		lado: Lado
	): T | undefined => {
		const n = normalizarNombre(nombre);
		return filas
			.filter((f) => f.disciplina === lado && normalizarNombre(f.nombre) === n)
			.sort(compararAntiguedad)[0];
	};

	const completarPos = (id: string, lado: Lado): void => {
		const c = copiasPos.get(id);
		if (!c || c[lado] || contrapartesPos.get(id)?.[lado]) return;
		const original = posPorId.get(c[otro(lado)] ?? id);
		if (!original) return;
		const encontrada = buscarPorNombre(posiciones, original.nombre, lado);
		if (encontrada) {
			contrapartesPos.set(id, { ...contrapartesPos.get(id), [lado]: encontrada.id });
			return;
		}
		const copia: PosicionFila = {
			...original,
			id: opts.nuevoId(),
			disciplina: lado,
			posicion_complementaria_id: null
		};
		posiciones.push(copia);
		posPorId.set(copia.id, copia);
		c[lado] = copia.id;
		clonesPos.push({ origen: original.id, copia: copia.id });
		resumen.creadasParaCompletar.push({ kind: 'posicion', nombre: copia.nombre, disciplina: lado });
	};

	const sumPorId = new Map(sumisiones.map((s) => [s.id, s]));
	const completarSum = (id: string, lado: Lado): void => {
		const c = copiasSum.get(id);
		if (!c || c[lado] || contrapartesSum.get(id)?.[lado]) return;
		const original = sumPorId.get(c[otro(lado)] ?? id);
		if (!original) return;
		const encontrada = buscarPorNombre(sumisiones, original.nombre, lado);
		if (encontrada) {
			contrapartesSum.set(id, { ...contrapartesSum.get(id), [lado]: encontrada.id });
			return;
		}
		// Sin coincidencia por nombre normalizado → tampoco choca el UNIQUE.
		const copia: SumisionFila = { ...original, id: opts.nuevoId(), disciplina: lado };
		sumisiones.push(copia);
		sumPorId.set(copia.id, copia);
		nombresSum[lado].add(copia.nombre);
		c[lado] = copia.id;
		clonesSum.push({ origen: original.id, copia: copia.id });
		resumen.creadasParaCompletar.push({ kind: 'sumision', nombre: copia.nombre, disciplina: lado });
	};

	const posEn = (id: string | null | undefined, lado: Lado): string | undefined =>
		id ? (copiasPos.get(id)?.[lado] ?? contrapartesPos.get(id)?.[lado]) : undefined;
	const sumEn = (id: string | null | undefined, lado: Lado): string | undefined =>
		id ? (copiasSum.get(id)?.[lado] ?? contrapartesSum.get(id)?.[lado]) : undefined;

	// Técnicas "Ambos" con un extremo que no existe en los datos (huérfano
	// heredado): no se duplican (añadiría violaciones de FK); quedan en BJJ.
	const tecAmbosHuerfanas = new Set<string>();
	for (const t of datos.tecnicas) {
		if (!tecAmbos.has(t.id)) continue;
		const okOrigen = copiasPos.has(t.posicion_origen_id);
		const okDestino = t.posicion_destino_id
			? copiasPos.has(t.posicion_destino_id)
			: t.sumision_destino_id
				? copiasSum.has(t.sumision_destino_id)
				: true;
		if (!okOrigen || !okDestino) {
			tecAmbosHuerfanas.add(t.id);
			resumen.huerfanas.push(t.nombre);
			continue;
		}
		for (const lado of LADOS) {
			completarPos(t.posicion_origen_id, lado);
			if (t.posicion_destino_id) completarPos(t.posicion_destino_id, lado);
			if (t.sumision_destino_id) completarSum(t.sumision_destino_id, lado);
		}
	}

	// ---------------------------------------------------------------------
	// 4. Técnicas
	// ---------------------------------------------------------------------
	const claveTec = (t: TecnicaFila): string =>
		`${t.nombre}\u0000${t.posicion_origen_id}\u0000${t.variante ?? ''}`;
	const tecnicas: TecnicaFila[] = [];
	const clavesTec = new Map<string, string>(); // clave → id
	const copiasTec: Copias = new Map();

	const remapExtremos = (t: TecnicaFila, lado: Lado): TecnicaFila => {
		const r: TecnicaFila = { ...t };
		if (posAmbos.has(t.posicion_origen_id)) r.posicion_origen_id = posEn(t.posicion_origen_id, lado)!;
		if (t.posicion_destino_id && posAmbos.has(t.posicion_destino_id))
			r.posicion_destino_id = posEn(t.posicion_destino_id, lado)!;
		if (t.sumision_destino_id && sumAmbos.has(t.sumision_destino_id))
			r.sumision_destino_id = sumEn(t.sumision_destino_id, lado)!;
		return r;
	};

	// 4a. Técnicas de una sola disciplina (y huérfanas "Ambos" → BJJ).
	for (const t of datos.tecnicas) {
		if (tecAmbos.has(t.id) && !tecAmbosHuerfanas.has(t.id)) continue;
		const d = tecAmbosHuerfanas.has(t.id) ? 'bjj' : disciplinaDe(t);
		const fila: TecnicaFila = esLado(d) ? { ...remapExtremos(t, d), disciplina: d } : { ...t };
		tecnicas.push(fila);
		clavesTec.set(claveTec(fila), fila.id);
		copiasTec.set(t.id, esLado(d) ? { [d]: t.id } : {});
	}

	// 4b. Técnicas "Ambos": una por disciplina, entre los extremos de esa
	// disciplina. La de BJJ conserva el id salvo que se fusione.
	for (const t of datos.tecnicas) {
		if (!tecAmbos.has(t.id) || tecAmbosHuerfanas.has(t.id)) continue;
		const porLado: Partial<Record<Lado, TecnicaFila>> = {};
		const fusion: Partial<Record<Lado, string>> = {};
		for (const lado of LADOS) {
			const r: TecnicaFila = {
				...t,
				disciplina: lado,
				posicion_origen_id: posEn(t.posicion_origen_id, lado)!,
				posicion_destino_id: t.posicion_destino_id ? posEn(t.posicion_destino_id, lado)! : t.posicion_destino_id,
				sumision_destino_id: t.sumision_destino_id ? sumEn(t.sumision_destino_id, lado)! : t.sumision_destino_id
			};
			const existente = clavesTec.get(claveTec(r));
			if (existente) fusion[lado] = existente;
			else porLado[lado] = r;
		}
		// Id: la de BJJ conserva el original; si BJJ se fusionó, lo hereda Grappling.
		const ladoConId: Lado | undefined = porLado.bjj ? 'bjj' : porLado.grappling ? 'grappling' : undefined;
		const copia: Partial<Record<Lado, string>> = {};
		for (const lado of LADOS) {
			const r = porLado[lado];
			if (r) {
				r.id = lado === ladoConId ? t.id : opts.nuevoId();
				tecnicas.push(r);
				clavesTec.set(claveTec(r), r.id);
				copia[lado] = r.id;
			} else {
				copia[lado] = fusion[lado];
				resumen.fusionadas.push({ nombre: t.nombre, disciplina: lado, con: fusion[lado]! });
			}
		}
		copiasTec.set(t.id, copia);
	}
	const tecEn = (id: string, lado: Lado): string | undefined => copiasTec.get(id)?.[lado];

	// ---------------------------------------------------------------------
	// 5. Contras
	// ---------------------------------------------------------------------
	const contras: ContraFila[] = [];
	const clavesContra = new Set<string>();
	const pushContra = (c: ContraFila): void => {
		const k = `${c.tecnica_id}\u0000${c.contra_tecnica_id}`;
		if (clavesContra.has(k)) return;
		clavesContra.add(k);
		contras.push(c);
	};
	let contrasDedup = 0;
	for (const c of datos.tecnica_contras) {
		const antes = contras.length;
		const afectada = tecAmbos.has(c.tecnica_id) || tecAmbos.has(c.contra_tecnica_id);
		if (!afectada) {
			pushContra({ ...c });
		} else {
			let alguna = false;
			for (const lado of LADOS) {
				const t = tecEn(c.tecnica_id, lado);
				const k = tecEn(c.contra_tecnica_id, lado);
				if (t && k && t !== k) {
					pushContra({ ...c, tecnica_id: t, contra_tecnica_id: k });
					alguna = true;
				}
			}
			if (!alguna) pushContra({ ...c });
		}
		if (contras.length === antes) contrasDedup++;
	}

	// ---------------------------------------------------------------------
	// 6. Complementarias (solo copias, no contrapartes encontradas por nombre)
	// ---------------------------------------------------------------------
	for (const p of datos.posiciones) {
		const q = p.posicion_complementaria_id;
		if (!q) continue;
		if (!posAmbos.has(p.id) && !posAmbos.has(q)) continue; // sin "Ambos": intacto
		if (!copiasPos.has(q)) continue; // complementaria inexistente: se conserva tal cual en la copia BJJ
		for (const lado of LADOS) {
			const pId = copiasPos.get(p.id)?.[lado];
			if (!pId) continue;
			const fila = posPorId.get(pId)!;
			fila.posicion_complementaria_id = copiasPos.get(q)?.[lado] ?? null;
		}
	}
	// Las copias creadas para completar (paso 3) cuyo original tenía
	// complementaria: vincular con la copia de la complementaria en esa
	// disciplina si existe y está libre (mantiene el vínculo mutuo y único).
	for (const { origen, copia } of clonesPos) {
		if (posAmbos.has(origen)) continue; // ya resuelto arriba
		const q = posPorId.get(origen)?.posicion_complementaria_id;
		const filaCopia = posPorId.get(copia)!;
		const lado = filaCopia.disciplina as Lado;
		const qCopia = q ? copiasPos.get(q)?.[lado] : undefined;
		if (!qCopia) continue;
		const filaQ = posPorId.get(qCopia)!;
		if (filaQ.posicion_complementaria_id && filaQ.posicion_complementaria_id !== copia) continue;
		filaCopia.posicion_complementaria_id = qCopia;
		filaQ.posicion_complementaria_id = copia;
	}

	// ---------------------------------------------------------------------
	// 7. Etiquetas y 8. organización del grafo
	// ---------------------------------------------------------------------
	const tagsExistentes = datos.tagIds ? new Set(datos.tagIds) : null;
	const posicionTags: PosicionTagFila[] = datos.posicion_tags.map((r) => ({ ...r }));
	const clavesTag = new Set(posicionTags.map((r) => `${r.posicion_id}\u0000${r.tag_id}`));
	for (const { origen, copia } of clonesPos) {
		for (const r of datos.posicion_tags) {
			if (r.posicion_id !== origen) continue;
			if (tagsExistentes && !tagsExistentes.has(r.tag_id)) continue;
			const k = `${copia}\u0000${r.tag_id}`;
			if (clavesTag.has(k)) continue;
			clavesTag.add(k);
			posicionTags.push({ ...r, posicion_id: copia });
		}
	}

	const layout: LayoutFila[] = datos.grafo_layout.map((r) => ({ ...r }));
	const clavesLayout = new Set(layout.map((r) => `${r.entidad_id}\u0000${r.kind}`));
	const duplicarLayout = (clones: { origen: string; copia: string }[], kind: string): void => {
		for (const { origen, copia } of clones) {
			const r = datos.grafo_layout.find((l) => l.entidad_id === origen && l.kind === kind);
			if (!r) continue;
			const k = `${copia}\u0000${kind}`;
			if (clavesLayout.has(k)) continue;
			clavesLayout.add(k);
			layout.push({ ...r, entidad_id: copia });
		}
	};
	duplicarLayout(clonesPos, 'posicion');
	duplicarLayout(clonesSum, 'sumision');

	// ---------------------------------------------------------------------
	// 9. Rolls y 10. sesiones
	// ---------------------------------------------------------------------
	const sesionPorId = new Map(datos.sesiones.map((s) => [s.id, s]));
	const discDeTipoAntiguo = (sesionId: string): Lado =>
		sesionPorId.get(sesionId)?.tipo === 'grappling' ? 'grappling' : 'bjj';

	const rollDisc = new Map<string, Lado>();
	const rolls: RollFila[] = datos.rolls.map((r) => {
		let d: Lado;
		if (opts.inferirEntrenos) {
			const discs = new Set<string>();
			for (const rp of datos.roll_posicion)
				if (rp.roll_id === r.id) discs.add(discPosOriginal.get(rp.posicion_id) ?? '');
			for (const rt of datos.roll_tecnica)
				if (rt.roll_id === r.id) discs.add(discTecOriginal.get(rt.tecnica_id) ?? '');
			if (discs.has('bjj')) d = 'bjj';
			else if (discs.has('grappling')) d = 'grappling';
			else d = discDeTipoAntiguo(r.sesion_id);
			rollDisc.set(r.id, d);
			return { ...r, disciplina: d };
		}
		d = esLado(r.disciplina) ? r.disciplina : 'bjj';
		rollDisc.set(r.id, d);
		return { ...r };
	});

	const remapLinks = <T extends Fila & { roll_id: string; resultado: string }>(
		filas: T[],
		campo: 'posicion_id' | 'tecnica_id',
		esAmbos: Set<string>,
		en: (id: string, lado: Lado) => string | undefined
	): { filas: T[]; dedup: number } => {
		const out: T[] = [];
		const claves = new Set<string>();
		let dedup = 0;
		for (const f of filas) {
			const id = f[campo] as string;
			const lado = rollDisc.get(f.roll_id) ?? 'bjj';
			const nuevo = esAmbos.has(id) ? (en(id, lado) ?? id) : id;
			const k = `${f.roll_id}\u0000${nuevo}\u0000${f.resultado}`;
			if (claves.has(k)) {
				dedup++;
				continue;
			}
			claves.add(k);
			out.push({ ...f, [campo]: nuevo });
		}
		return { filas: out, dedup };
	};
	const rp = remapLinks(datos.roll_posicion, 'posicion_id', posAmbos, posEn);
	// Técnicas: también se remapean las fusionadas (su id puede haber cambiado de lado).
	const rt = remapLinks(datos.roll_tecnica, 'tecnica_id', tecAmbos, (id, lado) => tecEn(id, lado));

	const sesiones: SesionFila[] = opts.inferirEntrenos
		? datos.sesiones.map((s) => {
				const discs = new Set(rolls.filter((r) => r.sesion_id === s.id).map((r) => rollDisc.get(r.id)));
				let disciplina: string;
				if (discs.size === 1) disciplina = [...discs][0]!;
				else if (discs.size > 1) disciplina = 'ambos';
				else disciplina = s.tipo === 'grappling' ? 'grappling' : 'bjj';
				const tipo = s.tipo === 'bjj' || s.tipo === 'grappling' ? 'clase' : s.tipo;
				return { ...s, disciplina, tipo };
			})
		: datos.sesiones.map((s) => ({ ...s }));

	// ---------------------------------------------------------------------
	// Duplicados visibles (posiciones con el mismo nombre en una disciplina
	// donde alguna es copia nueva) — solo informativo.
	// ---------------------------------------------------------------------
	const idsNuevos = new Set(clonesPos.map((c) => c.copia));
	const grupos = new Map<string, PosicionFila[]>();
	for (const p of posiciones) {
		const k = `${p.disciplina}\u0000${normalizarNombre(p.nombre)}`;
		grupos.set(k, [...(grupos.get(k) ?? []), p]);
	}
	for (const g of grupos.values()) {
		if (g.length > 1 && g.some((p) => idsNuevos.has(p.id) || posAmbos.has(p.id))) {
			resumen.duplicadas.push({ nombre: g[0].nombre, disciplina: g[0].disciplina as Lado });
		}
	}

	const salida: DatosSeparables = {
		posiciones,
		sumisiones_terminales: sumisiones,
		tecnicas,
		tecnica_contras: contras,
		posicion_tags: posicionTags,
		grafo_layout: layout,
		sesiones,
		rolls,
		roll_posicion: rp.filas,
		roll_tecnica: rt.filas,
		tagIds: datos.tagIds
	};

	const dedup: Partial<Record<TablaSeparable, number>> = {
		tecnica_contras: contrasDedup,
		roll_posicion: rp.dedup,
		roll_tecnica: rt.dedup
	};
	for (const tabla of Object.keys(salida) as (keyof DatosSeparables)[]) {
		if (tabla === 'tagIds') continue;
		resumen.recuentos[tabla] = {
			entrada: datos[tabla].length,
			salida: salida[tabla].length,
			deduplicados: dedup[tabla] ?? 0
		};
	}

	return { datos: salida, resumen };
}

/**
 * Comprueba que la separación no perdió filas: cada tabla sale con al menos
 * tantas filas como entraron (descontando duplicados exactos por fusión) y
 * no queda ningún elemento del catálogo ni roll "Ambos". Lanza si falla.
 */
export function verificarSeparacion(salida: DatosSeparables, resumen: ResumenSeparacion): void {
	for (const [tabla, r] of Object.entries(resumen.recuentos)) {
		if (r.salida + r.deduplicados < r.entrada) {
			throw new Error(
				`[separar-ambos] ${tabla}: salen ${r.salida} filas de ${r.entrada} (deduplicadas ${r.deduplicados})`
			);
		}
	}
	const conAmbos = [
		...salida.posiciones,
		...salida.sumisiones_terminales,
		...salida.tecnicas,
		...salida.rolls
	].filter((f) => f.disciplina === 'ambos');
	if (conAmbos.length > 0) {
		throw new Error(`[separar-ambos] quedan ${conAmbos.length} elementos con disciplina "ambos"`);
	}
}
