"use client";

import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";
import { useSharePost, useShareReply } from "@/api/callers/posts";
import {
  isNativeShareAbortError,
  type ShareExportResult,
  shareLectumLinkTarget,
} from "@/utils/lectum-share-media";
import type { LectumShareChannel, LectumShareVideoTarget } from "@/utils/lectum-share-target";

type UseLectumDirectShareOptions = {
  onShared?: (target: LectumShareVideoTarget, result: ShareExportResult) => void;
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
    async (target: LectumShareVideoTarget): Promise<ShareExportResult | null> => {
      if (sharingRef.current || typeof window === "undefined") return null;

      sharingRef.current = true;
      setIsSharing(true);

      try {
        const result = await shareLectumLinkTarget(target);

        trackShare(target, result.channel);
        onShared?.(target, result);

        if (result.mode === "clipboard") {
          toast.success("Link copiado.");
        }

        return result;
      } catch (error) {
        if (isNativeShareAbortError(error)) return null;

        toast.error("Não foi possível abrir o compartilhamento. Tente copiar o link novamente.");
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
