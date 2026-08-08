"use client";
import { AlertTriangle, Eye, FileText, Play } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { type SVGProps, useRef, useState } from "react";
import type {
  AdminCommunityContentAnalyticsDetail,
  AdminCommunityContentAuthor,
} from "@/api/req/communities";
import { isAdminPublicMediaUrl, renderableImageSrc, resolveAdminMediaUrl } from "@/lib/admin-media";
import { toPublicFrontendHref } from "@/lib/public-frontend-url";
import { cn } from "@/lib/utils";

import {
  ContentStatusBadge,
  cardClass,
  contentCommentBreakdownItems,
  contentDetailMetricRowItems,
  contentStatusCopy,
  contentTitle,
  contentTypeLabel,
  formatCount,
  formatDateTime,
  initials,
} from "../modules/content-support";

export const ContentWhatsAppIcon = ({ className, ...props }: SVGProps<SVGSVGElement>) => (
  <svg
    className={cn("h-4 w-4 shrink-0", className)}
    fill="none"
    viewBox="0 0 20 20"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <title>WhatsApp</title>
    <path
      d="M14.56 11.985C14.3125 11.8608 13.095 11.2625 12.8683 11.1791C12.6408 11.0966 12.4758 11.0558 12.31 11.3041C12.1458 11.5516 11.6708 12.1091 11.5267 12.2741C11.3825 12.44 11.2375 12.46 10.99 12.3366C10.7425 12.2116 9.94417 11.9508 8.99833 11.1075C8.2625 10.4508 7.765 9.63997 7.62083 9.39164C7.47667 9.14414 7.60583 9.00997 7.72917 8.88664C7.84083 8.77581 7.9775 8.59747 8.10083 8.45331C8.225 8.30831 8.26583 8.20497 8.34917 8.03914C8.43167 7.87414 8.39083 7.72997 8.32833 7.60581C8.26583 7.48247 7.77083 6.26247 7.565 5.76664C7.36333 5.28414 7.15917 5.34997 7.0075 5.34164C6.86333 5.33497 6.69833 5.33331 6.5325 5.33331C6.3675 5.33331 6.09917 5.39497 5.8725 5.64331C5.64583 5.89081 5.00583 6.48997 5.00583 7.70914C5.00583 8.92747 5.89333 10.105 6.01667 10.2708C6.14083 10.4358 7.76333 12.9375 10.2475 14.01C10.8383 14.265 11.2992 14.4175 11.6592 14.5308C12.2525 14.72 12.7925 14.6933 13.2183 14.6291C13.6942 14.5583 14.6833 14.03 14.89 13.4516C15.0967 12.8733 15.0967 12.3775 15.0342 12.2741C14.9725 12.1708 14.8075 12.1091 14.5592 11.985H14.56ZM10.0417 18.1541H10.0383C8.56314 18.1543 7.11507 17.7576 5.84583 17.0058L5.545 16.8275L2.4275 17.6458L3.25917 14.6058L3.06333 14.2941C2.2387 12.981 1.80245 11.4614 1.805 9.91081C1.80583 5.36914 5.50167 1.67414 10.045 1.67414C12.245 1.67414 14.3133 2.53247 15.8683 4.08914C17.418 5.63201 18.2861 7.7307 18.2792 9.91747C18.2767 14.4591 14.5817 18.1541 10.0417 18.1541ZM17.0525 2.90664C15.1979 1.03979 12.6731 -0.00695713 10.0417 -2.68403e-05C4.50917 -2.68403e-05 0.00833333 4.49414 0.005 10.0208C0.005 11.7875 0.455 13.5141 1.31417 15.0275L0 20L5.0975 18.6625C6.5981 19.5304 8.30145 19.9864 10.035 19.9841H10.0392C15.57 19.9841 20.0708 15.4916 20.0742 9.96581C20.0929 7.30066 19.0317 4.7415 17.1325 2.87164L17.0525 2.90664Z"
      fill="currentColor"
    />
  </svg>
);

export const VerifiedBadgeIcon = ({ className, ...props }: SVGProps<SVGSVGElement>) => (
  <svg
    className={cn("h-4 w-4 shrink-0 text-primary", className)}
    fill="none"
    viewBox="0 0 20 20"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <title>Perfil verificado</title>
    <path
      d="M10 1.667 12.166 3.2l2.648-.17.83 2.52 2.13 1.58-.97 2.47.97 2.47-2.13 1.58-.83 2.52-2.648-.17L10 18.333 7.834 16.8l-2.648.17-.83-2.52-2.13-1.58.97-2.47-.97-2.47 2.13-1.58.83-2.52 2.648.17L10 1.667Z"
      fill="currentColor"
    />
    <path
      d="m7.58 10.19 1.57 1.57 3.38-3.52"
      stroke="white"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.5"
    />
  </svg>
);

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
          {author.verified ? <VerifiedBadgeIcon aria-label="Perfil verificado" /> : null}
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
          {contentStatusCopy[detail.content.status].createdAtLabel}{" "}
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
      {/* biome-ignore lint/a11y/useMediaCaption: o backend ainda não expõe arquivo de legenda para vídeos de conteúdo da comunidade. */}
      <video
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
            {Icon ? <Icon aria-hidden className="h-4 w-4" /> : <ContentWhatsAppIcon aria-hidden />}
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
