<script lang="ts">
	import Chips from '$lib/components/Chips.svelte';
	import CinturonChips from '$lib/components/CinturonChips.svelte';

	type Cinturon = 'blanco' | 'azul' | 'morado' | 'marron' | 'negro';

	let resultado = $state<string | null>(null);
	let tamano = $state<string | null>(null);
	let cinturon = $state<Cinturon | null>('azul');

	const resultadoOptions = [
		{ value: 'domine', label: 'Dominé' },
		{ value: 'equilibrado', label: 'Equilibrado' },
		{ value: 'me_dominaron', label: 'Me dominaron' }
	];

	const tamanoOptions = [
		{ value: 'mucho_menos', label: 'Mucho menos' },
		{ value: 'menos', label: 'Menos' },
		{ value: 'similar', label: 'Similar' },
		{ value: 'mas', label: 'Más' },
		{ value: 'mucho_mas', label: 'Mucho más' }
	];
</script>

<main class="mx-auto max-w-2xl space-y-6 p-4">
	<header>
		<h1 class="text-2xl font-bold">Chips — playground</h1>
		<p class="text-sm text-muted-foreground">
			Para verificar el componente. Esta página se elimina al cerrar it.0.5.
		</p>
	</header>

	<section class="space-y-2">
		<h2 class="text-sm font-semibold">Resultado (sin default)</h2>
		<Chips
			options={resultadoOptions}
			value={resultado}
			onChange={(v) => (resultado = v)}
			ariaLabel="Resultado del roll"
		/>
		<p class="text-xs text-muted-foreground">Valor: {resultado ?? '(ninguno)'}</p>
	</section>

	<section class="space-y-2">
		<h2 class="text-sm font-semibold">Tamaño relativo (5 opciones, wrap)</h2>
		<Chips
			options={tamanoOptions}
			value={tamano}
			onChange={(v) => (tamano = v)}
			ariaLabel="Tamaño relativo"
		/>
		<p class="text-xs text-muted-foreground">Valor: {tamano ?? '(ninguno)'}</p>
	</section>

	<section class="space-y-2">
		<h2 class="text-sm font-semibold">Cinturón (con default = azul)</h2>
		<CinturonChips
			value={cinturon}
			onChange={(v) => (cinturon = v)}
			ariaLabel="Cinturón"
		/>
		<p class="text-xs text-muted-foreground">Valor: {cinturon ?? '(ninguno)'}</p>
	</section>
</main>
