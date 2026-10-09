// Deterministic across pages, replicas and input order; not a security token.
export const feedVariationWeight = (id: string, seed = 0) => {
  if (!Number.isInteger(seed) || seed <= 0 || seed > 2147483647) return 1;
  let hash = seed | 0;
  for (let index = 0; index < id.length; index++) {
    hash = Math.imul(hash ^ id.charCodeAt(index), 16777619);
  }
  hash ^= hash >>> 16;
  hash = Math.imul(hash, 0x85ebca6b);
  hash ^= hash >>> 13;
  return 0.95 + ((hash >>> 0) / 4294967295) * 0.1;
};
