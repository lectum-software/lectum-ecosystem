"use client";

import { Check, Copy, Download, Loader2, X } from "lucide-react";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { VerifiedBadgeIcon } from "@/components/ui/verified-badge";
import { cn } from "@/lib/utils";
import { Button } from "@/registry/new-york-v4/ui/button";
import { copyLectumShareUrl, shareLectumVideoResponse } from "@/utils/lectum-share-media";
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

const sharePreviewCardClassName =
  "top-[6%] left-[7%] right-[7%] rounded-[26px] px-5 py-4 sm:px-6 sm:py-5";

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
    <div className="relative mx-auto aspect-[9/16] max-h-[64vh] w-full max-w-[min(78vw,360px)] overflow-hidden rounded-[28px] bg-foreground text-white shadow-[0_28px_70px_rgb(15_23_42_/_28%)]">
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

export const LectumShareVideoModal = (props: LectumShareVideoModalProps) => {
  if (!props.target) return null;

  return <LectumShareVideoDialog {...props} key={props.target.replyId} target={props.target} />;
};

const LectumShareVideoDialog = ({ onClose, onShared, target }: LectumShareVideoDialogProps) => {
  const [status, setStatus] = useState<"copied" | "downloaded" | "idle" | "shared">("idle");
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const sourceLabel = useMemo(() => {
    return target.sourceKind === "comment" ? "prévia do comentário" : "pergunta do post";
  }, [target]);

  useEffect(() => {
    if (!target) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose, target]);

  const handleExport = async () => {
    setExporting(true);
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
      setExporting(false);
    }
  };

  const handleCopyLink = async () => {
    setError(null);

    try {
      await copyLectumShareUrl(target);
      onShared("clipboard");
      setStatus("copied");
    } catch {
      setError("Não foi possível copiar o link neste navegador.");
    }
  };

  return (
    <div
      aria-labelledby="lectum-share-video-title"
      aria-modal="true"
      className="fixed inset-0 z-[90] grid place-items-end bg-foreground/62 px-3 py-3 backdrop-blur-sm sm:place-items-center sm:px-5"
      role="dialog"
    >
      <div className="w-full max-w-[430px] rounded-[30px] border border-border bg-surface p-4 text-foreground shadow-[var(--lectum-shadow)] sm:max-w-[520px] sm:p-5">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-black uppercase tracking-[0.12em] text-primary">
              Compartilhar vídeo-resposta
            </p>
            <h2
              className="mt-1 text-lg font-black leading-tight tracking-[-0.03em] text-foreground"
              id="lectum-share-video-title"
            >
              Modelo Lectum para redes sociais
            </h2>
            <p className="mt-1 text-sm leading-5 text-muted">
              Usa a {sourceLabel}, sem botão de play central e sem CRP no identificador.
            </p>
          </div>
          <button
            aria-label="Fechar compartilhamento"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-border bg-surface-muted text-muted transition hover:bg-background hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25"
            onClick={onClose}
            type="button"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <div className="mb-4 rounded-2xl border border-primary/20 bg-primary-soft px-3 py-2.5 text-primary">
          <span className="block text-sm font-black">Formato único vertical 9:16</span>
          <span className="mt-0.5 block text-[11px] font-semibold leading-4">
            Otimizado para Stories, Reels, TikTok e Shorts.
          </span>
        </div>

        <SharePreview target={target} />

        {error ? (
          <p className="mt-4 rounded-2xl border border-danger/20 bg-danger/10 px-3 py-2 text-sm font-semibold text-danger">
            {error}
          </p>
        ) : null}

        {status !== "idle" ? (
          <p className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-success/20 bg-success/10 px-3 py-2 text-sm font-bold text-success">
            <Check className="h-4 w-4" aria-hidden="true" />
            {status === "downloaded"
              ? "Arquivo baixado e link copiado quando permitido."
              : status === "copied"
                ? "Link copiado."
                : "Arquivo enviado para o compartilhamento."}
          </p>
        ) : null}

        <div className="mt-4 grid gap-2 sm:grid-cols-[1fr_auto]">
          <Button
            className="h-12 rounded-2xl"
            disabled={exporting}
            onClick={handleExport}
            type="button"
          >
            {exporting ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <Download className="h-4 w-4" aria-hidden="true" />
            )}
            {exporting ? "Gerando layout..." : "Compartilhar layout"}
          </Button>
          <Button
            className="h-12 rounded-2xl"
            disabled={exporting}
            onClick={handleCopyLink}
            type="button"
            variant="outline"
          >
            <Copy className="h-4 w-4" aria-hidden="true" />
            Copiar link
          </Button>
        </div>
      </div>
    </div>
  );
};
