<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import SesionForm from '$lib/components/SesionForm.svelte';
	import { Button } from '$lib/components/ui/button';
	import type { NewSesion } from '$lib/sesiones';

	async function handleSubmit(data: NewSesion) {
		const { createSesion } = await import('$lib/sesiones');
		const sesion = await createSesion(data);
		await goto(resolve(`/sesion/${sesion.id}`), { replaceState: true });
	}
</script>

<svelte:head>
	<title>Nueva sesión · BJJ Tracker</title>
</svelte:head>

<main class="mx-auto max-w-2xl space-y-4 p-4">
	<header class="flex items-center gap-3">
		<Button variant="outline" size="sm" href={resolve('/')}>← Volver</Button>
		<h1 class="text-xl font-bold">Nueva sesión</h1>
	</header>

	<SesionForm submitLabel="Crear sesión" onSubmit={handleSubmit} />
</main>
