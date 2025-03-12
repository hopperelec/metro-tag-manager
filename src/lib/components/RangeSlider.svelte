<!-- Adapted from https://svelte.dev/playground/75d34e46cbe64bb68b7c2ac2c61931ce -->

<script lang="ts">
  let {
    possibleRange = { min: 0, max: 100 },
    selectedRange = $bindable(possibleRange),
    render = (value) => value.toString()
  }: {
    possibleRange?: { min: number; max: number };
    selectedRange?: { min: number; max: number };
    render?: (value: number) => string;
  } = $props();

  let slider: HTMLElement | undefined = $state();
  let activeHandle: "min" | "max" | undefined = $state();

  function setActiveHandle(side: "min" | "max") {
    activeHandle = side;

    function handleMouseMove(event: MouseEvent) {
      if (!slider) return;
      const rect = slider.getBoundingClientRect();
      const value = Math.min(
        possibleRange.max,
        Math.max(
          possibleRange.min,
          Math.round(possibleWidth * (event.clientX - rect.left) / rect.width)
        )
      );
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

    function handleMouseUp() {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    }

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  }

  let possibleWidth = $derived(possibleRange.max - possibleRange.min);
  let possibleMinPosition = $derived(100 * possibleRange.min);
  let selectedMinPosition =
    $derived(possibleMinPosition + (100 * selectedRange.min) / possibleWidth);
  let selectedMaxPosition =
    $derived(possibleMinPosition + (100 * selectedRange.max) / possibleWidth);
</script>

<div id="container">
  <div bind:this={slider} class="slider">
    <div
      class="body"
      style:left={`${selectedMinPosition}%`}
      style:right={`${100 - selectedMaxPosition}%`}
    ></div>
    <div
      aria-valuemax={possibleRange.max}
      aria-valuemin={possibleRange.min}
      aria-valuenow={selectedRange.min}
      class="handle"
      class:active={activeHandle === "min"}
      onmousedown={() => setActiveHandle("min")}
      ontouchstart={() => setActiveHandle("min")}
      role="slider"
      style:--value={`'${render(selectedRange.min)}'`}
      style:left={`${selectedMinPosition}%`}
      tabindex="0"
    ></div>
    <div
      aria-valuemax={possibleRange.max}
      aria-valuemin={possibleRange.min}
      aria-valuenow={selectedRange.max}
      class="handle"
      class:active={activeHandle === "max"}
      onmousedown={() => setActiveHandle("max")}
      ontouchstart={() => setActiveHandle("max")}
      role="slider"
      style:--value={`'${render(selectedRange.max)}'`}
      style:left={`${selectedMaxPosition}%`}
      tabindex="0"
    ></div>
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

    &::after {
      content: var(--value);
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, 50%);
      font-size: 12px;
      color: #000;
      white-space: nowrap;
    }
  }
</style>