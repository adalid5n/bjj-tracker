/**
 * State reactivo de preferencias de usuario persistidas en BD.
 *
 * Patrón canónico del proyecto: `$state` solo dentro de class fields,
 * nunca a nivel de módulo en `.svelte.ts` (rompe el bundle minificado
 * en prod — ver CONTEXTO_AGENTE.md, histórico T-8).
 *
 * Hidratación: `init()` lee de BD y poblará los campos. Es
 * idempotente y se puede llamar desde cualquier consumidor sin riesgo
 * — sigue el patrón de `theme.init()` y de los DAOs (`await init()` al
 * principio de cada función). La primera llamada hace el round-trip a
 * la BD; las siguientes devuelven el promise cacheado.
 *
 * `modoAvanzado` (getter reactivo) está disponible sincrónicamente
 * desde cualquier componente Svelte tras esperar a `initialized = true`
 * (o asumiendo el default `false` mientras se hidrata — comportamiento
 * aceptable para un toggle de UI, no para datos críticos).
 */
import { getSetting, setSetting } from '$lib/settings';

const KEY_MODO_AVANZADO = 'modo_avanzado';
const KEY_DISCIPLINA_ACTIVA = 'disciplina_activa';

class SettingsState {
	#modoAvanzado = $state(false);
	#disciplinaActiva = $state<'bjj' | 'grappling'>('bjj');
	#initialized = $state(false);
	#initPromise: Promise<void> | null = null;

	get modoAvanzado(): boolean {
		return this.#modoAvanzado;
	}

	get disciplinaActiva(): 'bjj' | 'grappling' {
		return this.#disciplinaActiva;
	}

	get initialized(): boolean {
		return this.#initialized;
	}

	/**
	 * Idempotente. La primera llamada lanza el fetch a BD; las siguientes
	 * devuelven el mismo promise (no relee). Si la BD aún no existe en el
	 * momento de la primera llamada, `getSetting` la inicializa por su
	 * propia cuenta (el DAO hace `await init()` internamente).
	 */
	async init(): Promise<void> {
		if (this.#initPromise) return this.#initPromise;
		this.#initPromise = (async () => {
			const [rawAvanzado, rawDisciplina] = await Promise.all([
				getSetting(KEY_MODO_AVANZADO),
				getSetting(KEY_DISCIPLINA_ACTIVA)
			]);
			// `raw === null` solo debería darse si la migración no corrió
			// (BD inconsistente). Defaults seguros.
			this.#modoAvanzado = rawAvanzado === 'true';
			this.#disciplinaActiva = rawDisciplina === 'grappling' ? 'grappling' : 'bjj';
			this.#initialized = true;
		})();
		return this.#initPromise;
	}

	async setModoAvanzado(v: boolean): Promise<void> {
		await setSetting(KEY_MODO_AVANZADO, v ? 'true' : 'false');
		this.#modoAvanzado = v;
	}

	async setDisciplinaActiva(v: 'bjj' | 'grappling'): Promise<void> {
		await setSetting(KEY_DISCIPLINA_ACTIVA, v);
		this.#disciplinaActiva = v;
	}
}

export const settings = new SettingsState();
