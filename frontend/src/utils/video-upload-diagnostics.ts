export const VIDEO_UPLOAD_RETRY_DELAYS_MS = [0, 1_000, 3_000, 5_000, 10_000];

export const boundedUploadNumber = (value: number, max: number) =>
  Number.isFinite(value) ? Math.max(0, Math.min(max, Math.round(value))) : 0;

export const isRetryableVideoUploadStatus = (status: number) =>
  status === 0 ||
  status === 408 ||
  status === 409 ||
  status === 423 ||
  status === 429 ||
  (status >= 500 && status <= 599);

// DetailedError do TUS contém URL assinada e corpo remoto. Extrair só o status,
// sem reter a causa, mensagem, request ou response no erro lançado à aplicação.
export const tusHttpStatus = (error: unknown): number => {
  if (!error || typeof error !== "object" || !("originalResponse" in error)) return 0;
  const response = error.originalResponse;
  if (!response || typeof response !== "object" || !("getStatus" in response)) return 0;
  if (typeof response.getStatus !== "function") return 0;
  try {
    const status: unknown = response.getStatus();
    return typeof status === "number" && Number.isInteger(status) && status >= 0 && status <= 599
      ? status
      : 0;
  } catch {
    return 0;
  }
};

export class VideoUploadFailure extends Error {
  public readonly httpStatus: number;
  public readonly reason: "network" | "http" | "processing" | "processing_timeout";

  constructor(status: number, reason?: "processing" | "processing_timeout") {
    super(
      reason === "processing_timeout"
        ? "O vídeo ainda está sendo processado. Tente novamente em instantes."
        : reason === "processing"
          ? "Não foi possível processar o vídeo. Selecione o arquivo novamente."
          : "Não foi possível enviar o vídeo. Tente novamente.",
    );
    this.name = "VideoUploadFailure";
    this.httpStatus = boundedUploadNumber(status, 599);
    this.reason = reason ?? (this.httpStatus === 0 ? "network" : "http");
  }
}
