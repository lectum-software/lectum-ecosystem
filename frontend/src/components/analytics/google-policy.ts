export const GOOGLE_CHOICE_KEY = "lectum.google-measurement.v1";
export const GOOGLE_CHOICE_CHANGED = "lectum:google-measurement-changed";
export const GOOGLE_CHOICE_VERSION = 1;
export const GOOGLE_CHOICE_MAX_AGE = 90 * 24 * 60 * 60_000;
export type GoogleChoice = {
  version: number;
  allowed: boolean;
  savedAt: number;
  expiresAt: number;
};
export function parseGoogleChoice(raw: string | null, now = Date.now()): GoogleChoice | null {
  try {
    const v = JSON.parse(raw || "null");
    return v &&
      v.version === GOOGLE_CHOICE_VERSION &&
      typeof v.allowed === "boolean" &&
      Number.isFinite(v.savedAt) &&
      Number.isFinite(v.expiresAt) &&
      v.savedAt <= now &&
      v.expiresAt > now &&
      v.expiresAt > v.savedAt &&
      v.expiresAt - v.savedAt <= GOOGLE_CHOICE_MAX_AGE
      ? v
      : null;
  } catch {
    return null;
  }
}
export function googleMeasurementId(value: string | undefined) {
  return value && /^G-[A-Z0-9]{6,20}$/.test(value) ? value : null;
}
export type GoogleEvent =
  | "page_view"
  | "forum_post"
  | "whatsapp_click"
  | "sign_up"
  | "begin_checkout"
  | "subscribe";
export function googleEventParams(event: GoogleEvent, accountType?: string) {
  if (
    ![
      "page_view",
      "forum_post",
      "whatsapp_click",
      "sign_up",
      "begin_checkout",
      "subscribe",
    ].includes(event)
  )
    return null;
  return event === "sign_up" && ["user", "professional"].includes(accountType || "")
    ? { account_type: accountType }
    : {};
}
