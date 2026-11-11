import { error } from "@/helpers/translate";
import { getInvoiceConfig } from "@/modules/billing/invoices/config";
import { readAuthorizedInvoicePdf } from "@/modules/billing/invoices/read-pdf";
import type { IAdminInvoiceDTO } from "../DTOs/IAdminInvoiceDTO";
import { AdminInvoiceRepository } from "../repositories/AdminInvoiceRepository";
import { canReadAdminInvoice } from "./access-policy";

export async function adminInvoicePdf(data: IAdminInvoiceDTO) {
  if (!data.admin?.id || !data.admin.active || !data.admin.confirmed || data.admin.deleted)
    return { status: 403, ...error("role_not_authorized", {}) };
  const config = getInvoiceConfig();
  if (!config) return { status: 503, ...error("billing_invoice_unavailable", {}) };
  const repository = new AdminInvoiceRepository();
  const record = await repository.findForUser(data.p.id, data.q.user_id);
  if (!record || !canReadAdminInvoice(record, data.q.user_id, config))
    return { status: 404, ...error("billing_invoice_unavailable", {}) };
  if (record.invoice.status !== "authorized" || !record.invoice.document_id)
    return { status: 409, ...error("billing_invoice_unavailable", {}) };

  const result = await readAuthorizedInvoicePdf(record.invoice, config);
  // Audit means bytes were prepared, not that the browser saved/opened the file.
  const audited = await repository.recordPreparedDownload({
    adminId: data.admin.id,
    invoiceId: record.invoice.id,
    userId: data.q.user_id,
    updatedAt: result.invoiceUpdatedAt,
    subscriptionUpdatedAt: record.subscription.updatedAt,
    mode: config.mode,
  });
  if (!audited) return { status: 409, ...error("billing_invoice_unavailable", {}) };
  return { status: 200, ...result };
}
