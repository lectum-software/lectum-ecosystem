"use client";

import {
  Camera,
  Check,
  Copy,
  Download,
  Loader2,
  MessageCircle,
  MoreHorizontal,
  Music2,
  X,
} from "lucide-react";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { VerifiedBadgeIcon } from "@/components/ui/verified-badge";
import { cn } from "@/lib/utils";
import {
  copyLectumShareUrl,
  downloadLectumVideoResponse,
  shareLectumVideoResponse,
} from "@/utils/lectum-share-media";
import type { LectumShareChannel, LectumShareVideoTarget } from "@/utils/lectum-share-target";
import { isPublicMediaUrl, resolvePublicMediaUrl } from "@/utils/media";

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

type ShareActionId = "copy" | "download" | "instagram" | "more" | "tiktok" | "whatsapp";

const sharePreviewCardClassName =
  "top-[6%] left-[7%] right-[7%] rounded-[26px] px-5 py-4 sm:px-6 sm:py-5";

const appShareActions = [
  {
    icon: MessageCircle,
    iconClassName: "bg-success/15 text-success",
    id: "whatsapp",
    label: "WhatsApp",
  },
  {
    icon: Camera,
    iconClassName: "bg-primary-soft text-primary",
    id: "instagram",
    label: "Instagram",
  },
  {
    icon: Music2,
    iconClassName: "bg-foreground text-background",
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

const utilityActions = [
  {
    icon: Download,
    iconClassName: "bg-surface-muted text-foreground",
    id: "download",
    label: "Baixar",
  },
  {
    icon: Copy,
    iconClassName: "bg-surface-muted text-foreground",
    id: "copy",
    label: "Copiar link",
  },
] as const;

const truncatePreviewText = (value: string, maxLength: number) => {
  const normalized = value.replace(/\s+/g, " ").trim();

  if (normalized.length <= maxLength) return normalized;

  return `${normalized.slice(0, maxLength).trimEnd()}...`;
};

const SharePreview = ({ target }: { target: LectumShareVideoTarget }) => {
  const videoSrc = resolvePublicMediaUrl(target.videoUrl);
  const avatarSrc = resolvePublicMediaUrl(target.professional.avatar);
  const sourcePreview = truncatePreviewText(target.sourceText, 96);
  const avatarIsPublicMedia = isPublicMediaUrl(target.professional.avatar);

  return (
    <div className="relative mx-auto aspect-[9/16] max-h-[56dvh] w-full max-w-[min(76vw,320px)] overflow-hidden rounded-[28px] bg-foreground text-white shadow-[0_28px_70px_rgb(15_23_42_/_28%)]">
      {videoSrc ? (
        <video
          aria-label="Prévia do vídeo-resposta no layout de compartilhamento Lectum"
          autoPlay
          className="absolute inset-0 h-full w-full object-cover"
          crossOrigin="anonymous"
          loop
          muted
          playsInline
          src={videoSrc}
        />
      ) : (
        <div className="absolute inset-0 bg-foreground" />
      )}

      <div
        className={cn(
          "absolute border border-white/55 bg-surface/80 text-foreground shadow-[0_14px_34px_rgb(15_23_42_/_18%)] backdrop-blur-md",
          sharePreviewCardClassName,
        )}
      >
        <p className="text-center text-[15px] font-black leading-none text-primary sm:text-base">
          Perguntaram na Lectum
        </p>
        <p
          className={cn(
            "mt-3 text-center font-black tracking-[-0.045em] text-foreground",
            "text-[clamp(1.25rem,5vw,1.9rem)] leading-[1.08]",
          )}
        >
          {sourcePreview}
        </p>
      </div>

      <div className="absolute bottom-7 left-5 flex min-w-[15.5rem] items-center gap-2 rounded-full border border-background/45 bg-foreground/55 px-2.5 py-2 text-background shadow-[0_14px_34px_rgb(15_23_42_/_24%)] backdrop-blur-md">
        <span className="relative grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-full bg-primary-soft text-xs font-black text-primary ring-2 ring-background/80">
          {avatarSrc ? (
            <Image
              alt={target.professional.name}
              className="object-cover"
              fill
              sizes="48px"
              src={avatarSrc}
              unoptimized={avatarIsPublicMedia}
            />
          ) : (
            target.professional.name.slice(0, 2).toUpperCase()
          )}
        </span>
        <span className="grid min-w-0">
          <span className="flex min-w-0 items-center gap-1.5">
            <span className="truncate text-[16px] font-black leading-tight text-white">
              {target.professional.name}
            </span>
            {target.professional.verified ? (
              <VerifiedBadgeIcon className="h-4 w-4 shrink-0" aria-label="Perfil verificado" />
            ) : null}
          </span>
          <span className="text-[13px] font-semibold leading-tight text-white/72">
            {target.professional.roleLabel}
          </span>
        </span>
      </div>

      <div className="absolute right-5 bottom-8 text-[32px] font-black leading-none tracking-[-0.05em] text-white drop-shadow-[0_4px_16px_rgb(15_23_42_/_42%)]">
        lectum
      </div>
    </div>
  );
};

type ShareSheetOptionProps = {
  disabled: boolean;
  icon: (typeof appShareActions)[number]["icon"];
  iconClassName: string;
  label: string;
  onClick: () => void;
  pending: boolean;
};

const ShareSheetOption = ({
  disabled,
  icon: Icon,
  iconClassName,
  label,
  onClick,
  pending,
}: ShareSheetOptionProps) => (
  <button
    aria-label={label}
    className="group grid w-[74px] shrink-0 justify-items-center gap-2 rounded-2xl py-1 text-center transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25 disabled:cursor-not-allowed disabled:opacity-60"
    disabled={disabled}
    onClick={onClick}
    type="button"
  >
    <span
      className={cn(
        "grid h-14 w-14 place-items-center rounded-[20px] shadow-[0_10px_24px_rgb(15_23_42_/_10%)] transition group-hover:scale-[1.03]",
        iconClassName,
      )}
    >
      {pending ? (
        <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
      ) : (
        <Icon className="h-6 w-6" aria-hidden="true" />
      )}
    </span>
    <span className="line-clamp-2 text-[12px] font-semibold leading-[14px] text-foreground">
      {label}
    </span>
  </button>
);

export const LectumShareVideoModal = (props: LectumShareVideoModalProps) => {
  if (!props.target) return null;

  return <LectumShareVideoDialog {...props} key={props.target.replyId} target={props.target} />;
};

const LectumShareVideoDialog = ({ onClose, onShared, target }: LectumShareVideoDialogProps) => {
  const [pendingAction, setPendingAction] = useState<ShareActionId | null>(null);
  const [status, setStatus] = useState<"copied" | "downloaded" | "idle" | "shared">("idle");
  const [error, setError] = useState<string | null>(null);
  const exporting = pendingAction !== null;
  const sourceLabel = useMemo(() => {
    return target.sourceKind === "comment" ? "prévia do comentário" : "pergunta do post";
  }, [target]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const handleShareToDevice = async (actionId: ShareActionId) => {
    setPendingAction(actionId);
    setError(null);
    setStatus("idle");

    try {
      const result = await shareLectumVideoResponse(target);
      if (result.channel) {
        onShared(result.channel);
      }
      setStatus(result.mode === "download" ? "downloaded" : "shared");
    } catch {
      setError(
        "Não foi possível gerar o arquivo agora. Você ainda pode copiar o link direto da resposta.",
      );
    } finally {
      setPendingAction(null);
    }
  };

  const handleDownload = async () => {
    setPendingAction("download");
    setError(null);
    setStatus("idle");

    try {
      await downloadLectumVideoResponse(target);
      setStatus("downloaded");
    } catch {
      setError("Não foi possível baixar o vídeo agora. Tente copiar o link direto da resposta.");
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
      setStatus("copied");
    } catch {
      setError("Não foi possível copiar o link neste navegador.");
    } finally {
      setPendingAction(null);
    }
  };

  return (
    <div
      aria-label={`Compartilhar vídeo-resposta com ${sourceLabel}`}
      aria-modal="true"
      className="fixed inset-0 z-[90] bg-foreground/62 backdrop-blur-sm sm:grid sm:place-items-center sm:px-5"
      role="dialog"
    >
      <div className="mx-auto flex min-h-dvh w-full max-w-[430px] items-end sm:min-h-0 sm:max-w-[520px]">
        <div className="relative max-h-[94dvh] w-full overflow-y-auto rounded-t-[34px] border border-border bg-surface px-4 pt-14 pb-[max(1rem,env(safe-area-inset-bottom))] text-foreground shadow-[var(--lectum-shadow)] sm:rounded-[34px] sm:p-5 sm:pt-14">
          <button
            aria-label="Fechar compartilhamento"
            className="absolute top-4 right-4 z-20 grid h-11 w-11 place-items-center rounded-full border border-border bg-surface-muted text-foreground shadow-[0_12px_24px_rgb(15_23_42_/_10%)] transition hover:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25"
            onClick={onClose}
            type="button"
          >
            <X className="h-6 w-6" aria-hidden="true" />
          </button>

          <SharePreview target={target} />

          <div className="mt-5 border-border border-t pt-4">
            <div className="-mx-1 flex gap-3 overflow-x-auto px-1 pb-2">
              {appShareActions.map((action) => (
                <ShareSheetOption
                  disabled={exporting}
                  icon={action.icon}
                  iconClassName={action.iconClassName}
                  key={action.id}
                  label={action.label}
                  onClick={() => handleShareToDevice(action.id)}
                  pending={pendingAction === action.id}
                />
              ))}
            </div>

            <div className="mt-3 grid grid-cols-2 gap-3 border-border border-t pt-4">
              {utilityActions.map((action) => (
                <ShareSheetOption
                  disabled={exporting}
                  icon={action.icon}
                  iconClassName={action.iconClassName}
                  key={action.id}
                  label={action.label}
                  onClick={action.id === "download" ? handleDownload : handleCopyLink}
                  pending={pendingAction === action.id}
                />
              ))}
            </div>
          </div>

          {error ? (
            <p className="mt-4 rounded-2xl border border-danger/20 bg-danger/10 px-3 py-2 text-sm font-semibold text-danger">
              {error}
            </p>
          ) : null}

          {status !== "idle" ? (
            <p className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-success/20 bg-success/10 px-3 py-2 text-sm font-bold text-success">
              <Check className="h-4 w-4" aria-hidden="true" />
              {status === "downloaded"
                ? "Arquivo baixado para escolher no app desejado."
                : status === "copied"
                  ? "Link copiado."
                  : "Compartilhamento aberto no dispositivo."}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
};
