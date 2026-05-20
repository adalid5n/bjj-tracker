<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Textarea } from '$lib/components/ui/textarea';
	import Chips from '$lib/components/Chips.svelte';
	import DateInput from '$lib/components/DateInput.svelte';
	import type { TipoSesion } from '$lib/types';
	import { settings } from '$lib/settings.svelte';
	import { capitalizeFirst } from '$lib/utils';

	const TIPOS: { value: TipoSesion; label: string }[] = [
		{ value: 'bjj', label: 'BJJ' },
		{ value: 'grappling', label: 'Grappling' },
		{ value: 'open_mat', label: 'Open mat' }
	];

	// `foco`, `tecnica_clase`, `obs_profesor` siguen en BD por la migración
	// inmutable. En T-3.it6 vuelven a estar editables bajo `settings.modoAvanzado`
	// (pasos opcionales del wizard). En hobbyist no se renderizan y se envían
	// como `undefined` → null en BD; en edición se preservan via SesionForm.
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

	// Pasos semánticos: 1=Fecha, 2=Tipo, 3=Foco, 4=Técnica clase, 5=Obs profesor.
	// Los pasos 3-5 solo aparecen en modo avanzado (T-3.it6). En hobbyist
	// el wizard tiene 2 pasos; en avanzado pasa a 5.
	const visibleSteps = $derived<number[]>(
		settings.modoAvanzado ? [1, 2, 3, 4, 5] : [1, 2]
	);
	const totalSteps = $derived(visibleSteps.length);
	const today = new Date().toISOString().slice(0, 10);

	let fecha = $state(today);
	let tipo = $state<TipoSesion | null>(null);
	// `foco`, `tecnicaClase`, `obsProfesor` (T-3.it6): editables bajo
	// `settings.modoAvanzado`. En creación (este componente) no hay
	// `*Original` que preservar — son siempre nuevos.
	let foco = $state('');
	let tecnicaClase = $state('');
	let obsProfesor = $state('');

	let currentStep = $state(1);
	let visitedSteps = $state<Set<number>>(new Set([1]));

	let saving = $state(false);
	let errorMsg = $state('');

	$effect(() => {
		if (open) {
			fecha = defaultFecha ?? today;
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
		if (!visibleSteps.includes(step)) return;
		if (step > currentStep && !visitedSteps.has(step)) return;
		currentStep = step;
	}

	function advance() {
		const idx = visibleSteps.indexOf(currentStep);
		if (idx >= 0 && idx < visibleSteps.length - 1) {
			currentStep = visibleSteps[idx + 1];
			visitedSteps = new Set([...visitedSteps, currentStep]);
		}
	}

	function handleTipoChange(v: string | null) {
		tipo = (v ?? null) as TipoSesion | null;
		// Tipo es ahora el último paso (totalSteps=2). No avanzamos al
		// elegir; el usuario pulsa Guardar (o Enter) para confirmar.
	}

	const canAdvance = $derived(
		currentStep === 1 ? fecha.length === 10 : currentStep === 2 ? !!tipo : true
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
		settings.init();
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
			// T-3.it6: foco/tecnica_clase/obs_profesor editables solo en
			// modo avanzado. En hobbyist se envían undefined → null en BD.
			const focoFinal = settings.modoAvanzado && foco.trim() ? foco.trim() : undefined;
			const tecnicaClaseFinal =
				settings.modoAvanzado && tecnicaClase.trim() ? tecnicaClase.trim() : undefined;
			const obsProfesorFinal =
				settings.modoAvanzado && obsProfesor.trim() ? obsProfesor.trim() : undefined;
			await onSave({
				fecha,
				tipo,
				foco: focoFinal,
				tecnica_clase: tecnicaClaseFinal,
				obs_profesor: obsProfesorFinal
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
		class="flex max-h-[90vh] flex-col sm:max-w-md"
		onOpenAutoFocus={(e) => e.preventDefault()}
	>
		<Dialog.Header>
			<Dialog.Title>Nueva sesión</Dialog.Title>
		</Dialog.Header>

		<div class="flex items-center gap-1 pt-2">
			{#each visibleSteps as step, i (step)}
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
			Paso {visibleSteps.indexOf(currentStep) + 1} de {totalSteps}
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

				{#if settings.modoAvanzado}
					{#if currentStep === 3}
						<!-- Paso 3: Foco (solo modo avanzado, T-3.it6). -->
						<div class="space-y-3">
							<h3 class="text-sm font-semibold">Foco (opcional)</h3>
							<Input
								bind:value={foco}
								placeholder="p. ej. guardia abierta, paso de guardia…"
								oninput={(e) => (foco = capitalizeFirst(e.currentTarget.value))}
							/>
							<p class="text-xs text-muted-foreground">
								En qué quieres centrarte en esta sesión.
							</p>
						</div>
					{/if}

					{#if currentStep === 4}
						<!-- Paso 4: Técnica de la clase (solo modo avanzado, T-3.it6). -->
						<div class="space-y-3">
							<h3 class="text-sm font-semibold">Técnica de la clase (opcional)</h3>
							<Textarea
								bind:value={tecnicaClase}
								placeholder="Qué se enseñó hoy…"
								rows={3}
							/>
						</div>
					{/if}

					{#if currentStep === 5}
						<!-- Paso 5: Observaciones del profesor (solo modo avanzado, T-3.it6). -->
						<div class="space-y-3">
							<h3 class="text-sm font-semibold">Observaciones del profesor (opcional)</h3>
							<Textarea
								bind:value={obsProfesor}
								placeholder="Correcciones, consejos, feedback…"
								rows={3}
							/>
						</div>
					{/if}
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
