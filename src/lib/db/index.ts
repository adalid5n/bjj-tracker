/**
 * Public DB API. Client-only — must NOT be imported during SSR/prerender.
 * Always import dynamically from `onMount` or after a `browser` guard:
 *
 *   import { onMount } from 'svelte';
 *   onMount(async () => {
 *     const db = await import('$lib/db');
 *     await db.init();
 *   });
 *
 * Internally runs SQLite-WASM in a dedicated Worker with the OPFS-SAH-Pool VFS,
 * which is the only persistent option that works on hosts (like GitHub Pages)
 * without COOP/COEP headers.
 */

import { base } from '$app/paths';
import type { Row, SqlValue } from './types';

type Pending = { resolve: (rows?: Row[]) => void; reject: (err: Error) => void };
type WorkerReply =
	| { id: number; ok: true; rows?: Row[] }
	| { id: number; ok: false; error: string };

let worker: Worker | null = null;
let initPromise: Promise<void> | null = null;
let nextId = 1;
const pending = new Map<number, Pending>();

function assertBrowser() {
	if (typeof window === 'undefined') {
		throw new Error('lib/db is client-only. Import inside onMount or after `browser` guard.');
	}
}

function send<T extends Row[] | undefined>(payload: object): Promise<T> {
	assertBrowser();
	if (!worker) throw new Error('DB not initialized. Call init() first.');
	const id = nextId++;
	return new Promise<T>((resolve, reject) => {
		pending.set(id, {
			resolve: (rows) => resolve(rows as T),
			reject
		});
		worker!.postMessage({ id, ...payload });
	});
}

/**
 * Initializes the DB. Idempotent — second and later calls return the same
 * promise and do not re-spawn the worker.
 *
 * On first call: dynamic-imports the worker module, instantiates it,
 * registers message and error listeners, and tells it to open the OPFS
 * SAH-Pool VFS and apply SCHEMA_V1 if the schema_meta table is missing.
 *
 * **SSR-safe:** throws synchronously if invoked outside a browser context.
 * Callers must invoke from `onMount` or after a `browser` guard.
 *
 * Throws if the DB cannot be opened, e.g. when another live instance
 * (another tab or PWA window on the same origin) is holding the OPFS
 * sync access handles. The error message contains
 * "Access Handles cannot be created" — UI may detect that pattern to
 * show an actionable contention message.
 */
export async function init(): Promise<void> {
	assertBrowser();
	if (initPromise) return initPromise;

	initPromise = (async () => {
		const { default: DbWorker } = await import('./db-worker?worker');
		worker = new DbWorker();
		worker.addEventListener('message', (event: MessageEvent<WorkerReply>) => {
			const reply = event.data;
			const slot = pending.get(reply.id);
			if (!slot) return;
			pending.delete(reply.id);
			if (reply.ok) slot.resolve(reply.rows);
			else slot.reject(new Error(reply.error));
		});
		worker.addEventListener('error', (event) => {
			const err = new Error(event.message || 'DB worker crashed');
			for (const slot of pending.values()) slot.reject(err);
			pending.clear();
		});

		const wasmBaseUrl = `${window.location.origin}${base}/sqlite`;
		await send({ type: 'init', wasmBaseUrl });
	})();

	return initPromise;
}

/**
 * Executes a statement that returns no rows (INSERT, UPDATE, DELETE, DDL).
 * `params` are bound positionally to `?` placeholders in `sql`.
 * Rejects with the SQLite error message on failure.
 *
 * Requires `init()` to have completed; throws synchronously otherwise.
 */
export async function run(sql: string, params?: SqlValue[]): Promise<void> {
	await send({ type: 'run', sql, params });
}

/**
 * Executes a SELECT and returns the rows as objects keyed by column name.
 * `params` are bound positionally to `?` placeholders in `sql`.
 * The caller passes the type parameter to assert the row shape — no
 * runtime validation, columns must match the SELECT projection.
 *
 * Requires `init()` to have completed; throws synchronously otherwise.
 */
export async function query<T = Row>(sql: string, params?: SqlValue[]): Promise<T[]> {
	const rows = await send<Row[]>({ type: 'query', sql, params });
	return (rows ?? []) as T[];
}
