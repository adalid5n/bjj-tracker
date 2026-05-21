<script lang="ts">
	/**
	 * Wrapper Dialog para usar `SumisionWizard` fuera del mapa.
	 *
	 * Análogo a `PosicionWizardDialog`: se monta cuando el usuario pulsa
	 * "+ Crear nueva sumisión" desde un contexto que no es el
	 * `MapaModalHost` (hoy: `TecnicaWizardDialog` cuando vive en `RollEditor`).
	 * Renderiza su propio `Dialog.Root` con el wizard en modo `standalone`,
	 * sin tocar `mapaModalStack`.
	 *
	 * Sumisión no tiene complementaria, así que aquí no hay sub-Dialog
	 * anidado (a diferencia de `PosicionWizardDialog`). Solo un wizard plano.
	 */
	import * as Dialog from '$lib/components/ui/dialog';
	import * as AlertDialog from '$lib/components/ui/alert-dialog';
	import { buttonVariants } from '$lib/components/ui/button';
	import SumisionWizard from './SumisionWizard.svelte';
	import type { SumisionTerminal } from '$lib/types';

	let {
		open = $bindable(false),
		onSaved,
		onCancel
	}: {
		open?: boolean;
		// Se invoca cuando el wizard guarda con éxito. El wrapper cierra el
		// Dialog automáticamente después.
		onSaved: (sumision: SumisionTerminal) => void | Promise<void>;
		// Opcional: se invoca cuando el usuario cierra sin guardar (ya
		// confirmó el descarte si había cambios).
		onCancel?: () => void;
	} = $props();

	let isDirty = $state(false);
	let mostrarConfirmDescartar = $state(false);

	function handleOpenChange(value: boolean) {
		if (!value) {
			if (isDirty) {
				mostrarConfirmDescartar = true;
				open = true;
				return;
			}
			open = false;
			onCancel?.();
		}
	}

	function handleAttemptClose(e: Event) {
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
		mostrarConfirmDescartar = false;
		isDirty = false;
		open = false;
		onCancel?.();
	}

	function handleWizardRequestClose() {
		if (isDirty) {
			mostrarConfirmDescartar = true;
			return;
		}
		open = false;
		onCancel?.();
	}

	async function handleWizardSaved(id: string, modo: 'crear' | 'editar') {
		const { getSumision } = await import('$lib/sumisiones');
		const s = await getSumision(id);
		if (s) {
			await onSaved(s);
		}
		isDirty = false;
		open = false;
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
			<Dialog.Title>Nueva sumisión</Dialog.Title>
		</Dialog.Header>

		<div class="flex min-h-0 flex-1 flex-col pt-1">
			<SumisionWizard
				modo="crear"
				mode="standalone"
				onSaved={handleWizardSaved}
				onRequestClose={handleWizardRequestClose}
				onDirtyChange={handleDirtyChange}
			/>
		</div>
	</Dialog.Content>
</Dialog.Root>

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
