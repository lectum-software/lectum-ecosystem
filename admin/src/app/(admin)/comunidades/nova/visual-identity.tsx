"use client";

import { Camera, Loader2, RotateCcw, X } from "lucide-react";
import Image from "next/image";
import { useRef } from "react";
import { useFormContext, useWatch } from "react-hook-form";
import { InputController } from "@/components/controllers";
import { communityHeaderBackground, deriveCommunityVisualPalette } from "@/lib/community-visual";
import type { useAvatarDraft } from "./use-avatar-draft";

type VisualValues = { name: string; visual_primary_color: string };

export const CommunityCreateVisualIdentity = ({
  avatar,
  disabled,
}: {
  avatar: ReturnType<typeof useAvatarDraft>;
  disabled: boolean;
}) => {
  const fileRef = useRef<HTMLInputElement>(null);
  const form = useFormContext<VisualValues>();
  const [name, color] = useWatch({ control: form.control, name: ["name", "visual_primary_color"] });
  const palette = deriveCommunityVisualPalette(color);
  return (
    <section className="min-w-0 border-t border-border pt-5" aria-label="Identidade visual">
      <h3 className="text-sm font-bold text-foreground">Identidade visual</h3>
      <div className="mt-4 grid min-w-0 gap-6 lg:grid-cols-2">
        <div className="min-w-0 space-y-4">
          <div className="flex items-center gap-4">
            <input
              ref={fileRef}
              className="sr-only"
              type="file"
              aria-label="Arquivo do avatar da comunidade"
              disabled={disabled || avatar.analyzing}
              accept="image/jpeg,image/png,image/webp"
              onChange={(event) => {
                const file = event.target.files?.[0];
                event.target.value = "";
                if (file) void avatar.select(file);
              }}
            />
            <button
              type="button"
              aria-label={avatar.file ? "Trocar avatar" : "Adicionar avatar"}
              title={avatar.file ? "Trocar avatar" : "Adicionar avatar"}
              disabled={disabled || avatar.analyzing}
              onClick={() => fileRef.current?.click()}
              className="relative grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-control border border-border bg-surface text-primary focus-visible:ring-4 focus-visible:ring-primary-soft disabled:opacity-60"
            >
              {avatar.preview ? (
                <Image
                  alt="Avatar selecionado"
                  fill
                  sizes="80px"
                  src={avatar.preview}
                  unoptimized
                  className="object-cover"
                />
              ) : (
                <Camera aria-hidden className="h-6 w-6" />
              )}
            </button>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground">Avatar da comunidade</p>
              <p className="text-xs text-muted">JPEG, PNG ou WebP · até 5 MB</p>
              {avatar.analyzing ? (
                <Loader2 aria-label="Analisando avatar" className="mt-2 h-4 w-4 animate-spin" />
              ) : null}
            </div>
            {avatar.file ? (
              <button
                type="button"
                title="Remover avatar"
                aria-label="Remover avatar"
                disabled={disabled}
                onClick={avatar.remove}
                className="ml-auto grid h-10 w-10 shrink-0 place-items-center rounded-full border border-border text-muted disabled:opacity-60"
              >
                <X aria-hidden className="h-4 w-4" />
              </button>
            ) : null}
          </div>
          <div className="flex items-start gap-3" onChangeCapture={avatar.markManual}>
            <input
              type="color"
              aria-label="Escolher cor do header"
              title="Escolher cor do header"
              value={palette.primaryColor}
              disabled={disabled}
              className="mt-7 h-12 w-12 shrink-0 cursor-pointer rounded-control border border-border bg-surface p-1"
              onChange={(event) =>
                form.setValue("visual_primary_color", event.target.value.toUpperCase(), {
                  shouldDirty: true,
                  shouldValidate: true,
                })
              }
            />
            <InputController<VisualValues>
              name="visual_primary_color"
              label="Cor do header"
              placeholder={palette.primaryColor}
              disabled={disabled}
            />
            <button
              type="button"
              title="Usar cor do avatar"
              aria-label="Usar cor do avatar"
              disabled={disabled || !avatar.suggestion || avatar.analyzing}
              onClick={avatar.restore}
              className="mt-7 grid h-12 w-12 shrink-0 place-items-center rounded-full border border-border text-muted disabled:opacity-40"
            >
              <RotateCcw aria-hidden className="h-4 w-4" />
            </button>
          </div>
        </div>
        <section
          className="min-w-0 overflow-hidden rounded-control border border-border bg-surface"
          aria-label="Prévia do header"
        >
          <div className="h-24" style={{ background: communityHeaderBackground(color) }} />
          <div className="px-4 pb-4">
            <div
              className="relative -mt-8 grid h-16 w-16 place-items-center overflow-hidden rounded-control font-bold text-primary-foreground ring-4 ring-surface"
              style={{ background: palette.primaryColor }}
            >
              {avatar.preview ? (
                <Image
                  alt="Avatar na prévia"
                  fill
                  sizes="64px"
                  src={avatar.preview}
                  unoptimized
                  className="object-cover"
                />
              ) : (
                name.trim().slice(0, 2).toUpperCase() || "CO"
              )}
            </div>
            <p className="mt-3 break-words text-lg font-bold text-foreground">
              {name.trim() || "Nome da comunidade"}
            </p>
          </div>
        </section>
      </div>
    </section>
  );
};
