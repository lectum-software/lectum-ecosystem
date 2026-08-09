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
import { useCallback, useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import type {
  AdminPsychologistPublicationItem,
  AdminPsychologistPublicationMetric,
} from "@/api/req/psychologists";
import { WhatsAppIcon } from "@/components/admin-icons";
import { renderableImageSrc, resolveAdminMediaUrl } from "@/lib/admin-media";
import { formatDateTime, formatEngagementMetricValue } from "../../support/formatters";
import { isPublicAdminMediaSrc } from "../../support/media";

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
        <WhatsAppIcon aria-hidden />
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
