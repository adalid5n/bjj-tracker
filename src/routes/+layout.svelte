<script lang="ts">
    import './layout.css';
    import favicon from '$lib/assets/favicon.svg';
    import { onMount } from 'svelte';
    import { pwaInfo } from 'virtual:pwa-info';
    import { initPWA } from '$lib/pwa.svelte';
    import UpdateToast from '$lib/components/UpdateToast.svelte';

    let { children } = $props();

    onMount(async () => {
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

{@render children()}
