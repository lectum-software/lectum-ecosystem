"use client";

import { Camera, Loader2, PencilLine, Trash2, UploadCloud, UserRound, X } from "lucide-react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { Button } from "@/registry/new-york-v4/ui/button";
import type { ProfessionalProfileSetupController } from "../hooks/use-professional-profile-setup-controller";

export const ProfileImagesPreview = ({
  controller,
}: {
  controller: ProfessionalProfileSetupController;
}) => {
  const {
    avatarActionsOpen,
    avatarDraft,
    avatarInputRef,
    clearAvatarDraft,
    coverImageActionsOpen,
    coverImageDraftUrl,
    coverImageInputRef,
    deleteCoverImage,
    handleAvatarChange,
    handleAvatarRemoval,
    handleCoverImageChange,
    handleCoverImageRemoval,
    isPublicAvatar,
    isPublicCoverImage,
    isSavingMedia,
    openAvatarFilePicker,
    openCoverImageFilePicker,
    profile,
    setAvatarActionsOpen,
    setAvatarEditorOpen,
    setCoverImageActionsOpen,
    setFailedCoverImageUrl,
    uploadAvatar,
    uploadCoverImage,
    visibleAvatarSrc,
    visibleCoverImageSrc,
  } = controller;

  return (
    <header className="overflow-hidden rounded-[28px] border border-border/80 bg-surface p-4 text-left shadow-[var(--lectum-shadow-soft)]">
      <div className="mb-4">
        <h1 className="text-base font-extrabold tracking-[-0.01em] text-foreground">
          Imagens do perfil
        </h1>
        <p className="mt-1 text-xs leading-5 text-muted">
          Adicione uma capa horizontal e uma foto profissional.
        </p>
      </div>

      <div className="relative pb-12">
        <button
          aria-label="Selecionar imagem de capa do perfil"
          className="relative block aspect-[16/6] w-full overflow-hidden rounded-[24px] border border-border/70 bg-gradient-to-br from-primary-soft/70 via-surface to-surface-muted p-0 text-left shadow-inner transition hover:border-primary/40 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/15 disabled:cursor-not-allowed disabled:opacity-80"
          disabled={!profile.data || uploadCoverImage.isPending || deleteCoverImage.isPending}
          onClick={openCoverImageFilePicker}
          title="Selecionar imagem de capa"
          type="button"
        >
          {visibleCoverImageSrc ? (
            <Image
              alt="Pré-visualização da imagem de capa do perfil"
              className="object-cover"
              fill
              sizes="(min-width: 768px) 720px, calc(100vw - 40px)"
              src={visibleCoverImageSrc}
              unoptimized={isPublicCoverImage}
              onError={() => setFailedCoverImageUrl(visibleCoverImageSrc)}
            />
          ) : (
            <span className="absolute inset-0 grid place-items-center px-4 text-center">
              <span className="grid justify-items-center">
                {uploadCoverImage.isPending ? (
                  <Loader2 className="h-5 w-5 animate-spin text-primary" aria-hidden="true" />
                ) : (
                  <UploadCloud className="h-5 w-5 text-primary" aria-hidden="true" />
                )}
                <span className="mt-2 block text-xs font-extrabold text-foreground">
                  Adicionar capa
                </span>
                <span className="mt-0.5 block text-[11px] font-semibold text-muted">
                  JPG, PNG ou WebP
                </span>
              </span>
            </span>
          )}
        </button>

        <div className="absolute right-3 top-3">
          <button
            aria-expanded={coverImageActionsOpen}
            aria-haspopup="menu"
            aria-label="Editar imagem de capa"
            className="grid h-9 w-9 place-items-center rounded-full border border-border/70 bg-surface/90 text-foreground shadow-sm backdrop-blur transition hover:bg-primary-soft hover:text-primary disabled:cursor-not-allowed disabled:opacity-60"
            disabled={!profile.data || uploadCoverImage.isPending || deleteCoverImage.isPending}
            onClick={() => setCoverImageActionsOpen((current) => !current)}
            type="button"
          >
            {uploadCoverImage.isPending || deleteCoverImage.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <PencilLine className="h-4 w-4" aria-hidden="true" />
            )}
          </button>

          {coverImageActionsOpen ? (
            <div
              className="absolute right-0 top-11 z-20 w-44 overflow-hidden rounded-2xl border border-border bg-surface text-left shadow-[var(--lectum-shadow-soft)]"
              role="menu"
            >
              <button
                className="flex w-full items-center gap-2 px-4 py-3 text-xs font-semibold text-foreground transition hover:bg-primary-soft hover:text-primary disabled:cursor-not-allowed disabled:opacity-45"
                disabled={!profile.data || uploadCoverImage.isPending || deleteCoverImage.isPending}
                onClick={openCoverImageFilePicker}
                role="menuitem"
                type="button"
              >
                <UploadCloud className="h-4 w-4" aria-hidden="true" />
                Alterar capa
              </button>
              <button
                className="flex w-full items-center gap-2 px-4 py-3 text-xs font-semibold text-danger transition hover:bg-danger/10 disabled:cursor-not-allowed disabled:opacity-45"
                disabled={
                  (!profile.data?.profile.cover_image_url && !coverImageDraftUrl) ||
                  uploadCoverImage.isPending ||
                  deleteCoverImage.isPending
                }
                onClick={handleCoverImageRemoval}
                role="menuitem"
                type="button"
              >
                <Trash2 className="h-4 w-4" aria-hidden="true" />
                Excluir capa
              </button>
            </div>
          ) : null}
        </div>

        <div className="absolute left-4 -bottom-1 flex items-end gap-3 sm:left-6">
          <div className="relative h-24 w-24 shrink-0">
            <button
              aria-label="Selecionar foto profissional"
              className={cn(
                "relative grid h-24 w-24 place-items-center overflow-hidden rounded-full border-4 border-surface bg-primary p-0 text-2xl font-bold text-primary-foreground shadow-[var(--lectum-shadow-soft)] transition hover:ring-4 hover:ring-primary/15 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-80",
                avatarDraft && "ring-4 ring-primary/20",
              )}
              disabled={isSavingMedia}
              onClick={openAvatarFilePicker}
              title="Selecionar foto profissional"
              type="button"
            >
              {visibleAvatarSrc ? (
                <Image
                  alt={avatarDraft ? "Pré-visualização da foto profissional" : "Foto profissional"}
                  className="object-cover"
                  fill
                  sizes="96px"
                  src={visibleAvatarSrc}
                  style={{
                    objectPosition: avatarDraft
                      ? `${avatarDraft.position.x}% ${avatarDraft.position.y}%`
                      : "50% 50%",
                  }}
                  unoptimized={Boolean(avatarDraft) || isPublicAvatar}
                />
              ) : (
                <span className="grid h-full w-full place-items-center bg-primary-soft text-primary">
                  <UserRound className="h-9 w-9" aria-hidden="true" />
                </span>
              )}
            </button>
            <button
              aria-expanded={avatarActionsOpen}
              aria-haspopup="menu"
              aria-label="Editar foto"
              className="absolute right-0 bottom-0 grid h-8 w-8 place-items-center rounded-full border-2 border-surface bg-primary text-primary-foreground shadow-sm transition hover:bg-primary/90 disabled:opacity-60"
              disabled={isSavingMedia}
              onClick={() => setAvatarActionsOpen((current) => !current)}
              type="button"
            >
              {isSavingMedia ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <PencilLine className="h-4 w-4" aria-hidden="true" />
              )}
            </button>

            {avatarActionsOpen ? (
              <div
                className="absolute bottom-0 left-[calc(100%-0.5rem)] z-30 w-44 overflow-hidden rounded-2xl border border-border bg-surface text-left shadow-[var(--lectum-shadow-soft)]"
                role="menu"
              >
                <button
                  className="flex w-full items-center gap-2 px-4 py-3 text-xs font-semibold text-foreground transition hover:bg-primary-soft hover:text-primary disabled:cursor-not-allowed disabled:opacity-45"
                  disabled={isSavingMedia}
                  onClick={openAvatarFilePicker}
                  role="menuitem"
                  type="button"
                >
                  <UploadCloud className="h-4 w-4" aria-hidden="true" />
                  Alterar foto
                </button>
                <button
                  className="flex w-full items-center gap-2 px-4 py-3 text-xs font-semibold text-danger transition hover:bg-danger/10 disabled:cursor-not-allowed disabled:opacity-45"
                  disabled={isSavingMedia || (!profile.data?.user.avatar && !avatarDraft)}
                  onClick={handleAvatarRemoval}
                  role="menuitem"
                  type="button"
                >
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                  Excluir foto
                </button>
              </div>
            ) : null}
          </div>

          {avatarDraft ? (
            <span className="mb-2 rounded-full border border-primary/15 bg-surface/90 px-3 py-1 text-[11px] font-semibold text-muted shadow-sm backdrop-blur">
              Prévia selecionada
            </span>
          ) : null}
        </div>
      </div>

      <input
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        onChange={handleCoverImageChange}
        ref={coverImageInputRef}
        type="file"
      />
      <input
        accept="image/png,image/jpeg,image/webp"
        className="sr-only"
        onChange={handleAvatarChange}
        ref={avatarInputRef}
        type="file"
      />

      {avatarDraft ? (
        <div className="mt-3 flex flex-wrap items-center gap-2 border-border/70 border-t pt-3">
          <Button
            disabled={uploadAvatar.isPending}
            onClick={() => setAvatarEditorOpen(true)}
            type="button"
            variant="outline"
          >
            <Camera className="h-4 w-4" aria-hidden="true" />
            Ajustar foto
          </Button>
          <Button
            disabled={uploadAvatar.isPending}
            onClick={clearAvatarDraft}
            type="button"
            variant="ghost"
          >
            <X className="h-4 w-4" aria-hidden="true" />
            Descartar
          </Button>
        </div>
      ) : null}
    </header>
  );
};
