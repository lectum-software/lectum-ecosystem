import type { VideoSourceFailureCode } from "./video-upload-source";

export const VIDEO_STAGING_DIRECTORY = "lectum-video-staging-v1";
export const VIDEO_STAGING_RETENTION_MS = 24 * 60 * 60 * 1000;
export const videoStagingLock = (id: string) => `${VIDEO_STAGING_DIRECTORY}:${id}`;
export const isExpiredVideoStagingFile = (name: string, now: number) => {
  const match = /^(\d{13})-[0-9a-f-]{36}\.video$/.exec(name);
  return Boolean(match && now - Number(match[1]) > VIDEO_STAGING_RETENTION_MS);
};

export type VideoPreparationFailureCode =
  | "storage_full"
  | "storage_unavailable"
  | "storage_unsupported"
  | "read_failed";
export class VideoPreparationFailure extends Error {
  readonly code: VideoPreparationFailureCode;
  readonly sourceFailure?: VideoSourceFailureCode;
  constructor(code: VideoPreparationFailureCode, sourceFailure?: VideoSourceFailureCode) {
    super(
      code === "storage_full"
        ? "Não há espaço disponível para preparar o vídeo. Libere espaço no aparelho e tente novamente."
        : code === "read_failed"
          ? "Não foi possível ler o vídeo selecionado. Selecione-o novamente e tente enviar."
          : "Não foi possível preparar o vídeo neste navegador. Tente novamente.",
    );
    this.name = "VideoPreparationFailure";
    this.code = code;
    this.sourceFailure = sourceFailure;
  }
}

export type VideoPreparationWorkerEvent =
  | { type: "progress"; percentage: number }
  | { type: "ready"; file: File }
  | { type: "failed"; code: VideoPreparationFailureCode; sourceFailure?: VideoSourceFailureCode }
  | { type: "disposed" };
