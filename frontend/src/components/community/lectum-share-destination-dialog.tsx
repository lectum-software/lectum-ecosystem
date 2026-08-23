"use client";

import { Download, Link2, X } from "lucide-react";
import type { ComponentType, SVGProps } from "react";
import { InstagramIcon } from "@/components/ui/instagram-icon";
import { WhatsAppIcon } from "@/components/ui/whatsapp-icon";
import type { LectumShareDestination } from "@/hooks/use-lectum-direct-share";
import { cn } from "@/lib/utils";

export type LectumShareDestinationMode = "desktop" | "mobile";

type LectumShareDestinationDialogProps = {
  disabled?: boolean;
  mode: LectumShareDestinationMode;
  onClose: () => void;
  onSelect: (destination: LectumShareDestination) => void;
  open: boolean;
};

type ShareDestinationOption = {
  destination: LectumShareDestination;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  label: string;
};

const MOBILE_SHARE_DESTINATION_OPTIONS: ShareDestinationOption[] = [
  {
    destination: "whatsapp",
    icon: WhatsAppIcon,
    label: "WhatsApp",
  },
  {
    destination: "social",
    icon: InstagramIcon,
    label: "Redes sociais",
  },
];

const DESKTOP_SHARE_DESTINATION_OPTIONS: ShareDestinationOption[] = [
  {
    destination: "copy_link",
    icon: Link2,
    label: "Copiar link",
  },
  {
    destination: "download",
    icon: Download,
    label: "Baixar vídeo",
  },
];

const SHARE_DESTINATION_CONTENT: Record<LectumShareDestinationMode, string> = {
  desktop: "Copie o link ou baixe o vídeo.",
  mobile: "Onde deseja compartilhar?",
};

export const LectumShareDestinationDialog = ({
  disabled = false,
  mode,
  onClose,
  onSelect,
  open,
}: LectumShareDestinationDialogProps) => {
  if (!open) return null;

  const options =
    mode === "desktop" ? DESKTOP_SHARE_DESTINATION_OPTIONS : MOBILE_SHARE_DESTINATION_OPTIONS;

  return (
    <div className="fixed inset-0 z-[120] grid items-end bg-foreground/35 px-3 pb-3 backdrop-blur-[2px] sm:items-center sm:px-4 sm:pb-0">
      <button
        aria-label="Fechar opções de compartilhamento"
        className="absolute inset-0 cursor-default"
        onClick={disabled ? undefined : onClose}
        type="button"
      />

      <section
        aria-labelledby="lectum-share-destination-title"
        aria-modal="true"
        className="relative mx-auto w-full max-w-[390px] rounded-[28px] border border-border bg-surface p-4 text-foreground shadow-[var(--lectum-shadow)] sm:max-w-md"
        role="dialog"
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="grid gap-1">
            <p className="font-semibold text-[1.05rem]" id="lectum-share-destination-title">
              Compartilhar vídeo
            </p>
            <p className="text-muted-foreground text-sm leading-relaxed">
              {SHARE_DESTINATION_CONTENT[mode]}
            </p>
          </div>
          <button
            aria-label="Fechar"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-border bg-background text-muted-foreground transition hover:text-foreground disabled:opacity-60"
            disabled={disabled}
            onClick={onClose}
            type="button"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <div className="grid gap-2">
          {options.map((option) => {
            const Icon = option.icon;

            return (
              <button
                className={cn(
                  "group flex w-full items-center gap-3 rounded-[20px] border border-border bg-background p-3 text-left transition",
                  "hover:-translate-y-0.5 hover:border-primary/30 hover:bg-primary/5 hover:shadow-[var(--lectum-shadow-soft)]",
                  "disabled:pointer-events-none disabled:opacity-60",
                )}
                disabled={disabled}
                key={option.destination}
                onClick={() => onSelect(option.destination)}
                type="button"
              >
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary transition group-hover:bg-primary group-hover:text-primary-foreground">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <span className="grid">
                  <span className="font-semibold text-sm">{option.label}</span>
                </span>
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
};
