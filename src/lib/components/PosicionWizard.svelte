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
	import Combobox from '$lib/components/Combobox.svelte';

	type ComboboxItem = { id: string; label: string; sublabel?: string };
	import type { CategoriaPosicion, Posicion, TipoRolPosicion } from '$lib/types';
	import { mapaModalStack, posicionWizardDraft } from './mapa-modal-stack.svelte';
	import { capitalizeFirst } from '$lib/utils';

	// Identificador del item "Sin complementaria" en el Combobox. Cuando el
	// usuario lo selecciona, `complementariaId` se pone a null (limpia el
	// vínculo).
	const NONE_ID = '__none__';

	let {
		modo,
		mode = 'stack',
		posicionId,
		parentForComplementaria,
		onSaved,
		onRequestClose,
		onDirtyChange
	}: {
		modo: 'crear' | 'editar';
		// Modo de integración con el padre (T-12). 'stack' usa
		// `mapaModalStack`; 'standalone' usa solo callbacks.
		mode?: 'stack' | 'standalone';
		posicionId?: string;
		// Si el sub-wizard se abrió desde "+ Crear nueva" del paso de
		// Complementaria de otro PosicionWizard: id del padre.
		// Bajo este flag (T-1.it2 fix): (1) se salta el paso 4 del sub
		// (la complementaria es implícita = padre), (2) la nueva posición
		// se crea con `posicion_complementaria_id = padre` y la simetría
		// la aplica `syncComplementaria`, (3) el sub NO usa
		// `posicionWizardDraft` para no pisar el draft del padre — así
		// el padre, al remontarse tras el pop, restaura su `currentStep`.
		parentForComplementaria?: string;
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

	const CATEGORIA_LABEL: Record<CategoriaPosicion, string> = Object.fromEntries(
		CATEGORIAS.map((c) => [c.value, c.label])
	) as Record<CategoriaPosicion, string>;

	const TIPOS_ROL: { value: TipoRolPosicion; label: string }[] = [
		{ value: 'ofensiva', label: 'Ofensiva' },
		{ value: 'defensiva', label: 'Defensiva' },
		{ value: 'neutral', label: 'Neutral' }
	];

	// Pasos semánticos: 1=Nombre, 2=Categoría, 3=Tipo, 4=Complementaria, 5=Notas.
	// Cuando el wizard es un sub-wizard de "+ Crear nueva complementaria" (T-1.it2
	// fix), el paso 4 se salta — la complementaria es implícita (el padre).
	const visibleSteps = $derived<number[]>(
		parentForComplementaria !== undefined ? [1, 2, 3, 5] : [1, 2, 3, 4, 5]
	);
	const totalSteps = $derived(visibleSteps.length);

	// T-2.it2: en modo `editar` el componente renderiza un form plano con
	// todos los campos visibles a la vez (como `RollEditor` en modo `form`),
	// no el stepper. Modo `crear` mantiene el wizard porque guía al usuario
	// que aún no conoce qué viene.
	const viewMode = $derived<'wizard' | 'form'>(modo === 'editar' ? 'form' : 'wizard');

	// `categoria` y `tipo` arrancan como undefined: nos permite distinguir
	// "el usuario no ha tocado nada" de "el usuario eligió otro/lo que sea".
	// Si llegamos al guardado con categoria undefined, lo materializamos a 'otro'.
	let nombre = $state('');
	let categoria = $state<CategoriaPosicion | undefined>(undefined);
	let tipo = $state<TipoRolPosicion | undefined>(undefined);
	let complementariaId = $state<string | null>(null);
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

	// Clave del draft. Discrimina crear/editar y, en editar, por id (no
	// queremos restaurar el draft de otra posición distinta). El draft
	// solo se usa en modo `stack` — en `standalone` no hay sub-wizards
	// inline desde aquí.
	const draftKey = $derived(modo === 'editar' && posicionId ? `editar:${posicionId}` : 'crear');

	// Snapshot para detectar dirty en modo editar. En modo crear comparamos
	// contra "vacío" (los defaults de arriba).
	let snapshot = $state<{
		nombre: string;
		categoria: CategoriaPosicion | undefined;
		tipo: TipoRolPosicion | undefined;
		complementariaId: string | null;
		notas: string;
	}>({ nombre: '', categoria: undefined, tipo: undefined, complementariaId: null, notas: '' });

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

		// Si hay un draft persistido que coincide con la clave del wizard
		// actual (mismo modo y mismo id en editar), lo restauramos. Pasa
		// cuando el wizard se remonta tras un sub-wizard inline ("+ Crear
		// nueva posición" en el paso de complementaria). Sin esto el
		// usuario perdería todo lo que llevaba escrito.
		//
		// El sub-wizard (parentForComplementaria definido) NO lee draft
		// para no acoplarse al draft del padre (escenarios cruzados).
		const draft =
			mode === 'stack' && parentForComplementaria === undefined
				? posicionWizardDraft.value
				: null;
		if (draft && draft.key === draftKey) {
			nombre = draft.nombre;
			categoria = draft.categoria;
			tipo = draft.tipo;
			complementariaId = draft.complementariaId;
			notas = draft.notas;
			currentStep = draft.currentStep;
			visitedSteps = new Set(draft.visitedSteps);
		}

		// Sub-wizard: fija la complementaria al padre antes de que el
		// usuario pueda tocar nada. Este valor se persiste hasta el save.
		if (parentForComplementaria !== undefined) {
			complementariaId = parentForComplementaria;
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
			// El snapshot SIEMPRE refleja el estado guardado en BD (para
			// dirty detection). El estado del wizard puede venir del draft
			// (si se restauró arriba) o de la BD si no había draft.
			if (!draft || draft.key !== draftKey) {
				nombre = p.nombre;
				categoria = p.categoria;
				tipo = p.tipo;
				complementariaId = p.posicion_complementaria_id ?? null;
				notas = p.notas;
			}
			snapshot = {
				nombre: p.nombre,
				categoria: p.categoria,
				tipo: p.tipo,
				complementariaId: p.posicion_complementaria_id ?? null,
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

	// Persiste el draft (modo `stack` solamente) en cada cambio. Permite
	// sobrevivir el remount cuando se abre "+ Crear nueva" inline en el
	// paso de complementaria: el host renderiza solo el top del stack,
	// así que el PosicionWizard padre se desmonta y luego se remonta al
	// volver. Sin esto el usuario perdería todo lo escrito.
	//
	// El sub-wizard (parentForComplementaria definido) NO escribe el
	// draft — pisaría el del padre y al remontarse el padre perdería
	// `currentStep` y demás.
	$effect(() => {
		if (mode !== 'stack' || status !== 'ready' || parentForComplementaria !== undefined) return;
		posicionWizardDraft.set({
			key: draftKey,
			nombre,
			categoria,
			tipo,
			complementariaId,
			notas,
			currentStep,
			visitedSteps: Array.from(visitedSteps)
		});
	});

	// Hay cambios sin guardar si algún campo difiere del snapshot inicial.
	// Trim en nombre/notas para no marcar dirty por espacios incidentales.
	const isDirty = $derived(
		nombre.trim() !== snapshot.nombre.trim() ||
			categoria !== snapshot.categoria ||
			tipo !== snapshot.tipo ||
			complementariaId !== snapshot.complementariaId ||
			notas.trim() !== snapshot.notas.trim()
	);

	// Posiciones disponibles como complementaria: las que NO tengan otra
	// pareja distinta a la actual (la propia A queda excluida también). En
	// modo crear, posicionId está undefined → solo las que están sueltas.
	// En modo editar, si A apunta a B, B sigue siendo seleccionable aunque
	// "tenga complementaria" (es la actual de A); por simetría, B.complementaria
	// === A.id.
	const complementariasDisponibles = $derived.by<ComboboxItem[]>(() => {
		const items: ComboboxItem[] = existentes
			.filter((p) => {
				if (p.id === posicionId) return false;
				const otraPareja = p.posicion_complementaria_id ?? null;
				if (otraPareja === null) return true;
				if (posicionId && otraPareja === posicionId) return true;
				return false;
			})
			.map((p) => ({
				id: p.id,
				label: p.nombre,
				sublabel: CATEGORIA_LABEL[p.categoria]
			}));
		// Item especial para limpiar el vínculo. Va al principio para
		// destacarlo y para que un primer "intento de cambiar" no obligue
		// a recordar el id.
		if (complementariaId !== null) {
			items.unshift({ id: NONE_ID, label: 'Sin complementaria', sublabel: 'limpia el vínculo' });
		}
		return items;
	});

	function handleComplementariaChange(id: string | null) {
		if (id === NONE_ID || id === null) {
			complementariaId = null;
		} else {
			complementariaId = id;
		}
	}

	function handleCreateNewComplementaria() {
		// Patrón "+ Crear nueva inline" (T-10): registramos un returnHandler
		// que recibirá el id de la nueva posición cuando el sub-wizard
		// guarde, y empujamos un wizard-posicion modo crear al stack. El
		// PosicionWizard padre se desmontará — el draft preserva su estado.
		// Cuando el sub-wizard hace pop + invokeReturnHandler, este handler
		// escribe el id de vuelta al draft Y al $state local (por si el
		// padre sigue montado en algún borde de caso).
		mapaModalStack.setReturnHandler((newId, kind) => {
			if (kind !== 'posicion') return;
			complementariaId = newId;
			const current = posicionWizardDraft.value;
			if (current) {
				posicionWizardDraft.set({ ...current, complementariaId: newId });
			}
		});
		// Si el padre ya está creado (modo editar → tiene posicionId), se
		// pasa al sub-wizard como `parentForComplementaria`: el sub salta
		// el paso de complementaria y la vincula automáticamente. Si el
		// padre todavía no tiene id (modo crear), el sub abre con su flujo
		// completo de 5 pasos.
		mapaModalStack.push({
			kind: 'wizard-posicion',
			modo: 'crear',
			nombre: 'Nueva posición',
			parentForComplementaria: posicionId
		});
	}

	function handleSkipComplementaria() {
		// "Saltar" del paso de complementaria: si el usuario no había tocado
		// nada, queda en null. Si había elegido algo, lo conserva (la idea
		// es que el botón siempre dice "Continuar" — Saltar es semántico).
		advance();
	}

	function handleContinueComplementaria() {
		advance();
	}

	function goToStep(step: number) {
		if (!visibleSteps.includes(step)) return;
		if (step > currentStep && !visitedSteps.has(step)) return;
		currentStep = step;
	}

	function advance() {
		const idx = visibleSteps.indexOf(currentStep);
		if (idx >= 0 && idx < visibleSteps.length - 1) {
			currentStep = visibleSteps[idx + 1];
			visitedSteps = new Set([...visitedSteps, currentStep]);
		}
	}

	function previousStep(): number | null {
		const idx = visibleSteps.indexOf(currentStep);
		return idx > 0 ? visibleSteps[idx - 1] : null;
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
		if (currentStep === 4) {
			intercept();
			handleContinueComplementaria();
			return;
		}
		if (currentStep === 5 && nombre.trim().length > 0 && !saving) {
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
					notas: notas.trim(),
					posicion_complementaria_id: complementariaId
				});
				if (mode === 'stack') {
					// Tras guardar ya no hay cambios pendientes: desactiva el dirty
					// handler antes de cerrar para no disparar el prompt.
					mapaModalStack.setDirtyHandler(null);
					// Limpia el draft solo si NO somos un sub-wizard inline
					// — el sub no escribió al draft (para no pisar el del
					// padre), así que tampoco debe limpiarlo. El draft del
					// padre tiene que sobrevivir hasta que el padre se
					// remonte y lo lea.
					if (parentForComplementaria === undefined) {
						posicionWizardDraft.clear();
					}
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
					notas: notas.trim(),
					posicion_complementaria_id: complementariaId
				};
				await updatePosicion(update);
				if (mode === 'stack') {
					mapaModalStack.setDirtyHandler(null);
					posicionWizardDraft.clear();
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
		{#if viewMode === 'wizard'}
		<!-- Indicador de progreso (mismo patrón que RollEditor). -->
		<div class="flex items-center gap-1 pt-2">
			{#each visibleSteps as step, i (step)}
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
			Paso {visibleSteps.indexOf(currentStep) + 1} de {totalSteps}
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
				<h3 class="text-sm font-semibold">Complementaria (opcional)</h3>
				<Combobox
					value={complementariaId}
					onValueChange={handleComplementariaChange}
					items={complementariasDisponibles}
					placeholder="Selecciona la posición complementaria…"
					searchPlaceholder="Buscar posición…"
					emptyMessage="No hay posiciones disponibles."
					ariaLabel="Posición complementaria"
					onCreateNew={mode === 'stack' ? handleCreateNewComplementaria : undefined}
					createNewLabel="Crear nueva posición"
				/>
				<p class="text-xs text-muted-foreground">
					Otra vista de la misma situación (p. ej. "Mount top" ↔ "Mount bottom").
					Solo aparecen posiciones libres o ya vinculadas a esta. Para liberar una
					que esté vinculada a otra distinta, edítala primero.
				</p>
			</div>

			<div class="space-y-3" class:hidden={currentStep !== 5}>
				<h3 class="text-sm font-semibold">Notas (opcional)</h3>
				<div class="space-y-1.5">
					<Label for="posicion-notas">Notas</Label>
					<Textarea
						id="posicion-notas"
						bind:value={notas}
						rows={4}
						placeholder="Anota lo que quieras recordar sobre esta posición."
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
			{#if previousStep() !== null}
				{@const prev = previousStep()}
				<Button
					variant="outline"
					size="sm"
					onclick={() => prev !== null && goToStep(prev)}
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
			{:else if currentStep === 4}
				<Button
					variant="outline"
					size="sm"
					onclick={complementariaId !== null ? handleContinueComplementaria : handleSkipComplementaria}
					disabled={saving}
				>
					Continuar
				</Button>
			{/if}

			{#if currentStep === 5}
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
		{:else}
			<!--
			  T-2.it2: rama `form` (modo editar) — todos los campos visibles
			  a la vez en un único formulario. Sin indicador de pasos, sin
			  Anterior/Continuar; solo Cancelar + Guardar al final.
			-->
			<div class="-mx-3 min-h-0 flex-1 space-y-4 overflow-y-auto px-3 py-2">
				<div class="space-y-1.5">
					<Label for="posicion-form-nombre">Nombre *</Label>
					<Input
						id="posicion-form-nombre"
						bind:value={nombre}
						oninput={handleNombreInput}
						aria-invalid={nombreError ? 'true' : undefined}
						aria-describedby={nombreError ? 'posicion-form-nombre-error' : undefined}
					/>
					{#if nombreError}
						<p id="posicion-form-nombre-error" class="text-sm text-destructive">{nombreError}</p>
					{/if}
				</div>

				<div class="space-y-1.5">
					<Label>Categoría</Label>
					<Chips
						options={CATEGORIAS}
						value={categoria ?? null}
						onChange={(v) => (categoria = (v ?? undefined) as CategoriaPosicion | undefined)}
						ariaLabel="Categoría de la posición"
					/>
				</div>

				<div class="space-y-1.5">
					<Label>Tipo de rol</Label>
					<Chips
						options={TIPOS_ROL}
						value={tipo ?? null}
						onChange={(v) => (tipo = (v ?? undefined) as TipoRolPosicion | undefined)}
						ariaLabel="Tipo de rol de la posición"
					/>
				</div>

				<div class="space-y-1.5">
					<Label>Complementaria</Label>
					<Combobox
						value={complementariaId}
						onValueChange={handleComplementariaChange}
						items={complementariasDisponibles}
						placeholder="Selecciona la posición complementaria…"
						searchPlaceholder="Buscar posición…"
						emptyMessage="No hay posiciones disponibles."
						ariaLabel="Posición complementaria"
						onCreateNew={mode === 'stack' ? handleCreateNewComplementaria : undefined}
						createNewLabel="Crear nueva posición"
					/>
					<p class="text-xs text-muted-foreground">
						Otra vista de la misma situación (p. ej. "Mount top" ↔ "Mount bottom").
					</p>
				</div>

				<div class="space-y-1.5">
					<Label for="posicion-form-notas">Notas</Label>
					<Textarea
						id="posicion-form-notas"
						bind:value={notas}
						rows={4}
						placeholder="Anota lo que quieras recordar sobre esta posición."
						oninput={(e) => {
							notas = capitalizeFirst(e.currentTarget.value);
						}}
					/>
				</div>

				{#if errorMsg}
					<p class="text-sm text-destructive">{errorMsg}</p>
				{/if}
			</div>

			<div class="mt-2 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3">
				<Button variant="outline" size="sm" onclick={cancel} disabled={saving}>Cancelar</Button>
				<Button
					size="sm"
					onclick={handleSave}
					disabled={saving || !nombre.trim() || !!nombreError}
				>
					{saving ? 'Guardando…' : 'Guardar'}
				</Button>
			</div>
		{/if}
	</div>
{/if}
