export const wrapPreviewSourceText = (value: string, maxLineLength: number) => {
  const words = value.replace(/\s+/gu, " ").trim().split(/\s+/u).filter(Boolean);
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length <= maxLineLength) {
      current = candidate;
      continue;
    }

    if (current) lines.push(current);
    const characters = Array.from(word);
    while (characters.length > maxLineLength) {
      lines.push(characters.splice(0, maxLineLength).join(""));
    }
    current = characters.join("");
  }

  if (current) lines.push(current);
  if (lines.length === 0) lines.push("Conte\u00fado na Lectum");

  return lines;
};

export const getPreviewSourceBodyHeight = (lineCount: number) =>
  // The exported 1920px video adds 60px for each line beyond the first three.
  `${13.85 + Math.max(0, lineCount - 3) * 3.125}cqh`;
