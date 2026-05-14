<script lang="ts">
	// T-13: filtro de rango de fechas como popover con calendario. Reemplaza
	// los dos <DateInput> independientes (from/to) de /rolls por un único
	// trigger que muestra el rango legible y abre un RangeCalendar de bits-ui.
	//
	// Decisión de primitive: usamos Popover + RangeCalendar manualmente en
	// vez de bits-ui DateRangePicker, porque DateRangePicker está cableado
	// a un Input segmentado (DD/MM/YYYY) en su trigger, y el stakeholder
	// pidió explícitamente un botón con texto humano ("Desde 1 may hasta
	// 14 may" / "Cualquier fecha").
	//
	// Contrato: bind a dos strings ISO (`from`, `to`) compatibles con
	// `RollFilters.from` / `.to` de `$lib/rolls`. Si solo se selecciona
	// el inicio del rango (start sin end), `to` queda en `''` para no
	// restringir el extremo superior, y viceversa.
	import { Popover, RangeCalendar } from 'bits-ui';
	import { CalendarDate, type DateValue } from '@internationalized/date';
	import type { DateRange } from 'bits-ui';
	import ChevronLeftIcon from '@lucide/svelte/icons/chevron-left';
	import ChevronRightIcon from '@lucide/svelte/icons/chevron-right';
	import CalendarIcon from '@lucide/svelte/icons/calendar';

	let {
		from = $bindable(''),
		to = $bindable(''),
		id,
		ariaLabel = 'Rango de fechas'
	}: {
		from: string;
		to: string;
		id?: string;
		ariaLabel?: string;
	} = $props();

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

	// Estado interno controlado one-way (mismo patrón que DateInput): solo
	// `handleValueChange` y el `$effect` de sincronización pueden escribir
	// `internal`. Mantener bind:value + $effect provocaría loop reactivo.
	let internal = $state<DateRange>({
		start: isoToDate(from),
		end: isoToDate(to)
	});

	$effect(() => {
		const f = from;
		const t = to;
		const currentStart = dateToIso(internal.start);
		const currentEnd = dateToIso(internal.end);
		if (f !== currentStart || t !== currentEnd) {
			internal = { start: isoToDate(f), end: isoToDate(t) };
		}
	});

	function handleValueChange(v: DateRange) {
		const newFrom = dateToIso(v.start);
		const newTo = dateToIso(v.end);
		if (newFrom !== from) from = newFrom;
		if (newTo !== to) to = newTo;
	}

	function clearRange() {
		if (from !== '') from = '';
		if (to !== '') to = '';
		internal = { start: undefined, end: undefined };
	}

	// Formatter compartido para el label del botón. Locale es-ES, "1 may".
	const labelFmt = new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'short' });
	function formatDateValue(d: DateValue): string {
		return labelFmt.format(new Date(d.year, d.month - 1, d.day));
	}

	const triggerLabel = $derived.by(() => {
		const s = internal.start;
		const e = internal.end;
		if (!s && !e) return 'Cualquier fecha';
		if (s && !e) return `Desde ${formatDateValue(s)}`;
		if (!s && e) return `Hasta ${formatDateValue(e)}`;
		if (s && e) return `${formatDateValue(s)} – ${formatDateValue(e)}`;
		return 'Cualquier fecha';
	});

	const hasValue = $derived(Boolean(internal.start) || Boolean(internal.end));
</script>

