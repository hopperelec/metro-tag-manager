<script lang="ts">
  import type { PageData } from "./$types";
  import FilterComponent from "$lib/components/Filter.svelte";
  import { filterGlobal, type GroupedFilter } from "$lib/filters";
  import RangeSlider from "$lib/components/RangeSlider.svelte";
  import { DURATION_RANGE, HEIGHT_RANGE, NUMBER_TRAINS_RANGE, SIZE_RANGE, WIDTH_RANGE } from "$lib/constants";
  import prettyBytes from "pretty-bytes";
  import type { Range } from "$lib/types";
  import FormOptionalBoolean from "$lib/components/FormOptionalBoolean.svelte";
  import MediaList from "$lib/components/MediaList.svelte";

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

  let loadingData = false;

  async function refresh() {
    if (loadingData) return;
    loadingData = true;
    const response = await fetch("refresh");
    data = await response.json();
    loadingData = false;
  }

  function outsideRange(value: bigint | number | undefined, possibleRange: Range, selectedRange: Range) {
    if (value === undefined)
      return selectedRange.min !== possibleRange.min || selectedRange.max !== possibleRange.max;
    return value < selectedRange.min || value > selectedRange.max;
  }

  $: media = data.media
    // Pre-process some values, so they don't need to be re-calculated whenever the filters change
    .map(media => ({
      ...media,
      type: media.duration === 0 ? "image" : "video",
      numTrains: Object.keys(media.trainTags).length,
      numTags: Object.keys(media.contextTags).length + Object.values(media.trainTags).reduce((acc, tags) => acc + tags.length, 0)
    }))
    // Sort by path
    .sort((a, b) => a.path.localeCompare(b.path));

  $: filteredMedia = media.filter(media => {
    if (pathFilterRegex && !pathFilterRegex.test(media.path)) return false;
    if (typeFilter !== "all" && media.type !== typeFilter) return false;
    if (outsideRange(media.size, SIZE_RANGE, sizeFilter)) return false;
    if (outsideRange(media.width, WIDTH_RANGE, widthFilter)) return false;
    if (outsideRange(media.height, HEIGHT_RANGE, heightFilter)) return false;
    if (outsideRange(media.duration, DURATION_RANGE, durationFilter)) return false;
    if (outsideRange(media.numTrains, NUMBER_TRAINS_RANGE, numberTrainsFilter)) return false;
    if (hasTagsFilter === "on" && media.numTags === 0) return false;
    if (hasTagsFilter === "off" && media.numTags !== 0) return false;
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
      <RangeSlider bind:selectedRange={sizeFilter} possibleRange={SIZE_RANGE} render={prettyBytes} />
    </div>
    <div>
      <label for="width">Width</label>
      <RangeSlider bind:selectedRange={widthFilter} possibleRange={WIDTH_RANGE} render={px => `${px}px`} />
    </div>
    <div>
      <label for="height">Height</label>
      <RangeSlider bind:selectedRange={heightFilter} possibleRange={HEIGHT_RANGE} render={px => `${px}px`} />
    </div>
    <div>
      <label for="duration">Duration</label>
      <RangeSlider bind:selectedRange={durationFilter} possibleRange={DURATION_RANGE}
                   render={(value) => `${Math.floor(value / 60)}:${(value % 60).toString().padStart(2, "0")}`}
      />
    </div>
    <div>
      <label for="numberTrains">Number of trains</label>
      <RangeSlider bind:selectedRange={numberTrainsFilter} possibleRange={NUMBER_TRAINS_RANGE} />
    </div>
    <div>
      <FormOptionalBoolean bind:value={hasTagsFilter} label="Has tags" />
    </div>
    <div>
      <span>Tags</span>
      <FilterComponent bind:filter={tagFilter} />
    </div>
  </div>
  <div class:loading={loadingData} id="results">
    <h2>Results</h2>
    <button disabled={loadingData} on:click={refresh}>Refresh</button>
    <MediaList medias={filteredMedia} />
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
    flex-grow: 1;
    flex-direction: column;
    align-items: center;
    padding-top: 1em;
  }

  .loading {
    cursor: wait;

    & > * {
      pointer-events: none;
    }
  }
</style>