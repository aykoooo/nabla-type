<script lang="ts">
  let {
    value = $bindable(),
    class: className = "",
    min = -Infinity,
    max = Infinity,
    decimals = 0,
    suffix = "",
    ...rest
  }: {
    value: number;
    class?: string;
    min?: number;
    max?: number;
    decimals?: number;
    suffix?: string;
    [key: string]: any;
  } = $props();

  let isFocused = $state(false);
  let editValue = $state("");

  $effect(() => {
    if (!isFocused) {
      editValue = value.toFixed(decimals);
    }
  });

  function handleBlur(e: FocusEvent) {
    isFocused = false;
    let parsed;
    try {
      const sanitized = editValue.replace(",", ".").replace(/[^0-9\.\+\-\*\/\(\) ]/g, "");
      parsed = new Function("return " + (sanitized || String(value)))();
    } catch (err) {
      parsed = Number(editValue.replace(",", ".").replace(/[^0-9\.\-]/g, ""));
    }

    if (typeof parsed === "number" && !isNaN(parsed)) {
      value = Math.min(max, Math.max(min, parsed));
    }

    // Call parent's onblur AFTER we've evaluated (so bind:value is updated first)
    if (rest.onblur) rest.onblur(e);
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (e.key === "Enter") {
      (e.currentTarget as HTMLElement).blur();
    }
    if (rest.onkeydown) rest.onkeydown(e);
  }

  function handleInput(e: Event) {
    editValue = (e.currentTarget as HTMLInputElement).value;
    if (rest.oninput) rest.oninput(e);
  }

  function handleFocus(e: FocusEvent) {
    isFocused = true;
    editValue = value.toFixed(decimals);
    if (rest.onfocus) rest.onfocus(e);
  }
</script>

<input
  type="text"
  inputmode="decimal"
  class={className}
  value={isFocused ? editValue : value.toFixed(decimals) + suffix}
  {...rest}
  onfocus={handleFocus}
  onblur={handleBlur}
  oninput={handleInput}
  onkeydown={handleKeyDown}
/>
