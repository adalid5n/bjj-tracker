/**
 * Aviso tras guardar en el catálogo (T-4.it7): lo que la app hizo para
 * completar la otra disciplina al crear algo "Ambos" (p. ej. `Posición
 * complementaria "P4" creada en BJJ`). Una línea corta por evento, con su
 * detalle (qué pasó y por qué) para mostrarlo al tocar el icono de info.
 *
 * El asistente se cierra al guardar, así que el aviso vive aquí y lo pinta
 * `AvisoCatalogo.svelte` (en el host de modales del mapa y en el editor de
 * rolls) hasta que el usuario lo cierra.
 *
 * Patrón canónico del proyecto: runa dentro de class field.
 */

/** `info`: solo informa. `warning`: el usuario puede querer actuar. */
export type TonoAviso = 'info' | 'warning';

export type LineaAviso = {
	/** Una línea corta y llana: `"P4" enlazada con la existente en Grappling`. */
	texto: string;
	/** Explicación completa (qué pasó y por qué), al tocar el icono de info. */
	detalle: string;
	tono: TonoAviso;
};

class AvisoCatalogoState {
	#lineas = $state<LineaAviso[]>([]);

	get lineas(): LineaAviso[] {
		return this.#lineas;
	}

	get hayAviso(): boolean {
		return this.#lineas.length > 0;
	}

	/**
	 * Añade líneas al aviso actual. Lo usan los asistentes al guardar para
	 * no pisar el aviso que dejó un sub-asistente ("+ Crear nueva") del
	 * mismo flujo. El host lo limpia al cerrar el stack / abrir el roll.
	 */
	append(lineas: LineaAviso | LineaAviso[]): void {
		const nuevas = (Array.isArray(lineas) ? lineas : [lineas]).filter((l) => l.texto.trim());
		if (nuevas.length === 0) return;
		this.#lineas = [...this.#lineas, ...nuevas];
	}

	clear(): void {
		if (this.#lineas.length > 0) this.#lineas = [];
	}
}

export const avisoCatalogo = new AvisoCatalogoState();
