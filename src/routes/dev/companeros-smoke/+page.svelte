<script lang="ts">
	import { onMount } from 'svelte';
	import CompaneroEditor from '$lib/components/CompaneroEditor.svelte';
	import { Button } from '$lib/components/ui/button';
	import type { Companero } from '$lib/types';

	let api: typeof import('$lib/companeros') | null = $state(null);
	let companeros: Companero[] = $state([]);
	let status: 'loading' | 'ready' | 'error' = $state('loading');
	let errorMessage = $state('');
	let editorOpen = $state(false);
	let editing: Companero | undefined = $state(undefined);

	onMount(async () => {
		try {
			api = await import('$lib/companeros');
			await refresh();
			status = 'ready';
		} catch (err) {
			errorMessage = err instanceof Error ? err.message : String(err);
			status = 'error';
			console.error('[companeros-smoke] init failed:', err);
		}
	});

	async function refresh() {
		if (!api) return;
		companeros = await api.listCompaneros();
	}

	function openCreate() {
		editing = undefined;
		editorOpen = true;
	}

	function openEdit(c: Companero) {
		editing = c;
		editorOpen = true;
	}

	async function handleSave(data: {
		id: string;
		nombre: string;
		cinturon?: Companero['cinturon'];
		peso_relativo?: Companero['peso_relativo'];
		notas?: string;
	}) {
		if (!api) return;
		if (editing) {
			await api.updateCompanero(data);
		} else {
			const { id: _id, ...rest } = data;
			await api.createCompanero(rest);
		}
		await refresh();
	}

	async function handleDelete(c: Companero) {
		if (!api) return;
		if (!confirm(`¿Borrar a ${c.nombre}?`)) return;
		await api.deleteCompanero(c.id);
		await refresh();
	}
</script>

<svelte:head>
	<title>Compañeros smoke</title>
</svelte:head>

<main class="mx-auto max-w-3xl space-y-4 p-6">
	<div class="flex items-center justify-between">
		<h1 class="text-2xl font-bold">Compañeros</h1>
		{#if status === 'ready'}
			<Button onclick={openCreate}>+ Nuevo</Button>
		{/if}
	</div>
	<p class="text-sm text-gray-600">Página temporal de smoke para CRUD de compañeros (T-4).</p>

	{#if status === 'loading'}
		<p class="text-blue-600">Cargando…</p>
	{:else if status === 'error'}
		<div class="rounded border border-red-300 bg-red-50 p-3">
			<p class="font-semibold text-red-800">Error</p>
			<pre class="mt-2 text-sm whitespace-pre-wrap text-red-700">{errorMessage}</pre>
		</div>
	{:else if companeros.length === 0}
		<p class="text-sm text-gray-500 italic">Aún no hay compañeros. Pulsa "Nuevo" para crear uno.</p>
	{:else}
		<ul class="divide-y divide-gray-200 rounded border border-gray-200">
			{#each companeros as c (c.id)}
				<li class="flex items-center justify-between p-3">
					<div class="space-y-0.5">
						<div class="font-medium">{c.nombre}</div>
						<div class="text-xs text-gray-500">
							{#if c.cinturon}<span>cinturón {c.cinturon}</span>{/if}
							{#if c.peso_relativo}<span> · {c.peso_relativo}</span>{/if}
						</div>
					</div>
					<div class="flex gap-2">
						<Button variant="outline" size="sm" onclick={() => openEdit(c)}>Editar</Button>
						<Button variant="destructive" size="sm" onclick={() => handleDelete(c)}>Borrar</Button>
					</div>
				</li>
			{/each}
		</ul>
	{/if}
</main>

<CompaneroEditor bind:open={editorOpen} companero={editing} onSave={handleSave} />
