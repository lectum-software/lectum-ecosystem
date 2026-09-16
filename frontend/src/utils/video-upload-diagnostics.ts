export const VIDEO_UPLOAD_RETRY_DELAYS_MS = [0, 1_000, 3_000, 5_000, 10_000];

export type VideoUploadTransportDiagnostic = {
  request: "HEAD" | "PATCH" | "POST" | "unknown";
  source: "not_read" | "reading" | "ready" | "failed";
  sourceFailure:
    | "none"
    | "unreadable"
    | "permission"
    | "missing"
    | "changed"
    | "invalid_range"
    | "unknown";
};

export const tusRequestMethod = (error: unknown): VideoUploadTransportDiagnostic["request"] => {
  if (!error || typeof error !== "object" || !("originalRequest" in error)) return "unknown";
  const request = error.originalRequest;
  if (!request || typeof request !== "object" || !("getMethod" in request)) return "unknown";
  if (typeof request.getMethod !== "function") return "unknown";
  try {
    const method: unknown = request.getMethod();
    return method === "HEAD" || method === "PATCH" || method === "POST" ? method : "unknown";
  } catch {
    return "unknown";
  }
};

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
  public readonly reason: "network" | "http" | "transport" | "processing" | "processing_timeout";
  declare readonly transport?: VideoUploadTransportDiagnostic;

  constructor(
    status: number,
    reason?: "transport" | "processing" | "processing_timeout",
    transport?: VideoUploadTransportDiagnostic,
  ) {
    super(
      transport?.source === "failed"
        ? "Não foi possível ler o vídeo selecionado. Selecione-o novamente e tente enviar."
        : reason === "processing_timeout"
          ? "O vídeo ainda está sendo processado. Tente novamente em instantes."
          : reason === "processing"
            ? "Não foi possível processar o vídeo. Selecione o arquivo novamente."
            : "Não foi possível enviar o vídeo. Tente novamente.",
    );
    this.name = "VideoUploadFailure";
    this.httpStatus = boundedUploadNumber(status, 599);
    this.reason = reason ?? (this.httpStatus === 0 ? "network" : "http");
    if (transport) this.transport = transport;
  }
}

export const isVideoSourceReadFailure = (error: unknown) =>
  error instanceof VideoUploadFailure && error.transport?.source === "failed";
