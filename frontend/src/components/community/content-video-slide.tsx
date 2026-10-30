"use client";

import { useQueryClient } from "@tanstack/react-query";
import { ArrowUp, Bookmark, MessageCircle, Play, Share2, VolumeX } from "lucide-react";
import Link from "next/link";
import { type RefObject, useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useSavePost, useSaveReply, useVotePost } from "@/api/callers/posts";
import type { PostContentVideo } from "@/api/generator/types/posts";
import { confirmDiscardReplyDraft } from "@/app/app/community/[slug]/post/[id]/modules/reply-support";
import { useContentVideoWatchTracking } from "@/components/analytics/content-video-watch-tracker";
import { useProgressiveConversion } from "@/components/conversion/progressive-conversion-provider";
import { PsychologistWhatsAppRedirectButton } from "@/components/psychologists/psychologist-whatsapp-redirect-button";
import { VerticalVideoPlayer } from "@/components/ui/vertical-video-player";
import { WhatsAppIcon } from "@/components/ui/whatsapp-icon";
import { useLectumDirectShare } from "@/hooks/use-lectum-direct-share";
import { playVideoWithActiveDocument } from "@/lib/video-playback";
import {
  getVideoSoundEnabled,
  getVideoSoundPreferenceRevision,
  setVideoSoundEnabledByUser,
  subscribeVideoSoundPreference,
} from "@/lib/video-sound-preference";
import { getCommunityAuthorDisplayName } from "@/utils/community-display";
import { resolvePublicMediaUrl } from "@/utils/media";
import {
  publicCommunityPostFocusedReplyHref,
  publicCommunityPostHref,
} from "@/utils/public-routes";
import { toCommunityWhatsAppIdentity } from "./community-whatsapp-cta";
import { ContentVideoAuthor } from "./content-video-author";
import { ContentVideoCommentsSheet } from "./content-video-comments-sheet";
import controls from "./content-video-controls.module.css";
import { ContentVideoHeader } from "./content-video-header";
import {
  ContentVideoInlineComposer,
  type ContentVideoInlineComposerState,
} from "./content-video-inline-composer";
import { refreshContentVideoInteraction } from "./content-video-interaction-refresh";
import { ReadingText } from "./content-video-reading-text";
import styles from "./content-video-viewer.module.css";

type Panel = "caption" | "parent" | "comments" | null;

