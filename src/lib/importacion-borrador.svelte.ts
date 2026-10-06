/**
 * Borrador de "Importar de clase" fuera del diálogo (T-3.it7, change
 * `vista-previa-importacion`, Decisión 1 del design).
 *
 * El diálogo `ImportarClaseDialog` pasa a ser una VISTA de este borrador:
 * cerrar el `Dialog` ya no pierde nada; solo `reset()` (Descartar/Cerrar
 * explícito, o tras aceptar) lo vacía. Así la vista previa en `/mapa`
 * puede cerrar el diálogo y "Cancelar" lo reabre en "Revisar propuesta"
 * con todo intacto.
 *
 * Instancia POR PÁGINA (no singleton): `/mapa` hace `new ImportacionBorrador()`.
 * Salir de `/mapa` desmonta la página y el borrador se pierde; el
 * historial (T-2.it7) conserva la entrada como "Sin terminar".
 *
 * Patrón del proyecto: `$state` solo en class fields, nunca a nivel de
 * módulo en `.svelte.ts`.
 */
import { listPosiciones, createPosicion } from '$lib/posiciones';
import { getTagsForPosicion, setTagsForPosicion } from '$lib/tags';
import { listTecnicas, createTecnica } from '$lib/tecnicas';
import { listSumisiones, createSumision } from '$lib/sumisiones';
import {
	generarPropuestaDeClase,
	refinarPropuesta,
	normalizarDescripcion,
	validarPropuesta
} from '$lib/ai';
import type { CatalogoSnapshot, AIPropuesta, NormalizacionResult } from '$lib/ai';
import type {
	CategoriaPosicion,
	Disciplina,
	Posicion,
	SumisionTerminal,
	TipoRolPosicion,
	TipoTecnica
} from '$lib/types';
import { settings } from '$lib/settings.svelte';
import { capitalizeFirst } from '$lib/utils';
import {
	createImportacion,
	getImportacion,
	updateImportacion,
	mergeAceptado,
	parseAceptado,
	tituloDeRespaldo,
	type Aceptado,
	type ImportacionPatch
} from '$lib/importaciones';
import { ghostIdPosicion, ghostIdSumision, normalizarNombre, type ClaveBorrador } from '$lib/grafo';

export type PosicionItem = {
	nombre: string;
	categoria: CategoriaPosicion;
	tipo?: TipoRolPosicion;
	seleccionado: boolean;
	nombreEditado: string;
	categoriaEditada: CategoriaPosicion;
	tipoEditado: TipoRolPosicion | undefined;
	esManual?: boolean;
};

export type SumisionItem = {
	nombre: string;
	seleccionado: boolean;
	nombreEditado: string;
	notas?: string;
};

export type TecnicaItem = {
	nombre: string;
	variante?: string;
	tipo: TipoTecnica;
	posicionOrigenNombre: string;
	posicionDestinoNombre?: string;
	sumisionDestinoNombre?: string;
	seleccionado: boolean;
	puedeCrearse: boolean;
	esManual?: boolean;
	detalles?: string;
};

export type PasoImportacion = 'input' | 'normalizado' | 'review' | 'detalles' | 'preview';

/** Disciplina de cada paso de la vista previa en el mapa. */
export type DisciplinaPaso = 'bjj' | 'grappling';

/** Elemento que no se creará porque causó el error de un paso de la vista previa. */
export type ExcluidoPorError = {
	clave: ClaveBorrador;
	nombre: string;
	motivo: string;
	/** Índice del paso de la vista previa en el que se excluyó. */
	paso: number;
};

/** Algo que no se creó al aceptar, con el motivo para el usuario. */
export type NoCreado = { nombre: string; motivo: string };

export type ResultadoConfirmar =
	| {
			ok: true;
			ghostToReal: Map<string, string>;
			noCreados: NoCreado[];
			/** T-4.it7 (P2): lo creado solo en un lado para completar la otra disciplina. */
			creadosEnUnLado: NoCreado[];
	  }
	| { ok: false };

const LADO_LABEL: Record<DisciplinaPaso, string> = { bjj: 'BJJ', grappling: 'Grappling' };

/**
 * T-4.it7: lados de una importación. BJJ o Grappling → ese; "Ambos" → los
 * dos (cada elemento nuevo se crea como dos copias independientes). Cada
 * lado se compara solo con el catálogo de su disciplina (sustituye la regla
 * de T-3 "Ambos → solo Ambos").
 */
export function ladosDeImportacion(d: Disciplina): DisciplinaPaso[] {
	return d === 'ambos' ? ['bjj', 'grappling'] : [d];
}

/** Filtra una lista del catálogo a los lados de la importación. */
export function filtrarPorDisciplinaImportacion<T extends { disciplina: string }>(
	items: T[],
	d: Disciplina
): T[] {
	const permitidas = new Set<string>(ladosDeImportacion(d));
	return items.filter((it) => permitidas.has(it.disciplina));
}

/** Une listas sin repetir nombres (normalizados); gana la primera aparición. */
function unirPorNombre<T extends { nombre: string }>(items: T[]): T[] {
	const vistos = new Set<string>();
	return items.filter((it) => {
		const n = normalizarNombre(it.nombre);
		if (vistos.has(n)) return false;
		vistos.add(n);
		return true;
	});
}

