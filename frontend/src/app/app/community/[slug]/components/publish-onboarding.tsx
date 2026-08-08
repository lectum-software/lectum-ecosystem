"use client";

import { Plus } from "lucide-react";
import Link from "next/link";
import {
  type MouseEvent as ReactMouseEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { useAccount } from "@/api/callers/account";
import { useAppSelector } from "@/hooks/redux";
import { cn } from "@/lib/utils";

export type CommunityPublishOnboardingVariant = "floating" | "bottomNavigation";

export const COMMUNITY_PUBLISH_ONBOARDING_PLACEMENT: Record<
  CommunityPublishOnboardingVariant,
  { highlight: string; tooltip: string }
> = {
  bottomNavigation: {
    highlight:
      "left-1/2 bottom-5 -translate-x-1/2 lg:left-auto lg:right-10 lg:bottom-10 lg:translate-x-0 xl:right-20 2xl:right-28",
    tooltip:
      "left-1/2 bottom-[calc(1.25rem+5.5rem)] -translate-x-1/2 lg:left-auto lg:right-10 lg:bottom-[calc(2.5rem+5.75rem)] lg:translate-x-0 xl:right-20 2xl:right-28",
  },
  floating: {
    highlight:
      "right-5 bottom-[var(--lectum-mobile-nav-aware-fab-bottom)] sm:bottom-[var(--lectum-mobile-nav-aware-fab-bottom-sm)] lg:right-10 lg:bottom-10 xl:right-20 2xl:right-28",
    tooltip:
      "right-4 bottom-[calc(var(--lectum-mobile-nav-aware-fab-bottom)+5.25rem)] sm:bottom-[calc(var(--lectum-mobile-nav-aware-fab-bottom-sm)+5.25rem)] lg:right-10 lg:bottom-[calc(2.5rem+5.75rem)] xl:right-20 2xl:right-28",
  },
};

export const COMMUNITY_FLOATING_CREATE_POST_CLASSNAME =
  "group fixed right-5 bottom-[var(--lectum-mobile-nav-aware-fab-bottom)] z-40 grid h-14 w-14 place-items-center rounded-full border-[5px] border-media-foreground bg-primary text-primary-foreground shadow-lectum-soft transition-[bottom,transform,background-color,box-shadow] duration-200 ease-out hover:-translate-y-1 hover:bg-primary-hover hover:shadow-lectum-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background motion-safe:animate-[lectum-desktop-create-float_4.2s_ease-in-out_infinite] sm:bottom-[var(--lectum-mobile-nav-aware-fab-bottom-sm)] lg:right-10 lg:bottom-10 lg:h-16 lg:w-16 xl:right-20 2xl:right-28";

export const CommunityPublishOnboarding = ({
  createPostHref,
  onCreatePostClick,
  variant,
}: {
  createPostHref: string;
  onCreatePostClick?: (event: ReactMouseEvent<HTMLAnchorElement>, href: string) => void;
  variant: CommunityPublishOnboardingVariant;
}) => {
  const currentUser = useAppSelector((state) => state.user);
  const isPsychologistUser = currentUser?.role === "psicologo";
  const accountTips = useAccount({
    enableSecurity: false,
    enableTips: !isPsychologistUser,
  });
  const accountTipsUserId = accountTips.userId;
  const copy = isPsychologistUser
    ? {
        description:
          "Depois de responder dúvidas, publicar conteúdos originais sobre temas frequentes fortalece sua autoridade e ajuda pacientes a se identificarem com sua abordagem.",
        title: "Crie conteúdos que aproximam pacientes",
      }
    : {
        description:
          "Toque no botão + para conversar gratuitamente na comunidade e receber acolhimento dos psicólogos mediadores.",
        title: "Publique sua dúvida ou relato",
      };
  const [hasLoadedPreference, setHasLoadedPreference] = useState(false);
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState(true);
  const [isVisible, setIsVisible] = useState(false);
  const hasSyncedPreferenceRef = useRef(false);
  const hasPersistedSeenRef = useRef(false);
  const placement = COMMUNITY_PUBLISH_ONBOARDING_PLACEMENT[variant];

  const persistSeen = useCallback(() => {
    if (isPsychologistUser) return;

    const hasSeenCurrentTip = accountTips.onboardingTips.data?.has_seen_community_post_tip;

    if (
      hasPersistedSeenRef.current ||
      hasSeenCurrentTip ||
      accountTips.updateOnboardingTips.isPending
    ) {
      return;
    }

    hasPersistedSeenRef.current = true;
    accountTips.updateOnboardingTips.mutate(
      {
        has_seen_community_post_tip: true,
      },
      {
        onError: () => {
          hasPersistedSeenRef.current = false;
        },
      },
    );
  }, [
    accountTips.onboardingTips.data?.has_seen_community_post_tip,
    accountTips.updateOnboardingTips,
    isPsychologistUser,
  ]);

  const dismiss = useCallback(() => {
    persistSeen();
    setHasSeenOnboarding(true);
    setIsVisible(false);
  }, [persistSeen]);

  const activateCreatePost = useCallback(
    (event: ReactMouseEvent<HTMLAnchorElement>) => {
      persistSeen();
      setHasSeenOnboarding(true);
      setIsVisible(false);
      onCreatePostClick?.(event, createPostHref);
    },
    [createPostHref, onCreatePostClick, persistSeen],
  );

  useEffect(() => {
    if (!accountTipsUserId || typeof document === "undefined") return;

    const expectedHref = new URL(createPostHref, window.location.origin);
    const expectedPath = expectedHref.pathname + expectedHref.search + expectedHref.hash;

    const handleCreatePostAnchorClick = (event: globalThis.MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;

      const anchor = target.closest<HTMLAnchorElement>("a[href]");
      if (!anchor) return;

      const anchorHref = new URL(anchor.href, window.location.origin);
      const anchorPath = anchorHref.pathname + anchorHref.search + anchorHref.hash;
      if (anchorPath !== expectedPath) return;

      persistSeen();
      setHasSeenOnboarding(true);
      setIsVisible(false);
    };

    document.addEventListener("click", handleCreatePostAnchorClick, true);

    return () => document.removeEventListener("click", handleCreatePostAnchorClick, true);
  }, [accountTipsUserId, createPostHref, persistSeen]);

  useEffect(() => {
    hasSyncedPreferenceRef.current = false;
    hasPersistedSeenRef.current = false;

    const frame = window.requestAnimationFrame(() => {
      setHasLoadedPreference(false);
      setHasSeenOnboarding(true);
      setIsVisible(false);
    });

    if (!accountTipsUserId) {
      return () => window.cancelAnimationFrame(frame);
    }

    return () => window.cancelAnimationFrame(frame);
  }, [accountTipsUserId]);

  useEffect(() => {
    if (isPsychologistUser) return;
    if (hasSyncedPreferenceRef.current) return;
    if (accountTips.onboardingTips.isPending) return;

    hasSyncedPreferenceRef.current = true;

    const frame = window.requestAnimationFrame(() => {
      if (!accountTips.onboardingTips.isSuccess) {
        setHasSeenOnboarding(true);
        setHasLoadedPreference(true);
        return;
      }
      const tips = accountTips.onboardingTips.data;
      const hasSeenCurrentTip = tips.has_seen_community_post_tip;

      setHasSeenOnboarding(Boolean(hasSeenCurrentTip));
      setHasLoadedPreference(true);
    });

    return () => window.cancelAnimationFrame(frame);
  }, [
    accountTips.onboardingTips.data,
    accountTips.onboardingTips.isPending,
    accountTips.onboardingTips.isSuccess,
    isPsychologistUser,
  ]);

  useEffect(() => {
    if (!hasLoadedPreference || hasSeenOnboarding) return;

    const timeout = window.setTimeout(() => {
      setIsVisible(true);
      persistSeen();
    }, 450);

    return () => window.clearTimeout(timeout);
  }, [hasLoadedPreference, hasSeenOnboarding, persistSeen]);

  useEffect(() => {
    if (!isVisible) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        dismiss();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [dismiss, isVisible]);

  if (isPsychologistUser || !isVisible) return null;

  return (
    <div
      className="fixed inset-0 z-[120] animate-in fade-in duration-200"
      data-community-publish-onboarding
    >
      <button
        aria-label="Fechar orientação para publicar na comunidade"
        className="absolute inset-0 h-full w-full cursor-default bg-media-background/48 backdrop-blur-[2px]"
        onClick={dismiss}
        tabIndex={-1}
        type="button"
      />

      <Link
        aria-label="Criar publicação agora"
        className={cn(
          "fixed z-[125] grid h-16 w-16 place-items-center focus:outline-none focus:ring-4 focus:ring-primary/25",
          placement.highlight,
        )}
        href={createPostHref}
        onClick={activateCreatePost}
        scroll={false}
      >
        <span className="absolute -inset-3 rounded-full border border-primary/25 motion-safe:animate-[lectum-community-publish-ring_1.8s_ease-out_infinite]" />
        <span className="absolute inset-0 rounded-full border-2 border-primary/35 motion-safe:animate-[lectum-community-publish-ring_1.8s_ease-out_0.18s_infinite]" />
        <span className="relative grid h-14 w-14 place-items-center rounded-full border-[5px] border-media-foreground bg-primary text-primary-foreground shadow-lectum-soft motion-safe:animate-[lectum-community-publish-pulse_1.8s_ease-in-out_infinite] lg:h-16 lg:w-16">
          <Plus className="h-7 w-7 stroke-[2.4] lg:h-8 lg:w-8" aria-hidden="true" />
        </span>
      </Link>

      <section
        aria-labelledby="community-publish-onboarding-title"
        aria-modal="true"
        className={cn(
          "fixed z-[126] w-[calc(100vw-2rem)] max-w-[342px] rounded-[26px] border border-media-foreground/70 bg-surface p-5 text-left shadow-lectum-soft ring-1 ring-border/80",
          placement.tooltip,
        )}
        role="dialog"
      >
        <div className="grid gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-2xl bg-primary-soft text-primary">
            <Plus className="h-6 w-6 stroke-[2.3]" aria-hidden="true" />
          </div>
          <div className="grid gap-2">
            <h2
              className="font-extrabold text-[1.05rem] text-foreground leading-tight"
              id="community-publish-onboarding-title"
            >
              {copy.title}
            </h2>
            <p className="text-sm text-subtle leading-relaxed">{copy.description}</p>
          </div>
        </div>
      </section>

      <style>{`
        @keyframes lectum-community-publish-pulse {
          0%,
          100% {
            transform: scale(1);
            box-shadow: 0 20px 42px
              color-mix(in srgb, var(--lectum-primary) 42%, transparent);
          }
          50% {
            transform: scale(1.06);
            box-shadow: 0 26px 56px
              color-mix(in srgb, var(--lectum-primary) 56%, transparent);
          }
        }

        @keyframes lectum-community-publish-ring {
          0% {
            opacity: 0.72;
            transform: scale(0.86);
          }
          100% {
            opacity: 0;
            transform: scale(1.42);
          }
        }
      `}</style>
    </div>
  );
};
