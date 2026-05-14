<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import SesionForm from '$lib/components/SesionForm.svelte';
	import RollEditor from '$lib/components/RollEditor.svelte';
	import BottomNav from '$lib/components/BottomNav.svelte';
	import Fab from '$lib/components/Fab.svelte';
	import { Button } from '$lib/components/ui/button';
	import type { Companero, Posicion, Roll, Sesion, TipoSesion } from '$lib/types';

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
	// T-13: mapa rollId → posiciones-problema asociadas (chips read-only
	// bajo cada roll). Se rellena tras cargar rolls y se refresca tras
	// cualquier mutación de roll.
	let posicionesProblemaByRoll = $state<Map<string, Posicion[]>>(new Map());

	let editorOpen = $state(false);
	let editingRoll: Roll | undefined = $state(undefined);

	onMount(async () => {
		try {
			const [{ getSesion }, { listRolls, getPosicionesProblemaByRolls }, { listCompaneros }] =
				await Promise.all([
					import('$lib/sesiones'),
					import('$lib/rolls'),
					import('$lib/companeros')
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
			// T-13: cargar posiciones-problema de todos los rolls en batch.
			posicionesProblemaByRoll = await getPosicionesProblemaByRolls(rolls.map((r) => r.id));
			status = 'ready';
		} catch (err) {
			errorMessage = err instanceof Error ? err.message : String(err);
			status = 'error';
			console.error('[sesion/:id] init failed:', err);
		}
	});

	async function refreshRolls() {
		const { listRolls, getPosicionesProblemaByRolls } = await import('$lib/rolls');
		const { listCompaneros } = await import('$lib/companeros');
		rolls = await listRolls(id);
		const companeros = await listCompaneros();
		companerosById = new Map(companeros.map((c) => [c.id, c]));
		// T-13: refrescar el mapa tras cualquier mutación de rolls.
		posicionesProblemaByRoll = await getPosicionesProblemaByRolls(rolls.map((r) => r.id));
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
		// T-12: posiciones de problema (catálogo). Persiste tras
		// create/update via `setPosicionesProblema` (idempotente).
		posicion_problema_ids: string[];
	}) {
		const { createRoll, updateRoll, setPosicionesProblema } = await import('$lib/rolls');
		const { posicion_problema_ids, ...rollFields } = data;
		let rollId: string;
		if (editingRoll) {
			await updateRoll(rollFields);
			rollId = rollFields.id;
		} else {
			const { id: _id, ...rest } = rollFields;
			const created = await createRoll(rest);
			rollId = created.id;
		}
		await setPosicionesProblema(rollId, posicion_problema_ids);
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
