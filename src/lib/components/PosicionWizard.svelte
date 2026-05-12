<script lang="ts">
	/**
	 * Wizard de POSICION (T-8) — crear / editar.
	 *
	 * NO es un Dialog en sí — el Dialog lo provee `MapaModalHost`. Aquí
	 * solo renderizamos el contenido interno (4 pasos con auto-avance
	 * estilo RollEditor) y nos integramos con el stack via
	 * `mapaModalStack.pop()` / `closeAll()` al cancelar o guardar.
	 *
	 * Pasos:
	 *   1. Nombre (obligatorio, sin auto-avance — es texto).
	 *   2. Categoría (chips, skippable → default `otro`).
	 *   3. Tipo rol (chips, skippable → undefined).
	 *   4. Notas (textarea opcional, botón Guardar).
	 *
	 * En modo `editar` precarga la posición vía `getPosicion(id)`. El
	 * caller (host) puede pasar `onSaved` para refrescar caches.
	 *
	 * T-8 fixes:
	 *  - **Bug B**: TODOS los inputs se mantienen montados (los pasos no
	 *    visibles usan `class:hidden`). Antes estaban dentro de
	 *    `{#if currentStep === N}` y al re-montar el `<Input>` /
	 *    `<Chips>` el `bind:value` podía resetear el estado del padre
	 *    durante el ciclo de unmount → mount. Con todos los componentes
	 *    presentes el binding se mantiene estable.
	 *  - **Botón skippable dinámico (A)**: en pasos 2 y 3, si ya hay
	 *    valor en `categoria` / `tipo` el botón dice "Continuar" y
	 *    avanza sin tocar el valor. Si está vacío dice "Saltar" y aplica
	 *    el default (categoria=otro, tipo=undefined).
	 *  - **Dirty handler (E)**: el host consulta este wizard antes de
	 *    cerrar todo el stack o pop a una entrada anterior, para
	 *    confirmar "¿descartar cambios?".
	 */
	import { onMount, onDestroy } from 'svelte';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Textarea } from '$lib/components/ui/textarea';
	import Chips from '$lib/components/Chips.svelte';
	import type { CategoriaPosicion, Posicion, TipoRolPosicion } from '$lib/types';
	import { mapaModalStack } from './mapa-modal-stack.svelte';

	let {
		modo,
		posicionId,
		onSaved,
		onRequestClose
	}: {
		modo: 'crear' | 'editar';
		posicionId?: string;
		// Hook para que el host invalide su cache tras guardar/crear.
		// id = id de la posición creada/editada; mode permite distinguir.
		onSaved?: (id: string, modo: 'crear' | 'editar') => void;
		// Hook para que el host pida cerrar el stack desde aquí (Cancelar
		// del wizard). El host se encarga del prompt de descartar cambios.
		onRequestClose?: () => void;
	} = $props();

	const CATEGORIAS: { value: CategoriaPosicion; label: string }[] = [
		{ value: 'guardia', label: 'Guardia' },
		{ value: 'control_superior', label: 'Control superior' },
		{ value: 'espalda', label: 'Espalda' },
		{ value: 'transicion', label: 'Transición' },
		{ value: 'otro', label: 'Otro' }
	];

	const TIPOS_ROL: { value: TipoRolPosicion; label: string }[] = [
		{ value: 'ofensiva', label: 'Ofensiva' },
		{ value: 'defensiva', label: 'Defensiva' },
		{ value: 'neutral', label: 'Neutral' }
	];

	const totalSteps = 4;

	// `categoria` y `tipo` arrancan como undefined: nos permite distinguir
	// "el usuario no ha tocado nada" de "el usuario eligió otro/lo que sea".
	// Si llegamos al guardado con categoria undefined, lo materializamos a 'otro'.
	let nombre = $state('');
	let categoria = $state<CategoriaPosicion | undefined>(undefined);
	let tipo = $state<TipoRolPosicion | undefined>(undefined);
	let notas = $state('');

	let currentStep = $state(1);
	let visitedSteps = $state<Set<number>>(new Set([1]));

	// Inicializa siempre en 'loading'; en modo crear lo movemos a 'ready'
	// dentro de `onMount`. Así evitamos `state_referenced_locally` al
	// leer `modo` en la inicialización del runa.
	let status: 'loading' | 'ready' | 'error' = $state('loading');
	let loadError = $state('');
	let saving = $state(false);
	let errorMsg = $state('');

	// Snapshot para detectar dirty en modo editar. En modo crear comparamos
	// contra "vacío" (los defaults de arriba).
	let snapshot = $state<{
		nombre: string;
		categoria: CategoriaPosicion | undefined;
		tipo: TipoRolPosicion | undefined;
		notas: string;
	}>({ nombre: '', categoria: undefined, tipo: undefined, notas: '' });

	onMount(async () => {
		// Registra el dirty handler en el stack para que el host lo consulte
		// antes de cerrar / hacer pop a una entrada anterior.
		mapaModalStack.setDirtyHandler(() => isDirty);

		if (modo !== 'editar') {
			// snapshot ya es el "vacío" inicial.
			status = 'ready';
			return;
		}
		if (!posicionId) {
			loadError = 'Falta el id de la posición a editar.';
			status = 'error';
			return;
		}
		try {
			const { getPosicion } = await import('$lib/posiciones');
			const p = await getPosicion(posicionId);
			if (!p) {
				loadError = 'No se encontró la posición.';
				status = 'error';
				return;
			}
			nombre = p.nombre;
			categoria = p.categoria;
			tipo = p.tipo;
			notas = p.notas;
			snapshot = {
				nombre: p.nombre,
				categoria: p.categoria,
				tipo: p.tipo,
				notas: p.notas
			};
			status = 'ready';
		} catch (err) {
			loadError = err instanceof Error ? err.message : String(err);
			status = 'error';
		}
	});

	onDestroy(() => {
		// Limpia el handler para que entradas posteriores del stack que no
		// sean wizards no disparen el prompt de descartar.
		mapaModalStack.setDirtyHandler(null);
	});

	// Hay cambios sin guardar si algún campo difiere del snapshot inicial.
	// Trim en nombre/notas para no marcar dirty por espacios incidentales.
	const isDirty = $derived(
		nombre.trim() !== snapshot.nombre.trim() ||
			categoria !== snapshot.categoria ||
			tipo !== snapshot.tipo ||
			notas.trim() !== snapshot.notas.trim()
	);

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

	function handleNombreKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter' && nombre.trim().length > 0) {
			e.preventDefault();
			advance();
		}
	}

	function handleCategoriaChange(v: string | null) {
		// Si se "deselecciona", marcamos como undefined (no elegido) para
		// que el botón vuelva a decir "Saltar" y el guardado aplique 'otro'.
		if (!v) {
			categoria = undefined;
			return;
		}
		categoria = v as CategoriaPosicion;
		advance();
	}

	function handleSkipCategoria() {
		// El botón "Saltar" deja la categoría como undefined (la persistencia
		// la materializará a 'otro'). Convive con "Continuar" cuando ya hay
		// valor — ese caso se gestiona en el handler `handleContinueStep2`.
		categoria = undefined;
		advance();
	}

	function handleContinueStep2() {
		// Mantener valor existente y avanzar.
		advance();
	}

	function handleTipoChange(v: string | null) {
		tipo = (v ?? undefined) as TipoRolPosicion | undefined;
		if (v) advance();
	}

	function handleSkipTipo() {
		tipo = undefined;
		advance();
	}

	function handleContinueStep3() {
		advance();
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
	// Etiquetas dinámicas del botón skippable (cambio A): "Continuar" si
	// el usuario ya tiene un valor seleccionado en ese paso, "Saltar" si no.
	const step2SkipLabel = $derived(categoria !== undefined ? 'Continuar' : 'Saltar');
	const step3SkipLabel = $derived(tipo !== undefined ? 'Continuar' : 'Saltar');

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
			// Materializa el default 'otro' si el usuario nunca tocó la categoría.
			const categoriaFinal: CategoriaPosicion = categoria ?? 'otro';
			if (modo === 'crear') {
				const { createPosicion } = await import('$lib/posiciones');
				const nueva = await createPosicion({
					nombre: nombreFinal,
					categoria: categoriaFinal,
					tipo,
					notas: notas.trim()
				});
				onSaved?.(nueva.id, 'crear');
				// Tras guardar ya no hay cambios pendientes: desactiva el dirty
				// handler antes de cerrar para no disparar el prompt.
				mapaModalStack.setDirtyHandler(null);
				// Cierra el wizard y abre el modal de la posición recién creada.
				mapaModalStack.closeAll();
				mapaModalStack.push({ kind: 'posicion', id: nueva.id, nombre: nueva.nombre });
			} else {
				if (!posicionId) {
					throw new Error('Falta posicionId en modo editar.');
				}
				const { updatePosicion } = await import('$lib/posiciones');
				const update: Omit<Posicion, 'created_at' | 'updated_at'> = {
					id: posicionId,
					nombre: nombreFinal,
					categoria: categoriaFinal,
					tipo,
					notas: notas.trim()
				};
				await updatePosicion(update);
				onSaved?.(posicionId, 'editar');
				mapaModalStack.setDirtyHandler(null);
				// Vuelve al modal anterior (la posición que se estaba viendo).
				mapaModalStack.pop();
			}
		} catch (err) {
			errorMsg = err instanceof Error ? err.message : String(err);
		} finally {
			saving = false;
		}
	}
