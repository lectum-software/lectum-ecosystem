"use client";

import { useQueryClient } from "@tanstack/react-query";
import {
  ArrowUp,
  Bookmark,
  ChevronDown,
  ChevronUp,
  MessageCircle,
  Play,
  Share2,
  VolumeX,
  X,
} from "lucide-react";
import Link from "next/link";
import { type RefObject, useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useSavePost, useSaveReply, useVotePost } from "@/api/callers/posts";
import type { PostContentVideo } from "@/api/generator/types/posts";
import { useContentVideoWatchTracking } from "@/components/analytics/content-video-watch-tracker";
import { useProgressiveConversion } from "@/components/conversion/progressive-conversion-provider";
import { PsychologistWhatsAppRedirectButton } from "@/components/psychologists/psychologist-whatsapp-redirect-button";
import { VerifiedBadgeIcon } from "@/components/ui/verified-badge";
import { VerticalVideoPlayer } from "@/components/ui/vertical-video-player";
import { useExpandedVideoViewport } from "@/components/ui/vertical-video-player-content-expansion";
import { WhatsAppIcon } from "@/components/ui/whatsapp-icon";
import { useLectumDirectShare } from "@/hooks/use-lectum-direct-share";
import { useModalMediaSuspension } from "@/hooks/use-modal-media-suspension";
import { useModalScrollLock } from "@/hooks/use-modal-scroll-lock";
import { playVideoWithActiveDocument } from "@/lib/video-playback";
import { getCommunityAuthorDisplayName } from "@/utils/community-display";
import { resolvePublicMediaUrl } from "@/utils/media";
import {
  publicCommunityPostFocusedReplyHref,
  publicCommunityPostHref,
} from "@/utils/public-routes";
import { toCommunityWhatsAppIdentity } from "./community-whatsapp-cta";
import { ContentVideoCommentsSheet } from "./content-video-comments-sheet";
import { type ContentVideoSourceEntry, useContentVideoSource } from "./content-video-context";
import { refreshContentVideoInteraction } from "./content-video-interaction-refresh";
import styles from "./content-video-viewer.module.css";
import { FeedFavoriteButton } from "./feed-favorite-button";
import { contentVideoKey, useContentVideoQueue } from "./use-content-video-queue";

type Panel = "caption" | "parent" | "comments" | null;

