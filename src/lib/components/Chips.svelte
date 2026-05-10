<script lang="ts">
	type Option = { value: string; label: string; dotColor?: string };

	let {
		options,
		value,
		onChange,
		ariaLabel
	}: {
		options: Option[];
		value: string | null;
		onChange: (v: string) => void;
		ariaLabel?: string;
	} = $props();
</script>

<div role="radiogroup" aria-label={ariaLabel} class="flex flex-wrap gap-2">
	{#each options as opt (opt.value)}
		{@const selected = value === opt.value}
		<button
			type="button"
			role="radio"
			aria-checked={selected}
			class="inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none {selected
				? 'border-primary bg-primary text-primary-foreground'
				: 'border-border bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground'}"
			onclick={() => onChange(opt.value)}
		>
			{#if opt.dotColor}
				<span
					class="inline-block h-1.5 w-4 rounded-sm border border-foreground/20"
					style:background-color={opt.dotColor}
					aria-hidden="true"
				></span>
			{/if}
			{opt.label}
		</button>
	{/each}
</div>
