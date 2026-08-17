"use client";

import { Loader2, type LucideIcon, TriangleAlert } from "lucide-react";
import { useEffect } from "react";
import { Button } from "@/registry/new-york-v4/ui/button";

export const SectionCard = ({
  children,
  title,
  description,
  icon: Icon,
}: {
  children: React.ReactNode;
  title: string;
  description?: string;
  icon?: LucideIcon;
}) => (
  <section className="rounded-[var(--lectum-card-radius)] border border-border bg-surface p-5 shadow-[var(--lectum-shadow-soft)]">
    <div className="flex items-center gap-2">
      {Icon ? <Icon className="h-4 w-4 text-primary" aria-hidden="true" /> : null}
      <h2 className="text-base font-bold text-foreground">{title}</h2>
    </div>
    {description ? <p className="mt-2 text-xs leading-5 text-muted">{description}</p> : null}
    <div className="mt-5">{children}</div>
  </section>
);

export const ProfileInactiveBanner = () => (
  <div className="rounded-[var(--lectum-card-radius)] border border-danger/25 bg-danger/10 px-4 py-4 shadow-lectum-soft">
    <div className="flex items-start gap-3">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-surface/80 text-danger shadow-sm">
        <TriangleAlert className="h-5 w-5" aria-hidden="true" />
      </span>
      <div className="min-w-0">
        <p className="text-sm font-extrabold tracking-[-0.01em] text-danger">Perfil não ativo</p>
        <p className="mt-1 text-sm leading-6 text-foreground/80">
          Seu perfil ainda não está sendo exibido publicamente porque existem informações
          obrigatórias pendentes.
        </p>
      </div>
    </div>
  </div>
);

export const ProfileHiddenBanner = () => (
  <div className="rounded-[var(--lectum-card-radius)] border border-danger/25 bg-danger/10 px-4 py-4 shadow-lectum-soft">
    <div className="flex items-start gap-3">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-surface/80 text-danger shadow-sm">
        <TriangleAlert className="h-5 w-5" aria-hidden="true" />
      </span>
      <div className="min-w-0">
        <p className="text-sm font-extrabold tracking-[-0.01em] text-danger">
          Perfil não visível para pacientes
        </p>
        <p className="mt-1 text-sm leading-6 text-foreground/80">
          Com esta configuração, seu perfil fica oculto da busca e do perfil público. Ative a
          visibilidade abaixo e salve as alterações para voltar a aparecer para pacientes.
        </p>
      </div>
    </div>
  </div>
);

export const VideoRemovalConfirmationModal = ({
  disabled = false,
  onClose,
  onConfirm,
  open,
}: {
  disabled?: boolean;
  onClose: () => void;
  onConfirm: () => void;
  open: boolean;
}) => {
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !disabled) {
        onClose();
      }
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [disabled, onClose, open]);

  if (!open) return null;

  return (
    <div
      aria-labelledby="video-removal-confirmation-title"
      aria-modal="true"
      className="fixed inset-0 z-[150] grid place-items-center bg-foreground/55 px-4 py-6 text-foreground backdrop-blur-md dark:bg-background/75"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !disabled) {
          onClose();
        }
      }}
      role="dialog"
    >
      <section className="w-full max-w-[430px] rounded-[28px] border border-danger/20 bg-surface p-5 shadow-[var(--lectum-shadow)]">
        <div className="flex items-start gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-danger/10 text-danger">
            <TriangleAlert className="h-5 w-5" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <h2
              className="text-lg font-extrabold tracking-[-0.02em] text-foreground"
              id="video-removal-confirmation-title"
            >
              Excluir vídeo de apresentação?
            </h2>
            <p className="mt-2 text-sm leading-6 text-muted">
              Se você excluir o vídeo, seu perfil será removido da página de psicólogos até que um
              novo vídeo de apresentação seja enviado.
            </p>
            <p className="mt-2 text-sm font-semibold leading-6 text-foreground">
              Tem certeza que deseja excluir?
            </p>
          </div>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-[1fr_auto]">
          <Button disabled={disabled} onClick={onClose} type="button" variant="outline">
            Manter vídeo
          </Button>
          <Button
            className="min-w-36"
            disabled={disabled}
            onClick={onConfirm}
            type="button"
            variant="destructive"
          >
            {disabled ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
            Excluir vídeo
          </Button>
        </div>
      </section>
    </div>
  );
};
