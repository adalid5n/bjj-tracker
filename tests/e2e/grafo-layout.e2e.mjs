/**
 * Validación visual end-to-end del flujo de layout persistido del grafo
 * (T-9.it3). Script manual standalone, NO entra en `pnpm test:e2e`
 * (extensión `.e2e.mjs` queda fuera del `testMatch` de Playwright). Se
 * ejecuta a mano contra `pnpm preview` o `pnpm dev`:
 *
 *   pnpm build && pnpm preview &        # o `pnpm dev -- --host`
 *   node tests/e2e/grafo-layout.e2e.mjs
 *
 * Variables de entorno:
 *   BJJ_E2E_URL   URL base del grafo (default:
 *                 http://localhost:4173/bjj-tracker/mapa para preview;
 *                 si usas dev usa http://localhost:5173/mapa)
 *   BJJ_E2E_OUT   Carpeta para screenshots (default:
 *                 tests/e2e/output/grafo_shots, gitignored)
 *
 * Cubre 10 casos: carga / creación de posiciones / auto-dirty /
 * Guardar / persistencia tras reload / drag / Reorganizar / AlertDialog
 * Cancelar / AlertDialog Descartar. Reporta errores y warnings de
 * consola al final.
 */

import { chromium } from 'playwright';
import { mkdtempSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const BASE_URL = process.env.BJJ_E2E_URL ?? 'http://localhost:4173/bjj-tracker/mapa';
const SHOT_DIR = resolve(
	process.env.BJJ_E2E_OUT ?? 'tests/e2e/output/grafo_shots'
);
mkdirSync(SHOT_DIR, { recursive: true });

function shot(page, name) {
	return page.screenshot({ path: `${SHOT_DIR}/${name}.png`, fullPage: false });
}

async function createPosicion(page, name) {
	console.log(`  creating posicion '${name}'...`);
	await page.getByRole('button', { name: 'Crear nuevo elemento del mapa' }).click();
	await page.getByText('Nueva posición').click();
	await page.waitForTimeout(600);
	const firstInput = page.getByRole('textbox').first();
	await firstInput.fill(name);
	await page.waitForTimeout(200);
	for (let i = 0; i < 12; i++) {
		const guardar = page.getByRole('button', { name: /^Guardar(?!\sorganización)/ });
		const continuar = page.getByRole('button', { name: /^(Continuar|Saltar|Sin emparejar)/ });
		const guardarCount = await guardar.count();
		if (guardarCount && (await guardar.first().isEnabled())) {
			console.log(`    step ${i}: clicking Guardar`);
			await guardar.first().click();
			break;
		}
		const continuarCount = await continuar.count();
		if (continuarCount && (await continuar.first().isEnabled())) {
			console.log(`    step ${i}: clicking Continuar/Saltar`);
			await continuar.first().click();
			await page.waitForTimeout(400);
			continue;
		}
		console.log(`    step ${i}: no button found, breaking`);
		break;
	}
	await page.waitForTimeout(1200);
	const sheetOpen = await page.locator('[data-state="open"][role="dialog"]').count();
	if (sheetOpen > 0) {
		console.log(`    sheet still open (${sheetOpen}), forcing close via X button`);
		const closeBtn = page.getByRole('button', { name: 'Cerrar' });
		if (await closeBtn.count()) {
			await closeBtn.first().click({ force: true });
			await page.waitForTimeout(500);
		}
	}
}

async function main() {
	const profileDir = mkdtempSync(join(tmpdir(), 'bjj-profile-'));
	console.log(`profile dir: ${profileDir}`);
	console.log(`base URL:    ${BASE_URL}`);
	console.log(`shot dir:    ${SHOT_DIR}`);
	const logs = [];
	const errors = [];

	const ctx = await chromium.launchPersistentContext(profileDir, {
		headless: true,
		viewport: { width: 1280, height: 800 }
	});
	const page = await ctx.newPage();
	page.on('console', (msg) => {
		const text = `[${msg.type()}] ${msg.text()}`;
		logs.push(text);
		if (msg.type() === 'error' || msg.type() === 'warning') {
			console.log(`  CONSOLE ${text}`);
		}
	});
	page.on('pageerror', (err) => {
		errors.push(err.message);
		console.log(`  PAGEERROR ${err.message}`);
	});

	console.log('\n=== 1. open /mapa fresh ===');
	await page.goto(BASE_URL);
	await page.waitForLoadState('networkidle');
	await page.waitForTimeout(1500);
	await shot(page, '01_empty_mapa');

	console.log('\n=== 2. create 2 posiciones ===');
	await createPosicion(page, 'Guardia cerrada');
	await page.waitForTimeout(500);
	await createPosicion(page, 'Mount');
	await page.waitForTimeout(1000);
	await shot(page, '02_after_creating');

	await page.keyboard.press('Escape');
	await page.waitForTimeout(500);

	console.log('\n=== 3. verify auto-dirty=true ===');
	const guardarLocator = page.getByRole('button', {
		name: 'Guardar organización del grafo'
	});
	let isVisible =
		(await guardarLocator.count()) > 0 && (await guardarLocator.first().isVisible());
	console.log(`  Guardar button visible: ${isVisible}`);
	await shot(page, '03_auto_dirty');
	if (!isVisible) throw new Error('Expected Guardar visible after creating nodes');

	console.log('\n=== 4. click Guardar ===');
	await guardarLocator.first().click();
	await page.waitForTimeout(1500);
	isVisible =
		(await guardarLocator.count()) > 0 && (await guardarLocator.first().isVisible());
	console.log(`  Guardar button visible after save: ${isVisible}`);
	await shot(page, '04_after_save');
	if (isVisible) throw new Error('Expected Guardar to disappear after save');

	console.log('\n=== 5. reload, expect dirty=false ===');
	await page.reload();
	await page.waitForLoadState('networkidle');
	await page.waitForTimeout(2500);
	const guardar2 = page.getByRole('button', { name: 'Guardar organización del grafo' });
	const visibleAfterReload =
		(await guardar2.count()) > 0 && (await guardar2.first().isVisible());
	console.log(`  Guardar button visible after reload: ${visibleAfterReload}`);
	await shot(page, '05_after_reload');
	if (visibleAfterReload)
		throw new Error('After saving + reloading, dirty should be false');

	console.log('\n=== 6. drag a node, expect dirty=true ===');
	const canvas = page.locator('canvas').first();
	const bbox = await canvas.boundingBox();
	if (bbox) {
		const cx = bbox.x + bbox.width / 2;
		const cy = bbox.y + bbox.height / 2;
		await page.mouse.move(cx, cy);
		await page.mouse.down();
		await page.mouse.move(cx + 80, cy + 40, { steps: 10 });
		await page.mouse.up();
		await page.waitForTimeout(800);
	}
	let visibleAfterDrag =
		(await guardar2.count()) > 0 && (await guardar2.first().isVisible());
	console.log(`  Guardar button visible after drag (center): ${visibleAfterDrag}`);
	if (!visibleAfterDrag && bbox) {
		for (const xOff of [-150, 150, -250, 250]) {
			const x = bbox.x + bbox.width / 2 + xOff;
			const y = bbox.y + bbox.height / 2;
			await page.mouse.move(x, y);
			await page.mouse.down();
			await page.mouse.move(x + 60, y - 30, { steps: 8 });
			await page.mouse.up();
			await page.waitForTimeout(500);
			visibleAfterDrag =
				(await guardar2.count()) > 0 && (await guardar2.first().isVisible());
			if (visibleAfterDrag) {
				console.log(`  drag at xOff=${xOff} triggered dirty`);
				break;
			}
		}
	}
	await shot(page, '06_after_drag');
	console.log(`  Guardar visible after drag attempts: ${visibleAfterDrag}`);

	console.log('\n=== 7. click Reorganizar ===');
	const reorgBtn = page.getByRole('button', { name: 'Reorganizar grafo' });
	if ((await reorgBtn.count()) > 0) {
		await reorgBtn.first().click();
		await page.waitForTimeout(1500);
		const visibleAfterReorg =
			(await guardar2.count()) > 0 && (await guardar2.first().isVisible());
		console.log(`  Guardar visible after Reorganizar: ${visibleAfterReorg}`);
		await shot(page, '07_after_reorganizar');
		if (!visibleAfterReorg) throw new Error('Expected dirty=true after Reorganizar');
	} else {
		throw new Error('Reorganizar button not found');
	}

	console.log('\n=== 8. attempt switch to Lista with dirty=true ===');
	await page.getByRole('tab', { name: 'Lista' }).click();
	await page.waitForTimeout(800);
	const alertTitle = page.getByText('¿Descartar cambios del grafo?');
	const alertVisible = (await alertTitle.count()) > 0;
	console.log(`  AlertDialog visible: ${alertVisible}`);
	await shot(page, '08_alertdialog');
	if (!alertVisible) throw new Error('Expected AlertDialog on toggle with dirty=true');

	const cancelar = page.getByRole('button', { name: 'Cancelar' });
	await cancelar.first().click();
	await page.waitForTimeout(500);
	const grafoTab = page.getByRole('tab', { name: 'Grafo' });
	const sel = await grafoTab.first().getAttribute('aria-selected');
	console.log(`  Grafo tab aria-selected after Cancelar: ${sel}`);
	await shot(page, '09_after_cancel');
	if (sel !== 'true') throw new Error('Expected to remain in Grafo view after Cancelar');

	console.log('\n=== 9. attempt switch to Lista, Descartar ===');
	await page.getByRole('tab', { name: 'Lista' }).click();
	await page.waitForTimeout(500);
	const descartar = page.getByRole('button', { name: 'Descartar' });
	await descartar.first().click();
	await page.waitForTimeout(800);
	const listaTab = page.getByRole('tab', { name: 'Lista' });
	const sel2 = await listaTab.first().getAttribute('aria-selected');
	console.log(`  Lista tab aria-selected after Descartar: ${sel2}`);
	await shot(page, '10_after_descartar');
	if (sel2 !== 'true') throw new Error('Expected switch to Lista after Descartar');

	console.log('\n=== console summary ===');
	const errorsInLogs = logs.filter((l) => l.startsWith('[error]'));
	const warningsInLogs = logs.filter((l) => l.startsWith('[warning]'));
	console.log(`  total console messages: ${logs.length}`);
	console.log(`  errors: ${errorsInLogs.length}`);
	console.log(`  warnings: ${warningsInLogs.length}`);
	if (errorsInLogs.length) {
		console.log('  --- errors ---');
		errorsInLogs.forEach((e) => console.log(`    ${e}`));
	}
	if (warningsInLogs.length) {
		console.log('  --- warnings ---');
		warningsInLogs.forEach((w) => console.log(`    ${w}`));
	}
	if (errors.length) {
		console.log(`  page errors: ${errors.length}`);
		errors.forEach((e) => console.log(`    ${e}`));
	}

	await ctx.close();
}

main()
	.then(() => {
		console.log('\nOK');
		process.exit(0);
	})
	.catch((err) => {
		console.log(`\nFAIL: ${err.message}`);
		console.error(err);
		process.exit(1);
	});
