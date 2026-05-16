<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import * as Select from '$lib/components/ui/select';
	import { Button } from '$lib/components/ui/button';
	import { Label } from '$lib/components/ui/label';
	import BottomNav from '$lib/components/BottomNav.svelte';
	import DateRangePopover from '$lib/components/DateRangePopover.svelte';
	import RollEditor from '$lib/components/RollEditor.svelte';
	import MultiChips from '$lib/components/MultiChips.svelte';
	import ChipPicker from '$lib/components/ChipPicker.svelte';
	import AnalisisPanel from '$lib/components/AnalisisPanel.svelte';
	import type {
		CategoriaPosicion,
		Companero,
		PesoRelativo,
		Posicion,
		ResultadoRoll,
		Roll,
		Tecnica,
		TipoSesion
	} from '$lib/types';
	import type { RollWithContext } from '$lib/rolls';

	const TIPO_LABEL: Record<TipoSesion, string> = {
		bjj: 'BJJ',
		grappling: 'Grappling',
		open_mat: 'Open mat'
	};
	const RESULTADO_LABEL: Record<ResultadoRoll, string> = {
		domine: 'Dominé',
		equilibrado: 'Equilibrado',
		me_dominaron: 'Me dominaron'
	};
	const RESULTADO_BADGE: Record<ResultadoRoll, string> = {
		domine: 'bg-success/15 text-success',
		equilibrado: 'bg-muted text-muted-foreground',
		me_dominaron: 'bg-destructive/15 text-destructive'
	};

	// T-13: orden de categorías idéntico al de `/mapa` y `RollEditor`. Si
	// alguna vez cambia el orden canónico, ese cambio debe replicarse aquí.
	const CATEGORIAS_ORDEN: CategoriaPosicion[] = [
		'guardia',
		'control_superior',
		'espalda',
		'transicion',
		'otro'
	];
	const CATEGORIA_LABEL: Record<CategoriaPosicion, string> = {
		guardia: 'Guardia',
		control_superior: 'Control superior',
		espalda: 'Espalda',
		transicion: 'Transición',
		otro: 'Otro'
	};

	let rolls = $state<RollWithContext[]>([]);
	let companeros = $state<Companero[]>([]);
	let status: 'loading' | 'ready' | 'error' = $state('loading');
	let errorMessage = $state('');

	let from = $state<string>('');
	let to = $state<string>('');
	let companeroId = $state<string | undefined>(undefined);
	let resultado = $state<ResultadoRoll | undefined>(undefined);
	let tipoSesion = $state<TipoSesion | undefined>(undefined);
	// T-3.it2.b: filtro multi-select por posición + catálogo agrupado por
	// categoría para los chips. El filtro empareja cualquier `resultado`
	// del vínculo `roll_posicion` (fue_bien o fallo) — semántica "el roll
	// pasó por esta posición", independientemente de cómo le fue.
	let posicionIds = $state<string[]>([]);
	let posicionesCatalog = $state<Posicion[]>([]);
	// T-3.it2.b: índice de posiciones por id (para resolver chips
	// read-only debajo de cada roll por nombre) + mapa rollId → ids de
	// posiciones separadas por resultado.
	let posicionesById = $state<Map<string, Posicion>>(new Map());
	let posicionesByRoll = $state<Map<string, { fueBien: string[]; fallaron: string[] }>>(new Map());
	// T-3.it2: catálogo de técnicas + mapa rollId → técnicas vinculadas
	// (separadas por resultado) para chips read-only bajo cada roll.
	let tecnicasById = $state<Map<string, Tecnica>>(new Map());
	let tecnicasByRoll = $state<Map<string, { fueBien: string[]; fallaron: string[] }>>(new Map());

	let editorOpen = $state(false);
	let editingRoll: Roll | undefined = $state(undefined);
	let editingRollSesionId: string | undefined = $state(undefined);

	// T-5.it2: el panel de análisis se recarga cuando esta key cambia.
	// Se incrementa tras guardar/borrar un roll desde esta página para
	// que los conteos de C1/C2 reflejen el cambio sin tener que recargar.
	let analisisReloadKey = $state(0);

	onMount(async () => {
		try {
			const [{ listCompaneros }, { listPosiciones }, { listTecnicas }] = await Promise.all([
				import('$lib/companeros'),
				import('$lib/posiciones'),
				import('$lib/tecnicas')
			]);
			companeros = await listCompaneros();
			// T-3.it2.b: catálogo de posiciones (para el filtro y para
			// resolver chips read-only debajo de cada roll).
			posicionesCatalog = await listPosiciones();
			posicionesById = new Map(posicionesCatalog.map((p) => [p.id, p]));
			// T-3.it2: índice de técnicas para resolver chips read-only.
			const tecnicas = await listTecnicas();
			tecnicasById = new Map(tecnicas.map((t) => [t.id, t]));
			await refresh();
			status = 'ready';
		} catch (err) {
			errorMessage = err instanceof Error ? err.message : String(err);
			status = 'error';
			console.error('[rolls] init failed:', err);
		}
	});

	async function refresh() {
		const { listAllRolls, getPosicionesDelRollBatch, getTecnicasDelRollBatch } =
			await import('$lib/rolls');
		rolls = await listAllRolls({
			from: from || undefined,
			to: to || undefined,
			companero_id: companeroId,
			resultado,
			tipo_sesion: tipoSesion,
			posicion_ids: posicionIds.length > 0 ? posicionIds : undefined
		});
		// T-3.it2.b: refrescar chips por fila tras cada refresh — ambos
		// mapas comparten la misma fuente de IDs de rolls.
		const rollIds = rolls.map((r) => r.id);
		posicionesByRoll = await getPosicionesDelRollBatch(rollIds);
		tecnicasByRoll = await getTecnicasDelRollBatch(rollIds);
	}

	// T-3.it2.b: helper para resolver el nombre de una posición desde el
	// índice precargado. Devuelve `null` si la posición fue borrada
	// (defensivo — no debería pasar con FK CASCADE).
	function posicionLabel(id: string): string | null {
		const p = posicionesById.get(id);
		return p ? p.nombre : null;
	}

	// T-3.it2: helper para formatear el label de un chip de técnica
	// (incluye variante entre paréntesis si la hay). Devuelve `null` si el
	// id no está en el catálogo — eso evita pintar chips fantasma si la
	// técnica fue borrada (no debería pasar con FK CASCADE, pero es
	// defensivo). El caller filtra los `null`.
	function tecnicaLabel(id: string): string | null {
		const t = tecnicasById.get(id);
		if (!t) return null;
		return t.variante ? `${t.nombre} (${t.variante})` : t.nombre;
	}

	function clearFilters() {
		from = '';
		to = '';
		companeroId = undefined;
		resultado = undefined;
		tipoSesion = undefined;
		posicionIds = [];
		void refresh();
	}

	// T-13: agrupa el catálogo por categoría con el orden canónico de
	// `/mapa`. Solo se renderizan secciones con items para evitar
	// cabeceras vacías.
	const posicionesAgrupadas = $derived.by(() => {
		const grupos: { categoria: CategoriaPosicion; items: Posicion[] }[] = [];
		for (const cat of CATEGORIAS_ORDEN) {
			const items = posicionesCatalog
				.filter((p) => p.categoria === cat)
				.slice()
				.sort((a, b) => a.nombre.localeCompare(b.nombre));
			if (items.length > 0) grupos.push({ categoria: cat, items });
		}
		return grupos;
	});

	function handlePosicionFiltroChange(ids: string[]) {
		posicionIds = ids;
		void refresh();
	}

	function openEdit(r: RollWithContext) {
		editingRoll = r;
		editingRollSesionId = r.sesion_id;
		editorOpen = true;
	}

	async function handleSaveRoll(data: {
		id: string;
		sesion_id: string;
		companero_id?: string;
		tamano_relativo?: PesoRelativo;
		duracion_min?: number;
		resultado?: ResultadoRoll;
		que_intente?: string;
		que_fallo?: string;
		posiciones_problema?: string;
		// T-3.it2.b: posiciones y técnicas vinculadas, separadas por
		// resultado. Aquí sólo aplica modo editar (el id del roll viene
		// siempre poblado en data.id). Persisten tras updateRoll vía
		// `setPosicionesDelRoll` / `setTecnicasDelRoll` (idempotentes).
		posiciones_fue_bien_ids: string[];
		posiciones_fallaron_ids: string[];
		tecnicas_fue_bien_ids: string[];
		tecnicas_fallaron_ids: string[];
	}) {
		const { updateRoll, setPosicionesDelRoll, setTecnicasDelRoll } = await import('$lib/rolls');
		const {
			posiciones_fue_bien_ids,
			posiciones_fallaron_ids,
			tecnicas_fue_bien_ids,
			tecnicas_fallaron_ids,
			...rollFields
		} = data;
		await updateRoll(rollFields);
		await setPosicionesDelRoll(rollFields.id, posiciones_fue_bien_ids, posiciones_fallaron_ids);
		await setTecnicasDelRoll(rollFields.id, tecnicas_fue_bien_ids, tecnicas_fallaron_ids);
		await refresh();
		analisisReloadKey++;
	}

	async function handleDeleteRoll() {
		if (!editingRoll) return;
		const { deleteRoll } = await import('$lib/rolls');
		await deleteRoll(editingRoll.id);
		await refresh();
		analisisReloadKey++;
	}

	// T-13: helpers para agrupar rolls por día. La fecha viene en
	// `r.sesion_fecha` como ISO `YYYY-MM-DD` (sin hora). Para "Hoy"/"Ayer"
	// comparamos contra la fecha local del navegador formateada igual.
	function todayIso(): string {
		const d = new Date();
		const y = String(d.getFullYear()).padStart(4, '0');
		const m = String(d.getMonth() + 1).padStart(2, '0');
		const day = String(d.getDate()).padStart(2, '0');
		return `${y}-${m}-${day}`;
	}

	function yesterdayIso(): string {
		const d = new Date();
		d.setDate(d.getDate() - 1);
		const y = String(d.getFullYear()).padStart(4, '0');
		const m = String(d.getMonth() + 1).padStart(2, '0');
		const day = String(d.getDate()).padStart(2, '0');
		return `${y}-${m}-${day}`;
	}

	// Formatter de día completo para headers: "lun, 12 may 2026".
	const headerFmt = new Intl.DateTimeFormat('es-ES', {
		weekday: 'short',
		day: 'numeric',
		month: 'short',
		year: 'numeric'
	});

	function dayHeaderLabel(iso: string): string {
		if (iso === todayIso()) return 'Hoy';
		if (iso === yesterdayIso()) return 'Ayer';
		return headerFmt.format(new Date(iso + 'T00:00:00'));
	}

	// Agrupa los rolls por `sesion_fecha` manteniendo el orden actual. Como
	// `listAllRolls` ya devuelve `ORDER BY s.fecha DESC, r.orden DESC`, los
	// grupos salen automáticamente en orden de fecha descendente y los rolls
	// dentro de cada grupo conservan el orden original.
	const rollsPorDia = $derived.by(() => {
		const grupos: { fecha: string; label: string; items: RollWithContext[] }[] = [];
		let actual: { fecha: string; label: string; items: RollWithContext[] } | null = null;
		for (const r of rolls) {
			if (!actual || actual.fecha !== r.sesion_fecha) {
				actual = { fecha: r.sesion_fecha, label: dayHeaderLabel(r.sesion_fecha), items: [] };
				grupos.push(actual);
			}
			actual.items.push(r);
		}
		return grupos;
	});

	const activeFilterCount = $derived(
		[from, to, companeroId, resultado, tipoSesion].filter(Boolean).length +
			(posicionIds.length > 0 ? 1 : 0)
	);

	// `from` y `to` ya no exponen un `onchange` directo (lo hacían los
	// <Input type="date">). Con `DateInput`, el ISO se propaga sólo cuando
	// la fecha es válida o queda vacía, así que disparamos refresh aquí.
	// T-3.it2.b: también trackeamos `posicionIds` para reaccionar al
	// cambio del filtro multi-select (aunque `handlePosicionFiltroChange`
	// ya llama a `refresh()` explícitamente, mantenerlo aquí cubre cualquier
	// otra mutación futura del array).
	$effect(() => {
		// Tracking explícito.
		from;
		to;
		posicionIds;
		if (status === 'ready') void refresh();
	});
