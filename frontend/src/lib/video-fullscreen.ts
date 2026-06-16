type FullscreenVideoElement = HTMLVideoElement & {
  webkitEnterFullscreen?: () => void;
  webkitSupportsFullscreen?: boolean;
};

type RequestVideoFullscreenOptions = {
  forceContain?: boolean;
  temporaryControls?: boolean;
};

export const requestVideoFullscreen = async (
  video: HTMLVideoElement | null,
  options: RequestVideoFullscreenOptions = {},
) => {
  if (!video || typeof document === "undefined") return false;

  const previousControls = video.controls;
  const previousBackgroundColor = video.style.backgroundColor;
  const previousHeight = video.style.height;
  const previousMaxHeight = video.style.maxHeight;
  const previousMaxWidth = video.style.maxWidth;
  const previousObjectFit = video.style.objectFit;
  const previousObjectPosition = video.style.objectPosition;
  const previousWidth = video.style.width;
  let restored = false;

  const restoreVideo = () => {
    if (restored) return;

    restored = true;

    if (options.temporaryControls) {
      video.controls = previousControls;
    }

    if (options.forceContain) {
      video.style.backgroundColor = previousBackgroundColor;
      video.style.height = previousHeight;
      video.style.maxHeight = previousMaxHeight;
      video.style.maxWidth = previousMaxWidth;
      video.style.objectFit = previousObjectFit;
      video.style.objectPosition = previousObjectPosition;
      video.style.width = previousWidth;
    }

    document.removeEventListener("fullscreenchange", handleFullscreenChange);
    video.removeEventListener("webkitendfullscreen", restoreVideo);
  };

  const handleFullscreenChange = () => {
    if (!document.fullscreenElement) {
      restoreVideo();
    }
  };

  if (options.temporaryControls) {
    video.controls = true;
  }

  if (options.forceContain) {
    video.style.backgroundColor = "black";
    video.style.height = "100vh";
    video.style.maxHeight = "100vh";
    video.style.maxWidth = "100vw";
    video.style.objectFit = "contain";
    video.style.objectPosition = "center center";
    video.style.width = "100vw";
  }

  document.addEventListener("fullscreenchange", handleFullscreenChange);
  video.addEventListener("webkitendfullscreen", restoreVideo, { once: true });

  try {
    const webkitVideo = video as FullscreenVideoElement;

    if (webkitVideo.webkitEnterFullscreen) {
      webkitVideo.webkitEnterFullscreen();
      return true;
    }

    if (video.requestFullscreen) {
      await video.requestFullscreen({ navigationUI: "hide" });
      return true;
    }
  } catch {
    restoreVideo();
    return false;
  }

  restoreVideo();
  return false;
};
