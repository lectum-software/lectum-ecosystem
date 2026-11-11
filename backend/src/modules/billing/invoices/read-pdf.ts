import { type InvoiceConfig, InvoiceError } from "./config";
import type { InvoiceDocument } from "./contracts";
import { invoiceDocumentStatus } from "./document-authorization";
import {
  assertExistingInvoiceDocument,
  type ExistingInvoiceRecord,
  type InvoiceDocumentRecord,
  invoiceDocumentSnapshot,
  reconcileExistingInvoiceDocument,
} from "./existing-document";
import { invoicePdfFilename } from "./filename";
import { SendNfAdapter } from "./SendNfAdapter";

export type InvoicePdfRecord = InvoiceDocumentRecord;

/** Pure local binding checks, not authorization of the requesting actor. */
export function invoicePdfSnapshot(invoice: InvoicePdfRecord, config: InvoiceConfig) {
  if (!invoice.document_id || invoice.status !== "authorized")
    throw new InvoiceError("document_not_authorized");
  return invoiceDocumentSnapshot(invoice, config);
}

export function assertInvoicePdfDocument(
  document: InvoiceDocument,
  invoice: InvoicePdfRecord,
  config: InvoiceConfig,
) {
  invoicePdfSnapshot(invoice, config);
  assertExistingInvoiceDocument(document, invoice, config);
  if (invoiceDocumentStatus(document) !== "authorized")
    throw new InvoiceError("document_not_authorized");
}

/** Actor/object authorization must precede this read-only provider boundary. No issuance. */
export async function readAuthorizedInvoicePdf(
  invoice: ExistingInvoiceRecord,
  config: InvoiceConfig,
) {
  invoicePdfSnapshot(invoice, config);
  const provider = new SendNfAdapter(config.apiKey, config.companyId, config.mode);
  const repository = new (await import("./repository")).InvoiceRepository();
  const observed = await reconcileExistingInvoiceDocument(invoice, config, provider, repository);
  const { document } = observed;
  assertInvoicePdfDocument(document, observed.invoice, config);
  const pdf = await provider.pdf(invoice.document_id!);
  if (!(await repository.isDocumentCurrent(observed.invoice)))
    throw new InvoiceError("document_not_authorized");
  return {
    pdf,
    // The admin audit rechecks this exact post-observation version before releasing bytes.
    invoiceUpdatedAt: observed.invoice.updated_at,
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
