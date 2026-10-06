/**
 * Export e Import de toda la BD a/desde JSON.
 * Cliente only — depende de `$lib/db`, que requiere browser.
 *
 * Modelo de uso (REQUISITOS §10.3):
 * - Sin merge selectivo. Import = wipe + replace.
 * - `schema_version` es la versión del FORMATO DEL FICHERO, no la de la
 *   BD (que va por `LATEST_SCHEMA_VERSION` en `db/schema.ts`). Solo sube
 *   cuando cambia lo que contiene el fichero; alinearla con la BD
 *   obligaría a subirla en cada migración aunque el fichero no cambie.
 *   Historial:
 *     6 → catálogo + entrenos + grafo + ajustes (sin etiquetas).
 *     7 → (T-2.it7) + `tags`, `posicion_tags`, `importaciones`; el
 *         import restaura además la `disciplina` del catálogo.
 *     8 → (T-4.it7) `disciplina` de sesiones y rolls; ningún elemento del
 *         catálogo "ambos"; tipo de sesión `clase` | `open_mat`.
 * - Se aceptan `ACCEPTED_VERSIONS` (6, 7, 8): a un fichero v6 le faltan las
 *   tablas nuevas, que se tratan como vacías; v6 y v7 se convierten con
 *   `separarAmbos` (las mismas reglas que la migración v12 de la BD).
 *   Cualquier otra → error claro.
 * - Para sync entre dispositivos hasta que llegue mecanismo automático.
 */

import { init, query, run } from '$lib/db';
import { separarAmbos, verificarSeparacion, type DatosSeparables } from '$lib/separar-ambos';
import type { ImportacionRow } from '$lib/importaciones';
import type {
	Companero,
	Posicion,
	Roll,
	Sesion,
	SumisionTerminal,
	Tecnica,
	TecnicaContra,
	Tag
} from '$lib/types';

/** Versión del formato de fichero de copia (no la de la BD). */
export const CURRENT_SCHEMA_VERSION = 8;
/** Formatos aceptados al importar (6: sin etiquetas ni historial; 6–7: con "Ambos"). */
export const ACCEPTED_VERSIONS = [6, 7, 8] as const;

// T-3.it2: filas de las tablas pivot `roll_tecnica` y `roll_posicion`.
// `resultado` es 'fue_bien' | 'fallo' (CHECK en SQL). La PK compuesta
// incluye `resultado` para permitir que una misma técnica/posición
// aparezca en ambos sets de un roll.
export type RollTecnicaRow = {
	roll_id: string;
	tecnica_id: string;
	resultado: 'fue_bien' | 'fallo';
};

export type RollPosicionRow = {
	roll_id: string;
	posicion_id: string;
	resultado: 'fue_bien' | 'fallo';
};

// T-9.it3: layout persistido del grafo del mapa técnico. `kind` distingue
// si `entidad_id` apunta a `posiciones` o a `sumisiones_terminales`
// (CHECK en SQL). Ver migración v5 en `db/schema.ts`.
export type GrafoLayoutDbRow = {
	entidad_id: string;
	kind: 'posicion' | 'sumision';
	x: number;
	y: number;
};

// T-1.it6: filas de la tabla key/value `app_settings`. El value es
// siempre TEXT en SQL; la interpretación (bool, número, JSON…) vive en
// la capa TS (`SettingsState`).
export type AppSettingRow = {
	key: string;
	value: string;
};

// T-2.it7: pivot posición ↔ etiqueta (schema v7 de la BD).
export type PosicionTagRow = {
	posicion_id: string;
	tag_id: string;
};

export type ExportPayload = {
	schema_version: number;
	exported_at: string;
	companeros: Companero[];
	sesiones: Sesion[];
	rolls: Roll[];
	posiciones: Posicion[];
	sumisiones_terminales: SumisionTerminal[];
	tecnicas: Tecnica[];
	tecnica_contras: TecnicaContra[];
	roll_posicion: RollPosicionRow[];
	roll_tecnica: RollTecnicaRow[];
	grafo_layout: GrafoLayoutDbRow[];
	app_settings: AppSettingRow[];
	tags: Tag[];
	posicion_tags: PosicionTagRow[];
	importaciones: ImportacionRow[];
};

