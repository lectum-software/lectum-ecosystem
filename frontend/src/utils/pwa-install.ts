import { getBrowserStorage, readStorageItem, writeStorageItem } from "@/utils/browser-storage";
import { clearPromptDismissalState } from "@/utils/prompt-cooldown";

export type BeforeInstallPromptChoice = {
  outcome: "accepted" | "dismissed";
  platform: string;
};

export type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<BeforeInstallPromptChoice>;
};

export type ManualInstallPlatform = "android" | "generic" | "ios";

export const PWA_DISMISSED_UNTIL_KEY = "lectum.pwaInstall.dismissedUntil";
export const PWA_DISMISS_COUNT_KEY = "lectum.pwaInstall.dismissCount";
export const PWA_LEGACY_NEVER_SHOW_KEY = "lectum.pwaInstall.neverShowAgain";
export const PWA_INSTALLED_KEY = "lectum.pwaInstall.installed";

const deferredPromptSubscribers = new Set<() => void>();
let deferredPrompt: BeforeInstallPromptEvent | null = null;

const notifyDeferredPromptSubscribers = () => {
  for (const subscriber of deferredPromptSubscribers) {
    subscriber();
  }
};

export const setDeferredPwaInstallPrompt = (event: BeforeInstallPromptEvent) => {
  deferredPrompt = event;
  notifyDeferredPromptSubscribers();
};

export const getDeferredPwaInstallPrompt = () => deferredPrompt;

export const consumeDeferredPwaInstallPrompt = () => {
  const prompt = deferredPrompt;
  deferredPrompt = null;
  notifyDeferredPromptSubscribers();

  return prompt;
};

export const subscribeToDeferredPwaInstallPrompt = (subscriber: () => void) => {
  deferredPromptSubscribers.add(subscriber);

  return () => {
    deferredPromptSubscribers.delete(subscriber);
  };
};

export const isStandaloneMode = () => {
  if (typeof window === "undefined") return true;

  const navigatorWithStandalone = window.navigator as Navigator & { standalone?: boolean };

  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    window.matchMedia("(display-mode: fullscreen)").matches ||
    navigatorWithStandalone.standalone === true
  );
};

export const isMobileExperience = () => {
  if (typeof window === "undefined") return false;

  return window.matchMedia("(max-width: 767px), (pointer: coarse)").matches;
};

export const isIosDevice = () => {
  if (typeof window === "undefined") return false;

  const userAgent = window.navigator.userAgent.toLowerCase();
  const platform = window.navigator.platform?.toLowerCase() ?? "";
  const isTouchMac = platform === "macintel" && window.navigator.maxTouchPoints > 1;

  return /iphone|ipad|ipod/.test(userAgent) || isTouchMac;
};

const isAndroidDevice = () => {
  if (typeof window === "undefined") return false;

  return window.navigator.userAgent.toLowerCase().includes("android");
};

export const getManualInstallPlatform = (): ManualInstallPlatform => {
  if (isIosDevice()) return "ios";
  if (isAndroidDevice()) return "android";

  return "generic";
};

export const isPwaMarkedInstalled = () => {
  const storage = getBrowserStorage("localStorage");

  return readStorageItem(storage, PWA_INSTALLED_KEY) === "true";
};

export const markPwaInstalled = () => {
  const storage = getBrowserStorage("localStorage");
  if (!storage) return;

  writeStorageItem(storage, PWA_INSTALLED_KEY, "true");
  clearPromptDismissalState({
    dismissedUntilKey: PWA_DISMISSED_UNTIL_KEY,
    dismissCountKey: PWA_DISMISS_COUNT_KEY,
    legacyPermanentDismissKeys: [PWA_LEGACY_NEVER_SHOW_KEY],
    storage,
  });
};

export const shouldShowPwaInstallProfileEntry = () => {
  if (typeof window === "undefined") return false;
  if (isStandaloneMode() || isPwaMarkedInstalled()) return false;

  return isMobileExperience();
};

export const dispatchPwaInstallPromptAccepted = () => {
  if (typeof window === "undefined") return;

  window.dispatchEvent(new CustomEvent("lectum:pwa-install-prompt-accepted"));
};
