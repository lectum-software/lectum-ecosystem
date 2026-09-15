import { z } from "zod";
import type {
  AdminCommunitySuggestionBlockStatus,
  AdminCommunitySuggestionStatus,
} from "@/api/req/moderation";

const dateDraft = z
  .string()
  .trim()
  .refine((value) => value.length === 0 || /^\d{4}-\d{2}-\d{2}$/.test(value), {
    message: "Use uma data válida.",
  });

export const PAGE_LIMIT = 10;

export const cardClass =
  "rounded-card border border-border/80 bg-surface/95 shadow-admin-soft backdrop-blur";

export const numberFormatter = new Intl.NumberFormat("pt-BR");

export const dateTimeFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  month: "2-digit",
  year: "numeric",
});

export const compactDateFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

export const formatDateTime = (value?: string | null) => {
  if (!value) return "—";
  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? "—" : dateTimeFormatter.format(date);
};

export const formatCompactDate = (value?: string | null) => {
  if (!value) return "Sem sugestões";
  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? "Sem sugestões" : compactDateFormatter.format(date);
};

export const blockStatusLabel: Record<AdminCommunitySuggestionBlockStatus, string> = {
  arquivada: "Arquivado",
  candidata: "Candidata",
  convertida: "Convertida",
  monitorando: "Monitorando",
};

export const suggestionStatusLabel: Record<
  Exclude<AdminCommunitySuggestionStatus, "all">,
  string
> = {
  agrupada: "Agrupada",
  arquivada: "Arquivada",
  pendente: "Sem bloco",
};

export const blockStatusTone: Record<AdminCommunitySuggestionBlockStatus, string> = {
  arquivada: "bg-surface-muted text-muted ring-border",
  candidata: "bg-warning-soft text-warning ring-warning-border",
  convertida: "bg-success-soft text-success ring-success/20",
  monitorando: "bg-primary-soft text-primary ring-primary/15",
};

export const suggestionStatusTone: Record<
  Exclude<AdminCommunitySuggestionStatus, "all">,
  string
> = {
  agrupada: "bg-primary-soft text-primary ring-primary/15",
  arquivada: "bg-surface-muted text-muted ring-border",
  pendente: "bg-warning-soft text-warning ring-warning-border",
};

export const filtersSchema = z.object({
  blockId: z.string().trim(),
  from: dateDraft,
  q: z.string().trim().max(120, "Use até 120 caracteres."),
  status: z.enum(["all", "agrupada", "arquivada", "pendente"]),
  to: dateDraft,
  userRole: z.enum(["all", "paciente", "psicologo"]),
});

export type CommunitySuggestionFiltersForm = z.infer<typeof filtersSchema>;

export const filtersDefaultValues: CommunitySuggestionFiltersForm = {
  blockId: "all",
  from: "",
  q: "",
  status: "all",
  to: "",
  userRole: "all",
};

export const createBlockSchema = z.object({
  description: z.string().trim().max(500, "Use até 500 caracteres."),
  title: z
    .string()
    .trim()
    .min(3, "Informe um título com pelo menos 3 caracteres.")
    .max(120, "Use até 120 caracteres."),
});

export type CreateBlockForm = z.infer<typeof createBlockSchema>;

export const createBlockDefaultValues: CreateBlockForm = {
  description: "",
  title: "",
};

export const moveSuggestionSchema = z.object({
  blockId: z.string().trim(),
});

export type MoveSuggestionForm = z.infer<typeof moveSuggestionSchema>;

export const updateBlockSchema = z.object({
  status: z.enum(["arquivada", "candidata", "convertida", "monitorando"]),
});

export type UpdateBlockForm = z.infer<typeof updateBlockSchema>;

export const suggestionStatusOptions = [
  { label: "Todos", value: "all" },
  { label: "Sem bloco", value: "pendente" },
  { label: "Agrupadas", value: "agrupada" },
  { label: "Arquivadas", value: "arquivada" },
] as const;

export const userRoleOptions = [
  { label: "Todos", value: "all" },
  { label: "Pacientes", value: "paciente" },
  { label: "Psicólogos", value: "psicologo" },
] as const;

export const blockStatusOptions = [
  { label: "Monitorando", value: "monitorando" },
  { label: "Candidata", value: "candidata" },
  { label: "Convertida", value: "convertida" },
  { label: "Arquivada", value: "arquivada" },
] as const;

export const toBlockFilterOptions = (blocks: { id: string; title: string }[]) => [
  { label: "Todos", value: "all" },
  { label: "Sem bloco", value: "unassigned" },
  ...blocks.map((block) => ({ label: block.title, value: block.id })),
];

export const toMoveBlockOptions = (blocks: { id: string; status: string; title: string }[]) => [
  { label: "Sem bloco", value: "" },
  ...blocks
    .filter((block) => block.status !== "arquivada")
    .map((block) => ({ label: block.title, value: block.id })),
];

export const latestSuggestionLabel = (value?: string | null) => formatCompactDate(value);
