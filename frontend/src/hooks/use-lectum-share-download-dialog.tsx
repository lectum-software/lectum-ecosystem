"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  LECTUM_SHARE_PREVIEW_SHEET_EXIT_MS,
  LectumShareDownloadDialog,
} from "@/components/community/lectum-share-download-dialog";
import {
  buildLectumShareRenderDiagnosticDescription,
  useLectumDirectShare,
} from "@/hooks/use-lectum-direct-share";
import {
  getPreparedLectumShareFile,
  prepareLectumShareFileWithServerRender,
  type ShareExportResult,
} from "@/utils/lectum-share-media";
import type { LectumShareSocialTarget, LectumShareVideoTarget } from "@/utils/lectum-share-target";
import { requestLectumScreenWakeLock } from "@/utils/screen-wake-lock";

type UseLectumShareDownloadDialogOptions = {
  onShared?: (target: LectumShareVideoTarget, result: ShareExportResult) => void;
};

const PREPARE_DOWNLOAD_TOAST_MESSAGE = "Preparando v\u00eddeo para baixar...";
const PREPARE_DOWNLOAD_TOAST_DESCRIPTION =
  "Mantenha esta tela aberta; a Lectum vai evitar que o celular apague enquanto prepara.";
const PREPARE_DOWNLOAD_READY_DESCRIPTION =
  "Toque em Baixar v\u00eddeo para salvar ou compartilhar sem abrir a pr\u00e9via do arquivo.";
const PREPARE_DOWNLOAD_ERROR_MESSAGE =
  "N\u00e3o conseguimos preparar o v\u00eddeo com arte agora. Tente novamente em instantes.";

export const useLectumShareDownloadDialog = (options: UseLectumShareDownloadDialogOptions = {}) => {
  const [pendingTarget, setPendingTarget] = useState<LectumShareSocialTarget | null>(null);
  const [preparedFile, setPreparedFile] = useState<File | null>(null);
  const [isDownloadDialogOpen, setIsDownloadDialogOpen] = useState(false);
  const [isPreparingShareVideo, setIsPreparingShareVideo] = useState(false);
  const autoPreparedTargetRef = useRef<LectumShareSocialTarget | null>(null);
  const closeAnimationTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingTargetRef = useRef<LectumShareSocialTarget | null>(null);
  const { isSharing, shareLectumTarget } = useLectumDirectShare(options);
  const isBusy = isSharing || isPreparingShareVideo;

  const clearCloseAnimationTimeout = useCallback(() => {
    if (closeAnimationTimeoutRef.current === null) return;

    clearTimeout(closeAnimationTimeoutRef.current);
    closeAnimationTimeoutRef.current = null;
  }, []);

  const closeAfterAnimation = useCallback(() => {
    setIsDownloadDialogOpen(false);
    clearCloseAnimationTimeout();

    closeAnimationTimeoutRef.current = setTimeout(() => {
      autoPreparedTargetRef.current = null;
      closeAnimationTimeoutRef.current = null;
      pendingTargetRef.current = null;
      setPreparedFile(null);
      setPendingTarget(null);
    }, LECTUM_SHARE_PREVIEW_SHEET_EXIT_MS);
  }, [clearCloseAnimationTimeout]);

  const closeLectumDownloadDialog = useCallback(() => {
    if (isBusy) return;

    closeAfterAnimation();
  }, [closeAfterAnimation, isBusy]);

  const openLectumDownloadDialog = useCallback(
    (target: LectumShareSocialTarget) => {
      clearCloseAnimationTimeout();
      autoPreparedTargetRef.current = null;
      pendingTargetRef.current = target;
      setPendingTarget(target);
      setPreparedFile(getPreparedLectumShareFile(target));
      setIsDownloadDialogOpen(true);
    },
    [clearCloseAnimationTimeout],
  );

  const preparePendingTarget = useCallback(async () => {
    if (!pendingTarget || isPreparingShareVideo) return null;

    const cachedFile = getPreparedLectumShareFile(pendingTarget);
    if (cachedFile) {
      setPreparedFile(cachedFile);
      return cachedFile;
    }

    setIsPreparingShareVideo(true);
    const loadingToastId = toast.loading(PREPARE_DOWNLOAD_TOAST_MESSAGE, {
      description: PREPARE_DOWNLOAD_TOAST_DESCRIPTION,
    });
    const screenWakeLock = await requestLectumScreenWakeLock();

    try {
      const file = await prepareLectumShareFileWithServerRender(pendingTarget);

      if (pendingTargetRef.current === pendingTarget) {
        setPreparedFile(file);
      }

      toast.success("V\u00eddeo pronto.", {
        description: PREPARE_DOWNLOAD_READY_DESCRIPTION,
      });
      return file;
    } catch (error) {
      const diagnosticDescription = buildLectumShareRenderDiagnosticDescription(error);
      toast.error(
        PREPARE_DOWNLOAD_ERROR_MESSAGE,
        diagnosticDescription ? { description: diagnosticDescription } : undefined,
      );
      return null;
    } finally {
      toast.dismiss(loadingToastId);
      await screenWakeLock?.release();
      setIsPreparingShareVideo(false);
    }
  }, [isPreparingShareVideo, pendingTarget]);

  useEffect(() => {
    if (!isDownloadDialogOpen || !pendingTarget || preparedFile || isBusy) return;
    if (autoPreparedTargetRef.current === pendingTarget) return;

    autoPreparedTargetRef.current = pendingTarget;
    void preparePendingTarget();
  }, [isBusy, isDownloadDialogOpen, pendingTarget, preparePendingTarget, preparedFile]);

  const downloadPendingTarget = useCallback(async () => {
    if (!pendingTarget) return;

    const cachedFile = preparedFile ?? getPreparedLectumShareFile(pendingTarget);

    if (!cachedFile) {
      await preparePendingTarget();
      return;
    }

    const result = await shareLectumTarget(pendingTarget, { destination: "download" });

    if (result?.mode === "download") {
      closeAfterAnimation();
    } else if (result?.mode === "prepared") {
      setPreparedFile(cachedFile);
    }
  }, [closeAfterAnimation, pendingTarget, preparePendingTarget, preparedFile, shareLectumTarget]);

  useEffect(
    () => () => {
      clearCloseAnimationTimeout();
    },
    [clearCloseAnimationTimeout],
  );

  useEffect(() => {
    pendingTargetRef.current = pendingTarget;
  }, [pendingTarget]);

  return {
    isDownloadingShareVideo: isBusy,
    lectumDownloadDialog: (
      <LectumShareDownloadDialog
        disabled={isBusy}
        onClose={closeLectumDownloadDialog}
        onDownload={downloadPendingTarget}
        open={isDownloadDialogOpen}
        preparedFile={preparedFile}
        preparing={isPreparingShareVideo}
        ready={Boolean(
          preparedFile ?? (pendingTarget ? getPreparedLectumShareFile(pendingTarget) : null),
        )}
        target={pendingTarget}
      />
    ),
    openLectumDownloadDialog,
  };
};
