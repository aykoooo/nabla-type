<script lang="ts">
  import RotateCcw from "lucide-svelte/icons/rotate-ccw";
  import Tooltip from "./Tooltip.svelte";
  import MathInput from "./MathInput.svelte";

  let {
    id,
    label,
    value = $bindable(),
    min,
    max,
    step,
    isDirty = false,
    onReset,
    suffix,
  }: {
    id: string;
    label: string;
    value: number;
    min: number;
    max: number;
    step: number;
    isDirty?: boolean;
    onReset?: () => void;
    suffix?: string;
  } = $props();

  const decimals = $derived(Math.max(0, -Math.floor(Math.log10(step))));
</script>

<div class="flex flex-col gap-0.5">
  <label
    class="text-[13px] font-bold text-black flex justify-between items-center"
    for={id}
  >
    <span class="flex items-center gap-1"><span>{@html label}</span></span>
    <span class="flex items-center gap-1">
      <span class="inline-flex items-center justify-center w-5 h-5">
        {#if isDirty && onReset}
          <Tooltip content={`Reset ${label}`} side="top">
            <button
              type="button"
              class="text-brutal-secondary hover:text-black leading-none w-5 h-5 inline-flex items-center justify-center rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/30"
              onclick={onReset}
            >
              <RotateCcw class="w-2.5 h-2.5" strokeWidth={3} />
            </button>
          </Tooltip>
        {/if}
      </span>
      <MathInput
        {id}
        bind:value
        {min}
        {max}
        {decimals}
        {suffix}
        class="font-mono tabular-nums text-brutal-secondary font-medium text-right bg-transparent hover:bg-brutal-hover focus-visible:bg-brutal-hover focus-visible:outline-none px-1 h-5 rounded-sm {step < 0.1 ? 'w-16' : 'w-12'}"
      />
    </span>
  </label>
  <input
    {id}
    type="range"
    class="brutal-slider mt-1 shrink-0"
    {min}
    {max}
    {step}
    bind:value
  />
</div>
