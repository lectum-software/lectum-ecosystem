import type { FinanceFinancialBasis } from "@/api/req/finance";

export const hasLocalFinancialBasis = (value: unknown): value is FinanceFinancialBasis => {
  if (!value || typeof value !== "object") return false;
  const basis = value as Partial<FinanceFinancialBasis>;
  return (
    basis.kind === "local_gross_receipts" &&
    typeof basis.available === "boolean" &&
    basis.provider_coverage === "not_checked" &&
    basis.refund_snapshot_scope === "stripe_receipts" &&
    basis.fees_available === false &&
    basis.net_cash_flow_available === false &&
    typeof basis.observed_at === "string" &&
    Number.isFinite(Date.parse(basis.observed_at)) &&
    typeof basis.gross_receipts_cents === "number" &&
    Number.isSafeInteger(basis.gross_receipts_cents) &&
    basis.gross_receipts_cents >= 0 &&
    typeof basis.refund_snapshot_cents === "number" &&
    Number.isSafeInteger(basis.refund_snapshot_cents) &&
    basis.refund_snapshot_cents >= 0 &&
    basis.refund_snapshot_cents <= basis.gross_receipts_cents &&
    typeof basis.note === "string" &&
    basis.note.trim().length > 0 &&
    basis.note.length <= 1200
  );
};

export const formatLocalFinancialObservation = (value: string) =>
  Number.isFinite(Date.parse(value))
    ? new Intl.DateTimeFormat("pt-BR", {
        timeZone: "America/Sao_Paulo",
        dateStyle: "short",
        timeStyle: "short",
      }).format(new Date(value))
    : "Data indisponível";
