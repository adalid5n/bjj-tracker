<script lang="ts">
	/**
	 * Contenido interno del modal de POSICION (T-5).
	 *
	 * NO es un Dialog en sí — el Dialog lo provee `MapaModalHost`. Aquí
	 * solo renderizamos: header (chips de tipo + categoría), notas, y
	 * tabs por tipo de técnica que sale de la posición.
	 *
	 * Tabs implementados a mano con botones-chip (shadcn-svelte no tiene
	 * Tabs primitive instalado en este proyecto). Se renderizan solo
	 * los tipos con al menos una técnica.
	 *
	 * Cada item de técnica es clickable y hace push del modal de técnica
	 * al stack (sustituirá el placeholder cuando T-6 implemente el modal
	 * de técnica).
	 */
	import { onMount } from 'svelte';
	import type {
		CategoriaPosicion,
		Posicion,
		Tecnica,
		TipoRolPosicion,
		TipoTecnica
	} from '$lib/types';
	import { mapaModalStack } from './mapa-modal-stack.svelte';

	let { posicion }: { posicion: Posicion } = $props();

	const CATEGORIA_LABEL: Record<CategoriaPosicion, string> = {
		guardia: 'Guardia',
		control_superior: 'Control superior',
		espalda: 'Espalda',
		transicion: 'Transición',
		otro: 'Otro'
	};

	const TIPO_ROL_LABEL: Record<TipoRolPosicion, string> = {
		ofensiva: 'Ofensiva',
		defensiva: 'Defensiva',
		neutral: 'Neutral'
	};

	// Mismo patrón de chips que /mapa y /rolls (tokens semánticos).
	const TIPO_ROL_BADGE: Record<TipoRolPosicion, string> = {
		ofensiva: 'bg-success/15 text-success',
		defensiva: 'bg-destructive/15 text-destructive',
		neutral: 'bg-muted text-muted-foreground'
	};

	const TIPO_TECNICA_LABEL: Record<TipoTecnica, string> = {
		ataque: 'Ataques',
		sweep: 'Sweeps',
		escape: 'Escapes',
		transicion: 'Transiciones',
		sumision: 'Sumisiones'
	};

	// Orden de tabs en el modal (decide cuál se selecciona por defecto
	// cuando hay varios tipos con contenido).
	const TIPOS_ORDEN: TipoTecnica[] = ['ataque', 'sweep', 'escape', 'transicion', 'sumision'];

	let tecnicas = $state<Tecnica[]>([]);
	// Cache de nombres para destinos: lookup id → nombre.
	let posicionesById = $state<Record<string, string>>({});
	let sumisionesById = $state<Record<string, string>>({});
	// Cache de contras por técnica: id → count.
	let contrasCount = $state<Record<string, number>>({});
	let status: 'loading' | 'ready' | 'error' = $state('loading');
	let errorMessage = $state('');
	let activeTipo = $state<TipoTecnica | null>(null);

	onMount(async () => {
		try {
			const [{ getTecnicasByPosicion }, { listPosiciones }, { listSumisiones }, { getContras }] =
				await Promise.all([
					import('$lib/tecnicas'),
					import('$lib/posiciones'),
					import('$lib/sumisiones'),
					import('$lib/contras')
				]);

			const [tecs, todasPos, todasSum] = await Promise.all([
				getTecnicasByPosicion(posicion.id),
				listPosiciones(),
				listSumisiones()
			]);

			posicionesById = Object.fromEntries(todasPos.map((p) => [p.id, p.nombre]));
			sumisionesById = Object.fromEntries(todasSum.map((s) => [s.id, s.nombre]));
			tecnicas = tecs;

			// Contras por técnica en paralelo. Solo guardamos el count.
			const counts = await Promise.all(tecs.map((t) => getContras(t.id).then((c) => c.length)));
			contrasCount = Object.fromEntries(tecs.map((t, i) => [t.id, counts[i]]));

			// Default tab: el primer tipo (en orden TIPOS_ORDEN) con contenido.
			const conContenido = TIPOS_ORDEN.filter((tipo) => tecs.some((t) => t.tipo === tipo));
			activeTipo = conContenido[0] ?? null;
			status = 'ready';
		} catch (err) {
			errorMessage = err instanceof Error ? err.message : String(err);
			status = 'error';
			console.error('[PosicionModalContent] init failed:', err);
		}
	});

	// Tipos que tienen al menos una técnica (solo esos tabs se renderizan).
	const tiposConContenido = $derived(
		TIPOS_ORDEN.filter((tipo) => tecnicas.some((t) => t.tipo === tipo))
	);

	const tecnicasDelTab = $derived(
		activeTipo === null ? [] : tecnicas.filter((t) => t.tipo === activeTipo)
	);

	function destinoLabel(t: Tecnica): string {
		if (t.tipo === 'sumision' && t.sumision_destino_id) {
			const nombre = sumisionesById[t.sumision_destino_id] ?? '¿?';
			return `→ ${nombre} (sumisión)`;
		}
		if (t.posicion_destino_id) {
			const nombre = posicionesById[t.posicion_destino_id] ?? '¿?';
			return `→ ${nombre}`;
		}
		return '';
	}

	function contrasLabel(t: Tecnica): string {
		const n = contrasCount[t.id] ?? 0;
		if (n === 0) return 'Sin contras';
		return `${n} ${n === 1 ? 'contra' : 'contras'}`;
	}

	function pushTecnica(t: Tecnica) {
		mapaModalStack.push({ kind: 'tecnica', id: t.id, nombre: t.nombre });
	}
