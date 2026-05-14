<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import Fab from '$lib/components/Fab.svelte';
	import BottomNav from '$lib/components/BottomNav.svelte';
	import SesionEditor from '$lib/components/SesionEditor.svelte';
	import { VERSION } from '$lib/version';
	import type { SesionWithCount } from '$lib/sesiones';
	import type { TipoSesion } from '$lib/types';

	const TIPO_LABEL = {
		bjj: 'BJJ',
		grappling: 'Grappling',
		open_mat: 'Open mat'
	} as const;

	let api: typeof import('$lib/sesiones') | null = $state(null);
	let sesiones: SesionWithCount[] = $state([]);
	let status: 'loading' | 'ready' | 'error' = $state('loading');
	let errorMessage = $state('');
	let editorOpen = $state(false);

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

	function openCreate() {
		editorOpen = true;
	}

	async function handleSesionSave(data: {
		fecha: string;
		tipo: TipoSesion;
		foco?: string;
		tecnica_clase?: string;
		obs_profesor?: string;
	}) {
		const { createSesion, listSesiones } = await import('$lib/sesiones');
		const sesion = await createSesion(data);
		sesiones = await listSesiones();
		await goto(resolve(`/sesion/${sesion.id}`));
	}
</script>

<svelte:head>
	<title>BJJ Tracker</title>
</svelte:head>

<main class="mx-auto max-w-2xl space-y-4 p-4 pb-32">
	{#if status === 'loading'}
		<p class="text-primary">Cargando…</p>
	{:else if status === 'error'}
		<div class="rounded border border-destructive/30 bg-destructive/10 p-3">
			<p class="font-semibold text-destructive">Error cargando sesiones</p>
			<pre class="mt-2 text-sm whitespace-pre-wrap text-destructive">{errorMessage}</pre>
		</div>
	{:else if sesiones.length === 0}
		<div class="rounded border border-dashed border-border p-8 text-center">
			<p class="text-muted-foreground">Aún no hay sesiones.</p>
			<p class="text-sm text-muted-foreground">Empieza creando una con el botón de abajo.</p>
		</div>
	{:else}
		<ul class="space-y-2">
			{#each sesiones as s (s.id)}
				<li>
					<a
						href={resolve(`/sesion/${s.id}`)}
						class="block rounded-lg border border-border bg-card p-3 shadow-xs transition-colors hover:bg-accent"
					>
						<div class="flex items-baseline justify-between">
							<span class="font-medium">{formatFecha(s.fecha)}</span>
							<span class="text-xs text-muted-foreground">
								{s.rolls_count}
								{s.rolls_count === 1 ? 'roll' : 'rolls'}
							</span>
						</div>
						<div class="mt-0.5 text-xs text-muted-foreground">{TIPO_LABEL[s.tipo]}</div>
						{#if s.foco}
							<div class="mt-1 truncate text-sm text-foreground">{s.foco}</div>
						{/if}
					</a>
				</li>
			{/each}
		</ul>
	{/if}

	<p class="pt-4 text-center text-xs text-muted-foreground/60">v{VERSION}</p>
</main>

{#if status === 'ready'}
	<Fab onclick={openCreate} label="Nueva sesión" />
{/if}

<BottomNav />

<SesionEditor bind:open={editorOpen} onSave={handleSesionSave} />
