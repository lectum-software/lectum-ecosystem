"use client";

import { Download, Share, Smartphone, X } from "lucide-react";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { useAppSelector } from "@/hooks/redux";
import { cn } from "@/lib/utils";
import { Button } from "@/registry/new-york-v4/ui/button";
import {
  clearPromptDismissalState,
  hasCompletedRegistrationForPrompts,
  markPromptDismissedWithBackoff,
  type PromptUserRole,
} from "@/utils/prompt-cooldown";

type BeforeInstallPromptChoice = {
  outcome: "accepted" | "dismissed";
  platform: string;
};

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<BeforeInstallPromptChoice>;
};

type PromptKind = "native" | "ios";

const DISMISSED_UNTIL_KEY = "lectum.pwaInstall.dismissedUntil";
const DISMISS_COUNT_KEY = "lectum.pwaInstall.dismissCount";
const LEGACY_NEVER_SHOW_KEY = "lectum.pwaInstall.neverShowAgain";
const INSTALLED_KEY = "lectum.pwaInstall.installed";
const ACTIVE_PROMPT_KEY = "lectum.activePrompt";
const ACTIVE_PROMPT_VALUE = "pwa-install";
const SHOW_DELAY_MS = 1400;

const safeLocalStorage = () => {
  if (typeof window === "undefined") return null;

  try {
    return window.localStorage;
  } catch {
    return null;
  }
};

const safeSessionStorage = () => {
  if (typeof window === "undefined") return null;

  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
};

const isStandaloneMode = () => {
  if (typeof window === "undefined") return true;

  const navigatorWithStandalone = window.navigator as Navigator & { standalone?: boolean };

  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    window.matchMedia("(display-mode: fullscreen)").matches ||
    navigatorWithStandalone.standalone === true
  );
};

const isMobileExperience = () => {
  if (typeof window === "undefined") return false;

  return window.matchMedia("(max-width: 767px), (pointer: coarse)").matches;
};

const isIosDevice = () => {
  if (typeof window === "undefined") return false;

  const userAgent = window.navigator.userAgent.toLowerCase();
  const platform = window.navigator.platform?.toLowerCase() ?? "";
  const isTouchMac = platform === "macintel" && window.navigator.maxTouchPoints > 1;

  return /iphone|ipad|ipod/.test(userAgent) || isTouchMac;
};

const isDismissedByPreference = () => {
  const storage = safeLocalStorage();
  if (!storage) return true;

  if (storage.getItem(INSTALLED_KEY) === "true") return true;

  const dismissedUntil = Number(storage.getItem(DISMISSED_UNTIL_KEY) ?? 0);

  return Number.isFinite(dismissedUntil) && dismissedUntil > Date.now();
};

const reserveActivePrompt = () => {
  const storage = safeSessionStorage();
  if (!storage) return true;

  const activePrompt = storage.getItem(ACTIVE_PROMPT_KEY);
  if (activePrompt && activePrompt !== ACTIVE_PROMPT_VALUE) return false;

  storage.setItem(ACTIVE_PROMPT_KEY, ACTIVE_PROMPT_VALUE);

  return true;
};

const releaseActivePrompt = () => {
  const storage = safeSessionStorage();
  if (!storage) return;

  if (storage.getItem(ACTIVE_PROMPT_KEY) === ACTIVE_PROMPT_VALUE) {
    storage.removeItem(ACTIVE_PROMPT_KEY);
  }
};

const markDismissedForCooldown = (role: PromptUserRole) => {
  const storage = safeLocalStorage();
  if (!storage) return;

  markPromptDismissedWithBackoff({
    dismissedUntilKey: DISMISSED_UNTIL_KEY,
    dismissCountKey: DISMISS_COUNT_KEY,
    role,
    storage,
  });
};

const markInstalled = () => {
  const storage = safeLocalStorage();
  if (!storage) return;

  storage.setItem(INSTALLED_KEY, "true");
  clearPromptDismissalState({
    dismissedUntilKey: DISMISSED_UNTIL_KEY,
    dismissCountKey: DISMISS_COUNT_KEY,
    legacyPermanentDismissKeys: [LEGACY_NEVER_SHOW_KEY],
    storage,
  });
};

