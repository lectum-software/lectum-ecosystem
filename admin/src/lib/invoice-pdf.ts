const MAX_INVOICE_PDF_BYTES = 10 * 1024 * 1024;

export const isValidInvoicePdf = async (blob: unknown): Promise<boolean> => {
  if (
    !(blob instanceof Blob) ||
    blob.size < 5 ||
    blob.size > MAX_INVOICE_PDF_BYTES ||
    blob.type.split(";")[0]?.trim().toLowerCase() !== "application/pdf"
  ) {
    return false;
  }
  return (await blob.slice(0, 5).text()) === "%PDF-";
};
