"use client";
import { googleAttributionReferrer } from "./google-attribution";
import { googleConsentScope } from "./google-choice";
import { type GooglePage, readGooglePage } from "./google-page";
import { type GoogleEvent, googleEventParams, googleMeasurementId } from "./google-policy";
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
type PageSnapshot = GooglePage & { page_referrer: string };
let currentPage: PageSnapshot | null = null;
let currentPath: string | null = null;
let pageScope: string | null = null;
let navigation = 0;
let navigationQueue: Promise<boolean> = Promise.resolve(true);
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
  currentPage = null;
  currentPath = null;
  pageScope = null;
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
export async function syncGoogleMeasurement(scope = googleConsentScope(), page = readGooglePage()) {
  if (!permitted(scope)) {
    if (!googleConsentScope()) stopGoogleMeasurement();
    return false;
  }
  if (!page) return false;
  const initialPage = { ...page, page_referrer: googleAttributionReferrer(document.referrer) };
  if (!(await loadGoogle()) || !permitted(scope)) {
    if (!googleConsentScope()) stopGoogleMeasurement();
    return false;
  }
  const host = window as unknown as GoogleWindow;
  host[`ga-disable-${GOOGLE_ID}`] = false;
  if (activeScope !== scope) {
    host.gtag?.("consent", "update", {
      analytics_storage: "granted",
      ad_storage: "denied",
      ad_user_data: "denied",
      ad_personalization: "denied",
    });
    activeScope = scope;
  }
  if (!configured) {
    host.gtag?.("js", new Date());
    host.gtag?.("config", GOOGLE_ID, {
      send_page_view: false,
      ...initialPage,
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
  snapshot?: PageSnapshot,
) {
  try {
    const params = googleEventParams(event, accountType);
    const page = snapshot || readGooglePage();
    if (!page) return false;
    const context = {
      ...page,
      page_referrer:
        snapshot?.page_referrer ??
        currentPage?.page_referrer ??
        googleAttributionReferrer(document.referrer),
    };
    if (
      !params ||
      !permitted(scope) ||
      !(await syncGoogleMeasurement(scope, page)) ||
      !permitted(scope)
    )
      return false;
    const key = dedupeKey ? `${scope}:${event}:${dedupeKey}` : null;
    if (key && sent.has(key)) return true;
    if (key) sent.add(key);
    const host = window as unknown as GoogleWindow;
    if (event === "page_view") {
      // Automatic engagement must use the same sanitized context as the page view.
      host.gtag?.("config", GOOGLE_ID, {
        ...context,
        send_page_view: false,
        allow_google_signals: false,
        allow_ad_personalization_signals: false,
      });
    }
    host.gtag?.("event", event, {
      ...params,
      send_to: GOOGLE_ID,
      ...context,
    });
    return true;
  } catch {
    /* Measurement must never block a business action. */
    return false;
  }
}

// New sequence numbers count A -> B -> A as three views, without polling duplicates.
// Wait for the public community marker instead of emitting a generic view first.
export async function syncGooglePage(scope = googleConsentScope()) {
  if (!permitted(scope)) {
    if (!googleConsentScope()) stopGoogleMeasurement();
    return false;
  }
  const page = readGooglePage();
  if (!page) return false;
  const path = new URL(page.page_location).pathname;
  if (pageScope === scope && currentPath === path) return true;
  const previous = pageScope === scope ? currentPage : null;
  const snapshot = {
    ...page,
    page_referrer: previous
      ? new URL(previous.page_location).origin + new URL(previous.page_location).pathname
      : googleAttributionReferrer(document.referrer),
  };
  const sequence = ++navigation;
  currentPage = snapshot;
  currentPath = path;
  pageScope = scope;
  const pending = navigationQueue.then(async () => {
    // Flush native elapsed engagement onto the page being left before updating context.
    if (previous)
      await trackGoogleEvent("page_leave", scope, `leave:${sequence}`, undefined, previous);
    return trackGoogleEvent("page_view", scope, `navigation:${sequence}`, undefined, snapshot);
  });
  navigationQueue = pending.catch(() => false);
  const ok = await pending;
  if (!ok && navigation === sequence) {
    currentPage = null;
    currentPath = null;
    pageScope = null;
  }
  return ok;
}
