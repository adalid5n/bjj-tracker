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
	import type { CategoriaPosicion, Disciplina, TipoRolPosicion, TipoTecnica } from '$lib/types';
	import Chips from '$lib/components/Chips.svelte';
	import { settings } from '$lib/settings.svelte';
	import type { ImportacionBorrador } from '$lib/importacion-borrador.svelte';

	/**
	 * T-3.it7: el diálogo es una VISTA del borrador (`ImportacionBorrador`,
	 * instancia de `/mapa`). Abrir/cerrar el `Dialog` no resetea nada;
	 * solo "Descartar"/"Cerrar" del aviso de cierre llama a `reset()`.
	 */
	let {
		open = $bindable(false),
		borrador: b,
		onClose,
		onVerEnMapa
	}: {
		open?: boolean;
		borrador: ImportacionBorrador;
		onClose?: () => void;
		/**
		 * T-3.it7: "Ver en el mapa" en "Añadir detalles". La página cierra
		 * fichas y diálogo y entra en la vista previa (nada se escribe).
		 */
		onVerEnMapa?: () => void;
	} = $props();

	let confirmDescartarOpen = $state(false);

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

	const OPCIONES_DISCIPLINA: { value: Disciplina; label: string }[] = [
		{ value: 'bjj', label: 'BJJ' },
		{ value: 'grappling', label: 'Grappling' },
		{ value: 'ambos', label: 'Ambos' }
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

	// Estilos de las marcas del texto interpretado (también en la leyenda).
	const MARK_CORREGIDO =
		'border-radius:2px;background-color:color-mix(in srgb,var(--color-warning,#f59e0b) 35%,transparent);padding:0 2px;color:inherit';
	const MARK_DUDOSO =
		'border-radius:2px;background-color:color-mix(in srgb,var(--color-destructive,#ef4444) 20%,transparent);padding:0 2px;text-decoration:underline dotted;color:inherit';

	let interpretadoDiv = $state<HTMLElement | null>(null);

	$effect(() => {
		if (!interpretadoDiv || !b.normalizacion) return;
		const html = parseSegmentos(b.normalizacion.textoConMarcas)
			.map((seg) => {
				if (seg.kind === 'corrected')
					return `<mark style="${MARK_CORREGIDO}">${escapeHtml(seg.text)}</mark>`;
				if (seg.kind === 'uncertain')
					return `<mark style="${MARK_DUDOSO}">${escapeHtml(seg.text)}</mark>`;
				return escapeHtml(seg.text);
			})
			.join('');
		interpretadoDiv.innerHTML = html;
		b.textoParaPropuesta = interpretadoDiv.innerText;
	});

	function pararGrabacion() {
		deberiaGrabar = false;
		recognition?.stop();
		grabando = false;
	}

	/** Cierre explícito (Descartar / Cerrar): el borrador se vacía. */
	function handleClose() {
		pararGrabacion();
		confirmDescartarOpen = false;
		open = false;
		onClose?.();
		b.reset();
	}

	function intentarCerrar() {
		if (!open) return;
		if (b.tieneDatos) {
			confirmDescartarOpen = true;
		} else {
			handleClose();
		}
	}

	function toggleGrabacion() {
		if (grabando) {
			pararGrabacion();
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
			if (chunk.trim()) b.textoClase = b.textoClase ? b.textoClase + ' ' + chunk.trim() : chunk.trim();
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
				b.errorAI = 'Error de micrófono: ' + e.error;
			}
		};
		deberiaGrabar = true;
		recognition.start();
		grabando = true;
	}
</script>

<!--
	T-6.it8: selectores de origen/destino (técnica manual o técnica de la IA
	sin resolver). Select de bits-ui sin campo de búsqueda: no abre el
	teclado del móvil. Valor = referencia codificada (`d:<uid>` / `c:<nombre>`).
