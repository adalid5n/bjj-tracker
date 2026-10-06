<script lang="ts">
	import { onMount, untrack } from 'svelte';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Textarea } from '$lib/components/ui/textarea';
	import DateInput from '$lib/components/DateInput.svelte';
	import Chips from '$lib/components/Chips.svelte';
	import type { Disciplina, Sesion, TipoSesion } from '$lib/types';
	import { settings } from '$lib/settings.svelte';
	import { capitalizeFirst } from '$lib/utils';

	// T-4.it7: el tipo es Clase u Open mat; BJJ / Grappling pasan a ser la
	// disciplina (BJJ, Grappling o Ambos = clase mixta).
	const TIPOS: { value: TipoSesion; label: string }[] = [
		{ value: 'clase', label: 'Clase' },
		{ value: 'open_mat', label: 'Open mat' }
	];
	const DISCIPLINAS: { value: Disciplina; label: string }[] = [
		{ value: 'bjj', label: 'BJJ' },
		{ value: 'grappling', label: 'Grappling' },
		{ value: 'ambos', label: 'Ambos' }
	];

	type SubmitData = Omit<Sesion, 'id' | 'created_at' | 'updated_at'>;

	let {
		initial,
		submitLabel,
		onSubmit
	}: {
		initial?: Partial<Sesion>;
		submitLabel: string;
		onSubmit: (data: SubmitData) => void | Promise<void>;
	} = $props();

	const today = new Date().toISOString().slice(0, 10);
	const init = untrack(() => initial);

	let fecha = $state(init?.fecha ?? today);
	let tipo = $state<TipoSesion>(init?.tipo ?? 'clase');
	let disciplina = $state<Disciplina>(init?.disciplina ?? settings.disciplinaActiva);
	// `foco`, `tecnicaClase`, `obsProfesor` (T-3.it6): editables bajo
	// `settings.modoAvanzado`. En hobbyist no se renderizan los inputs pero
	// `*Original` se sigue cargando para preservar el dato existente al
	// guardar (mismo patrón que `notas` en PosicionWizard).
	let foco = $state(init?.foco ?? '');
	let tecnicaClase = $state(init?.tecnica_clase ?? '');
	let obsProfesor = $state(init?.obs_profesor ?? '');
	const focoOriginal = init?.foco;
	const tecnicaClaseOriginal = init?.tecnica_clase;
	const obsProfesorOriginal = init?.obs_profesor;
	let saving = $state(false);
	let errorMsg = $state('');

	onMount(() => {
		settings.init();
	});

	const canSave = $derived(fecha.length === 10 && !!tipo && !saving);

	async function handleSubmit(event: SubmitEvent) {
		event.preventDefault();
		if (!canSave) return;
		saving = true;
		errorMsg = '';
		try {
			// T-3.it6: en modo avanzado se envía el valor editado; en
			// hobbyist se reenvía el original para no pisar el dato existente.
			const focoFinal = settings.modoAvanzado
				? foco.trim() || undefined
				: focoOriginal;
			const tecnicaClaseFinal = settings.modoAvanzado
				? tecnicaClase.trim() || undefined
				: tecnicaClaseOriginal;
			const obsProfesorFinal = settings.modoAvanzado
				? obsProfesor.trim() || undefined
				: obsProfesorOriginal;
			await onSubmit({
				fecha,
				tipo,
				disciplina,
				foco: focoFinal,
				tecnica_clase: tecnicaClaseFinal,
				obs_profesor: obsProfesorFinal
			});
		} catch (err) {
			errorMsg = err instanceof Error ? err.message : String(err);
		} finally {
			saving = false;
		}
	}
</script>

<form onsubmit={handleSubmit} class="space-y-4">
	<div class="space-y-1.5">
		<Label for="fecha">Fecha *</Label>
		<DateInput id="fecha" bind:value={fecha} required />
	</div>

	<div class="space-y-1.5">
		<Label>Tipo *</Label>
		<Chips
			options={TIPOS}
			value={tipo}
			required
			onChange={(v) => (tipo = (v ?? tipo) as TipoSesion)}
			ariaLabel="Tipo de sesión"
		/>
	</div>

	<div class="space-y-1.5">
		<Label>Disciplina *</Label>
		<Chips
			options={DISCIPLINAS}
			value={disciplina}
			required
			onChange={(v) => (disciplina = (v ?? disciplina) as Disciplina)}
			ariaLabel="Disciplina de la sesión"
		/>
	</div>

	{#if settings.modoAvanzado}
		<!-- Foco / Técnica clase / Obs profesor (T-3.it6): solo modo avanzado. -->
		<div class="space-y-1.5">
			<Label for="foco">Foco</Label>
			<Input
				id="foco"
				bind:value={foco}
				placeholder="p. ej. guardia abierta…"
				oninput={(e) => (foco = capitalizeFirst(e.currentTarget.value))}
			/>
		</div>

		<div class="space-y-1.5">
			<Label for="tecnica-clase">Técnica de la clase</Label>
			<Textarea
				id="tecnica-clase"
				bind:value={tecnicaClase}
				placeholder="Qué se enseñó hoy…"
				rows={3}
			/>
		</div>

		<div class="space-y-1.5">
			<Label for="obs-profesor">Observaciones del profesor</Label>
			<Textarea
				id="obs-profesor"
				bind:value={obsProfesor}
				placeholder="Correcciones, consejos, feedback…"
				rows={3}
			/>
		</div>
	{/if}

	{#if errorMsg}
		<p class="text-sm text-destructive">{errorMsg}</p>
	{/if}

	<Button type="submit" disabled={!canSave} class="w-full">
		{saving ? 'Guardando…' : submitLabel}
	</Button>
</form>
