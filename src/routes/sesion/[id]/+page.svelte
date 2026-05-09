<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import SesionForm from '$lib/components/SesionForm.svelte';
	import { Button } from '$lib/components/ui/button';
	import type { Sesion, TipoSesion } from '$lib/types';

	let sesion = $state<Sesion | null>(null);
	let status: 'loading' | 'ready' | 'notfound' | 'error' = $state('loading');
	let errorMessage = $state('');
	let savedFlash = $state(false);
	const id = $derived(page.params.id as string);

	onMount(async () => {
		try {
			const { getSesion } = await import('$lib/sesiones');
			const found = await getSesion(id);
			if (!found) {
				status = 'notfound';
				return;
			}
			sesion = found;
			status = 'ready';
		} catch (err) {
			errorMessage = err instanceof Error ? err.message : String(err);
			status = 'error';
			console.error('[sesion/:id] init failed:', err);
		}
	});

	async function handleSubmit(data: {
		fecha: string;
		tipo: TipoSesion;
		foco?: string;
		tecnica_clase?: string;
		obs_profesor?: string;
	}) {
		if (!sesion) return;
		const { updateSesion, getSesion } = await import('$lib/sesiones');
		await updateSesion({ id: sesion.id, ...data });
		sesion = await getSesion(sesion.id);
		savedFlash = true;
		setTimeout(() => (savedFlash = false), 1500);
	}

	async function handleDelete() {
		if (!sesion) return;
		if (!confirm('¿Borrar esta sesión? Se borrarán también todos sus rolls.')) return;
		const { deleteSesion } = await import('$lib/sesiones');
		await deleteSesion(sesion.id);
		await goto(resolve('/'), { replaceState: true });
	}
</script>

<svelte:head>
	<title>Sesión · BJJ Tracker</title>
</svelte:head>

<main class="mx-auto max-w-2xl space-y-4 p-4">
	<header class="flex items-center gap-3">
		<Button variant="outline" size="sm" href={resolve('/')}>← Volver</Button>
		<h1 class="text-xl font-bold">Editar sesión</h1>
	</header>

	{#if status === 'loading'}
		<p class="text-blue-600">Cargando…</p>
	{:else if status === 'notfound'}
		<div class="rounded border border-yellow-300 bg-yellow-50 p-3">
			<p class="text-yellow-800">Esta sesión no existe (ID: {id}).</p>
		</div>
	{:else if status === 'error'}
		<div class="rounded border border-red-300 bg-red-50 p-3">
			<p class="font-semibold text-red-800">Error</p>
			<pre class="mt-2 text-sm whitespace-pre-wrap text-red-700">{errorMessage}</pre>
		</div>
	{:else if sesion}
		<SesionForm initial={sesion} submitLabel="Guardar cambios" onSubmit={handleSubmit} />

		{#if savedFlash}
			<p class="text-sm text-green-600">✓ Guardado</p>
		{/if}

		<section class="border-t border-gray-200 pt-4">
			<h2 class="mb-2 text-sm font-semibold text-gray-600">Rolls</h2>
			<p class="text-sm text-gray-500 italic">
				La gestión de rolls llega en T-6. De momento esta sesión no muestra ni acepta rolls aquí.
			</p>
		</section>

		<section class="border-t border-gray-200 pt-4">
			<Button variant="destructive" onclick={handleDelete} class="w-full">Eliminar sesión</Button>
		</section>
	{/if}
</main>
