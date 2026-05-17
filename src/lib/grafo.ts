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
