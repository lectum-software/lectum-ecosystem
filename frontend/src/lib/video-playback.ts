export const ensureVideoCanPlayWithSound = (video: HTMLVideoElement | null) => {
  if (!video) return;

  video.muted = false;

  if (video.volume <= 0) {
    video.volume = 1;
  }
};

export const playVideoWithSound = async (video: HTMLVideoElement | null) => {
  if (!video) return false;

  ensureVideoCanPlayWithSound(video);

  try {
    await video.play();
    return true;
  } catch {
    return false;
  }
};

export const needsUserPlayWithSound = (video: HTMLVideoElement | null) =>
  !video || video.paused || video.muted || video.volume <= 0;
