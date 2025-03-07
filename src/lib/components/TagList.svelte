<script lang="ts">
  export let tags: Set<string>;

  let newTag = "";
</script>

<ul>
  {#each tags as tag}
    <li>
      <button type="button" title="Delete"
              on:click|stopPropagation={() => {
                tags.delete(tag);
                tags = tags; // trigger reactivity
              }}
      >
        {tag}
      </button>
    </li>
  {/each}
  <li>
    <input
      bind:value={newTag}
      on:click|stopPropagation
      on:keydown|stopPropagation={(event) => {
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