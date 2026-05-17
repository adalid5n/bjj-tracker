<script lang="ts">
	/**
	 * Botón flotante "?" con popover que muestra la leyenda visual del
	 * grafo (T-5.it3). Usa el primitive Popover de bits-ui directamente
	 * (no hay wrapper local instalado).
	 *
	 * Los swatches reutilizan los mismos tokens semánticos que el
	 * stylesheet de Cytoscape, así la leyenda y el grafo siguen
	 * sincronizados ante cambios de tema o de tokens.
	 */
	import HelpCircleIcon from '@lucide/svelte/icons/help-circle';
	import { Popover } from 'bits-ui';
	import { Button } from '$lib/components/ui/button';

	type ColorRow = { color: string; label: string; tipo: 'solid' | 'dashed' | 'dotted' };

	const tecnicas: ColorRow[] = [
		{ color: 'bg-primary', label: 'Ataque', tipo: 'solid' },
		{ color: 'bg-success', label: 'Sweep', tipo: 'solid' },
		{ color: 'bg-warning', label: 'Escape', tipo: 'solid' },
		{ color: 'bg-muted-foreground', label: 'Transición', tipo: 'dashed' },
		{ color: 'bg-destructive', label: 'Sumisión', tipo: 'solid' }
	];
</script>

<Popover.Root>
	<Popover.Trigger>
		{#snippet child({ props })}
			<Button
				{...props}
				variant="outline"
				size="icon"
				class="absolute top-3 right-3 z-10 size-9 rounded-full shadow-sm"
				aria-label="Leyenda del grafo"
			>
				<HelpCircleIcon class="size-4" />
			</Button>
		{/snippet}
	</Popover.Trigger>
	<Popover.Portal>
		<Popover.Content
			align="end"
			sideOffset={6}
			class="z-50 w-64 rounded-md border border-border bg-popover p-3 text-popover-foreground shadow-md outline-none"
		>
			<div class="space-y-3 text-sm">
				<div>
					<p class="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
						Técnicas (flechas)
					</p>
					<ul class="space-y-1.5">
						{#each tecnicas as row (row.label)}
							<li class="flex items-center gap-2">
								<span
									class="inline-block h-0.5 w-8 shrink-0 rounded {row.color}"
									class:border-t-2={row.tipo !== 'solid'}
									class:border-dashed={row.tipo === 'dashed'}
									class:border-dotted={row.tipo === 'dotted'}
									aria-hidden="true"
								></span>
								<span>{row.label}</span>
							</li>
						{/each}
					</ul>
				</div>

				<div>
					<p class="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
						Estado
					</p>
					<ul class="space-y-1.5">
						<li class="flex items-center gap-2">
							<span class="inline-block h-0.5 w-8 shrink-0 rounded bg-foreground" aria-hidden="true"
							></span>
							<span>Activa (funciona o probando)</span>
						</li>
						<li class="flex items-center gap-2">
							<span
								class="inline-block h-0 w-8 shrink-0 border-t-2 border-dotted border-foreground/40"
								aria-hidden="true"
							></span>
							<span>Descartada</span>
						</li>
					</ul>
				</div>

				<div>
					<p class="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
						Nodos
					</p>
					<ul class="space-y-1.5">
						<li class="flex items-center gap-2">
							<span
								class="inline-block size-4 shrink-0 rounded border border-border bg-muted"
								aria-hidden="true"
							></span>
							<span>Posición (borde: verde = ofensiva, rojo = defensiva)</span>
						</li>
						<li class="flex items-center gap-2">
							<span
								class="inline-block size-4 shrink-0 rotate-45 rounded-sm border-2 border-destructive bg-muted"
								aria-hidden="true"
							></span>
							<span>Sumisión (nodo terminal)</span>
						</li>
					</ul>
				</div>
			</div>
		</Popover.Content>
	</Popover.Portal>
</Popover.Root>
