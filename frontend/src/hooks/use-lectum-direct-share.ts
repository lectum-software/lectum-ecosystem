"use client";

import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";
import { useSharePost, useShareReply } from "@/api/callers/posts";
import { useAppSelector } from "@/hooks/redux";
import {
  getLectumShareArtifactFile,
  persistLectumShareArtifact,
} from "@/utils/lectum-share-artifact-cache";
import {
  copyLectumShareTargetUrl,
  downloadPreparedLectumShareFile,
  getPreparedLectumShareFile,
  isLectumSourceVideoFallbackFile,
  isNativeShareAbortError,
  prepareLectumShareFile,
  prepareLectumSourceVideoFallbackFile,
  shareLectumLinkTarget,
  shareLectumWhatsAppPreviewTarget,
  sharePreparedLectumVideoResponse,
} from "@/utils/lectum-share-media";
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

const SHARING_TOAST_MESSAGE = "Preparando vídeo para compartilhar...";
const DOWNLOAD_TOAST_MESSAGE = "Preparando vídeo para baixar...";
const SHARE_READY_RETRY_MESSAGE =
  "Vídeo preparado. Toque em compartilhar novamente e escolha Redes Sociais.";

export const useLectumDirectShare = (options: UseLectumDirectShareOptions = {}) => {
  const { onShared } = options;
  const [isSharing, setIsSharing] = useState(false);
  const sharingRef = useRef(false);
  const { mutate: trackPostShare } = useSharePost();
  const { mutate: trackReplyShare } = useShareReply();
  const currentUserId = useAppSelector((state) => state.user?.id ?? null);

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
          let cachedFile = getPreparedLectumShareFile(socialTarget);
          const shouldUseSourceVideoFallback =
            (destination === "social" || destination === "download") &&
            socialTarget.mediaType === "video";

          if (!cachedFile) {
            cachedFile = await getLectumShareArtifactFile(socialTarget).catch(() => null);
          }

          if (!cachedFile) {
            loadingToastId = toast.loading(
              destination === "download" ? DOWNLOAD_TOAST_MESSAGE : SHARING_TOAST_MESSAGE,
            );
          }

          const file =
            cachedFile ??
            (await prepareLectumShareFile(socialTarget).catch((error) => {
              if (shouldUseSourceVideoFallback) {
                return prepareLectumSourceVideoFallbackFile(socialTarget);
              }

              throw error;
            }));

          if (!cachedFile && currentUserId && !isLectumSourceVideoFallbackFile(file)) {
            void persistLectumShareArtifact(socialTarget, file).catch(() => undefined);
          }

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
          const usedSourceVideoFallback = result.file
            ? isLectumSourceVideoFallbackFile(result.file)
            : false;

          toast.success(
            usedSourceVideoFallback && destination === "download"
              ? "Vídeo original baixado. Tente novamente depois para baixar com arte."
              : destination === "download"
                ? "Vídeo baixado."
                : "Arquivo baixado. Escolha o app desejado no dispositivo.",
          );
        } else if (result.mode === "clipboard") {
          toast.success("Link copiado.");
        } else if (result.mode === "prepared") {
          toast.info(SHARE_READY_RETRY_MESSAGE);
        }

        return result;
      } catch (error) {
        if (loadingToastId !== null) {
          toast.dismiss(loadingToastId);
        }

        if (isNativeShareAbortError(error)) return null;

        toast.error(
          target.kind === "link"
            ? "Não foi possível abrir o compartilhamento. Tente copiar o link novamente."
            : destination === "download"
              ? "Não foi possível preparar o vídeo agora. Tente novamente."
              : "Não foi possível preparar o compartilhamento agora. Tente novamente.",
        );

        return null;
      } finally {
        sharingRef.current = false;
        setIsSharing(false);
      }
    },
    [currentUserId, onShared, trackShare],
  );

  return { isSharing, shareLectumTarget };
};
