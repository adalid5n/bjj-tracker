#!/usr/bin/env node
import { copyFile, mkdir, access } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(here, '..');
const srcDir = join(repoRoot, 'node_modules', '@sqlite.org', 'sqlite-wasm', 'dist');
const dstDir = join(repoRoot, 'static', 'sqlite');

// El SDK JS (`sqlite3InitModule`) se bundlea por Vite vía import. Pero el
// runtime de SQLite-WASM resuelve también assets adicionales con `locateFile`
// — el proxy async de OPFS se carga dinámicamente desde la URL base del wasm
// en algunos caminos de inicialización (Chrome móvil ha mostrado pantalla en
// blanco al refresh cuando el proxy 404eaba).
const FILES = ['sqlite3.wasm', 'sqlite3-opfs-async-proxy.js', 'sqlite3-worker1.mjs'];

try {
	await access(srcDir);
} catch {
	console.warn(
		`[copy-sqlite-wasm] skipped: ${srcDir} not found. ` +
			`Run after \`pnpm install\` populates node_modules.`
	);
	process.exit(0);
}

await mkdir(dstDir, { recursive: true });

for (const file of FILES) {
	await copyFile(join(srcDir, file), join(dstDir, file));
	console.log(`[copy-sqlite-wasm] copied ${file}`);
}
