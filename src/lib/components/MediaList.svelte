<script lang="ts">
  import type { Media } from "$lib/types";
  import prettyBytes from "pretty-bytes";
  import TagList from "$lib/components/TagList.svelte";
  import TrainList from "$lib/components/TrainList.svelte";
  import type { SvelteMap, SvelteSet } from "svelte/reactivity";

  let lastSelectedIndex: number | null = null;

  let { medias, selectedMediaIds = $bindable([]) }: {
    medias: (Media & {
      contextTags: {
        get: () => SvelteSet<string>,
        set: (value: SvelteSet<string>) => void
      },
      trainTags: {
        get: () => SvelteMap<number, Set<string>>,
        set: (value: SvelteMap<number, Set<string>>) => void
      }
    })[];
    selectedMediaIds?: number[];
  } = $props();

  function loadVideo(event: Event) {
    (event.target as HTMLVideoElement).preload = "metadata";
  }

  function handleClick(index: number, event: { ctrlKey: boolean, shiftKey: boolean }) {
    const media = medias[index];
    const isSelected = selectedMediaIds.includes(media.id);

    if (event.ctrlKey) {
      if (isSelected) {
        selectedMediaIds = selectedMediaIds.filter(id => id !== media.id);
        lastSelectedIndex = null;
      } else {
        selectedMediaIds = [...selectedMediaIds, media.id];
        lastSelectedIndex = index;
      }
    } else if (event.shiftKey && lastSelectedIndex !== null) {
      const start = Math.min(lastSelectedIndex, index);
      const end = Math.max(lastSelectedIndex, index);
      selectedMediaIds = medias.slice(start, end + 1).map(({ id }) => id);
      lastSelectedIndex = index;
    } else {
      if (selectedMediaIds.length === 1 && isSelected) {
        selectedMediaIds = [];
        lastSelectedIndex = null;
      } else {
        selectedMediaIds = [media.id];
        lastSelectedIndex = index;
      }
    }
  }

  function handleDoubleClick(media: Media) {
    selectedMediaIds = [];
    // TODO: Fullscreen
  }
</script>

<ul>
  {#each medias as media, index (media.id)}
    <li>
      <div
        class:selected={selectedMediaIds.includes(media.id)}
        onclick={(event) => handleClick(index, event)}
        ondblclick={() => handleDoubleClick(media)}
        onkeydown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            handleClick(index, event);
          }
        }}
        role="button"
        tabindex="0"
      >
        {#if media.duration === 0}
          <img src={`media/${media.path}`} alt={media.path} loading="lazy" />
        {:else}
          <!-- svelte-ignore a11y_media_has_caption -->
          <video src={`media/${media.path}`} controls preload="none" onmouseenter={loadVideo}></video>
        {/if}
        <div id="details">
          <h4>Path</h4>
          <span>{media.path}</span>
          <h4>Size</h4>
          <span>{media.size === undefined ? "Unknown" : prettyBytes(media.size)}</span>
          <h4>Context tags</h4>
          <TagList bind:tags={media.contextTags.get, media.contextTags.set} />
          <h4>Train tags</h4>
          <TrainList bind:trains={media.trainTags.get, media.trainTags.set} />
        </div>
      </div>
    </li>
  {/each}
</ul>

<style lang="scss">
  ul {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(20em, 1fr));
    list-style: none;
    padding: 0;
    overflow-y: auto;
  }

  li > div {
    display: flex;
    flex-direction: column;
    padding: calc(.5em - 1px); /* 1px border */
    box-sizing: border-box;
    cursor: pointer;
    background: none;
    border: 1px solid transparent; /* Prevents jumping when becoming selected */
    text-align: left;
    width: 100%;
    height: 100%;

    &.selected {
      background-color: #93c5ef;
      border: 1px solid #4299e1;
    }
  }

  img, video {
    width: 100%;
    aspect-ratio: 16 / 9;
    object-fit: contain;
    background: black;
    margin-bottom: .5em;
  }

  #details {
    display: grid;
    grid-template-columns: auto 1fr;
    justify-items: end;
    text-align: end;

    & > h4 {
      justify-self: start;
    }
  }
</style>