"use client";

import { ArrowRight, Camera, X } from "lucide-react";
import Link from "next/link";
import { Button } from "@/registry/new-york-v4/ui/button";
import { PSYCHOLOGIST_ONBOARDING_PATHS } from "@/utils/psychologist-onboarding";

export const COMMUNITY_MEDIA_UPGRADE_TITLE =
  "Upload de mídia disponível para psicólogos verificados";

export const COMMUNITY_MEDIA_UPGRADE_DESCRIPTION =
  "Para publicar imagens ou vídeos em posts e respostas, é necessário ter o perfil profissional verificado.";

type CommunityMediaUpgradeModalProps = {
  open: boolean;
  onClose: () => void;
};

export const CommunityMediaUpgradeModal = ({ open, onClose }: CommunityMediaUpgradeModalProps) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[120] flex items-end justify-center bg-foreground/35 p-3 backdrop-blur-sm sm:items-center sm:p-6">
      <section
        aria-labelledby="community-media-upgrade-title"
        aria-modal="true"
        className="relative w-full max-w-[24rem] rounded-[1.75rem] border border-border bg-surface p-5 text-foreground shadow-[var(--lectum-shadow)] sm:p-6"
        role="dialog"
      >
        <button
          aria-label="Fechar aviso de upload de mídia"
          className="absolute top-3 right-3 grid h-9 w-9 place-items-center rounded-full text-muted transition hover:bg-surface-muted hover:text-foreground focus:outline-none focus:ring-4 focus:ring-primary/15"
          onClick={onClose}
          type="button"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>

        <span className="grid h-12 w-12 place-items-center rounded-2xl bg-surface-muted text-primary">
          <Camera className="h-5 w-5" aria-hidden="true" />
        </span>

        <h2
          className="mt-4 pr-8 text-xl font-black leading-tight tracking-[-0.03em] text-foreground"
          id="community-media-upgrade-title"
        >
          {COMMUNITY_MEDIA_UPGRADE_TITLE}
        </h2>
        <p className="mt-3 text-sm font-semibold leading-6 text-muted">
          {COMMUNITY_MEDIA_UPGRADE_DESCRIPTION}
        </p>

        <div className="mt-6 grid gap-2 sm:grid-cols-[1fr_auto]">
          <Button asChild className="h-12 rounded-full font-black">
            <Link href={PSYCHOLOGIST_ONBOARDING_PATHS.plans} onClick={onClose}>
              Fazer upgrade
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </Button>
          <Button
            className="h-12 rounded-full border-border bg-surface px-5 font-bold text-muted shadow-none hover:bg-surface-muted hover:text-foreground"
            onClick={onClose}
            type="button"
            variant="outline"
          >
            Fechar
          </Button>
        </div>
      </section>
    </div>
  );
};
