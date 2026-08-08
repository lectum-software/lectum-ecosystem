import type { AdminPsychologistCatalogItem } from "@/api/req/psychologists";

const formatNullable = (value?: string | number | null) => {
  if (value === null || value === undefined || value === "") return "Não informado";

  return String(value);
};

export const capitalizeOptionLabel = (value?: string | number | null) => {
  const formatted = formatNullable(value);
  if (formatted === "Não informado") return formatted;

  return formatted.replace(/^(\s*)(\p{L})/u, (_, spaces: string, letter: string) => {
    return `${spaces}${letter.toLocaleUpperCase("pt-BR")}`;
  });
};

export const listText = (items: string[] | AdminPsychologistCatalogItem[]) => {
  if (items.length === 0) return "Não informado";

  return items
    .map((item) => capitalizeOptionLabel(typeof item === "string" ? item : item.name))
    .join(", ");
};
