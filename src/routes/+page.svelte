<script lang="ts">
import FilterComponent from "$lib/components/Filter.svelte";
import FormOptionalBoolean from "$lib/components/FormOptionalBoolean.svelte";
import MediaList from "$lib/components/MediaList.svelte";
import PartialTagList from "$lib/components/PartialTagList.svelte";
import RangeSlider from "$lib/components/RangeSlider.svelte";
import TrainList from "$lib/components/TrainList.svelte";
import {
	CONTEXT_TAGS,
	DURATION_RANGE,
	HEIGHT_RANGE,
	NUMBER_TRAINS_RANGE,
	SIZE_RANGE,
	SIZE_REGEX,
	TRAIN_TAGS,
	WIDTH_RANGE,
} from "$lib/constants";
import { type GroupedFilter, filterGlobal } from "$lib/filters";
import { type ClientMedia, type Range, TagSet } from "$lib/types";
import prettyBytes from "pretty-bytes";

// === Media loading ===
let { data } = $props();
let serverMedias = $state.raw(data.medias);

let loadingData = $state(false);

async function refresh() {
	if (loadingData) return;
	loadingData = true;
	const response = await fetch("refresh");
	const newData = await response.json();
	serverMedias = newData.medias;
	refreshClientMedia();
	loadingData = false;
}

function refreshClientMedia() {
	medias = serverMedias
		.map((media) => {
			let contextTags = $state(new TagSet(CONTEXT_TAGS, media.contextTags));
			let trainTags = $state(
				media.trainTags.map((v) => new TagSet(TRAIN_TAGS, v)),
			);
			return {
				...media,
				contextTags: {
					get: () => contextTags,
					set: (tags: TagSet) => {
						contextTags = tags;
					},
				},
				trainTags: {
					get: () => trainTags,
					set: (tags: TagSet[]) => {
						trainTags = tags;
					},
				},
				// Pre-process some values, so they don't need to be re-calculated whenever the filters change
				type: (media.duration === 0 ? "image" : "video") as "image" | "video",
				numTrains: media.trainTags.length,
				hasTags: media.trainTags.some((train) => train.length !== 0),
			};
		})
		// Sort by path
		.sort((a, b) => a.path.localeCompare(b.path));
}

let medias: ClientMedia[] = $state.raw([]);
refreshClientMedia();

// === Saving ===
function sortTrainTags(trainTags: Iterable<string>[]) {
	return trainTags
		.map((train) => [...train].sort())
		.toSorted((a, b) => {
			for (let i = 0; i < a.length; i++) {
				if (a[i] < b[i]) return -1;
				if (a[i] > b[i]) return 1;
			}
			return 0;
		});
}

let modifiedMedias = $derived(
	medias.filter((currentMedia) => {
		const serverMedia = serverMedias.find(
			(media) => media.id === currentMedia.id,
		);
		if (!serverMedia)
			throw new Error(`Media with ID ${currentMedia.id} not found`);
		if (currentMedia.contextTags.get().size !== serverMedia.contextTags.length)
			return true;
		for (const tag of currentMedia.contextTags.get()) {
			if (!serverMedia.contextTags.includes(tag)) return true;
		}
		if (currentMedia.trainTags.get().length !== serverMedia.trainTags.length)
			return true;
		const sortedCurrentTrainTags = sortTrainTags(currentMedia.trainTags.get());
		const sortedOriginalTrainTags = sortTrainTags(serverMedia.trainTags);
		for (let i = 0; i < sortedCurrentTrainTags.length; i++) {
			if (
				sortedCurrentTrainTags[i].length !== sortedOriginalTrainTags[i].length
			)
				return true;
			for (let j = 0; j < sortedCurrentTrainTags[i].length; j++) {
				if (sortedCurrentTrainTags[i][j] !== sortedOriginalTrainTags[i][j])
					return true;
			}
		}
		return false;
	}),
);

async function save() {
	const response = await fetch("/update", {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
		},
		body: JSON.stringify(
			modifiedMedias.map((media) => ({
				id: media.id,
				contextTags: [...media.contextTags.get()],
				trainTags: media.trainTags.get().map((train) => [...train]),
			})),
		),
	});
	if (response.ok) {
		// Assignment to trigger reactivity
		serverMedias = serverMedias.map((serverMedia) => {
			const clientMedia = modifiedMedias.find(
				(media) => media.id === serverMedia.id,
			);
			if (clientMedia) {
				serverMedia.contextTags = [...clientMedia.contextTags.get()];
				serverMedia.trainTags = clientMedia.trainTags
					.get()
					.map((train) => [...train]);
			}
			return serverMedia;
		});
	} else {
		alert(`Failed to save (${response.status}): ${await response.text()}`);
	}
}

// === Filtering ===
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
	filters: [],
});

