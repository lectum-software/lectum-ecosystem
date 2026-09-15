type WakeLockSentinelLike = EventTarget & {
  released?: boolean;
  release: () => Promise<void>;
};

type WakeLockNavigator = Navigator & {
  wakeLock?: {
    request: (type: "screen") => Promise<WakeLockSentinelLike>;
  };
};

export type LectumScreenWakeLock = {
  release: () => Promise<void>;
};

const canRequestScreenWakeLock = () =>
  typeof document !== "undefined" &&
  typeof navigator !== "undefined" &&
  document.visibilityState === "visible" &&
  Boolean((navigator as WakeLockNavigator).wakeLock?.request);

export const requestLectumScreenWakeLock = async (): Promise<LectumScreenWakeLock | null> => {
  if (!canRequestScreenWakeLock()) return null;

  const wakeLock = (navigator as WakeLockNavigator).wakeLock;
  let releasedByLectum = false;
  let sentinel: WakeLockSentinelLike | null = null;

  const acquire = async () => {
    if (releasedByLectum || !canRequestScreenWakeLock()) return;

    try {
      sentinel = (await wakeLock?.request("screen")) ?? null;
    } catch {
      sentinel = null;
    }
  };

  const reacquireWhenVisible = () => {
    if (releasedByLectum || document.visibilityState !== "visible") return;

    void acquire();
  };

  await acquire();

  if (!sentinel) return null;

  document.addEventListener("visibilitychange", reacquireWhenVisible);

  return {
    release: async () => {
      releasedByLectum = true;
      document.removeEventListener("visibilitychange", reacquireWhenVisible);

      if (!sentinel || sentinel.released) return;

      try {
        await sentinel.release();
      } catch {
        // Wake Lock is best-effort; download preparation must not fail if release is denied.
      } finally {
        sentinel = null;
      }
    },
  };
};
