"use client";
import type { ReactNode } from "react";
import { usePrivacyStatus } from "@/api/callers/privacy";
import { usePrivacyChoice } from "./use-choice";
import { usePrivacyIdentity } from "./use-identity";

// This gates existing first-party measurement only. There is no Meta SDK here.
export function useMeasurementScope() {
  const { user, hasToken } = usePrivacyIdentity();
  const userId = user?.id || null;
  const choice = usePrivacyChoice(userId);
  const status = usePrivacyStatus(userId || "", Boolean(userId));
  const allowed =
    choice?.campaigns === true &&
    !choice.pendingRevocation &&
    (!hasToken || Boolean(userId && status.data?.granted && !status.isError));
  return allowed && choice ? `${userId || "guest"}:${choice.savedAt}` : null;
}

export function PrivacyMeasurementBoundary({ children }: { children: ReactNode }) {
  return useMeasurementScope() ? children : null;
}
