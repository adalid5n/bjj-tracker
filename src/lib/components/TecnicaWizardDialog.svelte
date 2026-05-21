<script lang="ts">
	/**
	 * Wrapper Dialog para usar `TecnicaWizard` fuera del mapa (T-3.it2).
	 *
	 * Se monta cuando el usuario pulsa "+ Crear nueva técnica" desde un
	 * contexto que no es el `MapaModalHost` (hoy: `RollEditor`, paso de
	 * técnicas que fueron bien / fallé). Renderiza su propio `Dialog.Root`
	 * con el wizard en modo `standalone`, sin tocar `mapaModalStack`.
	 *
	 * Confirmación de descartar cambios (mismo patrón que
	 * `PosicionWizardDialog`):
	 *  - El wizard reporta dirty vía `onDirtyChange`.
	 *  - Esc, click overlay y botón ✕ se interceptan: si hay dirty,
	 *    `preventDefault()` y abre `AlertDialog` de confirmación; si no,
	 *    deja pasar el cierre.
	 *  - El AlertDialog está controlado (`open` + `onOpenChange`, no
	 *    `bind:open`) — patrón T-9.
	 *
	 * Restringido a modo `crear`: es el único caso de uso de T-3.it2. La
	 * edición de técnicas se hace en `/mapa`.
	 *
	 * "+ Crear nueva posición / + Crear nueva sumisión" en los pasos de
	 * origen y destino: el TecnicaWizard standalone invoca los callbacks
	 * `onCreateNewPosicionOrigen / Destino / SumisionDestino`. Aquí abrimos
	 * un sub-Dialog (PosicionWizardDialog / SumisionWizardDialog) y, al
	 * guardarse, pasamos el id por el callback `onResult`. Los sub-Dialogs
	 * NO permiten más recursión (limit de profundidad).
	 */
	import * as Dialog from '$lib/components/ui/dialog';
	import * as AlertDialog from '$lib/components/ui/alert-dialog';
	import { buttonVariants } from '$lib/components/ui/button';
	import TecnicaWizard from './TecnicaWizard.svelte';
	import PosicionWizardDialog from './PosicionWizardDialog.svelte';
	import SumisionWizardDialog from './SumisionWizardDialog.svelte';
	import type { Tecnica, Posicion, SumisionTerminal } from '$lib/types';

	let {
		open = $bindable(false),
		onSaved,
		onCancel
	}: {
		open?: boolean;
		// Se invoca cuando el wizard guarda con éxito. El padre puede usar
		// la técnica completa (recargada de BD) para añadirla a su estado.
		// El wrapper cierra el Dialog automáticamente después.
		onSaved: (tecnica: Tecnica) => void | Promise<void>;
		// Opcional: se invoca cuando el usuario cierra sin guardar (ya
		// confirmó el descarte si había cambios).
		onCancel?: () => void;
	} = $props();

	let isDirty = $state(false);
	let mostrarConfirmDescartar = $state(false);

	function handleOpenChange(value: boolean) {
		// Fallback: bits-ui llama aquí desde el botón ✕ (que no pasa por
		// onEscapeKeydown / onInteractOutside). Si hay dirty, paramos el
		// cierre y mostramos el AlertDialog. Si no, dejamos cerrar.
		if (!value) {
			if (isDirty) {
				mostrarConfirmDescartar = true;
				// `open` ya está a true; no lo bajamos. Como el ✕ ya disparó
				// `onOpenChange(false)`, forzamos un re-render con open=true
				// asignándolo explícitamente (bits-ui ya empezó a cerrar — pero
				// como controlamos el `open`, este re-set lo cancela).
				open = true;
				return;
			}
			open = false;
			onCancel?.();
		}
	}

	function handleAttemptClose(e: Event) {
		// Esc y click-fuera: interceptamos antes de que bits-ui inicie su
		// rutina interna de cierre. Patrón T-9.
		if (isDirty) {
			e.preventDefault();
			mostrarConfirmDescartar = true;
		}
	}

	function handleAlertOpenChange(value: boolean) {
		if (!value) {
			mostrarConfirmDescartar = false;
		}
	}

	function handleConfirmDescartar() {
		// Patrón T-9: bajar flags ANTES de cerrar el Dialog padre para
		// que el cierre simultáneo no se trague el `onOpenChange` del
		// AlertDialog.
		mostrarConfirmDescartar = false;
		isDirty = false;
		open = false;
		onCancel?.();
	}

	function handleWizardRequestClose() {
		// Botón Cancelar del wizard.
		if (isDirty) {
			mostrarConfirmDescartar = true;
			return;
		}
		open = false;
		onCancel?.();
	}

	async function handleWizardSaved(id: string, modo: 'crear' | 'editar') {
		// Recargamos la técnica de BD para pasarla completa al padre
		// (el wizard solo da el id por API). Tras notificar, cerramos.
		const { getTecnica } = await import('$lib/tecnicas');
		const t = await getTecnica(id);
		// Si por alguna razón no se encuentra (no debería), no llamamos
		// `onSaved` pero cerramos igualmente para no dejar el Dialog colgado.
		if (t) {
			await onSaved(t);
		}
		isDirty = false;
		open = false;
		// Silenciamos modo no usado para mantener la firma compat con
		// TecnicaWizard (que pasa el modo).
		void modo;
	}

	function handleDirtyChange(value: boolean) {
		isDirty = value;
	}

	// Sub-Dialogs anidados para los tres "+ Crear nueva" del wizard. El
	// wizard interno invoca el callback correspondiente, aquí guardamos el
	// `onResult` y abrimos el sub. Al guardar, llamamos al callback con el id
	// y cerramos. La instancia del TecnicaWizard no se desmonta — el state
	// del usuario sobrevive sin necesidad de draft.
	let subPosicionOrigenOpen = $state(false);
	let subPosicionDestinoOpen = $state(false);
	let subSumisionDestinoOpen = $state(false);
	let onPosicionOrigenResult: ((id: string) => void) | null = null;
	let onPosicionDestinoResult: ((id: string) => void) | null = null;
	let onSumisionDestinoResult: ((id: string) => void) | null = null;

	function requestCreatePosicionOrigen(onResult: (id: string) => void) {
		onPosicionOrigenResult = onResult;
		subPosicionOrigenOpen = true;
	}

	function requestCreatePosicionDestino(onResult: (id: string) => void) {
		onPosicionDestinoResult = onResult;
		subPosicionDestinoOpen = true;
	}

	function requestCreateSumisionDestino(onResult: (id: string) => void) {
		onSumisionDestinoResult = onResult;
		subSumisionDestinoOpen = true;
	}

	function handleSubPosicionOrigenSaved(p: Posicion) {
		subPosicionOrigenOpen = false;
		onPosicionOrigenResult?.(p.id);
		onPosicionOrigenResult = null;
	}

	function handleSubPosicionDestinoSaved(p: Posicion) {
		subPosicionDestinoOpen = false;
		onPosicionDestinoResult?.(p.id);
		onPosicionDestinoResult = null;
	}

	function handleSubSumisionDestinoSaved(s: SumisionTerminal) {
		subSumisionDestinoOpen = false;
		onSumisionDestinoResult?.(s.id);
		onSumisionDestinoResult = null;
	}

	function handleSubPosicionOrigenCancel() {
		onPosicionOrigenResult = null;
	}
	function handleSubPosicionDestinoCancel() {
		onPosicionDestinoResult = null;
	}
	function handleSubSumisionDestinoCancel() {
		onSumisionDestinoResult = null;
	}