</script>

<svelte:head>
	<title>Rolls · BJJ Tracker</title>
</svelte:head>

<main class="mx-auto max-w-2xl space-y-3 p-4 pb-28">
	<!--
	  Sub-header sticky: el bloque de filtros queda pegado justo debajo del
	  AppHeader (h-14 → top-14 = 56px) cuando el usuario hace scroll.
	  `bg-background` opaca el contenido que scrollea por debajo. `pb-2`
	  añade separación visual del contenido scrolleable. `-mx-4 px-4` para
	  que la línea inferior llegue de borde a borde del viewport (el `main`
	  tiene `p-4`). El `details` cerrado se ve compacto (solo summary);
	  abierto crece y ocupa más espacio sticky — comportamiento aceptado.
	-->
	<div class="sticky top-14 z-20 -mx-4 border-b border-border bg-background px-4 pb-2">
	<details class="rounded border border-border bg-muted">
		<summary class="cursor-pointer px-3 py-2 text-sm font-medium text-foreground">
			Filtros {activeFilterCount > 0 ? `(${activeFilterCount})` : ''}
		</summary>
		<div class="space-y-3 border-t border-border p-3">
			<div class="space-y-1">
				<Label for="filter-fechas" class="text-xs">Fechas</Label>
				<DateRangePopover
					id="filter-fechas"
					bind:from
					bind:to
					ariaLabel="Filtrar por rango de fechas"
				/>
			</div>

			<div class="space-y-1">
				<Label for="filter-comp" class="text-xs">Compañero</Label>
				<Select.Root
					type="single"
					bind:value={companeroId as string}
					onValueChange={() => void refresh()}
				>
					<Select.Trigger id="filter-comp" class="w-full">
						{companeros.find((c) => c.id === companeroId)?.nombre ?? 'Cualquiera'}
					</Select.Trigger>
					<Select.Content>
						{#each companeros as c (c.id)}
							<Select.Item value={c.id}>{c.nombre}</Select.Item>
						{/each}
					</Select.Content>
				</Select.Root>
			</div>

			<div class="grid grid-cols-2 gap-2">
				<div class="space-y-1">
					<Label for="filter-res" class="text-xs">Resultado</Label>
					<Select.Root
						type="single"
						bind:value={resultado as string}
						onValueChange={() => void refresh()}
					>
						<Select.Trigger id="filter-res" class="w-full">
							{resultado ? RESULTADO_LABEL[resultado] : 'Cualquiera'}
						</Select.Trigger>
						<Select.Content>
							<Select.Item value="domine">Dominé</Select.Item>
							<Select.Item value="equilibrado">Equilibrado</Select.Item>
							<Select.Item value="me_dominaron">Me dominaron</Select.Item>
						</Select.Content>
					</Select.Root>
				</div>
				<div class="space-y-1">
					<Label for="filter-tipo" class="text-xs">Tipo sesión</Label>
					<Select.Root
						type="single"
						bind:value={tipoSesion as string}
						onValueChange={() => void refresh()}
					>
						<Select.Trigger id="filter-tipo" class="w-full">
							{tipoSesion ? TIPO_LABEL[tipoSesion] : 'Cualquiera'}
						</Select.Trigger>
						<Select.Content>
							<Select.Item value="bjj">BJJ</Select.Item>
							<Select.Item value="grappling">Grappling</Select.Item>
							<Select.Item value="open_mat">Open mat</Select.Item>
						</Select.Content>
					</Select.Root>
				</div>
			</div>

			<div class="space-y-2">
				<Label class="text-xs">Posición</Label>
				{#if posicionesAgrupadas.length === 0}
					<p class="text-xs text-muted-foreground italic">
						Aún no hay posiciones en el catálogo.
					</p>
				{:else}
					<div class="space-y-2">
						{#each posicionesAgrupadas as grupo (grupo.categoria)}
							<div class="space-y-1.5">
								<p class="text-xs font-semibold text-muted-foreground">
									{CATEGORIA_LABEL[grupo.categoria]}
								</p>
								<MultiChips
									options={grupo.items.map((p) => ({ value: p.id, label: p.nombre }))}
									value={posicionIds}
									onChange={handlePosicionFiltroChange}
									ariaLabel={`Posiciones de ${CATEGORIA_LABEL[grupo.categoria]}`}
								/>
							</div>
						{/each}
					</div>
				{/if}
			</div>

			{#if activeFilterCount > 0}
				<Button variant="outline" size="sm" onclick={clearFilters} class="w-full">
					Limpiar filtros
				</Button>
			{/if}
		</div>
	</details>
	</div>

	<AnalisisPanel reloadKey={analisisReloadKey} />

	{#if status === 'loading'}
		<p class="text-primary">Cargando…</p>
	{:else if status === 'error'}
		<div class="rounded border border-destructive/30 bg-destructive/10 p-3">
			<p class="font-semibold text-destructive">Error</p>
			<pre class="mt-2 text-sm whitespace-pre-wrap text-destructive">{errorMessage}</pre>
		</div>
	{:else if rolls.length === 0}
		<p class="rounded border border-dashed border-border p-8 text-center text-muted-foreground">
			{activeFilterCount > 0
				? 'No hay rolls que coincidan con los filtros.'
				: 'Aún no has registrado ningún roll.'}
		</p>
	{:else}
		<p class="text-xs text-muted-foreground">{rolls.length} roll(s)</p>
		{#each rollsPorDia as grupo (grupo.fecha)}
			<section class="space-y-2">
				<h2 class="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
					{grupo.label}
				</h2>
				<ul class="space-y-2">
					{#each grupo.items as r (r.id)}
						{@const posBien = posicionesByRoll.get(r.id)?.fueBien ?? []}
						{@const posFallaron = posicionesByRoll.get(r.id)?.fallaron ?? []}
						{@const tecBien = tecnicasByRoll.get(r.id)?.fueBien ?? []}
						{@const tecFallaron = tecnicasByRoll.get(r.id)?.fallaron ?? []}
						<li>
							<button
								type="button"
								class="w-full rounded-lg border border-border bg-card p-3 text-left shadow-xs transition-colors hover:bg-accent"
								onclick={() => openEdit(r)}
							>
								<div class="flex items-baseline justify-between gap-2">
									<div class="flex items-baseline gap-2">
										{#if r.companero_nombre}
											<span class="font-medium">{r.companero_nombre}</span>
										{:else}
											<span class="text-sm text-muted-foreground italic">Sin compañero</span>
										{/if}
									</div>
									{#if r.resultado}
										<span class="rounded px-2 py-0.5 text-xs {RESULTADO_BADGE[r.resultado]}">
											{RESULTADO_LABEL[r.resultado]}
										</span>
									{/if}
								</div>
								<div class="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
									<span>{TIPO_LABEL[r.sesion_tipo]}</span>
									<a
										href={resolve(`/sesion/${r.sesion_id}`)}
										class="text-primary underline hover:opacity-80"
										onclick={(e) => {
											e.preventDefault();
											e.stopPropagation();
											void goto(resolve(`/sesion/${r.sesion_id}`));
										}}
									>
										Ver sesión →
									</a>
								</div>
								{#if r.que_fallo}
									<div class="mt-1 truncate text-sm text-muted-foreground">{r.que_fallo}</div>
								{/if}
								<!-- T-3.it2.b: hasta 4 filas read-only de chips
								     (posiciones fueron bien / fallé, técnicas fueron bien /
								     fallé). Cada fila se oculta si su lista está vacía.
								     Los `*Label(id)` devuelven null si el id ya no
								     existe en el catálogo (defensivo) — filtramos esos. -->
								{#if posBien.length}
									<div class="mt-2">
										<ChipPicker
											mode="readonly"
											label="Posiciones que fueron bien"
											items={posBien
												.map((pid) => ({ value: pid, label: posicionLabel(pid) ?? '' }))
												.filter((o) => o.label)}
										/>
									</div>
								{/if}
								{#if posFallaron.length}
									<div class="mt-1">
										<ChipPicker
											mode="readonly"
											label="Posiciones que fallé"
											items={posFallaron
												.map((pid) => ({ value: pid, label: posicionLabel(pid) ?? '' }))
												.filter((o) => o.label)}
										/>
									</div>
								{/if}
								{#if tecBien.length}
									<div class="mt-1">
										<ChipPicker
											mode="readonly"
											label="Técnicas que fueron bien"
											items={tecBien
												.map((tid) => ({ value: tid, label: tecnicaLabel(tid) ?? '' }))
												.filter((o) => o.label)}
										/>
									</div>
								{/if}
								{#if tecFallaron.length}
									<div class="mt-1">
										<ChipPicker
											mode="readonly"
											label="Técnicas que fallé"
											items={tecFallaron
												.map((tid) => ({ value: tid, label: tecnicaLabel(tid) ?? '' }))
												.filter((o) => o.label)}
										/>
									</div>
								{/if}
							</button>
						</li>
					{/each}
				</ul>
			</section>
		{/each}
	{/if}
</main>

<BottomNav />

{#if editingRollSesionId}
	<RollEditor
		bind:open={editorOpen}
		sesionId={editingRollSesionId}
		roll={editingRoll}
		onSave={handleSaveRoll}
		onDelete={editingRoll ? handleDeleteRoll : undefined}
	/>
{/if}
