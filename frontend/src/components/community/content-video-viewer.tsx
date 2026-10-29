"use client";
import { ArrowDown, ArrowUp } from "lucide-react";
import { type CSSProperties, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useExpandedVideoViewport } from "@/components/ui/vertical-video-player-content-expansion";
import { useModalMediaSuspension } from "@/hooks/use-modal-media-suspension";
import { useModalScrollLock } from "@/hooks/use-modal-scroll-lock";
import { type ContentVideoSourceEntry, useContentVideoSource } from "./content-video-context";
import { ContentVideoSlide } from "./content-video-slide";
import styles from "./content-video-viewer.module.css";
import { contentVideoKey, useContentVideoQueue } from "./use-content-video-queue";
import { useContentVideoScroll } from "./use-content-video-scroll";

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
  const [seeking, setSeeking] = useState(false);
  const queue = useContentVideoQueue(initial, source);
  const root = useRef<HTMLDivElement | null>(null);
  const closeRef = useRef<HTMLButtonElement | null>(null);
  const previousFocus = useRef<HTMLElement | null>(null);
  const viewport = useExpandedVideoViewport(true);
  const { feedRef, onScroll, scrollTo } = useContentVideoScroll({
    index: queue.index,
    count: Math.max(1, queue.items.length + (queue.ended ? 0 : 1)),
    locked: panelOpen || seeking,
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
        if (event.defaultPrevented || !root.current?.contains(event.target as Node)) return;
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
          onClose();
        }
        if (event.key !== "Tab") return;
        const nodes = Array.from(
          root.current.querySelectorAll<HTMLElement>(
            'button:not(:disabled),a[href],input:not(:disabled),[tabindex="0"]',
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
        data-locked={panelOpen || seeking || undefined}
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
                initialTime={index === 0 ? initialTime : 0}
                changedDiscussion={index > 0 && queue.items[index - 1]?.post_id !== video.post_id}
                onNext={next}
                onPrevious={previous}
                onClose={onClose}
                closeRef={closeRef}
                onInteraction={(patch) => queue.updateItem(contentVideoKey(video), patch)}
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
      <div className={styles.navigation}>
        <button
          type="button"
          aria-label="Vídeo anterior"
          disabled={panelOpen || seeking || queue.index === 0}
          onClick={previous}
        >
          <ArrowUp className="h-7 w-7" aria-hidden="true" strokeWidth={2.3} />
        </button>
        <button
          type="button"
          aria-label="Próximo vídeo"
          disabled={panelOpen || seeking || (queue.ended && queue.index >= queue.items.length - 1)}
          onClick={next}
        >
          <ArrowDown className="h-7 w-7" aria-hidden="true" strokeWidth={2.3} />
        </button>
      </div>
    </div>,
    document.body,
  );
};
