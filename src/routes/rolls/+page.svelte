<script lang="ts">
	import { onMount } from 'svelte';
	import { resolve } from '$app/paths';
	import * as Select from '$lib/components/ui/select';
	import { Button } from '$lib/components/ui/button';
	import { Label } from '$lib/components/ui/label';
	import BottomNav from '$lib/components/BottomNav.svelte';
	import DateInput from '$lib/components/DateInput.svelte';
	import RollEditor from '$lib/components/RollEditor.svelte';
	import MultiChips from '$lib/components/MultiChips.svelte';
	import type {
		CategoriaPosicion,
		Companero,
		PesoRelativo,
		Posicion,
		ResultadoRoll,
		Roll,
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
	// T-13: filtro multi-select por posición-problema + catálogo agrupado
	// por categoría para los chips.
	let posicionProblemaIds = $state<string[]>([]);
	let posicionesCatalog = $state<Posicion[]>([]);
	// Mapa rollId → posiciones-problema para chips bajo cada fila.
	let posicionesProblemaByRoll = $state<Map<string, Posicion[]>>(new Map());

	let editorOpen = $state(false);
	let editingRoll: Roll | undefined = $state(undefined);
	let editingRollSesionId: string | undefined = $state(undefined);

	onMount(async () => {
		try {
			const [{ listCompaneros }, { listPosiciones }] = await Promise.all([
				import('$lib/companeros'),
				import('$lib/posiciones')
			]);
			companeros = await listCompaneros();
			// T-13: catálogo para el filtro de posición-problema.
			posicionesCatalog = await listPosiciones();
			await refresh();
			status = 'ready';
		} catch (err) {
			errorMessage = err instanceof Error ? err.message : String(err);
			status = 'error';
			console.error('[rolls] init failed:', err);
		}
	});

	async function refresh() {
		const { listAllRolls, getPosicionesProblemaByRolls } = await import('$lib/rolls');
		rolls = await listAllRolls({
			from: from || undefined,
			to: to || undefined,
			companero_id: companeroId,
			resultado,
			tipo_sesion: tipoSesion,
			posicion_problema_ids: posicionProblemaIds.length > 0 ? posicionProblemaIds : undefined
		});
		// T-13: refrescar chips por fila tras cada refresh.
		posicionesProblemaByRoll = await getPosicionesProblemaByRolls(rolls.map((r) => r.id));
	}

	function clearFilters() {
		from = '';
		to = '';
		companeroId = undefined;
		resultado = undefined;
		tipoSesion = undefined;
		posicionProblemaIds = [];
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

	function handlePosicionProblemaChange(ids: string[]) {
		posicionProblemaIds = ids;
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
		// T-12: posiciones de problema (catálogo). Aquí solo aplica modo
		// editar, así que el id del roll está siempre disponible en data.id.
		posicion_problema_ids: string[];
	}) {
		const { updateRoll, setPosicionesProblema } = await import('$lib/rolls');
		const { posicion_problema_ids, ...rollFields } = data;
		await updateRoll(rollFields);
		await setPosicionesProblema(rollFields.id, posicion_problema_ids);
		await refresh();
	}

	async function handleDeleteRoll() {
		if (!editingRoll) return;
		const { deleteRoll } = await import('$lib/rolls');
		await deleteRoll(editingRoll.id);
		await refresh();
	}

	function formatFecha(iso: string): string {
		const d = new Date(iso + 'T00:00:00');
		return d.toLocaleDateString('es-ES', { weekday: 'short', day: '2-digit', month: 'short' });
	}

	const activeFilterCount = $derived(
		[from, to, companeroId, resultado, tipoSesion].filter(Boolean).length +
			(posicionProblemaIds.length > 0 ? 1 : 0)
	);

	// `from` y `to` ya no exponen un `onchange` directo (lo hacían los
	// <Input type="date">). Con `DateInput`, el ISO se propaga sólo cuando
	// la fecha es válida o queda vacía, así que disparamos refresh aquí.
	// T-13: también trackeamos `posicionProblemaIds` para reaccionar al
	// cambio del filtro multi-select (aunque `handlePosicionProblemaChange`
	// ya llama a `refresh()` explícitamente, mantenerlo aquí cubre cualquier
	// otra mutación futura del array).
	$effect(() => {
		// Tracking explícito.
		from;
		to;
		posicionProblemaIds;
		if (status === 'ready') void refresh();
	});
</script>

<svelte:head>
	<title>Rolls · BJJ Tracker</title>
</svelte:head>

<main class="mx-auto max-w-2xl space-y-3 p-4 pb-28">
	<header>
		<h1 class="text-2xl font-bold">Rolls</h1>
	</header>

	<details class="rounded border border-border bg-muted">
		<summary class="cursor-pointer px-3 py-2 text-sm font-medium text-foreground">
			Filtros {activeFilterCount > 0 ? `(${activeFilterCount})` : ''}
		</summary>
		<div class="space-y-3 border-t border-border p-3">
			<div class="grid grid-cols-2 gap-2">
				<div class="space-y-1">
					<Label for="from" class="text-xs">Desde</Label>
					<DateInput id="from" bind:value={from} />
				</div>
				<div class="space-y-1">
					<Label for="to" class="text-xs">Hasta</Label>
					<DateInput id="to" bind:value={to} />
				</div>
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
				<Label class="text-xs">Posición problema</Label>
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
									value={posicionProblemaIds}
									onChange={handlePosicionProblemaChange}
									ariaLabel={`Posiciones-problema de ${CATEGORIA_LABEL[grupo.categoria]}`}
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
		<ul class="divide-y divide-border rounded border border-border">
			{#each rolls as r (r.id)}
				<li>
					<button
						type="button"
						class="w-full p-3 text-left transition-colors hover:bg-accent"
						onclick={() => openEdit(r)}
					>
						<div class="flex items-baseline justify-between gap-2">
							<div class="flex items-baseline gap-2">
								<span class="text-xs font-semibold text-muted-foreground">
									{formatFecha(r.sesion_fecha)}
								</span>
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
								onclick={(e) => e.stopPropagation()}
							>
								Ver sesión →
							</a>
						</div>
						{#if r.que_fallo}
							<div class="mt-1 truncate text-sm text-muted-foreground">{r.que_fallo}</div>
						{/if}
						{#if posicionesProblemaByRoll.get(r.id)?.length}
							<div class="mt-2 flex flex-wrap gap-1">
								{#each posicionesProblemaByRoll.get(r.id) ?? [] as p (p.id)}
									<span
										class="inline-flex items-center rounded-full border border-border bg-muted px-2 py-0.5 text-xs text-muted-foreground"
									>
										{p.nombre}
									</span>
								{/each}
							</div>
						{/if}
					</button>
				</li>
			{/each}
		</ul>
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
