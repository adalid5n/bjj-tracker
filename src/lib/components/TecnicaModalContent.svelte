<script lang="ts">
	/**
	 * Contenido interno del modal de TECNICA (T-6, ampliado en T-11).
	 *
	 * NO es un Dialog en sí — el Dialog lo provee `MapaModalHost`. Aquí
	 * solo renderizamos: chips (tipo + estado + variante), origen, destino,
	 * setup, errores comunes, contras conocidas y otras variantes.
	 *
	 * Cada navegación (origen, destino, contra, otra variante) hace push
	 * al `mapaModalStack` para que el host renderice el siguiente nivel.
	 *
	 * T-11: la sección "Contras conocidas" deja de ser solo lectura. Cada
	 * contra tiene un botón "✕" para quitarla (con AlertDialog de
	 * confirmación). Debajo aparece "+ Añadir contra" que despliega un
	 * Combobox con autocomplete sobre todas las técnicas (excluye la
	 * actual y las que ya son contra). El Combobox incluye opción
	 * "+ Crear nueva técnica" inline (sigue el patrón returnHandler de
	 * T-10: el modal registra un handler, pushea el wizard de técnica, y
	 * al guardar éste vuelve con el id nuevo — el modal lo añade como
	 * contra).
	 *
	 * Patrón idéntico al de `PosicionModalContent`: carga en paralelo en
	 * `onMount`, estados loading/ready/error.
	 */
	import { onMount } from 'svelte';
	import { Button, buttonVariants } from '$lib/components/ui/button';
	import * as AlertDialog from '$lib/components/ui/alert-dialog';
	import * as Tooltip from '$lib/components/ui/tooltip';
	import Combobox from '$lib/components/Combobox.svelte';
	import XIcon from '@lucide/svelte/icons/x';
	import type {
		EstadoTecnica,
		Posicion,
		SumisionTerminal,
		Tecnica,
		TipoTecnica
	} from '$lib/types';
	import {
		mapaModalStack,
		consumePendingReturnHandlerWork,
		setPendingReturnHandlerWork
	} from './mapa-modal-stack.svelte';
	import { settings } from '$lib/settings.svelte';

	let { tecnica, onChanged }: { tecnica: Tecnica; onChanged?: () => void } = $props();

	const TIPO_TECNICA_LABEL: Record<TipoTecnica, string> = {
		ataque: 'Ataque',
		sweep: 'Sweep',
		escape: 'Escape',
		transicion: 'Transición',
		sumision: 'Sumisión'
	};

	// Tokens semánticos del proyecto. Decisión:
	//   ataque → primary  (la acción ofensiva por defecto del mapa)
	//   sweep → success   (cambia el control a tu favor → positivo)
	//   escape → warning  (resuelves un mal sitio → señal de alerta)
	//   transicion → muted (movimiento neutro entre nodos)
	//   sumision → destructive (acaba la partida; mismo lenguaje que un
	//                           "kill" en otros UIs)
	const TIPO_TECNICA_BADGE: Record<TipoTecnica, string> = {
		ataque: 'bg-primary/15 text-primary',
		sweep: 'bg-success/15 text-success',
		escape: 'bg-warning/15 text-warning',
		transicion: 'bg-muted text-muted-foreground',
		sumision: 'bg-destructive/15 text-destructive'
	};

	const ESTADO_LABEL: Record<EstadoTecnica, string> = {
		probando: 'Probando',
		funciona: 'Funciona',
		descartada: 'Descartada'
	};

	const ESTADO_BADGE: Record<EstadoTecnica, string> = {
		probando: 'bg-warning/15 text-warning',
		funciona: 'bg-success/15 text-success',
		descartada: 'bg-muted text-muted-foreground'
	};

	// Origen siempre es Posicion. Destino puede ser Posicion o SumisionTerminal.
	let origen = $state<Posicion | null>(null);
	let destinoPosicion = $state<Posicion | null>(null);
	let destinoSumision = $state<SumisionTerminal | null>(null);
	let contras = $state<Tecnica[]>([]);
	let otrasVariantes = $state<Tecnica[]>([]);
	// Cache id → nombre para mostrar el origen de cada contra / variante.
	let posicionesById = $state<Record<string, string>>({});
	// Catálogo completo de técnicas (para el Combobox de añadir contra).
	let todasTecnicas = $state<Tecnica[]>([]);
	let status: 'loading' | 'ready' | 'error' = $state('loading');
	let errorMessage = $state('');
	// Técnicas que tienen ESTA técnica como su contra. Bloquea el borrado
	// (decisión del proyecto: borrar prohibido si hay referencias). Mismo
	// patrón que `tecnicasCount` en `SumisionModalContent`.
	let contrasIncomingCount = $state<number>(0);
	let deleting = $state(false);
	let mostrarConfirmBorrar = $state(false);

	// --- T-11: estado de UI de contras ---
	// Si está abierto, mostramos el Combobox para añadir una contra. Si
	// está cerrado, mostramos el botón "+ Añadir contra".
	let mostrarAddCombobox = $state(false);
	// Loading flag para el flujo de añadir (deshabilita el Combobox
	// durante el insert + reload).
	let addingContra = $state(false);
	// AlertDialog "Quitar contra": pre-cargado con la contra concreta.
	let mostrarConfirmQuitar = $state(false);
	let contraAQuitar = $state<Tecnica | null>(null);
	let quitando = $state(false);
	// Mensaje de error específico para acciones de contras (separado del
	// `errorMessage` de carga inicial).
	let contrasErrorMessage = $state('');

	onMount(async () => {
		// Hidrata el state de settings para que `settings.modoAvanzado` sea
		// leíble sincrónicamente en el render (bloques opcionales T-3.it6).
		settings.init();
		try {
			// T-11: si el modal se está remontando tras un wizard inline de
			// "+ Crear nueva técnica" que insertó una contra, esperamos a
			// que ese INSERT termine antes de leer `getContras`. Sin esto
			// hay una carrera entre el INSERT del addContra y el SELECT
			// del getContras (ambos van por el mismo worker SQLite, pero
			// el orden de microtask de Promise.all puede no garantizarlo).
			const pending = consumePendingReturnHandlerWork();
			if (pending) {
				await pending.catch(() => {
					/* swallow: el error del addContra ya se reportó en su
					   propio flujo o se manifestará como ausencia del item
					   en la lista. */
				});
			}

			const [
				{ getPosicion, listPosiciones },
				{ getSumision },
				{ getContras, countContrasIncoming },
				{ getOtrasVariantes, listTecnicas }
			] = await Promise.all([
				import('$lib/posiciones'),
				import('$lib/sumisiones'),
				import('$lib/contras'),
				import('$lib/tecnicas')
			]);

			const destinoPromise: Promise<Posicion | SumisionTerminal | null> =
				tecnica.tipo === 'sumision' && tecnica.sumision_destino_id
					? getSumision(tecnica.sumision_destino_id)
					: tecnica.posicion_destino_id
						? getPosicion(tecnica.posicion_destino_id)
						: Promise.resolve(null);

			const [
				origenRes,
				destinoRes,
				contrasRes,
				variantesRes,
				todasPos,
				todasTec,
				incomingCount
			] = await Promise.all([
				getPosicion(tecnica.posicion_origen_id),
				destinoPromise,
				getContras(tecnica.id),
				getOtrasVariantes(tecnica.nombre, tecnica.id),
				listPosiciones(),
				listTecnicas(),
				countContrasIncoming(tecnica.id)
			]);

			origen = origenRes;
			if (tecnica.tipo === 'sumision') {
				destinoSumision = destinoRes as SumisionTerminal | null;
			} else {
				destinoPosicion = destinoRes as Posicion | null;
			}
			contras = contrasRes;
			otrasVariantes = variantesRes;
			posicionesById = Object.fromEntries(todasPos.map((p) => [p.id, p.nombre]));
			todasTecnicas = todasTec;
			contrasIncomingCount = incomingCount;

			status = 'ready';
		} catch (err) {
			errorMessage = err instanceof Error ? err.message : String(err);
			status = 'error';
			console.error('[TecnicaModalContent] init failed:', err);
		}
	});

	function pushPosicion(p: Posicion) {
		mapaModalStack.pushOrPopTo({ kind: 'posicion', id: p.id, nombre: p.nombre });
	}

	function pushSumision(s: SumisionTerminal) {
		mapaModalStack.pushOrPopTo({ kind: 'sumision', id: s.id, nombre: s.nombre });
	}

	function pushTecnica(t: Tecnica) {
		mapaModalStack.pushOrPopTo({ kind: 'tecnica', id: t.id, nombre: t.nombre });
	}

	const motivoBloqueoBorrado = $derived(
		contrasIncomingCount > 0
			? `Esta técnica es contra de ${contrasIncomingCount} técnica(s). Quita esas referencias antes.`
			: ''
	);

	function handleEdit() {
		mapaModalStack.push({
			kind: 'wizard-tecnica',
			modo: 'editar',
			id: tecnica.id,
			nombre: `Editar: ${tecnica.nombre}`
		});
	}

	function handleDeleteClick() {
		if (contrasIncomingCount > 0) return;
		mostrarConfirmBorrar = true;
	}

	async function handleConfirmDelete() {
		if (contrasIncomingCount > 0) return;
		deleting = true;
		try {
			const { deleteTecnica } = await import('$lib/tecnicas');
			await deleteTecnica(tecnica.id);
			onChanged?.();
			mostrarConfirmBorrar = false;
			mapaModalStack.closeAll();
		} catch (err) {
			errorMessage = err instanceof Error ? err.message : String(err);
			status = 'error';
		} finally {
			deleting = false;
		}
	}

	// --- T-11: helpers de UI de contras ---

	/**
	 * Recarga la lista de contras + el catálogo de técnicas (que se usa
	 * para filtrar el Combobox). Se llama tras un add o remove exitoso.
	 */
	async function reloadContras() {
		try {
			const [{ getContras }, { listTecnicas }] = await Promise.all([
				import('$lib/contras'),
				import('$lib/tecnicas')
			]);
			[contras, todasTecnicas] = await Promise.all([getContras(tecnica.id), listTecnicas()]);
		} catch (err) {
			contrasErrorMessage = err instanceof Error ? err.message : String(err);
			console.error('[TecnicaModalContent] reloadContras failed:', err);
		}
	}

	/**
	 * Items del Combobox de "+ Añadir contra": catálogo completo de
	 * técnicas, excluyendo la actual y las que ya están en `contras`.
	 * Cada item tiene como segunda línea "desde {origen}" — mismo patrón
	 * que la lista de contras visible y "Otras variantes".
	 */
	const contrasYaPorId = $derived(new Set(contras.map((c) => c.id)));
	const tecnicasComboItems = $derived(
		todasTecnicas
			.filter((t) => t.id !== tecnica.id && !contrasYaPorId.has(t.id))
			.map((t) => {
				const label = t.variante ? `${t.nombre} (${t.variante})` : t.nombre;
				const sublabel = `desde ${posicionesById[t.posicion_origen_id] ?? '¿?'}`;
				return { id: t.id, label, sublabel };
			})
	);

	function handleAddContraClick() {
		contrasErrorMessage = '';
		mostrarAddCombobox = true;
	}

	async function handleSelectContra(id: string | null) {
		if (!id) return;
		addingContra = true;
		contrasErrorMessage = '';
		try {
			const { addContra } = await import('$lib/contras');
			await addContra(tecnica.id, id);
			await reloadContras();
			mostrarAddCombobox = false;
		} catch (err) {
			contrasErrorMessage = err instanceof Error ? err.message : String(err);
		} finally {
			addingContra = false;
		}
	}

	/**
	 * "+ Crear nueva técnica" inline desde el Combobox. Patrón T-10:
	 * registra un return-handler, pushea el wizard de técnica en modo
	 * crear, y cuando el wizard guarda detecta el handler y vuelve
	 * (pop + invokeReturnHandler). El handler inicia `addContra` y deja
	 * la promise en `pendingReturnHandlerWork` para que el `onMount` del
	 * modal — que se vuelve a montar tras el pop — la espere antes de
	 * leer la lista actualizada.
	 *
	 * Prefill de `posicionOrigenId` (T-4.it2, desbloqueado por ADR-002):
	 * la contra la ejecuta el oponente, así que su origen natural es la
	 * complementaria de la posición desde la que se hace ESTA técnica.
	 * Si el origen tiene complementaria asignada, prefijamos el paso 3
	 * del wizard de contra con ella (el usuario sigue pudiendo cambiarla).
	 * Si no la tiene (transición, par aún no enlazado), no prefijamos —
	 * el usuario la elige a mano, igual que antes de T-4.it2.
	 */
	function handleCreateNuevaTecnica() {
		mapaModalStack.setReturnHandler(async (newId, kind) => {
			if (kind !== 'tecnica') return;
			const { addContra } = await import('$lib/contras');
			const p = addContra(tecnica.id, newId);
			// Guarda la promise como "pending": el remount del modal
			// (orquestado por el host vía `$effect`) la espera en su
			// `onMount` antes de llamar a `getContras`. Así la lista que
			// se renderiza ya incluye la nueva contra.
			setPendingReturnHandlerWork(p);
			// Best-effort: si por algún motivo el modal no se remontara
			// (caso teórico — el host siempre remonta el top que cambia),
			// nos aseguramos de propagar el error a consola.
			p.catch((err) => {
				console.error('[TecnicaModalContent] addContra (inline) failed:', err);
			});
			// Notifica al padre por si la página `/mapa` u otra vista
			// quiere refrescar contadores (consistente con `onChanged` de
			// edit/delete).
			onChanged?.();
		});
		mapaModalStack.push({
			kind: 'wizard-tecnica',
			modo: 'crear',
			nombre: 'Nueva técnica (contra)',
			posicionOrigenId: origen?.posicion_complementaria_id ?? undefined
		});
	}

	function handleQuitarContraClick(contra: Tecnica) {
		contraAQuitar = contra;
		contrasErrorMessage = '';
		mostrarConfirmQuitar = true;
	}

	async function handleConfirmQuitarContra() {
		if (!contraAQuitar) return;
		quitando = true;
		try {
			const { removeContra } = await import('$lib/contras');
			await removeContra(tecnica.id, contraAQuitar.id);
			await reloadContras();
			mostrarConfirmQuitar = false;
			contraAQuitar = null;
			onChanged?.();
		} catch (err) {
			contrasErrorMessage = err instanceof Error ? err.message : String(err);
		} finally {
			quitando = false;
		}
	}

	function handleQuitarOpenChange(value: boolean) {
		// El AlertDialog puede cerrarse por Esc / click fuera / Cancelar.
		// Limpiamos la contra seleccionada para que no quede colgada.
		if (!value) {
			mostrarConfirmQuitar = false;
			if (!quitando) contraAQuitar = null;
		}
	}
