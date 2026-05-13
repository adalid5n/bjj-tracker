<script lang="ts">
	/**
	 * Contenido interno del modal de TECNICA (T-6).
	 *
	 * NO es un Dialog en sí — el Dialog lo provee `MapaModalHost`. Aquí
	 * solo renderizamos: chips (tipo + estado + variante), origen, destino,
	 * setup, errores comunes, contras conocidas y otras variantes.
	 *
	 * Cada navegación (origen, destino, contra, otra variante) hace push
	 * al `mapaModalStack` para que el host renderice el siguiente nivel.
	 *
	 * Patrón idéntico al de `PosicionModalContent`: carga en paralelo en
	 * `onMount`, estados loading/ready/error.
	 */
	import { onMount } from 'svelte';
	import { Button, buttonVariants } from '$lib/components/ui/button';
	import * as AlertDialog from '$lib/components/ui/alert-dialog';
	import * as Tooltip from '$lib/components/ui/tooltip';
	import type {
		EstadoTecnica,
		Posicion,
		SumisionTerminal,
		Tecnica,
		TipoTecnica
	} from '$lib/types';
	import { mapaModalStack } from './mapa-modal-stack.svelte';

	let { tecnica, onChanged }: { tecnica: Tecnica; onChanged?: () => void } = $props();

	const TIPO_TECNICA_LABEL: Record<TipoTecnica, string> = {
		ataque: 'Ataque',
		sweep: 'Sweep',
		escape: 'Escape',
		transicion: 'Transición',
		sumision: 'Sumisión'
	};

	// Tokens semánticos del proyecto. Decisión:
	//   ataque → primary  (la acción ofensiva por defecto del mapa)
	//   sweep → success   (cambia el control a tu favor → positivo)
	//   escape → warning  (resuelves un mal sitio → señal de alerta)
	//   transicion → muted (movimiento neutro entre nodos)
	//   sumision → destructive (acaba la partida; mismo lenguaje que un
	//                           "kill" en otros UIs)
	const TIPO_TECNICA_BADGE: Record<TipoTecnica, string> = {
		ataque: 'bg-primary/15 text-primary',
		sweep: 'bg-success/15 text-success',
		escape: 'bg-warning/15 text-warning',
		transicion: 'bg-muted text-muted-foreground',
		sumision: 'bg-destructive/15 text-destructive'
	};

	const ESTADO_LABEL: Record<EstadoTecnica, string> = {
		probando: 'Probando',
		funciona: 'Funciona',
		descartada: 'Descartada'
	};

	const ESTADO_BADGE: Record<EstadoTecnica, string> = {
		probando: 'bg-warning/15 text-warning',
		funciona: 'bg-success/15 text-success',
		descartada: 'bg-muted text-muted-foreground'
	};

	// Origen siempre es Posicion. Destino puede ser Posicion o SumisionTerminal.
	let origen = $state<Posicion | null>(null);
	let destinoPosicion = $state<Posicion | null>(null);
	let destinoSumision = $state<SumisionTerminal | null>(null);
	let contras = $state<Tecnica[]>([]);
	let otrasVariantes = $state<Tecnica[]>([]);
	// Cache id → nombre para mostrar el origen de cada contra / variante.
	let posicionesById = $state<Record<string, string>>({});
	let status: 'loading' | 'ready' | 'error' = $state('loading');
	let errorMessage = $state('');
	// Técnicas que tienen ESTA técnica como su contra. Bloquea el borrado
	// (decisión del proyecto: borrar prohibido si hay referencias). Mismo
	// patrón que `tecnicasCount` en `SumisionModalContent`.
	let contrasIncomingCount = $state<number>(0);
	let deleting = $state(false);
	let mostrarConfirmBorrar = $state(false);

	onMount(async () => {
		try {
			const [
				{ getPosicion, listPosiciones },
				{ getSumision },
				{ getContras, countContrasIncoming },
				{ getOtrasVariantes }
			] = await Promise.all([
				import('$lib/posiciones'),
				import('$lib/sumisiones'),
				import('$lib/contras'),
				import('$lib/tecnicas')
			]);

			const destinoPromise: Promise<Posicion | SumisionTerminal | null> =
				tecnica.tipo === 'sumision' && tecnica.sumision_destino_id
					? getSumision(tecnica.sumision_destino_id)
					: tecnica.posicion_destino_id
						? getPosicion(tecnica.posicion_destino_id)
						: Promise.resolve(null);

			const [origenRes, destinoRes, contrasRes, variantesRes, todasPos, incomingCount] =
				await Promise.all([
					getPosicion(tecnica.posicion_origen_id),
					destinoPromise,
					getContras(tecnica.id),
					getOtrasVariantes(tecnica.nombre, tecnica.id),
					listPosiciones(),
					countContrasIncoming(tecnica.id)
				]);

			origen = origenRes;
			if (tecnica.tipo === 'sumision') {
				destinoSumision = destinoRes as SumisionTerminal | null;
			} else {
				destinoPosicion = destinoRes as Posicion | null;
			}
			contras = contrasRes;
			otrasVariantes = variantesRes;
			posicionesById = Object.fromEntries(todasPos.map((p) => [p.id, p.nombre]));
			contrasIncomingCount = incomingCount;

			status = 'ready';
		} catch (err) {
			errorMessage = err instanceof Error ? err.message : String(err);
			status = 'error';
			console.error('[TecnicaModalContent] init failed:', err);
		}
	});

	function pushPosicion(p: Posicion) {
		mapaModalStack.push({ kind: 'posicion', id: p.id, nombre: p.nombre });
	}

	function pushSumision(s: SumisionTerminal) {
		mapaModalStack.push({ kind: 'sumision', id: s.id, nombre: s.nombre });
	}

	function pushTecnica(t: Tecnica) {
		mapaModalStack.push({ kind: 'tecnica', id: t.id, nombre: t.nombre });
	}

	const motivoBloqueoBorrado = $derived(
		contrasIncomingCount > 0
			? `Esta técnica es contra de ${contrasIncomingCount} técnica(s). Quita esas referencias antes.`
			: ''
	);

	function handleEdit() {
		mapaModalStack.push({
			kind: 'wizard-tecnica',
			modo: 'editar',
			id: tecnica.id,
			nombre: `Editar: ${tecnica.nombre}`
		});
	}

	function handleDeleteClick() {
		if (contrasIncomingCount > 0) return;
		mostrarConfirmBorrar = true;
	}

	async function handleConfirmDelete() {
		if (contrasIncomingCount > 0) return;
		deleting = true;
		try {
			const { deleteTecnica } = await import('$lib/tecnicas');
			await deleteTecnica(tecnica.id);
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
  Contenido del modal de técnica. Va dentro de Dialog.Content (provisto
  por MapaModalHost). El Dialog.Title con tecnica.nombre lo renderiza
  el host; aquí empezamos por la fila de chips.
-->
<div class="space-y-3">
	<!-- Chips de tipo + estado + (opcional) variante -->
	<div class="flex flex-wrap gap-1">
		<span class="rounded px-2 py-0.5 text-xs {TIPO_TECNICA_BADGE[tecnica.tipo]}">
			{TIPO_TECNICA_LABEL[tecnica.tipo]}
		</span>
		<span class="rounded px-2 py-0.5 text-xs {ESTADO_BADGE[tecnica.estado]}">
			{ESTADO_LABEL[tecnica.estado]}
		</span>
		{#if tecnica.variante}
			<span class="rounded bg-muted px-2 py-0.5 text-xs text-muted-foreground">
				var: {tecnica.variante}
			</span>
		{/if}
	</div>

	{#if status === 'loading'}
		<p class="text-sm text-muted-foreground">Cargando técnica…</p>
	{:else if status === 'error'}
		<div class="rounded border border-destructive/30 bg-destructive/10 p-3">
			<p class="text-sm font-semibold text-destructive">Error</p>
			<pre class="mt-1 text-xs whitespace-pre-wrap text-destructive">{errorMessage}</pre>
		</div>
	{:else}
		<!-- Origen -->
		<div class="text-sm">
			<span class="text-muted-foreground">Origen:</span>
			{#if origen}
				<button
					type="button"
					class="ml-1 rounded font-medium hover:underline focus-visible:underline focus-visible:outline-none"
					onclick={() => pushPosicion(origen!)}
				>
					{origen.nombre}
				</button>
			{:else}
				<span class="ml-1 text-muted-foreground">(posición eliminada)</span>
			{/if}
		</div>

		<!-- Destino -->
		<div class="text-sm">
			<span class="text-muted-foreground">Destino:</span>
			{#if tecnica.tipo === 'sumision'}
				{#if destinoSumision}
					<button
						type="button"
						class="ml-1 rounded font-medium hover:underline focus-visible:underline focus-visible:outline-none"
						onclick={() => pushSumision(destinoSumision!)}
					>
						{destinoSumision.nombre}<span class="text-muted-foreground"> (sumisión)</span>
					</button>
				{:else}
					<span class="ml-1 text-muted-foreground">(sumisión eliminada)</span>
				{/if}
			{:else if destinoPosicion}
				<button
					type="button"
					class="ml-1 rounded font-medium hover:underline focus-visible:underline focus-visible:outline-none"
					onclick={() => pushPosicion(destinoPosicion!)}
				>
					{destinoPosicion.nombre}
				</button>
			{:else}
				<span class="ml-1 text-muted-foreground">(posición eliminada)</span>
			{/if}
		</div>

		<!-- Setup / detalles -->
		{#if tecnica.detalles.trim().length > 0}
			<div>
				<h3 class="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Setup</h3>
				<p class="mt-1 text-sm whitespace-pre-wrap text-muted-foreground">{tecnica.detalles}</p>
			</div>
		{/if}

		<!-- Errores comunes -->
		{#if tecnica.errores_comunes.trim().length > 0}
			<div>
				<h3 class="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
					Errores comunes
				</h3>
				<p class="mt-1 text-sm whitespace-pre-wrap text-muted-foreground">
					{tecnica.errores_comunes}
				</p>
			</div>
		{/if}

		<!-- Contras conocidas -->
		<div>
			<h3 class="text-sm font-semibold">
				Contras conocidas <span class="text-muted-foreground">({contras.length})</span>
			</h3>
			{#if contras.length === 0}
				<p class="mt-1 text-sm text-muted-foreground">Sin contras registradas.</p>
			{:else}
				<div class="mt-2 rounded border border-border">
					<ul class="divide-y divide-border">
						{#each contras as c (c.id)}
							<li>
								<button
									type="button"
									class="block w-full p-3 text-left transition-colors hover:bg-accent focus-visible:bg-accent focus-visible:outline-none"
									onclick={() => pushTecnica(c)}
								>
									<div class="font-medium">
										{c.nombre}{#if c.variante}<span class="text-muted-foreground"
												> ({c.variante})</span
											>{/if}
									</div>
									<div class="mt-0.5 text-xs text-muted-foreground">
										desde {posicionesById[c.posicion_origen_id] ?? '¿?'}
									</div>
								</button>
							</li>
						{/each}
					</ul>
				</div>
			{/if}
		</div>

		<!-- Otras variantes -->
		{#if otrasVariantes.length > 0}
			<div>
				<h3 class="text-sm font-semibold">Otras variantes de {tecnica.nombre}</h3>
				<div class="mt-2 rounded border border-border">
					<ul class="divide-y divide-border">
						{#each otrasVariantes as v (v.id)}
							<li>
								<button
									type="button"
									class="block w-full p-3 text-left transition-colors hover:bg-accent focus-visible:bg-accent focus-visible:outline-none"
									onclick={() => pushTecnica(v)}
								>
									<div class="font-medium">
										{v.nombre}{#if v.variante}<span class="text-muted-foreground"
												> (variante)</span
											>{/if}
									</div>
									<div class="mt-0.5 text-xs text-muted-foreground">
										desde {posicionesById[v.posicion_origen_id] ?? '¿?'}
									</div>
								</button>
							</li>
						{/each}
					</ul>
				</div>
			</div>
		{/if}
	{/if}

	<!--
	  Acciones editar / borrar (T-10). Visibles también en móvil. El botón
	  Borrar se deshabilita si la técnica es contra de otra(s); en ese
	  caso un Tooltip envuelve un <span> con el botón disabled (los buttons
	  disabled no emiten hover, el span sí). Mismo patrón que en
	  PosicionModalContent y SumisionModalContent.
	-->
	{#if status === 'ready'}
		<div class="mt-3 flex justify-end gap-2 border-t border-border pt-3">
			<Button variant="outline" size="sm" onclick={handleEdit} disabled={deleting}>
				Editar
			</Button>
			{#if contrasIncomingCount > 0}
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
  AlertDialog para confirmar borrado (mismo patrón que las otras entidades).
-->
<AlertDialog.Root bind:open={mostrarConfirmBorrar}>
	<AlertDialog.Content>
		<AlertDialog.Header>
			<AlertDialog.Title>Borrar técnica</AlertDialog.Title>
			<AlertDialog.Description>
				¿Borrar definitivamente «{tecnica.nombre}»? No se puede deshacer.
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
