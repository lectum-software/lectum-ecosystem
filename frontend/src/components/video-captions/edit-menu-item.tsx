"use client";

import { Captions } from "lucide-react";
import Link from "next/link";
import { useVideoAssetPlayback } from "@/api/callers/video-assets";
import { videoAssetIdFromReference } from "@/utils/video-stream";

export function EditCaptionMenuItem({ reference }: { reference?: string | null }) {
  const playback = useVideoAssetPlayback(reference);
  const id = videoAssetIdFromReference(reference);
  if (!id || !playback.data?.captions) return null;
  return (
    <Link
      role="menuitem"
      href={`/app/videos/${id}/legendas`}
      className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left font-normal text-foreground transition hover:bg-surface-muted"
      onClick={(event) => event.stopPropagation()}
    >
      <Captions className="h-4 w-4" aria-hidden="true" />
      Editar legenda
    </Link>
  );
}
