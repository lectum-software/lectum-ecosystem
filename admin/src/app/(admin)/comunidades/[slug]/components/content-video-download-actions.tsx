"use client";

import { Captions, ChevronDown, Download, IdCard, Loader2 } from "lucide-react";
import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import {
  type ContentVideoDownloadTarget,
  useContentVideoDownloads,
} from "../modules/video-downloads";

type ContentVideoDownloadActionsProps = ContentVideoDownloadTarget & {
  allowArtDownload: boolean;
  className?: string;
  compact?: boolean;
};

export const ContentVideoDownloadActions = ({
  allowArtDownload,
  className,
  compact = false,
  communityId,
  targetId,
  targetType,
}: ContentVideoDownloadActionsProps) => {
  const { downloadOriginal, downloadWithArt, downloadWithCaptions, isPending } =
    useContentVideoDownloads();
  const disclosure = useRef<HTMLDetailsElement>(null);
  const target = { communityId, targetId, targetType };
  const pending =
    isPending(target, "original") || isPending(target, "art") || isPending(target, "captions");

  useEffect(() => {
    const dismiss = (event: PointerEvent) => {
      if (
        disclosure.current &&
        event.target instanceof Node &&
        !disclosure.current.contains(event.target)
      )
        disclosure.current.open = false;
    };
    document.addEventListener("pointerdown", dismiss);
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && disclosure.current?.open) {
        disclosure.current.open = false;
        disclosure.current.querySelector("summary")?.focus();
      }
    };
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("pointerdown", dismiss);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  const options = [
    { label: "Original", icon: Download, disabled: false, download: downloadOriginal },
    {
      label: "Legenda",
      icon: Captions,
      disabled: !allowArtDownload,
      download: downloadWithCaptions,
    },
    { label: "ID", icon: IdCard, disabled: !allowArtDownload, download: downloadWithArt },
  ];

  return (
    <details
      ref={disclosure}
      className={cn("group relative min-w-36", className)}
      aria-busy={pending}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) event.currentTarget.open = false;
      }}
    >
      <summary
        aria-disabled={pending}
        onClick={(event) => {
          if (pending) event.preventDefault();
        }}
        className={cn(
          "flex cursor-pointer list-none items-center justify-center gap-2 rounded-control border border-border bg-surface px-3 font-semibold text-foreground outline-none transition hover:border-primary focus-visible:ring-2 focus-visible:ring-primary-soft [&::-webkit-details-marker]:hidden",
          compact ? "h-9 text-xs" : "h-10 text-sm",
          pending && "cursor-wait opacity-60",
        )}
      >
        {pending ? (
          <Loader2 aria-hidden className="h-4 w-4 animate-spin" />
        ) : (
          <Download aria-hidden className="h-4 w-4" />
        )}
        <span>{pending ? "Preparando..." : "Baixar vídeo"}</span>
        <ChevronDown
          aria-hidden
          className="ml-auto h-4 w-4 text-muted transition group-open:rotate-180"
        />
      </summary>
      <ul
        aria-label="Opções de download"
        className="mt-1 w-full min-w-36 rounded-lg border border-border bg-surface p-1 shadow-sm"
      >
        {options.map(({ label, icon: Icon, disabled, download }) => (
          <li key={label}>
            <button
              type="button"
              disabled={pending || disabled}
              className="flex min-h-10 w-full items-center gap-2 rounded-md px-3 text-left text-sm font-medium text-foreground outline-none hover:bg-primary-soft hover:text-primary focus-visible:bg-primary-soft disabled:cursor-not-allowed disabled:opacity-40"
              onClick={() => {
                if (disclosure.current) {
                  disclosure.current.open = false;
                  disclosure.current.querySelector("summary")?.focus();
                }
                void download(target);
              }}
            >
              <Icon aria-hidden className="h-4 w-4 text-muted" />
              {label}
            </button>
          </li>
        ))}
      </ul>
    </details>
  );
};
