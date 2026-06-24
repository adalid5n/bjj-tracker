/**
 * Stack de modales del mapa técnico (T-4).
 *
 * En lugar de anidar varios `Dialog.Root`, mantenemos UN solo Dialog
 * controlado por este store: el stack guarda la lista de entradas y
 * `MapaModalHost.svelte` renderiza la del top con breadcrumb + ←/✕.
 *
 * `push` añade un nivel encima del actual (navegar a un nodo nuevo).
 * `pop` cierra solo el nivel superior (botón "← Atrás").
 * `popTo(i)` corta el stack hasta el índice dado (click en breadcrumb).
 * `closeAll` vacía todo (botón "✕ Cerrar").
 *
 * Patrón de state canónico del proyecto (ver CONTEXTO_AGENTE):
 * runa `$state` dentro de class field privado, exponer get/set.
 */

export type MapaModalEntry =
	| { kind: 'posicion'; id: string; nombre: string }
	| { kind: 'tecnica'; id: string; nombre: string }
	| { kind: 'sumision'; id: string; nombre: string }
	| {
			kind: 'wizard-posicion';
			modo: 'crear';
			nombre: string;
			/**
			 * Si el sub-wizard se abre desde "+ Crear nueva" del paso
			 * Complementaria de otro PosicionWizard YA EXISTENTE (modo editar
			 * o ya guardado), este id es el del padre. La simetría
			 * bidireccional la aplica `syncComplementaria` al guardar el sub.
			 *
			 * Si el padre todavía no existe (está en modo crear, sin id), este
			 * campo queda `undefined`. El sub se guarda con
			 * `posicion_complementaria_id = null` y la simetría se aplica
			 * cuando el padre se guarda (también vía `syncComplementaria`).
			 */
			parentForComplementaria?: string;
			/**
			 * Indica que este sub-wizard vino de "+ Crear nueva complementaria"
			 * (con o sin id del padre). Bajo este flag se salta el paso 4
			 * (Complementaria) del sub porque la complementaria está implícita
			 * (el padre). Distinto de `isSubWizard` (que solo dice "soy sub
			 * por estar en stack.length > 1, no toques draft del padre").
			 */
			isComplementariaSubWizard?: boolean;
	  }
	| { kind: 'wizard-posicion'; modo: 'editar'; id: string; nombre: string }
	| { kind: 'wizard-sumision'; modo: 'crear'; nombre: string }
	| { kind: 'wizard-sumision'; modo: 'editar'; id: string; nombre: string }
	| { kind: 'wizard-tecnica'; modo: 'crear'; nombre: string; posicionOrigenId?: string }
	| { kind: 'wizard-tecnica'; modo: 'editar'; id: string; nombre: string };

/**
 * Dirty-handler API (T-8 fixes E):
 *
 * El wizard (montado en la entrada top del stack) registra un callback
 * que devuelve `true` si tiene cambios sin guardar. El host
 * (`MapaModalHost`) consulta `isDirty()` antes de cerrar todo el stack o
 * de hacer pop a una entrada anterior; si devuelve true, muestra un
 * AlertDialog de confirmación. El wizard desregistra el handler al
 * desmontarse para no dejar referencias colgantes.
 */
type DirtyHandler = () => boolean;

/**
 * Return-handler API (T-10, ampliada en T-11):
 *
 * Permite que un componente padre (wizard de técnica, modal de técnica)
 * reciba el id de una entidad recién creada cuando el usuario abre un
 * sub-wizard inline vía "+ Crear nueva". El padre registra el handler
 * antes de pushear el sub-wizard al stack; cuando el sub-wizard guarda
 * en modo crear, detecta el handler y lo invoca con el nuevo id (en
 * lugar de hacer su `closeAll + push modal` habitual). El padre recibe
 * el id y reacciona (prefill destino, añadir como contra, etc.).
 *
 * Kinds soportados:
 *  - 'posicion' / 'sumision' (T-10): paso 5 del wizard de técnica.
 *  - 'tecnica' (T-11): "+ Añadir contra" del modal de técnica.
 *
 * El handler puede ser síncrono o devolver un Promise. Si necesita que
 * un trabajo asíncrono (p. ej. `addContra`) complete antes de que el
 * componente padre se remonte y lea de BD, debe registrar el Promise
 * en `pendingReturnHandlerWork` (ver más abajo).
 */
type ReturnHandler = (newId: string, kind: 'posicion' | 'sumision' | 'tecnica') => void;

