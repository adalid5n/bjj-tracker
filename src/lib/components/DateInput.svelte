<script lang="ts">
	import { DateField } from 'bits-ui';
	import { CalendarDate, type DateValue } from '@internationalized/date';

	let {
		value = $bindable(''),
		id,
		required = false,
		ariaLabel,
		// `placeholder` se acepta para no romper consumidores existentes,
		// pero DateField gestiona los segmentos vacíos por sí mismo y
		// no usa un atributo placeholder de texto libre.
		placeholder: _placeholder = 'DD/MM/YYYY'
	}: {
		value: string;
		id?: string;
		required?: boolean;
		ariaLabel?: string;
		placeholder?: string;
	} = $props();

	/**
	 * Traduce ISO `YYYY-MM-DD` (o `""`) ↔ `CalendarDate`.
	 * Mantenemos un único `DateValue | undefined` que sincronizamos en
	 * ambos sentidos con el ISO que ven los consumidores.
	 */
	function isoToDate(iso: string): DateValue | undefined {
		if (!iso || iso.length !== 10) return undefined;
		const parts = iso.split('-');
		if (parts.length !== 3) return undefined;
		const y = Number(parts[0]);
		const m = Number(parts[1]);
		const d = Number(parts[2]);
		if (!Number.isInteger(y) || !Number.isInteger(m) || !Number.isInteger(d)) return undefined;
		try {
			return new CalendarDate(y, m, d);
		} catch {
			return undefined;
		}
	}

	function dateToIso(date: DateValue | undefined): string {
		if (!date) return '';
		const y = String(date.year).padStart(4, '0');
		const m = String(date.month).padStart(2, '0');
		const d = String(date.day).padStart(2, '0');
		return `${y}-${m}-${d}`;
	}

	// `internal` es el estado "controlado" que se le pasa a DateField como
	// prop one-way. El único canal de subida es `onValueChange`, y el único
	// sitio que escribe `internal` es el `$effect` de abajo, que se reactiva
	// cuando la prop `value` (ISO) cambia respecto al ISO actual de `internal`.
	// Mantener dos canales (bind:value + $effect) provocaba un loop reactivo
	// que colgaba el navegador al montar el componente con una fecha inicial.
	let internal = $state<DateValue | undefined>(isoToDate(value));

	$effect(() => {
		const v = value;
		if (v !== dateToIso(internal)) {
			internal = isoToDate(v);
		}
	});

	function handleValueChange(v: DateValue | undefined) {
		const iso = dateToIso(v);
		if (iso !== value) value = iso;
	}
</script>

<DateField.Root
	value={internal}
	onValueChange={handleValueChange}
	locale="es-ES"
	granularity="day"
	{required}
>
	<DateField.Input
		{id}
		aria-label={ariaLabel}
		class="dark:bg-input/30 border-input focus-within:border-ring focus-within:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive flex h-8 w-full min-w-0 items-center rounded-lg border bg-transparent px-2.5 py-1 text-base transition-colors outline-none focus-within:ring-3 md:text-sm"
	>
		{#snippet children({ segments })}
			{#each segments as { part, value: segValue }, i (i)}
				{#if part === 'literal'}
					<DateField.Segment {part} class="text-muted-foreground">
						{segValue}
					</DateField.Segment>
				{:else}
					<DateField.Segment
						{part}
						class="rounded px-0.5 focus:bg-accent focus:text-accent-foreground focus:outline-none data-[placeholder]:text-muted-foreground"
					>
						{segValue}
					</DateField.Segment>
				{/if}
			{/each}
		{/snippet}
	</DateField.Input>
</DateField.Root>
