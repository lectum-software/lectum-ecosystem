export const statuses = { new: "Novo", reviewing: "Em análise", resolved: "Concluído" };
export const categories = {
  unclassified: "Não classificado",
  technical: "Problema técnico",
  suggestion: "Sugestão de melhoria",
};
export const controlClass =
  "min-h-11 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30";
export const actionClass =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-semibold hover:bg-surface-muted disabled:opacity-50";
export const dateLabel = (value: string) =>
  new Date(value).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