type CatalogoLado = {
	posiciones: { id: string; nombre: string; categoria: CategoriaPosicion; tipo?: TipoRolPosicion }[];
	sumisiones: { id: string; nombre: string; notas: string }[];
};

function mensajeErrorIA(err: unknown): string {
	if (err instanceof Error && err.message === 'GROQ_KEY_MISSING') {
		return 'No hay clave de Groq configurada.';
	}
	if (err instanceof Error && err.message === 'AI_TIMEOUT') {
		return 'La petición tardó demasiado y se canceló. Revisa tu conexión e inténtalo de nuevo.';
	}
	if (err instanceof Error && err.message === 'AI_RESPONSE_INVALID') {
		return 'El AI devolvió una respuesta inesperada. Inténtalo de nuevo.';
	}
	if (err instanceof Error && err.message.includes('503')) {
		return 'El servidor de Groq está saturado ahora mismo. Espera un minuto e inténtalo de nuevo.';
	}
	if (err instanceof Error && err.message.includes('429')) {
		return 'Límite de uso alcanzado. Espera unos segundos e inténtalo de nuevo.';
	}
	return err instanceof Error ? err.message : String(err);
}

export class ImportacionBorrador {
	paso = $state<PasoImportacion>('input');
	/**
	 * Disciplina de la importación (selector del primer paso). Todo lo que
	 * se cree la lleva; también decide el catálogo con el que se compara.
	 */
	disciplina = $state<Disciplina>(settings.disciplinaActiva);
	/** Índice del paso actual de la vista previa (en `pasosPreview`). */
	pasoPreview = $state(0);
	/** Elementos que no se crearán por "Seguir con la siguiente disciplina". */
	excluidosPorError = $state<ExcluidoPorError[]>([]);

	/** Pasos de la vista previa: uno por disciplina; "Ambos" → BJJ y Grappling. */
	get pasosPreview(): DisciplinaPaso[] {
		return ladosDeImportacion(this.disciplina);
	}

	/**
	 * T-4.it7: catálogo de cada lado al generar la propuesta. Decide qué es
	 * nuevo en cada lado (`ladosNuevos*`). La IA y "+ Añadir" usan la unión
	 * (`catalogoPosicionesBase` / `catalogoSumisionesBase`).
	 */
	catalogoPorLado = $state<Partial<Record<DisciplinaPaso, CatalogoLado>>>({});

	/** Lados de la importación en los que una posición con ese nombre no existe. */
	ladosNuevosPosicion(nombre: string): DisciplinaPaso[] {
		const n = normalizarNombre(nombre);
		return this.pasosPreview.filter(
			(l) => !(this.catalogoPorLado[l]?.posiciones ?? []).some((p) => normalizarNombre(p.nombre) === n)
		);
	}

	/** Lados de la importación en los que una sumisión con ese nombre no existe. */
	ladosNuevosSumision(nombre: string): DisciplinaPaso[] {
		const n = normalizarNombre(nombre);
		return this.pasosPreview.filter(
			(l) => !(this.catalogoPorLado[l]?.sumisiones ?? []).some((s) => normalizarNombre(s.nombre) === n)
		);
	}

	/**
	 * Indicador de la revisión en una importación "Ambos" (vacío si no
	 * aplica): "Nueva en BJJ y Grappling" / "Nueva solo en Grappling · ya
	 * existe en BJJ".
	 */
	indicadorLados(kind: 'pos' | 'sum', nombre: string): string {
		if (this.pasosPreview.length < 2 || !nombre.trim()) return '';
		const nuevos = kind === 'pos' ? this.ladosNuevosPosicion(nombre) : this.ladosNuevosSumision(nombre);
		if (nuevos.length === 2) return 'Nueva en BJJ y Grappling';
		if (nuevos.length === 1) {
			const otro = nuevos[0] === 'bjj' ? 'grappling' : 'bjj';
			return `Nueva solo en ${LADO_LABEL[nuevos[0]]} · ya existe en ${LADO_LABEL[otro]}`;
		}
		return 'Ya existe en BJJ y Grappling';
	}
	textoClase = $state('');
	normalizacion = $state<NormalizacionResult | null>(null);
	textoParaPropuesta = $state('');
	resumenAI = $state<string | undefined>(undefined);
	loadingAI = $state(false);
	loadingLabel = $state('');
	errorAI = $state<string | null>(null);
	inserting = $state(false);
	errorInsert = $state<string | null>(null);
	textoRefinamiento = $state('');
	propuestaActual = $state<AIPropuesta | null>(null);
	validacionCorrecciones = $state<string[]>([]);
	validacionBannerAbierto = $state(true);
	/**
	 * T-2.it7: entrada del historial de esta importación. Se fija al primer
	 * "Analizar clase" o al abrir desde "Reintentar"; mientras no sea null,
	 * los siguientes análisis actualizan la misma entrada.
	 */
	importacionId = $state<string | null>(null);

	posicionesDraft = $state<PosicionItem[]>([]);
	sumisionesDraft = $state<SumisionItem[]>([]);
	tecnicasDraft = $state<TecnicaItem[]>([]);

