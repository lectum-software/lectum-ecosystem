"use client";

import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";
import { useSharePost, useShareReply } from "@/api/callers/posts";
import {
  copyLectumShareTargetUrl,
  downloadPreparedLectumShareFile,
  getPreparedLectumShareFile,
  isNativeShareAbortError,
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
const DOWNLOAD_PREPARING_GUIDANCE_MESSAGE = "Mantenha esta tela aberta até o download começar.";
const DOWNLOAD_QUALITY_GUIDANCE_MESSAGE = "Se a qualidade ficar baixa, tente pelo computador.";
const MOBILE_DOWNLOAD_SERVER_RENDER_ERROR_MESSAGE =
  "Não conseguimos gerar o vídeo com arte neste aparelho agora. Tente novamente em instantes ou pelo computador.";
const DOWNLOAD_SERVER_RENDER_ERROR_MESSAGE =
  "Não conseguimos gerar o vídeo com arte agora. Tente novamente em instantes.";
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

        trackShare(target, result.channel);
        onShared?.(target, result);

        if (result.mode === "download") {
          toast.success(
            "Vídeo baixado.",
            shouldShowDownloadQualityGuidance()
              ? { description: DOWNLOAD_QUALITY_GUIDANCE_MESSAGE }
              : undefined,
          );
        } else if (result.mode === "clipboard") {
          toast.success("Link copiado.");
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
            : shouldShowDownloadQualityGuidance()
              ? MOBILE_DOWNLOAD_SERVER_RENDER_ERROR_MESSAGE
              : DOWNLOAD_SERVER_RENDER_ERROR_MESSAGE,
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
