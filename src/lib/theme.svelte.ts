// M7: gestor de tema (auto / claro / oscuro).
//
// - Default: sigue `prefers-color-scheme` del SO (modo 'auto').
// - El usuario puede sobreescribir en /ajustes con 'light' o 'dark'.
// - Persistencia en `localStorage` key `theme` con valores
//   `'auto' | 'light' | 'dark'`.
// - Aplica/quita la clase `.dark` en `<html>` según el modo efectivo.
//
// Patrón canónico del proyecto: `$state` solo dentro de class fields,
// nunca a nivel de módulo en `.svelte.ts` (rompe el bundle minificado en
// prod — ver CONTEXTO_AGENTE.md, histórico T-8).
//
// Compromiso conocido: micro-FOUC al cargar la primera vez si el modo
// persistido es `dark` y el SO está en claro (o viceversa). El owner
// acepta el flash para no tocar `app.html`. Mitigación posible (no
// implementada): script bloqueante en `app.html` que aplique la clase
// antes del primer paint.

type ThemeMode = 'auto' | 'light' | 'dark';

class ThemeState {
	#mode: ThemeMode = $state('auto');
	#systemDark = $state(false);
	#initialized = false;
	#mediaQuery: MediaQueryList | null = null;
	#onSystemChange: ((e: MediaQueryListEvent) => void) | null = null;

	get mode(): ThemeMode {
		return this.#mode;
	}

	get isDark(): boolean {
		return this.#mode === 'dark' || (this.#mode === 'auto' && this.#systemDark);
	}

	/**
	 * Llamar una sola vez desde `+layout.svelte` (onMount). Idempotente y
	 * con guard SSR. Lee el modo persistido, suscribe al cambio de
	 * `prefers-color-scheme` y aplica la clase inicial.
	 */
	init(): void {
		if (typeof window === 'undefined' || this.#initialized) return;
		this.#initialized = true;

		const stored = localStorage.getItem('theme') as ThemeMode | null;
		if (stored === 'auto' || stored === 'light' || stored === 'dark') {
			this.#mode = stored;
		}

		this.#mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
		this.#systemDark = this.#mediaQuery.matches;
		this.#onSystemChange = (e: MediaQueryListEvent) => {
			this.#systemDark = e.matches;
			this.#apply();
		};
		this.#mediaQuery.addEventListener('change', this.#onSystemChange);

		this.#apply();
	}

	setMode(mode: ThemeMode): void {
		this.#mode = mode;
		if (typeof window !== 'undefined') {
			localStorage.setItem('theme', mode);
			this.#apply();
		}
	}

	#apply(): void {
		if (typeof document === 'undefined') return;
		const root = document.documentElement;
		if (this.isDark) root.classList.add('dark');
		else root.classList.remove('dark');
	}
}

export const theme = new ThemeState();
