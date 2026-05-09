<script lang="ts">
	import { resolve } from '$app/paths';
</script>

<svelte:head>
	<title>Dev · BJJ Tracker</title>
</svelte:head>

<main class="mx-auto max-w-2xl space-y-3 p-4">
	<header class="flex items-center gap-3">
		<a href={resolve('/')} class="text-sm text-gray-600 underline">← Home</a>
	</header>
	<h1 class="text-xl font-bold">Páginas de desarrollo</h1>
	<p class="text-sm text-gray-600">
		Sanity checks ad-hoc. No enlazadas desde la home pública. Borrar al cerrar Iteración 0 (o
		convertirlas en tests).
	</p>

	<ul class="space-y-2">
		<li>
			<a href={resolve('/dev/db-smoke')} class="text-blue-600 underline">DB smoke</a>
			<span class="text-xs text-gray-500"> — SQLite-WASM + OPFS-SAH-Pool (T-2)</span>
		</li>
		<li>
			<a href={resolve('/dev/companeros-smoke')} class="text-blue-600 underline">
				Compañeros smoke
			</a>
			<span class="text-xs text-gray-500"> — CRUD de compañeros (T-4)</span>
		</li>
	</ul>
</main>
