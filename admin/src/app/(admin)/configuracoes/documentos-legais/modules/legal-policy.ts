import { z } from "zod";
import type { AdminLegalDocument } from "@/api/req/legal/types";

export const legalDraftSchema = z.object({
  title: z
    .string()
    .trim()
    .min(5, "Informe pelo menos 5 caracteres.")
    .max(180, "Use até 180 caracteres."),
  body: z
    .string()
    .trim()
    .min(1, "Informe o conteúdo do rascunho.")
    .max(100000, "Use até 100.000 caracteres."),
  change_summary: z
    .string()
    .trim()
    .min(10, "Informe pelo menos 10 caracteres.")
    .max(2000, "Use até 2.000 caracteres."),
});

export type LegalDraftForm = z.infer<typeof legalDraftSchema>;

export const legalReviewSchema = z.object({
  confirmations: z
    .array(z.literal("reviewed"))
    .length(1, "Confirme a revisão jurídica antes de publicar."),
});

export type LegalReviewForm = z.infer<typeof legalReviewSchema>;

export const legalKindLabel = (kind: "terms" | "privacy") =>
  kind === "terms" ? "Termos de Uso" : "Política de Privacidade";

export const toLegalDraftValues = (document: LegalDraftForm): LegalDraftForm => ({
  title: document.title,
  body: document.body,
  change_summary: document.change_summary,
});

export const getLegalPublishBlock = (document: AdminLegalDocument) => {
  if (document.status !== "draft") return "Documentos publicados não podem ser alterados.";
  const parsed = legalDraftSchema.safeParse(document);
  if (!parsed.success) return "Revise o título, o conteúdo e o resumo antes de publicar.";
  // Match normalizeDraft/hasLegalPlaceholders/canPublishDocument in backend legal contracts.
  const { title, change_summary } = parsed.data;
  const body = parsed.data.body.replace(/\r\n?/g, "\n").trim();
  if (body.length < 1000) return "A publicação exige conteúdo com pelo menos 1.000 caracteres.";
  if (/\[[A-ZÀ-Ý][A-ZÀ-Ý0-9_ /()-]{1,100}\]/u.test(`${title}\n${body}\n${change_summary}`)) {
    return "Preencha os marcadores em maiúsculas entre colchetes, como [CNPJ], antes de publicar.";
  }
  if (/^\s*#{0,6}\s*(?:minuta|rascunho)\b/imu.test(body)) {
    return "Revise o texto e remova as linhas iniciadas por Minuta ou Rascunho antes de publicar.";
  }
  return null;
};

export const isLegalRevisionConflict = (error: unknown) => {
  if (!error || typeof error !== "object" || !("response" in error)) return false;
  const response = error.response;
  return Boolean(
    response && typeof response === "object" && "status" in response && response.status === 409,
  );
};

export const legalDate = (value: string | null) => {
  if (!value) return "Ainda não publicado";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Data indisponível";
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(date);
};

export const legalDocumentPath = (id: string) =>
  `/configuracoes/documentos-legais/${encodeURIComponent(id)}`;
