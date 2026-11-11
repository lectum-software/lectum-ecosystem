import type { Request, Response } from "express";
import { error500, send } from "@/helpers/return";
import { error } from "@/helpers/translate";
import { InvoiceError } from "@/modules/billing/invoices/config";
import type { IAdminInvoiceDTO } from "../DTOs/IAdminInvoiceDTO";
import { adminInvoicePdf } from "./services";

export async function downloadAdminInvoice(req: Request, res: Response) {
  res.set({ "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" });
  try {
    const result = await adminInvoicePdf(req as IAdminInvoiceDTO);
    if ("pdf" in result)
      return res
        .setHeader("Access-Control-Expose-Headers", "Content-Disposition")
        .type("application/pdf")
        .attachment(result.filename)
        .send(result.pdf);
    return send(res, result);
  } catch (caught) {
    if (caught instanceof InvoiceError)
      return send(res, {
        status: caught.code === "document_not_authorized" ? 409 : 503,
        ...error("billing_invoice_unavailable", {}),
      });
    return error500(res, "admin_invoice_download", caught);
  }
}
