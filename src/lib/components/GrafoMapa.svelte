<script lang="ts" module>
	/**
	 * Cache de posiciones de nodos a nivel de módulo (vive mientras la
	 * pestaña esté abierta). Lo usamos para que al cambiar de tab y
	 * volver a "Grafo" la disposición sea idéntica — fcose por diseño
	 * es no determinista (cada cálculo da un layout distinto).
	 *
	 * Convenio: si para los nodos actuales tenemos TODAS sus posiciones
	 * cacheadas, usamos layout `preset` con esas coords. En cuanto
	 * aparece un nodo nuevo (catálogo creció), volvemos a fcose y
	 * sobrescribimos el cache. La regla "$state solo en class fields"
	 * no aplica aquí porque esto NO es state reactivo — es solo memo
	 * mutable.
	 */
	const positionsCache = new Map<string, { x: number; y: number }>();
</script>

<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import type { Core, LayoutOptions, StylesheetJson } from 'cytoscape';
	import RefreshCwIcon from '@lucide/svelte/icons/refresh-cw';
	import type { GrafoEdge, GrafoNode } from '$lib/grafo';
	import { theme } from '$lib/theme.svelte';
	import GrafoLeyenda from '$lib/components/GrafoLeyenda.svelte';
	import { mapaModalStack, type MapaModalEntry } from '$lib/components/mapa-modal-stack.svelte';
	import { Button } from '$lib/components/ui/button';

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
	};

	let {
		nodes = [],
		edges = [],
		tipos = [],
		estados = [],
		categorias = [],
		onAttemptPush
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
	 * Construye el stylesheet de Cytoscape a partir de los tokens. Mapeo:
	 *  - ataque/sweep/escape/transicion/sumision a los mismos colores que
	 *    el badge de tipo en la vista Técnicas (primary/success/warning/
	 *    muted-foreground/destructive), manteniendo el lenguaje visual.
	 *  - Transición = línea punteada (única distinción por estilo de línea).
	 *  - Estado funciona = línea más gruesa y opaca; probando = grosor
	 *    medio y opacidad media; descartada = fina y apenas visible.
	 *  - Sumisión = nodo en forma de diamante con fondo --destructive.
	 *  - Posición ofensiva/defensiva/neutral = mismo fondo --muted con
	 *    borde de color (success/destructive/border) — diferenciación
	 *    legible sin saturar.
	 */
	function buildStylesheet(t: ReturnType<typeof readTokens>): StylesheetJson {
		return [
			// Posición base
			{
				selector: 'node[kind = "posicion"]',
				style: {
					shape: 'round-rectangle',
					label: 'data(label)',
					'background-color': t.muted,
					'border-color': t.border,
					'border-width': 1,
					'text-valign': 'center',
					'text-halign': 'center',
					'text-wrap': 'wrap',
					'text-max-width': '76px',
					color: t.foreground,
					'font-size': 11,
					width: 90,
					height: 64
				}
			},
			{
				selector: 'node[kind = "posicion"][tipoRol = "ofensiva"]',
				style: { 'border-color': t.success, 'border-width': 3 }
			},
			{
				selector: 'node[kind = "posicion"][tipoRol = "defensiva"]',
				style: { 'border-color': t.destructive, 'border-width': 3 }
			},
			// Sumisión: diamante (nodo terminal). Mismo patrón visual
			// que posición defensiva (relleno gris + borde rojo grueso),
			// solo cambia la forma — para no saturar con un rojo macizo.
			{
				selector: 'node[kind = "sumision"]',
				style: {
					shape: 'diamond',
					label: 'data(label)',
					'background-color': t.muted,
					'border-color': t.destructive,
					'border-width': 3,
					'text-valign': 'center',
					'text-halign': 'center',
					'text-wrap': 'wrap',
					'text-max-width': '60px',
					color: t.foreground,
					'font-size': 11,
					width: 96,
					height: 96
				}
			},
			// Aristas: defaults
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
			// Color por tipo
			{
				selector: 'edge[tipo = "ataque"]',
				style: { 'line-color': t.primary, 'target-arrow-color': t.primary }
			},
			{
				selector: 'edge[tipo = "sweep"]',
				style: { 'line-color': t.success, 'target-arrow-color': t.success }
			},
			{
				selector: 'edge[tipo = "escape"]',
				style: { 'line-color': t.warning, 'target-arrow-color': t.warning }
			},
			{
				selector: 'edge[tipo = "transicion"]',
				style: {
					'line-color': t.mutedForeground,
					'target-arrow-color': t.mutedForeground,
					'line-style': 'dashed'
				}
			},
			{
				selector: 'edge[tipo = "sumision"]',
				style: { 'line-color': t.destructive, 'target-arrow-color': t.destructive }
			},
			// Estado: funciona y probando se ven igual (sólida color tipo).
			// Solo descartada se distingue (línea punteada y desvanecida).
			// La distinción fina probando vs funciona vive en el modal.
			{ selector: 'edge[estado = "funciona"]', style: { width: 2.5, opacity: 1 } },
			{ selector: 'edge[estado = "probando"]', style: { width: 2.5, opacity: 1 } },
			{
				selector: 'edge[estado = "descartada"]',
				style: { width: 1, opacity: 0.4, 'line-style': 'dotted' }
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
	 *  - **Cualquier nodo nuevo** → `fcose` completo. Más limpio y
	 *    predecible que intentar inserción incremental que termina
	 *    colocando el nuevo nodo en mal sitio (descartado tras
	 *    feedback del owner — el coste de mantener los viejos
	 *    inmóviles no se justifica si el resultado igual obliga a
	 *    reorganizar manualmente).
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
		return {
			opts: { name: 'fcose', animate: false } as unknown as LayoutOptions,
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
	 * Handler del botón "Reorganizar". Limpia el cache de posiciones y
	 * corre fcose desde cero. El usuario lo usa cuando el grafo se ha
	 * vuelto desordenado tras varios cambios incrementales y quiere
	 * reset visual.
	 */
	function reorganizar() {
		if (!cy) return;
		positionsCache.clear();
		runLayoutAndCache(cy, true, true);
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
				const [cytoscapeMod, fcoseMod] = await Promise.all([
					import('cytoscape'),
					import('cytoscape-fcose')
				]);
				if (cancelled) return;

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

				// Click en nodo: pushea posición o sumisión al stack de
				// modales del mapa (reusa el host existente). El id real
				// del nodo lleva prefijo 'pos:' o 'sum:' (4 chars) para
				// evitar colisiones en el grafo — se strippea aquí.
				instance.on('tap', 'node', (event) => {
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
				// Disparar el layout real ahora que el handler de
				// `layoutstop` ya está registrado y va a poblar el cache.
				// `fit: true` solo en el primer mount para encuadrar el
				// grafo entero a la primera vista.
				runLayoutAndCache(instance, false, true);
				// Aplicar filtros iniciales en caso de que ya estuvieran activos
				// antes del mount (el $effect podría haber corrido con cy null).
				applyFilters(instance);
				loading = false;
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
</script>

<div class="relative h-full w-full">
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
		<Button
			variant="outline"
			size="icon"
			class="absolute top-3 left-3 z-10 size-9 rounded-full shadow-sm"
			aria-label="Reorganizar grafo"
			title="Reorganizar grafo"
			onclick={reorganizar}
		>
			<RefreshCwIcon class="size-4" />
		</Button>
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