export async function exportAll(): Promise<ExportPayload> {
	await init();
	const [
		companeros,
		sesiones,
		rolls,
		posiciones,
		sumisionesTerminales,
		tecnicas,
		tecnicaContras,
		rollPosicion,
		rollTecnica,
		grafoLayout,
		appSettings,
		tags,
		posicionTags,
		importaciones
	] = await Promise.all([
		query<Companero>('SELECT * FROM companeros ORDER BY created_at'),
		query<Sesion>('SELECT * FROM sesiones ORDER BY created_at'),
		query<Roll>('SELECT * FROM rolls ORDER BY created_at'),
		query<Posicion>('SELECT * FROM posiciones ORDER BY created_at'),
		query<SumisionTerminal>('SELECT * FROM sumisiones_terminales ORDER BY created_at'),
		query<Tecnica>('SELECT * FROM tecnicas ORDER BY created_at'),
		query<TecnicaContra>('SELECT * FROM tecnica_contras ORDER BY created_at'),
		query<RollPosicionRow>(
			'SELECT roll_id, posicion_id, resultado FROM roll_posicion ORDER BY roll_id, posicion_id, resultado'
		),
		query<RollTecnicaRow>(
			'SELECT roll_id, tecnica_id, resultado FROM roll_tecnica ORDER BY roll_id, tecnica_id, resultado'
		),
		query<GrafoLayoutDbRow>(
			'SELECT entidad_id, kind, x, y FROM grafo_layout ORDER BY entidad_id, kind'
		),
		query<AppSettingRow>('SELECT key, value FROM app_settings ORDER BY key'),
		query<Tag>('SELECT id, nombre, color, created_at FROM tags ORDER BY created_at'),
		query<PosicionTagRow>(
			'SELECT posicion_id, tag_id FROM posicion_tags ORDER BY posicion_id, tag_id'
		),
		query<ImportacionRow>('SELECT * FROM importaciones ORDER BY created_at')
	]);
	return {
		schema_version: CURRENT_SCHEMA_VERSION,
		exported_at: new Date().toISOString(),
		companeros,
		sesiones,
		rolls,
		posiciones,
		sumisiones_terminales: sumisionesTerminales,
		tecnicas,
		tecnica_contras: tecnicaContras,
		roll_posicion: rollPosicion,
		roll_tecnica: rollTecnica,
		grafo_layout: grafoLayout,
		app_settings: appSettings,
		tags,
		posicion_tags: posicionTags,
		importaciones
	};
}

export async function getSchemaVersion(): Promise<number> {
	await init();
	const rows = await query<{ value: string }>(
		"SELECT value FROM schema_meta WHERE key = 'version'"
	);
	return Number(rows[0]?.value ?? 0);
}

function assertExportShape(payload: unknown): asserts payload is ExportPayload {
	if (!payload || typeof payload !== 'object') {
		throw new Error('El fichero no parece un export válido (no es un objeto JSON).');
	}
	const p = payload as Record<string, unknown>;
	if (typeof p.schema_version !== 'number') {
		throw new Error('Falta el campo schema_version en el JSON.');
	}
	const requiredArrays = [
		'companeros',
		'sesiones',
		'rolls',
		'posiciones',
		'sumisiones_terminales',
		'tecnicas',
		'tecnica_contras',
		'roll_posicion',
		'roll_tecnica',
		'grafo_layout',
		'app_settings'
	];
	// Tablas que exigen los formatos v7 y v8. En ficheros v6 no existen y
	// se tratan como vacías (ver `normalizarPayload`).
	if (p.schema_version >= 7) {
		requiredArrays.push('tags', 'posicion_tags', 'importaciones');
	}
	for (const key of requiredArrays) {
		if (!Array.isArray(p[key])) {
			throw new Error(`Falta la tabla "${key}" en el JSON (o no es un array).`);
		}
	}
}

