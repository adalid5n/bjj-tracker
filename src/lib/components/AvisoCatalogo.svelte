<script lang="ts">
	/**
	 * Banner con el aviso de `avisoCatalogo` (T-4.it7): lo que se creó en la
	 * otra disciplina para completar un elemento "Ambos". Se cierra con ✕.
	 */
	import XIcon from '@lucide/svelte/icons/x';
	import { avisoCatalogo } from '$lib/aviso-catalogo.svelte';
</script>

{#if avisoCatalogo.texto}
	<div
		role="status"
		class="flex items-start gap-2 rounded border border-warning/40 bg-warning/10 p-2 text-sm text-foreground"
	>
		<p class="flex-1">{avisoCatalogo.texto}</p>
		<button
			type="button"
			class="shrink-0 rounded p-0.5 text-muted-foreground hover:text-foreground"
			aria-label="Cerrar aviso"
			onclick={() => avisoCatalogo.clear()}
		>
			<XIcon class="h-4 w-4" />
		</button>
	</div>
{/if}
