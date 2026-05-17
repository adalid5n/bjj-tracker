<script lang="ts">
	/**
	 * FilterDropdown — botón compacto con popover de checkboxes.
	 *
	 * Patrón estándar de filtro tipo tabla:
	 *  [ Label ·N ▾ ]   click → checkboxes  + Limpiar
	 *
	 * Donde N es el contador de seleccionados (oculto si 0). Mismo
	 * patrón "vacío = todos pasan" que MultiChips y los demás filtros
	 * del proyecto: el llamante interpreta `value = []` como "sin filtrar".
	 *
	 * Construido sobre el wrapper DropdownMenu del proyecto (bits-ui).
	 * `onSelect={preventDefault}` en cada CheckboxItem para que el menú
	 * no se cierre al marcar — útil cuando se quieren seleccionar varios
	 * sin reabrir.
	 */
	import ChevronDownIcon from '@lucide/svelte/icons/chevron-down';
	import { Button } from '$lib/components/ui/button';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';

	type Option = { value: string; label: string };

	let {
		label,
		options,
		value,
		onChange,
		ariaLabel
	}: {
		label: string;
		options: Option[];
		value: string[];
		onChange: (v: string[]) => void;
		ariaLabel?: string;
	} = $props();

	function toggle(optValue: string, checked: boolean) {
		if (checked) {
			if (!value.includes(optValue)) onChange([...value, optValue]);
		} else {
			onChange(value.filter((v) => v !== optValue));
		}
	}
</script>

<DropdownMenu.Root>
	<DropdownMenu.Trigger>
		{#snippet child({ props })}
			<Button
				{...props}
				variant="outline"
				size="sm"
				class="gap-1.5"
				aria-label={ariaLabel ?? label}
			>
				{label}
				{#if value.length > 0}
					<span
						class="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-medium text-primary-foreground"
						aria-label={`${value.length} seleccionados`}
					>
						{value.length}
					</span>
				{/if}
				<ChevronDownIcon class="size-3.5 opacity-60" />
			</Button>
		{/snippet}
	</DropdownMenu.Trigger>
	<DropdownMenu.Content align="start" sideOffset={4} class="min-w-44">
		{#each options as opt (opt.value)}
			<DropdownMenu.CheckboxItem
				checked={value.includes(opt.value)}
				onCheckedChange={(checked) => toggle(opt.value, checked)}
				closeOnSelect={false}
			>
				{opt.label}
			</DropdownMenu.CheckboxItem>
		{/each}
		{#if value.length > 0}
			<DropdownMenu.Separator />
			<DropdownMenu.Item onSelect={() => onChange([])} class="justify-center text-sm">
				Limpiar
			</DropdownMenu.Item>
		{/if}
	</DropdownMenu.Content>
</DropdownMenu.Root>
