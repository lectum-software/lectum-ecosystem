import type { billing_invoice } from "@/external/generated/prisma/client";
import { type InvoiceConfig, InvoiceError } from "./config";
import {
  assertDocumentMatches,
  type InvoiceDocument,
  invoiceReference,
  invoiceRequestSchema,
  parseProvider,
} from "./contracts";
import { invoiceDocumentStatus } from "./document-authorization";
import { invoicePdfFilename } from "./filename";
import { SendNfAdapter } from "./SendNfAdapter";

export type InvoicePdfRecord = Pick<
  billing_invoice,
  | "id"
  | "company_id"
  | "mode"
  | "amount_cents"
  | "currency"
  | "reference"
  | "request_snapshot"
  | "document_id"
  | "status"
  | "number"
  | "gateway"
  | "account_id"
  | "payment_id"
>;

/** Pure local binding checks, not authorization of the requesting actor. */
export function invoicePdfSnapshot(invoice: InvoicePdfRecord, config: InvoiceConfig) {
  if (!invoice.document_id || invoice.status !== "authorized")
    throw new InvoiceError("document_not_authorized");
  const request = parseProvider(invoiceRequestSchema, invoice.request_snapshot);
  if (
    invoice.mode !== config.mode ||
    invoice.company_id !== config.companyId ||
    request.company_id !== invoice.company_id ||
    request.reference !== invoice.reference ||
    request.items[0].unit_amount !== invoice.amount_cents ||
    !["stripe", "mercadopago"].includes(invoice.gateway) ||
    (invoice.gateway === "stripe" && !invoice.account_id) ||
    invoice.reference !==
      invoiceReference(
        invoice.company_id,
        invoice.payment_id,
        config.mode,
        invoice.gateway === "stripe" ? invoice.account_id! : undefined,
      ) ||
    invoice.currency !== "BRL" ||
    !Number.isSafeInteger(invoice.amount_cents) ||
    invoice.amount_cents <= 0
  )
    throw new InvoiceError("document_mismatch");
  return request;
}

export function assertInvoicePdfDocument(
  document: InvoiceDocument,
  invoice: InvoicePdfRecord,
  config: InvoiceConfig,
) {
  const request = invoicePdfSnapshot(invoice, config);
  if (document.id !== invoice.document_id) throw new InvoiceError("document_mismatch");
  assertDocumentMatches(document, request, config.mode);
  if (invoiceDocumentStatus(document) !== "authorized")
    throw new InvoiceError("document_not_authorized");
}

/** Actor/object authorization must precede this read-only provider boundary. No issuance. */
export async function readAuthorizedInvoicePdf(invoice: InvoicePdfRecord, config: InvoiceConfig) {
  invoicePdfSnapshot(invoice, config);
  const provider = new SendNfAdapter(config.apiKey, config.companyId, config.mode);
  await provider.verifyIdentity();
  const document = await provider.getDocument(invoice.document_id!);
  assertInvoicePdfDocument(document, invoice, config);
  return {
    pdf: await provider.pdf(invoice.document_id!),
    mode: config.mode,
    filename: invoicePdfFilename({
      mode: config.mode,
      number: document.nfse_number ?? invoice.number,
      // The fallback uses a local reference, never a provider identifier.
      paymentId: invoice.id,
      authorizedAt: document.authorized_at,
    }),
  };
}
