"use client";

import { useCallback, useState } from "react";
import { toast } from "sonner";
import { resolveApiError } from "@/api/handle";
import {
  type AdminCommunityContentOriginalVideoDownload,
  type AdminCommunityContentVideoArtRenderJob,
  type AdminCommunityVideoDownloadTargetType,
  downloadAdminCommunityContentVideoArtRenderJobFile,
  getAdminCommunityContentVideoArtRenderJob,
  prepareAdminCommunityContentOriginalVideoDownload,
  startAdminCommunityContentVideoArtRenderJob,
} from "@/api/req/communities";
import { downloadFileBlob } from "@/lib/download";

const ORIGINAL_VIDEO_DOWNLOAD_TIMEOUT_MS = 180_000;
const SHARE_VIDEO_RENDER_TIMEOUT_MS = 900_000;
const SHARE_VIDEO_RENDER_INITIAL_DELAY_MS = 2_500;
const SHARE_VIDEO_RENDER_MAX_DELAY_MS = 6_000;
const DEFAULT_RETRY_AFTER_MS = 5_000;

export type ContentVideoDownloadTarget = {
  communityId: string;
  targetId: string;
  targetType: AdminCommunityVideoDownloadTargetType;
};

type DownloadAction = "art" | "original";

const wait = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms));

const targetKey = (target: ContentVideoDownloadTarget, action: DownloadAction) =>
  `${action}:${target.communityId}:${target.targetType}:${target.targetId}`;

const boundedRetryAfter = (value: number | null | undefined) => {
  const retryAfter = Number(value ?? DEFAULT_RETRY_AFTER_MS);
  if (!Number.isFinite(retryAfter)) return DEFAULT_RETRY_AFTER_MS;

  return Math.min(15_000, Math.max(1_500, retryAfter));
};

const assertDirectDownloadUrl = (value: string | null | undefined) => {
  if (!value) throw new Error("Download indisponível para este vídeo agora.");

  try {
    const url = new URL(value);
    if (url.protocol === "https:" || url.protocol === "http:") return url.toString();
  } catch {
    // A mensagem pública abaixo evita expor detalhes técnicos do provider.
  }

  throw new Error("Download indisponível para este vídeo agora.");
};

const resolveDownloadError = (error: unknown) => {
  if (error instanceof Error && !("response" in error)) return error.message;

  return resolveApiError(error);
};

const downloadDirectVideo = (url: string, fileName: string | null | undefined) => {
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName || "video-Lectum-original.mp4";
  link.rel = "noopener noreferrer";
  link.hidden = true;
  document.body.append(link);

  try {
    link.click();
  } finally {
    link.remove();
  }
};

const resolveOriginalVideoDownload = async (
  target: ContentVideoDownloadTarget,
): Promise<AdminCommunityContentOriginalVideoDownload> => {
  const startedAt = Date.now();
  let result = await prepareAdminCommunityContentOriginalVideoDownload(
    target.communityId,
    target.targetType,
    target.targetId,
  );

  while (!result.available && result.status === "inprogress") {
    if (Date.now() - startedAt > ORIGINAL_VIDEO_DOWNLOAD_TIMEOUT_MS) {
      throw new Error("O vídeo original ainda está sendo preparado. Tente novamente em instantes.");
    }

    await wait(boundedRetryAfter(result.retry_after_ms));
    result = await prepareAdminCommunityContentOriginalVideoDownload(
      target.communityId,
      target.targetType,
      target.targetId,
    );
  }

  if (!result.available || result.status !== "ready") {
    throw new Error("Download indisponível para este vídeo agora.");
  }

  return result;
};

const resolveShareRenderJob = async (
  target: ContentVideoDownloadTarget,
): Promise<AdminCommunityContentVideoArtRenderJob> => {
  const startedAt = Date.now();
  let delay = SHARE_VIDEO_RENDER_INITIAL_DELAY_MS;
  let job = await startAdminCommunityContentVideoArtRenderJob(
    target.communityId,
    target.targetType,
    target.targetId,
  );

  while (job.status === "queued" || job.status === "processing") {
    if (Date.now() - startedAt > SHARE_VIDEO_RENDER_TIMEOUT_MS) {
      throw new Error("O vídeo com arte ainda está sendo preparado. Tente novamente em instantes.");
    }

    await wait(delay);
    delay = Math.min(SHARE_VIDEO_RENDER_MAX_DELAY_MS, delay + 500);
    job = await getAdminCommunityContentVideoArtRenderJob(
      target.communityId,
      target.targetType,
      target.targetId,
      job.job_id,
    );
  }

  if (job.status !== "completed") {
    throw new Error("Não foi possível preparar o vídeo com arte agora. Tente novamente.");
  }

  return job;
};

export const useContentVideoDownloads = () => {
  const [pendingKey, setPendingKey] = useState<string | null>(null);

  const isPending = useCallback(
    (target: ContentVideoDownloadTarget, action: DownloadAction) =>
      pendingKey === targetKey(target, action),
    [pendingKey],
  );

  const downloadOriginal = useCallback(async (target: ContentVideoDownloadTarget) => {
    const key = targetKey(target, "original");
    const toastId = toast.loading("Preparando download do vídeo original...");
    setPendingKey(key);

    try {
      const result = await resolveOriginalVideoDownload(target);
      downloadDirectVideo(assertDirectDownloadUrl(result.download_url), result.file_name);
      toast.success("Download do vídeo original iniciado.", { id: toastId });
    } catch (error) {
      toast.error(resolveDownloadError(error), { id: toastId });
    } finally {
      setPendingKey((current) => (current === key ? null : current));
    }
  }, []);

  const downloadWithArt = useCallback(async (target: ContentVideoDownloadTarget) => {
    const key = targetKey(target, "art");
    const toastId = toast.loading("Preparando vídeo com a arte Lectum...");
    setPendingKey(key);

    try {
      const job = await resolveShareRenderJob(target);
      const file = await downloadAdminCommunityContentVideoArtRenderJobFile(
        target.communityId,
        target.targetType,
        target.targetId,
        job.job_id,
      );
      downloadFileBlob(file.blob, file.file_name, ".mp4");
      toast.success("Download do vídeo com arte iniciado.", { id: toastId });
    } catch (error) {
      toast.error(resolveDownloadError(error), { id: toastId });
    } finally {
      setPendingKey((current) => (current === key ? null : current));
    }
  }, []);

  return {
    downloadOriginal,
    downloadWithArt,
    isPending,
  };
};
