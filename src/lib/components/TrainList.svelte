<script lang="ts">
  import TagList from "$lib/components/TagList.svelte";
  import type { SvelteMap } from "svelte/reactivity";

  let { trains = $bindable() }: {
    trains: SvelteMap<number, Set<string>>;
  } = $props();
  let nextIndex = $derived(trains.size === 0 ? 1 : Math.max(...trains.keys()) + 1);
</script>

<div id="container">
  <ul>
    {#each trains.entries() as [index, train]}
      <li>
        <button type="button" onclick={event => {
          event.stopPropagation();
          trains.delete(index);
        }}>
          <span>🚂</span>
          <span>❌</span>
        </button>
        <TagList bind:tags={() => train, (v) => trains.set(index, v)} />
      </li>
    {/each}
  </ul>
  <button onclick={event => {
    event.stopPropagation();
    trains.set(nextIndex, new Set());
  }}>
    Add train
  </button>
</div>

<style lang="scss">
  #container {
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  ul {
    list-style: none;
    padding: 0;
  }

  li {
    display: flex;
    align-items: center;

    & > button {
      cursor: pointer;
      height: 1.5em;
      width: 1.5em;
      font-size: 1em;
      background: none;
      border: none;
      padding: 0;

      & :last-child {
        display: none;
      }

      &:hover {
        & :first-child {
          display: none;
        }

        & :last-child {
          display: block;
        }
      }
    }
  }
</style>