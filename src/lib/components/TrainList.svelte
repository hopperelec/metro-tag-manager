<script lang="ts">
  import TagList from "$lib/components/TagList.svelte";
  import { TRAIN_TAGS } from "$lib/constants";
  import { TagSet } from "$lib/types";

  let { trains = $bindable() }: {
    trains: TagSet[];
  } = $props();
</script>

<div id="container">
  <ul>
    {#each trains as _, trainIndex}
      <li>
        <button type="button" onclick={event => {
          event.stopPropagation();
          trains.splice(trainIndex, 1);
        }}>
          <span>🚂</span>
          <span>❌</span>
        </button>
        <TagList bind:tags={trains[trainIndex]} autocompleteTags={TRAIN_TAGS} />
      </li>
    {/each}
  </ul>
  <button onclick={event => {
    event.stopPropagation();
    trains.push(new TagSet(TRAIN_TAGS));
  }}>
    Add train
  </button>
</div>

<style lang="scss">
  #container {
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  ul {
    list-style: none;
    padding: 0;
  }

  li {
    display: flex;
    align-items: center;

    & > button {
      cursor: pointer;
      height: 1.5em;
      width: 1.5em;
      font-size: 1em;
      background: none;
      border: none;
      padding: 0;

      & :last-child {
        display: none;
      }

      &:hover {
        & :first-child {
          display: none;
        }

        & :last-child {
          display: block;
        }
      }
    }
  }
</style>