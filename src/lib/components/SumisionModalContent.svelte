<script lang="ts">
	/**
	 * Contenido interno del modal de SUMISION terminal (T-7).
	 *
	 * NO es un Dialog en sí — el Dialog lo provee `MapaModalHost`. Aquí
	 * solo renderizamos: notas y la lista de técnicas que terminan en
	 * esta sumisión, agrupadas por posición de origen.
	 *
	 * Decisión: NO chip de "Sumisión terminal" en el header. El Dialog.Title
	 * ya muestra el nombre y la sección "Variaciones que terminan aquí"
	 * deja claro el rol del nodo. Un chip extra es ruido visual.
	 *
	 * Orden de grupos: alfabético por nombre de posición de origen
	 * (decisión confirmada por stakeholder).
	 */
	import { onMount } from 'svelte';
	import type { Posicion, SumisionTerminal, Tecnica } from '$lib/types';
	import { mapaModalStack } from './mapa-modal-stack.svelte';

	let { sumision }: { sumision: SumisionTerminal } = $props();

	let tecnicas = $state<Tecnica[]>([]);
	// Cache id → nombre de posición de origen, para subtítulos de grupo.
	let posicionesById = $state<Record<string, string>>({});
	let status: 'loading' | 'ready' | 'error' = $state('loading');
	let errorMessage = $state('');

	onMount(async () => {
		try {
			const [{ getTecnicasQueLleganASumision }, { listPosiciones }] = await Promise.all([
				import('$lib/tecnicas'),
				import('$lib/posiciones')
			]);

			const [tecs, todasPos] = await Promise.all([
				getTecnicasQueLleganASumision(sumision.id),
				listPosiciones()
			]);

			tecnicas = tecs;
			posicionesById = Object.fromEntries(todasPos.map((p: Posicion) => [p.id, p.nombre]));

			status = 'ready';
		} catch (err) {
			errorMessage = err instanceof Error ? err.message : String(err);
			status = 'error';
			console.error('[SumisionModalContent] init failed:', err);
		}
	});

	// Agrupa las técnicas por `posicion_origen_id`. Cada grupo conserva
	// el orden interno que viene de la query (por nombre). Los grupos
	// se ordenan alfabéticamente por nombre de la posición de origen.
	type Grupo = { origenId: string; origenNombre: string; tecnicas: Tecnica[] };

	const gruposOrdenados = $derived.by<Grupo[]>(() => {
		const map = new Map<string, Tecnica[]>();
		for (const t of tecnicas) {
			const lista = map.get(t.posicion_origen_id);
			if (lista) {
				lista.push(t);
			} else {
				map.set(t.posicion_origen_id, [t]);
			}
		}
		const grupos: Grupo[] = [];
		for (const [origenId, lista] of map) {
			grupos.push({
				origenId,
				origenNombre: posicionesById[origenId] ?? '(posición eliminada)',
				tecnicas: lista
			});
		}
		grupos.sort((a, b) => a.origenNombre.localeCompare(b.origenNombre));
		return grupos;
	});

	function pushTecnica(t: Tecnica) {
		mapaModalStack.push({ kind: 'tecnica', id: t.id, nombre: t.nombre });
	}
</script>

<!--
  Contenido del modal de sumisión terminal. Va dentro de Dialog.Content
  (provisto por MapaModalHost). El Dialog.Title con sumision.nombre lo
  renderiza el host.
-->
<div class="space-y-3">
	{#if sumision.notas.trim().length > 0}
		<p class="text-sm whitespace-pre-wrap text-muted-foreground">{sumision.notas}</p>
	{/if}

	{#if status === 'loading'}
		<p class="text-sm text-muted-foreground">Cargando sumisión…</p>
	{:else if status === 'error'}
		<div class="rounded border border-destructive/30 bg-destructive/10 p-3">
			<p class="text-sm font-semibold text-destructive">Error</p>
			<pre class="mt-1 text-xs whitespace-pre-wrap text-destructive">{errorMessage}</pre>
		</div>
	{:else}
		<div>
			<h3 class="text-sm font-semibold">
				Variaciones que terminan aquí
				<span class="text-muted-foreground">({tecnicas.length})</span>
			</h3>

			{#if tecnicas.length === 0}
				<p class="mt-1 text-sm text-muted-foreground">Aún no hay técnicas que lleven aquí.</p>
			{:else}
				<div class="mt-2 space-y-3">
					{#each gruposOrdenados as grupo (grupo.origenId)}
						<section>
							<h4 class="text-sm font-semibold text-foreground">{grupo.origenNombre}</h4>
							<div class="mt-1 rounded border border-border">
								<ul class="divide-y divide-border">
									{#each grupo.tecnicas as t (t.id)}
										<li>
											<button
												type="button"
												class="block w-full p-3 text-left transition-colors hover:bg-accent focus-visible:bg-accent focus-visible:outline-none"
												onclick={() => pushTecnica(t)}
											>
												<div class="font-medium">
													{t.nombre}{#if t.variante}<span class="text-muted-foreground"
															> ({t.variante})</span
														>{/if}
												</div>
											</button>
										</li>
									{/each}
								</ul>
							</div>
						</section>
					{/each}
				</div>
			{/if}
		</div>
	{/if}
</div>
