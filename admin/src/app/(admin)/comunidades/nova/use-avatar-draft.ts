"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { readCommunityAvatarColor } from "@/lib/community-avatar-color";
import { resolveImageFileMimeType } from "@/lib/image-preparation";

export const useAvatarDraft = (setColor: (color: string) => void) => {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [suggestion, setSuggestion] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const manual = useRef(false);
  const generation = useRef(0);
  const previewRef = useRef<string | null>(null);
  useEffect(
    () => () => {
      generation.current++;
      if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    },
    [],
  );

  const select = async (next: File) => {
    if (!resolveImageFileMimeType(next)) {
      toast.error("Envie uma imagem JPEG, PNG ou WebP.");
      return;
    }
    if (next.size > 5 * 1024 * 1024) {
      toast.error("A imagem deve ter no máximo 5 MB.");
      return;
    }
    const current = ++generation.current;
    if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    previewRef.current = URL.createObjectURL(next);
    setPreview(previewRef.current);
    setFile(next);
    setSuggestion(null);
    setAnalyzing(true);
    if (!manual.current) setColor("");
    try {
      const color = await readCommunityAvatarColor(next);
      if (current !== generation.current) return;
      setSuggestion(color);
      if (!manual.current) setColor(color ?? "");
      if (!color) toast.info("Não foi possível sugerir uma cor. Você pode escolher manualmente.");
    } catch {
      if (current === generation.current) {
        toast.info("Não foi possível ler a cor do avatar. Você pode escolher manualmente.");
      }
    } finally {
      if (current === generation.current) setAnalyzing(false);
    }
  };

  return {
    file,
    preview,
    suggestion,
    analyzing,
    select,
    markManual: () => {
      manual.current = true;
    },
    restore: () => {
      manual.current = false;
      setColor(suggestion ?? "");
    },
    remove: () => {
      generation.current++;
      if (previewRef.current) URL.revokeObjectURL(previewRef.current);
      previewRef.current = null;
      setPreview(null);
      setFile(null);
      setSuggestion(null);
      setAnalyzing(false);
      if (!manual.current) setColor("");
    },
  };
};
