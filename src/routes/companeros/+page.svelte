<script lang="ts">
	import { onMount } from 'svelte';
	import BottomNav from '$lib/components/BottomNav.svelte';
	import Fab from '$lib/components/Fab.svelte';
	import CompaneroEditor from '$lib/components/CompaneroEditor.svelte';
	import { Button } from '$lib/components/ui/button';
	import type { Companero } from '$lib/types';

	const CINTURON_LABEL = {
		blanco: 'Blanco',
		azul: 'Azul',
		morado: 'Morado',
		marron: 'Marrón',
		negro: 'Negro'
	} as const;

	const PESO_LABEL = {
		mucho_menos: 'Mucho menor',
		menos: 'Menor',
		similar: 'Similar',
		mas: 'Mayor',
		mucho_mas: 'Mucho mayor'
	} as const;

	let companeros = $state<Companero[]>([]);
	let status: 'loading' | 'ready' | 'error' = $state('loading');
	let errorMessage = $state('');
	let editorOpen = $state(false);
	let editing: Companero | undefined = $state(undefined);

	onMount(async () => {
		try {
			await refresh();
			status = 'ready';
		} catch (err) {
			errorMessage = err instanceof Error ? err.message : String(err);
			status = 'error';
			console.error('[companeros] init failed:', err);
		}
	});

	async function refresh() {
		const { listCompaneros } = await import('$lib/companeros');
		companeros = await listCompaneros();
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
		const { createCompanero, updateCompanero } = await import('$lib/companeros');
		if (editing) {
			await updateCompanero(data);
		} else {
			const { id: _id, ...rest } = data;
			await createCompanero(rest);
		}
		await refresh();
	}

	async function handleDelete(c: Companero) {
		if (
			!confirm(
				`¿Borrar a ${c.nombre}?\n\nLos rolls que tenga asociados seguirán existiendo, pero quedarán sin compañero.`
			)
		)
			return;
		const { deleteCompanero } = await import('$lib/companeros');
		await deleteCompanero(c.id);
		await refresh();
	}
</script>

<svelte:head>
	<title>Compañeros · BJJ Tracker</title>
</svelte:head>

<main class="mx-auto max-w-2xl space-y-3 p-4 pb-32">
	<header>
		<h1 class="text-2xl font-bold">Compañeros</h1>
	</header>

	{#if status === 'loading'}
		<p class="text-primary">Cargando…</p>
	{:else if status === 'error'}
		<div class="rounded border border-destructive/30 bg-destructive/10 p-3">
			<p class="font-semibold text-destructive">Error</p>
			<pre class="mt-2 text-sm whitespace-pre-wrap text-destructive">{errorMessage}</pre>
		</div>
	{:else if companeros.length === 0}
		<div class="rounded border border-dashed border-border p-8 text-center">
			<p class="text-muted-foreground">Aún no hay compañeros.</p>
			<p class="text-sm text-muted-foreground">Pulsa el botón de abajo para añadir el primero.</p>
		</div>
	{:else}
		<p class="text-xs text-muted-foreground">{companeros.length} compañero(s)</p>
		<ul class="divide-y divide-border rounded border border-border">
			{#each companeros as c (c.id)}
				<li class="flex items-center justify-between gap-3 p-3">
					<button type="button" class="flex-1 text-left" onclick={() => openEdit(c)}>
						<div class="font-medium">{c.nombre}</div>
						<div class="mt-0.5 text-xs text-muted-foreground">
							{#if c.cinturon}<span>cinturón {CINTURON_LABEL[c.cinturon]}</span>{/if}
							{#if c.cinturon && c.peso_relativo}<span> · </span>{/if}
							{#if c.peso_relativo}<span>{PESO_LABEL[c.peso_relativo]}</span>{/if}
							{#if !c.cinturon && !c.peso_relativo}
								<span class="italic">Sin detalles</span>
							{/if}
						</div>
					</button>
					<Button variant="ghost" size="sm" onclick={() => handleDelete(c)}>Borrar</Button>
				</li>
			{/each}
		</ul>
	{/if}
</main>

{#if status === 'ready'}
	<Fab onclick={openCreate} label="Nuevo compañero" />
{/if}

<BottomNav />

<CompaneroEditor bind:open={editorOpen} companero={editing} onSave={handleSave} />
