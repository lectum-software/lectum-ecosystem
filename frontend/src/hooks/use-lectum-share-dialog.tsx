"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  LectumShareDestinationDialog,
  type LectumShareDestinationMode,
} from "@/components/community/lectum-share-destination-dialog";
import { useAppSelector } from "@/hooks/redux";
import { type LectumShareDestination, useLectumDirectShare } from "@/hooks/use-lectum-direct-share";
import { prewarmLectumShareArtifact } from "@/utils/lectum-share-artifact-cache";
import { clearPreparedLectumShareFile } from "@/utils/lectum-share-media";
import type { ShareExportResult } from "@/utils/lectum-share-media/layout";
import type { LectumShareSocialTarget, LectumShareVideoTarget } from "@/utils/lectum-share-target";

type UseLectumShareDialogOptions = {
  onShared?: (target: LectumShareVideoTarget, result: ShareExportResult) => void;
};

type SocialArtifactStatus = "failed" | "idle" | "preparing" | "ready";

const DESKTOP_SHARE_DESTINATION_QUERY = "(hover: hover) and (pointer: fine)";
const SOCIAL_ARTIFACT_STUCK_TIMEOUT_MS = 20_000;
const SOCIAL_ARTIFACT_PENDING_MESSAGE =
  "A arte da Lectum ainda está carregando. Tente novamente em instantes.";
const SOCIAL_ARTIFACT_FAILED_MESSAGE =
  "A arte demorou mais que o esperado. Vamos tentar compartilhar com o arquivo disponível.";

const resolveLectumShareDestinationMode = (): LectumShareDestinationMode => {
  if (typeof window === "undefined" || !window.matchMedia) return "mobile";

  return window.matchMedia(DESKTOP_SHARE_DESTINATION_QUERY).matches ? "desktop" : "mobile";
};

export const useLectumShareDialog = (options: UseLectumShareDialogOptions = {}) => {
  const [pendingTarget, setPendingTarget] = useState<LectumShareSocialTarget | null>(null);
  const [destinationMode, setDestinationMode] = useState<LectumShareDestinationMode>("mobile");
  const [socialArtifactStatus, setSocialArtifactStatus] = useState<SocialArtifactStatus>("idle");
  const socialArtifactRunRef = useRef(0);
  const { isSharing, shareLectumTarget: shareDirectTarget } = useLectumDirectShare(options);
  const currentUserId = useAppSelector((state) => state.user?.id ?? null);

  const closeShareDestinationDialog = useCallback(() => {
    if (isSharing) return;

    socialArtifactRunRef.current += 1;
    setSocialArtifactStatus("idle");
    setPendingTarget(null);
  }, [isSharing]);

  const prewarmSocialArtifact = useCallback(
    (target: LectumShareSocialTarget) => {
      const runId = socialArtifactRunRef.current + 1;
      socialArtifactRunRef.current = runId;
      setSocialArtifactStatus("preparing");
      const stuckTimeout = window.setTimeout(() => {
        if (socialArtifactRunRef.current !== runId) return;

        clearPreparedLectumShareFile(target);
        setSocialArtifactStatus("failed");
      }, SOCIAL_ARTIFACT_STUCK_TIMEOUT_MS);

      void prewarmLectumShareArtifact(target, { authenticated: Boolean(currentUserId) }).then(
        (file) => {
          window.clearTimeout(stuckTimeout);
          if (socialArtifactRunRef.current !== runId) return;

          setSocialArtifactStatus(file ? "ready" : "failed");
        },
        () => {
          window.clearTimeout(stuckTimeout);
          if (socialArtifactRunRef.current === runId) {
            setSocialArtifactStatus("failed");
          }
        },
      );
    },
    [currentUserId],
  );

  const shareLectumTarget = useCallback(
    async (target: LectumShareVideoTarget) => {
      if (target.kind === "link" || target.mediaType !== "video") {
        await shareDirectTarget(target);
        return;
      }

      const mode = resolveLectumShareDestinationMode();
      setDestinationMode(mode);
      setPendingTarget(target);
      prewarmSocialArtifact(target);
    },
    [prewarmSocialArtifact, shareDirectTarget],
  );

  const selectShareDestination = useCallback(
    (destination: LectumShareDestination) => {
      if (!pendingTarget) return;

      const target = pendingTarget;
      if (destination === "social" && destinationMode === "mobile") {
        if (socialArtifactStatus === "preparing" || socialArtifactStatus === "idle") {
          toast.info(SOCIAL_ARTIFACT_PENDING_MESSAGE);
          return;
        }

        if (socialArtifactStatus === "failed") {
          toast.info(SOCIAL_ARTIFACT_FAILED_MESSAGE);
        }
      }

      socialArtifactRunRef.current += 1;
      setSocialArtifactStatus("idle");
      setPendingTarget(null);
      void shareDirectTarget(target, { destination });
    },
    [destinationMode, pendingTarget, shareDirectTarget, socialArtifactStatus],
  );

  const shareDestinationDialog = useMemo(
    () => (
      <LectumShareDestinationDialog
        disabled={isSharing}
        mode={destinationMode}
        onClose={closeShareDestinationDialog}
        onSelect={selectShareDestination}
        open={Boolean(pendingTarget)}
      />
    ),
    [
      closeShareDestinationDialog,
      destinationMode,
      isSharing,
      pendingTarget,
      selectShareDestination,
    ],
  );

  return {
    isSharing,
    shareDestinationDialog,
    shareLectumTarget,
  };
};
