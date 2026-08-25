"use client";

import { useCallback, useState } from "react";
import { LectumShareDownloadDialog } from "@/components/community/lectum-share-download-dialog";
import { useLectumDirectShare } from "@/hooks/use-lectum-direct-share";
import type { ShareExportResult } from "@/utils/lectum-share-media/layout";
import type { LectumShareSocialTarget, LectumShareVideoTarget } from "@/utils/lectum-share-target";

type UseLectumShareDownloadDialogOptions = {
  onShared?: (target: LectumShareVideoTarget, result: ShareExportResult) => void;
};

export const useLectumShareDownloadDialog = (options: UseLectumShareDownloadDialogOptions = {}) => {
  const [pendingTarget, setPendingTarget] = useState<LectumShareSocialTarget | null>(null);
  const { isSharing, shareLectumTarget } = useLectumDirectShare(options);

  const closeLectumDownloadDialog = useCallback(() => {
    if (isSharing) return;

    setPendingTarget(null);
  }, [isSharing]);

  const openLectumDownloadDialog = useCallback((target: LectumShareSocialTarget) => {
    setPendingTarget(target);
  }, []);

  const downloadPendingTarget = useCallback(async () => {
    if (!pendingTarget) return;

    const result = await shareLectumTarget(pendingTarget, { destination: "download" });

    if (result?.mode === "download") {
      setPendingTarget(null);
    }
  }, [pendingTarget, shareLectumTarget]);

  return {
    isDownloadingShareVideo: isSharing,
    lectumDownloadDialog: (
      <LectumShareDownloadDialog
        disabled={isSharing}
        onClose={closeLectumDownloadDialog}
        onDownload={downloadPendingTarget}
        open={Boolean(pendingTarget)}
        target={pendingTarget}
      />
    ),
    openLectumDownloadDialog,
  };
};
