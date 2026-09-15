"use client";

import { Download, type LucideIcon, MoreHorizontal, Share, Smartphone, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/registry/new-york-v4/ui/button";
import {
  consumeDeferredPwaInstallPrompt,
  dispatchPwaInstallPromptAccepted,
  getManualInstallPlatform,
  isStandaloneMode,
  type ManualInstallPlatform,
  markPwaInstalled,
  shouldShowPwaInstallProfileEntry,
  subscribeToDeferredPwaInstallPrompt,
} from "@/utils/pwa-install";

type ManualInstallInstructions = {
  icon: LucideIcon;
  steps: string[];
  title: string;
};

const MANUAL_INSTALL_INSTRUCTIONS: Record<ManualInstallPlatform, ManualInstallInstructions> = {
  android: {
    icon: MoreHorizontal,
    title: "No Android",
    steps: [
      "Abra o menu do navegador.",
      "Toque em Instalar app ou Adicionar à tela inicial.",
      "Confirme para criar o atalho da Lectum.",
    ],
  },
  generic: {
    icon: Download,
    title: "No navegador",
    steps: [
      "Abra o menu do navegador.",
      "Procure por Instalar app ou Adicionar à tela inicial.",
      "Confirme para criar o atalho da Lectum.",
    ],
  },
  ios: {
    icon: Share,
    title: "No iPhone ou iPad",
    steps: [
      "Abra a Lectum no Safari.",
      "Toque em Compartilhar.",
      "Escolha Adicionar à Tela de Início e confirme.",
    ],
  },
};

const ManualInstallDialog = ({
  onClose,
  platform,
}: {
  onClose: () => void;
  platform: ManualInstallPlatform;
}) => {
  const instructions = MANUAL_INSTALL_INSTRUCTIONS[platform];
  const InstructionIcon = instructions.icon;

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-media-background/35 px-3 pt-6 pb-[calc(5rem+env(safe-area-inset-bottom))] text-foreground backdrop-blur-[8px] transition-opacity duration-200 ease-out supports-[backdrop-filter]:bg-media-background/35 sm:items-center sm:px-6 sm:pb-6">
      <section
        aria-label="Instalar aplicativo Lectum"
        aria-modal="true"
        className="relative w-full max-w-[440px] rounded-[1.75rem] border border-border bg-surface p-4 text-foreground shadow-[var(--lectum-shadow)]"
        role="dialog"
      >
        <button
          aria-label="Fechar instruções de instalação"
          className="absolute top-3 right-3 inline-grid h-8 w-8 place-items-center rounded-full text-muted transition hover:bg-primary-soft hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25"
          onClick={onClose}
          type="button"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>

        <div className="flex gap-3 pr-8">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-primary-soft text-primary">
            <Smartphone className="h-6 w-6" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <h2 className="text-base font-extrabold tracking-[-0.03em] text-foreground">
              Instalar aplicativo
            </h2>
            <p className="mt-1 text-sm leading-5 text-muted">
              Adicione a Lectum à tela inicial para voltar mais rápido quando precisar.
            </p>
          </div>
        </div>

        <div className="mt-3 rounded-2xl border border-border bg-surface-muted p-3 text-sm text-foreground">
          <div className="mb-2 flex items-center gap-2 font-bold">
            <InstructionIcon className="h-4 w-4 text-primary" aria-hidden="true" />
            {instructions.title}
          </div>
          <ol className="list-decimal space-y-1 pl-5 text-muted">
            {instructions.steps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        </div>

        <Button className="mt-4 h-11 w-full rounded-2xl text-sm font-extrabold" onClick={onClose}>
          Entendi
        </Button>
      </section>
    </div>
  );
};

export const usePwaInstallAccountAction = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);
  const [manualPlatform, setManualPlatform] = useState<ManualInstallPlatform>("generic");
  const [showManualInstructions, setShowManualInstructions] = useState(false);

  const syncVisibility = useCallback(() => {
    setIsVisible(shouldShowPwaInstallProfileEntry());
  }, []);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(display-mode: standalone)");
    const handleVisibilityChange = () => syncVisibility();
    const unsubscribePrompt = subscribeToDeferredPwaInstallPrompt(syncVisibility);
    const syncTimer = window.setTimeout(handleVisibilityChange, 0);
    const mediaQueryWithLegacyListeners = mediaQuery as MediaQueryList & {
      addListener?: (listener: () => void) => void;
      removeListener?: (listener: () => void) => void;
    };

    window.addEventListener("appinstalled", handleVisibilityChange);
    window.addEventListener("focus", handleVisibilityChange);
    window.addEventListener("resize", handleVisibilityChange);
    if (typeof mediaQuery.addEventListener === "function") {
      mediaQuery.addEventListener("change", handleVisibilityChange);
    } else {
      mediaQueryWithLegacyListeners.addListener?.(handleVisibilityChange);
    }

    return () => {
      window.clearTimeout(syncTimer);
      unsubscribePrompt();
      window.removeEventListener("appinstalled", handleVisibilityChange);
      window.removeEventListener("focus", handleVisibilityChange);
      window.removeEventListener("resize", handleVisibilityChange);
      if (typeof mediaQuery.removeEventListener === "function") {
        mediaQuery.removeEventListener("change", handleVisibilityChange);
      } else {
        mediaQueryWithLegacyListeners.removeListener?.(handleVisibilityChange);
      }
    };
  }, [syncVisibility]);

  const openManualInstructions = useCallback(() => {
    setManualPlatform(getManualInstallPlatform());
    setShowManualInstructions(true);
  }, []);

  const handleInstall = useCallback(async () => {
    if (isInstalling) return;

    if (isStandaloneMode()) {
      syncVisibility();
      return;
    }

    const installPrompt = consumeDeferredPwaInstallPrompt();

    if (!installPrompt) {
      openManualInstructions();
      return;
    }

    setIsInstalling(true);

    try {
      await installPrompt.prompt();
      const choice = await installPrompt.userChoice;

      if (choice.outcome === "accepted") {
        dispatchPwaInstallPromptAccepted();
        markPwaInstalled();
      }
    } catch {
      openManualInstructions();
    } finally {
      setIsInstalling(false);
      syncVisibility();
    }
  }, [isInstalling, openManualInstructions, syncVisibility]);

  return {
    dialog: showManualInstructions ? (
      <ManualInstallDialog
        onClose={() => {
          setShowManualInstructions(false);
          syncVisibility();
        }}
        platform={manualPlatform}
      />
    ) : null,
    isInstalling,
    isVisible,
    onInstall: handleInstall,
  };
};
