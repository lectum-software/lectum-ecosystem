import type { InvoiceMode } from "./config";

export function invoicePdfFilename(input: {
  mode: InvoiceMode;
  number?: string | null;
  paymentId: string;
  authorizedAt?: string | null;
}) {
  const safe = (value: string) => value.replace(/[^A-Za-z0-9_-]/g, "-").slice(0, 100);
  const identifier = input.number?.trim()
    ? safe(input.number.trim())
    : `Pagamento-${safe(input.paymentId)}`;
  const date = input.authorizedAt ? new Date(input.authorizedAt) : null;
  const suffix =
    date && Number.isFinite(date.getTime())
      ? `-${new Intl.DateTimeFormat("pt-BR", {
          timeZone: "America/Sao_Paulo",
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        })
          .format(date)
          .replaceAll("/", "-")}`
      : "";
  return `Lectum-Nota-Fiscal-${input.mode === "test" ? "Teste-" : ""}${identifier}${suffix}.pdf`;
}
