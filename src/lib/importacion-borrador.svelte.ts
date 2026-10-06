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
import { listTecnicas, createTecnica } from '$lib/tecnicas';
import { listSumisiones, createSumision } from '$lib/sumisiones';
import {
	generarPropuestaDeClase,
	refinarPropuesta,
	normalizarDescripcion,
	validarPropuesta
} from '$lib/ai';
import type { CatalogoSnapshot, AIPropuesta, NormalizacionResult } from '$lib/ai';
import type { CategoriaPosicion, Disciplina, TipoRolPosicion, TipoTecnica } from '$lib/types';
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
	| { ok: true; ghostToReal: Map<string, string>; noCreados: NoCreado[] }
	| { ok: false };

/**
 * Disciplinas del catálogo con las que se compara una importación (y que
 * se envían a la IA): BJJ o Grappling → esa y "Ambos"; "Ambos" → solo
 * "Ambos". Lo que no esté ahí se crea nuevo con la disciplina de la
 * importación, aunque exista con el mismo nombre en la otra.
 */
export function disciplinasDeCatalogo(d: Disciplina): Disciplina[] {
	if (d === 'ambos') return ['ambos'];
	return [d, 'ambos'];
}

/** Filtra una lista del catálogo por la disciplina de la importación. */
export function filtrarPorDisciplinaImportacion<T extends { disciplina: Disciplina }>(
	items: T[],
	d: Disciplina
): T[] {
	const permitidas = new Set(disciplinasDeCatalogo(d));
	return items.filter((it) => permitidas.has(it.disciplina));
}

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
		return this.disciplina === 'ambos' ? ['bjj', 'grappling'] : [this.disciplina];
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

	todasPosicionesDisponibles = $derived([
		...this.catalogoPosicionesBase.map((p) => p.nombre),
		...this.posicionesDraft
			.filter((p) => p.seleccionado && p.nombreEditado.trim())
			.map((p) => p.nombreEditado.trim())
	]);

	todasSumisionesDisponibles = $derived([
		...this.catalogoSumisionesBase.map((s) => s.nombre),
		...this.sumisionesDraft
			.filter((s) => s.seleccionado && s.nombreEditado.trim())
			.map((s) => s.nombreEditado.trim())
	]);

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

	/** Rellena los borradores a partir de una propuesta de la IA. */
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

		this.posicionesDraft = propuesta.posiciones
			.filter((p) => !p.esExistente)
			.map((p) => ({
				nombre: capitalizeFirst(p.nombre),
				categoria: p.categoria,
				tipo: p.tipo,
				seleccionado: true,
				nombreEditado: capitalizeFirst(p.nombre),
				categoriaEditada: p.categoria,
				tipoEditado: p.tipo
			}));

		this.sumisionesDraft = propuesta.sumisiones
			.filter((s) => !s.esExistente)
			.map((s) => ({
				nombre: capitalizeFirst(s.nombre),
				seleccionado: true,
				nombreEditado: capitalizeFirst(s.nombre),
				notas: s.notas
			}));

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
			// Solo el catálogo de la disciplina de la importación: es lo que
			// recibe la IA y con lo que se compara "ya existe".
			const d = this.disciplina;
			const [posiciones, tecnicas, sumisiones] = await Promise.all([
				listPosiciones().then((l) => filtrarPorDisciplinaImportacion(l, d)),
				listTecnicas().then((l) => filtrarPorDisciplinaImportacion(l, d)),
				listSumisiones().then((l) => filtrarPorDisciplinaImportacion(l, d))
			]);
			const catalogo: CatalogoSnapshot = {
				posiciones: posiciones.map((p) => ({ id: p.id, nombre: p.nombre })),
				tecnicas: tecnicas.map((t) => ({ nombre: t.nombre, posicion_origen_id: t.posicion_origen_id })),
				sumisiones: sumisiones.map((s) => ({ id: s.id, nombre: s.nombre }))
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
	 * técnicas) con la disciplina de la importación, excepto
	 * `excluidosPorError` (y las técnicas que dependen de ellos).
	 * `ok: false` = fallo general (queda en `errorInsert`). Registra lo
	 * creado en el historial. `ghostToReal` mapea el id fantasma de la
	 * vista previa al id real en el grafo, para conservar su posición.
	 */
	async confirmar(): Promise<ResultadoConfirmar> {
		if (this.inserting) return { ok: false };
		this.inserting = true;
		this.errorInsert = null;
		const histId = this.importacionId;
		const disciplina = this.disciplina;
		// T-2.it7: lo realmente creado en este intento (ids + nombres).
		const creado: Aceptado = { posiciones: [], sumisiones: [], tecnicas: [] };
		const ghostToReal = new Map<string, string>();
		const excluidos = new Map(this.excluidosPorError.map((e) => [e.clave as string, e]));
		const noCreados: NoCreado[] = this.excluidosPorError.map((e) => ({
			nombre: e.nombre,
			motivo: e.motivo
		}));
		// Nombres (normalizados) de posiciones/sumisiones excluidas, para
		// avisar de las técnicas que dependían de ellas.
		const posExcluidas = new Map<string, string>();
		const sumExcluidas = new Map<string, string>();
		try {
			// Catálogo fresco de la disciplina de la importación para
			// resolver nombres → ids (misma regla que la comparación).
			const [posicionesExistentes, sumisionesExistentes] = await Promise.all([
				listPosiciones().then((l) => filtrarPorDisciplinaImportacion(l, disciplina)),
				listSumisiones().then((l) => filtrarPorDisciplinaImportacion(l, disciplina))
			]);

			const posNormMap = new Map(
				posicionesExistentes.map((p) => [p.nombre.toLowerCase().trim(), p.id])
			);
			const sumNormMap = new Map(
				sumisionesExistentes.map((s) => [s.nombre.toLowerCase().trim(), s.id])
			);
			// id → nombre real del catálogo, para el bloque "Aceptado".
			const nombrePorId = new Map<string, string>([
				...posicionesExistentes.map((p) => [p.id, p.nombre] as [string, string]),
				...sumisionesExistentes.map((s) => [s.id, s.nombre] as [string, string])
			]);

			// Fase A: posiciones marcadas
			for (const [i, item] of this.posicionesDraft.entries()) {
				if (!item.seleccionado) continue;
				if (excluidos.has(`pos:${i}`)) {
					posExcluidas.set(normalizarNombre(item.nombreEditado), item.nombreEditado);
					continue;
				}
				try {
					const created = await createPosicion({
						nombre: item.nombreEditado,
						categoria: item.categoriaEditada,
						tipo: item.tipoEditado,
						notas: '',
						posicion_complementaria_id: null,
						disciplina
					});
					posNormMap.set(item.nombreEditado.toLowerCase().trim(), created.id);
					ghostToReal.set(ghostIdPosicion(item.nombreEditado), `pos:${created.id}`);
					nombrePorId.set(created.id, created.nombre);
					creado.posiciones.push({ id: created.id, nombre: created.nombre, categoria: created.categoria });
				} catch (e) {
					console.warn('Error creando posición', item.nombreEditado, e);
				}
			}

			// Fase B: sumisiones marcadas
			for (const [i, item] of this.sumisionesDraft.entries()) {
				if (!item.seleccionado) continue;
				if (excluidos.has(`sum:${i}`)) {
					sumExcluidas.set(normalizarNombre(item.nombreEditado), item.nombreEditado);
					continue;
				}
				try {
					const created = await createSumision({
						nombre: item.nombreEditado,
						notas: item.notas ?? '',
						disciplina
					});
					sumNormMap.set(item.nombreEditado.toLowerCase().trim(), created.id);
					ghostToReal.set(ghostIdSumision(item.nombreEditado), `sum:${created.id}`);
					nombrePorId.set(created.id, created.nombre);
					creado.sumisiones.push({ id: created.id, nombre: created.nombre });
				} catch (e) {
					console.warn('Error creando sumisión', item.nombreEditado, e);
				}
			}

			// Fase C: técnicas marcadas
			const dependeDeExcluido = (item: TecnicaItem): string | undefined => {
				const dest =
					item.tipo === 'sumision'
						? sumExcluidas.get(normalizarNombre(item.sumisionDestinoNombre ?? ''))
						: posExcluidas.get(normalizarNombre(item.posicionDestinoNombre ?? ''));
				return posExcluidas.get(normalizarNombre(item.posicionOrigenNombre)) ?? dest;
			};
			for (const [i, item] of this.tecnicasDraft.entries()) {
				if (!item.seleccionado || excluidos.has(`tec:${i}`)) continue;
				const origenId = posNormMap.get(item.posicionOrigenNombre.toLowerCase().trim());
				const excluidoDelQueDepende = dependeDeExcluido(item);
				if (excluidoDelQueDepende && !origenId) {
					noCreados.push({
						nombre: item.nombre,
						motivo: `depende de «${excluidoDelQueDepende}», que no se creó`
					});
					continue;
				}
				if (!origenId) {
					console.warn('Origen no encontrado, saltando técnica:', item.nombre);
					continue;
				}
				try {
					if (item.tipo === 'sumision') {
						const sumId = item.sumisionDestinoNombre
							? sumNormMap.get(item.sumisionDestinoNombre.toLowerCase().trim())
							: undefined;
						if (!sumId) {
							if (excluidoDelQueDepende) {
								noCreados.push({
									nombre: item.nombre,
									motivo: `depende de «${excluidoDelQueDepende}», que no se creó`
								});
							}
							console.warn('Sumisión destino no encontrada, saltando:', item.nombre);
							continue;
						}
						const tec = await createTecnica({
							nombre: item.nombre,
							variante: item.variante,
							posicion_origen_id: origenId,
							posicion_destino_id: undefined,
							sumision_destino_id: sumId,
							tipo: item.tipo,
							estado: 'probando',
							detalles: item.detalles ?? '',
							errores_comunes: '',
							disciplina
						});
						creado.tecnicas.push({
							id: tec.id,
							nombre: tec.nombre,
							tipo: tec.tipo,
							origen: nombrePorId.get(origenId) ?? item.posicionOrigenNombre,
							destino: nombrePorId.get(sumId) ?? item.sumisionDestinoNombre ?? ''
						});
					} else {
						const destId = item.posicionDestinoNombre
							? posNormMap.get(item.posicionDestinoNombre.toLowerCase().trim())
							: undefined;
						if (!destId) {
							if (excluidoDelQueDepende) {
								noCreados.push({
									nombre: item.nombre,
									motivo: `depende de «${excluidoDelQueDepende}», que no se creó`
								});
							}
							console.warn('Destino no encontrado, saltando técnica:', item.nombre);
							continue;
						}
						const tec = await createTecnica({
							nombre: item.nombre,
							variante: item.variante,
							posicion_origen_id: origenId,
							posicion_destino_id: destId,
							sumision_destino_id: undefined,
							tipo: item.tipo,
							estado: 'probando',
							detalles: item.detalles ?? '',
							errores_comunes: '',
							disciplina
						});
						creado.tecnicas.push({
							id: tec.id,
							nombre: tec.nombre,
							tipo: tec.tipo,
							origen: nombrePorId.get(origenId) ?? item.posicionOrigenNombre,
							destino: nombrePorId.get(destId) ?? item.posicionDestinoNombre ?? ''
						});
					}
				} catch (e) {
					console.warn('Error creando técnica', item.nombre, e);
				}
			}

			// T-2.it7: lo aceptado se SUMA a lo que la entrada ya tuviera
			// (reintento de una importación ya "Importada").
			await this.guardarAceptado(histId, creado, { estado: 'importada', error: null });
			return { ok: true, ghostToReal, noCreados };
		} catch (err) {
			this.errorInsert = err instanceof Error ? err.message : String(err);
			// Lo que sí llegó a crearse no se pierde del historial.
			await this.guardarAceptado(histId, creado, { estado: 'fallo', error: this.errorInsert });
			return { ok: false };
		} finally {
			this.inserting = false;
		}
	}
}
