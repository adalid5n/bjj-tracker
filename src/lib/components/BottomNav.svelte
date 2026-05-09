<script lang="ts">
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import HomeIcon from '@lucide/svelte/icons/house';
	import ListIcon from '@lucide/svelte/icons/list';
	import UsersIcon from '@lucide/svelte/icons/users';
	import SettingsIcon from '@lucide/svelte/icons/settings';

	const items = [
		{ href: resolve('/'), label: 'Home', icon: HomeIcon, match: (p: string) => p === resolve('/') },
		{
			href: resolve('/rolls'),
			label: 'Rolls',
			icon: ListIcon,
			match: (p: string) => p.startsWith(resolve('/rolls'))
		},
		{
			href: resolve('/companeros'),
			label: 'Compañeros',
			icon: UsersIcon,
			match: (p: string) => p.startsWith(resolve('/companeros'))
		},
		{
			href: resolve('/ajustes'),
			label: 'Ajustes',
			icon: SettingsIcon,
			match: (p: string) => p.startsWith(resolve('/ajustes'))
		}
	];

	const path = $derived(page.url.pathname);
</script>

<nav
	class="fixed right-0 bottom-0 left-0 z-20 border-t border-gray-200 bg-white shadow-[0_-2px_4px_rgba(0,0,0,0.04)]"
>
	<ul class="mx-auto flex max-w-md justify-around">
		{#each items as item (item.href)}
			{@const active = item.match(path)}
			<li class="flex-1">
				<a
					href={item.href}
					class="flex flex-col items-center gap-0.5 px-2 py-2 text-xs transition-colors {active
						? 'text-blue-600'
						: 'text-gray-500 hover:text-gray-800'}"
				>
					<item.icon class="size-5" />
					<span>{item.label}</span>
				</a>
			</li>
		{/each}
	</ul>
	<div class="h-[env(safe-area-inset-bottom)]"></div>
</nav>