<Popover.Root>
	<Popover.Trigger
		{id}
		aria-label={ariaLabel}
		class="dark:bg-input/30 border-input focus-within:border-ring focus-within:ring-ring/50 flex h-8 w-full min-w-0 items-center justify-between gap-2 rounded-lg border bg-transparent px-2.5 py-1 text-left text-base transition-colors outline-none focus-within:ring-3 md:text-sm {hasValue
			? 'text-foreground'
			: 'text-muted-foreground'}"
	>
		<span class="flex items-center gap-2 truncate">
			<CalendarIcon class="size-4 shrink-0 text-muted-foreground" />
			<span class="truncate">{triggerLabel}</span>
		</span>
	</Popover.Trigger>
	<Popover.Portal>
		<Popover.Content
			sideOffset={6}
			class="z-50 rounded-md border border-border bg-popover p-3 text-popover-foreground shadow-md outline-none"
		>
			<RangeCalendar.Root
				bind:value={internal}
				onValueChange={handleValueChange}
				locale="es-ES"
				weekdayFormat="short"
				weekStartsOn={1}
				class="space-y-2"
			>
				{#snippet children({ months, weekdays })}
					<RangeCalendar.Header class="flex items-center justify-between">
						<RangeCalendar.PrevButton
							class="inline-flex size-7 items-center justify-center rounded-md text-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
							aria-label="Mes anterior"
						>
							<ChevronLeftIcon class="size-4" />
						</RangeCalendar.PrevButton>
						<RangeCalendar.Heading class="text-sm font-medium" />
						<RangeCalendar.NextButton
							class="inline-flex size-7 items-center justify-center rounded-md text-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
							aria-label="Mes siguiente"
						>
							<ChevronRightIcon class="size-4" />
						</RangeCalendar.NextButton>
					</RangeCalendar.Header>
					{#each months as month (month.value)}
						<RangeCalendar.Grid class="w-full border-collapse select-none space-y-1">
							<RangeCalendar.GridHead>
								<RangeCalendar.GridRow class="flex">
									{#each weekdays as day (day)}
										<RangeCalendar.HeadCell
											class="w-9 rounded-md text-center text-xs font-normal text-muted-foreground"
										>
											{day.slice(0, 2)}
										</RangeCalendar.HeadCell>
									{/each}
								</RangeCalendar.GridRow>
							</RangeCalendar.GridHead>
							<RangeCalendar.GridBody>
								{#each month.weeks as weekDates (weekDates)}
									<RangeCalendar.GridRow class="mt-1 flex w-full">
										{#each weekDates as date (date)}
											<RangeCalendar.Cell
												{date}
												month={month.value}
												class="relative size-9 p-0 text-center text-sm focus-within:relative focus-within:z-20 data-[range-start]:rounded-l-full data-[range-start]:bg-primary/15 data-[range-middle]:bg-primary/15 data-[range-end]:rounded-r-full data-[range-end]:bg-primary/15"
											>
												<RangeCalendar.Day
													class="m-0.5 inline-flex size-8 items-center justify-center rounded-full p-0 text-sm font-normal transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none data-[range-middle]:m-0 data-[range-middle]:size-9 data-[range-middle]:rounded-none data-[range-middle]:bg-transparent data-[range-middle]:text-foreground data-[range-middle]:hover:bg-transparent data-[range-start]:bg-primary data-[range-start]:text-primary-foreground data-[range-start]:hover:bg-primary data-[range-start]:hover:text-primary-foreground data-[range-end]:bg-primary data-[range-end]:text-primary-foreground data-[range-end]:hover:bg-primary data-[range-end]:hover:text-primary-foreground data-[today]:font-semibold data-[disabled]:pointer-events-none data-[disabled]:opacity-50 data-[outside-month]:pointer-events-none data-[outside-month]:opacity-30 data-[unavailable]:line-through"
												/>
											</RangeCalendar.Cell>
										{/each}
									</RangeCalendar.GridRow>
								{/each}
							</RangeCalendar.GridBody>
						</RangeCalendar.Grid>
					{/each}
				{/snippet}
			</RangeCalendar.Root>
			{#if hasValue}
				<div class="mt-2 flex justify-end border-t border-border pt-2">
					<button
						type="button"
						onclick={clearRange}
						class="rounded-md px-2 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
					>
						Limpiar
					</button>
				</div>
			{/if}
		</Popover.Content>
	</Popover.Portal>
</Popover.Root>
