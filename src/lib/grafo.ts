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
					tipoRol: p.tipo
				}
			})
		),
		...sumisiones.map(
			(s): GrafoNode => ({
				data: {
					id: nodeIdSumision(s.id),
					label: s.nombre,
					kind: 'sumision'
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

	return { nodes, edges };
}
