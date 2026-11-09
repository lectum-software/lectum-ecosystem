type Surface = "directory" | "content" | "other";
type Entry = {
  ms: number;
  event: string;
  video?: number;
  selection?: number;
  surface?: Surface;
  active?: boolean;
  ready?: number;
  mediaMs?: number;
  durationMs?: number;
};

export function createVideoDiagnosticLog(now: () => number) {
  const started = now();
  const entries: Entry[] = [];
  let dropped = 0;
  return {
    add(entry: Omit<Entry, "ms">) {
      if (entries.length >= 4000) {
        dropped += 1;
        return;
      }
      entries.push({ ...entry, ms: Math.round(now() - started) });
    },
    report() {
      return { schema: 1, dropped, entries: entries.map((entry) => ({ ...entry })) };
    },
  };
}

export function startVideoDiagnostics() {
  const log = createVideoDiagnosticLog(() => performance.now());
  const ids = new WeakMap<HTMLVideoElement, number>();
  const frames = new Map<HTMLVideoElement, number>();
  let nextId = 0;
  let selection = 0;
  let selected: Element | null = null;
  let selectedVideo: HTMLVideoElement | null = null;
  let stopped = false;
  const selector = '[data-reels-active="true"], [data-video-diagnostic-active="true"]';
  const details = (video: HTMLVideoElement) => {
    if (!ids.has(video)) ids.set(video, ++nextId);
    const surface: Surface = video.matches('[data-reels-persistent-player="true"]')
      ? "content"
      : video.matches('[data-psychologists-background="true"]')
        ? "directory"
        : "other";
    return {
      video: ids.get(video),
      selection,
      surface,
      active: Boolean(video.closest(selector)),
      ready: video.readyState,
      mediaMs: Math.round(video.currentTime * 1000),
    };
  };
  const cancelFrame = (video: HTMLVideoElement) => {
    const frame = frames.get(video);
    if (frame !== undefined) video.cancelVideoFrameCallback(frame);
    frames.delete(video);
  };
  const armFrame = (video: HTMLVideoElement) => {
    cancelFrame(video);
    if (typeof video.requestVideoFrameCallback !== "function") {
      log.add({ event: "frame-api-unavailable", ...details(video) });
      return;
    }
    frames.set(
      video,
      video.requestVideoFrameCallback(() => {
        frames.delete(video);
        if (!stopped) log.add({ event: "first-observed-frame", ...details(video) });
      }),
    );
  };
  const scanSelection = () => {
    // Reels can overlay the directory; prioritize the foreground content viewer.
    const node =
      document.querySelector('[data-reels-active="true"]') ??
      document.querySelector('[data-video-diagnostic-active="true"]');
    const video = node?.querySelector("video") ?? null;
    if (node !== selected) {
      if (selectedVideo) cancelFrame(selectedVideo);
      selected = node;
      selectedVideo = null;
      selection += 1;
      log.add({ event: node ? "selection" : "selection-cleared", selection });
    }
    if (video && video !== selectedVideo) {
      selectedVideo = video;
      log.add({ event: "selected-video", ...details(video) });
      armFrame(video);
    }
    for (const pending of frames.keys()) {
      if (!pending.isConnected) cancelFrame(pending);
    }
  };
  const mediaEvents = [
    "loadstart",
    "emptied",
    "loadedmetadata",
    "loadeddata",
    "canplay",
    "playing",
    "waiting",
    "stalled",
    "pause",
    "seeking",
    "seeked",
    "ended",
    "error",
  ];
  const onMedia = (event: Event) => {
    const video = event.target;
    if (!(video instanceof HTMLVideoElement)) return;
    scanSelection();
    log.add({ event: event.type, ...details(video) });
    if (event.type === "emptied") cancelFrame(video);
    if (event.type === "loadstart") armFrame(video);
  };
  for (const event of mediaEvents) document.addEventListener(event, onMedia, true);
  const visibility = () => log.add({ event: document.hidden ? "hidden" : "visible" });
  document.addEventListener("visibilitychange", visibility);
  const observer = new MutationObserver(scanSelection);
  observer.observe(document.body, {
    subtree: true,
    childList: true,
    attributes: true,
    attributeFilter: ["data-reels-active", "data-video-diagnostic-active"],
  });
  // Resource names are classified locally and never retained in the report.
  const resources =
    typeof PerformanceObserver === "undefined"
      ? null
      : new PerformanceObserver((list) => {
          for (const resource of list.getEntries()) {
            let path: string;
            try {
              path = new URL(resource.name).pathname;
            } catch {
              continue;
            }
            const kind = /\/video-assets\/[^/]+\/playback$/.test(path)
              ? "playback-response"
              : /\.m3u8$/.test(path)
                ? "manifest-response"
                : /\.(m4s|ts)$/.test(path)
                  ? "segment-response"
                  : null;
            if (kind) log.add({ event: kind, durationMs: Math.round(resource.duration) });
          }
        });
  try {
    resources?.observe({ type: "resource" });
  } catch {
    /* Optional on older Safari. */
  }
  log.add({ event: "started" });
  visibility();
  scanSelection();
  return {
    report: log.report,
    stop() {
      if (stopped) return;
      stopped = true;
      log.add({ event: "stopped" });
      observer.disconnect();
      resources?.disconnect();
      for (const event of mediaEvents) document.removeEventListener(event, onMedia, true);
      document.removeEventListener("visibilitychange", visibility);
      for (const video of frames.keys()) cancelFrame(video);
    },
  };
}
