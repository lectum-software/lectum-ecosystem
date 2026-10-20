"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import type { PsychologistAnalyticsCommunityHighlight } from "@/api/generator/types/psychologist-analytics";
import { useVideoPlaybackSource } from "@/hooks/video-stream";
import { resolvePublicMediaUrl } from "@/utils/media";
import { isVideoAssetReference } from "@/utils/video-stream";
import { createVideoPosterObjectUrl } from "@/utils/video-thumbnail";

export function isTextHighlight(item: PsychologistAnalyticsCommunityHighlight) {
  return (
    !item.media_type?.startsWith("video") &&
    !resolvePublicMediaUrl(item.media_url) &&
    !resolvePublicMediaUrl(item.thumbnail_url)
  );
}

function Poster({ source }: { source?: string | null }) {
  const [failed, setFailed] = useState<string | null>(null);
  return source && failed !== source ? (
    <Image
      src={source}
      alt=""
      fill
      sizes="(min-width: 768px) 120px, 108px"
      className="object-cover"
      unoptimized
      onError={() => setFailed(source)}
    />
  ) : (
    <span className="absolute inset-0 grid place-items-center text-xs text-muted">
      Prévia indisponível
    </span>
  );
}

function StreamPoster({ source, enabled }: { source: string; enabled: boolean }) {
  const playback = useVideoPlaybackSource(source, null, enabled);
  return <Poster source={playback.poster} />;
}

function FilePoster({ source, enabled }: { source: string; enabled: boolean }) {
  const [poster, setPoster] = useState<{ source: string; url: string } | null>(null);
  useEffect(() => {
    if (!enabled) return;
    let active = true;
    let url: string | null = null;
    void createVideoPosterObjectUrl(source).then((result) => {
      if (!active) {
        if (result) URL.revokeObjectURL(result);
        return;
      }
      url = result;
      if (result) setPoster({ source, url: result });
    });
    return () => {
      active = false;
      if (url) URL.revokeObjectURL(url);
    };
  }, [source, enabled]);
  return <Poster source={poster?.source === source ? poster.url : null} />;
}

export function CommunityHighlightMedia({
  item,
  isReply,
}: {
  item: PsychologistAnalyticsCommunityHighlight;
  isReply: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "100px" },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  const video = item.media_type?.startsWith("video");
  const source = resolvePublicMediaUrl(item.media_url);
  const thumbnail = resolvePublicMediaUrl(item.thumbnail_url);
  const stream = video && isVideoAssetReference(item.media_url);
  return (
    <div
      ref={ref}
      className={`absolute inset-0 ${isTextHighlight(item) ? "bg-transparent" : "bg-surface-muted"}`}
    >
      {stream && item.media_url ? (
        <StreamPoster source={item.media_url} enabled={visible} />
      ) : video && source ? (
        <FilePoster source={source} enabled={visible} />
      ) : thumbnail || (!video && source) ? (
        <Poster source={thumbnail || source} />
      ) : video ? (
        <Poster />
      ) : (
        <div className="grid content-start gap-2 p-3 pb-12">
          {!isReply && item.title ? (
            <p className="line-clamp-3 text-xs font-extrabold leading-4 text-foreground">
              {item.title}
            </p>
          ) : null}
          <p
            className={`${isReply ? "line-clamp-6" : "line-clamp-3"} text-xs leading-4 text-foreground`}
          >
            {item.excerpt || (isReply ? item.title : "") || "Ver conteúdo"}
          </p>
        </div>
      )}
    </div>
  );
}
