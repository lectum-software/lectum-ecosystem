const NAME_CONNECTIVE_PARTS = new Set(["da", "das", "de", "di", "do", "dos", "du", "e"]);

export const getProfessionalShortDisplayName = (
  fullName?: string | null,
  fallback = "psicólogo",
) => {
  const parts = String(fullName ?? "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (parts.length === 0) return fallback;
  if (parts.length === 1) return parts[0];

  const shortName = parts.slice(0, 2);
  const secondPart = parts[1].toLocaleLowerCase("pt-BR");

  if (NAME_CONNECTIVE_PARTS.has(secondPart) && parts[2]) {
    shortName.push(parts[2]);
  }

  return shortName.join(" ");
};
