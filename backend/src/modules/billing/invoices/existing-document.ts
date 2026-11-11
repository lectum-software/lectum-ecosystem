import type { billing_invoice } from "@/external/generated/prisma/client";
import { type InvoiceConfig, InvoiceError } from "./config";
import {
  assertDocumentMatches,
  type InvoiceDocument,
  invoiceReference,
  invoiceRequestSchema,
  parseProvider,
  providerId,
} from "./contracts";
import { logInvoiceOutcome, safeInvoiceDiagnostic } from "./diagnostics";
import { invoiceDocumentNextAttempt, invoiceDocumentStatus } from "./document-authorization";
import { invoiceGatewayScopes, invoiceScopeMatches } from "./gateway-scope";
import type { InvoiceRepository } from "./repository";
import { SendNfAdapter } from "./SendNfAdapter";

export type InvoiceDocumentRecord = Pick<
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
export type ExistingInvoiceRecord = InvoiceDocumentRecord &
  Pick<billing_invoice, "updated_at" | "lease_token" | "user_id" | "subscription_id">;

/** Historical binding, independent of current payment/contract eligibility or issuance gates. */
export function invoiceDocumentSnapshot(invoice: InvoiceDocumentRecord, config: InvoiceConfig) {
  const request = parseProvider(invoiceRequestSchema, invoice.request_snapshot);
  if (
    !/^[A-Za-z0-9_-]{1,128}$/.test(invoice.id) ||
    !providerId.safeParse(invoice.document_id).success ||
    !providerId.safeParse(invoice.payment_id).success ||
    invoice.mode !== config.mode ||
    invoice.company_id !== config.companyId ||
    request.company_id !== invoice.company_id ||
    request.reference !== invoice.reference ||
    request.items[0].unit_amount !== invoice.amount_cents ||
    !["stripe", "mercadopago"].includes(invoice.gateway) ||
    (invoice.gateway === "stripe" && !/^acct_[A-Za-z0-9]{1,100}$/.test(invoice.account_id ?? "")) ||
    (invoice.gateway === "mercadopago" && invoice.account_id !== null) ||
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

export function assertExistingInvoiceDocument(
  document: InvoiceDocument,
  invoice: InvoiceDocumentRecord,
  config: InvoiceConfig,
) {
  const request = invoiceDocumentSnapshot(invoice, config);
  if (document.id !== invoice.document_id) throw new InvoiceError("document_mismatch");
  assertDocumentMatches(document, request, config.mode);
}

/** GET-only provider reconciliation. Never creates/cancels a document or reads a payment gateway. */
export async function reconcileExistingInvoiceDocument(
  invoice: ExistingInvoiceRecord,
  config: InvoiceConfig,
  provider: Pick<SendNfAdapter, "verifyIdentity" | "getDocument"> = new SendNfAdapter(
    config.apiKey,
    config.companyId,
    config.mode,
  ),
  repository?: InvoiceRepository,
) {
  invoiceDocumentSnapshot(invoice, config);
  if (!invoiceScopeMatches(invoiceGatewayScopes(config.mode), invoice))
    throw new InvoiceError("payment_environment_mismatch");
  await provider.verifyIdentity();
  const document = await provider.getDocument(invoice.document_id!);
  assertExistingInvoiceDocument(document, invoice, config);
  const status = invoiceDocumentStatus(document);
  const persistence = repository ?? new (await import("./repository")).InvoiceRepository();
  const updated = await persistence.observeDocument(invoice, {
    status,
    number: document.nfse_number ?? invoice.number,
    last_error_code: document.failure_code ? safeInvoiceDiagnostic(document.failure_code) : null,
    next_attempt_at: invoiceDocumentNextAttempt(status),
  });
  if (!updated) throw new InvoiceError("document_observation_conflict", true);
  logInvoiceOutcome({
    id: invoice.id,
    stage: "document",
    outcome: "observed",
    documentStatus: updated.status,
    code: document.failure_code,
    attempts: updated.attempts,
  });
  return { document, invoice: updated };
}