/** Fichero v6 → forma v7/v8: tablas ausentes como arrays vacíos. */
function normalizarPayload(payload: ExportPayload): ExportPayload {
	return {
		...payload,
		tags: Array.isArray(payload.tags) ? payload.tags : [],
		posicion_tags: Array.isArray(payload.posicion_tags) ? payload.posicion_tags : [],
		importaciones: Array.isArray(payload.importaciones) ? payload.importaciones : []
	};
}

/**
 * Separa los "Ambos" del catálogo y, en ficheros anteriores a v8, deduce la
 * disciplina de sesiones y rolls (T-4.it7). Mismo módulo que la migración
 * v12: restaurar un v7 da lo mismo que haber migrado esa BD. En v8 se llama
 * igualmente (sin inferir entrenos): un v8 no debería traer "Ambos", pero si
 * lo trae (editado a mano) se separa en vez de romper el modelo.
 */
function convertirPayload(payload: ExportPayload): ExportPayload {
	const { datos, resumen } = separarAmbos(
		{
			posiciones: payload.posiciones,
			sumisiones_terminales: payload.sumisiones_terminales,
			tecnicas: payload.tecnicas,
			tecnica_contras: payload.tecnica_contras,
			posicion_tags: payload.posicion_tags,
			grafo_layout: payload.grafo_layout,
			sesiones: payload.sesiones,
			rolls: payload.rolls,
			roll_posicion: payload.roll_posicion,
			roll_tecnica: payload.roll_tecnica,
			tagIds: payload.tags.map((t) => t.id)
		} as unknown as DatosSeparables,
		{
			nuevoId: () => crypto.randomUUID(),
			inferirEntrenos: payload.schema_version < 8
		}
	);
	verificarSeparacion(datos, resumen);
	if (
		resumen.creadasParaCompletar.length > 0 ||
		resumen.renombradas.length > 0 ||
		resumen.fusionadas.length > 0
	) {
		console.info('[import] "Ambos" separado en copias por disciplina', resumen);
	}
	return { ...payload, ...(datos as unknown as Partial<ExportPayload>) };
}

/**
 * Reemplaza TODA la BD con el contenido del payload.
 * Borra todas las tablas en orden de FK y luego inserta lo nuevo.
 * Acepta las versiones de `ACCEPTED_VERSIONS`; cualquier otra → throws
 * (sin tocar la BD).
 */
