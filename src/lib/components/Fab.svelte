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
		'fixed right-5 bottom-5 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-blue-600 text-white shadow-lg transition-transform hover:scale-105 hover:bg-blue-700 focus-visible:ring-3 focus-visible:ring-blue-500/50 focus-visible:outline-none';
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
