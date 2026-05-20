<script lang="ts">
	import { onMount } from 'svelte';
	import { beforeNavigate, goto } from '$app/navigation';
	import SearchIcon from '@lucide/svelte/icons/search';
	import PlusIcon from '@lucide/svelte/icons/plus';
	import RefreshCwIcon from '@lucide/svelte/icons/refresh-cw';
	import SaveIcon from '@lucide/svelte/icons/save';
	import MoveIcon from '@lucide/svelte/icons/move';
	import BottomNav from '$lib/components/BottomNav.svelte';
	import FilterDropdown from '$lib/components/FilterDropdown.svelte';
	import GrafoMapa from '$lib/components/GrafoMapa.svelte';
	import MapaModalHost from '$lib/components/MapaModalHost.svelte';
	import MultiChips from '$lib/components/MultiChips.svelte';
	import { mapaModalStack, type MapaModalEntry } from '$lib/components/mapa-modal-stack.svelte';
	import { buildGrafoElements } from '$lib/grafo';
	import { useMediaQuery } from '$lib/hooks/use-media.svelte';
	import * as AlertDialog from '$lib/components/ui/alert-dialog';
	import { Button, buttonVariants } from '$lib/components/ui/button';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import { Input } from '$lib/components/ui/input';
	import type {
		CategoriaPosicion,
		EstadoTecnica,
		Posicion,
		SumisionTerminal,
		Tecnica,
		TipoRolPosicion,
		TipoTecnica
	} from '$lib/types';

	const CATEGORIA_LABEL: Record<CategoriaPosicion, string> = {
		guardia: 'Guardia',
		control_superior: 'Control superior',
		espalda: 'Espalda',
		transicion: 'Transición',
		otro: 'Otro'
	};

	// Orden fijo de secciones; las que queden vacías tras filtro no se renderizan.
	const CATEGORIAS_ORDEN: CategoriaPosicion[] = [
		'guardia',
		'control_superior',
		'espalda',
		'transicion',
		'otro'
	];

	const TIPO_ROL_LABEL: Record<TipoRolPosicion, string> = {
		ofensiva: 'Ofensiva',
		defensiva: 'Defensiva',
		neutral: 'Neutral'
	};

	// Mismo patrón de chips de tono semántico que /rolls (RESULTADO_BADGE).
	const TIPO_ROL_BADGE: Record<TipoRolPosicion, string> = {
		ofensiva: 'bg-success/15 text-success',
		defensiva: 'bg-destructive/15 text-destructive',
		neutral: 'bg-muted text-muted-foreground'
	};

	// Etiquetas y tonos semánticos para los chips de la lista plana de
	// técnicas. Mismas decisiones de tono que TecnicaModalContent (ataque →
	// primary, sweep → success, escape → warning, transicion → muted,
	// sumision → destructive) para que el lenguaje visual sea consistente
	// entre la lista y el detalle.
	const TIPO_TECNICA_LABEL: Record<TipoTecnica, string> = {
		ataque: 'Ataque',
		sweep: 'Sweep',
		escape: 'Escape',
		transicion: 'Transición',
		sumision: 'Sumisión'
	};

	const TIPO_TECNICA_BADGE: Record<TipoTecnica, string> = {
		ataque: 'bg-primary/15 text-primary',
		sweep: 'bg-success/15 text-success',
		escape: 'bg-warning/15 text-warning',
		transicion: 'bg-muted text-muted-foreground',
		sumision: 'bg-destructive/15 text-destructive'
	};

	// Estados: solo mostramos chip cuando el estado NO es "probando"
	// (decisión: probando es el default y satura visualmente si se pinta en
	// cada item). "funciona" y "descartada" sí se muestran porque informan
	// algo accionable (la técnica está validada o archivada).
	const ESTADO_LABEL: Record<EstadoTecnica, string> = {
		probando: 'Probando',
		funciona: 'Funciona',
		descartada: 'Descartada'
	};

	const ESTADO_BADGE: Record<EstadoTecnica, string> = {
		probando: 'bg-warning/15 text-warning',
		funciona: 'bg-success/15 text-success',
		descartada: 'bg-muted text-muted-foreground'
	};

	// Orden fijo en el filtro multi-select (sigue el orden conceptual del
	// proyecto: ofensivo → defensivo → transversal → sumisión).
	const TIPOS_TECNICA_ORDEN: TipoTecnica[] = [
		'ataque',
		'sweep',
		'escape',
		'transicion',
		'sumision'
	];

	let posiciones = $state<Posicion[]>([]);
	let sumisiones = $state<SumisionTerminal[]>([]);
	let tecnicas = $state<Tecnica[]>([]);
	let status: 'loading' | 'ready' | 'error' = $state('loading');
	let errorMessage = $state('');
	let query = $state('');

	// Toggle de dos niveles para /mapa (T-8.it3):
	//   - vistaPrincipal: chasis principal (Grafo vs Lista).
	//   - subVistaLista: sub-toggle dentro de Lista
	//     (Posiciones / Técnicas / Sumisiones).
	// No persiste entre navegaciones por decisión de producto.
	let vistaPrincipal = $state<'grafo' | 'lista'>('grafo');
	let subVistaLista = $state<'posiciones' | 'tecnicas' | 'sumisiones'>('posiciones');
	// Filtros del tab "Técnicas". Multi-select: vacío = todos.
	let tiposSeleccionados = $state<string[]>([]);
	// Filtros del tab "Grafo" (T-4.it3). Mismo patrón vacío = todos.
	let tiposGrafo = $state<string[]>([]);
	let estadosGrafo = $state<string[]>([]);
	let categoriasGrafo = $state<string[]>([]);

	// T-8.b: detección reactiva de breakpoint para decidir cómo presentar
	// el modal del mapa. `md` es 768px en Tailwind, mismo valor que usa el
	// resto de utilities responsive del proyecto. La instancia se crea una
	// vez por mount de la página; se registra un listener `matchMedia` que
	// dispara reactivamente cuando el usuario redimensiona la ventana o
	// rota el dispositivo.
	const desktopQuery = useMediaQuery('(min-width: 768px)');

	// Mapeo a la prop `presentation` del host:
	//   - Vista Lista → Dialog centrado (el grafo no está visible, no hay
	//     nada que dejar a la vista detrás del modal).
	//   - Vista Grafo desktop → drawer lateral derecho (el grafo permanece
	//     visible a la izquierda).
	//   - Vista Grafo móvil → drawer inferior ~50vh (el grafo permanece
	//     visible arriba).
	let presentation = $derived<'dialog' | 'sheet-side' | 'sheet-bottom'>(
		vistaPrincipal === 'lista'
			? 'dialog'
			: desktopQuery.matches
				? 'sheet-side'
				: 'sheet-bottom'
	);

	// Bind al host del modal para poder pedirle un cierre que respete el
	// dirty handler (si hay wizard sucio, abre AlertDialog en vez de
	// descartar a saco).
	let modalHost = $state<
		{ attemptCloseAll: (onClose?: () => void) => void } | undefined
	>(undefined);

	// T-9.b.it3: ref al componente del grafo para invocar `saveLayout()`
	// y `reorganize()` desde los botones del sub-header. La prop `dirty`
	// llega bindable: el grafo la sube cuando el usuario arrastra o
	// pulsa Reorganizar, y la baja cuando guarda con éxito.
	let grafoComponent = $state<
		{
			saveLayout: () => Promise<void>;
			reorganize: () => void;
			panToEntity: (
				target: { kind: 'posicion' | 'sumision' | 'tecnica'; id: string },
				presentation: 'dialog' | 'sheet-side' | 'sheet-bottom'
			) => void;
		} | undefined
	>(undefined);
	let grafoDirty = $state(false);
	let savingLayout = $state(false);
	// Modo edición de layout. En `true` los nodos pasan a `grabify` y
	// los tap quedan silenciados (no abren modal) para no chocar con
	// el flujo de arrastre. El usuario debe salir del modo para volver
	// a navegar.
	let grafoEditing = $state(false);
	// AlertDialog "¿Descartar cambios del grafo?" usado cuando el
	// usuario intenta cambiar a vista Lista con `grafoDirty=true`.
	// Patrón controlado (open + onOpenChange, NO bind:open) idéntico al
	// del MapaModalHost. Decidí mantenerlo SEPARADO del AlertDialog del
	// host de modales (en lugar de fusionar ambos) porque:
	//   1. El host no expone `isDirty()` al padre; fusionar requeriría
	//      cambiar su API.
	//   2. Los dos diálogos NO suelen coincidir en el flujo real (los
	//      cambios del grafo no se hacen con un wizard abierto) y, si
	//      coinciden, dos diálogos secuenciales (uno por scope) dicen
	//      con más claridad QUÉ se está descartando.
	let mostrarConfirmDescartarGrafo = $state(false);
	let accionPostDescarteGrafo: (() => void) | null = null;

	onMount(() => {
		void refresh();
	});

	// T-10.it3: sincronización modal↔grafo. Cada vez que cambia el top
	// del stack de modales, el grafo hace pan animado al nodo/arista
	// focal para que el usuario "siga la historia" visualmente.
	//
	// Reglas:
	//  - Solo entradas de entidad (posicion/sumision/tecnica) disparan
	//    pan. Wizards (crear/editar) NO — crear/editar no es navegación.
	//  - Al cerrar el modal entero (top undefined) NO se hace nada — el
	//    grafo se queda donde estaba (decisión de producto).
	//  - El zoom no se toca; solo el pan.
	//  - El componente del grafo se encarga del early return si aún no
	//    tiene `cy` o si el id no existe; aquí solo filtramos por kind.
	$effect(() => {
		const top = mapaModalStack.top;
		if (!top || !grafoComponent) return;
		if (
			top.kind !== 'posicion' &&
			top.kind !== 'sumision' &&
			top.kind !== 'tecnica'
		)
			return;
		grafoComponent.panToEntity({ kind: top.kind, id: top.id }, presentation);
	});

	// T-9.b.it3: si el usuario intenta navegar a otra ruta (BottomNav,
	// link interno, back/forward del navegador) con cambios sin guardar
	// en el grafo, cancelamos la navegación y reusamos el mismo
	// AlertDialog que el toggle Grafo/Lista. Tras "Descartar" se ejecuta
	// `goto(nav.to.url)` para completar la navegación que el usuario
	// pidió originalmente.
	beforeNavigate((nav) => {
		// `willUnload=true` cubre F5/cerrar pestaña/escribir URL nueva —
		// casos donde `cancel()` no funciona y donde, por decisión del
		// proyecto, no interceptamos (coherente con los wizards, que
		// también pierden borradores en F5).
		if (!grafoDirty || nav.willUnload || !nav.to) return;
		nav.cancel();
		const targetUrl = nav.to.url;
		accionPostDescarteGrafo = () => {
			void goto(targetUrl);
		};
		mostrarConfirmDescartarGrafo = true;
	});

	async function refresh() {
		try {
			const { listPosiciones } = await import('$lib/posiciones');
			const { listSumisiones } = await import('$lib/sumisiones');
			const { listTecnicas } = await import('$lib/tecnicas');
			[posiciones, sumisiones, tecnicas] = await Promise.all([
				listPosiciones(),
				listSumisiones(),
				listTecnicas()
			]);
			status = 'ready';
		} catch (err) {
			errorMessage = err instanceof Error ? err.message : String(err);
			status = 'error';
			console.error('[mapa] refresh failed:', err);
		}
	}

	const queryNormalized = $derived(query.trim().toLowerCase());

	const posicionesFiltradas = $derived(
		queryNormalized === ''
			? posiciones
			: posiciones.filter((p) => p.nombre.toLowerCase().includes(queryNormalized))
	);

	const sumisionesFiltradas = $derived(
		queryNormalized === ''
			? sumisiones
			: sumisiones.filter((s) => s.nombre.toLowerCase().includes(queryNormalized))
	);

	// Agrupa las posiciones filtradas por categoría manteniendo el orden de
	// CATEGORIAS_ORDEN. Solo aparecen secciones con al menos un item.
	const posicionesPorCategoria = $derived.by(() => {
		const grupos: { categoria: CategoriaPosicion; items: Posicion[] }[] = [];
		for (const cat of CATEGORIAS_ORDEN) {
			const items = posicionesFiltradas.filter((p) => p.categoria === cat);
			if (items.length > 0) grupos.push({ categoria: cat, items });
		}
		return grupos;
	});

	const catalogoVacio = $derived(posiciones.length === 0 && sumisiones.length === 0);
	// "Sin resultados" del tab Posiciones depende SOLO de posiciones tras
	// extraer Sumisiones a su propio tab. Cada tab gestiona sus vacíos.
	const filtroSinResultados = $derived(
		queryNormalized !== '' && posicionesFiltradas.length === 0
	);

	// Mapas id → nombre para resolver origen/destino en la lista plana de
	// técnicas sin tener que llamar a la BD por cada item. Se rebuildean
	// cuando se actualiza el catálogo (refresh).
	const posicionesById = $derived(
		Object.fromEntries(posiciones.map((p) => [p.id, p.nombre])) as Record<string, string>
	);
	const sumisionesById = $derived(
		Object.fromEntries(sumisiones.map((s) => [s.id, s.nombre])) as Record<string, string>
	);

	// Set de tipos seleccionados (para lookup rápido). Si está vacío,
	// no se filtra por tipo (todos los tipos pasan).
	const tiposSeleccionadosSet = $derived(new Set(tiposSeleccionados));

	// Lista plana ordenada alfabéticamente por nombre y luego por variante.
	// `listTecnicas` ya ordena por nombre pero no garantiza desempate por
	// variante; ordenamos en JS para mantener el contrato visual estable.
	const tecnicasOrdenadas = $derived(
		[...tecnicas].sort((a, b) => {
			const nombreCmp = a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' });
			if (nombreCmp !== 0) return nombreCmp;
			const va = a.variante ?? '';
			const vb = b.variante ?? '';
			return va.localeCompare(vb, 'es', { sensitivity: 'base' });
		})
	);

	const tecnicasFiltradas = $derived(
		tecnicasOrdenadas.filter((t) => {
			if (tiposSeleccionadosSet.size > 0 && !tiposSeleccionadosSet.has(t.tipo)) {
				return false;
			}
			if (queryNormalized === '') return true;
			if (t.nombre.toLowerCase().includes(queryNormalized)) return true;
			if (t.variante && t.variante.toLowerCase().includes(queryNormalized)) return true;
			return false;
		})
	);

	// Helper para resolver el destino visible de una técnica en una sola
	// llamada. Devuelve el nombre legible (o un placeholder si la FK quedó
	// huérfana — caso teórico tras borrar la entidad referenciada).
	function resolveDestino(t: Tecnica): string {
		if (t.tipo === 'sumision') {
			if (t.sumision_destino_id) {
				return sumisionesById[t.sumision_destino_id] ?? '(sumisión eliminada)';
			}
			return '(sin destino)';
		}
		if (t.posicion_destino_id) {
			return posicionesById[t.posicion_destino_id] ?? '(posición eliminada)';
		}
		return '(sin destino)';
	}

	function resolveOrigen(t: Tecnica): string {
		return posicionesById[t.posicion_origen_id] ?? '(posición eliminada)';
	}

	// Options del MultiChips de tipo, en el orden fijo del proyecto.
	const tipoOptions = TIPOS_TECNICA_ORDEN.map((tipo) => ({
		value: tipo,
		label: TIPO_TECNICA_LABEL[tipo]
	}));

	// Options de estado y categoría para los filtros del grafo (T-4.it3).
	// Orden conceptual de estado: probando → funciona → descartada.
	const estadoOptions: { value: EstadoTecnica; label: string }[] = [
		{ value: 'probando', label: ESTADO_LABEL.probando },
		{ value: 'funciona', label: ESTADO_LABEL.funciona },
		{ value: 'descartada', label: ESTADO_LABEL.descartada }
	];
	const categoriaOptions = CATEGORIAS_ORDEN.map((cat) => ({
		value: cat,
		label: CATEGORIA_LABEL[cat]
	}));

	// Elementos del grafo (nodos + aristas) derivados del catálogo. Se
	// recalculan solo cuando cambia el catálogo, no en cada render.
	const grafoElements = $derived(buildGrafoElements(posiciones, sumisiones, tecnicas));

	// Helper: cierra el modal actual respetando el dirty handler, y solo
	// cuando el cierre se confirma (inmediato si limpio, tras "Descartar"
	// si dirty), pushea la nueva entrada. Reemplaza el viejo patrón
	// `mapaModalStack.closeAll(); mapaModalStack.push(...)` para que no
	// se pierdan cambios accidentalmente al saltar entre entidades.
	function attemptPushModal(entry: MapaModalEntry) {
		if (modalHost) {
			modalHost.attemptCloseAll(() => mapaModalStack.push(entry));
		} else {
			// Fallback defensivo: si el host aún no está bind'd, hacemos
			// el viejo flujo. No debería pasar en uso normal.
			mapaModalStack.closeAll();
			mapaModalStack.push(entry);
		}
	}

	function openPosicion(p: Posicion) {
		attemptPushModal({ kind: 'posicion', id: p.id, nombre: p.nombre });
	}

	function openSumision(s: SumisionTerminal) {
		attemptPushModal({ kind: 'sumision', id: s.id, nombre: s.nombre });
	}

	function openTecnica(t: Tecnica) {
		attemptPushModal({ kind: 'tecnica', id: t.id, nombre: t.nombre });
	}

	function openWizardCrearPosicion() {
		attemptPushModal({ kind: 'wizard-posicion', modo: 'crear', nombre: 'Nueva posición' });
	}

	function openWizardCrearSumision() {
		attemptPushModal({ kind: 'wizard-sumision', modo: 'crear', nombre: 'Nueva sumisión' });
	}

	// Cambio de vista (Grafo / Lista) desde el toggle del sub-header.
	// Orden de comprobaciones (T-9.b.it3):
	//   1. Si el grafo tiene cambios sin guardar Y vamos a salir de la
	//      vista grafo (target='lista'), abrimos el AlertDialog del
	//      grafo. Tras "Descartar", limpiamos `grafoDirty` y seguimos.
	//   2. Si tras eso hay un wizard sucio, el AlertDialog del modal
	//      host se interpone (diálogo secuencial — ver decisión arriba).
	// Pasar de Lista a Grafo no necesita confirmación del grafo (el
	// estado del grafo se mantiene tal cual al volver).
	function requestVistaChange(target: 'grafo' | 'lista') {
		if (target === vistaPrincipal) return;
		const proceed = () => {
			if (modalHost) {
				modalHost.attemptCloseAll(() => (vistaPrincipal = target));
			} else {
				vistaPrincipal = target;
			}
		};
		if (target === 'lista' && grafoDirty) {
			accionPostDescarteGrafo = proceed;
			mostrarConfirmDescartarGrafo = true;
			return;
		}
		proceed();
	}

	function handleConfirmDescartarGrafo() {
		// Confirmación de descarte del grafo. Bajamos el flag ANTES de
		// llamar a la acción pendiente (regla del proyecto sesión 7: el
		// dirty handler debe estar limpio antes de tocar el stack/vista).
		// La página recargará layouts desde BD la próxima vez que el
		// componente GrafoMapa se monte; mientras tanto, las posiciones
		// en pantalla quedan tal cual (sin re-hidratación). Es coherente
		// con el patrón del proyecto: descartar = perder los cambios en
		// memoria, no rehacer un layout.
		const cb = accionPostDescarteGrafo;
		accionPostDescarteGrafo = null;
		mostrarConfirmDescartarGrafo = false;
		grafoDirty = false;
		cb?.();
	}

	function handleConfirmDescartarGrafoOpenChange(value: boolean) {
		if (!value) {
			accionPostDescarteGrafo = null;
			mostrarConfirmDescartarGrafo = false;
		}
	}

	async function handleGuardarOrganizacion() {
		if (!grafoComponent || savingLayout) return;
		savingLayout = true;
		try {
			await grafoComponent.saveLayout();
			// `dirty` lo baja el propio componente al éxito; no tocamos
			// `grafoDirty` aquí (llegará vía el binding bindable).
		} catch (err) {
			console.error('[mapa] saveLayout failed:', err);
			// TODO(toast): cuando el proyecto tenga un toast global,
			// mostrar error legible. De momento solo console.error —
			// `grafoDirty` se mantiene true para que el usuario reintente.
		} finally {
			savingLayout = false;
		}
	}

	function handleReorganizar() {
		grafoComponent?.reorganize();
	}
