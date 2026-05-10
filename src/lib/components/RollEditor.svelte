<script lang="ts">
	import { untrack } from 'svelte';
	import * as Dialog from '$lib/components/ui/dialog';
	import * as Select from '$lib/components/ui/select';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Textarea } from '$lib/components/ui/textarea';
	import CompaneroEditor from '$lib/components/CompaneroEditor.svelte';
	import { listCompaneros, createCompanero } from '$lib/companeros';
	import type { Companero, PesoRelativo, ResultadoRoll, Roll } from '$lib/types';

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

	const init = untrack(() => roll);

	let companeros = $state<Companero[]>([]);
	let companeroId = $state<string | undefined>(init?.companero_id);
	let tamanoRelativo = $state<PesoRelativo | undefined>(init?.tamano_relativo);
	let duracionStr = $state<string>(init?.duracion_min?.toString() ?? '');
	let resultado = $state<ResultadoRoll | undefined>(init?.resultado);
	let queIntente = $state<string>(init?.que_intente ?? '');
	let queFallo = $state<string>(init?.que_fallo ?? '');
	let posicionesProblema = $state<string>(init?.posiciones_problema ?? '');

	let saving = $state(false);
	let errorMsg = $state('');
	let companeroEditorOpen = $state(false);

	let prevCompaneroId: string | undefined = undefined;

	$effect(() => {
		if (open) {
			loadCompaneros();
			companeroId = roll?.companero_id;
			prevCompaneroId = roll?.companero_id;
			tamanoRelativo = roll?.tamano_relativo;
			duracionStr = roll?.duracion_min?.toString() ?? '';
			resultado = roll?.resultado;
			queIntente = roll?.que_intente ?? '';
			queFallo = roll?.que_fallo ?? '';
			posicionesProblema = roll?.posiciones_problema ?? '';
			errorMsg = '';
		}
	});

	// Auto-populate tamaño relativo cuando el usuario cambia de compañero (el
	// peso del compañero es la referencia por defecto; el usuario puede
	// sobrescribir manualmente después).
	$effect(() => {
		if (!open) return;
		if (companeroId === prevCompaneroId) return;
		prevCompaneroId = companeroId;
		const c = companeros.find((c) => c.id === companeroId);
		if (c?.peso_relativo) tamanoRelativo = c.peso_relativo;
	});

	async function loadCompaneros() {
		try {
			companeros = await listCompaneros();
		} catch (err) {
			errorMsg = err instanceof Error ? err.message : String(err);
		}
	}

	const canSave = $derived(!!resultado && !saving);

	async function handleSave() {
		if (!canSave) return;
		saving = true;
		errorMsg = '';
		try {
			const dur = duracionStr.trim();
			await onSave({
				id: roll?.id ?? crypto.randomUUID(),
				sesion_id: sesionId,
				companero_id: companeroId,
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

	async function handleCompaneroSaved(data: {
		id: string;
		nombre: string;
		cinturon?: Companero['cinturon'];
		peso_relativo?: Companero['peso_relativo'];
		notas?: string;
	}) {
		const { id: _id, ...rest } = data;
		const created = await createCompanero(rest);
		companeros = [...companeros, created].sort((a, b) => a.nombre.localeCompare(b.nombre));
		companeroId = created.id;
	}
</script>

<Dialog.Root bind:open>
	<Dialog.Content class="max-h-[90vh] overflow-y-auto sm:max-w-md">
		<Dialog.Header>
			<Dialog.Title>{roll ? `Editar roll #${roll.orden}` : 'Nuevo roll'}</Dialog.Title>
		</Dialog.Header>

		<div class="space-y-4 py-2">
			<div class="space-y-1.5">
				<Label for="companero">Compañero</Label>
				<div class="flex gap-2">
					<div class="flex-1">
						<Select.Root type="single" bind:value={companeroId as string}>
							<Select.Trigger id="companero" class="w-full">
								{companeros.find((c) => c.id === companeroId)?.nombre ?? 'Sin compañero'}
							</Select.Trigger>
							<Select.Content>
								{#each companeros as c (c.id)}
									<Select.Item value={c.id}>{c.nombre}</Select.Item>
								{/each}
							</Select.Content>
						</Select.Root>
					</div>
					<Button type="button" variant="outline" onclick={() => (companeroEditorOpen = true)}>
						+ Nuevo
					</Button>
				</div>
			</div>

			<div class="space-y-1.5">
				<Label for="tamano">Tamaño relativo</Label>
				<Select.Root type="single" bind:value={tamanoRelativo as string}>
					<Select.Trigger id="tamano" class="w-full">
						{PESOS.find((p) => p.value === tamanoRelativo)?.label ?? 'Sin especificar'}
					</Select.Trigger>
					<Select.Content>
						{#each PESOS as p (p.value)}
							<Select.Item value={p.value}>{p.label}</Select.Item>
						{/each}
					</Select.Content>
				</Select.Root>
			</div>

			<div class="space-y-1.5">
				<Label for="duracion">Duración (min)</Label>
				<Input id="duracion" inputmode="numeric" bind:value={duracionStr} placeholder="p. ej. 5" />
			</div>

			<div class="space-y-1.5">
				<Label for="resultado">Resultado *</Label>
				<Select.Root type="single" bind:value={resultado as string}>
					<Select.Trigger id="resultado" class="w-full">
						{RESULTADOS.find((r) => r.value === resultado)?.label ?? 'Sin especificar'}
					</Select.Trigger>
					<Select.Content>
						{#each RESULTADOS as r (r.value)}
							<Select.Item value={r.value}>{r.label}</Select.Item>
						{/each}
					</Select.Content>
				</Select.Root>
			</div>

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

			{#if errorMsg}
				<p class="text-sm text-destructive">{errorMsg}</p>
			{/if}

			{#if !resultado}
				<p class="text-xs text-muted-foreground italic">El resultado es obligatorio.</p>
			{/if}
		</div>

		<Dialog.Footer class="gap-2 sm:justify-between">
			{#if onDelete}
				<Button variant="destructive" onclick={handleDelete} disabled={saving}>Borrar</Button>
			{:else}
				<span></span>
			{/if}
			<div class="flex gap-2">
				<Button variant="outline" onclick={() => (open = false)} disabled={saving}>Cancelar</Button>
				<Button onclick={handleSave} disabled={!canSave}>
					{saving ? 'Guardando…' : 'Guardar'}
				</Button>
			</div>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>

<CompaneroEditor bind:open={companeroEditorOpen} onSave={handleCompaneroSaved} />
