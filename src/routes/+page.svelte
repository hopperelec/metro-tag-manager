<script lang="ts">
  import FilterComponent from "$lib/components/Filter.svelte";
  import FormOptionalBoolean from "$lib/components/FormOptionalBoolean.svelte";
  import MediaList from "$lib/components/MediaList.svelte";
  import RangeSlider from "$lib/components/RangeSlider.svelte";
  import { DURATION_RANGE, HEIGHT_RANGE, NUMBER_TRAINS_RANGE, SIZE_RANGE, WIDTH_RANGE } from "$lib/constants";
  import { filterGlobal, type GroupedFilter } from "$lib/filters";
  import type { Range, ClientMedia } from "$lib/types";
  import prettyBytes from "pretty-bytes";
  import TrainList from "$lib/components/TrainList.svelte";
  import PartialTagList from "$lib/components/PartialTagList.svelte";
  import { SvelteSet } from "svelte/reactivity";

  let { data } = $props();

  let pathFilter = $state("");
  let pathFilterRegex: RegExp | null = $derived.by(() => {
    try {
      return new RegExp(pathFilter);
    } catch {
      return null;
    }
  });

  let typeFilter = $state("all");
  let sizeFilter = $state(SIZE_RANGE);
  let widthFilter = $state(WIDTH_RANGE);
  let heightFilter = $state(HEIGHT_RANGE);
  let durationFilter = $state(DURATION_RANGE);
  let numberTrainsFilter = $state(NUMBER_TRAINS_RANGE);
  let hasTagsFilter: "off" | "ignore" | "on" = $state("ignore");
  let tagFilter: GroupedFilter = $state({
    group: true,
    local: false,
    or: false,
    invert: false,
    filters: []
  });

  let loadingData = $state(false);

  let selectedMedia: ClientMedia[] = $state([]);
  let selectedContextTags: { tag: string, partial: boolean }[] = $derived.by(() => {
    if (selectedMedia.length === 0) return [];
    const [firstMedia, ...restMedia] = selectedMedia;
    const inAll = new Set(firstMedia.contextTags.get());
    const inSome = new Set(firstMedia.contextTags.get());
    for (const media of restMedia) {
      for (const tag of inAll) {
        if (!media.contextTags.get().has(tag)) {
          inAll.delete(tag);
        }
      }
      for (const tag of media.contextTags.get()) {
        inSome.add(tag);
      }
    }
    return [...inSome].map(tag => ({
      tag,
      partial: !inAll.has(tag)
    }));
  });

  function addTagToSelectedMedia(tag: string) {
    for (const media of selectedMedia) {
      media.contextTags.get().add(tag);
    }
  }

  function removeTagFromSelectedMedia(tag: string) {
    for (const media of selectedMedia) {
      media.contextTags.get().delete(tag);
    }
  }

  let trainsToAdd: SvelteSet<string>[] = $state([]);

  async function refresh() {
    if (loadingData) return;
    loadingData = true;
    const response = await fetch("refresh");
    data = await response.json();
    loadingData = false;
  }

  function insideRange(
    value: bigint | number | undefined,
    possibleRange: Range,
    selectedRange: Range
  ) {
    if (value === undefined)
      return (
        selectedRange.min === possibleRange.min &&
        selectedRange.max === possibleRange.max
      );
    return value >= selectedRange.min && value <= selectedRange.max;
  }

  let media: ClientMedia[] = $derived(data.media
    // Pre-process some values, so they don't need to be re-calculated whenever the filters change
    .map((media) => {
      let contextTags = $state(new SvelteSet(media.contextTags));
      let trainTags = $state(media.trainTags.map(v => new SvelteSet(v)));
      return {
        ...media,
        contextTags: {
          get: () => contextTags,
          set: (tags: SvelteSet<string>) => {
            contextTags = tags;
          }
        },
        trainTags: {
          get: () => trainTags,
          set: (tags: SvelteSet<string>[]) => {
            trainTags = tags;
          }
        },
        type: (media.duration === 0 ? "image" : "video") as "image" | "video",
        numTrains: media.trainTags.length,
        hasTags: media.trainTags.some(train => train.size !== 0)
      };
    })
    // Sort by path
    .sort((a, b) => a.path.localeCompare(b.path)));

  let filteredMedia = $derived(media.filter(
    (media) =>
      (!pathFilterRegex || pathFilterRegex.test(media.path)) &&
      (typeFilter === "all" || media.type === typeFilter) &&
      insideRange(media.size, SIZE_RANGE, sizeFilter) &&
      insideRange(media.width, WIDTH_RANGE, widthFilter) &&
      insideRange(media.height, HEIGHT_RANGE, heightFilter) &&
      insideRange(media.duration, DURATION_RANGE, durationFilter) &&
      insideRange(media.numTrains, NUMBER_TRAINS_RANGE, numberTrainsFilter) &&
      (hasTagsFilter !== "on" || media.hasTags) &&
      (hasTagsFilter !== "off" || !media.hasTags) &&
      (!tagFilter ||
        filterGlobal(
          tagFilter,
          media.contextTags.get(),
          media.trainTags.get()
        ))
  ));
