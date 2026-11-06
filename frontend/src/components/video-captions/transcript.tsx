"use client";

import { MoreHorizontal, TextQuote, X } from "lucide-react";
import { createContext, type ReactNode, useContext, useEffect, useRef, useState } from "react";
import { useVideoAssetPlayback } from "@/api/callers/video-assets";
import { ReplyMenuSurface } from "@/components/community/reply-menu-surface";
import { useAppSelector } from "@/hooks/redux";
import { EditCaptionMenuItem } from "./edit-menu-item";

const TranscriptContext = createContext<{
  reference: string | null;
  show: (reference: string | null) => void;
} | null>(null);

export function TranscriptScope({ children }: { children: ReactNode }) {
  const [reference, show] = useState<string | null>(null);
  return (
    <TranscriptContext.Provider value={{ reference, show }}>{children}</TranscriptContext.Provider>
  );
}

export function ScopedTranscriptPanel({ reference }: { reference?: string | null }) {
  const scope = useContext(TranscriptContext);
  return (
    <TranscriptPanel
      reference={reference}
      open={Boolean(reference && scope?.reference === reference)}
      onClose={() => scope?.show(null)}
    />
  );
}

export function CaptionOverflowMenu({
  reference,
  canEdit = false,
  authorId,
}: {
  reference?: string | null;
  canEdit?: boolean;
  authorId?: string;
}) {
  const user = useAppSelector((state) => state.user);
  const playback = useVideoAssetPlayback(reference);
  const scope = useContext(TranscriptContext);
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  if (!scope || !playback.data?.captions?.cues.length) return null;
  return (
    <div className="pointer-events-auto relative z-10 shrink-0">
      <button
        ref={trigger}
        type="button"
        aria-label="Mais ações do vídeo"
        aria-haspopup="menu"
        aria-expanded={open}
        className="grid h-8 w-8 place-items-center rounded-full text-muted hover:bg-surface-muted"
        onClick={(event) => {
          event.stopPropagation();
          setOpen(!open);
        }}
      >
        <MoreHorizontal size={18} />
      </button>
      {open ? (
        <ReplyMenuSurface triggerRef={trigger} onClose={() => setOpen(false)} width={224}>
          {canEdit || (authorId && user?.id === authorId && user.role === "psicologo") ? (
            <EditCaptionMenuItem reference={reference} />
          ) : null}
          <TranscriptMenuItem reference={reference} onSelected={() => setOpen(false)} />
        </ReplyMenuSurface>
      ) : null}
    </div>
  );
}

export function TranscriptMenuItem({
  reference,
  onOpen,
  onSelected,
}: {
  reference?: string | null;
  onOpen?: () => void;
  onSelected?: () => void;
}) {
  const playback = useVideoAssetPlayback(reference);
  const scope = useContext(TranscriptContext);
  if (!playback.data?.captions?.cues.length || (!onOpen && !scope)) return null;
  return (
    <button
      type="button"
      role="menuitem"
      className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left font-semibold text-muted transition hover:bg-surface-muted hover:text-foreground"
      onClick={(event) => {
        event.stopPropagation();
        onSelected?.();
        if (onOpen) onOpen();
        else scope?.show(reference ?? null);
      }}
    >
      <TextQuote className="h-4 w-4" aria-hidden="true" />
      Ver transcrição
    </button>
  );
}

export function TranscriptPanel({
  reference,
  open,
  onClose,
}: {
  reference?: string | null;
  open: boolean;
  onClose: () => void;
}) {
  const playback = useVideoAssetPlayback(reference);
  const caption = playback.data?.captions;
  const panel = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!open || !caption?.cues.length) return;
    panel.current?.scrollIntoView({ block: "center", behavior: "instant" });
    panel.current?.focus({ preventScroll: true });
  }, [open, caption?.cues.length]);
  if (!open || !caption?.cues.length) return null;
  return (
    <section
      ref={panel}
      tabIndex={-1}
      aria-label="Transcrição do vídeo"
      className="mt-3 border-t border-border py-4 text-sm text-foreground outline-none"
    >
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-semibold">Transcrição</h3>
        <button
          type="button"
          aria-label="Fechar transcrição"
          title="Fechar transcrição"
          className="grid h-10 w-10 place-items-center rounded-full text-muted hover:bg-surface-muted"
          onClick={onClose}
        >
          <X size={18} />
        </button>
      </div>
      <p className="mb-3 text-xs text-muted">
        {caption.reviewed
          ? "Transcrição revisada pelo autor."
          : "Transcrição automática, não revisada."}
      </p>
      <p className="whitespace-pre-wrap break-words leading-6">
        {caption.cues.map((cue) => cue.text).join(" ")}
      </p>
    </section>
  );
}
