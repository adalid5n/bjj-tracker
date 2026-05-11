let needRefreshState = $state(false);
let dismissedInSession = $state(false);
let updateFn: ((reloadPage?: boolean) => Promise<void>) | null = null;

export const pwa = {
	get needRefresh() {
		return needRefreshState && !dismissedInSession;
	},
	async update() {
		await updateFn?.(true);
	},
	dismiss() {
		dismissedInSession = true;
	}
};

export async function initPWA() {
	const { registerSW } = await import('virtual:pwa-register');
	updateFn = registerSW({
		immediate: true,
		onNeedRefresh: () => {
			needRefreshState = true;
		}
	});
}
