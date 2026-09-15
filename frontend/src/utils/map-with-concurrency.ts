export const mapWithConcurrency = async <Input, Output>(
  items: readonly Input[],
  concurrency: number,
  mapper: (item: Input, index: number) => Promise<Output>,
): Promise<Output[]> => {
  if (items.length === 0) return [];

  const workerCount = Math.min(
    items.length,
    Math.max(1, Number.isFinite(concurrency) ? Math.floor(concurrency) : 1),
  );
  const results = new Array<Output>(items.length);
  let nextIndex = 0;
  let hasFailed = false;
  let failure: unknown;

  const worker = async () => {
    while (nextIndex < items.length && !hasFailed) {
      const index = nextIndex;
      nextIndex += 1;
      try {
        results[index] = await mapper(items[index] as Input, index);
      } catch (error) {
        if (!hasFailed) failure = error;
        hasFailed = true;
      }
    }
  };

  await Promise.all(Array.from({ length: workerCount }, () => worker()));
  if (hasFailed) throw failure;

  return results;
};
