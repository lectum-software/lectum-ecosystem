"use client";

import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";
import { useSharePost, useShareReply } from "@/api/callers/posts";
import {
  copyLectumShareTargetUrl,
  downloadPreparedLectumShareFile,
  getPreparedLectumShareFile,
  isNativeShareAbortError,
  prepareLectumShareFile,
  prepareLectumShareFileWithServerRender,
  prepareLectumSourceVideoFallbackFile,
  shareLectumLinkTarget,
  shareLectumWhatsAppPreviewTarget,
  sharePreparedLectumVideoResponse,
} from "@/utils/lectum-share-media";
import { reportLectumShareExportFailure } from "@/utils/lectum-share-media/diagnostics";
import type { ShareExportResult } from "@/utils/lectum-share-media/layout";
import type {
  LectumShareChannel,
  LectumShareSocialTarget,
  LectumShareVideoTarget,
} from "@/utils/lectum-share-target";

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

const SHARING_TOAST_MESSAGE = "Preparando vídeo para compartilhar...";
const DOWNLOAD_TOAST_MESSAGE = "Preparando vídeo para baixar...";
const SHARE_READY_RETRY_MESSAGE =
  "Vídeo preparado. Toque em compartilhar novamente e escolha Redes Sociais.";
const DOWNLOAD_READY_RETRY_MESSAGE =
  "Vídeo preparado. Toque em Baixar vídeo novamente para escolher onde salvar.";
const DOWNLOAD_QUALITY_GUIDANCE_MESSAGE = "Se a qualidade ficar baixa, tente pelo computador.";
const MOBILE_DOWNLOAD_QUALITY_GUIDANCE_USER_AGENT_PATTERN = /\b(Android|iPhone|iPad|iPod)\b/i;

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

      try {
        let result: ShareExportResult;
        const prepareSocialFileTarget = async (socialTarget: LectumShareSocialTarget) => {
          const cachedFile = getPreparedLectumShareFile(socialTarget);
          const shouldUseSourceVideoFallback =
            destination === "social" && socialTarget.mediaType === "video";

          if (!cachedFile) {
            loadingToastId = toast.loading(
              destination === "download" ? DOWNLOAD_TOAST_MESSAGE : SHARING_TOAST_MESSAGE,
            );
          }

          const prepareClientShareFile = () =>
            prepareLectumShareFile(socialTarget).catch((error) => {
              if (shouldUseSourceVideoFallback) {
                return prepareLectumSourceVideoFallbackFile(socialTarget);
              }

              throw error;
            });

          const file =
            cachedFile ??
            (destination === "download"
              ? await prepareLectumShareFileWithServerRender(socialTarget).catch(
                  prepareClientShareFile,
                )
              : await prepareClientShareFile());

          if (loadingToastId !== null) {
            toast.dismiss(loadingToastId);
            loadingToastId = null;
          }

          return file;
        };

        if (destination === "copy_link") {
          result = await copyLectumShareTargetUrl(target);
        } else if (target.kind === "link") {
          result = await shareLectumLinkTarget(target);
        } else if (destination === "whatsapp") {
          result = await shareLectumWhatsAppPreviewTarget(target);
        } else {
          const file = await prepareSocialFileTarget(target);
          result =
            destination === "download"
              ? await downloadPreparedLectumShareFile(target, file)
              : await sharePreparedLectumVideoResponse(target, file, {
                  skipDownloadOnActivationLoss: true,
                });
        }

        if (loadingToastId !== null) {
          toast.dismiss(loadingToastId);
        }

        if (result.mode !== "prepared") {
          trackShare(target, result.channel);
          onShared?.(target, result);
        }

        if (result.mode === "download") {
          if (destination === "download") {
            toast.success(
              "Vídeo baixado.",
              shouldShowDownloadQualityGuidance()
                ? { description: DOWNLOAD_QUALITY_GUIDANCE_MESSAGE }
                : undefined,
            );
          } else {
            toast.success("Arquivo baixado. Escolha o app desejado no dispositivo.");
          }
        } else if (result.mode === "clipboard") {
          toast.success("Link copiado.");
        } else if (result.mode === "prepared") {
          toast.info(
            destination === "download" ? DOWNLOAD_READY_RETRY_MESSAGE : SHARE_READY_RETRY_MESSAGE,
          );
        }

        return result;
      } catch (error) {
        if (loadingToastId !== null) {
          toast.dismiss(loadingToastId);
        }

        if (isNativeShareAbortError(error)) return null;

        if (target.kind !== "link") {
          void reportLectumShareExportFailure({ destination, error, target });
        }

        toast.error(
          target.kind === "link"
            ? "Não foi possível abrir o compartilhamento. Tente copiar o link novamente."
            : destination === "download"
              ? "Não foi possível preparar o vídeo com arte agora. Tente novamente."
              : "Não foi possível preparar o compartilhamento agora. Tente novamente.",
        );

        return null;
      } finally {
        sharingRef.current = false;
        setIsSharing(false);
      }
    },
    [onShared, trackShare],
  );

  return { isSharing, shareLectumTarget };
};
