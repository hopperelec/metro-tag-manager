<script lang="ts">
  import type { Media } from "$lib/types";
  import prettyBytes from "pretty-bytes";

  export let medias: Media[];
  let lastSelectedIndex: number | null = null;
  let selectedMediaIds: number[] = [];

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
      <button
        type="button"
        class:selected={selectedMediaIds.includes(media.id)}
        on:click={(event) => handleClick(index, event)}
        on:dblclick={() => handleDoubleClick(media)}
        on:keydown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            handleClick(index, event);
          }
        }}
      >
        {#if media.duration === 0}
          <img src={`media/${media.path}`} alt={media.path} loading="lazy" />
        {:else}
          <!-- svelte-ignore a11y-media-has-caption -->
          <video src={`media/${media.path}`} controls preload="none" on:mouseenter={loadVideo}></video>
        {/if}
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
      </button>
    </li>
  {/each}
</ul>

<style>
    ul {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(20em, 1fr));
        list-style: none;
        padding: 0;
        overflow-y: auto;
    }

    button {
        display: flex;
        flex-direction: column;
        padding: calc(.5em - 1px); /* 1px border */
        white-space: nowrap;
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