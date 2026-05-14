<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Textarea } from '$lib/components/ui/textarea';
	import Chips from '$lib/components/Chips.svelte';
	import MultiChips from '$lib/components/MultiChips.svelte';
	import CinturonChips from '$lib/components/CinturonChips.svelte';
	import CompaneroCombobox from '$lib/components/CompaneroCombobox.svelte';
	import PosicionWizardDialog from '$lib/components/PosicionWizardDialog.svelte';
	import { listCompaneros, createCompanero, updateCompanero } from '$lib/companeros';
	import { capitalizeFirst } from '$lib/utils';
	import type {
		CategoriaPosicion,
		Cinturon,
		Companero,
		PesoRelativo,
		Posicion,
		ResultadoRoll,
		Roll
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
		que_intente?: string;
		que_fallo?: string;
		posiciones_problema?: string;
		// T-12: ids del catálogo de posiciones marcadas como "donde tuve
		// problema". El callback `onSave` debe llamar a
		// `setPosicionesProblema(roll.id, posicion_problema_ids)` tras
		// createRoll/updateRoll para persistirlas en `roll_posicion_problema`.
		posicion_problema_ids: string[];
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
	// T-12 añade un paso "posiciones problema" entre compañero y tamaño,
	// por lo que el wizard pasa de 5 a 6 pasos.
	const totalSteps = 6;

	let companeros = $state<Companero[]>([]);
	let companeroId = $state<string | null>(null);
	let tamanoRelativo = $state<PesoRelativo | undefined>(undefined);
	let duracionStr = $state<string>('');
	let resultado = $state<ResultadoRoll | undefined>(undefined);
	let queIntente = $state<string>('');
	let queFallo = $state<string>('');
	let posicionesProblema = $state<string>('');

	// T-12: catálogo completo de posiciones (recargable) y selección actual.
	// `posicionesCatalog` lo cargamos al abrir el editor; `posicionProblemaIds`
	// arranca con `getPosicionesProblema(roll.id)` en modo editar.
	let posicionesCatalog = $state<Posicion[]>([]);
	let posicionProblemaIds = $state<string[]>([]);
	let crearPosicionOpen = $state(false);

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
			void loadPosicionesProblemaSeleccion();
			companeroId = roll?.companero_id ?? null;
			lastCompaneroId = roll?.companero_id ?? null;
			tamanoRelativo = roll?.tamano_relativo;
			duracionStr = roll?.duracion_min?.toString() ?? '';
			resultado = roll?.resultado;
			queIntente = roll?.que_intente ?? '';
			queFallo = roll?.que_fallo ?? '';
			posicionesProblema = roll?.posiciones_problema ?? '';
			currentStep = 1;
			visitedSteps = new Set([1]);
			showExtraData = false;
			extraDataCompaneroId = null;
			extraCinturon = null;
			extraPeso = null;
			extraNotas = '';
			errorMsg = '';
			crearPosicionOpen = false;
			pendingSkipTamano = false;
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

	async function loadPosicionesProblemaSeleccion() {
		// En modo editar precargamos la selección actual; en crear arranca vacía.
		if (!roll) {
			posicionProblemaIds = [];
			return;
		}
		try {
			const { getPosicionesProblema } = await import('$lib/rolls');
			const pos = await getPosicionesProblema(roll.id);
			posicionProblemaIds = pos.map((p) => p.id);
		} catch (err) {
			posicionProblemaIds = [];
			console.warn('[RollEditor] getPosicionesProblema falló:', err);
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

	function handlePosicionesChange(ids: string[]) {
		posicionProblemaIds = ids;
	}

	function abrirCrearPosicion() {
		crearPosicionOpen = true;
	}

	async function handlePosicionCreada(p: Posicion) {
		// Tras crear: añadir a la selección y recargar el catálogo para
		// que el nuevo chip aparezca en el grupo correcto.
		posicionesCatalog = [...posicionesCatalog, p];
		if (!posicionProblemaIds.includes(p.id)) {
			posicionProblemaIds = [...posicionProblemaIds, p.id];
		}
		// Recarga "real" desde BD (defensivo: cubre el caso de campos
		// derivados que no traemos aquí, p. ej. orden alfabético tras un
		// rename, etc.).
		await loadPosiciones();
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

	function handleDuracionKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter') {
			e.preventDefault();
			advance();
		}
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
			intercept();
			advance();
			return;
		}
		if (currentStep === 4) {
			intercept();
			advance();
			return;
		}
		if (currentStep === 5) {
			if (resultado) {
				intercept();
				advance();
			}
			return;
		}
		if (currentStep === totalSteps) {
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
			const dur = duracionStr.trim();
			await onSave({
				id: roll?.id ?? crypto.randomUUID(),
				sesion_id: sesionId,
				companero_id: companeroId ?? undefined,
				tamano_relativo: tamanoRelativo,
				duracion_min: dur === '' ? undefined : Number(dur),
				resultado,
				que_intente: queIntente.trim() || undefined,
				que_fallo: queFallo.trim() || undefined,
				posiciones_problema: posicionesProblema.trim() || undefined,
				posicion_problema_ids: posicionProblemaIds
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
			// Clicks dentro del combobox-portal (compañero) o del Dialog
			// hijo de crear-posición no deben cerrar el RollEditor.
			if (target?.closest('[data-combobox-portal]')) {
				e.preventDefault();
				return;
			}
			if (crearPosicionOpen) {
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
					<!-- T-12: paso nuevo. Skippable (no autoavanza). -->
					<div class="space-y-3">
						<h3 class="text-sm font-semibold">Posiciones donde tuve problema</h3>
						{#if posicionesAgrupadas.length === 0}
							<p class="text-sm text-muted-foreground italic">
								Aún no hay posiciones en el catálogo. Crea una abajo o continúa para saltar este
								paso.
							</p>
						{:else}
							<div class="space-y-3">
								{#each posicionesAgrupadas as grupo (grupo.categoria)}
									<div class="space-y-1.5">
										<p class="text-xs font-semibold text-muted-foreground">
											{CATEGORIA_LABEL[grupo.categoria]}
										</p>
										<MultiChips
											options={grupo.items.map((p) => ({ value: p.id, label: p.nombre }))}
											value={posicionProblemaIds}
											onChange={handlePosicionesChange}
											ariaLabel={`Posiciones de ${CATEGORIA_LABEL[grupo.categoria]}`}
										/>
									</div>
								{/each}
							</div>
						{/if}
						<div>
							<Button variant="outline" size="sm" onclick={abrirCrearPosicion}>
								+ Crear nueva posición
							</Button>
						</div>
						<p class="text-xs text-muted-foreground">
							Selecciona las que apliquen. Puedes saltar este paso si no aplica.
						</p>
					</div>
				{/if}

				{#if currentStep === 3}
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

				{#if currentStep === 4}
					<div class="space-y-3">
						<h3 class="text-sm font-semibold">Duración (min)</h3>
						<Input
							inputmode="numeric"
							bind:value={duracionStr}
							placeholder="p. ej. 5"
							onkeydown={handleDuracionKeydown}
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

				{#if currentStep === 6}
					<div class="space-y-3">
						<h3 class="text-sm font-semibold">Notas (opcional)</h3>
						<div class="space-y-1.5">
							<Label for="intente">Qué intenté</Label>
							<Textarea
								id="intente"
								bind:value={queIntente}
								rows={2}
								oninput={(e) => {
									queIntente = capitalizeFirst(e.currentTarget.value);
								}}
							/>
						</div>
						<div class="space-y-1.5">
							<Label for="fallo">Qué falló</Label>
							<Textarea
								id="fallo"
								bind:value={queFallo}
								rows={2}
								oninput={(e) => {
									queFallo = capitalizeFirst(e.currentTarget.value);
								}}
							/>
						</div>
						<div class="space-y-1.5">
							<Label for="posiciones">Posiciones donde tuve problema (texto libre)</Label>
							<Input
								id="posiciones"
								bind:value={posicionesProblema}
								placeholder="p. ej. mount bottom, side control top"
							/>
						</div>
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

				<!-- T-12: selección de posiciones de problema (modo editar). -->
				<div class="space-y-1.5">
					<Label>Posiciones donde tuve problema</Label>
					{#if posicionesAgrupadas.length === 0}
						<p class="text-sm text-muted-foreground italic">
							Aún no hay posiciones en el catálogo.
						</p>
					{:else}
						<div class="space-y-3">
							{#each posicionesAgrupadas as grupo (grupo.categoria)}
								<div class="space-y-1.5">
									<p class="text-xs font-semibold text-muted-foreground">
										{CATEGORIA_LABEL[grupo.categoria]}
									</p>
									<MultiChips
										options={grupo.items.map((p) => ({ value: p.id, label: p.nombre }))}
										value={posicionProblemaIds}
										onChange={handlePosicionesChange}
										ariaLabel={`Posiciones de ${CATEGORIA_LABEL[grupo.categoria]}`}
									/>
								</div>
							{/each}
						</div>
					{/if}
					<div>
						<Button variant="outline" size="sm" onclick={abrirCrearPosicion}>
							+ Crear nueva posición
						</Button>
					</div>
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
					<Label for="duracion-form">Duración (min)</Label>
					<Input
						id="duracion-form"
						inputmode="numeric"
						bind:value={duracionStr}
						placeholder="p. ej. 5"
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

				<div class="space-y-1.5">
					<Label for="intente-form">Qué intenté</Label>
					<Textarea
						id="intente-form"
						bind:value={queIntente}
						rows={2}
						oninput={(e) => {
							queIntente = capitalizeFirst(e.currentTarget.value);
						}}
					/>
				</div>

				<div class="space-y-1.5">
					<Label for="fallo-form">Qué falló</Label>
					<Textarea
						id="fallo-form"
						bind:value={queFallo}
						rows={2}
						oninput={(e) => {
							queFallo = capitalizeFirst(e.currentTarget.value);
						}}
					/>
				</div>

				<div class="space-y-1.5">
					<Label for="posiciones-form">Posiciones donde tuve problema</Label>
					<Input
						id="posiciones-form"
						bind:value={posicionesProblema}
						placeholder="p. ej. mount bottom, side control top"
					/>
				</div>

					{#if errorMsg}
						<p class="text-sm text-destructive">{errorMsg}</p>
					{/if}
				</div>
			</div>

			<Dialog.Footer>
				{#if onDelete}
					<Button variant="destructive" size="sm" onclick={handleDelete} disabled={saving}>
						Borrar
					</Button>
				{:else}
					<span></span>
				{/if}
				<Button
					variant="outline"
					size="sm"
					onclick={() => (open = false)}
					disabled={saving}
				>
					Cancelar
				</Button>
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
