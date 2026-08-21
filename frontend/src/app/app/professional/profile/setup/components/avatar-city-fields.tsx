"use client";

import { useState } from "react";
import { Controller } from "react-hook-form";
import { Container } from "@/components/controllers/container";
import { describedBy, fieldId } from "@/components/controllers/utils";
import { cn } from "@/lib/utils";
import {
  detectImageAnimation,
  type ImageMimeType,
  resolveImageFileMimeType,
  withImageFileExtension,
} from "@/utils/image-preparation";
import type { FreeProfileForm, useFreeProfileForm } from "../use-form";

export const normalizeCitySearch = (value: string) =>
  value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();

export type AvatarDraft = {
  file: File;
  position: {
    x: number;
    y: number;
  };
  url: string;
};

export type AvatarDragState = {
  height: number;
  originX: number;
  originY: number;
  pointerId: number;
  startX: number;
  startY: number;
  width: number;
};

export const AVATAR_MAX_SIZE_BYTES = 5 * 1024 * 1024;

export const AVATAR_CROP_SIZE = 512;

export const isSupportedStaticAvatarFile = async (file: File) => {
  const mimeType = resolveImageFileMimeType(file);
  if (!mimeType) return false;

  try {
    return (await detectImageAnimation(file, mimeType)) === "static";
  } catch {
    return false;
  }
};

export const clampPercent = (value: number) => Math.max(0, Math.min(100, value));

const loadAvatarImage = (file: File) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();
    const cleanup = () => URL.revokeObjectURL(objectUrl);

    image.decoding = "async";
    image.onload = () => {
      cleanup();
      resolve(image);
    };
    image.onerror = () => {
      cleanup();
      reject(new Error("Não foi possível preparar a imagem."));
    };
    image.src = objectUrl;
  });

export const cropAvatarFile = async (draft: AvatarDraft) => {
  // HTMLImageElement keeps EXIF orientation on Safari/iOS when the Blob path
  // of createImageBitmap does not.
  const image = await loadAvatarImage(draft.file);
  const sourceSize = Math.min(image.naturalWidth, image.naturalHeight);
  const outputSize = Math.min(AVATAR_CROP_SIZE, sourceSize);
  const sourceX = Math.round((image.naturalWidth - sourceSize) * (draft.position.x / 100));
  const sourceY = Math.round((image.naturalHeight - sourceSize) * (draft.position.y / 100));
  const canvas = document.createElement("canvas");
  canvas.width = outputSize;
  canvas.height = outputSize;
  const context = canvas.getContext("2d");

  if (!context) {
    image.src = "";
    throw new Error("Não foi possível preparar a imagem.");
  }

  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  context.drawImage(image, sourceX, sourceY, sourceSize, sourceSize, 0, 0, outputSize, outputSize);
  image.src = "";

  const inputType = resolveImageFileMimeType(draft.file);
  const outputType: ImageMimeType =
    inputType === "image/png" || inputType === "image/webp" ? inputType : "image/jpeg";
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, outputType, 0.92),
  );

  if (!blob) {
    throw new Error("Não foi possível preparar a imagem.");
  }

  return new File([blob], withImageFileExtension(draft.file.name, outputType), {
    lastModified: Date.now(),
    type: outputType,
  });
};

export const CityField = ({
  control,
  options,
  selectedValue,
  stateSelected,
}: {
  control: ReturnType<typeof useFreeProfileForm>["hook"]["control"];
  options: { label: string; value: string | number | boolean; disabled?: boolean }[];
  selectedValue?: string;
  stateSelected: boolean;
}) => {
  const selectedLabel = options.find((option) => option.value === selectedValue)?.label;
  const [search, setSearch] = useState(selectedLabel ? String(selectedLabel) : "");
  const inputId = fieldId<FreeProfileForm>("address_city");
  const normalizedSearch = normalizeCitySearch(search);
  const filteredOptions = normalizedSearch
    ? options.filter((option) =>
        normalizeCitySearch(String(option.label)).includes(normalizedSearch),
      )
    : options;
  const shouldShowOptions = stateSelected && (!selectedLabel || search !== String(selectedLabel));

  return (
    <Controller
      control={control}
      name="address_city"
      render={({ field, fieldState }) => {
        const error = fieldState.error?.message;

        return (
          <Container
            error={error}
            htmlFor={inputId}
            label="Cidade"
            name="address_city"
            required
            skipHtmlFor
          >
            <input
              aria-label="Filtrar cidades"
              aria-describedby={describedBy({
                id: inputId,
                error,
              })}
              aria-invalid={Boolean(error)}
              className={cn(
                "h-12 rounded-[var(--lectum-control-radius)] border border-border bg-surface px-4 text-sm text-foreground shadow-sm outline-none transition placeholder:text-subtle focus:border-primary focus:ring-4 focus:ring-primary/10 disabled:cursor-not-allowed disabled:bg-surface-muted disabled:text-muted",
                error && "border-danger focus:border-danger focus:ring-danger/10",
              )}
              disabled={!stateSelected}
              id={inputId}
              onBlur={field.onBlur}
              onChange={(event) => {
                const nextSearch = event.target.value;
                setSearch(nextSearch);

                if (selectedLabel && nextSearch !== String(selectedLabel)) {
                  field.onChange("");
                }
              }}
              placeholder={stateSelected ? "Buscar cidade" : "Selecione o estado"}
              ref={field.ref}
              type="search"
              value={search}
            />

            {shouldShowOptions ? (
              <div className="max-h-56 overflow-y-auto rounded-2xl border border-border bg-surface p-2">
                {filteredOptions.length > 0 ? (
                  <div className="grid gap-1">
                    {filteredOptions.map((option) => {
                      const checked = option.value === field.value;

                      return (
                        <button
                          className={cn(
                            "rounded-xl px-3 py-2 text-left text-sm font-semibold text-foreground transition hover:bg-primary-soft hover:text-primary",
                            checked && "bg-primary-soft text-primary",
                          )}
                          key={String(option.value)}
                          onClick={() => {
                            field.onChange(option.value);
                            setSearch(String(option.label));
                          }}
                          type="button"
                        >
                          {option.label}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <p className="px-3 py-2 text-sm text-muted">
                    Nenhuma cidade encontrada para este filtro.
                  </p>
                )}
              </div>
            ) : null}
          </Container>
        );
      }}
    />
  );
};
