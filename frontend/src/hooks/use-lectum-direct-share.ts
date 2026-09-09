"use client";

import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";
import { useSharePost, useShareReply } from "@/api/callers/posts";
import {
  copyLectumShareTargetUrl,
  downloadPreparedLectumShareFile,
  getPreparedLectumShareFile,
  isNativeShareAbortError,
  LectumShareRenderError,
  type LectumShareRenderErrorDiagnostic,
  prepareLectumShareFileWithServerRender,
  type ShareExportResult,
  shareLectumLinkTarget,
} from "@/utils/lectum-share-media";
import type {
  LectumShareChannel,
  LectumShareLinkTarget,
  LectumShareSocialTarget,
  LectumShareVideoTarget,
} from "@/utils/lectum-share-target";
import { requestLectumScreenWakeLock } from "@/utils/screen-wake-lock";

type UseLectumDirectShareOptions = {
  onShared?: (target: LectumShareVideoTarget, result: ShareExportResult) => void;
};

export type LectumShareDestination = "copy_link" | "download" | "social" | "whatsapp";

type ShareLectumTargetOptions = {
  destination?: LectumShareDestination;
};

type NavigatorWithUserAgentData = Navigator & {
  userAgentData?: {
    mobile?: boolean;
  };
};

const DOWNLOAD_TOAST_MESSAGE = "Preparando vídeo para baixar...";
const DOWNLOAD_PREPARING_GUIDANCE_MESSAGE =
  "Mantenha esta tela aberta; em vídeos maiores pode levar alguns minutos.";
const DOWNLOAD_QUALITY_GUIDANCE_MESSAGE = "Se a qualidade ficar baixa, tente pelo computador.";
const MOBILE_DOWNLOAD_SERVER_RENDER_ERROR_MESSAGE =
  "Não conseguimos gerar o vídeo com arte neste aparelho agora. Tente novamente em instantes ou pelo computador.";
const DOWNLOAD_SERVER_RENDER_ERROR_MESSAGE =
  "Não conseguimos gerar o vídeo com arte agora. Tente novamente em instantes.";
const MOBILE_DOWNLOAD_QUALITY_GUIDANCE_USER_AGENT_PATTERN = /\b(Android|iPhone|iPad|iPod)\b/i;
const SHARE_RENDER_DIAGNOSTIC_CODE_FALLBACK = "SR-00";

type ShareRenderDiagnosticCopy = {
  description: string;
  reference: string;
};

const SHARE_RENDER_STAGE_LABELS = {
  download: "download do arquivo pronto",
  processing: "processamento do vídeo",
  start: "início da geração",
  status: "acompanhamento da fila",
  timeout: "tempo de geração",
} satisfies Record<LectumShareRenderErrorDiagnostic["stage"], string>;

const SHARE_RENDER_JOB_STATUS_LABELS = {
  canceled: "cancelado",
  cancel_requested: "cancelamento solicitado",
  completed: "concluído",
  failed: "falhou",
  processing: "processando",
  queued: "na fila",
} satisfies Record<NonNullable<LectumShareRenderErrorDiagnostic["jobStatus"]>, string>;

const SHARE_RENDER_DIAGNOSTIC_COPY: Record<string, ShareRenderDiagnosticCopy> = {
  canceled: {
    description: "a geração foi cancelada antes de concluir",
    reference: "SR-06",
  },
  empty_file: {
    description: "o arquivo gerado veio vazio",
    reference: "SR-09",
  },
  invalid_video: {
    description: "o vídeo de origem não pôde ser lido",
    reference: "SR-04",
  },
  post_share_artifact_render_media_invalid: {
    description: "a mídia de origem não está disponível para gerar a arte",
    reference: "SR-02",
  },
  post_share_artifact_render_target_invalid: {
    description: "a publicação ou resposta não pode gerar este vídeo",
    reference: "SR-03",
  },
  post_share_artifact_render_unavailable: {
    description: "o serviço de geração não respondeu como esperado",
    reference: "SR-01",
  },
  processing_failed: {
    description: "o processamento do vídeo falhou",
    reference: "SR-05",
  },
  render_timeout: {
    description: "o tempo limite foi atingido antes de concluir",
    reference: "SR-08",
  },
  request_failed: {
    description: "houve falha temporária de comunicação",
    reference: "SR-07",
  },
};

const shouldShowDownloadQualityGuidance = () => {
  if (typeof window === "undefined") return false;

  const navigatorWithHints = window.navigator as NavigatorWithUserAgentData;
  const userAgent = navigatorWithHints.userAgent ?? "";
  const platform = navigatorWithHints.platform ?? "";
  const maxTouchPoints = navigatorWithHints.maxTouchPoints ?? 0;

  return (
    navigatorWithHints.userAgentData?.mobile === true ||
    MOBILE_DOWNLOAD_QUALITY_GUIDANCE_USER_AGENT_PATTERN.test(userAgent) ||
    (platform === "MacIntel" && maxTouchPoints > 1)
  );
};

