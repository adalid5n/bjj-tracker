import type { Action } from 'svelte/action';

/**
 * Acción `use:longpress` (borrado-rolls-en-bloque): dispara `onLongPress`
 * tras mantener pulsado el elemento `duration` ms sin mover el puntero más
 * de `threshold` px (patrón Gmail/Fotos de Android). Funciona con dedo y con
 * ratón (botón principal).
 *
 * - Se cancela si el puntero se mueve (scroll), se suelta antes de tiempo o
 *   llega `pointercancel` (el navegador toma el gesto para hacer scroll).
 * - Tras disparar, el `click` que genera el navegador al soltar se anula
 *   (preventDefault + stopImmediatePropagation en captura) para que no
 *   abra/alterne nada más. El flag se rearma en cada `pointerdown`.
 * - Bloquea el menú contextual nativo del elemento (en Android aparece con
 *   la pulsación larga). El callout/selección de texto se quita con CSS en
 *   el propio elemento (`select-none [-webkit-touch-callout:none]`).
 */
export interface LongPressOptions {
	onLongPress: () => void;
	duration?: number;
	threshold?: number;
}

export const longpress: Action<HTMLElement, LongPressOptions> = (node, initial) => {
	let opts = initial;
	let timer: ReturnType<typeof setTimeout> | null = null;
	let startX = 0;
	let startY = 0;
	let fired = false;

	function cancel() {
		if (timer !== null) {
			clearTimeout(timer);
			timer = null;
		}
	}

	function onPointerDown(e: PointerEvent) {
		fired = false;
		if (!e.isPrimary || e.button !== 0) return;
		cancel();
		startX = e.clientX;
		startY = e.clientY;
		timer = setTimeout(() => {
			timer = null;
			fired = true;
			opts.onLongPress();
		}, opts.duration ?? 500);
	}

	function onPointerMove(e: PointerEvent) {
		if (timer === null) return;
		const t = opts.threshold ?? 10;
		if (Math.hypot(e.clientX - startX, e.clientY - startY) > t) cancel();
	}

	function onClickCapture(e: MouseEvent) {
		if (!fired) return;
		fired = false;
		e.preventDefault();
		e.stopImmediatePropagation();
	}

	function onContextMenu(e: Event) {
		e.preventDefault();
	}

	function onKeyDown() {
		// Un click por teclado nunca debe quedar anulado por un long-press previo.
		fired = false;
	}

	node.addEventListener('pointerdown', onPointerDown);
	node.addEventListener('pointermove', onPointerMove);
	node.addEventListener('pointerup', cancel);
	node.addEventListener('pointercancel', cancel);
	node.addEventListener('pointerleave', cancel);
	node.addEventListener('click', onClickCapture, true);
	node.addEventListener('contextmenu', onContextMenu);
	node.addEventListener('keydown', onKeyDown);

	return {
		update(next) {
			opts = next;
		},
		destroy() {
			cancel();
			node.removeEventListener('pointerdown', onPointerDown);
			node.removeEventListener('pointermove', onPointerMove);
			node.removeEventListener('pointerup', cancel);
			node.removeEventListener('pointercancel', cancel);
			node.removeEventListener('pointerleave', cancel);
			node.removeEventListener('click', onClickCapture, true);
			node.removeEventListener('contextmenu', onContextMenu);
			node.removeEventListener('keydown', onKeyDown);
		}
	};
};
