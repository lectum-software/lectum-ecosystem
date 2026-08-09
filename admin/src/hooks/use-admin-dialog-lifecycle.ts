"use client";

import { useEffect, useRef } from "react";

type DialogEntry = {
  canClose: () => boolean;
  close: () => void;
  element: () => HTMLElement | null;
};

const FOCUSABLE_SELECTOR = [
  "button:not([disabled])",
  "[href]",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(",");

const getFocusableElements = (dialogElement: HTMLElement) =>
  Array.from(dialogElement.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
    (element) => element.tabIndex >= 0 && element.getAttribute("aria-hidden") !== "true",
  );

const dialogStack: DialogEntry[] = [];
let previousBodyOverflow = "";
let previousBodyOverscrollBehavior = "";
let previousDocumentOverflow = "";
let previousDocumentOverscrollBehavior = "";

const handleDialogKeyDown = (event: KeyboardEvent) => {
  const activeDialog = dialogStack.at(-1);
  if (!activeDialog) return;

  if (event.key === "Tab") {
    const dialogElement = activeDialog.element();
    if (!dialogElement) return;

    const focusableElements = getFocusableElements(dialogElement);
    const firstFocusable = focusableElements[0];
    const lastFocusable = focusableElements.at(-1);

    if (!firstFocusable || !lastFocusable) {
      event.preventDefault();
      dialogElement.focus();
      return;
    }

    if (!dialogElement.contains(document.activeElement)) {
      event.preventDefault();
      firstFocusable.focus();
      return;
    }

    if (event.shiftKey && document.activeElement === firstFocusable) {
      event.preventDefault();
      lastFocusable.focus();
      return;
    }

    if (!event.shiftKey && document.activeElement === lastFocusable) {
      event.preventDefault();
      firstFocusable.focus();
    }

    return;
  }

  if (event.key !== "Escape" || document.fullscreenElement || !activeDialog.canClose()) return;

  event.preventDefault();
  activeDialog.close();
};

const acquireDocumentLock = () => {
  if (dialogStack.length !== 1) return;

  previousBodyOverflow = document.body.style.overflow;
  previousBodyOverscrollBehavior = document.body.style.overscrollBehavior;
  previousDocumentOverflow = document.documentElement.style.overflow;
  previousDocumentOverscrollBehavior = document.documentElement.style.overscrollBehavior;
  document.body.style.overflow = "hidden";
  document.body.style.overscrollBehavior = "none";
  document.documentElement.style.overflow = "hidden";
  document.documentElement.style.overscrollBehavior = "none";
  document.addEventListener("keydown", handleDialogKeyDown);
};

const releaseDocumentLock = () => {
  if (dialogStack.length !== 0) return;

  document.body.style.overflow = previousBodyOverflow;
  document.body.style.overscrollBehavior = previousBodyOverscrollBehavior;
  document.documentElement.style.overflow = previousDocumentOverflow;
  document.documentElement.style.overscrollBehavior = previousDocumentOverscrollBehavior;
  document.removeEventListener("keydown", handleDialogKeyDown);
};

export const useAdminDialogLifecycle = (
  onClose: () => void,
  { closeEnabled = true, enabled = true }: { closeEnabled?: boolean; enabled?: boolean } = {},
) => {
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const closeRef = useRef(onClose);
  const closeEnabledRef = useRef(closeEnabled);

  useEffect(() => {
    closeRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    closeEnabledRef.current = closeEnabled;
  }, [closeEnabled]);

  useEffect(() => {
    if (!enabled) return;

    const previouslyFocused =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const entry: DialogEntry = {
      canClose: () => closeEnabledRef.current,
      close: () => closeRef.current(),
      element: () => dialogRef.current,
    };

    dialogStack.push(entry);
    acquireDocumentLock();
    const focusFrame = window.requestAnimationFrame(() => {
      const dialogElement = dialogRef.current;
      if (!dialogElement) return;

      (getFocusableElements(dialogElement)[0] ?? dialogElement).focus();
    });

    return () => {
      window.cancelAnimationFrame(focusFrame);
      const entryIndex = dialogStack.lastIndexOf(entry);
      if (entryIndex >= 0) dialogStack.splice(entryIndex, 1);
      releaseDocumentLock();
      const activeDialogElement = dialogStack.at(-1)?.element();
      if (activeDialogElement) {
        const focusTarget =
          previouslyFocused?.isConnected && activeDialogElement.contains(previouslyFocused)
            ? previouslyFocused
            : getFocusableElements(activeDialogElement)[0];
        (focusTarget ?? activeDialogElement).focus();
      } else if (previouslyFocused?.isConnected) {
        previouslyFocused.focus();
      }
    };
  }, [enabled]);

  return dialogRef;
};