</script>

<!--
  Contenido del modal de posición. Va dentro de Dialog.Content
  (provisto por MapaModalHost). El título usa Dialog.Title fuera
  de este componente, así que aquí solo renderizamos chips + tabs.
-->
<div class="space-y-3">
	<!-- Chips de tipo + categoría: mismo estilo que /mapa -->
	<div class="flex flex-wrap gap-1">
		{#if posicion.tipo}
			<span class="rounded px-2 py-0.5 text-xs {TIPO_ROL_BADGE[posicion.tipo]}">
				{TIPO_ROL_LABEL[posicion.tipo]}
			</span>
		{/if}
		<span class="rounded bg-muted px-2 py-0.5 text-xs text-muted-foreground">
			{CATEGORIA_LABEL[posicion.categoria]}
		</span>
	</div>

	{#if posicion.notas.trim().length > 0}
		<p class="text-sm whitespace-pre-wrap text-muted-foreground">{posicion.notas}</p>
	{/if}

	{#if status === 'loading'}
		<p class="text-sm text-muted-foreground">Cargando técnicas…</p>
	{:else if status === 'error'}
		<div class="rounded border border-destructive/30 bg-destructive/10 p-3">
			<p class="text-sm font-semibold text-destructive">Error</p>
			<pre class="mt-1 text-xs whitespace-pre-wrap text-destructive">{errorMessage}</pre>
		</div>
	{:else if tiposConContenido.length === 0}
		<p
			class="rounded border border-dashed border-border p-6 text-center text-sm text-muted-foreground"
		>
			Aún no hay técnicas desde esta posición.
		</p>
	{:else}
		<!--
		  Tabs hechos a mano (shadcn-svelte no tiene Tabs instalado).
		  Botones-chip: el activo va en bg-primary, los demás en bg-muted.
		  Mismo lenguaje visual que los Chips del proyecto.
		-->
		<div role="tablist" aria-label="Tipo de técnica" class="flex flex-wrap gap-2">
			{#each tiposConContenido as tipo (tipo)}
				{@const isActive = tipo === activeTipo}
				<button
					type="button"
					role="tab"
					aria-selected={isActive}
					class="inline-flex items-center rounded-full border px-3 py-1 text-xs transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none {isActive
						? 'border-primary bg-primary text-primary-foreground'
						: 'border-border bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground'}"
					onclick={() => (activeTipo = tipo)}
				>
					{TIPO_TECNICA_LABEL[tipo]}
				</button>
			{/each}
		</div>

		<div role="tabpanel" class="rounded border border-border">
			<ul class="divide-y divide-border">
				{#each tecnicasDelTab as t (t.id)}
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
							<div class="mt-0.5 text-xs text-muted-foreground">{destinoLabel(t)}</div>
							<div class="mt-0.5 text-xs text-muted-foreground">{contrasLabel(t)}</div>
						</button>
					</li>
				{/each}
			</ul>
		</div>
	{/if}
</div>
