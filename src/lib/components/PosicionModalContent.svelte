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
	import { Button, buttonVariants } from '$lib/components/ui/button';
	import * as AlertDialog from '$lib/components/ui/alert-dialog';
	import * as Tooltip from '$lib/components/ui/tooltip';
	import type {
		CategoriaPosicion,
		Posicion,
		Tecnica,
		TipoRolPosicion,
		TipoTecnica
	} from '$lib/types';
	import { mapaModalStack } from './mapa-modal-stack.svelte';

	let { posicion, onChanged }: { posicion: Posicion; onChanged?: () => void } = $props();

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
	// Vista del oponente (ADR-002): técnicas que el rival puede aplicar desde
	// la posición complementaria. Si la posición no tiene complementaria,
	// estos quedan en null/vacío y la sección no se renderiza.
	let complementaria = $state<Posicion | null>(null);
	let tecnicasOponente = $state<Tecnica[]>([]);
	let activeTipoOponente = $state<TipoTecnica | null>(null);
	// Rolls que referencian esta posición como "problema". Se usa para
	// decidir si el botón Borrar está habilitado (desktop only).
	let rollsProblemaCount = $state<number>(0);
	let deleting = $state(false);
	// AlertDialog de confirmación de borrado (sustituye al `confirm()`
	// nativo del agente previo). bits-ui controla el overlay del
	// AlertDialog sin chocar con el Dialog que monta `MapaModalHost`.
	let mostrarConfirmBorrar = $state(false);

	onMount(async () => {
		try {
			const [
				{ getTecnicasByPosicion },
				{ listPosiciones },
				{ listSumisiones },
				{ getContras },
				{ countRollsByPosicionProblema }
			] = await Promise.all([
				import('$lib/tecnicas'),
				import('$lib/posiciones'),
				import('$lib/sumisiones'),
				import('$lib/contras'),
				import('$lib/rolls')
			]);

			const [tecs, todasPos, todasSum, rollsCount] = await Promise.all([
				getTecnicasByPosicion(posicion.id),
				listPosiciones(),
				listSumisiones(),
				countRollsByPosicionProblema(posicion.id)
			]);

			posicionesById = Object.fromEntries(todasPos.map((p) => [p.id, p.nombre]));
			sumisionesById = Object.fromEntries(todasSum.map((s) => [s.id, s.nombre]));
			tecnicas = tecs;
			rollsProblemaCount = rollsCount;

			// Contras por técnica en paralelo. Solo guardamos el count.
			const counts = await Promise.all(tecs.map((t) => getContras(t.id).then((c) => c.length)));
			contrasCount = Object.fromEntries(tecs.map((t, i) => [t.id, counts[i]]));

			// Default tab: el primer tipo (en orden TIPOS_ORDEN) con contenido.
			const conContenido = TIPOS_ORDEN.filter((tipo) => tecs.some((t) => t.tipo === tipo));
			activeTipo = conContenido[0] ?? null;

			// Vista del oponente: si la posición tiene complementaria, carga
			// la posición complementaria y las técnicas que salen de ella.
			if (posicion.posicion_complementaria_id) {
				const comp = todasPos.find((p) => p.id === posicion.posicion_complementaria_id) ?? null;
				complementaria = comp;
				if (comp) {
					const tecsOp = await getTecnicasByPosicion(comp.id);
					tecnicasOponente = tecsOp;
					const conContenidoOp = TIPOS_ORDEN.filter((tipo) =>
						tecsOp.some((t) => t.tipo === tipo)
					);
					activeTipoOponente = conContenidoOp[0] ?? null;
					// Extiende `contrasCount` con las técnicas del oponente para
					// que `contrasLabel` funcione también en esa sección.
					const countsOp = await Promise.all(
						tecsOp.map((t) => getContras(t.id).then((c) => c.length))
					);
					contrasCount = {
						...contrasCount,
						...Object.fromEntries(tecsOp.map((t, i) => [t.id, countsOp[i]]))
					};
				}
			}

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

	// Análogos para la vista del oponente.
	const tiposConContenidoOponente = $derived(
		TIPOS_ORDEN.filter((tipo) => tecnicasOponente.some((t) => t.tipo === tipo))
	);
	const tecnicasOponenteDelTab = $derived(
		activeTipoOponente === null
			? []
			: tecnicasOponente.filter((t) => t.tipo === activeTipoOponente)
	);

	function pushComplementaria() {
		if (!complementaria) return;
		// "Saltar a la complementaria" = navegar a otro nodo del mapa, NO
		// abrir un sub-modal encima. Sin reset, alternar A ↔ B ↔ A apila el
		// breadcrumb indefinidamente. Reiniciamos el stack para que el modal
		// de la complementaria quede como nivel raíz.
		mapaModalStack.closeAll();
		mapaModalStack.push({
			kind: 'posicion',
			id: complementaria.id,
			nombre: complementaria.nombre
		});
	}

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

	// Total de referencias que bloquean el borrado. Si > 0 → botón deshabilitado.
	const refsBloqueantes = $derived(tecnicas.length + rollsProblemaCount);
	const motivoBloqueoBorrado = $derived(
		tecnicas.length > 0 && rollsProblemaCount > 0
			? `Esta posición tiene ${tecnicas.length} técnica(s) y ${rollsProblemaCount} roll(s) asociados. Borra esas referencias antes.`
			: tecnicas.length > 0
				? `Esta posición tiene ${tecnicas.length} técnica(s) asociada(s). Borra esas referencias antes.`
				: rollsProblemaCount > 0
					? `Esta posición está referenciada por ${rollsProblemaCount} roll(s) como problema. Borra esas referencias antes.`
					: ''
	);

	function handleEdit() {
		mapaModalStack.push({
			kind: 'wizard-posicion',
			modo: 'editar',
			id: posicion.id,
			nombre: `Editar: ${posicion.nombre}`
		});
	}

	function handleAddTecnica() {
		// Acceso canónico al wizard de técnica (T-10): desde el modal de
		// la posición, con el origen prefill. El usuario puede cambiar el
		// origen dentro del wizard si quiere; el prefill solo guía.
		mapaModalStack.push({
			kind: 'wizard-tecnica',
			modo: 'crear',
			nombre: `Nueva técnica desde ${posicion.nombre}`,
			posicionOrigenId: posicion.id
		});
	}

	function handleDeleteClick() {
		if (refsBloqueantes > 0) return;
		mostrarConfirmBorrar = true;
	}

	async function handleConfirmDelete() {
		if (refsBloqueantes > 0) return;
		deleting = true;
		try {
			const { deletePosicion } = await import('$lib/posiciones');
			await deletePosicion(posicion.id);
			onChanged?.();
			mostrarConfirmBorrar = false;
			mapaModalStack.closeAll();
		} catch (err) {
			errorMessage = err instanceof Error ? err.message : String(err);
			status = 'error';
		} finally {
			deleting = false;
		}
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

	<!--
	  Vista del oponente (ADR-002): si la posición tiene una complementaria
	  registrada, mostramos qué técnicas puede aplicar el oponente desde
	  ese otro lado. Patrón visual idéntico a la sección de técnicas propias:
	  tabs por tipo + lista clickable. Cada item navega al modal de la
	  técnica del oponente vía el stack — el usuario puede recorrer las dos
	  vistas del mismo nodo físico sin recargar.
	-->
	{#if status === 'ready' && complementaria}
		<div class="mt-4 border-t border-border pt-3">
			<div class="mb-2 flex items-center justify-between gap-2">
				<h3 class="text-sm font-semibold">
					Vista del oponente <span class="text-muted-foreground">— desde</span>
					{complementaria.nombre}
				</h3>
				<Button variant="outline" size="sm" onclick={pushComplementaria}>
					Ir a {complementaria.nombre} →
				</Button>
			</div>

			{#if tiposConContenidoOponente.length === 0}
				<p
					class="rounded border border-dashed border-border p-4 text-center text-sm text-muted-foreground"
				>
					Aún no hay técnicas desde {complementaria.nombre}.
				</p>
			{:else}
				<div role="tablist" aria-label="Tipo de técnica del oponente" class="flex flex-wrap gap-2">
					{#each tiposConContenidoOponente as tipo (tipo)}
						{@const isActive = tipo === activeTipoOponente}
						<button
							type="button"
							role="tab"
							aria-selected={isActive}
							class="inline-flex items-center rounded-full border px-3 py-1 text-xs transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none {isActive
								? 'border-primary bg-primary text-primary-foreground'
								: 'border-border bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground'}"
							onclick={() => (activeTipoOponente = tipo)}
						>
							{TIPO_TECNICA_LABEL[tipo]}
						</button>
					{/each}
				</div>

				<div role="tabpanel" class="mt-2 rounded border border-border">
					<ul class="divide-y divide-border">
						{#each tecnicasOponenteDelTab as t (t.id)}
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
	{/if}

	<!--
	  "+ Añadir técnica desde aquí" (T-10): acceso canónico al wizard de
	  técnica. Visible cuando los datos están listos (status === 'ready'),
	  tanto si hay técnicas como si no — la vacía sirve también como CTA.
	  El wizard recibe `posicionOrigenId` prefill.
	-->
	{#if status === 'ready'}
		<div class="pt-1">
			<Button variant="outline" size="sm" onclick={handleAddTecnica}>
				+ Nueva técnica desde esta posición
			</Button>
		</div>
	{/if}

	<!--
	  Acciones editar / borrar. Visibles también en móvil (cambio de
	  scope T-8 fixes D: el stakeholder captura técnicas desde móvil).
	  El botón Borrar se deshabilita si hay técnicas saliendo o rolls
	  referenciando la posición como problema; en ese caso un Tooltip
	  envuelve un `<span>` (los buttons disabled no emiten hover, el
	  span sí) para mostrar el motivo del bloqueo de forma accesible.
	-->
	{#if status === 'ready'}
		<div class="mt-3 flex justify-end gap-2 border-t border-border pt-3">
			<Button variant="outline" size="sm" onclick={handleEdit} disabled={deleting}>
				Editar
			</Button>
			{#if refsBloqueantes > 0}
				<Tooltip.Provider>
					<Tooltip.Root>
						<Tooltip.Trigger>
							{#snippet child({ props })}
								<span {...props} class="inline-flex">
									<Button variant="destructive" size="sm" disabled>Borrar</Button>
								</span>
							{/snippet}
						</Tooltip.Trigger>
						<Tooltip.Content>{motivoBloqueoBorrado}</Tooltip.Content>
					</Tooltip.Root>
				</Tooltip.Provider>
			{:else}
				<Button
					variant="destructive"
					size="sm"
					onclick={handleDeleteClick}
					disabled={deleting}
				>
					{deleting ? 'Borrando…' : 'Borrar'}
				</Button>
			{/if}
		</div>
	{/if}
</div>

<!--
  AlertDialog para confirmar borrado (cambio F1). Sustituye al `confirm()`
  nativo. bits-ui maneja correctamente su propio overlay sobre el Dialog
  principal del host.
-->
<AlertDialog.Root bind:open={mostrarConfirmBorrar}>
	<AlertDialog.Content>
		<AlertDialog.Header>
			<AlertDialog.Title>Borrar posición</AlertDialog.Title>
			<AlertDialog.Description>
				¿Borrar definitivamente «{posicion.nombre}»? No se puede deshacer.
			</AlertDialog.Description>
		</AlertDialog.Header>
		<AlertDialog.Footer>
			<AlertDialog.Cancel disabled={deleting}>Cancelar</AlertDialog.Cancel>
			<AlertDialog.Action
				onclick={handleConfirmDelete}
				disabled={deleting}
				class={buttonVariants({ variant: 'destructive' })}
			>
				{deleting ? 'Borrando…' : 'Borrar'}
			</AlertDialog.Action>
		</AlertDialog.Footer>
	</AlertDialog.Content>
</AlertDialog.Root>
