<script lang="ts" module>
	/**
	 * Cache de posiciones de nodos a nivel de módulo. Sirve como capa
	 * intermedia entre la BD (`grafo_layout`) y Cytoscape:
	 *  - En cada mount sembramos el cache desde `getAllLayouts()`. La
	 *    BD es la fuente de verdad persistente; el cache evita re-leerla
	 *    en cada $effect de cambio de catálogo.
	 *  - Cada drag actualiza el cache + marca dirty (sin persistir).
	 *  - "Guardar organización" vuelca el cache a BD vía `upsertLayouts`
	 *    y baja el flag dirty.
	 *  - "Reorganizar" limpia el cache, corre fcose plano y, en
	 *    `layoutstop`, re-puebla el cache con las nuevas coords; queda
	 *    dirty hasta que el usuario guarde.
	 *
	 * La regla "$state solo en class fields" no aplica aquí porque esto
	 * NO es state reactivo — es solo memo mutable.
	 */
	const positionsCache = new Map<string, { x: number; y: number }>();
</script>

<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import type { Core, EventObject, LayoutOptions, Position, StylesheetJson } from 'cytoscape';
	import type { GrafoEdge, GrafoNode } from '$lib/grafo';
	import type { Tecnica } from '$lib/types';
	import { theme } from '$lib/theme.svelte';
	import GrafoLeyenda from '$lib/components/GrafoLeyenda.svelte';
	import { mapaModalStack, type MapaModalEntry } from '$lib/components/mapa-modal-stack.svelte';
	import { getAllLayouts, upsertLayouts, type GrafoLayoutKind } from '$lib/grafo-layout';

	type Props = {
		nodes?: GrafoNode[];
		edges?: GrafoEdge[];
		// Filtros multi-select. Vacío = todos pasan (mismo patrón que
		// MultiChips en /mapa Técnicas).
		tipos?: string[];
		estados?: string[];
		categorias?: string[];
		// Callback opcional para abrir el modal de un nodo/arista al hacer
		// tap. Cuando el padre lo proporciona, el grafo delega en él en
		// lugar de tocar `mapaModalStack` directamente; así el padre puede
		// interceptar para preguntar "¿Descartar?" si el wizard actual está
		// dirty antes de cambiar de entidad.
		onAttemptPush?: (entry: MapaModalEntry) => void;
		// T8 / F2.0 (modo contras): callback invocado cuando el usuario
		// hace tap sobre el canvas vacío estando en modo contras. El padre
		// lo conecta a `mapaModalStack.closeAll()` para que el `$effect`
		// de sincronización detecte la salida y dispare `exitContrasMode`.
		// Opcional: si no se pasa, el tap sobre canvas vacío es no-op.
		onAttemptExitContrasMode?: () => void;
		// T-9.b.it3: bindable. El padre observa este flag para mostrar
		// el botón "Guardar organización" y para interceptar navegación
		// con AlertDialog "¿Descartar?".
		// Sube a `true` cuando:
		//   - tras hidratar desde BD quedan nodos sin layout persistido,
		//   - el usuario arrastra un nodo,
		//   - el usuario pulsa Reorganizar.
		// Vuelve a `false` solo cuando `saveLayout()` termina con éxito.
		dirty?: boolean;
		// T-1.it4 (rework): modo edición de layout. El padre lo bindea
		// a un botón "Mover nodos" del sub-header. En `false` (default)
		// los nodos son `ungrabify` + `pannable`: tap abre modal, drag
		// pannea el canvas. En `true` los nodos son `grabify`: drag
		// mueve el nodo, tap se ignora (sin modal) para no chocar con
		// el flujo de movimiento.
		editing?: boolean;
		// Id del elemento del grafo (con prefijo) que está actualmente
		// abierto en el modal/Sheet del mapa, o null si no hay nada
		// abierto. Cuando coincida con un nodo/arista del grafo, este se
		// destaca con la clase Cytoscape `.selected` (borde más grueso +
		// color de acento). El padre lo deriva del top del `mapaModalStack`.
		selectedGraphId?: string | null;
	};

	let {
		nodes = [],
		edges = [],
		tipos = [],
		estados = [],
		categorias = [],
		onAttemptPush,
		onAttemptExitContrasMode,
		dirty = $bindable(false),
		editing = $bindable(false),
		selectedGraphId = null
	}: Props = $props();

	let container: HTMLDivElement;
	let cy: Core | null = null;
	let loading = $state(true);
	let error = $state<string | null>(null);
	// Indicador visual breve cuando el grafo se reordena por cambio
	// del catálogo (T-7.it3). Se enciende al disparar fcose y se apaga
	// medio segundo después de `layoutstop`.
	let reordering = $state(false);
	let reorderingHideTimer: ReturnType<typeof setTimeout> | null = null;
	// T-9.b.it3: durante la hidratación inicial (cargar layouts desde
	// BD + primer layout) silenciamos el handler `dragfree` y el dirty
	// auto. Lo activamos al final de `onMount` para que el cierre
	// natural del layout no se interprete como "el usuario movió algo".
	let initialLoadComplete = false;
	// T-1.it4 (rework): el long-press no es viable con Cytoscape —
	// cambiar `grabify` durante un touch en curso rompe la maquinaria
	// interna (`r.dragData.touchDragEles` se inicializa solo en
	// `touchstart`, no se reevalúa después → undefined → TypeError).
	// Sustituido por un modo edición explícito: la prop `editing`
	// controla si los nodos son arrastrables o solo navegables. El
	// $effect de abajo sincroniza el estado de Cytoscape con la prop.

	// T8 / F2.0 (modo contras): snapshot del viewport y del display
	// vivos solo dentro del componente (D-13). Se capturan en
	// `enterContrasMode` y se consumen en `exitContrasMode`. No son
	// `$state` ni props: estado interno puramente imperativo.
	let viewportSnapshotInterno: { pan: Position; zoom: number } | null = null;
	let displaySnapshotInterno: Map<string, string> | null = null;
	// Referencias a los handlers tap del modo, guardadas para poder
	// hacer `cy.off()` limpio en `exitContrasMode`. Cytoscape requiere
	// la MISMA referencia de función para desconectar selectivamente.
	let tapSatelliteHandler: ((event: EventObject) => void) | null = null;
	let tapEmptyCanvasHandler: ((event: EventObject) => void) | null = null;

	/**
	 * Lee tokens semánticos desde las CSS vars del documento como strings
	 * `rgb(…)` que el parser de color de Cytoscape sí entiende.
	 *
	 * Doble paso necesario:
	 *  1. Probe DOM resuelve `var(--token)` aplicándola a `color` y
	 *     leyendo el computed. Navegadores modernos pueden devolverlo
	 *     como `oklch(...)`, `color(display-p3 ...)` o `rgb(...)` según
	 *     el gamut del token — no es portable.
	 *  2. Canvas trampolín: `ctx.fillStyle` SÍ entiende todos los
	 *     formatos CSS Color Level 4, y al leer el pixel devuelve r/g/b
	 *     enteros 0–255 en sRGB. Eso es lo que sí entiende Cytoscape.
	 */
	function readTokens() {
		const probe = document.createElement('div');
		// Forzar esquema dark independientemente del tema del sistema
		// — el canvas del grafo está envuelto en `.dark` y los nodos /
		// flechas / labels se leen mejor sobre fondo oscuro.
		probe.classList.add('dark');
		probe.style.position = 'absolute';
		probe.style.left = '-9999px';
		probe.style.top = '-9999px';
		probe.style.width = '1px';
		probe.style.height = '1px';
		document.body.appendChild(probe);

		const canvas = document.createElement('canvas');
		canvas.width = 1;
		canvas.height = 1;
		const ctx = canvas.getContext('2d');

		const toRgb = (varName: string): string => {
			probe.style.color = `var(${varName})`;
			const raw = getComputedStyle(probe).color;
			if (!ctx) return raw;
			try {
				ctx.clearRect(0, 0, 1, 1);
				ctx.fillStyle = raw;
				ctx.fillRect(0, 0, 1, 1);
				const data = ctx.getImageData(0, 0, 1, 1).data;
				return `rgb(${data[0]}, ${data[1]}, ${data[2]})`;
			} catch {
				return raw;
			}
		};

		const tokens = {
			primary: toRgb('--primary'),
			success: toRgb('--success'),
			warning: toRgb('--warning'),
			destructive: toRgb('--destructive'),
			muted: toRgb('--muted'),
			mutedForeground: toRgb('--muted-foreground'),
			foreground: toRgb('--foreground'),
			background: toRgb('--background'),
			border: toRgb('--border'),
			primaryForeground: toRgb('--primary-foreground')
		};
		probe.remove();
		return tokens;
	}

	/**
	 * Construye el stylesheet de Cytoscape a partir de los tokens.
	 * Paleta monocromática (decisión sobria): todas las posiciones se
	 * ven igual y la sumisión es el único nodo que se distingue por
	 * color. La diferenciación de rol (ofensiva/defensiva/neutral) se
	 * ve solo al clicar el nodo y abrir el modal.
	 *
	 *   - posición (cualquier rol) → fondo muted + borde muted-fg
	 *   - sumisión                → fondo foreground (oscuro) macizo
	 *
	 * Label fuera del círculo (`text-valign: bottom`) para que círculos
	 * pequeños no sufran texto desbordado.
	 *
	 * Tamaño dinámico vía `mapData(degree, 0, 8, 28, 64)`: huérfanos al
	 * mínimo (28 px) y nodos muy conectados hasta 64 px. `mapData`
	 * clampa fuera de rango por defecto. K = 8 elegido por catálogo
	 * BJJ típico.
	 *
	 * Aristas mantienen el mapeo previo (ataque/sweep/escape/transición/
	 * sumision a primary/success/warning/muted-foreground/destructive).
	 */
	function buildStylesheet(t: ReturnType<typeof readTokens>): StylesheetJson {
		return [
			// Base común para todos los nodos: forma, tamaño, label, borde
			// con grosor visible. El color de fondo y borde lo fijan los
			// selectores específicos de abajo.
			{
				selector: 'node',
				style: {
					shape: 'ellipse',
					label: 'data(label)',
					'border-width': 2,
					// Label fuera del círculo (debajo). Permite círculos
					// pequeños sin que el texto sobresalga del relleno.
					'text-valign': 'bottom',
					'text-halign': 'center',
					'text-margin-y': 4,
					'text-wrap': 'wrap',
					'text-max-width': '80px',
					color: t.foreground,
					'font-size': 10,
					'font-weight': 600,
					// Fondo del label tipo "pill": tono `--muted` (gris
					// ligeramente más claro que el canvas en el esquema
					// dark forzado), esquinas redondeadas, padding
					// generoso para que respire. Oculta cualquier arista
					// que pase justo por debajo sin chocar con la paleta.
					'text-background-color': t.muted,
					'text-background-opacity': 1,
					'text-background-padding': 3,
					'text-background-shape': 'round-rectangle',
					width: 'mapData(degree, 0, 8, 28, 64)',
					height: 'mapData(degree, 0, 8, 28, 64)'
				}
			},
			// Todas las posiciones (ofensiva/defensiva/neutral) comparten
			// el mismo aspecto: gris claro con borde sutil. La diferencia
			// entre roles ya no se ve en el grafo — se ve al clicar el
			// nodo y abrir el modal (chips TIPO_ROL_BADGE). Decisión
			// sobria: menos colores, jerarquía solo por tamaño/conexión.
			{
				selector: 'node[kind = "posicion"]',
				style: {
					'background-color': t.muted,
					'background-opacity': 1,
					'border-color': t.mutedForeground
				}
			},
			// Sumisión → relleno oscuro (foreground) macizo. Único nodo
			// que se distingue por color, marca de "terminal".
			{
				selector: 'node[kind = "sumision"]',
				style: {
					'background-color': t.foreground,
					'background-opacity': 1,
					'border-color': t.foreground
				}
			},
			// Aristas: todas en muted-foreground (mismo gris que el borde
			// de las posiciones — entona con la paleta monocromática). La
			// diferenciación por tipo (ataque/sweep/escape/sumision) ya no
			// se ve en el grafo; queda solo en el modal de la técnica al
			// hacer click sobre la arista. Único matiz de tipo aquí:
			// `transicion` va dashed (no es un movimiento "real", solo
			// cambio de posición — dashed comunica eso sin color extra).
			{
				selector: 'edge',
				style: {
					'curve-style': 'bezier',
					'target-arrow-shape': 'triangle',
					width: 2,
					'line-color': t.mutedForeground,
					'target-arrow-color': t.mutedForeground,
					'arrow-scale': 1.1
				}
			},
			{
				selector: 'edge[tipo = "transicion"]',
				style: { 'line-style': 'dashed' }
			},
			// Estado: funciona y probando se ven igual (sólida estándar).
			// Solo descartada se distingue (línea punteada y desvanecida).
			// La distinción fina probando vs funciona vive en el modal.
			{ selector: 'edge[estado = "funciona"]', style: { width: 2.5, opacity: 1 } },
			{ selector: 'edge[estado = "probando"]', style: { width: 2.5, opacity: 1 } },
			{
				selector: 'edge[estado = "descartada"]',
				style: { width: 1, opacity: 0.4, 'line-style': 'dotted' }
			},
			// Estado "selected" (sesión 39): indica el nodo o arista que
			// corresponde a la entidad abierta en el modal/Sheet. Borde
			// más grueso + color de acento (`--primary`). Va AL FINAL del
			// stylesheet para ganar en la cascada de Cytoscape (la última
			// regla que matchea pisa propiedades anteriores).
			{
				selector: 'node.selected',
				style: {
					'border-width': 4,
					'border-color': t.primary
				}
			},
			{
				selector: 'edge.selected',
				style: {
					width: 4,
					'line-color': t.primary,
					'target-arrow-color': t.primary,
					opacity: 1
				}
			},
			// Modo contras (T8 / F2.0): satélites temporales y aristas
			// hub→contra inyectados por enterContrasMode. Los selectores
			// usan el flag `data.temp = true` (selector por truthiness,
			// D-15). Quedan permanentes en el stylesheet aunque no haya
			// elementos `temp` montados — sólo se activan cuando los hay,
			// y así el `$effect` de tema (dark/light) los re-aplica sin
			// perderlos.
			{
				selector: 'node[temp][kind = "contra"]',
				style: {
					'background-color': t.muted,
					'background-opacity': 1,
					'border-color': t.mutedForeground,
					'border-width': 2,
					width: 36,
					height: 36,
					label: 'data(label)',
					'text-valign': 'bottom',
					'text-halign': 'center',
					'text-wrap': 'wrap',
					'text-max-width': '90px',
					color: t.foreground,
					'text-background-color': t.muted,
					'text-background-opacity': 1,
					'text-background-padding': 3,
					'text-background-shape': 'round-rectangle'
				}
			},
			{
				selector: 'edge[temp]',
				style: {
					'curve-style': 'bezier',
					'target-arrow-shape': 'triangle',
					width: 2,
					'line-color': t.mutedForeground,
					'target-arrow-color': t.mutedForeground,
					'arrow-scale': 1.1
				}
			},
			{
				selector: 'edge[temp][tipo = "transicion"]',
				style: { 'line-style': 'dashed' }
			}
		] as unknown as StylesheetJson;
	}

	/**
	 * Aplica los filtros activos al grafo sin reconstruirlo. Setea
	 * `display` en nodos y aristas en función de los multi-selects.
	 *
	 * Reglas:
	 *  - Vacío = todos pasan en esa dimensión (igual que MultiChips en
	 *    /mapa Técnicas).
	 *  - Nodos posición pasan si su categoría está seleccionada (o
	 *    el filtro de categoría está vacío).
	 *  - Aristas pasan si su tipo y estado están seleccionados (o esos
	 *    filtros están vacíos) Y ambos endpoints son visibles.
	 *  - Si hay algún filtro activo, los nodos sin aristas visibles se
	 *    ocultan (nodos huérfanos por filtro). Si todos los filtros
	 *    están vacíos, los nodos aislados sí se muestran (información
	 *    útil: "este nodo existe pero no tiene técnicas").
	 */
	function applyFilters(cyInst: Core) {
		const tipoSet = new Set(tipos);
		const estadoSet = new Set(estados);
		const catSet = new Set(categorias);
		const anyFilter = tipoSet.size > 0 || estadoSet.size > 0 || catSet.size > 0;

		cyInst.batch(() => {
			cyInst.nodes().forEach((n) => {
				if (n.data('kind') === 'posicion') {
					const pass = catSet.size === 0 || catSet.has(n.data('categoria'));
					n.style('display', pass ? 'element' : 'none');
				} else {
					n.style('display', 'element');
				}
			});

			cyInst.edges().forEach((e) => {
				const passTipo = tipoSet.size === 0 || tipoSet.has(e.data('tipo'));
				const passEstado = estadoSet.size === 0 || estadoSet.has(e.data('estado'));
				const endpointsVisible =
					e.source().style('display') !== 'none' && e.target().style('display') !== 'none';
				e.style('display', passTipo && passEstado && endpointsVisible ? 'element' : 'none');
			});

			if (anyFilter) {
				cyInst.nodes().forEach((n) => {
					if (n.style('display') === 'none') return;
					const visibleEdges = n.connectedEdges().filter((e) => e.style('display') !== 'none');
					if (visibleEdges.length === 0) {
						n.style('display', 'none');
					}
				});
			}
		});
	}

	// Reaccionar a cambios de filtros aplicándolos al cy ya montado. El
	// effect arranca pronto (antes de que cy exista mientras carga el
	// chunk dinámico); el null-check evita ese caso.
	$effect(() => {
		// dependencias explícitas para que el effect re-corra al cambiar
		// los arrays de filtros aunque las mutaciones sean por reasignación.
		tipos;
		estados;
		categorias;
		if (cy) applyFilters(cy);
	});

	// Sincroniza la prop `selectedGraphId` con la clase Cytoscape `.selected`.
	// Quita la clase a todos los elementos y la aplica solo al match (si lo
	// hay). Cytoscape `getElementById` devuelve una collection vacía si no
	// existe — `addClass` sobre vacía es no-op, seguro.
	$effect(() => {
		const id = selectedGraphId;
		if (!cy) return;
		cy.elements('.selected').removeClass('selected');
		if (id) {
			cy.getElementById(id).addClass('selected');
		}
	});

	// Sincroniza la prop `editing` con el estado de los nodos.
	// IMPORTANTE: pannable y grabbable son MUTUAMENTE EXCLUSIVOS en
	// Cytoscape — un nodo pannable se overridea a !grabbable
	// (cytoscape.esm.mjs:13757). Por eso hacemos toggle de ambos:
	//   - Modo navegación: panify + ungrabify (drag = pan canvas).
	//   - Modo edición:    unpanify + grabify (drag = mueve nodo).
	// Leemos `editing` ANTES del early return para que Svelte 5
	// registre la dependency en la primera evaluación (cuando aún
	// no hay `cy` y haríamos early return sin tracking).
	$effect(() => {
		const isEditing = editing;
		if (!cy) return;
		if (isEditing) {
			cy.nodes().unpanify();
			cy.nodes().grabify();
		} else {
			cy.nodes().ungrabify();
			cy.nodes().panify();
		}
	});

	// Reaccionar al cambio de tema (claro/oscuro). El theme manager aplica
	// la clase `.dark` en <html>; con eso CSS vars cambian. Re-leemos
	// tokens y reaplicamos el stylesheet entero. Usamos rAF para asegurar
	// que el navegador ya ha resuelto los nuevos computed styles (la
	// transición tema → CSS vars resueltos puede ser de un frame).
	$effect(() => {
		theme.isDark; // dependency
		if (!cy) return;
		const instance = cy;
		requestAnimationFrame(() => {
			instance.style(buildStylesheet(readTokens()));
		});
	});

	/**
	 * Elige opciones de layout en base al estado del cache:
	 *  - **Todos cacheados** → `preset` con coords del cache. Estable
	 *    e idéntico a la última vez (caso típico: añadir una arista
	 *    entre nodos existentes, o solo cambiar entre tabs).
	 *  - **Algunos cacheados** → `fcose` con `fixedNodeConstraint` para
	 *    los que sí están; los nuevos se acomodan respetando los
	 *    fijados. Caso típico tras T-9.b.it3: layout persistido en BD
	 *    + nodo nuevo creado en otra sesión.
	 *  - **Ninguno cacheado** → `fcose` plano. Catálogo vacío de
	 *    layouts persistidos o tras "Reorganizar".
	 *
	 * `forceFcose: true` ignora el cache entero — para el botón
	 * "Reorganizar" que el usuario pulsa cuando quiere reset.
	 */
	function pickLayoutOptions(
		currentNodes: GrafoNode[],
		forceFcose: boolean
	): { opts: LayoutOptions; isPreset: boolean } {
		if (forceFcose || positionsCache.size === 0) {
			return {
				opts: { name: 'fcose', animate: false } as unknown as LayoutOptions,
				isPreset: false
			};
		}
		const allCached = currentNodes.every((n) => positionsCache.has(n.data.id));
		if (allCached) {
			return {
				opts: {
					name: 'preset',
					positions: (node: { id(): string }) => positionsCache.get(node.id())
				} as unknown as LayoutOptions,
				isPreset: true
			};
		}
		// Algunos nodos cacheados, otros no: fcose con `fixedNodeConstraint`
		// para fijar los conocidos. fcose acepta un array
		// `{ nodeId, position: {x,y} }` que mantiene esos nodos inmóviles
		// durante el cómputo y acomoda solo los nuevos a su alrededor.
		const fixedNodeConstraint = currentNodes
			.map((n) => {
				const cached = positionsCache.get(n.data.id);
				return cached ? { nodeId: n.data.id, position: cached } : null;
			})
			.filter((x): x is { nodeId: string; position: { x: number; y: number } } => x !== null);
		return {
			opts: {
				name: 'fcose',
				animate: false,
				fixedNodeConstraint
			} as unknown as LayoutOptions,
			isPreset: false
		};
	}

	/**
	 * Corre un layout y actualiza cache (vía handler global registrado
	 * en onMount). `fit` controla si Cytoscape hace zoom-to-fit tras
	 * el layout — por defecto NO, para no resetear el viewport del
	 * usuario al re-calcular tras un cambio del catálogo. Solo
	 * activamos `fit` cuando el primer mount o cuando el usuario pulsa
	 * "Reorganizar" (ahí sí espera un reset visual).
	 */
	function runLayoutAndCache(instance: Core, forceFcose = false, fit = false) {
		const { opts, isPreset } = pickLayoutOptions(nodes, forceFcose);
		(opts as unknown as { fit: boolean }).fit = fit;
		if (!isPreset) reordering = true;
		instance.layout(opts).run();
		// El handler global `on('layoutstop', ...)` registrado en onMount
		// se encarga de actualizar el cache y bajar el flag `reordering`.
	}

	/**
	 * Limpia el cache de posiciones y corre fcose desde cero. Llamado
	 * desde el botón "Reorganizar" del padre vía `bind:this`. Marca
	 * el grafo como dirty: el usuario debe pulsar "Guardar organización"
	 * para persistir la nueva disposición (o descartar volviendo a
	 * cargar la página / cambiar de vista). T-9.b.it3.
	 */
	export function reorganize() {
		if (!cy) return;
		positionsCache.clear();
		runLayoutAndCache(cy, true, true);
		dirty = true;
	}

	/**
	 * Vuelca a BD las posiciones actuales de todos los nodos
	 * posición/sumisión del grafo. Llamado desde el botón
	 * "Guardar organización" del padre vía `bind:this`. T-9.b.it3.
	 *
	 * El id real (sin prefijo `pos:`/`sum:`) se obtiene strippeando
	 * los 4 primeros chars del id del nodo Cytoscape, mismo convenio
	 * que el handler `tap` del nodo.
	 *
	 * Reset `dirty=false` solo si el upsert termina sin error; si
	 * falla, el flag se mantiene para que el usuario pueda reintentar.
	 */
	export async function saveLayout(): Promise<void> {
		if (!cy) return;
		const rows: { entidad_id: string; kind: GrafoLayoutKind; x: number; y: number }[] = [];
		cy.nodes().forEach((n) => {
			const kind = n.data('kind') as GrafoLayoutKind | undefined;
			if (kind !== 'posicion' && kind !== 'sumision') return;
			const pos = n.position();
			rows.push({
				entidad_id: (n.id() as string).slice(4),
				kind,
				x: pos.x,
				y: pos.y
			});
		});
		await upsertLayouts(rows);
		dirty = false;
	}

	/**
	 * Pan animado para centrar una entidad (posición / sumisión / técnica)
	 * en la zona útil del canvas, dejando libre la parte tapada por el
	 * drawer/sheet del modal. NO toca el zoom — solo el pan. T-10.it3.
	 *
	 * El padre llama a este método cada vez que cambia el top del stack
	 * de modales. El `presentation` actual decide los insets:
	 *  - 'dialog'       → sin insets (vista Lista, no aplica).
	 *  - 'sheet-side'   → drawer derecho ocupa ~50% del ancho.
	 *  - 'sheet-bottom' → drawer inferior ocupa ~50% del alto.
	 *
	 * Para técnicas (arista), el "punto focal" es el midpoint entre los
	 * nodos source y target de la arista, no un nodo concreto. Coherente
	 * con la decisión de producto: una técnica no es un nodo, es la
	 * transición entre dos.
	 *
	 * Early returns silenciosos cuando:
	 *  - cy no inicializado todavía (race con mount).
	 *  - el nodo/arista no existe en el grafo (entidad recién borrada
	 *    pero modal aún abierto, o catálogo aún cargando).
	 */
	export function panToEntity(
		target: { kind: 'posicion' | 'sumision' | 'tecnica'; id: string },
		presentation: 'dialog' | 'sheet-side' | 'sheet-bottom'
	): void {
		if (!cy) return;
		const instance = cy;

		// Resolver coordenadas modelo del punto focal.
		let modelX: number;
		let modelY: number;
		if (target.kind === 'tecnica') {
			// Arista: el id Cytoscape es el id de la técnica tal cual
			// (sin prefijo) — ver `buildGrafoElements` en `$lib/grafo.ts`.
			const edge = instance.getElementById(target.id);
			if (edge.empty() || !edge.isEdge()) return;
			const src = edge.source();
			const tgt = edge.target();
			if (src.empty() || tgt.empty()) return;
			const ps = src.position();
			const pt = tgt.position();
			modelX = (ps.x + pt.x) / 2;
			modelY = (ps.y + pt.y) / 2;
		} else {
			const prefix = target.kind === 'posicion' ? 'pos:' : 'sum:';
			const node = instance.getElementById(prefix + target.id);
			if (node.empty()) return;
			const p = node.position();
			modelX = p.x;
			modelY = p.y;
		}

		// Centro pixel deseado dentro del contenedor, descontando insets.
		// `cy.width()` / `cy.height()` devuelven el tamaño del contenedor
		// del grafo (no del viewport modelo), en CSS pixels.
		const W = instance.width();
		const H = instance.height();
		let insetRight = 0;
		let insetBottom = 0;
		// Medimos el drawer real del DOM en vez de asumir un % fijo del
		// contenedor: el drawer se dimensiona contra el viewport
		// (`50dvh`, `sm:max-w-md`), no contra el grafo, así que sus
		// proporciones no coinciden con `H`/`W`. Calculamos el overlap real
		// entre el rect del drawer y el rect del contenedor del grafo.
		if (presentation === 'sheet-bottom' || presentation === 'sheet-side') {
			const side = presentation === 'sheet-bottom' ? 'bottom' : 'right';
			const drawerEl = document.querySelector<HTMLElement>(
				`[data-slot="sheet-content"][data-side="${side}"]`
			);
			if (drawerEl) {
				const drawerRect = drawerEl.getBoundingClientRect();
				const grafoRect = container.getBoundingClientRect();
				if (presentation === 'sheet-bottom') {
					insetBottom = Math.max(0, grafoRect.bottom - drawerRect.top);
				} else {
					insetRight = Math.max(0, grafoRect.right - drawerRect.left);
				}
			} else {
				// Fallback: primer render, drawer aún no en DOM. Aproximamos
				// con el ratio de diseño (drawer ≈ 50% del eje correspondiente).
				if (presentation === 'sheet-side') insetRight = W * 0.5;
				else insetBottom = H * 0.5;
			}
		}
		const targetPxX = (W - insetRight) / 2;
		const targetPxY = (H - insetBottom) / 2;

		// Pan target en Cytoscape: para que el punto modelo `m` aparezca
		// en el pixel `p`, pan = p - m * zoom (transformación afín
		// estándar: pixel = m * zoom + pan).
		const zoom = instance.zoom();
		const panX = targetPxX - modelX * zoom;
		const panY = targetPxY - modelY * zoom;

		// `stop()` cancela cualquier animación previa (incluido el settle
		// inicial de fcose si llega justo después del mount). El drag
		// activo del usuario NO es animación — es input directo y no se
		// ve afectado por `stop()`.
		instance.stop();
		instance.animate({
			pan: { x: panX, y: panY },
			duration: 300,
			easing: 'ease-in-out'
		} as Parameters<typeof instance.animate>[0]);
	}

	// Reaccionar a cambios del dataset (cuando el padre llama refresh()
	// tras editar/crear desde un modal abierto vía click en el grafo).
	// Reemplaza los elements de Cytoscape en sitio sin recrear la
	// instancia. El layout se elige incrementalmente: nodos cacheados
	// quedan donde están, los nuevos se acomodan alrededor.
	$effect(() => {
		nodes;
		edges;
		if (!cy) return;
		const instance = cy;
		instance.elements().remove();
		instance.add([...nodes, ...edges]);
		runLayoutAndCache(instance);
		// Tras remove/add el style base se reaplica; reactivar filtros.
		applyFilters(instance);
	});

	onMount(() => {
		let cancelled = false;

		(async () => {
			try {
				// Cargamos en paralelo: chunk Cytoscape, chunk fcose y la
				// tabla `grafo_layout` (T-9.b.it3). El SELECT es barato y
				// el await aquí evita un flicker en el que fcose
				// computaría posiciones que luego sobreescribiríamos.
				const [cytoscapeMod, fcoseMod, dbLayouts] = await Promise.all([
					import('cytoscape'),
					import('cytoscape-fcose'),
					getAllLayouts().catch((err) => {
						// Si la BD falla (improbable: solo lectura), seguimos
						// con cache vacío. Mejor degradar a fcose plano que
						// petar la vista entera.
						console.error('[GrafoMapa] getAllLayouts failed:', err);
						return [];
					})
				]);
				if (cancelled) return;

				// Siembra el cache desde BD: la clave es el id Cytoscape
				// (con prefijo `pos:`/`sum:`), el row guarda el id desnudo.
				positionsCache.clear();
				for (const row of dbLayouts) {
					const prefix = row.kind === 'posicion' ? 'pos:' : 'sum:';
					positionsCache.set(prefix + row.entidad_id, { x: row.x, y: row.y });
				}

				const cytoscape = cytoscapeMod.default;
				// cytoscape-fcose es CJS empaquetado; según el bundler `default`
				// puede ser el plugin (ESM interop) o no existir (en cuyo caso
				// el módulo entero es el plugin). Tomamos lo primero que sea
				// callable.
				const fcose = (fcoseMod as { default?: unknown }).default ?? fcoseMod;
				cytoscape.use(fcose as never);

				// Instanciamos SIN layout — el `layout` dentro del constructor
				// se ejecuta inmediatamente y dispara `layoutstop` antes de
				// que podamos registrar listeners; el cache se quedaba sin
				// poblar. En su lugar usamos `null` (no-op layout) y
				// disparamos el layout real abajo, ya con el handler activo.
				const instance = cytoscape({
					container,
					elements: [...nodes, ...edges],
					layout: { name: 'null' } as unknown as LayoutOptions,
					minZoom: 0.2,
					maxZoom: 3,
					style: buildStylesheet(readTokens())
				});

				// Handler persistente: cada vez que un layout termina, vuelca
				// las posiciones al cache y baja el flag de "reorganizando".
				// Cubre tanto el layout inicial como cualquier recálculo
				// posterior (cambio de catálogo, click en Reorganizar).
				instance.on('layoutstop', () => {
					instance.nodes().forEach((n) => {
						const p = n.position();
						positionsCache.set(n.id(), { x: p.x, y: p.y });
					});
					if (reorderingHideTimer) clearTimeout(reorderingHideTimer);
					reorderingHideTimer = setTimeout(() => {
						reordering = false;
					}, 600);
				});

				// T-9.b.it3: drag persistente. Cada vez que el usuario
				// suelta un nodo, actualizamos cache + marcamos dirty.
				// NO escribimos a BD aquí; eso lo hace `saveLayout()`.
				// Silenciamos durante la carga inicial para no contar el
				// settle del primer fcose como "el usuario movió algo".
				instance.on('dragfree', 'node', (event) => {
					if (!initialLoadComplete) return;
					const node = event.target;
					const p = node.position();
					positionsCache.set(node.id(), { x: p.x, y: p.y });
					dirty = true;
				});

				// Modo navegación (default): nodos `panify` + `ungrabify` →
				// drag desde nodo pannea el canvas. Modo edición:
				// `unpanify` + `grabify` → drag mueve el nodo. Los dos
				// flags son mutuamente excluyentes (pannable overridea
				// grabbable a false en Cytoscape), por eso van en pareja.
				if (editing) {
					instance.nodes().unpanify();
					instance.nodes().grabify();
				} else {
					instance.nodes().ungrabify();
					instance.nodes().panify();
				}
				// Nodos añadidos posteriormente (cambio de catálogo, vía
				// el $effect que reemplaza elements) heredan el modo actual.
				instance.on('add', 'node', (event) => {
					if (editing) {
						event.target.unpanify();
						event.target.grabify();
					} else {
						event.target.ungrabify();
						event.target.panify();
					}
				});

				// Click en nodo: pushea posición o sumisión al stack de
				// modales del mapa (reusa el host existente). El id real
				// del nodo lleva prefijo 'pos:' o 'sum:' (4 chars) para
				// evitar colisiones en el grafo — se strippea aquí.
				instance.on('tap', 'node', (event) => {
					// En modo edición ignoramos el tap: el usuario está
					// moviendo nodos, no navegando. Para abrir modal hay
					// que salir del modo edición primero.
					if (editing) return;
					const node = event.target;
					const kind = node.data('kind') as 'posicion' | 'sumision';
					const realId = (node.id() as string).slice(4);
					const nombre = node.data('label') as string;
					const entry: MapaModalEntry = { kind, id: realId, nombre };
					if (onAttemptPush) {
						onAttemptPush(entry);
					} else {
						mapaModalStack.closeAll();
						mapaModalStack.push(entry);
					}
				});

				// Click en arista: pushea la técnica. El id de la arista
				// es el id de la técnica tal cual (sin prefijo).
				instance.on('tap', 'edge', (event) => {
					// Mismo criterio que en nodos: en modo edición no
					// abrimos modales.
					if (editing) return;
					const edge = event.target;
					const id = edge.id() as string;
					const nombre = edge.data('nombre') as string;
					const entry: MapaModalEntry = { kind: 'tecnica', id, nombre };
					if (onAttemptPush) {
						onAttemptPush(entry);
					} else {
						mapaModalStack.closeAll();
						mapaModalStack.push(entry);
					}
				});
				cy = instance;
				// T-9.b.it3: si hay nodos sin layout persistido en BD,
				// fcose con `fixedNodeConstraint` los acomodará alrededor
				// de los fijados. Auto-dirty para alertar al usuario de
				// que hay disposiciones nuevas no guardadas.
				const nodesWithoutDbLayout = nodes.filter((n) => !positionsCache.has(n.data.id));
				const autoDirty = nodes.length > 0 && nodesWithoutDbLayout.length > 0;

				// Disparar el layout real ahora que el handler de
				// `layoutstop` ya está registrado y va a poblar el cache.
				// `fit: true` solo en el primer mount para encuadrar el
				// grafo entero a la primera vista.
				runLayoutAndCache(instance, false, true);
				// Aplicar filtros iniciales en caso de que ya estuvieran activos
				// antes del mount (el $effect podría haber corrido con cy null).
				applyFilters(instance);
				loading = false;
				if (autoDirty) dirty = true;
				// Activar el dragfree handler. A partir de aquí, cualquier
				// movimiento del usuario sube el flag dirty.
				initialLoadComplete = true;
			} catch (e) {
				error = e instanceof Error ? e.message : String(e);
				loading = false;
			}
		})();

		return () => {
			cancelled = true;
		};
	});

	onDestroy(() => {
		cy?.destroy();
		cy = null;
	});

	/**
	 * Construye el label multi-línea de un satélite contra (D-10).
	 * `{nombre técnica}\ndesde {posición origen}`, o con `(variante)`
	 * intercalado si la técnica tiene variante.
	 */
	function buildSateliteLabel(c: Tecnica, posicionesById: Record<string, string>): string {
		const cabecera = c.variante ? `${c.nombre} (${c.variante})` : c.nombre;
		const origen = posicionesById[c.posicion_origen_id] ?? '?';
		return `${cabecera}\ndesde ${origen}`;
	}

	/**
	 * Inyecta el hub-as-node central + satélites + aristas dirigidas y
	 * corre el layout preset radial animado. Compartido entre
	 * `enterContrasMode` y `transitionContrasMode` para no duplicar la
	 * lógica de inyección + animación (D-15, D-12). El cap N=20 (D-16)
	 * se aplica aquí.
	 */
	function injectContrasElements(
		instance: Core,
		hub: Tecnica,
		contras: Tecnica[],
		posicionesById: Record<string, string>
	): void {
		const hubNodeId = `contra-node:${hub.id}`;
		// D-16: cap visual N=20. La lista de overflow vive en el modal,
		// no en el canvas.
		const visibles = contras.slice(0, 20);

		const elementsToAdd: Parameters<Core['add']>[0] = [];
		elementsToAdd.push({
			group: 'nodes',
			data: {
				id: hubNodeId,
				temp: true,
				kind: 'hub-tecnica',
				tecnicaId: hub.id,
				label: hub.nombre
			}
		});
		for (const c of visibles) {
			const satId = `contra-node:${c.id}`;
			elementsToAdd.push({
				group: 'nodes',
				data: {
					id: satId,
					temp: true,
					kind: 'contra',
					tecnicaId: c.id,
					label: buildSateliteLabel(c, posicionesById)
				}
			});
			elementsToAdd.push({
				group: 'edges',
				data: {
					id: `contra-edge:${hub.id}->${c.id}`,
					temp: true,
					source: hubNodeId,
					target: satId,
					tipo: c.tipo
				}
			});
		}

		instance.batch(() => {
			instance.add(elementsToAdd);
		});

		const satIds = visibles.map((c) => `contra-node:${c.id}`);
		const positionsMap = computeRadialPositions(satIds, hubNodeId);

		instance.stop();
		instance
			.layout({
				name: 'preset',
				positions: (node: { id(): string }) =>
					positionsMap.get(node.id()) ?? { x: 0, y: 0 },
				animate: true,
				animationDuration: 350,
				animationEasing: 'ease-in-out',
				fit: true,
				padding: 40
			} as unknown as LayoutOptions)
			.run();
	}

	/**
	 * Pone `display:'none'` a todo excepto la arista del hub y sus dos
	 * nodos extremos. Usado en `enterContrasMode` y en
	 * `transitionContrasMode` (cuando cambia el hub, hay que recalcular
	 * qué arista + extremos quedan visibles). Asume `cy.batch()` por
	 * fuera para agrupar las mutaciones.
	 */
	function hideAllExceptHubEdge(instance: Core, hubId: string): void {
		const hubEdge = instance.getElementById(hubId);
		const srcId = !hubEdge.empty() && hubEdge.isEdge() ? hubEdge.source().id() : null;
		const tgtId = !hubEdge.empty() && hubEdge.isEdge() ? hubEdge.target().id() : null;
		instance.elements().forEach((el) => {
			// Los elementos temporales siempre visibles (ya marcados con
			// `data.temp`); no los toca el modo.
			if (el.data('temp')) {
				el.style('display', 'element');
				return;
			}
			const id = el.id();
			if (id === hubId || id === srcId || id === tgtId) {
				el.style('display', 'element');
			} else {
				el.style('display', 'none');
			}
		});
	}

	/**
	 * Entra al modo contras: captura snapshot interno (viewport + display
	 * por id), oculta todo el grafo excepto la arista del hub + sus
	 * extremos, inyecta el hub-as-node central + los satélites con
	 * aristas dirigidas, corre layout preset radial animado y cablea los
	 * dos handlers tap nuevos (sobre satélites/hub-as-node y sobre canvas
	 * vacío). T8 §3.2.
	 *
	 * Idempotente desde fuera: si ya hay un modo activo, el padre debe
	 * llamar a `exitContrasMode` antes — o usar `transitionContrasMode`.
	 */
	export function enterContrasMode(
		hub: Tecnica,
		contras: Tecnica[],
		posicionesById: Record<string, string>
	): void {
		if (!cy) return;
		const instance = cy;

		// 1. Snapshot viewport.
		viewportSnapshotInterno = { pan: { ...instance.pan() }, zoom: instance.zoom() };

		// 2. Snapshot display por id.
		const snap = new Map<string, string>();
		instance.elements().forEach((el) => {
			snap.set(el.id(), el.style('display'));
		});
		displaySnapshotInterno = snap;

		// 3. Ocultar todo excepto la arista del hub + sus extremos.
		instance.batch(() => {
			hideAllExceptHubEdge(instance, hub.id);
		});

		// 4 + 5 + 6. Inyectar elementos + layout radial animado.
		injectContrasElements(instance, hub, contras, posicionesById);

		// 7. Cablear handlers tap del modo. Guardamos referencias para
		// poder `cy.off()` selectivo en `exitContrasMode`.
		tapSatelliteHandler = (event: EventObject) => {
			const node = event.target;
			// Filtramos por `kind === 'contra'`: el hub-as-node central
			// también matchea `node[temp]`, pero un tap sobre él sería
			// un no-op (top del stack ya es el hub) — evitamos disparar
			// un push redundante. Decisión registrada en el reporte T8.
			const kind = node.data('kind') as string | undefined;
			if (kind !== 'contra') return;
			const tecnicaId = node.data('tecnicaId') as string;
			const nombre = (node.data('label') as string).split('\n')[0];
			onAttemptPush?.({ kind: 'tecnica', id: tecnicaId, nombre });
		};
		tapEmptyCanvasHandler = (event: EventObject) => {
			if (event.target === instance) {
				onAttemptExitContrasMode?.();
			}
		};
		instance.on('tap', 'node[temp]', tapSatelliteHandler);
		instance.on('tap', tapEmptyCanvasHandler);
	}

	/**
	 * Transiciona el modo contras al hub `newHub` sin salir del modo:
	 * elimina los elementos temporales actuales, ajusta el display para
	 * que sea la nueva arista del hub + sus extremos lo único visible,
	 * inyecta el nuevo hub-as-node + satélites y anima. NO captura
	 * snapshot, NO toca handlers tap (ya cableados desde `enter`). T8 §3.2.
	 */
	export function transitionContrasMode(
		newHub: Tecnica,
		newContras: Tecnica[],
		posicionesById: Record<string, string>
	): void {
		if (!cy) return;
		const instance = cy;

		instance.stop();

		// Limpiamos elementos temporales del hub anterior. El selector
		// por truthiness `[temp]` (D-15) matchea cualquier elemento con
		// `data.temp` veraz, sin importar el valor.
		instance.remove('node[temp], edge[temp]');

		// Reajustamos `display` del grafo real: la arista del nuevo hub
		// + sus extremos deben ser visibles; el resto oculto. Esto cubre
		// el caso en que el hub previo y el nuevo no comparten extremos.
		instance.batch(() => {
			hideAllExceptHubEdge(instance, newHub.id);
		});

		// Re-inyectamos hub-as-node central + satélites + aristas y
		// disparamos animación.
		injectContrasElements(instance, newHub, newContras, posicionesById);
	}

	/**
	 * Sale del modo contras: descablea handlers tap del modo, elimina
	 * elementos temporales, restaura el `display` desde el snapshot,
	 * anima posiciones a `positionsCache` (fcose original) y al
	 * terminar restaura el viewport (pan + zoom) capturado en `enter`.
	 * T8 §3.2.
	 */
	export function exitContrasMode(): void {
		if (!cy) return;
		const instance = cy;

		instance.stop();

		// Descableamos handlers tap del modo. `cy.off` con misma
		// referencia + mismo selector es selectivo: no toca los handlers
		// `tap` permanentes del grafo (sobre `node` y `edge` reales).
		if (tapSatelliteHandler) {
			instance.off('tap', 'node[temp]', tapSatelliteHandler);
			tapSatelliteHandler = null;
		}
		if (tapEmptyCanvasHandler) {
			instance.off('tap', tapEmptyCanvasHandler);
			tapEmptyCanvasHandler = null;
		}

		// Quitamos temporales. Si el id ya no existe (limpieza paralela
		// improbable), el selector simplemente devuelve colección vacía.
		instance.remove('node[temp], edge[temp]');

		// Restauramos `display` desde el snapshot. Si un id ya no existe
		// en el grafo (entidad borrada mientras estuvimos en modo
		// contras), `getElementById` devuelve colección vacía y `style`
		// es no-op — seguro.
		const snap = displaySnapshotInterno;
		if (snap) {
			instance.batch(() => {
				snap.forEach((d, id) => {
					instance.getElementById(id).style('display', d);
				});
			});
		}

		// Layout preset animado a las posiciones cacheadas de fcose.
		// `fit:false` para no resetear el viewport; lo restauramos
		// manualmente abajo desde el snapshot.
		const snapshot = viewportSnapshotInterno;
		instance.one('layoutstop', () => {
			if (!snapshot) return;
			instance.animate({
				pan: snapshot.pan,
				zoom: snapshot.zoom,
				duration: 300,
				easing: 'ease-in-out'
			} as Parameters<typeof instance.animate>[0]);
		});
		instance
			.layout({
				name: 'preset',
				positions: (node: { id(): string; position(): Position }) =>
					positionsCache.get(node.id()) ?? node.position(),
				animate: true,
				animationDuration: 350,
				animationEasing: 'ease-in-out',
				fit: false,
				padding: 40
			} as unknown as LayoutOptions)
			.run();

		// Limpiamos snapshots: el siguiente `enter` capturará otros nuevos.
		viewportSnapshotInterno = null;
		displaySnapshotInterno = null;
	}

	/**
	 * Posiciones radiales para el modo contras (T8 §3.1): hub en (0,0)
	 * y satélite i en (R·cos θᵢ, R·sin θᵢ) con θᵢ = -π/2 + 2π·i/N.
	 * Primer satélite a las 12 y resto en sentido horario.
	 *
	 * R se calcula internamente como clamp(80, 50+N·12, 140) — crece con
	 * N pero saturado para que no se desborde el canvas con N grande.
	 *
	 * Mitigación N=1: con θ=-π/2 el satélite caería justo encima del
	 * label del hub. Lo movemos a θ=0 (derecha) para no chocar.
	 *
	 * Devuelve un Map<id, {x,y}> donde `id` es el id ya con prefijo
	 * `contra-node:<tecnicaId>` (D-15) tal y como se inyecta al grafo
	 * desde enterContrasMode/transitionContrasMode. El hub (también
	 * con prefijo `contra-node:<hubId>`) entra en el Map en (0,0).
	 */
	function computeRadialPositions(
		ids: string[],
		hubId: string
	): Map<string, { x: number; y: number }> {
		const positions = new Map<string, { x: number; y: number }>();
		positions.set(hubId, { x: 0, y: 0 });
		const N = ids.length;
		if (N === 0) return positions;
		const R = Math.max(80, Math.min(140, 50 + N * 12));
		const isSingle = N === 1;
		for (let i = 0; i < N; i += 1) {
			const theta = isSingle ? 0 : -Math.PI / 2 + (2 * Math.PI * i) / N;
			positions.set(ids[i], {
				x: R * Math.cos(theta),
				y: R * Math.sin(theta)
			});
		}
		return positions;
	}