function insideRange(
	value: bigint | number | undefined,
	possibleRange: Range,
	selectedRange: Range,
) {
	if (value === undefined)
		return (
			selectedRange.min === possibleRange.min &&
			selectedRange.max === possibleRange.max
		);
	return value >= selectedRange.min && value <= selectedRange.max;
}

let filteredMedias = $derived(
	medias.filter(
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
					media.trainTags.get(),
				)),
	),
);

// === Selection ===
let selectedMedias: ClientMedia[] = $state([]);
let filteredSelectedMedias = $derived(
	// Can't directly compare media objects because of Svelte's proxying
	selectedMedias.filter((selectedMedia) =>
		filteredMedias.some(
			(filteredMedia) => selectedMedia.id === filteredMedia.id,
		),
	),
);

let selectedContextTags: { tag: string; partial: boolean }[] = $derived.by(
	() => {
		if (filteredSelectedMedias.length === 0) return [];
		const [firstMedia, ...restMedia] = selectedMedias;
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
		return [...inSome].map((tag) => ({
			tag,
			partial: !inAll.has(tag),
		}));
	},
);

function addTagToSelectedMedia(tag: string) {
	for (const media of filteredSelectedMedias) {
		media.contextTags.get().add(tag);
	}
}

function removeTagFromSelectedMedia(tag: string) {
	for (const media of filteredSelectedMedias) {
		media.contextTags.get().delete(tag);
	}
}

let trainsToAdd: TagSet[] = $state([]);

function addTrainsToSelection() {
	for (const media of filteredSelectedMedias) {
		media.trainTags.get().push(...trainsToAdd);
	}
}

// === Range value parsing ===
function parseBytes(value: string) {
	const match = SIZE_REGEX.exec(value);
	if (!match?.groups) return Number.NaN;
	const number = +match.groups.number;
	const unit = match.groups.unit;
	if (!unit) return number;
	if (unit === "k") return number * 1000;
	if (unit === "m") return number * 1000 * 1000;
	return number * 1000 * 1000 * 1000;
}

function parsePixels(value: string) {
	if (value.toLowerCase().endsWith("px")) value = value.slice(0, -2);
	return +value;
}

function parseDuration(value: string) {
	let parsed = 0;
	for (const part of value.split(":").reverse()) {
		const parsedPart = Number.parseInt(part);
		if (Number.isNaN(parsedPart)) return Number.NaN;
		parsed = parsed * 60 + parsedPart;
	}
	return parsed;
}
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
      <RangeSlider bind:selectedRange={sizeFilter}
                   parse={parseBytes}
                   possibleRange={SIZE_RANGE}
                   render={prettyBytes}
      />
    </div>
    <div>
      <label for="width">Width</label>
      <RangeSlider bind:selectedRange={widthFilter}
                   parse={parsePixels}
                   possibleRange={WIDTH_RANGE}
                   render={px => `${px}px`}
      />
    </div>
    <div>
      <label for="height">Height</label>
      <RangeSlider
        bind:selectedRange={heightFilter}
        parse={parsePixels}
        possibleRange={HEIGHT_RANGE}
        render={px => `${px}px`}
      />
    </div>
    <div>
      <label for="duration">Duration</label>
      <RangeSlider bind:selectedRange={durationFilter}
                   parse={parseDuration}
                   possibleRange={DURATION_RANGE}
                   render={(value) => `${Math.floor(value / 60)}:${(value % 60).toString().padStart(2, "0")}`}
      />
    </div>
    <div>
      <label for="numberTrains">Number of trains</label>
      <RangeSlider
        bind:selectedRange={numberTrainsFilter}
        parse={Number.parseInt}
        possibleRange={NUMBER_TRAINS_RANGE}
      />
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
    <div id="sync-buttons">
      <button disabled={loadingData} onclick={refresh}>Refresh</button>
      <button disabled={loadingData || modifiedMedias.length === 0} onclick={save}>Save</button>
    </div>
    <h3>Selection</h3>
    <p>{filteredSelectedMedias.length}/{filteredMedias.length} selected</p>
    <div id="tags">
      <div>
        <h4>Context tags</h4>
        {#if selectedMedias.length === 0}
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
          <button disabled={trainsToAdd.length === 0}
                  id="add-trains-to-selection"
                  onclick={addTrainsToSelection}
          >Add to selection
          </button>
          <button disabled={trainsToAdd.length === 0}
                  id="clear-trains"
                  onclick={() => trainsToAdd = []}
          >Clear
          </button>
        </div>
      </div>
    </div>
    <div id="media-list-container">
      <MediaList bind:selectedMedias medias={filteredMedias} />
    </div>
  </div>
</div>

<style>
#page-container {
  display: flex;
  height: 100%;
}

#filters {
  flex: 0 0 20em;
  padding: 1em 3ch;
  overflow: hidden auto;
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
}

.loading {
  cursor: wait;

  & > * {
    pointer-events: none;
  }
}

#sync-buttons {
  display: flex;
  margin-bottom: .5em;

  & > * {
    margin: 0 .25em;
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