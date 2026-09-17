"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  LECTUM_SHARE_PREVIEW_SHEET_EXIT_MS,
  LectumShareDownloadDialog,
} from "@/components/community/lectum-share-download-dialog";
import { useLectumDirectShare } from "@/hooks/use-lectum-direct-share";
import type { ShareExportResult } from "@/utils/lectum-share-media";
import type { LectumShareSocialTarget, LectumShareVideoTarget } from "@/utils/lectum-share-target";

type UseLectumShareDownloadDialogOptions = {
  onShared?: (target: LectumShareVideoTarget, result: ShareExportResult) => void;
};

export const useLectumShareDownloadDialog = (options: UseLectumShareDownloadDialogOptions = {}) => {
  const [pendingTarget, setPendingTarget] = useState<LectumShareSocialTarget | null>(null);
  const [isDownloadDialogOpen, setIsDownloadDialogOpen] = useState(false);
  const closeAnimationTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const downloadAbortControllerRef = useRef<AbortController | null>(null);
  const { isSharing, shareLectumTarget } = useLectumDirectShare(options);

  const clearCloseAnimationTimeout = useCallback(() => {
    if (closeAnimationTimeoutRef.current === null) return;

    clearTimeout(closeAnimationTimeoutRef.current);
    closeAnimationTimeoutRef.current = null;
  }, []);

  const closeAfterAnimation = useCallback(() => {
    setIsDownloadDialogOpen(false);
    clearCloseAnimationTimeout();

    closeAnimationTimeoutRef.current = setTimeout(() => {
      closeAnimationTimeoutRef.current = null;
      setPendingTarget(null);
    }, LECTUM_SHARE_PREVIEW_SHEET_EXIT_MS);
  }, [clearCloseAnimationTimeout]);

  const closeLectumDownloadDialog = useCallback(() => {
    if (isSharing) {
      downloadAbortControllerRef.current?.abort();
      downloadAbortControllerRef.current = null;
    }

    closeAfterAnimation();
  }, [closeAfterAnimation, isSharing]);

  const openLectumDownloadDialog = useCallback(
    (target: LectumShareSocialTarget) => {
      clearCloseAnimationTimeout();
      setPendingTarget(target);
      setIsDownloadDialogOpen(true);
    },
    [clearCloseAnimationTimeout],
  );

  const downloadPendingTarget = useCallback(async () => {
    if (!pendingTarget || isSharing) return;

    const controller = new AbortController();
    downloadAbortControllerRef.current = controller;
    const result = await shareLectumTarget(pendingTarget, {
      destination: "download",
      signal: controller.signal,
    });
    if (downloadAbortControllerRef.current === controller) {
      downloadAbortControllerRef.current = null;
    }

    if (result?.mode === "download") {
      closeAfterAnimation();
    }
  }, [closeAfterAnimation, isSharing, pendingTarget, shareLectumTarget]);

  useEffect(
    () => () => {
      downloadAbortControllerRef.current?.abort();
      downloadAbortControllerRef.current = null;
      clearCloseAnimationTimeout();
    },
    [clearCloseAnimationTimeout],
  );

  return {
    isDownloadingShareVideo: isSharing,
    lectumDownloadDialog: (
      <LectumShareDownloadDialog
        disabled={isSharing}
        onClose={closeLectumDownloadDialog}
        onDownload={downloadPendingTarget}
        open={isDownloadDialogOpen}
        preparing={isSharing}
        target={pendingTarget}
      />
    ),
    openLectumDownloadDialog,
  };
};
