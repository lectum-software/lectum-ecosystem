import type { Request, Response } from "express";
import { send } from "@/helpers/return";
import { error } from "@/helpers/translate";
import { getInvoiceConfig } from "@/modules/billing/invoices/config";
import {
  assertDocumentMatches,
  invoiceRequestSchema,
  parseProvider,
} from "@/modules/billing/invoices/contracts";
import { invoiceDocumentStatus } from "@/modules/billing/invoices/document-authorization";
import { invoicePdfFilename } from "@/modules/billing/invoices/filename";
import {
  invoiceGatewayScopes,
  invoiceScopeMatches,
} from "@/modules/billing/invoices/gateway-scope";
import { InvoiceRepository } from "@/modules/billing/invoices/repository";
import { SendNfAdapter } from "@/modules/billing/invoices/SendNfAdapter";
import type { ISubscriptionDTO } from "../DTOs/ISubscriptionDTO";

export async function invoicePdf(data: ISubscriptionDTO & { params: { id: string } }) {
  if (data.auth.role !== "psicologo" || !data.auth.id)
    return { status: 403, ...error("role_not_authorized", {}) };
  const config = getInvoiceConfig();
  if (!config) return { status: 503, ...error("billing_invoice_unavailable", {}) };
  const invoice = await new InvoiceRepository().findOwned(data.params.id, data.auth.id);
  if (
    !invoice ||
    invoice.mode !== config.mode ||
    invoice.company_id !== config.companyId ||
    !invoiceScopeMatches(invoiceGatewayScopes(config.mode), invoice)
  ) {
    return { status: 404, ...error("billing_invoice_unavailable", {}) };
  }
  if (!invoice.document_id || invoice.status !== "authorized")
    return { status: 409, ...error("billing_invoice_unavailable", {}) };
  const provider = new SendNfAdapter(config.apiKey, config.companyId, config.mode);
  await provider.verifyIdentity();
  const document = await provider.getDocument(invoice.document_id);
  assertDocumentMatches(
    document,
    parseProvider(invoiceRequestSchema, invoice.request_snapshot),
    config.mode,
  );
  // Recheck the current response even when an older worker cached "authorized".
  if (invoiceDocumentStatus(document) !== "authorized")
    return { status: 409, ...error("billing_invoice_unavailable", {}) };
  return {
    status: 200,
    pdf: await provider.pdf(invoice.document_id),
    mode: config.mode,
    filename: invoicePdfFilename({
      mode: config.mode,
      number: document.nfse_number ?? invoice.number,
      paymentId: invoice.payment_id,
      authorizedAt: document.authorized_at,
    }),
  };
}

export async function downloadInvoice(req: Request, res: Response) {
  res.setHeader("Cache-Control", "private, no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");
  try {
    const result = await invoicePdf(req as unknown as Parameters<typeof invoicePdf>[0]);
    if ("pdf" in result)
      return res
        .setHeader("Access-Control-Expose-Headers", "Content-Disposition")
        .type("application/pdf")
        .attachment(result.filename)
        .send(result.pdf);
    return send(res, result);
  } catch {
    return send(res, { status: 503, ...error("billing_invoice_unavailable", {}) });
  }
}
