"use client";

import { useRef, useState, useSyncExternalStore } from "react";
import { useAcceptLegal, useLegalStatus } from "@/api/callers/legal";
import { getApiErrorStatus } from "@/api/errors";
import { LegalAcceptanceModal } from "./acceptance-modal";
import { legalDismissalStore } from "./dismissal";
import { pendingLegalSet } from "./policy";
import { toLegalAcceptancePayload } from "./use-form";

export const LegalAcceptanceRequest = ({ userId }: { userId: string }) => {
  const status = useLegalStatus(userId);
  const accept = useAcceptLegal(userId);
  const submitting = useRef(false);
  const [review, setReview] = useState({ epoch: 0, error: "" });
  const dismissed = useSyncExternalStore(
    legalDismissalStore.subscribe,
    () => legalDismissalStore.read(userId),
    () => null,
  );
  const pending = status.isError ? null : pendingLegalSet(status.data);
  if (!pending || dismissed === pending.key) return null;

  return (
    <LegalAcceptanceModal
      disabled={accept.isPending || status.isFetching}
      documents={pending.documents}
      error={review.error}
      key={`${userId}:${pending.key}:${review.epoch}`}
      onClose={() => legalDismissalStore.dismiss(userId, pending.key)}
      onSubmit={async (values) => {
        if (submitting.current || accept.isPending || status.isFetching) return;
        submitting.current = true;
        setReview((previous) => ({ ...previous, error: "" }));
        try {
          await accept.mutateAsync(toLegalAcceptancePayload(values, pending.documents));
          // Only the authoritative response/refetch can remove the pending request.
        } catch (error) {
          const changed = getApiErrorStatus(error) === 409;
          setReview((previous) => ({
            epoch: previous.epoch + (changed ? 1 : 0),
            error: changed
              ? "Os documentos mudaram. Revise as versões apresentadas e confirme novamente."
              : "Não foi possível registrar suas declarações. Tente novamente mais tarde.",
          }));
        } finally {
          submitting.current = false;
        }
      }}
    />
  );
};
