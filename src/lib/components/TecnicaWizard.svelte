<script lang="ts">
	/**
	 * Wizard de TECNICA (T-10) — crear / editar.
	 *
	 * Mismo patrón que `PosicionWizard` / `SumisionWizard` (kind dentro
	 * del stack, dirty handler, class:hidden por paso, AlertDialog en el
	 * host) pero con 7 pasos y dos elementos nuevos:
	 *
	 *  1. Nombre (obligatorio, Enter avanza).
	 *  2. Variante (input texto, skippable; botón siempre "Continuar").
	 *  3. Posición de origen (Combobox, sin "+ Crear nueva"). En modo crear
	 *     prefill con `posicionOrigenId` del entry.
	 *  4. Tipo (chips: ataque / sweep / escape / transicion / sumision).
	 *     Obligatorio (no skippable). Decide la rama del paso 5.
	 *  5. Destino:
	 *     - Si `tipo !== 'sumision'`: Combobox de posiciones con
	 *       "+ Crear nueva posición" inline (push wizard-posicion + return
	 *       handler — al guardar la nueva posición, el id vuelve aquí).
	 *     - Si `tipo === 'sumision'`: Combobox de sumisiones con
	 *       "+ Crear nueva sumisión" inline (idem con wizard-sumision).
	 *  6. Estado (chips: probando / funciona / descartada). Skippable,
	 *     default `probando`.
	 *  7. Detalles + errores comunes (2 textareas opcionales). Guardar.
	 *
	 * Validación UNIQUE `(nombre, posicion_origen_id, variante)`: como
	 * depende de origen (paso 3) y variante (paso 2), se valida al pulsar
	 * Guardar (paso 7), no al avanzar del paso 1. Si el match es completo
	 * salta a paso 1 con `nombreError` inline. El catch del UNIQUE de
	 * SQLite en `handleSave` se conserva como defensa frente a carreras
	 * entre pestañas.
	 *
	 * Coherencia destino-tipo: si el usuario cambia `tipo` después de
	 * elegir destino, limpiamos el destino del otro tipo (paso de
	 * "ataque" a "sumision" o viceversa). Evita guardar incoherencias y
	 * fuerza una selección consciente.
	 *
	 * Nota: las columnas `tecnicas.detalles` y `tecnicas.errores_comunes`
	 * siguen existiendo en BD (migración inmutable). La UI ya no las edita
	 * — al crear se persiste cadena vacía, al editar se reenvía el valor
	 * original cargado de BD.
	 */
	import { onMount, onDestroy } from 'svelte';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Textarea } from '$lib/components/ui/textarea';
	import Chips from '$lib/components/Chips.svelte';
	import Combobox from '$lib/components/Combobox.svelte';
	import type {
		EstadoTecnica,
		Posicion,
		SumisionTerminal,
		Tecnica,
		TipoTecnica
	} from '$lib/types';
	import { mapaModalStack, tecnicaWizardDraft } from './mapa-modal-stack.svelte';
	import { settings } from '$lib/settings.svelte';
	import { capitalizeFirst } from '$lib/utils';

	let {
		modo,
		mode = 'stack',
		tecnicaId,
		posicionOrigenId: posicionOrigenIdProp,
		onSaved,
		onRequestClose,
		onDirtyChange
	}: {
		modo: 'crear' | 'editar';
		// T-3.it2: modo de integración con el padre.
		//  - 'stack' (default): vivimos dentro de `MapaModalHost`. Usa
		//    `mapaModalStack` para dirty handler, sub-wizards inline, etc.
		//  - 'standalone': padre es un `Dialog` propio (p. ej.
		//    `TecnicaWizardDialog` desde `RollEditor`). NO se invoca
		//    `mapaModalStack` (todas las llamadas están guardadas por
		//    `mode === 'stack'`). Los sub-wizards inline "+ Crear nueva
		//    posición/sumisión" se deshabilitan (no se exponen `onCreateNew`).
		//    El padre debe pasar `onSaved` + `onRequestClose`; el dirty se
		//    reporta vía `onDirtyChange`.
		mode?: 'stack' | 'standalone';
		tecnicaId?: string;
		/** Id de la posición que el usuario está mirando cuando abre el wizard. Solo modo crear. */
		posicionOrigenId?: string;
		// Hook para que el host invalide su cache tras guardar/crear.
		onSaved?: (id: string, modo: 'crear' | 'editar') => void;
		// Hook para que el host pida cerrar el stack desde aquí (Cancelar).
		onRequestClose?: () => void;
		// Solo `standalone`: propaga `isDirty` al padre para que muestre
		// el confirm de descartar cambios al intentar cerrar el Dialog.
		onDirtyChange?: (isDirty: boolean) => void;
	} = $props();

	const TIPOS: { value: TipoTecnica; label: string }[] = [
		{ value: 'ataque', label: 'Ataque' },
		{ value: 'sweep', label: 'Sweep' },
		{ value: 'escape', label: 'Escape' },
		{ value: 'transicion', label: 'Transición' },
		{ value: 'sumision', label: 'Sumisión' }
	];

	const ESTADOS: { value: EstadoTecnica; label: string }[] = [
		{ value: 'probando', label: 'Probando' },
		{ value: 'funciona', label: 'Funciona' },
		{ value: 'descartada', label: 'Descartada' }
	];

	// Pasos semánticos: 1=Nombre, 2=Variante, 3=Posición origen, 4=Tipo,
	// 5=Destino, 6=Estado, 7=Detalles, 8=Errores comunes.
	// Los pasos 7 y 8 (textareas) solo aparecen en modo avanzado (T-3.it6).
	// En hobbyist el wizard tiene 6 pasos; en avanzado pasa a 8. Las
	// columnas `tecnicas.detalles` y `tecnicas.errores_comunes` siguen en
	// BD y se preservan al editar via `*Original` (ver carga en `onMount`).
	const visibleSteps = $derived<number[]>(
		settings.modoAvanzado ? [1, 2, 3, 4, 5, 6, 7, 8] : [1, 2, 3, 4, 5, 6]
	);
	const totalSteps = $derived(visibleSteps.length);

	// T-2.it2: en modo `editar` el componente renderiza un form plano con
	// todos los campos visibles a la vez (mismo patrón que `RollEditor`).
	// Modo `crear` mantiene el stepper como guía.
	const viewMode = $derived<'wizard' | 'form'>(modo === 'editar' ? 'form' : 'wizard');

	// Estado del wizard.
	let nombre = $state('');
	let variante = $state('');
	let posicionOrigenId = $state<string | null>(null);
	let posicionDestinoId = $state<string | null>(null);
	let sumisionDestinoId = $state<string | null>(null);
	// `tipo` empieza undefined: el paso 4 es obligatorio, así no hay
	// default silencioso. `estado` también undefined para distinguir
	// "no elegido" de "el usuario eligió probando" en el botón skippable.
	let tipo = $state<TipoTecnica | undefined>(undefined);
	let estado = $state<EstadoTecnica | undefined>(undefined);
	// `detalles` y `erroresComunes` (T-3.it6): editables bajo
	// `settings.modoAvanzado`. En hobbyist no se renderizan los pasos, pero
	// `*Original` se sigue cargando de BD para preservar el dato existente al
	// editar (mismo patrón que `notas` en PosicionWizard).
	let detalles = $state('');
	let detallesOriginal = $state('');
	let erroresComunes = $state('');
	let erroresComunesOriginal = $state('');

	let currentStep = $state(1);
	let visitedSteps = $state<Set<number>>(new Set([1]));

	let status: 'loading' | 'ready' | 'error' = $state('loading');
	let loadError = $state('');
	let saving = $state(false);
	let errorMsg = $state('');
	let nombreError = $state('');

	// Catálogos para los Comboboxes y la validación UNIQUE.
	let posiciones = $state<Posicion[]>([]);
	let sumisiones = $state<SumisionTerminal[]>([]);
	let tecnicasExistentes = $state<Tecnica[]>([]);

	// Snapshot para detectar dirty. En modo crear comparamos contra los
	// defaults vacíos (con el prefill de origen si lo hay).
	type Snapshot = {
		nombre: string;
		variante: string;
		posicionOrigenId: string | null;
		posicionDestinoId: string | null;
		sumisionDestinoId: string | null;
		tipo: TipoTecnica | undefined;
		estado: EstadoTecnica | undefined;
		detalles: string;
		erroresComunes: string;
	};
	let snapshot = $state<Snapshot>({
		nombre: '',
		variante: '',
		posicionOrigenId: null,
		posicionDestinoId: null,
		sumisionDestinoId: null,
		tipo: undefined,
		estado: undefined,
		detalles: '',
		erroresComunes: ''
	});

	// Discriminador del draft: 'crear' para crear, 'editar:<id>' para editar.
	// Si el draft persistido tiene otro `key`, lo descartamos (significa que
	// es de una sesión anterior del wizard sobre OTRA técnica / modo).
	const draftKey = $derived(modo === 'crear' ? 'crear' : `editar:${tecnicaId ?? ''}`);

	/**
	 * Listener global de Enter para cubrir el caso "foco perdido": el
	 * `onkeydowncapture` del wrapper solo se dispara si el evento se
	 * origina dentro del subtree del wizard. Al entrar a un paso sin
	 * hacer click en nada, el foco está en `document.body` y el evento
	 * NO bubble por el wrapper. Aquí lo recogemos y delegamos al mismo
	 * handler. Solo intervenimos cuando el target es `body` (foco
	 * realmente perdido), para no pisar el comportamiento natural de
	 * inputs, comboboxes abiertos o AlertDialogs.
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
		// Hidrata el state de settings (idempotente). Permite leer
		// `settings.modoAvanzado` sincrónicamente desde el render.
		settings.init();
		if (mode === 'stack') {
			mapaModalStack.setDirtyHandler(() => isDirty);
		}
		if (typeof document !== 'undefined') document.addEventListener('keydown', handleDocumentEnter, true);

		// Carga catálogos en paralelo para los Comboboxes y la validación
		// UNIQUE. El catálogo de técnicas se usa solo para detectar
		// duplicados, no merece query dedicada (decenas de elementos).
		try {
			const [{ listPosiciones }, { listSumisiones }, { listTecnicas }] = await Promise.all([
				import('$lib/posiciones'),
				import('$lib/sumisiones'),
				import('$lib/tecnicas')
			]);
			[posiciones, sumisiones, tecnicasExistentes] = await Promise.all([
				listPosiciones(),
				listSumisiones(),
				listTecnicas()
			]);
		} catch (err) {
			// No es crítico — si falla, los Comboboxes salen vacíos y el
			// catch del UNIQUE en `handleSave` sigue cubriendo el caso.
			console.warn('[TecnicaWizard] no se pudieron cargar catálogos:', err);
		}

		// Si hay un draft persistido que coincide con la clave del wizard
		// actual (mismo modo y mismo id en editar), lo restauramos. Pasa
		// cuando el wizard se remonta tras un sub-wizard inline ("+ Crear
		// nueva posición/sumisión" en el paso de destino). Sin esto el
		// usuario perdería todo lo que llevaba escrito.
		//
		// En `standalone` no hay sub-wizards inline (no se exponen) y no
		// queremos pisar el draft del wizard del mapa, así que omitimos.
		const draft = mode === 'stack' ? tecnicaWizardDraft.value : null;
		if (draft && draft.key === draftKey) {
			nombre = draft.nombre;
			variante = draft.variante;
			posicionOrigenId = draft.posicionOrigenId;
			posicionDestinoId = draft.posicionDestinoId;
			sumisionDestinoId = draft.sumisionDestinoId;
			tipo = draft.tipo;
			estado = draft.estado;
			detalles = draft.detalles;
			erroresComunes = draft.erroresComunes;
			currentStep = draft.currentStep;
			visitedSteps = new Set(draft.visitedSteps);
			// El snapshot se sigue cargando desde BD (modo editar) o
			// defaults (modo crear) para que la detección de dirty sea
			// correcta. Si el draft difiere del snapshot, isDirty=true.
		}

		if (modo !== 'editar') {
			// Prefill del origen si el wizard se abrió desde un modal de
			// posición (botón "+ Añadir técnica" en `PosicionModalContent`).
			// Si ya había draft (caso del remount), no pisamos el origen
			// elegido por el usuario (el draft puede tener otro).
			if (posicionOrigenIdProp && posicionOrigenId === null) {
				posicionOrigenId = posicionOrigenIdProp;
			}
			// snapshot del modo crear: estado vacío + el prefill de origen
			// si llegó por prop (para que isDirty no cuente eso como cambio).
			snapshot = {
				...snapshot,
				posicionOrigenId: posicionOrigenIdProp ?? null
			};
			status = 'ready';
			return;
		}
		if (!tecnicaId) {
			loadError = 'Falta el id de la técnica a editar.';
			status = 'error';
			return;
		}
		try {
			const { getTecnica } = await import('$lib/tecnicas');
			const t = await getTecnica(tecnicaId);
			if (!t) {
				loadError = 'No se encontró la técnica.';
				status = 'error';
				return;
			}
			// El snapshot SIEMPRE refleja el estado guardado en BD (para
			// dirty detection). El estado actual del wizard puede venir del
			// draft (si se restauró arriba) o de la BD si no había draft.
			if (!draft || draft.key !== draftKey) {
				nombre = t.nombre;
				variante = t.variante ?? '';
				posicionOrigenId = t.posicion_origen_id;
				posicionDestinoId = t.posicion_destino_id ?? null;
				sumisionDestinoId = t.sumision_destino_id ?? null;
				tipo = t.tipo;
				estado = t.estado;
				detalles = t.detalles;
				erroresComunes = t.errores_comunes;
			}
			// Preserva los textos existentes en BD. En hobbyist los pasos no
			// se renderizan, pero al guardar usamos `*Original` para no pisar
			// el dato. En avanzado, `detalles` y `erroresComunes` son
			// editables y arrancan con estos valores.
			detallesOriginal = t.detalles;
			erroresComunesOriginal = t.errores_comunes;
			snapshot = {
				nombre: t.nombre,
				variante: t.variante ?? '',
				posicionOrigenId: t.posicion_origen_id,
				posicionDestinoId: t.posicion_destino_id ?? null,
				sumisionDestinoId: t.sumision_destino_id ?? null,
				tipo: t.tipo,
				estado: t.estado,
				detalles: t.detalles,
				erroresComunes: t.errores_comunes
			};
			status = 'ready';
		} catch (err) {
			loadError = err instanceof Error ? err.message : String(err);
			status = 'error';
		}
	});

	onDestroy(() => {
		if (mode === 'stack') {
			mapaModalStack.setDirtyHandler(null);
		}
		if (typeof document !== 'undefined') document.removeEventListener('keydown', handleDocumentEnter, true);
		// OJO: NO limpiamos el draft aquí. `onDestroy` se dispara también
		// cuando el wizard se remonta tras un sub-wizard inline (pop de
		// `wizard-posicion`/`wizard-sumision` deja al TecnicaWizard como
		// top → host lo remonta). Limpiar el draft aquí perdería el
		// progreso del usuario. El draft se limpia en `handleSave` (éxito)
		// y en el host cuando la entrada `wizard-tecnica` deja el stack
		// (cancelar, closeAll, popTo).
		//
		// El returnHandler tampoco se limpia: si el wizard se desmonta
		// porque empujamos un sub-wizard, lo necesitamos vivo para recibir
		// el id de vuelta. La limpieza ocurre en `invokeReturnHandler` (la
		// hace el propio store al consumirlo).
	});

	// Persiste el draft en el store en cada cambio. Esto permite sobrevivir
	// el remount del wizard cuando el sub-wizard inline ("+ Crear nueva
	// posición/sumisión") se monta encima — el host renderiza solo el top
	// del stack, así que el TecnicaWizard se desmonta y luego se remonta
	// al volver. Sin esto el usuario perdería todo lo escrito.
	$effect(() => {
		if (mode !== 'stack' || status !== 'ready') return;
		tecnicaWizardDraft.set({
			key: draftKey,
			nombre,
			variante,
			posicionOrigenId,
			posicionDestinoId,
			sumisionDestinoId,
			tipo,
			estado,
			detalles,
			erroresComunes,
			currentStep,
			visitedSteps: [...visitedSteps]
		});
	});

	const isDirty = $derived(
		nombre.trim() !== snapshot.nombre.trim() ||
			variante.trim() !== snapshot.variante.trim() ||
			posicionOrigenId !== snapshot.posicionOrigenId ||
			posicionDestinoId !== snapshot.posicionDestinoId ||
			sumisionDestinoId !== snapshot.sumisionDestinoId ||
			tipo !== snapshot.tipo ||
			estado !== snapshot.estado ||
			(settings.modoAvanzado &&
				(detalles.trim() !== snapshot.detalles.trim() ||
					erroresComunes.trim() !== snapshot.erroresComunes.trim()))
	);

	// En `standalone`, propaga dirty al padre cada vez que cambia. En
	// `stack` no hace falta — el host pregunta vía `mapaModalStack.isDirty()`.
	$effect(() => {
		if (mode === 'standalone') {
			onDirtyChange?.(isDirty);
		}
	});

	// Limpia el error inline al editar nombre/variante/origen. Usamos
	// handlers explícitos en vez de un `$effect` porque el `$effect` que
	// lee `nombreError` dentro de un `if` se suscribe a él reactivamente,
	// y al escribir `nombreError = '...'` desde `handleSave` el efecto se
	// dispara en el siguiente microtask y lo limpia de inmediato — el
	// usuario nunca ve el mensaje (mismo bug que en SumisionWizard, fix
	// del 2026-05-13).
	function clearNombreError() {
		if (nombreError) nombreError = '';
	}

	// Items de los Comboboxes: precomputados para evitar reordenar/re-derive
	// dentro del template.
	const posicionItems = $derived(
		posiciones.map((p) => ({ id: p.id, label: p.nombre, sublabel: undefined }))
	);
	const sumisionItems = $derived(
		sumisiones.map((s) => ({ id: s.id, label: s.nombre, sublabel: undefined }))
	);

	function nombreYaExiste(): boolean {
		const norm = nombre.trim().toLowerCase();
		if (!norm) return false;
		if (!posicionOrigenId) return false;
		const varNorm = variante.trim().toLowerCase();
		return tecnicasExistentes.some(
			(t) =>
				t.nombre.toLowerCase() === norm &&
				t.posicion_origen_id === posicionOrigenId &&
				(t.variante ?? '').toLowerCase() === varNorm &&
				(modo === 'crear' || t.id !== tecnicaId)
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

	function handleNombreKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter' && nombre.trim().length > 0) {
			e.preventDefault();
			advance();
		}
	}

	function handleVarianteKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter') {
			e.preventDefault();
			advance();
		}
	}

	/**
	 * Enter a nivel del wizard, en CAPTURE phase: corre antes que los
	 * handlers internos de Combobox (Popover/Command de bits-ui) y Chips,
	 * que de otra forma consumirían el evento o lo enviarían a un Portal
	 * fuera del wrapper. Textareas se respetan (newline natural). Si
	 * intercepta y avanza, hace stopImmediatePropagation para que ningún
	 * otro handler reaccione.
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
				advance();
			}
			return;
		}
		if (currentStep === 2) {
			intercept();
			advance();
			return;
		}
		if (currentStep === 3) {
			if (canAdvanceFromStep3) {
				intercept();
				tryAdvanceFromStep3();
			}
			return;
		}
		if (currentStep === 4) {
			if (tipo !== undefined) {
				intercept();
				advance();
			}
			return;
		}
		if (currentStep === 5) {
			if (canAdvanceFromStep5) {
				intercept();
				advance();
			}
			return;
		}
		// Pasos 6 (Estado), 7 (Detalles), 8 (Errores comunes) — todos
		// permiten avanzar al siguiente con Enter (los 7/8 solo existen en
		// modo avanzado). El último paso visible dispara Guardar.
		const lastStep = visibleSteps[visibleSteps.length - 1];
		if (currentStep === lastStep) {
			if (!saving && nombre.trim().length > 0 && posicionOrigenId && tipo) {
				intercept();
				handleSave();
			}
			return;
		}
		if (currentStep === 6 || currentStep === 7) {
			intercept();
			advance();
		}
	}

	function handleTipoChange(v: string | null) {
		const nuevoTipo = (v ?? undefined) as TipoTecnica | undefined;
		// Coherencia destino-tipo: si cambia la "rama" (sumisión vs no),
		// limpiamos el destino del otro tipo. Si solo cambia entre
		// no-sumision (ataque ↔ sweep) mantenemos `posicionDestinoId`.
		if (nuevoTipo === 'sumision' && tipo !== 'sumision') {
			posicionDestinoId = null;
		} else if (nuevoTipo !== 'sumision' && tipo === 'sumision') {
			sumisionDestinoId = null;
		}
		tipo = nuevoTipo;
		if (v) advance();
	}

	function handleEstadoChange(v: string | null) {
		// Estado es ahora el último paso (totalSteps=6). No avanzamos al
		// elegir; el usuario pulsa Guardar (o Enter) para confirmar.
		estado = (v ?? undefined) as EstadoTecnica | undefined;
	}

	// "+ Crear nueva posición" inline en paso 3 (origen). Mismo patrón
	// que el paso 5: registra return handler, pushea sub-wizard, al volver
	// asigna el id al draft y a la variable local del origen.
	function handleCreateNuevaPosicionOrigen() {
		mapaModalStack.setReturnHandler((newId, kind) => {
			if (kind !== 'posicion') return;
			void import('$lib/posiciones').then(async ({ listPosiciones }) => {
				posiciones = await listPosiciones();
			});
			posicionOrigenId = newId;
			const current = tecnicaWizardDraft.value;
			if (current) {
				tecnicaWizardDraft.set({ ...current, posicionOrigenId: newId });
			}
		});
		mapaModalStack.push({
			kind: 'wizard-posicion',
			modo: 'crear',
			nombre: 'Nueva posición (origen)'
		});
	}

	// "+ Crear nueva posición" inline en paso 5 (rama no-sumision).
	// Registra el return handler y pushea el sub-wizard al stack. Cuando
	// el usuario guarda la nueva posición, `PosicionWizard.handleSave`
	// detecta el handler y lo invoca con el nuevo id (vía
	// `invokeReturnHandler`), volviendo aquí con `posicionDestinoId`
	// prefill. El sub-wizard hace `pop()` antes de invocar el handler,
	// por lo que el wizard de técnica vuelve a ser el top del stack.
	function handleCreateNuevaPosicion() {
		mapaModalStack.setReturnHandler((newId, kind) => {
			if (kind !== 'posicion') return;
			// Refresca el catálogo local para que el Combobox muestre
			// el nombre correcto del nuevo destino.
			void import('$lib/posiciones').then(async ({ listPosiciones }) => {
				posiciones = await listPosiciones();
			});
			// Asignación local: cubre el caso poco frecuente en que la
			// instancia del TecnicaWizard NO llegó a desmontarse (p. ej.
			// si el host decide reutilizar la instancia en algún flujo
			// futuro). Hoy el host desmonta y vuelve a montar, así que
			// esta línea no tiene efecto sobre la instancia "nueva".
			posicionDestinoId = newId;
			// CRUCIAL: escribir al draft para que la instancia remontada
			// del wizard recoja el nuevo destino en su `onMount`. Sin
			// esto, el wizard recién montado lee del draft que se
			// persistió justo antes del push (con posicionDestinoId =
			// null) y el destino se queda vacío.
			const current = tecnicaWizardDraft.value;
			if (current) {
				tecnicaWizardDraft.set({ ...current, posicionDestinoId: newId });
			}
		});
		mapaModalStack.push({
			kind: 'wizard-posicion',
			modo: 'crear',
			nombre: 'Nueva posición (destino)'
		});
	}

	// Idem para sumisión (rama tipo=sumision).
	function handleCreateNuevaSumision() {
		mapaModalStack.setReturnHandler((newId, kind) => {
			if (kind !== 'sumision') return;
			void import('$lib/sumisiones').then(async ({ listSumisiones }) => {
				sumisiones = await listSumisiones();
			});
			sumisionDestinoId = newId;
			// Misma lógica que en handleCreateNuevaPosicion: actualiza el
			// draft para que la instancia remontada lo recoja.
			const current = tecnicaWizardDraft.value;
			if (current) {
				tecnicaWizardDraft.set({ ...current, sumisionDestinoId: newId });
			}
		});
		mapaModalStack.push({
			kind: 'wizard-sumision',
			modo: 'crear',
			nombre: 'Nueva sumisión (destino)'
		});
	}

	function cancel() {
		if (onRequestClose) {
			onRequestClose();
		} else if (mode === 'stack') {
			mapaModalStack.pop();
		}
		// En `standalone` sin `onRequestClose` no hay forma de cerrar —
		// el padre siempre debería pasar el callback.
	}

	// Decisión 2026-05-13 (s7): el botón skippable de los wizards siempre
	// dice "Continuar", nunca "Saltar". El comportamiento es idéntico
	// (avanza sin tocar el campo si está vacío, o con el valor seleccionado
	// si lo hay), solo cambia la etiqueta.

	const canAdvanceFromStep1 = $derived(nombre.trim().length > 0);
	const canAdvanceFromStep3 = $derived(posicionOrigenId !== null);
	const canAdvanceFromStep5 = $derived(
		tipo === 'sumision' ? sumisionDestinoId !== null : posicionDestinoId !== null
	);

	/**
	 * Aviso informativo en el paso 1 (Opción A): si hay otra técnica con el
	 * MISMO nombre (independiente de origen/variante), avisamos para que
	 * el usuario lo sepa. NO bloquea — la UNIQUE real es compuesta
	 * (nombre + origen + variante) y se valida al avanzar del paso 3.
	 * En modo editar no avisa (el match consigo misma es esperable).
	 */
	const nombreYaExisteAviso = $derived.by(() => {
		if (modo === 'editar') return '';
		const n = nombre.trim().toLowerCase();
		if (!n) return '';
		const matches = tecnicasExistentes.filter((t) => t.nombre.toLowerCase() === n);
		if (matches.length === 0) return '';
		const ejemplo = matches[0];
		const origenNombre =
			posiciones.find((p) => p.id === ejemplo.posicion_origen_id)?.nombre ?? '?';
		const varianteNota = ejemplo.variante ? ` (${ejemplo.variante})` : '';
		const otrasNota = matches.length > 1 ? ` y ${matches.length - 1} más` : '';
		return `Ya existe "${ejemplo.nombre}"${varianteNota} desde ${origenNombre}${otrasNota}. Cambia el nombre o continúa si vas a registrar otra variante / origen distinto.`;
	});

	/**
	 * Validación bloqueante al avanzar del paso 3 (origen). Aquí ya tenemos
	 * los 3 campos del UNIQUE compuesto (nombre + origen + variante), así
	 * que podemos chequear duplicado exacto y avisar antes de llegar al
	 * paso 7 (Guardar).
	 */
	function tryAdvanceFromStep3() {
		if (!canAdvanceFromStep3) return;
		if (modo !== 'editar') {
			const n = nombre.trim().toLowerCase();
			const v = variante.trim().toLowerCase();
			const dup = tecnicasExistentes.some(
				(t) =>
					t.nombre.toLowerCase() === n &&
					t.posicion_origen_id === posicionOrigenId &&
					(t.variante ?? '').toLowerCase() === v
			);
			if (dup) {
				nombreError =
					'Ya existe una técnica con ese mismo nombre, origen y variante. Cambia el nombre o la variante.';
				currentStep = 1;
				return;
			}
		}
		nombreError = '';
		advance();
	}

	function isUniqueError(err: unknown): boolean {
		const msg = err instanceof Error ? err.message : String(err);
		return /UNIQUE constraint failed/i.test(msg);
	}

	async function handleSave() {
		const nombreFinal = nombre.trim();
		if (!nombreFinal) {
			nombreError = 'El nombre es obligatorio.';
			errorMsg = '';
			currentStep = 1;
			return;
		}
		if (!posicionOrigenId) {
			errorMsg = 'Falta la posición de origen.';
			currentStep = 3;
			return;
		}
		if (!tipo) {
			errorMsg = 'Falta el tipo de técnica.';
			currentStep = 4;
			return;
		}
		if (tipo === 'sumision') {
			if (!sumisionDestinoId) {
				errorMsg = 'Falta la sumisión de destino.';
				currentStep = 5;
				return;
			}
		} else {
			if (!posicionDestinoId) {
				errorMsg = 'Falta la posición de destino.';
				currentStep = 5;
				return;
			}
		}

		// Validación UNIQUE local (carga en `onMount`). Catch de SQLite
		// abajo como defensa frente a carrera entre pestañas.
		if (nombreYaExiste()) {
			nombreError =
				'Ya existe una técnica con ese mismo nombre, origen y variante. Cambia el nombre o la variante.';
			errorMsg = '';
			currentStep = 1;
			return;
		}

		saving = true;
		errorMsg = '';
		try {
			const varianteFinal = variante.trim().length > 0 ? variante.trim() : undefined;
			const estadoFinal: EstadoTecnica = estado ?? 'probando';
			// Materializa null explícito en el destino que no aplica al tipo
			// — `createTecnica` asserta coherencia y SQLite tiene CHECK.
			const posicionDestinoFinal = tipo === 'sumision' ? undefined : (posicionDestinoId ?? undefined);
			const sumisionDestinoFinal = tipo === 'sumision' ? (sumisionDestinoId ?? undefined) : undefined;

			if (modo === 'crear') {
				const { createTecnica } = await import('$lib/tecnicas');
				// Detalles + errores comunes (T-3.it6): editables solo en modo
				// avanzado. En hobbyist persistimos cadena vacía.
				const detallesFinal = settings.modoAvanzado ? detalles.trim() : '';
				const erroresComunesFinal = settings.modoAvanzado
					? erroresComunes.trim()
					: '';
				const nueva = await createTecnica({
					nombre: nombreFinal,
					variante: varianteFinal,
					posicion_origen_id: posicionOrigenId,
					posicion_destino_id: posicionDestinoFinal,
					sumision_destino_id: sumisionDestinoFinal,
					tipo,
					estado: estadoFinal,
					detalles: detallesFinal,
					errores_comunes: erroresComunesFinal
				});
				if (mode === 'stack') {
					onSaved?.(nueva.id, 'crear');
					mapaModalStack.setDirtyHandler(null);
					// Draft consumido: limpia para que la próxima vez que se
					// abra el wizard empiece vacío.
					tecnicaWizardDraft.clear();
					// T-11: si hay un return handler registrado (caso típico:
					// el modal de técnica abrió este wizard desde
					// "+ Crear nueva técnica" en la sección de contras), salimos
					// del wizard con `pop` y le pasamos el nuevo id al handler.
					// En lugar de hacer el `closeAll + push modal` habitual, que
					// rompería el flujo dejando al usuario en el modal de la
					// nueva técnica en vez del de la actual.
					if (mapaModalStack.hasReturnHandler()) {
						mapaModalStack.pop();
						mapaModalStack.invokeReturnHandler(nueva.id, 'tecnica');
					} else {
						mapaModalStack.closeAll();
						mapaModalStack.push({ kind: 'tecnica', id: nueva.id, nombre: nueva.nombre });
					}
				} else {
					// `standalone`: el padre decide qué hacer (cierra su Dialog).
					// Reportamos no-dirty para suprimir el confirm de descartar.
					onDirtyChange?.(false);
					onSaved?.(nueva.id, 'crear');
				}
			} else {
				if (!tecnicaId) {
					throw new Error('Falta tecnicaId en modo editar.');
				}
				const { updateTecnica } = await import('$lib/tecnicas');
				// Detalles + errores comunes (T-3.it6): editables solo en
				// modo avanzado. En hobbyist reenviamos los valores originales
				// cargados de BD para no pisar el dato.
				const detallesFinal = settings.modoAvanzado
					? detalles.trim()
					: detallesOriginal;
				const erroresComunesFinal = settings.modoAvanzado
					? erroresComunes.trim()
					: erroresComunesOriginal;
				await updateTecnica({
					id: tecnicaId,
					nombre: nombreFinal,
					variante: varianteFinal,
					posicion_origen_id: posicionOrigenId,
					posicion_destino_id: posicionDestinoFinal,
					sumision_destino_id: sumisionDestinoFinal,
					tipo,
					estado: estadoFinal,
					detalles: detallesFinal,
					errores_comunes: erroresComunesFinal
				});
				if (mode === 'stack') {
					onSaved?.(tecnicaId, 'editar');
					mapaModalStack.setDirtyHandler(null);
					tecnicaWizardDraft.clear();
					mapaModalStack.pop();
				} else {
					onDirtyChange?.(false);
					onSaved?.(tecnicaId, 'editar');
				}
			}
		} catch (err) {
			if (isUniqueError(err)) {
				nombreError =
					'Ya existe una técnica con ese mismo nombre, origen y variante. Cambia el nombre o la variante.';
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
	<p class="text-sm text-muted-foreground">Cargando técnica…</p>
{:else if status === 'error'}
	<div class="rounded border border-destructive/30 bg-destructive/10 p-3">
		<p class="text-sm font-semibold text-destructive">Error</p>
		<pre class="mt-1 text-xs whitespace-pre-wrap text-destructive">{loadError}</pre>
	</div>
{:else}
	<!--
	  Estructura flex column: el padre (MapaModalHost) nos da `flex-1` dentro
	  del Dialog.Content; aquí distribuimos progreso (fijo), body scrollable
	  y footer (fijo) para que los botones Cancelar / ← Anterior / Continuar
	  / Guardar siempre se vean al final del Dialog.
	-->
	<div class="flex h-full min-h-0 flex-col">
		{#if viewMode === 'wizard'}
		<!-- Indicador de progreso (7 segmentos, mismo patrón que PosicionWizard). -->
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
		  Body scrollable. Todos los pasos montados (`class:hidden`); evita
		  el bug de remount T-8.
		-->
		<div
			class="-mx-3 min-h-0 flex-1 space-y-4 overflow-y-auto px-3 py-2"
			onkeydowncapture={handleWizardKeydown}
			role="presentation"
		>
		<!-- Paso 1: Nombre -->
		<div class="space-y-3" class:hidden={currentStep !== 1}>
			<h3 class="text-sm font-semibold">Nombre *</h3>
			<Input
				bind:value={nombre}
				placeholder="p. ej. armbar, hip bump sweep, upa"
				onkeydown={handleNombreKeydown}
				oninput={(e) => {
					nombre = capitalizeFirst(e.currentTarget.value);
					clearNombreError();
				}}
				autofocus={currentStep === 1}
				aria-invalid={nombreError ? 'true' : undefined}
				aria-describedby={nombreError ? 'tecnica-nombre-error' : undefined}
			/>
			{#if nombreError}
				<p id="tecnica-nombre-error" class="text-sm text-destructive">{nombreError}</p>
			{:else if nombreYaExisteAviso}
				<!--
				  Aviso NO bloqueante (Opción A): el UNIQUE real es compuesto
				  (nombre + origen + variante), así que aquí solo informamos
				  de que ya hay otra técnica con ese mismo nombre. La
				  validación bloqueante ocurre al avanzar del paso 3.
				-->
				<p class="text-sm text-warning">{nombreYaExisteAviso}</p>
			{/if}
			<p class="text-xs text-muted-foreground">Pulsa Enter o "Continuar" para avanzar.</p>
		</div>

		<!-- Paso 2: Variante -->
		<div class="space-y-3" class:hidden={currentStep !== 2}>
			<h3 class="text-sm font-semibold">Variante</h3>
			<Input
				bind:value={variante}
				placeholder='p. ej. "desde guardia", "con grip cruzado"'
				onkeydown={handleVarianteKeydown}
				oninput={(e) => {
					variante = capitalizeFirst(e.currentTarget.value);
					clearNombreError();
				}}
			/>
			<p class="text-xs text-muted-foreground">
				Opcional. Útil si tienes varias versiones de la misma técnica.
			</p>
		</div>

		<!-- Paso 3: Posición de origen -->
		<div class="space-y-3" class:hidden={currentStep !== 3}>
			<h3 class="text-sm font-semibold">Posición de origen *</h3>
			<Combobox
				value={posicionOrigenId}
				onValueChange={(id) => {
					posicionOrigenId = id;
					clearNombreError();
				}}
				items={posicionItems}
				placeholder="Selecciona una posición…"
				searchPlaceholder="Buscar posición…"
				emptyMessage="Sin posiciones en el catálogo."
				onCreateNew={mode === 'stack' ? handleCreateNuevaPosicionOrigen : undefined}
				createNewLabel="Crear nueva posición"
				ariaLabel="Posición de origen"
			/>
			<p class="text-xs text-muted-foreground">
				La posición desde donde sale esta técnica. Si no existe, pulsa
				"+ Crear nueva posición".
			</p>
		</div>

		<!-- Paso 4: Tipo -->
		<div class="space-y-3" class:hidden={currentStep !== 4}>
			<h3 class="text-sm font-semibold">Tipo *</h3>
			<Chips
				options={TIPOS}
				value={tipo ?? null}
				onChange={handleTipoChange}
				ariaLabel="Tipo de técnica"
			/>
			<p class="text-xs text-muted-foreground">
				El tipo decide a qué nodo llega la técnica: posición (ataque/sweep/escape/transición)
				o sumisión terminal.
			</p>
		</div>

		<!-- Paso 5: Destino (rama por tipo) -->
		<div class="space-y-3" class:hidden={currentStep !== 5}>
			<h3 class="text-sm font-semibold">Destino *</h3>
			{#if tipo === 'sumision'}
				<Combobox
					value={sumisionDestinoId}
					onValueChange={(id) => (sumisionDestinoId = id)}
					items={sumisionItems}
					placeholder="Selecciona una sumisión…"
					searchPlaceholder="Buscar sumisión…"
					emptyMessage="Sin sumisiones todavía."
					onCreateNew={mode === 'stack' ? handleCreateNuevaSumision : undefined}
					createNewLabel="Crear nueva sumisión"
					ariaLabel="Sumisión de destino"
				/>
				<p class="text-xs text-muted-foreground">
					La sumisión donde acaba la técnica. Si no existe, pulsa "+ Crear nueva sumisión".
				</p>
			{:else if tipo}
				<Combobox
					value={posicionDestinoId}
					onValueChange={(id) => (posicionDestinoId = id)}
					items={posicionItems}
					placeholder="Selecciona una posición…"
					searchPlaceholder="Buscar posición…"
					emptyMessage="Sin posiciones en el catálogo."
					onCreateNew={mode === 'stack' ? handleCreateNuevaPosicion : undefined}
					createNewLabel="Crear nueva posición"
					ariaLabel="Posición de destino"
				/>
				<p class="text-xs text-muted-foreground">
					La posición a la que llegas con esta técnica. Si no existe, pulsa
					"+ Crear nueva posición".
				</p>
			{:else}
				<p class="text-sm text-muted-foreground">Selecciona primero el tipo en el paso anterior.</p>
			{/if}
		</div>

		<!-- Paso 6: Estado -->
		<div class="space-y-3" class:hidden={currentStep !== 6}>
			<h3 class="text-sm font-semibold">Estado</h3>
			<Chips
				options={ESTADOS}
				value={estado ?? null}
				onChange={handleEstadoChange}
				ariaLabel="Estado de la técnica"
			/>
			<p class="text-xs text-muted-foreground">
				Si la saltas, queda como "Probando". Se puede cambiar después.
			</p>
		</div>

		{#if settings.modoAvanzado}
			<!-- Paso 7: Detalles (solo modo avanzado, T-3.it6). -->
			<div class="space-y-3" class:hidden={currentStep !== 7}>
				<h3 class="text-sm font-semibold">Detalles (opcional)</h3>
				<Textarea
					bind:value={detalles}
					placeholder="Setup, agarres, momento de aplicación…"
					rows={4}
				/>
				<p class="text-xs text-muted-foreground">
					Texto libre — útil para recordar el detalle clave de la técnica.
				</p>
			</div>

			<!-- Paso 8: Errores comunes (solo modo avanzado, T-3.it6). -->
			<div class="space-y-3" class:hidden={currentStep !== 8}>
				<h3 class="text-sm font-semibold">Errores comunes (opcional)</h3>
				<Textarea
					bind:value={erroresComunes}
					placeholder="Fallos habituales, contras típicas…"
					rows={4}
				/>
			</div>
		{/if}

		{#if errorMsg}
			<p class="text-sm text-destructive">{errorMsg}</p>
		{/if}
		</div>

		<!--
		  Footer: Cancelar | ← Anterior | Continuar/Saltar/Guardar. FUERA del
		  body scrollable: siempre visible al final del Dialog. El "Anterior"
		  navega dentro del wizard; el "← Atrás" del header del host hace pop
		  del stack (no entra aquí).
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
					<Button variant="outline" size="sm" onclick={advance} disabled={saving}>
						Continuar
					</Button>
				{/if}

				{#if currentStep === 1}
					<Button size="sm" onclick={advance} disabled={!canAdvanceFromStep1}>Continuar</Button>
				{:else if currentStep === 3}
					<Button size="sm" onclick={tryAdvanceFromStep3} disabled={!canAdvanceFromStep3}>Continuar</Button>
				{:else if currentStep === 4}
					<Button size="sm" onclick={advance} disabled={!tipo}>Continuar</Button>
				{:else if currentStep === 5}
					<Button size="sm" onclick={advance} disabled={!canAdvanceFromStep5}>Continuar</Button>
				{:else if currentStep === totalSteps}
					<!-- Último paso: estado en hobbyist (paso 6) o errores
					     comunes en avanzado (paso 8). Estado skippable:
					     materializa 'probando' en handleSave si queda undefined. -->
					<Button
						size="sm"
						onclick={handleSave}
						disabled={saving || !nombre.trim() || !posicionOrigenId || !tipo}
					>
						{saving ? 'Guardando…' : 'Guardar'}
					</Button>
				{:else if currentStep === 6 || currentStep === 7}
					<!-- Modo avanzado (T-3.it6): paso 6 (Estado) y 7 (Detalles)
					     no son el último cuando hay paso de Errores comunes
					     después. -->
					<Button size="sm" onclick={advance} disabled={saving}>Continuar</Button>
				{/if}
			</div>
		</div>
		{:else}
			<!-- T-2.it2: rama `form` (modo editar) — campos visibles a la vez. -->
			<div class="-mx-3 min-h-0 flex-1 space-y-4 overflow-y-auto px-3 py-2">
				<div class="space-y-1.5">
					<Label for="tecnica-form-nombre">Nombre *</Label>
					<Input
						id="tecnica-form-nombre"
						bind:value={nombre}
						oninput={(e) => {
							nombre = capitalizeFirst(e.currentTarget.value);
							clearNombreError();
						}}
						aria-invalid={nombreError ? 'true' : undefined}
						aria-describedby={nombreError ? 'tecnica-form-nombre-error' : undefined}
					/>
					{#if nombreError}
						<p id="tecnica-form-nombre-error" class="text-sm text-destructive">{nombreError}</p>
					{:else if nombreYaExisteAviso}
						<p class="text-sm text-warning">{nombreYaExisteAviso}</p>
					{/if}
				</div>

				<div class="space-y-1.5">
					<Label for="tecnica-form-variante">Variante</Label>
					<Input
						id="tecnica-form-variante"
						bind:value={variante}
						placeholder='p. ej. "desde guardia", "con grip cruzado"'
						oninput={(e) => {
							variante = capitalizeFirst(e.currentTarget.value);
							clearNombreError();
						}}
					/>
					<p class="text-xs text-muted-foreground">
						Opcional. Útil si tienes varias versiones de la misma técnica.
					</p>
				</div>

				<div class="space-y-1.5">
					<Label>Posición de origen *</Label>
					<Combobox
						value={posicionOrigenId}
						onValueChange={(id) => {
							posicionOrigenId = id;
							clearNombreError();
						}}
						items={posicionItems}
						placeholder="Selecciona una posición…"
						searchPlaceholder="Buscar posición…"
						emptyMessage="Sin posiciones en el catálogo."
						onCreateNew={mode === 'stack' ? handleCreateNuevaPosicionOrigen : undefined}
						createNewLabel="Crear nueva posición"
						ariaLabel="Posición de origen"
					/>
				</div>

				<div class="space-y-1.5">
					<Label>Tipo *</Label>
					<Chips
						options={TIPOS}
						value={tipo ?? null}
						onChange={handleTipoChange}
						ariaLabel="Tipo de técnica"
					/>
				</div>

				<div class="space-y-1.5">
					<Label>Destino *</Label>
					{#if tipo === 'sumision'}
						<Combobox
							value={sumisionDestinoId}
							onValueChange={(id) => (sumisionDestinoId = id)}
							items={sumisionItems}
							placeholder="Selecciona una sumisión…"
							searchPlaceholder="Buscar sumisión…"
							emptyMessage="Sin sumisiones todavía."
							onCreateNew={mode === 'stack' ? handleCreateNuevaSumision : undefined}
							createNewLabel="Crear nueva sumisión"
							ariaLabel="Sumisión de destino"
						/>
					{:else if tipo}
						<Combobox
							value={posicionDestinoId}
							onValueChange={(id) => (posicionDestinoId = id)}
							items={posicionItems}
							placeholder="Selecciona una posición…"
							searchPlaceholder="Buscar posición…"
							emptyMessage="Sin posiciones en el catálogo."
							onCreateNew={mode === 'stack' ? handleCreateNuevaPosicion : undefined}
							createNewLabel="Crear nueva posición"
							ariaLabel="Posición de destino"
						/>
					{:else}
						<p class="text-sm text-muted-foreground italic">
							Selecciona primero el tipo para elegir el destino.
						</p>
					{/if}
				</div>

				<div class="space-y-1.5">
					<Label>Estado</Label>
					<Chips
						options={ESTADOS}
						value={estado ?? null}
						onChange={handleEstadoChange}
						ariaLabel="Estado de la técnica"
					/>
				</div>

				{#if settings.modoAvanzado}
					<div class="space-y-1.5">
						<Label for="tecnica-form-detalles">Detalles</Label>
						<Textarea id="tecnica-form-detalles" bind:value={detalles} rows={4} />
					</div>

					<div class="space-y-1.5">
						<Label for="tecnica-form-errores">Errores comunes</Label>
						<Textarea id="tecnica-form-errores" bind:value={erroresComunes} rows={4} />
					</div>
				{/if}

				{#if errorMsg}
					<p class="text-sm text-destructive">{errorMsg}</p>
				{/if}
			</div>

			<div
				class="mt-2 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3"
			>
				<Button variant="outline" size="sm" onclick={cancel} disabled={saving}>Cancelar</Button>
				<Button
					size="sm"
					onclick={handleSave}
					disabled={saving || !nombre.trim() || !posicionOrigenId || !tipo || !!nombreError}
				>
					{saving ? 'Guardando…' : 'Guardar'}
				</Button>
			</div>
		{/if}
	</div>
{/if}
