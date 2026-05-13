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
	| { kind: 'wizard-posicion'; modo: 'crear'; nombre: string }
	| { kind: 'wizard-posicion'; modo: 'editar'; id: string; nombre: string }
	| { kind: 'wizard-sumision'; modo: 'crear'; nombre: string }
	| { kind: 'wizard-sumision'; modo: 'editar'; id: string; nombre: string }
	| { kind: 'wizard-tecnica'; modo: 'crear'; nombre: string; posicionOrigenId: string }
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
 * Return-handler API (T-10):
 *
 * Permite que el wizard de técnica reciba el id de una posición o
 * sumisión recién creada cuando el usuario abre el sub-wizard desde el
 * paso de destino vía "+ Crear nueva". El wizard de técnica registra el
 * handler antes de pushear el sub-wizard al stack; cuando el sub-wizard
 * guarda en modo crear, detecta el handler y lo invoca con el nuevo id
 * (en lugar de hacer su `closeAll + push modal` habitual). El wizard de
 * técnica recibe el id, prefiere el destino, y desregistra el handler.
 *
 * El kind del handler ('posicion' | 'sumision') distingue qué campo del
 * wizard de técnica debe rellenarse.
 */
type ReturnHandler = (newId: string, kind: 'posicion' | 'sumision') => void;

class MapaModalStack {
	#stack = $state<MapaModalEntry[]>([]);
	#dirtyHandler: DirtyHandler | null = null;
	#returnHandler: ReturnHandler | null = null;

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
		this.#returnHandler = handler;
	}

	hasReturnHandler(): boolean {
		return this.#returnHandler !== null;
	}

	/**
	 * Invoca el handler registrado (si lo hay) y lo desregistra para no
	 * dispararlo dos veces. Devuelve `true` si había handler y se invocó,
	 * `false` si no había handler — el caller decide entonces si hace su
	 * flujo normal de `closeAll + push modal`.
	 */
	invokeReturnHandler(newId: string, kind: 'posicion' | 'sumision'): boolean {
		const handler = this.#returnHandler;
		if (!handler) return false;
		this.#returnHandler = null;
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
