<script lang="ts">
	/**
	 * Wrapper Dialog para usar `PosicionWizard` fuera del mapa (T-12).
	 *
	 * Se monta cuando el usuario pulsa "+ Crear nueva posición" desde un
	 * contexto que no es el `MapaModalHost` (hoy: `RollEditor`). Renderiza
	 * su propio `Dialog.Root` con el wizard en modo `standalone`, sin
	 * tocar `mapaModalStack`.
	 *
	 * Confirmación de descartar cambios (mismo patrón que `MapaModalHost`):
	 *  - El wizard reporta dirty vía `onDirtyChange`.
	 *  - Esc, click overlay y botón ✕ se interceptan: si hay dirty,
	 *    `preventDefault()` y abre `AlertDialog` de confirmación; si no,
	 *    deja pasar el cierre.
	 *  - El AlertDialog está controlado (`open` + `onOpenChange`, no
	 *    `bind:open`) — patrón T-9.
	 *
	 * Restringido a modo `crear` por ahora: es el único caso de uso de
	 * T-12. La edición de posiciones se hace en `/mapa`.
	 */
	import * as Dialog from '$lib/components/ui/dialog';
	import * as AlertDialog from '$lib/components/ui/alert-dialog';
	import { buttonVariants } from '$lib/components/ui/button';
	import PosicionWizard from './PosicionWizard.svelte';
	import PosicionWizardDialogSelf from './PosicionWizardDialog.svelte';
	import type { Posicion } from '$lib/types';

	let {
		open = $bindable(false),
		onSaved,
		onCancel,
		isComplementariaSubWizard = false,
		allowCreateNewComplementaria = true
	}: {
		open?: boolean;
		// Se invoca cuando el wizard guarda con éxito. El padre puede usar
		// el id (y la posición completa, recargada de BD) para añadirla a
		// su estado. El wrapper cierra el Dialog automáticamente después.
		onSaved: (posicion: Posicion) => void | Promise<void>;
		// Opcional: se invoca cuando el usuario cierra sin guardar (ya
		// confirmó el descarte si había cambios).
		onCancel?: () => void;
		// Se pasa al PosicionWizard interno: bajo este flag se salta el paso
		// 4 (Complementaria). Lo usa el propio Dialog al renderizar un
		// sub-Dialog anidado para "+ Crear nueva complementaria".
		isComplementariaSubWizard?: boolean;
		// Si true, el wizard interno expone "+ Crear nueva" en el paso
		// Complementaria → abre un sub-Dialog anidado. Lo apagamos para el
		// sub-Dialog para limitar la profundidad a 1 nivel (sin recursión).
		allowCreateNewComplementaria?: boolean;
	} = $props();

	let isDirty = $state(false);
	let mostrarConfirmDescartar = $state(false);

	// Sub-Dialog anidado para "+ Crear nueva complementaria" en standalone.
	// El wizard interno invoca `requestCreateComplementaria(onResult)`. Aquí
	// guardamos `onResult` y abrimos el sub. Cuando el sub guarda, llamamos
	// al callback con el id y cerramos el sub.
	let subWizardOpen = $state(false);
	let onComplementariaResult: ((id: string) => void) | null = null;

	function requestCreateComplementaria(onResult: (id: string) => void) {
		onComplementariaResult = onResult;
		subWizardOpen = true;
	}

	async function handleSubWizardSaved(p: Posicion) {
		subWizardOpen = false;
		onComplementariaResult?.(p.id);
		onComplementariaResult = null;
	}

	function handleSubWizardCancel() {
		onComplementariaResult = null;
	}

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
		// rutina interna de cierre. Patrón T-9 (más limpio que abortar en
		// onOpenChange tarde).
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
		// Recargamos la posición de BD para pasarla completa al padre
		// (el wizard solo da el id por API). Tras notificar, cerramos.
		const { getPosicion } = await import('$lib/posiciones');
		const p = await getPosicion(id);
		// Si por alguna razón no se encuentra (no debería), no llamamos
		// `onSaved` pero cerramos igualmente para no dejar el Dialog colgado.
		if (p) {
			await onSaved(p);
		}
		isDirty = false;
		open = false;
		// Silenciamos modo no usado para mantener la firma compat con
		// PosicionWizard (que pasa el modo).
		void modo;
	}

	function handleDirtyChange(value: boolean) {
		isDirty = value;
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
			<Dialog.Title>Nueva posición</Dialog.Title>
		</Dialog.Header>

		<!--
		  El wizard se estructura internamente como flex column con body
		  scrollable y footer fijo (mismo patrón que en `MapaModalHost`).
		  Aquí solo le damos `flex-1` para que ocupe el alto sobrante del
		  Dialog y `min-h-0` para que su body interno pueda scrollear.
		-->
		<div class="flex min-h-0 flex-1 flex-col pt-1">
			<PosicionWizard
				modo="crear"
				mode="standalone"
				{isComplementariaSubWizard}
				onCreateNewComplementaria={allowCreateNewComplementaria
					? requestCreateComplementaria
					: undefined}
				onSaved={handleWizardSaved}
				onRequestClose={handleWizardRequestClose}
				onDirtyChange={handleDirtyChange}
			/>
		</div>
	</Dialog.Content>
</Dialog.Root>

<!--
  Sub-Dialog anidado para "+ Crear nueva complementaria" en standalone.
  Pasamos:
    - isComplementariaSubWizard: el wizard interno salta el paso 4
      (Complementaria implícita = la posición padre que se está creando).
    - allowCreateNewComplementaria=false: limita la profundidad a 1 nivel;
      el sub no expone "+ Crear nueva" para evitar recursión infinita.
  El padre standalone (PosicionWizardDialog principal) NO se desmonta cuando
  el sub está abierto, así que su state sobrevive sin necesidad de draft.
-->
{#if subWizardOpen}
	<PosicionWizardDialogSelf
		bind:open={subWizardOpen}
		onSaved={handleSubWizardSaved}
		onCancel={handleSubWizardCancel}
		isComplementariaSubWizard={true}
		allowCreateNewComplementaria={false}
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