</script>

<div id="page-container">
  <div id="filters">
    <h2>Filters</h2>
    <div>
      <label for="path">Path (regex)</label>
      <input bind:value={pathFilter} class:invalid={pathFilterRegex === null} id="path" type="text" />
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
    <button disabled={loadingData} onclick={refresh}>Refresh</button>
    <h3>Selection</h3>
    <p>{selectedMedia.length}/{filteredMedia.length} selected</p>
    <div id="tags">
      <div>
        <h4>Context tags</h4>
        {#if selectedMedia.length === 0}
          <p>Select some media first</p>
        {:else}
          <PartialTagList addTag={addTagToSelectedMedia}
                          removeTag={removeTagFromSelectedMedia}
                          tags={selectedContextTags}
          />
          <p>Added or removed tags will automatically be added or removed too selected media</p>
        {/if}
      </div>
      <div>
        <h4>Trains</h4>
        <TrainList bind:trains={trainsToAdd} />
        <div id="train-buttons">
          <button id="add-trains-to-selection"
                  onclick={() => {
                    for (const media of selectedMedia) {
                      media.trainTags.get().push(...trainsToAdd)
                    }
                  }}
                  disabled={trainsToAdd.length === 0}
          >Add to selection</button>
          <button id="clear-trains"
                  onclick={() => trainsToAdd = []}
                  disabled={trainsToAdd.length === 0}
          >Clear</button>
        </div>
      </div>
    </div>
    <div id="media-list-container">
      <MediaList bind:selectedMedia medias={filteredMedia} />
    </div>
  </div>
</div>

<style lang="scss">
  #page-container {
    display: flex;
    height: 100%;
  }

  #filters {
    flex: 0 0 20em;
    padding: 1em 3ch;
    overflow-y: auto;
    overflow-x: hidden;
    display: flex;
    flex-direction: column;
    align-items: stretch;
    text-align: center;

    & > div {
      display: flex;
      flex-direction: column;
      align-items: center;
      margin-bottom: 1em;
    }
  }

  .invalid {
    color: red;
  }

  #results {
    display: flex;
    flex-grow: 1;
    flex-direction: column;
    align-items: center;

    & > button {
      margin-bottom: .5em;
    }
  }

  .loading {
    cursor: wait;

    & > * {
      pointer-events: none;
    }
  }

  #train-buttons {
    display: flex;
    margin: .5em;
  }

  #add-trains-to-selection {
    background-color: #9f9;
    margin-right: .25em;
  }

  #clear-trains {
    background-color: #f99;
    margin-left: .25em;
  }

  #tags {
    display: flex;
    flex-wrap: wrap;
    justify-content: stretch;
    width: 100%;

    & > div {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
    }
  }

  #media-list-container {
    margin-top: 1em;
    width: 100%;
  }
</style>