/**
 * Trabajo asíncrono "pendiente" que un return-handler dejó iniciado y
 * que el componente padre debería esperar antes de leer estado de BD al
 * remontarse (T-11).
 *
 * Caso de uso: el handler registrado por `TecnicaModalContent` invoca
 * `addContra(tecnicaActualId, nuevoId)` de forma síncrona (sin
 * `await`), guarda la Promise aquí, y el modal — que se remonta cuando
 * el wizard sub-pushed se cierra — lee este Promise en su `onMount` y
 * lo espera antes de llamar a `getContras`, garantizando que la nueva
 * contra ya esté en BD cuando se hace la query.
 *
 * No es reactivo (no usa `$state`): es una variable de bandera entre
 * dos ciclos de vida.
 */
let pendingReturnHandlerWork: Promise<unknown> | null = null;
export function setPendingReturnHandlerWork(p: Promise<unknown> | null): void {
	pendingReturnHandlerWork = p;
}
export function consumePendingReturnHandlerWork(): Promise<unknown> | null {
	const p = pendingReturnHandlerWork;
	pendingReturnHandlerWork = null;
	return p;
}

class MapaModalStack {
	#stack = $state<MapaModalEntry[]>([]);
	#dirtyHandler: DirtyHandler | null = null;
	/**
	 * Stack LIFO de return-handlers. Necesario porque los flujos "+ Crear
	 * nueva inline" se anidan: el modal de técnica registra un handler para
	 * añadir-como-contra, y el wizard de técnica pushea encima un sub-wizard
	 * de posición/sumisión que registra OTRO handler para prefill del destino.
	 * Con un singleton el primero se sobrescribía y se perdía (bug T-11).
	 */
	#returnHandlers: ReturnHandler[] = [];

	get stack(): readonly MapaModalEntry[] {
		return this.#stack;
	}

	get isOpen(): boolean {
		return this.#stack.length > 0;
	}

	get top(): MapaModalEntry | undefined {
		return this.#stack[this.#stack.length - 1];
	}

	push(entry: MapaModalEntry): void {
		this.#stack = [...this.#stack, entry];
	}

