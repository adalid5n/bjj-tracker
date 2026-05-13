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
	 *   - wizard-posicion → <PosicionWizard />
	 *   - wizard-sumision → <SumisionWizard />
	 *
	 * T-8 fixes (E): si el top es un wizard con cambios sin guardar,
	 * interceptamos Esc / click overlay / botón ✕ / botón ← / cancelar y
	 * mostramos un `AlertDialog` "¿Descartar cambios?" antes de cerrar.
	 * El wizard registra/desregistra el dirty handler en `mapaModalStack`.
	 */
	import * as Dialog from '$lib/components/ui/dialog';
	import * as AlertDialog from '$lib/components/ui/alert-dialog';
	import { Button } from '$lib/components/ui/button';
	import { buttonVariants } from '$lib/components/ui/button';
	import ArrowLeftIcon from '@lucide/svelte/icons/arrow-left';
	import type { Posicion, SumisionTerminal, Tecnica } from '$lib/types';
	import { mapaModalStack, tecnicaWizardDraft } from './mapa-modal-stack.svelte';
	import PosicionModalContent from './PosicionModalContent.svelte';
	import TecnicaModalContent from './TecnicaModalContent.svelte';
	import SumisionModalContent from './SumisionModalContent.svelte';
	import PosicionWizard from './PosicionWizard.svelte';
	import SumisionWizard from './SumisionWizard.svelte';
	import TecnicaWizard from './TecnicaWizard.svelte';

	// Opcional: callback que el host (página) puede pasar para refrescar
	// listas tras un cambio en el catálogo (crear/editar/borrar posición).
	// Hoy lo usa `/mapa` para recargar la lista de posiciones.
	let { onCatalogChanged }: { onCatalogChanged?: () => void } = $props();

	// Cache de detalles cargados bajo demanda (id → entidad).
	// Una entrada por kind, los tres se rellenan a medida que se navega.
	let posicionesById = $state<Record<string, Posicion>>({});
	let tecnicasById = $state<Record<string, Tecnica>>({});
	let sumisionesById = $state<Record<string, SumisionTerminal>>({});
	let loadingPosicion = $state<string | null>(null);
	let loadingTecnica = $state<string | null>(null);
	let loadingSumision = $state<string | null>(null);

	// AlertDialog "¿Descartar cambios?" — controla qué acción pendiente
	// dispara: cerrar todo (closeAll) o pop una entrada.
	let mostrarConfirmDescartar = $state(false);
	let accionPendiente = $state<'closeAll' | 'pop' | null>(null);

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

	// Limpia el draft del wizard de técnica cuando su entrada deja el stack
	// (cancelar, closeAll, popTo). El draft sobrevive remounts intencionados
	// (sub-wizard inline "+ Crear nueva …") pero NO debe persistir si el
	// usuario cierra el wizard de técnica sin guardar — la próxima vez que
	// lo abra debería empezar vacío. La limpieza por guardado exitoso la
	// hace el propio wizard en `handleSave`.
	$effect(() => {
		const tieneWizardTecnica = stack.some((e) => e.kind === 'wizard-tecnica');
		if (!tieneWizardTecnica && tecnicaWizardDraft.value !== null) {
			tecnicaWizardDraft.clear();
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
		// Fallback para cierres legítimos de bits-ui que NO pasan por
		// `onEscapeKeydown` / `onInteractOutside` (ej.: botón ✕ del
		// Dialog.Content, que llama directo a `onOpenChange`).
		//
		// El caso "Esc con dirty" y "click overlay con dirty" se intercepta
		// antes en `handleAttemptClose` con `preventDefault()`, así que aquí
		// solo nos llega `value=false` cuando NO hay dirty o cuando el cierre
		// viene del botón ✕. Si hay dirty (botón ✕), pedimos confirmación.
		if (!value) {
			if (mapaModalStack.isDirty()) {
				accionPendiente = 'closeAll';
				mostrarConfirmDescartar = true;
				// No cerramos el stack: el Dialog se reabre en el próximo render
				// porque `isOpen` sigue true.
				return;
			}
			mapaModalStack.closeAll();
		}
	}

	function handleAttemptClose(e: Event) {
		// Handler común para `onEscapeKeydown` y `onInteractOutside` de
		// `Dialog.Content`. Estos eventos llegan ANTES de que bits-ui
		// inicie su rutina interna de cierre (focus restore, animación,
		// onOpenChange). Si el top está sucio, paramos el cierre con
		// `preventDefault()` y abrimos el AlertDialog de descartar.
		// Si no está sucio, dejamos pasar — bits-ui cerrará el Dialog y
		// `handleOpenChange(false)` se ocupará de llamar a `closeAll()`.
		if (mapaModalStack.isDirty()) {
			e.preventDefault();
			accionPendiente = 'closeAll';
			mostrarConfirmDescartar = true;
		}
	}

	function handleAlertOpenChange(value: boolean) {
		// El AlertDialog se cierra por cualquier vía (Esc, click fuera,
		// botón Cancelar). Limpiamos `accionPendiente` para que no quede
		// colgado y el flag `mostrarConfirmDescartar` queda en sync.
		// Si `value=true` (apertura), no tocamos nada — la apertura ya la
		// dispara quien corresponda (handleAttemptClose / handleBack / etc.).
		if (!value) {
			accionPendiente = null;
			mostrarConfirmDescartar = false;
		}
	}

	function handleBack() {
		// Botón "← Atrás" del header. Solo dispara confirm si el top tiene
		// cambios sin guardar — pop a una entrada anterior los perdería.
		if (mapaModalStack.isDirty()) {
			accionPendiente = 'pop';
			mostrarConfirmDescartar = true;
			return;
		}
		mapaModalStack.pop();
	}

	function handleWizardRequestClose() {
		// El wizard pidió cerrar (botón Cancelar). Mismo trato: si dirty,
		// preguntamos; si no, pop directo.
		if (mapaModalStack.isDirty()) {
			accionPendiente = 'pop';
			mostrarConfirmDescartar = true;
			return;
		}
		mapaModalStack.pop();
	}

	function handleConfirmDescartar() {
		// El usuario confirma descartar: cerramos el AlertDialog explícitamente
		// antes de tocar el stack. Si dejamos que bits-ui lo cierre vía el
		// click de `<AlertDialog.Action>` y a la vez ejecutamos `closeAll()`,
		// el Dialog principal se desmonta a la par y el AlertDialog se queda
		// colgado sin propagar su `onOpenChange(false)`.
		const accion = accionPendiente;
		accionPendiente = null;
		mostrarConfirmDescartar = false;
		mapaModalStack.setDirtyHandler(null);
		if (accion === 'closeAll') {
			mapaModalStack.closeAll();
		} else if (accion === 'pop') {
			mapaModalStack.pop();
		}
	}

	// Los wizards llaman a esto tras crear/editar. Invalidamos la cache de
	// la entidad correspondiente para que la próxima vez que se muestre
	// se recargue de BD con los datos frescos. Además notificamos al page
	// para que refresque la lista de `/mapa` (creación, edición de nombre,
	// etc.). Hay un handler por wizard para que cada uno toque su cache.
	function handlePosicionWizardSaved(id: string) {
		if (posicionesById[id]) {
			const next = { ...posicionesById };
			delete next[id];
			posicionesById = next;
		}
		onCatalogChanged?.();
	}

	function handleSumisionWizardSaved(id: string) {
		if (sumisionesById[id]) {
			const next = { ...sumisionesById };
			delete next[id];
			sumisionesById = next;
		}
		onCatalogChanged?.();
	}

	function handleTecnicaWizardSaved(id: string) {
		if (tecnicasById[id]) {
			const next = { ...tecnicasById };
			delete next[id];
			tecnicasById = next;
		}
		onCatalogChanged?.();
	}

	// Idem cuando se borra desde el modal de posición o sumisión.
	function handleModalChanged() {
		onCatalogChanged?.();
	}

	// Helpers para el título y la rama de render del top.
	const topTitle = $derived.by(() => {
		if (!top) return '';
		if (top.kind === 'wizard-posicion' && top.modo === 'crear') return 'Nueva posición';
		if (top.kind === 'wizard-sumision' && top.modo === 'crear') return 'Nueva sumisión';
		if (top.kind === 'wizard-tecnica' && top.modo === 'crear') return 'Nueva técnica';
		return top.nombre;
	});
</script>

<Dialog.Root open={isOpen} onOpenChange={handleOpenChange}>
	<Dialog.Content
		class="flex max-h-[90vh] flex-col sm:max-w-md"
		onOpenAutoFocus={(e) => e.preventDefault()}
		onEscapeKeydown={handleAttemptClose}
		onInteractOutside={handleAttemptClose}
	>
		{#if top}
			<Dialog.Header>
				<!-- Breadcrumb solo si stack.length > 1 -->
				{#if stack.length > 1}
					<nav aria-label="Ruta navegada" class="text-xs text-muted-foreground">
						{#each stack as entry, i (i + '-' + entry.kind + '-' + ('id' in entry ? entry.id : entry.modo))}
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
							onclick={handleBack}
							aria-label="Volver al modal anterior"
						>
							<ArrowLeftIcon />
						</Button>
					{/if}
					<Dialog.Title>{topTitle}</Dialog.Title>
				</div>
			</Dialog.Header>

			<!--
			  `{#key top.id}` fuerza remount del modal-content al navegar
			  entre entidades del mismo kind (p. ej. técnica → técnica al
			  clicar una contra). Sin esto, Svelte 5 reutiliza el componente
			  cambiando la prop `tecnica` pero no re-ejecuta su `onMount`, y
			  estado interno cargado en `onMount` (lista de contras, otras
			  variantes, contadores) se queda con el del modal anterior —
			  bug que producía "Upa como contra de Upa" al navegar de Armbar
			  a Upa.

			  Wrapper en flex column: `flex-1` ocupa el alto sobrante del
			  Dialog.Content, `min-h-0` permite que los hijos hagan scroll
			  (sin esto, `overflow-y-auto` en un flex-1 no hace nada). Los
			  wizards (PosicionWizard/SumisionWizard/TecnicaWizard) se
			  estructuran internamente como flex column con body scrollable
			  y footer sticky al final — por eso ellos usan `flex h-full
			  flex-col` directamente y NO van envueltos en un div con
			  `overflow-y-auto`. Los visualizadores (PosicionModalContent y
			  similares) sí van dentro de un div con `overflow-y-auto`
			  porque su contenido puede desbordar sin tener footer propio.
			-->
			{#if top.kind === 'posicion'}
				{@const pos = posicionesById[top.id]}
				<div class="-mx-3 min-h-0 flex-1 overflow-y-auto px-3 pt-1">
					{#if pos}
						{#key top.id}
							<PosicionModalContent posicion={pos} onChanged={handleModalChanged} />
						{/key}
					{:else}
						<p class="text-sm text-muted-foreground">Cargando posición…</p>
					{/if}
				</div>
			{:else if top.kind === 'tecnica'}
				{@const tec = tecnicasById[top.id]}
				<div class="-mx-3 min-h-0 flex-1 overflow-y-auto px-3 pt-1">
					{#if tec}
						{#key top.id}
							<TecnicaModalContent tecnica={tec} onChanged={handleModalChanged} />
						{/key}
					{:else}
						<p class="text-sm text-muted-foreground">Cargando técnica…</p>
					{/if}
				</div>
			{:else if top.kind === 'sumision'}
				{@const sum = sumisionesById[top.id]}
				<div class="-mx-3 min-h-0 flex-1 overflow-y-auto px-3 pt-1">
					{#if sum}
						{#key top.id}
							<SumisionModalContent sumision={sum} onChanged={handleModalChanged} />
						{/key}
					{:else}
						<p class="text-sm text-muted-foreground">Cargando sumisión…</p>
					{/if}
				</div>
			{:else if top.kind === 'wizard-posicion'}
				<div class="flex min-h-0 flex-1 flex-col pt-1">
					<PosicionWizard
						modo={top.modo}
						posicionId={top.modo === 'editar' ? top.id : undefined}
						onSaved={handlePosicionWizardSaved}
						onRequestClose={handleWizardRequestClose}
					/>
				</div>
			{:else if top.kind === 'wizard-sumision'}
				<div class="flex min-h-0 flex-1 flex-col pt-1">
					<SumisionWizard
						modo={top.modo}
						sumisionId={top.modo === 'editar' ? top.id : undefined}
						onSaved={handleSumisionWizardSaved}
						onRequestClose={handleWizardRequestClose}
					/>
				</div>
			{:else if top.kind === 'wizard-tecnica'}
				<div class="flex min-h-0 flex-1 flex-col pt-1">
					<TecnicaWizard
						modo={top.modo}
						tecnicaId={top.modo === 'editar' ? top.id : undefined}
						posicionOrigenId={top.modo === 'crear' ? top.posicionOrigenId : undefined}
						onSaved={handleTecnicaWizardSaved}
						onRequestClose={handleWizardRequestClose}
					/>
				</div>
			{/if}
		{/if}
	</Dialog.Content>
</Dialog.Root>

<!--
  Confirm de descartar cambios (cambio E). El AlertDialog vive a nivel del
  host, no del wizard, porque debe sobrevivir aunque el wizard se desmonte
  tras una acción. bits-ui soporta AlertDialog sobre Dialog sin chocar.
-->
<AlertDialog.Root open={mostrarConfirmDescartar} onOpenChange={handleAlertOpenChange}>
	<AlertDialog.Content>
		<AlertDialog.Header>
			<AlertDialog.Title>¿Descartar cambios?</AlertDialog.Title>
			<AlertDialog.Description>
				Tienes cambios sin guardar. Si cierras ahora, se perderán.
			</AlertDialog.Description>
		</AlertDialog.Header>
		<AlertDialog.Footer>
			<AlertDialog.Cancel>Cancelar</AlertDialog.Cancel>
			<AlertDialog.Action
				onclick={handleConfirmDescartar}
				class={buttonVariants({ variant: 'destructive' })}
			>
				Descartar
			</AlertDialog.Action>
		</AlertDialog.Footer>
	</AlertDialog.Content>
</AlertDialog.Root>
