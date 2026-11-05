export function invoiceDownloadFilename(header: unknown, fallback: string) {
  const match =
    typeof header === "string"
      ? /filename="(Lectum-Nota-Fiscal-[A-Za-z0-9_-]+\.pdf)"/.exec(header)
      : null;
  return match?.[1] ?? fallback;
}
