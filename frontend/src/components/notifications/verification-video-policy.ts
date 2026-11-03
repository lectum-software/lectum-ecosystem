export const VERIFICATION_VIDEO = {
  id: "verification-v1",
  title: "Selo verificado: o que significa?",
  description: "Clique e descubra o que verificamos antes de conceder o selo ao profissional.",
  src: "/videos/verification-v1.mp4",
} as const;

export const hasWatchedVerificationVideo = (played: TimeRanges, duration: number) => {
  if (!Number.isFinite(duration) || duration <= 0) return false;
  let seconds = 0;
  for (let i = 0; i < played.length; i += 1) {
    seconds += Math.max(0, Math.min(duration, played.end(i)) - Math.max(0, played.start(i)));
  }
  return seconds / duration >= 0.9;
};
