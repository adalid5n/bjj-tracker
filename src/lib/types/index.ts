export type Cinturon = 'blanco' | 'azul' | 'morado' | 'marron' | 'negro';

export type TipoSesion = 'bjj' | 'grappling' | 'open_mat';

export type PesoRelativo = 'similar' | 'mas' | 'menos' | 'mucho_mas' | 'mucho_menos';

export type ResultadoRoll = 'domine' | 'equilibrado' | 'me_dominaron';

export interface Companero {
	id: string;
	nombre: string;
	cinturon?: Cinturon;
	experiencia_anos?: number;
	peso_relativo?: PesoRelativo;
	notas?: string;
	created_at: string;
	updated_at: string;
}

export interface Sesion {
	id: string;
	fecha: string;
	tipo: TipoSesion;
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
	tamano_relativo?: PesoRelativo;
	duracion_min?: number;
	resultado?: ResultadoRoll;
	que_intente?: string;
	que_fallo?: string;
	posiciones_problema?: string;
	created_at: string;
	updated_at: string;
}
