<script lang="ts">
	/**
	 * Header sticky global de la app. Análogo a BottomNav pero pegado arriba.
	 *
	 * Muestra:
	 *  - Botón "← Volver" (history.back()) sólo si `isTopLevel === false`.
	 *  - Título de la pantalla.
	 *
	 * Sin acciones a la derecha por ahora. El layout raíz lo deja siempre
	 * visible (no hide-on-scroll). El safe-area-top se respeta como en
	 * BottomNav (que respeta safe-area-bottom).
	 */
	import ArrowLeftIcon from '@lucide/svelte/icons/arrow-left';

	type Props = {
		title: string;
		isTopLevel?: boolean;
	};

	let { title, isTopLevel = false }: Props = $props();

	function handleBack() {
		history.back();
	}
</script>

<header
	class="sticky top-0 z-30 border-b border-border bg-background shadow-[0_2px_4px_rgba(0,0,0,0.04)]"
>
	<!-- Padding-top para safe-area en notch/dynamic-island. BottomNav usa
	     el mismo patrón para safe-area-bottom (un div separado al final). -->
	<div class="h-[env(safe-area-inset-top)]"></div>
	<div class="mx-auto flex h-14 max-w-2xl items-center gap-2 px-4">
		{#if !isTopLevel}
			<button
				type="button"
				onclick={handleBack}
				aria-label="Volver"
				class="-ml-2 inline-flex size-9 items-center justify-center rounded-md text-foreground transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
			>
				<ArrowLeftIcon class="size-5" />
			</button>
		{/if}
		<h1 class="truncate text-base font-semibold text-foreground">{title}</h1>
	</div>
</header>
