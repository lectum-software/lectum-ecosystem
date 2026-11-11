import type { FinancialHistory, FinancialHistoryInvoice } from "@/api/req/finance/history";

const financialLabels: Record<string, string> = {
  paid: "Pago",
  pending: "Pendente",
  failed: "Não concluído",
  canceled: "Cancelado",
  refunded: "Estornado",
  partially_refunded: "Estornado parcialmente",
  disputed: "Em disputa",
  processed: "Evento processado",
};

const fiscalLabels: Record<string, string> = {
  queued: "Aguardando emissão",
  awaiting_activation: "Emissão fiscal desativada",
  awaiting_configuration: "Aguardando configuração fiscal",
  pending: "Em processamento",
  processing: "Em processamento",
  authorized: "Autorizada · download indisponível",
  simulated: "Simulada · sem autorização fiscal",
  authorization_unverified: "Autorização fiscal não comprovada",
  blocked: "Aguardando regularização",
  failed: "Emissão não concluída",
  rejected: "Rejeitada",
  manual_review: "Em revisão",
  cancel_requested: "Cancelamento em análise",
  cancelled: "Cancelada",
};

export const financialStatusLabel = (status: string) =>
  Object.hasOwn(financialLabels, status) ? financialLabels[status] : "Status não informado";

export const financialStatusClass = (status: string) =>
  status === "paid"
    ? "bg-success-soft text-success"
    : status === "pending" || status === "disputed"
      ? "bg-warning-soft text-warning"
      : status === "failed" || status === "canceled"
        ? "bg-danger-soft text-danger"
        : "bg-surface-muted text-muted";

export const invoicePresentation = (invoice?: FinancialHistoryInvoice | null) => {
  if (!invoice) return { label: "Sem nota fiscal vinculada", canDownload: false, isTest: false };
  const validMode = invoice.mode === "test" || invoice.mode === "live";
  const canDownload = Boolean(
    invoice.id && validMode && invoice.status === "authorized" && invoice.downloadable === true,
  );
  return {
    label: canDownload
      ? "Autorizada"
      : Object.hasOwn(fiscalLabels, invoice.status)
        ? fiscalLabels[invoice.status]
        : "Situação fiscal indisponível",
    canDownload,
    isTest: invoice.mode === "test",
  };
};

export const formatHistoryMoney = (cents: number | null, currency: string | null) => {
  if (
    !Number.isSafeInteger(cents) ||
    cents === null ||
    !currency ||
    !/^[A-Za-z]{3}$/.test(currency)
  ) {
    return "Valor não informado";
  }
  try {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: currency.toUpperCase(),
    }).format(cents / 100);
  } catch {
    return "Valor não informado";
  }
};

export const formatHistoryDate = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) return "Data não informada";
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  }).format(date);
};

export const formatInvoiceNumber = (value: string | null) =>
  value && /^[A-Za-z0-9.-]{1,50}$/.test(value) ? value : null;

export const hasFinancialHistoryContract = (value?: FinancialHistory): value is FinancialHistory =>
  Boolean(
    value &&
      Array.isArray(value.items) &&
      Number.isSafeInteger(value.pagination?.page) &&
      value.pagination.page > 0 &&
      Number.isSafeInteger(value.pagination?.limit) &&
      value.pagination.limit > 0 &&
      Number.isSafeInteger(value.pagination?.total) &&
      value.pagination.total >= 0 &&
      Number.isSafeInteger(value.pagination?.total_pages) &&
      value.pagination.total_pages >= 0 &&
      value.coverage?.remote_readiness === "not_checked" &&
      value.coverage.complete === false,
  );

export const historyPageNumbers = (page: number, pages: number) => {
  const start = Math.max(1, Math.min(page - 1, pages - 2));
  return Array.from({ length: Math.min(3, pages) }, (_, index) => start + index);
};
