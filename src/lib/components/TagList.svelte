<script lang="ts">
import { CONTEXT_TAGS } from "$lib/constants";
import type { AutocompleteTag, TagSet } from "$lib/types";

let {
	tags = $bindable(),
	autocompleteTags = CONTEXT_TAGS,
}: {
	tags: TagSet;
	autocompleteTags?: AutocompleteTag[];
} = $props();

function getEmoji(tag?: AutocompleteTag): string {
	if (!tag) return "";
	if (tag.emoji) return tag.emoji;
	if (tag.implies) {
		for (const impliedTag of tag.implies) {
			const impliedEmoji = getEmoji(
				autocompleteTags.find((t) => t.name === impliedTag),
			);
			if (impliedEmoji) return impliedEmoji;
		}
	}
	return "";
}

function getColor(tag?: AutocompleteTag): string {
	if (!tag) return "";
	if (tag.color) return tag.color;
	if (tag.implies) {
		for (const impliedTag of tag.implies) {
			const impliedColor = getColor(
				autocompleteTags.find((t) => t.name === impliedTag),
			);
			if (impliedColor) return impliedColor;
		}
	}
	return "";
}

function getDisplay(tag?: AutocompleteTag) {
	if (!tag) return {};
	return {
		label: getEmoji(tag) + (tag.displayName || tag.name),
		color: getColor(tag),
	};
}

let newTag = $state("");
</script>

<ul>
  {#each tags as tag}
    {@const autocompleteTag = autocompleteTags.find((t) => t.name === tag)}
    {@const { label, color } = getDisplay(autocompleteTag)}
    <li>
      <button type="button" title="Remove"
              onclick={(event) => {
                event.stopPropagation();
                tags.delete(tag);
              }}
              style:--color={color}
      >{label || tag}</button>
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

  & > button {
    cursor: pointer;
    font-family: monospace; /* to be consistent with input */
    border: 1px solid var(--color, black);

    &:hover {
      text-decoration: line-through;
    }
  }
}

input {
  font-family: monospace; /* so that width can be set using ch */
  height: 1em;
  font-size: 1em;
}
</style>