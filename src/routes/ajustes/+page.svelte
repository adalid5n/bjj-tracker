<script lang="ts">
	import { onMount } from 'svelte';
	import { Switch } from 'bits-ui';
	import BottomNav from '$lib/components/BottomNav.svelte';
	import { Button } from '$lib/components/ui/button';
	import { theme } from '$lib/theme.svelte';
	import { settings } from '$lib/settings.svelte';

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
		// T-1.it6: hidrata el state reactivo de settings desde BD.
		// Idempotente; si otro consumidor ya lo invocó, no hay nuevo round-trip.
		try {
			await settings.init();
		} catch (err) {
			console.error('[ajustes] no se pudo cargar settings:', err);
		}
	});

	async function onToggleModoAvanzado(v: boolean) {
		try {
			await settings.setModoAvanzado(v);
		} catch (err) {
			console.error('[ajustes] no se pudo persistir modo_avanzado:', err);
		}
	}

	function todayStamp(): string {
		const d = new Date();
		const y = d.getFullYear();
		const m = String(d.getMonth() + 1).padStart(2, '0');
		const day = String(d.getDate()).padStart(2, '0');
		return `${y}${m}${day}`;
	}

	// Resume el contenido de un payload de export / resultado de import.
	// Acepta tanto el payload (arrays) como el resumen del importAll (números),
	// gracias a que ambos exponen `.length` o número directo en las mismas keys.
	type Countable =
		| { companeros: unknown[]; sesiones: unknown[]; rolls: unknown[]; posiciones: unknown[]; sumisiones_terminales: unknown[]; tecnicas: unknown[]; tecnica_contras: unknown[] }
		| { companeros: number; sesiones: number; rolls: number; posiciones: number; sumisiones_terminales: number; tecnicas: number; tecnica_contras: number };

	function n(v: unknown[] | number): number {
		return typeof v === 'number' ? v : v.length;
	}

	function pl(count: number, sing: string, plural: string): string {
		return `${count} ${count === 1 ? sing : plural}`;
	}

	function countsLine(x: Countable): string {
		return [
			pl(n(x.sesiones), 'sesión', 'sesiones'),
			`${n(x.rolls)} rolls`,
			pl(n(x.companeros), 'compañero', 'compañeros'),
			pl(n(x.posiciones), 'posición', 'posiciones'),
			pl(n(x.sumisiones_terminales), 'sumisión', 'sumisiones'),
			pl(n(x.tecnicas), 'técnica', 'técnicas'),
			pl(n(x.tecnica_contras), 'contra', 'contras')
		].join(' · ');
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
			message = { kind: 'ok', text: `Exportado: ${countsLine(payload)}.` };
		} catch (err) {
			message = { kind: 'err', text: err instanceof Error ? err.message : String(err) };
		} finally {
			busy = null;
		}
	}

	type ShowOpenFilePicker = (opts?: {
		types?: { description?: string; accept: Record<string, string[]> }[];
		multiple?: boolean;
		excludeAcceptAllOption?: boolean;
	}) => Promise<{ getFile: () => Promise<File> }[]>;

	async function pickFile() {
		message = null;
		// Preferred path: FileSystem Access API (Chromium incl. Edge mobile)
		// abre el explorador de Archivos nativo del SO. El input type=file en
		// Android tiende a abrir Cámara/Fotos primero por cómo los intents
		// matchean MIME types.
		const fsApi = (window as unknown as { showOpenFilePicker?: ShowOpenFilePicker })
			.showOpenFilePicker;
		if (fsApi) {
			try {
				const handles = await fsApi({
					types: [
						{
							description: 'BJJ Tracker export',
							accept: { 'application/json': ['.json'] }
						}
					],
					multiple: false,
					excludeAcceptAllOption: false
				});
				const file = await handles[0].getFile();
				await processFile(file);
			} catch (err) {
				// El usuario canceló (AbortError) — silencio. Otros errores: reportar.
				if (err instanceof Error && err.name === 'AbortError') return;
				message = { kind: 'err', text: err instanceof Error ? err.message : String(err) };
			}
			return;
		}
		// Fallback: input type=file (Safari iOS, Firefox)
		fileInput?.click();
	}

	async function handleFileChange(event: Event) {
		const input = event.target as HTMLInputElement;
		const file = input.files?.[0];
		input.value = '';
		if (!file) return;
		await processFile(file);
	}

	async function processFile(file: File) {
		const ok = confirm(
			`¿Importar "${file.name}"?\n\nESTO REEMPLAZA TODOS LOS DATOS ACTUALES (logbook + mapa técnico). No se puede deshacer.`
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
			message = { kind: 'ok', text: `Importado: ${countsLine(result)}.` };
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
	<section class="space-y-3 rounded border border-border p-4">
		<h2 class="text-sm font-semibold text-foreground">Exportar datos</h2>
		<p class="text-sm text-muted-foreground">
			Descarga un fichero JSON con TODA la BD (compañeros, sesiones y rolls). Útil como backup
			manual y para mover datos entre dispositivos.
		</p>
		<Button onclick={handleExport} disabled={busy !== null} class="w-full">
			{busy === 'export' ? 'Exportando…' : 'Exportar todo'}
		</Button>
	</section>

	<section class="space-y-3 rounded border border-border p-4">
		<h2 class="text-sm font-semibold text-foreground">Importar datos</h2>
		<p class="text-sm text-muted-foreground">
			Selecciona un fichero JSON exportado previamente. <strong class="text-destructive"
				>Reemplaza TODOS los datos actuales</strong
			>; no hay merge en esta versión.
		</p>
		<!-- Sin accept: Android Chrome interpreta "application/json" como "no hay
		     app que lo maneje" y abre Fotos/Vídeos por defecto. Sin accept muestra
		     el selector de Archivos genérico. La validación de JSON se hace al
		     leer el contenido, no al filtrar el picker. -->
		<input bind:this={fileInput} type="file" class="hidden" onchange={handleFileChange} />
		<Button variant="outline" onclick={pickFile} disabled={busy !== null} class="w-full">
			{busy === 'import' ? 'Importando…' : 'Importar JSON'}
		</Button>
	</section>

	{#if message}
		<div
			class="rounded border p-3 text-sm {message.kind === 'ok'
				? 'border-success/30 bg-success/10 text-success'
				: 'border-destructive/30 bg-destructive/10 text-destructive'}"
		>
			{message.text}
		</div>
	{/if}

	<!--
	  T-1.it6: toggle "Vista avanzada". Persiste el flag en BD (tabla
	  `app_settings`) vía `settings.setModoAvanzado()`. En T-1 no hay
	  consumidores aún; conectar wizards/home es T-2 y T-3.

	  Switch de bits-ui directo (sin wrapper local en `components/ui/`):
	  un solo sitio de uso, y bits-ui ya provee la primitive accesible.
	  Si el Switch aparece en más sitios, se promueve a wrapper.
	-->
	<section class="space-y-3 rounded border border-border p-4">
		<div class="flex items-start justify-between gap-3">
			<div class="flex-1 space-y-1">
				<label for="modo-avanzado-switch" class="text-sm font-semibold text-foreground">
					Vista avanzada
				</label>
				<p class="text-sm text-muted-foreground">
					Muestra estadísticas en el inicio y campos opcionales en formularios.
				</p>
			</div>
			<Switch.Root
				id="modo-avanzado-switch"
				checked={settings.modoAvanzado}
				onCheckedChange={onToggleModoAvanzado}
				disabled={!settings.initialized}
				aria-label="Vista avanzada"
				class="peer relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=unchecked]:bg-muted"
			>
				<Switch.Thumb
					class="pointer-events-none block h-5 w-5 rounded-full bg-background shadow-lg ring-0 transition-transform data-[state=checked]:translate-x-5 data-[state=unchecked]:translate-x-0"
				/>
			</Switch.Root>
		</div>
	</section>

	<!-- Disciplina activa: BJJ o Grappling. Afecta qué técnicas/posiciones
	     se muestran en el mapa y qué disciplina se asigna a los nuevos registros. -->
	<section class="space-y-3 rounded border border-border p-4">
		<div class="space-y-1">
			<p class="text-sm font-semibold text-foreground">Disciplina</p>
			<p class="text-sm text-muted-foreground">
				Filtra el mapa para mostrar solo tu disciplina. Se puede cambiar en cualquier momento desde el mapa.
			</p>
		</div>
		<div
			role="group"
			aria-label="Disciplina activa"
			class="inline-flex rounded-md border border-border bg-muted p-0.5"
		>
			{#each [{ value: 'bjj', label: 'BJJ' }, { value: 'grappling', label: 'Grappling' }] as opt}
				<button
					type="button"
					disabled={!settings.initialized}
					aria-pressed={settings.disciplinaActiva === opt.value}
					onclick={() => settings.setDisciplinaActiva(opt.value as 'bjj' | 'grappling')}
					class="rounded px-4 py-1.5 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none disabled:opacity-50 {settings.disciplinaActiva === opt.value ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}"
				>
					{opt.label}
				</button>
			{/each}
		</div>
	</section>

	<!--
	  M7: selector de tema. Auto sigue `prefers-color-scheme` del SO. Claro /
	  Oscuro lo fuerzan. La preferencia se persiste en localStorage (`theme`).
	  Patrón role="group" con tres botones — el ToggleGroup de bits-ui podría
	  servir, pero un grupo de 3 botones con estado activo cubre el contrato
	  sin pasarse de primitive. Tokens semánticos en los estilos: activo usa
	  `bg-primary text-primary-foreground`, inactivo `bg-muted text-muted-foreground`.
	-->
	<section class="space-y-3 rounded border border-border p-4">
		<h2 class="text-sm font-semibold text-foreground">Apariencia</h2>
		<p class="text-sm text-muted-foreground">
			Elige el tema. <strong>Auto</strong> sigue la preferencia del sistema operativo.
		</p>
		<div
			role="group"
			aria-label="Tema de la app"
			class="inline-flex rounded-md border border-border bg-muted p-0.5"
		>
			<button
				type="button"
				aria-pressed={theme.mode === 'auto'}
				class="rounded px-3 py-1.5 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none {theme.mode ===
				'auto'
					? 'bg-primary text-primary-foreground'
					: 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'}"
				onclick={() => theme.setMode('auto')}
			>
				Auto
			</button>
			<button
				type="button"
				aria-pressed={theme.mode === 'light'}
				class="rounded px-3 py-1.5 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none {theme.mode ===
				'light'
					? 'bg-primary text-primary-foreground'
					: 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'}"
				onclick={() => theme.setMode('light')}
			>
				Claro
			</button>
			<button
				type="button"
				aria-pressed={theme.mode === 'dark'}
				class="rounded px-3 py-1.5 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none {theme.mode ===
				'dark'
					? 'bg-primary text-primary-foreground'
					: 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'}"
				onclick={() => theme.setMode('dark')}
			>
				Oscuro
			</button>
		</div>
	</section>

	<section class="text-xs text-muted-foreground">
		<p>Versión BD: {schemaVersion ?? '…'}</p>
	</section>
</main>

<BottomNav />
