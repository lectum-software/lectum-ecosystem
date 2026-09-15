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
  const onCancelRef = useRef(onCancel);
  const onCloseRef = useRef(onClose);

  const setDiscardConfirmationOpenState = useCallback((open: boolean) => {
    discardConfirmationOpenRef.current = open;
    setDiscardConfirmationOpen(open);
  }, []);

  useEffect(() => {
    hasDraftContentRef.current = hasDraftContent;
  }, [hasDraftContent]);

  useEffect(() => {
    onCancelRef.current = onCancel;
  }, [onCancel]);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  const requestClose = useCallback(() => {
    if (discardConfirmationOpenRef.current) {
      setDiscardConfirmationOpenState(false);
      return;
    }

    if (hasDraftContentRef.current) {
      setDiscardConfirmationOpenState(true);
      return;
    }

    onCloseRef.current();
  }, [setDiscardConfirmationOpenState]);

  const cancelDiscardConfirmation = useCallback(() => {
    setDiscardConfirmationOpenState(false);
    onCancelRef.current();
  }, [setDiscardConfirmationOpenState]);

  const confirmDiscardAndClose = useCallback(() => {
    setDiscardConfirmationOpenState(false);
    onCloseRef.current();
  }, [setDiscardConfirmationOpenState]);

  return {
    cancelDiscardConfirmation,
    confirmDiscardAndClose,
    discardConfirmationOpen,
    requestClose,
  };
};