export async function importAll(payload: unknown): Promise<{
	companeros: number;
	sesiones: number;
	rolls: number;
	posiciones: number;
	sumisiones_terminales: number;
	tecnicas: number;
	tecnica_contras: number;
	roll_posicion: number;
	roll_tecnica: number;
	grafo_layout: number;
	app_settings: number;
	tags: number;
	posicion_tags: number;
	importaciones: number;
}> {
	if (
		payload &&
		typeof payload === 'object' &&
		typeof (payload as Record<string, unknown>).schema_version === 'number'
	) {
		const v = (payload as Record<string, unknown>).schema_version as number;
		if (!(ACCEPTED_VERSIONS as readonly number[]).includes(v)) {
			throw new Error(
				`Versión incompatible. El fichero usa schema_version=${v}, esta app acepta ${ACCEPTED_VERSIONS.join(', ')}.`
			);
		}
	}
	assertExportShape(payload);
	const datos = convertirPayload(normalizarPayload(payload));

	await init();

	// Desactivamos FK durante el bulk import. Patrón estándar (pg_dump,
	// sqlite .dump): permite wipe+insert sin importar el orden y tolera
	// referencias huérfanas heredadas de exports previos. Tras el import,
	// `PRAGMA foreign_key_check` audita la integridad y reporta huérfanos
	// sin abortar — la app sigue funcional aunque haya datos inconsistentes.
	await run('PRAGMA foreign_keys = OFF');

	try {
		await run('BEGIN');
		try {
			// Wipe en orden FK (hijos antes que padres) — no estrictamente
			// necesario con FK OFF, pero mantenemos el orden por claridad.
			// `grafo_layout` y `app_settings` no tienen FK; orden
			// indiferente, los borramos con los demás "hijos" del catálogo.
			await run('DELETE FROM importaciones');
			await run('DELETE FROM posicion_tags');
			await run('DELETE FROM tags');
			await run('DELETE FROM app_settings');
			await run('DELETE FROM grafo_layout');
			await run('DELETE FROM roll_tecnica');
			await run('DELETE FROM roll_posicion');
			await run('DELETE FROM tecnica_contras');
			await run('DELETE FROM tecnicas');
			await run('DELETE FROM rolls');
			await run('DELETE FROM sesiones');
			await run('DELETE FROM sumisiones_terminales');
			await run('DELETE FROM posiciones');
			await run('DELETE FROM companeros');

			await insertAll(datos);

			await run('COMMIT');
		} catch (e) {
			await run('ROLLBACK');
			throw e;
		}
	} finally {
		await run('PRAGMA foreign_keys = ON');
	}

	// Auditoría post-import: detecta filas huérfanas heredadas del JSON.
	// No aborta — solo log.
	const violations = await query<{ table: string; rowid: number; parent: string; fkid: number }>(
		'PRAGMA foreign_key_check'
	);
	if (violations.length > 0) {
		console.warn(
			`Import completado con ${violations.length} fila(s) con referencias huérfanas heredadas del JSON. Detalle:`,
			violations
		);
	}

	return {
		companeros: datos.companeros.length,
		sesiones: datos.sesiones.length,
		rolls: datos.rolls.length,
		posiciones: datos.posiciones.length,
		sumisiones_terminales: datos.sumisiones_terminales.length,
		tecnicas: datos.tecnicas.length,
		tecnica_contras: datos.tecnica_contras.length,
		roll_posicion: datos.roll_posicion.length,
		roll_tecnica: datos.roll_tecnica.length,
		grafo_layout: datos.grafo_layout.length,
		app_settings: datos.app_settings.length,
		tags: datos.tags.length,
		posicion_tags: datos.posicion_tags.length,
		importaciones: datos.importaciones.length
	};
}

