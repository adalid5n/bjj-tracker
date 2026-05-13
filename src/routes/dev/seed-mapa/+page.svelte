<script lang="ts">
	/**
	 * Ruta temporal de seed para el mapa técnico (validación de T-4/T-5).
	 *
	 * Crea un mini-catálogo de prueba (3 posiciones, 2 sumisiones, 6
	 * técnicas) sobre la BD real (OPFS), suficiente para validar todos
	 * los casos del modal de posición sin esperar a los editores (T-8+).
	 *
	 * Idempotencia: antes de crear, lista lo existente y filtra por
	 * `nombre` (case-insensitive). No duplica entidades.
	 *
	 * También expone "Limpiar todo el catálogo": borra técnicas, sumisiones
	 * y posiciones (las tecnicas tienen FK ON DELETE CASCADE, así que basta
	 * con borrar posiciones para limpiar las tecnicas; pero borramos las
	 * tres tablas por explícito).
	 *
	 * Ruta a eliminar al cerrar iteración 1.
	 */
	import { onMount } from 'svelte';
	import { Button } from '$lib/components/ui/button';
	import type {
		CategoriaPosicion,
		EstadoTecnica,
		Posicion,
		SumisionTerminal,
		Tecnica,
		TipoRolPosicion,
		TipoTecnica
	} from '$lib/types';

	type PosicionSeed = {
		nombre: string;
		categoria: CategoriaPosicion;
		tipo?: TipoRolPosicion;
		notas?: string;
	};

	type SumisionSeed = {
		nombre: string;
		notas?: string;
	};

	type TecnicaSeed = {
		nombre: string;
		tipo: TipoTecnica;
		origenNombre: string; // referencia por nombre a una de las posiciones seed
		// uno de los dos:
		destinoPosicionNombre?: string;
		destinoSumisionNombre?: string;
		variante?: string;
	};

	const POSICIONES_SEED: PosicionSeed[] = [
		{ nombre: 'Guardia cerrada bottom', categoria: 'guardia', tipo: 'ofensiva' },
		{ nombre: 'Guardia cerrada top', categoria: 'guardia', tipo: 'defensiva' },
		{ nombre: 'Mount top', categoria: 'control_superior', tipo: 'ofensiva' },
		{ nombre: 'Mount bottom', categoria: 'control_superior', tipo: 'defensiva' }
	];

	const SUMISIONES_SEED: SumisionSeed[] = [{ nombre: 'Armbar' }, { nombre: 'Cross choke' }];

	const TECNICAS_SEED: TecnicaSeed[] = [
		{
			nombre: 'Hip bump sweep',
			tipo: 'sweep',
			origenNombre: 'Guardia cerrada bottom',
			destinoPosicionNombre: 'Mount top'
		},
		{
			nombre: 'Armbar',
			variante: 'desde guardia',
			tipo: 'sumision',
			origenNombre: 'Guardia cerrada bottom',
			destinoSumisionNombre: 'Armbar'
		},
		{
			nombre: 'Cross choke desde guardia',
			tipo: 'sumision',
			origenNombre: 'Guardia cerrada bottom',
			destinoSumisionNombre: 'Cross choke'
		},
		{
			nombre: 'Upa',
			tipo: 'escape',
			origenNombre: 'Mount bottom',
			destinoPosicionNombre: 'Guardia cerrada top'
		},
		{
			nombre: 'Elbow escape',
			tipo: 'escape',
			origenNombre: 'Mount bottom',
			destinoPosicionNombre: 'Guardia cerrada top',
			variante: 'clásica'
		},
		{
			nombre: 'Armbar',
			variante: 'desde mount',
			tipo: 'sumision',
			origenNombre: 'Mount top',
			destinoSumisionNombre: 'Armbar'
		}
	];

	type ContraSeed = {
		// La técnica "víctima" (a la que se le aplica la contra).
		tecnicaNombre: string;
		tecnicaVariante?: string;
		tecnicaOrigenNombre: string;
		// La técnica que actúa como contra.
		contraNombre: string;
		contraVariante?: string;
		contraOrigenNombre: string;
	};

	const CONTRAS_SEED: ContraSeed[] = [
		// Upa es contra del Armbar desde mount.
		{
			tecnicaNombre: 'Armbar',
			tecnicaVariante: 'desde mount',
			tecnicaOrigenNombre: 'Mount top',
			contraNombre: 'Upa',
			contraOrigenNombre: 'Mount bottom'
		},
		// Hip bump sweep es contra del Armbar desde guardia.
		{
			tecnicaNombre: 'Armbar',
			tecnicaVariante: 'desde guardia',
			tecnicaOrigenNombre: 'Guardia cerrada bottom',
			contraNombre: 'Hip bump sweep',
			contraOrigenNombre: 'Guardia cerrada bottom'
		}
	];

	let status: 'idle' | 'busy' | 'done' | 'error' = $state('idle');
	let message = $state('');

	// Estado actual del catálogo (para mostrar contadores y refrescar tras
	// seed/wipe).
	let posicionesExistentes = $state<Posicion[]>([]);
	let sumisionesExistentes = $state<SumisionTerminal[]>([]);
	let tecnicasExistentes = $state<Tecnica[]>([]);

	onMount(async () => {
		await refresh();
	});

	async function refresh() {
		try {
			const { listPosiciones } = await import('$lib/posiciones');
			const { listSumisiones } = await import('$lib/sumisiones');
			const { listTecnicas } = await import('$lib/tecnicas');
			[posicionesExistentes, sumisionesExistentes, tecnicasExistentes] = await Promise.all([
				listPosiciones(),
				listSumisiones(),
				listTecnicas()
			]);
		} catch (err) {
			console.error('[seed-mapa] refresh failed:', err);
		}
	}

	function findByNombre<T extends { nombre: string }>(list: T[], nombre: string): T | undefined {
		const target = nombre.trim().toLowerCase();
		return list.find((x) => x.nombre.trim().toLowerCase() === target);
	}

	async function handleSeed() {
		status = 'busy';
		message = '';
		try {
			const { createPosicion, listPosiciones } = await import('$lib/posiciones');
			const { createSumision, listSumisiones } = await import('$lib/sumisiones');
			const { createTecnica, listTecnicas } = await import('$lib/tecnicas');

			let posiciones = await listPosiciones();
			let sumisiones = await listSumisiones();
			let tecnicas = await listTecnicas();

			let posCreadas = 0;
			let sumCreadas = 0;
			let tecCreadas = 0;

			// Posiciones (idempotente por nombre).
			for (const seed of POSICIONES_SEED) {
				if (findByNombre(posiciones, seed.nombre)) continue;
				const nueva = await createPosicion({
					nombre: seed.nombre,
					categoria: seed.categoria,
					tipo: seed.tipo,
					notas: seed.notas ?? ''
				});
				posiciones = [...posiciones, nueva];
				posCreadas += 1;
			}

			// Sumisiones (idempotente por nombre).
			for (const seed of SUMISIONES_SEED) {
				if (findByNombre(sumisiones, seed.nombre)) continue;
				const nueva = await createSumision({
					nombre: seed.nombre,
					notas: seed.notas ?? ''
				});
				sumisiones = [...sumisiones, nueva];
				sumCreadas += 1;
			}

			// Técnicas (idempotente por (nombre, origen, variante)).
			for (const seed of TECNICAS_SEED) {
				const origen = findByNombre(posiciones, seed.origenNombre);
				if (!origen) {
					throw new Error(`Origen no encontrado para técnica "${seed.nombre}": ${seed.origenNombre}`);
				}

				const ya = tecnicas.find(
					(t) =>
						t.nombre.trim().toLowerCase() === seed.nombre.trim().toLowerCase() &&
						t.posicion_origen_id === origen.id &&
						(t.variante ?? '') === (seed.variante ?? '')
				);
				if (ya) continue;

				let posDestId: string | undefined;
				let sumDestId: string | undefined;
				if (seed.tipo === 'sumision') {
					if (!seed.destinoSumisionNombre) {
						throw new Error(`Técnica de sumisión "${seed.nombre}" sin destinoSumisionNombre`);
					}
					const dest = findByNombre(sumisiones, seed.destinoSumisionNombre);
					if (!dest) {
						throw new Error(`Sumisión destino no encontrada: ${seed.destinoSumisionNombre}`);
					}
					sumDestId = dest.id;
				} else {
					if (!seed.destinoPosicionNombre) {
						throw new Error(`Técnica "${seed.nombre}" sin destinoPosicionNombre`);
					}
					const dest = findByNombre(posiciones, seed.destinoPosicionNombre);
					if (!dest) {
						throw new Error(`Posición destino no encontrada: ${seed.destinoPosicionNombre}`);
					}
					posDestId = dest.id;
				}

				const nueva = await createTecnica({
					nombre: seed.nombre,
					variante: seed.variante,
					posicion_origen_id: origen.id,
					posicion_destino_id: posDestId,
					sumision_destino_id: sumDestId,
					tipo: seed.tipo,
					estado: 'probando' as EstadoTecnica,
					detalles: '',
					errores_comunes: ''
				});
				tecnicas = [...tecnicas, nueva];
				tecCreadas += 1;
			}

			// Contras (idempotente vía INSERT OR IGNORE en addContra).
			const { addContra, getContras } = await import('$lib/contras');
			let conCreadas = 0;

			function findTecnica(nombre: string, origenNombre: string, variante?: string) {
				const origen = findByNombre(posiciones, origenNombre);
				if (!origen) return undefined;
				const target = nombre.trim().toLowerCase();
				return tecnicas.find(
					(t) =>
						t.nombre.trim().toLowerCase() === target &&
						t.posicion_origen_id === origen.id &&
						(t.variante ?? '') === (variante ?? '')
				);
			}

			for (const seed of CONTRAS_SEED) {
				const tec = findTecnica(seed.tecnicaNombre, seed.tecnicaOrigenNombre, seed.tecnicaVariante);
				const contra = findTecnica(seed.contraNombre, seed.contraOrigenNombre, seed.contraVariante);
				if (!tec || !contra) {
					throw new Error(
						`No encuentro técnica/contra para seed: ${seed.tecnicaNombre} ← ${seed.contraNombre}`
					);
				}
				const yaContras = await getContras(tec.id);
				if (yaContras.some((c) => c.id === contra.id)) continue;
				await addContra(tec.id, contra.id);
				conCreadas += 1;
			}

			message = `Sembrado: ${posCreadas} posiciones, ${sumCreadas} sumisiones, ${tecCreadas} técnicas, ${conCreadas} contras.`;
			status = 'done';
			await refresh();
		} catch (err) {
			message = err instanceof Error ? err.message : String(err);
			status = 'error';
			console.error('[seed-mapa] seed failed:', err);
		}
	}

	async function handleWipe() {
		if (!confirm('¿Borrar TODAS las posiciones, sumisiones y técnicas? Esta acción no se puede deshacer.')) {
			return;
		}
		status = 'busy';
		message = '';
		try {
			const { deleteTecnica, listTecnicas } = await import('$lib/tecnicas');
			const { deleteSumision, listSumisiones } = await import('$lib/sumisiones');
			const { deletePosicion, listPosiciones } = await import('$lib/posiciones');

			// Borramos en orden inverso (técnicas → sumisiones → posiciones)
			// para evitar fallos en FKs aunque schema tenga CASCADE.
			const tecnicas = await listTecnicas();
			for (const t of tecnicas) await deleteTecnica(t.id);

			const sumisiones = await listSumisiones();
			for (const s of sumisiones) await deleteSumision(s.id);

			const posiciones = await listPosiciones();
			for (const p of posiciones) await deletePosicion(p.id);

			message = 'Catálogo limpiado.';
			status = 'done';
			await refresh();
		} catch (err) {
			message = err instanceof Error ? err.message : String(err);
			status = 'error';
			console.error('[seed-mapa] wipe failed:', err);
		}
	}
