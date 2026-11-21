export const PRIVACY_NOTICE_VERSION = "lectum-meta-measurement-2026-11-21-network-context";
export const PRIVACY_MAX_AGE_MS = 90 * 24 * 60 * 60_000;
export const PRIVACY_CHANGED = "lectum:privacy-changed";
export const PRIVACY_OPEN = "lectum:privacy-open";

export type PrivacyChoice = {
  version: string;
  campaigns: boolean;
  authorizeTransfer?: boolean;
  savedAt: number;
  expiresAt: number;
  pendingRevocation?: boolean;
};

export function privacyStorageKey(userId?: string | null) {
  return `lectum.privacy.${userId || "guest"}`;
}

export function parsePrivacyChoice(raw: string | null, now = Date.now()): PrivacyChoice | null {
  try {
    const value = JSON.parse(raw || "null");
    if (
      !value ||
      value.version !== PRIVACY_NOTICE_VERSION ||
      typeof value.campaigns !== "boolean" ||
      !Number.isFinite(value.savedAt) ||
      !Number.isFinite(value.expiresAt) ||
      value.savedAt > now ||
      value.expiresAt <= now ||
      value.expiresAt <= value.savedAt ||
      value.expiresAt - value.savedAt > PRIVACY_MAX_AGE_MS
    )
      return null;
    return {
      version: value.version,
      campaigns: value.campaigns,
      authorizeTransfer:
        value.campaigns === true && value.authorizeTransfer === true && !value.pendingRevocation,
      savedAt: value.savedAt,
      expiresAt: value.expiresAt,
      pendingRevocation: value.pendingRevocation === true,
    };
  } catch {
    return null;
  }
}

export function createPrivacyChoice(
  campaigns: boolean,
  now = Date.now(),
  authorizeTransfer = false,
): PrivacyChoice {
  return {
    version: PRIVACY_NOTICE_VERSION,
    campaigns,
    authorizeTransfer: campaigns && authorizeTransfer,
    savedAt: now,
    expiresAt: now + PRIVACY_MAX_AGE_MS,
  };
}

// Only browsing surfaces can invite a decision. Forms, checkout and legal reading take priority.
export function canShowPrivacyNotice(path: string) {
  return (
    path === "/" ||
    path === "/app" ||
    path === "/psicologos" ||
    path === "/app/psychologists" ||
    /^\/comunidades(?:\/[^/]+)?$/.test(path)
  );
}
