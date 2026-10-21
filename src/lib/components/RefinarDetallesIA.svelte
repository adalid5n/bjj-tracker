<script lang="ts">
	/**
	 * T-8.it8 — "Refinar con IA" bajo el campo Detalles de una técnica.
	 *
	 * Envía el texto actual a Groq (`refinarDetallesTecnica`) y enseña el
	 * resultado en un bloque de vista previa ANTES de tocar el campo:
	 * "Aceptar" lo sustituye, "Descartar" lo tira. El original no cambia
	 * hasta aceptar. Si el usuario edita el campo mientras hay vista
	 * previa, ésta deja de ser válida y se oculta (se refinó otro texto).
	 */
	import { onMount } from 'svelte';
	import Loader2Icon from '@lucide/svelte/icons/loader-2';
	import SparklesIcon from '@lucide/svelte/icons/sparkles';
	import { Button } from '$lib/components/ui/button';
	import { hayClaveIA, refinarDetallesTecnica, type ContextoTecnicaIA } from '$lib/ai';

	let {
		texto,
		contexto,
		onAceptar
	}: {
		texto: string;
		contexto: ContextoTecnicaIA;
		onAceptar: (refinado: string) => void;
	} = $props();

	let online = $state(true);
	let cargando = $state(false);
	let error = $state('');
	let resultado = $state<string | null>(null);
	// Texto que se envió a refinar: la vista previa solo vale para él.
	let textoBase = $state('');

	const tieneClave = hayClaveIA();
	const vacio = $derived(texto.trim() === '');
	const vistaPreviaVigente = $derived(resultado !== null && textoBase === texto);
	const motivoDeshabilitado = $derived(
		!tieneClave
			? 'La IA no está disponible: no hay clave de Groq configurada.'
			: !online
				? 'Sin conexión: la IA necesita internet.'
				: vacio
					? 'Escribe algo en Detalles para poder refinarlo.'
					: ''
	);

	onMount(() => {
		online = navigator.onLine;
		const on = () => (online = true);
		const off = () => (online = false);
		window.addEventListener('online', on);
		window.addEventListener('offline', off);
		return () => {
			window.removeEventListener('online', on);
			window.removeEventListener('offline', off);
		};
	});

	function mensajeError(err: unknown): string {
		const msg = err instanceof Error ? err.message : String(err);
		if (msg === 'GROQ_KEY_MISSING') return 'No hay clave de Groq configurada.';
		if (msg === 'AI_TIMEOUT')
			return 'La petición tardó demasiado y se canceló. Revisa tu conexión e inténtalo de nuevo.';
		if (msg === 'AI_RESPONSE_INVALID')
			return 'El AI devolvió una respuesta inesperada. Inténtalo de nuevo.';
		if (msg.includes('503'))
			return 'El servidor de Groq está saturado ahora mismo. Espera un minuto e inténtalo de nuevo.';
		if (msg.includes('429')) return 'Límite de uso alcanzado. Espera unos segundos e inténtalo de nuevo.';
		return 'No se pudo refinar el texto. Revisa tu conexión e inténtalo de nuevo.';
	}

	async function refinar() {
		if (motivoDeshabilitado || cargando) return;
		cargando = true;
		error = '';
		resultado = null;
		const enviado = texto;
		try {
			const r = await refinarDetallesTecnica(enviado.trim(), contexto);
			textoBase = enviado;
			resultado = r;
		} catch (err) {
			console.error('[RefinarDetallesIA] error:', err);
			error = mensajeError(err);
		} finally {
			cargando = false;
		}
	}

	function aceptar() {
		if (resultado === null) return;
		onAceptar(resultado);
		resultado = null;
	}

	function descartar() {
		resultado = null;
	}
</script>

<div class="space-y-2">
	<div class="flex flex-wrap items-center gap-2">
		<Button
			type="button"
			variant="outline"
			size="sm"
			onclick={refinar}
			disabled={!!motivoDeshabilitado || cargando}
		>
			{#if cargando}
				<Loader2Icon class="mr-1.5 size-4 animate-spin" aria-hidden="true" />
				Refinando…
			{:else}
				<SparklesIcon class="mr-1.5 size-4" aria-hidden="true" />
				Refinar con IA
			{/if}
		</Button>
		{#if motivoDeshabilitado}
			<span class="text-xs text-muted-foreground">{motivoDeshabilitado}</span>
		{/if}
	</div>

	{#if error}
		<p class="rounded-md border border-warning bg-warning/15 px-3 py-2 text-xs" role="alert">
			{error}
		</p>
	{/if}

	{#if vistaPreviaVigente}
		<div class="space-y-2 rounded-md border border-info bg-info/10 px-3 py-2" aria-live="polite">
			<p class="text-xs font-medium text-info">Propuesta de la IA (revísala antes de aceptar)</p>
			<p class="text-sm whitespace-pre-wrap">{resultado}</p>
			<div class="flex justify-end gap-2">
				<Button type="button" variant="ghost" size="sm" onclick={descartar}>Descartar</Button>
				<Button type="button" size="sm" onclick={aceptar}>Aceptar</Button>
			</div>
		</div>
	{/if}
</div>
