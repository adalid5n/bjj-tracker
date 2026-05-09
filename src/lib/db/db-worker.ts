/// <reference lib="webworker" />

import sqlite3InitModule from '@sqlite.org/sqlite-wasm';
import { SCHEMA_V1 } from './schema';
import type { Row, SqlValue } from './types';

type InMessage =
	| { id: number; type: 'init'; wasmBaseUrl: string }
	| { id: number; type: 'run'; sql: string; params?: SqlValue[] }
	| { id: number; type: 'query'; sql: string; params?: SqlValue[] };

type OutMessage =
	| { id: number; ok: true; rows?: Row[] }
	| { id: number; ok: false; error: string };

let dbPromise: Promise<{ exec: (...a: unknown[]) => unknown }> | null = null;

async function openDb(wasmBaseUrl: string) {
	// The package types declare init() with no params, but the underlying
	// Emscripten module accepts an options object at runtime (locateFile being
	// the standard hook to redirect the .wasm fetch).
	// @ts-expect-error -- intentionally passing config the typings hide
	const sqlite3 = await sqlite3InitModule({
		locateFile: (file: string) => `${wasmBaseUrl}/${file}`
	});

	// Retry installOpfsSAHPoolVfs to recover from the transient race where a
	// previous worker just terminated but the OS hasn't released the OPFS
	// sync access handles yet (~50-300ms window). On real contention (another
	// live instance holding the handles), all retries fail and the original
	// error propagates so the caller can show a meaningful UI.
	const RETRY_ATTEMPTS = 5;
	const RETRY_BASE_DELAY_MS = 200;
	let poolUtil: Awaited<ReturnType<typeof sqlite3.installOpfsSAHPoolVfs>> | null = null;
	let lastError: unknown;
	for (let i = 0; i < RETRY_ATTEMPTS; i++) {
		try {
			poolUtil = await sqlite3.installOpfsSAHPoolVfs({
				name: 'opfs-sahpool',
				initialCapacity: 6
			});
			break;
		} catch (err) {
			lastError = err;
			const msg = err instanceof Error ? err.message : String(err);
			if (!msg.includes('Access Handles cannot be created')) throw err;
			if (i === RETRY_ATTEMPTS - 1) throw lastError;
			await new Promise((r) => setTimeout(r, RETRY_BASE_DELAY_MS * (i + 1)));
		}
	}

	const db = new poolUtil!.OpfsSAHPoolDb('/bjj-tracker.sqlite3');

	const needsSchema =
		db.exec({
			sql: "SELECT name FROM sqlite_master WHERE type='table' AND name='schema_meta'",
			returnValue: 'resultRows',
			rowMode: 'array'
		}).length === 0;

	if (needsSchema) {
		db.exec(SCHEMA_V1);
	}

	return db as unknown as { exec: (...a: unknown[]) => unknown };
}

function ensureDb(): Promise<{ exec: (...a: unknown[]) => unknown }> {
	if (!dbPromise) throw new Error('DB worker received command before init');
	return dbPromise;
}

self.addEventListener('message', async (event: MessageEvent<InMessage>) => {
	const msg = event.data;
	const reply = (out: OutMessage) => (self as unknown as Worker).postMessage(out);

	try {
		if (msg.type === 'init') {
			if (!dbPromise) dbPromise = openDb(msg.wasmBaseUrl);
			await dbPromise;
			reply({ id: msg.id, ok: true });
			return;
		}

		const db = await ensureDb();

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
