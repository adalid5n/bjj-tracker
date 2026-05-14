/**
 * Helper para derivar el título y el flag `isTopLevel` del AppHeader a partir
 * del `pathname` actual.
 *
 * Las claves de `TOP_LEVEL` son paths "lógicos" (sin el prefijo de
 * `paths.base`). El helper normaliza el pathname recibido strippeando ese
 * prefijo antes de comparar, así funciona tanto en dev (`/rolls`) como en
 * prod GitHub Pages (`/bjj-tracker/rolls`).
 *
 * `isTopLevel = true` significa que la ruta aparece en BottomNav y NO debe
 * mostrarse el botón "← Volver" en el header.
 */
import { base } from '$app/paths';

const TOP_LEVEL: Record<string, string> = {
	'/': 'Home',
	'/rolls': 'Rolls',
	'/mapa': 'Mapa técnico',
	'/companeros': 'Compañeros',
	'/ajustes': 'Ajustes'
};

function stripBase(pathname: string): string {
	if (base && pathname.startsWith(base)) {
		const rest = pathname.slice(base.length);
		return rest === '' ? '/' : rest;
	}
	return pathname;
}

export function deriveHeader(pathname: string): { title: string; isTopLevel: boolean } {
	const logical = stripBase(pathname);

	if (logical in TOP_LEVEL) {
		return { title: TOP_LEVEL[logical], isTopLevel: true };
	}

	// Detalle de sesión.
	if (/^\/sesion\/[^/]+$/.test(logical)) {
		return { title: 'Detalle de sesión', isTopLevel: false };
	}

	// Cualquier otra ruta: título vacío, back disponible.
	return { title: '', isTopLevel: false };
}
