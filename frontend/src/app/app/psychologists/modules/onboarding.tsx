"use client";

import { X } from "lucide-react";
import { type CSSProperties, useLayoutEffect, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

export type NavigatorWithStandalone = Navigator & { standalone?: boolean };

export const PAGE_LIMIT = 20;

export const DEFAULT_NAV_BAR_HEIGHT = 72;

export const PSYCHOLOGISTS_BACKGROUND_VIDEO_SELECTOR =
  "video[data-psychologists-background='true']";

export const VIDEO_SINGLE_TAP_DELAY_MS = 260;

export const VIDEO_ANALYTICS_HEARTBEAT_MS = 5000;

export const FILTER_DIALOG_CLOSE_DELAY_MS = 300;

export const PRESENTATION_VIDEO_RETENTION_BUCKETS = Array.from(
  { length: 20 },
  (_, index) => (index + 1) * 5,
);

export const isPsychologistsScrollLockTarget = (target: EventTarget | null) => {
  const element =
    target instanceof Element ? target : target instanceof Node ? target.parentElement : null;

  return Boolean(
    element?.closest(
      "[data-psychologists-scroll-lock='true'], [data-lectum-video-player-controls='true']",
    ),
  );
};

export const VIDEO_LONG_PRESS_DELAY_MS = 520;

export const MOBILE_BOTTOM_NAV_OFFSET = "var(--lectum-mobile-bottom-nav-height)";

export const VIDEO_PROGRESS_BOTTOM_WITH_NAV =
  "calc(var(--lectum-mobile-bottom-nav-height) + 0.625rem)";

export const VIDEO_PROGRESS_TRACK_COLOR =
  "color-mix(in srgb, var(--lectum-media-foreground) 34%, transparent)";

export const VIDEO_PROGRESS_FILL_COLOR =
  "color-mix(in srgb, var(--lectum-media-foreground) 96%, transparent)";

export const DEFAULT_VIDEO_PLAYBACK_RATE = 1;

export type PsychologistsOnboardingTip = "mySearch" | "whatsapp";

type CoachMarkPosition = {
  arrowClassName: string;
  arrowLeft: number;
  bubbleStyle: CSSProperties;
  ringStyle: CSSProperties;
};

const PSYCHOLOGISTS_ONBOARDING_TARGET: Record<PsychologistsOnboardingTip, string> = {
  mySearch: "my-search",
  whatsapp: "whatsapp",
};

const PSYCHOLOGISTS_ONBOARDING_COPY: Record<
  PsychologistsOnboardingTip,
  { description: string; emphasis: string; title: string }
> = {
  mySearch: {
    description:
      "Toque em Minha Busca para ajustar filtros e encontrar psicólogos mais alinhados ao que você procura.",
    emphasis: "Minha Busca",
    title: "Refine sua busca",
  },
  whatsapp: {
    description:
      "Gostou de um perfil? Toque em Chamar no WhatsApp para iniciar a conversa e combinar os próximos passos.",
    emphasis: "Chamar no WhatsApp",
    title: "Fale direto com o psicólogo",
  },
};

export const clampNumber = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

const isVisibleCoachTarget = (element: HTMLElement) => {
  const rect = element.getBoundingClientRect();

  if (rect.width <= 0 || rect.height <= 0) return false;
  if (rect.bottom < 0 || rect.top > window.innerHeight) return false;
  if (rect.right < 0 || rect.left > window.innerWidth) return false;

  let current: HTMLElement | null = element;

  while (current) {
    const styles = window.getComputedStyle(current);

    if (styles.display === "none" || styles.visibility === "hidden") return false;
    if (Number(styles.opacity) === 0) return false;
    if (current === element && styles.pointerEvents === "none") return false;

    current = current.parentElement;
  }

  return true;
};

const findCoachTarget = (tip: PsychologistsOnboardingTip) => {
  if (typeof document === "undefined") return null;

  const targetName = PSYCHOLOGISTS_ONBOARDING_TARGET[tip];
  const candidates = Array.from(
    document.querySelectorAll<HTMLElement>(`[data-psychologists-tip-target="${targetName}"]`),
  );

  return candidates.find(isVisibleCoachTarget) ?? null;
};

const getCoachMarkPosition = (
  tip: PsychologistsOnboardingTip,
  target: HTMLElement,
): CoachMarkPosition => {
  const rect = target.getBoundingClientRect();
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const bubbleWidth = Math.min(320, Math.max(280, viewportWidth - 32));
  const estimatedBubbleHeight = tip === "mySearch" ? 118 : 128;
  const preferredTop =
    tip === "mySearch" ? rect.bottom + 14 : rect.top - estimatedBubbleHeight - 14;
  let top = preferredTop;

  if (top < 16) {
    top = rect.bottom + 14;
  }

  if (top + estimatedBubbleHeight > viewportHeight - 16) {
    top = Math.max(16, rect.top - estimatedBubbleHeight - 14);
  }

  const left = clampNumber(
    rect.left + rect.width / 2 - bubbleWidth / 2,
    16,
    Math.max(16, viewportWidth - bubbleWidth - 16),
  );
  const arrowLeft = clampNumber(rect.left + rect.width / 2 - left - 7, 24, bubbleWidth - 30);
  const isBelowTarget = top >= rect.bottom;

  return {
    arrowClassName: isBelowTarget ? "-top-1.5 border-t border-l" : "-bottom-1.5 border-r border-b",
    arrowLeft,
    bubbleStyle: {
      left,
      top,
      width: bubbleWidth,
    },
    ringStyle: {
      borderRadius: "9999px",
      height: rect.height + 16,
      left: rect.left - 8,
      top: rect.top - 8,
      width: rect.width + 16,
    },
  };
};

export const PsychologistsCoachMark = ({
  onDismiss,
  tip,
}: {
  onDismiss: () => void;
  tip: PsychologistsOnboardingTip;
}) => {
  const [position, setPosition] = useState<CoachMarkPosition | null>(null);
  const copy = PSYCHOLOGISTS_ONBOARDING_COPY[tip];

  useLayoutEffect(() => {
    if (typeof window === "undefined") return;

    let timeout: number | null = null;

    const updatePosition = () => {
      const target = findCoachTarget(tip);

      setPosition(target ? getCoachMarkPosition(tip, target) : null);
    };

    updatePosition();
    timeout = window.setTimeout(updatePosition, 120);

    window.addEventListener("resize", updatePosition);
    document.addEventListener("scroll", updatePosition, true);

    return () => {
      if (timeout) {
        window.clearTimeout(timeout);
      }

      window.removeEventListener("resize", updatePosition);
      document.removeEventListener("scroll", updatePosition, true);
    };
  }, [tip]);

  if (!position || typeof document === "undefined") return null;

  const [beforeEmphasis, afterEmphasis] = copy.description.split(copy.emphasis);

  return createPortal(
    <div className="pointer-events-none fixed inset-0 z-[135]" data-psychologists-coach-mark>
      <span
        aria-hidden="true"
        className="fixed border-2 border-primary/70 shadow-lectum-soft ring-4 ring-primary/25 ring-offset-2 ring-offset-background/80 motion-safe:animate-pulse"
        style={position.ringStyle}
      />

      <section
        aria-live="polite"
        className="pointer-events-auto fixed rounded-[24px] border border-border bg-surface p-4 pr-11 text-left text-foreground shadow-lectum-soft ring-1 ring-primary/10"
        style={position.bubbleStyle}
      >
        <span
          aria-hidden="true"
          className={cn(
            "absolute h-3.5 w-3.5 rotate-45 border-border bg-surface",
            position.arrowClassName,
          )}
          style={{ left: position.arrowLeft }}
        />
        <button
          aria-label="Fechar dica"
          className="absolute top-3 right-3 grid h-7 w-7 place-items-center rounded-full text-subtle transition hover:bg-surface-muted hover:text-foreground focus:outline-none focus:ring-4 focus:ring-primary/15"
          onClick={onDismiss}
          type="button"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
        <div className="grid gap-1.5">
          <h2 className="font-extrabold text-[0.98rem] leading-tight">{copy.title}</h2>
          <p className="text-sm leading-5 text-muted">
            {beforeEmphasis}
            <strong className="font-extrabold text-foreground">{copy.emphasis}</strong>
            {afterEmphasis}
          </p>
        </div>
      </section>
    </div>,
    document.body,
  );
};

export const LONG_PRESS_MOVE_TOLERANCE_PX = 20;

export const LONG_PRESS_SCROLL_INTENT_THRESHOLD_PX = 32;

export const LONG_PRESS_SIGNIFICANT_DRAG_THRESHOLD_PX = 44;

export const LONG_PRESS_VERTICAL_DOMINANCE_RATIO = 1.15;