</script>

<svelte:head>
	<title>Seed del mapa · BJJ Tracker</title>
</svelte:head>

<main class="mx-auto max-w-2xl space-y-4 p-4">
	<header class="space-y-1">
		<h1 class="text-2xl font-bold">Seed del mapa</h1>
		<p class="text-sm text-muted-foreground">
			Ruta temporal para validar T-4/T-5. Se eliminará al cerrar iteración 1.
		</p>
	</header>

	<section
		class="rounded border border-warning/30 bg-warning/10 p-3 text-sm"
	>
		<p>
			<span class="font-semibold">Aviso:</span> esta página escribe sobre la BD real (la misma de
			<code class="rounded bg-muted px-1 py-0.5 text-xs">/mapa</code>). Úsala solo para sembrar
			datos de prueba.
		</p>
	</section>

	<section class="space-y-1 rounded border border-border p-3 text-sm">
		<p class="font-semibold">Estado actual del catálogo</p>
		<ul class="text-muted-foreground">
			<li>{posicionesExistentes.length} posiciones</li>
			<li>{sumisionesExistentes.length} sumisiones</li>
			<li>{tecnicasExistentes.length} técnicas</li>
		</ul>
	</section>

	<section class="flex flex-wrap gap-2">
		<Button onclick={handleSeed} disabled={status === 'busy'}>
			{status === 'busy' ? 'Trabajando…' : 'Sembrar datos de ejemplo'}
		</Button>
		<Button variant="outline" onclick={handleWipe} disabled={status === 'busy'}>
			Limpiar todo el catálogo
		</Button>
	</section>

	{#if message}
		<section
			class="rounded border p-3 text-sm {status === 'error'
				? 'border-destructive/30 bg-destructive/10 text-destructive'
				: 'border-success/30 bg-success/10 text-success'}"
		>
			{message}
		</section>
	{/if}

	<section class="space-y-1 text-xs text-muted-foreground">
		<p class="font-semibold">Lo que crea el seed:</p>
		<ul class="list-inside list-disc">
			<li>3 posiciones: guardia cerrada bottom, mount top, mount bottom</li>
			<li>2 sumisiones: Armbar, Cross choke</li>
			<li>
				6 técnicas: hip bump sweep, armbar (variantes "desde guardia" y "desde mount"), cross choke
				desde guardia, upa, elbow escape (variante "clásica")
			</li>
			<li>2 contras: Upa contra Armbar (desde mount); Hip bump sweep contra Armbar (desde guardia)</li>
		</ul>
		<p>
			Idempotente: si ya existen entidades con el mismo nombre (o, en técnicas, el mismo
			nombre+origen+variante), no las duplica. Las contras se insertan con OR IGNORE.
		</p>
	</section>
</main>
