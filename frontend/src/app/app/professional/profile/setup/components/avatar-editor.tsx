"use client";

import { Loader2, UploadCloud, X } from "lucide-react";
import Image from "next/image";
import { Button } from "@/registry/new-york-v4/ui/button";
import type { ProfessionalProfileSetupController } from "../hooks/use-professional-profile-setup-controller";

export const AvatarEditor = ({
  controller,
}: {
  controller: ProfessionalProfileSetupController;
}) => {
  const {
    applyAvatarDraft,
    avatarDraft,
    avatarEditorOpen,
    avatarFrameRef,
    clearAvatarDraft,
    handleAvatarPointerDown,
    handleAvatarPointerEnd,
    handleAvatarPointerMove,
    setAvatarEditorOpen,
    uploadAvatar,
  } = controller;

  if (!avatarDraft || !avatarEditorOpen) return null;

  return (
    <div
      aria-labelledby="avatar-editor-title"
      aria-modal="true"
      className="fixed inset-0 z-50 grid place-items-center bg-foreground/50 px-4 py-6 backdrop-blur-sm"
      role="dialog"
    >
      <div className="grid max-h-[calc(100vh-3rem)] w-full max-w-[430px] gap-4 overflow-y-auto rounded-[28px] border border-border bg-surface p-5 shadow-lectum-soft">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-extrabold text-foreground" id="avatar-editor-title">
              Ajustar foto
            </h2>
            <p className="mt-1 text-sm leading-6 text-muted">
              Arraste a imagem dentro do círculo para enquadrar o rosto antes de aplicar.
            </p>
          </div>
          <button
            aria-label="Fechar ajuste de foto"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-muted transition hover:bg-surface-muted hover:text-foreground"
            disabled={uploadAvatar.isPending}
            onClick={() => setAvatarEditorOpen(false)}
            type="button"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <div className="rounded-3xl border border-border bg-surface-muted p-4">
          <div
            className="relative mx-auto grid h-72 w-72 max-w-full cursor-grab touch-none place-items-center overflow-hidden rounded-full bg-primary text-primary-foreground shadow-lectum-soft active:cursor-grabbing"
            onPointerCancel={handleAvatarPointerEnd}
            onPointerDown={handleAvatarPointerDown}
            onPointerMove={handleAvatarPointerMove}
            onPointerUp={handleAvatarPointerEnd}
            ref={avatarFrameRef}
          >
            <Image
              alt="Pré-visualização da foto profissional"
              className="object-cover"
              fill
              sizes="288px"
              src={avatarDraft.url}
              style={{
                objectPosition: `${avatarDraft.position.x}% ${avatarDraft.position.y}%`,
              }}
              unoptimized
            />
          </div>
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          <Button disabled={uploadAvatar.isPending} onClick={applyAvatarDraft} type="button">
            {uploadAvatar.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <UploadCloud className="h-4 w-4" aria-hidden="true" />
            )}
            Aplicar foto
          </Button>
          <Button
            disabled={uploadAvatar.isPending}
            onClick={clearAvatarDraft}
            type="button"
            variant="outline"
          >
            <X className="h-4 w-4" aria-hidden="true" />
            Cancelar
          </Button>
        </div>
      </div>
    </div>
  );
};
