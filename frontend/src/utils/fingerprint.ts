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

const fallbackDeviceId = () => {
  if (typeof window === "undefined") return null;

  const stored = window.localStorage.getItem(FALLBACK_DEVICE_KEY);
  if (stored) return stored;

  const id = `device-${crypto.randomUUID()}`;
  window.localStorage.setItem(FALLBACK_DEVICE_KEY, id);
  return id;
};

let fingerprintPromise: Promise<string | null> | null = null;

const resolveFingerprint = async (): Promise<string | null> => {
  try {
    const fp = await FingerprintJS.load();
    const result = await fp.get();

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
  }
};

export const fingerprint = () => {
  fingerprintPromise ??= resolveFingerprint();

  return fingerprintPromise;
};
