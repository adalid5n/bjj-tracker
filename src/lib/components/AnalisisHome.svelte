<script lang="ts">
	// T-4.it5: insights compactos para home. Versión reducida del
	// AnalisisPanel existente en `/rolls`:
	// - Solo C1 (problemas recurrentes). C2 (compañeros bandera) sigue
	//   solo en `/rolls` — el owner valoró que en home queremos
	//   accionable rápido para preparar próxima sesión, no análisis
	//   reflexivo de oponentes.
	// - Ventana fija de 5 sesiones (sin selector). El AnalisisPanel
	//   permite {3, 5, 10}; en home se simplifica al default.
	// - Top 3 posiciones + top 3 técnicas (resto truncado). El usuario
	//   que quiera más detalle va a `/rolls`.
	// - Sin `<details>` plegable: siempre visible.
	//
	// NO MONTADO EN HOME (decisión owner sesión 34): el owner pidió que
	// no aparezca en home por defecto, sino que quede escondido bajo un
	// toggle "Modo hobbyist vs avanzado" — feature de it.6 según el
	// backlog `MEJORAS_FUTURAS.md §Modo hobbyist vs avanzado`. Este
	// componente queda construido y listo para conectar al toggle
	// cuando se implemente esa iteración.
	import type { ProblemaTecnica, ProblemasRecurrentes } from '$lib/analisis';

	let { reloadKey = 0 }: { reloadKey?: number } = $props();

	const VENTANA = 5;
	const TOP_N = 3;

	let problemas = $state<ProblemasRecurrentes | null>(null);
	let status = $state<'loading' | 'ready' | 'error'>('loading');
	let errorMessage = $state('');

	$effect(() => {
		const _dep = reloadKey;
		void _dep;
		void load();
	});

	async function load() {
		try {
			status = 'loading';
			const { getProblemasRecurrentes } = await import('$lib/analisis');
			problemas = await getProblemasRecurrentes(VENTANA);
			status = 'ready';
		} catch (err) {
			errorMessage = err instanceof Error ? err.message : String(err);
			status = 'error';
			console.error('[AnalisisHome] load failed:', err);
		}
	}

	function tecnicaLabel(t: ProblemaTecnica): string {
		return t.variante ? `${t.nombre} (${t.variante})` : t.nombre;
	}

	const topPosiciones = $derived(problemas?.posiciones.slice(0, TOP_N) ?? []);
	const topTecnicas = $derived(problemas?.tecnicas.slice(0, TOP_N) ?? []);
	const isEmpty = $derived(
		!!problemas &&
			(problemas.sesiones_consideradas === 0 ||
				(problemas.posiciones.length === 0 && problemas.tecnicas.length === 0))
	);
</script>

<section class="space-y-2">
	<h2 class="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
		Problemas recientes
	</h2>

	{#if status === 'loading'}
		<p class="text-sm text-muted-foreground">Cargando…</p>
	{:else if status === 'error'}
		<p class="text-sm text-destructive">Error: {errorMessage}</p>
	{:else if isEmpty}
		<p class="rounded border border-dashed border-border p-3 text-center text-sm text-muted-foreground">
			Aún no hay patrones en las últimas {VENTANA} sesiones.
		</p>
	{:else}
		<div class="rounded-lg border border-border bg-card p-3 space-y-3">
			{#if topPosiciones.length > 0}
				<div class="space-y-1">
					<h3 class="text-xs font-medium text-muted-foreground">Posiciones</h3>
					<ul class="space-y-0.5">
						{#each topPosiciones as p (p.id)}
							<li class="flex items-baseline justify-between gap-2 text-sm">
								<span class="font-medium text-foreground">{p.nombre}</span>
								<span class="text-xs text-muted-foreground">{p.count}×</span>
							</li>
						{/each}
					</ul>
				</div>
			{/if}

			{#if topTecnicas.length > 0}
				<div class="space-y-1">
					<h3 class="text-xs font-medium text-muted-foreground">Técnicas</h3>
					<ul class="space-y-0.5">
						{#each topTecnicas as t (t.id)}
							<li class="flex items-baseline justify-between gap-2 text-sm">
								<span class="font-medium text-foreground">{tecnicaLabel(t)}</span>
								<span class="text-xs text-muted-foreground">
									desde {t.posicion_origen_nombre} · {t.count}×
								</span>
							</li>
						{/each}
					</ul>
				</div>
			{/if}
		</div>
	{/if}
</section>
