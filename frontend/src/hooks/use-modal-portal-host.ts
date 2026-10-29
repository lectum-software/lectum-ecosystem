"use client";

import { type RefObject, useLayoutEffect, useState } from "react";

export const resolveModalPortalHost = (
  owner: Pick<Document, "activeElement" | "querySelectorAll">,
) => {
  const focusedDialog = owner.activeElement?.closest<HTMLDialogElement>("dialog:modal");
  if (focusedDialog) return focusedDialog;
  return Array.from(owner.querySelectorAll<HTMLDialogElement>("dialog:modal")).at(-1) ?? null;
};

/** Body portals cannot paint over or receive input above a native modal's top layer. */
export const useModalPortalHost = (open: boolean, overlayRef?: RefObject<HTMLElement | null>) => {
  const [host, setHost] = useState<HTMLDialogElement | null>(null);
  useLayoutEffect(() => {
    // Resolve the external top layer before paint, after the triggering focus event.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (open) setHost(resolveModalPortalHost(document));
  }, [open]);
  useLayoutEffect(() => {
    const overlay = overlayRef?.current;
    if (!open || !host || !overlay || !host.contains(overlay)) return;
    const previousFocus = document.activeElement;
    const href = window.location.href;
    const focusable = () =>
      Array.from(
        overlay.querySelectorAll<HTMLElement>(
          'button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [contenteditable="true"], [contenteditable="plaintext-only"], [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((node) => node.getClientRects().length > 0);
    if (!overlay.contains(document.activeElement)) {
      (focusable()[0] ?? overlay).focus({ preventScroll: true });
    }
    const trapFocus = (event: KeyboardEvent) => {
      if (event.key !== "Tab" || resolveModalPortalHost(document) !== host) return;
      const elements = focusable();
      const first = elements[0];
      const last = elements.at(-1);
      if (!first || !last) {
        event.preventDefault();
        overlay.focus({ preventScroll: true });
      } else if (
        event.shiftKey &&
        (document.activeElement === first || document.activeElement === overlay)
      ) {
        event.preventDefault();
        last.focus({ preventScroll: true });
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus({ preventScroll: true });
      }
    };
    overlay.addEventListener("keydown", trapFocus);
    return () => {
      overlay.removeEventListener("keydown", trapFocus);
      if (
        window.location.href === href &&
        previousFocus instanceof HTMLElement &&
        previousFocus.isConnected &&
        host.open &&
        (overlay.contains(document.activeElement) || document.activeElement === document.body)
      ) {
        previousFocus.focus({ preventScroll: true });
      }
    };
  }, [host, open, overlayRef]);
  return host;
};
