<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Button } from '$lib/components/ui/button';
	import { Label } from '$lib/components/ui/label';
	import Chips from '$lib/components/Chips.svelte';
	import DateInput from '$lib/components/DateInput.svelte';
	import type { TipoSesion } from '$lib/types';

	const TIPOS: { value: TipoSesion; label: string }[] = [
		{ value: 'bjj', label: 'BJJ' },
		{ value: 'grappling', label: 'Grappling' },
		{ value: 'open_mat', label: 'Open mat' }
	];

	// `foco`, `tecnica_clase`, `obs_profesor` siguen en BD por la migración
	// inmutable, pero la UI ya no los expone. En creación se envían como
	// `undefined` → null en BD; en edición se preservan via SesionForm.
	type SaveData = {
		fecha: string;
		tipo: TipoSesion;
		foco?: string;
		tecnica_clase?: string;
		obs_profesor?: string;
	};

	let {
		open = $bindable(false),
		onSave,
		defaultFecha
	}: {
		open?: boolean;
		onSave: (data: SaveData) => void | Promise<void>;
		defaultFecha?: string;
	} = $props();

	const totalSteps = 2;
	const today = new Date().toISOString().slice(0, 10);

	let fecha = $state(today);
	let tipo = $state<TipoSesion | null>(null);

	let currentStep = $state(1);
	let visitedSteps = $state<Set<number>>(new Set([1]));

	let saving = $state(false);
	let errorMsg = $state('');

	$effect(() => {
		if (open) {
			fecha = defaultFecha ?? today;
			tipo = null;
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
		// Tipo es ahora el último paso (totalSteps=2). No avanzamos al
		// elegir; el usuario pulsa Guardar (o Enter) para confirmar.
	}

	const canAdvance = $derived(
		currentStep === 1 ? fecha.length === 10 : !!tipo
	);
	const canSave = $derived(fecha.length === 10 && !!tipo && !saving);

	/**
	 * Enter en el wizard: dispara la acción primaria del paso actual.
	 * Listener global para cubrir "foco perdido". Respeta textareas.
	 */
	function handleWizardKeydown(e: KeyboardEvent) {
		if (e.key !== 'Enter') return;
		const target = e.target as HTMLElement | null;
		if (target?.tagName === 'TEXTAREA') return;
		// Si el foco está en un chip (button dentro de un radiogroup),
		// Enter activa la selección/toggle del chip — semántica propia, no
		// la pisamos. Para cualquier OTRO target (body, botón del indicador
		// de progreso, botón del footer, input sin handler propio…) sí
		// interceptamos para evitar que Enter active el elemento enfocado
		// (típicamente: el botón 'Paso 1' del indicador, que dispararía
		// goToStep(1)).
		if (target?.closest('[role="radiogroup"]')) return;
		// Intercept inmediato: incluso si NO podemos avanzar (paso obligatorio
		// vacío), bloqueamos el evento para que no active el botón enfocado.
		e.preventDefault();
		e.stopImmediatePropagation();
		const intercept = () => {
			e.preventDefault();
			e.stopImmediatePropagation();
		};
		if (currentStep === totalSteps) {
			if (canSave) {
				intercept();
				handleSave();
			}
			return;
		}
		if (canAdvance) {
			intercept();
			advance();
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
		if (!canSave || !tipo) return;
		saving = true;
		errorMsg = '';
		try {
			// `foco`, `tecnica_clase`, `obs_profesor` se omiten — la UI ya
			// no los edita. En creación quedan undefined → null en BD.
			await onSave({ fecha, tipo });
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
		class="flex max-h-[90vh] flex-col sm:max-w-md"
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

		<!--
		  Body scrollable. El footer queda fuera para que siempre se vea,
		  incluso si el contenido del paso (p. ej. textareas de notas) desborda.
		-->
		<div class="-mx-3 flex-1 overflow-y-auto px-3" onkeydowncapture={handleWizardKeydown} role="presentation">
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

			</div>

			{#if errorMsg}
				<p class="text-sm text-destructive">{errorMsg}</p>
			{/if}
		</div>

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
