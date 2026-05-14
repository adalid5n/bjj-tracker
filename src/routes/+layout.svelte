<script lang="ts">
    import './layout.css';
    import favicon from '$lib/assets/favicon.svg';
    import { onMount } from 'svelte';
    import { page } from '$app/state';
    import { pwaInfo } from 'virtual:pwa-info';
    import { initPWA } from '$lib/pwa.svelte';
    import { theme } from '$lib/theme.svelte';
    import UpdateToast from '$lib/components/UpdateToast.svelte';
    import AppHeader from '$lib/components/AppHeader.svelte';
    import { deriveHeader } from '$lib/header-title';

    let { children } = $props();

    const header = $derived(deriveHeader(page.url.pathname));

    onMount(async () => {
        // M7: inicializa el theme manager (lee localStorage + prefers-color-scheme
        // y aplica la clase `.dark` en <html>). Idempotente y SSR-safe.
        theme.init();
        if (pwaInfo) {
            await initPWA();
        }
    });
</script>

<svelte:head>
    <link rel="icon" href={favicon} />
    {@html pwaInfo ? pwaInfo.webManifest.linkTag : ''}
</svelte:head>

<UpdateToast />

<AppHeader title={header.title} isTopLevel={header.isTopLevel} />

{@render children()}
