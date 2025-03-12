<script lang="ts">
  import type { SvelteSet } from "svelte/reactivity";

  let { tags = $bindable() }: {
    tags: SvelteSet<string>;
  } = $props();

  let newTag = $state("");
</script>

<ul>
  {#each tags as tag}
    <li>
      <button type="button" title="Delete"
              onclick={(event) => {
                event.stopPropagation();
                tags.delete(tag);
              }}
      >{tag}</button>
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
            tags.add(newTagTrimmed);
            tags = tags; // trigger reactivity
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
    }

    li > button {
        cursor: pointer;
        font-family: monospace; /* to be consistent with input */

        &:hover {
            text-decoration: line-through;
        }
    }

    input {
        font-family: monospace; /* so that width can be set using ch */
        height: 1em;
        font-size: 1em;
    }
</style>