<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import SesionForm from '$lib/components/SesionForm.svelte';
	import RollEditor from '$lib/components/RollEditor.svelte';
	import BottomNav from '$lib/components/BottomNav.svelte';
	import Fab from '$lib/components/Fab.svelte';
	import ChipPicker from '$lib/components/ChipPicker.svelte';
	import { Button } from '$lib/components/ui/button';
	import type { Companero, Posicion, Roll, Sesion, Tecnica, TipoSesion } from '$lib/types';

	const RESULTADO_LABEL = {
		domine: 'Dominé',
		equilibrado: 'Equilibrado',
		me_dominaron: 'Me dominaron'
	} as const;

	const RESULTADO_BADGE = {
		domine: 'bg-success/15 text-success',
		equilibrado: 'bg-muted text-muted-foreground',
		me_dominaron: 'bg-destructive/15 text-destructive'
	} as const;

	let sesion = $state<Sesion | null>(null);
	let status: 'loading' | 'ready' | 'notfound' | 'error' = $state('loading');
	let errorMessage = $state('');
	let savedFlash = $state(false);
	const id = $derived(page.params.id as string);

	let rolls = $state<Roll[]>([]);
	let companerosById = $state<Map<string, Companero>>(new Map());
	// T-3.it2.b: índice de posiciones (id → Posicion) + mapa rollId →
	// posiciones vinculadas separadas por resultado. Refrescados en cada
	// mutación de roll. Reemplazan al antiguo `posicionesProblemaByRoll`
	// que sólo cubría el caso legado de "donde tuve problema".
	let posicionesById = $state<Map<string, Posicion>>(new Map());
	let posicionesByRoll = $state<Map<string, { fueBien: string[]; fallaron: string[] }>>(new Map());
	// T-3.it2: catálogo de técnicas (id → Tecnica) + mapa rollId → técnicas
	// vinculadas separadas por resultado. Refrescados en cada mutación.
	let tecnicasById = $state<Map<string, Tecnica>>(new Map());
	let tecnicasByRoll = $state<Map<string, { fueBien: string[]; fallaron: string[] }>>(new Map());

	let editorOpen = $state(false);
	let editingRoll: Roll | undefined = $state(undefined);

	onMount(async () => {
		try {
			const [
				{ getSesion },
				{ listRolls, getPosicionesDelRollBatch, getTecnicasDelRollBatch },
				{ listCompaneros },
				{ listPosiciones },
				{ listTecnicas }
			] = await Promise.all([
				import('$lib/sesiones'),
				import('$lib/rolls'),
				import('$lib/companeros'),
				import('$lib/posiciones'),
				import('$lib/tecnicas')
			]);
			const found = await getSesion(id);
			if (!found) {
				status = 'notfound';
				return;
			}
			sesion = found;
			rolls = await listRolls(id);
			const companeros = await listCompaneros();
			companerosById = new Map(companeros.map((c) => [c.id, c]));
			// T-3.it2.b: catálogo de posiciones + vínculos por roll.
			const posiciones = await listPosiciones();
			posicionesById = new Map(posiciones.map((p) => [p.id, p]));
			const rollIds = rolls.map((r) => r.id);
			posicionesByRoll = await getPosicionesDelRollBatch(rollIds);
			// T-3.it2: índice de técnicas + vínculos por roll.
			const tecnicas = await listTecnicas();
			tecnicasById = new Map(tecnicas.map((t) => [t.id, t]));
			tecnicasByRoll = await getTecnicasDelRollBatch(rollIds);
			status = 'ready';
		} catch (err) {
			errorMessage = err instanceof Error ? err.message : String(err);
			status = 'error';
			console.error('[sesion/:id] init failed:', err);
		}
	});

	async function refreshRolls() {
		const { listRolls, getPosicionesDelRollBatch, getTecnicasDelRollBatch } =
			await import('$lib/rolls');
		const { listCompaneros } = await import('$lib/companeros');
		const { listPosiciones } = await import('$lib/posiciones');
		const { listTecnicas } = await import('$lib/tecnicas');
		rolls = await listRolls(id);
		const companeros = await listCompaneros();
		companerosById = new Map(companeros.map((c) => [c.id, c]));
		// T-3.it2.b: refrescar catálogo de posiciones (puede haber
		// posiciones recién creadas inline desde el editor) y vínculos.
		const posiciones = await listPosiciones();
		posicionesById = new Map(posiciones.map((p) => [p.id, p]));
		const rollIds = rolls.map((r) => r.id);
		posicionesByRoll = await getPosicionesDelRollBatch(rollIds);
		// T-3.it2: refrescar catálogo de técnicas (puede haber técnicas
		// recién creadas inline desde el editor) y mapa de vínculos.
		const tecnicas = await listTecnicas();
		tecnicasById = new Map(tecnicas.map((t) => [t.id, t]));
		tecnicasByRoll = await getTecnicasDelRollBatch(rollIds);
	}

	// T-3.it2.b: helpers de label para chips read-only debajo de cada roll.
	// Devuelven null si el id ya no existe en el catálogo (defensivo).
	function tecnicaLabel(id: string): string | null {
		const t = tecnicasById.get(id);
		if (!t) return null;
		return t.variante ? `${t.nombre} (${t.variante})` : t.nombre;
	}

	function posicionLabel(id: string): string | null {
		const p = posicionesById.get(id);
		return p ? p.nombre : null;
	}

	async function handleSubmitSesion(data: {
		fecha: string;
		tipo: TipoSesion;
		foco?: string;
		tecnica_clase?: string;
		obs_profesor?: string;
	}) {
		if (!sesion) return;
		const { updateSesion, getSesion } = await import('$lib/sesiones');
		await updateSesion({ id: sesion.id, ...data });
		sesion = await getSesion(sesion.id);
		savedFlash = true;
		setTimeout(() => (savedFlash = false), 1500);
	}

	async function handleDeleteSesion() {
		if (!sesion) return;
		if (!confirm('¿Borrar esta sesión? Se borrarán también todos sus rolls.')) return;
		const { deleteSesion } = await import('$lib/sesiones');
		await deleteSesion(sesion.id);
		await goto(resolve('/'), { replaceState: true });
	}

	function openNewRoll() {
		editingRoll = undefined;
		editorOpen = true;
	}

	function openEditRoll(r: Roll) {
		editingRoll = r;
		editorOpen = true;
	}

	async function handleSaveRoll(data: {
		id: string;
		sesion_id: string;
		companero_id?: string;
		tamano_relativo?: Roll['tamano_relativo'];
		duracion_min?: number;
		resultado?: Roll['resultado'];
		que_intente?: string;
		que_fallo?: string;
		posiciones_problema?: string;
		// T-3.it2.b: posiciones y técnicas vinculadas, separadas por
		// resultado. Persisten tras create/update vía `setPosicionesDelRoll`
		// y `setTecnicasDelRoll` (idempotentes — borran y reinsertan).
		posiciones_fue_bien_ids: string[];
		posiciones_fallaron_ids: string[];
		tecnicas_fue_bien_ids: string[];
		tecnicas_fallaron_ids: string[];
	}) {
		const { createRoll, updateRoll, setPosicionesDelRoll, setTecnicasDelRoll } =
			await import('$lib/rolls');
		const {
			posiciones_fue_bien_ids,
			posiciones_fallaron_ids,
			tecnicas_fue_bien_ids,
			tecnicas_fallaron_ids,
			...rollFields
		} = data;
		let rollId: string;
		if (editingRoll) {
			await updateRoll(rollFields);
			rollId = rollFields.id;
		} else {
			const { id: _id, ...rest } = rollFields;
			const created = await createRoll(rest);
			rollId = created.id;
		}
		await setPosicionesDelRoll(rollId, posiciones_fue_bien_ids, posiciones_fallaron_ids);
		await setTecnicasDelRoll(rollId, tecnicas_fue_bien_ids, tecnicas_fallaron_ids);
		await refreshRolls();
	}

	async function handleDeleteRoll() {
		if (!editingRoll) return;
		const { deleteRoll } = await import('$lib/rolls');
		await deleteRoll(editingRoll.id);
		await refreshRolls();
	}
