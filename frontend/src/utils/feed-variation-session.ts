// One session per SPA runtime: remount/back keeps order, explicit refresh rotates it.
export const createFeedVariationSession = (random: () => number = Math.random) => {
  let seed = 0;
  return {
    current: () => seed,
    initialize: () => {
      if (!seed) seed = 1 + Math.floor(random() * 2147483647);
      return seed;
    },
    refresh: () => {
      const next = 1 + Math.floor(random() * 2147483647);
      seed = next === seed ? (seed % 2147483647) + 1 : next;
      return seed;
    },
  };
};
