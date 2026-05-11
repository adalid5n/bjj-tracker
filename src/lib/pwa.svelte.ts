class PwaState {
	#needRefresh = $state(false);
	#dismissed = $state(false);
	#updateFn: ((reloadPage?: boolean) => Promise<void>) | null = null;

	get needRefresh() {
		return this.#needRefresh && !this.#dismissed;
	}

	async update() {
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
