/// <reference lib="webworker" />

import sqlite3InitModule from '@sqlite.org/sqlite-wasm';
import { SCHEMA_V1, applyPendingMigrations } from './schema';
import type { Row, SqlValue } from './types';

type InMessage =
	| { id: number; type: 'init'; wasmBaseUrl: string }
	| { id: number; type: 'pause' }
	| { id: number; type: 'run'; sql: string; params?: SqlValue[] }
	| { id: number; type: 'query'; sql: string; params?: SqlValue[] };

type OutMessage = { id: number; ok: true; rows?: Row[] } | { id: number; ok: false; error: string };

type Sqlite3Static = Awaited<ReturnType<typeof sqlite3InitModule>>;
type SAHPoolUtil = Awaited<ReturnType<Sqlite3Static['installOpfsSAHPoolVfs']>>;
type DbHandle = { exec: (...a: unknown[]) => unknown; close: () => void };

let sqlite3: Sqlite3Static | null = null;
let poolUtil: SAHPoolUtil | null = null;
let db: DbHandle | null = null;
let initialized = false;
let paused = false;

async function loadSqlite(wasmBaseUrl: string): Promise<void> {
	if (sqlite3) return;
	// The package types declare init() with no params, but the underlying
	// Emscripten module accepts an options object at runtime (locateFile being
	// the standard hook to redirect the .wasm fetch).
	// @ts-expect-error -- intentionally passing config the typings hide
	sqlite3 = await sqlite3InitModule({
		locateFile: (file: string) => `${wasmBaseUrl}/${file}`
	});
}

// Retry installOpfsSAHPoolVfs / unpauseVfs on the transient race where a
// previous holder of the OPFS sync access handles has just released them but
// the OS hasn't reflected it yet (~50-300ms window). On real contention
// (another live instance still holding the handles), all retries fail and
// the original error propagates so the caller can show a meaningful UI.
async function withSahPoolRetry<T>(
	op: () => Promise<T>,
	attempts = 5,
	baseDelayMs = 200
): Promise<T> {
	let lastError: unknown;
	for (let i = 0; i < attempts; i++) {
		try {
			return await op();
		} catch (err) {
			lastError = err;
			const msg = err instanceof Error ? err.message : String(err);
			if (!msg.includes('Access Handles cannot be created')) throw err;
			if (i === attempts - 1) throw lastError;
			await new Promise((r) => setTimeout(r, baseDelayMs * (i + 1)));
		}
	}
	throw lastError;
}

async function installPool(): Promise<void> {
	if (poolUtil) return;
	if (!sqlite3) throw new Error('sqlite3 module not loaded');
	poolUtil = await withSahPoolRetry(() =>
		sqlite3!.installOpfsSAHPoolVfs({
			name: 'opfs-sahpool',
			initialCapacity: 6
		})
	);
}

function openDbHandle(): void {
	if (!poolUtil) throw new Error('SAH-Pool not installed');
	db = new poolUtil.OpfsSAHPoolDb('/bjj-tracker.sqlite3') as unknown as DbHandle;
	// Las FK están OFF por defecto en SQLite. Sin esto, REFERENCES y
	// ON DELETE CASCADE/SET NULL declarados en el schema son letra muerta.
	db.exec('PRAGMA foreign_keys = ON');
	const needsSchema =
		(
			db.exec({
				sql: "SELECT name FROM sqlite_master WHERE type='table' AND name='schema_meta'",
				returnValue: 'resultRows',
				rowMode: 'array'
			}) as unknown[]
		).length === 0;
	if (needsSchema) {
		db.exec(SCHEMA_V1);
	}
	applyPendingMigrations(db);
}

async function pauseDb(): Promise<void> {
	if (paused || !initialized) return;
	if (db) {
		db.close();
		db = null;
	}
	if (poolUtil) {
		// pauseVfs returns SAHPoolUtil sync per JSDoc; await is harmless.
		await poolUtil.pauseVfs();
	}
	paused = true;
}

async function resumeIfPaused(): Promise<void> {
	if (!paused) return;
	if (!poolUtil) throw new Error('SAH-Pool not installed');
	await withSahPoolRetry(async () => {
		await poolUtil!.unpauseVfs();
	});
	openDbHandle();
	paused = false;
}

// Serialize all worker operations so pause cannot interleave between two
// halves of an in-flight query, and so concurrent pauses/queries chain in
// arrival order.
let opChain: Promise<unknown> = Promise.resolve();
function enqueue<T>(op: () => Promise<T>): Promise<T> {
	const result = opChain.then(() => op());
	opChain = result.catch(() => {
		// swallow to keep chain alive across errors; per-op handler reports it
	});
	return result;
}

self.addEventListener('message', (event: MessageEvent<InMessage>) => {
	const msg = event.data;
	const reply = (out: OutMessage) => (self as unknown as Worker).postMessage(out);

	void enqueue(async () => {
		try {
			if (msg.type === 'init') {
				if (!initialized) {
					await loadSqlite(msg.wasmBaseUrl);
					await installPool();
					openDbHandle();
					initialized = true;
				}
				reply({ id: msg.id, ok: true });
				return;
			}

			if (msg.type === 'pause') {
				await pauseDb();
				reply({ id: msg.id, ok: true });
				return;
			}

			if (!initialized) {
				throw new Error('DB worker received command before init');
			}
			await resumeIfPaused();
			if (!db) throw new Error('DB handle not open');

			if (msg.type === 'run') {
				db.exec({ sql: msg.sql, bind: msg.params ?? [] });
				reply({ id: msg.id, ok: true });
				return;
			}

			if (msg.type === 'query') {
				const rows = db.exec({
					sql: msg.sql,
					bind: msg.params ?? [],
					returnValue: 'resultRows',
					rowMode: 'object'
				}) as Row[];
				reply({ id: msg.id, ok: true, rows });
				return;
			}
		} catch (err) {
			reply({ id: msg.id, ok: false, error: err instanceof Error ? err.message : String(err) });
		}
	});
});
