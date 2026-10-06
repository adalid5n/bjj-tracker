<script lang="ts">
	/**
	 * Panel del historial de importaciones de clase (T-2.it7).
	 *
	 * - Contenedor: Sheet lateral derecho en desktop (≥768px) e inferior
	 *   (50dvh) en móvil, mismas clases que las fichas de `MapaModalHost`.
	 * - Lista: Accordion `type="single"` (una tarjeta abierta a la vez),
	 *   más recientes primero. Plegada = título + fecha + estado.
	 * - Desplegada: bloques copiables "Texto" y "Aceptado" (este solo en
	 *   estado Importada), "Reintentar" y "Borrar" (con confirmación).
	 *
	 * Sin state compartido: la lista se carga al abrir el panel.
	 */
	import * as Sheet from '$lib/components/ui/sheet';
	import * as Accordion from '$lib/components/ui/accordion';
	import * as AlertDialog from '$lib/components/ui/alert-dialog';
	import { Button, buttonVariants } from '$lib/components/ui/button';
	import CopyIcon from '@lucide/svelte/icons/copy';
	import RotateCcwIcon from '@lucide/svelte/icons/rotate-ccw';
	import Trash2Icon from '@lucide/svelte/icons/trash-2';
	import { useMediaQuery } from '$lib/hooks/use-media.svelte';
	import {
		listImportaciones,
		deleteImportacion,
		parseAceptado,
		formatAceptadoLegible,
		type EstadoImportacion,
		type ImportacionRow
	} from '$lib/importaciones';

	let {
		open = $bindable(false),
		onReintentar
	}: {
		open?: boolean;
		onReintentar?: (entrada: { id: string; texto: string }) => void;
	} = $props();

	const desktopQuery = useMediaQuery('(min-width: 768px)');

	let entradas = $state<ImportacionRow[]>([]);
	let cargando = $state(false);
	let errorCarga = $state<string | null>(null);
	let abierta = $state<string>('');
	let copiado = $state<string | null>(null);
	let errorCopia = $state<string | null>(null);
	let pendienteBorrar = $state<ImportacionRow | null>(null);
	let copiadoTimer: ReturnType<typeof setTimeout> | null = null;

	const ESTADO_LABEL: Record<EstadoImportacion, string> = {
		importada: 'Importada',
		sin_terminar: 'Sin terminar',
		fallo: 'Falló'
	};

	const ESTADO_CLASES: Record<EstadoImportacion, string> = {
		importada: 'bg-success/15 text-success',
		sin_terminar: 'bg-muted text-muted-foreground',
		fallo: 'bg-destructive/15 text-destructive'
	};

	const fechaFmt = new Intl.DateTimeFormat('es-ES', {
		day: 'numeric',
		month: 'short',
		year: 'numeric',
		hour: '2-digit',
		minute: '2-digit'
	});

	function formatFecha(iso: string): string {
		const d = new Date(iso);
		return Number.isNaN(d.getTime()) ? iso : fechaFmt.format(d);
	}

	async function cargar() {
		cargando = true;
		errorCarga = null;
		try {
			entradas = await listImportaciones();
		} catch (e) {
			errorCarga = e instanceof Error ? e.message : String(e);
		} finally {
			cargando = false;
		}
	}

	// Recarga la lista cada vez que se abre el panel.
	$effect(() => {
		if (open) {
			abierta = '';
			copiado = null;
			errorCopia = null;
			cargar();
		}
	});

	async function copiar(clave: string, contenido: string) {
		errorCopia = null;
		try {
			await navigator.clipboard.writeText(contenido);
			copiado = clave;
			if (copiadoTimer) clearTimeout(copiadoTimer);
			copiadoTimer = setTimeout(() => {
				if (copiado === clave) copiado = null;
			}, 2000);
		} catch {
			copiado = null;
			errorCopia = clave;
		}
	}

	async function confirmarBorrado() {
		const entrada = pendienteBorrar;
		pendienteBorrar = null;
		if (!entrada) return;
		try {
			await deleteImportacion(entrada.id);
			entradas = entradas.filter((e) => e.id !== entrada.id);
			if (abierta === entrada.id) abierta = '';
		} catch (e) {
			errorCarga = e instanceof Error ? e.message : String(e);
		}
	}
</script>

