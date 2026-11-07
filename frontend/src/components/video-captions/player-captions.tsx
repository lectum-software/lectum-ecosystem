"use client";

import { type RefObject, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { CaptionIcon } from "./caption-icon";
import {
  setDirectoryCaptionPreference,
  useDirectoryCaptionPreference,
} from "./directory-preference";
import type { VideoCaptions } from "./types";

export function PlayerCaptions({
  captions,
  videoRef,
  version = 0,
  directory = false,
  controlTarget = null,
  controlHidden = false,
}: {
  captions: VideoCaptions;
  videoRef: RefObject<HTMLVideoElement | null>;
  version?: number;
  directory?: boolean;
  controlTarget?: HTMLElement | null;
  controlHidden?: boolean;
}) {
  const [localEnabled, setEnabled] = useState(true);
  const [muted, setMuted] = useState(true);
  const preference = useDirectoryCaptionPreference();
  const enabled = directory ? (preference ?? muted) : localEnabled;
  const [text, setText] = useState("");
  const [nativeFullscreen, setNativeFullscreen] = useState(false);
  const [position, setPosition] = useState({ bottom: 64, right: 12, top: 12, iconSize: 26 });
  const anchorRef = useRef<HTMLSpanElement>(null);
  const trackRef = useRef<{ video: HTMLVideoElement; track: TextTrack } | null>(null);
  const fullscreenVideoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    void version;
    const video = videoRef.current;
    if (!directory || !video) return;
    const update = () => setMuted(video.muted || video.volume === 0);
    update();
    video.addEventListener("volumechange", update);
    return () => video.removeEventListener("volumechange", update);
  }, [directory, version, videoRef]);

  useEffect(() => {
    void version;
    const video = videoRef.current;
    if (!video || !("VTTCue" in window)) return;
    if (trackRef.current?.video !== video) {
      trackRef.current = {
        video,
        track: video.addTextTrack("captions", "Português · Lectum", "pt"),
      };
    }
    const track = trackRef.current.track;
    const clear = () => {
      // Disabled tracks hide their cue list in browsers; expose it before removing cues.
      track.mode = "hidden";
      for (const cue of Array.from(track.cues ?? [])) track.removeCue(cue);
    };
    clear();
    try {
      for (const cue of captions.cues) track.addCue(new VTTCue(cue.start, cue.end, cue.text));
    } catch {
      clear();
      track.mode = "disabled";
      return;
    }
    const update = () =>
      setText(
        Array.from(track.activeCues ?? [])
          .map((cue) => (cue as VTTCue).text)
          .join("\n"),
      );
    let webkitFullscreen =
      fullscreenVideoRef.current === video ||
      Boolean(
        (video as HTMLVideoElement & { webkitDisplayingFullscreen?: boolean })
          .webkitDisplayingFullscreen,
      );
    const mode = () => {
      const fullscreen = document.fullscreenElement === video || webkitFullscreen;
      setNativeFullscreen(fullscreen);
      // HLS may add or auto-select provider captions after our own track is ready.
      for (const other of Array.from(video.textTracks)) {
        if (other !== track && (other.kind === "captions" || other.kind === "subtitles")) {
          if (other.mode !== "disabled") other.mode = "disabled";
        }
      }
      const nextMode = enabled ? (fullscreen ? "showing" : "hidden") : "disabled";
      if (track.mode !== nextMode) track.mode = nextMode;
      update();
    };
    const enterFullscreen = () => {
      fullscreenVideoRef.current = video;
      webkitFullscreen = true;
      mode();
    };
    const exitFullscreen = () => {
      fullscreenVideoRef.current = null;
      webkitFullscreen = false;
      mode();
    };
    mode();
    track.addEventListener("cuechange", update);
    video.textTracks.addEventListener("addtrack", mode);
    video.textTracks.addEventListener("change", mode);
    video.addEventListener("loadedmetadata", mode);
    video.addEventListener("webkitbeginfullscreen", enterFullscreen);
    video.addEventListener("webkitendfullscreen", exitFullscreen);
    document.addEventListener("fullscreenchange", mode);
    return () => {
      track.removeEventListener("cuechange", update);
      video.textTracks.removeEventListener("addtrack", mode);
      video.textTracks.removeEventListener("change", mode);
      video.removeEventListener("loadedmetadata", mode);
      video.removeEventListener("webkitbeginfullscreen", enterFullscreen);
      video.removeEventListener("webkitendfullscreen", exitFullscreen);
      document.removeEventListener("fullscreenchange", mode);
      clear();
      track.mode = "disabled";
    };
  }, [captions, enabled, version, videoRef]);

  useEffect(() => {
    void version;
    const root = anchorRef.current?.parentElement;
    if (!root) return;
    const overlayScope = root.closest("[data-lectum-caption-scope]") ?? root;
    let frame = 0;
    let observedOverlay: Element | null = null;
    let observedTop: Element | null = null;
    const measure = () => {
      const bounds = root.getBoundingClientRect();
      let parent: HTMLElement | null = root;
      let anchor: Element | null = null;
      for (let i = 0; i < 4 && parent; i++, parent = parent.parentElement) {
        anchor = parent.querySelector('button[aria-label="Abrir prévia para redes sociais"]');
        if (anchor) break;
      }
      anchor ??= overlayScope.querySelector("[data-reels-create-post]");
      const anchorBounds = anchor?.getBoundingClientRect();
      const rect = anchorBounds?.width && anchorBounds.height ? anchorBounds : undefined;
      const overlayElement =
        overlayScope.querySelector('[data-lectum-video-bottom-overlay="true"]') ??
        (directory || controlTarget
          ? root.querySelector(
              '[data-lectum-video-player-controls="true"]:not([aria-hidden="true"])',
            )
          : null);
      if (overlayElement !== observedOverlay) {
        if (observedOverlay) resize.unobserve(observedOverlay);
        if (overlayElement) resize.observe(overlayElement);
        observedOverlay = overlayElement;
      }
      const overlay = overlayElement?.getBoundingClientRect();
      const mobileTop = overlayScope
        .closest("[data-lectum-caption-directory-viewport]")
        ?.querySelector("[data-lectum-video-mobile-top-overlay]");
      const topElement = mobileTop?.getBoundingClientRect().height
        ? mobileTop
        : overlayScope.querySelector("[data-lectum-video-top-overlay]");
      if (topElement !== observedTop) {
        if (observedTop) resize.unobserve(observedTop);
        if (topElement) resize.observe(topElement);
        observedTop = topElement;
      }
      const topOverlay = topElement?.getBoundingClientRect();
      const directoryTop = overlayScope.hasAttribute("data-lectum-caption-directory") ? 76 : 12;
      const next = {
        iconSize: rect ? 32 : 26,
        bottom: overlay && overlay.height > 0 ? Math.max(64, bounds.bottom - overlay.top + 12) : 64,
        right: rect ? Math.max(0, bounds.right - rect.left - rect.width / 2 - 22) : 12,
        top: Math.max(
          directoryTop,
          rect ? rect.bottom - bounds.top + 8 : 12,
          topOverlay?.height ? topOverlay.bottom - bounds.top + 8 : 12,
        ),
      };
      setPosition((old) =>
        old.bottom === next.bottom &&
        old.right === next.right &&
        old.top === next.top &&
        old.iconSize === next.iconSize
          ? old
          : next,
      );
    };
    const schedule = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(measure);
    };
    const resize = new ResizeObserver(schedule);
    resize.observe(root);
    const mutation = new MutationObserver(schedule);
    mutation.observe(overlayScope, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: [
        "data-lectum-video-bottom-overlay",
        "data-lectum-caption-directory",
        "aria-hidden",
      ],
    });
    overlayScope.addEventListener("animationend", schedule);
    window.addEventListener("resize", schedule);
    measure();
    return () => {
      cancelAnimationFrame(frame);
      resize.disconnect();
      mutation.disconnect();
      overlayScope.removeEventListener("animationend", schedule);
      window.removeEventListener("resize", schedule);
    };
  }, [version, directory, controlTarget]);

  if (!captions.cues.length) return null;
  const button = (
    <button
      type="button"
      aria-label={enabled ? "Desativar legendas" : "Ativar legendas"}
      aria-pressed={enabled}
      title={enabled ? "Desativar legendas" : "Ativar legendas"}
      data-post-card-ignore-click="true"
      className={`grid h-11 w-11 place-items-center border-0 bg-transparent p-0 text-media-foreground shadow-none focus-visible:outline-2 focus-visible:outline-media-foreground ${controlTarget ? "" : "pointer-events-auto absolute z-20"}`}
      style={
        controlTarget
          ? undefined
          : { top: position.top, right: position.right, width: 44, height: 44 }
      }
      disabled={Boolean(controlTarget && controlHidden)}
      tabIndex={controlTarget && controlHidden ? -1 : undefined}
      onPointerDown={(event) => event.stopPropagation()}
      onClick={(event) => {
        event.stopPropagation();
        if (directory) setDirectoryCaptionPreference(!enabled);
        else setEnabled((value) => !value);
      }}
    >
      <CaptionIcon active={enabled} size={controlTarget ? 26 : position.iconSize} />
    </button>
  );
  return (
    <>
      <span ref={anchorRef} hidden aria-hidden="true" />
      {controlTarget ? createPortal(button, controlTarget) : !directory ? button : null}
      {enabled && !nativeFullscreen && text ? (
        <div
          className="pointer-events-none absolute inset-x-3 z-20 text-center text-sm leading-normal font-semibold text-media-foreground"
          data-lectum-captions="true"
          style={{
            bottom: `var(--lectum-caption-bottom, ${position.bottom}px)`,
            right: "var(--lectum-caption-right, 12px)",
          }}
        >
          <span className="inline-block max-w-full rounded-sm bg-media-background/55 px-1.5 py-1 leading-normal whitespace-pre-line [overflow-wrap:anywhere]">
            {text}
          </span>
        </div>
      ) : null}
    </>
  );
}
