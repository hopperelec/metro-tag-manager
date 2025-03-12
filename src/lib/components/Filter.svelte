<script lang="ts">
  import FilterComponent from "./Filter.svelte";
  import type { Filter, GroupedFilter } from "$lib/filters";

  let {
    filter = $bindable({
      group: true,
      local: false,
      or: false,
      invert: false,
      filters: []
    }), odd = false
  }: {
    filter?: GroupedFilter;
    odd?: boolean;
  } = $props();

  function addFilter(newFilter: Filter) {
    // Assignment for reactivity
    filter.filters = [...filter.filters, newFilter];
  }

  function removeFilter(index: number) {
    // Assignment for reactivity
    filter.filters = filter.filters.filter((_, i) => i !== index);
  }
</script>

<div class:odd id="outer-filter">
  <ul>
    {#if filter.filters.length === 0}
      <p>This group is empty!</p>
    {:else}
      {#each filter.filters as innerFilter, i}
        <li>
          <div class="filter-toggles">
            {#if i !== 0}
              <button type="button" onclick={() => filter.or = !filter.or}>{filter.or ? "OR" : "AND"}</button>
            {/if}
            <button onclick={() => innerFilter.invert = !innerFilter.invert}
                    type="button">{innerFilter.invert ? "IS NOT" : "IS"}</button>
          </div>
          <div class="inner-filter">
            <!-- Use filter.filters[i] to allow type-safe binding -->
            {#if filter.filters[i].group}
              <FilterComponent bind:filter={filter.filters[i]} odd={!odd} />
            {:else}
              <input bind:value={filter.filters[i].tag} type="text" />
            {/if}
            <button type="button" class="remove-button" onclick={() => removeFilter(i)}>X</button>
          </div>
        </li>
      {/each}
    {/if}
  </ul>
  <div id="add-buttons">
    <button onclick={() => addFilter({group: false, invert: false, tag: ""})} type="button">Add tag</button>
    <button onclick={() => addFilter({group: true, local: filter.local, invert: false, or: false, filters: []})}
            type="button">
      Add group
    </button>
    {#if !filter.local}
      <button onclick={() => addFilter({group: true, local: true, invert: false, or: false, filters: []})}
              type="button">
        Add train
      </button>
    {/if}
  </div>
</div>

<style lang="scss">
  #outer-filter {
    border: 1px solid #000;
    width: fit-content;
    padding: .5em;
    background: #fff;

    &.odd {
      background: #eee;
    }
  }

  p {
    font-style: italic;
  }

  ul {
    list-style-type: none;
    padding: 0;
  }

  li, p {
    padding-bottom: .5em;
  }

  #outer-filter, ul, li {
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  .inner-filter {
    display: flex;
  }

  button {
    cursor: pointer;
  }

  #add-buttons > button {
    background: #5f5;
    border: 1px solid #050;
  }

  .remove-button {
    background: #f55;
    border: 1px solid #500;
    height: 2em;
    width: 2em;
    border-radius: 0 25% 25% 0;
    border-left: none;
  }
</style>