<script lang="ts">
import type { Media } from "$lib/types";
import prettyBytes from "pretty-bytes";

export let medias: Media[];

function loadVideo(event: Event) {
	(event.target as HTMLVideoElement).preload = "metadata";
}
</script>

<ul>
  {#each medias as media (media.id)}
    <li>
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