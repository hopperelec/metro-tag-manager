export interface BaseFilter {
  group: boolean;
  invert: boolean;
}

export interface TagFilter extends BaseFilter {
  group: false;
  tag: string;
}

export interface GroupedFilter extends BaseFilter {
  group: true;
  local: boolean;
  or: boolean;
  filters: Filter[];
}

export interface LocalGroupFilter extends GroupedFilter {
  local: true;
  filters: LocalFilter[];
}

export type LocalFilter = TagFilter | LocalGroupFilter;

export type Filter = TagFilter | GroupedFilter;