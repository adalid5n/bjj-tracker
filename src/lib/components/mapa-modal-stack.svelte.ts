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
	| { kind: 'wizard-posicion'; modo: 'editar'; id: string; nombre: string };

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

class MapaModalStack {
	#stack = $state<MapaModalEntry[]>([]);
	#dirtyHandler: DirtyHandler | null = null;

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
}

export const mapaModalStack = new MapaModalStack();
