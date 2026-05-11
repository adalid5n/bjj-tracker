<script lang="ts">
	import * as Dialog from '$lib/components/ui/dialog';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Textarea } from '$lib/components/ui/textarea';
	import Chips from '$lib/components/Chips.svelte';
	import CinturonChips from '$lib/components/CinturonChips.svelte';
	import type { Cinturon, Companero, PesoRelativo } from '$lib/types';

	const PESOS: { value: PesoRelativo; label: string }[] = [
		{ value: 'mucho_menos', label: 'Mucho menor' },
		{ value: 'menos', label: 'Menor' },
		{ value: 'similar', label: 'Similar' },
		{ value: 'mas', label: 'Mayor' },
		{ value: 'mucho_mas', label: 'Mucho mayor' }
	];

	type SaveData = {
		id: string;
		nombre: string;
		cinturon?: Cinturon;
		peso_relativo?: PesoRelativo;
		notas?: string;
	};

	let {
		open = $bindable(false),
		companero,
		onSave
	}: {
		open?: boolean;
		companero?: Companero;
		onSave: (data: SaveData) => void | Promise<void>;
	} = $props();

	const mode = $derived<'wizard' | 'form'>(companero ? 'form' : 'wizard');
	const totalSteps = 4;

	let nombre = $state('');
	let cinturon = $state<Cinturon | undefined>(undefined);
	let pesoRelativo = $state<PesoRelativo | undefined>(undefined);
	let notas = $state('');

	let currentStep = $state(1);
	let visitedSteps = $state<Set<number>>(new Set([1]));

	let saving = $state(false);
	let errorMsg = $state('');

	$effect(() => {
		if (open) {
			nombre = companero?.nombre ?? '';
			cinturon = companero?.cinturon;
			pesoRelativo = companero?.peso_relativo;
			notas = companero?.notas ?? '';
			currentStep = 1;
			visitedSteps = new Set([1]);
			errorMsg = '';
		}
	});

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

	function handleNombreKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter' && nombre.trim().length > 0) {
			e.preventDefault();
			advance();
		}
	}

	function handleCinturonChange(v: Cinturon) {
		cinturon = v;
		if (mode === 'wizard') advance();
	}

	function handlePesoChange(v: string | null) {
		pesoRelativo = (v ?? undefined) as PesoRelativo | undefined;
		if (v && mode === 'wizard') advance();
	}

	const canAdvance = $derived(currentStep === 1 ? nombre.trim().length > 0 : true);
	const canSave = $derived(nombre.trim().length > 0 && !saving);

	async function handleSave() {
		if (!canSave) return;
		saving = true;
		errorMsg = '';
		try {
			await onSave({
				id: companero?.id ?? crypto.randomUUID(),
				nombre: nombre.trim(),
				cinturon,
				peso_relativo: pesoRelativo,
				notas: notas.trim() || undefined
			});
			open = false;
		} catch (err) {
			errorMsg = err instanceof Error ? err.message : String(err);
		} finally {
			saving = false;
		}
	}
</script>

<Dialog.Root bind:open>
	<Dialog.Content
		class="max-h-[90vh] overflow-y-auto sm:max-w-md"
		onOpenAutoFocus={(e) => e.preventDefault()}
	>
		<Dialog.Header>
			<Dialog.Title>{companero ? 'Editar compañero' : 'Nuevo compañero'}</Dialog.Title>
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
								? 'cursor-pointer bg-primary/40 hover:bg-primary/60'
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
						<h3 class="text-sm font-semibold">Nombre *</h3>
						<Input
							id="nombre"
							bind:value={nombre}
							placeholder="Pepito"
							autofocus
							onkeydown={handleNombreKeydown}
						/>
					</div>
				{/if}

				{#if currentStep === 2}
					<div class="space-y-3">
						<h3 class="text-sm font-semibold">Cinturón</h3>
						<CinturonChips
							value={cinturon ?? null}
							onChange={handleCinturonChange}
							ariaLabel="Cinturón"
						/>
					</div>
				{/if}

				{#if currentStep === 3}
					<div class="space-y-3">
						<h3 class="text-sm font-semibold">Peso relativo</h3>
						<Chips
							options={PESOS}
							value={pesoRelativo ?? null}
							onChange={handlePesoChange}
							ariaLabel="Peso relativo"
						/>
					</div>
				{/if}

				{#if currentStep === 4}
					<div class="space-y-3">
						<h3 class="text-sm font-semibold">Notas (opcional)</h3>
						<Textarea id="notas" bind:value={notas} rows={3} />
					</div>
				{/if}
			</div>

			{#if errorMsg}
				<p class="text-sm text-destructive">{errorMsg}</p>
			{/if}

			<Dialog.Footer>
				<Button variant="outline" size="sm" onclick={() => (open = false)} disabled={saving}>
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
					<Button size="sm" onclick={handleSave} disabled={!canSave}>
						{saving ? 'Guardando…' : 'Guardar'}
					</Button>
				{:else}
					<Button size="sm" onclick={advance} disabled={!canAdvance}>Continuar</Button>
				{/if}
			</Dialog.Footer>
		{:else}
			<div class="space-y-4 py-2">
				<div class="space-y-1.5">
					<Label for="nombre-form">Nombre *</Label>
					<Input id="nombre-form" bind:value={nombre} placeholder="Pepito" />
				</div>

				<div class="space-y-1.5">
					<Label>Cinturón</Label>
					<CinturonChips
						value={cinturon ?? null}
						onChange={(v) => (cinturon = v)}
						ariaLabel="Cinturón"
					/>
				</div>

				<div class="space-y-1.5">
					<Label>Peso relativo</Label>
					<Chips
						options={PESOS}
						value={pesoRelativo ?? null}
						onChange={(v) => (pesoRelativo = (v ?? undefined) as PesoRelativo | undefined)}
						ariaLabel="Peso relativo"
					/>
				</div>

				<div class="space-y-1.5">
					<Label for="notas-form">Notas</Label>
					<Textarea id="notas-form" bind:value={notas} rows={3} />
				</div>

				{#if errorMsg}
					<p class="text-sm text-destructive">{errorMsg}</p>
				{/if}
			</div>

			<Dialog.Footer>
				<span></span>
				<Button variant="outline" size="sm" onclick={() => (open = false)} disabled={saving}>
					Cancelar
				</Button>
				<Button size="sm" onclick={handleSave} disabled={!canSave}>
					{saving ? 'Guardando…' : 'Guardar'}
				</Button>
			</Dialog.Footer>
		{/if}
	</Dialog.Content>
</Dialog.Root>
