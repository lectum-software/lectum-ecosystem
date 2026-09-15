"use client";

import { type ReactNode, type RefObject, useLayoutEffect, useRef } from "react";
import { useModalScrollLock } from "@/hooks/use-modal-scroll-lock";

type ModalSession = { href: string; returnTarget: HTMLElement | null };

export const Modal = ({
  children,
  initialFocusRef,
  labelledBy,
  onClose,
  open,
  returnFocusRef,
}: {
  children: ReactNode;
  initialFocusRef: RefObject<HTMLElement | null>;
  labelledBy: string;
  onClose: () => void;
  open: boolean;
  returnFocusRef: RefObject<HTMLElement | null>;
}) => {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const sessionRef = useRef<ModalSession | null>(null);
  const closeRequestedRef = useRef(false);
  useModalScrollLock(open);

  useLayoutEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog?.isConnected) return;

    if (open) {
      // Replayed effects and rerenders must not refocus an already open dialog.
      if (dialog.open) return;
      sessionRef.current = { href: window.location.href, returnTarget: returnFocusRef.current };
      closeRequestedRef.current = false;
      dialog.showModal();
      initialFocusRef.current?.focus({ preventScroll: true });
      return;
    }

    const session = sessionRef.current;
    sessionRef.current = null;
    if (!dialog.open) return;
    const activeElement = document.activeElement;
    const ownedFocus = dialog.contains(activeElement) || activeElement === document.body;
    dialog.close();
    const target = session?.returnTarget;
    if (
      ownedFocus &&
      session?.href === window.location.href &&
      target?.isConnected &&
      target.ownerDocument === document &&
      !target.matches(":disabled") &&
      !target.closest("[hidden], [inert]") &&
      target.getClientRects().length > 0
    ) {
      target.focus({ preventScroll: true });
    }
    // No close/focus cleanup: native removal dismisses the dialog on unmount.
    // Calling close() there would also restore focus during route changes/StrictMode.
  }, [initialFocusRef, open, returnFocusRef]);

  const requestClose = () => {
    if (!open || closeRequestedRef.current) return;
    closeRequestedRef.current = true;
    onClose();
  };

  return (
    <dialog
      aria-labelledby={labelledBy}
      className="fixed inset-0 m-0 h-dvh max-h-none w-full max-w-none overflow-y-auto overscroll-contain border-0 bg-transparent px-4 py-6 text-foreground backdrop:bg-foreground/55 backdrop:backdrop-blur-md open:grid open:place-items-center"
      onCancel={(event) => {
        if (event.target !== event.currentTarget || event.defaultPrevented) return;
        // Native select consumes its own Escape; no global keydown competes with it.
        event.preventDefault();
        requestClose();
      }}
      onClose={(event) => {
        // A queued close from the previous opening must not close a reopened dialog.
        if (!event.currentTarget.open) requestClose();
      }}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) requestClose();
      }}
      ref={dialogRef}
    >
      {children}
    </dialog>
  );
};
