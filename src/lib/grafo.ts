import type {
	CategoriaPosicion,
	EstadoTecnica,
	Posicion,
	SumisionTerminal,
	Tecnica,
	TipoRolPosicion,
	TipoTecnica
} from './types';

export interface GrafoNode {
	data: {
		id: string;
		label: string;
		kind: 'posicion' | 'sumision';
		categoria?: CategoriaPosicion;
		tipoRol?: TipoRolPosicion;
		/**
		 * Grado del nodo (in+out): número de aristas-técnicas que entran o
		 * salen del nodo. Lo usa Cytoscape vía `mapData(degree, …)` para
		 * dimensionar el círculo (más técnicas → más grande). Nodos
		 * huérfanos tienen `degree = 0` y se renderizan al tamaño mínimo.
		 */
		degree?: number;
		/** T-3.it7: elemento "fantasma" de la vista previa de importación. */
		nuevo?: boolean;
	};
}

export interface GrafoEdge {
	data: {
		id: string;
		source: string;
		target: string;
		tipo: TipoTecnica;
		estado: EstadoTecnica;
		nombre: string;
		variante?: string;
		/** T-3.it7: técnica "fantasma" de la vista previa de importación. */
		nuevo?: boolean;
	};
}

export interface GrafoElements {
	nodes: GrafoNode[];
	edges: GrafoEdge[];
}

const nodeIdPosicion = (id: string) => `pos:${id}`;
const nodeIdSumision = (id: string) => `sum:${id}`;

/**
 * Transforma el catálogo (posiciones + sumisiones + técnicas) al formato de
 * elementos que entiende Cytoscape: { nodes, edges }.
 *
 * Reglas:
 *  - Cada posición y cada sumisión es un nodo. Los IDs llevan prefijo
 *    (`pos:`/`sum:`) para evitar colisiones y para que el `kind` se pueda
 *    derivar del id si hace falta.
 *  - Cada técnica es una arista dirigida origen → destino. El destino es
 *    posición o sumisión según cuál de los dos FKs esté poblado (modelo
 *    actual: exactamente uno).
 *  - Técnicas con origen o destino que apunten a entidades inexistentes
 *    se descartan silenciosamente (defensa contra catálogos en estado
 *    inconsistente — no debería pasar pero no merece petar).
 *  - Posiciones y sumisiones sin aristas se mantienen como nodos aislados:
 *    es información útil ("este nodo existe pero no tiene técnicas aún").
 *  - Las contras NO se incluyen (decisión de producto: el grafo no las dibuja).
 */
export function buildGrafoElements(
	posiciones: Posicion[],
	sumisiones: SumisionTerminal[],
	tecnicas: Tecnica[]
): GrafoElements {
	const nodes: GrafoNode[] = [
		...posiciones.map(
			(p): GrafoNode => ({
				data: {
					id: nodeIdPosicion(p.id),
					label: p.nombre,
					kind: 'posicion',
					categoria: p.categoria,
					tipoRol: p.tipo,
					degree: 0
				}
			})
		),
		...sumisiones.map(
			(s): GrafoNode => ({
				data: {
					id: nodeIdSumision(s.id),
					label: s.nombre,
					kind: 'sumision',
					degree: 0
				}
			})
		)
	];

	const posicionIds = new Set(posiciones.map((p) => p.id));
	const sumisionIds = new Set(sumisiones.map((s) => s.id));

	const edges: GrafoEdge[] = [];
	for (const t of tecnicas) {
		if (!posicionIds.has(t.posicion_origen_id)) continue;

		let target: string | null = null;
		if (t.posicion_destino_id && posicionIds.has(t.posicion_destino_id)) {
			target = nodeIdPosicion(t.posicion_destino_id);
		} else if (t.sumision_destino_id && sumisionIds.has(t.sumision_destino_id)) {
			target = nodeIdSumision(t.sumision_destino_id);
		}
		if (!target) continue;

		edges.push({
			data: {
				id: t.id,
				source: nodeIdPosicion(t.posicion_origen_id),
				target,
				tipo: t.tipo,
				estado: t.estado,
				nombre: t.nombre,
				variante: t.variante
			}
		});
	}

	// Calcular el degree de cada nodo (in+out). Lo hacemos sobre el array
	// de aristas YA filtrado (técnicas con endpoints válidos) para que el
	// degree refleje las aristas que realmente se dibujarán en el grafo.
	// Self-loops (origen === destino) cuentan como 2, igual que el degree
	// de Cytoscape (in:1, out:1).
	const nodeById = new Map<string, GrafoNode>();
	for (const n of nodes) nodeById.set(n.data.id, n);
	for (const e of edges) {
		const src = nodeById.get(e.data.source);
		const tgt = nodeById.get(e.data.target);
		if (src) src.data.degree = (src.data.degree ?? 0) + 1;
		if (tgt) tgt.data.degree = (tgt.data.degree ?? 0) + 1;
	}

	return { nodes, edges };
}

