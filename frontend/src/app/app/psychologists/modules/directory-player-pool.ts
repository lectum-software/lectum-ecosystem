export type PoolEntry = { key: string; index: number; src: string };
export type PlayerPool = [PoolEntry | null, PoolEntry | null];

export function preserveDirectoryExperiment(target: URLSearchParams, search: string) {
  const source = new URLSearchParams(search);
  if (source.get("directoryPlayer") === "pooled") target.set("directoryPlayer", "pooled");
  if (source.get("videoDiagnostics") === "1") target.set("videoDiagnostics", "1");
  return target;
}

export function selectDirectoryPool(
  current: PlayerPool,
  active: PoolEntry | null,
  next: PoolEntry | null,
  canPrepare: boolean,
  previousActiveKey: string | null = null,
): PlayerPool {
  if (!active) return [null, null];
  const result: PlayerPool = [...current];
  const found = current.findIndex((entry) => entry?.key === active.key);
  const previousSlot = current.findIndex((entry) => entry?.key === previousActiveKey);
  const activeSlot = found < 0 ? (previousSlot < 0 ? 0 : 1 - previousSlot) : found;
  result[activeSlot] = active;
  if (canPrepare) result[1 - activeSlot] = next?.key === active.key ? null : next;
  return result;
}
