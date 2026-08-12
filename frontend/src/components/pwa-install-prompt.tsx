"use client";

import { Download, MoreHorizontal, Share, Smartphone, X } from "lucide-react";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { useAppSelector } from "@/hooks/redux";
import { cn } from "@/lib/utils";
import { Button } from "@/registry/new-york-v4/ui/button";
import { getBrowserStorage, readStorageItem } from "@/utils/browser-storage";
import {
  hasCompletedRegistrationForPrompts,
  markPromptDismissedWithBackoff,
  type PromptUserRole,
} from "@/utils/prompt-cooldown";
import {
  releaseActivePrompt as releaseCoordinatedPrompt,
  reserveActivePrompt as reserveCoordinatedPrompt,
} from "@/utils/prompt-coordinator";
import {
  type BeforeInstallPromptEvent,
  consumeDeferredPwaInstallPrompt,
  dispatchPwaInstallPromptAccepted,
  getDeferredPwaInstallPrompt,
  isAndroidDevice,
  isIosDevice,
  isMobileExperience,
  isPwaMarkedInstalled,
  isStandaloneMode,
  markPwaInstalled,
  PWA_DISMISS_COUNT_KEY,
  PWA_DISMISSED_UNTIL_KEY,
  setDeferredPwaInstallPrompt,
  subscribeToDeferredPwaInstallPrompt,
} from "@/utils/pwa-install";

type PromptKind = "android" | "ios" | "native";

const ACTIVE_PROMPT_VALUE = "pwa-install";
const SHOW_DELAY_MS = 1400;

const isPrivateAppPath = (pathname: string) => pathname === "/app" || pathname.startsWith("/app/");

const isDismissedByPreference = ({
  ignoreInstalledMarker = false,
}: {
  ignoreInstalledMarker?: boolean;
} = {}) => {
  const storage = getBrowserStorage("localStorage");
  if (!storage) return true;

  if (!ignoreInstalledMarker && isPwaMarkedInstalled()) return true;

  const dismissedUntil = Number(readStorageItem(storage, PWA_DISMISSED_UNTIL_KEY) ?? 0);

  return Number.isFinite(dismissedUntil) && dismissedUntil > Date.now();
};

const reserveActivePrompt = () => {
  return reserveCoordinatedPrompt(ACTIVE_PROMPT_VALUE);
};

const releaseActivePrompt = () => {
  releaseCoordinatedPrompt(ACTIVE_PROMPT_VALUE);
};

const markDismissedForCooldown = (role: PromptUserRole) => {
  const storage = getBrowserStorage("localStorage");
  if (!storage) return;

  markPromptDismissedWithBackoff({
    dismissedUntilKey: PWA_DISMISSED_UNTIL_KEY,
    dismissCountKey: PWA_DISMISS_COUNT_KEY,
    role,
    storage,
  });
};

