<script lang="ts">
	/**
	 * Combobox genérico (T-10) sobre bits-ui `Popover` + `Command`.
	 *
	 * Patrón: trigger → click → popover con buscador y lista. Selección
	 * cierra el popover y dispara `onValueChange`. Si `onCreateNew` está
	 * definido, aparece una fila extra al final ("+ Crear nuevo…") que
	 * cierra el popover y dispara el callback — útil para el flujo
	 * inline del paso de destino del wizard de técnica.
	 *
	 * Por qué bits-ui directo (no wrapper shadcn-svelte): la CLI shadcn
	 * pide confirmación interactiva al sobreescribir y no podemos tocar
	 * `package.json` / `pnpm-lock.yaml`. bits-ui ya está instalado, así
	 * que los primitives (`Popover.Root/Trigger/Content` y `Command.*`)
	 * se importan directamente. Mismo lenguaje visual que el resto del
	 * proyecto (tokens semánticos `bg-popover`, `text-muted-foreground`,
	 * etc.).
	 *
	 * No usamos `Combobox` de bits-ui aunque exista, porque pisa la UX:
	 * el input visible sería el campo de búsqueda y no podemos enseñar
	 * el label seleccionado al estilo "Trigger button" que el brief pide.
	 */
	import { onMount, tick } from 'svelte';
	import { Popover, Command } from 'bits-ui';
	import CheckIcon from '@lucide/svelte/icons/check';
	import ChevronsUpDownIcon from '@lucide/svelte/icons/chevrons-up-down';
	import PlusIcon from '@lucide/svelte/icons/plus';
	import { buttonVariants } from '$lib/components/ui/button';

	export type ComboboxItem = { id: string; label: string; sublabel?: string };

	let {
		value,
		onValueChange,
		items,
		placeholder = 'Selecciona…',
		searchPlaceholder = 'Buscar…',
		emptyMessage = 'Sin resultados.',
		onCreateNew,
		createNewLabel,
		disabled = false,
		defaultOpen = false,
		ariaLabel
	}: {
		/** id seleccionado o null. */
		value: string | null;
		onValueChange: (id: string | null) => void;
		items: ComboboxItem[];
		placeholder?: string;
		searchPlaceholder?: string;
		emptyMessage?: string;
		/** Si está definido, se muestra "+ {createNewLabel}" al final de la lista. */
		onCreateNew?: () => void;
		createNewLabel?: string;
		disabled?: boolean;
		/** Si true, el popover arranca abierto al montar. Útil cuando el Combobox
		 * aparece tras un toggle (p.ej. "+ Añadir contra") y queremos evitar
		 * el segundo click para abrir la lista. */
		defaultOpen?: boolean;
		ariaLabel?: string;
	} = $props();

	let open = $state(false);

	// bits-ui `Popover.Root` no respeta `open=true` inicial sin anchor montado.
	// Diferimos a onMount + tick para que el Trigger ya esté en el DOM.
	onMount(async () => {
		if (defaultOpen) {
			await tick();
			open = true;
		}
	});

	const selected = $derived(value === null ? null : (items.find((i) => i.id === value) ?? null));

	function handleSelect(id: string) {
		onValueChange(id);
		open = false;
	}

	function handleCreateNew() {
		open = false;
		// Pequeño retraso permite que el popover cierre limpio antes de
		// que el caller pueda pushear otro nodo al stack y abrir otro
		// modal. Sin esto, el unmount del popover y el push concurrente
		// pueden dejar el focus en sitios raros.
		queueMicrotask(() => {
			onCreateNew?.();
		});
	}
</script>

<Popover.Root bind:open>
	<Popover.Trigger
		class={buttonVariants({ variant: 'outline' }) +
			' w-full justify-between font-normal' +
			(value === null ? ' text-muted-foreground' : '')}
		aria-label={ariaLabel}
		{disabled}
	>
		<span class="truncate">{selected ? selected.label : placeholder}</span>
		<ChevronsUpDownIcon class="ml-2 size-4 shrink-0 opacity-50" aria-hidden="true" />
	</Popover.Trigger>

	<!--
	  Sin Popover.Portal a propósito: cuando el Combobox vive dentro de un
	  Dialog (caso típico en este proyecto), porteár el Content al <body>
	  provoca que el scroll-lock del Dialog y el del Popover colisionen y
	  el browser resetee el scrollTop del contenido subyacente (`/mapa`,
	  `/rolls`). Renderizarlo inline lo mantiene dentro del contexto del
	  Dialog.Content (que no tiene `overflow: hidden`, así que no recorta).
	-->
	<Popover.Content
		align="start"
		sideOffset={4}
		class="bg-popover text-popover-foreground z-50 w-(--bits-popover-anchor-width) min-w-(--bits-popover-anchor-width) rounded-lg border border-border shadow-md outline-hidden"
	>
			<Command.Root class="flex w-full flex-col">
				<div class="border-b border-border px-2 py-1.5">
					<Command.Input
						placeholder={searchPlaceholder}
						class="bg-transparent placeholder:text-muted-foreground flex h-8 w-full rounded-md text-sm outline-hidden disabled:cursor-not-allowed disabled:opacity-50"
					/>
				</div>

				<Command.List class="max-h-60 overflow-y-auto p-1">
					<Command.Empty class="px-2 py-3 text-center text-sm text-muted-foreground">
						{emptyMessage}
					</Command.Empty>

					{#each items as item (item.id)}
						<Command.Item
							value={item.label + ' ' + (item.sublabel ?? '') + ' ' + item.id}
							onSelect={() => handleSelect(item.id)}
							class="data-selected:bg-accent data-selected:text-accent-foreground relative flex cursor-default items-start gap-2 rounded-md px-2 py-1.5 text-sm outline-hidden select-none"
						>
							<span class="mt-0.5 flex size-3.5 items-center justify-center">
								{#if value === item.id}
									<CheckIcon class="size-4" aria-hidden="true" />
								{/if}
							</span>
							<span class="min-w-0 flex-1">
								<span class="block truncate">{item.label}</span>
								{#if item.sublabel}
									<span class="block truncate text-xs text-muted-foreground">{item.sublabel}</span>
								{/if}
							</span>
						</Command.Item>
					{/each}

					{#if onCreateNew && createNewLabel}
						<Command.Item
							value="__create_new__"
							onSelect={handleCreateNew}
							forceMount
							keywords={['crear', 'nuevo', 'nueva', 'add', 'new']}
							class="data-selected:bg-accent data-selected:text-accent-foreground relative flex cursor-default items-center gap-2 rounded-md px-2 py-1.5 text-sm text-primary outline-hidden select-none"
						>
							<PlusIcon class="size-4" aria-hidden="true" />
							<span class="truncate">{createNewLabel}</span>
						</Command.Item>
					{/if}
				</Command.List>
			</Command.Root>
	</Popover.Content>
</Popover.Root>