</script>

<!--
  Contenido del modal de técnica. Va dentro de Dialog.Content (provisto
  por MapaModalHost). El Dialog.Title con tecnica.nombre lo renderiza
  el host; aquí empezamos por la fila de chips.
-->
<div class="space-y-3">
	<!-- Chips de tipo + estado + (opcional) variante -->
	<div class="flex flex-wrap gap-1">
		<span class="rounded px-2 py-0.5 text-xs {TIPO_TECNICA_BADGE[tecnica.tipo]}">
			{TIPO_TECNICA_LABEL[tecnica.tipo]}
		</span>
		<span class="rounded px-2 py-0.5 text-xs {ESTADO_BADGE[tecnica.estado]}">
			{ESTADO_LABEL[tecnica.estado]}
		</span>
		{#if tecnica.variante}
			<span class="rounded bg-muted px-2 py-0.5 text-xs text-muted-foreground">
				var: {tecnica.variante}
			</span>
		{/if}
	</div>

	{#if status === 'loading'}
		<p class="text-sm text-muted-foreground">Cargando técnica…</p>
	{:else if status === 'error'}
		<div class="rounded border border-destructive/30 bg-destructive/10 p-3">
			<p class="text-sm font-semibold text-destructive">Error</p>
			<pre class="mt-1 text-xs whitespace-pre-wrap text-destructive">{errorMessage}</pre>
		</div>
	{:else}
		<!-- Origen -->
		<div class="text-sm">
			<span class="text-muted-foreground">Origen:</span>
			{#if origen}
				<button
					type="button"
					class="ml-1 rounded font-medium hover:underline focus-visible:underline focus-visible:outline-none"
					onclick={() => pushPosicion(origen!)}
				>
					{origen.nombre}
				</button>
			{:else}
				<span class="ml-1 text-muted-foreground">(posición eliminada)</span>
			{/if}
		</div>

		<!-- Destino -->
		<div class="text-sm">
			<span class="text-muted-foreground">Destino:</span>
			{#if tecnica.tipo === 'sumision'}
				{#if destinoSumision}
					<button
						type="button"
						class="ml-1 rounded font-medium hover:underline focus-visible:underline focus-visible:outline-none"
						onclick={() => pushSumision(destinoSumision!)}
					>
						{destinoSumision.nombre}<span class="text-muted-foreground"> (sumisión)</span>
					</button>
				{:else}
					<span class="ml-1 text-muted-foreground">(sumisión eliminada)</span>
				{/if}
			{:else if destinoPosicion}
				<button
					type="button"
					class="ml-1 rounded font-medium hover:underline focus-visible:underline focus-visible:outline-none"
					onclick={() => pushPosicion(destinoPosicion!)}
				>
					{destinoPosicion.nombre}
				</button>
			{:else}
				<span class="ml-1 text-muted-foreground">(posición eliminada)</span>
			{/if}
		</div>

		<!-- Detalles + Errores comunes (T-3.it6): solo modo avanzado, si hay contenido. -->
		{#if settings.modoAvanzado && tecnica.detalles?.trim().length > 0}
			<div>
				<h3 class="text-sm font-semibold">Detalles</h3>
				<p class="mt-1 text-sm whitespace-pre-wrap text-muted-foreground">{tecnica.detalles}</p>
			</div>
		{/if}
		{#if settings.modoAvanzado && tecnica.errores_comunes?.trim().length > 0}
			<div>
				<h3 class="text-sm font-semibold">Errores comunes</h3>
				<p class="mt-1 text-sm whitespace-pre-wrap text-muted-foreground">{tecnica.errores_comunes}</p>
			</div>
		{/if}

		<!-- Contras conocidas (T-6 read-only + T-11 editable: ✕ por item, + Añadir contra) -->
		<div>
			<h3 class="text-sm font-semibold">
				Contras conocidas <span class="text-muted-foreground">({contras.length})</span>
			</h3>

			{#if contras.length > 0}
				<div class="mt-2 rounded border border-border">
					<ul class="divide-y divide-border">
						{#each contras as c (c.id)}
							<li class="flex items-stretch">
								<button
									type="button"
									class="block flex-1 p-3 text-left transition-colors hover:bg-accent focus-visible:bg-accent focus-visible:outline-none"
									onclick={() => pushTecnica(c)}
								>
									<div class="font-medium">
										{c.nombre}{#if c.variante}<span class="text-muted-foreground"
												> ({c.variante})</span
											>{/if}
									</div>
									<div class="mt-0.5 text-xs text-muted-foreground">
										desde {posicionesById[c.posicion_origen_id] ?? '¿?'}
									</div>
								</button>
								<!--
								  Botón ✕ para quitar esta contra. stopPropagation evita que
								  dispare el click del item (push del modal de la contra).
								-->
								<button
									type="button"
									class="flex items-center justify-center px-3 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive focus-visible:bg-destructive/10 focus-visible:text-destructive focus-visible:outline-none"
									onclick={(e) => {
										e.stopPropagation();
										handleQuitarContraClick(c);
									}}
									aria-label="Quitar contra «{c.nombre}»"
								>
									<XIcon class="size-4" aria-hidden="true" />
								</button>
							</li>
						{/each}
					</ul>
				</div>
			{/if}

			<!--
			  Zona de añadir: si la lista está vacía y el combobox no está
			  abierto, mostramos el placeholder + el botón; si no, solo el
			  botón. El combobox sustituye al botón mientras esté abierto.
			-->
			<div class="mt-2">
				{#if mostrarAddCombobox}
					<div class="space-y-2">
						<Combobox
							value={null}
							onValueChange={handleSelectContra}
							items={tecnicasComboItems}
							placeholder={addingContra ? 'Añadiendo…' : 'Selecciona una técnica…'}
							searchPlaceholder="Buscar técnica…"
							emptyMessage="Sin técnicas disponibles."
							onCreateNew={handleCreateNuevaTecnica}
							createNewLabel="Crear nueva técnica"
							disabled={addingContra}
							ariaLabel="Añadir contra"
						/>
						<div class="flex justify-end">
							<Button
								variant="ghost"
								size="sm"
								onclick={() => (mostrarAddCombobox = false)}
								disabled={addingContra}
							>
								Cancelar
							</Button>
						</div>
					</div>
				{:else}
					{#if contras.length === 0}
						<p class="mb-2 text-sm text-muted-foreground">Sin contras registradas.</p>
					{/if}
					<Button variant="outline" size="sm" onclick={handleAddContraClick}>+ Añadir contra</Button>
				{/if}
			</div>

			{#if contrasErrorMessage}
				<p class="mt-2 text-sm text-destructive">{contrasErrorMessage}</p>
			{/if}
		</div>

		<!-- Otras variantes -->
		{#if otrasVariantes.length > 0}
			<div>
				<h3 class="text-sm font-semibold">Otras variantes de {tecnica.nombre}</h3>
				<div class="mt-2 rounded border border-border">
					<ul class="divide-y divide-border">
						{#each otrasVariantes as v (v.id)}
							<li>
								<button
									type="button"
									class="block w-full p-3 text-left transition-colors hover:bg-accent focus-visible:bg-accent focus-visible:outline-none"
									onclick={() => pushTecnica(v)}
								>
									<div class="font-medium">
										{v.nombre}{#if v.variante}<span class="text-muted-foreground"
												> (variante)</span
											>{/if}
									</div>
									<div class="mt-0.5 text-xs text-muted-foreground">
										desde {posicionesById[v.posicion_origen_id] ?? '¿?'}
									</div>
								</button>
							</li>
						{/each}
					</ul>
				</div>
			</div>
		{/if}
	{/if}

	<!--
	  Acciones editar / borrar (T-10). Visibles también en móvil. El botón
	  Borrar se deshabilita si la técnica es contra de otra(s); en ese
	  caso un Tooltip envuelve un <span> con el botón disabled (los buttons
	  disabled no emiten hover, el span sí). Mismo patrón que en
	  PosicionModalContent y SumisionModalContent.
	-->
	{#if status === 'ready'}
		<div class="mt-3 flex justify-end gap-2 border-t border-border pt-3">
			<Button variant="outline" size="sm" onclick={handleEdit} disabled={deleting}>
				Editar
			</Button>
			{#if contrasIncomingCount > 0}
				<Tooltip.Provider>
					<Tooltip.Root>
						<Tooltip.Trigger>
							{#snippet child({ props })}
								<span {...props} class="inline-flex">
									<Button variant="destructive" size="sm" disabled>Borrar</Button>
								</span>
							{/snippet}
						</Tooltip.Trigger>
						<Tooltip.Content>{motivoBloqueoBorrado}</Tooltip.Content>
					</Tooltip.Root>
				</Tooltip.Provider>
			{:else}
				<Button
					variant="destructive"
					size="sm"
					onclick={handleDeleteClick}
					disabled={deleting}
				>
					{deleting ? 'Borrando…' : 'Borrar'}
				</Button>
			{/if}
		</div>
	{/if}
</div>

<!--
  AlertDialog para confirmar borrado de la técnica completa (T-10).
  Mismo patrón que las otras entidades.
-->
<AlertDialog.Root bind:open={mostrarConfirmBorrar}>
	<AlertDialog.Content>
		<AlertDialog.Header>
			<AlertDialog.Title>Borrar técnica</AlertDialog.Title>
			<AlertDialog.Description>
				¿Borrar definitivamente «{tecnica.nombre}»? No se puede deshacer.
			</AlertDialog.Description>
		</AlertDialog.Header>
		<AlertDialog.Footer>
			<AlertDialog.Cancel disabled={deleting}>Cancelar</AlertDialog.Cancel>
			<AlertDialog.Action
				onclick={handleConfirmDelete}
				disabled={deleting}
				class={buttonVariants({ variant: 'destructive' })}
			>
				{deleting ? 'Borrando…' : 'Borrar'}
			</AlertDialog.Action>
		</AlertDialog.Footer>
	</AlertDialog.Content>
</AlertDialog.Root>

<!--
  AlertDialog para confirmar quitar una contra (T-11). Controlado (no
  bind:open) para que el cierre por cualquier vía (Esc / Cancelar /
  click fuera) limpie `contraAQuitar`. Mismo patrón que el AlertDialog
  controlado de SumisionWizard (T-9).
-->
<AlertDialog.Root open={mostrarConfirmQuitar} onOpenChange={handleQuitarOpenChange}>
	<AlertDialog.Content>
		<AlertDialog.Header>
			<AlertDialog.Title>Quitar contra</AlertDialog.Title>
			<AlertDialog.Description>
				{#if contraAQuitar}
					¿Quitar «{contraAQuitar.nombre}» de las contras de «{tecnica.nombre}»? Se borra solo la
					relación; las técnicas siguen existiendo.
				{:else}
					¿Quitar esta contra?
				{/if}
			</AlertDialog.Description>
		</AlertDialog.Header>
		<AlertDialog.Footer>
			<AlertDialog.Cancel disabled={quitando}>Cancelar</AlertDialog.Cancel>
			<AlertDialog.Action
				onclick={handleConfirmQuitarContra}
				disabled={quitando}
				class={buttonVariants({ variant: 'destructive' })}
			>
				{quitando ? 'Quitando…' : 'Quitar'}
			</AlertDialog.Action>
		</AlertDialog.Footer>
	</AlertDialog.Content>
</AlertDialog.Root>
