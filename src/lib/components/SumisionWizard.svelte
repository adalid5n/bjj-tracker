<script lang="ts">
	/**
	 * Wizard de SUMISION terminal (T-9) — crear / editar.
	 *
	 * Mismo patrón que `PosicionWizard` pero simplificado: no hay chips
	 * skippables (no hay categoría ni tipo de rol). Solo 2 pasos:
	 *
	 *   1. Nombre (obligatorio, sin auto-avance — es texto).
	 *   2. Notas (textarea opcional, botón Guardar).
	 *
	 * NO es un Dialog en sí — el Dialog lo provee `MapaModalHost`. Aquí
	 * solo renderizamos el contenido interno y nos integramos con el
	 * stack via `mapaModalStack.pop()` / `closeAll()`.
	 *
	 * En modo `editar` precarga la sumisión vía `getSumision(id)`. El
	 * caller (host) puede pasar `onSaved` para refrescar caches.
	 *
	 * Patrones heredados de T-8:
	 *  - Todos los pasos montados (`class:hidden`), nunca `{#if currentStep
	 *    === N}`, para evitar el bug de remount con `bind:value`.
	 *  - Dirty handler registrado en el stack → host muestra AlertDialog
	 *    "¿Descartar cambios?" si el usuario intenta cerrar con cambios.
	 *
	 * UNIQUE: `sumisiones_terminales.nombre` tiene constraint UNIQUE.
	 * Capturamos el error y lo presentamos en `errorMsg` sin cerrar.
	 */
	import { onMount, onDestroy } from 'svelte';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Textarea } from '$lib/components/ui/textarea';
	import type { SumisionTerminal } from '$lib/types';
	import { mapaModalStack } from './mapa-modal-stack.svelte';

	let {
		modo,
		sumisionId,
		onSaved,
		onRequestClose
	}: {
		modo: 'crear' | 'editar';
		sumisionId?: string;
		// Hook para que el host invalide su cache tras guardar/crear.
		onSaved?: (id: string, modo: 'crear' | 'editar') => void;
		// Hook para que el host pida cerrar el stack desde aquí (Cancelar).
		onRequestClose?: () => void;
	} = $props();

	const totalSteps = 2;

	let nombre = $state('');
	let notas = $state('');

	let currentStep = $state(1);
	let visitedSteps = $state<Set<number>>(new Set([1]));

	// Inicializa en 'loading'; en modo crear pasa a 'ready' en `onMount`.
	let status: 'loading' | 'ready' | 'error' = $state('loading');
	let loadError = $state('');
	let saving = $state(false);
	let errorMsg = $state('');
	// Error inline del paso 1 (validación de nombre). Separado de
	// `errorMsg` (que se muestra en el footer y cubre errores de guardado)
	// para que el error de duplicado se vea junto al input.
	let nombreError = $state('');

	// Catálogo de sumisiones existentes, para validar duplicados en cliente
	// antes de pasar al paso 2 — en lugar de descubrirlo al guardar.
	let existentes = $state<SumisionTerminal[]>([]);

	// Snapshot para detectar dirty en modo editar; en modo crear se
	// compara contra los defaults vacíos.
	let snapshot = $state<{ nombre: string; notas: string }>({ nombre: '', notas: '' });

	onMount(async () => {
		// Registra el dirty handler en el stack para que el host lo
		// consulte antes de cerrar / hacer pop a una entrada anterior.
		mapaModalStack.setDirtyHandler(() => isDirty);

		// Carga el catálogo en paralelo con la posible carga de la sumisión
		// a editar. El catálogo es pequeño (decenas), no merece query
		// dedicada de "existe?".
		try {
			const { listSumisiones } = await import('$lib/sumisiones');
			existentes = await listSumisiones();
		} catch (err) {
			// No es crítico — si falla, la validación inline no funciona,
			// pero el catch de `handleSave` cubre el caso UNIQUE igual.
			console.warn('[SumisionWizard] no se pudo cargar el catálogo:', err);
		}

		if (modo !== 'editar') {
			status = 'ready';
			return;
		}
		if (!sumisionId) {
			loadError = 'Falta el id de la sumisión a editar.';
			status = 'error';
			return;
		}
		try {
			const { getSumision } = await import('$lib/sumisiones');
			const s = await getSumision(sumisionId);
			if (!s) {
				loadError = 'No se encontró la sumisión.';
				status = 'error';
				return;
			}
			nombre = s.nombre;
			notas = s.notas;
			snapshot = { nombre: s.nombre, notas: s.notas };
			status = 'ready';
		} catch (err) {
			loadError = err instanceof Error ? err.message : String(err);
			status = 'error';
		}
	});

	onDestroy(() => {
		mapaModalStack.setDirtyHandler(null);
	});

	// Hay cambios sin guardar si algún campo difiere del snapshot inicial.
	// Trim para no marcar dirty por espacios incidentales.
	const isDirty = $derived(
		nombre.trim() !== snapshot.nombre.trim() || notas.trim() !== snapshot.notas.trim()
	);

	// Limpia el error inline en cuanto el usuario edita el nombre — así el
	// mensaje no queda pegado mientras el usuario corrige.
	$effect(() => {
		// referenciamos `nombre` para que el efecto reaccione a cambios.
		nombre;
		if (nombreError) nombreError = '';
	});

	function nombreYaExiste(n: string): boolean {
		const norm = n.trim().toLowerCase();
		if (!norm) return false;
		return existentes.some(
			(s) => s.nombre.toLowerCase() === norm && (modo === 'crear' || s.id !== sumisionId)
		);
	}

	function goToStep(step: number) {
		if (step > currentStep && !visitedSteps.has(step)) return;
		currentStep = step;
	}

	function advance() {
		if (currentStep < totalSteps) {
			currentStep += 1;
			visitedSteps = new Set([...visitedSteps, currentStep]);
		}
	}

	function tryAdvanceFromStep1() {
		const n = nombre.trim();
		if (!n) return;
		if (nombreYaExiste(n)) {
			nombreError = 'Ya existe una sumisión con ese nombre.';
			return;
		}
		nombreError = '';
		advance();
	}

	function handleNombreKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter' && nombre.trim().length > 0) {
			e.preventDefault();
			tryAdvanceFromStep1();
		}
	}

	function cancel() {
		// El host se encarga de preguntar "¿descartar cambios?" si procede.
		if (onRequestClose) {
			onRequestClose();
		} else {
			mapaModalStack.pop();
		}
	}

	const canAdvanceFromStep1 = $derived(nombre.trim().length > 0);

	function isUniqueError(err: unknown): boolean {
		const msg = err instanceof Error ? err.message : String(err);
		// SQLite suele devolver "UNIQUE constraint failed: ..." al violar
		// el constraint UNIQUE sobre `nombre`.
		return /UNIQUE constraint failed/i.test(msg);
	}

	async function handleSave() {
		const nombreFinal = nombre.trim();
		if (!nombreFinal) {
			errorMsg = 'El nombre es obligatorio.';
			currentStep = 1;
			return;
		}
		saving = true;
		errorMsg = '';
		try {
			if (modo === 'crear') {
				const { createSumision } = await import('$lib/sumisiones');
				const nueva = await createSumision({
					nombre: nombreFinal,
					notas: notas.trim()
				});
				onSaved?.(nueva.id, 'crear');
				// Tras guardar ya no hay cambios pendientes: desactiva el
				// dirty handler antes de cerrar para no disparar el prompt.
				mapaModalStack.setDirtyHandler(null);
				// Cierra el wizard y abre el modal de la sumisión creada.
				mapaModalStack.closeAll();
				mapaModalStack.push({ kind: 'sumision', id: nueva.id, nombre: nueva.nombre });
			} else {
				if (!sumisionId) {
					throw new Error('Falta sumisionId en modo editar.');
				}
				const { updateSumision } = await import('$lib/sumisiones');
				const update: Omit<SumisionTerminal, 'created_at' | 'updated_at'> = {
					id: sumisionId,
					nombre: nombreFinal,
					notas: notas.trim()
				};
				await updateSumision(update);
				onSaved?.(sumisionId, 'editar');
				mapaModalStack.setDirtyHandler(null);
				// Vuelve al modal anterior (la sumisión que se estaba viendo).
				mapaModalStack.pop();
			}
		} catch (err) {
			if (isUniqueError(err)) {
				// Caso de carrera: la validación inline no detectó el duplicado
				// (otra pestaña creó el nombre entre carga y save). Mostramos el
				// error inline en el paso 1 para mantener consistencia visual.
				nombreError = 'Ya existe una sumisión con ese nombre.';
				errorMsg = '';
				currentStep = 1;
			} else {
				errorMsg = err instanceof Error ? err.message : String(err);
			}
		} finally {
			saving = false;
		}
	}