{#snippet botonCopiar(clave: string, contenido: string)}
	<Button
		variant="ghost"
		size="sm"
		class="h-7 px-2 text-xs"
		onclick={() => copiar(clave, contenido)}
		aria-label="Copiar"
	>
		{#if copiado === clave}
			Copiado ✓
		{:else if errorCopia === clave}
			No se pudo copiar
		{:else}
			<CopyIcon class="size-3.5" />
			Copiar
		{/if}
	</Button>
{/snippet}

{#snippet contenido()}
	<Sheet.Header class="p-0 pr-10">
		<Sheet.Title>Historial de importaciones</Sheet.Title>
		<Sheet.Description class="text-xs">
			Cada clase que analizas queda guardada aquí.
		</Sheet.Description>
	</Sheet.Header>

	<div class="-mx-4 min-h-0 flex-1 overflow-y-auto px-4">
		{#if cargando && entradas.length === 0}
			<p class="text-sm text-muted-foreground">Cargando…</p>
		{:else if errorCarga}
			<p class="text-sm text-destructive">{errorCarga}</p>
		{:else if entradas.length === 0}
			<p class="rounded border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
				Aún no hay importaciones. Usa "Nuevo" → "Importar de clase" para analizar tu primera clase.
			</p>
		{:else}
			<Accordion.Root type="single" bind:value={abierta}>
				{#each entradas as entrada (entrada.id)}
					{@const aceptado =
						entrada.estado === 'importada' ? parseAceptado(entrada.aceptado_json) : null}
					<Accordion.Item value={entrada.id}>
						<Accordion.Trigger class="items-center py-3 hover:no-underline">
							<div class="flex min-w-0 flex-1 flex-col gap-1">
								<span class="truncate font-medium">{entrada.titulo}</span>
								<span class="flex items-center gap-2 text-xs font-normal text-muted-foreground">
									<span>{formatFecha(entrada.created_at)}</span>
									<span
										class="rounded px-1.5 py-0.5 text-[11px] font-medium {ESTADO_CLASES[
											entrada.estado
										]}"
									>
										{ESTADO_LABEL[entrada.estado]}
									</span>
								</span>
							</div>
						</Accordion.Trigger>
						<Accordion.Content class="flex flex-col gap-3">
							{#if entrada.estado === 'fallo' && entrada.error}
								<p class="text-xs text-destructive">{entrada.error}</p>
							{/if}

							<section class="flex flex-col gap-1">
								<div class="flex items-center justify-between">
									<h4 class="text-xs font-medium text-muted-foreground">Texto</h4>
									{@render botonCopiar(`${entrada.id}:texto`, entrada.texto)}
								</div>
								<pre
									class="max-h-48 overflow-y-auto rounded-md border border-border bg-muted/30 px-3 py-2 font-sans text-sm whitespace-pre-wrap">{entrada.texto}</pre>
							</section>

							{#if entrada.estado === 'importada'}
								{@const legible = formatAceptadoLegible(
									aceptado ?? { posiciones: [], sumisiones: [], tecnicas: [] }
								)}
								<section class="flex flex-col gap-1">
									<div class="flex items-center justify-between">
										<h4 class="text-xs font-medium text-muted-foreground">Aceptado</h4>
										{@render botonCopiar(`${entrada.id}:aceptado`, legible)}
									</div>
									<pre
										class="max-h-48 overflow-y-auto rounded-md border border-border bg-muted/30 px-3 py-2 font-sans text-sm whitespace-pre-wrap">{legible}</pre>
								</section>
							{/if}

							<div class="flex justify-end gap-2">
								<Button
									variant="ghost"
									size="sm"
									class="text-destructive hover:text-destructive"
									onclick={() => (pendienteBorrar = entrada)}
								>
									<Trash2Icon class="size-4" />
									Borrar
								</Button>
								<Button
									variant="outline"
									size="sm"
									onclick={() => onReintentar?.({ id: entrada.id, texto: entrada.texto })}
								>
									<RotateCcwIcon class="size-4" />
									Reintentar
								</Button>
							</div>
						</Accordion.Content>
					</Accordion.Item>
				{/each}
			</Accordion.Root>
		{/if}
	</div>
{/snippet}

{#if desktopQuery.matches}
	<Sheet.Root bind:open>
		<Sheet.Content
			side="right"
			class="top-14! bottom-14! h-auto! flex w-full flex-col p-4 sm:max-w-md"
			onOpenAutoFocus={(e) => e.preventDefault()}
		>
			{@render contenido()}
		</Sheet.Content>
	</Sheet.Root>
{:else}
	<Sheet.Root bind:open>
		<Sheet.Content
			side="bottom"
			class="bottom-14! h-[50dvh]! flex flex-col p-4"
			onOpenAutoFocus={(e) => e.preventDefault()}
		>
			{@render contenido()}
		</Sheet.Content>
	</Sheet.Root>
{/if}

<AlertDialog.Root
	open={pendienteBorrar !== null}
	onOpenChange={(v) => {
		if (!v) pendienteBorrar = null;
	}}
>
	<AlertDialog.Content>
		<AlertDialog.Header>
			<AlertDialog.Title>¿Borrar esta importación del historial?</AlertDialog.Title>
			<AlertDialog.Description>
				Se borra solo la entrada del historial. Las posiciones, sumisiones y técnicas que creó
				siguen en el mapa.
			</AlertDialog.Description>
		</AlertDialog.Header>
		<AlertDialog.Footer>
			<AlertDialog.Cancel>Cancelar</AlertDialog.Cancel>
			<AlertDialog.Action
				onclick={confirmarBorrado}
				class={buttonVariants({ variant: 'destructive' })}
			>
				Borrar
			</AlertDialog.Action>
		</AlertDialog.Footer>
	</AlertDialog.Content>
</AlertDialog.Root>
