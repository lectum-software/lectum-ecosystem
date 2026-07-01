"use client";

import { Copy, Loader2, type LucideIcon, MoreHorizontal, X } from "lucide-react";
import Image from "next/image";
import { type CSSProperties, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { VerifiedBadgeIcon } from "@/components/ui/verified-badge";
import { cn } from "@/lib/utils";
import {
  copyLectumShareText,
  copyLectumShareUrl,
  shareLectumVideoResponse,
} from "@/utils/lectum-share-media";
import {
  type LectumShareChannel,
  type LectumShareSocialTarget,
  type LectumShareVideoTarget,
  truncateLectumShareProfessionalTagName,
} from "@/utils/lectum-share-target";
import { resolvePublicMediaUrl } from "@/utils/media";

type LectumShareVideoModalProps = {
  onClose: () => void;
  onShared: (channel: LectumShareChannel) => void;
  target: LectumShareVideoTarget | null;
};

type LectumShareVideoDialogProps = {
  onClose: () => void;
  onShared: (channel: LectumShareChannel) => void;
  target: LectumShareVideoTarget;
};

type ShareActionId = "copy" | "copy_text" | "instagram" | "more" | "tiktok" | "whatsapp";

type DragState = {
  pointerId: number;
  startY: number;
};

const CLOSE_ANIMATION_MS = 220;
const DRAG_CLOSE_THRESHOLD_PX = 96;
const DRAG_START_TOLERANCE_PX = 4;

const sharePreviewClassName = "w-[min(74vw,300px,31.5dvh)] sm:w-[min(34vw,340px,36dvh)]";

const sharePreviewCardClassName =
  "top-[6%] left-[10%] right-[10%] overflow-hidden rounded-[8px] sm:top-[6.75%] sm:left-[11%] sm:right-[11%] sm:rounded-[7px]";

const twoLineClampStyle = {
  WebkitBoxOrient: "vertical",
  WebkitLineClamp: 2,
  display: "-webkit-box",
} as CSSProperties;

const shareSheetActions = [
  {
    icon: Copy,
    iconClassName: "bg-surface-muted text-foreground",
    id: "copy",
    label: "Copiar link",
  },
  {
    iconClassName: "bg-transparent text-white",
    iconStyle: { backgroundColor: "#25D366" },
    iconSrc: "/svg/brand-whatsapp.svg",
    id: "whatsapp",
    label: "WhatsApp",
  },
  {
    iconClassName: "bg-transparent text-white",
    iconStyle: {
      background:
        "radial-gradient(circle at 30% 107%, #fdf497 0%, #fdf497 5%, #fd5949 45%, #d6249f 60%, #285aeb 90%)",
    },
    iconSrc: "/svg/brand-instagram.svg",
    id: "instagram",
    label: "Instagram",
  },
  {
    iconClassName: "bg-transparent text-white",
    iconStyle: { backgroundColor: "#000000" },
    iconSrc: "/svg/brand-tiktok.svg",
    id: "tiktok",
    label: "TikTok",
  },
  {
    icon: MoreHorizontal,
    iconClassName: "border border-border bg-surface-muted text-muted",
    id: "more",
    label: "Mais",
  },
] as const;

const truncatePreviewText = (value: string, maxLength: number) => {
  const normalized = value.replace(/\s+/g, " ").trim();

  if (normalized.length <= maxLength) return normalized;

  return `${normalized.slice(0, maxLength).trimEnd()}...`;
};

const isInteractiveDragTarget = (target: EventTarget | null) =>
  target instanceof HTMLElement &&
  Boolean(target.closest("a,button,input,select,textarea,[role='button']"));

const isSocialShareTarget = (target: LectumShareVideoTarget): target is LectumShareSocialTarget =>
  target.kind !== "link";

const isLinkOnlyAction = (actionId: ShareActionId) =>
  actionId === "copy" || actionId === "whatsapp";

const whatsappShareUrl = (target: LectumShareVideoTarget) => {
  const text =
    target.kind === "link"
      ? [target.title, target.shareUrl].filter(Boolean).join("\n")
      : [target.shareText, target.shareUrl].filter(Boolean).join("\n");

  return `https://wa.me/?text=${encodeURIComponent(text)}`;
};

const SharePreview = ({ target }: { target: LectumShareSocialTarget }) => {
  const mediaSrc = resolvePublicMediaUrl(target.mediaUrl);
  const professionalTagName = truncateLectumShareProfessionalTagName(target.professional.name);
  const sourcePreview = truncatePreviewText(target.sourceText, 64);

  return (
    <div
      className={cn(
        "relative mx-auto aspect-[9/16] overflow-hidden rounded-[28px] bg-foreground text-white",
        sharePreviewClassName,
      )}
    >
      {mediaSrc && target.mediaType === "video" ? (
        <video
          aria-label="Prévia do vídeo no layout de compartilhamento Lectum"
          autoPlay
          className="pointer-events-none absolute inset-0 h-full w-full object-contain"
          crossOrigin="anonymous"
          loop
          muted
          playsInline
          src={mediaSrc}
        />
      ) : mediaSrc ? (
        <>
          <Image
            alt=""
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 h-full w-full scale-110 object-cover opacity-55 blur-xl"
            fill
            sizes="(min-width: 640px) 340px, 300px"
            src={mediaSrc}
            unoptimized
          />
          <Image
            alt="Prévia da imagem no layout de compartilhamento Lectum"
            className="pointer-events-none absolute inset-0 h-full w-full object-contain"
            fill
            sizes="(min-width: 640px) 340px, 300px"
            src={mediaSrc}
            unoptimized
          />
        </>
      ) : (
        <div className="absolute inset-0 bg-foreground" />
      )}

      <div
        className={cn(
          "absolute border border-white/80 bg-surface/95 text-foreground shadow-[0_12px_30px_rgb(2_8_23_/_18%)] ring-1 ring-foreground/10 backdrop-blur-xl",
          sharePreviewCardClassName,
        )}
      >
        <p className="border-white/20 border-b bg-[linear-gradient(135deg,#3aa0f3_0%,#1677d2_100%)] px-3.5 py-[7px] text-center text-[10px] font-bold leading-none tracking-[-0.01em] text-white shadow-[inset_0_-1px_0_rgb(255_255_255_/_22%)] sm:px-3 sm:py-[6px] sm:text-[8px] sm:leading-none">
          {target.cardLabel}
        </p>
        <p
          className={cn(
            "overflow-hidden bg-[linear-gradient(180deg,rgb(255_255_255_/_0.98)_0%,rgb(248_250_252_/_0.94)_100%)] px-3.5 py-2 text-center font-semibold tracking-[-0.02em] text-foreground sm:px-3 sm:py-1.5",
            "text-[clamp(0.7rem,2.35vw,0.84rem)] leading-[1.08] sm:text-[10px] sm:leading-[1.08]",
          )}
          style={twoLineClampStyle}
        >
          {sourcePreview}
        </p>
      </div>

      <div className="absolute bottom-[23.5%] left-1/2 z-10 flex max-w-[72%] -translate-x-1/2 items-center px-1 py-0 text-white [text-shadow:0_1px_4px_rgb(0_0_0_/_70%)]">
        <span className="flex min-w-0 flex-col items-start justify-center">
          <span className="flex min-w-0 items-center gap-1 leading-[1.05]">
            <span className="min-w-0 whitespace-nowrap text-left text-[11px] font-bold leading-[1.05] tracking-[-0.02em] text-white sm:text-[9.5px]">
              {professionalTagName}
            </span>
            {target.professional.verified ? (
              <VerifiedBadgeIcon
                aria-hidden="true"
                className="h-3 w-3 shrink-0 sm:h-2.5 sm:w-2.5"
              />
            ) : null}
          </span>
          <span className="mt-0.5 whitespace-nowrap text-left text-[8.5px] font-medium leading-[1.25] tracking-[-0.01em] text-white/75 sm:text-[7.5px] sm:leading-[1.25]">
            {target.professional.roleLabel}
          </span>
        </span>
      </div>
    </div>
  );
};

const ShareResponseTextPanel = ({
  disabled,
  onCopy,
  pending,
  text,
}: {
  disabled: boolean;
  onCopy: () => void;
  pending: boolean;
  text: string;
}) => (
  <div className="mt-3 flex items-start gap-2 px-1 sm:mt-2.5">
    <p className="min-w-0 flex-1 line-clamp-2 text-xs font-medium leading-4 text-muted sm:text-xs sm:leading-4">
      {text}
    </p>
    <button
      aria-label="Copiar texto da resposta"
      className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-muted transition hover:bg-surface-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25 disabled:cursor-not-allowed disabled:opacity-60"
      disabled={disabled}
      onClick={onCopy}
      type="button"
    >
      {pending ? (
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
      ) : (
        <Copy className="h-4 w-4" aria-hidden="true" />
      )}
    </button>
  </div>
);

type ShareSheetOptionProps = {
  disabled: boolean;
  disabledReason?: string;
  icon?: LucideIcon;
  iconClassName: string;
  iconSrc?: string;
  iconStyle?: CSSProperties;
  label: string;
  onClick: () => void;
  pending: boolean;
};

const ShareSheetOption = ({
  disabled,
  disabledReason,
  icon: Icon,
  iconClassName,
  iconSrc,
  iconStyle,
  label,
  onClick,
  pending,
}: ShareSheetOptionProps) => (
  <button
    aria-label={label}
    className="group grid w-[58px] shrink-0 justify-items-center gap-1.5 rounded-2xl py-1 text-center transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25 disabled:cursor-not-allowed disabled:opacity-60"
    disabled={disabled}
    onClick={onClick}
    title={disabled ? disabledReason : undefined}
    type="button"
  >
    <span
      className={cn(
        "grid h-14 w-14 place-items-center rounded-[20px] transition group-hover:scale-[1.03] sm:h-12 sm:w-12 sm:rounded-[18px]",
        iconClassName,
      )}
      style={iconStyle}
    >
      {pending ? (
        <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
      ) : iconSrc ? (
        <Image
          alt=""
          aria-hidden="true"
          className="h-6 w-6 object-contain sm:h-5 sm:w-5"
          height={24}
          src={iconSrc}
          unoptimized
          width={24}
        />
      ) : Icon ? (
        <Icon className="h-6 w-6 sm:h-5 sm:w-5" aria-hidden="true" />
      ) : (
        <MoreHorizontal className="h-6 w-6 sm:h-5 sm:w-5" aria-hidden="true" />
      )}
    </span>
    <span className="line-clamp-2 text-[11px] font-semibold leading-[13px] text-foreground">
      {label}
    </span>
  </button>
);

export const LectumShareVideoModal = (props: LectumShareVideoModalProps) => {
  if (!props.target) return null;

  return (
    <LectumShareVideoDialog
      {...props}
      key={`${props.target.kind}-${props.target.postId}-${props.target.replyId ?? "post"}`}
      target={props.target}
    />
  );
};

const LectumShareVideoDialog = ({ onClose, onShared, target }: LectumShareVideoDialogProps) => {
  const closeTimeoutRef = useRef<number | null>(null);
  const closeRequestedRef = useRef(false);
  const dragStateRef = useRef<DragState | null>(null);
  const sheetRef = useRef<HTMLDivElement | null>(null);
  const [dragOffset, setDragOffset] = useState(0);
  const [isClosing, setIsClosing] = useState(false);
  const [isEntered, setIsEntered] = useState(false);
  const [pendingAction, setPendingAction] = useState<ShareActionId | null>(null);
  const [error, setError] = useState<string | null>(null);
  const exporting = pendingAction !== null;
  const sourceLabel = useMemo(() => {
    if (target.kind === "link") return "link do post";

    return target.sourceKind === "comment" ? "prévia do comentário" : "pergunta do post";
  }, [target]);

  const requestClose = useCallback(() => {
    if (closeRequestedRef.current) return;

    closeRequestedRef.current = true;
    setDragOffset(0);
    setIsClosing(true);
    closeTimeoutRef.current = window.setTimeout(() => {
      onClose();
    }, CLOSE_ANIMATION_MS);
  }, [onClose]);

  useEffect(() => {
    const scrollY = window.scrollY;
    const originalHtmlOverflow = document.documentElement.style.overflow;
    const originalBodyOverflow = document.body.style.overflow;
    const originalBodyPosition = document.body.style.position;
    const originalBodyTop = document.body.style.top;
    const originalBodyWidth = document.body.style.width;

    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    document.body.style.position = "fixed";
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = "100%";

    return () => {
      document.documentElement.style.overflow = originalHtmlOverflow;
      document.body.style.overflow = originalBodyOverflow;
      document.body.style.position = originalBodyPosition;
      document.body.style.top = originalBodyTop;
      document.body.style.width = originalBodyWidth;
      window.scrollTo(0, scrollY);
    };
  }, []);

  useEffect(() => {
    const animationFrame = window.requestAnimationFrame(() => setIsEntered(true));

    return () => {
      window.cancelAnimationFrame(animationFrame);
      if (closeTimeoutRef.current) {
        window.clearTimeout(closeTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        requestClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [requestClose]);

  const handleDragStart = (event: React.PointerEvent<HTMLDivElement>) => {
    if (
      isClosing ||
      isInteractiveDragTarget(event.target) ||
      (sheetRef.current?.scrollTop ?? 0) > 0
    ) {
      return;
    }

    dragStateRef.current = {
      pointerId: event.pointerId,
      startY: event.clientY,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handleDragMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const dragState = dragStateRef.current;
    if (!dragState || dragState.pointerId !== event.pointerId) return;

    const nextOffset = Math.max(0, event.clientY - dragState.startY);

    if (nextOffset > DRAG_START_TOLERANCE_PX) {
      event.preventDefault();
    }

    setDragOffset(nextOffset);
  };

  const finishDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    const dragState = dragStateRef.current;
    if (!dragState || dragState.pointerId !== event.pointerId) return;

    const currentOffset = Math.max(0, event.clientY - dragState.startY);
    dragStateRef.current = null;

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    if (currentOffset >= DRAG_CLOSE_THRESHOLD_PX) {
      requestClose();
      return;
    }

    setDragOffset(0);
  };

  const cancelDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    const dragState = dragStateRef.current;
    if (!dragState || dragState.pointerId !== event.pointerId) return;

    dragStateRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    setDragOffset(0);
  };

  const handleShareToDevice = async (actionId: ShareActionId) => {
    if (!isSocialShareTarget(target)) return;

    setPendingAction(actionId);
    setError(null);

    try {
      const result = await shareLectumVideoResponse(target);
      if (result.channel) {
        onShared(result.channel);
      }
      toast.success(
        result.mode === "download"
          ? "Arquivo baixado para escolher no app desejado."
          : "Compartilhamento aberto no dispositivo.",
      );
    } catch {
      setError(
        "NÃ£o foi possÃ­vel gerar o arquivo agora. VocÃª ainda pode copiar o link direto da resposta.",
      );
    } finally {
      setPendingAction(null);
    }
  };

  const handleShareLinkToWhatsApp = () => {
    setPendingAction("whatsapp");
    setError(null);

    try {
      const opened = window.open(whatsappShareUrl(target), "_blank", "noopener,noreferrer");
      if (!opened) {
        window.location.assign(whatsappShareUrl(target));
      }
      onShared("web_share");
      toast.success("Link preparado para enviar no WhatsApp.");
    } catch {
      setError("NÃƒÂ£o foi possÃƒÂ­vel abrir o WhatsApp agora.");
    } finally {
      setPendingAction(null);
    }
  };

  const handleCopyLink = async () => {
    setPendingAction("copy");
    setError(null);

    try {
      await copyLectumShareUrl(target);
      onShared("clipboard");
      toast.success("Link copiado.");
    } catch {
      setError("NÃ£o foi possÃ­vel copiar o link neste navegador.");
    } finally {
      setPendingAction(null);
    }
  };

  const handleCopyText = async () => {
    if (!isSocialShareTarget(target)) return;

    setPendingAction("copy_text");
    setError(null);

    try {
      await copyLectumShareText(target);
      toast.success("Texto copiado para usar como legenda.");
    } catch {
      setError("NÃ£o foi possÃ­vel copiar o texto neste navegador.");
    } finally {
      setPendingAction(null);
    }
  };

  const modalIsVisible = isEntered && !isClosing;
  const sheetTranslateY =
    modalIsVisible && dragOffset > 0
      ? `translate3d(0, ${dragOffset}px, 0)`
      : modalIsVisible
        ? "translate3d(0, 0, 0)"
        : "translate3d(0, 100%, 0)";
  const socialTarget = isSocialShareTarget(target) ? target : null;

  return (
    <div
      aria-label={`Compartilhar ${sourceLabel}`}
      aria-modal="true"
      className={cn(
        "fixed inset-0 z-[90] overscroll-contain bg-foreground/62 backdrop-blur-sm transition-opacity duration-200 ease-out sm:grid sm:place-items-center sm:px-5 motion-reduce:transition-none",
        modalIsVisible ? "opacity-100" : "opacity-0",
      )}
      role="dialog"
    >
      <button
        aria-label="Fechar compartilhamento ao clicar fora"
        className="absolute inset-0 z-0 cursor-default"
        onClick={requestClose}
        onPointerDown={requestClose}
        tabIndex={-1}
        type="button"
      />
      <div
        className={cn(
          "pointer-events-none relative z-10 mx-auto flex min-h-dvh w-full max-w-[430px] items-end sm:min-h-0",
          socialTarget ? "sm:max-w-[560px]" : "sm:max-w-[360px]",
        )}
      >
        <div
          className={cn(
            "pointer-events-auto relative max-h-[94dvh] w-full touch-none select-none overscroll-contain overflow-y-auto rounded-t-[34px] border border-border bg-surface px-4 pt-14 pb-[max(1rem,env(safe-area-inset-bottom))] text-foreground shadow-[var(--lectum-shadow)] will-change-transform sm:max-h-[calc(100dvh-2rem)] sm:overflow-visible sm:rounded-[34px] sm:px-8 sm:pt-12 sm:pb-6",
            dragOffset > 0
              ? "transition-none"
              : "transition-transform duration-200 ease-out motion-reduce:transition-none",
          )}
          onPointerCancel={cancelDrag}
          onPointerDown={handleDragStart}
          onPointerMove={handleDragMove}
          onPointerUp={finishDrag}
          ref={sheetRef}
          style={{ transform: sheetTranslateY }}
        >
          <button
            aria-label="Fechar compartilhamento"
            className="absolute top-4 right-4 z-20 grid h-10 w-10 place-items-center rounded-full border border-border bg-surface-muted text-foreground transition hover:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25 sm:top-4 sm:right-4"
            onClick={(event) => {
              event.stopPropagation();
              requestClose();
            }}
            onPointerDown={(event) => {
              event.stopPropagation();
              requestClose();
            }}
            type="button"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>

          {socialTarget ? <SharePreview target={socialTarget} /> : null}

          {socialTarget?.responseText ? (
            <ShareResponseTextPanel
              disabled={exporting}
              onCopy={handleCopyText}
              pending={pendingAction === "copy_text"}
              text={socialTarget.responseText}
            />
          ) : null}

          {socialTarget?.kind === "post_media" && socialTarget.carouselCount > 1 ? (
            <p className="mt-3 px-1 text-xs font-semibold leading-4 text-muted">
              Carrossel com {socialTarget.carouselCount} imagens. O link abre o post completo.
            </p>
          ) : null}

          <div
            className={cn(
              socialTarget ? "mt-4 border-border border-t pt-3 sm:mt-3 sm:pt-3" : "pt-1 sm:pt-2",
            )}
          >
            <div className="-mx-1 flex justify-between gap-2 overflow-hidden px-1 pb-2 sm:gap-3">
              {shareSheetActions.map((action) => {
                const linkActionDisabled = !socialTarget && !isLinkOnlyAction(action.id);

                return (
                  <ShareSheetOption
                    disabled={exporting || linkActionDisabled}
                    disabledReason={
                      linkActionDisabled
                        ? "Disponível para vídeos e imagens de psicólogos."
                        : undefined
                    }
                    icon={"icon" in action ? action.icon : undefined}
                    iconClassName={action.iconClassName}
                    iconSrc={"iconSrc" in action ? action.iconSrc : undefined}
                    iconStyle={"iconStyle" in action ? action.iconStyle : undefined}
                    key={action.id}
                    label={action.label}
                    onClick={() => {
                      if (action.id === "copy") {
                        void handleCopyLink();
                        return;
                      }

                      if (!socialTarget && action.id === "whatsapp") {
                        handleShareLinkToWhatsApp();
                        return;
                      }

                      void handleShareToDevice(action.id);
                    }}
                    pending={pendingAction === action.id}
                  />
                );
              })}
            </div>
          </div>

          {error ? (
            <p className="mt-4 rounded-2xl border border-danger/20 bg-danger/10 px-3 py-2 text-sm font-semibold text-danger">
              {error}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
};
