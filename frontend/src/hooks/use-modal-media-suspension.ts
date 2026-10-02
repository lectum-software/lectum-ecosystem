"use client";

import { type RefObject, useLayoutEffect } from "react";
import {
  isVideoBlockedByModal,
  MODAL_MEDIA_SUSPENSION_ATTRIBUTE,
  registerModalMediaRoot,
} from "@/lib/modal-media-scope";
import { pauseVideoForFocusGuard } from "@/lib/video-playback";

export const MODAL_MEDIA_SUSPENSION_EVENT = "lectum:modal-media-suspension-change";
export { MODAL_MEDIA_SUSPENSION_ATTRIBUTE } from "@/lib/modal-media-scope";

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

const pauseBackgroundVideos = (targetDocument: Document) => {
  for (const video of targetDocument.querySelectorAll<HTMLVideoElement>("video")) {
    if (isVideoBlockedByModal(video)) pauseVideoForFocusGuard(video);
  }
};

export const acquireModalMediaSuspension = (targetDocument: Document, root: HTMLElement | null) => {
  const releaseRoot = registerModalMediaRoot(targetDocument, root);
  let acquire = suspensions.get(targetDocument);
  if (!acquire) {
    const preventBackgroundPlayback = (event: Event) => {
      const video = event.target as HTMLVideoElement | null;
      if (video?.nodeName === "VIDEO" && isVideoBlockedByModal(video)) {
        pauseVideoForFocusGuard(video);
      }
    };
    acquire = createModalMediaSuspension((suspended) => {
      for (const event of ["play", "playing"]) {
        if (suspended) targetDocument.addEventListener(event, preventBackgroundPlayback, true);
        else targetDocument.removeEventListener(event, preventBackgroundPlayback, true);
      }
      emitModalMediaSuspensionState(targetDocument, suspended);
    });
    suspensions.set(targetDocument, acquire);
  }

  const release = acquire();
  pauseBackgroundVideos(targetDocument);
  let released = false;
  return () => {
    if (released) return;
    released = true;
    releaseRoot();
    release();
    pauseBackgroundVideos(targetDocument);
  };
};

export const useModalMediaSuspension = (open: boolean, rootRef: RefObject<HTMLElement | null>) => {
  useLayoutEffect(() => {
    if (!open) return;
    const targetDocument = rootRef.current?.ownerDocument ?? getCurrentDocument();
    if (!targetDocument) return;
    return acquireModalMediaSuspension(targetDocument, rootRef.current);
  }, [open, rootRef]);
};
