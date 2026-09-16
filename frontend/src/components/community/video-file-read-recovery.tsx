"use client";

import type { RefObject } from "react";
import { Button } from "@/registry/new-york-v4/ui/button";

export function VideoFileReadRecovery({
  disabled,
  fileInputRef,
  onDiscard,
  onOpenDialog,
}: {
  disabled?: boolean;
  fileInputRef: RefObject<HTMLInputElement | null>;
  onDiscard?: () => void;
  onOpenDialog?: () => void;
}) {
  return (
    <div className="grid min-w-0 gap-2">
      <p className="text-xs leading-5 text-muted">
        Escolha o vídeo pelo seletor de arquivos do aparelho. Seu texto será mantido.
      </p>
      <Button
        className="h-auto min-h-11 w-full whitespace-normal px-3 py-2"
        disabled={disabled}
        onClick={() => {
          const input = fileInputRef.current;
          if (!input) return;
          onOpenDialog?.();
          // O seletor genérico evita repetir exclusivamente o Photo Picker no Android.
          // É apenas uma dica de seleção: as validações de tipo/limite/autorização continuam.
          input.accept = "*/*";
          input.value = "";
          input.click();
        }}
        type="button"
        variant="outline"
      >
        Escolher vídeo pelos arquivos
      </Button>
      {onDiscard ? (
        <Button
          className="h-auto min-h-11 w-full whitespace-normal px-3 py-2"
          disabled={disabled}
          onClick={onDiscard}
          type="button"
          variant="outline"
        >
          Descartar tentativa de vídeo
        </Button>
      ) : null}
    </div>
  );
}