</script>

<!--
  `dark` fuerza que el canvas del grafo use el esquema oscuro
  independientemente del tema del sistema (decisión: el grafo se ve
  mejor sobre fondo oscuro, los nodos y flechas se leen con más
  presencia). Tokens leídos en `readTokens` también resuelven a los
  valores de `.dark` porque el probe se inserta con esa misma clase.
-->
<div class="dark relative h-full w-full overflow-hidden bg-card sm:rounded-xl sm:border sm:border-border">
	{#if loading}
		<div class="absolute inset-0 flex items-center justify-center text-muted-foreground">
			Cargando grafo…
		</div>
	{/if}
	{#if error}
		<div class="absolute inset-0 flex items-center justify-center p-4 text-destructive">
			Error al cargar el grafo: {error}
		</div>
	{/if}
	<div bind:this={container} class="h-full w-full"></div>
	{#if !loading && !error}
		<!--
		  T-9.b.it3: el botón "Reorganizar" se ha movido al sub-header
		  de `/mapa` (junto a "Guardar organización"). El padre llama
		  al método imperativo `reorganize()` vía `bind:this`.
		-->
		<GrafoLeyenda />
		{#if reordering}
			<div
				class="absolute bottom-3 left-1/2 z-10 -translate-x-1/2 rounded-full border border-border bg-popover px-3 py-1.5 text-xs text-popover-foreground shadow-md"
				role="status"
				aria-live="polite"
			>
				Reorganizando grafo…
			</div>
		{/if}
	{/if}
</div>