export function PwaInstallPrompt() {
  const pathname = usePathname();
  const user = useAppSelector((state) => state.user);
  const [isVisible, setIsVisible] = useState(false);
  const [promptKind, setPromptKind] = useState<PromptKind>("native");
  const [showManualSteps, setShowManualSteps] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(
    getDeferredPwaInstallPrompt(),
  );
  const [isInstalling, setIsInstalling] = useState(false);
  const hasCompletedRegistration = hasCompletedRegistrationForPrompts(user);

  useEffect(() => {
    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setDeferredPwaInstallPrompt(event as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      markPwaInstalled();
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
    const syncDeferredPrompt = () => {
      setDeferredPrompt(getDeferredPwaInstallPrompt());
    };

    const syncTimer = window.setTimeout(syncDeferredPrompt, 0);
    const unsubscribe = subscribeToDeferredPwaInstallPrompt(syncDeferredPrompt);

    return () => {
      window.clearTimeout(syncTimer);
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (isVisible) return;

    const isPrivateAppRoute = isPrivateAppPath(pathname);
    const androidDevice = isAndroidDevice();
    const iosDevice = isIosDevice();
    const canInstallNatively = Boolean(deferredPrompt);
    const canOfferInstall = androidDevice || iosDevice || canInstallNatively;

    if (
      !isPrivateAppRoute ||
      !hasCompletedRegistration ||
      !isMobileExperience() ||
      !canOfferInstall ||
      isStandaloneMode() ||
      isDismissedByPreference({ ignoreInstalledMarker: canInstallNatively })
    ) {
      return;
    }

    const timer = window.setTimeout(() => {
      if (!reserveActivePrompt()) return;

      setPromptKind(canInstallNatively ? "native" : iosDevice ? "ios" : "android");
      setIsVisible(true);
    }, SHOW_DELAY_MS);

    return () => window.clearTimeout(timer);
  }, [deferredPrompt, hasCompletedRegistration, isVisible, pathname]);

  useEffect(() => {
    if (!isVisible) return;
    if (hasCompletedRegistration && isPrivateAppPath(pathname)) return;

    releaseActivePrompt();
    const timer = window.setTimeout(() => {
      setIsVisible(false);
      setShowManualSteps(false);
    }, 0);

    return () => window.clearTimeout(timer);
  }, [hasCompletedRegistration, isVisible, pathname]);

  const closePrompt = useCallback(
    (persist: "cooldown" | "installed") => {
      if (persist === "cooldown") {
        markDismissedForCooldown(user?.role);
      }

      if (persist === "installed") {
        markPwaInstalled();
      }

      setIsVisible(false);
      releaseActivePrompt();
    },
    [user?.role],
  );

  const handleInstall = async () => {
    if (isInstalling) return;

    if (promptKind !== "native") {
      if (showManualSteps) {
        closePrompt("cooldown");
        return;
      }

      setShowManualSteps(true);
      return;
    }

    const installPrompt = consumeDeferredPwaInstallPrompt();

    if (!installPrompt) {
      closePrompt("cooldown");
      return;
    }

    setIsInstalling(true);

    try {
      await installPrompt.prompt();
      const choice = await installPrompt.userChoice;

      if (choice.outcome === "accepted") {
        dispatchPwaInstallPromptAccepted();
      }

      closePrompt(choice.outcome === "accepted" ? "installed" : "cooldown");
    } catch {
      closePrompt("cooldown");
    } finally {
      setIsInstalling(false);
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

        {promptKind !== "native" && showManualSteps ? (
          <div className="mt-3 rounded-2xl border border-border bg-surface-muted p-3 text-sm text-foreground">
            <div className="mb-2 flex items-center gap-2 font-bold">
              {promptKind === "ios" ? (
                <Share className="h-4 w-4 text-primary" aria-hidden="true" />
              ) : (
                <MoreHorizontal className="h-4 w-4 text-primary" aria-hidden="true" />
              )}
              {promptKind === "ios" ? "No iPhone ou iPad" : "No Android"}
            </div>
            <ol className="list-decimal space-y-1 pl-5 text-muted">
              {promptKind === "ios" ? (
                <>
                  <li>Abra a Lectum no Safari.</li>
                  <li>Toque em Compartilhar.</li>
                  <li>Escolha Adicionar à Tela de Início e confirme.</li>
                </>
              ) : (
                <>
                  <li>Abra o menu do navegador.</li>
                  <li>Toque em Instalar app ou Adicionar à tela inicial.</li>
                  <li>Confirme para criar o atalho da Lectum.</li>
                </>
              )}
            </ol>
          </div>
        ) : null}

        <div className="mt-4 grid gap-2">
          <Button
            className="h-11 rounded-2xl text-sm font-extrabold"
            disabled={isInstalling}
            onClick={handleInstall}
            type="button"
          >
            {promptKind !== "native" && showManualSteps ? (
              <Smartphone className="h-4 w-4" aria-hidden="true" />
            ) : (
              <Download className="h-4 w-4" aria-hidden="true" />
            )}
            <span>
              {isInstalling
                ? "Abrindo instalação..."
                : promptKind !== "native" && showManualSteps
                  ? "Entendi"
                  : "Adicionar à tela inicial"}
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
