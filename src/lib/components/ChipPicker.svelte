<script lang="ts">
	/**
	 * ChipPicker — picker compacto de chips con dos modos.
	 *
	 *  - `mode='select'` (editable): buscador en la cabecera + chips en grid
	 *    de 2 filas con scroll horizontal. Opcionalmente agrupado por
	 *    categoría. Si se pasa `onCreateNew`, se renderiza al final un chip
	 *    "+ Crear nueva" con estilo dashed que dispara el callback.
	 *  - `mode='readonly'`: sin buscador ni crear-nueva, los chips son
	 *    `<span>` (no interactivos). Pensado para mostrar las 4 filas de
	 *    posiciones/técnicas en `/rolls` y `/sesion/[id]`.
	 *
	 * Layout: cada bloque de chips usa un `grid` con 2 filas explícitas,
	 * flujo por columnas (`grid-flow-col`) y anchura mínima por columna
	 * (`auto-cols-max`). Eso hace que los chips fluyan horizontalmente y el
	 * `overflow-x-auto` proporciona el scroll cuando hay muchos. Así el
	 * componente nunca rebosa vertical: con 12+ chips siempre cabe en 2
	 * filas y el resto se descubre haciendo scroll lateral.
	 *
	 * Solo tokens semánticos Tailwind (`bg-primary`, `text-muted-foreground`,
	 * etc.). Sin colores crudos. Ver `.claude/CONTEXTO_AGENTE.md` §
	 * "Restricciones que respetar".
	 */
	import { Input } from '$lib/components/ui/input';

	type Option = { value: string; label: string; dotColor?: string };
	type Group = { key: string; label: string; items: Option[] };

	let {
		mode = 'select',
		items,
		groups,
		value,
		onChange,
		onCreateNew,
		searchPlaceholder = 'Buscar…',
		emptyText = 'Aún no hay opciones en el catálogo.',
		filteredEmptyText = 'No hay resultados.',
		label,
		ariaLabel,
		showSearch = true,
		accent = 'primary'
	}: {
		mode?: 'select' | 'readonly';
		items?: Option[];
		groups?: Group[];
		value?: string[];
		onChange?: (v: string[]) => void;
		onCreateNew?: () => void;
		searchPlaceholder?: string;
		emptyText?: string;
		filteredEmptyText?: string;
		label?: string;
		ariaLabel?: string;
		// Si false, oculta el Input de búsqueda interno (el caller controla
		// la query externamente y pre-filtra `items`/`groups`). Útil cuando
		// el padre comparte un único buscador entre varios ChipPickers (p.
		// ej. tabs "Fue bien / Fue mal" en RollEditor).
		showSearch?: boolean;
		// Color semántico para diferenciar contextos (p. ej. "Fue bien" vs
		// "Fue mal"). Afecta al chip seleccionado y a un tint sutil del
		// contenedor de chips. Solo se aplica en modo select.
		accent?: 'primary' | 'success' | 'warning';
	} = $props();

	// Clase para el chip seleccionado según el accent. Las clases se
	// escriben enteras (no `bg-${accent}`) para que el JIT de Tailwind v4
	// las detecte en build.
	const selectedChipClass = $derived(
		accent === 'success'
			? 'border-success bg-success text-success-foreground'
			: accent === 'warning'
				? 'border-warning bg-warning text-warning-foreground'
				: 'border-primary bg-primary text-primary-foreground'
	);

	// Tint del contenedor de chips. `space-y-2` se mantiene siempre para
	// separar los grupos entre sí.
	const accentContainerClass = $derived(
		accent === 'success'
			? 'space-y-2 rounded-md bg-success/5 p-1.5'
			: accent === 'warning'
				? 'space-y-2 rounded-md bg-warning/5 p-1.5'
				: 'space-y-2'
	);

	let query = $state('');

	function normalize(s: string): string {
		return s.toLocaleLowerCase();
	}

	function isSelected(v: string): boolean {
		return value?.includes(v) ?? false;
	}

	function handleToggle(optValue: string) {
		if (mode !== 'select' || !onChange) return;
		const current = value ?? [];
		if (current.includes(optValue)) {
			onChange(current.filter((v) => v !== optValue));
		} else {
			onChange([...current, optValue]);
		}
	}

	// Filtra una lista plana de options por la query actual (case-insensitive,
	// solo contra `label`). Si la query está vacía, devuelve la lista entera.
	function filterOptions(opts: Option[]): Option[] {
		const q = normalize(query.trim());
		if (!q) return opts;
		return opts.filter((o) => normalize(o.label).includes(q));
	}

	// En modo select, agrupamos el catálogo: si vinieron `groups`, filtramos
	// cada grupo y descartamos los que queden vacíos; si vinieron `items`,
	// devolvemos un único grupo sintético para reutilizar el mismo render.
	// `null` significa "no hay nada que renderizar" (catálogo vacío del todo).
	const filteredGroups = $derived.by<Group[] | null>(() => {
		if (groups) {
			const out: Group[] = [];
			for (const g of groups) {
				const filtered = filterOptions(g.items);
				if (filtered.length > 0) out.push({ ...g, items: filtered });
			}
			return out;
		}
		if (items) {
			const filtered = filterOptions(items);
			return [{ key: '__flat__', label: '', items: filtered }];
		}
		return null;
	});

	// Para decidir si mostramos `emptyText` (catálogo vacío de raíz) o
	// `filteredEmptyText` (hay catálogo pero el buscador no devuelve nada).
	const catalogIsEmpty = $derived(
		(groups?.every((g) => g.items.length === 0) ?? true) && (items?.length ?? 0) === 0
	);

	const hasAnyFilteredResult = $derived(
		(filteredGroups ?? []).some((g) => g.items.length > 0)
	);
