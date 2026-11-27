// Campaign/ad labels are marketing slugs, never visitor data or clinical content.
const approvedChannels: Record<string, readonly string[]> = {
  utm_source: ["meta", "facebook", "instagram", "google"],
  utm_medium: ["paid_social", "cpc", "social", "organic"],
};
export function googleAttributionLocation(href: string) {
  const page = new URL("https://www.lectum.com.br/");
  try {
    const url = new URL(href);
    for (const key of ["gclid", "gbraid", "wbraid"]) {
      const value = url.searchParams.get(key);
      if (value && /^[A-Za-z0-9_-]{1,256}$/.test(value)) page.searchParams.set(key, value);
    }
    for (const [key, allowed] of Object.entries(approvedChannels)) {
      const value = url.searchParams.get(key);
      if (value && allowed.includes(value)) page.searchParams.set(key, value);
    }
    for (const key of ["utm_campaign", "utm_content"]) {
      const values = url.searchParams.getAll(key);
      const value = values[0];
      // Format validation is not a semantic PII detector. Use non-personal labels.
      if (values.length === 1 && /^[A-Za-z0-9][A-Za-z0-9_-]{0,99}$/.test(value))
        page.searchParams.set(key, value);
    }
  } catch {
    // Invalid URLs carry no attribution.
  }
  return page.href;
}
export function googleAttributionReferrer(referrer: string) {
  try {
    const url = new URL(referrer);
    if (!["https:", "http:"].includes(url.protocol)) return "";
    const domains = [
      "google.com",
      "google.com.br",
      "bing.com",
      "duckduckgo.com",
      "search.yahoo.com",
      "facebook.com",
      "instagram.com",
      "t.co",
    ];
    return domains.some((domain) => url.hostname === domain || url.hostname.endsWith(`.${domain}`))
      ? `${url.origin}/`
      : "";
  } catch {
    return "";
  }
}
