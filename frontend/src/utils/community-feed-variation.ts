export type CommunityFeedVariationItem = {
  id: string;
};

export const COMMUNITY_FEED_VARIATION_WINDOW_SIZE = 4;
export const COMMUNITY_FEED_VARIATION_MAX_ITEMS = 12;

const hashFeedVariationSeed = (value: string) => {
  let hash = 2166136261;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
};

const rotateCommunityFeedWindow = <Item extends CommunityFeedVariationItem>(
  items: Item[],
  seed: number,
  windowIndex: number,
) => {
  if (items.length <= 2 || seed <= 0) return items;

  const offset =
    (hashFeedVariationSeed(`${seed}:${windowIndex}:${items[0]?.id ?? ""}`) % (items.length - 1)) +
    1;

  return [...items.slice(offset), ...items.slice(0, offset)];
};

export const varyCommunityFeedItems = <Item extends CommunityFeedVariationItem>(
  items: Item[],
  seed: number,
  options: {
    maxItems?: number;
    windowSize?: number;
  } = {},
) => {
  if (items.length <= 2 || seed <= 0) return items;

  const maxItems = options.maxItems ?? COMMUNITY_FEED_VARIATION_MAX_ITEMS;
  const windowSize = options.windowSize ?? COMMUNITY_FEED_VARIATION_WINDOW_SIZE;
  const variedLimit = Math.min(items.length, maxItems);
  const varied: Item[] = [];

  for (let start = 0; start < variedLimit; start += windowSize) {
    const windowItems = items.slice(start, Math.min(start + windowSize, variedLimit));

    varied.push(...rotateCommunityFeedWindow(windowItems, seed, Math.floor(start / windowSize)));
  }

  return [...varied, ...items.slice(variedLimit)];
};
