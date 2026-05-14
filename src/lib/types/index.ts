export type Cinturon = 'blanco' | 'azul' | 'morado' | 'marron' | 'negro';

export type TipoSesion = 'bjj' | 'grappling' | 'open_mat';

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

// --- Mapa técnico (schema v2) ---

export type CategoriaPosicion =
	| 'guardia'
	| 'control_superior'
	| 'espalda'
	| 'transicion'
	| 'otro';

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
	created_at: string;
	updated_at: string;
}

export interface SumisionTerminal {
	id: string;
	nombre: string;
	notas: string;
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
	created_at: string;
	updated_at: string;
}

export interface TecnicaContra {
	tecnica_id: string;
	contra_tecnica_id: string;
	created_at: string;
}
