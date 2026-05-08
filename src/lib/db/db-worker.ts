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

	const poolUtil = await sqlite3.installOpfsSAHPoolVfs({
		name: 'opfs-sahpool',
		initialCapacity: 6
	});

	const db = new poolUtil.OpfsSAHPoolDb('/bjj-tracker.sqlite3');

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