export const buildLectumShareRenderDiagnosticDescription = (error: unknown) => {
  if (!(error instanceof LectumShareRenderError)) return undefined;

  const { code, jobStatus, progress, stage, status } = error.diagnostic;
  const copy = SHARE_RENDER_DIAGNOSTIC_COPY[code] ?? {
    description: "falha não classificada no preparo do vídeo",
    reference: SHARE_RENDER_DIAGNOSTIC_CODE_FALLBACK,
  };
  const parts = [
    `Etapa: ${SHARE_RENDER_STAGE_LABELS[stage]}.`,
    `Motivo: ${copy.description}.`,
    `Ref.: ${copy.reference}.`,
  ];

  if (typeof status === "number") {
    parts.push(`Status: ${status}.`);
  }

  if (jobStatus) {
    const progressLabel =
      typeof progress === "number" ? `, progresso ${Math.round(progress)}%` : "";
    parts.push(`Job: ${SHARE_RENDER_JOB_STATUS_LABELS[jobStatus]}${progressLabel}.`);
  }

  return parts.join(" ");
};

const socialTargetAsLinkTarget = (target: LectumShareSocialTarget): LectumShareLinkTarget => ({
  kind: "link",
  postId: target.postId,
  replyId: target.replyId,
  shareUrl: target.shareUrl,
  text: target.shareText,
  title: target.shareTitle,
});

export const useLectumDirectShare = (options: UseLectumDirectShareOptions = {}) => {
  const { onShared } = options;
  const [isSharing, setIsSharing] = useState(false);
  const sharingRef = useRef(false);
  const { mutate: trackPostShare } = useSharePost();
  const { mutate: trackReplyShare } = useShareReply();

  const trackShare = useCallback(
    (target: LectumShareVideoTarget, channel: LectumShareChannel | null) => {
      if (!channel) return;

      if (target.replyId) {
        trackReplyShare({
          body: { channel },
          postId: target.postId,
          replyId: target.replyId,
        });
        return;
      }

      trackPostShare({ body: { channel }, id: target.postId });
    },
    [trackPostShare, trackReplyShare],
  );

  const shareLectumTarget = useCallback(
    async (
      target: LectumShareVideoTarget,
      shareOptions: ShareLectumTargetOptions = {},
    ): Promise<ShareExportResult | null> => {
      if (sharingRef.current || typeof window === "undefined") return null;

      sharingRef.current = true;
      setIsSharing(true);
      const destination = shareOptions.destination ?? "social";
      let loadingToastId: string | number | null = null;
      let screenWakeLock: Awaited<ReturnType<typeof requestLectumScreenWakeLock>> = null;

      try {
        let result: ShareExportResult;

        if (destination === "copy_link") {
          result = await copyLectumShareTargetUrl(target);
        } else if (target.kind === "link" || destination !== "download") {
          result = await shareLectumLinkTarget(
            target.kind === "link" ? target : socialTargetAsLinkTarget(target),
          );
        } else {
          const socialTarget = target as LectumShareSocialTarget;
          const cachedFile = getPreparedLectumShareFile(socialTarget);

          if (!cachedFile) {
            loadingToastId = toast.loading(DOWNLOAD_TOAST_MESSAGE, {
              description: DOWNLOAD_PREPARING_GUIDANCE_MESSAGE,
            });
            screenWakeLock = await requestLectumScreenWakeLock();
          }

          const file = cachedFile ?? (await prepareLectumShareFileWithServerRender(socialTarget));

          if (loadingToastId !== null) {
            toast.dismiss(loadingToastId);
            loadingToastId = null;
          }

          result = await downloadPreparedLectumShareFile(socialTarget, file);
        }

        if (loadingToastId !== null) {
          toast.dismiss(loadingToastId);
        }

        if (result.channel) {
          trackShare(target, result.channel);
          onShared?.(target, result);
        }

        if (result.mode === "download") {
          toast.success(
            "Vídeo baixado.",
            shouldShowDownloadQualityGuidance()
              ? { description: DOWNLOAD_QUALITY_GUIDANCE_MESSAGE }
              : undefined,
          );
        } else if (result.mode === "prepared") {
          toast.success("V\u00eddeo pronto.", {
            description: "Toque novamente em Baixar v\u00eddeo para salvar ou compartilhar.",
          });
        } else if (result.mode === "clipboard") {
          toast.success("Link copiado.");
        }

        return result;
      } catch (error) {
        if (loadingToastId !== null) {
          toast.dismiss(loadingToastId);
        }

        if (isNativeShareAbortError(error)) return null;

        if (target.kind === "link" || destination !== "download") {
          toast.error("Não foi possível abrir o compartilhamento. Tente copiar o link novamente.");
        } else {
          const diagnosticDescription = buildLectumShareRenderDiagnosticDescription(error);
          toast.error(
            shouldShowDownloadQualityGuidance()
              ? MOBILE_DOWNLOAD_SERVER_RENDER_ERROR_MESSAGE
              : DOWNLOAD_SERVER_RENDER_ERROR_MESSAGE,
            diagnosticDescription ? { description: diagnosticDescription } : undefined,
          );
        }
        return null;
      } finally {
        await screenWakeLock?.release();
        sharingRef.current = false;
        setIsSharing(false);
      }
    },
    [onShared, trackShare],
  );

  return { isSharing, shareLectumTarget };
};
