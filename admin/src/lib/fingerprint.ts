import FingerprintJS from "@fingerprintjs/fingerprintjs";
import { getStoredDevice, setStoredDevice } from "@/lib/storage";

let devicePromise: Promise<string> | null = null;
const FINGERPRINT_TIMEOUT_MS = 3_000;

const createFallbackDeviceId = () => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `admin-local-${crypto.randomUUID()}`;
  }

  return `admin-local-${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const resolveDeviceId = async () => {
  const stored = getStoredDevice();
  if (stored) return stored;

  try {
    const result = await new Promise<
      Awaited<ReturnType<Awaited<ReturnType<typeof FingerprintJS.load>>["get"]>>
    >((resolve, reject) => {
      const timeout = window.setTimeout(
        () => reject(new Error("Fingerprint indisponível")),
        FINGERPRINT_TIMEOUT_MS,
      );

      void FingerprintJS.load()
        .then((agent) => agent.get())
        .then(resolve, reject)
        .finally(() => window.clearTimeout(timeout));
    });
    const visitorId = `admin-${result.visitorId}`;
    setStoredDevice(visitorId);
    return visitorId;
  } catch {
    const fallback = createFallbackDeviceId();
    setStoredDevice(fallback);
    return fallback;
  }
};

export const getAdminDeviceId = () => {
  if (typeof window === "undefined") return Promise.resolve("admin-server-render");

  devicePromise ??= resolveDeviceId();
  return devicePromise;
};