	catalogoPosicionesBase = $state<{ id: string; nombre: string }[]>([]);
	catalogoSumisionesBase = $state<{ id: string; nombre: string }[]>([]);

	// T-4.it7: sin repetir nombres (en "Ambos", una posición que existe en
	// un lado y es nueva en el otro aparece una sola vez).
	todasPosicionesDisponibles = $derived(
		unirPorNombre(
			[
				...this.catalogoPosicionesBase.map((p) => p.nombre),
				...this.posicionesDraft
					.filter((p) => p.seleccionado && p.nombreEditado.trim())
					.map((p) => p.nombreEditado.trim())
			].map((nombre) => ({ nombre }))
		).map((x) => x.nombre)
	);

	todasSumisionesDisponibles = $derived(
		unirPorNombre(
			[
				...this.catalogoSumisionesBase.map((s) => s.nombre),
				...this.sumisionesDraft
					.filter((s) => s.seleccionado && s.nombreEditado.trim())
					.map((s) => s.nombreEditado.trim())
			].map((nombre) => ({ nombre }))
		).map((x) => x.nombre)
	);

	haySeleccionados = $derived(
		this.posicionesDraft.some((p) => p.seleccionado) ||
			this.sumisionesDraft.some((s) => s.seleccionado) ||
			this.tecnicasDraft.some((t) => t.seleccionado)
	);

	tieneDatos = $derived(
		this.textoClase.trim().length > 0 || this.paso !== 'input'
	);

	reset() {
		this.paso = 'input';
		this.disciplina = settings.disciplinaActiva;
		this.pasoPreview = 0;
		this.excluidosPorError = [];
		this.textoClase = '';
		this.normalizacion = null;
		this.textoParaPropuesta = '';
		this.resumenAI = undefined;
		this.loadingAI = false;
		this.loadingLabel = '';
		this.errorAI = null;
		this.inserting = false;
		this.errorInsert = null;
		this.posicionesDraft = [];
		this.sumisionesDraft = [];
		this.tecnicasDraft = [];
		this.catalogoPosicionesBase = [];
		this.catalogoSumisionesBase = [];
		this.catalogoPorLado = {};
		this.textoRefinamiento = '';
		this.propuestaActual = null;
		this.validacionCorrecciones = [];
		this.validacionBannerAbierto = true;
		// Resetear no borra nada del historial; solo suelta la referencia.
		this.importacionId = null;
	}

	/** Pasa a la vista previa en el mapa (nada se escribe). */
	entrarPreview() {
		this.errorInsert = null;
		this.pasoPreview = 0;
		this.excluidosPorError = [];
		this.paso = 'preview';
	}

	/** Cancelar / Retroceder: vuelve a "Revisar propuesta" con todo intacto. */
	salirPreview() {
		this.pasoPreview = 0;
		this.excluidosPorError = [];
		this.paso = 'review';
	}

	/**
	 * Avanza al siguiente paso. Si el paso actual tenía error ("Seguir con
	 * la siguiente disciplina"), sus elementos causantes no se crearán.
	 */
	siguientePreview(error?: { motivo: string; elementos: { clave: ClaveBorrador; nombre: string }[] }) {
		if (this.pasoPreview >= this.pasosPreview.length - 1) return;
		if (error) {
			const paso = this.pasoPreview;
			this.excluidosPorError = [
				...this.excluidosPorError,
				...error.elementos.map((e) => ({ ...e, motivo: error.motivo, paso }))
			];
		}
		this.pasoPreview += 1;
	}

	/** "← Atrás": vuelve al paso anterior y deshace sus exclusiones. */
	atrasPreview() {
		if (this.pasoPreview === 0) return;
		this.pasoPreview -= 1;
		const paso = this.pasoPreview;
		this.excluidosPorError = this.excluidosPorError.filter((e) => e.paso < paso);
	}

	/** T-2.it7 "Reintentar": borrador limpio con el texto guardado precargado. */
	prepararReintento(id: string, texto: string) {
		this.reset();
		this.importacionId = id;
		this.textoClase = texto;
	}

	/**
	 * Escritura en el historial protegida: un fallo al guardar historial
	 * nunca bloquea la importación (solo se loguea).
	 */
	private async guardarHistorial(id: string | null, patch: ImportacionPatch) {
		if (!id) return;
		try {
			await updateImportacion(id, patch);
		} catch (e) {
			console.warn('[historial] no se pudo actualizar la importación', id, e);
		}
	}

	private async guardarAceptado(id: string | null, creado: Aceptado, patch: ImportacionPatch) {
		if (!id) return;
		try {
			const previa = await getImportacion(id);
			const aceptado = mergeAceptado(parseAceptado(previa?.aceptado_json), creado);
			await updateImportacion(id, { ...patch, aceptado });
		} catch (e) {
			console.warn('[historial] no se pudo guardar lo aceptado', id, e);
		}
	}

