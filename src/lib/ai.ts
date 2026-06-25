const PUBLIC_GROQ_KEY = import.meta.env.VITE_GROQ_KEY as string | undefined;
import type { CategoriaPosicion, TipoRolPosicion, TipoTecnica } from '$lib/types';

export type CatalogoSnapshot = {
	posiciones: { id: string; nombre: string }[];
	tecnicas: { nombre: string; posicion_origen_id: string }[];
	sumisiones: { id: string; nombre: string }[];
};

export type PosicionDraft = {
	nombre: string;
	categoria: CategoriaPosicion;
	tipo?: TipoRolPosicion;
	esExistente: boolean;
	idExistente?: string;
};

export type SumisionDraft = {
	nombre: string;
	esExistente: boolean;
	idExistente?: string;
	notas?: string;
};

export type TecnicaDraft = {
	nombre: string;
	variante?: string;
	tipo: TipoTecnica;
	posicionOrigenNombre: string;
	posicionDestinoNombre?: string;
	sumisionDestinoNombre?: string;
	detalles?: string;
};

export type AIPropuesta = {
	posiciones: PosicionDraft[];
	sumisiones: SumisionDraft[];
	tecnicas: TecnicaDraft[];
	resumen?: string;
};

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL = 'llama-3.3-70b-versatile';
const GROQ_TIMEOUT_MS = 30000;

