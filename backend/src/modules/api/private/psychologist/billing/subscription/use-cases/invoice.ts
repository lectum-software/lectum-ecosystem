import type { Request, Response } from "express";
import { send } from "@/helpers/return";
import { error } from "@/helpers/translate";
import { getInvoiceConfig, InvoiceError } from "@/modules/billing/invoices/config";
import {
  invoiceGatewayScopes,
  invoiceScopeMatches,
} from "@/modules/billing/invoices/gateway-scope";
import { readAuthorizedInvoicePdf } from "@/modules/billing/invoices/read-pdf";
import { InvoiceRepository } from "@/modules/billing/invoices/repository";
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
  try {
    return { status: 200, ...(await readAuthorizedInvoicePdf(invoice, config)) };
  } catch (caught) {
    if (caught instanceof InvoiceError && caught.code === "document_not_authorized")
      return { status: 409, ...error("billing_invoice_unavailable", {}) };
    throw caught;
  }
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
