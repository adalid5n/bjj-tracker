// Hook reactivo `useMediaQuery` para evaluar media queries CSS desde
// runas de Svelte 5. Útil para derivar layout responsivo en .svelte
// cuando un puro CSS no basta (p. ej. elegir entre dos componentes
// estructuralmente distintos según breakpoint).
//
// `matchMedia` es la API nativa del navegador que evalúa si una media
// query CSS matchea ahora mismo y notifica cuando el resultado cambia
// (resize, cambio de orientación, etc.).
//
// Patrón canónico del proyecto: `$state` solo dentro de class fields,
// nunca a nivel de módulo en `.svelte.ts` (rompe el bundle minificado
// en prod — ver CONTEXTO_AGENTE.md, histórico T-8). Por eso el hook
// devuelve una instancia de class con un getter `matches`, no un
// boolean primitivo.
//
// Guard SSR: durante SSR (`!browser`) `matches` queda en `false` y el
// listener no se registra. El primer client-side render reactivará el
// valor correcto vía el `constructor`.

import { browser } from '$app/environment';

class MediaQueryState {
	#matches = $state(false);
	#mql: MediaQueryList | null = null;
	#handler = (e: MediaQueryListEvent) => {
		this.#matches = e.matches;
	};

	constructor(query: string) {
		if (!browser) return;
		this.#mql = window.matchMedia(query);
		this.#matches = this.#mql.matches;
		this.#mql.addEventListener('change', this.#handler);
	}

	get matches(): boolean {
		return this.#matches;
	}

	/**
	 * Limpia el listener. Opcional: el navegador GC-eará el listener
	 * cuando la instancia se descarte, pero si la página vive mucho
	 * y se crean/destruyen muchas instancias, llamar a dispose evita
	 * leaks acumulados.
	 */
	dispose(): void {
		this.#mql?.removeEventListener('change', this.#handler);
	}
}

export function useMediaQuery(query: string): MediaQueryState {
	return new MediaQueryState(query);
}
