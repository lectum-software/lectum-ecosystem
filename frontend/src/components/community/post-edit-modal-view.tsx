"use client";

import { Info, Loader2, X } from "lucide-react";
import {
  type CSSProperties,
  type FocusEventHandler,
  type FormEventHandler,
  type PointerEventHandler,
  type ReactNode,
  useRef,
} from "react";
import { Modal } from "@/components/ui/modal";
import { useEditorKeyboardOffset } from "@/hooks/use-editor-keyboard-offset";
import { cn } from "@/lib/utils";
import { Button } from "@/registry/new-york-v4/ui/button";
import { guidanceText } from "./post-edit-modal-support";

type PostEditModalViewProps = {
  communityFields: ReactNode;
  contentFields: ReactNode;
  footerControls: ReactNode;
  hasMedia: boolean;
  overlay?: ReactNode;
  isGuidanceOpen: boolean;
  isSubmitting: boolean;
  mediaPreview: ReactNode;
  onClose: () => void;
  onFocusCapture: FocusEventHandler<HTMLFormElement>;
  onPointerDown: PointerEventHandler<HTMLDivElement>;
  onSubmit: FormEventHandler<HTMLFormElement>;
  onToggleGuidance: () => void;
  titleFields: ReactNode;
  uploadStatus: ReactNode;
};

export const PostEditModalView = ({
  communityFields,
  contentFields,
  footerControls,
  hasMedia,
  overlay,
  isGuidanceOpen,
  isSubmitting,
  mediaPreview,
  onClose,
  onFocusCapture,
  onPointerDown,
  onSubmit,
  onToggleGuidance,
  titleFields,
  uploadStatus,
}: PostEditModalViewProps) => {
  const initialFocusRef = useRef<HTMLButtonElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(
    typeof document === "undefined" ? null : (document.activeElement as HTMLElement | null),
  );
  const keyboardOffset = useEditorKeyboardOffset();
  return (
    <Modal
      className="overflow-hidden p-0 backdrop:bg-foreground/32 backdrop:backdrop-blur-[8px] open:flex open:items-end open:justify-center dark:backdrop:bg-background/72"
      dismissOnBackdrop={false}
      dismissible={!isSubmitting && !overlay}
      initialFocusRef={initialFocusRef}
      returnFocusRef={returnFocusRef}
      labelledBy="edit-post-title-heading"
      onClose={onClose}
      open
    >
      <section
        className="mb-[var(--lectum-create-post-keyboard-offset)] flex h-[calc(100dvh_-_env(safe-area-inset-top)_-_0.75rem_-_var(--lectum-create-post-keyboard-offset))] w-full max-w-[min(100vw,44rem)] flex-col overflow-hidden rounded-t-[2rem] border border-border bg-surface text-foreground shadow-[var(--lectum-shadow)] sm:mb-6 sm:h-[min(86dvh,760px)] sm:rounded-[2rem]"
        inert={Boolean(overlay)}
        style={
          {
            "--lectum-create-post-keyboard-offset": `${keyboardOffset}px`,
            "--lectum-create-post-footer-bottom-padding":
              keyboardOffset > 0 ? "0.35rem" : "max(0.75rem, env(safe-area-inset-bottom))",
          } as CSSProperties
        }
      >
        <header className="relative flex h-16 shrink-0 items-center justify-center border-border/70 border-b px-4">
          <button
            aria-label="Fechar edição de post"
            className="absolute left-3 grid h-10 w-10 place-items-center rounded-full text-foreground transition hover:bg-surface-muted focus:outline-none focus:ring-4 focus:ring-primary/15"
            disabled={isSubmitting}
            onClick={onClose}
            ref={initialFocusRef}
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
            className="flex min-h-0 flex-1 flex-col overflow-x-hidden overflow-y-auto overscroll-contain px-5 pt-4 pb-4"
            data-edit-post-editor-scroll={hasMedia ? "media" : "content"}
            onPointerDown={onPointerDown}
          >
            <div className={cn("flex min-h-0 flex-none flex-col gap-3", hasMedia && "min-h-full")}>
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

          <footer className="relative shrink-0 border-border/70 border-t bg-surface/95 px-4 pt-2 pb-[var(--lectum-create-post-footer-bottom-padding)] backdrop-blur supports-[backdrop-filter]:bg-surface/90">
            {uploadStatus ? <div className="mb-2">{uploadStatus}</div> : null}
            <div className="flex min-h-11 items-center justify-between gap-3">
              {footerControls}
              <Button
                className="h-11 min-w-[6.5rem] shrink-0 rounded-full px-6 font-sans text-base font-[800] leading-none shadow-[var(--lectum-shadow-soft)] disabled:bg-surface-muted disabled:text-muted disabled:opacity-100 disabled:shadow-none"
                style={{ fontFamily: "var(--font-sans)", fontWeight: 800 }}
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
      {overlay}
    </Modal>
  );
};
