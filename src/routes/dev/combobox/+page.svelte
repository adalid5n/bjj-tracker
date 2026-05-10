<script lang="ts">
	import CompaneroCombobox from '$lib/components/CompaneroCombobox.svelte';
	import type { Companero } from '$lib/types';

	const now = '2026-01-01T00:00:00Z';
	let companeros = $state<Companero[]>([
		{ id: '1', nombre: 'Alex', cinturon: 'azul', peso_relativo: 'similar', created_at: now, updated_at: now },
		{ id: '2', nombre: 'Bruno', cinturon: 'morado', peso_relativo: 'mas', created_at: now, updated_at: now },
		{ id: '3', nombre: 'Carla', cinturon: 'blanco', peso_relativo: 'menos', created_at: now, updated_at: now },
		{ id: '4', nombre: 'Diego', cinturon: 'azul', peso_relativo: 'similar', created_at: now, updated_at: now }
	]);

	let selectedId = $state<string | null>(null);
	let createdLog = $state<string[]>([]);

	function handleCreate(nombre: string) {
		const id = String(companeros.length + 1);
		const iso = new Date().toISOString();
		companeros = [...companeros, { id, nombre, created_at: iso, updated_at: iso }];
		selectedId = id;
		createdLog = [...createdLog, `Creado: ${nombre} (id=${id})`];
	}
</script>

<main class="mx-auto max-w-2xl space-y-6 p-4">
	<header>
		<h1 class="text-2xl font-bold">Combobox de compañero — playground</h1>
		<p class="text-sm text-muted-foreground">
			Para verificar el componente. Esta página se elimina al cerrar it.0.5.
		</p>
	</header>

	<section class="space-y-2">
		<h2 class="text-sm font-semibold">Selector</h2>
		<CompaneroCombobox
			{companeros}
			value={selectedId}
			onChange={(id) => (selectedId = id)}
			onCreate={handleCreate}
		/>
		<p class="text-xs text-muted-foreground">
			ID seleccionado: {selectedId ?? '(ninguno)'}
		</p>
	</section>

	<section class="space-y-2">
		<h2 class="text-sm font-semibold">Compañeros existentes ({companeros.length})</h2>
		<ul class="space-y-1 text-sm">
			{#each companeros as c (c.id)}
				<li class="text-muted-foreground">{c.id}. {c.nombre}</li>
			{/each}
		</ul>
	</section>

	{#if createdLog.length > 0}
		<section class="space-y-2">
			<h2 class="text-sm font-semibold">Log de creaciones</h2>
			<ul class="space-y-1 text-xs text-muted-foreground">
				{#each createdLog as line, i (i)}
					<li>{line}</li>
				{/each}
			</ul>
		</section>
	{/if}
</main>
