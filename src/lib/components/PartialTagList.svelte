<!-- This is mostly the same as TagList, but I couldn't figure out a good way to make it generic. -->

<script lang="ts">
let {
	tags = $bindable(),
	addTag,
	removeTag,
}: {
	tags: { tag: string; partial: boolean }[];
	addTag: (tag: string) => void;
	removeTag: (tag: string) => void;
} = $props();

let newTag = $state("");
</script>

<ul>
  {#each tags as { tag, partial }}
    <li>
      {#if partial}
        <button type="button" title="Add to all selected" class="partial"
                onclick={(event) => {
                  event.stopPropagation();
                  addTag(tag);
                }}
        >{tag}</button>
      {:else}
        <button type="button" title="Remove from all selected"
                onclick={(event) => {
                  event.stopPropagation();
                  removeTag(tag);
                }}
        >{tag}</button>
      {/if}
    </li>
  {/each}
  <li>
    <input
      bind:value={newTag}
      onclick={(event) => event.stopPropagation()}
      onkeydown={(event) => {
        event.stopPropagation();
        if (event.key === "Enter") {
          const newTagTrimmed = newTag.trim();
          if (newTagTrimmed !== "") {
            addTag(newTagTrimmed);
            newTag = "";
          }
        }
       }}
      placeholder="Add..."
      style:width={(newTag.length || 6) + "ch"}
      type="text"
    />
  </li>
</ul>

<style>
ul {
  list-style: none;
  padding: 0;
  display: flex;
  flex-wrap: wrap;
}

li {
  padding: .2em;

  & > button {
    cursor: pointer;
    font-family: monospace; /* to be consistent with input */

    &:not(.partial) {
      border: 1px solid black;

      &:hover {
        text-decoration: line-through;
      }
    }

    &.partial {
      border: 1px dashed black;

      &:hover {
        border: 2px solid black;
      }
    }
  }
}

input {
  font-family: monospace; /* so that width can be set using ch */
  height: 1em;
  font-size: 1em;
}
</style>