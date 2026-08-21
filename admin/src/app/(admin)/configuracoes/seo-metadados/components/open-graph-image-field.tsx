"use client";

import { ImagePlus, Loader2, Trash2 } from "lucide-react";
import { type ChangeEvent, useId, useRef } from "react";
import { toast } from "sonner";
import { resolveImageFileMimeType } from "@/lib/image-preparation";
import { cn } from "@/lib/utils";
import {
  canRenderOpenGraphPreview,
  OG_IMAGE_ACCEPT,
  OG_IMAGE_MAX_SIZE_BYTES,
  OG_IMAGE_MAX_SIZE_MB,
  resolveOpenGraphPreviewSource,
} from "../modules/seo-support";

import { OpenGraphImagePreview } from "./preview";

export const OpenGraphImageField = ({
  disabled,
  error,
  isUploading,
  onRemove,
  onUpload,
  value,
}: {
  disabled?: boolean;
  error?: string;
  isUploading?: boolean;
  onRemove: () => void;
  onUpload: (file: File) => Promise<void>;
  value?: string | null;
}) => {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const src = resolveOpenGraphPreviewSource(value);
  const canRender = src ? canRenderOpenGraphPreview(src) : false;
  const actionDisabled = Boolean(disabled || isUploading);

  const handleChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) return;

    if (!resolveImageFileMimeType(file)) {
      toast.error("Envie uma imagem JPG, PNG ou WebP.");
      return;
    }

    if (file.size > OG_IMAGE_MAX_SIZE_BYTES) {
      toast.error(`A imagem deve ter até ${OG_IMAGE_MAX_SIZE_MB}MB.`);
      return;
    }

    await onUpload(file);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <label className="text-sm font-bold text-foreground" htmlFor={inputId}>
          Imagem Open Graph
        </label>
      </div>
      <div className="rounded-[1.35rem] border border-border bg-surface-muted/45 p-3">
        <div className="grid gap-3 sm:grid-cols-[minmax(0,11rem)_minmax(0,1fr)] sm:items-start">
          <OpenGraphImagePreview value={value} />
          <div className="min-w-0">
            <p className="text-xs leading-5 text-muted">Envie uma imagem JPG, PNG ou WebP.</p>
            {src ? (
              <a
                className="mt-2 block truncate text-xs font-bold text-primary hover:underline"
                href={src}
                rel="noreferrer"
                target="_blank"
              >
                URL atual da imagem
              </a>
            ) : null}
            {src && !canRender ? (
              <p className="mt-2 text-xs font-semibold text-warning">
                A miniatura não está disponível. Solicite a revisão da configuração de imagens.
              </p>
            ) : null}
          </div>
        </div>
        <input
          accept={OG_IMAGE_ACCEPT}
          className="sr-only"
          disabled={actionDisabled}
          id={inputId}
          onChange={handleChange}
          ref={inputRef}
          type="file"
        />
        <div className="mt-3 flex flex-nowrap items-center gap-2 overflow-x-auto pb-1">
          <label
            aria-disabled={actionDisabled}
            className={cn(
              "inline-flex h-10 shrink-0 cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-2xl bg-primary px-4 text-sm font-bold text-primary-foreground shadow-admin-soft transition hover:bg-primary-hover",
              actionDisabled && "pointer-events-none cursor-not-allowed opacity-60",
            )}
            htmlFor={actionDisabled ? undefined : inputId}
          >
            {isUploading ? (
              <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
            ) : (
              <ImagePlus className="h-4 w-4 shrink-0" />
            )}
            {src ? "Trocar imagem" : "Enviar imagem"}
          </label>
          {value ? (
            <button
              className="inline-flex h-10 shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-2xl border border-border px-4 text-sm font-bold text-muted transition hover:text-foreground disabled:opacity-60"
              disabled={actionDisabled}
              onClick={onRemove}
              type="button"
            >
              <Trash2 className="h-4 w-4 shrink-0" />
              Remover
            </button>
          ) : null}
        </div>
      </div>
      <p className="min-h-5 px-1 text-xs font-semibold text-danger">{error || " "}</p>
    </div>
  );
};
