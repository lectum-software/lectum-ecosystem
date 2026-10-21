export const ANALYTICS_PATH = "/app/profissional/estatisticas";
export const ANALYTICS_SCROLL_KEY = "lectum.analytics.return-scroll";
export function analyticsReturnHref(value: string | null) {
  if (!value) return null;
  try {
    const url = new URL(value, "https://lectum.local");
    if (
      url.origin !== "https://lectum.local" ||
      url.pathname !== ANALYTICS_PATH ||
      !value.startsWith("/")
    )
      return null;
    return `${url.pathname + url.search}#conteudos-em-destaque`;
  } catch {
    return null;
  }
}
export function rememberAnalyticsPosition() {
  try {
    sessionStorage.setItem(
      ANALYTICS_SCROLL_KEY,
      JSON.stringify({
        top: window.scrollY,
        at: Date.now(),
      }),
    );
  } catch {
    /* Browser storage may be unavailable. */
  }
}
