import { SvelteSet } from "svelte/reactivity";
import { untrack } from "svelte";

export type Range = { min: number; max: number };

interface BaseMedia {
  id: number;
  path: string;
  size?: number;
  duration?: number;
  width?: number;
  height?: number;
}

export type ServerMedia = BaseMedia & {
  contextTags: Set<string>;
  trainTags: Set<string>[];
};

export type ClientMedia = BaseMedia & {
  contextTags: {
    get: () => TagSet,
    set: (value: TagSet) => void
  },
  trainTags: {
    get: () => TagSet[],
    set: (value: TagSet[]) => void
  },
  type: "image" | "video";
  numTrains: number;
  hasTags: boolean;
}

export type AutocompleteTag = {
  name: string;
  displayName?: string;
  implies?: string[];
  color?: string;
  emoji?: string;
}

export class TagSet extends SvelteSet<string> {
  constructor(private autocomplete: AutocompleteTag[], tags: Set<string> = new Set()) {
    super(tags);
    // Svelte tracks changes inside a constructor,
    // so assigning TagSet to a state would cause an infinite loop if this weren't wrapped with `untrack`.
    // This should be fixed in a newer version of Svelte https://github.com/sveltejs/svelte/pull/15553
    untrack(() => {
      for (const tag of this) {
        this.removeImplied(tag);
      }
    });
  }

  add(tag: string) {
    if (!this.isImplied(tag)) {
      super.add(tag);
      this.removeImplied(tag);
    }
    return this;
  }

  has(tag: string): boolean {
    if (super.has(tag)) return true;
    return this.isImplied(tag);
  }

  private getAutocompleteTag(tag: string) {
    // For some reason, this.autocomplete is undefined server-side.
    // This is a temporary workaround until I figure out why.
    return this.autocomplete?.find(autocompleteTag => autocompleteTag.name === tag);
  }

  private removeImplied(tag: string) {
    const impliedTags = this.getAutocompleteTag(tag)?.implies;
    if (impliedTags) {
      for (const impliedTag of impliedTags) {
        this.delete(impliedTag);
        this.removeImplied(impliedTag);
      }
    }
  }

  private aImpliesB(a: string, b: string): boolean {
    const impliedTags = this.getAutocompleteTag(a)?.implies;
    if (!impliedTags) return false;
    if (impliedTags.includes(b)) return true;
    for (const impliedTag of impliedTags) {
      if (this.aImpliesB(impliedTag, b)) return true;
    }
    return false;
  }

  private isImplied(tag: string): boolean {
    for (const innerTag of this) {
      if (this.aImpliesB(innerTag, tag)) return true;
    }
    return false;
  }
}