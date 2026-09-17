import { getApiErrorCode, getApiErrorStatus } from "@/api/errors";
import { callEndpoint } from "@/api/generator";
import type {
  VideoAssetPlaybackResponse,
  VideoAssetStatusResponse,
  VideoAssetUploadEvent,
  VideoAssetUploadRequest,
  VideoAssetUploadResponse,
} from "@/api/generator/types/video-assets";
import { handleReq } from "@/api/handle";
import {
  shouldFallbackToLegacyVideoPlayback,
  videoAssetIdFromReference,
  videoAssetPlaybackApiPaths,
} from "@/utils/video-stream";

const route = "/api/private/video-assets";
const ACCEPTED_VIDEO_UPLOAD_METHODS = "tus";

export const createVideoAssetUpload = (body: VideoAssetUploadRequest, signal?: AbortSignal) =>
  handleReq<VideoAssetUploadResponse>({
    ...callEndpoint({
      body,
      config: {
        headers: { "X-Lectum-Video-Upload-Methods": ACCEPTED_VIDEO_UPLOAD_METHODS },
        signal,
      },
      method: "POST",
      route: `${route}/uploads`,
    }),
    hideError: true,
  });

export const getVideoAssetStatus = (assetId: string, signal?: AbortSignal) =>
  handleReq<VideoAssetStatusResponse>({
    ...callEndpoint({
      config: { signal },
      params: { id: assetId },
      route: `${route}/:id/status`,
    }),
    hideError: true,
  });

export const deleteVideoAsset = (assetId: string) =>
  handleReq<{ canceled: boolean }>({
    ...callEndpoint({
      method: "DELETE",
      params: { id: assetId },
      route: `${route}/:id`,
    }),
    hideError: true,
  });

// Sem fallback para DELETE /:id: backends antigos devem reter a mídia, não
// interpretar o abort de uma tentativa como remoção deliberada do vídeo atual.
export const cancelVideoAssetUpload = (assetId: string) =>
  handleReq<{ canceled: boolean }>({
    ...callEndpoint({
      method: "DELETE",
      params: { id: assetId },
      route: `${route}/uploads/:id`,
    }),
    hideError: true,
  });

export const cleanupDetachedVideoAsset = async (reference?: string | null) => {
  const assetId = videoAssetIdFromReference(reference);
  if (!assetId) return;

  await cancelVideoAssetUpload(assetId).catch(() => undefined);
};

const requestVideoAssetPlayback = (path: string) =>
  handleReq<VideoAssetPlaybackResponse>({
    ...callEndpoint({ route: path }),
    hideError: true,
    signOutOnUnauthorized: false,
  });

export const getVideoAssetPlayback = async (assetId: string) => {
  const paths = videoAssetPlaybackApiPaths(assetId);

  try {
    return await requestVideoAssetPlayback(paths.public);
  } catch (requestError) {
    const endpointDoesNotExist = shouldFallbackToLegacyVideoPlayback({
      code: getApiErrorCode(requestError),
      status: getApiErrorStatus(requestError),
    });
    if (!endpointDoesNotExist) throw requestError;

    // Compatibilidade temporária com backend anterior ao endpoint público.
    return requestVideoAssetPlayback(paths.legacy);
  }
};

// Sem sinal do upload: o relato de falha/cancelamento tem seu próprio prazo curto.
// Backend anterior, sessão expirada ou aparelho offline não podem quebrar o fluxo.
export const reportVideoAssetUploadEvent = async (
  assetId: string,
  body: VideoAssetUploadEvent,
): Promise<void> => {
  try {
    await handleReq<{ received: boolean }>({
      ...callEndpoint({
        body,
        config: { timeout: 2_000 },
        method: "POST",
        params: { id: assetId },
        route: `${route}/:id/upload-events`,
      }),
      hideError: true,
      signOutOnUnauthorized: false,
    });
  } catch (error) {
    // Rollout independente: backend anterior rejeita campos novos no contrato fechado.
    if (body.transport && getApiErrorStatus(error) === 422) {
      const legacyBody = { ...body };
      delete legacyBody.transport;
      await reportVideoAssetUploadEvent(assetId, legacyBody);
    }
    // Não registrar o erro HTTP bruto: pode conter cabeçalhos de autenticação.
  }
};