</script>

<svelte:head>
	<title>Sesión · BJJ Tracker</title>
</svelte:head>

<main class="mx-auto max-w-2xl space-y-4 p-4 pb-32">
	{#if status === 'loading'}
		<p class="text-primary">Cargando…</p>
	{:else if status === 'notfound'}
		<div class="rounded border border-warning/40 bg-warning/15 p-3">
			<p class="text-warning">Esta sesión no existe (ID: {id}).</p>
		</div>
	{:else if status === 'error'}
		<div class="rounded border border-destructive/30 bg-destructive/10 p-3">
			<p class="font-semibold text-destructive">Error</p>
			<pre class="mt-2 text-sm whitespace-pre-wrap text-destructive">{errorMessage}</pre>
		</div>
	{:else if sesion}
		<SesionForm initial={sesion} submitLabel="Guardar cambios" onSubmit={handleSubmitSesion} />

		{#if savedFlash}
			<p class="text-sm text-success">✓ Guardado</p>
		{/if}

		<section class="space-y-3 border-t border-border pt-4">
			<h2 class="text-sm font-semibold text-foreground">
				Rolls ({rolls.length})
			</h2>

			{#if rolls.length === 0}
				<p class="text-sm text-muted-foreground italic">
					Aún no hay rolls en esta sesión. Pulsa el botón de abajo para añadir el primero.
				</p>
			{:else}
				<ul class="space-y-2">
					{#each rolls as r (r.id)}
						{@const posBien = posicionesByRoll.get(r.id)?.fueBien ?? []}
						{@const posFallaron = posicionesByRoll.get(r.id)?.fallaron ?? []}
						{@const tecBien = tecnicasByRoll.get(r.id)?.fueBien ?? []}
						{@const tecFallaron = tecnicasByRoll.get(r.id)?.fallaron ?? []}
						{@const itemsBien = [
							...posBien.map((id) => ({ value: id, label: posicionLabel(id) ?? '' })),
							...tecBien.map((id) => ({ value: id, label: tecnicaLabel(id) ?? '' }))
						].filter((o) => o.label)}
						{@const itemsMal = [
							...posFallaron.map((id) => ({ value: id, label: posicionLabel(id) ?? '' })),
							...tecFallaron.map((id) => ({ value: id, label: tecnicaLabel(id) ?? '' }))
						].filter((o) => o.label)}
						<li>
							<button
								type="button"
								class="w-full rounded-lg border border-border bg-card p-3 text-left shadow-xs transition-colors hover:bg-accent"
								onclick={() => openEditRoll(r)}
							>
								<div class="flex items-baseline justify-between gap-2">
									<div class="flex items-baseline gap-2">
										<span class="text-xs font-semibold text-muted-foreground">#{r.orden}</span>
										{#if r.companero_id && companerosById.has(r.companero_id)}
											<span class="font-medium">{companerosById.get(r.companero_id)?.nombre}</span>
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
								{#if r.que_fallo}
									<div class="mt-1 truncate text-sm text-muted-foreground">{r.que_fallo}</div>
								{/if}
								<!-- 2 filas read-only mezclando posiciones + técnicas
								     (sumisiones son técnicas con tipo='sumision', ya
								     incluidas). Cada fila se oculta si su lista está
								     vacía. -->
								{#if itemsBien.length}
									<div class="mt-2">
										<ChipPicker mode="readonly" label="Fue bien" items={itemsBien} />
									</div>
								{/if}
								{#if itemsMal.length}
									<div class="mt-1">
										<ChipPicker mode="readonly" label="Fue mal" items={itemsMal} />
									</div>
								{/if}
							</button>
						</li>
					{/each}
				</ul>
			{/if}
		</section>

		<section class="border-t border-border pt-4">
			<Button variant="destructive" onclick={handleDeleteSesion} class="w-full">
				Eliminar sesión
			</Button>
		</section>

		<RollEditor
			bind:open={editorOpen}
			sesionId={sesion.id}
			roll={editingRoll}
			onSave={handleSaveRoll}
			onDelete={editingRoll ? handleDeleteRoll : undefined}
		/>
	{/if}
</main>

{#if status === 'ready'}
	<Fab onclick={openNewRoll} label="Nuevo roll" extended />
{/if}

<BottomNav />
