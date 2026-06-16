export const toggleVideoElementPlayback = async (video: HTMLVideoElement | null) => {
  if (!video) return false;

  if (video.paused || video.ended) {
    try {
      await video.play();
      return true;
    } catch {
      return false;
    }
  }

  video.pause();
  return true;
};
