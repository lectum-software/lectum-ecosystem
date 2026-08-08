"use client";

import { Loader2 } from "lucide-react";
import type { ChangeEventHandler, RefObject } from "react";
import { type Control, Controller } from "react-hook-form";
import { AnimatedImagesIcon } from "@/components/ui/animated-images-icon";
import { cn } from "@/lib/utils";
import type { PostEditForm } from "./post-edit-modal-support";

export const PostEditAnonymousControls = ({ control }: { control: Control<PostEditForm> }) => (
  <Controller
    control={control}
    name="anonymous"
    render={({ field }) => {
      const checked = Boolean(field.value);

      return (
        <div className="relative min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-2.5 opacity-65">
            <span className="min-w-0 text-[0.78rem] font-bold leading-4 text-muted sm:text-sm">
              Publicar anonimamente
            </span>
            <button
              aria-checked={checked}
              aria-label="Publicar anonimamente"
              className={cn(
                "relative h-7 w-12 shrink-0 cursor-not-allowed rounded-full bg-surface-muted ring-1 ring-border transition",
                checked && "bg-primary ring-primary/20",
              )}
              disabled
              role="switch"
              title="O anonimato não pode ser alterado após a publicação."
              type="button"
            >
              <span
                className={cn(
                  "absolute top-1 left-1 h-5 w-5 rounded-full bg-surface shadow-[var(--lectum-shadow-soft)] transition",
                  checked && "translate-x-5",
                )}
              />
            </button>
          </div>
        </div>
      );
    }}
  />
);

type PostEditMediaButtonProps = {
  canManageMedia: boolean;
  fileInputRef: RefObject<HTMLInputElement | null>;
  isSubmitting: boolean;
  isUploading: boolean;
  mediaPermissionReason?: string | null;
  onFocusEditor: () => void;
  onMediaChange: ChangeEventHandler<HTMLInputElement>;
};

export const PostEditMediaButton = ({
  canManageMedia,
  fileInputRef,
  isSubmitting,
  isUploading,
  mediaPermissionReason,
  onFocusEditor,
  onMediaChange,
}: PostEditMediaButtonProps) => (
  <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
    <input
      accept="image/jpeg,image/png,image/webp,video/mp4,video/webm,video/quicktime"
      className="hidden"
      multiple
      onChange={onMediaChange}
      ref={fileInputRef}
      type="file"
    />
    <button
      aria-label="Adicionar mídia ao post"
      className={cn(
        "inline-flex h-11 shrink-0 items-center gap-2 rounded-full border px-3.5 text-sm font-bold transition focus:outline-none focus:ring-4 focus:ring-primary/15",
        canManageMedia
          ? "border-border bg-surface-muted text-muted hover:border-primary/30 hover:bg-primary-soft hover:text-primary"
          : "cursor-not-allowed border-border bg-surface-muted text-subtle hover:border-border hover:bg-surface-muted hover:text-subtle",
      )}
      disabled={!canManageMedia || isSubmitting}
      onClick={() => {
        fileInputRef.current?.click();
        onFocusEditor();
      }}
      onMouseDown={(event) => event.preventDefault()}
      tabIndex={-1}
      title={canManageMedia ? "Adicionar mídia" : (mediaPermissionReason ?? undefined)}
      type="button"
    >
      {isUploading ? (
        <Loader2 aria-hidden="true" className="h-5 w-5 animate-spin" />
      ) : (
        <AnimatedImagesIcon aria-hidden="true" className="h-5 w-5" />
      )}
      <span className="hidden sm:inline">Mídia</span>
    </button>

    {!canManageMedia && mediaPermissionReason ? (
      <span className="min-w-0 flex-1 basis-52 whitespace-normal text-muted text-xs font-semibold leading-4">
        {mediaPermissionReason}
      </span>
    ) : null}
  </div>
);
