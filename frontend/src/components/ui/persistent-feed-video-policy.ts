export function selectFeedVideoSources(
  sources: [string, string],
  currentSource: string,
  nextSource: string | undefined,
  canPrepare: boolean,
): [string, string] {
  const activeIndex = Math.max(0, sources.indexOf(currentSource));
  const updated: [string, string] = [...sources];
  if (currentSource && !sources.includes(currentSource)) updated[activeIndex] = currentSource;
  if (canPrepare && nextSource && nextSource !== currentSource)
    updated[1 - activeIndex] = nextSource;
  return updated;
}
