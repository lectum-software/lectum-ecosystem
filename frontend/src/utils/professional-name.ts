const NAME_CONNECTIVE_PARTS = new Set(["da", "das", "de", "di", "do", "dos", "du", "e"]);

const PROFESSIONAL_TITLE_PREFIX_PATTERN =
  /^(?:(?:dr|dra|doutor|doutora|psic[o\u00f3]logo\(a\)|psic[o\u00f3]loga\(o\)|psic[o\u00f3]loga|psic[o\u00f3]logo|psic|psi)\.?\s*(?:[-\u2013\u2014:]?\s+|$))+/iu;

const NAME_EDGE_PUNCTUATION_PATTERN =
  /^[^A-Za-z\u00c0-\u00d6\u00d8-\u00f6\u00f8-\u00ff0-9]+|[^A-Za-z\u00c0-\u00d6\u00d8-\u00f6\u00f8-\u00ff0-9]+$/g;

export const normalizeProfessionalDisplayName = (fullName?: string | null) =>
  String(fullName ?? "")
    .trim()
    .replace(PROFESSIONAL_TITLE_PREFIX_PATTERN, "")
    .replace(/\s{2,}/g, " ")
    .trim();

export const normalizeProfessionalNamePart = (value?: string | null) =>
  String(value ?? "")
    .trim()
    .replace(PROFESSIONAL_TITLE_PREFIX_PATTERN, "")
    .replace(/\s{2,}/g, " ")
    .trim();

export const getProfessionalShortDisplayName = (
  fullName?: string | null,
  fallback = "psic\u00f3logo",
) => {
  const parts = normalizeProfessionalDisplayName(fullName)
    .split(/\s+/)
    .map((part) => part.replace(NAME_EDGE_PUNCTUATION_PATTERN, ""))
    .filter(Boolean);

  if (parts.length === 0) return fallback;

  return (
    parts.find((part) => !NAME_CONNECTIVE_PARTS.has(part.toLocaleLowerCase("pt-BR"))) ?? parts[0]
  );
};
