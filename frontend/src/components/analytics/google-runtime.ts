"use client";
import { googleConsentScope } from "./google-choice";
import {
  type GoogleEvent,
  googleEventParams,
  googleMeasurementId,
  googlePageLocation,
} from "./google-policy";
export const GOOGLE_ID = googleMeasurementId(process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS_ID);
export const GOOGLE_ENABLED =
  Boolean(GOOGLE_ID) && process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS_ENABLED === "true";
type GoogleWindow = Window & {
  dataLayer?: unknown[];
  gtag?: (...args: unknown[]) => void;
  [key: `ga-disable-${string}`]: boolean;
};
let loading: Promise<boolean> | null = null;
let configured = false;
let activeScope: string | null = null;
const sent = new Set<string>();
function permitted(scope: string | null): boolean {
  return (
    GOOGLE_ENABLED &&
    typeof window !== "undefined" &&
    Boolean(scope) &&
    googleConsentScope() === scope &&
    ["lectum.com.br", "www.lectum.com.br"].includes(window.location.hostname)
  );
}
const deniedConsent = {
  analytics_storage: "denied",
  ad_storage: "denied",
  ad_user_data: "denied",
  ad_personalization: "denied",
};
export function stopGoogleMeasurement() {
  if (typeof window === "undefined" || !GOOGLE_ID) return;
  const host = window as unknown as GoogleWindow;
  host[`ga-disable-${GOOGLE_ID}`] = true;
  if (activeScope) host.gtag?.("consent", "update", deniedConsent);
  activeScope = null;
  if (!googleConsentScope()) {
    for (const cookie of document.cookie.split(";")) {
      const name = cookie.trim().split("=")[0];
      if (!/^_ga(?:_|$)|^_gcl_/.test(name)) continue;
      for (const domain of [
        "",
        "; domain=.lectum.com.br",
        `; domain=${window.location.hostname}`,
      ]) {
        // biome-ignore lint/suspicious/noDocumentCookie: revoke cookies across supported browsers.
        document.cookie = `${name}=; Max-Age=0; path=/${domain}`;
      }
    }
  }
}
function loadGoogle() {
  if (loading) return loading;
  const host = window as unknown as GoogleWindow;
  host.dataLayer ??= [];
  host.gtag ??= function () {
    // biome-ignore lint/complexity/noArguments: Google gtag consumes an Arguments object.
    host.dataLayer?.push(arguments); // eslint-disable-line prefer-rest-params -- standard gtag queue
  };
  host.gtag("consent", "default", deniedConsent);
  host.gtag("set", "ads_data_redaction", true);
  loading = new Promise<boolean>((resolve) => {
    const script = document.createElement("script");
    script.async = true;
    script.referrerPolicy = "no-referrer";
    script.src = `https://www.googletagmanager.com/gtag/js?id=${GOOGLE_ID}`;
    const timer = window.setTimeout(() => {
      script.remove();
      resolve(false);
    }, 10_000);
    script.onload = () => {
      window.clearTimeout(timer);
      resolve(true);
    };
    script.onerror = () => {
      window.clearTimeout(timer);
      script.remove();
      resolve(false);
    };
    document.head.appendChild(script);
  });
  return loading;
}
export async function syncGoogleMeasurement(scope = googleConsentScope()) {
  if (!permitted(scope)) {
    if (!googleConsentScope()) stopGoogleMeasurement();
    return false;
  }
  if (!(await loadGoogle()) || !permitted(scope)) {
    if (!googleConsentScope()) stopGoogleMeasurement();
    return false;
  }
  const host = window as unknown as GoogleWindow;
  host[`ga-disable-${GOOGLE_ID}`] = false;
  if (activeScope !== scope) {
    host.gtag?.("consent", "update", {
      analytics_storage: "granted",
      ad_storage: "granted",
      ad_user_data: "granted",
      ad_personalization: "denied",
    });
    activeScope = scope;
  }
  if (!configured) {
    host.gtag?.("js", new Date());
    host.gtag?.("config", GOOGLE_ID, {
      send_page_view: false,
      page_location: googlePageLocation(window.location.href),
      page_referrer: "",
      page_title: "Lectum",
      allow_google_signals: false,
      allow_ad_personalization_signals: false,
    });
    configured = true;
  }
  return true;
}
// Capture consent before starting the business action; never infer permission afterwards.
export function googleActionScope() {
  return permitted(googleConsentScope()) ? googleConsentScope() : null;
}
export async function trackGoogleEvent(
  event: GoogleEvent,
  scope: string | null,
  dedupeKey?: string,
  accountType?: string,
) {
  try {
    const params = googleEventParams(event, accountType);
    if (!params || !permitted(scope) || !(await syncGoogleMeasurement(scope)) || !permitted(scope))
      return false;
    const key = dedupeKey ? `${scope}:${event}:${dedupeKey}` : null;
    if (key && sent.has(key)) return true;
    if (key) sent.add(key);
    (window as unknown as GoogleWindow).gtag?.("event", event, {
      ...params,
      send_to: GOOGLE_ID,
      page_location: "https://www.lectum.com.br/",
      page_title: "Lectum",
      page_referrer: "",
    });
    return true;
  } catch {
    /* Measurement must never block a business action. */
    return false;
  }
}
