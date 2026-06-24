<script lang="ts">
	import { onMount } from 'svelte';
	import * as AlertDialog from '$lib/components/ui/alert-dialog';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Button, buttonVariants } from '$lib/components/ui/button';
	import { Textarea } from '$lib/components/ui/textarea';
	import { Input } from '$lib/components/ui/input';
	import * as Select from '$lib/components/ui/select';
	import MicIcon from '@lucide/svelte/icons/mic';
	import MicOffIcon from '@lucide/svelte/icons/mic-off';
	import Loader2Icon from '@lucide/svelte/icons/loader-2';
	import { listPosiciones, createPosicion } from '$lib/posiciones';
	import { listTecnicas, createTecnica } from '$lib/tecnicas';
	import { listSumisiones, createSumision } from '$lib/sumisiones';
	import { generarPropuestaDeClase, refinarPropuesta, normalizarDescripcion, validarPropuesta } from '$lib/ai';
	import type { CatalogoSnapshot, AIPropuesta, NormalizacionResult } from '$lib/ai';
	import type { CategoriaPosicion, TipoRolPosicion, TipoTecnica } from '$lib/types';
	import { settings } from '$lib/settings.svelte';
	import { capitalizeFirst } from '$lib/utils';

	let {
		open = $bindable(false),
		onClose,
		onCatalogChanged
	}: {
		open?: boolean;
		onClose?: () => void;
		onCatalogChanged?: () => void;
	} = $props();

	type PosicionItem = {
		nombre: string;
		categoria: CategoriaPosicion;
		tipo?: TipoRolPosicion;
		seleccionado: boolean;
		nombreEditado: string;
		categoriaEditada: CategoriaPosicion;
		tipoEditado: TipoRolPosicion | undefined;
		esManual?: boolean;
	};

	type SumisionItem = {
		nombre: string;
		seleccionado: boolean;
		nombreEditado: string;
		notas?: string;
	};

	type TecnicaItem = {
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

	let step = $state<'input' | 'normalizado' | 'review' | 'detalles'>('input');
	let textoClase = $state('');
	let normalizacion = $state<NormalizacionResult | null>(null);
	let textoParaPropuesta = $state('');
	let resumenAI = $state<string | undefined>(undefined);
	let loadingAI = $state(false);
	let loadingLabel = $state('');
	let errorAI = $state<string | null>(null);
	let inserting = $state(false);
	let errorInsert = $state<string | null>(null);
	let textoRefinamiento = $state('');
	let propuestaActual = $state<AIPropuesta | null>(null);
	let validacionCorrecciones = $state<string[]>([]);
	let validacionBannerAbierto = $state(true);
	let confirmDescartarOpen = $state(false);

	let posicionesDraft = $state<PosicionItem[]>([]);
	let sumisionesDraft = $state<SumisionItem[]>([]);
	let tecnicasDraft = $state<TecnicaItem[]>([]);

	let catalogoPosicionesBase = $state<{ id: string; nombre: string }[]>([]);
	let catalogoSumisionesBase = $state<{ id: string; nombre: string }[]>([]);

	const todasPosicionesDisponibles = $derived([
		...catalogoPosicionesBase.map((p) => p.nombre),
		...posicionesDraft.filter((p) => p.seleccionado && p.nombreEditado.trim()).map((p) => p.nombreEditado.trim())
	]);

	const todasSumisionesDisponibles = $derived([
		...catalogoSumisionesBase.map((s) => s.nombre),
		...sumisionesDraft.filter((s) => s.seleccionado && s.nombreEditado.trim()).map((s) => s.nombreEditado.trim())
	]);

	let speechSoportado = $state(false);
	let grabando = $state(false);
	let deberiaGrabar = false;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	let recognition: any = null;

	const CATEGORIAS: { value: CategoriaPosicion; label: string }[] = [
		{ value: 'guardia', label: 'Guardia' },
		{ value: 'control', label: 'Control' },
		{ value: 'transicion', label: 'Transición' },
		{ value: 'otro', label: 'Otro' }
	];

	const TIPOS_ROL: { value: TipoRolPosicion; label: string }[] = [
		{ value: 'ofensiva', label: 'Ofensiva' },
		{ value: 'defensiva', label: 'Defensiva' },
		{ value: 'neutral', label: 'Neutral' }
	];

	const TIPOS_TECNICA: Record<TipoTecnica, string> = {
		ataque: 'Ataque',
		sweep: 'Sweep',
		escape: 'Escape',
		transicion: 'Transición',
		sumision: 'Sumisión'
	};

	onMount(() => {
		settings.init();
		speechSoportado =
			typeof window !== 'undefined' &&
			('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);
	});

	$effect(() => {
		if (!open) {
			deberiaGrabar = false;
			recognition?.stop();
			grabando = false;
		}
	});

	type Segmento = { text: string; kind: 'normal' | 'corrected' | 'uncertain' };

	function parseSegmentos(texto: string): Segmento[] {
		return texto.split(/(\*\*.*?\*\*|~~.*?~~)/gs).map((parte) => {
			if (parte.startsWith('**') && parte.endsWith('**')) return { text: parte.slice(2, -2), kind: 'corrected' };
			if (parte.startsWith('~~') && parte.endsWith('~~')) return { text: parte.slice(2, -2), kind: 'uncertain' };
			return { text: parte, kind: 'normal' };
		});
	}

	function resaltarOriginal(texto: string, correcciones: { original: string; corregido: string }[]): { text: string; highlighted: boolean }[] {
		if (!correcciones.length) return [{ text: texto, highlighted: false }];
		const escapado = correcciones
			.map((c) => c.original.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
			.filter(Boolean)
			.join('|');
		if (!escapado) return [{ text: texto, highlighted: false }];
		const regex = new RegExp(`(${escapado})`, 'gi');
		return texto.split(regex).map((parte, i) => ({ text: parte, highlighted: i % 2 === 1 }));
	}

	function escapeHtml(s: string): string {
		return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
	}

	let interpretadoDiv = $state<HTMLElement | null>(null);

	$effect(() => {
		if (!interpretadoDiv || !normalizacion) return;
		const html = parseSegmentos(normalizacion.textoConMarcas)
			.map((seg) => {
				if (seg.kind === 'corrected')
					return `<mark style="border-radius:2px;background-color:color-mix(in srgb,var(--color-warning,#f59e0b) 35%,transparent);padding:0 2px;color:inherit">${escapeHtml(seg.text)}</mark>`;
				if (seg.kind === 'uncertain')
					return `<mark style="border-radius:2px;background-color:color-mix(in srgb,var(--color-destructive,#ef4444) 20%,transparent);padding:0 2px;text-decoration:underline dotted;color:inherit">${escapeHtml(seg.text)}</mark>`;
				return escapeHtml(seg.text);
			})
			.join('');
		interpretadoDiv.innerHTML = html;
		textoParaPropuesta = interpretadoDiv.innerText;
	});

	function resetState() {
		step = 'input';
		textoClase = '';
		normalizacion = null;
		textoParaPropuesta = '';
		resumenAI = undefined;
		errorAI = null;
		errorInsert = null;
		posicionesDraft = [];
		sumisionesDraft = [];
		tecnicasDraft = [];
		catalogoPosicionesBase = [];
		catalogoSumisionesBase = [];
		textoRefinamiento = '';
		propuestaActual = null;
		validacionCorrecciones = [];
		validacionBannerAbierto = true;
	}

	const tieneDatos = $derived(
		textoClase.trim().length > 0 || step === 'normalizado' || step === 'review' || step === 'detalles'
	);

	function handleClose() {
		deberiaGrabar = false;
		recognition?.stop();
		grabando = false;
		confirmDescartarOpen = false;
		open = false;
		onClose?.();
		resetState();
	}

	function intentarCerrar() {
		if (!open) return;
		if (tieneDatos) {
			confirmDescartarOpen = true;
		} else {
			handleClose();
		}
	}

	function toggleGrabacion() {
		if (grabando) {
			deberiaGrabar = false;
			recognition?.stop();
			grabando = false;
			return;
		}
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const win = window as any;
		const SRClass = win.SpeechRecognition ?? win.webkitSpeechRecognition;
		if (!SRClass) return;
		recognition = new SRClass();
		recognition.lang = 'es-ES';
		recognition.continuous = true;
		recognition.interimResults = false;
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		recognition.onresult = (e: any) => {
			let chunk = '';
			for (let i = e.resultIndex; i < e.results.length; i++) {
				if (e.results[i].isFinal) chunk += e.results[i][0].transcript;
			}
			if (chunk.trim()) textoClase = textoClase ? textoClase + ' ' + chunk.trim() : chunk.trim();
		};
		recognition.onend = () => {
			if (deberiaGrabar) {
				// En móvil el sistema para el reconocimiento tras cada pausa —
				// relanzamos si el usuario no ha pulsado detener explícitamente.
				setTimeout(() => {
					if (deberiaGrabar) recognition?.start();
				}, 150);
			} else {
				grabando = false;
			}
		};
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		recognition.onerror = (e: any) => {
			grabando = false;
			if (e.error !== 'no-speech' && e.error !== 'aborted') {
				errorAI = 'Error de micrófono: ' + e.error;
			}
		};
		deberiaGrabar = true;
		recognition.start();
		grabando = true;
	}

	async function handleNormalizar() {
		if (!textoClase.trim() || loadingAI) return;
		loadingAI = true;
		loadingLabel = 'Interpretando descripción…';
		errorAI = null;
		try {
			const resultado = await normalizarDescripcion(textoClase);
			normalizacion = resultado;
			textoParaPropuesta = resultado.textoConMarcas.replace(/\*\*/g, '');
			step = 'normalizado';
		} catch (err) {
			errorAI = err instanceof Error ? err.message : String(err);
		} finally {
			loadingAI = false;
			loadingLabel = '';
		}
	}

	async function handleGenerarPropuesta() {
		if (!textoParaPropuesta.trim() || loadingAI) return;
		loadingAI = true;
		loadingLabel = 'Generando propuesta…';
		errorAI = null;
		try {
			const [posiciones, tecnicas, sumisiones] = await Promise.all([
				listPosiciones(),
				listTecnicas(),
				listSumisiones()
			]);
			const catalogo: CatalogoSnapshot = {
				posiciones: posiciones.map((p) => ({ id: p.id, nombre: p.nombre })),
				tecnicas: tecnicas.map((t) => ({ nombre: t.nombre, posicion_origen_id: t.posicion_origen_id })),
				sumisiones: sumisiones.map((s) => ({ id: s.id, nombre: s.nombre }))
			};
			catalogoPosicionesBase = catalogo.posiciones;
			catalogoSumisionesBase = catalogo.sumisiones;

			let propuesta = await generarPropuestaDeClase(textoParaPropuesta, catalogo);

			loadingLabel = 'Verificando propuesta…';
			try {
				const validacion = await validarPropuesta(textoParaPropuesta, propuesta, catalogo);
				propuesta = validacion.propuesta;
				validacionCorrecciones = validacion.correcciones;
				validacionBannerAbierto = validacion.correcciones.length > 0;
			} catch {
				// Si falla la validación, seguimos con la propuesta original sin bloquear
			}

			// Build name sets for validating técnica FK resolution
			const posNombres = new Set([
				...posiciones.map((p) => p.nombre.toLowerCase()),
				...propuesta.posiciones
					.filter((p) => !p.esExistente)
					.map((p) => p.nombre.toLowerCase())
			]);
			const sumNombres = new Set([
				...sumisiones.map((s) => s.nombre.toLowerCase()),
				...propuesta.sumisiones
					.filter((s) => !s.esExistente)
					.map((s) => s.nombre.toLowerCase())
			]);

			propuestaActual = propuesta;
			resumenAI = propuesta.resumen;

			posicionesDraft = propuesta.posiciones
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

			sumisionesDraft = propuesta.sumisiones
				.filter((s) => !s.esExistente)
				.map((s) => ({
					nombre: capitalizeFirst(s.nombre),
					seleccionado: true,
					nombreEditado: capitalizeFirst(s.nombre),
					notas: s.notas
				}));

			tecnicasDraft = propuesta.tecnicas.map((t) => {
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

			step = 'review';
		} catch (err) {
			if (err instanceof Error && err.message === 'GROQ_KEY_MISSING') {
				errorAI = 'No hay clave de Groq configurada (PUBLIC_GROQ_KEY vacía).';
			} else if (err instanceof Error && err.message === 'AI_RESPONSE_INVALID') {
				errorAI = 'El AI devolvió una respuesta inesperada. Inténtalo de nuevo.';
			} else if (err instanceof Error && err.message.includes('503')) {
				errorAI = 'El servidor de Gemini está saturado ahora mismo. Espera un minuto e inténtalo de nuevo.';
			} else if (err instanceof Error && err.message.includes('429')) {
				errorAI = 'Límite de uso alcanzado. Espera unos segundos e inténtalo de nuevo.';
			} else {
				errorAI = err instanceof Error ? err.message : String(err);
			}
		} finally {
			loadingAI = false;
			loadingLabel = '';
		}
	}

	async function handleConfirmar() {
		if (inserting) return;
		inserting = true;
		errorInsert = null;
		try {
			// Load fresh catalog for FK resolution
			const [posicionesExistentes, sumisionesExistentes] = await Promise.all([
				listPosiciones(),
				listSumisiones()
			]);

			const posNormMap = new Map(
				posicionesExistentes.map((p) => [p.nombre.toLowerCase().trim(), p.id])
			);
			const sumNormMap = new Map(
				sumisionesExistentes.map((s) => [s.nombre.toLowerCase().trim(), s.id])
			);

			// Phase A: crear posiciones seleccionadas
			for (const item of posicionesDraft.filter((p) => p.seleccionado)) {
				try {
					const created = await createPosicion({
						nombre: item.nombreEditado,
						categoria: item.categoriaEditada,
						tipo: item.tipoEditado,
						notas: '',
						posicion_complementaria_id: null,
						disciplina: settings.disciplinaActiva
					});
					posNormMap.set(item.nombreEditado.toLowerCase().trim(), created.id);
				} catch (e) {
					console.warn('Error creando posición', item.nombreEditado, e);
				}
			}

			// Phase B: crear sumisiones seleccionadas
			for (const item of sumisionesDraft.filter((s) => s.seleccionado)) {
				try {
					const created = await createSumision({ nombre: item.nombreEditado, notas: item.notas ?? '', disciplina: settings.disciplinaActiva });
					sumNormMap.set(item.nombreEditado.toLowerCase().trim(), created.id);
				} catch (e) {
					console.warn('Error creando sumisión', item.nombreEditado, e);
				}
			}

			// Phase C: crear técnicas seleccionadas
			for (const item of tecnicasDraft.filter((t) => t.seleccionado)) {
				const origenId = posNormMap.get(item.posicionOrigenNombre.toLowerCase().trim());
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
							console.warn('Sumisión destino no encontrada, saltando:', item.nombre);
							continue;
						}
						await createTecnica({
							nombre: item.nombre,
							variante: item.variante,
							posicion_origen_id: origenId,
							posicion_destino_id: undefined,
							sumision_destino_id: sumId,
							tipo: item.tipo,
							estado: 'probando',
							detalles: item.detalles ?? '',
							errores_comunes: '',
							disciplina: settings.disciplinaActiva
						});
					} else {
						const destId = item.posicionDestinoNombre
							? posNormMap.get(item.posicionDestinoNombre.toLowerCase().trim())
							: undefined;
						if (!destId) {
							console.warn('Destino no encontrado, saltando técnica:', item.nombre);
							continue;
						}
						await createTecnica({
							nombre: item.nombre,
							variante: item.variante,
							posicion_origen_id: origenId,
							posicion_destino_id: destId,
							sumision_destino_id: undefined,
							tipo: item.tipo,
							estado: 'probando',
							detalles: item.detalles ?? '',
							errores_comunes: '',
							disciplina: settings.disciplinaActiva
						});
					}
				} catch (e) {
					console.warn('Error creando técnica', item.nombre, e);
				}
			}

			onCatalogChanged?.();
			open = false;
			onClose?.();
			resetState();
		} catch (err) {
			errorInsert = err instanceof Error ? err.message : String(err);
		} finally {
			inserting = false;
		}
	}

	async function handleRefinar() {
		if (!textoRefinamiento.trim() || !propuestaActual || loadingAI) return;
		loadingAI = true;
		errorAI = null;
		try {
			const catalogo: CatalogoSnapshot = {
				posiciones: catalogoPosicionesBase,
				tecnicas: [],
				sumisiones: catalogoSumisionesBase
			};
			const propuestaRefinada = await refinarPropuesta(
				textoClase,
				propuestaActual,
				textoRefinamiento,
				catalogo
			);

			propuestaActual = propuestaRefinada;
			resumenAI = propuestaRefinada.resumen;
			textoRefinamiento = '';

			const posNombres = new Set([
				...catalogoPosicionesBase.map((p) => p.nombre.toLowerCase()),
				...propuestaRefinada.posiciones.filter((p) => !p.esExistente).map((p) => p.nombre.toLowerCase())
			]);
			const sumNombres = new Set([
				...catalogoSumisionesBase.map((s) => s.nombre.toLowerCase()),
				...propuestaRefinada.sumisiones.filter((s) => !s.esExistente).map((s) => s.nombre.toLowerCase())
			]);

			posicionesDraft = propuestaRefinada.posiciones
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

			sumisionesDraft = propuestaRefinada.sumisiones
				.filter((s) => !s.esExistente)
				.map((s) => ({ nombre: capitalizeFirst(s.nombre), seleccionado: true, nombreEditado: capitalizeFirst(s.nombre), notas: s.notas }));

			tecnicasDraft = propuestaRefinada.tecnicas.map((t) => {
				const origenOk = posNombres.has(t.posicionOrigenNombre.toLowerCase());
				const destinoOk =
					t.tipo === 'sumision'
						? !!(t.sumisionDestinoNombre && sumNombres.has(t.sumisionDestinoNombre.toLowerCase()))
						: !!(t.posicionDestinoNombre && posNombres.has(t.posicionDestinoNombre.toLowerCase()));
				const puedeCrearse = origenOk && destinoOk;
				return { ...t, nombre: capitalizeFirst(t.nombre), seleccionado: puedeCrearse, puedeCrearse, detalles: t.detalles };
			});
		} catch (err) {
			if (err instanceof Error && err.message.includes('429')) {
				errorAI = 'Límite de uso alcanzado. Espera unos segundos e inténtalo de nuevo.';
			} else {
				errorAI = err instanceof Error ? err.message : String(err);
			}
		} finally {
			loadingAI = false;
		}
	}

	function addPosicionManual() {
		posicionesDraft.push({
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

	function addSumisionManual() {
		sumisionesDraft.push({
			nombre: '',
			seleccionado: true,
			nombreEditado: ''
		});
	}

	function addTecnicaManual() {
		tecnicasDraft.push({
			nombre: '',
			tipo: 'transicion',
			posicionOrigenNombre: '',
			posicionDestinoNombre: '',
			seleccionado: false,
			puedeCrearse: false,
			esManual: true
		});
	}

	const haySeleccionados = $derived(
		posicionesDraft.some((p) => p.seleccionado) ||
			sumisionesDraft.some((s) => s.seleccionado) ||
			tecnicasDraft.some((t) => t.seleccionado)
	);
</script>

<Dialog.Root {open} onOpenChange={(v) => { if (!v) intentarCerrar(); }}>
	<Dialog.Content
		class="flex max-h-[90vh] flex-col gap-0 p-0 sm:max-w-lg"
		onInteractOutside={(e) => { e.preventDefault(); intentarCerrar(); }}
		onEscapeKeydown={(e) => { e.preventDefault(); intentarCerrar(); }}
	>
		<Dialog.Header class="px-6 pt-6 pb-4">
			<Dialog.Title>
				{step === 'input' ? '✨ Importar de clase' : step === 'normalizado' ? 'Texto interpretado' : step === 'review' ? 'Revisar propuesta' : 'Añadir detalles'}
			</Dialog.Title>
			{#if resumenAI && step === 'review'}
				<Dialog.Description class="text-sm text-muted-foreground">
					{resumenAI}
				</Dialog.Description>
			{/if}
		</Dialog.Header>

		<!-- Step 1: Input -->
		{#if step === 'input'}
			<div class="flex flex-1 flex-col gap-4 overflow-y-auto px-6 pb-2">
				<div class="relative">
					<Textarea
						bind:value={textoClase}
						placeholder="Ej: Hoy trabajamos el toreando pass desde de pie hacia side control, el knee slide hacia half guard top, y el armbar desde mount..."
						class="min-h-32 resize-none pr-10"
						disabled={loadingAI}
					/>
					{#if speechSoportado}
						<button
							type="button"
							onclick={toggleGrabacion}
							aria-label={grabando ? 'Detener grabación' : 'Dictar descripción'}
							class="absolute top-2 right-2 rounded-md p-1 transition-colors {grabando
								? 'text-destructive'
								: 'text-muted-foreground hover:text-foreground'}"
						>
							{#if grabando}
								<MicOffIcon class="h-5 w-5" />
							{:else}
								<MicIcon class="h-5 w-5" />
							{/if}
						</button>
					{/if}
				</div>
				{#if errorAI}
					<div
						class="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
					>
						{errorAI}
					</div>
				{/if}
			</div>
			<div class="flex justify-end gap-2 border-t border-border px-6 py-4">
				<Button variant="outline" onclick={intentarCerrar}>Cancelar</Button>
				<Button onclick={handleNormalizar} disabled={!textoClase.trim() || loadingAI}>
					{#if loadingAI}
						<Loader2Icon class="mr-2 h-4 w-4 animate-spin" />
						{loadingLabel || 'Analizando…'}
					{:else}
						Analizar clase
					{/if}
				</Button>
			</div>
		{/if}

		<!-- Step 1b: Texto normalizado con correcciones resaltadas -->
		{#if step === 'normalizado'}
			<div class="flex flex-1 flex-col gap-3 overflow-y-auto px-6 pb-2">
				<p class="text-xs text-muted-foreground">
					<mark class="rounded bg-warning/40 px-0.5 text-foreground">Amarillo</mark> = corregido ·
					<mark class="rounded bg-destructive/20 px-0.5 text-foreground underline decoration-dotted">Naranja</mark> = incierto, revisa. Edita el texto interpretado si es necesario.
				</p>
				<!-- Original: read-only, palabras cambiadas en amarillo -->
				<div class="flex flex-col gap-1.5">
					<p class="text-xs font-medium text-muted-foreground">Original</p>
					<div class="h-52 overflow-y-auto rounded-md border border-border bg-muted/30 px-3 py-2.5 text-sm leading-relaxed text-muted-foreground">
						{#each resaltarOriginal(textoClase, normalizacion?.correcciones ?? []) as seg}
							{#if seg.highlighted}<mark class="rounded bg-warning/40 px-0.5 text-muted-foreground">{seg.text}</mark>{:else}{seg.text}{/if}
						{/each}
					</div>
				</div>
				<!-- Interpretado: contenteditable con highlights, editable -->
				<div class="flex flex-col gap-1.5">
					<p class="text-xs font-medium text-muted-foreground">Interpretado</p>
					<div
						bind:this={interpretadoDiv}
						contenteditable="true"
						spellcheck="false"
						role="textbox"
						aria-multiline="true"
						aria-label="Texto interpretado, editable"
						class="h-52 overflow-y-auto rounded-md border border-input bg-background px-3 py-2.5 text-sm leading-relaxed focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
						oninput={(e) => { textoParaPropuesta = (e.target as HTMLElement).innerText; }}
					></div>
				</div>
				{#if errorAI}
					<div class="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
						{errorAI}
					</div>
				{/if}
			</div>
			<div class="flex justify-end gap-2 border-t border-border px-6 py-4">
				<Button variant="outline" onclick={() => { step = 'input'; errorAI = null; }} disabled={loadingAI}>
					← Volver
				</Button>
				<Button onclick={handleGenerarPropuesta} disabled={!textoParaPropuesta.trim() || loadingAI}>
					{#if loadingAI}
						<Loader2Icon class="mr-2 h-4 w-4 animate-spin" />
						{loadingLabel || 'Generando…'}
					{:else}
						Generar propuesta
					{/if}
				</Button>
			</div>
		{/if}

		<!-- Step 2: Review -->
		{#if step === 'review'}
			<div class="flex flex-1 flex-col gap-4 overflow-y-auto px-6 pb-2">

					<!-- Posiciones -->
				<section>
					<div class="mb-2 flex items-center justify-between">
						<h3 class="text-sm font-medium">
							Posiciones{#if posicionesDraft.length > 0} ({posicionesDraft.filter((p) => p.seleccionado).length}/{posicionesDraft.length}){/if}
						</h3>
						<button
							type="button"
							onclick={addPosicionManual}
							class="text-xs text-muted-foreground hover:text-foreground"
						>+ Añadir</button>
					</div>
					{#if posicionesDraft.length > 0}
						<div class="flex flex-col gap-2">
							{#each posicionesDraft as item, i}
								<div
									class="rounded-md border border-border p-3 transition-opacity {!item.seleccionado
										? 'opacity-50'
										: ''}"
								>
									<div class="mb-2 flex items-center gap-2">
										<input
											type="checkbox"
											bind:checked={posicionesDraft[i].seleccionado}
											class="h-4 w-4 accent-primary"
										/>
										<Input
											bind:value={posicionesDraft[i].nombreEditado}
											placeholder="Nombre de la posición"
											class="h-7 flex-1 text-sm"
										/>
									</div>
									<div class="flex gap-2">
										<Select.Root
											type="single"
											bind:value={posicionesDraft[i].categoriaEditada as string}
										>
											<Select.Trigger class="h-7 flex-1 text-xs">
												{CATEGORIAS.find((c) => c.value === item.categoriaEditada)?.label ??
													'Categoría'}
											</Select.Trigger>
											<Select.Content>
												{#each CATEGORIAS as cat}
													<Select.Item value={cat.value}>{cat.label}</Select.Item>
												{/each}
											</Select.Content>
										</Select.Root>
										<Select.Root
											type="single"
											value={item.tipoEditado ?? ''}
											onValueChange={(v) => {
												posicionesDraft[i].tipoEditado = v
													? (v as TipoRolPosicion)
													: undefined;
											}}
										>
											<Select.Trigger class="h-7 flex-1 text-xs">
												{TIPOS_ROL.find((t) => t.value === item.tipoEditado)?.label ??
													'Rol (opc.)'}
											</Select.Trigger>
											<Select.Content>
												<Select.Item value="">Sin rol</Select.Item>
												{#each TIPOS_ROL as t}
													<Select.Item value={t.value}>{t.label}</Select.Item>
												{/each}
											</Select.Content>
										</Select.Root>
									</div>
								</div>
							{/each}
						</div>
					{/if}
				</section>

				<!-- Sumisiones terminales -->
				<section>
					<div class="mb-2 flex items-center justify-between">
						<h3 class="text-sm font-medium">
							Sumisiones{#if sumisionesDraft.length > 0} ({sumisionesDraft.filter((s) => s.seleccionado).length}/{sumisionesDraft.length}){/if}
						</h3>
						<button
							type="button"
							onclick={addSumisionManual}
							class="text-xs text-muted-foreground hover:text-foreground"
						>+ Añadir</button>
					</div>
					{#if sumisionesDraft.length > 0}
						<div class="flex flex-col gap-2">
							{#each sumisionesDraft as item, i}
								<div
									class="flex items-center gap-2 rounded-md border border-border p-3 transition-opacity {!item.seleccionado
										? 'opacity-50'
										: ''}"
								>
									<input
										type="checkbox"
										bind:checked={sumisionesDraft[i].seleccionado}
										class="h-4 w-4 accent-primary"
									/>
									<Input
										bind:value={sumisionesDraft[i].nombreEditado}
										placeholder="Nombre de la sumisión"
										class="h-7 flex-1 text-sm"
									/>
								</div>
							{/each}
						</div>
					{/if}
				</section>

				<!-- Técnicas -->
				<section>
					<div class="mb-2 flex items-center justify-between">
						<h3 class="text-sm font-medium">
							Técnicas{#if tecnicasDraft.length > 0} ({tecnicasDraft.filter((t) => t.seleccionado).length}/{tecnicasDraft.length}){/if}
						</h3>
						<button
							type="button"
							onclick={addTecnicaManual}
							class="text-xs text-muted-foreground hover:text-foreground"
						>+ Añadir</button>
					</div>
					{#if tecnicasDraft.length > 0}
						<div class="flex flex-col gap-2">
							{#each tecnicasDraft as item, i}
								{@const canCreate = item.esManual
									? item.posicionOrigenNombre.trim() !== '' &&
										todasPosicionesDisponibles.some(
											(p) => p.toLowerCase() === item.posicionOrigenNombre.toLowerCase()
										) &&
										(item.tipo === 'sumision'
											? !!(
													item.sumisionDestinoNombre?.trim() &&
													todasSumisionesDisponibles.some(
														(s) =>
															s.toLowerCase() === item.sumisionDestinoNombre?.toLowerCase()
													)
												)
											: !!(
													item.posicionDestinoNombre?.trim() &&
													todasPosicionesDisponibles.some(
														(p) =>
															p.toLowerCase() === item.posicionDestinoNombre?.toLowerCase()
													)
												))
									: item.puedeCrearse}
								<div
									class="rounded-md border p-3 transition-opacity {!item.seleccionado
										? 'opacity-50'
										: ''} {!canCreate && !item.esManual
										? 'border-warning/50 bg-warning/5'
										: 'border-border'}"
								>
									{#if item.esManual}
										<!-- Card editable para técnica manual -->
										<div class="mb-2 flex items-center gap-2">
											<input
												type="checkbox"
												checked={item.seleccionado && canCreate}
												disabled={!canCreate}
												onchange={(e) => {
													tecnicasDraft[i].seleccionado = (e.target as HTMLInputElement).checked;
												}}
												class="h-4 w-4 accent-primary"
											/>
											<Input
												bind:value={tecnicasDraft[i].nombre}
												placeholder="Nombre de la técnica"
												class="h-7 flex-1 text-sm"
											/>
											<Select.Root
												type="single"
												value={item.tipo}
												onValueChange={(v) => {
													if (v) {
														tecnicasDraft[i].tipo = v as TipoTecnica;
														tecnicasDraft[i].posicionDestinoNombre = '';
														tecnicasDraft[i].sumisionDestinoNombre = undefined;
													}
												}}
											>
												<Select.Trigger class="h-7 w-28 text-xs">
													{TIPOS_TECNICA[item.tipo]}
												</Select.Trigger>
												<Select.Content>
													{#each Object.entries(TIPOS_TECNICA) as [val, label]}
														<Select.Item value={val}>{label}</Select.Item>
													{/each}
												</Select.Content>
											</Select.Root>
										</div>
										<div class="ml-6 flex items-center gap-1 text-xs text-muted-foreground">
											<Select.Root
												type="single"
												value={item.posicionOrigenNombre}
												onValueChange={(v) => { if (v) tecnicasDraft[i].posicionOrigenNombre = v; }}
											>
												<Select.Trigger class="h-6 flex-1 text-xs">
													{item.posicionOrigenNombre || 'Origen'}
												</Select.Trigger>
												<Select.Content>
													{#each todasPosicionesDisponibles as nombre}
														<Select.Item value={nombre}>{nombre}</Select.Item>
													{/each}
												</Select.Content>
											</Select.Root>
											<span>→</span>
											{#if item.tipo === 'sumision'}
												<Select.Root
													type="single"
													value={item.sumisionDestinoNombre ?? ''}
													onValueChange={(v) => { if (v) tecnicasDraft[i].sumisionDestinoNombre = v; }}
												>
													<Select.Trigger class="h-6 flex-1 text-xs">
														{item.sumisionDestinoNombre ? `🔴 ${item.sumisionDestinoNombre}` : 'Sumisión destino'}
													</Select.Trigger>
													<Select.Content>
														{#each todasSumisionesDisponibles as nombre}
															<Select.Item value={nombre}>🔴 {nombre}</Select.Item>
														{/each}
													</Select.Content>
												</Select.Root>
											{:else}
												<Select.Root
													type="single"
													value={item.posicionDestinoNombre ?? ''}
													onValueChange={(v) => { if (v) tecnicasDraft[i].posicionDestinoNombre = v; }}
												>
													<Select.Trigger class="h-6 flex-1 text-xs">
														{item.posicionDestinoNombre || 'Destino'}
													</Select.Trigger>
													<Select.Content>
														{#each todasPosicionesDisponibles as nombre}
															<Select.Item value={nombre}>{nombre}</Select.Item>
														{/each}
													</Select.Content>
												</Select.Root>
											{/if}
										</div>
									{:else}
										<!-- Card de técnica generada por AI -->
										<div class="mb-1 flex items-center gap-2">
											<input
												type="checkbox"
												bind:checked={tecnicasDraft[i].seleccionado}
												disabled={!canCreate}
												class="h-4 w-4 accent-primary"
											/>
											<span class="flex-1 text-sm font-medium">{item.nombre}</span>
											<span class="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
												{TIPOS_TECNICA[item.tipo]}
											</span>
										</div>
										<p class="ml-6 text-xs text-muted-foreground">
											{item.posicionOrigenNombre}
											→
											{#if item.tipo === 'sumision'}
												🔴 {item.sumisionDestinoNombre ?? '?'}
											{:else}
												{item.posicionDestinoNombre ?? '?'}
											{/if}
										</p>
										{#if !canCreate}
											<p class="ml-6 mt-1 text-xs text-warning">
												⚠ Origen o destino no resuelto — no se puede insertar
											</p>
										{/if}
									{/if}
								</div>
							{/each}
						</div>
					{/if}
				</section>

				<!-- Refinado con IA -->
				<section class="border-t border-border pt-4">
					<h3 class="mb-2 text-sm font-medium text-muted-foreground">Refinar con IA</h3>
					<div class="flex flex-col gap-2">
						<Textarea
							bind:value={textoRefinamiento}
							placeholder="Ej: Electric Chair debería ser categoría 'otro', la Transición a Seat Belt viene del Dogfight overhook no del underhook..."
							class="min-h-16 resize-none text-sm"
							disabled={loadingAI}
						/>
						{#if errorAI}
							<div class="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
								{errorAI}
							</div>
						{/if}
						<Button
							variant="outline"
							onclick={handleRefinar}
							disabled={!textoRefinamiento.trim() || loadingAI}
							class="self-end"
						>
							{#if loadingAI}
								<Loader2Icon class="mr-2 h-4 w-4 animate-spin" />
								Refinando…
							{:else}
								Refinar propuesta
							{/if}
						</Button>
					</div>
				</section>

				{#if errorInsert}
					<div
						class="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
					>
						{errorInsert}
					</div>
				{/if}
			</div>

			<div class="flex justify-between gap-2 border-t border-border px-6 py-4">
				<Button variant="outline" onclick={() => { step = 'input'; errorAI = null; }}>
					← Volver
				</Button>
				<Button onclick={() => (step = 'detalles')} disabled={!haySeleccionados}>
					Continuar →
				</Button>
			</div>
		{/if}

		<!-- Step 3: Detalles (opcional) -->
		{#if step === 'detalles'}
			{@const tecnicasSeleccionadas = tecnicasDraft.filter((t) => t.seleccionado)}
			{@const sumisionesSeleccionadas = sumisionesDraft.filter((s) => s.seleccionado)}
			<div class="flex flex-1 flex-col gap-4 overflow-y-auto px-6 pb-2">
				<p class="text-xs text-muted-foreground">
					Opcional — añade notas sobre ejecución, setup o puntos clave. Puedes dejarlo vacío y completarlo después.
				</p>

				{#if tecnicasSeleccionadas.length > 0}
					<section class="space-y-3">
						<h3 class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Técnicas</h3>
						{#each tecnicasDraft as t, i (i)}
							{#if t.seleccionado}
								<div class="space-y-1">
									<p class="text-sm font-medium">{t.nombre}{t.variante ? ` (${t.variante})` : ''} <span class="text-xs text-muted-foreground">desde {t.posicionOrigenNombre}</span></p>
									<Textarea
										bind:value={t.detalles}
										placeholder="Detalles de ejecución, setup, puntos clave…"
										rows={2}
										class="resize-none text-sm"
									/>
								</div>
							{/if}
						{/each}
					</section>
				{/if}

				{#if sumisionesSeleccionadas.length > 0}
					<section class="space-y-3">
						<h3 class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Sumisiones</h3>
						{#each sumisionesDraft as s, i (i)}
							{#if s.seleccionado}
								<div class="space-y-1">
									<p class="text-sm font-medium">{s.nombreEditado || s.nombre}</p>
									<Textarea
										bind:value={s.notas}
										placeholder="Notas…"
										rows={2}
										class="resize-none text-sm"
									/>
								</div>
							{/if}
						{/each}
					</section>
				{/if}

				{#if tecnicasSeleccionadas.length === 0 && sumisionesSeleccionadas.length === 0}
					<p class="text-sm text-muted-foreground">No hay técnicas ni sumisiones seleccionadas.</p>
				{/if}

				{#if errorInsert}
					<div class="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
						{errorInsert}
					</div>
				{/if}
			</div>

			<div class="flex justify-between gap-2 border-t border-border px-6 py-4">
				<Button variant="outline" onclick={() => (step = 'review')}>
					← Volver
				</Button>
				<Button onclick={handleConfirmar} disabled={inserting}>
					{#if inserting}
						<Loader2Icon class="mr-2 h-4 w-4 animate-spin" />
						Insertando…
					{:else}
						Confirmar e insertar
					{/if}
				</Button>
			</div>
		{/if}
	</Dialog.Content>
</Dialog.Root>

<AlertDialog.Root
	open={confirmDescartarOpen}
	onOpenChange={(v) => (confirmDescartarOpen = v)}
>
	<AlertDialog.Content>
		<AlertDialog.Header>
			<AlertDialog.Title>¿Descartar la importación?</AlertDialog.Title>
			<AlertDialog.Description>
				Perderás el texto introducido y la propuesta de la IA. Esta acción no se puede deshacer.
			</AlertDialog.Description>
		</AlertDialog.Header>
		<AlertDialog.Footer>
			<AlertDialog.Cancel>Cancelar</AlertDialog.Cancel>
			<AlertDialog.Action
				onclick={handleClose}
				class={buttonVariants({ variant: 'destructive' })}
			>
				Descartar
			</AlertDialog.Action>
		</AlertDialog.Footer>
	</AlertDialog.Content>
</AlertDialog.Root>
