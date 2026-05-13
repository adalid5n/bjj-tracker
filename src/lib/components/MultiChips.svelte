<script lang="ts">
	/**
	 * MultiChips — chips de selección múltiple (T-12).
	 *
	 * Es una copia adaptada de `Chips.svelte` (single-select) con dos
	 * cambios:
	 *  - `value` es `string[]` en vez de `string | null`.
	 *  - El click en un chip lo añade o lo quita del array.
	 *
	 * Se decidió crear un componente separado en lugar de extender el
	 * `Chips` original con un flag `multi` porque las firmas de `value` y
	 * `onChange` cambian con el modo y los 5 call sites actuales son
	 * single-select estricto. Mantener `Chips.svelte` con tipos simples es
	 * más limpio.
	 *
	 * Como `Chips`, usa tokens semánticos del proyecto (sin colores crudos).
	 * El `role="group"` (en lugar de `radiogroup`) refleja que las
	 * selecciones no son mutuamente excluyentes.
	 */
	type Option = { value: string; label: string; dotColor?: string };

	let {
		options,
		value,
		onChange,
		ariaLabel
	}: {
		options: Option[];
		value: string[];
		onChange: (v: string[]) => void;
		ariaLabel?: string;
	} = $props();

	function isSelected(v: string): boolean {
		return value.includes(v);
	}

	function handleClick(optValue: string) {
		if (isSelected(optValue)) {
			onChange(value.filter((v) => v !== optValue));
		} else {
			onChange([...value, optValue]);
		}
	}
</script>

<div role="group" aria-label={ariaLabel} class="flex flex-wrap gap-2">
	{#each options as opt (opt.value)}
		{@const selected = isSelected(opt.value)}
		<button
			type="button"
			role="checkbox"
			aria-checked={selected}
			class="inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none {selected
				? 'border-primary bg-primary text-primary-foreground'
				: 'border-border bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground'}"
			onclick={() => handleClick(opt.value)}
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
</div>
