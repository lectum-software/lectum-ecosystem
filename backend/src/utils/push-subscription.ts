import { z } from "zod";
import { parseSafeExternalHttpsUrl } from "./safe-external-url";

export type WebPushSubscriptionPayload = {
  endpoint: string;
  expirationTime?: number | null;
  keys: {
    auth: string;
    p256dh: string;
  };
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value && typeof value === "object" && !Array.isArray(value));

const hasOnlyKeys = (value: Record<string, unknown>, allowedKeys: readonly string[]) => {
  const allowed = new Set(allowedKeys);
  return Object.keys(value).every((key) => allowed.has(key));
};

const hasControlCharacter = (value: string) =>
  Array.from(value).some((character) => {
    const code = character.charCodeAt(0);
    return code < 32 || code === 127;
  });

const isBoundedKey = (value: unknown) =>
  typeof value === "string" &&
  value.length > 0 &&
  value.length <= 512 &&
  !/\s/u.test(value) &&
  !hasControlCharacter(value);

const isKnownBrowserPushHostname = (hostname: string) => {
  const normalizedHostname = hostname.toLowerCase().replace(/\.+$/, "");

  return (
    normalizedHostname === "fcm.googleapis.com" ||
    normalizedHostname === "android.googleapis.com" ||
    normalizedHostname === "updates.push.services.mozilla.com" ||
    normalizedHostname === "push.services.mozilla.com" ||
    normalizedHostname === "web.push.apple.com" ||
    (normalizedHostname.endsWith(".notify.windows.com") &&
      normalizedHostname !== "notify.windows.com")
  );
};

const isSecureEndpoint = (value: unknown) => {
  const url = parseSafeExternalHttpsUrl(value);
  return Boolean(url && url.pathname.length > 1 && isKnownBrowserPushHostname(url.hostname));
};

export const isWebPushSubscriptionPayload = (
  value: unknown,
): value is WebPushSubscriptionPayload => {
  if (!isRecord(value) || !hasOnlyKeys(value, ["endpoint", "expirationTime", "keys"])) {
    return false;
  }

  if (!isSecureEndpoint(value.endpoint) || !isRecord(value.keys)) return false;
  if (!hasOnlyKeys(value.keys, ["auth", "p256dh"])) return false;
  if (!isBoundedKey(value.keys.auth) || !isBoundedKey(value.keys.p256dh)) return false;

  return (
    value.expirationTime === undefined ||
    value.expirationTime === null ||
    (typeof value.expirationTime === "number" &&
      Number.isFinite(value.expirationTime) &&
      value.expirationTime >= 0)
  );
};

export const webPushSubscriptionSchema = z.custom<WebPushSubscriptionPayload>(
  isWebPushSubscriptionPayload,
  "Assinatura de notificação inválida.",
);
