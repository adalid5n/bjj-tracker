<script lang="ts">
	import { Input } from '$lib/components/ui/input';
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
	let isOpen = $state(false);
	let inputEl = $state<HTMLInputElement | null>(null);
	let lastSyncedValue: string | null = null;

	$effect(() => {
		if (value !== lastSyncedValue) {
			lastSyncedValue = value;
			if (value) {
				const sel = companeros.find((c) => c.id === value);
				query = sel?.nombre ?? '';
			} else {
				query = '';
			}
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

	function handleInput(e: Event) {
		const newQuery = (e.target as HTMLInputElement).value;
		query = newQuery;
		isOpen = true;
		if (value) {
			const sel = companeros.find((c) => c.id === value);
			if (sel && sel.nombre !== newQuery) {
				lastSyncedValue = null;
				onChange(null);
			}
		}
	}

	function selectCompanero(c: Companero) {
		query = c.nombre;
		lastSyncedValue = c.id;
		isOpen = false;
		onChange(c.id);
	}

	async function createNew() {
		const nombre = query.trim();
		if (!nombre) return;
		await onCreate(nombre);
		isOpen = false;
	}

	function clearSelection() {
		query = '';
		lastSyncedValue = null;
		onChange(null);
		isOpen = true;
		inputEl?.focus();
	}

	function handleBlur() {
		setTimeout(() => (isOpen = false), 150);
	}
</script>

<div class="relative">
	<Input
		bind:ref={inputEl}
		value={query}
		oninput={handleInput}
		onfocus={() => (isOpen = true)}
		onblur={handleBlur}
		{placeholder}
		class="pr-8"
	/>
	{#if value}
		<button
			type="button"
			class="absolute top-1/2 right-2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
			onmousedown={(e) => e.preventDefault()}
			onclick={clearSelection}
			aria-label="Limpiar selección"
		>
			✕
		</button>
	{/if}

	{#if isOpen}
		<ul
			class="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md border border-border bg-background shadow-md"
		>
			{#each filtered as c (c.id)}
				<li>
					<button
						type="button"
						class="block w-full px-3 py-2 text-left text-sm hover:bg-accent"
						onmousedown={(e) => e.preventDefault()}
						onclick={() => selectCompanero(c)}
					>
						{c.nombre}
					</button>
				</li>
			{/each}

			{#if query.trim() && !exactMatch}
				<li>
					<button
						type="button"
						class="block w-full px-3 py-2 text-left text-sm text-primary hover:bg-accent"
						onmousedown={(e) => e.preventDefault()}
						onclick={createNew}
					>
						+ Crear nuevo: "{query.trim()}"
					</button>
				</li>
			{/if}

			{#if companeros.length === 0 && !query.trim()}
				<li class="px-3 py-2 text-sm text-muted-foreground italic">
					Sin compañeros aún. Escribe un nombre para crear el primero.
				</li>
			{/if}
		</ul>
	{/if}
</div>
