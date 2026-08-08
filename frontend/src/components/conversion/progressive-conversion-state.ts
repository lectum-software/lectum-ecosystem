import { createContext, type PropsWithChildren } from "react";

export type ConversionTrigger =
  | "trigger_tempo"
  | "trigger_psicologos"
  | "trigger_comunidade"
  | "trigger_scroll"
  | "trigger_favorito"
  | "trigger_salvar"
  | "trigger_comentar"
  | "trigger_voto"
  | "trigger_whatsapp";

export type ConversionIntent = {
  createdAt: string;
  payload?: Record<string, boolean | null | number | string | undefined>;
  returnTo: string;
  trigger: ConversionTrigger;
  type:
    | "comment_post"
    | "create_post"
    | "favorite_psychologist"
    | "follow_community"
    | "open_whatsapp"
    | "reply_comment"
    | "save_post"
    | "save_reply"
    | "vote_post"
    | "vote_reply";
};

export type ConversionPromptState = {
  intent?: ConversionIntent;
  trigger: ConversionTrigger;
};

export type RequestConversionOptions = {
  intent?: Omit<ConversionIntent, "createdAt" | "returnTo" | "trigger"> &
    Partial<Pick<ConversionIntent, "returnTo">>;
};

export type ProgressiveConversionContextValue = {
  consumePendingIntent: (
    predicate?: (intent: ConversionIntent) => boolean,
  ) => ConversionIntent | null;
  isAuthenticated: boolean;
  requestConversion: (trigger: ConversionTrigger, options?: RequestConversionOptions) => boolean;
  requestWhatsAppAccess: (whatsappUrl: string, returnTo?: string) => boolean;
};

export type ProgressiveConversionProviderProps = PropsWithChildren<{
  isAuthenticated: boolean;
  pathname: string;
}>;

export const SESSION_SHOWN_KEY = "modal_exibida_na_sessao";

export const ANALYTICS_KEY = "lectum.conversion.analytics";

export const NAVIGATION_SECONDS_KEY = "lectum.conversion.navigation_seconds";

export const OPENED_POSTS_KEY = "lectum.conversion.opened_posts";

export const PENDING_INTENT_KEY = "lectum.conversion.pending_intent";

export const PROFILE_IDS_KEY = "lectum.conversion.psychologist_profiles";

export const WHATSAPP_CLICK_COUNT_KEY = "lectum.conversion.whatsapp_click_count";

export const MODAL_TITLE_ID = "lectum-conversion-modal-title";

export const MODAL_DESCRIPTION_ID = "lectum-conversion-modal-description";

export const sessionStorageSafe = () => {
  if (typeof window === "undefined") return null;

  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
};

export const getCurrentReturnTo = () => {
  if (typeof window === "undefined") return "/psicologos";

  return `${window.location.pathname}${window.location.search}${window.location.hash}`;
};

export const readJson = <T>(key: string, fallback: T): T => {
  const storage = sessionStorageSafe();
  if (!storage) return fallback;

  const raw = storage.getItem(key);
  if (!raw) return fallback;

  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
};

export const writeJson = (key: string, value: unknown) => {
  const storage = sessionStorageSafe();
  if (!storage) return;

  storage.setItem(key, JSON.stringify(value));
};

export const readNumber = (key: string) => {
  const storage = sessionStorageSafe();
  if (!storage) return 0;

  return Number(storage.getItem(key) ?? "0") || 0;
};

export const writeNumber = (key: string, value: number) => {
  const storage = sessionStorageSafe();
  if (!storage) return;

  storage.setItem(key, String(value));
};

export const hasPromptBeenShown = () => {
  const storage = sessionStorageSafe();

  return storage?.getItem(SESSION_SHOWN_KEY) === "true";
};

export const markPromptAsShown = () => {
  const storage = sessionStorageSafe();
  if (!storage) return;

  storage.setItem(SESSION_SHOWN_KEY, "true");
};

export const savePendingIntent = (intent?: ConversionIntent) => {
  if (!intent) return;

  writeJson(PENDING_INTENT_KEY, intent);
};

export const readPendingIntent = () => readJson<ConversionIntent | null>(PENDING_INTENT_KEY, null);

