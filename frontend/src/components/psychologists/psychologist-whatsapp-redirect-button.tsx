"use client";

import { ExternalLink, ShieldCheck } from "lucide-react";
import Image from "next/image";
import type { ButtonHTMLAttributes, MouseEvent, ReactNode } from "react";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useImportantActionTracking } from "@/api/callers/analytics";
import { useDirectoryPsychologistContactClick } from "@/api/callers/directory";
import type { DisplayMode, ImportantActionTrackingRequest } from "@/api/req/analytics";
import { getOrCreateAnalyticsIdentity } from "@/components/analytics/storage";
import { useProgressiveConversion } from "@/components/conversion/progressive-conversion-provider";
import { WhatsAppIcon } from "@/components/ui/whatsapp-icon";
import { cn } from "@/lib/utils";
import { Button } from "@/registry/new-york-v4/ui/button";
import { getCurrentAnalyticsPath, normalizeAnalyticsPath } from "@/utils/analytics-path";
import { formatCrpLabel } from "@/utils/crp";
import { normalizeTrustedWhatsAppUrl } from "@/utils/external-url";
import { isPublicMediaUrl, resolvePublicMediaUrl } from "@/utils/media";
import {
  getProfessionalShortDisplayName,
  normalizeProfessionalDisplayName,
} from "@/utils/professional-name";

export const WHATSAPP_REDIRECT_MIN_DELAY_MS = 900;
const TRACKING_WAIT_LIMIT_MS = 1400;
export const WHATSAPP_REDIRECT_FALLBACK_VISIBLE_DELAY_MS = 2300;

export type PsychologistWhatsAppIdentity = {
  id: string;
  name: string;
  avatar?: string | null;
  crp?: string | null;
  typeLabel?: string | null;
  whatsappName?: string | null;
  whatsappUrl?: string | null;
};

export type PsychologistWhatsAppTrackingContext = {
  pageKind?: string;
  path?: string;
  targetId?: string | null;
  targetType?: string | null;
};

type PsychologistWhatsAppRedirectButtonProps = Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "children" | "type"
> & {
  children: ReactNode;
  importantActionType?: ImportantActionTrackingRequest["action_type"];
  psychologist: PsychologistWhatsAppIdentity;
  stopPropagation?: boolean;
  trackingContext?: PsychologistWhatsAppTrackingContext;
};

type PsychologistWhatsAppButtonContentProps = {
  iconClassName?: string;
  label?: string;
  labelClassName?: string;
};

type PsychologistWhatsAppRedirectModalProps = {
  isOpen: boolean;
  manualFallbackVisible: boolean;
  onClose: () => void;
  onManualOpen: () => void;
  psychologist: PsychologistWhatsAppIdentity;
  redirectUrl?: string | null;
};

type NavigatorWithStandalone = Navigator & { standalone?: boolean };

const delay = (ms: number) => new Promise<null>((resolve) => window.setTimeout(resolve, ms, null));

const getDisplayMode = (): DisplayMode => {
  if (typeof window === "undefined") return "unknown";

  const navigatorWithStandalone = window.navigator as NavigatorWithStandalone;
  if (window.matchMedia("(display-mode: fullscreen)").matches) return "fullscreen";
  if (window.matchMedia("(display-mode: minimal-ui)").matches) return "minimal-ui";

  if (
    window.matchMedia("(display-mode: standalone)").matches ||
    navigatorWithStandalone.standalone === true
  ) {
    return "standalone";
  }

  if (window.matchMedia("(display-mode: browser)").matches) return "browser";

  return "unknown";
};

const preserveFallbackWhatsAppText = (fallbackUrl: string, trackedUrl?: string | null) => {
  const safeFallbackUrl = normalizeTrustedWhatsAppUrl(fallbackUrl);
  const safeTrackedUrl = normalizeTrustedWhatsAppUrl(trackedUrl);
  if (!safeFallbackUrl) return "";
  if (!safeTrackedUrl) return safeFallbackUrl;

  try {
    const fallback = new URL(safeFallbackUrl);
    const fallbackText = fallback.searchParams.get("text");

    if (!fallbackText) return safeTrackedUrl;

    const tracked = new URL(safeTrackedUrl);
    tracked.searchParams.set("text", fallbackText);

    return tracked.toString();
  } catch {
    return safeFallbackUrl;
  }
};

const getInitials = (name: string) => {
  const parts = name.split(/\s+/).filter(Boolean);

  if (parts.length === 0) return "L";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();

  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
};

const professionalLabel = (psychologist: PsychologistWhatsAppIdentity) => {
  const typeLabel = psychologist.typeLabel?.trim() || "Psicólogo(a)";

  return `${typeLabel} • ${formatCrpLabel(psychologist.crp)}`;
};

