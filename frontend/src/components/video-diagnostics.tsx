"use client";

import { Download, Square } from "lucide-react";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { startVideoDiagnostics } from "@/utils/video-diagnostics";
import packageInfo from "../../package.json";

let initialActivation: boolean | undefined;
const subscribe = () => () => {};
const serverSnapshot = () => false;
const clientSnapshot = () => {
  initialActivation ??= new URLSearchParams(window.location.search).get("videoDiagnostics") === "1";
  return initialActivation;
};

export function VideoDiagnostics() {
  const session = useRef<ReturnType<typeof startVideoDiagnostics> | null>(null);
  const requestedDirectoryPlayer = useRef("individual");
  const enabled = useSyncExternalStore(subscribe, clientSnapshot, serverSnapshot);
  const [stopped, setStopped] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    requestedDirectoryPlayer.current =
      new URLSearchParams(window.location.search).get("directoryPlayer") === "pooled"
        ? "pooled"
        : "individual";
    session.current = startVideoDiagnostics();
    return () => {
      session.current?.stop();
    };
  }, [enabled]);

  if (!enabled) return null;

  const exportReport = async () => {
    if (!session.current) return;
    const file = new File(
      [
        JSON.stringify(
          {
            version: packageInfo.version,
            directoryPlayerRequested: requestedDirectoryPlayer.current,
            directoryPlayerAtExport: document.querySelector(
              '[data-directory-player-model="pooled"]',
            )
              ? "pooled"
              : "individual",
            ...session.current.report(),
          },
          null,
          2,
        ),
      ],
      "lectum-video-test.json",
      { type: "application/json" },
    );
    if (navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file] });
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
      }
    }
    const url = URL.createObjectURL(file);
    const link = document.createElement("a");
    link.href = url;
    link.download = file.name;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
  };

  return (
    <fieldset
      aria-label="Medição de vídeo"
      className="fixed left-2 top-[calc(env(safe-area-inset-top)+8px)] z-[9999] flex gap-1 rounded-md bg-media-background/80 p-1 text-media-foreground"
    >
      <button
        type="button"
        title="Exportar medição"
        aria-label="Exportar medição"
        className="flex h-11 w-11 items-center justify-center"
        onClick={() => void exportReport()}
      >
        <Download size={20} />
      </button>
      <button
        type="button"
        title={stopped ? "Medição encerrada" : "Encerrar medição"}
        aria-label={stopped ? "Medição encerrada" : "Encerrar medição"}
        disabled={stopped}
        className="flex h-11 w-11 items-center justify-center disabled:opacity-40"
        onClick={() => {
          session.current?.stop();
          setStopped(true);
        }}
      >
        <Square size={16} />
      </button>
    </fieldset>
  );
}