	async normalizar() {
		if (!this.textoClase.trim() || this.loadingAI) return;
		this.loadingAI = true;
		this.loadingLabel = 'Interpretando descripción…';
		this.errorAI = null;

		// T-2.it7: registrar en el historial ANTES de esperar a la IA.
		// Primera vez → crear entrada; siguientes (Volver + analizar o
		// Reintentar) → el texto analizado sustituye al guardado.
		const textoAnalizado = this.textoClase;
		try {
			if (!this.importacionId) {
				const entrada = await createImportacion(textoAnalizado);
				this.importacionId = entrada.id;
			} else {
				const previa = await getImportacion(this.importacionId);
				const patch: ImportacionPatch = { texto: textoAnalizado, estado: 'sin_terminar', error: null };
				if (previa && previa.titulo_origen === 'texto') patch.titulo = tituloDeRespaldo(textoAnalizado);
				await updateImportacion(this.importacionId, patch);
			}
		} catch (e) {
			console.warn('[historial] no se pudo registrar la importación', e);
		}
		// Id capturado: si el usuario cierra durante la carga, la entrada
		// se sigue completando aunque `importacionId` se haya reseteado.
		const histId = this.importacionId;

		try {
			const resultado = await normalizarDescripcion(textoAnalizado);
			this.normalizacion = resultado;
			this.textoParaPropuesta = resultado.textoConMarcas.replace(/\*\*/g, '');
			this.paso = 'normalizado';
			await this.guardarHistorial(
				histId,
				resultado.titulo
					? { titulo: resultado.titulo, titulo_origen: 'ia', estado: 'sin_terminar', error: null }
					: { estado: 'sin_terminar', error: null }
			);
		} catch (err) {
			if (err instanceof Error && err.message === 'AI_TIMEOUT') {
				this.errorAI = 'La petición tardó demasiado y se canceló. Revisa tu conexión e inténtalo de nuevo.';
			} else {
				this.errorAI = err instanceof Error ? err.message : String(err);
			}
			await this.guardarHistorial(histId, { estado: 'fallo', error: this.errorAI });
		} finally {
			this.loadingAI = false;
			this.loadingLabel = '';
		}
	}

	/**
	 * Rellena los borradores a partir de una propuesta de la IA.
	 *
	 * T-4.it7: "existe" se decide por lado. Una posición/sumisión que ya
	 * existe en TODOS los lados de la importación no aparece como nueva; si
	 * existe solo en alguno (importación "Ambos"), aparece como nueva para
	 * el lado que falta aunque la IA la marque como existente. Además, en
	 * "Ambos", los extremos de técnicas que existen solo en un lado se
	 * añaden como nuevos para el otro (P2: "Ambos" completo en las dos).
	 */
	private aplicarPropuesta(propuesta: AIPropuesta, posBase: string[], sumBase: string[]) {
		const posNombres = new Set([
			...posBase.map((n) => n.toLowerCase()),
			...propuesta.posiciones.filter((p) => !p.esExistente).map((p) => p.nombre.toLowerCase())
		]);
		const sumNombres = new Set([
			...sumBase.map((n) => n.toLowerCase()),
			...propuesta.sumisiones.filter((s) => !s.esExistente).map((s) => s.nombre.toLowerCase())
		]);

		this.propuestaActual = propuesta;
		this.resumenAI = propuesta.resumen;

		const ambos = this.pasosPreview.length > 1;
		const lados = this.pasosPreview;
		const existenteEn = (kind: 'pos' | 'sum', nombre: string) => {
			const n = normalizarNombre(nombre);
			for (const l of lados) {
				const lista = kind === 'pos' ? this.catalogoPorLado[l]?.posiciones : this.catalogoPorLado[l]?.sumisiones;
				const e = (lista ?? []).find((x) => normalizarNombre(x.nombre) === n);
				if (e) return e;
			}
			return undefined;
		};

		const posiciones: PosicionItem[] = [];
		const vistasPos = new Set<string>();
		const addPos = (nombre: string, categoria: CategoriaPosicion, tipo: TipoRolPosicion | undefined) => {
			const n = normalizarNombre(nombre);
			if (!n || vistasPos.has(n)) return;
			if (this.ladosNuevosPosicion(nombre).length === 0) return;
			vistasPos.add(n);
			posiciones.push({
				nombre: capitalizeFirst(nombre),
				categoria,
				tipo,
				seleccionado: true,
				nombreEditado: capitalizeFirst(nombre),
				categoriaEditada: categoria,
				tipoEditado: tipo
			});
		};
		for (const p of propuesta.posiciones) {
			if (p.esExistente && !ambos) continue;
			const e = p.esExistente ? existenteEn('pos', p.nombre) : undefined;
			const ex = e as CatalogoLado['posiciones'][number] | undefined;
			addPos(ex?.nombre ?? p.nombre, ex?.categoria ?? p.categoria, ex ? ex.tipo : p.tipo);
		}

		const sumisiones: SumisionItem[] = [];
		const vistasSum = new Set<string>();
		const addSum = (nombre: string, notas: string | undefined) => {
			const n = normalizarNombre(nombre);
			if (!n || vistasSum.has(n)) return;
			if (this.ladosNuevosSumision(nombre).length === 0) return;
			vistasSum.add(n);
			sumisiones.push({
				nombre: capitalizeFirst(nombre),
				seleccionado: true,
				nombreEditado: capitalizeFirst(nombre),
				notas
			});
		};
		for (const sm of propuesta.sumisiones) {
			if (sm.esExistente && !ambos) continue;
			const ex = (sm.esExistente ? existenteEn('sum', sm.nombre) : undefined) as
				| CatalogoLado['sumisiones'][number]
				| undefined;
			addSum(ex?.nombre ?? sm.nombre, ex ? ex.notas : sm.notas);
		}

		// "Ambos": extremos de técnicas que existen solo en un lado.
		if (ambos) {
			for (const t of propuesta.tecnicas) {
				for (const nombre of [t.posicionOrigenNombre, t.tipo === 'sumision' ? undefined : t.posicionDestinoNombre]) {
					const ex = nombre ? (existenteEn('pos', nombre) as CatalogoLado['posiciones'][number] | undefined) : undefined;
					if (ex) addPos(ex.nombre, ex.categoria, ex.tipo);
				}
				if (t.tipo === 'sumision' && t.sumisionDestinoNombre) {
					const ex = existenteEn('sum', t.sumisionDestinoNombre) as CatalogoLado['sumisiones'][number] | undefined;
					if (ex) addSum(ex.nombre, ex.notas);
				}
			}
		}

		this.posicionesDraft = posiciones;
		this.sumisionesDraft = sumisiones;

		this.tecnicasDraft = propuesta.tecnicas.map((t) => {
			const origenOk = posNombres.has(t.posicionOrigenNombre.toLowerCase());
			const destinoOk =
				t.tipo === 'sumision'
					? !!(t.sumisionDestinoNombre && sumNombres.has(t.sumisionDestinoNombre.toLowerCase()))
					: !!(t.posicionDestinoNombre && posNombres.has(t.posicionDestinoNombre.toLowerCase()));
			const puedeCrearse = origenOk && destinoOk;
			return {
				...t,
				nombre: capitalizeFirst(t.nombre),
				seleccionado: puedeCrearse,
				puedeCrearse,
				detalles: t.detalles
			};
		});
	}