</script>

{#if status === 'loading'}
	<p class="text-sm text-muted-foreground">Cargando sumisión…</p>
{:else if status === 'error'}
	<div class="rounded border border-destructive/30 bg-destructive/10 p-3">
		<p class="text-sm font-semibold text-destructive">Error</p>
		<pre class="mt-1 text-xs whitespace-pre-wrap text-destructive">{loadError}</pre>
	</div>
{:else}
	<!-- Indicador de progreso (mismo patrón que PosicionWizard). -->
	<div class="flex items-center gap-1 pt-2">
		{#each Array(totalSteps) as _, i (i)}
			{@const step = i + 1}
			{@const visited = visitedSteps.has(step)}
			{@const isCurrent = step === currentStep}
			<button
				type="button"
				class="h-1.5 flex-1 rounded-full transition-colors {isCurrent
					? 'bg-primary'
					: visited
						? 'bg-primary/40 hover:bg-primary/60 cursor-pointer'
						: 'bg-muted'}"
				disabled={!visited || isCurrent}
				onclick={() => goToStep(step)}
				aria-label="Ir al paso {step}"
			></button>
		{/each}
	</div>
	<p class="text-center text-xs text-muted-foreground">
		Paso {currentStep} de {totalSteps}
	</p>

	<!--
	  Todos los pasos viven montados (clave del fix del bug B de T-8). El
	  paso inactivo se oculta con `hidden`, así Svelte no desmonta/remonta
	  los bindings `bind:value` y los $state del padre se preservan al
	  navegar entre pasos.
	-->
	<div class="space-y-4 py-2">
		<div class="space-y-3" class:hidden={currentStep !== 1}>
			<h3 class="text-sm font-semibold">Nombre *</h3>
			<Input
				bind:value={nombre}
				placeholder="p. ej. armbar, mata leão, kimura"
				onkeydown={handleNombreKeydown}
				autofocus={currentStep === 1}
				aria-invalid={nombreError ? 'true' : undefined}
				aria-describedby={nombreError ? 'sumision-nombre-error' : undefined}
			/>
			{#if nombreError}
				<p id="sumision-nombre-error" class="text-sm text-destructive">{nombreError}</p>
			{/if}
			<p class="text-xs text-muted-foreground">Pulsa Enter o "Continuar" para avanzar.</p>
		</div>

		<div class="space-y-3" class:hidden={currentStep !== 2}>
			<h3 class="text-sm font-semibold">Notas (opcional)</h3>
			<div class="space-y-1.5">
				<Label for="sumision-notas">Notas</Label>
				<Textarea
					id="sumision-notas"
					bind:value={notas}
					rows={4}
					placeholder="Pinta-pega lo que quieras recordar sobre esta sumisión."
				/>
			</div>
		</div>
	</div>

	{#if errorMsg}
		<p class="text-sm text-destructive">{errorMsg}</p>
	{/if}

	<div class="mt-2 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3">
		<Button variant="outline" size="sm" onclick={cancel} disabled={saving}>Cancelar</Button>

		<div class="flex flex-wrap gap-2">
			{#if currentStep > 1}
				<Button
					variant="outline"
					size="sm"
					onclick={() => goToStep(currentStep - 1)}
					disabled={saving}
				>
					← Anterior
				</Button>
			{/if}

			{#if currentStep === totalSteps}
				<Button size="sm" onclick={handleSave} disabled={saving || !nombre.trim()}>
					{saving ? 'Guardando…' : 'Guardar'}
				</Button>
			{:else if currentStep === 1}
				<Button size="sm" onclick={tryAdvanceFromStep1} disabled={!canAdvanceFromStep1}>
					Continuar
				</Button>
			{/if}
		</div>
	</div>
{/if}
