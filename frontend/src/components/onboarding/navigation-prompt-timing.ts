const memory = new Map<string, number>();
export const COMMUNITY_TIP_DELAY_MS = 30_000;
export const SIGNUP_DELAY_MS = 180_000;
export const BETWEEN_PROMPTS_MS = 120_000;
const TIP_CLOSED_KEY = "lectum.prompts.community_closed_at";
export const SIGNUP_TIME_KEY = "lectum.prompts.discovery_active_ms";
export const communityTimeKey = (identity: string) =>
  `lectum.prompts.community_active_ms:${identity}`;
let communityTipOpen = false;

const read = (key: string) => {
  try {
    const value = Number(window.sessionStorage.getItem(key));
    return Number.isFinite(value) && value >= 0 ? value : 0;
  } catch {
    return memory.get(key) ?? 0;
  }
};

const write = (key: string, value: number) => {
  memory.set(key, value);
  try {
    window.sessionStorage.setItem(key, String(value));
  } catch {
    // Retain progress in this document if browser storage is unavailable.
  }
};

export const canShowAutomaticSignup = (elapsedMs: number, now = Date.now()) => {
  const closedAt = read(TIP_CLOSED_KEY);
  return (
    elapsedMs >= SIGNUP_DELAY_MS &&
    !communityTipOpen &&
    (closedAt === 0 || now - closedAt >= BETWEEN_PROMPTS_MS)
  );
};

export const trackCommunityTipOpen = () => {
  communityTipOpen = true;
  let closed = false;
  const close = () => {
    if (closed) return;
    closed = true;
    communityTipOpen = false;
    write(TIP_CLOSED_KEY, Date.now());
    window.removeEventListener("pagehide", close);
  };
  window.addEventListener("pagehide", close);
  return close;
};

// Flush visible segments on visibility changes, never counting time in a hidden tab.
export const trackVisibleNavigation = (key: string, onTick: (elapsedMs: number) => void) => {
  let previous = Date.now();
  let visible = document.visibilityState === "visible";
  const flush = () => {
    const now = Date.now();
    if (visible) write(key, read(key) + Math.max(0, now - previous));
    previous = now;
  };
  const onVisibility = () => {
    flush();
    visible = document.visibilityState === "visible";
  };
  const interval = window.setInterval(() => {
    flush();
    if (visible) onTick(read(key));
  }, 500);
  document.addEventListener("visibilitychange", onVisibility);
  return () => {
    flush();
    window.clearInterval(interval);
    document.removeEventListener("visibilitychange", onVisibility);
  };
};
