<script lang="ts">
    import './layout.css';
    import favicon from '$lib/assets/favicon.svg';
    import { onMount } from 'svelte';
    import { pwaInfo } from 'virtual:pwa-info';

    let { children } = $props();

    onMount(async () => {
        if (pwaInfo) {
            const { registerSW } = await import('virtual:pwa-register');
            registerSW({ immediate: true });
        }
    });
</script>

<svelte:head>
    <link rel="icon" href={favicon} />
    {@html pwaInfo ? pwaInfo.webManifest.linkTag : ''}
</svelte:head>

{@render children()}