export const ContentVideoSlide = ({
  item,
  active,
  initialTime,
  changedDiscussion,
  onNext,
  onPrevious,
  onClose,
  createPostOpen,
  onCreatePost,
  closeRef,
  onInteraction,
  onPanelChange,
  onSeekingChange,
}: {
  item: PostContentVideo;
  active: boolean;
  initialTime: number;
  changedDiscussion: boolean;
  onNext: () => void;
  onPrevious: () => void;
  onClose: () => void;
  createPostOpen: boolean;
  onCreatePost: () => void;
  closeRef: RefObject<HTMLButtonElement | null>;
  onInteraction: (patch: Partial<PostContentVideo>) => void;
  onPanelChange: (open: boolean) => void;
  onSeekingChange: (seeking: boolean) => void;
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const activeRef = useRef(active);
  const audioAttempt = useRef(0);
  const blockedSoundRevision = useRef<number | null>(null);
  const manuallyPaused = useRef(false);
  useLayoutEffect(() => {
    activeRef.current = active;
    blockedSoundRevision.current = null;
    manuallyPaused.current = false;
    if (!active) videoRef.current?.pause();
    return () => {
      activeRef.current = false;
      videoRef.current?.pause();
      audioAttempt.current += 1;
    };
  }, [active]);
  const [panel, setPanel] = useState<Panel>(null);
  const panelRef = useRef<Panel>(null);
  const [paused, setPaused] = useState(false);
  const [muted, setMuted] = useState(() => !getVideoSoundEnabled());
  const [time, setTime] = useState(initialTime);
  const [duration, setDuration] = useState(0);
  const [seeking, setSeeking] = useState(false);
  const seekingRef = useRef(false);
  const seekPointer = useRef<number | null>(null);
  const { current_user_vote: vote, upvotes_count: upvotes, saved } = item;
  const queryClient = useQueryClient();
  const [interactionSync, setInteractionSync] = useState<"idle" | "pending" | "error">("idle");
  const syncController = useRef<AbortController | null>(null);
  const syncingInteractions = interactionSync !== "idle";
  const [actionError, setActionError] = useState(false);
  const [composerState, setComposerState] = useState<ContentVideoInlineComposerState>({
    busy: false,
    hasDraft: false,
    submitting: false,
  });
  const composerBusyRef = useRef(false);
  const createPostOpenRef = useRef(createPostOpen);
  useLayoutEffect(() => {
    createPostOpenRef.current = createPostOpen;
    if (createPostOpen) videoRef.current?.pause();
  }, [createPostOpen]);
  const onComposerBusyChange = useCallback((busy: boolean) => {
    composerBusyRef.current = busy;
    if (busy) videoRef.current?.pause();
  }, []);
  useEffect(() => {
    if (active)
      onPanelChange(Boolean(panel) || syncingInteractions || composerState.busy || createPostOpen);
  }, [active, panel, syncingInteractions, composerState.busy, createPostOpen, onPanelChange]);
  const canLeave = () =>
    !composerState.submitting && (!composerState.hasDraft || confirmDiscardReplyDraft());
  const requestClose = () => {
    if (canLeave()) onClose();
  };
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
    try {
      const patch = await refreshContentVideoInteraction(queryClient, item, controller.signal);
      if (controller.signal.aborted) return;
      onInteraction(patch);
      setInteractionSync("idle");
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
    const eligible = () =>
      !manuallyPaused.current &&
      !composerBusyRef.current &&
      !createPostOpenRef.current &&
      activeRef.current &&
      !panelRef.current &&
      !seekingRef.current &&
      videoRef.current === video;
    if (!eligible()) return;
    const attempt = ++audioAttempt.current;
    const revision = getVideoSoundPreferenceRevision();
    video.muted = !getVideoSoundEnabled() || blockedSoundRevision.current === revision;
    setMuted(video.muted);
    let autoplayBlocked = false;
    const started = await playVideoWithActiveDocument(video, {
      onAutoplayBlocked: () => {
        autoplayBlocked = true;
      },
    });
    if (!eligible()) {
      video.pause();
      return;
    }
    if (attempt !== audioAttempt.current || revision !== getVideoSoundPreferenceRevision()) return;
    if (!started && autoplayBlocked && video.paused && !video.muted) {
      blockedSoundRevision.current = revision;
      video.muted = true;
      setMuted(true);
      await playVideoWithActiveDocument(video);
      if (!eligible()) video.pause();
    }
  }, []);

  useEffect(
    () =>
      subscribeVideoSoundPreference((enabled) => {
        audioAttempt.current += 1;
        if (videoRef.current) videoRef.current.muted = !enabled;
        setMuted(!enabled);
        if (enabled) void play();
      }),
    [play],
  );

  useEffect(() => {
    if (active) void play();
    else videoRef.current?.pause();
    return () => videoRef.current?.pause();
  }, [active, play]);

  const changePanel = (next: Panel) => {
    if (syncingInteractions) return;
    const closingComments = panel === "comments" && next !== "comments";
    panelRef.current = next;
    const video = videoRef.current;
    if (next && !panel) {
      resumeAfterPanel.current = Boolean(video && !video.paused);
      video?.pause();
    }
    setPanel(next);
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
    manuallyPaused.current = !video?.paused;
    if (video?.paused) void play();
    else video?.pause();
  };

  const seekFromPointer = (input: HTMLInputElement, clientX: number) => {
    const bounds = input.getBoundingClientRect();
    if (!duration || !bounds.width) return;
    const ratio = Math.min(1, Math.max(0, (clientX - bounds.left) / bounds.width));
    const next = ratio * duration;
    if (videoRef.current) videoRef.current.currentTime = next;
    setTime(next);
  };

  const author = <ContentVideoAuthor author={item.author} onClose={onClose} />;

  return (
    <fieldset
      className={styles.stage}
      data-reels-active={active ? "true" : undefined}
      data-reels-reading-open={panel ? "true" : undefined}
      aria-label="Vídeo atual"
      onClickCapture={(event) => {
        if ((event.target as HTMLElement).closest("a[href]") && !canLeave()) {
          event.preventDefault();
          event.stopPropagation();
        }
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape" && panel) {
          event.preventDefault();
          event.stopPropagation();
          changePanel(null);
          return;
        }
        if (
          event.defaultPrevented ||
          (event.target as HTMLElement).closest("input,textarea,select,[contenteditable]") ||
          composerState.busy ||
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
          requestClose();
        }
      }}
      onTouchStart={(event) => {
        suppressClick.current = false;
        if (
          panel ||
          composerState.busy ||
          syncingInteractions ||
          (event.target as HTMLElement).closest(
            "button:not([data-lectum-video-surface]),a,input,textarea,[contenteditable],[data-reels-reading],[data-content-video-inline-composer]",
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
        if (Math.abs(dy) < 8 || Math.abs(dy) <= Math.abs(point.clientX - start.x)) return;
        suppressClick.current = true;
      }}
      onTouchCancel={() => {
        if (!touch.current) return;
        touch.current = null;
        suppressClick.current = true;
      }}
    >
      <div className={controls.videoViewport}>
        <VerticalVideoPlayer
          className={styles.player}
          controls={false}
          fit="cover"
          onContentClick={togglePlayback}
          onSoundEnabledChange={setVideoSoundEnabledByUser}
          onVideoElementReady={ready}
          src={resolvePublicMediaUrl(item.media_url) ?? item.media_url}
          title={item.title || "Vídeo de conteúdo"}
          videoProps={{
            loop: true,
            muted,
            onLoadedMetadata: (event) => {
              const video = event.currentTarget;
              if (initialTime > 0 && initialTime < video.duration) video.currentTime = initialTime;
              setDuration(Number.isFinite(video.duration) ? video.duration : 0);
              void play();
            },
            onTimeUpdate: (event) => setTime(event.currentTarget.currentTime),
            onCanPlay: (event) => {
              if (event.currentTarget.paused) void play();
            },
            onPlay: (event) => {
              if (
                !activeRef.current ||
                panelRef.current ||
                seekingRef.current ||
                composerBusyRef.current ||
                createPostOpenRef.current
              )
                event.currentTarget.pause();
              else if (manuallyPaused.current) event.currentTarget.pause();
              else setPaused(false);
            },
            onPause: () => setPaused(true),
            onVolumeChange: (event) => setMuted(event.currentTarget.muted),
          }}
        />
        <div className={styles.shade} />
        {panel === "parent" || panel === "caption" ? (
          <div className={styles.readingShade} data-panel={panel} aria-hidden="true" />
        ) : null}
        <ContentVideoHeader
          backRef={active ? closeRef : undefined}
          disabled={composerState.submitting}
          contextAvailable={Boolean(item.responding_to)}
          contextOpen={panel === "parent"}
          contextChanged={active && changedDiscussion}
          onBack={requestClose}
          onToggleContext={() => changePanel(panel === "parent" ? null : "parent")}
          onCreate={() => {
            if (!canLeave()) return;
            videoRef.current?.pause();
            onCreatePost();
          }}
        />
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
              setVideoSoundEnabledByUser(true);
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
                <ArrowUp aria-hidden strokeWidth={vote === 1 ? 3.2 : 2} />
                <span>{upvotes}</span>
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
                <Share2 className={styles.shareIcon} aria-hidden />
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
                  <span className={styles.contactGlyph}>
                    <WhatsAppIcon aria-hidden />
                  </span>
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
            <ReadingText>
              <div className={styles.community}>
                {item.community.name} ·{" "}
                {item.responding_to.id === item.post_id
                  ? "Post original"
                  : "Comentário nesta discussão"}
              </div>
              {item.responding_to.title ? <h2>{item.responding_to.title}</h2> : null}
              {item.responding_to.content}
            </ReadingText>
            <Link className={styles.discussionLink} href={href} onClick={onClose}>
              Ver discussão completa
            </Link>
          </div>
        ) : null}
        {panel === "caption" ? (
          <div className={`${styles.reading} ${styles.expandedCaption}`} data-reels-reading>
            <div className={styles.readingHeading}>
              <div>{author}</div>
              <button className={styles.collapse} onClick={() => changePanel(null)} type="button">
                menos
              </button>
            </div>
            <ReadingText>{item.content}</ReadingText>
          </div>
        ) : null}
        <div className={styles.progress} data-seeking={seeking || undefined}>
          <div className={styles.progressTrack} aria-hidden="true">
            <span
              className={styles.progressFill}
              style={{
                transform: `scaleX(${duration ? Math.min(1, Math.max(0, time / duration)) : 0})`,
              }}
            />
          </div>
          <input
            className={styles.progressInput}
            aria-label="Progresso do vídeo"
            type="range"
            min={0}
            max={duration || 1}
            step={0.1}
            value={Math.min(time, duration || 1)}
            disabled={!duration || Boolean(panel)}
            onPointerDown={(event) => {
              event.stopPropagation();
              event.preventDefault();
              if (!event.isPrimary || event.button !== 0) return;
              seekPointer.current = event.pointerId;
              event.currentTarget.setPointerCapture(event.pointerId);
              seekingRef.current = true;
              setSeeking(true);
              onSeekingChange(true);
              resumeAfterSeek.current = Boolean(videoRef.current && !videoRef.current.paused);
              videoRef.current?.pause();
              seekFromPointer(event.currentTarget, event.clientX);
            }}
            onPointerMove={(event) => {
              if (seekPointer.current !== event.pointerId || !seekingRef.current) return;
              event.stopPropagation();
              event.preventDefault();
              seekFromPointer(event.currentTarget, event.clientX);
            }}
            onChange={(event) => {
              const next = Number(event.target.value);
              if (videoRef.current) videoRef.current.currentTime = next;
              setTime(next);
            }}
            onPointerUp={(event) => {
              if (seekPointer.current !== event.pointerId || !seekingRef.current) return;
              event.stopPropagation();
              event.preventDefault();
              seekFromPointer(event.currentTarget, event.clientX);
              if (event.currentTarget.hasPointerCapture(event.pointerId))
                event.currentTarget.releasePointerCapture(event.pointerId);
              seekingRef.current = false;
              seekPointer.current = null;
              setSeeking(false);
              onSeekingChange(false);
              if (resumeAfterSeek.current) void play();
              resumeAfterSeek.current = false;
            }}
            onPointerCancel={(event) => {
              event.stopPropagation();
              if (seekPointer.current !== event.pointerId || !seekingRef.current) return;
              seekingRef.current = false;
              seekPointer.current = null;
              setSeeking(false);
              onSeekingChange(false);
              if (resumeAfterSeek.current) void play();
              resumeAfterSeek.current = false;
            }}
            onWheel={(event) => event.stopPropagation()}
          />
        </div>
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
      </div>
      <div className={controls.composerSlot} inert={Boolean(panel) || createPostOpen}>
        <ContentVideoInlineComposer
          item={item}
          active={active}
          onBusyChange={onComposerBusyChange}
          onStateChange={setComposerState}
          onSubmitted={async () => {
            syncController.current?.abort();
            const controller = new AbortController();
            syncController.current = controller;
            const patch = await refreshContentVideoInteraction(
              queryClient,
              item,
              controller.signal,
            );
            onInteraction(patch);
          }}
        />
      </div>
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