-->
{#snippet selectoresExtremos(i: number)}
	{@const item = b.tecnicasDraft[i]}
	{@const origen = b.nombreOrigen(item)}
	{@const destino = b.nombreDestino(item)}
	<div class="ml-6 flex items-center gap-1 text-xs text-muted-foreground">
		<Select.Root
			type="single"
			value={b.valorRef(item.origenRef)}
			onValueChange={(v) => { if (v) b.tecnicasDraft[i].origenRef = b.refDeValor(v); }}
		>
			<Select.Trigger class="h-6 flex-1 text-xs" aria-label="Posición de origen">
				{origen || 'Origen'}
			</Select.Trigger>
			<Select.Content>
				{#each b.opcionesPosicion as op (op.value)}
					<Select.Item value={op.value}>{op.label}</Select.Item>
				{/each}
			</Select.Content>
		</Select.Root>
		<span>→</span>
		<Select.Root
			type="single"
			value={b.valorRef(item.destinoRef)}
			onValueChange={(v) => { if (v) b.tecnicasDraft[i].destinoRef = b.refDeValor(v); }}
		>
			<Select.Trigger
				class="h-6 flex-1 text-xs"
				aria-label={item.tipo === 'sumision' ? 'Sumisión destino' : 'Posición de destino'}
			>
				{#if item.tipo === 'sumision'}
					{destino ? `🔴 ${destino}` : 'Sumisión destino'}
				{:else}
					{destino || 'Destino'}
				{/if}
			</Select.Trigger>
			<Select.Content>
				{#each item.tipo === 'sumision' ? b.opcionesSumision : b.opcionesPosicion as op (op.value)}
					<Select.Item value={op.value}>{item.tipo === 'sumision' ? '🔴 ' : ''}{op.label}</Select.Item>
				{/each}
			</Select.Content>
		</Select.Root>
	</div>
{/snippet}

<Dialog.Root {open} onOpenChange={(v) => { if (!v) intentarCerrar(); }}>
	<Dialog.Content
		class="flex max-h-[90vh] flex-col gap-0 p-0 sm:max-w-lg"
		onInteractOutside={(e) => { e.preventDefault(); intentarCerrar(); }}
		onEscapeKeydown={(e) => { e.preventDefault(); intentarCerrar(); }}
	>
		<Dialog.Header class="px-6 pt-6 pb-4">
			<Dialog.Title>
				{b.paso === 'input' ? '✨ Importar de clase' : b.paso === 'normalizado' ? 'Texto interpretado' : b.paso === 'review' ? 'Revisar propuesta' : 'Añadir detalles'}
			</Dialog.Title>
			{#if b.resumenAI && b.paso === 'review'}
				<Dialog.Description class="text-sm text-muted-foreground">
					{b.resumenAI}
				</Dialog.Description>
			{/if}
		</Dialog.Header>

		<!-- Step 1: Input -->
		{#if b.paso === 'input'}
			<div class="flex flex-1 flex-col gap-4 overflow-y-auto px-6 pb-2">
				<div class="flex flex-col gap-1.5">
					<p class="text-xs font-medium text-muted-foreground">Disciplina</p>
					<Chips
						options={OPCIONES_DISCIPLINA}
						value={b.disciplina}
						onChange={(v) => {
							if (v) b.disciplina = v as Disciplina;
						}}
						ariaLabel="Disciplina de la importación"
						required
					/>
				</div>
				<div class="relative">
					<Textarea
						bind:value={b.textoClase}
						placeholder="Ej: Hoy trabajamos el toreando pass desde de pie hacia side control, el knee slide hacia half guard top, y el armbar desde mount..."
						class="min-h-32 resize-none pr-10"
						disabled={b.loadingAI}
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
				{#if b.errorAI}
					<div
						class="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
					>
						{b.errorAI}
					</div>
				{/if}
			</div>
			<div class="flex justify-end gap-2 border-t border-border px-6 py-4">
				<Button variant="outline" onclick={intentarCerrar}>Cancelar</Button>
				<Button onclick={() => b.normalizar()} disabled={!b.textoClase.trim() || b.loadingAI}>
					{#if b.loadingAI}
						<Loader2Icon class="mr-2 h-4 w-4 animate-spin" />
						{b.loadingLabel || 'Analizando…'}
					{:else}
						Analizar clase
					{/if}
				</Button>
			</div>
		{/if}

		<!-- Step 1b: Texto normalizado con correcciones resaltadas -->
		{#if b.paso === 'normalizado'}
			<div class="flex flex-1 flex-col gap-3 overflow-y-auto px-6 pb-2">
				<p class="text-xs text-muted-foreground">
					<!-- T-6.it8: muestras con el mismo estilo que las marcas del texto, sin nombrar colores. -->
					<mark style={MARK_CORREGIDO}>corregido</mark> ·
					<mark style={MARK_DUDOSO}>dudoso, revisa</mark>. Edita el texto interpretado si es necesario.
				</p>
				<!-- Original: read-only, palabras cambiadas en amarillo -->
				<div class="flex flex-col gap-1.5">
					<p class="text-xs font-medium text-muted-foreground">Original</p>
					<div class="h-52 overflow-y-auto rounded-md border border-border bg-muted/30 px-3 py-2.5 text-sm leading-relaxed text-muted-foreground">
						{#each resaltarOriginal(b.textoClase, b.normalizacion?.correcciones ?? []) as seg}
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
						oninput={(e) => { b.textoParaPropuesta = (e.target as HTMLElement).innerText; }}
					></div>
				</div>
				{#if b.errorAI}
					<div class="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
						{b.errorAI}
					</div>
				{/if}
			</div>
			<div class="flex justify-end gap-2 border-t border-border px-6 py-4">
				<Button variant="outline" onclick={() => { b.paso = 'input'; b.errorAI = null; }} disabled={b.loadingAI}>
					← Volver
				</Button>
				<Button onclick={() => b.generarPropuesta()} disabled={!b.textoParaPropuesta.trim() || b.loadingAI}>
					{#if b.loadingAI}
						<Loader2Icon class="mr-2 h-4 w-4 animate-spin" />
						{b.loadingLabel || 'Generando…'}
					{:else}
						Generar propuesta
					{/if}
				</Button>
			</div>
		{/if}

		<!-- Step 2: Review -->
		{#if b.paso === 'review'}
			<div class="flex flex-1 flex-col gap-4 overflow-y-auto px-6 pb-2">

					<!-- Posiciones -->
				<section>
					<div class="mb-2 flex items-center justify-between">
						<h3 class="text-sm font-medium">
							Posiciones{#if b.posicionesDraft.length > 0} ({b.posicionesDraft.filter((p) => p.seleccionado).length}/{b.posicionesDraft.length}){/if}
						</h3>
						<button
							type="button"
							onclick={() => b.addPosicionManual()}
							class="text-xs text-muted-foreground hover:text-foreground"
						>+ Añadir</button>
					</div>
					{#if b.posicionesDraft.length > 0}
						<div class="flex flex-col gap-2">
							{#each b.posicionesDraft as item, i}
								<div
									class="rounded-md border border-border p-3 transition-opacity {!item.seleccionado
										? 'opacity-50'
										: ''}"
								>
									<div class="mb-2 flex items-center gap-2">
										<input
											type="checkbox"
											bind:checked={b.posicionesDraft[i].seleccionado}
											class="h-4 w-4 accent-primary"
										/>
										<Input
											bind:value={b.posicionesDraft[i].nombreEditado}
											placeholder="Nombre de la posición"
											class="h-7 flex-1 text-sm"
										/>
									</div>
									<div class="flex gap-2">
										<Select.Root
											type="single"
											bind:value={b.posicionesDraft[i].categoriaEditada as string}
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
												b.posicionesDraft[i].tipoEditado = v
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
									<!-- T-4.it7: dónde se crea en una importación "Ambos". -->
									{#if b.indicadorLados('pos', item.nombreEditado)}
										<p class="mt-2 text-xs text-muted-foreground">
											{b.indicadorLados('pos', item.nombreEditado)}
										</p>
									{/if}
								</div>
							{/each}
						</div>
					{/if}
				</section>

				<!-- Sumisiones terminales -->
				<section>
					<div class="mb-2 flex items-center justify-between">
						<h3 class="text-sm font-medium">
							Sumisiones{#if b.sumisionesDraft.length > 0} ({b.sumisionesDraft.filter((s) => s.seleccionado).length}/{b.sumisionesDraft.length}){/if}
						</h3>
						<button
							type="button"
							onclick={() => b.addSumisionManual()}
							class="text-xs text-muted-foreground hover:text-foreground"
						>+ Añadir</button>
					</div>
					{#if b.sumisionesDraft.length > 0}
						<div class="flex flex-col gap-2">
							{#each b.sumisionesDraft as item, i}
								<div
									class="flex items-center gap-2 rounded-md border border-border p-3 transition-opacity {!item.seleccionado
										? 'opacity-50'
										: ''}"
								>
									<input
										type="checkbox"
										bind:checked={b.sumisionesDraft[i].seleccionado}
										class="h-4 w-4 accent-primary"
									/>
									<div class="flex flex-1 flex-col gap-1">
										<Input
											bind:value={b.sumisionesDraft[i].nombreEditado}
											placeholder="Nombre de la sumisión"
											class="h-7 text-sm"
										/>
										<!-- T-4.it7: dónde se crea en una importación "Ambos". -->
										{#if b.indicadorLados('sum', item.nombreEditado)}
											<p class="text-xs text-muted-foreground">
												{b.indicadorLados('sum', item.nombreEditado)}
											</p>
										{/if}
									</div>
								</div>
							{/each}
						</div>
					{/if}
				</section>

				<!-- Técnicas -->
				<section>
					<div class="mb-2 flex items-center justify-between">
						<h3 class="text-sm font-medium">
							Técnicas{#if b.tecnicasDraft.length > 0} ({b.tecnicasResueltas.filter((t) => t.seleccionado).length}/{b.tecnicasDraft.length}){/if}
						</h3>
						<button
							type="button"
							onclick={() => b.addTecnicaManual()}
							class="text-xs text-muted-foreground hover:text-foreground"
						>+ Añadir</button>
					</div>
					{#if b.tecnicasDraft.length > 0}
						<div class="flex flex-col gap-2">
							{#each b.tecnicasDraft as item, i}
								<!-- T-6.it8: validez en vivo para todas las técnicas (extremos por referencia). -->
								{@const canCreate = b.tecnicaValida(item)}
								<div
									class="rounded-md border p-3 transition-opacity {!canCreate && !item.esManual
										? 'border-warning/50 bg-warning/5'
										: `border-border ${item.seleccionado && canCreate ? '' : 'opacity-50'}`}"
								>
									{#if item.esManual}
										<!-- Card editable para técnica manual -->
										<div class="mb-2 flex items-center gap-2">
											<input
												type="checkbox"
												checked={item.seleccionado && canCreate}
												disabled={!canCreate}
												onchange={(e) => {
													b.tecnicasDraft[i].seleccionado = (e.target as HTMLInputElement).checked;
												}}
												class="h-4 w-4 accent-primary"
											/>
											<Input
												bind:value={b.tecnicasDraft[i].nombre}
												placeholder="Nombre de la técnica"
												class="h-7 flex-1 text-sm"
											/>
											<Select.Root
												type="single"
												value={item.tipo}
												onValueChange={(v) => {
													if (v) {
														b.tecnicasDraft[i].tipo = v as TipoTecnica;
														b.tecnicasDraft[i].destinoRef = null;
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
										{@render selectoresExtremos(i)}
									{:else}
										<!-- Card de técnica generada por AI -->
										<div class="mb-1 flex items-center gap-2">
											<input
												type="checkbox"
												checked={item.seleccionado && canCreate}
												disabled={!canCreate}
												onchange={(e) => {
													b.tecnicasDraft[i].seleccionado = (e.target as HTMLInputElement).checked;
												}}
												class="h-4 w-4 accent-primary"
											/>
											<span class="flex-1 text-sm font-medium">{item.nombre}</span>
											<span class="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
												{TIPOS_TECNICA[item.tipo]}
											</span>
										</div>
										{#if canCreate}
											<p class="ml-6 text-xs text-muted-foreground">
												{b.nombreOrigen(item)}
												→
												{#if item.tipo === 'sumision'}🔴 {/if}{b.nombreDestino(item)}
											</p>
										{:else}
											<p class="ml-6 mb-2 text-xs text-warning">
												⚠ Origen o destino no resuelto — elige dónde empieza y dónde acaba
												{#if item.origenTexto || item.destinoTexto}
													<span class="text-muted-foreground">
														(propuesto: {item.origenTexto || '?'} → {item.destinoTexto || '?'})
													</span>
												{/if}
											</p>
											{@render selectoresExtremos(i)}
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
							bind:value={b.textoRefinamiento}
							placeholder="Ej: Electric Chair debería ser categoría 'otro', la Transición a Seat Belt viene del Dogfight overhook no del underhook..."
							class="min-h-16 resize-none text-sm"
							disabled={b.loadingAI}
						/>
						{#if b.errorAI}
							<div class="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
								{b.errorAI}
							</div>
						{/if}
						<Button
							variant="outline"
							onclick={() => b.refinar()}
							disabled={!b.textoRefinamiento.trim() || b.loadingAI}
							class="self-end"
						>
							{#if b.loadingAI}
								<Loader2Icon class="mr-2 h-4 w-4 animate-spin" />
								Refinando…
							{:else}
								Refinar propuesta
							{/if}
						</Button>
					</div>
				</section>

				{#if b.errorInsert}
					<div
						class="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
					>
						{b.errorInsert}
					</div>
				{/if}
			</div>

			<div class="flex justify-between gap-2 border-t border-border px-6 py-4">
				<Button variant="outline" onclick={() => { b.paso = 'input'; b.errorAI = null; }}>
					← Volver
				</Button>
				<Button onclick={() => (b.paso = 'detalles')} disabled={!b.haySeleccionados}>
					Continuar →
				</Button>
			</div>
		{/if}

		<!-- Step 3: Detalles (opcional) -->
		{#if b.paso === 'detalles'}
			{@const tecnicasSeleccionadas = b.tecnicasResueltas.filter((t) => t.seleccionado)}
			{@const sumisionesSeleccionadas = b.sumisionesDraft.filter((s) => s.seleccionado)}
			<div class="flex flex-1 flex-col gap-4 overflow-y-auto px-6 pb-2">
				<p class="text-xs text-muted-foreground">
					Opcional — añade notas sobre ejecución, setup o puntos clave. Puedes dejarlo vacío y completarlo después.
				</p>

				{#if tecnicasSeleccionadas.length > 0}
					<section class="space-y-3">
						<h3 class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Técnicas</h3>
						{#each b.tecnicasDraft as t, i (i)}
							{#if t.seleccionado && b.tecnicaValida(t)}
								<div class="space-y-1">
									<p class="text-sm font-medium">{t.nombre}{t.variante ? ` (${t.variante})` : ''} <span class="text-xs text-muted-foreground">desde {b.nombreOrigen(t)}</span></p>
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
						{#each b.sumisionesDraft as s, i (i)}
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

				{#if b.errorInsert}
					<div class="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
						{b.errorInsert}
					</div>
				{/if}
			</div>

			<div class="flex justify-between gap-2 border-t border-border px-6 py-4">
				<Button variant="outline" onclick={() => (b.paso = 'review')}>
					← Volver
				</Button>
				<Button onclick={() => onVerEnMapa?.()} disabled={b.inserting}>
					Ver en el mapa
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
			{#if b.importacionId}
				<AlertDialog.Title>¿Cerrar? La importación queda guardada en el historial</AlertDialog.Title>
				<AlertDialog.Description>
					Podrás consultarla o reintentarla desde el historial de importaciones del mapa.
				</AlertDialog.Description>
			{:else}
				<AlertDialog.Title>¿Descartar la importación?</AlertDialog.Title>
				<AlertDialog.Description>
					Perderás el texto introducido y la propuesta de la IA. Esta acción no se puede deshacer.
				</AlertDialog.Description>
			{/if}
		</AlertDialog.Header>
		<AlertDialog.Footer>
			<AlertDialog.Cancel>Cancelar</AlertDialog.Cancel>
			{#if b.importacionId}
				<AlertDialog.Action onclick={handleClose}>Cerrar</AlertDialog.Action>
			{:else}
				<AlertDialog.Action
					onclick={handleClose}
					class={buttonVariants({ variant: 'destructive' })}
				>
					Descartar
				</AlertDialog.Action>
			{/if}
		</AlertDialog.Footer>
	</AlertDialog.Content>
</AlertDialog.Root>