</script>

{#if status === 'loading'}
	<p class="text-sm text-muted-foreground">Cargando posición…</p>
{:else if status === 'error'}
	<div class="rounded border border-destructive/30 bg-destructive/10 p-3">
		<p class="text-sm font-semibold text-destructive">Error</p>
		<pre class="mt-1 text-xs whitespace-pre-wrap text-destructive">{loadError}</pre>
	</div>
{:else}
	<!-- Indicador de progreso (mismo patrón que RollEditor). -->
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
	  Todos los pasos viven montados (clave del fix del bug B). El paso
	  inactivo se oculta con `hidden`, así Svelte no desmonta/remonta los
	  bindings `bind:value` ni el `<Chips>`, y los $state del padre se
	  preservan al navegar entre pasos.
	-->
	<div class="space-y-4 py-2">
		<div class="space-y-3" class:hidden={currentStep !== 1}>
			<h3 class="text-sm font-semibold">Nombre *</h3>
			<Input
				bind:value={nombre}
				placeholder="p. ej. guardia cerrada bottom"
				onkeydown={handleNombreKeydown}
				autofocus={currentStep === 1}
			/>
			<p class="text-xs text-muted-foreground">Pulsa Enter o "Continuar" para avanzar.</p>
		</div>

		<div class="space-y-3" class:hidden={currentStep !== 2}>
			<h3 class="text-sm font-semibold">Categoría</h3>
			<Chips
				options={CATEGORIAS}
				value={categoria ?? null}
				onChange={handleCategoriaChange}
				ariaLabel="Categoría de la posición"
			/>
			<p class="text-xs text-muted-foreground">
				Si la saltas, queda como "Otro". Se puede cambiar después.
			</p>
		</div>

		<div class="space-y-3" class:hidden={currentStep !== 3}>
			<h3 class="text-sm font-semibold">Tipo de rol</h3>
			<Chips
				options={TIPOS_ROL}
				value={tipo ?? null}
				onChange={handleTipoChange}
				ariaLabel="Tipo de rol de la posición"
			/>
			<p class="text-xs text-muted-foreground">Opcional. Puedes saltarte este paso.</p>
		</div>

		<div class="space-y-3" class:hidden={currentStep !== 4}>
			<h3 class="text-sm font-semibold">Notas (opcional)</h3>
			<div class="space-y-1.5">
				<Label for="posicion-notas">Notas</Label>
				<Textarea
					id="posicion-notas"
					bind:value={notas}
					rows={4}
					placeholder="Pinta-pega lo que quieras recordar sobre esta posición."
				/>
			</div>
		</div>
	</div>

	{#if errorMsg}
		<p class="text-sm text-destructive">{errorMsg}</p>
	{/if}

	<!--
	  Footer con los 3 carriles (cancelar / atrás / continuar-saltar-guardar).
	  Mantenemos la convención: el botón ← Atrás del header del host hace
	  pop del stack; el "Anterior" de aquí navega DENTRO del wizard.
	-->
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

			{#if currentStep === 2}
				<Button
					variant="outline"
					size="sm"
					onclick={categoria !== undefined ? handleContinueStep2 : handleSkipCategoria}
					disabled={saving}
				>
					{step2SkipLabel}
				</Button>
			{:else if currentStep === 3}
				<Button
					variant="outline"
					size="sm"
					onclick={tipo !== undefined ? handleContinueStep3 : handleSkipTipo}
					disabled={saving}
				>
					{step3SkipLabel}
				</Button>
			{/if}

			{#if currentStep === totalSteps}
				<Button size="sm" onclick={handleSave} disabled={saving || !nombre.trim()}>
					{saving ? 'Guardando…' : 'Guardar'}
				</Button>
			{:else if currentStep === 1}
				<Button size="sm" onclick={advance} disabled={!canAdvanceFromStep1}>Continuar</Button>
			{/if}
		</div>
	</div>
{/if}
