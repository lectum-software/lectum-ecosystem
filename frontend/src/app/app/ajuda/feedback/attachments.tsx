"use client";
import { ImagePlus, X } from "lucide-react";
import Image from "next/image";
import { useEffect, useState } from "react";

export function CapturePreview({
  file,
  remove,
  disabled,
}: {
  file: File;
  remove: () => void;
  disabled: boolean;
}) {
  const [url, setUrl] = useState("");
  useEffect(() => {
    const reader = new FileReader();
    reader.onload = () => setUrl(typeof reader.result === "string" ? reader.result : "");
    reader.readAsDataURL(file);
    return () => {
      reader.onload = null;
      if (reader.readyState === FileReader.LOADING) reader.abort();
    };
  }, [file]);
  return (
    <div className="relative aspect-square overflow-hidden rounded-lg border border-border bg-surface">
      {url ? (
        <Image src={url} alt="Captura selecionada" fill unoptimized className="object-contain" />
      ) : null}
      <button
        aria-label="Remover captura"
        title="Remover captura"
        type="button"
        disabled={disabled}
        onClick={remove}
        className="absolute right-1 top-1 grid h-9 w-9 place-items-center rounded-full border border-border bg-surface text-foreground"
      >
        <X aria-hidden className="h-4 w-4" />
      </button>
    </div>
  );
}

export function Attachments({
  files,
  onChange,
  disabled,
  onError,
}: {
  files: File[];
  onChange: (files: File[]) => void;
  disabled: boolean;
  onError: (message: string) => void;
}) {
  return (
    <fieldset disabled={disabled} className="space-y-3">
      <legend className="mb-3 text-sm font-semibold">Capturas de tela (opcional)</legend>
      <div className="grid grid-cols-3 gap-3">
        {files.map((file, index) => (
          <CapturePreview
            key={`${file.name}-${file.size}-${file.lastModified}`}
            file={file}
            disabled={disabled}
            remove={() => onChange(files.filter((_, position) => position !== index))}
          />
        ))}
        {files.length < 3 ? (
          <label className="relative grid aspect-square cursor-pointer place-items-center rounded-lg border border-dashed border-border bg-surface-muted text-primary focus-within:ring-2 focus-within:ring-primary">
            <ImagePlus aria-hidden className="h-7 w-7" />
            <input
              type="file"
              aria-label="Adicionar capturas de tela"
              accept="image/jpeg,image/png,image/webp"
              multiple
              className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
              onChange={(event) => {
                const selected = Array.from(event.target.files ?? []);
                event.target.value = "";
                if (files.length + selected.length > 3) {
                  onError("Selecione até 3 capturas.");
                  return;
                }
                if (
                  selected.some(
                    (file) =>
                      file.size > 5 * 1024 * 1024 ||
                      !["image/jpeg", "image/png", "image/webp"].includes(file.type),
                  )
                ) {
                  onError("Use imagens JPEG, PNG ou WebP de até 5 MB cada.");
                  return;
                }
                onError("");
                const unique = new Map(
                  [...files, ...selected].map((file) => [
                    `${file.name}-${file.size}-${file.lastModified}`,
                    file,
                  ]),
                );
                onChange([...unique.values()]);
              }}
            />
          </label>
        ) : null}
      </div>
      <p className="text-xs leading-5 text-muted">
        Até 3 imagens de 5 MB cada. Evite incluir informações pessoais ou de pacientes.
      </p>
    </fieldset>
  );
}
