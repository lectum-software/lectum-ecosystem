"use client";
import { Download, ImageIcon, Loader2 } from "lucide-react";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { loadFeedbackAttachment } from "@/api/req/feedback";
import { actionClass } from "../shared";

export function PrivateCapture({
  feedbackId,
  id,
  index,
}: {
  feedbackId: string;
  id: string;
  index: number;
}) {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  useEffect(
    () => () => {
      if (url) URL.revokeObjectURL(url);
    },
    [url],
  );
  return (
    <div className="space-y-2">
      {url ? (
        <>
          <a href={url} download={`captura-${index}.jpg`} className={actionClass}>
            <Download className="h-4 w-4" aria-hidden /> Captura {index}
          </a>
          <div className="relative aspect-[4/3] overflow-hidden rounded-lg border border-border">
            <Image
              src={url}
              alt={`Captura de tela ${index}`}
              fill
              unoptimized
              className="object-contain"
            />
          </div>
        </>
      ) : (
        <button
          className={actionClass}
          type="button"
          disabled={loading}
          onClick={async () => {
            setLoading(true);
            setError(false);
            try {
              const blob = await loadFeedbackAttachment(feedbackId, id);
              if (mounted.current) setUrl(URL.createObjectURL(blob));
            } catch {
              if (mounted.current) setError(true);
            } finally {
              if (mounted.current) setLoading(false);
            }
          }}
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <ImageIcon className="h-4 w-4" />
          )}{" "}
          Abrir captura {index}
        </button>
      )}
      {error ? (
        <p role="alert" className="text-sm text-danger">
          Não foi possível abrir a captura. Tente novamente.
        </p>
      ) : null}
    </div>
  );
}
