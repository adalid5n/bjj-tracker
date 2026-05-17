import { describe, expect, it } from 'vitest';
import { buildGrafoElements } from './grafo';
import type { Posicion, SumisionTerminal, Tecnica } from './types';

// Helpers para fabricar entidades de test con campos por defecto.
const ts = '2026-01-01T00:00:00.000Z';

function pos(id: string, nombre = id, overrides: Partial<Posicion> = {}): Posicion {
	return {
		id,
		nombre,
		categoria: 'guardia',
		tipo: 'neutral',
		notas: '',
		created_at: ts,
		updated_at: ts,
		...overrides
	};
}

function sum(id: string, nombre = id): SumisionTerminal {
	return { id, nombre, notas: '', created_at: ts, updated_at: ts };
}

function tec(id: string, overrides: Partial<Tecnica> & Pick<Tecnica, 'posicion_origen_id'>): Tecnica {
	const { posicion_origen_id, ...rest } = overrides;
	return {
		id,
		nombre: `Tecnica ${id}`,
		posicion_origen_id,
		tipo: 'ataque',
		estado: 'probando',
		detalles: '',
		errores_comunes: '',
		created_at: ts,
		updated_at: ts,
		...rest
	};
}

describe('buildGrafoElements', () => {
	it('devuelve listas vacías cuando el catálogo está vacío', () => {
		expect(buildGrafoElements([], [], [])).toEqual({ nodes: [], edges: [] });
	});

	it('mapea posiciones y sumisiones a nodos con prefijos de id distintos', () => {
		const { nodes, edges } = buildGrafoElements(
			[pos('p1', 'Guardia cerrada bottom')],
			[sum('s1', 'Armbar')],
			[]
		);
		expect(edges).toEqual([]);
		expect(nodes).toHaveLength(2);
		expect(nodes.find((n) => n.data.id === 'pos:p1')?.data).toMatchObject({
			label: 'Guardia cerrada bottom',
			kind: 'posicion',
			categoria: 'guardia'
		});
		expect(nodes.find((n) => n.data.id === 'sum:s1')?.data).toMatchObject({
			label: 'Armbar',
			kind: 'sumision'
		});
	});

	it('genera arista posición → posición correctamente', () => {
		const { edges } = buildGrafoElements(
			[pos('p1'), pos('p2')],
			[],
			[tec('t1', { posicion_origen_id: 'p1', posicion_destino_id: 'p2', tipo: 'sweep' })]
		);
		expect(edges).toHaveLength(1);
		expect(edges[0].data).toMatchObject({
			id: 't1',
			source: 'pos:p1',
			target: 'pos:p2',
			tipo: 'sweep'
		});
	});

	it('genera arista posición → sumisión cuando la técnica tiene destino sumisión', () => {
		const { edges } = buildGrafoElements(
			[pos('p1')],
			[sum('s1')],
			[tec('t1', { posicion_origen_id: 'p1', sumision_destino_id: 's1', tipo: 'sumision' })]
		);
		expect(edges).toHaveLength(1);
		expect(edges[0].data).toMatchObject({ source: 'pos:p1', target: 'sum:s1', tipo: 'sumision' });
	});

	it('emite aristas paralelas separadas para variantes (mismo origen-destino-nombre, distinto id)', () => {
		const { edges } = buildGrafoElements(
			[pos('p1'), pos('p2')],
			[],
			[
				tec('t1', {
					nombre: 'Hip bump sweep',
					variante: 'clásica',
					posicion_origen_id: 'p1',
					posicion_destino_id: 'p2'
				}),
				tec('t2', {
					nombre: 'Hip bump sweep',
					variante: 'del profe',
					posicion_origen_id: 'p1',
					posicion_destino_id: 'p2'
				})
			]
		);
		expect(edges).toHaveLength(2);
		expect(edges.map((e) => e.data.id).sort()).toEqual(['t1', 't2']);
	});

	it('descarta técnicas con origen inexistente', () => {
		const { edges } = buildGrafoElements(
			[pos('p1')],
			[],
			[tec('t1', { posicion_origen_id: 'pX', posicion_destino_id: 'p1' })]
		);
		expect(edges).toEqual([]);
	});

	it('descarta técnicas con destino inexistente (ni posición ni sumisión válidos)', () => {
		const { edges } = buildGrafoElements(
			[pos('p1')],
			[sum('s1')],
			[
				tec('t1', { posicion_origen_id: 'p1', posicion_destino_id: 'pX' }),
				tec('t2', { posicion_origen_id: 'p1', sumision_destino_id: 'sX', tipo: 'sumision' })
			]
		);
		expect(edges).toEqual([]);
	});

	it('mantiene posiciones aisladas sin aristas', () => {
		const { nodes, edges } = buildGrafoElements([pos('p1'), pos('p2')], [], []);
		expect(nodes).toHaveLength(2);
		expect(edges).toEqual([]);
	});
});
