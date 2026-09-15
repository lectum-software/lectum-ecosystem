const normalizeText = (value: string | null | undefined, fallback: string, maxLength: number) => {
  const normalized = String(value ?? "")
    .replace(/\s+/gu, " ")
    .trim();

  return (normalized || fallback).slice(0, maxLength);
};

export const normalizeCardLabel = (value: string | null | undefined) => {
  const normalized = normalizeText(value, "Respondido na Lectum", 80);

  return normalized === "Perguntaram na Lectum" ? "Respondido na Lectum" : normalized;
};

export const normalizeProfessionalName = (value: string | null | undefined) =>
  normalizeText(value, "Profissional Lectum", 90);

export const normalizeProfessionalRoleLabel = (value: string | null | undefined) =>
  normalizeText(value, "Psicólogo(a)", 48);

export const normalizeSocialShareSourceText = (value: string | null | undefined) =>
  normalizeText(value, "Conteúdo na Lectum", 180);

export const normalizeOptionalResponseText = (value: string | null | undefined) =>
  value ? normalizeText(value, "", 180) : null;

export const wrapText = (value: string, maxLineLength: number, maxLines: number) => {
  const words = value.split(/\s+/u).filter(Boolean);
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length <= maxLineLength) {
      current = candidate;
      continue;
    }

    if (current) lines.push(current);
    current = word.slice(0, maxLineLength);
    if (lines.length === maxLines) break;
  }

  if (current && lines.length < maxLines) lines.push(current);
  if (lines.length === 0) lines.push("Conteúdo na Lectum");

  const visible = lines.slice(0, maxLines);
  if (visible.length === maxLines && words.join(" ").length > visible.join(" ").length) {
    const lastLine = visible[maxLines - 1];
    if (lastLine) {
      visible[maxLines - 1] = `${lastLine.replace(/[.?!,\s]+$/u, "")}…`;
    }
  }

  return visible;
};
