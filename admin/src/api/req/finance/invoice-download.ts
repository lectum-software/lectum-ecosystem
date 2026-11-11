import { adminApi } from "@/api/client";
import { downloadFileBlob, resolveSafeDownloadFilename } from "@/lib/download";
import { isValidInvoicePdf } from "@/lib/invoice-pdf";

export const downloadAdminFinanceInvoice = async (invoiceId: string, userId: string) => {
  if (!invoiceId || !userId) throw new Error("invoice_download_unavailable");
  const response = await adminApi.get<Blob>(
    `/api/admin/private/finance/invoices/${encodeURIComponent(invoiceId)}/pdf`,
    { params: { user_id: userId }, responseType: "blob", timeout: 45_000 },
  );
  if (!(await isValidInvoicePdf(response.data))) {
    throw new Error("invoice_download_unavailable");
  }
  const filename = resolveSafeDownloadFilename(
    response.headers["content-disposition"],
    "Lectum-Nota-Fiscal.pdf",
    ".pdf",
  );
  downloadFileBlob(response.data, filename, ".pdf");
};
