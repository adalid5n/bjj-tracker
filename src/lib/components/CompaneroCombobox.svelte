<script lang="ts">
	import { Combobox } from 'bits-ui';
	import CheckIcon from '@lucide/svelte/icons/check';
	import type { Companero } from '$lib/types';

	let {
		companeros,
		value,
		onChange,
		onCreate,
		placeholder = 'Buscar compañero…'
	}: {
		companeros: Companero[];
		value: string | null;
		onChange: (id: string | null) => void;
		onCreate: (nombre: string) => void | Promise<void>;
		placeholder?: string;
	} = $props();

	let query = $state('');
	let open = $state(false);
	let lastSyncedValue: string | null = null;

	$effect(() => {
		if (value !== lastSyncedValue) {
			lastSyncedValue = value;
			const sel = value ? companeros.find((c) => c.id === value) : null;
			query = sel?.nombre ?? '';
		}
	});

	const filtered = $derived.by(() => {
		const q = query.trim().toLowerCase();
		if (!q) return companeros;
		return companeros.filter((c) => c.nombre.toLowerCase().includes(q));
	});

	const exactMatch = $derived.by(() => {
		const q = query.trim().toLowerCase();
		if (!q) return null;
		return companeros.find((c) => c.nombre.toLowerCase() === q) ?? null;
	});

	const showCreate = $derived(query.trim().length > 0 && !exactMatch);

	function handleValueChange(v: string) {
		if (v.startsWith('__create__:')) {
			const nombre = v.slice('__create__:'.length);
			void onCreate(nombre);
			return;
		}
		onChange(v || null);
	}
</script>

<Combobox.Root
	type="single"
	value={value ?? ''}
	onValueChange={handleValueChange}
	inputValue={query}
	bind:open
>
	<Combobox.Input
		{placeholder}
		oninput={(e) => (query = e.currentTarget.value)}
		onfocus={() => (open = true)}
		onclick={() => (open = true)}
		class="border-input bg-background placeholder:text-muted-foreground focus-visible:ring-ring flex h-9 w-full rounded-md border px-3 py-1 text-sm shadow-sm transition-colors focus-visible:ring-1 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
	/>

	<Combobox.Portal>
		<Combobox.Content
			sideOffset={4}
			class="bg-popover text-popover-foreground ring-foreground/10 z-50 max-h-60 min-w-(--bits-combobox-anchor-width) overflow-x-hidden overflow-y-auto rounded-lg shadow-md ring-1"
		>
			<Combobox.Viewport class="p-1">
				{#each filtered as c (c.id)}
					<Combobox.Item
						value={c.id}
						label={c.nombre}
						class="data-highlighted:bg-accent data-highlighted:text-accent-foreground relative flex w-full cursor-default items-center rounded-md py-1.5 pr-8 pl-2 text-sm outline-hidden select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50"
					>
						{#snippet children({ selected })}
							<span class="absolute end-2 flex size-3.5 items-center justify-center">
								{#if selected}<CheckIcon class="size-4" />{/if}
							</span>
							{c.nombre}
						{/snippet}
					</Combobox.Item>
				{/each}

				{#if showCreate}
					<Combobox.Item
						value={`__create__:${query.trim()}`}
						label={query.trim()}
						class="data-highlighted:bg-accent data-highlighted:text-accent-foreground text-primary relative flex w-full cursor-default items-center rounded-md py-1.5 pl-2 text-sm outline-hidden select-none"
					>
						+ Crear nuevo: "{query.trim()}"
					</Combobox.Item>
				{/if}

				{#if filtered.length === 0 && !showCreate}
					<p class="px-2 py-1.5 text-sm text-muted-foreground italic">
						Sin compañeros aún. Escribe un nombre para crear el primero.
					</p>
				{/if}
			</Combobox.Viewport>
		</Combobox.Content>
	</Combobox.Portal>
</Combobox.Root>
