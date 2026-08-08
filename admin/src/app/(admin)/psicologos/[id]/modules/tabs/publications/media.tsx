"use client";

import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  BarChart3,
  Bookmark,
  Eye,
  FileText,
  type LucideIcon,
  Maximize2,
  MessageCircle,
  Play,
  Share2,
  X,
} from "lucide-react";
import Image from "next/image";
import { type SVGProps, useCallback, useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import type {
  AdminPsychologistPublicationItem,
  AdminPsychologistPublicationMetric,
} from "@/api/req/psychologists";
import { renderableImageSrc, resolveAdminMediaUrl } from "@/lib/admin-media";
import { cn } from "@/lib/utils";
import { formatDateTime, formatEngagementMetricValue } from "../../support/formatters";
import { isPublicAdminMediaSrc } from "../../support/media";

const PublicationWhatsAppIcon = ({ className, ...props }: SVGProps<SVGSVGElement>) => (
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

const publicationMetricOrder: (keyof AdminPsychologistPublicationItem["metrics"])[] = [
  "views",
  "upvotes",
  "downvotes",
  "comments",
  "saves",
  "shares",
  "whatsapp_clicks",
  "reports",
];

const publicationMetricIcon: Partial<
  Record<keyof AdminPsychologistPublicationItem["metrics"], LucideIcon>
> = {
  comments: MessageCircle,
  downvotes: ArrowDown,
  reports: AlertTriangle,
  saves: Bookmark,
  shares: Share2,
  upvotes: ArrowUp,
  views: Eye,
};

const publicationMetricLabel: Record<keyof AdminPsychologistPublicationItem["metrics"], string> = {
  comments: "comentários",
  downvotes: "downvotes",
  reports: "denúncias",
  saves: "salvos",
  shares: "compartilhamentos",
  upvotes: "upvotes",
  views: "visualizações",
  whatsapp_clicks: "cliques WhatsApp",
};

export const PublicationVideoMiniplayer = ({ label, src }: { label: string; src: string }) => {
  const expandedVideoRef = useRef<HTMLVideoElement | null>(null);
  const fullscreenContainerRef = useRef<HTMLDivElement | null>(null);
  const videoTimeRef = useRef(0);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

  const syncInlineVideoTime = useCallback((time: number) => {
    videoTimeRef.current = time;
    const video = videoRef.current;
    if (!video || !Number.isFinite(time)) return;
    video.currentTime = time;
  }, []);

  const playVideo = () => {
    const video = videoRef.current;
    if (!video) return;

    if (video.paused) {
      void video.play();
      return;
    }

    video.pause();
  };

  const openExpandedVideo = () => {
    const video = videoRef.current;
    if (video) {
      videoTimeRef.current = video.currentTime;
      video.pause();
    }

    flushSync(() => {
      setIsExpanded(true);
    });

    const container = fullscreenContainerRef.current;
    if (container?.requestFullscreen) {
      void container.requestFullscreen().catch(() => undefined);
    }
  };

  const closeExpandedVideo = useCallback(() => {
    const expandedVideo = expandedVideoRef.current;
    if (expandedVideo) {
      syncInlineVideoTime(expandedVideo.currentTime);
      expandedVideo.pause();
    }

    if (document.fullscreenElement) {
      void document.exitFullscreen().catch(() => undefined);
    }

    setIsExpanded(false);
  }, [syncInlineVideoTime]);

  useEffect(() => {
    if (!isExpanded) return;

    const expandedVideo = expandedVideoRef.current;

    const syncExpandedVideo = () => {
      const currentTime = videoTimeRef.current;
      if (expandedVideo && Number.isFinite(currentTime)) {
        expandedVideo.currentTime = currentTime;
        void expandedVideo.play().catch(() => undefined);
      }
    };

    const handleFullscreenChange = () => {
      if (document.fullscreenElement) return;

      const currentTime = expandedVideoRef.current?.currentTime ?? videoTimeRef.current;
      syncInlineVideoTime(currentTime);
      setIsExpanded(false);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !document.fullscreenElement) {
        closeExpandedVideo();
      }
    };

    if (expandedVideo?.readyState) {
      syncExpandedVideo();
    } else {
      expandedVideo?.addEventListener("loadedmetadata", syncExpandedVideo, { once: true });
    }

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      expandedVideo?.removeEventListener("loadedmetadata", syncExpandedVideo);
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [closeExpandedVideo, isExpanded, syncInlineVideoTime]);

  return (
    <div className="relative h-full w-full bg-media-background">
      <video
        aria-label={label}
        className="admin-community-video-player h-full w-full object-cover"
        controls
        controlsList="nofullscreen noremoteplayback"
        disablePictureInPicture
        muted
        onEnded={() => setIsPlaying(false)}
        onPause={() => setIsPlaying(false)}
        onPlay={() => setIsPlaying(true)}
        onTimeUpdate={(event) => {
          videoTimeRef.current = event.currentTarget.currentTime;
        }}
        playsInline
        preload="metadata"
        ref={videoRef}
        src={src}
      />
      {!isPlaying ? (
        <button
          aria-label="Reproduzir vídeo publicado"
          className="absolute left-1/2 top-1/2 inline-flex h-11 w-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-foreground/70 text-background shadow-sm transition hover:bg-foreground"
          onClick={playVideo}
          type="button"
        >
          <Play aria-hidden className="h-5 w-5 fill-current" />
        </button>
      ) : null}
      <button
        aria-label="Ampliar vídeo publicado em 9:16"
        className="absolute right-2 top-2 inline-flex h-8 w-8 items-center justify-center rounded-full bg-foreground/70 text-background shadow-sm transition hover:bg-foreground"
        onClick={openExpandedVideo}
        title="Ampliar vídeo"
        type="button"
      >
        <Maximize2 aria-hidden className="h-4 w-4" />
      </button>
      {isExpanded ? (
        <div
          aria-label="Vídeo ampliado em 9:16"
          aria-modal="true"
          className="fixed inset-0 z-[9999] grid place-items-center bg-media-background p-4"
          ref={fullscreenContainerRef}
          role="dialog"
        >
          <button
            aria-label="Fechar vídeo ampliado"
            className="absolute right-4 top-4 z-10 inline-flex h-10 w-10 items-center justify-center rounded-full bg-media-foreground/15 text-primary-foreground shadow-sm transition hover:bg-media-foreground/25"
            onClick={closeExpandedVideo}
            title="Fechar"
            type="button"
          >
            <X aria-hidden className="h-5 w-5" />
          </button>
          <video
            aria-label={`${label} ampliado`}
            className="admin-community-video-expanded object-cover"
            controls
            controlsList="nofullscreen noremoteplayback"
            disablePictureInPicture
            muted
            onEnded={() => closeExpandedVideo()}
            onTimeUpdate={(event) => {
              videoTimeRef.current = event.currentTarget.currentTime;
            }}
            playsInline
            preload="metadata"
            ref={expandedVideoRef}
            src={src}
          />
        </div>
      ) : null}
    </div>
  );
};

const PublicationMedia = ({ item }: { item: AdminPsychologistPublicationItem }) => {
  const src = item.media?.url ?? null;
  if (!src) return null;

  const mediaType = item.media?.type?.toLowerCase() ?? "";
  const isVideo = mediaType.startsWith("video") || /\.(mp4|webm|mov|m4v)$/i.test(src ?? "");
  const imageSrc = !isVideo ? renderableImageSrc(src) : null;
  const videoSrc = isVideo ? resolveAdminMediaUrl(src) : null;
  const looksLikeImage =
    mediaType.startsWith("image") || /\.(png|jpe?g|webp|gif)$/i.test(src ?? "");
  const mediaLabel = isVideo ? "Miniplayer de vídeo publicado" : "Miniatura de mídia publicada";

  if (!imageSrc && !videoSrc) return null;

  return (
    <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-2xl border border-border bg-surface-muted text-primary">
      {imageSrc && looksLikeImage ? (
        <Image
          alt={mediaLabel}
          className="object-cover"
          fill
          sizes="56px"
          src={imageSrc}
          unoptimized={isPublicAdminMediaSrc(imageSrc)}
        />
      ) : null}
      {videoSrc ? (
        <>
          <video
            aria-label={mediaLabel}
            className="h-full w-full bg-media-background object-cover"
            muted
            playsInline
            preload="metadata"
            src={videoSrc}
          />
          <span className="absolute inset-0 grid place-items-center bg-media-background/20 text-primary-foreground">
            <Play aria-hidden className="h-5 w-5 fill-current" />
          </span>
        </>
      ) : null}
    </div>
  );
};

const PublicationMetric = ({ metric }: { metric: AdminPsychologistPublicationMetric }) => {
  const Icon =
    publicationMetricIcon[metric.id as keyof AdminPsychologistPublicationItem["metrics"]] ??
    BarChart3;
  const label =
    publicationMetricLabel[metric.id as keyof AdminPsychologistPublicationItem["metrics"]] ??
    metric.label.toLowerCase();
  const displayValue = formatEngagementMetricValue(metric);

  return (
    <span
      className="inline-flex items-center gap-1.5"
      title={metric.available ? undefined : metric.unavailable_reason || undefined}
    >
      {metric.id === "whatsapp_clicks" ? (
        <PublicationWhatsAppIcon aria-hidden />
      ) : (
        <Icon aria-hidden className="h-4 w-4" />
      )}
      {metric.available ? `${displayValue} ${label}` : `${label}: ${displayValue}`}
    </span>
  );
};

const PublicationItemHeader = ({ item }: { item: AdminPsychologistPublicationItem }) => {
  const TypeIcon = item.type === "post" ? FileText : MessageCircle;

  return (
    <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
      <TypeIcon aria-hidden className="h-4 w-4 shrink-0" />
      <span className="font-black">{item.type === "post" ? "Post" : "Resposta"}</span>
      <span aria-hidden className="font-bold">
        ·
      </span>
      <span className="font-black">{item.community.name}</span>
      <span aria-hidden className="font-bold">
        ·
      </span>
      <span className="font-bold">{formatDateTime(item.created_at)}</span>
    </div>
  );
};

const PublicationItemBody = ({ item }: { item: AdminPsychologistPublicationItem }) => {
  const hasText = item.excerpt.trim().length > 0;

  return (
    <div className="min-w-0">
      <p className="line-clamp-2 text-sm leading-5 text-muted">
        {hasText ? item.excerpt : "Sem texto."}
      </p>
    </div>
  );
};

export const PublicationItemMain = ({ item }: { item: AdminPsychologistPublicationItem }) => {
  return (
    <div className="flex min-w-0 gap-3">
      <PublicationMedia item={item} />
      <div className="min-w-0">
        <PublicationItemHeader item={item} />
        {item.type === "post" ? (
          <h3 className="mt-2 line-clamp-1 text-sm font-bold text-foreground sm:text-base">
            {item.title}
          </h3>
        ) : null}
        <div className="mt-1 min-w-0">
          <PublicationItemBody item={item} />
        </div>
      </div>
    </div>
  );
};

export const PublicationMetrics = ({ item }: { item: AdminPsychologistPublicationItem }) => (
  <div className="border-t border-border pt-3">
    <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs font-bold text-muted">
      {publicationMetricOrder.map((metricId) => {
        const metric = item.metrics[metricId];

        return <PublicationMetric key={metric.id} metric={metric} />;
      })}
    </div>
  </div>
);
