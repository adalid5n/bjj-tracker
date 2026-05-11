<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import XIcon from '@lucide/svelte/icons/x';
	import { pwa } from '$lib/pwa.svelte';
</script>

{#if pwa.needRefresh}
	<div
		role="status"
		aria-live="polite"
		class="fixed bottom-20 left-4 z-30 flex max-w-sm items-center gap-3 rounded-lg border border-border bg-card p-4 text-card-foreground shadow-lg"
	>
		<p class="flex-1 text-sm">Nueva versión disponible</p>
		<Button variant="default" size="sm" onclick={() => pwa.update()}>Recargar</Button>
		<Button
			variant="ghost"
			size="icon-sm"
			aria-label="Cerrar"
			onclick={() => pwa.dismiss()}
		>
			<XIcon />
		</Button>
	</div>
{/if}
