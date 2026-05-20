<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import Fab from '$lib/components/Fab.svelte';
	import BottomNav from '$lib/components/BottomNav.svelte';
	import SesionEditor from '$lib/components/SesionEditor.svelte';
	import MonthCalendar from '$lib/components/MonthCalendar.svelte';
	import AnalisisHome from '$lib/components/AnalisisHome.svelte';
	import { settings } from '$lib/settings.svelte';
	import { VERSION } from '$lib/version';
	import { dayHeaderLabel, todayIso } from '$lib/day-headers';
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
	let diaSeleccionado = $state(todayIso());
	let initialized = $state(false);

	const DIA_STORAGE_KEY = 'home:diaSeleccionado';

	onMount(async () => {
		// T-2.it6: hidrata el state de settings (modo avanzado) en background.
		// Sin `await` para no retrasar la pintura inicial — el componente
		// `AnalisisHome` solo se renderiza si `settings.modoAvanzado` es true,
		// y el getter es reactivo, así que aparecerá cuando el promise resuelva.
		void settings.init();

		// Restaurar día seleccionado desde sessionStorage si existe y es
		// válido. Persistencia por tab: al navegar a /sesion/[id] y volver,
		// el día se mantiene. Si el user cierra el tab y vuelve, default
		// a hoy (sessionStorage se limpia al cerrar tab). Esto evita el
		// reseteo a hoy reportado por el owner en sesión 34.
		try {
			const stored = sessionStorage.getItem(DIA_STORAGE_KEY);
			if (stored && /^\d{4}-\d{2}-\d{2}$/.test(stored)) {
				diaSeleccionado = stored;
			}
		} catch {
			// sessionStorage puede fallar en modos privados restrictivos; ignorar.
		}
		initialized = true;

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

	// Persistir cambios en `diaSeleccionado` a sessionStorage. La flag
	// `initialized` evita que el effect escriba el default `todayIso()`
	// sobre el valor stored antes de que onMount haya tenido oportunidad
	// de restaurarlo.
	$effect(() => {
		const v = diaSeleccionado;
		if (!initialized) return;
		try {
			sessionStorage.setItem(DIA_STORAGE_KEY, v);
		} catch {
			// ignorar
		}
	});

	// T-1.it5: sesiones filtradas por el día seleccionado en el calendario.
	// `listSesiones` ya devuelve ORDER BY s.fecha DESC, s.created_at DESC,
	// así que las del mismo día llegan en orden de captura descendente.
	const sesionesDelDia = $derived(sesiones.filter((s) => s.fecha === diaSeleccionado));

	// T-2.it5: Set de fechas ISO con al menos 1 sesión, para markers del
	// calendario. Reactivo: se recalcula al cambiar `sesiones` (tras crear
	// o borrar). Set es eficiente para el lookup `markers.has(iso)` que
	// hace MonthCalendar por cada cell.
	const diasConSesion = $derived(new Set(sesiones.map((s) => s.fecha)));

	// T-3.it5: stats chip de la semana en curso (Lun-Dom).
	// "Esta semana" = lunes a domingo del día actual (no rolling 7 days).
	const statsSemana = $derived.by(() => {
		const now = new Date();
		const dow = now.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
		const offsetToMonday = dow === 0 ? 6 : dow - 1;
		const monday = new Date(now);
		monday.setDate(now.getDate() - offsetToMonday);
		const sunday = new Date(monday);
		sunday.setDate(monday.getDate() + 6);
		const fmt = (d: Date) =>
			`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
		const start = fmt(monday);
		const end = fmt(sunday);
		const ses = sesiones.filter((s) => s.fecha >= start && s.fecha <= end);
		return {
			sesiones: ses.length,
			rolls: ses.reduce((acc, s) => acc + s.rolls_count, 0)
		};
	});

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

<main class="mx-auto min-h-[calc(100vh+200px)] max-w-2xl space-y-4 p-4 pb-32 [overflow-anchor:none] [&_*]:[overflow-anchor:none]">
	{#if status === 'loading'}
		<p class="text-primary">Cargando…</p>
	{:else if status === 'error'}
		<div class="rounded border border-destructive/30 bg-destructive/10 p-3">
			<p class="font-semibold text-destructive">Error cargando sesiones</p>
			<pre class="mt-2 text-sm whitespace-pre-wrap text-destructive">{errorMessage}</pre>
		</div>
	{:else}
		{#if statsSemana.sesiones > 0}
			<p class="text-center text-xs text-muted-foreground">
				{statsSemana.sesiones}
				{statsSemana.sesiones === 1 ? 'sesión' : 'sesiones'} · {statsSemana.rolls}
				{statsSemana.rolls === 1 ? 'roll' : 'rolls'} esta semana
			</p>
		{/if}

		<MonthCalendar
			selectedDate={diaSeleccionado}
			onSelectDate={(iso) => (diaSeleccionado = iso)}
			markers={diasConSesion}
		/>

		<section class="space-y-2">
			<h2 class="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
				{dayHeaderLabel(diaSeleccionado)}
			</h2>
			{#if sesionesDelDia.length === 0}
				<p class="rounded border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
					Sin sesiones este día
				</p>
			{:else}
				<ul
					class={settings.modoAvanzado
						? 'space-y-2 max-h-48 overflow-y-auto pr-1'
						: 'space-y-2'}
				>
					{#each sesionesDelDia as s (s.id)}
						<li>
							<a
								href={resolve(`/sesion/${s.id}`)}
								class="block rounded-lg border border-border bg-card p-3 shadow-xs transition-colors hover:bg-accent"
							>
								<div class="flex items-baseline justify-between">
									<span class="font-medium">{TIPO_LABEL[s.tipo]}</span>
									<span class="text-xs text-muted-foreground">
										{s.rolls_count}
										{s.rolls_count === 1 ? 'roll' : 'rolls'}
									</span>
								</div>
								{#if settings.modoAvanzado && s.foco}
									<p class="mt-1 text-xs text-muted-foreground">{s.foco}</p>
								{/if}
							</a>
						</li>
					{/each}
				</ul>
			{/if}
		</section>

		{#if settings.modoAvanzado}
			<AnalisisHome reloadKey={sesiones.length} />
		{/if}
	{/if}

	<p class="pt-4 text-center text-xs text-muted-foreground/60">v{VERSION}</p>
</main>

{#if status === 'ready'}
	<Fab onclick={openCreate} label="Nueva sesión" />
{/if}

<BottomNav />

<SesionEditor bind:open={editorOpen} onSave={handleSesionSave} defaultFecha={diaSeleccionado} />