const VideoSlide = ({
  item,
  initialTime,
  changedDiscussion,
  onNext,
  onPrevious,
  onClose,
  closeRef,
  onInteraction,
  onPanelChange,
}: {
  item: PostContentVideo;
  initialTime: number;
  changedDiscussion: boolean;
  onNext: () => void;
  onPrevious: () => void;
  onClose: () => void;
  closeRef: RefObject<HTMLButtonElement | null>;
  onInteraction: (patch: Partial<PostContentVideo>) => void;
  onPanelChange: (open: boolean) => void;
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [panel, setPanel] = useState<Panel>(null);
  const [paused, setPaused] = useState(false);
  const [muted, setMuted] = useState(false);
  const [time, setTime] = useState(initialTime);
  const [duration, setDuration] = useState(0);
  const { current_user_vote: vote, upvotes_count: upvotes, saved } = item;
  const queryClient = useQueryClient();
  const [interactionSync, setInteractionSync] = useState<"idle" | "pending" | "error">("idle");
  const syncController = useRef<AbortController | null>(null);
  const syncingInteractions = interactionSync !== "idle";
  const [actionError, setActionError] = useState(false);
  const resumeAfterPanel = useRef(false);
  const resumeAfterSeek = useRef(false);
  const touch = useRef<{ x: number; y: number } | null>(null);
  const suppressClick = useRef(false);
  const voteMutation = useVotePost(item.post_id);
  const conversion = useProgressiveConversion();
  const postSave = useSavePost(item.post_id);
  const replySave = useSaveReply(item.post_id, item.reply_id ?? "");
  const { shareLectumTarget, isSharing } = useLectumDirectShare();
  const trackVideo = useContentVideoWatchTracking({
    targetId: item.reply_id ?? item.post_id,
    targetType: item.reply_id ? "reply" : "post",
    videoUrl: item.media_url,
  });
  const href = item.reply_id
    ? publicCommunityPostFocusedReplyHref(item.community.slug, item.post_id, item.reply_id)
    : publicCommunityPostHref(item.community.slug, item.post_id);

  useEffect(() => () => syncController.current?.abort(), []);

  const refreshInteractions = async () => {
    syncController.current?.abort();
    const controller = new AbortController();
    syncController.current = controller;
    setInteractionSync("pending");
    onPanelChange(true);
    try {
      const patch = await refreshContentVideoInteraction(queryClient, item, controller.signal);
      if (controller.signal.aborted) return;
      onInteraction(patch);
      setInteractionSync("idle");
      onPanelChange(false);
    } catch {
      if (!controller.signal.aborted) setInteractionSync("error");
    }
  };

  const ready = useCallback(
    (video: HTMLVideoElement | null) => {
      videoRef.current = video;
      trackVideo(video);
    },
    [trackVideo],
  );

  const play = useCallback(async () => {
    const video = videoRef.current;
    if (!video) return;
    const started = await playVideoWithActiveDocument(video);
    if (!started && video.paused && !video.muted) {
      video.muted = true;
      setMuted(true);
      await playVideoWithActiveDocument(video);
    }
  }, []);

  const changePanel = (next: Panel) => {
    if (syncingInteractions) return;
    const closingComments = panel === "comments" && next !== "comments";
    const video = videoRef.current;
    if (next && !panel) {
      resumeAfterPanel.current = Boolean(video && !video.paused);
      video?.pause();
    }
    setPanel(next);
    onPanelChange(Boolean(next) || closingComments);
    if (closingComments) void refreshInteractions();
    if (!next && resumeAfterPanel.current) {
      resumeAfterPanel.current = false;
      window.requestAnimationFrame(() => {
        void play();
      });
    }
  };

  const togglePlayback = () => {
    if (suppressClick.current) {
      suppressClick.current = false;
      return;
    }
    if (panel) {
      changePanel(null);
      return;
    }
    const video = videoRef.current;
    if (video?.paused) void play();
    else video?.pause();
  };

  const author = (
    <>
      <div className={styles.author}>
        <Link className={styles.name} href={`/psicologos/${item.author.id}`} onClick={onClose}>
          {getCommunityAuthorDisplayName(item.author)}
        </Link>
        {item.author.verified ? (
          <VerifiedBadgeIcon className={styles.badge} aria-label="Perfil verificado" />
        ) : null}
        <FeedFavoriteButton author={item.author} />
      </div>
      <div className={styles.role}>{item.author.type_label}</div>
    </>
  );

  return (
    <fieldset
      className={styles.stage}
      data-reels-reading-open={panel ? "true" : undefined}
      aria-label="Vídeo atual"
      onKeyDown={(event) => {
        if (event.key === "Escape" && panel) {
          event.preventDefault();
          event.stopPropagation();
          changePanel(null);
          return;
        }
        if (
          event.defaultPrevented ||
          event.target instanceof HTMLInputElement ||
          panel ||
          syncingInteractions
        )
          return;
        if (event.key === "ArrowDown") {
          event.preventDefault();
          onNext();
        }
        if (event.key === "ArrowUp") {
          event.preventDefault();
          onPrevious();
        }
        if (event.key === "Escape") {
          event.preventDefault();
          onClose();
        }
      }}
      onTouchStart={(event) => {
        if (
          panel ||
          syncingInteractions ||
          (event.target as HTMLElement).closest(
            "button:not([data-lectum-video-surface]),a,input,[data-reels-reading]",
          )
        )
          return;
        const point = event.touches[0];
        touch.current = point ? { x: point.clientX, y: point.clientY } : null;
      }}
      onTouchEnd={(event) => {
        const start = touch.current;
        touch.current = null;
        const point = event.changedTouches[0];
        if (!start || !point || panel || syncingInteractions) return;
        const dy = point.clientY - start.y;
        if (Math.abs(dy) < 55 || Math.abs(dy) <= Math.abs(point.clientX - start.x)) return;
        suppressClick.current = true;
        if (event.cancelable) event.preventDefault();
        if (dy < 0) onNext();
        else onPrevious();
      }}
    >
      <VerticalVideoPlayer
        className={styles.player}
        controls={false}
        fit="contain"
        onContentClick={togglePlayback}
        onVideoElementReady={ready}
        src={resolvePublicMediaUrl(item.media_url) ?? item.media_url}
        title={item.title || "Vídeo de conteúdo"}
        videoProps={{
          loop: true,
          onLoadedMetadata: (event) => {
            const video = event.currentTarget;
            if (initialTime > 0 && initialTime < video.duration) video.currentTime = initialTime;
            setDuration(Number.isFinite(video.duration) ? video.duration : 0);
            void play();
          },
          onTimeUpdate: (event) => setTime(event.currentTarget.currentTime),
          onPlay: () => setPaused(false),
          onPause: () => setPaused(true),
          onVolumeChange: (event) => setMuted(event.currentTarget.muted),
        }}
      />
      <div className={styles.shade} />
      <div className={styles.top}>
        {item.responding_to ? (
          <button
            className={`${styles.contextButton} ${changedDiscussion ? styles.contextChanged : ""}`}
            aria-expanded={panel === "parent"}
            onClick={() => changePanel(panel === "parent" ? null : "parent")}
            type="button"
          >
            Respondendo a{" "}
            {panel === "parent" ? <ChevronUp aria-hidden /> : <ChevronDown aria-hidden />}
          </button>
        ) : (
          <span />
        )}
        <button
          ref={closeRef}
          className={styles.close}
          aria-label="Fechar vídeo"
          onClick={onClose}
          type="button"
        >
          <X aria-hidden />
        </button>
      </div>
      {!panel && paused ? (
        <button
          className={styles.center}
          aria-label="Reproduzir vídeo"
          onClick={togglePlayback}
          type="button"
        >
          <Play aria-hidden />
        </button>
      ) : null}
      {!panel && !paused && muted ? (
        <button
          className={styles.center}
          aria-label="Ativar som do vídeo"
          onClick={() => {
            if (videoRef.current) videoRef.current.muted = false;
          }}
          type="button"
        >
          <VolumeX aria-hidden />
        </button>
      ) : null}
      {!panel ? (
        <>
          <div className={styles.rail}>
            <button
              className={styles.action}
              aria-label="Marcar como útil"
              aria-pressed={vote === 1}
              disabled={voteMutation.isPending || syncingInteractions}
              type="button"
              onClick={() => {
                setActionError(false);
                if (!conversion.isAuthenticated) {
                  conversion.requestConversion("trigger_voto", {
                    intent: {
                      type: item.reply_id ? "vote_reply" : "vote_post",
                      payload: {
                        postId: item.post_id,
                        ...(item.reply_id ? { replyId: item.reply_id } : {}),
                        value: 1,
                      },
                    },
                  });
                  return;
                }
                voteMutation.mutate(
                  { value: 1, ...(item.reply_id ? { replyId: item.reply_id } : {}) },
                  {
                    onSuccess: (data) => {
                      onInteraction({
                        current_user_vote: data.value,
                        upvotes_count: data.upvotes_count,
                      });
                    },
                    onError: () => setActionError(true),
                  },
                );
              }}
            >
              <ArrowUp aria-hidden />
              <span>Útil · {upvotes}</span>
            </button>
            <button
              className={styles.action}
              aria-label="Abrir comentários"
              disabled={syncingInteractions}
              type="button"
              onClick={() => changePanel("comments")}
            >
              <MessageCircle aria-hidden />
              <span>{item.replies_count}</span>
            </button>
            <button
              className={styles.action}
              aria-label={saved ? "Remover dos salvos" : "Salvar vídeo"}
              aria-pressed={saved}
              disabled={postSave.isPending || replySave.isPending || syncingInteractions}
              type="button"
              onClick={() => {
                setActionError(false);
                if (!conversion.isAuthenticated) {
                  conversion.requestConversion("trigger_salvar", {
                    intent: {
                      type: item.reply_id ? "save_reply" : "save_post",
                      payload: {
                        postId: item.post_id,
                        ...(item.reply_id ? { replyId: item.reply_id } : {}),
                      },
                    },
                  });
                  return;
                }
                const mutation = item.reply_id ? replySave : postSave;
                mutation.mutate(saved, {
                  onSuccess: (data) => {
                    onInteraction({ saved: data.saved });
                  },
                  onError: () => setActionError(true),
                });
              }}
            >
              <Bookmark fill={saved ? "currentColor" : "none"} aria-hidden />
            </button>
            <button
              className={styles.action}
              aria-label="Compartilhar vídeo"
              disabled={isSharing}
              type="button"
              onClick={() => {
                videoRef.current?.pause();
                void shareLectumTarget({
                  kind: "link",
                  postId: item.post_id,
                  replyId: item.reply_id,
                  shareUrl: `${window.location.origin}${href}`,
                  title: `${getCommunityAuthorDisplayName(item.author)} na Lectum`,
                  text: null,
                });
              }}
            >
              <Share2 aria-hidden />
            </button>
            {item.author.whatsapp_url ? (
              <PsychologistWhatsAppRedirectButton
                className={styles.contact}
                aria-label={`Fale com ${getCommunityAuthorDisplayName(item.author)} pelo WhatsApp`}
                psychologist={toCommunityWhatsAppIdentity(item.author)}
                trackingContext={{
                  pageKind: "community_post",
                  path: href,
                  targetId: item.reply_id ?? item.post_id,
                  targetType: item.reply_id ? "post_reply" : "post",
                }}
                onClick={() => videoRef.current?.pause()}
              >
                <WhatsAppIcon aria-hidden />
              </PsychologistWhatsAppRedirectButton>
            ) : null}
          </div>
          <div className={styles.identity}>
            {author}
            {item.content ? (
              <button
                className={styles.caption}
                onClick={() => changePanel("caption")}
                type="button"
              >
                <span>{item.content}</span>
                <b>mais</b>
              </button>
            ) : null}
          </div>
        </>
      ) : null}
      {panel === "parent" && item.responding_to ? (
        <div className={`${styles.reading} ${styles.parent}`} data-reels-reading>
          <div className={styles.community}>{item.community.name}</div>
          <div className={styles.scrollText}>
            {item.responding_to.title ? <h2>{item.responding_to.title}</h2> : null}
            {item.responding_to.content}
          </div>
        </div>
      ) : null}
      {panel === "caption" ? (
        <div className={`${styles.reading} ${styles.expandedCaption}`} data-reels-reading>
          {author}
          <div className={styles.scrollText}>{item.content}</div>
          <button className={styles.collapse} onClick={() => changePanel(null)} type="button">
            menos
          </button>
        </div>
      ) : null}
      <input
        className={styles.progress}
        aria-label="Progresso do vídeo"
        type="range"
        min={0}
        max={duration || 1}
        step={0.1}
        value={Math.min(time, duration || 1)}
        disabled={!duration || Boolean(panel)}
        onPointerDown={() => {
          resumeAfterSeek.current = Boolean(videoRef.current && !videoRef.current.paused);
          videoRef.current?.pause();
        }}
        onChange={(event) => {
          const next = Number(event.target.value);
          if (videoRef.current) videoRef.current.currentTime = next;
          setTime(next);
        }}
        onPointerUp={() => {
          if (resumeAfterSeek.current) void play();
          resumeAfterSeek.current = false;
        }}
        onPointerCancel={() => {
          if (resumeAfterSeek.current) void play();
          resumeAfterSeek.current = false;
        }}
      />
      {interactionSync !== "idle" ? (
        <div role={interactionSync === "error" ? "alert" : "status"} className={styles.status}>
          {interactionSync === "pending"
            ? "Atualizando interações..."
            : "Não foi possível atualizar as interações."}
          {interactionSync === "error" ? (
            <button type="button" onClick={() => void refreshInteractions()}>
              Tentar novamente
            </button>
          ) : null}
        </div>
      ) : actionError ? (
        <p role="alert" className={styles.status}>
          Não foi possível atualizar. Tente novamente.
        </p>
      ) : null}
      <ContentVideoCommentsSheet
        postId={item.post_id}
        communitySlug={item.community.slug}
        replyId={item.reply_id ?? undefined}
        open={panel === "comments"}
        onClose={() => changePanel(null)}
      />
    </fieldset>
  );
};

export const ContentVideoViewer = ({
  initial,
  initialTime = 0,
  onClose,
}: {
  initial: ContentVideoSourceEntry;
  initialTime?: number;
  onClose: () => void;
}) => {
  const source = useContentVideoSource();
  const [panelOpen, setPanelOpen] = useState(false);
  const queue = useContentVideoQueue(initial, source);
  const root = useRef<HTMLDivElement | null>(null);
  const closeRef = useRef<HTMLButtonElement | null>(null);
  const previousFocus = useRef<HTMLElement | null>(null);
  const wheelAt = useRef(0);
  const viewport = useExpandedVideoViewport(true);
  useModalScrollLock(true);
  useModalMediaSuspension(true, root);
  useEffect(() => {
    previousFocus.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    root.current?.focus({ preventScroll: true });
    return () => {
      if (previousFocus.current?.isConnected) previousFocus.current.focus({ preventScroll: true });
    };
  }, []);
  const item = queue.items[queue.index];

  return createPortal(
    <div
      ref={root}
      className={styles.dialog}
      role="dialog"
      aria-modal="true"
      aria-label="Vídeos de conteúdo"
      tabIndex={-1}
      style={
        viewport
          ? {
              top: viewport.top,
              left: viewport.left,
              width: viewport.width,
              height: viewport.height,
            }
          : undefined
      }
      onClick={(event) => event.stopPropagation()}
      onKeyDown={(event) => {
        if (event.defaultPrevented || !root.current?.contains(event.target as Node)) return;
        if (!panelOpen && !(event.target instanceof HTMLInputElement)) {
          if (event.key === "ArrowDown") {
            event.preventDefault();
            queue.next();
          } else if (event.key === "ArrowUp") {
            event.preventDefault();
            queue.previous();
          }
        }
        if (event.key === "Escape") {
          event.preventDefault();
          onClose();
        }
        if (event.key !== "Tab") return;
        const nodes = Array.from(
          root.current.querySelectorAll<HTMLElement>(
            'button:not(:disabled),a[href],input:not(:disabled),[tabindex="0"]',
          ),
        ).filter((node) => node.getClientRects().length > 0);
        const first = nodes[0];
        const last = nodes.at(-1);
        if (
          event.shiftKey &&
          (document.activeElement === first || document.activeElement === root.current)
        ) {
          event.preventDefault();
          last?.focus();
        }
        if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }}
      onWheel={(event) => {
        if (panelOpen) return;
        if (
          (event.target as HTMLElement).closest(
            '[data-reels-reading-open="true"],[data-reels-reading],[data-content-video-comments-sheet]',
          )
        )
          return;
        if (Math.abs(event.deltaY) < 30 || Date.now() - wheelAt.current < 700) return;
        wheelAt.current = Date.now();
        if (event.deltaY > 0 && (!queue.ended || queue.index < queue.items.length - 1))
          queue.next();
        else if (event.deltaY < 0) queue.previous();
      }}
    >
      {item ? (
        <VideoSlide
          key={contentVideoKey(item)}
          item={item}
          initialTime={queue.index === 0 ? initialTime : 0}
          changedDiscussion={
            queue.index > 0 && queue.items[queue.index - 1]?.post_id !== item.post_id
          }
          onNext={() => {
            if (!queue.ended || queue.index < queue.items.length - 1) queue.next();
          }}
          onPrevious={queue.previous}
          onClose={onClose}
          closeRef={closeRef}
          onInteraction={(patch) => queue.updateItem(contentVideoKey(item), patch)}
          onPanelChange={setPanelOpen}
        />
      ) : (
        <div className={styles.status} role="status">
          {queue.error ? (
            <>
              {queue.expired ? "Esta sequência expirou." : "Não foi possível carregar os vídeos."}
              <button type="button" onClick={() => void queue.retry()}>
                {queue.expired ? "Reabrir sequência" : "Tentar novamente"}
              </button>
            </>
          ) : queue.ended ? (
            "Não há outros vídeos nesta sequência."
          ) : (
            "Carregando vídeo..."
          )}
          <button type="button" onClick={onClose}>
            Fechar
          </button>
        </div>
      )}
      {item && queue.error ? (
        <div className={styles.status} role="alert">
          {queue.expired ? "Esta sequência expirou." : "Não foi possível carregar a sequência."}
          <button type="button" onClick={() => void queue.retry()}>
            {queue.expired ? "Reabrir sequência" : "Tentar novamente"}
          </button>
        </div>
      ) : null}
      <div className={styles.navigation}>
        <button
          type="button"
          aria-label="Vídeo anterior"
          disabled={panelOpen || queue.index === 0}
          onClick={queue.previous}
        >
          <ChevronUp />
        </button>
        <button
          type="button"
          aria-label="Próximo vídeo"
          disabled={panelOpen || (queue.ended && queue.index >= queue.items.length - 1)}
          onClick={queue.next}
        >
          <ChevronDown />
        </button>
      </div>
    </div>,
    document.body,
  );
};
