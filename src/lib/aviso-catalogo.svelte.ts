/**
 * Aviso tras guardar en el catálogo (T-4.it7, P2): p. ej. "Para completar
 * la otra disciplina se creó: "Mount" (posición) en Grappling." cuando una
 * técnica "Ambos" necesitó crear su origen o destino en la otra disciplina.
 *
 * El asistente se cierra al guardar, así que el aviso vive aquí y lo pinta
 * `AvisoCatalogo.svelte` (en el host de modales del mapa y en el editor de
 * rolls) hasta que el usuario lo cierra.
 *
 * Patrón canónico del proyecto: runa dentro de class field.
 */
class AvisoCatalogoState {
	#texto = $state<string | null>(null);

	get texto(): string | null {
		return this.#texto;
	}

	set(texto: string | null): void {
		this.#texto = texto && texto.trim() ? texto : null;
	}

	/**
	 * Añade al aviso actual (si lo hay). Lo usan los asistentes al guardar
	 * para no pisar el aviso que dejó un sub-asistente ("+ Crear nueva")
	 * del mismo flujo. El host lo limpia al cerrar el stack / abrir el roll.
	 */
	append(texto: string | null): void {
		if (!texto || !texto.trim()) return;
		this.#texto = this.#texto ? `${this.#texto} ${texto}` : texto;
	}

	clear(): void {
		this.#texto = null;
	}
}

export const avisoCatalogo = new AvisoCatalogoState();