// ---------------------------------------------------------------------------
// T-3.it7: vista previa de importación (elementos "fantasma").
// ---------------------------------------------------------------------------

/** Criterio de comparación de nombres de la importación (igual que `confirmar()`). */
export const normalizarNombre = (n: string) => n.toLowerCase().trim();

/**
 * Id Cytoscape de una posición nueva aún no creada. T-4.it7: lleva el lado
 * (disciplina del paso) para que las posiciones calculadas en el paso de
 * BJJ y en el de Grappling de una importación "Ambos" no se pisen.
 */
export const ghostIdPosicion = (nombre: string, lado?: string) =>
	lado ? `new-pos:${lado}:${normalizarNombre(nombre)}` : `new-pos:${normalizarNombre(nombre)}`;
/** Id Cytoscape de una sumisión nueva aún no creada (con su lado, ver arriba). */
export const ghostIdSumision = (nombre: string, lado?: string) =>
	lado ? `new-sum:${lado}:${normalizarNombre(nombre)}` : `new-sum:${normalizarNombre(nombre)}`;

/** Clave estable de un elemento del borrador (índice en su lista). */
export type ClaveBorrador = `pos:${number}` | `sum:${number}` | `tec:${number}`;

export interface PreviewDraft {
	posiciones: {
		nombreEditado: string;
		categoriaEditada: CategoriaPosicion;
		tipoEditado?: TipoRolPosicion;
		seleccionado: boolean;
	}[];
	sumisiones: { nombreEditado: string; seleccionado: boolean }[];
	tecnicas: {
		nombre: string;
		variante?: string;
		tipo: TipoTecnica;
		posicionOrigenNombre: string;
		posicionDestinoNombre?: string;
		sumisionDestinoNombre?: string;
		seleccionado: boolean;
	}[];
}

export interface PreviewProblema {
	/** Texto breve para el usuario (nunca el error técnico en bruto). */
	motivo: string;
	/** Elementos del borrador que lo causan (vacío si no es atribuible). */
	elementos: { clave: ClaveBorrador; nombre: string }[];
}

export interface PreviewElements extends GrafoElements {
	recuento: { posiciones: number; sumisiones: number; tecnicas: number };
	problemas: PreviewProblema[];
}

/**
 * Grafo de un paso de la vista previa: el catálogo de la disciplina del
 * paso (`catalogoPaso`, ya filtrado) más lo que la importación va a crear,
 * marcado con `data.nuevo = true`.
 *
 * - Los nombres de origen/destino se resuelven como en `confirmar()`:
 *   contra el catálogo de la importación (`catalogoImportacion`) y luego
 *   contra las posiciones/sumisiones nuevas marcadas (que ganan si el
 *   nombre coincide, igual que al insertar).
 * - Solo se pintan técnicas marcadas con origen y destino resueltos; las
 *   que no se resuelven no se crearán y no son error del paso.
 * - Una técnica resuelta cuyo extremo existente no está en el grafo del
 *   paso es un problema del paso (defensivo: no debería ocurrir).
 * - `excluidos`: elementos que no se van a crear (paso anterior con
 *   error); no se pintan.
 * - `degree` se recalcula como quedaría el mapa tras aceptar.
 *
 * T-4.it7 (importación "Ambos" como copias), con `opts.lado`:
 * - `catalogoImportacion` es el catálogo de ESE lado: una posición o
 *   sumisión del borrador que ya existe en él no es nueva en este paso (se
 *   enlaza a la existente y no se resalta).
 * - `opts.catalogoOtroLado`: un extremo de técnica que solo existe en la
 *   otra disciplina se creará en esta al aceptar → se pinta como nuevo.
 * - Los ids fantasma llevan el lado (`new-pos:<lado>:<nombre>`).
 */
