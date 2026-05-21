class PwaState {
	#needRefresh = $state(false);
	#dismissed = $state(false);
	#updating = $state(false);
	#updateFn: ((reloadPage?: boolean) => Promise<void>) | null = null;

	get needRefresh() {
		return this.#needRefresh && !this.#dismissed;
	}

	get updating() {
		return this.#updating;
	}

	async update() {
		if (this.#updating) return;
		this.#updating = true;
		// Fallback: si controllerchange no dispara el reload en 3s, forzamos uno.
		// Cubre el caso de un SW sin handler de SKIP_WAITING o timing raro.
		setTimeout(() => window.location.reload(), 3000);
		// Da tiempo al spinner a pintarse antes de iniciar el reload, que
		// con un SW listo puede dispararse en <50ms.
		await new Promise((r) => setTimeout(r, 400));
		await this.#updateFn?.(true);
	}

	dismiss() {
		this.#dismissed = true;
	}

	async init() {
		const { registerSW } = await import('virtual:pwa-register');
		this.#updateFn = registerSW({
			immediate: true,
			onNeedRefresh: () => {
				this.#needRefresh = true;
			}
		});
	}
}

export const pwa = new PwaState();
export const initPWA = () => pwa.init();
