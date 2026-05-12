<script lang="ts">
	/**
	 * Host único del stack de modales del mapa (T-4).
	 *
	 * Renderiza UN solo Dialog (en lugar de Dialogs anidados) controlado
	 * por `mapaModalStack`. Cuando hay entradas en el stack, el Dialog
	 * está abierto y muestra el nodo del top con:
	 *
	 *  - Breadcrumb (solo si stack.length > 1): segmentos clickables que
	 *    hacen `popTo(i)`.
	 *  - Botón "← Atrás" (solo si stack.length > 1): hace `pop()`.
	 *  - Botón "✕ Cerrar" (siempre): hace `closeAll()`. Lo provee el
	 *    propio `Dialog.Content` (vía `showCloseButton`), pero como ese
	 *    botón cierra el Dialog directamente sin pasar por el stack,
	 *    interceptamos `onOpenChange` para vaciar el stack al cerrar.
	 *
	 * El contenido se elige por `top.kind`:
	 *   - posicion → <PosicionModalContent />
	 *   - tecnica  → <TecnicaModalContent />
	 *   - sumision → <SumisionModalContent />
	 */
	import * as Dialog from '$lib/components/ui/dialog';
	import { Button } from '$lib/components/ui/button';
	import ArrowLeftIcon from '@lucide/svelte/icons/arrow-left';
	import type { Posicion, SumisionTerminal, Tecnica } from '$lib/types';
	import { mapaModalStack } from './mapa-modal-stack.svelte';
	import PosicionModalContent from './PosicionModalContent.svelte';
	import TecnicaModalContent from './TecnicaModalContent.svelte';
	import SumisionModalContent from './SumisionModalContent.svelte';

	// Cache de detalles cargados bajo demanda (id → entidad).
	// Una entrada por kind, los tres se rellenan a medida que se navega.
	let posicionesById = $state<Record<string, Posicion>>({});
	let tecnicasById = $state<Record<string, Tecnica>>({});
	let sumisionesById = $state<Record<string, SumisionTerminal>>({});
	let loadingPosicion = $state<string | null>(null);
	let loadingTecnica = $state<string | null>(null);
	let loadingSumision = $state<string | null>(null);

	const stack = $derived(mapaModalStack.stack);
	const top = $derived(mapaModalStack.top);
	const isOpen = $derived(mapaModalStack.isOpen);

	// Si el top es una entidad que aún no tenemos cacheada, la cargamos.
	// $effect en module level no se permite — esto sí, va en componente.
	$effect(() => {
		if (!top) return;
		if (top.kind === 'posicion' && !posicionesById[top.id] && loadingPosicion !== top.id) {
			loadingPosicion = top.id;
			loadPosicion(top.id);
		} else if (top.kind === 'tecnica' && !tecnicasById[top.id] && loadingTecnica !== top.id) {
			loadingTecnica = top.id;
			loadTecnica(top.id);
		} else if (top.kind === 'sumision' && !sumisionesById[top.id] && loadingSumision !== top.id) {
			loadingSumision = top.id;
			loadSumision(top.id);
		}
	});

	async function loadPosicion(id: string) {
		try {
			const { getPosicion } = await import('$lib/posiciones');
			const p = await getPosicion(id);
			if (p) {
				posicionesById = { ...posicionesById, [id]: p };
			}
		} catch (err) {
			console.error('[MapaModalHost] loadPosicion failed:', err);
		} finally {
			loadingPosicion = null;
		}
	}

	async function loadTecnica(id: string) {
		try {
			const { getTecnica } = await import('$lib/tecnicas');
			const t = await getTecnica(id);
			if (t) {
				tecnicasById = { ...tecnicasById, [id]: t };
			}
		} catch (err) {
			console.error('[MapaModalHost] loadTecnica failed:', err);
		} finally {
			loadingTecnica = null;
		}
	}

	async function loadSumision(id: string) {
		try {
			const { getSumision } = await import('$lib/sumisiones');
			const s = await getSumision(id);
			if (s) {
				sumisionesById = { ...sumisionesById, [id]: s };
			}
		} catch (err) {
			console.error('[MapaModalHost] loadSumision failed:', err);
		} finally {
			loadingSumision = null;
		}
	}

	function handleOpenChange(value: boolean) {
		// Si bits-ui pide cerrar (Esc, click overlay, botón ✕ de Dialog.Content),
		// vaciamos el stack para que el estado lógico siga al estado del Dialog.
		if (!value) {
			mapaModalStack.closeAll();
		}
	}
</script>

<Dialog.Root open={isOpen} onOpenChange={handleOpenChange}>
	<Dialog.Content
		class="max-h-[90vh] overflow-y-auto sm:max-w-md"
		onOpenAutoFocus={(e) => e.preventDefault()}
	>
		{#if top}
			<Dialog.Header>
				<!-- Breadcrumb solo si stack.length > 1 -->
				{#if stack.length > 1}
					<nav aria-label="Ruta navegada" class="text-xs text-muted-foreground">
						{#each stack as entry, i (i + '-' + entry.id)}
							{#if i < stack.length - 1}
								<button
									type="button"
									class="rounded hover:underline focus-visible:underline focus-visible:outline-none"
									onclick={() => mapaModalStack.popTo(i)}
								>
									{entry.nombre}
								</button>
								<span aria-hidden="true"> → </span>
							{:else}
								<span class="text-foreground">{entry.nombre}</span>
							{/if}
						{/each}
					</nav>
				{/if}

				<div class="flex items-center gap-2">
					{#if stack.length > 1}
						<Button
							variant="ghost"
							size="icon-sm"
							onclick={() => mapaModalStack.pop()}
							aria-label="Volver al modal anterior"
						>
							<ArrowLeftIcon />
						</Button>
					{/if}
					<Dialog.Title>{top.nombre}</Dialog.Title>
				</div>
			</Dialog.Header>

			<div class="pt-1">
				{#if top.kind === 'posicion'}
					{@const pos = posicionesById[top.id]}
					{#if pos}
						<PosicionModalContent posicion={pos} />
					{:else}
						<p class="text-sm text-muted-foreground">Cargando posición…</p>
					{/if}
				{:else if top.kind === 'tecnica'}
					{@const tec = tecnicasById[top.id]}
					{#if tec}
						<TecnicaModalContent tecnica={tec} />
					{:else}
						<p class="text-sm text-muted-foreground">Cargando técnica…</p>
					{/if}
				{:else if top.kind === 'sumision'}
					{@const sum = sumisionesById[top.id]}
					{#if sum}
						<SumisionModalContent sumision={sum} />
					{:else}
						<p class="text-sm text-muted-foreground">Cargando sumisión…</p>
					{/if}
				{/if}
			</div>
		{/if}
	</Dialog.Content>
</Dialog.Root>
