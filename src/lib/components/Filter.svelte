<script lang="ts">
  import type { Filter, GroupedFilter } from "$lib/filters";

  export let filter: GroupedFilter = {
    group: true,
    local: false,
    or: false,
    invert: false,
    filters: []
  };
  export let odd = false;

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
              <button type="button" on:click={() => filter.or = !filter.or}>{filter.or ? "OR" : "AND"}</button>
            {/if}
            <button on:click={() => innerFilter.invert = !innerFilter.invert}
                    type="button">{innerFilter.invert ? "IS NOT" : "IS"}</button>
          </div>
          <div class="inner-filter">
            {#if innerFilter.group}
              <svelte:self bind:filter={innerFilter} odd={!odd} />
            {:else}
              <input bind:value={innerFilter.tag} type="text" />
            {/if}
            <button type="button" class="remove-button" on:click={() => removeFilter(i)}>X</button>
          </div>
        </li>
      {/each}
    {/if}
  </ul>
  <div id="add-buttons">
    <button on:click={() => addFilter({group: false, invert: false, tag: ""})} type="button">Add tag</button>
    <button on:click={() => addFilter({group: true, local: filter.local, invert: false, or: false, filters: []})}
            type="button">
      Add group
    </button>
    {#if !filter.local}
      <button on:click={() => addFilter({group: true, local: true, invert: false, or: false, filters: []})}
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