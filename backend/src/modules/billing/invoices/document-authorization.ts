import type { InvoiceDocument } from "./contracts";

export type InvoiceDocumentStatus =
  | InvoiceDocument["status"]
  | "simulated"
  | "authorization_unverified";

const hasPublicQuery = (value: string | null | undefined) => {
  if (
    !value ||
    /\s/.test(value) ||
    [...value].some((character) => character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127)
  )
    return false;
  try {
    const url = new URL(value);
    // Validate only; never fetch, expose or infer a government host from this URL.
    return url.protocol === "https:" && Boolean(url.hostname) && !url.username && !url.password;
  } catch {
    return false;
  }
};

/** Provider authorized can describe a test mirror, not a government-authorized document. */
export const invoiceDocumentStatus = (document: InvoiceDocument): InvoiceDocumentStatus => {
  if (document.status !== "authorized") return document.status;
  if (document.simulation === true)
    return document.mode === "test" ? "simulated" : "authorization_unverified";
  const hasSimulationMarker = [document.nfse_number, document.access_key].some(
    (value) => typeof value === "string" && /^SIM-/i.test(value),
  );
  if (
    document.simulation !== false ||
    hasSimulationMarker ||
    !/^\d{50}$/.test(document.access_key ?? "") ||
    !hasPublicQuery(document.urls?.public_query)
  )
    return "authorization_unverified";
  return "authorized";
};

export const invoiceDocumentNextAttempt = (status: InvoiceDocumentStatus, now = Date.now()) =>
  new Date(
    now +
      (["authorized", "simulated", "authorization_unverified"].includes(status) ? 24 * 60 : 5) *
        60_000,
  );
