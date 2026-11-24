export const EXPERIENCE_VERSION = "lectum-experience-2026-11-23";
export const EXPERIENCE_CHANGED = "lectum:experience-changed";
export const EXPERIENCE_MAX_AGE_MS = 90 * 24 * 60 * 60_000;

export type ExperienceChoice = {
  version: string;
  allowed: boolean;
  savedAt: number;
  expiresAt: number;
};

export function experienceStorageKey(userId: string | null) {
  return `lectum.experience.${userId || "guest"}`;
}

export function createExperienceChoice(allowed: boolean, now = Date.now()): ExperienceChoice {
  return {
    version: EXPERIENCE_VERSION,
    allowed,
    savedAt: now,
    expiresAt: now + EXPERIENCE_MAX_AGE_MS,
  };
}

export function parseExperienceChoice(
  raw: string | null,
  now = Date.now(),
): ExperienceChoice | null {
  try {
    const value = JSON.parse(raw || "null");
    if (
      !value ||
      value.version !== EXPERIENCE_VERSION ||
      typeof value.allowed !== "boolean" ||
      !Number.isFinite(value.savedAt) ||
      !Number.isFinite(value.expiresAt) ||
      value.savedAt > now ||
      value.expiresAt <= now ||
      value.expiresAt <= value.savedAt ||
      value.expiresAt - value.savedAt > EXPERIENCE_MAX_AGE_MS
    )
      return null;
    return {
      version: value.version,
      allowed: value.allowed,
      savedAt: value.savedAt,
      expiresAt: value.expiresAt,
    };
  } catch {
    return null;
  }
}

const APPROVED_ORIGINS = ["https://lectum.com.br", "https://www.lectum.com.br"];
const PUBLIC_ID = /^[A-Za-z0-9_-]{1,128}$/;

function isPublicExperienceUrl(url: URL) {
  if (url.username || url.password) return false;
  const path = url.pathname;
  const post =
    /^\/comunidades\/[A-Za-z0-9_-]{1,256}\/publicacao\/[A-Za-z0-9_-]{1,128}(?:\/resposta\/[A-Za-z0-9_-]{1,128})?$/.test(
      path,
    );
  const directory = path === "/psicologos" || path === "/comunidades";
  const detail = /^\/(?:psicologos\/[A-Za-z0-9_-]{1,128}|comunidades\/[A-Za-z0-9_-]{1,256})$/.test(
    path,
  );
  if (path !== "/" && !directory && !detail && !post) return false;

  // Allow navigation identifiers, never arbitrary search terms or return URLs.
  const keys = new Set<string>();
  for (const [key, value] of url.searchParams) {
    if (keys.has(key) || !PUBLIC_ID.test(value)) return false;
    keys.add(key);
    if (key === "focusReplyId" && post) continue;
    if (["reel", "reelPost", "reelReply"].includes(key) && (post || path === "/")) continue;
    if (key === "community" && path === "/comunidades/top-mentores") continue;
    return false;
  }
  if ((keys.has("reelPost") || keys.has("reelReply")) && !keys.has("reel")) return false;
  if (url.hash) {
    const focus = url.searchParams.get("focusReplyId");
    if (!post || !focus || url.hash !== `#reply-${focus}`) return false;
  }
  return true;
}

export function isSamePageReelTransition(from: string, to: string) {
  try {
    const previous = new URL(from);
    const next = new URL(to);
    return (
      previous.origin === next.origin &&
      previous.pathname === next.pathname &&
      previous.searchParams.has("reel") &&
      next.searchParams.has("reel") &&
      isPublicExperienceUrl(previous) &&
      isPublicExperienceUrl(next)
    );
  } catch {
    return false;
  }
}

export function canCaptureExperience(input: {
  enabled: boolean;
  choice: ExperienceChoice | null;
  url: string;
  referrer: string;
  now?: number;
  localPreview?: boolean;
}) {
  if (!input.enabled || !parseExperienceChoice(JSON.stringify(input.choice), input.now)?.allowed)
    return false;
  try {
    const url = new URL(input.url);
    const local =
      input.localPreview === true &&
      url.protocol === "http:" &&
      ["127.0.0.1", "localhost"].includes(url.hostname);
    if (
      (!local && !APPROVED_ORIGINS.includes(url.origin)) ||
      url.username ||
      url.password ||
      !isPublicExperienceUrl(url)
    )
      return false;
    if (input.referrer) {
      const referrer = new URL(input.referrer);
      if (referrer.origin !== url.origin || !isPublicExperienceUrl(referrer)) return false;
    }
    return true;
  } catch {
    return false;
  }
}
