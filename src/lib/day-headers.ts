// Headers de día reusables entre vistas que agrupan registros por fecha
// (home con sesiones, /rolls con rolls). Formato canónico: "Hoy", "Ayer"
// o "lun, 12 may 2026" (es-ES, weekday corto + día + mes corto + año).
//
// Convención de las fechas: ISO de día sin tiempo (`YYYY-MM-DD`).

const dayFormatter = new Intl.DateTimeFormat('es-ES', {
	weekday: 'short',
	day: 'numeric',
	month: 'short',
	year: 'numeric'
});

export function todayIso(): string {
	const d = new Date();
	const y = d.getFullYear();
	const m = String(d.getMonth() + 1).padStart(2, '0');
	const day = String(d.getDate()).padStart(2, '0');
	return `${y}-${m}-${day}`;
}

export function yesterdayIso(): string {
	const d = new Date();
	d.setDate(d.getDate() - 1);
	const y = d.getFullYear();
	const m = String(d.getMonth() + 1).padStart(2, '0');
	const day = String(d.getDate()).padStart(2, '0');
	return `${y}-${m}-${day}`;
}

export function dayHeaderLabel(iso: string): string {
	if (iso === todayIso()) return 'Hoy';
	if (iso === yesterdayIso()) return 'Ayer';
	return dayFormatter.format(new Date(iso + 'T00:00:00'));
}
