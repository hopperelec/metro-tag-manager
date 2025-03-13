import type { SvelteMap, SvelteSet } from "svelte/reactivity";

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
  trainTags: Map<number, Set<string>>;
};

export type ClientTrains = SvelteMap<number, SvelteSet<string>>;

export type ClientMedia = BaseMedia & {
  contextTags: {
    get: () => SvelteSet<string>,
    set: (value: SvelteSet<string>) => void
  },
  trainTags: {
    get: () => ClientTrains,
    set: (value: ClientTrains) => void
  },
  type: "image" | "video";
  numTrains: number;
  numTags: number;
}

export type AutocompleteTag = {
  name: string;
  displayName?: string;
  implies?: string[];
  color?: string;
  emoji?: string;
}