export const getPsychologistWhatsappDisplayName = (psychologist: PsychologistWhatsAppIdentity) =>
  psychologist.whatsappName?.trim() || getProfessionalShortDisplayName(psychologist.name);

export const openPsychologistWhatsApp = (url: string) => {
  const trustedUrl = normalizeTrustedWhatsAppUrl(url);
  if (trustedUrl) window.location.assign(trustedUrl);
};

export const PsychologistWhatsAppButtonContent = ({
  iconClassName,
  label = "Chamar no WhatsApp",
  labelClassName,
}: PsychologistWhatsAppButtonContentProps) => (
  <>
    <WhatsAppIcon className={cn("h-5 w-5 shrink-0", iconClassName)} aria-hidden="true" />
    <span
      className={cn("min-w-0 truncate whitespace-nowrap text-center leading-none", labelClassName)}
    >
      {label}
    </span>
  </>
);

export const PsychologistWhatsAppRedirectModal = ({
  isOpen,
  manualFallbackVisible,
  onClose,
  onManualOpen,
  psychologist,
  redirectUrl,
}: PsychologistWhatsAppRedirectModalProps) => {
  const displayName = normalizeProfessionalDisplayName(psychologist.name) || psychologist.name;
  const titleId = useId();
  const descriptionId = useId();
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const avatarSrc = useMemo(
    () => resolvePublicMediaUrl(psychologist.avatar ?? null),
    [psychologist.avatar],
  );

  useEffect(() => {
    if (!isOpen || typeof document === "undefined") return;

    const previousBodyOverflow = document.body.style.overflow;
    const previousDocumentOverflow = document.documentElement.style.overflow;

    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    dialogRef.current?.focus({ preventScroll: true });

    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousDocumentOverflow;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      aria-describedby={descriptionId}
      aria-labelledby={titleId}
      aria-modal="true"
      className="fixed inset-0 z-[9999] flex min-h-dvh items-center justify-center bg-foreground/45 px-4 py-6 text-foreground backdrop-blur-md dark:bg-background/75 sm:px-6"
      data-psychologists-scroll-lock="true"
      onClick={(event) => event.stopPropagation()}
      onKeyDown={(event) => event.stopPropagation()}
      onPointerDown={(event) => event.stopPropagation()}
      onTouchMove={(event) => event.stopPropagation()}
      onWheel={(event) => event.stopPropagation()}
      ref={dialogRef}
      role="dialog"
      tabIndex={-1}
    >
      <div className="w-full max-w-[420px] rounded-[30px] border border-border/90 bg-surface p-5 text-center shadow-[var(--lectum-shadow-soft)] sm:p-6">
        <div className="mx-auto grid h-28 w-28 place-items-center">
          <div className="relative grid h-24 w-24 place-items-center">
            <span className="absolute inset-0 rounded-full border border-success/20" />
            <span className="absolute -inset-1 animate-[spin_1.6s_linear_infinite] rounded-full border-2 border-transparent border-r-primary/70 border-t-success" />
            <span className="absolute -inset-3 animate-pulse rounded-full border border-success/15" />
            <span className="relative grid h-20 w-20 place-items-center overflow-hidden rounded-full bg-primary-soft text-xl font-black text-primary ring-4 ring-surface">
              {avatarSrc ? (
                <Image
                  alt={displayName}
                  className="object-cover"
                  fill
                  sizes="80px"
                  src={avatarSrc}
                  unoptimized={isPublicMediaUrl(psychologist.avatar ?? null)}
                />
              ) : (
                getInitials(displayName)
              )}
            </span>
          </div>
        </div>

        <h2 className="mt-3 text-xl font-black tracking-[-0.03em] text-foreground" id={titleId}>
          {displayName}
        </h2>
        <p className="mt-1 text-sm font-semibold text-muted">{professionalLabel(psychologist)}</p>

        <div
          className="mt-5 rounded-2xl border border-success/20 bg-success/5 px-4 py-3"
          id={descriptionId}
        >
          <p className="inline-flex items-center justify-center gap-2 text-sm font-bold text-foreground">
            <WhatsAppIcon className="h-4 w-4 text-success" aria-hidden="true" />
            Abrindo conversa no WhatsApp
          </p>
          <p className="mt-1 text-xs leading-5 text-muted">
            Registrando o contato com segurança antes de sair da Lectum.
          </p>
        </div>

        {manualFallbackVisible ? (
          <div className="mt-5 grid gap-3">
            <Button
              className="h-11 rounded-2xl bg-success text-primary-foreground hover:bg-success/90"
              disabled={!redirectUrl}
              onClick={onManualOpen}
            >
              <ExternalLink className="h-4 w-4" aria-hidden="true" />
              Abrir WhatsApp
            </Button>
            <button
              className="text-xs font-semibold text-muted transition hover:text-foreground"
              onClick={onClose}
              type="button"
            >
              Voltar à Lectum
            </button>
            <p className="inline-flex items-center justify-center gap-1.5 text-[11px] font-semibold text-subtle">
              <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
              Se nada abrir, use o botão acima.
            </p>
          </div>
        ) : null}
      </div>
    </div>,
    document.body,
  );
};

export const PsychologistWhatsAppRedirectButton = ({
  children,
  className,
  disabled,
  importantActionType = "whatsapp_click",
  onClick,
  psychologist,
  stopPropagation = false,
  trackingContext,
  ...props
}: PsychologistWhatsAppRedirectButtonProps) => {
  const [isTransitionOpen, setIsTransitionOpen] = useState(false);
  const [manualFallbackVisible, setManualFallbackVisible] = useState(false);
  const [redirectUrl, setRedirectUrl] = useState(psychologist.whatsappUrl ?? "");
  const timersRef = useRef<number[]>([]);
  const tracking = useDirectoryPsychologistContactClick(psychologist.id);
  const importantActionTracking = useImportantActionTracking();
  const conversion = useProgressiveConversion();

  useEffect(() => {
    const timers = timersRef.current;

    return () => {
      for (const timer of timers) {
        window.clearTimeout(timer);
      }
    };
  }, []);

  const setTimer = (callback: () => void, ms: number) => {
    const timer = window.setTimeout(callback, ms);
    timersRef.current.push(timer);
  };

  const handleClick = async (event: MouseEvent<HTMLButtonElement>) => {
    onClick?.(event);

    if (event.defaultPrevented) return;

    event.preventDefault();

    if (stopPropagation) {
      event.stopPropagation();
    }

    if (disabled || !psychologist.whatsappUrl) return;

    const fallbackUrl = psychologist.whatsappUrl;

    if (!conversion.requestWhatsAppAccess(fallbackUrl)) {
      return;
    }

    setRedirectUrl(fallbackUrl);
    setManualFallbackVisible(false);
    setIsTransitionOpen(true);
    setTimer(() => setManualFallbackVisible(true), WHATSAPP_REDIRECT_FALLBACK_VISIBLE_DELAY_MS);

    const startedAt = performance.now();
    const analyticsIdentity = getOrCreateAnalyticsIdentity();
    if (analyticsIdentity) {
      void importantActionTracking
        .mutateAsync({
          action_type: importantActionType,
          display_mode: getDisplayMode(),
          occurred_at: new Date().toISOString(),
          page_kind: trackingContext?.pageKind,
          path: normalizeAnalyticsPath(trackingContext?.path ?? getCurrentAnalyticsPath()),
          session_id: analyticsIdentity.sessionId,
          target_id: trackingContext?.targetId ?? undefined,
          target_type: trackingContext?.targetType ?? undefined,
          visitor_id: analyticsIdentity.visitorId,
        })
        .catch(() => {
          // Analytics must never block the WhatsApp redirect.
        });
    }

    const trackedUrlPromise = tracking
      .mutateAsync()
      .then((data) => preserveFallbackWhatsAppText(fallbackUrl, data.whatsapp_url))
      .catch(() => fallbackUrl);

    const nextUrl =
      (await Promise.race([trackedUrlPromise, delay(TRACKING_WAIT_LIMIT_MS)])) ?? fallbackUrl;

    setRedirectUrl(nextUrl);

    const elapsed = performance.now() - startedAt;
    const remainingDelay = Math.max(0, WHATSAPP_REDIRECT_MIN_DELAY_MS - elapsed);

    setTimer(() => openPsychologistWhatsApp(nextUrl), remainingDelay);
  };

  const handleManualOpen = () => {
    const trustedUrl = normalizeTrustedWhatsAppUrl(redirectUrl);
    if (!trustedUrl) return;

    window.open(trustedUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <>
      <button
        className={cn(
          "inline-flex min-w-0 max-w-full items-center justify-center gap-2 whitespace-nowrap",
          className,
        )}
        disabled={disabled || !normalizeTrustedWhatsAppUrl(psychologist.whatsappUrl)}
        onClick={handleClick}
        type="button"
        {...props}
      >
        {children}
      </button>

      <PsychologistWhatsAppRedirectModal
        isOpen={isTransitionOpen}
        manualFallbackVisible={manualFallbackVisible}
        onClose={() => setIsTransitionOpen(false)}
        onManualOpen={handleManualOpen}
        psychologist={psychologist}
        redirectUrl={redirectUrl}
      />
    </>
  );
};
