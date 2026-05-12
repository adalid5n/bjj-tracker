<script lang="ts">
	/**
	 * Página de humo para la migración v1 → v2.
	 *
	 * Objetivo: verificar que la migración del schema (creación de tablas
	 * nuevas + limpieza de `experiencia_anos`) funciona correctamente sin
	 * tocar la BD real del usuario.
	 *
	 * Estrategia: usar una BD en memoria (`:memory:`) cargando SQLite-WASM
	 * directamente en main thread. NO usa OPFS ni el worker de `$lib/db`,
	 * para evitar cualquier interacción con la BD persistente del usuario
	 * y para que el test sea idempotente (cada click parte de cero).
	 *
	 * Pasos del escenario:
	 *  1. Crear BD vacía y aplicar SCHEMA_V1.
	 *  2. Añadir la columna huérfana `experiencia_anos` a `companeros`
	 *     (simulando una BD pre-T-4) e insertar una fila para confirmar
	 *     que el ALTER no destruye datos existentes.
	 *  3. Aplicar las migraciones pendientes (`applyPendingMigrations`).
	 *  4. Verificar:
	 *     - schema_meta.version = '2'.
	 *     - Las 4 tablas nuevas existen.
	 *     - `experiencia_anos` ya no existe en `companeros`.
	 *     - La fila de compañero sigue ahí (no se perdieron datos).
	 *     - Los CHECK y UNIQUE de `tecnicas` funcionan (probamos casos
	 *       válidos e inválidos y comprobamos que SQLite los acepta/rechaza
	 *       como esperamos).
	 */
	import { onMount } from 'svelte';
	import { base } from '$app/paths';
	import { SCHEMA_V1, applyPendingMigrations, LATEST_SCHEMA_VERSION } from '$lib/db/schema';
	import { Button } from '$lib/components/ui/button';

	type Sqlite3Static = {
		oo1: { DB: new (filename: string) => DbHandle };
	};
	type DbHandle = {
		exec: (...a: unknown[]) => unknown;
		close: () => void;
	};

	type CheckResult = {
		name: string;
		ok: boolean;
		detail?: string;
	};

	let sqlite3: Sqlite3Static | null = $state(null);
	let status: 'idle' | 'loading' | 'ready' | 'running' | 'done' | 'error' = $state('idle');
	let errorMessage = $state('');
	let results: CheckResult[] = $state([]);

	const ALL_OK = $derived(results.length > 0 && results.every((r) => r.ok));

	onMount(async () => {
		status = 'loading';
		try {
			// Dynamic import: evita evaluar sqlite-wasm durante SSR/prerender.
			const { default: sqlite3InitModule } = await import('@sqlite.org/sqlite-wasm');
			// @ts-expect-error -- typings ocultan locateFile (igual que en db-worker.ts)
			sqlite3 = (await sqlite3InitModule({
				locateFile: (file: string) => `${window.location.origin}${base}/sqlite/${file}`
			})) as Sqlite3Static;
			status = 'ready';
		} catch (err) {
			errorMessage = err instanceof Error ? err.message : String(err);
			status = 'error';
			console.error('[db-migration-smoke] init failed:', err);
		}
	});

	function tableExists(db: DbHandle, name: string): boolean {
		const rows = db.exec({
			sql: "SELECT name FROM sqlite_master WHERE type='table' AND name=?",
			bind: [name],
			returnValue: 'resultRows',
			rowMode: 'object'
		}) as { name: string }[];
		return rows.length > 0;
	}

	function indexExists(db: DbHandle, name: string): boolean {
		const rows = db.exec({
			sql: "SELECT name FROM sqlite_master WHERE type='index' AND name=?",
			bind: [name],
			returnValue: 'resultRows',
			rowMode: 'object'
		}) as { name: string }[];
		return rows.length > 0;
	}

	function columnExists(db: DbHandle, table: string, column: string): boolean {
		const rows = db.exec({
			sql: `PRAGMA table_info(${table})`,
			returnValue: 'resultRows',
			rowMode: 'object'
		}) as { name: string }[];
		return rows.some((r) => r.name === column);
	}

	function getSchemaVersion(db: DbHandle): string | null {
		const rows = db.exec({
			sql: "SELECT value FROM schema_meta WHERE key = 'version'",
			returnValue: 'resultRows',
			rowMode: 'object'
		}) as { value: string }[];
		return rows[0]?.value ?? null;
	}

	function expectThrows(fn: () => void, expectedSubstring?: string): { ok: boolean; detail: string } {
		try {
			fn();
			return { ok: false, detail: 'No lanzó error (esperado constraint)' };
		} catch (err) {
			const msg = err instanceof Error ? err.message : String(err);
			if (expectedSubstring && !msg.toLowerCase().includes(expectedSubstring.toLowerCase())) {
				return { ok: false, detail: `Error inesperado: ${msg}` };
			}
			return { ok: true, detail: msg.split('\n')[0].slice(0, 120) };
		}
	}

	async function runSmoke() {
		if (!sqlite3) return;
		status = 'running';
		results = [];
		const checks: CheckResult[] = [];

		// BD en memoria — cero impacto en datos del usuario.
		const db = new sqlite3.oo1.DB(':memory:') as unknown as DbHandle;

		try {
			// Mismo PRAGMA que en producción (db-worker.ts) para que el smoke
			// pruebe el comportamiento real del schema con FK activadas.
			db.exec('PRAGMA foreign_keys = ON');
			// 1. Aplicar V1.
			db.exec(SCHEMA_V1);
			checks.push({ name: 'SCHEMA_V1 aplicado', ok: true });

			// 2. Simular BD pre-T-4: añadir columna huérfana y poblarla.
			db.exec('ALTER TABLE companeros ADD COLUMN experiencia_anos REAL');
			const nowIso = new Date().toISOString();
			db.exec({
				sql: `INSERT INTO companeros (id, nombre, cinturon, peso_relativo, notas, created_at, updated_at, experiencia_anos)
				      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
				bind: ['c1', 'Compañero Test', 'azul', 'igual', null, nowIso, nowIso, 3.5]
			});
			checks.push({
				name: 'Pre-migración: columna experiencia_anos añadida + 1 fila',
				ok: columnExists(db, 'companeros', 'experiencia_anos')
			});

			// 3. Versión pre-migración debe ser 1.
			const versionBefore = getSchemaVersion(db);
			checks.push({
				name: 'schema_version antes = "1"',
				ok: versionBefore === '1',
				detail: `actual="${versionBefore}"`
			});

			// 4. Aplicar migraciones pendientes.
			applyPendingMigrations(db);
			checks.push({ name: 'applyPendingMigrations() ejecutada sin errores', ok: true });

			// 5. Verificar versión nueva.
			const versionAfter = getSchemaVersion(db);
			checks.push({
				name: `schema_version después = "${LATEST_SCHEMA_VERSION}"`,
				ok: versionAfter === String(LATEST_SCHEMA_VERSION),
				detail: `actual="${versionAfter}"`
			});

			// 6. Verificar que las 4 tablas nuevas existen.
			for (const t of ['posiciones', 'sumisiones_terminales', 'tecnicas', 'tecnica_contras', 'roll_posicion_problema']) {
				checks.push({
					name: `Tabla "${t}" existe`,
					ok: tableExists(db, t)
				});
			}

			// 7. Verificar índices esperados.
			for (const idx of [
				'idx_tecnicas_nombre_origen_variante',
				'idx_tecnicas_origen',
				'idx_tecnicas_destino_pos',
				'idx_tecnicas_destino_sum',
				'idx_tecnicas_nombre',
				'idx_contras_tecnica'
			]) {
				checks.push({
					name: `Índice "${idx}" existe`,
					ok: indexExists(db, idx)
				});
			}

			// 8. experiencia_anos ya no debe estar.
			checks.push({
				name: 'Columna companeros.experiencia_anos eliminada',
				ok: !columnExists(db, 'companeros', 'experiencia_anos')
			});

			// 9. La fila pre-migración debe seguir existiendo (no perdimos datos).
			const compRows = db.exec({
				sql: 'SELECT id, nombre FROM companeros WHERE id = ?',
				bind: ['c1'],
				returnValue: 'resultRows',
				rowMode: 'object'
			}) as { id: string; nombre: string }[];
			checks.push({
				name: 'Datos preexistentes conservados tras DROP COLUMN',
				ok: compRows.length === 1 && compRows[0].nombre === 'Compañero Test',
				detail: `filas=${compRows.length}`
			});

			// 10. Probar UNIQUE con COALESCE — dos técnicas con mismo nombre, mismo
			// origen y variante NULL deben colisionar.
			const pNow = new Date().toISOString();
			db.exec({
				sql: `INSERT INTO posiciones (id, nombre, categoria, tipo, notas, created_at, updated_at)
				      VALUES (?, ?, ?, ?, ?, ?, ?)`,
				bind: ['p1', 'Mount bottom', 'control_superior', 'defensiva', '', pNow, pNow]
			});
			db.exec({
				sql: `INSERT INTO posiciones (id, nombre, categoria, tipo, notas, created_at, updated_at)
				      VALUES (?, ?, ?, ?, ?, ?, ?)`,
				bind: ['p2', 'Half guard top', 'control_superior', 'ofensiva', '', pNow, pNow]
			});
			db.exec({
				sql: `INSERT INTO tecnicas (id, nombre, variante, posicion_origen_id, posicion_destino_id, sumision_destino_id, tipo, estado, detalles, errores_comunes, created_at, updated_at)
				      VALUES (?, ?, NULL, ?, ?, NULL, ?, ?, ?, ?, ?, ?)`,
				bind: ['t1', 'Upa', 'p1', 'p2', 'escape', 'probando', '', '', pNow, pNow]
			});
			const duplicateAttempt = expectThrows(() => {
				db.exec({
					sql: `INSERT INTO tecnicas (id, nombre, variante, posicion_origen_id, posicion_destino_id, sumision_destino_id, tipo, estado, detalles, errores_comunes, created_at, updated_at)
					      VALUES (?, ?, NULL, ?, ?, NULL, ?, ?, ?, ?, ?, ?)`,
					bind: ['t1b', 'Upa', 'p1', 'p2', 'escape', 'probando', '', '', pNow, pNow]
				});
			}, 'UNIQUE');
			checks.push({
				name: 'UNIQUE (nombre, origen, variante=NULL) rechaza duplicado',
				ok: duplicateAttempt.ok,
				detail: duplicateAttempt.detail
			});

			// 11. Variante distinta — debe permitirse.
			let varianteDistintaOk = true;
			let varianteDistintaDetail = '';
			try {
				db.exec({
					sql: `INSERT INTO tecnicas (id, nombre, variante, posicion_origen_id, posicion_destino_id, sumision_destino_id, tipo, estado, detalles, errores_comunes, created_at, updated_at)
					      VALUES (?, ?, ?, ?, ?, NULL, ?, ?, ?, ?, ?, ?)`,
					bind: ['t2', 'Upa', 'con posting', 'p1', 'p2', 'escape', 'probando', '', '', pNow, pNow]
				});
			} catch (err) {
				varianteDistintaOk = false;
				varianteDistintaDetail = err instanceof Error ? err.message : String(err);
			}
			checks.push({
				name: 'UNIQUE permite misma técnica con variante distinta',
				ok: varianteDistintaOk,
				detail: varianteDistintaDetail
			});

			// 12. CHECK constraint: tipo='sumision' requiere sumision_destino_id.
			db.exec({
				sql: `INSERT INTO sumisiones_terminales (id, nombre, notas, created_at, updated_at)
				      VALUES (?, ?, ?, ?, ?)`,
				bind: ['s1', 'Mata leão', '', pNow, pNow]
			});
			const checkBad = expectThrows(() => {
				// tipo=sumision con posicion_destino — debe fallar el CHECK.
				db.exec({
					sql: `INSERT INTO tecnicas (id, nombre, variante, posicion_origen_id, posicion_destino_id, sumision_destino_id, tipo, estado, detalles, errores_comunes, created_at, updated_at)
					      VALUES (?, ?, NULL, ?, ?, NULL, ?, ?, ?, ?, ?, ?)`,
					bind: ['tbad', 'Sumisión mala', 'p1', 'p2', 'sumision', 'probando', '', '', pNow, pNow]
				});
			}, 'CHECK');
			checks.push({
				name: 'CHECK rechaza tipo=sumision sin sumision_destino_id',
				ok: checkBad.ok,
				detail: checkBad.detail
			});

			// 13. CHECK válido: sumisión con sumision_destino_id correcta.
			let sumisionOk = true;
			let sumisionDetail = '';
			try {
				db.exec({
					sql: `INSERT INTO tecnicas (id, nombre, variante, posicion_origen_id, posicion_destino_id, sumision_destino_id, tipo, estado, detalles, errores_comunes, created_at, updated_at)
					      VALUES (?, ?, NULL, ?, NULL, ?, ?, ?, ?, ?, ?, ?)`,
					bind: ['t3', 'Mata leão desde la espalda', 'p1', 's1', 'sumision', 'funciona', '', '', pNow, pNow]
				});
			} catch (err) {
				sumisionOk = false;
				sumisionDetail = err instanceof Error ? err.message : String(err);
			}
			checks.push({
				name: 'CHECK acepta sumisión con sumision_destino_id válida',
				ok: sumisionOk,
				detail: sumisionDetail
			});

			// 14. Re-ejecutar applyPendingMigrations es idempotente (no rompe nada).
			let idempotentOk = true;
			let idempotentDetail = '';
			try {
				applyPendingMigrations(db);
			} catch (err) {
				idempotentOk = false;
				idempotentDetail = err instanceof Error ? err.message : String(err);
			}
			checks.push({
				name: 'applyPendingMigrations() es idempotente (segunda llamada no rompe)',
				ok: idempotentOk,
				detail: idempotentDetail
			});

			results = checks;
			status = 'done';
		} catch (err) {
			checks.push({
				name: 'Excepción inesperada durante el smoke',
				ok: false,
				detail: err instanceof Error ? err.message : String(err)
			});
			results = checks;
			status = 'error';
			errorMessage = err instanceof Error ? err.message : String(err);
		} finally {
			try {
				db.close();
			} catch {
				// ignorar — la BD en memoria desaparece con el GC igualmente.
			}
		}
	}
</script>

<svelte:head>
	<title>DB migration smoke · BJJ Tracker</title>
</svelte:head>

<main class="mx-auto max-w-3xl space-y-4 p-4 pb-32">
	<header>
		<h1 class="text-2xl font-bold">Smoke — migración v1 → v2</h1>
		<p class="mt-1 text-sm text-muted-foreground">
			Verifica la migración del schema sobre una BD en memoria. No toca la BD real del usuario.
		</p>
	</header>

	{#if status === 'loading'}
		<p class="text-primary">Cargando SQLite-WASM…</p>
	{:else if status === 'error' && results.length === 0}
		<div class="rounded border border-destructive/30 bg-destructive/10 p-3">
			<p class="font-semibold text-destructive">Error</p>
			<pre class="mt-2 text-sm whitespace-pre-wrap text-destructive">{errorMessage}</pre>
		</div>
	{:else}
		<section class="space-y-3 rounded border border-border p-4">
			<p class="text-sm text-muted-foreground">
				Última versión de schema conocida por el código:
				<code class="text-foreground">{LATEST_SCHEMA_VERSION}</code>
			</p>
			<Button
				onclick={runSmoke}
				disabled={status === 'running' || status === 'idle'}
				class="w-full"
			>
				{status === 'running' ? 'Ejecutando…' : 'Ejecutar smoke'}
			</Button>
		</section>

		{#if results.length > 0}
			<section
				class="rounded border p-3 text-sm {ALL_OK
					? 'border-success/30 bg-success/10 text-success'
					: 'border-destructive/30 bg-destructive/10 text-destructive'}"
			>
				<p class="font-semibold">
					{ALL_OK
						? `${results.length} / ${results.length} checks OK`
						: `${results.filter((r) => r.ok).length} / ${results.length} checks OK`}
				</p>
			</section>

			<ul class="divide-y divide-border rounded border border-border">
				{#each results as r, i (i)}
					<li class="p-3">
						<div class="flex items-baseline justify-between gap-3">
							<span class="text-sm {r.ok ? 'text-foreground' : 'text-destructive'}">
								{r.ok ? '✓' : '✗'}
								{r.name}
							</span>
						</div>
						{#if r.detail}
							<pre class="mt-1 text-xs whitespace-pre-wrap text-muted-foreground">{r.detail}</pre>
						{/if}
					</li>
				{/each}
			</ul>
		{/if}
	{/if}
</main>
