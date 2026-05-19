<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Textarea } from '$lib/components/ui/textarea';
	import Chips from '$lib/components/Chips.svelte';
	import ChipPicker from '$lib/components/ChipPicker.svelte';
	import CinturonChips from '$lib/components/CinturonChips.svelte';
	import CompaneroCombobox from '$lib/components/CompaneroCombobox.svelte';
	import PosicionWizardDialog from '$lib/components/PosicionWizardDialog.svelte';
	import TecnicaWizardDialog from '$lib/components/TecnicaWizardDialog.svelte';
	import { listCompaneros, createCompanero, updateCompanero } from '$lib/companeros';
	import { capitalizeFirst } from '$lib/utils';
	import type {
		CategoriaPosicion,
		Cinturon,
		Companero,
		PesoRelativo,
		Posicion,
		ResultadoRoll,
		Roll,
		Tecnica
	} from '$lib/types';

	const PESOS: { value: PesoRelativo; label: string }[] = [
		{ value: 'mucho_menos', label: 'Mucho menor' },
		{ value: 'menos', label: 'Menor' },
		{ value: 'similar', label: 'Similar' },
		{ value: 'mas', label: 'Mayor' },
		{ value: 'mucho_mas', label: 'Mucho mayor' }
	];

	const RESULTADOS: { value: ResultadoRoll; label: string }[] = [
		{ value: 'domine', label: 'Dominé' },
		{ value: 'equilibrado', label: 'Equilibrado' },
		{ value: 'me_dominaron', label: 'Me dominaron' }
	];

	type SaveData = {
		id: string;
		sesion_id: string;
		companero_id?: string;
		tamano_relativo?: PesoRelativo;
		duracion_min?: number;
		resultado?: ResultadoRoll;
		// T-3.it2.b: `que_intente`/`que_fallo`/`posiciones_problema` siguen
		// existiendo en la BD como histórico pre-relacional, pero el editor
		// ya no los escribe. El handler reenvía `roll?.que_intente` etc. tal
		// cual para preservar valores antiguos sin pisarlos con null. En
		// creación quedan undefined → null. Las relaciones reales viajan en
		// los arrays de abajo.
		que_intente?: string;
		que_fallo?: string;
		posiciones_problema?: string;
		// T-3.it2.b: ids de posiciones vinculadas al roll separadas por
		// resultado. El callback `onSave` debe llamar a
		// `setPosicionesDelRoll(rollId, posiciones_fue_bien_ids, posiciones_fallaron_ids)`
		// tras createRoll/updateRoll para persistirlas en `roll_posicion`.
		// Una misma posición puede aparecer en ambos sets.
		posiciones_fue_bien_ids: string[];
		posiciones_fallaron_ids: string[];
		// T-3.it2: ids del catálogo de técnicas que al usuario le salieron
		// bien o falló en este roll. El callback `onSave` debe llamar a
		// `setTecnicasDelRoll(rollId, tecnicas_fue_bien_ids, tecnicas_fallaron_ids)`
		// tras createRoll/updateRoll. Una misma técnica puede aparecer en los
		// dos arrays a la vez.
		tecnicas_fue_bien_ids: string[];
		tecnicas_fallaron_ids: string[];
	};

	// Orden por categoría (igual que en /mapa) y alfabético dentro de cada
	// categoría. Mismo criterio que `CATEGORIAS_ORDEN` en `/mapa`.
	const CATEGORIAS_ORDEN: CategoriaPosicion[] = [
		'guardia',
		'control_superior',
		'espalda',
		'transicion',
		'otro'
	];

	let {
		open = $bindable(false),
		sesionId,
		roll,
		onSave,
		onDelete
	}: {
		open?: boolean;
		sesionId: string;
		roll?: Roll;
		onSave: (data: SaveData) => void | Promise<void>;
		onDelete?: () => void | Promise<void>;
	} = $props();

	const mode = $derived<'wizard' | 'form'>(roll ? 'form' : 'wizard');
	// T-12 añadió un paso "posiciones problema" entre compañero y tamaño;
	// luego se retiró el paso de duración. Pasos actuales (wizard, modo crear):
	// 1=Compañero, 2=Posiciones, 3=Tamaño, 4=Resultado, 5=Técnicas.
	const totalSteps = 5;

	let companeros = $state<Companero[]>([]);
	let companeroId = $state<string | null>(null);
	let tamanoRelativo = $state<PesoRelativo | undefined>(undefined);
	// `duracion_min` ya no se edita desde la UI. La columna sigue en BD;
	// guardamos el valor original cargado del `roll` para reenviarlo intacto.
	let duracionMinOriginal = $state<number | undefined>(undefined);
	let resultado = $state<ResultadoRoll | undefined>(undefined);

	// T-3.it2.b: catálogo completo de posiciones (recargable) y selecciones
	// del roll separadas por resultado. Una misma posición puede aparecer en
	// ambas listas a la vez (PK `(roll_id, posicion_id, resultado)`).
	// `cualResultadoCrearPosicion` indica a qué lista se añade la posición
	// recién creada inline desde el sub-wizard.
	let posicionesCatalog = $state<Posicion[]>([]);
	let posicionesFueBien = $state<string[]>([]);
	let posicionesFallaron = $state<string[]>([]);
	let crearPosicionOpen = $state(false);
	let cualResultadoCrearPosicion = $state<'fue_bien' | 'fallo'>('fue_bien');

	// T-3.it2: catálogo de técnicas + selecciones por resultado.
	//  - `tecnicasFueBien`: ids que al usuario le salieron bien en este roll.
	//  - `tecnicasFallaron`: ids que falló en este roll.
	// Una misma técnica puede estar en ambas listas a la vez (lo permite la
	// PK `(roll_id, tecnica_id, resultado)` de `roll_tecnica`).
	// `cualResultadoCrear` indica a qué lista se añade automáticamente la
	// técnica recién creada inline desde el sub-wizard.
	let tecnicasCatalog = $state<Tecnica[]>([]);
	let tecnicasFueBien = $state<string[]>([]);
	let tecnicasFallaron = $state<string[]>([]);
	let crearTecnicaOpen = $state(false);
	let cualResultadoCrear = $state<'fue_bien' | 'fallo'>('fue_bien');

	// T-3.it2.c: UX unificada para los bloques posición/técnica. Un único
	// buscador por bloque (compartido entre los dos tabs "Fue bien" / "Fue
	// mal") y un único ChipPicker que muestra el set del tab activo. El
	// estado se comparte entre wizard y form porque en ambos hay una sola
	// instancia activa del editor a la vez.
	let posicionQuery = $state('');
	let activePosicionTab = $state<'fue_bien' | 'fallo'>('fue_bien');
	let tecnicaQuery = $state('');
	let activeTecnicaTab = $state<'fue_bien' | 'fallo'>('fue_bien');

	let currentStep = $state(1);
	let visitedSteps = $state<Set<number>>(new Set([1]));

	// Bandera consumida al salir del paso 2 (posiciones problema) para
	// saltarse el paso 3 (tamaño) si el compañero ya tenía peso
	// preconfigurado. Antes de T-12 el "skip tamaño" se aplicaba directamente
	// al hacer `advance()` desde el paso 1 (tamaño era el paso 2). Ahora
	// posiciones se intercala entre los dos, así que diferimos el skip.
	let pendingSkipTamano = $state(false);

	let showExtraData = $state(false);
	let extraDataCompaneroId = $state<string | null>(null);
	let extraCinturon = $state<Cinturon | null>(null);
	let extraPeso = $state<PesoRelativo | null>(null);
	let extraNotas = $state('');

	let saving = $state(false);
	let errorMsg = $state('');

	let lastCompaneroId: string | null = null;

	$effect(() => {
		if (open) {
			void loadCompaneros();
			void loadPosiciones();
			void loadPosicionesDelRollSeleccion();
			void loadTecnicas();
			void loadTecnicasDelRollSeleccion();
			companeroId = roll?.companero_id ?? null;
			lastCompaneroId = roll?.companero_id ?? null;
			tamanoRelativo = roll?.tamano_relativo;
			duracionMinOriginal = roll?.duracion_min;
			resultado = roll?.resultado;
			currentStep = 1;
			visitedSteps = new Set([1]);
			showExtraData = false;
			extraDataCompaneroId = null;
			extraCinturon = null;
			extraPeso = null;
			extraNotas = '';
			errorMsg = '';
			crearPosicionOpen = false;
			crearTecnicaOpen = false;
			cualResultadoCrear = 'fue_bien';
			cualResultadoCrearPosicion = 'fue_bien';
			pendingSkipTamano = false;
			// Reset de tabs/buscadores para que al abrir el editor siempre
			// arranquemos en "Fue bien" sin texto residual de una sesión
			// anterior del Dialog.
			posicionQuery = '';
			activePosicionTab = 'fue_bien';
			tecnicaQuery = '';
			activeTecnicaTab = 'fue_bien';
		}
	});

	$effect(() => {
		if (!open || mode === 'form') return;
		if (companeroId === lastCompaneroId) return;
		lastCompaneroId = companeroId;
		const c = companeros.find((c) => c.id === companeroId);
		// Pisar el chip de tamaño con el peso del compañero al cambiarlo,
		// aunque ya hubiera un valor (típicamente del compañero anterior).
		// El usuario puede cambiarlo manualmente en el paso 3 si quiere.
		if (c?.peso_relativo) {
			tamanoRelativo = c.peso_relativo;
		}
	});

	async function loadCompaneros() {
		try {
			companeros = await listCompaneros();
		} catch (err) {
			errorMsg = err instanceof Error ? err.message : String(err);
		}
	}

	async function loadPosiciones() {
		// T-12: catálogo completo de posiciones para los chips.
		try {
			const { listPosiciones } = await import('$lib/posiciones');
			posicionesCatalog = await listPosiciones();
		} catch (err) {
			// El paso es skippable, no rompemos el wizard si falla.
			console.warn('[RollEditor] listPosiciones falló:', err);
		}
	}

	async function loadPosicionesDelRollSeleccion() {
		// En modo editar precargamos las posiciones vinculadas (separadas
		// por resultado); en crear arranca vacío.
		if (!roll) {
			posicionesFueBien = [];
			posicionesFallaron = [];
			return;
		}
		try {
			const { getPosicionesDelRoll } = await import('$lib/rolls');
			const sel = await getPosicionesDelRoll(roll.id);
			posicionesFueBien = sel.fueBien;
			posicionesFallaron = sel.fallaron;
		} catch (err) {
			posicionesFueBien = [];
			posicionesFallaron = [];
			console.warn('[RollEditor] getPosicionesDelRoll falló:', err);
		}
	}

	// Agrupa el catálogo por categoría con el orden de /mapa. Solo se
	// renderizan secciones con items para evitar headers vacíos.
	const posicionesAgrupadas = $derived.by(() => {
		const grupos: { categoria: CategoriaPosicion; items: Posicion[] }[] = [];
		for (const cat of CATEGORIAS_ORDEN) {
			const items = posicionesCatalog
				.filter((p) => p.categoria === cat)
				.slice()
				.sort((a, b) => a.nombre.localeCompare(b.nombre));
			if (items.length > 0) grupos.push({ categoria: cat, items });
		}
		return grupos;
	});

	const CATEGORIA_LABEL: Record<CategoriaPosicion, string> = {
		guardia: 'Guardia',
		control_superior: 'Control superior',
		espalda: 'Espalda',
		transicion: 'Transición',
		otro: 'Otro'
	};

	// T-3.it2.c: catálogos pre-filtrados por la query del buscador unificado
	// del bloque. El ChipPicker se monta con `showSearch={false}` y consume
	// estos derivados. Si la query está vacía devolvemos la lista entera.
	const posicionesAgrupadasFiltradas = $derived.by(() => {
		const q = posicionQuery.trim().toLocaleLowerCase();
		if (!q) return posicionesAgrupadas;
		return posicionesAgrupadas
			.map((g) => ({
				...g,
				items: g.items.filter((p) => p.nombre.toLocaleLowerCase().includes(q))
			}))
			.filter((g) => g.items.length > 0);
	});

	const tecnicasFiltradas = $derived.by(() => {
		const q = tecnicaQuery.trim().toLocaleLowerCase();
		const all = tecnicasCatalog.slice().sort((a, b) => a.nombre.localeCompare(b.nombre));
		if (!q) return all;
		return all.filter((t) => {
			const label = t.variante ? `${t.nombre} (${t.variante})` : t.nombre;
			return label.toLocaleLowerCase().includes(q);
		});
	});

	function handlePosicionesFueBienChange(ids: string[]) {
		posicionesFueBien = ids;
	}

	function handlePosicionesFallaronChange(ids: string[]) {
		posicionesFallaron = ids;
	}

	function abrirCrearPosicion(resultadoTarget: 'fue_bien' | 'fallo') {
		cualResultadoCrearPosicion = resultadoTarget;
		crearPosicionOpen = true;
	}

	async function handlePosicionCreada(p: Posicion) {
		// Tras crear: añadir al catálogo y a la lista activa correspondiente
		// (la rama desde la que se pulsó "+ Crear nueva posición"). Si el
		// usuario abrió el dialog desde "fue bien" añadimos sólo a ese set —
		// puede marcarla también en el otro manualmente si quiere.
		posicionesCatalog = [...posicionesCatalog, p];
		if (cualResultadoCrearPosicion === 'fue_bien') {
			if (!posicionesFueBien.includes(p.id)) {
				posicionesFueBien = [...posicionesFueBien, p.id];
			}
		} else {
			if (!posicionesFallaron.includes(p.id)) {
				posicionesFallaron = [...posicionesFallaron, p.id];
			}
		}
		// Recarga "real" desde BD (defensivo: cubre el caso de campos
		// derivados que no traemos aquí, p. ej. orden alfabético tras un
		// rename, etc.).
		await loadPosiciones();
	}

	async function loadTecnicas() {
		// T-3.it2: catálogo completo de técnicas para los chips de
		// "Qué intenté / Qué fallé".
		try {
			const { listTecnicas } = await import('$lib/tecnicas');
			tecnicasCatalog = await listTecnicas();
		} catch (err) {
			// No rompemos el editor si el catálogo falla — el paso es
			// opcional y los chips simplemente saldrán vacíos.
			console.warn('[RollEditor] listTecnicas falló:', err);
		}
	}

	async function loadTecnicasDelRollSeleccion() {
		// En modo editar precargamos las técnicas vinculadas (separadas
		// por resultado); en crear arranca vacío.
		if (!roll) {
			tecnicasFueBien = [];
			tecnicasFallaron = [];
			return;
		}
		try {
			const { getTecnicasDelRoll } = await import('$lib/rolls');
			const sel = await getTecnicasDelRoll(roll.id);
			tecnicasFueBien = sel.fueBien;
			tecnicasFallaron = sel.fallaron;
		} catch (err) {
			tecnicasFueBien = [];
			tecnicasFallaron = [];
			console.warn('[RollEditor] getTecnicasDelRoll falló:', err);
		}
	}

	function handleTecnicasFueBienChange(ids: string[]) {
		tecnicasFueBien = ids;
	}

	function handleTecnicasFallaronChange(ids: string[]) {
		tecnicasFallaron = ids;
	}

	function abrirCrearTecnica(resultadoTarget: 'fue_bien' | 'fallo') {
		cualResultadoCrear = resultadoTarget;
		crearTecnicaOpen = true;
	}

	async function handleTecnicaCreada(t: Tecnica) {
		// Tras crear: añadir al catálogo y a la lista activa correspondiente
		// (la rama desde la que se pulsó "+ Crear nueva técnica").
		tecnicasCatalog = [...tecnicasCatalog, t];
		if (cualResultadoCrear === 'fue_bien') {
			if (!tecnicasFueBien.includes(t.id)) {
				tecnicasFueBien = [...tecnicasFueBien, t.id];
			}
		} else {
			if (!tecnicasFallaron.includes(t.id)) {
				tecnicasFallaron = [...tecnicasFallaron, t.id];
			}
		}
		// Recarga "real" desde BD (defensivo, p. ej. para que el orden
		// alfabético del catálogo refleje la inserción de inmediato).
		await loadTecnicas();
	}

	function goToStep(step: number) {
		if (step > currentStep && !visitedSteps.has(step)) return;
		currentStep = step;
	}

	function advance() {
		if (currentStep < totalSteps) {
			currentStep += 1;
			visitedSteps = new Set([...visitedSteps, currentStep]);
		}
	}

	function handleCompaneroChange(id: string | null) {
		companeroId = id;
		if (id && currentStep === 1 && !showExtraData) {
			advance();
		}
	}

	async function handleCompaneroCreate(nombre: string) {
		try {
			const c = await createCompanero({ nombre });
			companeros = [...companeros, c].sort((a, b) => a.nombre.localeCompare(b.nombre));
			companeroId = c.id;
			lastCompaneroId = c.id;
			extraDataCompaneroId = c.id;
			extraCinturon = null;
			extraPeso = null;
			extraNotas = '';
			showExtraData = true;
		} catch (err) {
			errorMsg = err instanceof Error ? err.message : String(err);
		}
	}

	async function handleExtraDataContinue() {
		const id = extraDataCompaneroId;
		const skipTamano = !!extraPeso;
		if (id) {
			const created = companeros.find((c) => c.id === id);
			const hasExtras = extraCinturon || extraPeso || extraNotas.trim();
			if (created && hasExtras) {
				try {
					await updateCompanero({
						id,
						nombre: created.nombre,
						cinturon: extraCinturon ?? undefined,
						peso_relativo: extraPeso ?? undefined,
						notas: extraNotas.trim() || undefined
					});
					companeros = companeros.map((c) =>
						c.id === id
							? {
									...c,
									cinturon: extraCinturon ?? undefined,
									peso_relativo: extraPeso ?? undefined,
									notas: extraNotas.trim() || undefined
								}
							: c
					);
					if (extraPeso && !tamanoRelativo) {
						tamanoRelativo = extraPeso;
					}
				} catch (err) {
					errorMsg = err instanceof Error ? err.message : String(err);
					return;
				}
			}
		}
		showExtraData = false;
		extraDataCompaneroId = null;
		advance();
		// Antes de T-12 aquí hacíamos un `advance()` extra para saltar
		// tamaño cuando ya teníamos peso preconfigurado. Ahora entre
		// compañero (1) y tamaño (3) está posiciones (2), así que no
		// saltamos en línea: dejamos la bandera y la consumimos al salir
		// del paso 2.
		if (skipTamano) pendingSkipTamano = true;
	}

	function handleTamanoChange(v: string | null) {
		tamanoRelativo = (v ?? undefined) as PesoRelativo | undefined;
		if (v && mode === 'wizard') advance();
	}

	function handleAdvanceFromPosiciones() {
		// Sale del paso 2 (posiciones-problema) hacia el siguiente. Si el
		// compañero traía peso preconfigurado, consumimos la bandera y
		// saltamos el paso 3 (tamaño).
		advance();
		if (pendingSkipTamano) {
			pendingSkipTamano = false;
			advance();
		}
	}

	function handleResultadoChange(v: string | null) {
		resultado = (v ?? undefined) as ResultadoRoll | undefined;
		if (v && mode === 'wizard') advance();
	}

	const canAdvance = $derived(
		currentStep === 1 ? !!companeroId : currentStep === 5 ? !!resultado : true
	);
	const canSaveWizard = $derived(!!companeroId && !!resultado && !saving);
	const canSaveForm = $derived(!!resultado && !saving);

	/**
	 * Enter en el wizard: dispara la acción primaria del paso actual. Usa
	 * un listener global para cubrir el caso "foco perdido" (entrar a un
	 * paso sin click previo). Textareas se respetan (newline natural).
	 */
	function handleWizardKeydown(e: KeyboardEvent) {
		if (mode !== 'wizard') return;
		if (e.key !== 'Enter') return;
		const target = e.target as HTMLElement | null;
		if (target?.tagName === 'TEXTAREA') return;
		// Si el foco está en un chip (button dentro de un radiogroup),
		// Enter activa la selección/toggle — semántica propia. No la pisamos.
		if (target?.closest('[role="radiogroup"]')) return;
		// Si estamos en el sub-formulario "extras del compañero" (paso 1
		// tras crear), dejar que el usuario complete o pulse Continuar
		// manualmente — no avanzamos por Enter porque hay 3 chips + textarea.
		if (currentStep === 1 && showExtraData) return;
		// Intercept inmediato: incluso si NO podemos avanzar (paso obligatorio
		// vacío), bloqueamos el evento para que no active el botón enfocado
		// (típicamente: botón "Paso 1" del indicador, que dispararía goToStep(1)).
		e.preventDefault();
		e.stopImmediatePropagation();
		const intercept = () => {
			e.preventDefault();
			e.stopImmediatePropagation();
		};
		if (currentStep === 1) {
			if (companeroId) {
				intercept();
				advance();
			}
			return;
		}
		if (currentStep === 2) {
			intercept();
			handleAdvanceFromPosiciones();
			return;
		}
		if (currentStep === 3) {
			// Paso Técnicas (movido tras Posiciones).
			intercept();
			advance();
			return;
		}
		if (currentStep === 4) {
			// Paso Tamaño relativo.
			intercept();
			advance();
			return;
		}
		if (currentStep === totalSteps) {
			// Paso Resultado (último). Solo guarda si hay resultado.
			if (canSaveWizard) {
				intercept();
				handleSave();
			}
		}
	}

	function handleDocumentEnter(e: KeyboardEvent) {
		if (e.key !== 'Enter') return;
		const target = e.target as HTMLElement | null;
		// Inputs y textareas tienen semántica natural de Enter (submit del
		// form, newline). Cualquier otra cosa (body con foco perdido, botón
		// del indicador de progreso del wizard, label, etc.) deja el control
		// al wizard — handleWizardKeydown hace preventDefault y evita que
		// se dispare el click sintético del botón enfocado.
		if (target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA') return;
		handleWizardKeydown(e);
	}

	onMount(() => {
		if (typeof document !== 'undefined') document.addEventListener('keydown', handleDocumentEnter, true);
	});

	onDestroy(() => {
		if (typeof document !== 'undefined') document.removeEventListener('keydown', handleDocumentEnter, true);
	});

	async function handleSave() {
		if (mode === 'wizard' && !canSaveWizard) return;
		if (mode === 'form' && !canSaveForm) return;
		saving = true;
		errorMsg = '';
		try {
			// `duracion_min` ya no se edita desde la UI. Se reenvía el valor
			// original cargado (undefined en creación, el número guardado en
			// edición) para no pisar valores existentes.
			await onSave({
				id: roll?.id ?? crypto.randomUUID(),
				sesion_id: sesionId,
				companero_id: companeroId ?? undefined,
				tamano_relativo: tamanoRelativo,
				duracion_min: duracionMinOriginal,
				resultado,
				// T-3.it2.b: la UI ya no escribe estos textos libres. Para
				// preservar el histórico de rolls antiguos, reenviamos el
				// valor que ya tenía el roll en BD (no se sobrescribe). En
				// creación quedan undefined → null. Las relaciones reales
				// viajan en los arrays de IDs de abajo.
				que_intente: roll?.que_intente,
				que_fallo: roll?.que_fallo,
				posiciones_problema: roll?.posiciones_problema,
				posiciones_fue_bien_ids: posicionesFueBien,
				posiciones_fallaron_ids: posicionesFallaron,
				tecnicas_fue_bien_ids: tecnicasFueBien,
				tecnicas_fallaron_ids: tecnicasFallaron
			});
			open = false;
		} catch (err) {
			errorMsg = err instanceof Error ? err.message : String(err);
		} finally {
			saving = false;
		}
	}

	async function handleDelete() {
		if (!onDelete) return;
		if (!confirm('¿Borrar este roll?')) return;
		await onDelete();
		open = false;
	}
</script>

<Dialog.Root bind:open>
	<Dialog.Content
		class="flex max-h-[90vh] flex-col sm:max-w-md"
		onOpenAutoFocus={(e) => e.preventDefault()}
		onInteractOutside={(e) => {
			const target = e.target as HTMLElement | null;
			// Clicks dentro del combobox-portal (compañero) o de un sub-Dialog
			// hijo (crear-posición, crear-técnica) no deben cerrar el RollEditor.
			if (target?.closest('[data-combobox-portal]')) {
				e.preventDefault();
				return;
			}
			if (crearPosicionOpen || crearTecnicaOpen) {
				e.preventDefault();
			}
		}}
	>
		<Dialog.Header>
			<Dialog.Title>{roll ? `Editar roll #${roll.orden}` : 'Nuevo roll'}</Dialog.Title>
		</Dialog.Header>

		{#if mode === 'wizard'}
			<div class="flex items-center gap-1 pt-2">
				{#each Array(totalSteps) as _, i (i)}
					{@const step = i + 1}
					{@const visited = visitedSteps.has(step)}
					{@const isCurrent = step === currentStep}
					<button
						type="button"
						class="h-1.5 flex-1 rounded-full transition-colors {isCurrent
							? 'bg-primary'
							: visited
								? 'bg-primary/40 hover:bg-primary/60 cursor-pointer'
								: 'bg-muted'}"
						disabled={!visited || isCurrent}
						onclick={() => goToStep(step)}
						aria-label="Ir al paso {step}"
					></button>
				{/each}
			</div>
			<p class="text-center text-xs text-muted-foreground">
				Paso {currentStep} de {totalSteps}
			</p>

			<!--
			  Body scrollable: el contenido del paso puede ser largo (p. ej. paso 2
			  con muchas posiciones en chips, paso 6 con varios textareas). El
			  footer queda fuera de este div para que los botones Cancelar / ←
			  Anterior / Continuar / Guardar siempre se vean al final del Dialog.
			-->
			<div class="-mx-3 flex-1 overflow-y-auto px-3" onkeydowncapture={handleWizardKeydown} role="presentation">
				<div class="space-y-4 py-2">
				{#if currentStep === 1}
					<div class="space-y-3">
						<h3 class="text-sm font-semibold">¿Con quién?</h3>
						<CompaneroCombobox
							{companeros}
							value={companeroId}
							onChange={handleCompaneroChange}
							onCreate={handleCompaneroCreate}
						/>

						{#if showExtraData}
							<div class="space-y-3 rounded border border-border bg-muted/40 p-3">
								<p class="text-xs text-muted-foreground">+ Añadir más datos (opcional)</p>
								<div class="space-y-1.5">
									<Label>Cinturón</Label>
									<CinturonChips
										value={extraCinturon}
										onChange={(v) => (extraCinturon = v)}
										ariaLabel="Cinturón del compañero"
									/>
								</div>
								<div class="space-y-1.5">
									<Label>Peso relativo</Label>
									<Chips
										options={PESOS}
										value={extraPeso}
										onChange={(v) => (extraPeso = (v ?? null) as PesoRelativo | null)}
										ariaLabel="Peso relativo del compañero"
									/>
								</div>
								<div class="space-y-1.5">
									<Label for="extra-notas">Notas</Label>
									<Textarea
										id="extra-notas"
										bind:value={extraNotas}
										rows={2}
										oninput={(e) => {
											extraNotas = capitalizeFirst(e.currentTarget.value);
										}}
									/>
								</div>
								<Button class="w-full" onclick={handleExtraDataContinue} disabled={saving}>
									Continuar
								</Button>
							</div>
						{/if}
					</div>
				{/if}

				{#if currentStep === 2}
					<!-- T-3.it2.c: paso de posiciones unificado en un solo
					     buscador + tabs "Fue bien" / "Fue mal". Skippable.
					     El chip "+ Crear nueva" interno del ChipPicker añade
					     al set del tab activo. -->
					<div class="space-y-4">
						<h3 class="text-sm font-semibold">Posiciones (opcional)</h3>

						<Input
							type="search"
							bind:value={posicionQuery}
							placeholder="Buscar posición…"
							aria-label="Buscar posición"
						/>

						<div
							role="tablist"
							aria-label="Resultado a editar"
							class="inline-flex rounded-md border border-border bg-muted p-0.5"
						>
							<button
								type="button"
								role="tab"
								aria-selected={activePosicionTab === 'fue_bien'}
								class="rounded px-3 py-1.5 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none {activePosicionTab ===
								'fue_bien'
									? 'bg-background text-foreground shadow-sm'
									: 'text-muted-foreground hover:text-foreground'}"
								onclick={() => (activePosicionTab = 'fue_bien')}
							>
								Fue bien ({posicionesFueBien.length})
							</button>
							<button
								type="button"
								role="tab"
								aria-selected={activePosicionTab === 'fallo'}
								class="rounded px-3 py-1.5 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none {activePosicionTab ===
								'fallo'
									? 'bg-background text-foreground shadow-sm'
									: 'text-muted-foreground hover:text-foreground'}"
								onclick={() => (activePosicionTab = 'fallo')}
							>
								Fue mal ({posicionesFallaron.length})
							</button>
						</div>

						{#if posicionesAgrupadas.length === 0}
							<p class="text-sm text-muted-foreground italic">
								Aún no hay posiciones en el catálogo. Crea una abajo o continúa para saltar.
							</p>
						{/if}

						{#if activePosicionTab === 'fue_bien'}
							<ChipPicker
								mode="select"
								showSearch={false}
								groups={posicionesAgrupadasFiltradas.map((g) => ({
									key: g.categoria,
									label: CATEGORIA_LABEL[g.categoria],
									items: g.items.map((p) => ({ value: p.id, label: p.nombre }))
								}))}
								value={posicionesFueBien}
								onChange={handlePosicionesFueBienChange}
								onCreateNew={() => abrirCrearPosicion('fue_bien')}
								emptyText=""
								filteredEmptyText="No hay posiciones que coincidan."
								ariaLabel="Posiciones que fueron bien"
								accent="success"
							/>
						{:else}
							<ChipPicker
								mode="select"
								showSearch={false}
								groups={posicionesAgrupadasFiltradas.map((g) => ({
									key: g.categoria,
									label: CATEGORIA_LABEL[g.categoria],
									items: g.items.map((p) => ({ value: p.id, label: p.nombre }))
								}))}
								value={posicionesFallaron}
								onChange={handlePosicionesFallaronChange}
								onCreateNew={() => abrirCrearPosicion('fallo')}
								emptyText=""
								filteredEmptyText="No hay posiciones que coincidan."
								ariaLabel="Posiciones que fallé"
								accent="warning"
							/>
						{/if}

						<p class="text-xs text-muted-foreground">
							Selecciona las que apliquen. Puedes saltar este paso si no aplica.
						</p>
					</div>
				{/if}

				{#if currentStep === 3}
					<!-- T-3.it2.c: técnicas unificadas en un solo buscador +
					     tabs "Fue bien" / "Fue mal". El chip "+ Crear nueva"
					     interno añade al set del tab activo. -->
					<div class="space-y-4">
						<h3 class="text-sm font-semibold">Técnicas (opcional)</h3>

						<Input
							type="search"
							bind:value={tecnicaQuery}
							placeholder="Buscar técnica…"
							aria-label="Buscar técnica"
						/>

						<div
							role="tablist"
							aria-label="Resultado a editar"
							class="inline-flex rounded-md border border-border bg-muted p-0.5"
						>
							<button
								type="button"
								role="tab"
								aria-selected={activeTecnicaTab === 'fue_bien'}
								class="rounded px-3 py-1.5 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none {activeTecnicaTab ===
								'fue_bien'
									? 'bg-background text-foreground shadow-sm'
									: 'text-muted-foreground hover:text-foreground'}"
								onclick={() => (activeTecnicaTab = 'fue_bien')}
							>
								Fue bien ({tecnicasFueBien.length})
							</button>
							<button
								type="button"
								role="tab"
								aria-selected={activeTecnicaTab === 'fallo'}
								class="rounded px-3 py-1.5 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none {activeTecnicaTab ===
								'fallo'
									? 'bg-background text-foreground shadow-sm'
									: 'text-muted-foreground hover:text-foreground'}"
								onclick={() => (activeTecnicaTab = 'fallo')}
							>
								Fue mal ({tecnicasFallaron.length})
							</button>
						</div>

						{#if tecnicasCatalog.length === 0}
							<p class="text-sm text-muted-foreground italic">
								Aún no hay técnicas en el catálogo. Crea una abajo o continúa para saltar.
							</p>
						{/if}

						{#if activeTecnicaTab === 'fue_bien'}
							<ChipPicker
								mode="select"
								showSearch={false}
								items={tecnicasFiltradas.map((t) => ({
									value: t.id,
									label: t.variante ? `${t.nombre} (${t.variante})` : t.nombre
								}))}
								value={tecnicasFueBien}
								onChange={handleTecnicasFueBienChange}
								onCreateNew={() => abrirCrearTecnica('fue_bien')}
								emptyText=""
								filteredEmptyText="No hay técnicas que coincidan."
								ariaLabel="Técnicas que fueron bien"
								accent="success"
							/>
						{:else}
							<ChipPicker
								mode="select"
								showSearch={false}
								items={tecnicasFiltradas.map((t) => ({
									value: t.id,
									label: t.variante ? `${t.nombre} (${t.variante})` : t.nombre
								}))}
								value={tecnicasFallaron}
								onChange={handleTecnicasFallaronChange}
								onCreateNew={() => abrirCrearTecnica('fallo')}
								emptyText=""
								filteredEmptyText="No hay técnicas que coincidan."
								ariaLabel="Técnicas que fallé"
								accent="warning"
							/>
						{/if}
					</div>
				{/if}

				{#if currentStep === 4}
					<div class="space-y-3">
						<h3 class="text-sm font-semibold">Tamaño relativo</h3>
						<Chips
							options={PESOS}
							value={tamanoRelativo ?? null}
							onChange={handleTamanoChange}
							ariaLabel="Tamaño relativo"
						/>
					</div>
				{/if}

				{#if currentStep === 5}
					<div class="space-y-3">
						<h3 class="text-sm font-semibold">Resultado *</h3>
						<Chips
							options={RESULTADOS}
							value={resultado ?? null}
							onChange={handleResultadoChange}
							ariaLabel="Resultado del roll"
						/>
					</div>
				{/if}
				</div>

				{#if errorMsg}
					<p class="text-sm text-destructive">{errorMsg}</p>
				{/if}
			</div>

			<Dialog.Footer>
				<Button
					variant="outline"
					size="sm"
					onclick={() => (open = false)}
					disabled={saving}
				>
					Cancelar
				</Button>
				{#if currentStep > 1}
					<Button
						variant="outline"
						size="sm"
						onclick={() => goToStep(currentStep - 1)}
						disabled={saving}
					>
						← Atrás
					</Button>
				{:else}
					<span></span>
				{/if}
				{#if currentStep === totalSteps}
					<Button size="sm" onclick={handleSave} disabled={!canSaveWizard}>
						{saving ? 'Guardando…' : 'Guardar'}
					</Button>
				{:else if currentStep === 2}
					<Button size="sm" onclick={handleAdvanceFromPosiciones} disabled={!canAdvance}>
						Continuar
					</Button>
				{:else}
					<!-- Resto de pasos (incluido el 1): botón Continuar uniforme,
					     disabled si !canAdvance (paso 1 = sin compañero seleccionado). -->
					<Button size="sm" onclick={advance} disabled={!canAdvance}>Continuar</Button>
				{/if}
			</Dialog.Footer>
		{:else}
			<!-- Body scrollable; footer fuera. -->
			<div class="-mx-3 flex-1 overflow-y-auto px-3">
				<div class="space-y-4 py-2">
					<div class="space-y-1.5">
						<Label>Compañero</Label>
						<CompaneroCombobox
							{companeros}
							value={companeroId}
							onChange={(id) => (companeroId = id)}
							onCreate={handleCompaneroCreate}
						/>
					</div>

				<!-- T-3.it2.c: posiciones unificadas (modo editar). Mismo
				     patrón que el paso 2 del wizard: un buscador + tabs +
				     un único ChipPicker. -->
				<div class="space-y-4">
					<h3 class="text-sm font-semibold">Posiciones</h3>

					<Input
						type="search"
						bind:value={posicionQuery}
						placeholder="Buscar posición…"
						aria-label="Buscar posición"
					/>

					<div
						role="tablist"
						aria-label="Resultado a editar"
						class="inline-flex rounded-md border border-border bg-muted p-0.5"
					>
						<button
							type="button"
							role="tab"
							aria-selected={activePosicionTab === 'fue_bien'}
							class="rounded px-3 py-1.5 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none {activePosicionTab ===
							'fue_bien'
								? 'bg-background text-foreground shadow-sm'
								: 'text-muted-foreground hover:text-foreground'}"
							onclick={() => (activePosicionTab = 'fue_bien')}
						>
							Fue bien ({posicionesFueBien.length})
						</button>
						<button
							type="button"
							role="tab"
							aria-selected={activePosicionTab === 'fallo'}
							class="rounded px-3 py-1.5 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none {activePosicionTab ===
							'fallo'
								? 'bg-background text-foreground shadow-sm'
								: 'text-muted-foreground hover:text-foreground'}"
							onclick={() => (activePosicionTab = 'fallo')}
						>
							Fue mal ({posicionesFallaron.length})
						</button>
					</div>

					{#if posicionesAgrupadas.length === 0}
						<p class="text-sm text-muted-foreground italic">
							Aún no hay posiciones en el catálogo. Crea una abajo.
						</p>
					{/if}

					{#if activePosicionTab === 'fue_bien'}
						<ChipPicker
							mode="select"
							showSearch={false}
							groups={posicionesAgrupadasFiltradas.map((g) => ({
								key: g.categoria,
								label: CATEGORIA_LABEL[g.categoria],
								items: g.items.map((p) => ({ value: p.id, label: p.nombre }))
							}))}
							value={posicionesFueBien}
							onChange={handlePosicionesFueBienChange}
							onCreateNew={() => abrirCrearPosicion('fue_bien')}
							emptyText=""
							filteredEmptyText="No hay posiciones que coincidan."
							ariaLabel="Posiciones que fueron bien"
							accent="success"
						/>
					{:else}
						<ChipPicker
							mode="select"
							showSearch={false}
							groups={posicionesAgrupadasFiltradas.map((g) => ({
								key: g.categoria,
								label: CATEGORIA_LABEL[g.categoria],
								items: g.items.map((p) => ({ value: p.id, label: p.nombre }))
							}))}
							value={posicionesFallaron}
							onChange={handlePosicionesFallaronChange}
							onCreateNew={() => abrirCrearPosicion('fallo')}
							emptyText=""
							filteredEmptyText="No hay posiciones que coincidan."
							ariaLabel="Posiciones que fallé"
							accent="warning"
						/>
					{/if}
				</div>

				<!-- T-3.it2.c: técnicas unificadas (modo editar). Mismo
				     patrón que el paso 3 del wizard. El Input legacy de
				     "Posiciones donde tuve problema" se eliminó — la columna
				     BD se preserva intacta. -->
				<div class="space-y-4">
					<h3 class="text-sm font-semibold">Técnicas</h3>

					<Input
						type="search"
						bind:value={tecnicaQuery}
						placeholder="Buscar técnica…"
						aria-label="Buscar técnica"
					/>

					<div
						role="tablist"
						aria-label="Resultado a editar"
						class="inline-flex rounded-md border border-border bg-muted p-0.5"
					>
						<button
							type="button"
							role="tab"
							aria-selected={activeTecnicaTab === 'fue_bien'}
							class="rounded px-3 py-1.5 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none {activeTecnicaTab ===
							'fue_bien'
								? 'bg-background text-foreground shadow-sm'
								: 'text-muted-foreground hover:text-foreground'}"
							onclick={() => (activeTecnicaTab = 'fue_bien')}
						>
							Fue bien ({tecnicasFueBien.length})
						</button>
						<button
							type="button"
							role="tab"
							aria-selected={activeTecnicaTab === 'fallo'}
							class="rounded px-3 py-1.5 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none {activeTecnicaTab ===
							'fallo'
								? 'bg-background text-foreground shadow-sm'
								: 'text-muted-foreground hover:text-foreground'}"
							onclick={() => (activeTecnicaTab = 'fallo')}
						>
							Fue mal ({tecnicasFallaron.length})
						</button>
					</div>

					{#if tecnicasCatalog.length === 0}
						<p class="text-sm text-muted-foreground italic">
							Aún no hay técnicas en el catálogo. Crea una abajo.
						</p>
					{/if}

					{#if activeTecnicaTab === 'fue_bien'}
						<ChipPicker
							mode="select"
							showSearch={false}
							items={tecnicasFiltradas.map((t) => ({
								value: t.id,
								label: t.variante ? `${t.nombre} (${t.variante})` : t.nombre
							}))}
							value={tecnicasFueBien}
							onChange={handleTecnicasFueBienChange}
							onCreateNew={() => abrirCrearTecnica('fue_bien')}
							emptyText=""
							filteredEmptyText="No hay técnicas que coincidan."
							ariaLabel="Técnicas que fueron bien"
							accent="success"
						/>
					{:else}
						<ChipPicker
							mode="select"
							showSearch={false}
							items={tecnicasFiltradas.map((t) => ({
								value: t.id,
								label: t.variante ? `${t.nombre} (${t.variante})` : t.nombre
							}))}
							value={tecnicasFallaron}
							onChange={handleTecnicasFallaronChange}
							onCreateNew={() => abrirCrearTecnica('fallo')}
							emptyText=""
							filteredEmptyText="No hay técnicas que coincidan."
							ariaLabel="Técnicas que fallé"
							accent="warning"
						/>
					{/if}
				</div>

				<div class="space-y-1.5">
					<Label>Tamaño relativo</Label>
					<Chips
						options={PESOS}
						value={tamanoRelativo ?? null}
						onChange={(v) => (tamanoRelativo = (v ?? undefined) as PesoRelativo | undefined)}
						ariaLabel="Tamaño relativo"
					/>
				</div>

				<div class="space-y-1.5">
					<Label>Resultado *</Label>
					<Chips
						options={RESULTADOS}
						value={resultado ?? null}
						onChange={(v) => (resultado = (v ?? undefined) as ResultadoRoll | undefined)}
						ariaLabel="Resultado"
					/>
					{#if !resultado}
						<p class="text-xs text-muted-foreground italic">El resultado es obligatorio.</p>
					{/if}
				</div>

					{#if errorMsg}
						<p class="text-sm text-destructive">{errorMsg}</p>
					{/if}
				</div>
			</div>

			<Dialog.Footer>
				<!--
				  Patrón "esquinas opuestas": Cancelar izquierda, acción primaria
				  derecha. Si hay Borrar, va a la izquierda de Cancelar (acciones
				  secundarias agrupadas) — Dialog.Footer es justify-between y
				  reparte los hijos a los extremos.
				-->
				<div class="flex gap-2">
					{#if onDelete}
						<Button variant="destructive" size="sm" onclick={handleDelete} disabled={saving}>
							Borrar
						</Button>
					{/if}
					<Button
						variant="outline"
						size="sm"
						onclick={() => (open = false)}
						disabled={saving}
					>
						Cancelar
					</Button>
				</div>
				<Button size="sm" onclick={handleSave} disabled={!canSaveForm}>
					{saving ? 'Guardando…' : 'Guardar'}
				</Button>
			</Dialog.Footer>
		{/if}
	</Dialog.Content>
</Dialog.Root>

<!--
  T-12: Dialog wrapper para crear una posición desde dentro del wizard de
  roll. Independiente del `mapaModalStack` para no acoplar el RollEditor
  a la infraestructura del mapa.
-->
<PosicionWizardDialog bind:open={crearPosicionOpen} onSaved={handlePosicionCreada} />

<!--
  T-3.it2: Dialog wrapper para crear una técnica desde dentro del editor de
  roll. Independiente del `mapaModalStack` (modo `standalone` del wizard).
  La rama (`fue_bien` / `fallo`) se decide al pulsar "+ Crear nueva
  técnica" — la nueva técnica queda preseleccionada en esa rama.
-->
<TecnicaWizardDialog bind:open={crearTecnicaOpen} onSaved={handleTecnicaCreada} />
