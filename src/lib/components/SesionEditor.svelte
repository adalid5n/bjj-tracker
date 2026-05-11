<script lang="ts">
	import * as Dialog from '$lib/components/ui/dialog';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Textarea } from '$lib/components/ui/textarea';
	import Chips from '$lib/components/Chips.svelte';
	import DateInput from '$lib/components/DateInput.svelte';
	import type { TipoSesion } from '$lib/types';

	const TIPOS: { value: TipoSesion; label: string }[] = [
		{ value: 'bjj', label: 'BJJ' },
		{ value: 'grappling', label: 'Grappling' },
		{ value: 'open_mat', label: 'Open mat' }
	];

	type SaveData = {
		fecha: string;
		tipo: TipoSesion;
		foco?: string;
		tecnica_clase?: string;
		obs_profesor?: string;
	};

	let {
		open = $bindable(false),
		onSave
	}: {
		open?: boolean;
		onSave: (data: SaveData) => void | Promise<void>;
	} = $props();

	const totalSteps = 5;
	const today = new Date().toISOString().slice(0, 10);

	let fecha = $state(today);
	let tipo = $state<TipoSesion | null>(null);
	let foco = $state('');
	let tecnicaClase = $state('');
	let obsProfesor = $state('');

	let currentStep = $state(1);
	let visitedSteps = $state<Set<number>>(new Set([1]));

	let saving = $state(false);
	let errorMsg = $state('');

	$effect(() => {
		if (open) {
			fecha = today;
			tipo = null;
			foco = '';
			tecnicaClase = '';
			obsProfesor = '';
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

	function handleTipoChange(v: string | null) {
		tipo = (v ?? null) as TipoSesion | null;
		if (v) advance();
	}

	function handleFocoKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter') {
			e.preventDefault();
			advance();
		}
	}

	const canAdvance = $derived(
		currentStep === 1 ? fecha.length === 10 : currentStep === 2 ? !!tipo : true
	);
	const canSave = $derived(fecha.length === 10 && !!tipo && !saving);

	async function handleSave() {
		if (!canSave || !tipo) return;
		saving = true;
		errorMsg = '';
		try {
			await onSave({
				fecha,
				tipo,
				foco: foco.trim() || undefined,
				tecnica_clase: tecnicaClase.trim() || undefined,
				obs_profesor: obsProfesor.trim() || undefined
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
			<Dialog.Title>Nueva sesión</Dialog.Title>
		</Dialog.Header>

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
					<h3 class="text-sm font-semibold">Fecha *</h3>
					<Label for="fecha" class="sr-only">Fecha</Label>
					<DateInput id="fecha" bind:value={fecha} required />
				</div>
			{/if}

			{#if currentStep === 2}
				<div class="space-y-3">
					<h3 class="text-sm font-semibold">Tipo *</h3>
					<Chips
						options={TIPOS}
						value={tipo}
						onChange={handleTipoChange}
						ariaLabel="Tipo de sesión"
					/>
				</div>
			{/if}

			{#if currentStep === 3}
				<div class="space-y-3">
					<h3 class="text-sm font-semibold">Foco que traía</h3>
					<Label for="foco" class="sr-only">Foco</Label>
					<Input
						id="foco"
						bind:value={foco}
						placeholder="p. ej. trabajar paso de guardia"
						onkeydown={handleFocoKeydown}
					/>
				</div>
			{/if}

			{#if currentStep === 4}
				<div class="space-y-3">
					<h3 class="text-sm font-semibold">Técnica enseñada en clase</h3>
					<Label for="tecnica" class="sr-only">Técnica</Label>
					<Textarea id="tecnica" bind:value={tecnicaClase} rows={3} />
				</div>
			{/if}

			{#if currentStep === 5}
				<div class="space-y-3">
					<h3 class="text-sm font-semibold">Observaciones del profesor</h3>
					<Label for="obs" class="sr-only">Observaciones</Label>
					<Textarea id="obs" bind:value={obsProfesor} rows={3} />
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
	</Dialog.Content>
</Dialog.Root>