	async generarPropuesta() {
		if (!this.textoParaPropuesta.trim() || this.loadingAI) return;
		this.loadingAI = true;
		this.loadingLabel = 'Generando propuesta…';
		this.errorAI = null;
		const histId = this.importacionId;
		try {
			// Solo el catálogo de los lados de la importación: es lo que
			// recibe la IA (en "Ambos", BJJ ∪ Grappling sin repetir nombres)
			// y con lo que se compara "ya existe" (cada lado con el suyo).
			const d = this.disciplina;
			const [posiciones, tecnicas, sumisiones] = await Promise.all([
				listPosiciones().then((l) => filtrarPorDisciplinaImportacion(l, d)),
				listTecnicas().then((l) => filtrarPorDisciplinaImportacion(l, d)),
				listSumisiones().then((l) => filtrarPorDisciplinaImportacion(l, d))
			]);
			const porLado: Partial<Record<DisciplinaPaso, CatalogoLado>> = {};
			for (const lado of ladosDeImportacion(d)) {
				porLado[lado] = {
					posiciones: posiciones
						.filter((p) => p.disciplina === lado)
						.map((p) => ({ id: p.id, nombre: p.nombre, categoria: p.categoria, tipo: p.tipo })),
					sumisiones: sumisiones
						.filter((s) => s.disciplina === lado)
						.map((s) => ({ id: s.id, nombre: s.nombre, notas: s.notas }))
				};
			}
			this.catalogoPorLado = porLado;
			const catalogo: CatalogoSnapshot = {
				posiciones: unirPorNombre(posiciones).map((p) => ({ id: p.id, nombre: p.nombre })),
				tecnicas: tecnicas.map((t) => ({ nombre: t.nombre, posicion_origen_id: t.posicion_origen_id })),
				sumisiones: unirPorNombre(sumisiones).map((s) => ({ id: s.id, nombre: s.nombre }))
			};
			this.catalogoPosicionesBase = catalogo.posiciones;
			this.catalogoSumisionesBase = catalogo.sumisiones;

			let propuesta = await generarPropuestaDeClase(this.textoParaPropuesta, catalogo);

			this.loadingLabel = 'Verificando propuesta…';
			try {
				const validacion = await validarPropuesta(this.textoParaPropuesta, propuesta, catalogo);
				propuesta = validacion.propuesta;
				this.validacionCorrecciones = validacion.correcciones;
				this.validacionBannerAbierto = validacion.correcciones.length > 0;
			} catch {
				// Si falla la validación, seguimos con la propuesta original sin bloquear
			}

			this.aplicarPropuesta(
				propuesta,
				catalogo.posiciones.map((p) => p.nombre),
				catalogo.sumisiones.map((s) => s.nombre)
			);

			this.paso = 'review';
			// La propuesta no se guarda: solo el estado.
			await this.guardarHistorial(histId, { estado: 'sin_terminar', error: null });
		} catch (err) {
			this.errorAI = mensajeErrorIA(err);
			await this.guardarHistorial(histId, { estado: 'fallo', error: this.errorAI });
		} finally {
			this.loadingAI = false;
			this.loadingLabel = '';
		}
	}

