<script lang="ts">
	import { onMount } from 'svelte';
	import BottomNav from '$lib/components/BottomNav.svelte';
	import { Button } from '$lib/components/ui/button';

	let schemaVersion = $state<number | null>(null);
	let busy = $state<'export' | 'import' | null>(null);
	let message = $state<{ kind: 'ok' | 'err'; text: string } | null>(null);
	let fileInput: HTMLInputElement | null = $state(null);

	onMount(async () => {
		try {
			const { getSchemaVersion } = await import('$lib/sync');
			schemaVersion = await getSchemaVersion();
		} catch (err) {
			console.error('[ajustes] no se pudo leer schema_version:', err);
		}
	});

	function todayStamp(): string {
		const d = new Date();
		const y = d.getFullYear();
		const m = String(d.getMonth() + 1).padStart(2, '0');
		const day = String(d.getDate()).padStart(2, '0');
		return `${y}${m}${day}`;
	}

	async function handleExport() {
		busy = 'export';
		message = null;
		try {
			const { exportAll } = await import('$lib/sync');
			const payload = await exportAll();
			const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
			const url = URL.createObjectURL(blob);
			const a = document.createElement('a');
			a.href = url;
			a.download = `bjj-tracker-export-${todayStamp()}.json`;
			document.body.appendChild(a);
			a.click();
			document.body.removeChild(a);
			URL.revokeObjectURL(url);
			message = {
				kind: 'ok',
				text: `Exportado: ${payload.companeros.length} compañeros · ${payload.sesiones.length} sesiones · ${payload.rolls.length} rolls.`
			};
		} catch (err) {
			message = { kind: 'err', text: err instanceof Error ? err.message : String(err) };
		} finally {
			busy = null;
		}
	}

	function pickFile() {
		message = null;
		fileInput?.click();
	}

	async function handleFileChange(event: Event) {
		const input = event.target as HTMLInputElement;
		const file = input.files?.[0];
		input.value = '';
		if (!file) return;

		const ok = confirm(
			`¿Importar "${file.name}"?\n\nESTO REEMPLAZA TODOS LOS DATOS ACTUALES (compañeros, sesiones y rolls). No se puede deshacer.`
		);
		if (!ok) return;

		busy = 'import';
		message = null;
		try {
			const text = await file.text();
			let payload: unknown;
			try {
				payload = JSON.parse(text);
			} catch {
				throw new Error('El fichero no es JSON válido.');
			}
			const { importAll } = await import('$lib/sync');
			const result = await importAll(payload);
			message = {
				kind: 'ok',
				text: `Importado: ${result.companeros} compañeros · ${result.sesiones} sesiones · ${result.rolls} rolls.`
			};
		} catch (err) {
			message = { kind: 'err', text: err instanceof Error ? err.message : String(err) };
		} finally {
			busy = null;
		}
	}
</script>

<svelte:head>
	<title>Ajustes · BJJ Tracker</title>
</svelte:head>

<main class="mx-auto max-w-2xl space-y-4 p-4 pb-28">
	<header>
		<h1 class="text-2xl font-bold">Ajustes</h1>
	</header>

	<section class="space-y-3 rounded border border-gray-200 p-4">
		<h2 class="text-sm font-semibold text-gray-700">Exportar datos</h2>
		<p class="text-sm text-gray-600">
			Descarga un fichero JSON con TODA la BD (compañeros, sesiones y rolls). Útil como backup
			manual y para mover datos entre dispositivos.
		</p>
		<Button onclick={handleExport} disabled={busy !== null} class="w-full">
			{busy === 'export' ? 'Exportando…' : 'Exportar todo'}
		</Button>
	</section>

	<section class="space-y-3 rounded border border-gray-200 p-4">
		<h2 class="text-sm font-semibold text-gray-700">Importar datos</h2>
		<p class="text-sm text-gray-600">
			Selecciona un fichero JSON exportado previamente. <strong class="text-red-700"
				>Reemplaza TODOS los datos actuales</strong
			>; no hay merge en esta versión.
		</p>
		<!-- Sin accept: Android Chrome interpreta "application/json" como "no hay
		     app que lo maneje" y abre Fotos/Vídeos por defecto. Sin accept muestra
		     el selector de Archivos genérico. La validación de JSON se hace al
		     leer el contenido, no al filtrar el picker. -->
		<input
			bind:this={fileInput}
			type="file"
			class="hidden"
			onchange={handleFileChange}
		/>
		<Button variant="outline" onclick={pickFile} disabled={busy !== null} class="w-full">
			{busy === 'import' ? 'Importando…' : 'Importar JSON'}
		</Button>
	</section>

	{#if message}
		<div
			class="rounded border p-3 text-sm {message.kind === 'ok'
				? 'border-green-300 bg-green-50 text-green-800'
				: 'border-red-300 bg-red-50 text-red-800'}"
		>
			{message.text}
		</div>
	{/if}

	<section class="text-xs text-gray-500">
		<p>Versión BD: {schemaVersion ?? '…'}</p>
	</section>
</main>

<BottomNav />
