"use client";

import { BadgeCheck, X } from "lucide-react";
import { useRef, useState } from "react";
import { Modal } from "@/components/ui/modal";
import { VerticalVideoPlayer } from "@/components/ui/vertical-video-player";
import { toggleVideoElementPlayback } from "@/lib/video-interactions";
import { useVerificationVideo } from "./use-verification-video";
import { hasWatchedVerificationVideo, VERIFICATION_VIDEO } from "./verification-video-policy";

export const VerificationVideoNotification = () => {
  const [open, setOpen] = useState(false);
  const [failed, setFailed] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const { watched, markWatched } = useVerificationVideo();
  const lastSaveAttempt = useRef(0);
  const checkWatched = (video: HTMLVideoElement) => {
    if (watched || document.visibilityState !== "visible") return;
    if (!hasWatchedVerificationVideo(video.played, video.duration)) return;
    if (Date.now() - lastSaveAttempt.current < 30_000) return;
    lastSaveAttempt.current = Date.now();
    markWatched();
  };

  return (
    <>
      <button
        className="mb-4 flex w-full items-start gap-4 border-b border-border px-5 py-4 text-left transition hover:bg-primary-soft md:px-3"
        onClick={() => {
          setFailed(false);
          setOpen(true);
        }}
        ref={triggerRef}
        type="button"
      >
        <BadgeCheck aria-hidden="true" className="mt-0.5 h-6 w-6 shrink-0 text-primary" />
        <span className="min-w-0 flex-1">
          <span className="block text-[15px] font-semibold leading-5">
            {VERIFICATION_VIDEO.title}
          </span>
          <span className="mt-1 block text-sm text-subtle">{VERIFICATION_VIDEO.description}</span>
        </span>
        {!watched ? (
          <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-primary">
            <span className="sr-only">Vídeo ainda não assistido</span>
          </span>
        ) : null}
      </button>
      <Modal
        className="overflow-hidden bg-media-background p-0"
        dismissOnBackdrop={false}
        initialFocusRef={closeRef}
        labelledBy="verification-video-title"
        onClose={() => setOpen(false)}
        open={open}
        returnFocusRef={triggerRef}
      >
        <h2 className="sr-only" id="verification-video-title">
          {VERIFICATION_VIDEO.title}
        </h2>
        {open ? (
          <VerticalVideoPlayer
            className="h-dvh w-full rounded-none border-0"
            controlsVariant="persistent"
            fit="contain"
            onContentClick={() => {
              void toggleVideoElementPlayback(videoRef.current);
            }}
            onVideoElementReady={(video) => {
              videoRef.current = video;
            }}
            persistentControlsLayout="progress"
            persistentControlsVisibility="always"
            src={VERIFICATION_VIDEO.src}
            title={VERIFICATION_VIDEO.title}
            videoProps={{
              autoPlay: true,
              disablePictureInPicture: true,
              disableRemotePlayback: true,
              onError: () => setFailed(true),
              onTimeUpdate: (event) => checkWatched(event.currentTarget),
              onEnded: (event) => checkWatched(event.currentTarget),
            }}
          />
        ) : null}
        {open && failed ? (
          <p
            className="absolute inset-x-6 top-1/2 text-center text-primary-foreground"
            role="alert"
          >
            Não foi possível carregar o vídeo. Feche e tente novamente.
          </p>
        ) : null}
        <button
          aria-label="Fechar vídeo"
          className="absolute right-3 z-10 grid h-11 w-11 place-items-center rounded-full bg-media-background/40 text-primary-foreground focus-visible:ring-2 focus-visible:ring-media-foreground"
          onClick={() => setOpen(false)}
          ref={closeRef}
          style={{ top: "calc(env(safe-area-inset-top, 0px) + 12px)" }}
          title="Fechar vídeo"
          type="button"
        >
          <X aria-hidden="true" className="h-6 w-6" />
        </button>
      </Modal>
    </>
  );
};
