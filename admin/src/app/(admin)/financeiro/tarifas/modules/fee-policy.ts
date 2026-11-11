import { z } from "zod";
import type {
  AdminFeeItem,
  BalanceFactKind,
  BalanceStatus,
  FeeDiagnostic,
  FeeQuery,
  FeeState,
} from "@/api/req/finance/fees";
import { formatHistoryDate, formatHistoryMoney } from "@/components/finance-history/presentation";

export const isFeeCivilDate = (value: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    year >= 2000 &&
    year <= 2100 &&
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
};
const optionalDate = z
  .string()
  .refine((value) => !value || isFeeCivilDate(value), "Informe uma data válida.");
export const feeFilterSchema = z
  .object({ from: optionalDate, to: optionalDate })
  .refine((value) => !value.from || !value.to || value.from <= value.to, {
    path: ["to"],
    message: "Revise a ordem das datas.",
  });
export type FeeFilterValues = z.infer<typeof feeFilterSchema>;
export const resolveFeeQuery = (params: URLSearchParams) => {
  const schema = z
    .strictObject({
      from: z.string().refine(isFeeCivilDate).optional(),
      to: z.string().refine(isFeeCivilDate).optional(),
      page: z.coerce.number().int().min(1).max(100000).default(1),
      limit: z.coerce.number().int().min(1).max(50).default(20),
    })
    .refine((value) => !value.from || !value.to || value.from <= value.to);
  const parsed = schema.safeParse(Object.fromEntries(params));
  return { query: parsed.success ? (parsed.data as FeeQuery) : {}, valid: parsed.success };
};
export const formatFeeMoney = (value: number | null | undefined) =>
  typeof value === "number" && Number.isSafeInteger(value)
    ? formatHistoryMoney(value, "BRL")
    : "Não observado";
export const formatFeeDate = (value: string | null | undefined) =>
  value ? formatHistoryDate(value) : "Não observado";
export const feeStateLabel = (state: FeeState) => {
  const labels = {
    not_observed: "Não observado",
    processing: "Observação em andamento",
    partial: "Observação parcial",
    observed: "Etapas consultadas nesta observação",
    unavailable: "Consulta indisponível",
    conflict: "Revisão necessária",
  };
  return Object.hasOwn(labels, state) ? labels[state] : "Observação não comprovada";
};
export const feeDiagnosticLabel = (code: FeeDiagnostic | null) => {
  const labels = {
    read_access_denied:
      "A leitura de uma etapa não está autorizada neste ambiente. A cobertura permanece parcial.",
    provider_unavailable: "Não foi possível consultar todos os movimentos agora.",
    scope_mismatch: "Os vínculos não puderam ser comprovados. Solicite uma revisão operacional.",
    invalid_receipt: "O recebimento precisa de revisão antes da consulta.",
    balance_missing: "Um movimento ainda não está disponível para observação.",
    unsupported_balance: "Um movimento não pôde ser validado nesta consulta.",
    fact_conflict: "Há divergência nos fatos observados. Solicite uma revisão operacional.",
    lease_unavailable: "Outra observação está em andamento. Aguarde antes de continuar.",
    live_not_authorized: "A consulta externa de tarifas em produção não está habilitada.",
  };
  return code && Object.hasOwn(labels, code)
    ? labels[code]
    : code
      ? "Não foi possível comprovar todos os movimentos."
      : null;
};
export const balanceKindLabel = (kind: BalanceFactKind) => {
  const labels = {
    capture: "Captura",
    refund: "Estorno",
    refund_reversal: "Reversão de estorno",
    dispute: "Ajuste de disputa",
  };
  return Object.hasOwn(labels, kind) ? labels[kind] : "Movimento não classificado";
};
export const balanceStatusLabel = (status: BalanceStatus) =>
  status === "pending"
    ? "Pendente na Stripe · não é saldo disponível"
    : status === "available"
      ? "Disponibilidade observada na Stripe"
      : "Disponibilidade não comprovada";
export const feeObserveLabel = (item: AdminFeeItem) =>
  item.coverage.has_more || ["partial", "processing"].includes(item.coverage.state)
    ? "Continuar observação"
    : "Observar taxas";
export const feeCaptureValues = (item: AdminFeeItem) =>
  item.coverage.capture_verified && item.capture?.available
    ? { fee: item.capture.fee_cents, net: item.capture.net_cents }
    : { fee: null, net: null };
