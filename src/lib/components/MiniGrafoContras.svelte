<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import type { Core, LayoutOptions, StylesheetJson } from 'cytoscape';
	import type { Tecnica } from '$lib/types';
	import { theme } from '$lib/theme.svelte';

	/**
	 * Mini-grafo hub-spoke de contras dentro del modal de técnica
	 * (T7 Fase 1). La técnica del modal es el hub (centro); las contras
	 * que la contrarrestan son satélites colocados en círculo. Aristas
	 * dirigidas hub → contra reflejan la asimetría real de
	 * `tecnica_contras` (ver `src/lib/contras.ts:1-13`).
	 *
	 * Componente **read-only**: la edición de contras (añadir / quitar)
	 * sigue viviendo en `TecnicaModalContent.svelte` debajo del canvas.
	 *
	 * Decisiones del plan T7 implementadas aquí:
	 *  - D-1 Paleta monocromática estricta (hub `--foreground` macizo,
	 *    satélites `--muted` + borde `--muted-foreground`, aristas
	 *    `--muted-foreground`).
	 *  - D-2 Aristas `transicion` dashed, resto sólidas.
	 *  - D-4 Aristas dirigidas con flecha (`target-arrow-shape: triangle`).
	 *  - D-5 Layout `preset` radial trigonométrico (sin fcose).
	 *  - D-6 Cap visual a N=20 con badge "+ N más…" y fallback a lista
	 *    plana debajo.
	 *  - D-7 Label de cada satélite multi-línea: nombre + "desde {origen}".
	 *  - D-8 Una instancia Cytoscape por modal (mount/destroy).
	 *  - D-10 Altura por defecto 320 px.
	 *  - D-12 `readTokens` copiado verbatim desde `GrafoMapa.svelte`.
	 */

	type Props = {
		tecnica: Tecnica;
		// Contras ya resueltas a entidades completas por el padre vía
		// getContras(tecnicaId). No se vuelve a consultar BD desde aquí.
		contras: Tecnica[];
		// Cache id → nombre de posiciones, para el sub-label
		// "desde {origen}" en cada satélite.
		posicionesById: Record<string, string>;
		// Callback al tap sobre un satélite. No-op si no se pasa.
		onTapContra?: (contra: Tecnica) => void;
		// Callback al tap sobre el hub. No-op si no se pasa.
		onTapHub?: (tecnica: Tecnica) => void;
		// Reservada para Fase 2 (highlight de un nodo concreto). Declarada
		// pero NO consumida en Fase 1.
		selectedId?: string | null;
		// Altura del canvas en píxeles. Default 320 px (D-10).
		height?: number;
	};

	let {
		tecnica,
		contras = [],
		posicionesById = {},
		onTapContra,
		onTapHub,
		// `selectedId` se declara para Fase 2 (D-3 del plan). En Fase 1
		// no se consume — desestructurar y descartar deja la API pública
		// estable sin que el linter se queje por unused.
		selectedId: _selectedId = null,
		height = 320
	}: Props = $props();

	let container: HTMLDivElement;
	let cy: Core | null = null;
	let loading = $state(true);
	let error = $state<string | null>(null);

	// Cap visual D-6: si hay más de N_CAP contras, mostramos solo las
	// primeras y avisamos del resto con un badge. La lista plana de
	// fallback se renderiza siempre debajo cuando hay overflow.
	const N_CAP = 20;
	let visibleContras = $derived(contras.slice(0, N_CAP));
	let overflowCount = $derived(Math.max(0, contras.length - N_CAP));

	/**
	 * Lee tokens semánticos desde las CSS vars del documento como
	 * strings `rgb(…)` que el parser de color de Cytoscape entiende.
	 *
	 * Copiado verbatim desde `GrafoMapa.svelte` (D-12). Doble paso
	 * (probe DOM + canvas trampolín) necesario porque navegadores
	 * modernos pueden devolver computed colors como `oklch(...)` o
	 * `color(display-p3 ...)`, formatos que Cytoscape no parsea.
	 */
	function readTokens() {
		const probe = document.createElement('div');
		// Forzar esquema dark independientemente del tema del sistema
		// — el canvas del mini-grafo está envuelto en `.dark` igual que
		// el grafo grande.
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
			muted: toRgb('--muted'),
			mutedForeground: toRgb('--muted-foreground'),
			foreground: toRgb('--foreground'),
			background: toRgb('--background'),
			border: toRgb('--border')
		};
		probe.remove();
		return tokens;
	}

	/**
	 * Stylesheet reducido del mini-grafo (D-1, D-2, D-4):
	 *  - Hub (`kind="tecnica-hub"`)    → relleno `--foreground` macizo.
	 *  - Satélites (`kind="tecnica-contra"`) → `--muted` + borde
	 *    `--muted-foreground`.
	 *  - Aristas dirigidas con flecha en `--muted-foreground`. Las de
	 *    tipo `transicion` se pintan dashed; el resto, sólidas.
	 *
	 * Label fuera del círculo (`text-valign: bottom`) y `text-wrap: wrap`
	 * para la segunda línea "desde {origen}" (D-7).
	 */
	function buildMiniStylesheet(t: ReturnType<typeof readTokens>): StylesheetJson {
		return [
			{
				selector: 'node',
				style: {
					shape: 'ellipse',
					label: 'data(label)',
					'border-width': 2,
					'text-valign': 'bottom',
					'text-halign': 'center',
					'text-margin-y': 4,
					'text-wrap': 'wrap',
					'text-max-width': '90px',
					color: t.foreground,
					'font-size': 10,
					'font-weight': 600,
					// Fondo de label tipo "pill" para que no choque con
					// aristas que pasen por debajo.
					'text-background-color': t.muted,
					'text-background-opacity': 1,
					'text-background-padding': 3,
					'text-background-shape': 'round-rectangle',
					width: 36,
					height: 36
				}
			},
			// Hub: tratamiento destacado (relleno foreground macizo).
			{
				selector: 'node[kind = "tecnica-hub"]',
				style: {
					'background-color': t.foreground,
					'background-opacity': 1,
					'border-color': t.foreground,
					width: 44,
					height: 44
				}
			},
			// Satélites: tratamiento neutro (muted + borde mutedForeground).
			{
				selector: 'node[kind = "tecnica-contra"]',
				style: {
					'background-color': t.muted,
					'background-opacity': 1,
					'border-color': t.mutedForeground
				}
			},
			// Aristas dirigidas hub → contra (D-4).
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
			// `transicion` dashed (D-2). El resto, sólidas (default).
			{
				selector: 'edge[tipo = "transicion"]',
				style: { 'line-style': 'dashed' }
			}
		] as unknown as StylesheetJson;
	}

	/**
	 * Posiciones radiales puras (D-5): hub en (0,0) y satélite i en
	 *   (R · cos θᵢ, R · sin θᵢ)   con θᵢ = -π/2 + 2π · i / N.
	 *
	 * Es decir: el primer satélite arriba (12 en punto) y el resto
	 * distribuidos en sentido horario.
	 *
	 * Mitigación N=1 (riesgo del §5 del plan): con θ=-π/2 el satélite
	 * caería justo encima del label del hub. Lo movemos a θ=0 (derecha)
	 * para no chocar con el label "bottom" del centro.
	 *
	 * Devuelve un Map<idCytoscape, {x,y}> donde idCytoscape es el id ya
	 * con prefijo (`hub:` / `contra:`) tal y como se construyen en
	 * `buildElements()`.
	 */
	function computeRadialPositions(
		ids: string[],
		hubId: string
	): Map<string, { x: number; y: number }> {
		const positions = new Map<string, { x: number; y: number }>();
		positions.set(hubId, { x: 0, y: 0 });
		const N = ids.length;
		if (N === 0) return positions;
		// R = clamp(80, 50 + N·12, 140). Crece con N pero saturado para
		// que no se desborde el canvas con N grande.
		const R = Math.max(80, Math.min(140, 50 + N * 12));
		const isSingle = N === 1;
		for (let i = 0; i < N; i += 1) {
			// Mitigación N=1: desplaza a 0 rad (derecha) en vez de -π/2
			// (arriba) para que no colisione con el label del hub.
			const theta = isSingle ? 0 : -Math.PI / 2 + (2 * Math.PI * i) / N;
			positions.set(ids[i], {
				x: R * Math.cos(theta),
				y: R * Math.sin(theta)
			});
		}
		return positions;
	}

	/**
	 * Convierte hub + contras al formato `elements` de Cytoscape.
	 *
	 * Convención de ids (prefijos cortos para evitar colisiones si
	 * alguna vez el componente convive con otro grafo en la misma vista):
	 *   hub:    `hub:{tecnicaId}`
	 *   contra: `contra:{contraId}`
	 *
	 * El label del satélite es multi-línea: nombre (+ variante) en la
	 * primera línea, "desde {posición}" en la segunda (D-7). El `\n`
	 * lo respeta Cytoscape porque `text-wrap: wrap` está activo en el
	 * stylesheet.
	 *
	 * El `tipo` de la arista se toma de `contra.tipo` (la columna
	 * `tipo` de la tabla `tecnicas`, no de `tecnica_contras` — esa
	 * relación no tiene tipo propio en el schema). El único uso es
	 * decidir si la arista va dashed (`transicion`) o sólida.
	 */
	function buildElements(
		hub: Tecnica,
		sats: Tecnica[],
		posIndex: Record<string, string>
	): { nodes: { data: Record<string, unknown> }[]; edges: { data: Record<string, unknown> }[] } {
		const hubId = `hub:${hub.id}`;
		const nodes: { data: Record<string, unknown> }[] = [
			{
				data: {
					id: hubId,
					kind: 'tecnica-hub',
					label: hub.variante ? `${hub.nombre}\n(${hub.variante})` : hub.nombre,
					tecnicaId: hub.id
				}
			}
		];
		const edges: { data: Record<string, unknown> }[] = [];
		for (const c of sats) {
			const cId = `contra:${c.id}`;
			const nombreLinea = c.variante ? `${c.nombre} (${c.variante})` : c.nombre;
			const origen = posIndex[c.posicion_origen_id] ?? '¿?';
			nodes.push({
				data: {
					id: cId,
					kind: 'tecnica-contra',
					label: `${nombreLinea}\ndesde ${origen}`,
					tecnicaId: c.id
				}
			});
			edges.push({
				data: {
					id: `edge:${hub.id}->${c.id}`,
					source: hubId,
					target: cId,
					tipo: c.tipo
				}
			});
		}
		return { nodes, edges };
	}

	/**
	 * Construye `elements` + `positions` desde el dataset actual. Se usa
	 * tanto en el mount inicial como en el `$effect` que reacciona a
	 * cambios del dataset (Adalid añade / quita una contra desde el
	 * padre).
	 */
	function buildSnapshot() {
		const { nodes, edges } = buildElements(tecnica, visibleContras, posicionesById);
		const hubId = `hub:${tecnica.id}`;
		const satIds = visibleContras.map((c) => `contra:${c.id}`);
		const positions = computeRadialPositions(satIds, hubId);
		return { nodes, edges, positions, hubId };
	}

	/**
	 * Aplica un layout `preset` con las posiciones radiales calculadas
	 * y zoom-to-fit. `fit: true` obligatorio en mount y en re-layouts
	 * (riesgo del §5 del plan: sin fit, al añadir/quitar contras el
	 * grafo queda descentrado).
	 */
	function runPresetLayout(
		instance: Core,
		positions: Map<string, { x: number; y: number }>
	) {
		const opts: LayoutOptions = {
			name: 'preset',
			positions: (node: { id(): string }) => positions.get(node.id()) ?? { x: 0, y: 0 },
			fit: true,
			padding: 20
		} as unknown as LayoutOptions;
		instance.layout(opts).run();
	}

	// Re-construir elementos y re-layout cuando cambian las contras /
	// la técnica del hub / el cache de posiciones. Mismo patrón que
	// `GrafoMapa.svelte` (`$effect` sobre nodes/edges). El null-check
	// evita correr antes del mount (Cytoscape se carga dinámicamente).
	$effect(() => {
		// Dependencias explícitas para que Svelte rastree los cambios.
		tecnica;
		contras;
		posicionesById;
		if (!cy) return;
		const instance = cy;
		const { nodes, edges, positions } = buildSnapshot();
		instance.elements().remove();
		instance.add([...nodes, ...edges]);
		runPresetLayout(instance, positions);
	});

	// Reaccionar a cambio de tema. El theme manager toggle-a `.dark` en
	// <html>; las CSS vars cambian. Re-leemos tokens y reaplicamos
	// stylesheet. El `requestAnimationFrame` espera un frame a que las
	// CSS vars hayan settle-ado (paridad con `GrafoMapa.svelte:400-407`).
	$effect(() => {
		theme.isDark; // dependency
		if (!cy) return;
		const instance = cy;
		requestAnimationFrame(() => {
			instance.style(buildMiniStylesheet(readTokens()));
		});
	});

	onMount(() => {
		// Flag de cancelación: si el modal se cierra mientras el chunk de
		// Cytoscape aún se está cargando (`await import('cytoscape')`),
		// abortamos antes de instanciar para no dejar una instancia
		// huérfana atada a un container desmontado. Mismo patrón que
		// `GrafoMapa.svelte:649-668`.
		let cancelled = false;

		(async () => {
			try {
				// `cytoscape` ya está en cache de módulos por el grafo
				// principal — este import resuelve sin coste de red.
				const cytoscapeMod = await import('cytoscape');
				if (cancelled) return;
				const cytoscape = cytoscapeMod.default;

				const { nodes, edges, positions } = buildSnapshot();

				const instance = cytoscape({
					container,
					elements: [...nodes, ...edges],
					// Layout `null` (no-op) inicial — disparamos el preset
					// real más abajo, después de registrar los handlers,
					// para garantizar que `fit` se aplica con todo
					// listo. Mismo patrón que `GrafoMapa.svelte:691-694`.
					layout: { name: 'null' } as unknown as LayoutOptions,
					minZoom: 0.3,
					maxZoom: 2.5,
					// El mini-grafo es pequeño y read-only: deshabilitamos
					// el zoom por rueda / pinch para que el scroll de la
					// página dentro del Sheet no pelee con el del grafo.
					userZoomingEnabled: false,
					boxSelectionEnabled: false,
					autoungrabify: true,
					style: buildMiniStylesheet(readTokens())
				});

				// Tap en cualquier nodo: discriminar por `kind` y delegar
				// en el callback del padre (D-9). Sin handlers default —
				// el componente no toca `mapaModalStack` directamente.
				instance.on('tap', 'node', (event) => {
					const node = event.target;
					const kind = node.data('kind') as 'tecnica-hub' | 'tecnica-contra';
					const tecnicaId = node.data('tecnicaId') as string;
					if (kind === 'tecnica-hub') {
						if (onTapHub) onTapHub(tecnica);
					} else {
						const target = contras.find((c) => c.id === tecnicaId);
						if (target && onTapContra) onTapContra(target);
					}
				});

				cy = instance;
				runPresetLayout(instance, positions);
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

<!--
  El wrapper lleva `dark` para forzar esquema oscuro en el canvas, igual
  que en `GrafoMapa.svelte`. Los tokens leídos en `readTokens()` también
  resuelven a los valores `.dark` porque el probe se inserta con esa
  misma clase. `min-h-80` reserva 320 px aunque el modal animado aún no
  haya estabilizado su altura.
-->
<div class="space-y-2">
	<div
		class="dark relative w-full overflow-hidden rounded border border-border bg-card"
		style="height: {height}px; min-height: {height}px;"
	>
		{#if loading}
			<div class="absolute inset-0 flex items-center justify-center text-muted-foreground">
				Cargando mini-grafo…
			</div>
		{/if}
		{#if error}
			<div class="absolute inset-0 flex items-center justify-center p-4 text-destructive">
				Error al cargar el mini-grafo: {error}
			</div>
		{/if}
		<div bind:this={container} class="h-full w-full"></div>
		{#if overflowCount > 0 && !loading && !error}
			<!--
			  Badge D-6: cuando hay > N_CAP contras, avisamos del resto que
			  no se han pintado en el canvas. La lista plana de fallback
			  queda debajo del propio canvas (ver bloque siguiente).
			-->
			<div
				class="absolute right-2 top-2 rounded-full border border-border bg-popover px-2 py-0.5 text-xs text-popover-foreground shadow-sm"
			>
				+{overflowCount} más…
			</div>
		{/if}
	</div>
	{#if overflowCount > 0}
		<!--
		  Fallback D-6: cuando el cap visual oculta contras, las
		  enumeramos en lista plana debajo para no perder información.
		  Es una lista mínima — la edición sigue pasando por los botones
		  de `TecnicaModalContent.svelte` debajo de este componente.
		-->
		<div class="rounded border border-border">
			<ul class="divide-y divide-border">
				{#each contras.slice(N_CAP) as c (c.id)}
					<li>
						<button
							type="button"
							class="block w-full p-3 text-left transition-colors hover:bg-accent focus-visible:bg-accent focus-visible:outline-none"
							onclick={() => onTapContra?.(c)}
						>
							<div class="font-medium">
								{c.nombre}{#if c.variante}<span class="text-muted-foreground"> ({c.variante})</span
									>{/if}
							</div>
							<div class="mt-0.5 text-xs text-muted-foreground">
								desde {posicionesById[c.posicion_origen_id] ?? '¿?'}
							</div>
						</button>
					</li>
				{/each}
			</ul>
		</div>
	{/if}
</div>
