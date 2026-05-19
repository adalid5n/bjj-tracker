<script lang="ts">
	// T-1.it5: calendario mensual con compactación scroll-driven.
	//
	// Mecánica:
	// - Siempre muestra el mes completo (6 filas × 7 columnas).
	// - El componente es `sticky top-14` (debajo del AppHeader) en el
	//   layout de home — se mantiene visible al hacer scroll.
	// - Cuando el user scrollea hacia abajo, un `IntersectionObserver`
	//   sobre un sentinel justo encima del componente detecta que el
	//   sentinel ha salido del viewport → aplica clase `compact` que
	//   reduce el tamaño de cells, header y gaps con `transition` CSS.
	//   La compactación NO transforma el mes en una semana: sigue siendo
	//   el mismo mes, solo que más pequeño visualmente.
	// - "Hoy" selecciona el día de hoy y navega al mes de hoy, pero NO
	//   modifica el estado compact (la compactación es 100% scroll-driven).
	//
	// Decisión de primitive: se evaluó `bits-ui Calendar` (ya en deps) pero
	// no encaja limpiamente para compactación scroll-driven y customización
	// fina de cells/markers. Construir custom con `@internationalized/date`
	// (la lib que bits-ui Calendar usa internamente) da control completo
	// con ~180 líneas.
	//
	// Animación de cambio de mes: NO animado en esta versión (transición
	// instant del contenido del mes). Si emerge fricción real, valorar
	// CSS view transitions o transform animado como follow-up post-it.5.
	import { onDestroy, untrack } from 'svelte';
	import { CalendarDate } from '@internationalized/date';
	import ChevronLeftIcon from '@lucide/svelte/icons/chevron-left';
	import ChevronRightIcon from '@lucide/svelte/icons/chevron-right';
	import { Button } from '$lib/components/ui/button';
	import { todayIso } from '$lib/day-headers';

	let {
		selectedDate,
		onSelectDate,
		markers = new Set<string>()
	}: {
		selectedDate: string;
		onSelectDate: (iso: string) => void;
		markers?: Set<string>;
	} = $props();

	// ── Helpers de fecha ──────────────────────────────────────────────
	function isoToDate(iso: string): CalendarDate {
		const [y, m, d] = iso.split('-').map(Number);
		return new CalendarDate(y, m, d);
	}

	function dateToIso(date: CalendarDate): string {
		const y = String(date.year).padStart(4, '0');
		const m = String(date.month).padStart(2, '0');
		const d = String(date.day).padStart(2, '0');
		return `${y}-${m}-${d}`;
	}

	function getMonday(date: CalendarDate): CalendarDate {
		const dow = new Date(date.year, date.month - 1, date.day).getDay();
		const offset = dow === 0 ? 6 : dow - 1;
		return date.subtract({ days: offset });
	}

	// ── Estado ────────────────────────────────────────────────────────
	let compact = $state(false);

	// Mes visible: día 1 del mes en curso. Inicial = mes del día seleccionado.
	let viewMonth = $state<CalendarDate>(
		untrack(() => {
			const sel = isoToDate(selectedDate);
			return new CalendarDate(sel.year, sel.month, 1);
		})
	);

	// Sincronización si `selectedDate` cambia desde fuera y cae en otro mes
	// (típicamente "Hoy" o navegación programática).
	let lastSyncedSelected = untrack(() => selectedDate);
	$effect(() => {
		if (selectedDate !== lastSyncedSelected) {
			lastSyncedSelected = selectedDate;
			const sel = isoToDate(selectedDate);
			if (sel.year !== viewMonth.year || sel.month !== viewMonth.month) {
				viewMonth = new CalendarDate(sel.year, sel.month, 1);
			}
		}
	});

	// ── Días del mes: siempre 42 cells (6 filas × 7 cols) ─────────────
	const monthCells = $derived.by(() => {
		const firstOfMonth = viewMonth;
		const firstMonday = getMonday(firstOfMonth);
		const cells: { date: CalendarDate; isCurrentMonth: boolean }[] = [];
		for (let i = 0; i < 42; i++) {
			const d = firstMonday.add({ days: i });
			cells.push({
				date: d,
				isCurrentMonth: d.month === firstOfMonth.month && d.year === firstOfMonth.year
			});
		}
		return cells;
	});

	// ── Formatters ────────────────────────────────────────────────────
	const monthYearFmt = new Intl.DateTimeFormat('es-ES', { month: 'long', year: 'numeric' });
	const weekdayFmt = new Intl.DateTimeFormat('es-ES', { weekday: 'short' });

	const monthYearLabel = $derived(
		monthYearFmt.format(new Date(viewMonth.year, viewMonth.month - 1, 1))
	);

	const weekdayLabels = $derived.by(() => {
		const out: string[] = [];
		const monday = getMonday(viewMonth);
		for (let i = 0; i < 7; i++) {
			const d = monday.add({ days: i });
			out.push(
				weekdayFmt.format(new Date(d.year, d.month - 1, d.day)).replace('.', '').slice(0, 2)
			);
		}
		return out;
	});

	const todayIsoValue = $derived(todayIso());

	// ── Acciones (ninguna modifica `compact` — eso es scroll-driven) ──
	function handleDayTap(iso: string) {
		onSelectDate(iso);
	}

	function goPrev() {
		viewMonth = viewMonth.subtract({ months: 1 });
	}

	function goNext() {
		viewMonth = viewMonth.add({ months: 1 });
	}

	function goToday() {
		const today = todayIso();
		onSelectDate(today);
		const sel = isoToDate(today);
		viewMonth = new CalendarDate(sel.year, sel.month, 1);
	}

	// ── Compactación scroll-driven ────────────────────────────────────
	// Triple fix combinado tras varios intentos:
	// 1) `overflow-anchor: none` en `<main>` y descendants (en home).
	// 2) Hysteresis: compact=true >100px, compact=false <50px.
	// 3) Lockout temporal: tras cambiar compact, ignorar el listener
	//    durante 250ms (cubre los 200ms de transición CSS + 50ms de
	//    margen). Esto evita que jitter de scrollY durante la transición
	//    dispare un toggle inverso → loop. Sin este lock, el browser
	//    podía reajustar scroll durante el cambio de altura del wrapper
	//    sticky, cruzando threshold y re-disparando el toggle.
	//
	// Histórico: probamos antes IntersectionObserver+sentinel; falló por
	// scroll anchoring. Luego scroll listener simple; falló por jitter
	// durante transición. Esta versión combina los 3 fixes para
	// estabilidad robusta.
	let scrollLockUntil = 0;

	function handleScroll() {
		if (Date.now() < scrollLockUntil) return;
		const y = window.scrollY;
		if (compact && y < 50) {
			compact = false;
			scrollLockUntil = Date.now() + 250;
		} else if (!compact && y > 100) {
			compact = true;
			scrollLockUntil = Date.now() + 250;
		}
	}

	$effect(() => {
		window.addEventListener('scroll', handleScroll, { passive: true });
		// Trigger inicial por si la página ya está scrolleada al mount
		handleScroll();
		return () => window.removeEventListener('scroll', handleScroll);
	});

	onDestroy(() => window.removeEventListener('scroll', handleScroll));

	// ── Swipe horizontal ──────────────────────────────────────────────
	let touchStartX = 0;
	let touchStartY = 0;

	function onTouchStart(e: TouchEvent) {
		touchStartX = e.touches[0].clientX;
		touchStartY = e.touches[0].clientY;
	}

	function onTouchEnd(e: TouchEvent) {
		const dx = e.changedTouches[0].clientX - touchStartX;
		const dy = e.changedTouches[0].clientY - touchStartY;
		if (Math.abs(dx) < 50 || Math.abs(dy) > Math.abs(dx)) return;
		if (dx > 0) goPrev();
		else goNext();
	}