export function PwaInstallPrompt() {
  const pathname = usePathname();
  const user = useAppSelector((state) => state.user);
  const [isVisible, setIsVisible] = useState(false);
  const [promptKind, setPromptKind] = useState<PromptKind>("native");
  const [showIosSteps, setShowIosSteps] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const hasCompletedRegistration = hasCompletedRegistrationForPrompts(user);

  useEffect(() => {
    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      markInstalled();
      setIsVisible(false);
      releaseActivePrompt();
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
      releaseActivePrompt();
    };
  }, []);

  useEffect(() => {
    if (isVisible) return;

    const isPrivateAppRoute = pathname.startsWith("/app");
    const iosDevice = isIosDevice();
    const canInstallNatively = Boolean(deferredPrompt);
    const canOfferInstall = iosDevice || canInstallNatively;

    if (
      !isPrivateAppRoute ||
      !hasCompletedRegistration ||
      !isMobileExperience() ||
      !canOfferInstall ||
      isStandaloneMode() ||
      isDismissedByPreference()
    ) {
      return;
    }

    const timer = window.setTimeout(() => {
      if (!reserveActivePrompt()) return;

      setPromptKind(iosDevice ? "ios" : "native");
      setIsVisible(true);
    }, SHOW_DELAY_MS);

    return () => window.clearTimeout(timer);
  }, [deferredPrompt, hasCompletedRegistration, isVisible, pathname]);

  useEffect(() => {
    if (!isVisible || hasCompletedRegistration) return;

    releaseActivePrompt();
  }, [hasCompletedRegistration, isVisible]);

  const closePrompt = useCallback(
    (persist: "cooldown" | "installed") => {
      if (persist === "cooldown") {
        markDismissedForCooldown(user?.role);
      }

      if (persist === "installed") {
        markInstalled();
      }

      setIsVisible(false);
      releaseActivePrompt();
    },
    [user?.role],
  );

  const handleInstall = async () => {
    if (promptKind === "ios") {
      if (showIosSteps) {
        closePrompt("cooldown");
        return;
      }

      setShowIosSteps(true);
      return;
    }

    if (!deferredPrompt) {
      closePrompt("cooldown");
      return;
    }

    try {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      setDeferredPrompt(null);

      if (choice.outcome === "accepted") {
        window.dispatchEvent(new CustomEvent("lectum:pwa-install-prompt-accepted"));
      }

      closePrompt(choice.outcome === "accepted" ? "installed" : "cooldown");
    } catch {
      closePrompt("cooldown");
    }
  };

  if (!isVisible || !hasCompletedRegistration) return null;

  return (
    <div
      className={cn(
        "fixed inset-0 z-[70] flex items-end justify-center bg-media-background/35 px-3 pt-6 text-foreground backdrop-blur-[8px] transition-opacity duration-200 ease-out supports-[backdrop-filter]:bg-media-background/35",
        "pb-[calc(5rem+env(safe-area-inset-bottom))] sm:items-center sm:px-6 sm:pb-6",
      )}
    >
      <section
        aria-label="Adicionar a Lectum à tela inicial"
        aria-modal="true"
        className="relative w-full max-w-[440px] rounded-[1.75rem] border border-border bg-surface p-4 text-foreground shadow-[var(--lectum-shadow)]"
        role="dialog"
      >
        <button
          aria-label="Agora não"
          className="absolute top-3 right-3 inline-grid h-8 w-8 place-items-center rounded-full text-muted transition hover:bg-primary-soft hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25"
          onClick={() => closePrompt("cooldown")}
          type="button"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>

        <div className="flex gap-3 pr-8">
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-primary-soft p-1.5">
            <Image
              alt=""
              aria-hidden="true"
              className="h-9 w-9 object-contain"
              height={36}
              src="/icon.png"
              width={36}
            />
          </div>

          <div className="min-w-0">
            <p className="text-base font-extrabold tracking-[-0.03em] text-foreground">
              Adicionar a Lectum à tela inicial
            </p>
            <p className="mt-1 text-sm leading-5 text-muted">
              Crie um atalho na tela inicial do celular para voltar rapidamente à Lectum.
            </p>
          </div>
        </div>

        {promptKind === "ios" && showIosSteps ? (
          <div className="mt-3 rounded-2xl border border-border bg-surface-muted p-3 text-sm text-foreground">
            <div className="mb-2 flex items-center gap-2 font-bold">
              <Share className="h-4 w-4 text-primary" aria-hidden="true" />
              No iPhone ou iPad
            </div>
            <ol className="list-decimal space-y-1 pl-5 text-muted">
              <li>Abra a Lectum no Safari.</li>
              <li>Toque em Compartilhar.</li>
              <li>Escolha Adicionar à Tela de Início e confirme.</li>
            </ol>
          </div>
        ) : null}

        <div className="mt-4 grid gap-2">
          <Button
            className="h-11 rounded-2xl text-sm font-extrabold"
            onClick={handleInstall}
            type="button"
          >
            {promptKind === "ios" && showIosSteps ? (
              <Smartphone className="h-4 w-4" aria-hidden="true" />
            ) : (
              <Download className="h-4 w-4" aria-hidden="true" />
            )}
            <span>
              {promptKind === "ios" && showIosSteps ? "Entendi" : "Adicionar à tela inicial"}
            </span>
          </Button>

          <Button
            className="h-10 rounded-2xl text-xs font-bold"
            onClick={() => closePrompt("cooldown")}
            type="button"
            variant="outline"
          >
            Agora não
          </Button>
        </div>
      </section>
    </div>
  );
}