</script>

{#if mode === 'select'}
	<div class="space-y-2">
		{#if showSearch}
			<Input
				type="search"
				bind:value={query}
				placeholder={searchPlaceholder}
				aria-label={ariaLabel ?? searchPlaceholder}
			/>
		{/if}

		<div class={accentContainerClass}>
			{#if catalogIsEmpty && !onCreateNew}
			<p class="text-sm text-muted-foreground italic">{emptyText}</p>
		{:else if catalogIsEmpty}
			<!-- Catálogo vacío pero podemos crear: pinta solo el chip "+ Crear" -->
			<div
				role="group"
				aria-label={ariaLabel}
				class="grid grid-flow-col auto-cols-max grid-rows-2 gap-2 overflow-x-auto pb-1"
			>
				<button
					type="button"
					class="row-start-1 inline-flex items-center rounded-full border border-dashed border-border px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:border-foreground/40 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
					onclick={onCreateNew}
				>
					+ Crear nueva
				</button>
			</div>
			<p class="text-sm text-muted-foreground italic">{emptyText}</p>
		{:else if !hasAnyFilteredResult}
			<p class="text-sm text-muted-foreground italic">{filteredEmptyText}</p>
			{#if onCreateNew}
				<div
					role="group"
					aria-label={ariaLabel}
					class="grid grid-flow-col auto-cols-max grid-rows-2 gap-2 overflow-x-auto pb-1"
				>
					<button
						type="button"
						class="row-start-1 inline-flex items-center rounded-full border border-dashed border-border px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:border-foreground/40 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
						onclick={onCreateNew}
					>
						+ Crear nueva
					</button>
				</div>
			{/if}
		{:else}
			<!-- Render principal: cada grupo con su sub-label (si tiene) +
			     su propio grid de 2 filas / scroll horizontal. El chip
			     "+ Crear nueva" solo aparece dentro del ÚLTIMO grupo,
			     como chip más. -->
			{#each filteredGroups ?? [] as grupo, idx (grupo.key)}
				{@const isLast = idx === (filteredGroups?.length ?? 0) - 1}
				<div class="space-y-1.5">
					{#if grupo.label}
						<p class="text-xs font-semibold text-muted-foreground">{grupo.label}</p>
					{/if}
					<div
						role="group"
						aria-label={grupo.label || ariaLabel}
						class="grid grid-flow-col auto-cols-max grid-rows-2 gap-2 overflow-x-auto pb-1"
					>
						{#each grupo.items as opt (opt.value)}
							{@const selected = isSelected(opt.value)}
							<button
								type="button"
								role="checkbox"
								aria-checked={selected}
								class="inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm whitespace-nowrap transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none {selected
									? selectedChipClass
									: 'border-border bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground'}"
								onclick={() => handleToggle(opt.value)}
							>
								{#if opt.dotColor}
									<span
										class="inline-block h-1.5 w-4 rounded-sm border border-foreground/20"
										style:background-color={opt.dotColor}
										aria-hidden="true"
									></span>
								{/if}
								{opt.label}
							</button>
						{/each}
						{#if isLast && onCreateNew}
							<button
								type="button"
								class="inline-flex items-center rounded-full border border-dashed border-border px-3 py-1.5 text-sm whitespace-nowrap text-muted-foreground transition-colors hover:border-foreground/40 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
								onclick={onCreateNew}
							>
								+ Crear nueva
							</button>
						{/if}
					</div>
				</div>
			{/each}
		{/if}
		</div>
	</div>
{:else}
	<!-- readonly: sin buscador, sin crear-nueva, chips no interactivos. -->
	{#if filteredGroups && filteredGroups.length > 0 && hasAnyFilteredResult}
		<div class="space-y-1">
			{#if label}
				<p class="text-xs font-semibold text-muted-foreground">{label}</p>
			{/if}
			{#each filteredGroups as grupo (grupo.key)}
				<div class="space-y-1">
					{#if grupo.label}
						<p class="text-xs font-semibold text-muted-foreground">{grupo.label}</p>
					{/if}
					<div
						role="group"
						aria-label={grupo.label || label || ariaLabel}
						class="flex flex-wrap gap-2"
					>
						{#each grupo.items as opt (opt.value)}
							<span
								class="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted px-2 py-0.5 text-xs whitespace-nowrap text-muted-foreground"
							>
								{#if opt.dotColor}
									<span
										class="inline-block h-1.5 w-4 rounded-sm border border-foreground/20"
										style:background-color={opt.dotColor}
										aria-hidden="true"
									></span>
								{/if}
								{opt.label}
							</span>
						{/each}
					</div>
				</div>
			{/each}
		</div>
	{/if}
{/if}
