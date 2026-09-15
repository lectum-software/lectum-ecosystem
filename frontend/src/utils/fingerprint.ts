import FingerprintJS, {
  type GetResult,
  type UnknownComponents,
} from "@fingerprintjs/fingerprintjs";

const STABLE_COMPONENT_KEYS: (keyof GetResult["components"])[] = [
  "platform",
  "deviceMemory",
  "hardwareConcurrency",
  "osCpu",
  "cpuClass",
  "vendor",
  "vendorFlavors",
];
const FALLBACK_DEVICE_KEY = "lectum.device";
const FINGERPRINT_TIMEOUT_MS = 3000;

const createFallbackDeviceId = () => {
  const randomPart = globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2);

  return `device-${randomPart}`;
};

const fallbackDeviceId = () => {
  if (typeof window === "undefined") return null;

  try {
    const stored = window.localStorage.getItem(FALLBACK_DEVICE_KEY);
    if (stored) return stored;

    const id = createFallbackDeviceId();
    window.localStorage.setItem(FALLBACK_DEVICE_KEY, id);
    return id;
  } catch {
    return createFallbackDeviceId();
  }
};

let fingerprintPromise: Promise<string | null> | null = null;

const resolveFingerprint = async (): Promise<string | null> => {
  let timeout: ReturnType<typeof setTimeout> | null = null;

  try {
    const fingerprintResult = FingerprintJS.load().then((agent) => agent.get());
    const timeoutResult = new Promise<never>((_, reject) => {
      timeout = setTimeout(() => reject(new Error("Fingerprint timeout")), FINGERPRINT_TIMEOUT_MS);
    });
    const result = await Promise.race([fingerprintResult, timeoutResult]);

    const componentsToHash = STABLE_COMPONENT_KEYS.reduce<UnknownComponents>((acc, key) => {
      const component = result.components[key];
      if (component) {
        acc[key] = component;
      }

      return acc;
    }, {});

    return FingerprintJS.hashComponents(componentsToHash);
  } catch {
    return fallbackDeviceId();
  } finally {
    if (timeout) clearTimeout(timeout);
  }
};

export const fingerprint = () => {
  fingerprintPromise ??= resolveFingerprint();

  return fingerprintPromise;
};
