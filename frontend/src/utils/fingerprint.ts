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

export const fingerprint = async (): Promise<string | null> => {
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
  } catch (error) {
    console.error("Fingerprint generation failed:", error);

    return null;
  }
};
