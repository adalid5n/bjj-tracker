<script lang="ts">
	import { onMount } from 'svelte';
	import { resolve } from '$app/paths';
	import Fab from '$lib/components/Fab.svelte';
	import BottomNav from '$lib/components/BottomNav.svelte';
	import type { SesionWithCount } from '$lib/sesiones';

	const TIPO_LABEL = {
		bjj: 'BJJ',
		grappling: 'Grappling',
		open_mat: 'Open mat'
	} as const;

	let api: typeof import('$lib/sesiones') | null = $state(null);
	let sesiones: SesionWithCount[] = $state([]);
	let status: 'loading' | 'ready' | 'error' = $state('loading');
	let errorMessage = $state('');

	onMount(async () => {
		try {
			api = await import('$lib/sesiones');
			sesiones = await api.listSesiones();
			status = 'ready';
		} catch (err) {
			errorMessage = err instanceof Error ? err.message : String(err);
			status = 'error';
			console.error('[home] init failed:', err);
		}
	});

	function formatFecha(iso: string): string {
		const d = new Date(iso + 'T00:00:00');
		return d.toLocaleDateString('es-ES', { weekday: 'short', day: '2-digit', month: 'short' });
	}
</script>

<svelte:head>
	<title>BJJ Tracker</title>
</svelte:head>

<main class="mx-auto max-w-2xl space-y-4 p-4 pb-32">
	<header>
		<h1 class="text-2xl font-bold">BJJ Tracker</h1>
	</header>

	{#if status === 'loading'}
		<p class="text-blue-600">Cargando…</p>
	{:else if status === 'error'}
		<div class="rounded border border-red-300 bg-red-50 p-3">
			<p class="font-semibold text-red-800">Error cargando sesiones</p>
			<pre class="mt-2 text-sm whitespace-pre-wrap text-red-700">{errorMessage}</pre>
		</div>
	{:else if sesiones.length === 0}
		<div class="rounded border border-dashed border-gray-300 p-8 text-center">
			<p class="text-gray-600">Aún no hay sesiones.</p>
			<p class="text-sm text-gray-500">Empieza creando una con el botón de abajo.</p>
		</div>
	{:else}
		<ul class="divide-y divide-gray-200 rounded border border-gray-200">
			{#each sesiones as s (s.id)}
				<li>
					<a href={resolve(`/sesion/${s.id}`)} class="block p-3 transition-colors hover:bg-gray-50">
						<div class="flex items-baseline justify-between">
							<span class="font-medium">{formatFecha(s.fecha)}</span>
							<span class="text-xs text-gray-500">
								{s.rolls_count}
								{s.rolls_count === 1 ? 'roll' : 'rolls'}
							</span>
						</div>
						<div class="mt-0.5 text-xs text-gray-500">{TIPO_LABEL[s.tipo]}</div>
						{#if s.foco}
							<div class="mt-1 truncate text-sm text-gray-700">{s.foco}</div>
						{/if}
					</a>
				</li>
			{/each}
		</ul>
	{/if}
</main>

{#if status === 'ready'}
	<Fab href={resolve('/sesion/nueva')} label="Nueva sesión" />
{/if}

<BottomNav />
