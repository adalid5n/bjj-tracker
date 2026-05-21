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
	import * as Sheet from '$lib/components/ui/sheet';
	import * as AlertDialog from '$lib/components/ui/alert-dialog';
	import { Button } from '$lib/components/ui/button';
	import { buttonVariants } from '$lib/components/ui/button';
	import ArrowLeftIcon from '@lucide/svelte/icons/arrow-left';
	import XIcon from '@lucide/svelte/icons/x';
	import type { Posicion, SumisionTerminal, Tecnica } from '$lib/types';
	import { mapaModalStack, tecnicaWizardDraft, posicionWizardDraft } from './mapa-modal-stack.svelte';
	import PosicionModalContent from './PosicionModalContent.svelte';
	import TecnicaModalContent from './TecnicaModalContent.svelte';
	import SumisionModalContent from './SumisionModalContent.svelte';
	import PosicionWizard from './PosicionWizard.svelte';
	import SumisionWizard from './SumisionWizard.svelte';
	import TecnicaWizard from './TecnicaWizard.svelte';

	// T-8.b: el host es agnóstico del contenedor visual; el padre decide
	// cómo presentar el modal en función del contexto:
	//   - 'dialog'       → Dialog centrado tradicional (default, vista Lista).
	//   - 'sheet-side'   → Sheet/drawer lateral derecho (vista Grafo desktop).
	//   - 'sheet-bottom' → Sheet/drawer inferior ~50vh (vista Grafo móvil).
	// El contenido interior (header sticky, breadcrumb, body, dirty handler)
	// es idéntico en los tres casos: se renderiza vía el snippet
	// `modalContent` con un wrapper distinto. La lógica de stack, dirty
	// handler y AlertDialog se mantiene intacta — es ortogonal al contenedor.
	let {
		onCatalogChanged,
		presentation = 'dialog'
	}: {
		onCatalogChanged?: () => void;
		presentation?: 'dialog' | 'sheet-side' | 'sheet-bottom';
	} = $props();

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
	// Callback opcional asociado a una pendiente de tipo 'closeAll'. Se
	// invoca cuando el cierre ocurre de verdad — inmediato si no había
	// dirty, o después de "Descartar" si lo había. Si el usuario cancela
	// el AlertDialog, el callback se descarta sin ejecutar.
	let pendingCloseAllCallback: (() => void) | null = null;

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

	// Mismo patrón para el draft del wizard de posición (T-1.it2): sobrevive
	// el remount por "+ Crear nueva" inline, pero se limpia cuando el wizard
	// de posición ya no está en el stack.
	$effect(() => {
		const tieneWizardPosicion = stack.some((e) => e.kind === 'wizard-posicion');
		if (!tieneWizardPosicion && posicionWizardDraft.value !== null) {
			posicionWizardDraft.clear();
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
			pendingCloseAllCallback = null;
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

	// Llamable desde el padre (vía `bind:this`) cuando algo externo al
	// host quiere cerrar todo el stack — p. ej. cambiar de vista, clicar
	// otro nodo del grafo, botón X propio.
	// `onClose` se invoca solo si el cierre ocurre de verdad: inmediato
	// si no había dirty, o tras "Descartar" en el AlertDialog si lo había.
	// Si el usuario cancela el AlertDialog, `onClose` se descarta.
	export function attemptCloseAll(onClose?: () => void) {
		if (!mapaModalStack.isOpen) {
			onClose?.();
			return;
		}
		if (mapaModalStack.isDirty()) {
			pendingCloseAllCallback = onClose ?? null;
			accionPendiente = 'closeAll';
			mostrarConfirmDescartar = true;
		} else {
			mapaModalStack.closeAll();
			onClose?.();
		}
	}

	function handleConfirmDescartar() {
		// El usuario confirma descartar: cerramos el AlertDialog explícitamente
		// antes de tocar el stack. Si dejamos que bits-ui lo cierre vía el
		// click de `<AlertDialog.Action>` y a la vez ejecutamos `closeAll()`,
		// el Dialog principal se desmonta a la par y el AlertDialog se queda
		// colgado sin propagar su `onOpenChange(false)`.
		const accion = accionPendiente;
		const cb = pendingCloseAllCallback;
		accionPendiente = null;
		pendingCloseAllCallback = null;
		mostrarConfirmDescartar = false;
		mapaModalStack.setDirtyHandler(null);
		if (accion === 'closeAll') {
			mapaModalStack.closeAll();
			cb?.();
		} else if (accion === 'pop') {
			mapaModalStack.pop();
		}
	}

	// Los wizards llaman a esto tras crear/editar. Invalidamos la cache de
	// la entidad correspondiente para que la próxima vez que se muestre
	// se recargue de BD con los datos frescos. Además notificamos al page
	// para que refresque la lista de `/mapa` (creación, edición de nombre,
	// etc.). Hay un handler por wizard para que cada uno toque su cache.
	function handlePosicionWizardSaved(_id: string) {
		// Invalidamos TODA la cache de posiciones, no solo la editada: el
		// vínculo `posicion_complementaria_id` (ADR-002) actualiza dos filas
		// a la vez (la editada y su pareja, y posiblemente una tercera si se
		// rompió un emparejamiento previo). Invalidación pesimista para
		// garantizar coherencia con un coste despreciable (las posiciones se
		// recargan a demanda al volver a abrirlas).
		posicionesById = {};
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

	// Breadcrumb derivado: solo nodos de lectura, manteniendo el índice
	// original del stack para que `popTo` siga apuntando a la entrada
	// correcta. Los wizards no son lugares del grafo — son acciones modales.
	const breadcrumbItems = $derived(
		stack
			.map((entry, originalIndex) => ({ entry, originalIndex }))
			.filter(
				({ entry }) =>
					entry.kind === 'posicion' || entry.kind === 'tecnica' || entry.kind === 'sumision'
			)
	);

	// El último item del breadcrumb se destaca solo si el top real del
	// stack es un nodo de lectura (i.e. el último item es realmente "donde
	// estás"). Si el top es un wizard, todos los items del breadcrumb son
	// padres clickables.
	const topIsReader = $derived(
		!!top && (top.kind === 'posicion' || top.kind === 'tecnica' || top.kind === 'sumision')
	);
</script>

<!--
  Snippet con el contenido interior común a los tres wrappers (Dialog,
  Sheet-side, Sheet-bottom). Se renderiza una sola vez aquí y se invoca
  desde cada rama de `{#if presentation === ...}` para evitar duplicar el
  árbol. El header, breadcrumb, body scrollable y los handlers del wizard
  son agnósticos del wrapper exterior.
-->
{#snippet modalContent()}
	{#if top}
		<Dialog.Header>
				<!--
				  Breadcrumb (T-1.it2 fix): solo muestra nodos de lectura
				  (posicion/tecnica/sumision), los wizards de creación/edición
				  se filtran porque son acciones modales sobre un nodo, no
				  nodos en sí. Si tras filtrar queda solo 1 nivel, no se
				  muestra (el título del Dialog ya da contexto). El último
				  item se destaca solo si el top real del stack también es
				  un nodo de lectura.
				-->
				{#if breadcrumbItems.length > 1}
					<nav aria-label="Ruta navegada" class="text-xs text-muted-foreground">
						{#each breadcrumbItems as item, j (item.originalIndex + '-' + item.entry.kind + '-' + ('id' in item.entry ? item.entry.id : item.entry.modo))}
							{@const isLast = j === breadcrumbItems.length - 1}
							{#if isLast && topIsReader}
								<span class="text-foreground">{item.entry.nombre}</span>
							{:else}
								<button
									type="button"
									class="rounded hover:underline focus-visible:underline focus-visible:outline-none"
									onclick={() => mapaModalStack.popTo(item.originalIndex)}
								>
									{item.entry.nombre}
								</button>
								{#if !isLast}
									<span aria-hidden="true"> → </span>
								{/if}
							{/if}
						{/each}
					</nav>
				{/if}

				<div class="flex items-center justify-between gap-2">
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
					<!--
					  X propio (en lugar del que trae shadcn por defecto via
					  `showCloseButton`). Pasa por `attemptCloseAll`, que
					  respeta el dirty handler — sin esto, el botón nativo
					  de bits-ui dispara el cierre antes de que podamos
					  interceptarlo con AlertDialog.
					-->
					<Button
						variant="ghost"
						size="icon-sm"
						onclick={() => attemptCloseAll()}
						aria-label="Cerrar"
					>
						<XIcon />
					</Button>
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
				<!--
				  Wrapper sin `overflow-y-auto`: PosicionModalContent maneja
				  su propio scroll interno (body) + footer fijo (Editar/Borrar).
				  Mover el footer fuera del scrollable evita un bug visual del
				  shadcn Button `active:translate-y-px` que dispara scrollbar
				  cuando el contenido llega justo al borde del wrapper.
				-->
				<div class="flex min-h-0 flex-1 flex-col pt-1">
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
					<!--
					  {#key} fuerza remount cuando se empuja un wizard-posicion
					  encima de otro (caso "+ Crear nueva posición" inline desde
					  el paso de complementaria, o desde el wizard de técnica).
					  La clave incluye `stack.length` porque entre padre y sub
					  ambos son `modo='crear'` con id undefined, así que sin el
					  nivel del stack la expresión evaluaría constante y Svelte
					  reusaría la instancia (manteniendo el state del padre).
					-->
					{#key `${stack.length}:${top.modo === 'editar' ? `editar:${top.id}` : 'crear'}`}
						<PosicionWizard
							modo={top.modo}
							posicionId={top.modo === 'editar' ? top.id : undefined}
							parentForComplementaria={top.modo === 'crear'
								? top.parentForComplementaria
								: undefined}
							isComplementariaSubWizard={top.modo === 'crear'
								? top.isComplementariaSubWizard
								: false}
							isSubWizard={stack.length > 1}
							onSaved={handlePosicionWizardSaved}
							onRequestClose={handleWizardRequestClose}
						/>
					{/key}
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
{/snippet}

<!--
  Wrapper externo elegido por el padre vía `presentation`. Las tres ramas
  comparten:
    - mismo `open` y `onOpenChange` (gobiernan el stack).
    - mismos handlers `onEscapeKeydown` y `onInteractOutside` que
      interceptan el cierre si hay dirty (handleAttemptClose).
    - `onOpenAutoFocus={(e) => e.preventDefault()}` para no robar foco al
      abrir.
  Tanto Dialog como Sheet (shadcn-svelte) son wrappers de bits-ui Dialog
  por dentro, así que los tres aceptan la misma API de eventos.

  Tamaños:
    - dialog       → centrado, `sm:max-w-md`, alto `max-h-[90vh]` (como hoy).
    - sheet-side   → drawer lateral derecho, ancho `w-full sm:max-w-md`.
      El sheet-content base limita a `data-[side=right]:sm:max-w-sm`, lo
      sobreescribimos a `sm:max-w-md` para igualar al Dialog y dar más
      espacio a los wizards.
    - sheet-bottom → drawer inferior `h-[50vh]` (decisión de producto).
-->
{#if presentation === 'dialog'}
	<Dialog.Root open={isOpen} onOpenChange={handleOpenChange}>
		<Dialog.Content
			class="flex max-h-[90vh] flex-col sm:max-w-md"
			showCloseButton={false}
			onOpenAutoFocus={(e) => e.preventDefault()}
			onEscapeKeydown={handleAttemptClose}
			onInteractOutside={handleAttemptClose}
		>
			{@render modalContent()}
		</Dialog.Content>
	</Dialog.Root>
{:else if presentation === 'sheet-side'}
	<Sheet.Root open={isOpen} onOpenChange={handleOpenChange}>
		<Sheet.Content
			side="right"
			class="top-14! bottom-14! h-auto! flex w-full flex-col p-4 sm:max-w-md"
			showCloseButton={false}
			interactOutsideBehavior="ignore"
			preventScroll={false}
			onOpenAutoFocus={(e) => e.preventDefault()}
			onEscapeKeydown={handleAttemptClose}
		>
			{@render modalContent()}
		</Sheet.Content>
	</Sheet.Root>
{:else}
	<Sheet.Root open={isOpen} onOpenChange={handleOpenChange}>
		<Sheet.Content
			side="bottom"
			class="bottom-14! h-[50dvh]! flex flex-col p-4"
			showCloseButton={false}
			interactOutsideBehavior="ignore"
			preventScroll={false}
			onOpenAutoFocus={(e) => e.preventDefault()}
			onEscapeKeydown={handleAttemptClose}
		>
			{@render modalContent()}
		</Sheet.Content>
	</Sheet.Root>
{/if}

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
