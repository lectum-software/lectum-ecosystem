"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Pause, Play } from "lucide-react";
import { useRouter } from "next/navigation";
import { type CSSProperties, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { z } from "zod";
import { callEndpoint } from "@/api/generator";
import { handleReq } from "@/api/handle";
import { VerticalVideoPlayer } from "@/components/ui/vertical-video-player";
import { formatVideoTime } from "@/components/ui/vertical-video-player-support";
import { type Field, useFormList } from "@/hooks/form";
import styles from "./editor.module.css";
import type { VideoCaptions } from "./types";

const timestamp = (seconds: number) => formatVideoTime(seconds).padStart(5, "0");

const schema = z.record(
  z.string(),
  z
    .string()
    .trim()
    .min(1)
    .max(500)
    .refine((text) => !/[<>]/.test(text)),
);

export function CaptionEditForm({
  initial,
  save,
  source,
}: {
  initial: VideoCaptions;
  save: (value: VideoCaptions) => Promise<VideoCaptions>;
  source?: string;
}) {
  const router = useRouter();
  const [document, setDocument] = useState(initial);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [video, setVideo] = useState<HTMLVideoElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const handleVideoReady = useCallback((element: HTMLVideoElement | null) => {
    videoRef.current = element;
    setVideo(element);
  }, []);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [compact, setCompact] = useState(false);
  const [focusedCue, setFocusedCue] = useState<number | null>(null);
  const cueListRef = useRef<HTMLElement>(null);
  const headerRef = useRef<HTMLElement>(null);
  const activeCue =
    focusedCue ?? document.cues.findIndex((cue) => time >= cue.start && time < cue.end);
  useEffect(() => {
    const revealActiveCue = () => {
      const list = cueListRef.current;
      const cue = list
        ?.querySelector(`[name="cue${activeCue}"]`)
        ?.closest<HTMLElement>(`.${styles.cue}`);
      if (!list || !cue) return;
      const mobile = window.matchMedia("(max-width: 700px)").matches;
      const listBounds = list.getBoundingClientRect();
      const top =
        (mobile ? listBounds.top : (headerRef.current?.getBoundingClientRect().bottom ?? 64)) +
        (compact ? 12 : 16);
      const bottom =
        (mobile ? Math.min(listBounds.bottom, window.innerHeight) : window.innerHeight) - 12;
      const bounds = cue.getBoundingClientRect();
      // Scroll the cue list on mobile, and the page below the sticky header on desktop.
      const delta =
        bounds.top < top || bounds.height > bottom - top
          ? bounds.top - top
          : bounds.bottom > bottom
            ? bounds.bottom - bottom
            : 0;
      if (Math.abs(delta) < 1) return;
      if (mobile) list.scrollBy({ top: delta, behavior: "instant" });
      else window.scrollBy({ top: delta, behavior: "instant" });
    };
    const frame = requestAnimationFrame(revealActiveCue);
    window.addEventListener("resize", revealActiveCue);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", revealActiveCue);
    };
  }, [activeCue, compact]);
  useEffect(() => {
    if (!video) return;
    const update = () => {
      setTime(video.currentTime);
      setDuration(Number.isFinite(video.duration) ? video.duration : 0);
      setPlaying(!video.paused && !video.ended);
    };
    const events = [
      "timeupdate",
      "durationchange",
      "loadedmetadata",
      "play",
      "pause",
      "ended",
      "seeked",
    ];
    for (const event of events) video.addEventListener(event, update);
    update();
    return () => {
      for (const event of events) video.removeEventListener(event, update);
    };
  }, [video]);
  const fields = useMemo<Field<Record<string, string>>[]>(
    () =>
      initial.cues.map((cue, index) => ({
        name: `cue${index}`,
        field: "textarea",
        rows: 2,
        max: 500,
        label: `${timestamp(cue.start)} – ${timestamp(cue.end)}`,
        className: `${styles.cue} ${index === activeCue ? styles.active : ""}`,
        inputClassName: styles.input,
      })),
    [initial, activeCue],
  );
  const defaultValues = useMemo(
    () => Object.fromEntries(initial.cues.map((cue, index) => [`cue${index}`, cue.text])),
    [initial],
  );
  const { Form, formProps, hook, isDirty } = useFormList({ fields, schema, defaultValues });
  const values = hook.watch();
  const preview = {
    ...document,
    cues: document.cues.map((cue, index) => ({ ...cue, text: values[`cue${index}`] ?? cue.text })),
  };
  useEffect(() => {
    if (!isDirty) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [isDirty]);
  return (
    <main className={styles.screen}>
      <header ref={headerRef} className={styles.header}>
        <button
          type="button"
          className="grid h-11 w-11 place-items-center"
          aria-label="Voltar"
          title="Voltar"
          onClick={() => {
            if (!isDirty || window.confirm("Descartar alterações não salvas?")) router.back();
          }}
        >
          <ArrowLeft size={22} />
        </button>
        <h1>Editar legenda</h1>
        <button
          type="submit"
          form="caption-editor-form"
          disabled={hook.formState.isSubmitting || !isDirty}
          className="h-11 px-3 font-semibold text-primary disabled:opacity-50"
        >
          Salvar
        </button>
      </header>
      <div className={styles.body}>
        <div className={styles.player} data-compact={compact}>
          <div className={styles.frame}>
            <VerticalVideoPlayer
              src={source ?? `/api/private/video-assets/${document.asset_id}/playback`}
              title="Prévia da legenda"
              captions={preview}
              controls={false}
              fit="contain"
              onVideoElementReady={handleVideoReady}
              className="aspect-[9/16] overflow-hidden rounded-lg"
            />
          </div>
          <div className={styles.controls}>
            <button
              type="button"
              disabled={!video || !duration}
              aria-label={playing ? "Pausar prévia" : "Reproduzir prévia"}
              title={playing ? "Pausar" : "Reproduzir"}
              onClick={async () => {
                if (!video) return;
                setFocusedCue(null);
                if (!video.paused) video.pause();
                else
                  try {
                    await video.play();
                  } catch {
                    setError("Não foi possível reproduzir o vídeo. Tente novamente.");
                  }
              }}
            >
              {playing ? (
                <Pause size={18} fill="currentColor" />
              ) : (
                <Play size={18} fill="currentColor" />
              )}
            </button>
            <input
              type="range"
              aria-label="Posição do vídeo"
              min={0}
              max={duration || 1}
              step={0.01}
              disabled={!duration}
              value={Math.min(time, duration || 1)}
              style={
                { "--progress": `${duration ? (time / duration) * 100 : 0}%` } as CSSProperties
              }
              onChange={(event) => {
                const video = videoRef.current;
                if (!video) return;
                setFocusedCue(null);
                video.currentTime = Number(event.target.value);
                setTime(video.currentTime);
              }}
            />
            <span className={styles.time}>
              {timestamp(time)} / {timestamp(duration)}
            </span>
          </div>
        </div>
        <section
          ref={cueListRef}
          aria-label="Trechos da legenda"
          className={styles.cueList}
          onScroll={(event) => {
            const top = event.currentTarget.scrollTop;
            setCompact((current) => (current ? top > 4 : top > 48));
          }}
        >
          <div className={styles.info}>
            <strong>Português</strong>
            <span className={styles.badge} data-reviewed={document.reviewed}>
              {document.reviewed ? "Revisada" : "Não revisada"}
            </span>
          </div>
          <p className={styles.help}>As correções atualizam a legenda e a transcrição pública.</p>
          <Form
            {...formProps}
            id="caption-editor-form"
            onFocusCapture={(event) => {
              const target = event.target;
              if (!(target instanceof HTMLTextAreaElement)) return;
              const index = Number(target.name.slice(3));
              if (!Number.isInteger(index) || !document.cues[index]) return;
              setFocusedCue(index);
              const video = videoRef.current;
              if (video) {
                video.pause();
                video.currentTime = document.cues[index].start;
              }
            }}
            onlyRead={hook.formState.isSubmitting}
            onSubmit={hook.handleSubmit(async (data) => {
              setError("");
              setSaved(false);
              try {
                const updated = await save({
                  ...document,
                  cues: document.cues.map((cue, index) => ({ ...cue, text: data[`cue${index}`] })),
                });
                setDocument(updated);
                hook.reset(
                  Object.fromEntries(updated.cues.map((cue, index) => [`cue${index}`, cue.text])),
                );
                setSaved(true);
              } catch {
                setError(
                  "Não foi possível salvar. Reabra a legenda se ela foi alterada em outra janela.",
                );
              }
            })}
          />
          <button
            type="submit"
            form="caption-editor-form"
            disabled={hook.formState.isSubmitting || !isDirty}
            className={styles.saveButton}
          >
            {hook.formState.isSubmitting ? "Salvando…" : "Salvar"}
          </button>
          <p role="status" className={styles.saveState} data-error={Boolean(error)}>
            {error || (isDirty ? "Alterações não salvas" : saved ? "Alterações salvas." : "")}
          </p>
        </section>
      </div>
    </main>
  );
}

export function CaptionEditor({ assetId }: { assetId: string }) {
  const queryClient = useQueryClient();
  const route = `/api/private/video-assets/${encodeURIComponent(assetId)}/captions`;
  const query = useQuery({
    queryKey: ["caption-editor", assetId],
    retry: false,
    queryFn: () =>
      handleReq<{ state: string; caption: VideoCaptions | null }>({
        ...callEndpoint({ route }),
        hideError: true,
      }),
  });
  const mutation = useMutation({
    mutationFn: (caption: VideoCaptions) =>
      handleReq<VideoCaptions>({
        ...callEndpoint({
          route,
          method: "PUT",
          body: { cues: caption.cues, revision: caption.revision },
        }),
        hideError: true,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        predicate: (query) => query.queryKey.some((key) => key === assetId),
      });
    },
  });
  if (query.isPending)
    return (
      <p role="status" className="p-6">
        Carregando legenda…
      </p>
    );
  if (!query.data?.caption)
    return (
      <p role="status" className="p-6">
        Legenda indisponível para edição.
      </p>
    );
  return <CaptionEditForm key={assetId} initial={query.data.caption} save={mutation.mutateAsync} />;
}