export const clearPendingIntent = () => {
  const storage = sessionStorageSafe();
  if (!storage) return;

  storage.removeItem(PENDING_INTENT_KEY);
};

export const recordConversionAnalytics = (trigger: ConversionTrigger, pathname: string) => {
  const storage = sessionStorageSafe();
  if (!storage) return;

  const events = readJson<
    Array<{ createdAt: string; pathname: string; trigger: ConversionTrigger }>
  >(ANALYTICS_KEY, []);
  const event = {
    createdAt: new Date().toISOString(),
    pathname,
    trigger,
  };

  writeJson(ANALYTICS_KEY, [...events, event]);

  window.dispatchEvent(
    new CustomEvent("lectum:conversion-analytics", {
      detail: event,
    }),
  );
};

export const addToSessionSet = (key: string, value: string) => {
  const items = readJson<string[]>(key, []);
  const nextItems = [...new Set([...items, value])];

  writeJson(key, nextItems);

  return nextItems.length;
};

export const normalizePath = (pathname: string) => {
  if (pathname.length <= 1) return pathname;

  return pathname.replace(/\/+$/, "");
};

export const getPathSegments = (pathname: string) =>
  normalizePath(pathname).split("/").filter(Boolean);

export const isPublicDiscoveryPath = (pathname: string) => {
  const normalizedPathname = normalizePath(pathname);

  return (
    normalizedPathname === "/comunidades" ||
    normalizedPathname.startsWith("/comunidades/") ||
    normalizedPathname === "/community" ||
    normalizedPathname.startsWith("/community/") ||
    normalizedPathname === "/psicologos" ||
    normalizedPathname.startsWith("/psicologos/") ||
    normalizedPathname === "/psychologists" ||
    normalizedPathname.startsWith("/psychologists/")
  );
};

export const CONVERSION_PROMPT_SUPPRESSED_PATHS = new Set([
  "/app/favoritos",
  "/app/notificacoes",
  "/app/perfil",
]);

export const isConversionPromptSuppressedPath = (pathname: string) =>
  CONVERSION_PROMPT_SUPPRESSED_PATHS.has(normalizePath(pathname));

export const isPsychologistProfilePath = (pathname: string) => {
  const segments = getPathSegments(pathname);

  return segments.length === 2 && (segments[0] === "psychologists" || segments[0] === "psicologos");
};

export const isPublicPsychologistsPath = (pathname: string) => {
  const normalizedPathname = normalizePath(pathname);

  return (
    normalizedPathname === "/psicologos" ||
    normalizedPathname.startsWith("/psicologos/") ||
    normalizedPathname === "/psychologists" ||
    normalizedPathname.startsWith("/psychologists/")
  );
};

export const isCommunityPostPath = (pathname: string) => {
  const segments = getPathSegments(pathname);

  return (
    (segments.length >= 4 && segments[0] === "community" && segments[2] === "post") ||
    (segments.length >= 4 && segments[0] === "comunidades" && segments[2] === "publicacao")
  );
};

export const isCommunityDetailPath = (pathname: string) => {
  const segments = getPathSegments(pathname);
  const reservedSegments = new Set([
    "feed",
    "post",
    "publicacao",
    "suggest",
    "top-mentors",
    "top-mentores",
  ]);

  return (
    segments.length === 2 &&
    (segments[0] === "community" || segments[0] === "comunidades") &&
    !reservedSegments.has(segments[1])
  );
};

export const noopContext: ProgressiveConversionContextValue = {
  consumePendingIntent: () => null,
  isAuthenticated: true,
  requestConversion: () => true,
  requestWhatsAppAccess: () => true,
};

export const ProgressiveConversionContext =
  createContext<ProgressiveConversionContextValue>(noopContext);

export const ACTION_PROMPT_TYPES: ConversionIntent["type"][] = [
  "comment_post",
  "create_post",
  "favorite_psychologist",
  "follow_community",
  "reply_comment",
  "save_post",
  "save_reply",
  "vote_post",
  "vote_reply",
];

export const isActionPromptType = (type?: ConversionIntent["type"]) =>
  Boolean(type && ACTION_PROMPT_TYPES.includes(type));