	async refinar() {
		if (!this.textoRefinamiento.trim() || !this.propuestaActual || this.loadingAI) return;
		this.loadingAI = true;
		this.errorAI = null;
		const histId = this.importacionId;
		try {
			const catalogo: CatalogoSnapshot = {
				posiciones: this.catalogoPosicionesBase,
				tecnicas: [],
				sumisiones: this.catalogoSumisionesBase
			};
			const propuestaRefinada = await refinarPropuesta(
				this.textoClase,
				this.propuestaActual,
				this.textoRefinamiento,
				catalogo
			);
			this.textoRefinamiento = '';
			this.aplicarPropuesta(
				propuestaRefinada,
				this.catalogoPosicionesBase.map((p) => p.nombre),
				this.catalogoSumisionesBase.map((s) => s.nombre)
			);
			await this.guardarHistorial(histId, { estado: 'sin_terminar', error: null });
		} catch (err) {
			if (err instanceof Error && err.message === 'AI_TIMEOUT') {
				this.errorAI = 'La petición tardó demasiado y se canceló. Revisa tu conexión e inténtalo de nuevo.';
			} else if (err instanceof Error && err.message.includes('429')) {
				this.errorAI = 'Límite de uso alcanzado. Espera unos segundos e inténtalo de nuevo.';
			} else {
				this.errorAI = err instanceof Error ? err.message : String(err);
			}
			await this.guardarHistorial(histId, { estado: 'fallo', error: this.errorAI });
		} finally {
			this.loadingAI = false;
		}
	}

	addPosicionManual() {
		this.posicionesDraft.push({
			nombre: '',
			categoria: 'otro',
			tipo: undefined,
			seleccionado: true,
			nombreEditado: '',
			categoriaEditada: 'otro',
			tipoEditado: undefined,
			esManual: true
		});
	}

	addSumisionManual() {
		this.sumisionesDraft.push({ nombre: '', seleccionado: true, nombreEditado: '' });
	}

	addTecnicaManual() {
		this.tecnicasDraft.push({
			nombre: '',
			tipo: 'transicion',
			posicionOrigenNombre: '',
			posicionDestinoNombre: '',
			seleccionado: false,
			puedeCrearse: false,
			esManual: true
		});
	}