</script>

<div
	role="group"
	aria-label="Calendario mensual"
	data-compact={compact ? '' : undefined}
	class="group/cal sticky top-14 z-10 space-y-2 rounded-lg border border-border bg-card p-3 transition-all duration-200 data-[compact]:space-y-1 data-[compact]:p-1.5"
	ontouchstart={onTouchStart}
	ontouchend={onTouchEnd}
>
	<!-- Header: navegación + mes/año -->
	<div class="flex items-center justify-between gap-2">
		<Button
			variant="ghost"
			size="icon"
			onclick={goPrev}
			aria-label="Mes anterior"
			class="size-8 group-data-[compact]/cal:size-6"
		>
			<ChevronLeftIcon class="size-4" />
		</Button>
		<span class="text-sm font-medium capitalize transition-all duration-200 group-data-[compact]/cal:text-xs">
			{monthYearLabel}
		</span>
		<Button
			variant="ghost"
			size="icon"
			onclick={goNext}
			aria-label="Mes siguiente"
			class="size-8 group-data-[compact]/cal:size-6"
		>
			<ChevronRightIcon class="size-4" />
		</Button>
	</div>

	<!-- Weekday headers: ocultos en compact -->
	<div class="grid grid-cols-7 gap-1 group-data-[compact]/cal:hidden">
		{#each weekdayLabels as label, i (i)}
			<div class="text-center text-[10px] uppercase text-muted-foreground">
				{label}
			</div>
		{/each}
	</div>

	<!-- Días: SIEMPRE 42 cells. En compact las cells pierden aspect-square
	     y pasan a altura fija reducida (h-7) → el mes se "aplana"
	     verticalmente sin perder ninguna fila ni día. -->
	<div class="grid grid-cols-7 gap-1 transition-all duration-200 group-data-[compact]/cal:gap-px">
		{#each monthCells as cell (dateToIso(cell.date))}
			{@const iso = dateToIso(cell.date)}
			{@const isSelected = iso === selectedDate}
			{@const isToday = iso === todayIsoValue}
			{@const hasMarker = markers.has(iso)}
			<button
				type="button"
				onclick={() => handleDayTap(iso)}
				class="flex aspect-square flex-col items-center justify-center gap-0.5 rounded-md text-xs transition-all duration-200 group-data-[compact]/cal:aspect-auto group-data-[compact]/cal:h-7 group-data-[compact]/cal:gap-0
					{isSelected
					? 'bg-primary text-primary-foreground'
					: isToday
						? 'ring-1 ring-primary text-foreground hover:bg-accent'
						: cell.isCurrentMonth
							? 'text-foreground hover:bg-accent'
							: 'text-muted-foreground/50 hover:bg-accent'}"
				aria-label={iso}
				aria-pressed={isSelected}
			>
				<span class="text-sm font-medium transition-all duration-200 group-data-[compact]/cal:text-[10px]">
					{cell.date.day}
				</span>
				<span
					class="size-1 rounded-full transition-all group-data-[compact]/cal:size-0.5
						{hasMarker ? (isSelected ? 'bg-primary-foreground' : 'bg-foreground/60') : 'bg-transparent'}"
					aria-hidden="true"
				></span>
			</button>
		{/each}
	</div>

	<!-- Botón Hoy: visible en expanded, oculto en compact (sin sitio).
	     Para usar Hoy desde compact → scroll-up → expand → tap Hoy. -->
	<div class="flex justify-center group-data-[compact]/cal:hidden">
		<Button variant="ghost" size="sm" onclick={goToday} class="h-7 text-xs">
			Hoy
		</Button>
	</div>
</div>
