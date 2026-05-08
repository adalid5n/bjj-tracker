#!/usr/bin/env node
import { copyFile, mkdir, access } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(here, '..');
const srcDir = join(repoRoot, 'node_modules', '@sqlite.org', 'sqlite-wasm', 'dist');
const dstDir = join(repoRoot, 'static', 'sqlite');

// Only the WASM binary is staged in /static. The JS module is bundled by Vite
// via `import sqlite3InitModule from '@sqlite.org/sqlite-wasm'` and uses
// `locateFile` to find the binary at runtime under `static/sqlite/`.
const FILES = ['sqlite3.wasm'];

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