export function buildPreviewElements(
	catalogoPaso: { posiciones: Posicion[]; sumisiones: SumisionTerminal[]; tecnicas: Tecnica[] },
	catalogoImportacion: { posiciones: { id: string; nombre: string }[]; sumisiones: { id: string; nombre: string }[] },
	draft: PreviewDraft,
	excluidos: ReadonlySet<string> = new Set(),
	opts: {
		lado?: string;
		catalogoOtroLado?: {
			posiciones: { nombre: string; categoria?: CategoriaPosicion; tipo?: TipoRolPosicion }[];
			sumisiones: { nombre: string }[];
		};
	} = {}
): PreviewElements {
	const lado = opts.lado;
	const base = buildGrafoElements(catalogoPaso.posiciones, catalogoPaso.sumisiones, catalogoPaso.tecnicas);
	const nodes = [...base.nodes];
	const edges = [...base.edges];
	const nodeIds = new Set(nodes.map((n) => n.data.id));
	const problemas: PreviewProblema[] = [];
	const recuento = { posiciones: 0, sumisiones: 0, tecnicas: 0 };

	const posMap = new Map<string, string>();
	for (const p of catalogoImportacion.posiciones) posMap.set(normalizarNombre(p.nombre), nodeIdPosicion(p.id));
	const sumMap = new Map<string, string>();
	for (const s of catalogoImportacion.sumisiones) sumMap.set(normalizarNombre(s.nombre), nodeIdSumision(s.id));

	draft.posiciones.forEach((p, i) => {
		if (!p.seleccionado || excluidos.has(`pos:${i}`) || !p.nombreEditado.trim()) return;
		// Ya existe en este lado: no es nueva aquí (se enlaza a la existente).
		if (lado && posMap.has(normalizarNombre(p.nombreEditado))) return;
		const id = ghostIdPosicion(p.nombreEditado, lado);
		posMap.set(normalizarNombre(p.nombreEditado), id);
		if (nodeIds.has(id)) return; // mismo nombre repetido en el borrador
		nodeIds.add(id);
		recuento.posiciones++;
		nodes.push({
			data: {
				id,
				label: p.nombreEditado.trim(),
				kind: 'posicion',
				categoria: p.categoriaEditada,
				tipoRol: p.tipoEditado,
				degree: 0,
				nuevo: true
			}
		});
	});

	draft.sumisiones.forEach((s, i) => {
		if (!s.seleccionado || excluidos.has(`sum:${i}`) || !s.nombreEditado.trim()) return;
		if (lado && sumMap.has(normalizarNombre(s.nombreEditado))) return;
		const id = ghostIdSumision(s.nombreEditado, lado);
		sumMap.set(normalizarNombre(s.nombreEditado), id);
		if (nodeIds.has(id)) return;
		nodeIds.add(id);
		recuento.sumisiones++;
		nodes.push({
			data: { id, label: s.nombreEditado.trim(), kind: 'sumision', degree: 0, nuevo: true }
		});
	});

	// Extremo que solo existe en la otra disciplina: se creará en esta,
	// salvo que el usuario lo desmarcara (o se excluyera) en el borrador.
	const bloqueadas = new Set<string>();
	draft.posiciones.forEach((p, i) => {
		if (!p.seleccionado || excluidos.has(`pos:${i}`)) bloqueadas.add(`p:${normalizarNombre(p.nombreEditado)}`);
	});
	draft.sumisiones.forEach((s, i) => {
		if (!s.seleccionado || excluidos.has(`sum:${i}`)) bloqueadas.add(`s:${normalizarNombre(s.nombreEditado)}`);
	});
	const completarPos = (nombre: string): string | undefined => {
		if (bloqueadas.has(`p:${normalizarNombre(nombre)}`)) return undefined;
		const otro = opts.catalogoOtroLado?.posiciones.find(
			(p) => normalizarNombre(p.nombre) === normalizarNombre(nombre)
		);
		if (!otro) return undefined;
		const id = ghostIdPosicion(otro.nombre, lado);
		posMap.set(normalizarNombre(otro.nombre), id);
		if (!nodeIds.has(id)) {
			nodeIds.add(id);
			recuento.posiciones++;
			nodes.push({
				data: {
					id,
					label: otro.nombre.trim(),
					kind: 'posicion',
					categoria: otro.categoria ?? 'otro',
					tipoRol: otro.tipo,
					degree: 0,
					nuevo: true
				}
			});
		}
		return id;
	};
	const completarSum = (nombre: string): string | undefined => {
		if (bloqueadas.has(`s:${normalizarNombre(nombre)}`)) return undefined;
		const otro = opts.catalogoOtroLado?.sumisiones.find(
			(s) => normalizarNombre(s.nombre) === normalizarNombre(nombre)
		);
		if (!otro) return undefined;
		const id = ghostIdSumision(otro.nombre, lado);
		sumMap.set(normalizarNombre(otro.nombre), id);
		if (!nodeIds.has(id)) {
			nodeIds.add(id);
			recuento.sumisiones++;
			nodes.push({
				data: { id, label: otro.nombre.trim(), kind: 'sumision', degree: 0, nuevo: true }
			});
		}
		return id;
	};

	draft.tecnicas.forEach((t, i) => {
		if (!t.seleccionado || excluidos.has(`tec:${i}`)) return;
		const source =
			posMap.get(normalizarNombre(t.posicionOrigenNombre)) ?? completarPos(t.posicionOrigenNombre);
		const destinoNombre = t.tipo === 'sumision' ? t.sumisionDestinoNombre : t.posicionDestinoNombre;
		const target = destinoNombre
			? ((t.tipo === 'sumision' ? sumMap : posMap).get(normalizarNombre(destinoNombre)) ??
				(t.tipo === 'sumision' ? completarSum(destinoNombre) : completarPos(destinoNombre)))
			: undefined;
		if (!source || !target) return; // no se creará: no se pinta
		const fuera = [source, target].filter((id) => !nodeIds.has(id));
		if (fuera.length > 0) {
			const nombreFuera = fuera[0] === source ? t.posicionOrigenNombre : (destinoNombre ?? '');
			problemas.push({
				motivo: `«${t.nombre}» va desde o hacia «${nombreFuera}», que no está en este mapa`,
				elementos: [{ clave: `tec:${i}`, nombre: t.nombre }]
			});
			return;
		}
		recuento.tecnicas++;
		edges.push({
			data: {
				id: `new-tec:${i}`,
				source,
				target,
				tipo: t.tipo,
				estado: 'probando',
				nombre: t.nombre,
				variante: t.variante,
				nuevo: true
			}
		});
	});

	// Grado tal y como quedará el mapa tras aceptar.
	const nodeById = new Map<string, GrafoNode>();
	for (const n of nodes) {
		n.data = { ...n.data, degree: 0 };
		nodeById.set(n.data.id, n);
	}
	for (const e of edges) {
		const src = nodeById.get(e.data.source);
		const tgt = nodeById.get(e.data.target);
		if (src) src.data.degree = (src.data.degree ?? 0) + 1;
		if (tgt) tgt.data.degree = (tgt.data.degree ?? 0) + 1;
	}

	return { nodes, edges, recuento, problemas };
}
