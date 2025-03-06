<!-- Adapted from https://svelte.dev/playground/75d34e46cbe64bb68b7c2ac2c61931ce -->

<script lang="ts">
  export let possibleRange = { min: 0, max: 100 };
  $: possibleWidth = possibleRange.max - possibleRange.min;
  $: possibleMinPosition = 100 * possibleRange.min

  export let selectedRange = possibleRange;
  $: selectedMinPosition = possibleMinPosition + 100 * selectedRange.min / possibleWidth;
  $: selectedMaxPosition = possibleMinPosition + 100 * selectedRange.max / possibleWidth;

  export let render: (value: number) => string = (value) => value.toString();

  let slider: HTMLElement;
  let minHandle: HTMLElement;
  let maxHandle: HTMLElement;
  let activeHandle: undefined | HTMLElement;

  function clamp(value: number, min: number, max: number) {
    return Math.min(max, Math.max(min, value));
  }

  function draggable(node: HTMLElement) {
    function handleMousedown() {
      activeHandle = node;
      window.addEventListener('mousemove', handleMousemove);
      window.addEventListener('mouseup', handleMouseup);
      window.addEventListener('touchmove', handleMousemove);
      window.addEventListener('touchend', handleMouseup);
    }

    function handleMousemove(event: MouseEvent | TouchEvent) {
      const { clientX, clientY } = event.type === 'touchstart' ?
        (event as TouchEvent).changedTouches[0] :
        (event as MouseEvent);
      node.dispatchEvent(new CustomEvent('dragmove', {
        detail: { x: clientX, y: clientY }
      }));
    }

    function handleMouseup() {
      activeHandle = undefined;
      window.removeEventListener('mousemove', handleMousemove);
      window.removeEventListener('mouseup', handleMouseup);
      window.removeEventListener('touchmove', handleMousemove);
      window.removeEventListener('touchend', handleMouseup);
    }

    node.addEventListener('mousedown', handleMousedown);
    node.addEventListener('touchstart', handleMousedown);
    return {
      destroy() {
        node.removeEventListener('mousedown', handleMousedown);
        node.removeEventListener('touchstart', handleMousedown);
      }
    };
  }
  function setHandlePosition(side: "min" | "max") {
    return (event: CustomEvent<{ x: number }>) => {
      const { left, right } = slider.getBoundingClientRect();
      const value = clamp(
        Math.round(possibleWidth * (event.detail.x - left) / (right - left)),
        possibleRange.min,
        possibleRange.max
      )
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
  }
</script>

<div id="container">
  <div class="slider" bind:this={slider}>
    <div
      class="body"
      style:left={`${selectedMinPosition}%`}
      style:right={`${100 - selectedMaxPosition}%`}
    ></div>
    <div
      bind:this={minHandle}
      class="handle"
      class:active={activeHandle === minHandle}
      use:draggable
      on:dragmove|preventDefault={setHandlePosition("min")}
      style:left={`${selectedMinPosition}%`}
      style:--value={`'${render(selectedRange.min)}'`}
    ></div>
    <div
      bind:this={maxHandle}
      class="handle"
      class:active={activeHandle === maxHandle}
      use:draggable
      on:dragmove|preventDefault={setHandlePosition("max")}
      style:left={`${selectedMaxPosition}%`}
      style:--value={`'${render(selectedRange.max)}'`}
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

      &:after {
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