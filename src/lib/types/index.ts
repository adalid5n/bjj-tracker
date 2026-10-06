export type Cinturon = 'blanco' | 'azul' | 'morado' | 'marron' | 'negro';

/**
 * Tipo de sesión (T-4.it7): Clase u Open mat. BJJ / Grappling dejaron de ser
 * tipos y pasaron a ser la disciplina de la sesión (`Sesion.disciplina`).
 */
export type TipoSesion = 'clase' | 'open_mat';

export type PesoRelativo = 'similar' | 'mas' | 'menos' | 'mucho_mas' | 'mucho_menos';

export type ResultadoRoll = 'domine' | 'equilibrado' | 'me_dominaron';

export interface Companero {
	id: string;
	nombre: string;
	cinturon?: Cinturon;
	peso_relativo?: PesoRelativo;
	notas?: string;
	created_at: string;
	updated_at: string;
}

export interface Sesion {
	id: string;
	fecha: string;
	tipo: TipoSesion;
	/** BJJ, Grappling o Ambos (clase mixta). */
	disciplina: Disciplina;
	foco?: string;
	tecnica_clase?: string;
	obs_profesor?: string;
	created_at: string;
	updated_at: string;
}

export interface Roll {
	id: string;
	sesion_id: string;
	companero_id?: string;
	orden: number;
	/** BJJ o Grappling, nunca Ambos. */
	disciplina: DisciplinaCatalogo;
	tamano_relativo?: PesoRelativo;
	duracion_min?: number;
	resultado?: ResultadoRoll;
	que_intente?: string;
	que_fallo?: string;
	posiciones_problema?: string;
	created_at: string;
	updated_at: string;
}

// --- Mapa técnico (schema v2) ---

export interface Tag {
	id: string;
	nombre: string;
	color: string;
	created_at: string;
}

export type CategoriaPosicion = 'guardia' | 'control' | 'transicion' | 'otro';

/**
 * Disciplina de lo que sí puede ser mixto: una sesión, una importación y la
 * opción "Ambos" de los asistentes de creación ("crear en las dos").
 */
export type Disciplina = 'bjj' | 'grappling' | 'ambos';

/**
 * Disciplina de un elemento del catálogo (posición, sumisión, técnica) y de
 * un roll. Desde T-4.it7 ningún elemento guardado es "Ambos": "Ambos" crea
 * dos copias independientes.
 */
export type DisciplinaCatalogo = 'bjj' | 'grappling';

export type TipoRolPosicion = 'ofensiva' | 'defensiva' | 'neutral';

export type TipoTecnica = 'ataque' | 'sweep' | 'escape' | 'transicion' | 'sumision';

export type EstadoTecnica = 'probando' | 'funciona' | 'descartada';

export interface Posicion {
	id: string;
	nombre: string;
	categoria: CategoriaPosicion;
	tipo?: TipoRolPosicion;
	notas: string;
	posicion_complementaria_id?: string | null;
	disciplina: DisciplinaCatalogo;
	created_at: string;
	updated_at: string;
}

export interface SumisionTerminal {
	id: string;
	nombre: string;
	notas: string;
	disciplina: DisciplinaCatalogo;
	created_at: string;
	updated_at: string;
}

export interface Tecnica {
	id: string;
	nombre: string;
	variante?: string;
	posicion_origen_id: string;
	posicion_destino_id?: string;
	sumision_destino_id?: string;
	tipo: TipoTecnica;
	estado: EstadoTecnica;
	detalles: string;
	errores_comunes: string;
	disciplina: DisciplinaCatalogo;
	created_at: string;
	updated_at: string;
}

export interface TecnicaContra {
	tecnica_id: string;
	contra_tecnica_id: string;
	created_at: string;
}
