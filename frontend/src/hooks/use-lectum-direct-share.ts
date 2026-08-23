"use client";

import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";
import { useSharePost, useShareReply } from "@/api/callers/posts";
import {
  getPostShareArtifact,
  getReplyShareArtifact,
  uploadPostShareArtifact,
  uploadReplyShareArtifact,
} from "@/api/req/posts";
import { useAppSelector } from "@/hooks/redux";
import {
  cachePreparedLectumShareFile,
  downloadPreparedLectumShareFile,
  getPreparedLectumShareFile,
  isNativeShareAbortError,
  prepareLectumShareFile,
  shareLectumLinkTarget,
  shareLectumWhatsAppPreviewTarget,
  sharePreparedLectumVideoResponse,
} from "@/utils/lectum-share-media";
import { safeFileName } from "@/utils/lectum-share-media/file-name";
import type { ShareExportResult } from "@/utils/lectum-share-media/layout";
import type {
  LectumShareChannel,
  LectumShareSocialTarget,
  LectumShareVideoTarget,
} from "@/utils/lectum-share-target";
import { resolvePublicMediaUrl } from "@/utils/media";

type UseLectumDirectShareOptions = {
  onShared?: (target: LectumShareVideoTarget, result: ShareExportResult) => void;
};

export type LectumShareDestination = "download" | "social" | "whatsapp";

type ShareLectumTargetOptions = {
  destination?: LectumShareDestination;
};

const SHARING_TOAST_MESSAGE = "Preparando vídeo para compartilhar...";
const SHARE_READY_RETRY_MESSAGE =
  "Vídeo preparado. Toque em compartilhar novamente e escolha Redes Sociais.";

const isVideoShareTarget = (target: LectumShareVideoTarget): target is LectumShareSocialTarget =>
  target.kind !== "link" && target.mediaType === "video";

const SHARE_ARTIFACT_FILE_EXTENSIONS = new Set(["jpeg", "jpg", "mov", "mp4", "png", "webm"]);

const resolveShareArtifactFileExtension = (
  contentType?: string | null,
  fileName?: string | null,
) => {
  const normalizedContentType = contentType?.toLowerCase() ?? "";

  if (normalizedContentType.includes("webm")) return "webm";
  if (normalizedContentType.includes("quicktime")) return "mov";
  if (normalizedContentType.includes("png")) return "png";
  if (normalizedContentType.includes("jpeg")) return "jpg";
  if (normalizedContentType.includes("mp4")) return "mp4";

  const extension = fileName?.match(/\.([a-z0-9]{1,8})$/iu)?.[1]?.toLowerCase();

  return extension && SHARE_ARTIFACT_FILE_EXTENSIONS.has(extension) ? extension : "mp4";
};

const fileFromShareArtifact = async (target: LectumShareVideoTarget) => {
  if (!isVideoShareTarget(target)) return null;

  const artifact = target.replyId
    ? await getReplyShareArtifact(target.postId, target.replyId)
    : await getPostShareArtifact(target.postId);

  if (!artifact.available || !artifact.artifact_url) return null;

  const artifactUrl = resolvePublicMediaUrl(artifact.artifact_url);
  if (!artifactUrl) return null;

  const response = await fetch(artifactUrl);
  if (!response.ok) return null;

  const blob = await response.blob();
  const file = new File(
    [blob],
    safeFileName(
      target,
      resolveShareArtifactFileExtension(artifact.content_type || blob.type, artifact.file_name),
    ),
    {
      type: artifact.content_type || blob.type || "video/mp4",
    },
  );

  cachePreparedLectumShareFile(target, file);
  return file;
};

const persistShareArtifact = async (target: LectumShareVideoTarget, file: File) => {
  if (!isVideoShareTarget(target)) return;

  if (target.replyId) {
    await uploadReplyShareArtifact(target.postId, target.replyId, file);
    return;
  }

  await uploadPostShareArtifact(target.postId, file);
};

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
    async (target: LectumShareVideoTarget, shareOptions: ShareLectumTargetOptions = {}) => {
      if (sharingRef.current || typeof window === "undefined") return;

      sharingRef.current = true;
      setIsSharing(true);
      const destination = shareOptions.destination ?? "social";

      let loadingToastId: string | number | null = null;

      try {
        let result: ShareExportResult;
        const prepareSocialFileTarget = async (socialTarget: LectumShareSocialTarget) => {
          let cachedFile = getPreparedLectumShareFile(socialTarget);

          if (!cachedFile) {
            loadingToastId = toast.loading(SHARING_TOAST_MESSAGE);
          }

          if (!cachedFile) {
            cachedFile = await fileFromShareArtifact(socialTarget).catch(() => null);
          }

          const file = cachedFile ?? (await prepareLectumShareFile(socialTarget));

          if (!cachedFile && currentUserId) {
            void persistShareArtifact(socialTarget, file).catch(() => undefined);
          }

          if (loadingToastId !== null) {
            toast.dismiss(loadingToastId);
            loadingToastId = null;
          }

          return file;
        };

        if (target.kind === "link") {
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
          toast.success(
            destination === "download"
              ? "Vídeo com arte baixado."
              : "Arquivo baixado. Escolha o app desejado no dispositivo.",
          );
        } else if (result.mode === "clipboard") {
          toast.success("Link copiado.");
        } else if (result.mode === "prepared") {
          toast.info(SHARE_READY_RETRY_MESSAGE);
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
    [currentUserId, onShared, trackShare],
  );

  return { isSharing, shareLectumTarget };
};
