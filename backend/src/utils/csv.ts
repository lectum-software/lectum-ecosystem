import { sanitizePublicProvenanceSource } from "./public-response";

const CSV_FORMULA_PREFIX = /^[\s]*[=+\-@]/;
const PROVENANCE_LABELS = {
  contas: "Contas",
  conteudo: "Conteúdo",
  engajamento: "Engajamento",
  pagamentos: "Pagamentos",
  plataforma: "Plataforma",
} as const;

export const csvCell = (value: unknown) => {
  const normalized = value === null || value === undefined ? "" : String(value);
  const formulaSafe =
    typeof value === "string" && CSV_FORMULA_PREFIX.test(normalized)
      ? `'${normalized}`
      : normalized;

  return `"${formulaSafe.replace(/"/g, '""')}"`;
};

export const csvRow = (values: readonly unknown[]) => values.map(csvCell).join(",");

export const csvPublicProvenance = (value: unknown) => {
  const sanitized = sanitizePublicProvenanceSource(value);
  if (typeof sanitized !== "string") return "";

  return PROVENANCE_LABELS[sanitized as keyof typeof PROVENANCE_LABELS] ?? sanitized;
};
