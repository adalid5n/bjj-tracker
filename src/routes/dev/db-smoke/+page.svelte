<script lang="ts">
	import { onMount } from 'svelte';
	import type { Row } from '$lib/db/types';

	type DbModule = typeof import('$lib/db');

	let db: DbModule | null = $state(null);
	let rows: Row[] = $state([]);
	let status: 'loading' | 'ready' | 'error' = $state('loading');
	let errorMessage = $state('');

	const isContentionError = $derived(errorMessage.includes('Access Handles cannot be created'));

	onMount(async () => {
		try {
			db = await import('$lib/db');
			await db.init();
			await refresh();
			status = 'ready';
		} catch (err) {
			errorMessage = err instanceof Error ? err.message : String(err);
			status = 'error';
			console.error('[db-smoke] init failed:', err);
		}
	});

	async function refresh() {
		if (!db) return;
		rows = await db.query('SELECT * FROM companeros ORDER BY created_at DESC');
	}

	async function insertOne() {
		if (!db) return;
		const now = new Date().toISOString();
		const id = crypto.randomUUID();
		await db.run(
			`INSERT INTO companeros (id, nombre, created_at, updated_at)
			 VALUES (?, ?, ?, ?)`,
			[id, `Test ${rows.length + 1}`, now, now]
		);
		await refresh();
	}

	async function clearAll() {
		if (!db) return;
		await db.run('DELETE FROM companeros');
		await refresh();
	}
</script>

<svelte:head>
	<title>DB smoke</title>
</svelte:head>

<main class="mx-auto max-w-2xl space-y-4 p-6">
	<h1 class="text-2xl font-bold">DB smoke</h1>
	<p class="text-sm text-gray-600">
		Página temporal para validar SQLite-WASM + OPFS-SAH-Pool. Borrar al cerrar T-2.
	</p>

	{#if status === 'loading'}
		<p class="text-blue-600">Inicializando BD…</p>
	{:else if status === 'error'}
		<div class="rounded border border-red-300 bg-red-50 p-3 space-y-3">
			{#if isContentionError}
				<p class="font-semibold text-red-800">La BD ya está abierta en otro sitio</p>
				<p class="text-sm text-red-700">
					Otra pestaña, ventana o instancia de BJJ Tracker tiene la base de datos abierta.
					Ciérrala y recarga esta página.
				</p>
				<details class="text-xs text-red-700">
					<summary class="cursor-pointer">Detalle técnico</summary>
					<pre class="mt-1 whitespace-pre-wrap">{errorMessage}</pre>
				</details>
			{:else}
				<p class="font-semibold text-red-800">Error inicializando BD</p>
				<pre class="text-sm whitespace-pre-wrap text-red-700">{errorMessage}</pre>
			{/if}
			<button
				type="button"
				onclick={() => window.location.reload()}
				class="rounded bg-red-600 px-4 py-2 text-white hover:bg-red-700"
			>
				Recargar página
			</button>
		</div>
	{:else}
		<div class="flex gap-2">
			<button
				type="button"
				onclick={insertOne}
				class="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
			>
				Insertar otro
			</button>
			<button
				type="button"
				onclick={clearAll}
				class="rounded bg-red-600 px-4 py-2 text-white hover:bg-red-700"
			>
				Vaciar
			</button>
		</div>

		<p class="text-sm text-gray-600">{rows.length} fila(s) en companeros</p>

		<ul class="space-y-1 font-mono text-xs">
			{#each rows as row (row.id as string)}
				<li class="rounded border border-gray-200 p-2">
					<div><strong>id:</strong> {row.id}</div>
					<div><strong>nombre:</strong> {row.nombre}</div>
					<div><strong>created_at:</strong> {row.created_at}</div>
				</li>
			{/each}
		</ul>
	{/if}
</main>
