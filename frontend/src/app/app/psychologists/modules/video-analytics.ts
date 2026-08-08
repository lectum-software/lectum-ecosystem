export const SWIPE_HINT_NUDGE_DURATION_MS = 760;

export type VideoProgressState = {
  currentTime: number;
  duration: number;
};

export type FeedVideoAnalyticsState = {
  completed: boolean;
  lastPosition: number;
  lastSentAt: number;
  maxPosition: number;
  milestones: {
    milestone_25: boolean;
    milestone_50: boolean;
    milestone_75: boolean;
    milestone_100: boolean;
  };
  profileId: string | null;
  replayCount: number;
  retentionBuckets: Set<number>;
  sessionKey: string | null;
  videoUrl: string | null;
  watchedSeconds: Set<number>;
};

export const createEmptyFeedVideoAnalyticsState = (): FeedVideoAnalyticsState => ({
  completed: false,
  lastPosition: 0,
  lastSentAt: 0,
  maxPosition: 0,
  milestones: {
    milestone_25: false,
    milestone_50: false,
    milestone_75: false,
    milestone_100: false,
  },
  profileId: null,
  replayCount: 0,
  retentionBuckets: new Set(),
  sessionKey: null,
  videoUrl: null,
  watchedSeconds: new Set(),
});

const hashVideoSessionStorageKey = (value: string) => {
  let hash = 2166136261;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return (hash >>> 0).toString(36);
};

export const createVideoSessionKey = (profileId: string, videoUrl: string) => {
  const storageKey = `lectum:presentation-video-session:${profileId}:${hashVideoSessionStorageKey(videoUrl)}`;

  try {
    const stored = window.sessionStorage.getItem(storageKey);
    if (stored) return stored;

    const generated =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

    window.sessionStorage.setItem(storageKey, generated);

    return generated;
  } catch {
    return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }
};
