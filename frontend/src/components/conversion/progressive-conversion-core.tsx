"use client";

import {
  ArrowRight,
  ArrowUp,
  Bookmark,
  Heart,
  LogIn,
  MessageCircle,
  Sparkles,
  UserPlus,
} from "lucide-react";
import { useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/registry/new-york-v4/ui/button";
import { normalizeTrustedWhatsAppUrl } from "@/utils/external-url";

import {
  addToSessionSet,
  type ConversionIntent,
  type ConversionPromptState,
  type ConversionTrigger,
  clearPendingIntent,
  getCurrentReturnTo,
  getPathSegments,
  hasPromptBeenShown,
  isActionPromptType,
  isCommunityDetailPath,
  isCommunityPostPath,
  isConversionPromptSuppressedPath,
  isPsychologistProfilePath,
  isPublicDiscoveryPath,
  isPublicPsychologistsPath,
  MODAL_DESCRIPTION_ID,
  MODAL_TITLE_ID,
  markPromptAsShown,
  NAVIGATION_SECONDS_KEY,
  OPENED_POSTS_KEY,
  PROFILE_IDS_KEY,
  ProgressiveConversionContext,
  type ProgressiveConversionProviderProps,
  type RequestConversionOptions,
  readNumber,
  readPendingIntent,
  recordConversionAnalytics,
  savePendingIntent,
  WHATSAPP_CLICK_COUNT_KEY,
  writeNumber,
} from "./progressive-conversion-state";

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
    if (isConversionPromptSuppressedPath(pathnameRef.current)) return false;

    recordConversionAnalytics(trigger, pathnameRef.current);

    const shouldBypassSessionLimit = isActionPromptType(intent?.type);

    if (hasPromptBeenShown() && !shouldBypassSessionLimit) return false;

    const shouldStorePendingIntent = intent?.type !== "vote_post" && intent?.type !== "vote_reply";

    if (shouldStorePendingIntent) {
      savePendingIntent(intent);
    } else {
      clearPendingIntent();
    }
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
      const trustedUrl = normalizeTrustedWhatsAppUrl(whatsappUrl);
      if (!trustedUrl) return false;
      const nextCount = readNumber(WHATSAPP_CLICK_COUNT_KEY) + 1;
      writeNumber(WHATSAPP_CLICK_COUNT_KEY, nextCount);
      if (isPublicPsychologistsPath(pathnameRef.current)) return true;

      if (nextCount < 2 || hasPromptBeenShown()) return true;

      return requestConversion("trigger_whatsapp", {
        intent: {
          payload: {
            whatsappUrl: trustedUrl,
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

    const whatsappUrl = normalizeTrustedWhatsAppUrl(String(intent.payload?.whatsappUrl ?? ""));
    if (!whatsappUrl) return;

    window.setTimeout(() => {
      window.location.assign(whatsappUrl);
    }, 250);
  }, [isAuthenticated]);

  useEffect(() => {
    if (
      isAuthenticated ||
      hasPromptBeenShown() ||
      !isPublicDiscoveryPath(pathname) ||
      isConversionPromptSuppressedPath(pathname)
    ) {
      return;
    }

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
      const psychologistId = getPathSegments(pathname)[1];
      const count = addToSessionSet(PROFILE_IDS_KEY, psychologistId);

      if (count >= 3) {
        window.setTimeout(() => openPrompt("trigger_psicologos"), 0);
      }
    }

    if (isCommunityPostPath(pathname)) {
      const segments = getPathSegments(pathname);
      const postKey = `${segments[1]}:${segments[3]}`;
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

  const startLogin = () => {
    const returnTo = prompt?.intent?.returnTo ?? getCurrentReturnTo();
    window.location.href = `/auth/login?redirectTo=${encodeURIComponent(returnTo)}`;
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

  const actionPromptType = prompt?.intent?.type;
  const isActionPrompt = isActionPromptType(actionPromptType);
  const isCommentPrompt =
    actionPromptType === "comment_post" || actionPromptType === "reply_comment";
  const isSavePrompt = actionPromptType === "save_post" || actionPromptType === "save_reply";
  const isVotePrompt = actionPromptType === "vote_post" || actionPromptType === "vote_reply";
  const PromptIcon =
    actionPromptType === "favorite_psychologist"
      ? Heart
      : isCommentPrompt
        ? MessageCircle
        : isSavePrompt
          ? Bookmark
          : isVotePrompt
            ? ArrowUp
            : UserPlus;
  const promptBadge =
    actionPromptType === "favorite_psychologist"
      ? "Favorito"
      : isSavePrompt
        ? "Salvar"
        : isCommentPrompt
          ? "Comunidade"
          : isVotePrompt
            ? "Voto"
            : "Gratuito";
  const promptTitle =
    actionPromptType === "favorite_psychologist"
      ? "Entre para favoritar este psicólogo"
      : actionPromptType === "follow_community"
        ? "Entre para seguir esta comunidade"
        : actionPromptType === "create_post"
          ? "Crie sua conta para publicar"
          : actionPromptType === "save_post"
            ? "Entre para salvar este post"
            : actionPromptType === "save_reply"
              ? "Entre para salvar esta resposta"
              : actionPromptType === "comment_post"
                ? "Entre para comentar"
                : actionPromptType === "reply_comment"
                  ? "Entre para responder"
                  : isVotePrompt
                    ? "Entre para votar"
                    : "Crie sua conta gratuita";
  const promptDescription =
    actionPromptType === "favorite_psychologist"
      ? "Para salvar este psicólogo nos seus favoritos, crie uma conta gratuita ou faça login. Assim você pode voltar ao perfil quando quiser."
      : actionPromptType === "follow_community"
        ? "Crie uma conta gratuita ou faça login para seguir esta comunidade, acompanhar novos posts e participar das conversas da Lectum."
        : actionPromptType === "create_post"
          ? "Para criar um post, crie uma conta gratuita ou faça login. Você pode participar da comunidade da Lectum gratuitamente e acompanhar as respostas."
          : actionPromptType === "save_post"
            ? "Crie uma conta gratuita ou faça login para guardar este post e voltar à conversa quando quiser."
            : actionPromptType === "save_reply"
              ? "Crie uma conta gratuita ou faça login para guardar esta resposta e consultar depois."
              : actionPromptType === "comment_post"
                ? "Crie uma conta gratuita ou faça login para participar da conversa e acompanhar as respostas."
                : actionPromptType === "reply_comment"
                  ? "Crie uma conta gratuita ou faça login para responder e continuar a conversa com a comunidade."
                  : isVotePrompt
                    ? "Crie uma conta gratuita ou faça login para marcar conteúdos como úteis ou dar downvote. Isso mantém a votação segura e evita duplicidade."
                    : "Publique gratuitamente nas comunidades da Lectum e receba respostas de psicólogos verificados.";

  return (
    <ProgressiveConversionContext.Provider value={value}>
      {children}
      {prompt ? (
        <div
          aria-describedby={MODAL_DESCRIPTION_ID}
          aria-labelledby={MODAL_TITLE_ID}
          aria-modal="true"
          className="fixed inset-0 z-[9999] flex min-h-dvh items-center justify-center bg-media-background/35 px-4 py-6 text-foreground backdrop-blur-[6px] sm:px-6"
          role="dialog"
        >
          <div className="w-full max-w-[430px] rounded-[32px] border border-media-foreground/80 bg-surface/95 p-5 text-center shadow-lectum-soft ring-1 ring-foreground/[0.03] supports-[backdrop-filter]:bg-surface/90 dark:border-media-foreground/10 dark:bg-surface/95 dark:shadow-lectum-soft sm:p-6">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-[22px] bg-primary-soft text-primary shadow-lectum-soft">
              <PromptIcon className="h-7 w-7" aria-hidden="true" />
            </div>

            <p className="mt-5 inline-flex items-center justify-center gap-1.5 rounded-full border border-primary/10 bg-primary-soft/70 px-3 py-1 text-[0.68rem] font-black uppercase tracking-[0.16em] text-primary">
              <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
              {promptBadge}
            </p>

            <h2
              className="mt-3 text-2xl font-black tracking-[-0.045em] text-foreground sm:text-[1.7rem]"
              id={MODAL_TITLE_ID}
            >
              {promptTitle}
            </h2>
            <p
              className="mx-auto mt-3 max-w-[340px] text-sm leading-6 text-muted sm:text-[0.96rem]"
              id={MODAL_DESCRIPTION_ID}
            >
              {promptDescription}
            </p>

            <div className="mt-6 grid gap-3">
              <Button
                className="h-12 rounded-2xl text-[0.95rem] font-black shadow-lectum-soft"
                onClick={startSignup}
                type="button"
              >
                Criar conta
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Button>
              {isActionPrompt ? (
                <Button
                  className="h-11 rounded-2xl border-primary/20 bg-surface/80 text-primary hover:bg-primary-soft/60 hover:text-primary-hover dark:bg-surface/70"
                  onClick={startLogin}
                  type="button"
                  variant="outline"
                >
                  <LogIn className="h-4 w-4" aria-hidden="true" />
                  Fazer login
                </Button>
              ) : null}
              <Button
                className="h-11 rounded-2xl border-border/80 bg-surface/80 text-muted hover:bg-primary-soft/60 hover:text-foreground dark:bg-surface/70"
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

export type { ConversionIntent, ConversionTrigger } from "./progressive-conversion-state";
