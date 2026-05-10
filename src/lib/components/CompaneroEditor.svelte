<script lang="ts">
	import * as Dialog from '$lib/components/ui/dialog';
	import * as Select from '$lib/components/ui/select';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Textarea } from '$lib/components/ui/textarea';
	import type { Cinturon, Companero, PesoRelativo } from '$lib/types';

	const CINTURONES: { value: Cinturon; label: string }[] = [
		{ value: 'blanco', label: 'Blanco' },
		{ value: 'azul', label: 'Azul' },
		{ value: 'morado', label: 'Morado' },
		{ value: 'marron', label: 'Marrón' },
		{ value: 'negro', label: 'Negro' }
	];

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

	let nombre = $state('');
	let cinturon = $state<Cinturon | undefined>(undefined);
	let pesoRelativo = $state<PesoRelativo | undefined>(undefined);
	let notas = $state('');
	let saving = $state(false);
	let errorMsg = $state('');

	$effect(() => {
		if (open) {
			nombre = companero?.nombre ?? '';
			cinturon = companero?.cinturon;
			pesoRelativo = companero?.peso_relativo;
			notas = companero?.notas ?? '';
			errorMsg = '';
		}
	});

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
	<Dialog.Content class="sm:max-w-md">
		<Dialog.Header>
			<Dialog.Title>{companero ? 'Editar compañero' : 'Nuevo compañero'}</Dialog.Title>
		</Dialog.Header>

		<div class="space-y-4 py-2">
			<div class="space-y-1.5">
				<Label for="nombre">Nombre *</Label>
				<Input id="nombre" bind:value={nombre} placeholder="Pepito" autofocus />
			</div>

			<div class="space-y-1.5">
				<Label for="cinturon">Cinturón</Label>
				<Select.Root type="single" bind:value={cinturon as string}>
					<Select.Trigger id="cinturon" class="w-full">
						{CINTURONES.find((c) => c.value === cinturon)?.label ?? 'Sin especificar'}
					</Select.Trigger>
					<Select.Content>
						{#each CINTURONES as c (c.value)}
							<Select.Item value={c.value}>{c.label}</Select.Item>
						{/each}
					</Select.Content>
				</Select.Root>
			</div>

			<div class="space-y-1.5">
				<Label for="peso">Peso relativo</Label>
				<Select.Root type="single" bind:value={pesoRelativo as string}>
					<Select.Trigger id="peso" class="w-full">
						{PESOS.find((p) => p.value === pesoRelativo)?.label ?? 'Sin especificar'}
					</Select.Trigger>
					<Select.Content>
						{#each PESOS as p (p.value)}
							<Select.Item value={p.value}>{p.label}</Select.Item>
						{/each}
					</Select.Content>
				</Select.Root>
			</div>

			<div class="space-y-1.5">
				<Label for="notas">Notas</Label>
				<Textarea id="notas" bind:value={notas} rows={3} />
			</div>

			{#if errorMsg}
				<p class="text-sm text-destructive">{errorMsg}</p>
			{/if}
		</div>

		<Dialog.Footer>
			<Button variant="outline" onclick={() => (open = false)} disabled={saving}>Cancelar</Button>
			<Button onclick={handleSave} disabled={!canSave}>
				{saving ? 'Guardando…' : 'Guardar'}
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
