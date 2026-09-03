"use client";
import { AlertTriangle, Eye, FileText, Play } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRef, useState } from "react";
import type {
  AdminCommunityContentAnalyticsDetail,
  AdminCommunityContentAuthor,
} from "@/api/req/communities";
import { VerifiedBadgeIcon, WhatsAppIcon } from "@/components/admin-icons";
import { AdminStreamVideo } from "@/components/admin-stream-video";
import { isAdminPublicMediaUrl, renderableImageSrc, resolveAdminMediaUrl } from "@/lib/admin-media";
import { toPublicFrontendHref } from "@/lib/public-frontend-url";
import { cn } from "@/lib/utils";

import {
  ContentStatusBadge,
  cardClass,
  contentCommentBreakdownItems,
  contentDetailMetricRowItems,
  contentTitle,
  contentTypeLabel,
  formatCount,
  formatDateTime,
  getContentStatusCopy,
  initials,
} from "../modules/content-support";

export const AuthorIdentity = ({
  author,
}: {
  author: AdminCommunityContentAuthor & { role_label: string };
}) => {
  const avatarSrc = renderableImageSrc(author.avatar);

  return (
    <div className="flex min-w-0 items-center gap-3">
      <div className="relative grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-full border border-border bg-primary-soft text-xs font-black text-primary">
        {avatarSrc ? (
          <Image
            alt={`Foto de perfil de ${author.name}`}
            className="object-cover"
            fill
            sizes="48px"
            src={avatarSrc}
            unoptimized={isAdminPublicMediaUrl(author.avatar)}
          />
        ) : (
          initials(author.name)
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-center gap-1.5">
          <span className="truncate text-sm font-black text-foreground">{author.name}</span>
          {author.verified ? (
            <VerifiedBadgeIcon aria-label="Perfil verificado" variant="compact" />
          ) : null}
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs font-bold text-muted">
          <span>{author.role_label}</span>
          {author.anonymous ? (
            <span className="rounded-full bg-primary-soft px-2 py-0.5 font-black text-primary">
              Anônimo no público
            </span>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export const HeaderSection = ({ detail }: { detail: AdminCommunityContentAnalyticsDetail }) => (
  <section className={cn(cardClass, "p-5")}>
    <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        <h1 className="max-w-4xl text-2xl font-black leading-tight tracking-[-0.03em] text-foreground sm:text-3xl">
          Detalhes do conteúdo
        </h1>
        <p className="mt-2 text-sm font-bold text-muted">
          {getContentStatusCopy(detail.content.status).createdAtLabel}{" "}
          {formatDateTime(detail.content.created_at)}
        </p>
      </div>
      <ContentStatusBadge status={detail.content.status} />
    </div>
  </section>
);

export const ContentVideoPreview = ({ label, src }: { label: string; src: string }) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const togglePlayback = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      void video.play().catch(() => undefined);
      return;
    }

    video.pause();
  };

  return (
    <div className="relative mx-auto aspect-[9/16] w-full max-w-[220px] overflow-hidden rounded-[20px] border border-border bg-media-background xl:ml-0 xl:mr-auto">
      <AdminStreamVideo
        aria-label={label}
        className="h-full w-full object-contain"
        controls
        controlsList="nodownload noplaybackrate noremoteplayback"
        disablePictureInPicture
        onEnded={() => setIsPlaying(false)}
        onPause={() => setIsPlaying(false)}
        onPlay={() => setIsPlaying(true)}
        playsInline
        preload="metadata"
        ref={videoRef}
        src={src}
      />
      {!isPlaying ? (
        <button
          aria-label="Reproduzir vídeo do conteúdo"
          className="absolute left-1/2 top-1/2 inline-flex h-10 w-10 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-surface/90 text-foreground shadow-sm transition hover:bg-surface"
          onClick={togglePlayback}
          type="button"
        >
          <Play aria-hidden className="h-4 w-4 fill-current" />
        </button>
      ) : null}
    </div>
  );
};

export const ContentMediaPreview = ({
  detail,
}: {
  detail: AdminCommunityContentAnalyticsDetail;
}) => {
  const media = detail.content.media;
  if (!media) return null;

  const mediaType = media.media_type.toLowerCase();
  const imageSrc = mediaType === "image" ? renderableImageSrc(media.media_url) : null;
  const videoSrc = mediaType === "video" ? resolveAdminMediaUrl(media.media_url) : null;

  if (imageSrc) {
    return (
      <div className="relative h-56 w-full overflow-hidden rounded-[20px] border border-border bg-surface-muted sm:h-64">
        <Image
          alt={`Mídia de ${contentTitle(detail)}`}
          className="object-contain"
          fill
          sizes="(max-width: 768px) 100vw, 640px"
          src={imageSrc}
          unoptimized={isAdminPublicMediaUrl(media.media_url)}
        />
      </div>
    );
  }

  if (videoSrc)
    return <ContentVideoPreview label={`Vídeo de ${contentTitle(detail)}`} src={videoSrc} />;

  return (
    <div className="grid min-h-48 place-items-center rounded-[24px] border border-border bg-surface-muted p-6 text-center text-sm font-bold text-muted">
      Mídia registrada, mas indisponível para visualização no painel.
    </div>
  );
};

export const ContentDetailMetricRow = ({
  detail,
}: {
  detail: AdminCommunityContentAnalyticsDetail;
}) => (
  <div className="mt-5 border-t border-border pt-3">
    <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs font-bold text-muted">
      {contentDetailMetricRowItems(detail).map((metric) => {
        const Icon = metric.icon;

        return (
          <span className="inline-flex items-center gap-1.5" key={metric.id}>
            {Icon ? <Icon aria-hidden className="h-4 w-4" /> : <WhatsAppIcon aria-hidden />}
            {formatCount(metric.value)} {metric.label}
          </span>
        );
      })}
    </div>
    <fieldset className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
      <legend className="sr-only">Detalhamento dos comentários do conteúdo</legend>
      {contentCommentBreakdownItems(detail).map((item) => (
        <article
          className="min-w-0 rounded-2xl border border-border/70 bg-surface-muted/40 px-3 py-3"
          key={item.id}
        >
          <p className="min-h-10 text-[11px] font-black uppercase leading-5 tracking-[0.12em] text-muted">
            {item.label}
          </p>
          <p className="mt-1 flex items-baseline gap-1.5 text-lg font-black text-foreground">
            <span>{formatCount(item.value)}</span>
            {"rate" in item ? (
              <span className="text-xs font-semibold text-muted">({item.rate})</span>
            ) : null}
          </p>
        </article>
      ))}
    </fieldset>
  </div>
);

export const PreviewSection = ({ detail }: { detail: AdminCommunityContentAnalyticsDetail }) => {
  const publicHref = detail.content.public_url
    ? toPublicFrontendHref(detail.content.public_url)
    : null;
  const hasMedia = Boolean(detail.content.media);
  const isPost = detail.content.type === "post";
  const originPreview = isPost ? detail.content.origin_preview : null;

  return (
    <section className={cn(cardClass, "relative min-w-0 max-w-full p-5")}>
      {publicHref ? (
        <Link
          aria-label="Visualizar post no site público"
          className="absolute right-5 top-5 inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-surface text-primary shadow-control transition hover:border-primary hover:bg-primary-soft"
          href={publicHref}
          rel="noreferrer"
          target="_blank"
          title="Visualizar post no site público"
        >
          <Eye aria-hidden className="h-5 w-5" />
        </Link>
      ) : null}
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2 pr-12 text-xs font-black text-muted">
          <FileText aria-hidden className="h-4 w-4" />
          <span>{contentTypeLabel(detail)}</span>
          <span aria-hidden>·</span>
          <span>{detail.community.name}</span>
        </div>
        {detail.content.status === "blocked" ? (
          <div className="mt-4 flex gap-3 rounded-2xl border border-danger/20 bg-danger/10 p-4 text-sm font-bold leading-6 text-danger">
            <AlertTriangle aria-hidden className="mt-0.5 h-4 w-4 shrink-0" />
            <p>
              Este post foi bloqueado automaticamente e está visível apenas no Admin. Ele não
              aparece no feed público, não recebe interações públicas e não disparou notificação de
              nova postagem.
            </p>
          </div>
        ) : null}
        <div className="mt-4">
          <AuthorIdentity author={detail.author} />
        </div>
        {isPost ? (
          <h2 className="mt-5 min-w-0 text-xl font-black leading-tight text-foreground [overflow-wrap:anywhere]">
            {contentTitle(detail)}
          </h2>
        ) : null}
        <div
          className={cn(
            "mt-4 grid min-w-0 gap-5",
            hasMedia && "xl:grid-cols-[minmax(0,240px)_minmax(0,1fr)] xl:items-start",
          )}
        >
          {hasMedia ? (
            <div className="min-w-0 xl:justify-self-start">
              <ContentMediaPreview detail={detail} />
            </div>
          ) : null}
          <div className="min-w-0">
            {originPreview ? (
              <div className="rounded-2xl border border-border bg-surface-muted p-4">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-muted">
                  {originPreview.label}
                </p>
                <p className="mt-2 text-sm font-black text-foreground [overflow-wrap:anywhere]">
                  {originPreview.title || "Sem título"}
                </p>
                <p className="mt-1 line-clamp-3 text-sm leading-6 text-muted [overflow-wrap:anywhere]">
                  {originPreview.excerpt || "Sem trecho disponível."}
                </p>
              </div>
            ) : null}
            <p
              className={cn(
                "whitespace-pre-line text-sm leading-6 text-foreground [overflow-wrap:anywhere]",
                originPreview && "mt-5",
              )}
            >
              {detail.content.body || detail.content.excerpt || "Sem texto disponível."}
            </p>
          </div>
        </div>
        <ContentDetailMetricRow detail={detail} />
      </div>
    </section>
  );
};
