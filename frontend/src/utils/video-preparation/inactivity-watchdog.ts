export const VIDEO_PREPARATION_INACTIVITY_TIMEOUT_MS = 120_000;

export const createVideoPreparationInactivityWatchdog = (
  onInactive: () => void,
  timeoutMs = VIDEO_PREPARATION_INACTIVITY_TIMEOUT_MS,
) => {
  let timeout: ReturnType<typeof setTimeout> | null = null;

  const clear = () => {
    if (!timeout) return;
    clearTimeout(timeout);
    timeout = null;
  };

  return {
    clear,
    reset: () => {
      clear();
      timeout = setTimeout(() => {
        timeout = null;
        onInactive();
      }, timeoutMs);
    },
  };
};
