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

export function filterLocal(filter: Filter, tags: Set<string>): boolean {
  if (filter.group) {
    if (filter.or) return filter.filters.some((f) => filterLocal(f, tags));
    return filter.filters.every((f) => filterLocal(f, tags));
  }
  return tags.has(filter.tag);
}

export function filterGlobal(
  filter: Filter,
  globalTags: Set<string>,
  localTags: Set<string>[]
): boolean {
  if (filter.group) {
    const func = filter.local
      ? (f: Filter) => localTags.some((tags) => filterLocal(f, tags))
      : (f: Filter) => filterGlobal(f, globalTags, localTags);
    if (filter.or) return filter.filters.some(func);
    return filter.filters.every(func);
  }
  const tag = filter.tag.trim();
  return tag === "" || globalTags.has(tag);
}
