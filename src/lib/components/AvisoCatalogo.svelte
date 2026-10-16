<script lang="ts">
	/**
	 * Banner con el aviso de `avisoCatalogo` (T-4.it7): lo que la app hizo en
	 * la otra disciplina para completar un elemento "Ambos". Una línea corta
	 * por evento; el icono de info abre un Popover (al tocar o hacer clic,
	 * no hover: tiene que funcionar en la tablet) con el detalle. Color
	 * `info` para lo informativo y `warning` para lo que el usuario puede
	 * querer arreglar. Se cierra entero con ✕.
	 */
	import InfoIcon from '@lucide/svelte/icons/info';
	import XIcon from '@lucide/svelte/icons/x';
	import * as Popover from '$lib/components/ui/popover';
	import { avisoCatalogo } from '$lib/aviso-catalogo.svelte';
</script>

{#if avisoCatalogo.hayAviso}
	<div
		role="status"
		class="flex items-start gap-2 rounded-md border border-border bg-card p-2 text-sm text-foreground"
	>
		<ul class="flex-1 space-y-1">
			{#each avisoCatalogo.lineas as linea, i (i)}
				<li
					class="flex items-center gap-1.5 rounded-md border-l-4 py-1 pr-0.5 pl-2 {linea.tono ===
					'warning'
						? 'border-warning bg-warning/15'
						: 'border-info bg-info/10'}"
				>
					<span class="flex-1">{linea.texto}</span>
					<Popover.Root>
						<Popover.Trigger
							class="inline-flex size-8 shrink-0 items-center justify-center rounded-full outline-none hover:bg-foreground/10 focus-visible:ring-2 focus-visible:ring-ring {linea.tono ===
							'warning'
								? 'text-foreground'
								: 'text-info'}"
							aria-label="Más información: {linea.texto}"
						>
							<InfoIcon class="size-4" />
						</Popover.Trigger>
						<Popover.Content
							side="bottom"
							align="end"
							collisionPadding={16}
							class="max-w-[calc(100vw-2rem)] leading-relaxed"
						>
							{linea.detalle}
						</Popover.Content>
					</Popover.Root>
				</li>
			{/each}
		</ul>
		<button
			type="button"
			class="inline-flex size-8 shrink-0 items-center justify-center rounded-full text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
			aria-label="Cerrar aviso"
			onclick={() => avisoCatalogo.clear()}
		>
			<XIcon class="size-4" />
		</button>
	</div>
{/if}
