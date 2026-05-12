<script lang="ts">
	import { onMount } from 'svelte';
	import SearchIcon from '@lucide/svelte/icons/search';
	import BottomNav from '$lib/components/BottomNav.svelte';
	import { Input } from '$lib/components/ui/input';
	import type {
		CategoriaPosicion,
		Posicion,
		SumisionTerminal,
		TipoRolPosicion
	} from '$lib/types';

	const CATEGORIA_LABEL: Record<CategoriaPosicion, string> = {
		guardia: 'Guardia',
		control_superior: 'Control superior',
		espalda: 'Espalda',
		transicion: 'Transición',
		otro: 'Otro'
	};

	// Orden fijo de secciones; las que queden vacías tras filtro no se renderizan.
	const CATEGORIAS_ORDEN: CategoriaPosicion[] = [
		'guardia',
		'control_superior',
		'espalda',
		'transicion',
		'otro'
	];

	const TIPO_ROL_LABEL: Record<TipoRolPosicion, string> = {
		ofensiva: 'Ofensiva',
		defensiva: 'Defensiva',
		neutral: 'Neutral'
	};

	// Mismo patrón de chips de tono semántico que /rolls (RESULTADO_BADGE).
	const TIPO_ROL_BADGE: Record<TipoRolPosicion, string> = {
		ofensiva: 'bg-success/15 text-success',
		defensiva: 'bg-destructive/15 text-destructive',
		neutral: 'bg-muted text-muted-foreground'
	};

	let posiciones = $state<Posicion[]>([]);
	let sumisiones = $state<SumisionTerminal[]>([]);
	let status: 'loading' | 'ready' | 'error' = $state('loading');
	let errorMessage = $state('');
	let query = $state('');

	onMount(async () => {
		try {
			const { listPosiciones } = await import('$lib/posiciones');
			const { listSumisiones } = await import('$lib/sumisiones');
			[posiciones, sumisiones] = await Promise.all([listPosiciones(), listSumisiones()]);
			status = 'ready';
		} catch (err) {
			errorMessage = err instanceof Error ? err.message : String(err);
			status = 'error';
			console.error('[mapa] init failed:', err);
		}
	});

	const queryNormalized = $derived(query.trim().toLowerCase());

	const posicionesFiltradas = $derived(
		queryNormalized === ''
			? posiciones
			: posiciones.filter((p) => p.nombre.toLowerCase().includes(queryNormalized))
	);

	const sumisionesFiltradas = $derived(
		queryNormalized === ''
			? sumisiones
			: sumisiones.filter((s) => s.nombre.toLowerCase().includes(queryNormalized))
	);

	// Agrupa las posiciones filtradas por categoría manteniendo el orden de
	// CATEGORIAS_ORDEN. Solo aparecen secciones con al menos un item.
	const posicionesPorCategoria = $derived.by(() => {
		const grupos: { categoria: CategoriaPosicion; items: Posicion[] }[] = [];
		for (const cat of CATEGORIAS_ORDEN) {
			const items = posicionesFiltradas.filter((p) => p.categoria === cat);
			if (items.length > 0) grupos.push({ categoria: cat, items });
		}
		return grupos;
	});

	const catalogoVacio = $derived(posiciones.length === 0 && sumisiones.length === 0);
	const filtroSinResultados = $derived(
		queryNormalized !== '' &&
			posicionesFiltradas.length === 0 &&
			sumisionesFiltradas.length === 0
	);
</script>

<svelte:head>
	<title>Mapa técnico · BJJ Tracker</title>
</svelte:head>

<main class="mx-auto max-w-2xl space-y-3 p-4 pb-28">
	<header>
		<h1 class="text-2xl font-bold">Mapa técnico</h1>
	</header>

	{#if status === 'loading'}
		<p class="text-primary">Cargando…</p>
	{:else if status === 'error'}
		<div class="rounded border border-destructive/30 bg-destructive/10 p-3">
			<p class="font-semibold text-destructive">Error</p>
			<pre class="mt-2 text-sm whitespace-pre-wrap text-destructive">{errorMessage}</pre>
		</div>
	{:else if catalogoVacio}
		<div class="rounded border border-dashed border-border p-8 text-center">
			<p class="text-muted-foreground">Catálogo vacío.</p>
			<p class="mt-1 text-sm text-muted-foreground">
				Las posiciones, sumisiones y técnicas se podrán crear cuando llegue T-8.
			</p>
		</div>
	{:else}
		<div class="relative">
			<SearchIcon
				class="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
			/>
			<Input
				type="search"
				placeholder="Buscar por nombre…"
				bind:value={query}
				aria-label="Buscar en el mapa"
				class="pl-8"
			/>
		</div>

		{#if filtroSinResultados}
			<p
				class="rounded border border-dashed border-border p-8 text-center text-muted-foreground"
			>
				Sin resultados para "{query}".
			</p>
		{:else}
			{#each posicionesPorCategoria as grupo (grupo.categoria)}
				<section class="space-y-2">
					<h2 class="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
						{CATEGORIA_LABEL[grupo.categoria]}
					</h2>
					<ul class="divide-y divide-border rounded border border-border">
						{#each grupo.items as p (p.id)}
							<li class="cursor-default p-3">
								<div class="font-medium">{p.nombre}</div>
								<div class="mt-1 flex flex-wrap gap-1">
									{#if p.tipo}
										<span class="rounded px-2 py-0.5 text-xs {TIPO_ROL_BADGE[p.tipo]}">
											{TIPO_ROL_LABEL[p.tipo]}
										</span>
									{/if}
									<span class="rounded bg-muted px-2 py-0.5 text-xs text-muted-foreground">
										{CATEGORIA_LABEL[p.categoria]}
									</span>
								</div>
							</li>
						{/each}
					</ul>
				</section>
			{/each}

			{#if sumisionesFiltradas.length > 0}
				<section class="space-y-2">
					<h2 class="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
						Sumisiones
					</h2>
					<ul class="divide-y divide-border rounded border border-border">
						{#each sumisionesFiltradas as s (s.id)}
							<li class="cursor-default p-3">
								<div class="font-medium">{s.nombre}</div>
							</li>
						{/each}
					</ul>
				</section>
			{/if}
		{/if}
	{/if}
</main>

<BottomNav />
