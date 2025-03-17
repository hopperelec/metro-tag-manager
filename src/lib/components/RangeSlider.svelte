<!-- Adapted from https://svelte.dev/playground/75d34e46cbe64bb68b7c2ac2c61931ce -->

<script lang="ts">
  let {
    possibleRange = { min: 0, max: 100 },
    selectedRange = $bindable(possibleRange),
    render = (value) => value.toString(),
    parse = (value) => +value
  }: {
    possibleRange?: { min: number; max: number };
    selectedRange?: { min: number; max: number };
    render?: (value: number) => string;
    parse?: (value: string) => number;
  } = $props();
  
  type Side = "min" | "max";

  let slider: HTMLElement | undefined = $state();
  let inputElms: {
    min: HTMLInputElement | undefined;
    max: HTMLInputElement | undefined;
  } = $state({
    min: undefined,
    max: undefined
  });

  let activeHandle: Side | undefined = $state();
  let editingHandle: Side | undefined = $state();
  let renderedValues = $derived({
    min: render(selectedRange.min),
    max: render(selectedRange.max)
  })
  let inputString: string = $state("");
  let shake = $state(false);

  function clamp(value: number) {
    return Math.min(possibleRange.max, Math.max(possibleRange.min, value));
  }

  function calculateHandlePosition(side: Side) {
    return possibleMinPosition + (100 * clamp(selectedRange[side])) / possibleWidth;
  }
  
  let possibleWidth = $derived(possibleRange.max - possibleRange.min);
  let possibleMinPosition = $derived(100 * possibleRange.min);
  let selectedPosition = $derived({
    min: calculateHandlePosition("min"),
    max: calculateHandlePosition("max")
  })

  function setSelectedValue(side: Side, value: number) {
    if (side === "min") {
      selectedRange = {
        min: value,
        max: Math.max(selectedRange.max, value)
      };
    } else {
      selectedRange = {
        min: Math.min(selectedRange.min, value),
        max: value
      };
    }
  }

  function setActiveHandle(side: Side) {
    activeHandle = side;

    function handleMouseMove(event: MouseEvent) {
      if (!slider) return;
      const rect = slider.getBoundingClientRect();
      const value = clamp(Math.round(possibleWidth * (event.clientX - rect.left) / rect.width));
      setSelectedValue(side, value)
    }

    function handleMouseUp() {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    }

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  }

  function handleInputKeydown(event: KeyboardEvent) {
    if (!editingHandle) return;
    if (event.key === "Enter") {
      const value = parse(inputString);
      if (Number.isNaN(value)) {
        if (slider) {
          shake = true;
          setTimeout(() => {shake = false}, 300);
        }
      } else {
        setSelectedValue(editingHandle, value);
        editingHandle = undefined;
      }
    } else if (event.key === "Escape") {
      editingHandle = undefined;
    }
  }
</script>

{#snippet handle(side: Side)}
  <div
    aria-valuemax={possibleRange.max}
    aria-valuemin={possibleRange.min}
    aria-valuenow={selectedRange.min}
    class="handle"
    class:active={activeHandle === side}
    onmousedown={() => setActiveHandle(side)}
    ontouchstart={() => setActiveHandle(side)}
    role="slider"
    style:left={`${selectedPosition[side]}%`}
    tabindex="0"
  >
    <input
      type="text"
      class:hidden={editingHandle !== side}
      bind:value={inputString}
      bind:this={inputElms[side]}
      onblur={() => editingHandle = undefined}
      onkeydown={handleInputKeydown}
      style:width={`${inputString.length}ch`}
    />
    <button
      class:hidden={editingHandle === side}
      onclick={() => {
        editingHandle = side;
        inputString = renderedValues[side];
        setTimeout(() => inputElms[side]?.focus());
      }}
    >{renderedValues[side]}</button>
  </div>
{/snippet}

<div id="container">
  <div bind:this={slider} class="slider" class:shake>
    <div
      class="body"
      style:left={`${selectedPosition.min}%`}
      style:right={`${100 - selectedPosition.max}%`}
    ></div>
    {@render handle("min")}
    {@render handle("max")}
  </div>
</div>

<style lang="scss">
  #container {
    width: 100%;
    height: 20px;
    box-sizing: border-box;
  }

  .slider {
    position: relative;
    width: 100%;
    height: 6px;
    top: 50%;
    transform: translateY(-50%);
    background-color: #7b7b7b;
    border-radius: 1px;
  }

  .body {
    position: absolute;
    top: 0;
    bottom: 0;
    background-color: #34a1ff;
  }

  .handle {
    position: absolute;
    top: 50%;
    box-sizing: border-box;
    border-radius: 50%;
    width: 16px;
    height: 16px;
    background-color: #fdfdfd;
    border: 1px solid #7b7b7b;
    transform: translate(-50%, -50%);

    &.active {
      background-color: #ddd;
      z-index: 9;
    }

    & > button, input {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, 50%);
      font-size: 12px;
    }

    & > button {
      white-space: nowrap;
      background: none;
      border: none;
      cursor: text;
    }

    & > input {
      font-family: monospace; /* So width can be set in ch units */
    }
  }

  .hidden {
    visibility: hidden;
  }

  .shake {
    animation: shake 0.3s;
  }

  @keyframes shake {
    0%, 100% { transform: translateX(0); }
    12.5%, 62.5% { transform: translateX(-.5em); }
    37.5%, 87.5% { transform: translateX(.5em); }
  }
</style>