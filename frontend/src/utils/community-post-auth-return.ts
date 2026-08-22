import { DEFAULT_COMMUNITY_FEED_HREF } from "./community";
import { normalizeSafeInternalRedirect } from "./safe-redirect";

export const CREATE_POST_AUTH_RETURN_HOME_HREF = DEFAULT_COMMUNITY_FEED_HREF;

const CREATE_POST_AUTH_RETURN_KEY = "lectum.communityPost.authReturn";
const CREATE_POST_AUTH_RETURN_MAX_AGE_MS = 15 * 60 * 1000;
const INTERNAL_ORIGIN = "https://lectum.local";

type StoredCreatePostAuthReturn = {
  createdAt: number;
  target: string;
};

type ReplaceRouter = {
  replace: (href: string) => void;
};

const createPostPathPatterns = [
  /^\/app\/comunidades\/[^/]+\/publicacao\/nova$/,
  /^\/app\/community\/[^/]+\/post\/new$/,
  /^\/app\/comunidades\/publicacao\/nova$/,
  /^\/app\/community\/post\/new$/,
] as const;

const getSafeRedirectUrl = (value: string | null | undefined) => {
  const safeRedirect = normalizeSafeInternalRedirect(value);
  if (!safeRedirect) return null;

  try {
    return new URL(safeRedirect, INTERNAL_ORIGIN);
  } catch {
    return null;
  }
};

export const isCreateCommunityPostRedirect = (value: string | null | undefined) => {
  const url = getSafeRedirectUrl(value);

  if (!url) return false;

  return createPostPathPatterns.some((pattern) => pattern.test(url.pathname));
};

const readStoredCreatePostAuthReturn = () => {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.sessionStorage.getItem(CREATE_POST_AUTH_RETURN_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Partial<StoredCreatePostAuthReturn>;
    if (typeof parsed.target !== "string" || typeof parsed.createdAt !== "number") {
      return null;
    }

    return parsed as StoredCreatePostAuthReturn;
  } catch {
    return null;
  }
};

export const clearCreatePostAuthReturnTarget = () => {
  if (typeof window === "undefined") return;

  try {
    window.sessionStorage.removeItem(CREATE_POST_AUTH_RETURN_KEY);
  } catch {
    // O fallback de navegação continua funcionando quando o storage está indisponível.
  }
};

export const rememberCreatePostAuthReturnTarget = (target: string | null | undefined) => {
  const url = getSafeRedirectUrl(target);

  if (typeof window === "undefined" || !url || !isCreateCommunityPostRedirect(target)) {
    return;
  }

  try {
    window.sessionStorage.setItem(
      CREATE_POST_AUTH_RETURN_KEY,
      JSON.stringify({
        createdAt: Date.now(),
        target: `${url.pathname}${url.search}`,
      } satisfies StoredCreatePostAuthReturn),
    );
  } catch {
    // Se o navegador bloquear sessionStorage, o fechamento usa o fallback histórico existente.
  }
};

export const consumeCreatePostAuthReturnHomeOverride = (currentHref?: string | null) => {
  if (typeof window === "undefined") return false;

  const stored = readStoredCreatePostAuthReturn();
  if (!stored) {
    clearCreatePostAuthReturnTarget();
    return false;
  }

  const currentUrl = getSafeRedirectUrl(
    currentHref ?? `${window.location.pathname}${window.location.search}`,
  );
  const storedUrl = getSafeRedirectUrl(stored.target);
  const isExpired = Date.now() - stored.createdAt > CREATE_POST_AUTH_RETURN_MAX_AGE_MS;

  if (
    isExpired ||
    !currentUrl ||
    !storedUrl ||
    !isCreateCommunityPostRedirect(`${currentUrl.pathname}${currentUrl.search}`) ||
    currentUrl.pathname !== storedUrl.pathname
  ) {
    clearCreatePostAuthReturnTarget();
    return false;
  }

  clearCreatePostAuthReturnTarget();
  return true;
};

export const replaceCreatePostAuthReturnWithHome = (router: ReplaceRouter) => {
  if (!consumeCreatePostAuthReturnHomeOverride()) return false;

  router.replace(CREATE_POST_AUTH_RETURN_HOME_HREF);
  return true;
};
