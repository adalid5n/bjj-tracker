<script lang="ts">
	import * as Dialog from '$lib/components/ui/dialog';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Textarea } from '$lib/components/ui/textarea';
	import Chips from '$lib/components/Chips.svelte';
	import CinturonChips from '$lib/components/CinturonChips.svelte';
	import CompaneroCombobox from '$lib/components/CompaneroCombobox.svelte';
	import { listCompaneros, createCompanero, updateCompanero } from '$lib/companeros';
	import type { Cinturon, Companero, PesoRelativo, ResultadoRoll, Roll } from '$lib/types';

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
	};

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
	const totalSteps = 5;

	let companeros = $state<Companero[]>([]);
	let companeroId = $state<string | null>(null);
	let tamanoRelativo = $state<PesoRelativo | undefined>(undefined);
	let duracionStr = $state<string>('');
	let resultado = $state<ResultadoRoll | undefined>(undefined);
	let queIntente = $state<string>('');
	let queFallo = $state<string>('');
	let posicionesProblema = $state<string>('');

	let currentStep = $state(1);
	let visitedSteps = $state<Set<number>>(new Set([1]));

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
		}
	});

	$effect(() => {
		if (!open || mode === 'form') return;
		if (companeroId === lastCompaneroId) return;
		lastCompaneroId = companeroId;
		const c = companeros.find((c) => c.id === companeroId);
		if (c?.peso_relativo && !tamanoRelativo) {
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
		if (skipTamano) advance();
	}

	function handleTamanoChange(v: string | null) {
		tamanoRelativo = (v ?? undefined) as PesoRelativo | undefined;
		if (v && mode === 'wizard') advance();
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
		currentStep === 1 ? !!companeroId : currentStep === 4 ? !!resultado : true
	);
	const canSaveWizard = $derived(!!companeroId && !!resultado && !saving);
	const canSaveForm = $derived(!!resultado && !saving);

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
				posiciones_problema: posicionesProblema.trim() || undefined
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
		class="max-h-[90vh] overflow-y-auto sm:max-w-md"
		onOpenAutoFocus={(e) => e.preventDefault()}
		onInteractOutside={(e) => {
			const target = e.target as HTMLElement | null;
			if (target?.closest('[data-combobox-portal]')) {
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
									<Textarea id="extra-notas" bind:value={extraNotas} rows={2} />
								</div>
								<Button class="w-full" onclick={handleExtraDataContinue} disabled={saving}>
									Continuar
								</Button>
							</div>
						{/if}
					</div>
				{/if}

				{#if currentStep === 2}
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

				{#if currentStep === 3}
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

				{#if currentStep === 4}
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

				{#if currentStep === 5}
					<div class="space-y-3">
						<h3 class="text-sm font-semibold">Notas (opcional)</h3>
						<div class="space-y-1.5">
							<Label for="intente">Qué intenté</Label>
							<Textarea id="intente" bind:value={queIntente} rows={2} />
						</div>
						<div class="space-y-1.5">
							<Label for="fallo">Qué falló</Label>
							<Textarea id="fallo" bind:value={queFallo} rows={2} />
						</div>
						<div class="space-y-1.5">
							<Label for="posiciones">Posiciones donde tuve problema</Label>
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
				{#if currentStep === 5}
					<Button size="sm" onclick={handleSave} disabled={!canSaveWizard}>
						{saving ? 'Guardando…' : 'Guardar'}
					</Button>
				{:else if currentStep > 1}
					<Button size="sm" onclick={advance} disabled={!canAdvance}>Continuar</Button>
				{:else}
					<span></span>
				{/if}
			</Dialog.Footer>
		{:else}
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
					<Textarea id="intente-form" bind:value={queIntente} rows={2} />
				</div>

				<div class="space-y-1.5">
					<Label for="fallo-form">Qué falló</Label>
					<Textarea id="fallo-form" bind:value={queFallo} rows={2} />
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
