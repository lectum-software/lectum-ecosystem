const PUSH_OPERATION_TIMEOUT_MS = 10_000;
const PUSH_UNSUBSCRIBE_TIMEOUT_MS = 3_000;

export const withPushOperationTimeout = async <T>(
  promise: Promise<T>,
  timeoutMs = PUSH_OPERATION_TIMEOUT_MS,
) => {
  let timeout: ReturnType<typeof setTimeout> | null = null;

  try {
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeout = setTimeout(() => reject(new Error("Push operation timeout")), timeoutMs);
    });

    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timeout) clearTimeout(timeout);
  }
};

export const unsubscribeCurrentPushSubscription = async () => {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return false;

  const unsubscribe = async () => {
    const registration = await navigator.serviceWorker.getRegistration();
    if (!registration) return true;

    const subscription = await registration.pushManager.getSubscription();
    if (!subscription) return true;

    return subscription.unsubscribe();
  };

  return withPushOperationTimeout(unsubscribe(), PUSH_UNSUBSCRIBE_TIMEOUT_MS);
};