async function insertAll(payload: ExportPayload): Promise<void> {
	// Orden parent-first (no estrictamente necesario con FK OFF, pero
	// mantiene el INSERT legible y resiliente si en el futuro reactivamos
	// las FK durante el import).
	for (const c of payload.companeros) {
		await run(
			`INSERT INTO companeros (id, nombre, cinturon, peso_relativo, notas, created_at, updated_at)
			 VALUES (?, ?, ?, ?, ?, ?, ?)`,
			[
				c.id,
				c.nombre,
				c.cinturon ?? null,
				c.peso_relativo ?? null,
				c.notas ?? null,
				c.created_at,
				c.updated_at
			]
		);
	}

	for (const p of payload.posiciones) {
		await run(
			`INSERT INTO posiciones (id, nombre, categoria, tipo, notas, posicion_complementaria_id, disciplina, created_at, updated_at)
			 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
			[
				p.id,
				p.nombre,
				p.categoria,
				p.tipo ?? null,
				p.notas,
				p.posicion_complementaria_id ?? null,
				p.disciplina ?? 'bjj',
				p.created_at,
				p.updated_at
			]
		);
	}

	for (const s of payload.sumisiones_terminales) {
		await run(
			`INSERT INTO sumisiones_terminales (id, nombre, notas, disciplina, created_at, updated_at)
			 VALUES (?, ?, ?, ?, ?, ?)`,
			[s.id, s.nombre, s.notas, s.disciplina ?? 'bjj', s.created_at, s.updated_at]
		);
	}

	for (const s of payload.sesiones) {
		await run(
			`INSERT INTO sesiones (id, fecha, tipo, disciplina, foco, tecnica_clase, obs_profesor, created_at, updated_at)
			 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
			[
				s.id,
				s.fecha,
				s.tipo,
				s.disciplina ?? 'bjj',
				s.foco ?? null,
				s.tecnica_clase ?? null,
				s.obs_profesor ?? null,
				s.created_at,
				s.updated_at
			]
		);
	}

	for (const t of payload.tecnicas) {
		await run(
			`INSERT INTO tecnicas (
				id, nombre, variante, posicion_origen_id, posicion_destino_id,
				sumision_destino_id, tipo, estado, detalles, errores_comunes,
				disciplina, created_at, updated_at
			) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
			[
				t.id,
				t.nombre,
				t.variante ?? null,
				t.posicion_origen_id,
				t.posicion_destino_id ?? null,
				t.sumision_destino_id ?? null,
				t.tipo,
				t.estado,
				t.detalles,
				t.errores_comunes,
				t.disciplina ?? 'bjj',
				t.created_at,
				t.updated_at
			]
		);
	}

	for (const r of payload.rolls) {
		await run(
			`INSERT INTO rolls (
				id, sesion_id, companero_id, orden, disciplina, tamano_relativo, duracion_min,
				resultado, que_intente, que_fallo, posiciones_problema,
				created_at, updated_at
			) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
			[
				r.id,
				r.sesion_id,
				r.companero_id ?? null,
				r.orden,
				r.disciplina ?? 'bjj',
				r.tamano_relativo ?? null,
				r.duracion_min ?? null,
				r.resultado ?? null,
				r.que_intente ?? null,
				r.que_fallo ?? null,
				r.posiciones_problema ?? null,
				r.created_at,
				r.updated_at
			]
		);
	}

	for (const tc of payload.tecnica_contras) {
		await run(
			`INSERT INTO tecnica_contras (tecnica_id, contra_tecnica_id, created_at)
			 VALUES (?, ?, ?)`,
			[tc.tecnica_id, tc.contra_tecnica_id, tc.created_at]
		);
	}

	for (const rp of payload.roll_posicion) {
		await run(
			`INSERT INTO roll_posicion (roll_id, posicion_id, resultado)
			 VALUES (?, ?, ?)`,
			[rp.roll_id, rp.posicion_id, rp.resultado]
		);
	}

	for (const rt of payload.roll_tecnica) {
		await run(
			`INSERT INTO roll_tecnica (roll_id, tecnica_id, resultado)
			 VALUES (?, ?, ?)`,
			[rt.roll_id, rt.tecnica_id, rt.resultado]
		);
	}

	for (const gl of payload.grafo_layout) {
		await run(
			`INSERT INTO grafo_layout (entidad_id, kind, x, y)
			 VALUES (?, ?, ?, ?)`,
			[gl.entidad_id, gl.kind, gl.x, gl.y]
		);
	}

	for (const s of payload.app_settings) {
		await run(`INSERT INTO app_settings (key, value) VALUES (?, ?)`, [s.key, s.value]);
	}

	// T-2.it7: etiquetas y su pivot con posiciones.
	for (const t of payload.tags) {
		await run(`INSERT INTO tags (id, nombre, color, created_at) VALUES (?, ?, ?, ?)`, [
			t.id,
			t.nombre,
			t.color,
			t.created_at
		]);
	}

	for (const pt of payload.posicion_tags) {
		await run(`INSERT INTO posicion_tags (posicion_id, tag_id) VALUES (?, ?)`, [
			pt.posicion_id,
			pt.tag_id
		]);
	}

	// T-2.it7: historial de importaciones.
	for (const im of payload.importaciones) {
		await run(
			`INSERT INTO importaciones (id, created_at, updated_at, titulo, titulo_origen, texto, aceptado_json, estado, error)
			 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
			[
				im.id,
				im.created_at,
				im.updated_at,
				im.titulo,
				im.titulo_origen,
				im.texto,
				im.aceptado_json ?? null,
				im.estado,
				im.error ?? null
			]
		);
	}
}
