"use client";

import { Loader2, Trash2, X } from "lucide-react";
import { type ReactNode, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useModalPortalHost } from "@/hooks/use-modal-portal-host";
import { cn } from "@/lib/utils";
import { Button } from "@/registry/new-york-v4/ui/button";

type CommunityDeleteConfirmationModalProps = {
  actionLabel?: string;
  children?: ReactNode;
  closeLabel?: string;
  description: string;
  onClose: () => void;
  onConfirm: () => void;
  open: boolean;
  pending?: boolean;
  title: string;
};

export const CommunityDeleteConfirmationModal = ({
  actionLabel = "Excluir",
  children,
  closeLabel = "Fechar confirmação",
  description,
  onClose,
  onConfirm,
  open,
  pending,
  title,
}: CommunityDeleteConfirmationModalProps) => {
  const overlayRef = useRef<HTMLDivElement>(null);
  const portalHost = useModalPortalHost(open, overlayRef);
  useEffect(() => {
    if (!open || portalHost) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      event.stopPropagation();
      if (!pending) onClose();
    };

    window.addEventListener("keydown", handleKeyDown, true);

    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, [onClose, open, pending, portalHost]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      aria-labelledby="community-delete-confirmation-title"
      aria-modal="true"
      className="fixed inset-0 isolate z-[1000] grid place-items-center overflow-y-auto bg-foreground/55 px-4 py-6 text-foreground backdrop-blur-md dark:bg-background/75"
      ref={overlayRef}
      tabIndex={-1}
      onKeyDown={(event) => {
        if (event.key !== "Escape") return;
        event.preventDefault();
        event.stopPropagation();
        if (!pending) onClose();
      }}
      onMouseDown={(event) => {
        if (!pending && event.target === event.currentTarget) onClose();
      }}
      role="dialog"
    >
      <section className="relative z-[1001] w-[calc(100vw-2rem)] max-w-[430px] rounded-[28px] border border-border bg-surface p-5 shadow-[var(--lectum-shadow)]">
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 gap-3">
            <span
              className={cn(
                "grid h-11 w-11 shrink-0 place-items-center rounded-full",
                "bg-danger/10 text-danger",
              )}
            >
              <Trash2 className="h-5 w-5" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <h2
                className="text-xl font-black leading-7 tracking-[-0.03em] text-foreground"
                id="community-delete-confirmation-title"
              >
                {title}
              </h2>
              <p className="mt-2 whitespace-pre-line text-sm leading-6 text-muted">{description}</p>
            </div>
          </div>
          <button
            aria-label={closeLabel}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-surface-muted text-muted transition hover:bg-primary-soft hover:text-foreground"
            disabled={pending}
            onClick={onClose}
            type="button"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        {children ? <div className="mt-4">{children}</div> : null}

        <div className="mt-5 grid gap-2 sm:grid-cols-2">
          <Button
            className="h-11 text-base font-extrabold tracking-[-0.02em]"
            disabled={pending}
            onClick={onClose}
            type="button"
            variant="outline"
          >
            Cancelar
          </Button>
          <Button
            className="h-11 text-base font-extrabold tracking-[-0.02em]"
            disabled={pending}
            onClick={onConfirm}
            type="button"
            variant="destructive"
          >
            {pending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
            {actionLabel}
          </Button>
        </div>
      </section>
    </div>,
    portalHost ?? document.body,
  );
};