</script>

<Dialog.Root {open} onOpenChange={handleOpenChange}>
	<Dialog.Content
		class="flex max-h-[90vh] flex-col sm:max-w-md"
		onOpenAutoFocus={(e) => e.preventDefault()}
		onEscapeKeydown={handleAttemptClose}
		onInteractOutside={handleAttemptClose}
	>
		<Dialog.Header>
			<Dialog.Title>Nueva técnica</Dialog.Title>
		</Dialog.Header>

		<!--
		  El wizard se estructura internamente como flex column con body
		  scrollable y footer fijo. Aquí solo le damos `flex-1` para que
		  ocupe el alto sobrante del Dialog y `min-h-0` para que su body
		  interno pueda scrollear.
		-->
		<div class="flex min-h-0 flex-1 flex-col pt-1">
			<TecnicaWizard
				modo="crear"
				mode="standalone"
				onSaved={handleWizardSaved}
				onRequestClose={handleWizardRequestClose}
				onDirtyChange={handleDirtyChange}
				onCreateNewPosicionOrigen={requestCreatePosicionOrigen}
				onCreateNewPosicionDestino={requestCreatePosicionDestino}
				onCreateNewSumisionDestino={requestCreateSumisionDestino}
			/>
		</div>
	</Dialog.Content>
</Dialog.Root>

<!--
  Sub-Dialogs anidados para "+ Crear nueva" en los pasos de origen/destino.
  Cada uno se monta solo cuando se abre (`{#if}`) para no precargar wizards
  innecesariamente. Los PosicionWizardDialog reciben
  `allowCreateNewComplementaria={false}` para limitar la profundidad — sin
  esto un usuario podría anidar 3 niveles de Dialog y volverse difícil de
  cerrar.
-->
{#if subPosicionOrigenOpen}
	<PosicionWizardDialog
		bind:open={subPosicionOrigenOpen}
		onSaved={handleSubPosicionOrigenSaved}
		onCancel={handleSubPosicionOrigenCancel}
		allowCreateNewComplementaria={false}
	/>
{/if}

{#if subPosicionDestinoOpen}
	<PosicionWizardDialog
		bind:open={subPosicionDestinoOpen}
		onSaved={handleSubPosicionDestinoSaved}
		onCancel={handleSubPosicionDestinoCancel}
		allowCreateNewComplementaria={false}
	/>
{/if}

{#if subSumisionDestinoOpen}
	<SumisionWizardDialog
		bind:open={subSumisionDestinoOpen}
		onSaved={handleSubSumisionDestinoSaved}
		onCancel={handleSubSumisionDestinoCancel}
	/>
{/if}

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