	/**
	 * Inserta en el catálogo lo marcado (posiciones → sumisiones →
	 * técnicas), excepto `excluidosPorError` (y las técnicas que dependen
	 * de ellos). `ok: false` = fallo general (queda en `errorInsert`).
	 * Registra lo creado en el historial. `ghostToReal` mapea el id
	 * fantasma de la vista previa al id real en el grafo, para conservar su
	 * posición.
	 *
	 * T-4.it7: un bucle por lado (BJJ y/o Grappling), cada uno con su mapa
	 * nombre → id. Lo que ya existe en un lado se enlaza (no se crea); lo
	 * que falta para una técnica y existe en el otro lado se crea como copia
	 * (P2) y se avisa en `creadosEnUnLado`. "Técnica idéntica", "no se creó"
	 * y las exclusiones por error se evalúan por lado.
	 */
	async confirmar(): Promise<ResultadoConfirmar> {
		if (this.inserting) return { ok: false };
		this.inserting = true;
		this.errorInsert = null;
		const histId = this.importacionId;
		const lados = this.pasosPreview;
		const ambos = lados.length > 1;
		// T-2.it7: lo realmente creado en este intento (ids + nombres).
		const creado: Aceptado = { posiciones: [], sumisiones: [], tecnicas: [] };
		const ghostToReal = new Map<string, string>();
		const noCreados: NoCreado[] = [];
		const creadosEnUnLado: NoCreado[] = [];
		try {
			const [todasPos, todasSum, todasTec] = await Promise.all([
				listPosiciones(),
				listSumisiones(),
				listTecnicas()
			]);
			// id → nombre real del catálogo, para el bloque "Aceptado".
			const nombrePorId = new Map<string, string>([
				...todasPos.map((p) => [p.id, p.nombre] as [string, string]),
				...todasSum.map((s) => [s.id, s.nombre] as [string, string])
			]);
			const norm = (n: string | undefined) => normalizarNombre(n ?? '');
			// Nombres desmarcados en el borrador: nunca se crean en ningún lado.
			const desmarcadas = new Set([
				...this.posicionesDraft.filter((p) => !p.seleccionado).map((p) => `p:${norm(p.nombreEditado)}`),
				...this.sumisionesDraft.filter((s) => !s.seleccionado).map((s) => `s:${norm(s.nombreEditado)}`)
			]);

			for (const [paso, lado] of lados.entries()) {
				const en = ambos ? ` en ${LADO_LABEL[lado]}` : '';
				const excluidos = new Map(
					this.excluidosPorError.filter((e) => e.paso === paso).map((e) => [e.clave as string, e])
				);
				for (const e of excluidos.values()) {
					noCreados.push({ nombre: e.nombre, motivo: ambos ? `${e.motivo} (${LADO_LABEL[lado]})` : e.motivo });
				}
				const posMap = new Map(todasPos.filter((p) => p.disciplina === lado).map((p) => [norm(p.nombre), p.id]));
				const sumMap = new Map(todasSum.filter((s) => s.disciplina === lado).map((s) => [norm(s.nombre), s.id]));
				const posOtro: Posicion[] = ambos ? todasPos.filter((p) => p.disciplina !== lado) : [];
				const sumOtro: SumisionTerminal[] = ambos ? todasSum.filter((s) => s.disciplina !== lado) : [];
				const tecKeys = new Set(
					todasTec
						.filter((t) => t.disciplina === lado)
						.map((t) => `${norm(t.nombre)}\u0000${t.posicion_origen_id}\u0000${norm(t.variante)}`)
				);
				// Nombres (normalizados) de posiciones/sumisiones excluidas en
				// este lado, para avisar de las técnicas que dependían de ellas.
				const posExcluidas = new Map<string, string>();
				const sumExcluidas = new Map<string, string>();

				// Fase A: posiciones marcadas (solo donde no existen)
				for (const [i, item] of this.posicionesDraft.entries()) {
					if (!item.seleccionado || !item.nombreEditado.trim()) continue;
					if (excluidos.has(`pos:${i}`)) {
						posExcluidas.set(norm(item.nombreEditado), item.nombreEditado);
						continue;
					}
					if (posMap.has(norm(item.nombreEditado))) {
						// Ya existe en este lado: se enlaza. Si existe en todos,
						// no se creó en ningún sitio → avisar una vez.
						if (paso === 0 && this.ladosNuevosPosicionEn(item.nombreEditado, todasPos).length === 0) {
							noCreados.push({ nombre: item.nombreEditado, motivo: 'ya existía' });
						}
						continue;
					}
					try {
						const created = await createPosicion({
							nombre: item.nombreEditado,
							categoria: item.categoriaEditada,
							tipo: item.tipoEditado,
							notas: '',
							posicion_complementaria_id: null,
							disciplina: lado
						});
						posMap.set(norm(item.nombreEditado), created.id);
						ghostToReal.set(ghostIdPosicion(item.nombreEditado, lado), `pos:${created.id}`);
						nombrePorId.set(created.id, created.nombre);
						creado.posiciones.push({ id: created.id, nombre: created.nombre, categoria: created.categoria });
						if (ambos && this.ladosNuevosPosicionEn(item.nombreEditado, todasPos).length === 1) {
							creadosEnUnLado.push({ nombre: created.nombre, motivo: `posición creada en ${LADO_LABEL[lado]}` });
						}
					} catch (e) {
						console.warn('Error creando posición', item.nombreEditado, e);
						noCreados.push({ nombre: item.nombreEditado, motivo: `no se pudo crear${en}` });
					}
				}

				// Fase B: sumisiones marcadas (solo donde no existen)
				for (const [i, item] of this.sumisionesDraft.entries()) {
					if (!item.seleccionado || !item.nombreEditado.trim()) continue;
					if (excluidos.has(`sum:${i}`)) {
						sumExcluidas.set(norm(item.nombreEditado), item.nombreEditado);
						continue;
					}
					if (sumMap.has(norm(item.nombreEditado))) {
						if (paso === 0 && this.ladosNuevosSumisionEn(item.nombreEditado, todasSum).length === 0) {
							noCreados.push({ nombre: item.nombreEditado, motivo: 'ya existía una sumisión con ese nombre' });
						}
						continue;
					}
					try {
						const created = await createSumision({
							nombre: item.nombreEditado,
							notas: item.notas ?? '',
							disciplina: lado
						});
						sumMap.set(norm(item.nombreEditado), created.id);
						ghostToReal.set(ghostIdSumision(item.nombreEditado, lado), `sum:${created.id}`);
						nombrePorId.set(created.id, created.nombre);
						creado.sumisiones.push({ id: created.id, nombre: created.nombre });
						if (ambos && this.ladosNuevosSumisionEn(item.nombreEditado, todasSum).length === 1) {
							creadosEnUnLado.push({ nombre: created.nombre, motivo: `sumisión creada en ${LADO_LABEL[lado]}` });
						}
					} catch (e) {
						console.warn('Error creando sumisión', item.nombreEditado, e);
						noCreados.push({ nombre: item.nombreEditado, motivo: `no se pudo crear${en}` });
					}
				}

				// P2: extremo de técnica que solo existe en el otro lado → copia.
				const completarPos = async (nombre: string): Promise<string | undefined> => {
					if (!ambos || desmarcadas.has(`p:${norm(nombre)}`) || posExcluidas.has(norm(nombre))) return undefined;
					const otro = posOtro
						.filter((p) => norm(p.nombre) === norm(nombre))
						.sort((a, b) => (a.created_at < b.created_at ? -1 : 1))[0];
					if (!otro) return undefined;
					const created = await createPosicion({
						nombre: otro.nombre,
						categoria: otro.categoria,
						tipo: otro.tipo,
						notas: otro.notas,
						posicion_complementaria_id: null,
						disciplina: lado
					});
					const tags = await getTagsForPosicion(otro.id);
					if (tags.length > 0) await setTagsForPosicion(created.id, tags.map((t) => t.id));
					posMap.set(norm(otro.nombre), created.id);
					ghostToReal.set(ghostIdPosicion(otro.nombre, lado), `pos:${created.id}`);
					nombrePorId.set(created.id, created.nombre);
					creado.posiciones.push({ id: created.id, nombre: created.nombre, categoria: created.categoria });
					creadosEnUnLado.push({ nombre: created.nombre, motivo: `posición creada en ${LADO_LABEL[lado]}` });
					return created.id;
				};
				const completarSum = async (nombre: string): Promise<string | undefined> => {
					if (!ambos || desmarcadas.has(`s:${norm(nombre)}`) || sumExcluidas.has(norm(nombre))) return undefined;
					const otro = sumOtro
						.filter((s) => norm(s.nombre) === norm(nombre))
						.sort((a, b) => (a.created_at < b.created_at ? -1 : 1))[0];
					if (!otro) return undefined;
					const created = await createSumision({ nombre: otro.nombre, notas: otro.notas, disciplina: lado });
					sumMap.set(norm(otro.nombre), created.id);
					ghostToReal.set(ghostIdSumision(otro.nombre, lado), `sum:${created.id}`);
					nombrePorId.set(created.id, created.nombre);
					creado.sumisiones.push({ id: created.id, nombre: created.nombre });
					creadosEnUnLado.push({ nombre: created.nombre, motivo: `sumisión creada en ${LADO_LABEL[lado]}` });
					return created.id;
				};

				// Fase C: técnicas marcadas
				const dependeDeExcluido = (item: TecnicaItem): string | undefined => {
					const dest =
						item.tipo === 'sumision'
							? sumExcluidas.get(norm(item.sumisionDestinoNombre))
							: posExcluidas.get(norm(item.posicionDestinoNombre));
					return posExcluidas.get(norm(item.posicionOrigenNombre)) ?? dest;
				};
				for (const [i, item] of this.tecnicasDraft.entries()) {
					if (!item.seleccionado || excluidos.has(`tec:${i}`)) continue;
					try {
						const origenId =
							posMap.get(norm(item.posicionOrigenNombre)) ??
							(await completarPos(item.posicionOrigenNombre));
						const destinoNombre =
							item.tipo === 'sumision' ? item.sumisionDestinoNombre : item.posicionDestinoNombre;
						let destId: string | undefined;
						if (destinoNombre) {
							destId =
								item.tipo === 'sumision'
									? (sumMap.get(norm(destinoNombre)) ?? (await completarSum(destinoNombre)))
									: (posMap.get(norm(destinoNombre)) ?? (await completarPos(destinoNombre)));
						}
						if (!origenId || !destId) {
							const excl = dependeDeExcluido(item);
							noCreados.push({
								nombre: item.nombre,
								motivo: excl
									? `depende de «${excl}», que no se creó${en}`
									: `su origen o destino ya no está disponible${en}`
							});
							continue;
						}
						const clave = `${norm(item.nombre)}\u0000${origenId}\u0000${norm(item.variante)}`;
						if (tecKeys.has(clave)) {
							noCreados.push({ nombre: item.nombre, motivo: `ya existía${en}` });
							continue;
						}
						const tec = await createTecnica({
							nombre: item.nombre,
							variante: item.variante,
							posicion_origen_id: origenId,
							posicion_destino_id: item.tipo === 'sumision' ? undefined : destId,
							sumision_destino_id: item.tipo === 'sumision' ? destId : undefined,
							tipo: item.tipo,
							estado: 'probando',
							detalles: item.detalles ?? '',
							errores_comunes: '',
							disciplina: lado
						});
						tecKeys.add(clave);
						creado.tecnicas.push({
							id: tec.id,
							nombre: tec.nombre,
							tipo: tec.tipo,
							origen: nombrePorId.get(origenId) ?? item.posicionOrigenNombre,
							destino: nombrePorId.get(destId) ?? destinoNombre ?? ''
						});
					} catch (e) {
						console.warn('Error creando técnica', item.nombre, e);
						noCreados.push({ nombre: item.nombre, motivo: `no se pudo crear${en}` });
					}
				}
			}

			// T-2.it7: lo aceptado se SUMA a lo que la entrada ya tuviera
			// (reintento de una importación ya "Importada").
			await this.guardarAceptado(histId, creado, { estado: 'importada', error: null });
			return { ok: true, ghostToReal, noCreados, creadosEnUnLado };
		} catch (err) {
			this.errorInsert = err instanceof Error ? err.message : String(err);
			// Lo que sí llegó a crearse no se pierde del historial.
			await this.guardarAceptado(histId, creado, { estado: 'fallo', error: this.errorInsert });
			return { ok: false };
		} finally {
			this.inserting = false;
		}
	}

	/** Como `ladosNuevosPosicion`, pero contra un catálogo fresco (al confirmar). */
	private ladosNuevosPosicionEn(nombre: string, todas: Posicion[]): DisciplinaPaso[] {
		const n = normalizarNombre(nombre);
		return this.pasosPreview.filter(
			(l) => !todas.some((p) => p.disciplina === l && normalizarNombre(p.nombre) === n)
		);
	}

	private ladosNuevosSumisionEn(nombre: string, todas: SumisionTerminal[]): DisciplinaPaso[] {
		const n = normalizarNombre(nombre);
		return this.pasosPreview.filter(
			(l) => !todas.some((s) => s.disciplina === l && normalizarNombre(s.nombre) === n)
		);
	}
}
