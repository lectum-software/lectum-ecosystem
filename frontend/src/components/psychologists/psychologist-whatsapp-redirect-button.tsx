"use client";

import { ExternalLink, ShieldCheck } from "lucide-react";
import Image from "next/image";
import type { ButtonHTMLAttributes, MouseEvent, ReactNode } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useDirectoryPsychologistContactClick } from "@/api/callers/directory";
import { WhatsAppIcon } from "@/components/ui/whatsapp-icon";
import { Button } from "@/registry/new-york-v4/ui/button";
import { formatCrpNumber } from "@/utils/crp";
import { isPublicMediaUrl, resolvePublicMediaUrl } from "@/utils/media";

const MIN_REDIRECT_DELAY_MS = 900;
const TRACKING_WAIT_LIMIT_MS = 1400;
const FALLBACK_VISIBLE_DELAY_MS = 2300;

type PsychologistWhatsAppIdentity = {
  id: string;
  name: string;
  avatar?: string | null;
  crp?: string | null;
  typeLabel?: string | null;
  whatsappUrl?: string | null;
};

type PsychologistWhatsAppRedirectButtonProps = Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "children" | "type"
> & {
  children: ReactNode;
  psychologist: PsychologistWhatsAppIdentity;
  stopPropagation?: boolean;
};

const delay = (ms: number) => new Promise<null>((resolve) => window.setTimeout(resolve, ms, null));

const getInitials = (name: string) => {
  const parts = name.split(/\s+/).filter(Boolean);

  if (parts.length === 0) return "L";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();

  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
};

const professionalLabel = (psychologist: PsychologistWhatsAppIdentity) => {
  const typeLabel = psychologist.typeLabel?.trim() || "Psicólogo(a)";
  const crp = formatCrpNumber(psychologist.crp);

  return crp ? `${typeLabel} • CRP ${crp}` : `${typeLabel} • CRP não informado`;
};

const openWhatsApp = (url: string) => {
  window.location.assign(url);
};

export const PsychologistWhatsAppRedirectButton = ({
  children,
  className,
  disabled,
  onClick,
  psychologist,
  stopPropagation = false,
  ...props
}: PsychologistWhatsAppRedirectButtonProps) => {
  const [isTransitionOpen, setIsTransitionOpen] = useState(false);
  const [manualFallbackVisible, setManualFallbackVisible] = useState(false);
  const [redirectUrl, setRedirectUrl] = useState(psychologist.whatsappUrl ?? "");
  const timersRef = useRef<number[]>([]);
  const tracking = useDirectoryPsychologistContactClick(psychologist.id);
  const avatarSrc = useMemo(
    () => resolvePublicMediaUrl(psychologist.avatar ?? null),
    [psychologist.avatar],
  );

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
    setRedirectUrl(fallbackUrl);
    setManualFallbackVisible(false);
    setIsTransitionOpen(true);
    setTimer(() => setManualFallbackVisible(true), FALLBACK_VISIBLE_DELAY_MS);

    const startedAt = performance.now();
    const trackedUrlPromise = tracking
      .mutateAsync()
      .then((data) => data.whatsapp_url)
      .catch(() => fallbackUrl);

    const nextUrl =
      (await Promise.race([trackedUrlPromise, delay(TRACKING_WAIT_LIMIT_MS)])) ?? fallbackUrl;

    setRedirectUrl(nextUrl);

    const elapsed = performance.now() - startedAt;
    const remainingDelay = Math.max(0, MIN_REDIRECT_DELAY_MS - elapsed);

    setTimer(() => openWhatsApp(nextUrl), remainingDelay);
  };

  const handleManualOpen = () => {
    if (!redirectUrl) return;

    window.open(redirectUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <>
      <button
        className={className}
        disabled={disabled || !psychologist.whatsappUrl}
        onClick={handleClick}
        type="button"
        {...props}
      >
        {children}
      </button>

      {isTransitionOpen ? (
        <div
          aria-live="polite"
          className="fixed inset-0 z-[90] grid place-items-center bg-background/92 px-5 py-8 backdrop-blur-md"
          role="status"
        >
          <div className="w-full max-w-[360px] rounded-[30px] border border-border bg-surface p-6 text-center shadow-[var(--lectum-shadow-soft)]">
            <div className="mx-auto grid h-28 w-28 place-items-center">
              <div className="relative grid h-24 w-24 place-items-center">
                <span className="absolute inset-0 rounded-full border border-success/20" />
                <span className="absolute -inset-1 rounded-full border-2 border-transparent border-t-success border-r-primary/70 animate-[spin_1.6s_linear_infinite]" />
                <span className="absolute -inset-3 rounded-full border border-success/15 animate-pulse" />
                <span className="relative grid h-20 w-20 place-items-center overflow-hidden rounded-full bg-primary-soft text-xl font-black text-primary ring-4 ring-surface">
                  {avatarSrc ? (
                    <Image
                      alt={psychologist.name}
                      className="object-cover"
                      fill
                      sizes="80px"
                      src={avatarSrc}
                      unoptimized={isPublicMediaUrl(psychologist.avatar ?? null)}
                    />
                  ) : (
                    getInitials(psychologist.name)
                  )}
                </span>
              </div>
            </div>

            <h2 className="mt-3 text-xl font-black tracking-[-0.03em] text-foreground">
              {psychologist.name}
            </h2>
            <p className="mt-1 text-sm font-semibold text-muted">
              {professionalLabel(psychologist)}
            </p>

            <div className="mt-5 rounded-2xl border border-success/20 bg-success/5 px-4 py-3">
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
                  className="h-11 rounded-2xl bg-success text-white hover:bg-success/90"
                  onClick={handleManualOpen}
                >
                  <ExternalLink className="h-4 w-4" aria-hidden="true" />
                  Abrir WhatsApp
                </Button>
                <button
                  className="text-xs font-semibold text-muted transition hover:text-foreground"
                  onClick={() => setIsTransitionOpen(false)}
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
        </div>
      ) : null}
    </>
  );
};
