"use client";

import { ArrowRight, Sparkles, UserPlus } from "lucide-react";
import { usePathname } from "next/navigation";
import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { getToken } from "@/hooks/cookies/token";
import { useAppSelector } from "@/hooks/redux";
import { Button } from "@/registry/new-york-v4/ui/button";

export type ConversionTrigger =
  | "trigger_tempo"
  | "trigger_psicologos"
  | "trigger_comunidade"
  | "trigger_scroll"
  | "trigger_favorito"
  | "trigger_salvar"
  | "trigger_comentar"
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
    | "open_whatsapp"
    | "reply_comment"
    | "save_post"
    | "save_reply";
};

type ConversionPromptState = {
  intent?: ConversionIntent;
  trigger: ConversionTrigger;
};

type RequestConversionOptions = {
  intent?: Omit<ConversionIntent, "createdAt" | "returnTo" | "trigger"> &
    Partial<Pick<ConversionIntent, "returnTo">>;
};

type ProgressiveConversionContextValue = {
  consumePendingIntent: (
    predicate?: (intent: ConversionIntent) => boolean,
  ) => ConversionIntent | null;
  isAuthenticated: boolean;
  requestConversion: (trigger: ConversionTrigger, options?: RequestConversionOptions) => boolean;
  requestWhatsAppAccess: (whatsappUrl: string, returnTo?: string) => boolean;
};

type ProgressiveConversionProviderProps = PropsWithChildren<{
  isAuthenticated: boolean;
  pathname: string;
}>;

const SESSION_SHOWN_KEY = "modal_exibida_na_sessao";
const ANALYTICS_KEY = "lectum.conversion.analytics";
const NAVIGATION_SECONDS_KEY = "lectum.conversion.navigation_seconds";
const OPENED_POSTS_KEY = "lectum.conversion.opened_posts";
const PENDING_INTENT_KEY = "lectum.conversion.pending_intent";
const PROFILE_IDS_KEY = "lectum.conversion.psychologist_profiles";
const WHATSAPP_CLICK_COUNT_KEY = "lectum.conversion.whatsapp_click_count";

const MODAL_TITLE_ID = "lectum-conversion-modal-title";
const MODAL_DESCRIPTION_ID = "lectum-conversion-modal-description";

const sessionStorageSafe = () => {
  if (typeof window === "undefined") return null;

  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
};

const getCurrentReturnTo = () => {
  if (typeof window === "undefined") return "/app/psychologists";

  return `${window.location.pathname}${window.location.search}${window.location.hash}`;
};

