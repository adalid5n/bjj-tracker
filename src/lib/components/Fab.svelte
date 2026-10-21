<script lang="ts">
	import PlusIcon from '@lucide/svelte/icons/plus';

	let {
		href,
		onclick,
		label,
		extended = false,
		children,
		...rest
	}: {
		href?: string;
		onclick?: () => void;
		label: string;
		extended?: boolean;
		children?: import('svelte').Snippet;
		// Resto de atributos al <button> (p. ej. props de un DropdownMenu.Trigger).
		[key: string]: unknown;
	} = $props();

	const baseClasses =
		'fixed right-5 bottom-[calc(var(--bottom-nav-h)+1.5rem+env(safe-area-inset-bottom))] z-30 flex h-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform hover:scale-105 hover:bg-primary/90 focus-visible:ring-3 focus-visible:ring-primary/50 focus-visible:outline-none disabled:pointer-events-none';
	const sizeClasses = $derived(extended ? 'gap-2 px-5 text-sm font-medium' : 'w-14');
</script>

{#if href}
	<a {href} class="{baseClasses} {sizeClasses}" aria-label={label}>
		{#if children}{@render children()}{:else}<PlusIcon class="size-6" />{/if}
		{#if extended}<span>{label}</span>{/if}
	</a>
{:else}
	<button type="button" {onclick} {...rest} class="{baseClasses} {sizeClasses}" aria-label={label}>
		{#if children}{@render children()}{:else}<PlusIcon class="size-6" />{/if}
		{#if extended}<span>{label}</span>{/if}
	</button>
{/if}
