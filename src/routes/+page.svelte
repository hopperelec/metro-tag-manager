<script lang="ts">
  import type { PageData } from "./$types";
  import FilterComponent from "$lib/components/Filter.svelte";
  import type { GroupedFilter } from "$lib/filters";
  import RangeSlider from "$lib/components/RangeSlider.svelte";

  export let data: PageData;

  let pathFilter = "";
  let typeFilter = "all";
  let numberTrainsFilter: { min: number; max: number } = { min: 0, max: 10 };
  let tagFilter: GroupedFilter;

  async function refresh() {
    const response = await fetch("refresh");
    data = await response.json();
  }

  function loadVideo(event: Event) {
    (event.target as HTMLVideoElement).preload = "metadata";
  }

  $: sortedMedia = [
    ...data.images.map(image => ({ ...image, isVideo: false })),
    ...data.videos.map(video => ({ ...video, isVideo: true }))
  ].sort((a, b) => a.path.localeCompare(b.path));
</script>

<div id="page-container">
  <div id="filters">
    <h2>Filters</h2>
    <div>
      <label for="path">Path (regex)</label>
      <input bind:value={pathFilter} id="path" type="text" />
    </div>
    <div>
      <label for="type">Type</label>
      <select bind:value={typeFilter} id="type">
        <option value="all">All</option>
        <option value="image">Image</option>
        <option value="video">Video</option>
      </select>
    </div>
    <div>
      <label for="numberTrains">Number of trains</label>
      <RangeSlider possibleRange={{min: 0, max: 10}} bind:selectedRange={numberTrainsFilter} />
    </div>
    <div>
      <span>Tags</span>
      <FilterComponent bind:filter={tagFilter} />
    </div>
  </div>
  <div id="results">
    <h2>Results</h2>
    <button on:click={refresh}>Refresh</button>
    <ul>
      {#each sortedMedia as { path, isVideo } (path)}
        <li>
          {#if isVideo}
            <!-- svelte-ignore a11y-media-has-caption -->
            <video src={`media/${path}`} controls preload="none" on:mouseenter={loadVideo} />
          {:else}
            <img src={`media/${path}`} alt={path} loading="lazy" />
          {/if}
        </li>
      {/each}
    </ul>
  </div>
</div>

<style lang="scss">
  #page-container {
    display: flex;
    height: 100%;
  }

  #filters {
    flex: 0 0 20em;
    padding: 1em;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    align-items: center;

    & > div {
      display: flex;
      flex-direction: column;
      align-items: center;
      margin-bottom: 1em;
    }
  }

  #results {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding-top: 1em;
  }

  ul {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(20em, 1fr));
    list-style: none;
    padding: 0;
    overflow-y: auto;
  }

  li {
    display: flex;
    flex-direction: column;
    padding: .5em;
  }

  img, video {
    width: 100%;
    aspect-ratio: 16 / 9;
    object-fit: contain;
    background: black;
  }
</style>