const readJson = <T,>(key: string, fallback: T): T => {
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

const writeJson = (key: string, value: unknown) => {
  const storage = sessionStorageSafe();
  if (!storage) return;

  storage.setItem(key, JSON.stringify(value));
};

const readNumber = (key: string) => {
  const storage = sessionStorageSafe();
  if (!storage) return 0;

  return Number(storage.getItem(key) ?? "0") || 0;
};

const writeNumber = (key: string, value: number) => {
  const storage = sessionStorageSafe();
  if (!storage) return;

  storage.setItem(key, String(value));
};

const hasPromptBeenShown = () => {
  const storage = sessionStorageSafe();

  return storage?.getItem(SESSION_SHOWN_KEY) === "true";
};

const markPromptAsShown = () => {
  const storage = sessionStorageSafe();
  if (!storage) return;

  storage.setItem(SESSION_SHOWN_KEY, "true");
};

const savePendingIntent = (intent?: ConversionIntent) => {
  if (!intent) return;

  writeJson(PENDING_INTENT_KEY, intent);
};

const readPendingIntent = () => readJson<ConversionIntent | null>(PENDING_INTENT_KEY, null);

const clearPendingIntent = () => {
  const storage = sessionStorageSafe();
  if (!storage) return;

  storage.removeItem(PENDING_INTENT_KEY);
};

const recordConversionAnalytics = (trigger: ConversionTrigger, pathname: string) => {
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

const addToSessionSet = (key: string, value: string) => {
  const items = readJson<string[]>(key, []);
  const nextItems = [...new Set([...items, value])];

  writeJson(key, nextItems);

  return nextItems.length;
};

const normalizePath = (pathname: string) => {
  if (pathname.length <= 1) return pathname;

  return pathname.replace(/\/+$/, "");
};

const getPathSegments = (pathname: string) => normalizePath(pathname).split("/").filter(Boolean);

const isAppPath = (pathname: string) => normalizePath(pathname).startsWith("/app");

const isPsychologistProfilePath = (pathname: string) => {
  const segments = getPathSegments(pathname);

  return segments.length === 3 && segments[0] === "app" && segments[1] === "psychologist";
};

const isCommunityPostPath = (pathname: string) => {
  const segments = getPathSegments(pathname);

  return (
    segments.length >= 5 &&
    segments[0] === "app" &&
    segments[1] === "community" &&
    segments[3] === "post"
  );
};

const isCommunityDetailPath = (pathname: string) => {
  const segments = getPathSegments(pathname);
  const reservedSegments = new Set(["feed", "post", "suggest", "top-mentors"]);

  return (
    segments.length === 3 &&
    segments[0] === "app" &&
    segments[1] === "community" &&
    !reservedSegments.has(segments[2])
  );
};

const noopContext: ProgressiveConversionContextValue = {
  consumePendingIntent: () => null,
  isAuthenticated: true,
  requestConversion: () => true,
  requestWhatsAppAccess: () => true,
};

const ProgressiveConversionContext = createContext<ProgressiveConversionContextValue>(noopContext);

export const ProgressiveConversionProvider = ({
  children,
  isAuthenticated,
  pathname,
}: ProgressiveConversionProviderProps) => {
  const [prompt, setPrompt] = useState<ConversionPromptState | null>(null);
  const pathnameRef = useRef(pathname);

  useEffect(() => {
    pathnameRef.current = pathname;
  }, [pathname]);

  const openPrompt = useCallback((trigger: ConversionTrigger, intent?: ConversionIntent) => {
    recordConversionAnalytics(trigger, pathnameRef.current);

    if (hasPromptBeenShown()) return false;

    savePendingIntent(intent);
    markPromptAsShown();
    setPrompt({
      intent,
      trigger,
    });

    return false;
  }, []);

  const requestConversion = useCallback(
    (trigger: ConversionTrigger, options?: RequestConversionOptions) => {
      if (isAuthenticated) return true;

      const intent = options?.intent
        ? {
            ...options.intent,
            createdAt: new Date().toISOString(),
            returnTo: options.intent.returnTo ?? getCurrentReturnTo(),
            trigger,
          }
        : undefined;

      return openPrompt(trigger, intent);
    },
    [isAuthenticated, openPrompt],
  );

  const requestWhatsAppAccess = useCallback(
    (whatsappUrl: string, returnTo?: string) => {
      if (isAuthenticated) return true;
      if (!whatsappUrl) return false;

      const nextCount = readNumber(WHATSAPP_CLICK_COUNT_KEY) + 1;
      writeNumber(WHATSAPP_CLICK_COUNT_KEY, nextCount);

      if (nextCount < 2 || hasPromptBeenShown()) return true;

      return requestConversion("trigger_whatsapp", {
        intent: {
          payload: {
            whatsappUrl,
          },
          returnTo: returnTo ?? getCurrentReturnTo(),
          type: "open_whatsapp",
        },
      });
    },
    [isAuthenticated, requestConversion],
  );

  const consumePendingIntent = useCallback((predicate?: (intent: ConversionIntent) => boolean) => {
    const intent = readPendingIntent();

    if (!intent) return null;
    if (predicate && !predicate(intent)) return null;

    clearPendingIntent();

    return intent;
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;

    const intent = readPendingIntent();
    if (intent?.type !== "open_whatsapp") return;

    clearPendingIntent();

    const whatsappUrl = String(intent.payload?.whatsappUrl ?? "");
    if (!whatsappUrl) return;

    window.setTimeout(() => {
      window.location.assign(whatsappUrl);
    }, 250);
  }, [isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated || hasPromptBeenShown() || !isAppPath(pathname)) return;

    let previousTick = Date.now();
    const interval = window.setInterval(() => {
      if (document.visibilityState !== "visible") {
        previousTick = Date.now();

        return;
      }

      const now = Date.now();
      const elapsedSeconds = Math.max(0, (now - previousTick) / 1000);
      previousTick = now;

      const nextSeconds = readNumber(NAVIGATION_SECONDS_KEY) + elapsedSeconds;
      writeNumber(NAVIGATION_SECONDS_KEY, nextSeconds);

      if (nextSeconds >= 90) {
        window.clearInterval(interval);
        openPrompt("trigger_tempo");
      }
    }, 1000);

    return () => {
      window.clearInterval(interval);
    };
  }, [isAuthenticated, openPrompt, pathname]);

  useEffect(() => {
    if (isAuthenticated || hasPromptBeenShown()) return;

    if (isPsychologistProfilePath(pathname)) {
      const psychologistId = getPathSegments(pathname)[2];
      const count = addToSessionSet(PROFILE_IDS_KEY, psychologistId);

      if (count >= 3) {
        window.setTimeout(() => openPrompt("trigger_psicologos"), 0);
      }
    }

    if (isCommunityPostPath(pathname)) {
      const segments = getPathSegments(pathname);
      const postKey = `${segments[2]}:${segments[4]}`;
      const count = addToSessionSet(OPENED_POSTS_KEY, postKey);

      if (count >= 3) {
        window.setTimeout(() => openPrompt("trigger_comunidade"), 0);
      }
    }
  }, [isAuthenticated, openPrompt, pathname]);

  useEffect(() => {
    if (isAuthenticated || hasPromptBeenShown() || !isCommunityDetailPath(pathname)) return;

    const timeout = window.setTimeout(() => {
      openPrompt("trigger_comunidade");
    }, 60_000);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [isAuthenticated, openPrompt, pathname]);

  useEffect(() => {
    if (
      isAuthenticated ||
      hasPromptBeenShown() ||
      (!isCommunityDetailPath(pathname) && !isCommunityPostPath(pathname))
    ) {
      return;
    }

    const onScroll = () => {
      if (hasPromptBeenShown()) return;

      const scrollableHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (scrollableHeight <= 0) return;

      const progress =
        (window.scrollY + window.innerHeight) / document.documentElement.scrollHeight;

      if (progress >= 0.75) {
        window.removeEventListener("scroll", onScroll);
        openPrompt("trigger_scroll");
      }
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    window.setTimeout(onScroll, 250);

    return () => {
      window.removeEventListener("scroll", onScroll);
    };
  }, [isAuthenticated, openPrompt, pathname]);

  const closePrompt = () => {
    setPrompt(null);
  };

  const startSignup = () => {
    const returnTo = prompt?.intent?.returnTo ?? getCurrentReturnTo();
    window.location.href = `/auth/profile-selection?redirectTo=${encodeURIComponent(returnTo)}`;
  };

  const value = useMemo(
    () => ({
      consumePendingIntent,
      isAuthenticated,
      requestConversion,
      requestWhatsAppAccess,
    }),
    [consumePendingIntent, isAuthenticated, requestConversion, requestWhatsAppAccess],
  );

  return (
    <ProgressiveConversionContext.Provider value={value}>
      {children}
      {prompt ? (
        <div
          aria-describedby={MODAL_DESCRIPTION_ID}
          aria-labelledby={MODAL_TITLE_ID}
          aria-modal="true"
          className="fixed inset-0 z-[9999] flex min-h-dvh items-center justify-center bg-slate-950/35 px-4 py-6 text-foreground backdrop-blur-[6px] sm:px-6"
          role="dialog"
        >
          <div className="w-full max-w-[430px] rounded-[32px] border border-white/80 bg-white/95 p-5 text-center shadow-[0_28px_80px_rgba(15,23,42,0.22)] ring-1 ring-slate-900/[0.03] supports-[backdrop-filter]:bg-white/90 dark:border-white/10 dark:bg-surface/95 dark:shadow-[0_28px_80px_rgba(0,0,0,0.42)] sm:p-6">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-[22px] bg-primary-soft text-primary shadow-[0_14px_34px_rgba(48,140,232,0.18)]">
              <UserPlus className="h-7 w-7" aria-hidden="true" />
            </div>

            <p className="mt-5 inline-flex items-center justify-center gap-1.5 rounded-full border border-primary/10 bg-primary-soft/70 px-3 py-1 text-[0.68rem] font-black uppercase tracking-[0.16em] text-primary">
              <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
              Gratuito
            </p>

            <h2
              className="mt-3 text-2xl font-black tracking-[-0.045em] text-foreground sm:text-[1.7rem]"
              id={MODAL_TITLE_ID}
            >
              Crie sua conta gratuita
            </h2>
            <p
              className="mx-auto mt-3 max-w-[340px] text-sm leading-6 text-muted sm:text-[0.96rem]"
              id={MODAL_DESCRIPTION_ID}
            >
              Publique gratuitamente nas comunidades da Lectum e receba respostas de psicólogos
              verificados.
            </p>

            <div className="mt-6 grid gap-3">
              <Button
                className="h-12 rounded-2xl text-[0.95rem] font-black shadow-[0_18px_34px_rgba(48,140,232,0.22)]"
                onClick={startSignup}
                type="button"
              >
                Criar conta grátis
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Button>
              <Button
                className="h-11 rounded-2xl border-border/80 bg-white/80 text-muted hover:bg-primary-soft/60 hover:text-foreground dark:bg-surface/70"
                onClick={closePrompt}
                type="button"
                variant="outline"
              >
                Continuar explorando
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </ProgressiveConversionContext.Provider>
  );
};

export const useProgressiveConversion = () => useContext(ProgressiveConversionContext);

const subscribeAuthToken = (onStoreChange: () => void) => {
  if (typeof window === "undefined") return () => undefined;

  const interval = window.setInterval(onStoreChange, 1000);
  window.addEventListener("focus", onStoreChange);
  window.addEventListener("storage", onStoreChange);

  return () => {
    window.clearInterval(interval);
    window.removeEventListener("focus", onStoreChange);
    window.removeEventListener("storage", onStoreChange);
  };
};

const getAuthTokenSnapshot = () => {
  if (typeof window === "undefined") return false;

  return Boolean(getToken());
};

export const ProgressiveConversionBoundary = ({ children }: PropsWithChildren) => {
  const pathname = usePathname();
  const sessionUser = useAppSelector((state) => state.user);
  const hasToken = useSyncExternalStore(subscribeAuthToken, getAuthTokenSnapshot, () => false);
  const isAuthenticated = Boolean(sessionUser?.id) || hasToken;

  return (
    <ProgressiveConversionProvider isAuthenticated={isAuthenticated} pathname={pathname}>
      {children}
    </ProgressiveConversionProvider>
  );
};