</script>

<svelte:head>
	<title>Mapa técnico · BJJ Tracker</title>
</svelte:head>

<main class="mx-auto max-w-2xl space-y-3 p-4 pb-28">
	{#if status === 'loading'}
		<p class="text-primary">Cargando…</p>
	{:else if status === 'error'}
		<div class="rounded border border-destructive/30 bg-destructive/10 p-3">
			<p class="font-semibold text-destructive">Error</p>
			<pre class="mt-2 text-sm whitespace-pre-wrap text-destructive">{errorMessage}</pre>
		</div>
	{:else if catalogoVacio}
		<div class="rounded border border-dashed border-border p-8 text-center">
			<p class="text-muted-foreground">Catálogo vacío.</p>
			<p class="mt-1 text-sm text-muted-foreground">
				Pulsa "+ Nuevo" para empezar.
			</p>
		</div>
	{:else}
		<!--
		  Sub-header sticky (T-8.it3): dos filas dentro del mismo contenedor
		  sticky, sin extraer a componente nuevo (el bloque es corto y solo
		  esta página lo usa).
		    - Fila 1 (siempre): toggle binario Grafo / Lista.
		    - Fila 2 (contextual):
		        · Lista: sub-toggle Posiciones / Técnicas + buscador
		          (+ MultiChips de tipo en sub-vista Técnicas).
		        · Grafo: los 3 FilterDropdown (tipo, estado, categoría).
		  Queda pegado justo debajo del AppHeader (h-14 → top-14). `-mx-4 px-4`
		  para que la línea inferior llegue de borde a borde.
		-->
		<div
			class="sticky top-14 z-20 -mx-4 space-y-3 border-b border-border bg-background px-4 pb-2"
		>
			<!--
			  Fila 1: toggle Grafo / Lista. Mismo patrón visual que el tablist
			  anterior (buttons + role=tab + aria-selected + estilo condicional
			  con tokens semánticos). `min-h-9` para que la fila tenga la misma
			  altura aunque se cambie de vista y se evite micro-CLS.
			-->
			<div
				role="tablist"
				aria-label="Vista del mapa"
				class="inline-flex min-h-9 rounded-md border border-border bg-muted p-0.5"
			>
				<button
					type="button"
					role="tab"
					aria-selected={vistaPrincipal === 'grafo'}
					class="rounded px-3 py-1.5 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none {vistaPrincipal ===
					'grafo'
						? 'bg-background text-foreground shadow-sm'
						: 'text-muted-foreground hover:text-foreground'}"
					onclick={() => requestVistaChange('grafo')}
				>
					Grafo
				</button>
				<button
					type="button"
					role="tab"
					aria-selected={vistaPrincipal === 'lista'}
					class="rounded px-3 py-1.5 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none {vistaPrincipal ===
					'lista'
						? 'bg-background text-foreground shadow-sm'
						: 'text-muted-foreground hover:text-foreground'}"
					onclick={() => requestVistaChange('lista')}
				>
					Lista
				</button>
			</div>

			<!--
			  Fila 2: contenido contextual a la vista principal. `min-h-9` para
			  alinear visualmente con la fila 1 y evitar saltos micro entre
			  sub-vistas. El salto grande Lista ↔ Grafo se acepta (cambio de
			  modo entero, incluido aparición/desaparición del buscador).
			-->
			{#if vistaPrincipal === 'lista'}
				<div class="min-h-9 space-y-3">
					<!--
					  Sub-toggle Posiciones / Técnicas. Mismo patrón visual que el
					  toggle principal pero con 2 botones.
					-->
					<div
						role="tablist"
						aria-label="Sub-vista de lista"
						class="inline-flex min-h-9 rounded-md border border-border bg-muted p-0.5"
					>
						<button
							type="button"
							role="tab"
							aria-selected={subVistaLista === 'posiciones'}
							class="rounded px-3 py-1.5 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none {subVistaLista ===
							'posiciones'
								? 'bg-background text-foreground shadow-sm'
								: 'text-muted-foreground hover:text-foreground'}"
							onclick={() => (subVistaLista = 'posiciones')}
						>
							Posiciones
						</button>
						<button
							type="button"
							role="tab"
							aria-selected={subVistaLista === 'tecnicas'}
							class="rounded px-3 py-1.5 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none {subVistaLista ===
							'tecnicas'
								? 'bg-background text-foreground shadow-sm'
								: 'text-muted-foreground hover:text-foreground'}"
							onclick={() => (subVistaLista = 'tecnicas')}
						>
							Técnicas
						</button>
						<button
							type="button"
							role="tab"
							aria-selected={subVistaLista === 'sumisiones'}
							class="rounded px-3 py-1.5 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none {subVistaLista ===
							'sumisiones'
								? 'bg-background text-foreground shadow-sm'
								: 'text-muted-foreground hover:text-foreground'}"
							onclick={() => (subVistaLista = 'sumisiones')}
						>
							Sumisiones
						</button>
					</div>

					<!--
					  Buscador: presente en Lista (tanto Posiciones como Técnicas).
					  Oculto en Grafo (no hay scroll por texto en un canvas).
					-->
					<div class="relative">
						<SearchIcon
							class="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
						/>
						<Input
							type="search"
							placeholder={subVistaLista === 'tecnicas'
								? 'Buscar por nombre o variante…'
								: 'Buscar por nombre…'}
							bind:value={query}
							aria-label={subVistaLista === 'tecnicas'
								? 'Buscar técnicas'
								: 'Buscar en el mapa'}
							class="pl-8"
						/>
					</div>

					{#if subVistaLista === 'tecnicas'}
						<MultiChips
							options={tipoOptions}
							value={tiposSeleccionados}
							onChange={(v) => (tiposSeleccionados = v)}
							ariaLabel="Filtrar técnicas por tipo"
						/>
					{/if}
				</div>
			{:else}
				<!--
				  Filtros del grafo (T-4.it3) en una sola fila con dropdowns
				  compactos. Patrón vacío = todos pasan (igual que la vista
				  Técnicas). El badge del contador aparece solo si hay
				  selección activa en esa dimensión.
				  T-9.b.it3: al final de la fila aparecen los botones
				  "Reorganizar" (siempre visible en vista grafo) y "Guardar
				  organización" (solo si grafoDirty). En móvil hacen wrap
				  natural a la siguiente fila gracias a `flex-wrap`.
				-->
				<div class="flex min-h-9 flex-wrap items-center gap-2">
					<FilterDropdown
						label="Tipo"
						options={tipoOptions}
						value={tiposGrafo}
						onChange={(v) => (tiposGrafo = v)}
						ariaLabel="Filtrar grafo por tipo de técnica"
					/>
					<FilterDropdown
						label="Estado"
						options={estadoOptions}
						value={estadosGrafo}
						onChange={(v) => (estadosGrafo = v)}
						ariaLabel="Filtrar grafo por estado de técnica"
					/>
					<FilterDropdown
						label="Categoría"
						options={categoriaOptions}
						value={categoriasGrafo}
						onChange={(v) => (categoriasGrafo = v)}
						ariaLabel="Filtrar grafo por categoría de posición"
					/>
					<div class="ml-auto flex flex-wrap items-center gap-2">
						<Button
							variant={grafoEditing ? 'default' : 'outline'}
							size="sm"
							onclick={() => (grafoEditing = !grafoEditing)}
							aria-pressed={grafoEditing}
							aria-label={grafoEditing ? 'Salir del modo mover nodos' : 'Activar modo mover nodos'}
							title={grafoEditing ? 'Salir del modo mover nodos' : 'Mover nodos'}
						>
							<MoveIcon class="size-4" />
							<span class="hidden sm:inline">{grafoEditing ? 'Salir' : 'Mover nodos'}</span>
						</Button>
						<Button
							variant="outline"
							size="sm"
							onclick={handleReorganizar}
							aria-label="Reorganizar grafo"
							title="Reorganizar grafo"
						>
							<RefreshCwIcon class="size-4" />
							<span class="hidden sm:inline">Reorganizar</span>
						</Button>
						{#if grafoDirty}
							<Button
								variant="default"
								size="sm"
								disabled={savingLayout}
								onclick={handleGuardarOrganizacion}
								aria-label="Guardar organización del grafo"
							>
								<SaveIcon class="size-4" />
								<span class="hidden sm:inline"
									>{savingLayout ? 'Guardando…' : 'Guardar organización'}</span
								>
								<span class="sm:hidden">{savingLayout ? '…' : 'Guardar'}</span>
							</Button>
						{/if}
					</div>
				</div>
			{/if}
		</div>

		{#if vistaPrincipal === 'grafo'}
			<!--
			  Vista grafo. En móvil el contenedor sangra el padding lateral
			  del main (`-mx-4`) y anula el `pb-28` (`-mb-28`) para llegar a
			  ras del bottom nav (`bottom-14` = 56px). Altura calculada con
			  `dvh` para que aguante la barra dinámica del navegador móvil:
			  100dvh − 13rem (header 14 + sub-header ~6 + nav 14 + padding).
			  En desktop volvemos al wrapper acotado con altura `70vh`.
			-->
			<div
				class="-mx-4 -mb-28 h-[calc(100dvh-13rem)] bg-muted/20 sm:mx-0 sm:mb-0 sm:h-[70vh]"
			>
				<GrafoMapa
					bind:this={grafoComponent}
					bind:dirty={grafoDirty}
					bind:editing={grafoEditing}
					nodes={grafoElements.nodes}
					edges={grafoElements.edges}
					tipos={tiposGrafo}
					estados={estadosGrafo}
					categorias={categoriasGrafo}
					onAttemptPush={attemptPushModal}
				/>
			</div>
		{:else if subVistaLista === 'posiciones'}
			{#if filtroSinResultados}
				<p
					class="rounded border border-dashed border-border p-8 text-center text-muted-foreground"
				>
					Sin resultados para "{query}".
				</p>
			{:else}
				{#each posicionesPorCategoria as grupo (grupo.categoria)}
					<section class="space-y-2">
						<h2 class="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
							{CATEGORIA_LABEL[grupo.categoria]}
						</h2>
						<ul class="space-y-2">
							{#each grupo.items as p (p.id)}
								<li>
									<button
										type="button"
										class="block w-full rounded-lg border border-border bg-card p-3 text-left shadow-xs transition-colors hover:bg-accent focus-visible:bg-accent focus-visible:outline-none"
										onclick={() => openPosicion(p)}
									>
										<div class="font-medium">{p.nombre}</div>
										<div class="mt-1 flex flex-wrap gap-1">
											{#if p.tipo}
												<span class="rounded px-2 py-0.5 text-xs {TIPO_ROL_BADGE[p.tipo]}">
													{TIPO_ROL_LABEL[p.tipo]}
												</span>
											{/if}
											<span class="rounded bg-muted px-2 py-0.5 text-xs text-muted-foreground">
												{CATEGORIA_LABEL[p.categoria]}
											</span>
										</div>
									</button>
								</li>
							{/each}
						</ul>
					</section>
				{/each}
			{/if}
		{:else if subVistaLista === 'tecnicas'}
			<!--
			  Tab "Técnicas": el filtro multi-select por tipo vive en el
			  sub-header sticky de arriba. Aquí solo la lista plana ordenada
			  alfabéticamente. Click en item → push del modal de técnica al
			  stack del mapa. Creación NO está en esta vista por decisión de
			  producto (T-10/s8): las técnicas nacen siempre desde una
			  posición de origen.
			-->
			{#if tecnicas.length === 0}
				<p class="rounded border border-dashed border-border p-8 text-center text-muted-foreground">
					Sin técnicas en el catálogo. Crea una desde una posición.
				</p>
			{:else if tecnicasFiltradas.length === 0}
				<p
					class="rounded border border-dashed border-border p-8 text-center text-muted-foreground"
				>
					{queryNormalized !== ''
						? `Sin resultados para "${query}".`
						: 'Sin técnicas con los tipos seleccionados.'}
				</p>
			{:else}
				<ul class="space-y-2">
					{#each tecnicasFiltradas as t (t.id)}
						<li>
							<button
								type="button"
								class="block w-full rounded-lg border border-border bg-card p-3 text-left shadow-xs transition-colors hover:bg-accent focus-visible:bg-accent focus-visible:outline-none"
								onclick={() => openTecnica(t)}
							>
								<div class="flex items-start justify-between gap-2">
									<div class="min-w-0 flex-1">
										<div class="font-medium">
											{t.nombre}{#if t.variante}<span class="font-normal text-muted-foreground"
													> ({t.variante})</span
												>{/if}
										</div>
										<div class="mt-0.5 text-xs text-muted-foreground">
											desde {resolveOrigen(t)} → {resolveDestino(t)}
										</div>
									</div>
									<div class="flex shrink-0 flex-wrap justify-end gap-1">
										<span class="rounded px-2 py-0.5 text-xs {TIPO_TECNICA_BADGE[t.tipo]}">
											{TIPO_TECNICA_LABEL[t.tipo]}
										</span>
										{#if t.estado !== 'probando'}
											<span class="rounded px-2 py-0.5 text-xs {ESTADO_BADGE[t.estado]}">
												{ESTADO_LABEL[t.estado]}
											</span>
										{/if}
									</div>
								</div>
							</button>
						</li>
					{/each}
				</ul>
			{/if}
		{:else}
			<!--
			  Tab "Sumisiones": lista plana ordenada alfabéticamente (la DAO ya
			  aplica `ORDER BY nombre`). Click en item → abre `SumisionModalContent`
			  vía el stack del mapa (mismo flujo que desde el modal de posición).
			  Creación NO se hace desde aquí: el FAB "+ Nuevo" global de la página
			  ya expone "Nueva sumisión" en su DropdownMenu, así evitamos un
			  segundo punto de entrada (decisión: escaso > ruido).
			-->
			{#if sumisiones.length === 0}
				<p class="rounded border border-dashed border-border p-8 text-center text-muted-foreground">
					Sin sumisiones en el catálogo. Pulsa "+ Nuevo → Nueva sumisión".
				</p>
			{:else if sumisionesFiltradas.length === 0}
				<p class="rounded border border-dashed border-border p-8 text-center text-muted-foreground">
					Sin resultados para "{query}".
				</p>
			{:else}
				<ul class="space-y-2">
					{#each sumisionesFiltradas as s (s.id)}
						<li>
							<button
								type="button"
								class="block w-full rounded-lg border border-border bg-card p-3 text-left shadow-xs transition-colors hover:bg-accent focus-visible:bg-accent focus-visible:outline-none"
								onclick={() => openSumision(s)}
							>
								<div class="font-medium">{s.nombre}</div>
							</button>
						</li>
					{/each}
				</ul>
			{/if}
		{/if}
	{/if}
</main>

<BottomNav />

<!--
  FAB con dropdown (T-9): un solo botón "+ Nuevo" que despliega dos opciones
  ("Nueva posición" / "Nueva sumisión"). Visible en cualquier anchura. La
  BottomNav del proyecto se mantiene siempre, por lo que dejamos hueco con
  `bottom-24` para no chocar con ella. El `z-30` mantiene el botón por
  encima del BottomNav, y el Content del DropdownMenu se monta vía Portal
  (bits-ui) por lo que se renderiza fuera de cualquier overflow.
-->
{#if status === 'ready'}
	<DropdownMenu.Root>
		<DropdownMenu.Trigger>
			{#snippet child({ props })}
				<Button
					{...props}
					class="fixed right-6 bottom-24 z-30 inline-flex shadow-lg"
					size="lg"
					aria-label="Crear nuevo elemento del mapa"
				>
					<PlusIcon />
					Nuevo
				</Button>
			{/snippet}
		</DropdownMenu.Trigger>
		<DropdownMenu.Content align="end" side="top" sideOffset={8}>
			<DropdownMenu.Item onSelect={openWizardCrearPosicion}>Nueva posición</DropdownMenu.Item>
			<DropdownMenu.Item onSelect={openWizardCrearSumision}>Nueva sumisión</DropdownMenu.Item>
		</DropdownMenu.Content>
	</DropdownMenu.Root>
{/if}

<MapaModalHost bind:this={modalHost} onCatalogChanged={refresh} {presentation} />

<!--
  AlertDialog "¿Descartar cambios del grafo?" (T-9.b.it3). Se abre
  cuando el usuario intenta cambiar a vista Lista con `grafoDirty=true`.
  Patrón controlado (open + onOpenChange, NO bind:open) idéntico al del
  MapaModalHost. Decisión: diálogo separado del de cambios en wizards;
  los dos son ortogonales y secuenciales evitan ambigüedad sobre qué
  se está descartando — ver razonamiento en el bloque <script>.
-->
<AlertDialog.Root
	open={mostrarConfirmDescartarGrafo}
	onOpenChange={handleConfirmDescartarGrafoOpenChange}
>
	<AlertDialog.Content>
		<AlertDialog.Header>
			<AlertDialog.Title>¿Descartar cambios del grafo?</AlertDialog.Title>
			<AlertDialog.Description>
				Tienes cambios sin guardar en la organización del grafo. Si cambias de vista
				ahora, se perderán.
			</AlertDialog.Description>
		</AlertDialog.Header>
		<AlertDialog.Footer>
			<AlertDialog.Cancel>Cancelar</AlertDialog.Cancel>
			<AlertDialog.Action
				onclick={handleConfirmDescartarGrafo}
				class={buttonVariants({ variant: 'destructive' })}
			>
				Descartar
			</AlertDialog.Action>
		</AlertDialog.Footer>
	</AlertDialog.Content>
</AlertDialog.Root>
