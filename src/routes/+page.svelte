<script lang="ts">
  import type { PageData } from "./$types";
  import FilterComponent from "$lib/components/Filter.svelte";
  import { filterGlobal, type GroupedFilter } from "$lib/filters";
  import RangeSlider from "$lib/components/RangeSlider.svelte";
  import { DURATION_RANGE, HEIGHT_RANGE, NUMBER_TRAINS_RANGE, SIZE_RANGE, WIDTH_RANGE } from "$lib/constants";
  import prettyBytes from "pretty-bytes";
  import type { Range } from "$lib/types";
  import FormOptionalBoolean from "$lib/components/FormOptionalBoolean.svelte";

  export let data: PageData;

  let pathFilter = "";
  $: pathFilterRegex = pathFilter ? new RegExp(pathFilter) : null;
  let typeFilter = "all";
  let sizeFilter = SIZE_RANGE;
  let widthFilter = WIDTH_RANGE;
  let heightFilter = HEIGHT_RANGE;
  let durationFilter = DURATION_RANGE;
  let numberTrainsFilter = NUMBER_TRAINS_RANGE;
  let hasTagsFilter: "off" | "ignore" | "on" = "ignore";
  let tagFilter: GroupedFilter;

  async function refresh() {
    const response = await fetch("refresh");
    data = await response.json();
  }

  function loadVideo(event: Event) {
    (event.target as HTMLVideoElement).preload = "metadata";
  }

  function outsideRange(value: number | undefined, possibleRange: Range, selectedRange: Range) {
    if (value === undefined)
      return selectedRange.min !== possibleRange.min || selectedRange.max !== possibleRange.max
    return value < selectedRange.min || value > selectedRange.max;
  }

  $: sortedMedia = data.media.sort((a, b) => a.path.localeCompare(b.path));
  $: filteredMedia = sortedMedia.filter(media => {
    if (pathFilterRegex && !pathFilterRegex.test(media.path)) return false;
    if (typeFilter !== "all" && (media.duration === 0 ? "image" : "video") !== typeFilter) return false;
    if (outsideRange(media.size, SIZE_RANGE, sizeFilter)) return false;
    if (outsideRange(media.width, WIDTH_RANGE, widthFilter)) return false;
    if (outsideRange(media.height, HEIGHT_RANGE, heightFilter)) return false;
    if (outsideRange(media.duration, DURATION_RANGE, durationFilter)) return false;
    if (outsideRange(Object.keys(media.trainTags).length, NUMBER_TRAINS_RANGE, numberTrainsFilter)) return false;
    const numTags = Object.keys(media.contextTags).length + Object.keys(media.trainTags).length;
    if (hasTagsFilter === "on" && numTags === 0) return false;
    if (hasTagsFilter === "off" && numTags !== 0) return false;
    if (tagFilter && !filterGlobal(tagFilter, media.contextTags, Object.values(media.trainTags))) return false;
    return true;
  });
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
      <label for="size">Size</label>
      <RangeSlider possibleRange={SIZE_RANGE} bind:selectedRange={sizeFilter} render={prettyBytes} />
    </div>
    <div>
      <label for="width">Width</label>
      <RangeSlider possibleRange={WIDTH_RANGE} bind:selectedRange={widthFilter} render={px => `${px}px`} />
    </div>
    <div>
      <label for="height">Height</label>
      <RangeSlider possibleRange={HEIGHT_RANGE} bind:selectedRange={heightFilter} render={px => `${px}px`} />
    </div>
    <div>
      <label for="duration">Duration</label>
      <RangeSlider possibleRange={DURATION_RANGE} bind:selectedRange={durationFilter}
                   render={(value) => `${Math.floor(value / 60)}:${(value % 60).toString().padStart(2, "0")}`}
      />
    </div>
    <div>
      <label for="numberTrains">Number of trains</label>
      <RangeSlider possibleRange={NUMBER_TRAINS_RANGE} bind:selectedRange={numberTrainsFilter} />
    </div>
    <div>
      <FormOptionalBoolean label="Has tags" bind:value={hasTagsFilter} />
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
      {#each filteredMedia as media (media.id)}
        <li>
          <div id="media-item">
            {#if media.duration === 0}
              <img src={`media/${media.path}`} alt={media.path} loading="lazy" />
            {:else}
              <!-- svelte-ignore a11y-media-has-caption -->
              <video src={`media/${media.path}`} controls preload="none" on:mouseenter={loadVideo} />
            {/if}
          </div>
          <span class="path">{media.path}</span>
          <span class="size">{media.size === undefined ? "Unknown" : prettyBytes(media.size)}</span>
          <!-- TODO: Style tags -->
          <ul class="context-tags">
            {#each media.contextTags as contextTag}
              <li>{contextTag}</li>
            {/each}
          </ul>
          <ul class="trains">
            {#each Object.values(media.trainTags) as train}
              <li>
                <ul>
                  {#each train as trainTag}
                    <li>{trainTag}</li>
                  {/each}
                </ul>
              </li>
            {/each}
          </ul>
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
    align-items: stretch;

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
    white-space: nowrap;

    & > span {
      overflow: clip;
      text-overflow: ellipsis;
    }
  }

  img, video {
    width: 100%;
    aspect-ratio: 16 / 9;
    object-fit: contain;
    background: black;
  }
</style>