"use client";
import { ArrowDown, ArrowUp } from "lucide-react";
import { type CSSProperties, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useProgressiveConversion } from "@/components/conversion/progressive-conversion-provider";
import { useExpandedVideoViewport } from "@/components/ui/vertical-video-player-content-expansion";
import { useModalMediaSuspension } from "@/hooks/use-modal-media-suspension";
import { useModalScrollLock } from "@/hooks/use-modal-scroll-lock";
import {
  type ContentVideoRequest,
  type ContentVideoSourceEntry,
  useContentVideoSource,
} from "./content-video-context";
import { ContentVideoCreatePost } from "./content-video-create-post";
import { useContentVideoDiscussionChanges } from "./content-video-interaction-refresh";
import { ContentVideoSlide } from "./content-video-slide";
import styles from "./content-video-viewer.module.css";
import { contentVideoKey, useContentVideoQueue } from "./use-content-video-queue";
import { useContentVideoScroll } from "./use-content-video-scroll";

export const ContentVideoViewer = ({
  initial,
  initialTime = 0,
  onClose,
  onNavigate,
}: {
  initial: ContentVideoSourceEntry;
  initialTime?: number;
  onClose: () => void;
  onNavigate: (request: ContentVideoRequest) => void;
}) => {
  const source = useContentVideoSource();
  const [panelOpen, setPanelOpen] = useState(false);
  const [seeking, setSeeking] = useState(false);
  const [createPostOpen, setCreatePostOpen] = useState(false);
  const conversion = useProgressiveConversion();
  const queue = useContentVideoQueue(initial, source);
  useContentVideoDiscussionChanges(queue.invalidateDiscussion);
  const root = useRef<HTMLDivElement | null>(null);
  const closeRef = useRef<HTMLButtonElement | null>(null);
  const previousFocus = useRef<HTMLElement | null>(null);
  const viewport = useExpandedVideoViewport(true);
  const { feedRef, onScroll, scrollTo } = useContentVideoScroll({
    index: queue.index,
    count: Math.max(1, queue.items.length + (queue.ended ? 0 : 1)),
    locked: panelOpen || seeking || createPostOpen,
    onSelect: queue.select,
  });
  const next = () => scrollTo(queue.index + 1);
  const previous = () => scrollTo(queue.index - 1);
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
  const focusPageKey = item ? contentVideoKey(item) : `loading:${queue.index}`;

  useLayoutEffect(() => {
    void focusPageKey;
    const focused = document.activeElement;
    if (
      focused === document.body ||
      (focused instanceof HTMLElement &&
        root.current?.contains(focused) &&
        focused.closest("[inert]"))
    ) {
      root.current?.focus({ preventScroll: true });
    }
  }, [focusPageKey]);

  return createPortal(
    <div
      ref={root}
      className={styles.dialog}
      role="dialog"
      aria-modal="true"
      aria-label="Vídeos de conteúdo"
      tabIndex={-1}
      style={
        {
          "--viewer-height": viewport ? `${viewport.height}px` : "100dvh",
          ...(viewport
            ? {
                top: viewport.top,
                left: viewport.left,
                width: viewport.width,
                height: viewport.height,
              }
            : {}),
        } as CSSProperties
      }
      onClick={(event) => event.stopPropagation()}
      onKeyDown={(event) => {
        if (createPostOpen) return;
        if (event.defaultPrevented || !root.current?.contains(event.target as Node)) return;
        if (
          event.key !== "Tab" &&
          (event.target as HTMLElement).closest("textarea,[contenteditable],select")
        )
          return;
        if (!panelOpen && !seeking && !(event.target instanceof HTMLInputElement)) {
          if (event.key === "ArrowDown") {
            event.preventDefault();
            next();
          } else if (event.key === "ArrowUp") {
            event.preventDefault();
            previous();
          }
        }
        if (event.key === "Escape") {
          event.preventDefault();
          closeRef.current?.click();
        }
        if (event.key !== "Tab") return;
        const nodes = Array.from(
          root.current.querySelectorAll<HTMLElement>(
            'button:not(:disabled),a[href],input:not(:disabled),textarea:not(:disabled),select:not(:disabled),[contenteditable],[tabindex="0"]',
          ),
        ).filter((node) => !node.closest("[inert]") && node.getClientRects().length > 0);
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
    >
      <div
        ref={feedRef}
        className={styles.feed}
        onScroll={onScroll}
        data-locked={panelOpen || seeking || createPostOpen || undefined}
        inert={createPostOpen}
      >
        {queue.items.map((video, index) => (
          <div
            key={contentVideoKey(video)}
            className={styles.slide}
            data-content-video-slide-index={index}
            inert={index !== queue.index}
            aria-hidden={index !== queue.index}
          >
            {Math.abs(index - queue.index) <= 1 ? (
              <ContentVideoSlide
                item={video}
                active={index === queue.index}
                interactionRevision={queue.staleInteractions[contentVideoKey(video)] ?? 0}
                initialTime={index === 0 ? initialTime : 0}
                changedDiscussion={index > 0 && queue.items[index - 1]?.post_id !== video.post_id}
                onNext={next}
                onPrevious={previous}
                onClose={onClose}
                onNavigate={(time) =>
                  onNavigate({
                    initial: {
                      postId: video.post_id,
                      replyId: video.reply_id,
                      mediaUrl: video.media_url,
                    },
                    initialTime: time,
                  })
                }
                createPostOpen={createPostOpen}
                onCreatePost={() => {
                  if (!conversion.isAuthenticated) {
                    conversion.requestConversion("trigger_comentar", {
                      intent: {
                        type: "create_post",
                        returnTo: `/comunidades/${encodeURIComponent(video.community.slug)}/publicacao/nova`,
                      },
                    });
                    return;
                  }
                  setCreatePostOpen(true);
                }}
                closeRef={closeRef}
                onInteraction={(patch, revision) =>
                  queue.updateItem(contentVideoKey(video), patch, revision)
                }
                onPanelChange={setPanelOpen}
                onSeekingChange={setSeeking}
              />
            ) : null}
          </div>
        ))}
        {!queue.ended || queue.items.length === 0 ? (
          <div
            key={`loading:${queue.items.length}`}
            className={styles.slide}
            data-content-video-slide-index={queue.items.length}
            inert={queue.index !== queue.items.length}
            aria-hidden={queue.index !== queue.items.length}
          >
            <div className={styles.status} role="status">
              {queue.error ? (
                <>
                  {queue.expired
                    ? "Esta sequência expirou."
                    : "Não foi possível carregar os vídeos."}
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
          </div>
        ) : null}
      </div>
      {item && queue.error ? (
        <div className={styles.status} role="alert">
          {queue.expired ? "Esta sequência expirou." : "Não foi possível carregar a sequência."}
          <button type="button" onClick={() => void queue.retry()}>
            {queue.expired ? "Reabrir sequência" : "Tentar novamente"}
          </button>
        </div>
      ) : null}
      <div className={styles.navigation} inert={createPostOpen}>
        <button
          type="button"
          aria-label="Vídeo anterior"
          disabled={panelOpen || seeking || createPostOpen || queue.index === 0}
          onClick={previous}
        >
          <ArrowUp className="h-7 w-7" aria-hidden="true" strokeWidth={2.3} />
        </button>
        <button
          type="button"
          aria-label="Próximo vídeo"
          disabled={
            panelOpen ||
            seeking ||
            createPostOpen ||
            (queue.ended && queue.index >= queue.items.length - 1)
          }
          onClick={next}
        >
          <ArrowDown className="h-7 w-7" aria-hidden="true" strokeWidth={2.3} />
        </button>
      </div>
      {createPostOpen ? (
        <ContentVideoCreatePost
          onClose={() => {
            setCreatePostOpen(false);
            requestAnimationFrame(() =>
              root.current
                ?.querySelector<HTMLButtonElement>(
                  '[data-reels-active="true"] [data-reels-create-post]',
                )
                ?.focus(),
            );
          }}
        />
      ) : null}
    </div>,
    document.body,
  );
};
