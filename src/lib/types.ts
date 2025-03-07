export type Range = { min: number; max: number };

export type Media = {
  id: number;
  path: string;
  size?: number;
  duration?: number;
  width?: number;
  height?: number;
  contextTags: string[];
  trainTags: Record<number, string[]>;
};

export type AutocompleteTag = {
  name: string;
  displayName?: string;
  implies?: string[];
  color?: string;
  emoji?: string;
}