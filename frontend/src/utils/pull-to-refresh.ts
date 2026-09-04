export type PullToRefreshIndicatorStatus = "done" | "idle" | "pulling" | "ready" | "refreshing";

export type PullToRefreshSnapshot = {
  progress: number;
  status: Extract<PullToRefreshIndicatorStatus, "pulling" | "ready">;
  translateY: number;
};

export const PULL_TO_REFRESH_TRIGGER_PX = 76;
export const PULL_TO_REFRESH_MAX_DISTANCE_PX = 128;
export const PULL_TO_REFRESH_RESTING_OFFSET_PX = 10;
export const PULL_TO_REFRESH_READY_OFFSET_PX = 58;

const PULL_TO_REFRESH_DISABLED_PREFIXES = ["/api", "/auth", "/dashboard", "/version"];

const PULL_TO_REFRESH_DISABLED_ROUTE_PATTERNS = [
  /^\/(?:psychologist|psicologo)\/cfp(?:\/|$)/u,
  /^\/app\/(?:account|configuracoes|conta|settings)(?:\/|$)/u,
  /^\/app\/(?:professional|profissional)\/cfp(?:\/|$)/u,
  /^\/app\/(?:professional|profissional)\/(?:assinatura|billing|whatsapp)(?:\/|$)/u,
  /^\/app\/(?:professional\/profile\/setup|profissional\/perfil\/configurar)(?:\/|$)/u,
  /\/(?:edit|editar)(?:\/|$)/u,
  /\/(?:new|nova)(?:\/|$)/u,
  /\/(?:suggest|sugerir)(?:\/|$)/u,
];

const PULL_TO_REFRESH_INTERACTIVE_TARGET_SELECTOR = [
  "a",
  "button",
  'input:not([type="hidden"])',
  "select",
  "textarea",
  "[contenteditable]",
  '[role="button"]',
  '[role="slider"]',
  '[role="textbox"]',
  '[data-lectum-pull-refresh-ignore="true"]',
].join(",");

const PULL_TO_REFRESH_BLOCKING_SURFACE_SELECTOR = [
  "dialog[open]",
  '[aria-modal="true"]',
  '[data-lectum-pull-refresh-block="true"]',
].join(",");

const normalizePullToRefreshPathname = (pathname: string) => {
  const trimmedPathname = pathname.trim();
  if (!trimmedPathname) return "/";

  try {
    const path = trimmedPathname.startsWith("http")
      ? new URL(trimmedPathname).pathname
      : new URL(trimmedPathname, "https://lectum.local").pathname;

    return path.length > 1 ? path.replace(/\/+$/u, "") : path;
  } catch {
    return "/";
  }
};

export const isPullToRefreshRouteEnabled = (pathname: string) => {
  const normalizedPathname = normalizePullToRefreshPathname(pathname);

  if (normalizedPathname === "/llms.txt") return false;

  if (
    PULL_TO_REFRESH_DISABLED_PREFIXES.some(
      (prefix) => normalizedPathname === prefix || normalizedPathname.startsWith(`${prefix}/`),
    )
  ) {
    return false;
  }

  return !PULL_TO_REFRESH_DISABLED_ROUTE_PATTERNS.some((pattern) =>
    pattern.test(normalizedPathname),
  );
};

export const getPullToRefreshSnapshot = (distancePx: number): PullToRefreshSnapshot => {
  const clampedDistance = Math.max(0, Math.min(distancePx, PULL_TO_REFRESH_MAX_DISTANCE_PX));
  const progress = Math.min(clampedDistance / PULL_TO_REFRESH_TRIGGER_PX, 1);
  const translateY = Math.round(PULL_TO_REFRESH_RESTING_OFFSET_PX + clampedDistance * 0.56);

  return {
    progress,
    status: progress >= 1 ? "ready" : "pulling",
    translateY,
  };
};

export const shouldIgnorePullToRefreshTarget = (target: EventTarget | null) => {
  if (!(target instanceof Element)) return true;

  return Boolean(target.closest(PULL_TO_REFRESH_INTERACTIVE_TARGET_SELECTOR));
};

export const hasBlockingPullToRefreshSurface = () => {
  if (typeof document === "undefined") return true;

  return Boolean(document.querySelector(PULL_TO_REFRESH_BLOCKING_SURFACE_SELECTOR));
};

export const isDocumentScrolledToTop = () => {
  if (typeof window === "undefined" || typeof document === "undefined") return false;

  return (
    window.scrollY <= 0 &&
    document.documentElement.scrollTop <= 0 &&
    (document.body?.scrollTop ?? 0) <= 0
  );
};

export const isScrollChainAtTop = (target: Element) => {
  let current: Element | null = target;

  while (current && current !== document.body && current !== document.documentElement) {
    const style = window.getComputedStyle(current);
    const canScrollVertically =
      (style.overflowY === "auto" || style.overflowY === "scroll") &&
      current.scrollHeight > current.clientHeight + 1;

    if (canScrollVertically && current.scrollTop > 0) return false;

    current = current.parentElement;
  }

  return true;
};
