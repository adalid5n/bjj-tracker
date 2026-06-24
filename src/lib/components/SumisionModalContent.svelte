<script lang="ts">
	/**
	 * Contenido interno del modal de SUMISION terminal (T-7 + T-9).
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
	 *
	 * T-9: añadidos botones Editar / Borrar al pie del modal (mismo patrón
	 * que `PosicionModalContent`). Borrar va deshabilitado con Tooltip si
	 * hay técnicas con `sumision_destino_id = this.id`.
	 */
	import { onMount } from 'svelte';
	import { Button, buttonVariants } from '$lib/components/ui/button';
	import * as AlertDialog from '$lib/components/ui/alert-dialog';
	import * as Tooltip from '$lib/components/ui/tooltip';
	import type { Posicion, SumisionTerminal, Tecnica } from '$lib/types';
	import { mapaModalStack } from './mapa-modal-stack.svelte';
	import { settings } from '$lib/settings.svelte';

	let { sumision, onChanged }: { sumision: SumisionTerminal; onChanged?: () => void } = $props();

	let tecnicas = $state<Tecnica[]>([]);
	// Cache id → nombre de posición de origen, para subtítulos de grupo.
	let posicionesById = $state<Record<string, string>>({});
	let status: 'loading' | 'ready' | 'error' = $state('loading');
	let errorMessage = $state('');
	// Cuenta de técnicas con esta sumisión como destino. Decide si Borrar
	// está habilitado. Empieza en 0 para que en SSR (improbable aquí) o
	// antes de cargar quede deshabilitado por defecto si hay carrera.
	let tecnicasCount = $state<number>(0);
	let deleting = $state(false);
	let mostrarConfirmBorrar = $state(false);

	onMount(async () => {
		// Hidrata el state de settings para que `settings.modoAvanzado` sea
		// leíble sincrónicamente en el render (bloques opcionales T-3.it6).
		settings.init();
		try {
			const [
				{ getTecnicasQueLleganASumision, countTecnicasBySumisionDestino },
				{ listPosiciones }
			] = await Promise.all([import('$lib/tecnicas'), import('$lib/posiciones')]);

			const [tecs, todasPos, count] = await Promise.all([
				getTecnicasQueLleganASumision(sumision.id),
				listPosiciones(),
				countTecnicasBySumisionDestino(sumision.id)
			]);

			tecnicas = tecs;
			posicionesById = Object.fromEntries(todasPos.map((p: Posicion) => [p.id, p.nombre]));
			tecnicasCount = count;

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
		mapaModalStack.pushOrPopTo({ kind: 'tecnica', id: t.id, nombre: t.nombre });
	}

	const motivoBloqueoBorrado = $derived(
		tecnicasCount > 0
			? `Esta sumisión es destino de ${tecnicasCount} técnica(s). Borra esas referencias antes.`
			: ''
	);

	function handleEdit() {
		mapaModalStack.push({
			kind: 'wizard-sumision',
			modo: 'editar',
			id: sumision.id,
			nombre: `Editar: ${sumision.nombre}`
		});
	}

	function handleDeleteClick() {
		if (tecnicasCount > 0) return;
		mostrarConfirmBorrar = true;
	}

	async function handleConfirmDelete() {
		if (tecnicasCount > 0) return;
		deleting = true;
		try {
			const { deleteSumision } = await import('$lib/sumisiones');
			await deleteSumision(sumision.id);
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
  Contenido del modal de sumisión terminal. Va dentro de Dialog.Content
  (provisto por MapaModalHost). El Dialog.Title con sumision.nombre lo
  renderiza el host.
-->
<div class="space-y-3">
	<!-- Notas (T-3.it6): solo en modo avanzado y si hay contenido. -->
	{#if sumision.notas?.trim().length > 0}
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

	<!--
	  Acciones editar / borrar. Visibles también en móvil (mismo criterio
	  que en POSICION tras T-8: el stakeholder captura técnicas desde
	  móvil). El botón Borrar se deshabilita si hay técnicas con esta
	  sumisión como destino; en ese caso un Tooltip envuelve un `<span>`
	  (los buttons disabled no emiten hover, el span sí) para mostrar el
	  motivo del bloqueo de forma accesible.
	-->
	{#if status === 'ready'}
		{#if tecnicas.length > 0}
			<!-- Bloqueado por técnicas: mostrar links navegables -->
			<div class="mt-3 space-y-2 border-t border-border pt-3">
				<p class="text-xs text-muted-foreground">
					Borra antes {tecnicas.length === 1 ? 'esta técnica' : `estas ${tecnicas.length} técnicas`}:
				</p>
				<div class="flex flex-wrap gap-1">
					{#each tecnicas as t (t.id)}
						<button
							type="button"
							onclick={() => pushTecnica(t)}
							class="rounded border border-border px-2 py-0.5 text-xs transition-colors hover:bg-accent focus-visible:bg-accent focus-visible:outline-none"
						>
							{t.nombre}{#if t.variante} ({t.variante}){/if}
						</button>
					{/each}
				</div>
				<div class="flex justify-end gap-2">
					<Button variant="outline" size="sm" onclick={handleEdit}>Editar</Button>
					<Button variant="destructive" size="sm" disabled>Borrar</Button>
				</div>
			</div>
		{:else}
			<div class="mt-3 flex justify-end gap-2 border-t border-border pt-3">
				<Button variant="outline" size="sm" onclick={handleEdit} disabled={deleting}>
					Editar
				</Button>
				<Button
					variant="destructive"
					size="sm"
					onclick={handleDeleteClick}
					disabled={deleting}
				>
					{deleting ? 'Borrando…' : 'Borrar'}
				</Button>
			</div>
		{/if}
	{/if}
</div>

<!--
  AlertDialog para confirmar borrado (mismo patrón que POSICION). bits-ui
  maneja correctamente su propio overlay sobre el Dialog principal del host.
-->
<AlertDialog.Root bind:open={mostrarConfirmBorrar}>
	<AlertDialog.Content>
		<AlertDialog.Header>
			<AlertDialog.Title>Borrar sumisión</AlertDialog.Title>
			<AlertDialog.Description>
				¿Borrar definitivamente «{sumision.nombre}»? No se puede deshacer.
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
