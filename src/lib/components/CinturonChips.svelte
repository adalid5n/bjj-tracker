<script lang="ts">
	type Cinturon = 'blanco' | 'azul' | 'morado' | 'marron' | 'negro';

	let {
		value,
		onChange,
		ariaLabel
	}: {
		value: Cinturon | null;
		onChange: (v: Cinturon) => void;
		ariaLabel?: string;
	} = $props();

	const cinturones: { value: Cinturon; label: string; color: string; tipBlack: boolean }[] = [
		{ value: 'blanco', label: 'Cinturón blanco', color: 'var(--cinturon-blanco)', tipBlack: false },
		{ value: 'azul', label: 'Cinturón azul', color: 'var(--cinturon-azul)', tipBlack: true },
		{ value: 'morado', label: 'Cinturón morado', color: 'var(--cinturon-morado)', tipBlack: true },
		{ value: 'marron', label: 'Cinturón marrón', color: 'var(--cinturon-marron)', tipBlack: true },
		{ value: 'negro', label: 'Cinturón negro', color: 'var(--cinturon-negro)', tipBlack: false }
	];
</script>

<div role="radiogroup" aria-label={ariaLabel ?? 'Cinturón'} class="flex flex-wrap gap-3">
	{#each cinturones as c (c.value)}
		{@const selected = value === c.value}
		<button
			type="button"
			role="radio"
			aria-checked={selected}
			aria-label={c.label}
			title={c.label}
			class="relative h-7 w-20 overflow-hidden rounded-sm border border-foreground/30 transition-all focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none {selected
				? 'ring-2 ring-primary ring-offset-2 ring-offset-background'
				: ''}"
			onclick={() => onChange(c.value)}
		>
			<span class="absolute inset-0" style:background-color={c.color}></span>
			{#if c.tipBlack}
				<span
					class="absolute inset-y-0 left-0 w-1/4"
					style:background-color="var(--cinturon-negro)"
				></span>
			{/if}
		</button>
	{/each}
</div>
