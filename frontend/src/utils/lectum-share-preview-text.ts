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

  if (lines.length <= 3) return lines;
  return [
    ...lines.slice(0, 2),
    `${Array.from(lines[2])
      .slice(0, maxLineLength - 3)
      .join("")
      .trimEnd()}...`,
  ];
};

export const getPreviewSourceBodyHeight = () => "13.85cqh";