	/**
	 * Navegación entre entidades del mapa (T-10.it3.a). Si la entidad
	 * destino (mismo `kind` + `id`) ya está en el stack, hacer `popTo`
	 * para volver a ella en lugar de duplicarla en el breadcrumb.
	 * Si no, `push` normal.
	 *
	 * Regla: el breadcrumb representa el camino de navegación; volver
	 * a una entidad ya visitada es retroceder, no avanzar. Ejemplo:
	 * estás en Posición A, abres Técnica T (origen A) → stack=[A, T].
	 * Click en "Origen A" debe volver a A, no crear [A, T, A].
	 *
	 * Solo aplica a navegación entre entidades (`posicion`/`sumision`/
	 * `tecnica`). Los wizards usan `push` directo: crear/editar no es
	 * navegación y nunca debería deduplicarse.
	 */
	pushOrPopTo(entry: MapaModalEntry): void {
		if (!('id' in entry)) {
			this.push(entry);
			return;
		}
		const idx = this.#stack.findIndex(
			(e) => 'id' in e && e.kind === entry.kind && e.id === entry.id
		);
		if (idx >= 0) this.popTo(idx);
		else this.push(entry);
	}

	pop(): void {
		if (this.#stack.length === 0) return;
		this.#stack = this.#stack.slice(0, -1);
	}

	popTo(index: number): void {
		if (index < 0 || index >= this.#stack.length) return;
		this.#stack = this.#stack.slice(0, index + 1);
	}

	closeAll(): void {
		this.#stack = [];
	}

	setDirtyHandler(handler: DirtyHandler | null): void {
		this.#dirtyHandler = handler;
	}

	isDirty(): boolean {
		return this.#dirtyHandler ? this.#dirtyHandler() : false;
	}

	setReturnHandler(handler: ReturnHandler | null): void {
		if (handler === null) return;
		this.#returnHandlers.push(handler);
	}

	hasReturnHandler(): boolean {
		return this.#returnHandlers.length > 0;
	}

	/**
	 * Invoca el handler del tope del stack y lo desapila. Devuelve `true`
	 * si había handler y se invocó, `false` si no había — el caller decide
	 * entonces si hace su flujo normal de `closeAll + push modal`.
	 *
	 * Los handlers son LIFO: el más reciente responde primero. Cada handler
	 * tiene una guardia `if (kind !== 'X') return` para ignorar invocaciones
	 * que no le correspondan. La invocación SIEMPRE desapila el top, aunque
	 * la guardia lo ignore — esto evita acumulación pero deja huérfano al
	 * handler de debajo si los kinds llegan desordenados (caso raro: solo
	 * ocurre si un wizard se cancela sin invocar su handler, lo que ya
	 * estaba anotado como pendiente menor).
	 */
	invokeReturnHandler(newId: string, kind: 'posicion' | 'sumision' | 'tecnica'): boolean {
		const handler = this.#returnHandlers.pop();
		if (!handler) return false;
		handler(newId, kind);
		return true;
	}
}

export const mapaModalStack = new MapaModalStack();

/**
 * Draft store del wizard de técnica (T-10).
 *
 * Por qué existe: cuando el usuario pulsa "+ Crear nueva posición" /
 * "+ Crear nueva sumisión" en el paso 5 del wizard de técnica, pusheamos
 * un sub-wizard al stack. El host renderiza solo el top, así que el
 * `TecnicaWizard` se desmonta — y al popearlo de vuelta perdemos todos
 * sus `$state` (nombre, variante, tipo, etc.). Sin esto el usuario tiene
 * que rellenar el wizard desde cero.
 *
 * Solución: `TecnicaWizard` escribe su estado actual aquí en cada cambio
 * y lo lee al montar. El draft sobrevive remounts. Se limpia al guardar
 * con éxito y cuando la entrada `wizard-tecnica` deja de estar en el
 * stack (lo gestiona el host con `clearTecnicaDraftIfGone()`).
 *
 * Patrón canónico del proyecto: `$state` dentro de class field privado.
 */
export type TecnicaWizardDraftState = {
	/** Discriminador: 'crear' o 'editar:<id>'. Si no coincide al montar el wizard, se ignora y limpia. */
	key: string;
	nombre: string;
	variante: string;
	posicionOrigenId: string | null;
	posicionDestinoId: string | null;
	sumisionDestinoId: string | null;
	tipo: 'ataque' | 'sweep' | 'escape' | 'transicion' | 'sumision' | undefined;
	estado: 'probando' | 'funciona' | 'descartada' | undefined;
	// T-3.it6: re-introducidos bajo modoAvanzado. En modoHobbyist se
	// persisten como '' y los pasos no se renderizan. Mantener el campo en
	// el draft permite que sobreviva el remount tras un sub-wizard inline.
	detalles: string;
	erroresComunes: string;
	currentStep: number;
	visitedSteps: number[];
};

class TecnicaWizardDraftStore {
	#draft = $state<TecnicaWizardDraftState | null>(null);

	get value(): TecnicaWizardDraftState | null {
		return this.#draft;
	}

	set(draft: TecnicaWizardDraftState): void {
		this.#draft = draft;
	}

	clear(): void {
		this.#draft = null;
	}
}

export const tecnicaWizardDraft = new TecnicaWizardDraftStore();

/**
 * Draft store del wizard de posición (T-1.it2).
 *
 * Misma razón que `tecnicaWizardDraft`: cuando el usuario pulsa
 * "+ Crear nueva posición" en el paso "Complementaria" del wizard, el
 * sub-wizard se pushea encima y el padre se desmonta. Sin draft se
 * perdería todo lo que llevaba escrito.
 *
 * Patrón canónico: `$state` dentro de class field privado.
 */
export type PosicionWizardDraftState = {
	/** Discriminador: 'crear' o 'editar:<id>'. Si no coincide al montar el wizard, se ignora y limpia. */
	key: string;
	nombre: string;
	categoria: 'guardia' | 'control' | 'transicion' | 'otro' | undefined;
	tipo: 'ofensiva' | 'defensiva' | 'neutral' | undefined;
	complementariaId: string | null;
	// T-3.it6: re-introducidas bajo modoAvanzado. En modoHobbyist se
	// persisten como '' y el paso no se renderiza. Mantener el campo en
	// el draft permite que sobreviva el remount tras un sub-wizard inline.
	notas: string;
	currentStep: number;
	visitedSteps: number[];
};

class PosicionWizardDraftStore {
	#draft = $state<PosicionWizardDraftState | null>(null);

	get value(): PosicionWizardDraftState | null {
		return this.#draft;
	}

	set(draft: PosicionWizardDraftState): void {
		this.#draft = draft;
	}

	clear(): void {
		this.#draft = null;
	}
}

export const posicionWizardDraft = new PosicionWizardDraftStore();
