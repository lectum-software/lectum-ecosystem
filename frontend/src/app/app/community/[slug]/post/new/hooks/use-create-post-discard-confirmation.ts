"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type UseCreatePostDiscardConfirmationParams = {
  hasDraftContent: boolean;
  onCancel: () => void;
  onClose: () => void;
};

export const useCreatePostDiscardConfirmation = ({
  hasDraftContent,
  onCancel,
  onClose,
}: UseCreatePostDiscardConfirmationParams) => {
  const [discardConfirmationOpen, setDiscardConfirmationOpen] = useState(false);
  const discardConfirmationOpenRef = useRef(false);
  const hasDraftContentRef = useRef(false);

  const setDiscardConfirmationOpenState = useCallback((open: boolean) => {
    discardConfirmationOpenRef.current = open;
    setDiscardConfirmationOpen(open);
  }, []);

  useEffect(() => {
    hasDraftContentRef.current = hasDraftContent;
  }, [hasDraftContent]);

  const requestClose = useCallback(() => {
    if (discardConfirmationOpenRef.current) {
      setDiscardConfirmationOpenState(false);
      return;
    }

    if (hasDraftContentRef.current) {
      setDiscardConfirmationOpenState(true);
      return;
    }

    onClose();
  }, [onClose, setDiscardConfirmationOpenState]);

  const cancelDiscardConfirmation = useCallback(() => {
    setDiscardConfirmationOpenState(false);
    onCancel();
  }, [onCancel, setDiscardConfirmationOpenState]);

  const confirmDiscardAndClose = useCallback(() => {
    setDiscardConfirmationOpenState(false);
    onClose();
  }, [onClose, setDiscardConfirmationOpenState]);

  return {
    cancelDiscardConfirmation,
    confirmDiscardAndClose,
    discardConfirmationOpen,
    requestClose,
  };
};