// Llamada a Groq con timeout vía AbortController: si la red es lenta o el
// servidor no responde, abortamos a los 30s en vez de dejar el spinner
// colgado indefinidamente (típico en móvil con mala cobertura).
async function fetchGroq(body: object): Promise<Response> {
	const controller = new AbortController();
	const timeoutId = setTimeout(() => controller.abort(), GROQ_TIMEOUT_MS);
	try {
		return await fetch(GROQ_URL, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${PUBLIC_GROQ_KEY}` },
			body: JSON.stringify(body),
			signal: controller.signal
		});
	} catch (err) {
		if (err instanceof DOMException && err.name === 'AbortError') {
			throw new Error('AI_TIMEOUT');
		}
		throw err;
	} finally {
		clearTimeout(timeoutId);
	}
}

function buildPrompt(texto: string, catalogo: CatalogoSnapshot): string {
	return `Eres un asistente de análisis de clases de BJJ (Brazilian Jiu-Jitsu).
El usuario describe lo que se trabajó en una clase. Extrae posiciones, sumisiones terminales y técnicas.

IMPORTANTE: La descripción puede ser una transcripción de voz automática. Los términos técnicos de BJJ pueden aparecer mal escritos o fonéticamente aproximados (p.ej. "underhook" → "Underwood", "lockdown" → "look down", "overhook" → "overlook", "kneebar" → "ni bar"). Usa tu conocimiento de BJJ para interpretar correctamente estos términos antes de extraer posiciones y técnicas.

REGLAS CRÍTICAS:
1. Si una posición ya existe en el catálogo, usa EXACTAMENTE el mismo nombre.
2. Para CADA técnica que propongas, asegúrate de que su origen y destino estén cubiertos:
   - Si la posición origen/destino no existe en el catálogo → añádela a posiciones_nuevas.
   - Si el destino es una sumisión terminal (armbar, kimura, guillotina, etc.) → añádela a sumisiones_nuevas si no está ya en el catálogo.
   - NUNCA propongas una técnica sin que su origen y destino queden cubiertos.
3. Para técnicas de tipo "sumision": usa sumision_destino, NO posicion_destino.
4. Para otros tipos (ataque, sweep, escape, transicion): usa posicion_destino, NO sumision_destino.
5. Categorías válidas: guardia, control, transicion, otro. Usa "control" para mount, side control, back control y cualquier posición de control superior o espalda.
6. No inventes técnicas que no estén EXPLÍCITAMENTE descritas. No inferas conexiones lógicas entre posiciones aunque parezcan naturales en BJJ — solo incluye lo que el usuario menciona. Si ves dos posiciones sin técnica descrita entre ellas, no las conectes. No inventes posiciones que no aparezcan en el texto.
7. AGARRES Y CONTROLES NO SON POSICIONES: lockdown, underhook, overhook, collar tie, wrist control y similares son controles o agarres que se usan DESDE una posición — NO los incluyas como posiciones en posiciones_nuevas. Si el texto dice "coger un lockdown desde Media Guardia", la posición es "Media Guardia", no "Lockdown".
8. VARIANTES DE POSICIÓN: Algunas posiciones existen en variantes complementarias que son posiciones distintas (p.ej. "Dogfight underhook" vs "Dogfight overhook"). Cuando el texto mencione qué agarre o rol tiene el practicante en esa posición, inclúyelo en el nombre. Si el texto dice "pillar un underhook y llegar al Dogfight", la posición es "Dogfight underhook". Crea solo la variante que aparece en el texto.
9. Usa español correcto con tildes en todos los nombres que generes (Transición, Sumisión, Posición, etc.).

CATÁLOGO EXISTENTE:
Posiciones: ${JSON.stringify(catalogo.posiciones.map((p) => p.nombre))}
Sumisiones terminales: ${JSON.stringify(catalogo.sumisiones.map((s) => s.nombre))}

DESCRIPCIÓN DE LA CLASE:
${texto}

Responde ÚNICAMENTE con un objeto JSON con esta estructura exacta (sin markdown, sin texto fuera del JSON):
{
  "resumen": "string corto de lo que interpretaste (max 80 chars)",
  "posiciones_nuevas": [
    { "nombre": "string", "categoria": "guardia|control|transicion|otro", "tipo": "ofensiva|defensiva|neutral" }
  ],
  "sumisiones_nuevas": [
    { "nombre": "string" }
  ],
  "tecnicas_nuevas": [
    {
      "nombre": "string",
      "variante": "string (opcional)",
      "tipo": "ataque|sweep|escape|transicion|sumision",
      "posicion_origen": "string",
      "posicion_destino": "string (si tipo != sumision)",
      "sumision_destino": "string (si tipo == sumision)",
      "detalles": "string (opcional) — extrae aquí cualquier información sobre setup, ejecución, secuencia de movimientos o puntos clave que aparezca en la descripción para esta técnica. Máximo 2 frases."
    }
  ]
}`;
}

type RawPosicion = { nombre: string; categoria: string; tipo?: string };
type RawSumision = { nombre: string };
type RawTecnica = {
	nombre: string;
	variante?: string;
	tipo: string;
	posicion_origen: string;
	posicion_destino?: string;
	sumision_destino?: string;
	detalles?: string;
};

export type ValidacionResult = {
	propuesta: AIPropuesta;
	correcciones: string[];
};

export async function validarPropuesta(
	texto: string,
	propuesta: AIPropuesta,
	catalogo: CatalogoSnapshot
): Promise<ValidacionResult> {
	if (!PUBLIC_GROQ_KEY) throw new Error('GROQ_KEY_MISSING');

	const propuestaResumen = {
		posiciones_nuevas: propuesta.posiciones
			.filter((p) => !p.esExistente)
			.map((p) => ({ nombre: p.nombre, categoria: p.categoria, tipo: p.tipo })),
		sumisiones_nuevas: propuesta.sumisiones.filter((s) => !s.esExistente).map((s) => ({ nombre: s.nombre })),
		tecnicas_nuevas: propuesta.tecnicas.map((t) => ({
			nombre: t.nombre,
			tipo: t.tipo,
			posicion_origen: t.posicionOrigenNombre,
			posicion_destino: t.posicionDestinoNombre,
			sumision_destino: t.sumisionDestinoNombre
		}))
	};

	const prompt = `Eres un validador de propuestas de extracción de clases de BJJ/grappling. Tu tarea es revisar una propuesta generada por otro modelo y corregirla aplicando una rúbrica de reglas explícitas.

TEXTO NORMALIZADO DE LA CLASE:
${texto}

PROPUESTA A VALIDAR:
${JSON.stringify(propuestaResumen, null, 2)}

CATÁLOGO EXISTENTE (posiciones y sumisiones ya en la BD — no tocar):
Posiciones: ${JSON.stringify(catalogo.posiciones.map((p) => p.nombre))}
Sumisiones: ${JSON.stringify(catalogo.sumisiones.map((s) => s.nombre))}

RÚBRICA DE VALIDACIÓN (aplica cada regla en orden):
1. CONTROLES NO SON POSICIONES: lockdown, underhook, overhook, wrist control, collar tie, pummeling y controles similares son agarres o controles — NO posiciones. Si aparecen en posiciones_nuevas, elimínalos. Ajusta las técnicas que los referencien como origen/destino.
2. POSICIONES NO MENCIONADAS: si una posición nueva no aparece mencionada en el texto normalizado, elimínala. Ajusta las técnicas huérfanas.
3. VARIANTES DUPLICADAS — GENÉRICO + ESPECÍFICO: si coexisten la posición genérica ("Dogfight") y una variante específica ("Dogfight underhook") como posiciones nuevas, elimina la genérica. Reasigna sus técnicas a la variante específica.
4. VARIANTES DUPLICADAS — DOS COMPLEMENTARIAS: si aparecen dos variantes opuestas ("Dogfight underhook" y "Dogfight overhook") como posiciones nuevas, elimina la que NO puedas confirmar en el texto normalizado.
5. TÉCNICAS HUÉRFANAS: tras aplicar las reglas anteriores, si alguna técnica tiene origen o destino que ya no existe, elimínala.

Para cada corrección que apliques, describe brevemente qué hiciste en el campo "correcciones".
Si la propuesta ya es correcta, devuelve "correcciones": [].

Responde ÚNICAMENTE con JSON (sin markdown):
{
  "posiciones_nuevas": [{ "nombre": "string", "categoria": "guardia|control|transicion|otro", "tipo": "ofensiva|defensiva|neutral" }],
  "sumisiones_nuevas": [{ "nombre": "string" }],
  "tecnicas_nuevas": [{ "nombre": "string", "variante": "string (opc)", "tipo": "ataque|sweep|escape|transicion|sumision", "posicion_origen": "string", "posicion_destino": "string (si no sumision)", "sumision_destino": "string (si sumision)", "detalles": "string (opc) — conserva el valor original si la técnica no fue modificada" }],
  "correcciones": ["descripción corrección 1", "descripción corrección 2"]
}`;

	const response = await fetchGroq({
		model: GROQ_MODEL,
		messages: [{ role: 'user', content: prompt }],
		response_format: { type: 'json_object' },
		temperature: 0.1
	});

	if (!response.ok) {
		const errorText = await response.text();
		throw new Error(`Error ${response.status}: ${errorText}`);
	}

	const data = await response.json();
	let raw: Record<string, unknown>;
	try {
		const content = data.choices?.[0]?.message?.content ?? '{}';
		console.log('[AI validación] respuesta bruta:', content);
		raw = JSON.parse(content);
	} catch {
		throw new Error('AI_RESPONSE_INVALID');
	}

	const correcciones = (raw.correcciones as string[] | undefined) ?? [];
	const propuestaCorregida = parseRawPropuesta(raw, catalogo);

	// El validador no propaga detalles — los restauramos desde la propuesta original por nombre
	const detallesOriginales = new Map(propuesta.tecnicas.map((t) => [t.nombre, t.detalles]));
	for (const t of propuestaCorregida.tecnicas) {
		if (!t.detalles) t.detalles = detallesOriginales.get(t.nombre) ?? '';
	}

	return { propuesta: propuestaCorregida, correcciones };
}

function buildRefinamientoPrompt(
	texto: string,
	propuestaActual: AIPropuesta,
	correcciones: string,
	catalogo: CatalogoSnapshot
): string {
	const propuestaResumen = {
		posiciones: propuestaActual.posiciones.map((p) => ({
			nombre: p.nombre,
			categoria: p.categoria,
			tipo: p.tipo
		})),
		sumisiones: propuestaActual.sumisiones.map((s) => s.nombre),
		tecnicas: propuestaActual.tecnicas.map((t) => ({
			nombre: t.nombre,
			tipo: t.tipo,
			origen: t.posicionOrigenNombre,
			destino: t.posicionDestinoNombre ?? t.sumisionDestinoNombre
		}))
	};

	return `Eres un asistente de análisis de clases de BJJ. Ya analizaste una clase y el usuario quiere corregir tu propuesta.

IMPORTANTE: La descripción puede ser transcripción de voz con términos BJJ mal escritos fonéticamente. Interprétalos con tu conocimiento del deporte.

DESCRIPCIÓN ORIGINAL DE LA CLASE:
${texto}

PROPUESTA ANTERIOR (lo que generaste):
${JSON.stringify(propuestaResumen, null, 2)}

CORRECCIONES DEL USUARIO:
${correcciones}

REGLAS (las mismas que antes):
1. Si una posición ya existe en el catálogo, usa EXACTAMENTE el mismo nombre.
2. Para CADA técnica, asegúrate de que origen y destino estén cubiertos en posiciones_nuevas o en el catálogo.
3. Para técnicas de tipo "sumision": usa sumision_destino. Para otros tipos: usa posicion_destino.
4. Categorías válidas: guardia, control, transicion, otro. Usa "control" para mount, side control, back control y cualquier posición de control superior o espalda.
5. No inventes técnicas no descritas explícitamente en la descripción original.
6. Mantén todo lo que estuvo bien en la propuesta anterior. Solo corrige lo que el usuario señala.
7. ESPECIFICIDAD Y VARIANTES COMPLEMENTARIAS: Para posiciones con variantes complementarias, razona qué variante se trabajó usando el contexto (técnicas, secuencias, sumisiones) e inclúyela en el nombre. Solo la variante que aparece en el texto — nunca generes la opuesta. Sin contexto suficiente, usa el nombre genérico.

CATÁLOGO EXISTENTE:
Posiciones: ${JSON.stringify(catalogo.posiciones.map((p) => p.nombre))}
Sumisiones terminales: ${JSON.stringify(catalogo.sumisiones.map((s) => s.nombre))}

Responde ÚNICAMENTE con JSON (sin markdown):
{
  "resumen": "string corto de lo que corregiste",
  "posiciones_nuevas": [
    { "nombre": "string", "categoria": "guardia|control|transicion|otro", "tipo": "ofensiva|defensiva|neutral" }
  ],
  "sumisiones_nuevas": [{ "nombre": "string" }],
  "tecnicas_nuevas": [
    { "nombre": "string", "variante": "string (opc)", "tipo": "ataque|sweep|escape|transicion|sumision", "posicion_origen": "string", "posicion_destino": "string (si no sumision)", "sumision_destino": "string (si sumision)" }
  ]
}`;
}

export type NormalizacionResult = {
	textoConMarcas: string;
	correcciones: { original: string; corregido: string }[];
};

export async function normalizarDescripcion(texto: string): Promise<NormalizacionResult> {
	if (!PUBLIC_GROQ_KEY) throw new Error('GROQ_KEY_MISSING');

	const prompt = `Eres un experto en BJJ (Brazilian Jiu-Jitsu) y grappling. El siguiente texto es una transcripción automática de voz de la descripción de una clase. Puede contener errores fonéticos, términos técnicos mal escritos o frases incompletas.

Reescríbelo en español claro y correcto, corrigiendo:
- Términos de BJJ/grappling mal transcritos fonéticamente (p.ej. "Underwood" → "underhook", "look down" → "lockdown", "overlook" → "overhook")
- Errores ortográficos y de puntuación
- Frases incompletas o mal cortadas por la transcripción

REGLAS IMPORTANTES:
1. Correcciones con certeza: rodea ÚNICAMENTE el término corregido con **asteriscos dobles** (ej: **underhook**). Anótalas en "correcciones".
2. Términos sospechosos que no puedes identificar con certeza: déjalos tal cual en el texto pero rodéalos con ~~virgulillas dobles~~ (ej: ~~Hans lab~~). Anótalos en "inciertos".
3. Nunca adivines ni inventes un término: si no lo reconoces con certeza, usa las ~~virgulillas~~.
4. Mantén TODA la información original — no añadas ni elimines contenido.
5. Los nombres de posiciones y técnicas de BJJ son nombres propios: escríbelos con mayúscula inicial en cada palabra (Dogfight, Seat Belt, Electric Chair, etc.).
6. VARIANTES DE POSICIÓN: si el contexto deja claro qué variante de una posición complementaria se trabaja (p.ej. el texto menciona "underhook" en el camino hacia "Dogfight"), escribe el nombre completo con la variante (**Dogfight underhook**) y anótalo como corrección.

Responde ÚNICAMENTE con JSON (sin markdown):
{
  "texto": "texto reescrito con **correcciones** y ~~inciertos~~ marcados",
  "correcciones": [
    { "original": "término exacto en el texto original", "corregido": "término corregido" }
  ],
  "inciertos": ["término1", "término2"]
}

TEXTO ORIGINAL:
${texto}`;

	const response = await fetchGroq({
		model: GROQ_MODEL,
		messages: [{ role: 'user', content: prompt }],
		response_format: { type: 'json_object' },
		temperature: 0.2
	});

	if (!response.ok) {
		const errorText = await response.text();
		throw new Error(`Error ${response.status}: ${errorText}`);
	}

	const data = await response.json();
	let raw: Record<string, unknown>;
	try {
		const content = data.choices?.[0]?.message?.content ?? '{}';
		console.log('[AI normalización] respuesta bruta:', content);
		raw = JSON.parse(content);
	} catch {
		throw new Error('AI_RESPONSE_INVALID');
	}

	const textoConMarcas = (raw.texto as string | undefined)?.trim() ?? '';
	const correcciones = (raw.correcciones as { original: string; corregido: string }[] | undefined) ?? [];
	if (!textoConMarcas) throw new Error('AI_RESPONSE_INVALID');
	return { textoConMarcas, correcciones };
}

export async function refinarPropuesta(
	texto: string,
	propuestaActual: AIPropuesta,
	correcciones: string,
	catalogo: CatalogoSnapshot
): Promise<AIPropuesta> {
	if (!PUBLIC_GROQ_KEY) throw new Error('GROQ_KEY_MISSING');

	const response = await fetchGroq({
		model: GROQ_MODEL,
		messages: [{ role: 'user', content: buildRefinamientoPrompt(texto, propuestaActual, correcciones, catalogo) }],
		response_format: { type: 'json_object' },
		temperature: 0.2
	});

	if (!response.ok) {
		const errorText = await response.text();
		throw new Error(`Error ${response.status}: ${errorText}`);
	}

	const data = await response.json();
	let raw: Record<string, unknown>;
	try {
		const content = data.choices?.[0]?.message?.content ?? '{}';
		console.log('[AI refinado] respuesta bruta:', content);
		raw = JSON.parse(content);
	} catch {
		throw new Error('AI_RESPONSE_INVALID');
	}

	return parseRawPropuesta(raw, catalogo);
}

function parseRawPropuesta(raw: Record<string, unknown>, catalogo: CatalogoSnapshot): AIPropuesta {
	const posicionesRaw = (raw.posiciones_nuevas as RawPosicion[] | undefined) ?? [];
	const sumisionesRaw = (raw.sumisiones_nuevas as RawSumision[] | undefined) ?? [];
	const tecnicasRaw = (raw.tecnicas_nuevas as RawTecnica[] | undefined) ?? [];

	const posicionNormMap = new Map(
		catalogo.posiciones.map((p) => [p.nombre.toLowerCase().trim(), p.id])
	);
	const sumisionNormMap = new Map(
		catalogo.sumisiones.map((s) => [s.nombre.toLowerCase().trim(), s.id])
	);

	const posiciones: PosicionDraft[] = posicionesRaw.map((p) => {
		const key = p.nombre.toLowerCase().trim();
		const existingId = posicionNormMap.get(key);
		return {
			nombre: p.nombre,
			categoria: (p.categoria as CategoriaPosicion) || 'otro',
			tipo: p.tipo as TipoRolPosicion | undefined,
			esExistente: !!existingId,
			idExistente: existingId
		};
	});

	const sumisiones: SumisionDraft[] = sumisionesRaw.map((s) => {
		const key = s.nombre.toLowerCase().trim();
		const existingId = sumisionNormMap.get(key);
		return { nombre: s.nombre, esExistente: !!existingId, idExistente: existingId };
	});

	const tecnicas: TecnicaDraft[] = tecnicasRaw.map((t) => ({
		nombre: t.nombre,
		variante: t.variante,
		tipo: t.tipo as TipoTecnica,
		posicionOrigenNombre: t.posicion_origen,
		posicionDestinoNombre: t.posicion_destino,
		sumisionDestinoNombre: t.sumision_destino,
		detalles: t.detalles?.trim() || undefined
	}));

	return { posiciones, sumisiones, tecnicas, resumen: (raw.resumen as string | undefined) ?? undefined };
}

export async function generarPropuestaDeClase(
	texto: string,
	catalogo: CatalogoSnapshot
): Promise<AIPropuesta> {
	if (!PUBLIC_GROQ_KEY) {
		throw new Error('GROQ_KEY_MISSING');
	}

	const response = await fetchGroq({
		model: GROQ_MODEL,
		messages: [{ role: 'user', content: buildPrompt(texto, catalogo) }],
		response_format: { type: 'json_object' },
		temperature: 0.2
	});

	if (!response.ok) {
		const errorText = await response.text();
		throw new Error(`Error ${response.status}: ${errorText}`);
	}

	const data = await response.json();
	let raw: Record<string, unknown>;
	try {
		const content = data.choices?.[0]?.message?.content ?? '{}';
		console.log('[AI extracción] respuesta bruta:', content);
		raw = JSON.parse(content);
	} catch {
		throw new Error('AI_RESPONSE_INVALID');
	}

	return parseRawPropuesta(raw, catalogo);
}
