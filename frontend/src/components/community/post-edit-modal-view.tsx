"use client";

import { Info, Loader2, X } from "lucide-react";
import type { FocusEventHandler, FormEventHandler, PointerEventHandler, ReactNode } from "react";
import { Button } from "@/registry/new-york-v4/ui/button";
import { guidanceText } from "./post-edit-modal-support";

type PostEditModalViewProps = {
  communityFields: ReactNode;
  contentFields: ReactNode;
  footerControls: ReactNode;
  isGuidanceOpen: boolean;
  isSubmitting: boolean;
  mediaPreview: ReactNode;
  onClose: () => void;
  onFocusCapture: FocusEventHandler<HTMLFormElement>;
  onPointerDown: PointerEventHandler<HTMLDivElement>;
  onSubmit: FormEventHandler<HTMLFormElement>;
  onToggleGuidance: () => void;
  titleFields: ReactNode;
};

export const PostEditModalView = ({
  communityFields,
  contentFields,
  footerControls,
  isGuidanceOpen,
  isSubmitting,
  mediaPreview,
  onClose,
  onFocusCapture,
  onPointerDown,
  onSubmit,
  onToggleGuidance,
  titleFields,
}: PostEditModalViewProps) => (
  <div className="fixed inset-0 z-[70] flex items-end justify-center bg-media-background/35 opacity-100 backdrop-blur-[8px] transition-opacity duration-200 ease-out supports-[backdrop-filter]:bg-media-background/35">
    <section
      aria-labelledby="edit-post-title-heading"
      aria-modal="true"
      className="flex h-[calc(100dvh_-_env(safe-area-inset-top)_-_0.75rem)] w-full max-w-[min(100vw,44rem)] translate-y-0 flex-col overflow-hidden rounded-t-[2rem] border border-border bg-surface text-foreground shadow-[var(--lectum-shadow)] transition-transform duration-300 ease-out sm:mb-6 sm:h-[min(86dvh,760px)] sm:rounded-[2rem]"
      role="dialog"
    >
      <header className="relative flex h-16 shrink-0 items-center justify-center border-border/70 border-b px-4">
        <button
          aria-label="Fechar edição de post"
          className="absolute left-3 grid h-10 w-10 place-items-center rounded-full text-foreground transition hover:bg-surface-muted focus:outline-none focus:ring-4 focus:ring-primary/15"
          disabled={isSubmitting}
          onClick={onClose}
          type="button"
        >
          <X aria-hidden="true" className="h-5 w-5" />
        </button>
        <h2 className="text-[1.2rem] font-black tracking-[-0.03em]" id="edit-post-title-heading">
          Editar Post
        </h2>
        <div className="absolute right-3">
          <button
            aria-expanded={isGuidanceOpen}
            aria-label="Ver diretrizes do post"
            className="grid h-10 w-10 place-items-center rounded-full text-muted transition hover:bg-surface-muted hover:text-foreground focus:outline-none focus:ring-4 focus:ring-primary/15"
            onClick={onToggleGuidance}
            onMouseDown={(event) => event.preventDefault()}
            tabIndex={-1}
            type="button"
          >
            <Info aria-hidden="true" className="h-5 w-5" />
          </button>
          {isGuidanceOpen ? (
            <div className="absolute top-12 right-0 z-30 w-[min(20rem,calc(100vw-2rem))] rounded-2xl border border-border bg-surface px-4 py-3 text-xs leading-5 text-muted shadow-[var(--lectum-shadow-soft)]">
              {guidanceText}
            </div>
          ) : null}
        </div>
      </header>

      <form
        className="flex min-h-0 flex-1 flex-col"
        noValidate
        onFocusCapture={onFocusCapture}
        onSubmit={onSubmit}
      >
        <div
          className="flex min-h-0 flex-1 flex-col overflow-hidden px-5 pt-4 pb-4"
          onPointerDown={onPointerDown}
        >
          <div className="flex min-h-0 flex-1 flex-col gap-3">
            <div className="flex items-start justify-between gap-3">{communityFields}</div>

            <div className="flex min-h-0 flex-1 flex-col gap-0">
              <div onPointerDown={onPointerDown}>{titleFields}</div>
              <div className="flex min-h-0 flex-1 flex-col" onPointerDown={onPointerDown}>
                {contentFields}
                {mediaPreview}
              </div>
            </div>
          </div>
        </div>

        <footer className="relative shrink-0 border-border/70 border-t bg-surface/95 px-4 pt-3 pb-[var(--lectum-bottom-fixed-padding-compact)] backdrop-blur supports-[backdrop-filter]:bg-surface/90">
          <div className="flex min-h-12 items-center justify-between gap-3">
            {footerControls}
            <Button
              className="h-12 min-w-[6.5rem] shrink-0 rounded-full px-6 text-lg font-black tracking-[-0.02em] shadow-[var(--lectum-shadow-soft)] disabled:bg-surface-muted disabled:text-muted disabled:opacity-100 disabled:shadow-none"
              disabled={isSubmitting}
              type="submit"
            >
              {isSubmitting ? (
                <Loader2 aria-hidden="true" className="h-5 w-5 animate-spin" />
              ) : null}
              Salvar
            </Button>
          </div>
        </footer>
      </form>
    </section>
  </div>
);
