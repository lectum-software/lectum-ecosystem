"use client";

import { useLayoutEffect } from "react";

export const MODAL_MEDIA_SUSPENSION_EVENT = "lectum:modal-media-suspension-change";
export const MODAL_MEDIA_SUSPENSION_ATTRIBUTE = "data-lectum-modal-media-suspended";

type ModalMediaSuspensionListener = (suspended: boolean) => void;
type ModalMediaSuspensionRelease = () => void;

// Each acquisition owns one release, including StrictMode and out-of-order cleanup.
export const createModalMediaSuspension = (
  apply: (suspended: boolean) => void,
): (() => ModalMediaSuspensionRelease) => {
  const owners = new Set<symbol>();

  return () => {
    const owner = Symbol();
    if (owners.size === 0) apply(true);
    owners.add(owner);

    return () => {
      if (!owners.delete(owner) || owners.size > 0) return;
      apply(false);
    };
  };
};

const suspensions = new WeakMap<Document, ReturnType<typeof createModalMediaSuspension>>();

const getCurrentDocument = () => {
  if (typeof document === "undefined") return null;

  return document;
};

const emitModalMediaSuspensionState = (targetDocument: Document, suspended: boolean) => {
  if (suspended) {
    targetDocument.documentElement.setAttribute(MODAL_MEDIA_SUSPENSION_ATTRIBUTE, "true");
  } else {
    targetDocument.documentElement.removeAttribute(MODAL_MEDIA_SUSPENSION_ATTRIBUTE);
  }

  targetDocument.dispatchEvent(
    new CustomEvent(MODAL_MEDIA_SUSPENSION_EVENT, {
      detail: { suspended },
    }),
  );
};

export const isModalMediaSuspended = (targetDocument: Document | null = getCurrentDocument()) =>
  targetDocument?.documentElement.getAttribute(MODAL_MEDIA_SUSPENSION_ATTRIBUTE) === "true";

export const subscribeModalMediaSuspension = (
  listener: ModalMediaSuspensionListener,
  targetDocument: Document | null = getCurrentDocument(),
) => {
  if (!targetDocument) return () => undefined;

  const handleSuspensionChange = (event: Event) => {
    const suspended =
      event instanceof CustomEvent && typeof event.detail?.suspended === "boolean"
        ? event.detail.suspended
        : isModalMediaSuspended(targetDocument);

    listener(suspended);
  };

  listener(isModalMediaSuspended(targetDocument));
  targetDocument.addEventListener(MODAL_MEDIA_SUSPENSION_EVENT, handleSuspensionChange);

  return () => {
    targetDocument.removeEventListener(MODAL_MEDIA_SUSPENSION_EVENT, handleSuspensionChange);
  };
};

export const useModalMediaSuspension = (open: boolean) => {
  useLayoutEffect(() => {
    if (!open) return;

    const targetDocument = getCurrentDocument();
    if (!targetDocument) return;

    let acquire = suspensions.get(targetDocument);
    if (!acquire) {
      acquire = createModalMediaSuspension((suspended) =>
        emitModalMediaSuspensionState(targetDocument, suspended),
      );
      suspensions.set(targetDocument, acquire);
    }

    return acquire();
  }, [open]);
};
