/**
 * Etiquetas de sesión (T-4.it7). Módulo puro (sin BD): se puede importar
 * estáticamente desde páginas prerenderizadas.
 */
import type { Disciplina, TipoSesion } from '$lib/types';

/** Etiquetas de tipo y disciplina de sesión (T-4.it7): "Clase · BJJ". */
export const TIPO_SESION_LABEL: Record<TipoSesion, string> = {
	clase: 'Clase',
	open_mat: 'Open mat'
};
export const DISCIPLINA_SESION_LABEL: Record<Disciplina, string> = {
	bjj: 'BJJ',
	grappling: 'Grappling',
	ambos: 'BJJ y Grappling'
};
export function etiquetaSesion(s: { tipo: string; disciplina?: string | null }): string {
	const tipo = TIPO_SESION_LABEL[s.tipo as TipoSesion] ?? s.tipo;
	const d = s.disciplina ? DISCIPLINA_SESION_LABEL[s.disciplina as Disciplina] : undefined;
	return d ? `${tipo} · ${d}` : tipo;
}
