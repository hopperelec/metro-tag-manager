<script lang="ts">
import TagList from "$lib/components/TagList.svelte";
import TrainList from "$lib/components/TrainList.svelte";
import type { ClientMedia } from "$lib/types";
import prettyBytes from "pretty-bytes";

let lastSelectedIndex: number | null = null;

let {
	medias,
	selectedMedias = $bindable([]),
}: {
	medias: ClientMedia[];
	selectedMedias?: ClientMedia[];
} = $props();

function loadVideo(event: Event) {
	(event.target as HTMLVideoElement).preload = "metadata";
}

function isSelected(media: ClientMedia) {
	// Since media is a proxy, we can't use selectedMedia.includes(media)
	return selectedMedias.some((selected) => selected.id === media.id);
}

function handleClick(
	index: number,
	event: { ctrlKey: boolean; shiftKey: boolean },
) {
	const media = medias[index];
	const selected = isSelected(media);

	if (event.ctrlKey) {
		if (selected) {
			selectedMedias = selectedMedias.filter(
				(selected) => selected.id !== media.id,
			);
			lastSelectedIndex = null;
		} else {
			selectedMedias.push(media);
			lastSelectedIndex = index;
		}
	} else if (event.shiftKey && lastSelectedIndex !== null) {
		const start = Math.min(lastSelectedIndex, index);
		const end = Math.max(lastSelectedIndex, index);
		selectedMedias = medias.slice(start, end + 1);
		lastSelectedIndex = index;
	} else {
		if (selectedMedias.length === 1 && selected) {
			selectedMedias = [];
			lastSelectedIndex = null;
		} else {
			selectedMedias = [media];
			lastSelectedIndex = index;
		}
	}
}

function handleDoubleClick(media: ClientMedia) {
	selectedMedias = [];
	// TODO: Fullscreen
}
</script>


{#if selectedMedias}
  <ul>
    {#each medias as media, index (media.id)}
      <li>
        <div
          class:selected={isSelected(media)}
          onclick={(event) => handleClick(index, event)}
          ondblclick={() => handleDoubleClick(media)}
          onkeydown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              handleClick(index, event);
            } else if (event.ctrlKey && event.key === 'a') {
              event.preventDefault();
              if (selectedMedias.length === medias.length) {
                selectedMedias = [];
              } else {
                selectedMedias = [...medias];
              }
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
{:else}
  <p>No media found matching your filters.
    If you were expecting something something to show up,
    try refreshing the media database.</p>
{/if}

<style>
ul {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(20em, 1fr));
  list-style: none;
  padding: 0;
  overflow-y: auto;
}

p {
  text-align: center;
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