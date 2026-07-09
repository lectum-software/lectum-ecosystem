import FingerprintJS from "@fingerprintjs/fingerprintjs";
import { getStoredDevice, setStoredDevice } from "@/lib/storage";

let devicePromise: Promise<string> | null = null;

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
    const agent = await FingerprintJS.load();
    const result = await agent.get();
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
