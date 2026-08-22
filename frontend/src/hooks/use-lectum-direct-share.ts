"use client";

import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";
import { useSharePost, useShareReply } from "@/api/callers/posts";
import {
  isNativeShareAbortError,
  shareLectumLinkTarget,
  shareLectumVideoResponse,
} from "@/utils/lectum-share-media";
import type { ShareExportResult } from "@/utils/lectum-share-media/layout";
import type { LectumShareChannel, LectumShareVideoTarget } from "@/utils/lectum-share-target";

type UseLectumDirectShareOptions = {
  onShared?: (target: LectumShareVideoTarget, result: ShareExportResult) => void;
};

const SHARING_TOAST_MESSAGE = "Preparando mídia para compartilhar...";

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
    async (target: LectumShareVideoTarget) => {
      if (sharingRef.current || typeof window === "undefined") return;

      sharingRef.current = true;
      setIsSharing(true);

      const loadingToastId = target.kind === "link" ? null : toast.loading(SHARING_TOAST_MESSAGE);

      try {
        const result =
          target.kind === "link"
            ? await shareLectumLinkTarget(target)
            : await shareLectumVideoResponse(target);

        if (loadingToastId !== null) {
          toast.dismiss(loadingToastId);
        }

        trackShare(target, result.channel);
        onShared?.(target, result);

        if (result.mode === "download") {
          toast.success("Arquivo baixado. Escolha o app desejado no dispositivo.");
        } else if (result.mode === "clipboard") {
          toast.success("Link copiado.");
        }
      } catch (error) {
        if (loadingToastId !== null) {
          toast.dismiss(loadingToastId);
        }

        if (isNativeShareAbortError(error)) return;

        toast.error(
          target.kind === "link"
            ? "Não foi possível abrir o compartilhamento. Tente copiar o link novamente."
            : "Não foi possível preparar o compartilhamento agora. Tente novamente.",
        );
      } finally {
        sharingRef.current = false;
        setIsSharing(false);
      }
    },
    [onShared, trackShare],
  );

  return { isSharing, shareLectumTarget };
};
