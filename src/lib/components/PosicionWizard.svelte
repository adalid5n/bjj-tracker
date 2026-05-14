<script lang="ts">
	/**
	 * Wizard de POSICION (T-8) — crear / editar.
	 *
	 * NO es un Dialog en sí — el Dialog lo provee el padre. Aquí solo
	 * renderizamos el contenido interno (4 pasos con auto-avance estilo
	 * RollEditor).
	 *
	 * Modos de integración (T-12):
	 *
	 *  - **`mode='stack'` (default)**: invocado desde `MapaModalHost` como
	 *    parte del stack de modales del mapa. Usa `mapaModalStack` para
	 *    registrar el dirty handler, cerrar/cancelar y disparar el flujo
	 *    de "+ Crear nueva inline" vía `returnHandler` cuando otro wizard
	 *    pushó este sub-wizard.
	 *
	 *  - **`mode='standalone'`**: invocado desde un Dialog propio fuera
	 *    del mapa (p. ej. `PosicionWizardDialog` desde `RollEditor`).
	 *    No invoca métodos de `mapaModalStack` (todas las llamadas están
	 *    guardadas por `mode === 'stack'`). El módulo se sigue importando
	 *    porque exporta solo una clase singleton sin side effects al
	 *    cargar. El padre debe pasar `onSaved` y `onRequestClose`; el
	 *    dirty se reporta vía `onDirtyChange`. No hay sub-wizards
	 *    anidados en standalone (no se exponen rutas para abrirlos).
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
	 *  - **Botón skippable (A)**: en pasos 2 y 3 el botón siempre dice
	 *    "Continuar" (decisión stakeholder 2026-05-13 s7). Si ya hay
	 *    valor en `categoria` / `tipo` avanza sin tocarlo; si está vacío
	 *    aplica el default (categoria=otro, tipo=undefined).
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
	import { capitalizeFirst } from '$lib/utils';

	let {
		modo,
		mode = 'stack',
		posicionId,
		onSaved,
		onRequestClose,
		onDirtyChange
	}: {
		modo: 'crear' | 'editar';
		// Modo de integración con el padre (T-12). 'stack' usa
		// `mapaModalStack`; 'standalone' usa solo callbacks.
		mode?: 'stack' | 'standalone';
		posicionId?: string;
		// Hook para que el host invalide su cache tras guardar/crear.
		// id = id de la posición creada/editada; mode permite distinguir.
		// En `standalone`, además, el padre cierra el Dialog tras esto.
		onSaved?: (id: string, modo: 'crear' | 'editar') => void;
		// Hook para que el host pida cerrar (Cancelar del wizard).
		// El host se encarga del prompt de descartar cambios.
		onRequestClose?: () => void;
		// Solo `standalone`: informa al padre del estado dirty para que
		// pueda mostrar el confirm de descartar al cerrar el Dialog.
		// Se llama cada vez que `isDirty` cambia.
		onDirtyChange?: (isDirty: boolean) => void;
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
	let nombreError = $state('');

	// Catálogo de posiciones existentes para validar duplicados de nombre.
	// El schema tiene `UNIQUE` en `nombre` de `posiciones`, así que validamos
	// inline al avanzar del paso 1 (mismo patrón que SumisionWizard).
	let existentes = $state<Posicion[]>([]);

	// Snapshot para detectar dirty en modo editar. En modo crear comparamos
	// contra "vacío" (los defaults de arriba).
	let snapshot = $state<{
		nombre: string;
		categoria: CategoriaPosicion | undefined;
		tipo: TipoRolPosicion | undefined;
		notas: string;
	}>({ nombre: '', categoria: undefined, tipo: undefined, notas: '' });

	/**
	 * Listener global de Enter para cubrir el caso "foco perdido". Ver
	 * comentario en TecnicaWizard.svelte para el detalle: el
	 * `onkeydowncapture` del wrapper no recibe el evento cuando el target
	 * es `document.body`, así que aquí lo recogemos y delegamos.
	 */
	function handleDocumentEnter(e: KeyboardEvent) {
		if (e.key !== 'Enter') return;
		const target = e.target as HTMLElement | null;
		// Inputs y textareas tienen semántica natural de Enter (submit del
		// form, newline). Cualquier otra cosa (body con foco perdido, botón
		// del indicador de progreso del wizard, label, etc.) deja el control
		// al wizard — handleWizardKeydown hace preventDefault y evita que
		// se dispare el click sintético del botón enfocado.
		if (target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA') return;
		handleWizardKeydown(e);
	}

	onMount(async () => {
		// Registra el dirty handler en el stack (solo `stack`). En
		// `standalone` el padre se entera vía `onDirtyChange` (efecto
		// reactivo más abajo).
		if (mode === 'stack') {
			mapaModalStack.setDirtyHandler(() => isDirty);
		}
		if (typeof document !== 'undefined') document.addEventListener('keydown', handleDocumentEnter, true);

		// Carga el catálogo siempre (crear y editar). En editar lo usamos
		// para validar duplicados excluyendo la propia posición.
		try {
			const { listPosiciones } = await import('$lib/posiciones');
			existentes = await listPosiciones();
		} catch (err) {
			// No es crítico: el catch del UNIQUE en handleSave sigue cubriendo.
			console.warn('[PosicionWizard] no se pudo cargar listPosiciones:', err);
		}

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
		if (mode === 'stack') {
			mapaModalStack.setDirtyHandler(null);
		}
		if (typeof document !== 'undefined') document.removeEventListener('keydown', handleDocumentEnter, true);
	});

	// En `standalone`, propaga dirty al padre cada vez que cambia. En
	// `stack` no hace falta — el host pregunta vía `mapaModalStack.isDirty()`.
	$effect(() => {
		if (mode === 'standalone') {
			onDirtyChange?.(isDirty);
		}
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

	function nombreYaExiste(n: string): boolean {
		const norm = n.trim().toLowerCase();
		if (!norm) return false;
		return existentes.some(
			(p) => p.nombre.toLowerCase() === norm && (modo === 'crear' || p.id !== posicionId)
		);
	}

	function tryAdvanceFromStep1() {
		const n = nombre.trim();
		if (!n) return;
		if (nombreYaExiste(n)) {
			nombreError = 'Ya existe una posición con ese nombre.';
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

	/**
	 * Enter a nivel del wizard, en CAPTURE phase: corre antes que los
	 * handlers internos de Chips (que de otra forma podrían tragarlo).
	 * Textareas se respetan (newline natural).
	 */
	function handleWizardKeydown(e: KeyboardEvent) {
		if (e.key !== 'Enter') return;
		const target = e.target as HTMLElement | null;
		if (target?.tagName === 'TEXTAREA') return;
		// Si el foco está en un chip (button dentro de un radiogroup),
		// Enter activa la selección/toggle del chip — semántica propia, no
		// la pisamos. Para cualquier OTRO target (body, botón del indicador
		// de progreso, botón del footer, input sin handler propio…) sí
		// interceptamos para evitar que Enter active el elemento enfocado
		// (típicamente: el botón 'Paso 1' del indicador, que dispararía
		// goToStep(1)).
		if (target?.closest('[role="radiogroup"]')) return;
		// Intercept inmediato: incluso si NO podemos avanzar (paso obligatorio
		// vacío), bloqueamos el evento para que no active el botón enfocado.
		e.preventDefault();
		e.stopImmediatePropagation();
		const intercept = () => {
			e.preventDefault();
			e.stopImmediatePropagation();
		};
		if (currentStep === 1) {
			if (canAdvanceFromStep1) {
				intercept();
				tryAdvanceFromStep1();
			}
			return;
		}
		if (currentStep === 2) {
			intercept();
			(categoria !== undefined ? handleContinueStep2 : handleSkipCategoria)();
			return;
		}
		if (currentStep === 3) {
			intercept();
			(tipo !== undefined ? handleContinueStep3 : handleSkipTipo)();
			return;
		}
		if (currentStep === totalSteps && nombre.trim().length > 0 && !saving) {
			intercept();
			handleSave();
		}
	}

	// Limpia el error inline al editar el nombre. Lo hacemos con `oninput`
	// explícito (NO con `$effect` reactivo que escuche `nombre`): el effect
	// se auto-borraba un microtask después de `tryAdvanceFromStep1`, lo que
	// hacía que el error apareciera y desapareciera sin que el usuario lo
	// viera. Patrón establecido en T-10 fixes-1.
	function handleNombreInput() {
		nombre = capitalizeFirst(nombre);
		if (nombreError) nombreError = '';
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
		} else if (mode === 'stack') {
			mapaModalStack.pop();
		}
		// En `standalone` sin `onRequestClose` no hay forma de cerrar —
		// el padre siempre debería pasar el callback.
	}

	const canAdvanceFromStep1 = $derived(nombre.trim().length > 0);
	// Decisión 2026-05-13 (s7): el botón skippable de los wizards siempre
	// dice "Continuar", nunca "Saltar". El comportamiento sigue siendo:
	// si hay valor avanza con él, si no hay aplica default y avanza.

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
				if (mode === 'stack') {
					// Tras guardar ya no hay cambios pendientes: desactiva el dirty
					// handler antes de cerrar para no disparar el prompt.
					mapaModalStack.setDirtyHandler(null);
					// El callback `onSaved` puede leerse en el host para invalidar
					// cache. Lo invocamos siempre antes de mover el stack para que
					// el host trabaje sobre el stack estable.
					onSaved?.(nueva.id, 'crear');
					// T-10: si hay un return handler registrado (caso típico: el
					// wizard de técnica abrió este sub-wizard desde "+ Crear nueva
					// posición" en el paso de destino), salimos del wizard con
					// `pop` y le pasamos el nuevo id al handler — en lugar de
					// hacer el `closeAll + push modal` habitual, que rompería el
					// flujo dejando al usuario en el modal de la nueva posición.
					if (mapaModalStack.hasReturnHandler()) {
						mapaModalStack.pop();
						mapaModalStack.invokeReturnHandler(nueva.id, 'posicion');
					} else {
						// Cierra el wizard y abre el modal de la posición recién creada.
						mapaModalStack.closeAll();
						mapaModalStack.push({ kind: 'posicion', id: nueva.id, nombre: nueva.nombre });
					}
				} else {
					// `standalone`: el padre decide qué hacer (típicamente cerrar
					// su Dialog). Reportamos no-dirty para suprimir el confirm.
					onDirtyChange?.(false);
					onSaved?.(nueva.id, 'crear');
				}
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
				if (mode === 'stack') {
					mapaModalStack.setDirtyHandler(null);
					onSaved?.(posicionId, 'editar');
					// Vuelve al modal anterior (la posición que se estaba viendo).
					mapaModalStack.pop();
				} else {
					onDirtyChange?.(false);
					onSaved?.(posicionId, 'editar');
				}
			}
		} catch (err) {
			// Red defensiva frente a carreras: si dos pestañas crean a la vez,
			// la validación en memoria no detecta el duplicado y SQLite levanta
			// el UNIQUE. Lo presentamos en el paso 1 como cualquier otro.
			const msg = err instanceof Error ? err.message : String(err);
			if (/UNIQUE constraint failed/i.test(msg)) {
				nombreError = 'Ya existe una posición con ese nombre.';
				currentStep = 1;
			} else {
				errorMsg = msg;
			}
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
	<!--
	  Estructura interna en flex column: el padre (MapaModalHost o
	  PosicionWizardDialog) nos da `flex-1` dentro del Dialog.Content; aquí
	  distribuimos en:
	    - cabecera (progreso) — fija
	    - body de pasos — scrollable (flex-1 overflow-y-auto)
	    - footer (botones) — fijo, al final
	  De este modo los botones Cancelar / ← Anterior / Continuar / Guardar
	  siempre quedan visibles aunque el contenido del paso desborde.
	-->
	<div class="flex h-full min-h-0 flex-col">
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
		  Body scrollable. Todos los pasos viven montados (clave del fix del
		  bug B): el paso inactivo se oculta con `hidden`, así Svelte no
		  desmonta/remonta los bindings `bind:value` ni el `<Chips>` y los
		  $state del padre se preservan al navegar entre pasos.
		-->
		<div
			class="-mx-3 min-h-0 flex-1 space-y-4 overflow-y-auto px-3 py-2"
			onkeydowncapture={handleWizardKeydown}
			role="presentation"
		>
			<div class="space-y-3" class:hidden={currentStep !== 1}>
				<h3 class="text-sm font-semibold">Nombre *</h3>
				<Input
					bind:value={nombre}
					placeholder="p. ej. guardia cerrada bottom"
					onkeydown={handleNombreKeydown}
					oninput={handleNombreInput}
					autofocus={currentStep === 1}
					aria-invalid={nombreError ? 'true' : undefined}
					aria-describedby={nombreError ? 'posicion-nombre-error' : undefined}
				/>
				{#if nombreError}
					<p id="posicion-nombre-error" class="text-sm text-destructive">{nombreError}</p>
				{/if}
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
						oninput={(e) => {
							notas = capitalizeFirst(e.currentTarget.value);
						}}
					/>
				</div>
			</div>

			{#if errorMsg}
				<p class="text-sm text-destructive">{errorMsg}</p>
			{/if}
		</div>

		<!--
		  Footer con los 3 carriles (cancelar / atrás / continuar-saltar-guardar).
		  FUERA del body scrollable: siempre visible al final del Dialog. El
		  botón ← Atrás del header del host hace pop del stack; el "Anterior"
		  de aquí navega DENTRO del wizard.
		-->
		<div
			class="mt-2 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3"
		>
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
					Continuar
				</Button>
			{:else if currentStep === 3}
				<Button
					variant="outline"
					size="sm"
					onclick={tipo !== undefined ? handleContinueStep3 : handleSkipTipo}
					disabled={saving}
				>
					Continuar
				</Button>
			{/if}

			{#if currentStep === totalSteps}
				<Button size="sm" onclick={handleSave} disabled={saving || !nombre.trim()}>
					{saving ? 'Guardando…' : 'Guardar'}
				</Button>
			{:else if currentStep === 1}
				<Button size="sm" onclick={tryAdvanceFromStep1} disabled={!canAdvanceFromStep1}
					>Continuar</Button
				>
			{/if}
			</div>
		</div>
	</div>
{/if}
