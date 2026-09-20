export const toggleVideoElementPlayback = async (video: HTMLVideoElement | null) => {
  if (!video) return false;

  if (video.paused || video.ended) {
    return playVideoWithActiveDocument(video);
  }

  video.pause();
  return true;
};

import { playVideoWithActiveDocument } from "./video-playback";
