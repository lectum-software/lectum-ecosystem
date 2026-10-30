export const fitProfileName = (name: string, width: number, measure: (text: string) => number) => {
  if (measure(name) <= width) return name;
  const letters = Array.from(
    new Intl.Segmenter(undefined, { granularity: "grapheme" }).segment(name),
    ({ segment }) => segment,
  );
  let low = 0;
  let high = letters.length;
  while (low < high) {
    const mid = Math.ceil((low + high) / 2);
    if (measure(`${letters.slice(0, mid).join("").trimEnd()}…`) <= width) low = mid;
    else high = mid - 1;
  }
  return `${letters.slice(0, low).join("").trimEnd()}…`;
};
