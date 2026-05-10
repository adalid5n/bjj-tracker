<script lang="ts">
	import PlusIcon from '@lucide/svelte/icons/plus';

	let {
		href,
		onclick,
		label,
		children
	}: {
		href?: string;
		onclick?: () => void;
		label: string;
		children?: import('svelte').Snippet;
	} = $props();

	const baseClasses =
		'fixed right-5 bottom-20 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform hover:scale-105 hover:bg-primary/90 focus-visible:ring-3 focus-visible:ring-primary/50 focus-visible:outline-none';
</script>

{#if href}
	<a {href} class={baseClasses} aria-label={label}>
		{#if children}{@render children()}{:else}<PlusIcon class="size-6" />{/if}
	</a>
{:else}
	<button type="button" {onclick} class={baseClasses} aria-label={label}>
		{#if children}{@render children()}{:else}<PlusIcon class="size-6" />{/if}
	</button>
{/if}
