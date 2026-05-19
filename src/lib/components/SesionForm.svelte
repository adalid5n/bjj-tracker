<script lang="ts">
	import { untrack } from 'svelte';
	import * as Select from '$lib/components/ui/select';
	import { Button } from '$lib/components/ui/button';
	import { Label } from '$lib/components/ui/label';
	import DateInput from '$lib/components/DateInput.svelte';
	import type { Sesion, TipoSesion } from '$lib/types';

	const TIPOS: { value: TipoSesion; label: string }[] = [
		{ value: 'bjj', label: 'BJJ' },
		{ value: 'grappling', label: 'Grappling' },
		{ value: 'open_mat', label: 'Open mat' }
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
	let tipo = $state<TipoSesion>(init?.tipo ?? 'bjj');
	// `foco`, `tecnica_clase`, `obs_profesor` ya no se editan desde la UI.
	// Las columnas siguen en BD por la migración inmutable. Guardamos los
	// valores originales del `initial` para reenviarlos intactos en el
	// submit (no queremos pisarlos con undefined al editar).
	const focoOriginal = init?.foco;
	const tecnicaClaseOriginal = init?.tecnica_clase;
	const obsProfesorOriginal = init?.obs_profesor;
	let saving = $state(false);
	let errorMsg = $state('');

	const canSave = $derived(fecha.length === 10 && !!tipo && !saving);

	async function handleSubmit(event: SubmitEvent) {
		event.preventDefault();
		if (!canSave) return;
		saving = true;
		errorMsg = '';
		try {
			await onSubmit({
				fecha,
				tipo,
				foco: focoOriginal,
				tecnica_clase: tecnicaClaseOriginal,
				obs_profesor: obsProfesorOriginal
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
		<Label for="tipo">Tipo *</Label>
		<Select.Root type="single" bind:value={tipo as string}>
			<Select.Trigger id="tipo" class="w-full">
				{TIPOS.find((t) => t.value === tipo)?.label ?? 'Selecciona…'}
			</Select.Trigger>
			<Select.Content>
				{#each TIPOS as t (t.value)}
					<Select.Item value={t.value}>{t.label}</Select.Item>
				{/each}
			</Select.Content>
		</Select.Root>
	</div>

	{#if errorMsg}
		<p class="text-sm text-destructive">{errorMsg}</p>
	{/if}

	<Button type="submit" disabled={!canSave} class="w-full">
		{saving ? 'Guardando…' : submitLabel}
	</Button>
</form>
