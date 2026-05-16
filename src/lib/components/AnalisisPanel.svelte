<script lang="ts">
	/**
	 * Panel de análisis del PoC (T-5.it2). Combina C1 (problemas
	 * recurrentes) y C2 (compañeros bandera) en un bloque plegable
	 * pensado para vivir arriba de la lista de rolls en `/rolls`.
	 *
	 * - Plegable: `<details>` nativo, expandido por defecto. Sin
	 *   persistencia entre visitas (decisión sesión 18).
	 * - C1: dos sub-listas (posiciones-fallé, técnicas-fallé) sobre las
	 *   últimas N sesiones, con N ∈ {3, 5, 10} y default 5. Selector
	 *   tipo segmented dentro del panel.
	 * - C2: lista de compañeros con `me_dominaron / total > 50%`.
	 *   Sin mínimo de rolls (configurable en futuro — anotado en
	 *   MEJORAS_FUTURAS).
	 * - Items NO clickeables al inicio (sin deep-link a /mapa por ahora).
	 *
	 * Recarga: el padre puede forzarla pasando `reloadKey` y
	 * incrementándolo (la prop participa en el `$effect` interno).
	 */

	import type {
		CompaneroProblema,
		ProblemaTecnica,
		ProblemasRecurrentes
	} from '$lib/analisis';

	let { reloadKey = 0 }: { reloadKey?: number } = $props();

	type Ventana = 3 | 5 | 10;
	const VENTANAS: Ventana[] = [3, 5, 10];

	let ventana = $state<Ventana>(5);
	let problemas = $state<ProblemasRecurrentes | null>(null);
	let companeros = $state<CompaneroProblema[]>([]);
	let status = $state<'loading' | 'ready' | 'error'>('loading');
	let errorMessage = $state('');

	$effect(() => {
		// Dependencias que disparan recarga: cambio de ventana (interno)
		// y reloadKey (externo, p.ej. tras guardar/borrar un roll).
		const _deps = [ventana, reloadKey];
		void _deps;
		void load();
	});

	async function load() {
		try {
			status = 'loading';
			const { getProblemasRecurrentes, getCompanerosProblema } = await import(
				'$lib/analisis'
			);
			const [p, c] = await Promise.all([
				getProblemasRecurrentes(ventana),
				getCompanerosProblema()
			]);
			problemas = p;
			companeros = c;
			status = 'ready';
		} catch (err) {
			errorMessage = err instanceof Error ? err.message : String(err);
			status = 'error';
			console.error('[AnalisisPanel] load failed:', err);
		}
	}

	function tecnicaLabel(t: ProblemaTecnica): string {
		return t.variante ? `${t.nombre} (${t.variante})` : t.nombre;
	}
</script>

<details open class="rounded border border-border bg-card">
	<summary
		class="cursor-pointer px-3 py-2 text-sm font-medium text-foreground select-none"
	>
		Análisis
	</summary>
	<div class="space-y-4 border-t border-border p-3">
		<!-- Selector de ventana N para C1 (C2 ignora N). -->
		<div class="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
			<span>Últimas</span>
			<div
				role="tablist"
				aria-label="Ventana de sesiones para problemas recurrentes"
				class="inline-flex rounded-md border border-border bg-muted p-0.5"
			>
				{#each VENTANAS as n (n)}
					<button
						type="button"
						role="tab"
						aria-selected={ventana === n}
						class="rounded px-2 py-0.5 text-xs font-medium transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none {ventana ===
						n
							? 'bg-background text-foreground shadow-sm'
							: 'text-muted-foreground hover:text-foreground'}"
						onclick={() => (ventana = n)}
					>
						{n}
					</button>
				{/each}
			</div>
			<span>sesiones</span>
		</div>

		{#if status === 'loading'}
			<p class="text-sm text-muted-foreground">Cargando…</p>
		{:else if status === 'error'}
			<div class="rounded border border-destructive/30 bg-destructive/10 p-2">
				<p class="text-sm font-medium text-destructive">Error al cargar análisis</p>
				<pre
					class="mt-1 text-xs whitespace-pre-wrap text-destructive">{errorMessage}</pre>
			</div>
		{:else if problemas}
			<!-- C1: problemas recurrentes -->
			<section class="space-y-2">
				<h3 class="text-sm font-medium text-foreground">
					Problemas recurrentes
					{#if problemas.sesiones_consideradas > 0 && problemas.sesiones_consideradas < ventana}
						<span class="text-xs font-normal text-muted-foreground">
							(solo {problemas.sesiones_consideradas}
							{problemas.sesiones_consideradas === 1 ? 'sesión' : 'sesiones'} en BD)
						</span>
					{/if}
				</h3>

				{#if problemas.sesiones_consideradas === 0}
					<p class="text-sm text-muted-foreground">
						Aún no hay sesiones registradas.
					</p>
				{:else if problemas.posiciones.length === 0 && problemas.tecnicas.length === 0}
					<p class="text-sm text-muted-foreground">
						Sin posiciones ni técnicas marcadas como fallé en las últimas {problemas.sesiones_consideradas}
						{problemas.sesiones_consideradas === 1 ? 'sesión' : 'sesiones'}.
					</p>
				{:else}
					{#if problemas.posiciones.length > 0}
						<div class="space-y-1">
							<h4 class="text-xs font-medium text-muted-foreground">Posiciones</h4>
							<ul class="space-y-0.5 pl-2">
								{#each problemas.posiciones as p (p.id)}
									<li class="text-sm">
										<span class="font-medium text-foreground">{p.nombre}</span>
										<span class="text-muted-foreground"> · {p.count}×</span>
									</li>
								{/each}
							</ul>
						</div>
					{/if}
					{#if problemas.tecnicas.length > 0}
						<div class="space-y-1">
							<h4 class="text-xs font-medium text-muted-foreground">Técnicas</h4>
							<ul class="space-y-0.5 pl-2">
								{#each problemas.tecnicas as t (t.id)}
									<li class="text-sm">
										<span class="font-medium text-foreground">{tecnicaLabel(t)}</span>
										<span class="text-muted-foreground">
											· desde {t.posicion_origen_nombre} · {t.count}×
										</span>
									</li>
								{/each}
							</ul>
						</div>
					{/if}
				{/if}
			</section>

			<!-- C2: compañeros bandera -->
			<section class="space-y-2">
				<h3 class="text-sm font-medium text-foreground">Compañeros bandera</h3>
				{#if companeros.length === 0}
					<p class="text-sm text-muted-foreground">
						Sin compañeros con más del 50% de derrotas.
					</p>
				{:else}
					<ul class="space-y-2">
						{#each companeros as c (c.companero_id)}
							<li class="rounded border border-warning/30 bg-warning/5 p-2">
								<div class="flex items-baseline justify-between gap-2">
									<span class="font-medium text-foreground">{c.companero_nombre}</span>
									<span class="text-xs text-warning">
										{Math.round(c.pct * 100)}% · {c.derrotas}/{c.total_rolls}
									</span>
								</div>
								{#if c.posiciones_donde_pierdo.length > 0}
									<p class="mt-1 text-xs text-muted-foreground">
										Pierdo en:
										{#each c.posiciones_donde_pierdo as p, i (p.id)}<span
												class="text-foreground">{p.nombre}</span
											>{i < c.posiciones_donde_pierdo.length - 1 ? ', ' : ''}{/each}
									</p>
								{:else}
									<p class="mt-1 text-xs italic text-muted-foreground">
										Sin posición registrada en los rolls perdidos.
									</p>
								{/if}
							</li>
						{/each}
					</ul>
				{/if}
			</section>
		{/if}
	</div>
</details>
