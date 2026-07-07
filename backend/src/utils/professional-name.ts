const NAME_CONNECTIVE_PARTS = new Set(["da", "das", "de", "di", "do", "dos", "du", "e"]);

const PROFESSIONAL_TITLE_PREFIX_PATTERN =
  /^(?:(?:dr|dra|doutor|doutora|psic[o\u00f3]logo\(a\)|psic[o\u00f3]loga\(o\)|psic[o\u00f3]loga|psic[o\u00f3]logo|psic|psi)\.?\s*(?:[-\u2013\u2014:]?\s+|$))+/iu;

const NAME_LEADING_SEPARATOR_PATTERN = /^[\s.\-\u2013\u2014:]+/u;

export const normalizeProfessionalDisplayName = (fullName?: string | null) =>
  String(fullName ?? "")
    .trim()
    .replace(PROFESSIONAL_TITLE_PREFIX_PATTERN, "")
    .replace(NAME_LEADING_SEPARATOR_PATTERN, "")
    .replace(/\s{2,}/g, " ")
    .trim();

export const getProfessionalShortDisplayName = (
  fullName?: string | null,
  fallback = "psic\u00f3logo",
) => {
  const parts = normalizeProfessionalDisplayName(fullName).split(/\s+/).filter(Boolean);

  if (parts.length === 0) return fallback;
  if (parts.length === 1) return parts[0];

  const shortName = parts.slice(0, 2);
  const secondPart = parts[1].toLocaleLowerCase("pt-BR");

  if (NAME_CONNECTIVE_PARTS.has(secondPart) && parts[2]) {
    shortName.push(parts[2]);
  }

  return shortName.join(" ");
};
